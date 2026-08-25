/**
 * CRM Sync Service
 *
 * Bridges Export Freight Forwarding with the Import CRM module.
 * Maps the Freight Forwarding pre-sales lifecycle to CRM Opportunities:
 * - Enquiry Created -> Opportunity
 * - Quotation Added -> Proposal
 * - Quotation Changed -> Negotiation
 * - Converted -> Won
 * - Rejected -> Lost
 */
import {
  CrmAccount,
  CrmContact,
  CrmOpportunity,
} from "../model/crm/crmModels.mjs";

const STAGE_PROBABILITY = {
  qualified: 35,
  opportunity: 60,
  sales_visit: 70,
  proposal: 75,
  negotiation: 85,
  won: 100,
  lost: 0,
};

// ─── Determine CRM opportunity stage from freight data ───────────────────────
function determineCrmStage(enquiry, existingOppStage) {
  const isConverted =
    enquiry.status === "Converted" ||
    !!enquiry.source_job_no ||
    !!enquiry.success_no;

  if (isConverted) return "won";
  if (enquiry.status === "Rejected") return "lost";

  // If we reach here, it's pre-sales (Open)
  if (enquiry.saved_quotation) {
    // Has a quotation.
    if (existingOppStage === "negotiation") return "negotiation";
    if (existingOppStage === "proposal") return "negotiation"; // Assumed changed
    return "proposal";
  }

  // No quotation yet
  return "opportunity";
}

// ─── Compute the freight pipeline stage (for the UI Badge) ───────────────────
function computeFreightPipelineStage(enquiry) {
  const isConverted =
    enquiry.status === "Converted" ||
    !!enquiry.source_job_no ||
    !!enquiry.success_no;

  if (!isConverted) {
    if (enquiry.status === "Rejected") return "Rejected";
    return "Enquiry";
  }

  // Operational stages post-conversion
  if (!enquiry.draft_bl_approved) return "Draft BL";
  if (!enquiry.sailing_date) return "SOB";
  const hasBilling = !!(
    enquiry.billing_details?.agency_bill_no &&
    enquiry.billing_details?.agency_bill_date &&
    enquiry.billing_details?.reimbursement_bill_no &&
    enquiry.billing_details?.reimbursement_bill_date
  );
  if (!hasBilling) return "Billing";
  if (!enquiry.arrival_date) return "ETA Pending";
  if (!enquiry.final_delivery_date) return "Delivery";
  return "Completed";
}

function buildFreightData(enquiry) {
  return {
    pipelineStage: computeFreightPipelineStage(enquiry),
    enquiryNo: enquiry.enquiry_no || "",
    successNo: enquiry.success_no || "",
    sourceJobNo: enquiry.source_job_no || "",
    portOfLoading: enquiry.port_of_loading || "",
    portOfDestination: enquiry.port_of_destination || "",
    consignmentType: enquiry.consignment_type || "",
    containerSize: enquiry.container_size || "",
    grossWeight: enquiry.gross_weight || "",
    netWeight: enquiry.net_weight || "",
    sailingDate: enquiry.sailing_date || "",
    etaDate: enquiry.eta_date || "",
    arrivalDate: enquiry.arrival_date || "",
    finalDeliveryDate: enquiry.final_delivery_date || "",
    draftBlApproved: enquiry.draft_bl_approved || false,
    billingCompleted: !!(
      enquiry.billing_details?.agency_bill_no &&
      enquiry.billing_details?.reimbursement_bill_no
    ),
    shippingLine: enquiry.shipping_line_airline || "",
    vesselName: enquiry.vessel_name || "",
    bookingNo: enquiry.booking_no || "",
    blNo: enquiry.hbl_no || enquiry.mbl_no || "",
    lastSyncedAt: new Date(),
  };
}

async function computeDealValue(enquiry) {
  let dealValue = 0;
  let charges = enquiry.charges || [];

  if (enquiry.success_no) {
    try {
      const ExJobModel = (await import("../model/export/ExJobModel.mjs")).default;
      const job = await ExJobModel.findOne({ job_no: enquiry.success_no }).lean();
      if (job && job.charges && job.charges.length > 0) {
        charges = job.charges;
      }
    } catch (err) {
      console.error("[CRM Sync] Error finding job for deal value calculation:", err);
    }
  }

  if (charges && charges.length > 0) {
    dealValue = charges.reduce((sum, charge) => {
      const sellAmount = charge.revenue?.amountINR || charge.revenue?.amount || charge.revenue?.netReceivable || 0;
      const costAmount = charge.cost?.amountINR || charge.cost?.amount || charge.cost?.basicAmount || charge.cost?.netPayable || 0;
      return sum + (sellAmount || costAmount);
    }, 0);
    if (dealValue > 0) return dealValue;
  }

  if (!enquiry.received_rates || enquiry.received_rates.length === 0) return 0;
  const selectedIndex =
    enquiry.selected_rate_index >= 0 ? enquiry.selected_rate_index : 0;
  const rate = enquiry.received_rates[selectedIndex] || enquiry.received_rates[0];
  return rate?.total || 0;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN SYNC FUNCTION
// ═══════════════════════════════════════════════════════════════════════════════

export async function syncFreightEnquiryToCRM(enquiry, action) {
  const enquiryNo = enquiry.enquiry_no;
  if (!enquiryNo) {
    return { success: false, message: "Missing enquiry_no, cannot sync to CRM" };
  }

  try {
    // We consolidate all sync logic into one robust upsert handler
    return await handleSync(enquiry);
  } catch (err) {
    console.error(`[CRM Sync] Error syncing enquiry ${enquiryNo}:`, err);
    return { success: false, message: err.message };
  }
}

async function handleSync(enquiry) {
  const enquiryNo = enquiry.enquiry_no;
  let opportunity = await CrmOpportunity.findOne({ freightEnquiryRef: enquiryNo });
  const isNew = !opportunity;

  const orgName = enquiry.organization_name || "Unknown Organization";
  const dealValue = await computeDealValue(enquiry);
  const existingStage = opportunity ? opportunity.stage : null;
  const newCrmStage = determineCrmStage(enquiry, existingStage);
  const freightData = buildFreightData(enquiry);

  // Extract the original date from the enquiry for the period
  const originalDate = enquiry.createdAt ? new Date(enquiry.createdAt) : new Date();
  const period = originalDate.toISOString().substring(0, 7);

  let account, contact;

  if (isNew) {
    // 1. Create Account
    account = new CrmAccount({
      name: orgName,
      businessVertical: "Freight Forwarding",
    });
    await account.save();

    // 2. Create Contact
    contact = new CrmContact({
      accountId: account._id,
      firstName: orgName,
      lastName: "",
      email: enquiry.email || "",
      phone: enquiry.contact_no || "",
      isPrimary: true,
      businessVertical: "Freight Forwarding",
    });
    await contact.save();

    // 3. Create Opportunity
    opportunity = new CrmOpportunity({
      accountId: account._id,
      primaryContactId: contact._id,
      name: `${orgName} - ${enquiry.shipment_type || "Freight"} [${enquiry.success_no || enquiryNo}]`,
      stage: newCrmStage,
      services: ["freight forwarding"],
      probability: STAGE_PROBABILITY[newCrmStage] || 60,
      value: dealValue,
      source: "Export Freight Forwarding System",
      businessVertical: "Freight Forwarding",
      shipmentType: enquiry.shipment_type || "",
      pol: enquiry.port_of_loading || "",
      pod: enquiry.port_of_destination || "",
      containerType: enquiry.container_size || "",
      containerWeight: enquiry.gross_weight || "",
      containerVolume: enquiry.volume_cbm || "",
      stuffing: enquiry.goods_stuffed || "",
      freightEnquiryRef: enquiryNo,
      freightData,
      stageHistory: [{ stage: newCrmStage, enteredAt: new Date() }],
      period: period,
      createdAt: originalDate,
    });

    if (newCrmStage === "won") opportunity.forecastCategory = "closed";
    if (newCrmStage === "lost") {
      opportunity.forecastCategory = "pipeline";
      opportunity.closeReason = enquiry.delay_reason || "Freight enquiry rejected";
    }

    await opportunity.save();
    console.log(`[CRM Sync] Created Opportunity ${opportunity._id} for enquiry ${enquiryNo} (Stage: ${newCrmStage})`);
    
    return { success: true, message: "CRM Opportunity created", data: opportunity };

  } else {
    // Update existing Opportunity
    opportunity.freightData = freightData;
    opportunity.shipmentType = enquiry.shipment_type || opportunity.shipmentType;
    opportunity.pol = enquiry.port_of_loading || opportunity.pol;
    opportunity.pod = enquiry.port_of_destination || opportunity.pod;
    opportunity.containerType = enquiry.container_size || opportunity.containerType;
    opportunity.containerWeight = enquiry.gross_weight || opportunity.containerWeight;
    opportunity.containerVolume = enquiry.volume_cbm || opportunity.containerVolume;
    opportunity.shipper = enquiry.organization_name || opportunity.shipper;
    opportunity.shippingLine = enquiry.shipping_line_airline || opportunity.shippingLine;
    opportunity.period = period;
    
    // Explicitly update createdAt if it's missing or newer than original
    if (!opportunity.createdAt || opportunity.createdAt > originalDate) {
      opportunity.createdAt = originalDate;
    }

    if (dealValue > 0) opportunity.value = dealValue;
    if (enquiry.success_no) {
      opportunity.name = `${enquiry.organization_name || opportunity.shipper} - ${enquiry.shipment_type || "Freight"} [${enquiry.success_no}]`;
    }

    // Stage progression
    if (newCrmStage !== existingStage) {
      const lastHistory = opportunity.stageHistory?.[opportunity.stageHistory.length - 1];
      if (lastHistory && !lastHistory.exitedAt) {
        lastHistory.exitedAt = new Date();
      }
      opportunity.stageHistory.push({ stage: newCrmStage, enteredAt: new Date() });
      opportunity.stage = newCrmStage;
      opportunity.probability = STAGE_PROBABILITY[newCrmStage] || opportunity.probability;

      if (newCrmStage === "won") {
        opportunity.forecastCategory = "closed";
      } else if (newCrmStage === "lost") {
        opportunity.forecastCategory = "pipeline";
        opportunity.closeReason = enquiry.delay_reason || "Freight enquiry rejected";
      } else if (newCrmStage === "negotiation" || newCrmStage === "proposal") {
        opportunity.forecastCategory = "best_case";
      }
    }

    await opportunity.save();
    console.log(`[CRM Sync] Updated Opportunity ${opportunity._id} for enquiry ${enquiryNo} (Stage: ${existingStage} → ${newCrmStage})`);
    
    return { success: true, message: "CRM Opportunity updated", data: opportunity };
  }
}

export default { syncFreightEnquiryToCRM };
