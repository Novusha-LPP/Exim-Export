import express from "express";
import ExJobModel from "../../model/export/ExJobModel.mjs";
import FreightEnquiryModel from "../../model/export/FreightEnquiryModel.mjs";
import authApiKey from "../../middleware/authApiKey.mjs";
import PurchaseBookEntryModel from "../../model/export/purchaseBookEntryModel.mjs";
import PaymentRequestModel from "../../model/export/paymentRequestModel.mjs";
import importDbConnection from "../../model/importDB.js";

const router = express.Router();

/**
 * Normalize any date to yyyy-MM-dd format
 * Handles: dd-MM-yyyy, dd/MM/yyyy, yyyy-MM-dd, ISO strings, Date objects
 */
const normalizeDate = (dateVal) => {
    if (!dateVal) return "";
    const str = String(dateVal).trim();
    // Already yyyy-MM-dd
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
    // dd-MM-yyyy or dd/MM/yyyy
    const dmyMatch = str.match(/^(\d{2})[\-\/](\d{2})[\-\/](\d{4})/);
    if (dmyMatch) return `${dmyMatch[3]}-${dmyMatch[2]}-${dmyMatch[1]}`;
    // ISO string like 2026-05-04T05:38:55.109Z
    const isoMatch = str.match(/^(\d{4}-\d{2}-\d{2})T/);
    if (isoMatch) return isoMatch[1];
    // Try Date parse as last resort
    const d = new Date(str);
    if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
    return str;
};

/**
 * Format a list of clubbed jobs into a range or a list.
 * Expects job format: PREFIX/SERIAL/SUFFIX, e.g. AMD/EXP/SEA/00302/26-27
 */
const formatClubJobSeries = (clubbedJobs, defaultVal = "") => {
    if (!Array.isArray(clubbedJobs) || clubbedJobs.length === 0) {
        return defaultVal;
    }
    const uniqueJobs = [...new Set(clubbedJobs.map(j => String(j || '').trim()).filter(Boolean))];
    if (uniqueJobs.length === 0) return defaultVal;
    if (uniqueJobs.length === 1) return uniqueJobs[0];

    const parsed = [];
    for (const job of uniqueJobs) {
        const parts = job.split('/');
        if (parts.length === 5) {
            const numStr = parts[3];
            const num = parseInt(numStr, 10);
            if (!isNaN(num)) {
                parsed.push({
                    num,
                    padLength: numStr.length,
                    prefix: parts.slice(0, 3).join('/'),
                    suffix: parts[4],
                    original: job
                });
                continue;
            }
        }
        // Fallback if formatting fails for any item
        return uniqueJobs.join(', ');
    }

    // Ensure all items have the same prefix and suffix
    const firstPrefix = parsed[0].prefix;
    const firstSuffix = parsed[0].suffix;
    const allSamePrefixSuffix = parsed.every(p => p.prefix === firstPrefix && p.suffix === firstSuffix);

    if (!allSamePrefixSuffix) {
        return uniqueJobs.join(', ');
    }

    // Sort by numeric value ascending
    parsed.sort((a, b) => a.num - b.num);

    // Check if continuous
    let isContinuous = true;
    for (let i = 1; i < parsed.length; i++) {
        if (parsed[i].num !== parsed[i - 1].num + 1) {
            isContinuous = false;
            break;
        }
    }

    if (isContinuous) {
        const firstPadded = String(parsed[0].num).padStart(parsed[0].padLength, '0');
        const lastPadded = String(parsed[parsed.length - 1].num).padStart(parsed[parsed.length - 1].padLength, '0');
        return `${firstPrefix}/${firstPadded} TO ${lastPadded}/${firstSuffix}`;
    } else {
        const numString = parsed.map(p => p.num).join(',');
        return `${firstPrefix}/${numString}/${firstSuffix}`;
    }
};

/**
 * Format a list of invoice numbers into a series.
 * Expects format: PREFIX/SERIAL, e.g. EIN26-27/00092
 */
const formatInvoiceSeries = (invoiceList) => {
    if (!Array.isArray(invoiceList) || invoiceList.length === 0) return "";
    const uniqueInvs = [...new Set(invoiceList.map(j => String(j || '').trim()).filter(Boolean))];
    if (uniqueInvs.length === 0) return "";
    if (uniqueInvs.length === 1) return uniqueInvs[0];

    const parsed = [];
    for (const inv of uniqueInvs) {
        const parts = inv.split('/');
        if (parts.length === 2) {
            const numStr = parts[1];
            const num = parseInt(numStr, 10);
            if (!isNaN(num)) {
                parsed.push({
                    num,
                    padLength: numStr.length,
                    prefix: parts[0],
                    original: inv
                });
                continue;
            }
        }
        return uniqueInvs.join(', ');
    }

    const firstPrefix = parsed[0].prefix;
    const allSamePrefix = parsed.every(p => p.prefix === firstPrefix);

    if (!allSamePrefix) return uniqueInvs.join(', ');

    parsed.sort((a, b) => a.num - b.num);

    let isContinuous = true;
    for (let i = 1; i < parsed.length; i++) {
        if (parsed[i].num !== parsed[i - 1].num + 1) {
            isContinuous = false;
            break;
        }
    }

    if (isContinuous) {
        const firstPadded = String(parsed[0].num).padStart(parsed[0].padLength, '0');
        const lastPadded = String(parsed[parsed.length - 1].num).padStart(parsed[parsed.length - 1].padLength, '0');
        return `${firstPrefix}/${firstPadded} TO ${firstPrefix}/${lastPadded}`;
    } else {
        const numStringList = parsed.map((p, index) => {
            if (index === 0) return String(p.num).padStart(p.padLength, '0');
            return String(p.num);
        }).join(',');
        return `${firstPrefix}/${numStringList}`;
    }
};

/**
 * Resolves a potentially formatted club job series (or standard job number)
 * into a query conditions array for $or.
 */
/**
 * Resolves a Tally job number or short bill reference (e.g., GIA/00001/26-27, GEA/0001/26-27, 
 * GG/IA/0001/26-27, GH/EA/0001/26-27, GC/IA/0001/26-27, GB/IA/0001/26-27, FF/0001/26-27, 0001, 00001) 
 * into an array of MongoDB $or query objects.
 */
const resolveJobNumberQuery = (jobNoInput) => {
    if (!jobNoInput) return [{ _id: null }];
    const rawJobNo = String(jobNoInput).trim();
    if (!rawJobNo) return [{ _id: null }];

    // Strip Purchase Book / Payment Request prefix if present e.g. PB/01/..., R1/01/...
    const cleanJobNo = rawJobNo.replace(/^(?:PB|R1)\/\d+\//i, "").replace(/^(?:PB|R1)\//i, "");

    const conditions = [];

    // 1. Direct exact matches across standard job identifier fields
    const exactFields = [
        "job_no",
        "job_number",
        "jobNo",
        "tally_club_ref_no",
        "agency_bill_no",
        "reimbursement_bill_no",
        "tally_bill_no",
        "enquiry_no",
        "success_no",
        "custom_job_no"
    ];
    exactFields.forEach((field) => {
        conditions.push({ [field]: cleanJobNo });
        if (cleanJobNo !== rawJobNo) {
            conditions.push({ [field]: rawJobNo });
        }
    });

    // 2. Check for "TO" format: e.g. AMD/EXP/SEA/00463 TO 00466/26-27
    const toMatch = cleanJobNo.match(/^(.*)\/(\d+)\s+TO\s+(\d+)\/([^\/]+)$/i);
    if (toMatch) {
        const prefix = toMatch[1];
        const startNum = toMatch[2];
        const suffix = toMatch[4];
        const candidate1 = `${prefix}/${startNum}/${suffix}`;
        conditions.push({ job_no: candidate1 });
        const safePrefix = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const safeSuffix = suffix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        conditions.push({ job_no: { $regex: new RegExp("^" + safePrefix + "/0*" + parseInt(startNum, 10) + "/" + safeSuffix + "$", "i") } });
        return conditions;
    }

    // 3. Check for comma-separated format: e.g. AMD/EXP/SEA/302,303,304,306,309/26-27
    const commaMatch = cleanJobNo.match(/^(.*)\/(\d+(?:,\d+)+)\/([^\/]+)$/i);
    if (commaMatch) {
        const prefix = commaMatch[1];
        const firstNum = commaMatch[2].split(',')[0].trim();
        const suffix = commaMatch[3];
        const safePrefix = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const safeSuffix = suffix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        conditions.push({ job_no: { $regex: new RegExp("^" + safePrefix + "/0*" + parseInt(firstNum, 10) + "/" + safeSuffix + "$", "i") } });
        return conditions;
    }

    // 4. Parse Tally short bill formats (GIA/00001/26-27, GEA/0001/26-27, GG/IA/0001/26-27, GH/EA/0001/26-27, FF/0001/26-27, 0001, etc.)
    let seqNum = null;
    let yearSuffix = null;
    let prefixPart = "";

    const slashParts = cleanJobNo.split("/").map(s => s.trim()).filter(Boolean);
    
    if (slashParts.length >= 2) {
        const last = slashParts[slashParts.length - 1];
        if (/^\d{2}-\d{2}$|^\d{4}-\d{4}$/.test(last)) {
            yearSuffix = last;
        }

        // Loop backwards to find the numeric serial number part
        for (let i = slashParts.length - 1; i >= 0; i--) {
            const p = slashParts[i];
            if (p !== yearSuffix && /^\d+$/.test(p)) {
                seqNum = parseInt(p, 10);
                break;
            }
        }
        
        prefixPart = slashParts[0].toUpperCase();
        if (slashParts.length > 3 && (slashParts[1] === "IA" || slashParts[1] === "EA" || slashParts[1] === "IR" || slashParts[1] === "ER")) {
            prefixPart = `${slashParts[0]}/${slashParts[1]}`.toUpperCase();
        }
    } else if (/^\d+$/.test(cleanJobNo)) {
        seqNum = parseInt(cleanJobNo, 10);
    } else {
        const numMatch = cleanJobNo.match(/0*(\d+)/);
        if (numMatch) {
            seqNum = parseInt(numMatch[1], 10);
        }
    }

    if (seqNum !== null && !isNaN(seqNum)) {
        const padded4 = seqNum.toString().padStart(4, '0');
        const padded5 = seqNum.toString().padStart(5, '0');

        let yearRegexPart = "";
        if (yearSuffix) {
            const shortYear = yearSuffix.slice(-5);
            yearRegexPart = `.*${shortYear}`;
        }

        let branchRegexStr = "";
        if (prefixPart) {
            if (prefixPart.startsWith("GH") || prefixPart.startsWith("HAZ")) {
                branchRegexStr = "^(HAZ|GH)";
            } else if (prefixPart.startsWith("GG") || prefixPart.startsWith("GND") || prefixPart.startsWith("GAN")) {
                branchRegexStr = "^(GND|GAN|GG)";
            } else if (prefixPart.startsWith("GC") || prefixPart.startsWith("COK") || prefixPart.startsWith("COC")) {
                branchRegexStr = "^(COK|COC|GC)";
            } else if (prefixPart.startsWith("GB") || prefixPart.startsWith("BAR")) {
                branchRegexStr = "^(BAR|GB)";
            } else if (prefixPart.startsWith("GE") || prefixPart.startsWith("GI") || prefixPart === "GIA" || prefixPart === "GEA" || prefixPart.startsWith("AMD") || prefixPart.startsWith("AHM")) {
                branchRegexStr = "^(AMD|AHM|G)";
            } else if (prefixPart.startsWith("KAN") || prefixPart.startsWith("KANDLA")) {
                branchRegexStr = "^(KAN|KANDLA)";
            } else if (prefixPart.startsWith("MUM") || prefixPart.startsWith("MUMBAI")) {
                branchRegexStr = "^(MUM|MUMBAI)";
            } else if (prefixPart.startsWith("FF")) {
                branchRegexStr = "^(FF|FF-)";
            }
        }

        if (branchRegexStr) {
            const branchSpecificRegex = new RegExp(`${branchRegexStr}.*0*${seqNum}(?:/|-|$)${yearRegexPart}`, "i");
            conditions.push({ job_no: { $regex: branchSpecificRegex } });
            conditions.push({ job_number: { $regex: branchSpecificRegex } });
            conditions.push({ tally_club_ref_no: { $regex: branchSpecificRegex } });
        } else {
            conditions.push({ sequence_number: seqNum });
            conditions.push({ sequence_no: seqNum });
            conditions.push({ job_no: seqNum.toString() });
            conditions.push({ job_no: padded4 });
            conditions.push({ job_no: padded5 });

            const flexRegex = new RegExp(`(?:^|/|-)0*${seqNum}(?:/|-|$)${yearRegexPart}`, "i");
            conditions.push({ job_no: { $regex: flexRegex } });
            conditions.push({ job_number: { $regex: flexRegex } });
            conditions.push({ tally_club_ref_no: { $regex: flexRegex } });
        }
    }

    return conditions;
};

router.get("/test", (req, res) => res.json({ status: "Tally API is connected and working!" }));

/**
 * @api {get} /api/tally/job-data Retrieve job data for Tally integration
 */
/**
 * Helper to determine if a job is a Freight Forwarding / Freight job
 */
const isFreightJob = (job) => {
    if (!job) return false;
    if (job.freight === true || job.is_freight === true || job.freight_done === true) return true;
    if (job.freight_enquiry_id) return true;
    const jobNoStr = String(job.tally_club_ref_no || job.job_no || job.success_no || job.enquiry_no || job.parent_club_job || "").toUpperCase();
    if (jobNoStr.includes("FF-") || jobNoStr.startsWith("FF")) return true;
    if (String(job.detailedStatus || "").toLowerCase().includes("freight")) return true;
    if (String(job.job_type || "").toLowerCase().includes("freight")) return true;
    return false;
};

/**
 * Internal helper to format job and invoice data for Tally
 */
const mapNormalJobAndInvoiceToTally = (job, inv, explicitFreight) => {
    const isFreight = explicitFreight !== undefined 
        ? Boolean(explicitFreight) 
        : isFreightJob(job);

    const jobNoStr = String(job.tally_club_ref_no || job.job_no || "").toUpperCase();
    const isImport = job.job_type === "IMPORT" || jobNoStr.includes("/IMP/") || jobNoStr.includes("IMP");
    const jobType = isImport ? "IMPORT" : (job.job_type || "EXPORT");

    return {
        "freight": isFreight,
        "Freight": isFreight,
        "Job Number": job.tally_club_ref_no || job.job_no,
        "Job Year": job.year || job.job_year || "",
        "Job Type": jobType,
        "Job Date": normalizeDate(job.createdAt || job.job_date || job.jobDate),
        "ImporterExporter Name": isImport 
            ? (job.importer || job.importer_name || job.importerExporter || job.exporter || job.organization_name || "") 
            : (job.exporter || job.organization_name || ""),
        "Consignee": job.consignees?.[0]?.consignee_name || job.consignee || job.consignee_name || "",
        "Shipper": job.shipper || job.supplier_name || job.supplier || "",
        "Origin Port": job.port_of_loading || job.origin_port || job.pol || "",
        "Destination Port": job.port_of_discharge || job.destination_port || job.pod || "",
        "Discharge Port": job.port_of_discharge || job.discharge_port || job.portOfDischarge || job.dischargePort || job.destination_port || job.pod || job.bl_details?.port_of_discharge || "",
        "Shipping Line": job.shipping_line_airline || job.shipping_line || job.shipping_line_name || job.shippingLine || job.carrier || job.carrier_name || job.line || job.bl_details?.shipping_line || job.bl_details?.carrier || "",
        "Custom House": job.custom_house || job.custom_house_name || "",
        "Gross Weight": job.gross_weight_kg ? String(Math.round(parseFloat(job.gross_weight_kg))) : (job.gross_weight ? String(Math.round(parseFloat(job.gross_weight))) : ""),
        "Net Wt": job.net_weight_kg ? String(Math.round(parseFloat(job.net_weight_kg))) : (job.net_weight ? String(Math.round(parseFloat(job.net_weight))) : ""),
        "Package Count": job.total_no_of_pkgs || job.no_of_pkgs || job.packages || "",
        "Package Unit": job.package_unit || job.pkg_unit || "",
        "Container Count": (() => {
            const containers = job.containers || [];
            if (containers.length === 0) return job.no_of_containers || "0";
            const counts = {};
            containers.forEach(c => {
                const detail = c.type || c.size || "20";
                counts[detail] = (counts[detail] || 0) + 1;
            });
            return Object.entries(counts)
                .map(([detail, count]) => `${count} X ${detail}`)
                .join(", ");
        })(),
        "Containers": (job.containers || []).map(c => c.containerNo || c.container_number || c.container_no).filter(Boolean).join(", "),
        "BE No": job.be_no || job.be_number || "",
        "BE Date": normalizeDate(job.be_date),
        "SB No": job.sb_no || "",
        "SB Date": normalizeDate(job.sb_date),
        "MBL NO": job.awb_bl_no || job.mbl_no || job.mbl_number || "",
        "MBL Date": normalizeDate(job.awb_bl_date || job.mbl_date),
        "HBL No": job.hbl_no || job.hbl_number || "",
        "HBL Date": normalizeDate(job.hbl_date),
        "Vessel": job.vessel || job.vessel_name || "",
        "Voyage": job.voyage_no || job.voyage || "",
        "Invoice Number": inv?.invoiceNumber || inv?.invoice_number || "",
        "Inv Date": normalizeDate(inv?.invoiceDate || inv?.invoice_date),
        "Branch": job.branch_code || job.branch || "",
        "Status": (job.status || "Pending").toLowerCase(),
        "Sb type": (() => {
            const eximCode = inv?.products?.[0]?.eximCode || "";
            return eximCode.includes("-") ? eximCode.split("-").slice(1).join("-").trim() : eximCode;
        })(),
        "Consignment Type": job.consignmentType || job.consignment_type || "",
        "Customer Ref No": job.exporter_ref_no || job.importer_ref_no || job.customer_ref_no || "",
        "TOI": inv?.termsOfInvoice || "",
        "Invoice Value": (() => {
            if (!inv) return "";
            return `${inv.invoiceValue || 0}(${inv.currency || ""})`;
        })(),
        "Invoice Currency": inv?.currency || "",
        "FOB Value": (() => {
            if (!inv) return "0.00";
            if (inv.precalculatedFob) return inv.precalculatedFob;
            const fob = inv.freightInsuranceCharges?.fobValue?.amount || inv.invoiceValue || 0;
            const rate = parseFloat(job.exchange_rate || inv.freightInsuranceCharges?.freight?.exchangeRate || 1);
            return (fob * rate).toFixed(2);
        })(),
        "Sb Heading": inv?.products?.[0]?.description || "",
        "ETA Date": normalizeDate(job.eta_date || job.etaDate || job.bl_details?.eta_date || job.operations?.[0]?.statusDetails?.[0]?.etaDate || ""),
        "Volume CBM": job.volume_cbm ? String(job.volume_cbm) : (job.volume ? String(job.volume) : (job.cbm ? String(job.cbm) : (job.bl_details?.volume ? String(job.bl_details.volume) : ""))),
        "IGM Number": job.igm_no || job.igm_number || job.igmNo || "",
        "IGM Date": normalizeDate(job.igm_date || job.igmDate || "")
    };
};

const mapFFJobAndInvoiceToTally = (job, inv, explicitFreight) => {
    const isFreight = explicitFreight !== undefined 
        ? Boolean(explicitFreight) 
        : isFreightJob(job);

    const jobNoStr = String(job.tally_club_ref_no || job.job_no || "").toUpperCase();
    const isImport = job.job_type === "IMPORT" || jobNoStr.includes("/IMP/") || jobNoStr.includes("IMP");
    const jobType = isImport ? "IMPORT" : (job.job_type || "EXPORT");

    const grossVal = job.gross_weight_kg || job.gross_weight || job.bl_details?.gross_weight;
    const netVal = job.net_weight_kg || job.net_weight || job.bl_details?.net_weight;

    return {
        "freight": isFreight,
        "Freight": isFreight,
        "Job Number": job.tally_club_ref_no || job.job_no,
        "Job Year": job.year || job.job_year || "",
        "Job Type": jobType,
        "Job Date": normalizeDate(job.createdAt || job.job_date || job.jobDate),
        "ImporterExporter Name": isImport 
            ? (job.importer || job.importer_name || job.importerExporter || job.exporter || job.organization_name || "") 
            : (job.exporter || job.organization_name || ""),
        "Consignee": job.consignees?.[0]?.consignee_name || job.consignee_name || job.consignee || job.bl_details?.consignee || "",
        "Shipper": job.shipper || job.exporter || job.organization_name || job.supplier_name || "",
        "Origin Port": job.port_of_loading || job.place_of_receipt || job.origin_port || "",
        "Destination Port": job.port_of_discharge || job.port_of_destination || job.destination_port || "",
        "Discharge Port": job.port_of_discharge || job.discharge_port || job.portOfDischarge || job.dischargePort || job.port_of_destination || job.destination_port || job.pod || job.bl_details?.port_of_discharge || job.bl_details?.pod || "",
        "Shipping Line": job.shipping_line_airline || job.shipping_line || job.shipping_line_name || job.shippingLine || job.carrier || job.carrier_name || job.line || job.bl_details?.shipping_line || job.bl_details?.carrier || job.bl_details?.line || "",
        "Custom House": job.custom_house || "",
        "Gross Weight": grossVal ? String(Math.round(parseFloat(String(grossVal).replace(/KGS?/gi, "")))) : "",
        "Net Wt": netVal ? String(Math.round(parseFloat(String(netVal).replace(/KGS?/gi, "")))) : "",
        "Package Count": job.total_no_of_pkgs || job.no_packages || job.no_of_pkgs || "",
        "Package Unit": job.package_unit || "",
        "Container Count": (() => {
            const containers = job.containers || [];
            if (containers.length === 0) return job.no_of_containers || "0";
            const counts = {};
            containers.forEach(c => {
                const detail = c.type || c.size || "20";
                counts[detail] = (counts[detail] || 0) + 1;
            });
            return Object.entries(counts)
                .map(([detail, count]) => `${count} X ${detail}`)
                .join(", ");
        })(),
        "Containers": (job.containers || []).map(c => c.containerNo || c.container_number || c.container_no).filter(Boolean).join(", "),
        "BE No": job.be_no || job.be_number || "",
        "BE Date": normalizeDate(job.be_date),
        "SB No": job.sb_no || "",
        "SB Date": normalizeDate(job.sb_date),
        "MBL NO": job.awb_bl_no || job.mbl_no || job.mbl_number || "",
        "MBL Date": normalizeDate(job.awb_bl_date || job.mbl_date),
        "HBL No": job.hbl_no || job.bl_details?.shipment_ref_no || job.hbl_number || "",
        "HBL Date": normalizeDate(job.hbl_date || job.bl_details?.date_of_issue),
        "Vessel": job.vessel || job.vessel_name || job.bl_details?.vessel_name || "",
        "Voyage": job.voyage_no || job.bl_details?.voyage_no || job.voyage || "",
        "Invoice Number": inv?.invoiceNumber || inv?.invoice_number || "",
        "Inv Date": normalizeDate(inv?.invoiceDate || inv?.invoice_date),
        "Branch": job.branch_code || job.branch || "",
        "Status": (job.status || "Pending").toLowerCase(),
        "Sb type": (() => {
            const eximCode = inv?.products?.[0]?.eximCode || "";
            return eximCode.includes("-") ? eximCode.split("-").slice(1).join("-").trim() : eximCode;
        })(),
        "Consignment Type": job.consignmentType || job.consignment_type || "",
        "Customer Ref No": job.exporter_ref_no || job.importer_ref_no || job.customer_ref_no || "",
        "TOI": inv?.termsOfInvoice || "",
        "Invoice Value": (() => {
            if (!inv) return "";
            return `${inv.invoiceValue || 0}(${inv.currency || ""})`;
        })(),
        "Invoice Currency": inv?.currency || "",
        "FOB Value": (() => {
            if (!inv) return "0.00";
            if (inv.precalculatedFob) return inv.precalculatedFob;
            const fob = inv.freightInsuranceCharges?.fobValue?.amount || inv.invoiceValue || 0;
            const rate = parseFloat(job.exchange_rate || inv.freightInsuranceCharges?.freight?.exchangeRate || 1);
            return (fob * rate).toFixed(2);
        })(),
        "Sb Heading": inv?.products?.[0]?.description || "",
        "ETA Date": normalizeDate(job.eta_date || job.bl_details?.eta_date || job.etaDate || ""),
        "Volume CBM": job.volume_cbm ? String(job.volume_cbm) : (job.volume ? String(job.volume) : (job.cbm ? String(job.cbm) : (job.bl_details?.volume ? String(job.bl_details.volume) : ""))),
        "IGM Number": job.igm_no || job.igm_number || job.igmNo || "",
        "IGM Date": normalizeDate(job.igm_date || job.igmDate || "")
    };
};

/**
 * Internal helper to retrieve and format job data for Tally
 */
const getJobDetailsInternal = async (job_number, explicitFreight) => {
    if (!job_number) return null;
    let cleanNo = String(job_number).trim();
    // Strip PB/01/ or R1/01/ prefix if present e.g. PB/01/AMD/EXP/SEA/00968/26-27
    cleanNo = cleanNo.replace(/^(?:PB|R1)\/\d+\//i, "").replace(/^(?:PB|R1)\//i, "");

    const isFFRequest = cleanNo.toUpperCase().startsWith("FF") || cleanNo.toUpperCase().includes("FF/");

    if (isFFRequest) {
        // FREIGHT FORWARDING SPECIFIC LOOKUP
        const safeNo = cleanNo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        let job = await ExJobModel.findOne({
            $or: [
                { job_no: { $regex: new RegExp("^" + safeNo + "$", "i") } },
                { tally_club_ref_no: { $regex: new RegExp("^" + safeNo + "$", "i") } },
                { enquiry_no: { $regex: new RegExp("^" + safeNo + "$", "i") } },
                { success_no: { $regex: new RegExp("^" + safeNo + "$", "i") } }
            ]
        }).lean();

        if (!job) {
            const enq = await FreightEnquiryModel.findOne({
                $or: [
                    { enquiry_no: { $regex: new RegExp("^" + safeNo + "$", "i") } },
                    { success_no: { $regex: new RegExp("^" + safeNo + "$", "i") } }
                ]
            }).lean();
            if (enq) {
                job = await ExJobModel.findOne({
                    $or: [
                        { job_no: enq.enquiry_no },
                        { job_no: enq.success_no },
                        { job_no: enq.source_job_no }
                    ].filter(Boolean)
                }).lean() || {
                    job_no: enq.enquiry_no,
                    exporter: enq.organization_name,
                    consignees: [{ consignee_name: enq.consignee_name || enq.bl_details?.consignee }],
                    gross_weight_kg: enq.gross_weight_kg || enq.gross_weight,
                    net_weight_kg: enq.net_weight_kg || enq.net_weight,
                    port_of_loading: enq.port_of_loading,
                    port_of_discharge: enq.port_of_destination || enq.port_of_discharge,
                    bl_details: enq.bl_details,
                    containers: enq.containers
                };
            }
        }

        if (!job) return null;

        const enq = await FreightEnquiryModel.findOne({
            $or: [{ enquiry_no: job.job_no }, { success_no: job.job_no }, { enquiry_no: cleanNo }, { success_no: cleanNo }]
        }).lean();
        if (enq) {
            if (!job.exporter && enq.organization_name) job.exporter = enq.organization_name;
            if (!job.shipper && enq.organization_name) job.shipper = enq.organization_name;
            if ((!job.consignees || job.consignees.length === 0) && (enq.consignee_name || enq.bl_details?.consignee)) {
                job.consignees = [{ consignee_name: enq.consignee_name || enq.bl_details?.consignee }];
            }
            if (!job.port_of_loading && enq.port_of_loading) job.port_of_loading = enq.port_of_loading;
            if (!job.port_of_discharge && (enq.port_of_destination || enq.port_of_discharge)) job.port_of_discharge = enq.port_of_destination || enq.port_of_discharge;
            if (!job.gross_weight_kg && (enq.gross_weight_kg || enq.gross_weight)) job.gross_weight_kg = enq.gross_weight_kg || enq.gross_weight;
            if (!job.net_weight_kg && (enq.net_weight_kg || enq.net_weight)) job.net_weight_kg = enq.net_weight_kg || enq.net_weight;
            if (!job.hbl_no && (enq.hbl_no || enq.bl_details?.shipment_ref_no)) job.hbl_no = enq.hbl_no || enq.bl_details?.shipment_ref_no;
            if (!job.vessel && (enq.vessel_name || enq.bl_details?.vessel_name)) job.vessel = enq.vessel_name || enq.bl_details?.vessel_name;
            if (!job.voyage_no && (enq.voyage_no || enq.bl_details?.voyage_no)) job.voyage_no = enq.voyage_no || enq.bl_details?.voyage_no;
            if (enq.bl_details) job.bl_details = enq.bl_details;
        }

        const invoices = job.invoices || [];
        if (invoices.length === 0) {
            return [mapFFJobAndInvoiceToTally(job, null, explicitFreight)];
        }
        return invoices.map(inv => mapFFJobAndInvoiceToTally(job, inv, explicitFreight));
    }

    // LOGIC FOR NORMAL EXPORT & IMPORT DSR JOBS
    // 1. Try exact match FIRST across key identifier fields in ExJobModel
    const safeNo = cleanNo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    let job = await ExJobModel.findOne({
        $or: [
            { job_no: { $regex: new RegExp("^" + safeNo + "$", "i") } },
            { tally_club_ref_no: { $regex: new RegExp("^" + safeNo + "$", "i") } },
            { agency_bill_no: { $regex: new RegExp("^" + safeNo + "$", "i") } },
            { reimbursement_bill_no: { $regex: new RegExp("^" + safeNo + "$", "i") } },
            { tally_bill_no: { $regex: new RegExp("^" + safeNo + "$", "i") } },
            { custom_job_no: { $regex: new RegExp("^" + safeNo + "$", "i") } }
        ]
    }).lean();

    // 2. If no exact match found, fallback to sequence / regex matching in ExJobModel
    if (!job) {
        job = await ExJobModel.findOne({
            $or: resolveJobNumberQuery(job_number)
        }).sort({ is_club_job_parent: -1 }).lean();
    }

    // 3. If still no job found and importDbConnection is connected, search importDbConnection's "jobs" collection
    if (!job && importDbConnection && importDbConnection.readyState === 1) {
        try {
            const clientJobsColl = importDbConnection.db.collection("jobs");
            const importConditions = [
                { job_no: { $regex: new RegExp("^" + safeNo + "$", "i") } },
                { tally_club_ref_no: { $regex: new RegExp("^" + safeNo + "$", "i") } },
                { custom_job_no: { $regex: new RegExp("^" + safeNo + "$", "i") } },
                ...resolveJobNumberQuery(job_number)
            ];
            job = await clientJobsColl.findOne({ $or: importConditions });
        } catch (err) {
            console.error("Error searching Import DB for job:", err);
        }
    }

    if (!job) return null;

    const isFreight = isFreightJob(job) || String(job_number).toUpperCase().includes("FF-") || String(job_number).toUpperCase().startsWith("FF");

    // If it's a child job of a club job, resolve and retrieve the parent job details instead
    if (!isFreight && !job.is_club_job_parent && job.parent_club_job) {
        let parentJob = await ExJobModel.findOne({
            $or: [{ job_no: job.parent_club_job }, { tally_club_ref_no: job.parent_club_job }]
        }).lean();
        if (!parentJob && importDbConnection && importDbConnection.readyState === 1) {
            try {
                parentJob = await importDbConnection.db.collection("jobs").findOne({
                    $or: [{ job_no: job.parent_club_job }, { tally_club_ref_no: job.parent_club_job }]
                });
            } catch (err) {}
        }
        if (parentJob) {
            job = parentJob;
        }
    }

    if (!isFreight && job.is_club_job_parent && Array.isArray(job.clubbed_jobs) && job.clubbed_jobs.length > 0) {
        // Format the club job series
        const clubJobSeries = formatClubJobSeries(job.clubbed_jobs, job.tally_club_ref_no || job.job_no);
        job.tally_club_ref_no = clubJobSeries;

        let childJobs = await ExJobModel.find({ job_no: { $in: job.clubbed_jobs } }).lean();
        if ((!childJobs || childJobs.length === 0) && importDbConnection && importDbConnection.readyState === 1) {
            try {
                childJobs = await importDbConnection.db.collection("jobs").find({ job_no: { $in: job.clubbed_jobs } }).toArray();
            } catch (err) {}
        }

        let totalNetWeight = 0;
        let totalGrossWeight = 0;
        let totalPkgs = 0;
        let allSbNos = [];

        (childJobs || []).forEach(j => {
            const nw = parseFloat(j.net_weight_kg || j.net_weight);
            const gw = parseFloat(j.gross_weight_kg || j.gross_weight);
            const pkgs = parseInt(j.total_no_of_pkgs || j.no_of_pkgs, 10);
            if (!isNaN(nw)) totalNetWeight += nw;
            if (!isNaN(gw)) totalGrossWeight += gw;
            if (!isNaN(pkgs)) totalPkgs += pkgs;
            if (j.sb_no) allSbNos.push(j.sb_no);
        });

        job.net_weight_kg = totalNetWeight.toFixed(3);
        job.gross_weight_kg = totalGrossWeight.toFixed(3);
        job.total_no_of_pkgs = totalPkgs.toString();
        job.sb_no = [...new Set(allSbNos)].filter(Boolean).join(", ");

        const uniqueContainersMap = new Map();
        (childJobs || []).flatMap(j => j.containers || []).forEach(c => {
            if (c && (c.containerNo || c.container_number || c.container_no)) {
                uniqueContainersMap.set(c.containerNo || c.container_number || c.container_no, c);
            }
        });
        job.containers = Array.from(uniqueContainersMap.values());

        const rawInvoices = (childJobs || []).flatMap(j => j.invoices || []);
        const seenInvs = new Set();
        const allInvoices = [];
        for (const inv of rawInvoices) {
            const num = String(inv.invoiceNumber || inv.invoice_number || inv.invoiceNo || inv.invoice_no || inv._id || "").trim().toUpperCase();
            if (num && seenInvs.has(num)) continue;
            if (num) seenInvs.add(num);
            allInvoices.push(inv);
        }
        let invNumbers = [];
        let invDates = [];
        let totalInvValue = 0;
        let totalFobValue = 0;
        let currency = "";

        allInvoices.forEach(inv => {
            if (inv.invoiceNumber || inv.invoice_number) invNumbers.push(inv.invoiceNumber || inv.invoice_number);
            if (inv.invoiceDate || inv.invoice_date) invDates.push(normalizeDate(inv.invoiceDate || inv.invoice_date));

            const invVal = parseFloat(inv.invoiceValue || inv.invoice_value) || 0;
            totalInvValue += invVal;

            const fob = parseFloat(inv.freightInsuranceCharges?.fobValue?.amount || invVal);
            const rate = parseFloat(inv.freightInsuranceCharges?.freight?.exchangeRate || job.exchange_rate || 1);
            totalFobValue += (fob * rate);

            if (!currency && inv.currency) currency = inv.currency;
        });

        job.invoices = [{
            invoiceNumber: formatInvoiceSeries([...new Set(invNumbers)].filter(Boolean)),
            invoiceDate: [...new Set(invDates)].filter(Boolean).join(", "),
            invoiceValue: totalInvValue,
            currency: currency || "USD",
            precalculatedFob: totalFobValue.toFixed(2),
            products: allInvoices[0]?.products || [],
            termsOfInvoice: allInvoices[0]?.termsOfInvoice || ""
        }];
    }

    const invoices = job.invoices || [];
    if (invoices.length === 0) {
        return [mapNormalJobAndInvoiceToTally(job, null, explicitFreight)];
    }
    return invoices.map(inv => mapNormalJobAndInvoiceToTally(job, inv, explicitFreight));
};

router.get("/job-data", authApiKey, async (req, res) => {
    try {
        const { job_number, invoice_number, freight } = req.query;
        if (!job_number) {
            return res.status(400).send({ error: "job_number is a required query parameter" });
        }
        const explicitFreight = freight !== undefined ? (String(freight).toLowerCase() === "true") : undefined;
        const responseData = await getJobDetailsInternal(job_number, explicitFreight);
        if (!responseData) {
            return res.status(404).send({ error: "Job not found for the provided job_number" });
        }

        // If an invoice_number query parameter is provided, find that specific invoice
        if (invoice_number && Array.isArray(responseData)) {
            const matched = responseData.find(inv =>
                (inv["Invoice Number"] || "").toLowerCase() === invoice_number.trim().toLowerCase()
            );
            if (matched) {
                return res.status(200).json(matched);
            }
        }

        // Return a single object (the first mapped invoice) instead of an array
        // to remove the [] brackets for Tally integration compatibility
        const singleObject = Array.isArray(responseData) ? (responseData[0] || {}) : responseData;
        res.status(200).json(singleObject);
    } catch (error) {
        console.error("Tally API Error:", error);
        res.status(500).send({ error: "Internal Server Error" });
    }
});


/**
 * @api {get} /api/tally/next-sequence Retrieve the next sequence number
 */
router.get("/next-sequence", authApiKey, async (req, res) => {
    try {
        const { type, jobNo, jobId } = req.query;
        if (!type || !jobNo) {
            return res.status(400).json({ error: "type (purchase/payment) and jobNo are required" });
        }

        let resolvedJobNo = jobNo;
        let job = null;

        // 1. Try finding job by exact jobId first if provided
        if (jobId) {
            job = await ExJobModel.findById(jobId).lean();
        }

        // 2. Direct exact match check on standard job fields
        if (!job) {
            const cleanNo = String(jobNo).trim();
            const safeNo = cleanNo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            job = await ExJobModel.findOne({
                $or: [
                    { job_no: { $regex: new RegExp("^" + safeNo + "$", "i") } },
                    { tally_club_ref_no: { $regex: new RegExp("^" + safeNo + "$", "i") } },
                    { agency_bill_no: { $regex: new RegExp("^" + safeNo + "$", "i") } },
                    { reimbursement_bill_no: { $regex: new RegExp("^" + safeNo + "$", "i") } },
                    { tally_bill_no: { $regex: new RegExp("^" + safeNo + "$", "i") } },
                    { custom_job_no: { $regex: new RegExp("^" + safeNo + "$", "i") } }
                ]
            }).lean();
        }

        // 3. Fallback to resolveJobNumberQuery if exact match was not found
        if (!job) {
            job = await ExJobModel.findOne({
                $or: resolveJobNumberQuery(jobNo)
            }).sort({ is_club_job_parent: -1 }).lean();
        }

        const isFreight = isFreightJob(job) || String(jobNo).toUpperCase().includes("FF-") || String(jobNo).toUpperCase().startsWith("FF");

        if (job && !isFreight) {
            if (!job.is_club_job_parent && job.parent_club_job) {
                const parentJob = await ExJobModel.findOne({
                    $or: [{ job_no: job.parent_club_job }, { tally_club_ref_no: job.parent_club_job }]
                }).lean();
                if (parentJob) {
                    job = parentJob;
                }
            }
        }

        let countQuery = {};
        if (!isFreight && job && job.is_club_job_parent && Array.isArray(job.clubbed_jobs) && job.clubbed_jobs.length > 0) {
            const formattedSeries = formatClubJobSeries(job.clubbed_jobs, job.tally_club_ref_no || job.job_no);
            resolvedJobNo = formattedSeries;

            // Generate candidates matching legacy/new patterns
            const candidates = new Set([
                job.job_no,
                job.tally_club_ref_no,
                formattedSeries,
                ...job.clubbed_jobs
            ].filter(Boolean));

            const orConditions = [];
            for (const cand of candidates) {
                const escapedCand = cand.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                orConditions.push({ jobNo: { $regex: new RegExp("^" + escapedCand + "$", "i") } });

                const parts = cand.split('/');
                if (parts.length === 5 && !cand.includes(" TO ") && !cand.includes(",")) {
                    orConditions.push({ jobNo: { $regex: new RegExp("(^|,|\\s)" + escapedCand + "(\\s|,|$)", "i") } });
                }
            }
            countQuery = { $or: orConditions };
        } else {
            if (type === "purchase") {
                countQuery = { jobNo: { $regex: new RegExp("^" + jobNo.split(",")[0].trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + "(,|$)", "i") } };
            } else {
                countQuery = { jobNo: { $regex: new RegExp("^" + jobNo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + "$", "i") } };
            }
        }

        let count = 0;
        let prefix = "";
        if (type === "purchase") {
            count = await PurchaseBookEntryModel.countDocuments(countQuery);
            prefix = "PB";
        } else if (type === "payment") {
            count = await PaymentRequestModel.countDocuments(countQuery);
            prefix = "R1";
        } else {
            return res.status(400).json({ error: "Invalid type." });
        }

        const nextIndex = (count + 1).toString().padStart(2, '0');
        let fullNo = `${prefix}/${nextIndex}/${resolvedJobNo}`;

        const parts = resolvedJobNo.split('/');
        const isExpOrImp = parts.length === 5 && (parts[1].toUpperCase() === 'EXP' || parts[1].toUpperCase() === 'IMP');
        const isOldExpOrImp = parts.length === 5 && (parts[2].toUpperCase() === 'EXP' || parts[2].toUpperCase() === 'IMP');
        if (isExpOrImp) {
            // Already in BRANCH/EXP|IMP/MODE/SERIAL/YEAR format
            fullNo = `${prefix}/${nextIndex}/${resolvedJobNo}`.toUpperCase();
        } else if (isOldExpOrImp) {
            // In OLD format: BRANCH/MODE/EXP|IMP/SERIAL/YEAR
            fullNo = `${prefix}/${nextIndex}/${parts[0]}/${parts[2]}/${parts[1]}/${parts[3]}/${parts[4]}`.toUpperCase();
        }

        res.status(200).json({
            success: true,
            nextIndex,
            fullNo,
            jobNo: resolvedJobNo
        });

    } catch (error) {
        console.error("Next Sequence Error:", error);
        res.status(500).send({ error: "Internal Server Error" });
    }
});

// Helper to join unique non-empty strings with a comma
const joinUniqueStrings = (arr) => {
    const unique = [...new Set(arr.map(s => String(s || '').trim()).filter(Boolean))];
    return unique.join(", ");
};

// Helper to join unique container numbers
const joinUniqueContainers = (arr) => {
    const allContainers = [];
    arr.forEach(s => {
        if (s) {
            s.split(",").forEach(c => {
                const trimmed = c.trim();
                if (trimmed && !allContainers.includes(trimmed)) {
                    allContainers.push(trimmed);
                }
            });
        }
    });
    return allContainers.join(", ");
};

// Helper to look up supplier invoice details from clubbed jobs
const getSupplierInvoiceDetails = async (mainJobNo, clubbedJobs, chargeHeading, mainInvNo, mainInvDate) => {
    let invNos = [mainInvNo].filter(Boolean);
    let invDates = [normalizeDate(mainInvDate)].filter(Boolean);

    if (clubbedJobs && clubbedJobs.length > 0 && chargeHeading) {
        const normHeading = chargeHeading.trim().toLowerCase();
        for (const jNo of clubbedJobs) {
            try {
                const job = await ExJobModel.findOne({ job_no: jNo }).lean();
                if (job && job.charges) {
                    const charge = job.charges.find(c => (c.chargeHead || '').trim().toLowerCase() === normHeading);
                    if (charge) {
                        const invNo = charge.invoice_number || charge.cost?.invoiceNo || '';
                        const invDate = charge.invoice_date || charge.cost?.invoiceDate || '';
                        if (invNo && !invNos.includes(invNo)) {
                            invNos.push(invNo);
                        }
                        const normD = normalizeDate(invDate);
                        if (normD && !invDates.includes(normD)) {
                            invDates.push(normD);
                        }
                    }
                }
            } catch (err) {
                console.error(`Error fetching supplier inv details for job ${jNo}:`, err);
            }
        }
    }
    return {
        supplierInvNo: invNos.join(", "),
        supplierInvDate: invDates.join(", ")
    };
};

// Helper to map Tally keys
const mapPurchaseEntryData = (data) => {
    const rawEntryNo = data["Entry No"] || data.entryNo || "";
    const entryNo = String(rawEntryNo).split(",")[0].trim();
    const jobNo = (data["Job No"] || data.jobNo || "").trim();

    return {
        entryNo,
        entryDate: normalizeDate(data["Entry Date"] || data.entryDate),
        supplierInvNo: data["Supplier Inv No"] || data.supplierInvNo,
        supplierInvDate: normalizeDate(data["Supplier Inv Date"] || data.supplierInvDate),
        jobNo,
        supplierName: data["Supplier Name"] || data.supplierName,
        address1: data["Address 1"] || data.address1,
        address2: data["Address 2"] || data.address2,
        address3: data["Address 3"] || data.address3,
        state: data["State"] || data.state,
        country: data["Country"] || data.country,
        pinCode: data["Pin Code"] || data.pinCode,
        registrationType: data["Registration Type"] || data.registrationType,
        gstinNo: data["GSTIN NO"] || data["GSTIN No"] || data.gstinNo,
        pan: data["PAN"] || data.pan,
        cin: data["CIN"] || data.cin,
        placeOfSupply: data["Place of Supply"] || data.placeOfSupply,
        creditTerms: data["Credit Terms"] || data.creditTerms,
        descriptionOfServices: data["Description of Services"] || data.descriptionOfServices,
        revenueLedger: (data["Revenue Ledger"] || data["Revenue ledger"] || data.revenueLedger || data.revenue_ledger || "").replace(/\s*-\s*[EI]$/i, "").replace(/^NEW\s*-\s*/i, "").replace(/^NEW\s+/i, ""),
        chargeHeading: data["Charge Heading"] || data.chargeHeading,
        sac: data["SAC"] || data.sac,
        taxableValue: data["Taxable Value"] || data.taxableValue,
        gstPercent: data["GST%"] || data.gstPercent,
        cgstAmt: data["CGST"] || data.cgstAmt,
        sgstAmt: data["SGST"] || data.sgstAmt,
        igstAmt: data["IGST"] || data.igstAmt,
        tds: data["TDS"] || data.tds,
        total: data["Total"] || data.total,
        netAmount: data["Net Amount"] || data.netAmount,
        revenueAmount: Number(data["Revenue Amount"] || data.revenueAmount || data["Revenue Total"] || data.revenueTotal || 0),
        revenueBasicAmount: Number(data["Revenue Basic Amount"] || data.revenueBasicAmount || 0),
        revenueGstAmount: Number(data["Revenue GST Amount"] || data.revenueGstAmount || 0),
        revenueCgst: Number(data["Revenue CGST"] || data.revenueCgst || 0),
        revenueSgst: Number(data["Revenue SGST"] || data.revenueSgst || 0),
        revenueIgst: Number(data["Revenue IGST"] || data.revenueIgst || 0),
        revenueTotal: Number(data["Revenue Total"] || data.revenueTotal || data["Revenue Amount"] || data.revenueAmount || 0),
        chargeRef: data.chargeRef,
        jobRef: data.jobRef,
        status: data["Status"] || data.status || '',
        chargeHeadCategory: data["Charge Head Category"] || data.chargeHeadCategory || '',
        isClubJob: data.isClubJob !== undefined ? data.isClubJob : false,
        clubbedJobs: Array.isArray(data.clubbedJobs) ? data.clubbedJobs : [],
        virtualBalanceTerminal: data["Virtual Balance Terminal"] || data["Virtual Balance"] || data.virtualBalanceTerminal || data.virtualBalance || '',
        isMultiCharge: data.isMultiCharge !== undefined ? data.isMultiCharge : false,
        chargeItems: Array.isArray(data.chargeItems) ? data.chargeItems : [],
        chargeRefs: Array.isArray(data.chargeRefs) ? data.chargeRefs : [],
        currency: data["Currency"] || data["Invoice Currency"] || data.currency || "INR",
        currencyAmount: Number(data["Currency Amount"] || data["Foreign Currency Amount"] || data.currencyAmount || data.foreignCurrencyAmount || 0),
        exchangeRate: Number(data["Exchange Rate"] || data.exchangeRate || 1),
        qty: data["Qty"] !== undefined && data["Qty"] !== null ? Number(data["Qty"]) : (data.qty !== undefined ? Number(data.qty) : 1),
        rate: data["Rate"] !== undefined && data["Rate"] !== null ? Number(data["Rate"]) : (data.rate !== undefined ? Number(data.rate) : 0),
        etaDate: normalizeDate(data["ETA Date"] || data.etaDate),
        volumeCbm: data["Volume CBM"] || data["Volume (CBM)"] || data["Volume"] || data.volumeCbm || '',
        igmNo: data["IGM Number"] || data["IGM No"] || data.igmNo || '',
        igmDate: normalizeDate(data["IGM Date"] || data.igmDate)
    };
};

router.post("/purchase-entry", authApiKey, async (req, res) => {
    try {
        const data = mapPurchaseEntryData(req.body);

        // Handle multi-charge purchase book entries
        if (req.body.isMultiCharge && Array.isArray(req.body.chargeItems)) {
            data.isMultiCharge = true;
            data.chargeItems = req.body.chargeItems;
            data.chargeRefs = req.body.chargeRefs || [];
        }

        // Include Job Details
        const firstJob = String(data.jobNo).split(",")[0].trim();
        const details = await getJobDetailsInternal(firstJob);
        if (details) {
            data.jobDetails = details;
        } else {
            data.jobDetails = [];
        }

        const entry = await PurchaseBookEntryModel.create(data);
        res.status(201).json({
            success: true,
            "Entry No": entry.entryNo
        });
    } catch (error) {
        if (error.code === 11000) return res.status(400).json({ error: "Duplicate entry." });
        res.status(500).send({ error: "Internal Server Error" });
    }
});

router.get("/purchase-entry", authApiKey, async (req, res) => {
    try {
        const entryNo = req.query.entry_no || req.query.entryNo;
        if (!entryNo) return res.status(400).json({ error: "entry_no is a required query parameter" });

        // Find using either the exact entryNo, or the first part if it's comma-separated
        const firstPart = String(entryNo).split(",")[0].trim();
        const entry = await PurchaseBookEntryModel.findOne({
            $or: [
                { entryNo: entryNo },
                { entryNo: firstPart }
            ]
        }).lean();

        if (!entry) return res.status(404).json({ error: "Purchase Book Entry not found." });

        // Fetch Charge Head Category and TDS Rate from Job & Charge details
        let chargeCategory = entry.chargeHeadCategory;
        let tdsRate = 0;
        let chargeObj = null;
        let job = null;
        try {
            if (entry.jobRef) {
                job = await ExJobModel.findById(entry.jobRef).lean();
            }
            if (!job && entry.jobNo) {
                const firstJob = String(entry.jobNo).split(",")[0].trim();
                job = await ExJobModel.findOne({
                    $or: resolveJobNumberQuery(firstJob)
                }).sort({ is_club_job_parent: -1 }).lean();
            }
            if (job) {
                if (entry.chargeRef) {
                    chargeObj = job.charges?.find(c => c._id?.toString() === String(entry.chargeRef));
                }
                if (!chargeObj && entry.chargeHeading) {
                    const normHeading = entry.chargeHeading.trim().toLowerCase();
                    chargeObj = job.charges?.find(c => (c.name || c.chargeHead || c.chargeHeading)?.trim().toLowerCase() === normHeading);
                }
                if (chargeObj) {
                    if (!chargeCategory) {
                        chargeCategory = chargeObj.chargeType || chargeObj.category;
                    }
                    if (chargeObj.cost && chargeObj.cost.tdsPercent !== undefined) {
                        tdsRate = Number(chargeObj.cost.tdsPercent);
                    }
                }
            }
        } catch (err) {
            console.error("Error fetching job/charge details for purchase entry:", err);
        }

        // Fallback calculation if tdsRate is not retrieved
        if (!tdsRate && entry.tds && entry.taxableValue) {
            const calculated = (entry.tds / entry.taxableValue) * 100;
            tdsRate = Math.round(calculated);
        }

        // Ensure tdsRate is either 1 or 2
        if (tdsRate !== 2) {
            tdsRate = 1;
        }

        const tdsKey = tdsRate === 2 ? "TDS ON CONTRACT 94C 1024" : "TDS ON CONTRACT 94C 1023";

        // Get comma-separated supplier invoice numbers & dates if clubbed
        let supplierInvNo = entry.supplierInvNo;
        let supplierInvDate = normalizeDate(entry.supplierInvDate);
        let c1ParentJobNo = null;

        const firstJobRaw = String(entry.jobNo).split(",")[0].trim();
        let rawJobDB = null;
        try {
            rawJobDB = await ExJobModel.findOne({
                $or: resolveJobNumberQuery(firstJobRaw)
            }).sort({ is_club_job_parent: -1 }).lean();
        } catch (e) { }

        const isFreightForwardingJob = isFreightJob(rawJobDB) || String(firstJobRaw).toUpperCase().includes("FF-") || String(firstJobRaw).toUpperCase().startsWith("FF");
        let isClub = !isFreightForwardingJob && entry.isClubJob;
        let clubbedList = !isFreightForwardingJob ? (entry.clubbedJobs || []) : [];

        if (rawJobDB && !isFreightForwardingJob) {
            if (rawJobDB.is_club_job_parent && rawJobDB.clubbed_jobs?.length > 0) {
                isClub = true;
                clubbedList = rawJobDB.clubbed_jobs;
                c1ParentJobNo = rawJobDB.tally_club_ref_no || rawJobDB.job_no;
            } else if (rawJobDB.parent_club_job) {
                try {
                    const parentJob = await ExJobModel.findOne({
                        $or: [{ job_no: rawJobDB.parent_club_job }, { tally_club_ref_no: rawJobDB.parent_club_job }]
                    }).lean();
                    if (parentJob) {
                        isClub = true;
                        clubbedList = parentJob.clubbed_jobs || [];
                        c1ParentJobNo = parentJob.tally_club_ref_no || parentJob.job_no;
                    } else {
                        c1ParentJobNo = rawJobDB.tally_club_ref_no || rawJobDB.parent_club_job;
                    }
                } catch (err) {
                    c1ParentJobNo = rawJobDB.tally_club_ref_no || rawJobDB.parent_club_job;
                }
            }
        }

        if (isClub && clubbedList?.length > 0 && entry.chargeHeading) {
            const { supplierInvNo: clubInvNo, supplierInvDate: clubInvDate } = await getSupplierInvoiceDetails(
                firstJobRaw,
                clubbedList,
                entry.chargeHeading,
                entry.supplierInvNo,
                entry.supplierInvDate
            );
            supplierInvNo = clubInvNo;
            supplierInvDate = clubInvDate;
        }

        const tdsVal = Number(entry.tds || 0);
        let grossTotal = entry.total;
        let netAmount = entry.netAmount;
        if (netAmount === undefined || netAmount === null) {
            netAmount = entry.total;
            grossTotal = netAmount + tdsVal;
        }

        // Resolve cost currency, exchange rate, qty, and rate from chargeObj in job.charges if entry values are missing or default
        const costObj = chargeObj?.cost || {};
        const costCurrency = costObj.currency || chargeObj?.currency || "";
        const costExRate = costObj.exchangeRate || costObj.exRate || chargeObj?.exchangeRate || chargeObj?.exRate || 1;
        const costQty = costObj.qty !== undefined ? costObj.qty : (chargeObj?.qty !== undefined ? chargeObj.qty : 1);
        const costRate = costObj.rate !== undefined ? costObj.rate : (chargeObj?.rate !== undefined ? chargeObj.rate : 0);
        const costForeignAmt = costObj.amount !== undefined ? costObj.amount : (costObj.currencyAmount || costObj.foreignCurrencyAmount);

        let finalCurrency = entry.currency;
        if (!finalCurrency || finalCurrency === "INR") {
            if (costCurrency && costCurrency !== "INR") {
                finalCurrency = costCurrency;
            }
        }
        if (!finalCurrency) finalCurrency = "INR";

        let finalExRate = entry.exchangeRate !== undefined && entry.exchangeRate !== null && entry.exchangeRate !== 0
            ? Number(entry.exchangeRate)
            : (costExRate !== 1 ? Number(costExRate) : (finalCurrency !== "INR" ? 1 : 1));

        let finalCurrencyAmt = entry.currencyAmount !== undefined && entry.currencyAmount !== null && entry.currencyAmount !== 0
            ? Number(entry.currencyAmount)
            : (costForeignAmt !== undefined && costForeignAmt !== null && costForeignAmt !== 0
                ? Number(costForeignAmt)
                : (finalCurrency !== "INR" ? (entry.taxableValue || (costQty * costRate)) : ""));

        let finalQty = entry.qty !== undefined && entry.qty !== null ? Number(entry.qty) : Number(costQty || 1);
        let finalRate = entry.rate !== undefined && entry.rate !== null ? Number(entry.rate) : Number(costRate || 0);

        const formattedData = {
            "Entry No": entry.entryNo,
            "Entry Date": normalizeDate(entry.entryDate),
            "Supplier Inv No": supplierInvNo,
            "Supplier Inv Date": supplierInvDate,
            "Job No": (isClub && clubbedList.length > 0) ? formatClubJobSeries(clubbedList, c1ParentJobNo || entry.jobNo) : (c1ParentJobNo ? c1ParentJobNo : entry.jobNo),
            "Supplier Name": entry.supplierName,
            "Address 1": entry.address1,
            "Address 2": entry.address2,
            "Address 3": entry.address3,
            "State": entry.state,
            "Country": entry.country,
            "Pin Code": entry.pinCode,
            "Registration Type": entry.registrationType,
            "GSTIN No": entry.gstinNo,
            "PAN": entry.pan,
            "CIN": entry.cin,
            "Place of Supply": entry.placeOfSupply,
            "Credit Terms": entry.creditTerms,
            "Description of Services": entry.descriptionOfServices || (entry.supplierName ? `NEW - ${entry.supplierName}` : ""),
            "Charge Heading": entry.chargeHeading || "",
            "SAC": entry.sac,
            "Taxable Value": entry.taxableValue,
            "GST%": entry.gstPercent,
            "CGST": entry.cgstAmt,
            "SGST": entry.sgstAmt,
            "IGST": entry.igstAmt,
            [tdsKey]: entry.tds,
            "Total": grossTotal,
            "Net Amount": netAmount,
            "Charge Description": entry.chargeDescription || '',
            "Charge Head Category": chargeCategory || '',
            "TDS Category": tdsKey,
            "Status": entry.status,
            "isClubJob": entry.isClubJob || false,
            "clubbedJobs": entry.clubbedJobs || [],
            "Qty": finalQty,
            "Rate": finalRate,
            "Currency": finalCurrency,
            "Currency Amount": finalCurrencyAmt,
            "Exchange Rate": finalExRate,
            "ETA Date": normalizeDate(entry.etaDate),
            "Volume CBM": entry.volumeCbm || "",
            "IGM Number": entry.igmNo || "",
            "IGM Date": normalizeDate(entry.igmDate)
        };

        // SAFETY: If it's a reimbursement, zero out GST fields for Tally even if saved in DB
        if (formattedData["Charge Head Category"] === "Reimbursement") {
            formattedData["GST%"] = "";
            formattedData["CGST"] = "";
            formattedData["SGST"] = "";
            formattedData["IGST"] = "";

            // Custom Description of Services for reimbursements
            if (!entry.descriptionOfServices && entry.supplierName) {
                formattedData["Description of Services"] = `NEW - ${entry.supplierName}`;
            }

            // For reimbursements, the taxable value should be the total value before TDS.
            const taxable = Number(entry.taxableValue || entry.total || 0);
            formattedData["Taxable Value"] = taxable.toFixed(2);

            // The total value should be the net value (after TDS deduction)
            const net = entry.netAmount !== undefined && entry.netAmount !== null
                ? Number(entry.netAmount)
                : (Number(entry.total || 0) - Number(entry.tds || 0));

            formattedData["Total"] = net;
            formattedData["Net Amount"] = net;
        } else if (String(formattedData["Charge Head Category"]).toLowerCase() === "margin") {
            // For Margin, do not change the logic of taxable value, but ensure Total is set to netAmount
            formattedData["Total"] = netAmount;
        }

        // Determine freight flag
        const explicitFreight = req.query.freight !== undefined ? (String(req.query.freight).toLowerCase() === "true") : undefined;
        const isFreight = explicitFreight !== undefined ? explicitFreight : (isClub ? true : (isFreightJob(rawJobDB) || isFreightJob(entry)));

        formattedData["freight"] = isFreight;
        formattedData["Freight"] = isFreight;

        // Include Job Details
        const jobNoToFetch = (isClub && c1ParentJobNo) ? c1ParentJobNo : entry.jobNo;
        const jobDetails = await getJobDetailsInternal(jobNoToFetch, explicitFreight);
        if (jobDetails) {
            formattedData["Job Details"] = jobDetails;
        } else {
            formattedData["Job Details"] = [];
        }

        // Determine revenue details (from entry or fallback to job charge)
        let revObj = (chargeObj && chargeObj.revenue) ? chargeObj.revenue : {};
        let revenueAmount = (entry.revenueAmount !== undefined && entry.revenueAmount !== null && entry.revenueAmount !== 0)
            ? Number(entry.revenueAmount)
            : Number(revObj.amountINR || revObj.amount || revObj.totalAmount || (revObj.rate ? revObj.rate * (revObj.qty || 1) : 0));

        formattedData["Revenue Amount"] = revenueAmount.toFixed(2);

        // Include chargeItems array with cost & revenue details
        formattedData["isMultiCharge"] = entry.isMultiCharge || false;
        formattedData["chargeItems"] = (Array.isArray(entry.chargeItems) && entry.chargeItems.length > 0)
            ? entry.chargeItems.map(item => {
                const cat = item.category || item.chargeType || '';
                const isReimbursement = (cat === 'Reimbursement');
                const isMargin = (String(cat).toLowerCase() === 'margin');

                let rawItemHead = item.chargeHead || item.chargeHeading || item.name || item.chargeName || (chargeObj && (chargeObj.name || chargeObj.chargeHead || chargeObj.chargeHeading || chargeObj.particulars)) || entry.chargeHeading || entry.chargeDescription || (isReimbursement ? entry.supplierName : '') || '';
                let itemHead = typeof rawItemHead === 'string'
                    ? rawItemHead.replace(/\s*-\s*[EI]$/i, '').replace(/^NEW\s*-\s*/i, '').replace(/^NEW\s+/i, '').trim()
                    : rawItemHead;

                let itemDesc = item.descriptionOfServices || item.chargeDescription || '';
                if (!itemDesc) {
                    if (isReimbursement) {
                        itemDesc = entry.supplierName ? `NEW - ${entry.supplierName}` : itemHead;
                    } else if (isMargin) {
                        itemDesc = itemHead;
                    } else {
                        itemDesc = entry.supplierName ? `NEW - ${entry.supplierName}` : itemHead;
                    }
                }
                if (isReimbursement && entry.supplierName && !itemDesc.startsWith('NEW - ')) {
                    itemDesc = `NEW - ${entry.supplierName}`;
                }
                if (isMargin && itemDesc && !itemDesc.endsWith(' - E')) {
                    itemDesc = `${itemDesc} - E`;
                }

                // Revenue Ledger: Fall back to revObj -> entry.revenueLedger -> itemHead -> chargeObj -> entry.supplierName
                let rawRevLedger = item.revenueLedger || item.revenue_ledger || item.revenueHead || item.revenueHeading || (revObj && (revObj.chargeHead || revObj.chargeHeading || revObj.particulars || revObj.name)) || entry.revenueLedger || itemHead || (chargeObj && (chargeObj.name || chargeObj.chargeHead || chargeObj.chargeHeading || chargeObj.particulars)) || entry.chargeHeading || entry.supplierName || '';
                let itemRevLedger = typeof rawRevLedger === 'string'
                    ? rawRevLedger.replace(/\s*-\s*[EI]$/i, '').replace(/^NEW\s*-\s*/i, '').replace(/^NEW\s+/i, '').trim()
                    : rawRevLedger;

                const itemTaxable = Number(item.taxableValue || item.costAmount || item.basicAmount || item.total || 0);
                const itemTds = Number(item.tdsAmount || item.tds || 0);
                const itemNet = (item.netPayable !== undefined && item.netPayable !== null && item.netPayable !== 0)
                    ? Number(item.netPayable)
                    : (itemTaxable - itemTds);

                let itemTotal = Number(item.total || item.totalAmount || 0);
                if (isReimbursement || isMargin) {
                    itemTotal = itemNet; // For reimbursement and margin, total equals net payable
                }

                const itemRevAmt = (item.revenueAmount !== undefined && item.revenueAmount !== null && item.revenueAmount !== 0)
                    ? Number(item.revenueAmount)
                    : revenueAmount;

                let targetJob = job || rawJobDB;
                let itemMatchedCharge = null;
                if (targetJob && Array.isArray(targetJob.charges)) {
                    if (item.chargeId || item.chargeRef) {
                        const targetId = String(item.chargeId || item.chargeRef);
                        itemMatchedCharge = targetJob.charges.find(c => c._id?.toString() === targetId);
                    }
                    if (!itemMatchedCharge && itemHead) {
                        const targetHead = itemHead.trim().toLowerCase();
                        itemMatchedCharge = targetJob.charges.find(c => (c.name || c.chargeHead || c.chargeHeading)?.trim().toLowerCase() === targetHead);
                    }
                }
                const itemCost = itemMatchedCharge?.cost || {};
                const itemCostCurrency = itemCost.currency || itemMatchedCharge?.currency || "";
                const itemCostExRate = itemCost.exchangeRate || itemCost.exRate || itemMatchedCharge?.exchangeRate || itemMatchedCharge?.exRate || 1;
                const itemCostQty = itemCost.qty !== undefined ? itemCost.qty : (itemMatchedCharge?.qty !== undefined ? itemMatchedCharge.qty : undefined);
                const itemCostRate = itemCost.rate !== undefined ? itemCost.rate : (itemMatchedCharge?.rate !== undefined ? itemMatchedCharge.rate : undefined);
                const itemCostForeignAmt = itemCost.amount !== undefined ? itemCost.amount : (itemCost.currencyAmount || itemCost.foreignCurrencyAmount);

                let itemCurrency = item.currency || item.costCurrency || item.chargeCurrency;
                if (!itemCurrency || itemCurrency === "INR") {
                    if (itemCostCurrency && itemCostCurrency !== "INR") {
                        itemCurrency = itemCostCurrency;
                    } else if (finalCurrency && finalCurrency !== "INR") {
                        itemCurrency = finalCurrency;
                    } else {
                        itemCurrency = itemCurrency || finalCurrency || "INR";
                    }
                }

                let itemCurrencyAmt = item.currencyAmount !== undefined && item.currencyAmount !== null && item.currencyAmount !== 0
                    ? Number(item.currencyAmount)
                    : (item.foreignCurrencyAmount !== undefined && item.foreignCurrencyAmount !== 0
                        ? Number(item.foreignCurrencyAmount)
                        : (itemCostForeignAmt !== undefined && itemCostForeignAmt !== null && itemCostForeignAmt !== 0
                            ? Number(itemCostForeignAmt)
                            : (itemCurrency !== "INR" ? itemTaxable : "")));

                let itemExRate = item.exchangeRate !== undefined && item.exchangeRate !== null && item.exchangeRate !== 0
                    ? Number(item.exchangeRate)
                    : (itemCostExRate !== 1 ? Number(itemCostExRate) : (finalExRate !== 1 ? finalExRate : (itemCurrency !== "INR" ? 1 : 1)));

                let itemQty = item.qty !== undefined && item.qty !== null ? Number(item.qty) : (itemCostQty !== undefined ? Number(itemCostQty) : finalQty);
                let itemRate = item.rate !== undefined && item.rate !== null ? Number(item.rate) : (itemCostRate !== undefined ? Number(itemCostRate) : finalRate);

                return {
                    "Charge Heading": itemHead,
                    "Description of Services": itemDesc,
                    "Revenue Ledger": itemRevLedger,
                    "Charge ID": item.chargeId || '',
                    "SAC": item.sac || '',
                    "Charge Head Category": cat,
                    "TDS Category": tdsKey,
                    [tdsKey]: itemTds,
                    "Taxable Value": itemTaxable.toFixed(2),
                    "GST%": isReimbursement ? "" : (item.gstRate || 0),
                    "CGST": isReimbursement ? "" : (item.cgst || 0),
                    "SGST": isReimbursement ? "" : (item.sgst || 0),
                    "IGST": isReimbursement ? "" : (item.igst || 0),
                    "Total": Math.round(itemTotal),
                    "Net Amount": Math.round(itemNet),
                    "Revenue Amount": itemRevAmt.toFixed(2),
                    "Supplier Inv No": item.invoiceNumber || supplierInvNo || '',
                    "Supplier Inv Date": item.invoiceDate || supplierInvDate || '',
                    "Qty": itemQty,
                    "Rate": itemRate,
                    "Currency": itemCurrency,
                    "Currency Amount": itemCurrencyAmt,
                    "Exchange Rate": itemExRate
                };
            })
            : (() => {
                const fallbackIsMargin = (String(chargeCategory).toLowerCase() === 'margin');
                let rawFallbackHead = entry.chargeHeading || entry.chargeDescription || (chargeObj && (chargeObj.name || chargeObj.chargeHead || chargeObj.chargeHeading || chargeObj.particulars)) || (chargeCategory === 'Reimbursement' ? entry.supplierName : '') || '';
                let fallbackHead = typeof rawFallbackHead === 'string'
                    ? rawFallbackHead.replace(/\s*-\s*[EI]$/i, '').replace(/^NEW\s*-\s*/i, '').replace(/^NEW\s+/i, '').trim()
                    : rawFallbackHead;

                let fallbackDesc = entry.descriptionOfServices || '';
                if (!fallbackDesc) {
                    if (chargeCategory === 'Reimbursement') {
                        fallbackDesc = entry.supplierName ? `NEW - ${entry.supplierName}` : fallbackHead;
                    } else if (fallbackIsMargin) {
                        fallbackDesc = fallbackHead;
                    } else {
                        fallbackDesc = entry.supplierName ? `NEW - ${entry.supplierName}` : fallbackHead;
                    }
                }
                if (chargeCategory === 'Reimbursement' && entry.supplierName && !fallbackDesc.startsWith('NEW - ')) {
                    fallbackDesc = `NEW - ${entry.supplierName}`;
                }
                if (fallbackIsMargin && fallbackDesc && !fallbackDesc.endsWith(' - E')) {
                    fallbackDesc = `${fallbackDesc} - E`;
                }

                let rawFallbackRevLedger = entry.revenueLedger || (revObj && (revObj.chargeHead || revObj.chargeHeading || revObj.particulars || revObj.name)) || fallbackHead || (chargeObj && (chargeObj.name || chargeObj.chargeHead || chargeObj.chargeHeading || chargeObj.particulars)) || entry.chargeHeading || entry.supplierName || '';
                let fallbackRevLedger = typeof rawFallbackRevLedger === 'string'
                    ? rawFallbackRevLedger.replace(/\s*-\s*[EI]$/i, '').replace(/^NEW\s*-\s*/i, '').replace(/^NEW\s+/i, '').trim()
                    : rawFallbackRevLedger;

                return [{
                    "Charge Heading": fallbackHead,
                    "Description of Services": fallbackDesc,
                    "Revenue Ledger": fallbackRevLedger,
                    "Charge ID": entry.chargeRef || '',
                    "SAC": entry.sac || '',
                    "Charge Head Category": chargeCategory || '',
                    "TDS Category": tdsKey,
                    [tdsKey]: Number(entry.tds || 0),
                    "Taxable Value": (formattedData["Taxable Value"] !== undefined ? formattedData["Taxable Value"] : Number(entry.taxableValue || 0).toFixed(2)),
                    "GST%": (chargeCategory === 'Reimbursement') ? "" : (entry.gstPercent || 0),
                    "CGST": (chargeCategory === 'Reimbursement') ? "" : (entry.cgstAmt || 0),
                    "SGST": (chargeCategory === 'Reimbursement') ? "" : (entry.sgstAmt || 0),
                    "IGST": (chargeCategory === 'Reimbursement') ? "" : (entry.igstAmt || 0),
                    "Total": Math.round(formattedData["Total"] !== undefined ? formattedData["Total"] : (grossTotal || 0)),
                    "Net Amount": Math.round(formattedData["Net Amount"] !== undefined ? formattedData["Net Amount"] : (netAmount || 0)),
                    "Revenue Amount": revenueAmount.toFixed(2),
                    "Supplier Inv No": supplierInvNo || '',
                    "Supplier Inv Date": supplierInvDate || '',
                    "Qty": finalQty,
                    "Rate": finalRate,
                    "Currency": finalCurrency,
                    "Currency Amount": finalCurrencyAmt,
                    "Exchange Rate": finalExRate
                }];
            })();
        formattedData["chargeRefs"] = entry.chargeRefs || (entry.chargeRef ? [entry.chargeRef] : []);

        // Always keep ONLY common fields at top-level; charge details go inside chargeItems
        delete formattedData["Charge Heading"];
        delete formattedData["SAC"];
        delete formattedData["Taxable Value"];
        delete formattedData["GST%"];
        delete formattedData["CGST"];
        delete formattedData["SGST"];
        delete formattedData["IGST"];
        delete formattedData[tdsKey];
        delete formattedData["Total"];
        delete formattedData["Net Amount"];
        delete formattedData["Revenue Amount"];
        delete formattedData["Description of Services"];
        delete formattedData["Revenue Ledger"];
        delete formattedData["Charge Description"];
        delete formattedData["Charge Head Category"];
        delete formattedData["TDS Category"];

        res.status(200).json(formattedData);
    } catch (error) {
        console.error("Fetch Purchase Entry Error:", error);
        res.status(500).send({ error: "Internal Server Error" });
    }
});

const mapPaymentRequestData = (data) => ({
    requestNo: data["Request No"] || data.requestNo || data.request_no || data.requestno,
    requestDate: normalizeDate(data["Request Date"] || data.requestDate || data.request_date || data.requestdate),
    bankFrom: data["Bank From"] || data.bankFrom || data.bank_from || data.bankfrom,
    paymentTo: data["Payment To"] || data.paymentTo || data.payment_to || data.paymentto,
    againstBill: data["Against Bill"] || data.againstBill || data.against_bill || data.againstbill,
    amount: data["Amount"] || data.amount || data.amount,
    transactionType: data["Transaction Type"] || data.transactionType || data.transaction_type || data.transactiontype,
    accountNo: data["Account No"] || data.accountNo || data.account_no || data.accountno || data.acNo || data.ac_no,
    ifscCode: data["IFSC Code"] || data.ifscCode || data.ifsc_code || data.ifsccode || data.ifsc || data.ifsCode || data.ifs_code,
    bankName: data["Bank Name"] || data.bankName || data.bank_name || data.bankname,
    jobNo: data["Job No"] || data.jobNo || data.job_no || data.jobno,
    chargeRef: data.chargeRef || data.charge_ref || data.chargeref,
    jobRef: data.jobRef || data.job_ref || data.jobref,
    instrumentNo: data["Instrument No"] || data.instrumentNo || data.instrument_no || data.instrumentno,
    instrumentDate: normalizeDate(data["Instrument Date"] || data.instrumentDate || data.instrument_date || data.instrumentdate),
    transferMode: data["Transfer Mode"] || data.transferMode || data.transfer_mode || data.transfermode,
    beneficiaryCode: data["Beneficiary Code"] || data.beneficiaryCode || data.beneficiary_code || data.beneficiarycode,
    grossAmount: data["Gross Amount"] || data.grossAmount || data.gross_amount || data.grossamount,
    tdsAmount: data["TDS Amount"] || data.tdsAmount || data.tds_amount || data.tdsamount,
    tdsCategory: data["TDS Category"] || data.tdsCategory || data.tds_category || data.tdscategory,
    status: data["Status"] || data.status || data.status || ''
});

router.post("/payment-request", authApiKey, async (req, res) => {
    try {
        const data = mapPaymentRequestData(req.body);
        const request = await PaymentRequestModel.create(data);
        res.status(201).json({ success: true, "Request No": request.requestNo });
    } catch (error) {
        if (error.code === 11000) return res.status(400).json({ error: "Duplicate." });
        res.status(500).send({ error: "Internal Server Error" });
    }
});

router.get("/payment-request", authApiKey, async (req, res) => {
    try {
        const requestNo = req.query.request_no || req.query.requestNo;
        if (!requestNo) {
            return res.status(400).json({ error: "request_no required" });
        }

        const request = await PaymentRequestModel.findOne({ requestNo }).lean();
        if (!request) {
            return res.status(404).json({ error: "Not found" });
        }

        // Enrich with charge details from the job
        let enriched = { ...request };
        if (request.chargeRef && request.jobRef) {
            try {
                const job = await ExJobModel.findById(request.jobRef).lean();
                if (job) {
                    const charge = job.charges?.find(c => c._id?.toString() === request.chargeRef);
                    if (charge) {
                        const cost = charge.cost || {};
                        enriched.chargeHead = charge.chargeHead || "";
                        enriched.category = charge.category || "";
                        enriched.invoiceNo = charge.invoice_number || cost.invoiceNo || "";
                        enriched.invoiceDate = charge.invoice_date || cost.invoiceDate || "";
                        enriched.description = cost.chargeDescription || charge.chargeHead || "";
                        enriched.url = cost.url || [];

                        // GST details
                        enriched.isGst = cost.isGst || false;
                        enriched.gstPercent = cost.gstRate || 18;
                        enriched.taxableValue = cost.basicAmount || 0;
                        enriched.gstAmount = cost.gstAmount || 0;
                        enriched.cgstAmt = cost.cgst || 0;
                        enriched.sgstAmt = cost.sgst || 0;
                        enriched.igstAmt = cost.igst || 0;

                        // TDS details
                        enriched.isTds = cost.isTds || false;
                        enriched.tdsPercent = cost.tdsPercent || 0;
                        enriched.tdsAmount = enriched.tdsAmount || cost.tdsAmount || 0;
                        enriched.netPayable = cost.netPayable || request.amount || 0;

                        // Party details
                        enriched.partyName = cost.partyName || request.paymentTo || "";
                        enriched.partyType = cost.partyType || "";

                        // Qty, Rate, Currency, Exchange Rate details
                        enriched.qty = cost.qty !== undefined && cost.qty !== null ? cost.qty : 1;
                        enriched.rate = cost.rate !== undefined && cost.rate !== null ? cost.rate : (cost.basicAmount || cost.amount || 0);
                        enriched.currency = cost.currency || charge.currency || "INR";
                        enriched.currencyAmount = cost.amount !== undefined ? cost.amount : (cost.currencyAmount || "");
                        enriched.exchangeRate = cost.exchangeRate || cost.exRate || charge.exchangeRate || 1;
                    }

                    // Enrich with supplier directory info (GSTIN, PAN, address)
                    enriched.jobNo = enriched.jobNo || job.job_no || "";
                }
            } catch (e) {
                console.error("Error enriching payment request:", e);
            }
        }

        // Try to get supplier GSTIN/PAN/address from directory
        if (enriched.paymentTo) {
            try {
                const mongoose = (await import("mongoose")).default;
                const DirectoryModel = mongoose.models.directory || mongoose.model("directory", new mongoose.Schema({}, { strict: false, collection: "directories" }));
                const supplier = await DirectoryModel.findOne({ organization: { $regex: new RegExp(`^${enriched.paymentTo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } }).lean();
                if (supplier) {
                    const branch = supplier.branchInfo?.[0] || {};
                    enriched.address = [branch.address, branch.city, branch.state, branch.country, branch.pinCode ? `- ${branch.pinCode}` : ""].filter(Boolean).join(", ");
                    enriched.gstin = branch.gst || supplier.gstin || "";
                    enriched.pan = supplier.pan || enriched.gstin?.substring(2, 12) || "";
                }
            } catch (dirErr) {
                console.error("Directory lookup error:", dirErr);
            }
        }

        // Determine freight flag for payment request
        const explicitFreight = req.query.freight !== undefined ? (String(req.query.freight).toLowerCase() === "true") : undefined;
        const job_number = enriched.jobNo;
        const jobDetails = await getJobDetailsInternal(job_number, explicitFreight);
        const isFreight = explicitFreight !== undefined 
            ? explicitFreight 
            : (Boolean(enriched.jobNo && String(enriched.jobNo).toUpperCase().includes("FF")) || isFreightJob(jobDetails?.[0]));

        enriched["freight"] = isFreight;
        enriched["Freight"] = isFreight;

        if (jobDetails) {
            enriched["Job Details"] = jobDetails;
        }

        res.status(200).json(enriched);
    } catch (error) {
        console.error("Payment request fetch error:", error);
        res.status(500).send({ error: "Internal Server Error" });
    }
});

/**
 * Automatically formats a single raw bill number from Tally (e.g. "0863", "0001", "1")
 * into the official branch bill number (e.g. GEA/0863/26-27, GIA/00001/26-27, GG/IA/0001/26-27, GH/EA/0001/26-27, FF/0001/26-27).
 */
const formatTallyBillNumber = (rawBillNo, job = {}, fallbackType = "EXPORT", billCategory = "AGENCY") => {
    if (!rawBillNo) return "";
    const cleanBill = String(rawBillNo).trim();
    if (!cleanBill) return "";

    // If already fully formatted (contains slashes like GEA/0863/26-27 or GG/IA/0001/26-27), return as-is
    if (cleanBill.includes("/")) {
        return cleanBill;
    }

    const seq = parseInt(cleanBill, 10);
    if (isNaN(seq)) return cleanBill;

    // Detect job attributes
    const jobNoStr = String(job.job_no || job.job_number || job.jobNo || "").toUpperCase();
    const branchCode = String(job.branch_code || job.branch || "").toUpperCase();
    const tradeType = String(job.trade_type || job.type || fallbackType || "").toUpperCase();
    const isImport = tradeType.includes("IMP") || jobNoStr.includes("/IMP/") || jobNoStr.includes("IMP");
    const isFreight = isFreightJob(job) || jobNoStr.includes("FF-") || jobNoStr.startsWith("FF");
    const isReimb = billCategory === "REIMBURSEMENT" || billCategory === "REIMB" || billCategory === "ER" || billCategory === "IR";

    // Financial year extraction
    let yearStr = job.year || job.financial_year || "";
    if (!yearStr && jobNoStr.includes("/")) {
        const parts = jobNoStr.split("/");
        const lastPart = parts[parts.length - 1];
        if (/^\d{2}-\d{2}$|^\d{4}-\d{4}$/.test(lastPart)) {
            yearStr = lastPart;
        }
    }
    if (!yearStr) {
        yearStr = "26-27";
    }

    // Branch detection
    const isHazira = branchCode.includes("HAZ") || branchCode.includes("GH") || jobNoStr.startsWith("HAZ") || jobNoStr.includes("/HAZ/");
    const isGandhidham = branchCode.includes("GND") || branchCode.includes("GAN") || branchCode.includes("GG") || jobNoStr.startsWith("GND") || jobNoStr.includes("/GND/");
    const isCochin = branchCode.includes("COK") || branchCode.includes("COC") || branchCode.includes("GC") || jobNoStr.startsWith("COK") || jobNoStr.includes("/COK/");
    const isBaroda = branchCode.includes("BAR") || branchCode.includes("GB") || jobNoStr.startsWith("BAR") || jobNoStr.includes("/BAR/");

    // Format output
    if (isFreight) {
        return `FF/${seq.toString().padStart(4, '0')}/${yearStr}`;
    }

    if (isHazira) {
        const prefix = isReimb ? (isImport ? "GH/IR" : "GH/ER") : (isImport ? "GH/IA" : "GH/EA");
        return `${prefix}/${seq.toString().padStart(4, '0')}/${yearStr}`;
    }

    if (isGandhidham) {
        const prefix = isReimb ? (isImport ? "GG/IR" : "GG/ER") : (isImport ? "GG/IA" : "GG/EA");
        return `${prefix}/${seq.toString().padStart(4, '0')}/${yearStr}`;
    }

    if (isCochin) {
        const prefix = isReimb ? (isImport ? "GC/IR" : "GC/ER") : (isImport ? "GC/IA" : "GC/EA");
        return `${prefix}/${seq.toString().padStart(4, '0')}/${yearStr}`;
    }

    if (isBaroda) {
        const prefix = isReimb ? (isImport ? "GB/IR" : "GB/ER") : (isImport ? "GB/IA" : "GB/EA");
        return `${prefix}/${seq.toString().padStart(4, '0')}/${yearStr}`;
    }

    // Default: Ahmedabad
    if (isImport) {
        const prefix = isReimb ? "GIR" : "GIA";
        return `${prefix}/${seq.toString().padStart(5, '0')}/${yearStr}`;
    } else {
        const prefix = isReimb ? "GER" : "GEA";
        return `${prefix}/${seq.toString().padStart(4, '0')}/${yearStr}`;
    }
};

/**
 * @api {post} /api/tally/billing-details Push/Update billing details from Tally
 * Protected by authApiKey middleware (Header: x-api-key: <TALLY_KEY> or Authorization: Bearer <TALLY_KEY>)
 */
const updateBillingDetailsHandler = async (req, res) => {
    try {
        const {
            job_no,
            jobNo,
            job_number,
            bill_no,
            billNo,
            bill_number,
            bill_date,
            billDate,
            bill_amount,
            billAmount,
            bill_doc,
            billDoc,
            agency_bill_no,
            agencyBillNo,
            agency_bill_date,
            agencyBillDate,
            agency_bill_amount,
            agencyBillAmount,
            agency_bill_doc,
            agencyBillDoc,
            reimbursement_bill_no,
            reimbursementBillNo,
            reimbursement_bill_date,
            reimbursementBillDate,
            reimbursement_bill_amount,
            reimbursementBillAmount,
            reimbursement_bill_doc,
            reimbursementBillDoc
        } = req.body;

        const targetJobNo = (job_no || jobNo || job_number || "").trim();
        if (!targetJobNo) {
            return res.status(400).json({ error: "job_no is required in request body" });
        }

        const rawAgencyNo = bill_no || billNo || bill_number || agency_bill_no || agencyBillNo || "";
        const rawAgencyDate = bill_date || billDate || agency_bill_date || agencyBillDate;
        const rawAgencyAmt = (bill_amount ?? billAmount ?? agency_bill_amount ?? agencyBillAmount);
        const rawAgencyDoc = bill_doc || billDoc || agency_bill_doc || agencyBillDoc || "";

        const rawReimbNo = reimbursement_bill_no || reimbursementBillNo || "";
        const rawReimbDate = reimbursement_bill_date || reimbursementBillDate;
        const rawReimbAmt = (reimbursement_bill_amount ?? reimbursementBillAmount);
        const rawReimbDoc = reimbursement_bill_doc || reimbursementBillDoc || "";

        let agencyNo = "";
        let agencyDate = "";
        let agencyAmt = undefined;
        let agencyDoc = "";

        let reimbNo = "";
        let reimbDate = "";
        let reimbAmt = undefined;
        let reimbDoc = "";

        let updatedJobType = null;
        let matchedJobNo = targetJobNo;

        // 1. Try finding in ExJobModel (Export Jobs)
        let exJob = await ExJobModel.findOne({
            $or: resolveJobNumberQuery(targetJobNo)
        });

        if (exJob) {
            updatedJobType = "EXPORT";
            matchedJobNo = exJob.job_no;

            agencyNo = formatTallyBillNumber(rawAgencyNo, exJob, "EXPORT", "AGENCY");
            agencyDate = normalizeDate(rawAgencyDate);
            agencyAmt = (rawAgencyAmt !== undefined && rawAgencyAmt !== null && rawAgencyAmt !== "") ? Number(rawAgencyAmt) : undefined;
            agencyDoc = rawAgencyDoc;

            reimbNo = formatTallyBillNumber(rawReimbNo, exJob, "EXPORT", "REIMBURSEMENT");
            reimbDate = normalizeDate(rawReimbDate);
            reimbAmt = (rawReimbAmt !== undefined && rawReimbAmt !== null && rawReimbAmt !== "") ? Number(rawReimbAmt) : undefined;
            reimbDoc = rawReimbDoc;

            const existingBDetails = exJob.billing_details || exJob.operations?.[0]?.statusDetails?.[0]?.billing_details || {};
            if (!agencyNo && existingBDetails.agency_bill_no) agencyNo = existingBDetails.agency_bill_no;
            if (!agencyDate && existingBDetails.agency_bill_date) agencyDate = existingBDetails.agency_bill_date;
            if (agencyAmt === undefined && existingBDetails.agency_bill_amount !== undefined) agencyAmt = existingBDetails.agency_bill_amount;
            if (!agencyDoc && existingBDetails.agency_bill_doc) agencyDoc = existingBDetails.agency_bill_doc;

            if (!reimbNo && existingBDetails.reimbursement_bill_no) reimbNo = existingBDetails.reimbursement_bill_no;
            if (!reimbDate && existingBDetails.reimbursement_bill_date) reimbDate = existingBDetails.reimbursement_bill_date;
            if (reimbAmt === undefined && existingBDetails.reimbursement_bill_amount !== undefined) reimbAmt = existingBDetails.reimbursement_bill_amount;
            if (!reimbDoc && existingBDetails.reimbursement_bill_doc) reimbDoc = existingBDetails.reimbursement_bill_doc;

            if (!exJob.operations || exJob.operations.length === 0) {
                exJob.operations = [{ statusDetails: [{ billing_details: {} }] }];
            }
            if (!exJob.operations[0].statusDetails || exJob.operations[0].statusDetails.length === 0) {
                exJob.operations[0].statusDetails = [{ billing_details: {} }];
            }
            if (!exJob.operations[0].statusDetails[0].billing_details) {
                exJob.operations[0].statusDetails[0].billing_details = {};
            }

            const bDetails = exJob.operations[0].statusDetails[0].billing_details;
            if (agencyNo) bDetails.agency_bill_no = agencyNo;
            if (agencyDate) bDetails.agency_bill_date = agencyDate;
            if (agencyAmt !== undefined) bDetails.agency_bill_amount = agencyAmt;
            if (agencyDoc) bDetails.agency_bill_doc = agencyDoc;

            if (reimbNo) bDetails.reimbursement_bill_no = reimbNo;
            if (reimbDate) bDetails.reimbursement_bill_date = reimbDate;
            if (reimbAmt !== undefined) bDetails.reimbursement_bill_amount = reimbAmt;
            if (reimbDoc) bDetails.reimbursement_bill_doc = reimbDoc;

            // Also keep top-level billing_details object updated
            if (!exJob.billing_details) exJob.billing_details = {};
            if (agencyNo) exJob.billing_details.agency_bill_no = agencyNo;
            if (agencyDate) exJob.billing_details.agency_bill_date = agencyDate;
            if (agencyAmt !== undefined) exJob.billing_details.agency_bill_amount = agencyAmt;
            if (agencyDoc) exJob.billing_details.agency_bill_doc = agencyDoc;

            if (reimbNo) exJob.billing_details.reimbursement_bill_no = reimbNo;
            if (reimbDate) exJob.billing_details.reimbursement_bill_date = reimbDate;
            if (reimbAmt !== undefined) exJob.billing_details.reimbursement_bill_amount = reimbAmt;
            if (reimbDoc) exJob.billing_details.reimbursement_bill_doc = reimbDoc;

            exJob.markModified("operations");
            exJob.markModified("billing_details");
            await exJob.save();

            // If it's a parent club job, also update clubbed child jobs
            if (exJob.is_club_job_parent && Array.isArray(exJob.clubbed_jobs) && exJob.clubbed_jobs.length > 0) {
                for (const cJobNo of exJob.clubbed_jobs) {
                    await ExJobModel.updateOne(
                        { job_no: cJobNo },
                        {
                            $set: {
                                "operations.0.statusDetails.0.billing_details.agency_bill_no": agencyNo,
                                "operations.0.statusDetails.0.billing_details.agency_bill_date": agencyDate,
                                "operations.0.statusDetails.0.billing_details.agency_bill_amount": agencyAmt,
                                "operations.0.statusDetails.0.billing_details.agency_bill_doc": agencyDoc,
                                "operations.0.statusDetails.0.billing_details.reimbursement_bill_no": reimbNo,
                                "operations.0.statusDetails.0.billing_details.reimbursement_bill_date": reimbDate,
                                "operations.0.statusDetails.0.billing_details.reimbursement_bill_amount": reimbAmt,
                                "operations.0.statusDetails.0.billing_details.reimbursement_bill_doc": reimbDoc,
                                "billing_details.agency_bill_no": agencyNo,
                                "billing_details.agency_bill_date": agencyDate,
                                "billing_details.agency_bill_amount": agencyAmt,
                                "billing_details.agency_bill_doc": agencyDoc,
                                "billing_details.reimbursement_bill_no": reimbNo,
                                "billing_details.reimbursement_bill_date": reimbDate,
                                "billing_details.reimbursement_bill_amount": reimbAmt,
                                "billing_details.reimbursement_bill_doc": reimbDoc
                            }
                        }
                    );
                }
            }
        } else {
            // 2. Search in Import Jobs collection ("jobs" or "importjobs")
            const mongoose = (await import("mongoose")).default;
            const db = mongoose.connection.db;
            const collectionsToSearch = ["jobs", "importjobs", "import_jobs"];
            let importJobFound = false;

            for (const collName of collectionsToSearch) {
                const coll = db.collection(collName);
                const query = {
                    $or: resolveJobNumberQuery(targetJobNo)
                };
                const doc = await coll.findOne(query);
                if (doc) {
                    importJobFound = true;
                    updatedJobType = "IMPORT";
                    matchedJobNo = doc.job_no || doc.job_number || doc.jobNo || targetJobNo;

                    agencyNo = formatTallyBillNumber(rawAgencyNo, doc, "IMPORT", "AGENCY");
                    agencyDate = normalizeDate(rawAgencyDate);
                    agencyAmt = (rawAgencyAmt !== undefined && rawAgencyAmt !== null && rawAgencyAmt !== "") ? Number(rawAgencyAmt) : undefined;
                    agencyDoc = rawAgencyDoc;

                    reimbNo = formatTallyBillNumber(rawReimbNo, doc, "IMPORT", "REIMBURSEMENT");
                    reimbDate = normalizeDate(rawReimbDate);
                    reimbAmt = (rawReimbAmt !== undefined && rawReimbAmt !== null && rawReimbAmt !== "") ? Number(rawReimbAmt) : undefined;
                    reimbDoc = rawReimbDoc;

                    const existingBDetails = doc.billing_details || {};
                    if (!agencyNo && existingBDetails.agency_bill_no) agencyNo = existingBDetails.agency_bill_no;
                    if (!agencyDate && existingBDetails.agency_bill_date) agencyDate = existingBDetails.agency_bill_date;
                    if (agencyAmt === undefined && existingBDetails.agency_bill_amount !== undefined) agencyAmt = existingBDetails.agency_bill_amount;
                    if (!agencyDoc && existingBDetails.agency_bill_doc) agencyDoc = existingBDetails.agency_bill_doc;

                    if (!reimbNo && existingBDetails.reimbursement_bill_no) reimbNo = existingBDetails.reimbursement_bill_no;
                    if (!reimbDate && existingBDetails.reimbursement_bill_date) reimbDate = existingBDetails.reimbursement_bill_date;
                    if (reimbAmt === undefined && existingBDetails.reimbursement_bill_amount !== undefined) reimbAmt = existingBDetails.reimbursement_bill_amount;
                    if (!reimbDoc && existingBDetails.reimbursement_bill_doc) reimbDoc = existingBDetails.reimbursement_bill_doc;

                    const setObj = {};
                    if (agencyNo) {
                        setObj["billing_details.agency_bill_no"] = agencyNo;
                        setObj["agency_bill_no"] = agencyNo;
                    }
                    if (agencyDate) {
                        setObj["billing_details.agency_bill_date"] = agencyDate;
                        setObj["agency_bill_date"] = agencyDate;
                    }
                    if (agencyAmt !== undefined) {
                        setObj["billing_details.agency_bill_amount"] = agencyAmt;
                        setObj["agency_bill_amount"] = agencyAmt;
                    }
                    if (agencyDoc) {
                        setObj["billing_details.agency_bill_doc"] = agencyDoc;
                        setObj["agency_bill_doc"] = agencyDoc;
                    }

                    if (reimbNo) {
                        setObj["billing_details.reimbursement_bill_no"] = reimbNo;
                        setObj["reimbursement_bill_no"] = reimbNo;
                    }
                    if (reimbDate) {
                        setObj["billing_details.reimbursement_bill_date"] = reimbDate;
                        setObj["reimbursement_bill_date"] = reimbDate;
                    }
                    if (reimbAmt !== undefined) {
                        setObj["billing_details.reimbursement_bill_amount"] = reimbAmt;
                        setObj["reimbursement_bill_amount"] = reimbAmt;
                    }
                    if (reimbDoc) {
                        setObj["billing_details.reimbursement_bill_doc"] = reimbDoc;
                        setObj["reimbursement_bill_doc"] = reimbDoc;
                    }
                    setObj["updatedAt"] = new Date();

                    await coll.updateOne({ _id: doc._id }, { $set: setObj });
                    break;
                }
            }

            if (!importJobFound) {
                return res.status(404).json({ error: `No job found with job_no '${targetJobNo}' in Export or Import databases` });
            }
        }

        return res.status(200).json({
            success: true,
            message: `Billing details updated successfully by Tally API for ${updatedJobType} job`,
            job_no: matchedJobNo,
            job_type: updatedJobType,
            billing_details: {
                agency_bill_no: agencyNo || "",
                agency_bill_date: agencyDate || "",
                agency_bill_amount: agencyAmt !== undefined ? agencyAmt : 0,
                agency_bill_doc: agencyDoc || "",
                reimbursement_bill_no: reimbNo || "",
                reimbursement_bill_date: reimbDate || "",
                reimbursement_bill_amount: reimbAmt !== undefined ? reimbAmt : 0,
                reimbursement_bill_doc: reimbDoc || ""
            }
        });

    } catch (error) {
        console.error("POST Billing Details Error:", error);
        res.status(500).json({ error: "Internal Server Error updating billing details" });
    }
};

router.post("/billing-details", authApiKey, updateBillingDetailsHandler);
router.put("/billing-details", authApiKey, updateBillingDetailsHandler);

export default router;
