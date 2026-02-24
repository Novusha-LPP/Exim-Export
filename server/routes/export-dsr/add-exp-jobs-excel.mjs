import express from "express";
import ExportJobModel from "../../model/export/ExJobModel.mjs";
import ExLastJobsDate from "../../model/export/ExLastJobDate.mjs";
import { updateJobSequenceIfHigher } from "../../utils/jobNumberGenerator.mjs";

const router = express.Router();

/**
 * Branch Name to Code Mapping
 * Converts full branch names from Excel to standardized codes
 */
const BRANCH_NAME_TO_CODE = {
    // Full names (case-insensitive matching will be applied)
    "AHMEDABAD": "AMD",
    "BARODA": "BRD",
    "GANDHIDHAM": "GIM",
    "HAZIRA": "HAZ",
    "COCHIN": "COK",
    // Variations and partial matches
    "AHEMDABAD": "AMD",  // Common typo
    "AHMADABAD": "AMD",  // Another variation
    "VADODARA": "BRD",   // Alternate name for Baroda
    "KOCHI": "COK",      // Alternate name for Cochin
    // Already codes (map to themselves)
    "AMD": "AMD",
    "BRD": "BRD",
    "GIM": "GIM",
    "HAZ": "HAZ",
    "COK": "COK",
};

/**
 * Normalize branch name to standard code
 * @param {string} branchInput - Branch name or code from Excel
 * @returns {string} - Standardized branch code (e.g., AMD, GIM)
 */
function normalizeBranchCode(branchInput) {
    if (!branchInput) return null;

    // Clean and uppercase the input
    const cleaned = branchInput.toString().trim().toUpperCase()
        .replace(/[^A-Z]/g, ''); // Remove non-alphabetic characters like _, numbers, etc.

    // Direct mapping lookup
    if (BRANCH_NAME_TO_CODE[cleaned]) {
        return BRANCH_NAME_TO_CODE[cleaned];
    }

    // Partial match: Check if input contains any known branch name
    for (const [name, code] of Object.entries(BRANCH_NAME_TO_CODE)) {
        if (cleaned.includes(name) || name.includes(cleaned)) {
            return code;
        }
    }

    // If already a 3-letter code, return as-is (uppercase)
    if (cleaned.length === 3) {
        return cleaned;
    }

    // Fallback: Return cleaned input (better than nothing)
    console.warn(`Unknown branch: "${branchInput}" -> Using "${cleaned}"`);
    return cleaned;
}

/**
 * Normalize year to YY-YY format
 * @param {string} yearInput - Year from Excel (e.g., "2025-2026" or "25-26")
 * @returns {string} - Normalized year (e.g., "25-26")
 */
function normalizeYear(yearInput) {
    if (!yearInput) return null;

    const yearStr = yearInput.toString().trim();

    // If already in YY-YY format (5 chars like "25-26")
    if (/^\d{2}-\d{2}$/.test(yearStr)) {
        return yearStr;
    }

    // If in YYYY-YYYY or YYYY-YY format
    if (yearStr.includes('-')) {
        const parts = yearStr.split('-');
        if (parts.length === 2) {
            const y1 = parts[0].trim().slice(-2);
            const y2 = parts[1].trim().slice(-2);
            return `${y1}-${y2}`;
        }
    }

    // Return as-is if no transformation possible
    return yearStr;
}

/**
 * Compute status based on job data
 * @param {Object} data - Job data object
 * @returns {String} - Status string
 */
function computeStatus(data) {
    // If SB number exists, consider it at least "Pending"
    if (data.sb_no && data.sb_no.trim() !== "") {
        return "Pending";
    }
    return "Pending";
}

/**
 * Helper to check if a value is empty
 * @param {any} value - Value to check
 * @returns {boolean} - True if empty
 */
function isEmpty(value) {
    if (value === undefined || value === null) return true;
    if (typeof value === 'string' && value.trim() === '') return true;
    if (Array.isArray(value) && value.length === 0) return true;
    return false;
}

// Helper to normalize EXIM scheme from numeric code to full descriptive string
const normalizeEximScheme = (scheme) => {
    const s = String(scheme || "").trim();
    switch (s) {
        case "03": return "03 - ADVANCE LICENCE";
        case "19": return "19 - DRAWBACK (DBK)";
        case "21": return "21 (EOU/EPZ/SEZ/EHTP/STP)";
        case "43": return "43 - DRAWBACK AND ZERO DUTY PECG";
        case "50": return "50 - EPCG AND ADVANCE LICENSE";
        case "60": return "60 - DRAWBACK AND ROSCTL";
        case "61": return "61 - EPCG, DRAWBACK AND ROSCTL";
        case "99": return "99 - NFEI";
        default: return s;
    }
};

// Helper to normalize seal type
const normalizeSealType = (type) => {
    const t = String(type || "").toUpperCase().trim();
    if (t.includes("BTSL") || t.includes("BOTTLE")) return "BTSL";
    if (t.includes("RFID")) return "RFID";
    return t;
};

/**
 * Helper to get value for update
 * Prioritizes the existing value in database.
 * If existing value is empty, uses the new value from Excel.
 * @param {any} newValue - New value from Excel
 * @param {any} existingValue - Existing value in database
 * @returns {any} - Value to use
 */
function getUpdateValue(newValue, existingValue) {
    // If database already has data, use it (prioritize existing)
    if (!isEmpty(existingValue)) {
        return existingValue;
    }
    // Otherwise use new value
    return newValue;
}

/**
 * POST /api/jobs/add-job
 * Bulk import export jobs from Excel data
 */
router.post("/api/jobs/add-job", async (req, res) => {
    const jsonData = req.body;
    const CHUNK_SIZE = 500; // Process 500 jobs at a time

    // Pre-process jsonData to ensure AIR jobs have formatted job numbers to avoid colliding with SEA jobs
    jsonData.forEach((d) => {
        if (!d.job_no || typeof d.job_no !== 'string') return;

        const isAir = (d.transportMode && String(d.transportMode).toUpperCase().includes('AIR')) ||
            (d.consignmentType && String(d.consignmentType).toUpperCase().includes('AIR')) ||
            d.job_no.toUpperCase().includes('/AIR/');

        if (isAir && !d.job_no.toUpperCase().includes('/AIR/')) {
            let newJob = d.job_no;
            if (newJob.toUpperCase().includes('/SEA/')) {
                newJob = newJob.replace(/\/SEA\//i, '/AIR/');
            }
            else {
                const parts = newJob.split('/');
                const seqIndex = parts.findIndex(p => /^\d{3,}$/.test(p));
                if (seqIndex > 0) {
                    parts.splice(seqIndex, 0, 'AIR');
                    newJob = parts.join('/');
                } else if (parts.length >= 2) {
                    parts.splice(1, 0, 'AIR');
                    newJob = parts.join('/');
                }
            }
            d.job_no = newJob;
            d.transportMode = "AIR";
            d.consignmentType = "AIR";
        }
    });

    console.log(`📊 [Backend] Starting to process ${jsonData.length} export jobs...`);
    const startTime = Date.now();

    try {
        // OPTIMIZATION: Batch fetch all existing jobs in one query
        console.log(`🔍 [Backend] Fetching existing export jobs from database...`);

        // Get unique year and job_no values for the query
        const years = [...new Set(jsonData.map((d) => d.year).filter(Boolean))];
        const jobNos = [...new Set(jsonData.map((d) => d.job_no).filter(Boolean))];

        let existingJobsMap = new Map();

        if (jobNos.length > 0) {
            const existingJobs = await ExportJobModel.find({
                job_no: { $in: jobNos },
            }).lean();

            // Create a Map for O(1) lookup using job_no
            existingJobs.forEach((job) => {
                existingJobsMap.set(job.job_no, job);
            });
        }

        console.log(
            `✅ [Backend] Found ${existingJobsMap.size} existing jobs. Building bulk operations...`
        );

        // Debug: Log sample of incoming data
        if (jsonData.length > 0) {
            console.log(`📝 [Backend] Sample incoming data (first record):`, JSON.stringify(jsonData[0], null, 2));
        }

        const bulkOperations = [];
        let processedCount = 0;
        let skippedCount = 0;

        // Collect max sequence numbers to update JobSequence at the end
        const maxSequences = new Map(); // Key: "branch|year", Value: maxSeq

        for (const data of jsonData) {
            const {
                // Core identification
                year,
                job_no,
                job_date,
                branch_code,

                // Custom House & Location
                custom_house,

                // Exporter
                exporter,
                exporter_address,
                exporter_type,
                exporter_gstin,
                gstin,
                exporter_pan,
                exporter_state,

                // IE Code (now comes as ieCode from frontend)
                ieCode,

                // Consignee
                consignee_name,
                consignee_address,
                consignee_country,

                // Shipping Bill
                sb_no,
                sb_date,
                sb_type,

                // BE
                be_no,
                be_date,

                // AWB/BL
                awb_bl_no,
                awb_bl_date,
                mbl_no,
                mbl_date,
                hbl_no,
                hbl_date,

                // Invoice
                invoice_number,
                invoice_date,
                total_inv_value,
                invoice_value,

                // Weight & Packages
                total_no_of_pkgs,
                package_unit,
                gross_weight_kg,
                net_weight_kg,

                // Financial
                exchange_rate,
                currency,
                cif_amount,
                fob_value,
                unit_price,

                // Consignment/Transport
                consignmentType,
                transportMode,

                // Shipping Line/Carrier
                shipping_line_airline,

                // Ports
                port_of_loading,
                port_of_discharge,
                final_destination,
                gateway_port,
                discharge_country,
                destination_country,
                destination_port,

                // Vessel/Flight
                vessel_name,
                voyage_no,
                flight_no,
                flight_date,
                sailing_date,

                // Container
                container_nos,
                no_of_containers,

                // EGM
                egm_no,
                egm_date,

                // Other fields
                goods_stuffed_at,
                description,
                hss_name,
                cha,
                status,
                line_no,
                gateway_igm_date,
                vessel_berthing,
                remarks,
                job_owner,
                shipper,
                notify,
                exporter_ref_no,
                nature_of_cargo,
                state_of_origin,

                // Bank
                adCode,
                bank_name,
                bank_account_number,

                // Invoice/Product Details from Excel
                total_igst_amount,
                total_dbk_inr,
                total_igst_taxable_value,
                total_rodtep_amount,
                total_rosctl_amount,
                ritc_no,
                product_qty,
                product_description,
                product_amount,
                terms_of_invoice,
                fob_value_inr,

                // Buyer & Other
                buyer_name,
                buyer_address,
                commission_amount,
                seal_no_date,
                seal_no,
                seal_date,
                seal_type,
                exim_scheme,
                third_party_name,
                third_party_address,
                nature_of_payment,
                payment_period,

                // New financial lists
                freight_amount,
                insurance_amount,
                discount_amount,
                product_value_list,

                products_per_invoice, // Structured products array

                // Locked fields
                operations_locked_on,
                financials_locked_on,

                // Branch
                branchSrNo,
            } = data;

            // CRITICAL: Skip rows that don't have a job number
            if (!job_no || String(job_no).trim() === "" || String(job_no).toLowerCase() === "undefined") {
                skippedCount++;
                continue;
            }

            // Debug logging for the first job to see what's being received
            if (processedCount === 0) {
                console.log(`🔍 [Backend] First job data sample:`, {
                    job_no,
                    port_of_discharge,
                    destination_port,
                    custom_house,
                    invoice_number,
                    invoice_date,
                    exporter
                });
            }

            // Sync the job sequence counter if this is a valid job number
            // Format expected: BRANCH/SEQUENCE/YEAR (e.g. AMD/00123/25-26)
            // Sync the job sequence counter if this is a valid job number
            // Format expected: BRANCH/SEQUENCE/YEAR (e.g. AMD/00123/25-26)
            try {
                if (job_no && job_no.includes('/')) {
                    const parts = job_no.split('/');
                    // Looking for numeric part. Usually index 1.
                    // If format is BRANCH/SEQ/YEAR -> index 1
                    let seqStr = parts.find(p => /^\d+$/.test(p));

                    // Fallback: If formatted like 02810 (where 0 is significant), regex might fail if spaces? No.
                    if (!seqStr && parts.length >= 2) {
                        // Maybe it's index 1?
                        if (/^\d+$/.test(parts[1])) seqStr = parts[1];
                    }

                    if (seqStr) {
                        const seqNum = parseInt(seqStr, 10);

                        // Determine Branch and Year
                        let targetBranch = branch_code;
                        let targetYear = year;

                        // If missing from data, try to extract from job_no
                        if (!targetBranch) targetBranch = parts[0];
                        if (!targetYear) targetYear = parts[parts.length - 1];

                        // Normalize Branch name to code (e.g. AHMEDABAD -> AMD)
                        targetBranch = normalizeBranchCode(targetBranch);

                        // Normalize Year to YY-YY format (e.g. 2025-2026 -> 25-26)
                        targetYear = normalizeYear(targetYear);

                        if (job_no && String(job_no).toUpperCase().includes('/AIR/')) {
                            targetBranch += '-AIR';
                        }

                        // Log what we are trying to update
                        console.log(`Title: Syncing Sequence | Job: ${job_no} | Branch: ${targetBranch} | Year: ${targetYear} | Seq: ${seqNum}`);

                        if (targetBranch && targetYear && !isNaN(seqNum)) {
                            const key = `${targetBranch}|${targetYear}`;
                            const currentMax = maxSequences.get(key) || 0;
                            if (seqNum > currentMax) {
                                maxSequences.set(key, seqNum);
                            }
                        } else {
                            console.warn(`Skipping sequence sync for ${job_no} - Missing Branch/Year/Seq`);
                        }
                    }
                }
            } catch (err) {
                console.warn(`Could parse sequence info for job ${job_no}:`, err.message);
            }

            // Define the filter to find existing jobs
            const filter = { job_no };

            // OPTIMIZATION: Use Map lookup instead of database query
            const existingJob = existingJobsMap.get(job_no);

            // Handle fields that should update if new data is provided
            let vesselBerthingToUpdate = existingJob?.vessel_berthing || "";
            let gatewayIgmDateUpdate = existingJob?.gateway_igm_date || "";
            let lineNoUpdate = existingJob?.line_no || "";
            let ieCodeUpdate = existingJob?.ieCode || "";

            // Update only if existing value is empty
            if (isEmpty(vesselBerthingToUpdate) && vessel_berthing && String(vessel_berthing).trim() !== "") {
                vesselBerthingToUpdate = String(vessel_berthing).trim();
            }
            if (isEmpty(gatewayIgmDateUpdate) && gateway_igm_date && String(gateway_igm_date).trim() !== "") {
                gatewayIgmDateUpdate = String(gateway_igm_date).trim();
            }
            if (isEmpty(lineNoUpdate) && line_no && String(line_no).trim() !== "") {
                lineNoUpdate = String(line_no).trim();
            }
            // ieCode now comes directly from frontend
            if (isEmpty(ieCodeUpdate) && ieCode) {
                let formattedIeCode = String(ieCode).trim();
                if (formattedIeCode.length < 10 && formattedIeCode.length > 0) {
                    formattedIeCode = formattedIeCode.padStart(10, "0");
                }
                ieCodeUpdate = formattedIeCode;
            }

            // Build consignees array if consignee info exists
            // Overwrite existing data if spreadsheet data exists, otherwise use existing data
            let consigneesToUpdate = existingJob?.consignees || [];
            if (consignee_name && String(consignee_name).trim() !== "") {
                consigneesToUpdate = [{
                    consignee_name: consignee_name,
                    consignee_address: consignee_address || "",
                    consignee_country: consignee_country || "",
                }];
            }

            let existingCustomHouse = existingJob?.custom_house;
            if (existingCustomHouse && existingCustomHouse.trim().toLowerCase() === "icd sabarmati, ahmedabad") {
                existingCustomHouse = "ICD Sabarmati";
            }

            // Build the update data with all fields from the Excel
            // Use getValueIfEmpty to preserve existing data - only update if field is empty
            const updateData = {
                // Core identification - these are always set (they define the record)
                year: normalizeYear(year),
                job_no,
                jobNumber: job_no, // Required for unique index
                job_date: getUpdateValue(job_date, existingJob?.job_date),
                branch_code: normalizeBranchCode(branch_code),

                // Custom House
                custom_house: getUpdateValue(custom_house, existingCustomHouse),

                // Exporter
                exporter: getUpdateValue(exporter, existingJob?.exporter),
                exporter_address: getUpdateValue(exporter_address, existingJob?.exporter_address),
                exporter_type: getUpdateValue(exporter_type, existingJob?.exporter_type),
                exporter_gstin: getUpdateValue(exporter_gstin || gstin, existingJob?.exporter_gstin),
                gstin: getUpdateValue(gstin || exporter_gstin, existingJob?.gstin),
                exporter_pan: getUpdateValue(exporter_pan, existingJob?.exporter_pan),
                pan_no: getUpdateValue(exporter_pan, existingJob?.pan_no),
                panNo: getUpdateValue(exporter_pan, existingJob?.panNo),
                exporter_state: getUpdateValue(exporter_state, existingJob?.exporter_state),

                // Buyer & Third Party Info
                buyerThirdPartyInfo: {
                    buyer: {
                        name: getUpdateValue(buyer_name, existingJob?.buyerThirdPartyInfo?.buyer?.name),
                        addressLine1: getUpdateValue(buyer_address, existingJob?.buyerThirdPartyInfo?.buyer?.addressLine1),
                    },
                    thirdParty: {
                        name: getUpdateValue(third_party_name, existingJob?.buyerThirdPartyInfo?.thirdParty?.name),
                        address: getUpdateValue(third_party_address, existingJob?.buyerThirdPartyInfo?.thirdParty?.address),
                        isThirdPartyExport: !isEmpty(third_party_name) ? true : (existingJob?.buyerThirdPartyInfo?.thirdParty?.isThirdPartyExport || false)
                    }
                },

                // Other Info (Payment details)
                otherInfo: {
                    ...existingJob?.otherInfo, // Preserve other existing fields
                    natureOfPayment: getUpdateValue(nature_of_payment, existingJob?.otherInfo?.natureOfPayment),
                    paymentPeriod: getUpdateValue(payment_period, existingJob?.otherInfo?.paymentPeriod),
                },

                // Shipping Bill
                sb_no: getUpdateValue(sb_no, existingJob?.sb_no),
                sb_date: getUpdateValue(sb_date, existingJob?.sb_date),
                sb_type: getUpdateValue(sb_type, existingJob?.sb_type),

                // BE
                be_no: getUpdateValue(be_no, existingJob?.be_no),
                be_date: getUpdateValue(be_date, existingJob?.be_date),

                // AWB/BL
                awb_bl_no: getUpdateValue(awb_bl_no, existingJob?.awb_bl_no),
                awb_bl_date: getUpdateValue(awb_bl_date, existingJob?.awb_bl_date),
                mbl_no: getUpdateValue(mbl_no, existingJob?.mbl_no),
                mbl_date: getUpdateValue(mbl_date, existingJob?.mbl_date),
                hbl_no: getUpdateValue(hbl_no, existingJob?.hbl_no),
                hbl_date: getUpdateValue(hbl_date, existingJob?.hbl_date),

                // Note: Invoice data (invoice_number, invoice_date, invoice_value, total_inv_value)
                // is handled separately and stored in the invoices array structure

                // Weight & Packages
                total_no_of_pkgs: getUpdateValue(total_no_of_pkgs, existingJob?.total_no_of_pkgs),
                package_unit: getUpdateValue(package_unit, existingJob?.package_unit),
                gross_weight_kg: getUpdateValue(gross_weight_kg, existingJob?.gross_weight_kg),
                net_weight_kg: getUpdateValue(net_weight_kg, existingJob?.net_weight_kg),

                // Financial
                exchange_rate: getUpdateValue(exchange_rate, existingJob?.exchange_rate),
                currency: getUpdateValue(currency, existingJob?.currency),
                cif_amount: getUpdateValue(cif_amount, existingJob?.cif_amount),
                fob_value: getUpdateValue(fob_value_inr || fob_value, existingJob?.fob_value),
                unit_price: getUpdateValue(unit_price, existingJob?.unit_price),
                branchSrNo: getUpdateValue(branchSrNo, existingJob?.branchSrNo),
                branch_sr_no: getUpdateValue(branchSrNo, existingJob?.branch_sr_no),

                // IE Code
                ieCode: ieCodeUpdate,

                // Consignment/Transport
                consignmentType: (job_no && String(job_no).toUpperCase().includes('/AIR/')) ? "AIR" : getUpdateValue(consignmentType, existingJob?.consignmentType),
                transportMode: (job_no && String(job_no).toUpperCase().includes('/AIR/')) ? "AIR" : getUpdateValue(transportMode, existingJob?.transportMode),

                // Shipping Line
                shipping_line_airline: getUpdateValue(shipping_line_airline, existingJob?.shipping_line_airline),

                // Ports
                port_of_loading: getUpdateValue(port_of_loading, existingJob?.port_of_loading),
                port_of_discharge: getUpdateValue(port_of_discharge, existingJob?.port_of_discharge),
                final_destination: getUpdateValue(final_destination, existingJob?.final_destination),
                gateway_port: getUpdateValue(gateway_port, existingJob?.gateway_port),
                discharge_country: getUpdateValue(discharge_country, existingJob?.discharge_country),
                destination_country: getUpdateValue(destination_country, existingJob?.destination_country),
                destination_port: getUpdateValue(destination_port, existingJob?.destination_port),
                goods_stuffed_at: getUpdateValue(goods_stuffed_at, existingJob?.goods_stuffed_at),

                // Vessel/Flight
                vessel_name: getUpdateValue(vessel_name, existingJob?.vessel_name),
                voyage_no: getUpdateValue(voyage_no, existingJob?.voyage_no),
                flight_no: getUpdateValue(flight_no, existingJob?.flight_no),
                flight_date: getUpdateValue(flight_date, existingJob?.flight_date),
                sailing_date: getUpdateValue(sailing_date, existingJob?.sailing_date),

                // Container count
                no_of_containers: getUpdateValue(no_of_containers, existingJob?.no_of_containers),

                // EGM
                egm_no: getUpdateValue(egm_no, existingJob?.egm_no),
                egm_date: getUpdateValue(egm_date, existingJob?.egm_date),

                // Description & Other
                description: getUpdateValue(description, existingJob?.description),
                hss_name: getUpdateValue(hss_name, existingJob?.hss_name),
                cha: getUpdateValue(cha, existingJob?.cha),
                remarks: getUpdateValue(remarks, existingJob?.remarks),
                job_owner: getUpdateValue(job_owner, existingJob?.job_owner),
                exporter: getUpdateValue(exporter, existingJob?.exporter),
                shipper: getUpdateValue(shipper || exporter, existingJob?.shipper),
                notify: getUpdateValue(notify, existingJob?.notify),
                exporter_ref_no: getUpdateValue(exporter_ref_no, existingJob?.exporter_ref_no),
                nature_of_cargo: getUpdateValue(nature_of_cargo, existingJob?.nature_of_cargo),
                state_of_origin: getUpdateValue(state_of_origin, existingJob?.state_of_origin),

                // Bank
                adCode: getUpdateValue(adCode, existingJob?.adCode),
                ad_code: getUpdateValue(adCode, existingJob?.ad_code),
                bank_name: getUpdateValue(bank_name, existingJob?.bank_name),
                bank_account_number: getUpdateValue(bank_account_number, existingJob?.bank_account_number),

                // Conditional updates
                line_no: lineNoUpdate,
                gateway_igm_date: gatewayIgmDateUpdate,
                vessel_berthing: vesselBerthingToUpdate,

                // Status - use existing if Completed, otherwise from file or "Pending"
                status: existingJob?.status === "Completed"
                    ? existingJob.status
                    : (status || computeStatus({ sb_no })),
            };

            // Remove undefined values from updateData to avoid overwriting existing data with undefined
            Object.keys(updateData).forEach(key => {
                if (updateData[key] === undefined) {
                    delete updateData[key];
                }
            });

            // Build invoices array if invoice data exists
            // Excel has invoice data at top level, but schema stores it in invoices array
            if (invoice_number && String(invoice_number).trim() !== "") {
                const invoice_number_raw = String(invoice_number);
                const invNumbers = invoice_number_raw.split(',').map(s => s.trim()).filter(s => s !== "");
                let existingInvoices = existingJob?.invoices || [];

                // Helper to get array from comma-separated string
                const getList = (val) => val ? String(val).split(',').map(s => s.trim()) : [];

                const invDates = getList(invoice_date);
                const invValues = getList(invoice_value);
                const totalInvValues = getList(total_inv_value);
                const productDescriptions = getList(product_description || description);
                const productAmounts = getList(product_amount);
                const productQtys = getList(product_qty);
                const ritcNos = getList(ritc_no);
                const igstTaxableValues = getList(total_igst_taxable_value);
                const igstAmounts = getList(total_igst_amount);
                const rodtepAmounts = getList(total_rodtep_amount);
                const rosctlAmounts = getList(total_rosctl_amount);
                const dbkInrs = getList(total_dbk_inr);
                const fobValueInrs = getList(fob_value_inr);
                const curs = getList(currency); // Renamed to avoid collision
                const invoiceTerms = getList(terms_of_invoice);
                const commissions = getList(commission_amount);
                const eximSchemes = getList(exim_scheme);

                // New financial lists
                const freights = getList(freight_amount);
                const insurances = getList(insurance_amount);
                const discounts = getList(discount_amount);
                const prodValues = getList(product_value_list || total_inv_value);

                // Check if we have structured products (from XML)
                const hasStructuredProducts = Array.isArray(products_per_invoice) && products_per_invoice.length > 0;

                invNumbers.forEach((invNo, idx) => {
                    // Check if this invoice already exists
                    const invoiceIndex = existingInvoices.findIndex(
                        inv => inv.invoiceNumber === invNo
                    );

                    // Build product data (usually one dummy product per invoice for DSR imports)
                    let invoiceProducts = [];

                    if (hasStructuredProducts && products_per_invoice[idx]) {
                        // Use structured products from XML
                        invoiceProducts = products_per_invoice[idx].map((p, pIdx) => ({
                            serialNumber: (pIdx + 1).toString(),
                            description: p.description || "",
                            ritc: p.ritc || "",
                            quantity: p.quantity || "0",
                            qtyUnit: p.qtyUnit || "",
                            unitPrice: p.unitPrice || "0",
                            amount: p.amount || "0",
                            eximCode: normalizeEximScheme(p.eximCode),
                            endUse: p.endUse || "",

                            // IGST & Taxes
                            igstCompensationCess: {
                                igstPaymentStatus: p.igstCompensationCess?.igstPaymentStatus === "LUT" ? "LUT" : p.igstCompensationCess?.igstPaymentStatus || "LUT",
                                taxableValueINR: p.igstCompensationCess?.taxableValueINR || "0",
                                igstAmountINR: p.igstCompensationCess?.igstAmountINR || "0",
                                igstRate: p.igstCompensationCess?.igstRate || "0"
                            },

                            // PMV
                            pmvInfo: {
                                currency: p.pmvInfo?.currency,
                                totalPMV: p.pmvInfo?.totalPMV || "0",
                                percentage: p.pmvInfo?.percentage || "0"
                            },

                            // RoDTEP
                            rodtepInfo: {
                                claim: p.rodtepInfo?.claim || "No",
                                ratePercent: p.rodtepInfo?.ratePercent || "0",
                                amountINR: p.rodtepInfo?.amountINR || "0",
                                quantity: p.rodtepInfo?.quantity || "0",
                                unit: p.rodtepInfo?.unit || ""
                            },

                            // DBK
                            drawbackDetails: [{
                                dbkSrNo: p.drawbackDetails?.dbkSrNo || "",
                                dbkRate: parseFloat(p.drawbackDetails?.dbkRate) || 0,
                                quantity: parseFloat(p.drawbackDetails?.quantity) || 0,
                                unit: p.drawbackDetails?.unit || "",
                                dbkUnder: p.drawbackDetails?.dbkUnder === "A" ? "Actual" : "Provisional",
                                dbkAmount: parseFloat(p.drawbackDetails?.dbkAmount) || 0
                            }],

                            // EPCG Details (from XML)
                            ...(p.epcgDetails ? {
                                epcgDetails: {
                                    isEpcgItem: p.epcgDetails.isEpcgItem || false,
                                    itemSnoPartE: p.epcgDetails.itemSnoPartE || "",
                                    exportQtyUnderLicence: p.epcgDetails.exportQtyUnderLicence || 0,
                                    epcgItems: (p.epcgDetails.epcgItems || []).map((it, idx) => ({
                                        serialNumber: it.serialNumber || idx + 1,
                                        itemSnoPartC: it.itemSnoPartC || "",
                                        description: it.description || "",
                                        quantity: parseFloat(it.quantity) || 0,
                                        unit: it.unit || "",
                                        itemType: it.itemType || "Indigenous",
                                    })),
                                    epcg_reg_obj: (p.epcgDetails.epcg_reg_obj || []).map(r => ({
                                        licRefNo: r.licRefNo || "",
                                        regnNo: r.regnNo || "",
                                        licDate: r.licDate || "",
                                    })),
                                }
                            } : {}),

                            // DEEC (Advance Licence) Details (from XML)
                            ...(p.deecDetails ? {
                                deecDetails: {
                                    isDeecItem: p.deecDetails.isDeecItem || false,
                                    itemSnoPartE: p.deecDetails.itemSnoPartE || "",
                                    exportQtyUnderLicence: p.deecDetails.exportQtyUnderLicence || 0,
                                    deecItems: (p.deecDetails.deecItems || []).map((it, idx) => ({
                                        serialNumber: it.serialNumber || idx + 1,
                                        itemSnoPartC: it.itemSnoPartC || "",
                                        description: it.description || "",
                                        quantity: parseFloat(it.quantity) || 0,
                                        unit: it.unit || "",
                                        itemType: it.itemType || "Indigenous",
                                    })),
                                    deec_reg_obj: (p.deecDetails.deec_reg_obj || []).map(r => ({
                                        licRefNo: r.licRefNo || "",
                                        regnNo: r.regnNo || "",
                                        licDate: r.licDate || "",
                                    })),
                                }
                            } : {}),
                        }));
                    } else {
                        // Legacy Dummy Product logic
                        invoiceProducts.push({
                            serialNumber: "1",
                            description: productDescriptions[idx] || productDescriptions[0] || "",
                            ritc: ritcNos[idx] || ritcNos[0] || "",
                            quantity: productQtys[idx] || productQtys[0] || "0",
                            qtyUnit: package_unit || "",
                            amount: productAmounts[idx] || productAmounts[0] || "0",
                            eximCode: normalizeEximScheme(eximSchemes[idx] || eximSchemes[0]),
                            igstCompensationCess: {
                                igstPaymentStatus: "LUT",
                                taxableValueINR: igstTaxableValues[idx] || igstTaxableValues[0] || "0",
                                igstRate: "0",
                                igstAmountINR: igstAmounts[idx] || igstAmounts[0] || "0",
                            },
                            rodtepInfo: {
                                claim: (rodtepAmounts[idx] || rodtepAmounts[0]) ? "Yes" : "No",
                                amountINR: rodtepAmounts[idx] || rodtepAmounts[0] || "0",
                            },
                            rosctlInfo: {
                                claim: (rosctlAmounts[idx] || rosctlAmounts[0]) ? "Yes" : "No",
                                amountINR: rosctlAmounts[idx] || rosctlAmounts[0] || "0",
                            },
                            drawbackDetails: (dbkInrs[idx] || dbkInrs[0]) ? [{
                                dbkitem: true,
                                dbkAmount: parseFloat(dbkInrs[idx] || dbkInrs[0]) || 0,
                            }] : [],
                        });
                    }

                    const invoiceData = {
                        invoiceNumber: invNo,
                        invoiceDate: invDates[idx] || invDates[0] || "",
                        currency: curs[idx] || curs[0] || "USD",
                        invoiceValue: parseFloat(invValues[idx] || invValues[0]) || 0,
                        productValue: parseFloat(prodValues[idx] || prodValues[0]) || 0,
                        termsOfInvoice: invoiceTerms[idx] || invoiceTerms[0] || "FOB",
                        priceIncludes: "Both",
                        packing_charges: 0,
                        products: invoiceProducts,
                        freightInsuranceCharges: {
                            fobValue: {
                                amount: parseFloat(fobValueInrs[idx] || fobValueInrs[0]) || 0
                            },
                            commission: {
                                amount: parseFloat(commissions[idx] || commissions[0]) || 0
                            },
                            freight: {
                                amount: parseFloat(freights[idx] || freights[0]) || 0
                            },
                            insurance: {
                                amount: parseFloat(insurances[idx] || insurances[0]) || 0
                            },
                            discount: {
                                amount: parseFloat(discounts[idx] || discounts[0]) || 0
                            }
                        }
                    };

                    if (invoiceIndex >= 0) {
                        const existingInvoice = existingInvoices[invoiceIndex];
                        // Update existing invoice but prioritize DB data
                        existingInvoices[invoiceIndex] = {
                            ...existingInvoice,
                            invoiceDate: getUpdateValue(invoiceData.invoiceDate, existingInvoice.invoiceDate),
                            currency: getUpdateValue(invoiceData.currency, existingInvoice.currency),
                            invoiceValue: getUpdateValue(invoiceData.invoiceValue, existingInvoice.invoiceValue),
                            productValue: getUpdateValue(invoiceData.productValue, existingInvoice.productValue),
                            termsOfInvoice: getUpdateValue(invoiceData.termsOfInvoice, existingInvoice.termsOfInvoice),

                            // Only update products if we got structured products from Excel,
                            // OR if the existing invoice has NO products yet
                            products: hasStructuredProducts ? invoiceProducts :
                                (existingInvoice.products && existingInvoice.products.length > 0 ? existingInvoice.products : invoiceProducts),

                            freightInsuranceCharges: {
                                ...existingInvoice.freightInsuranceCharges,
                                fobValue: { amount: getUpdateValue(invoiceData.freightInsuranceCharges.fobValue.amount, existingInvoice.freightInsuranceCharges?.fobValue?.amount) },
                                commission: { amount: getUpdateValue(invoiceData.freightInsuranceCharges.commission.amount, existingInvoice.freightInsuranceCharges?.commission?.amount) },
                                freight: { amount: getUpdateValue(invoiceData.freightInsuranceCharges.freight.amount, existingInvoice.freightInsuranceCharges?.freight?.amount) },
                                insurance: { amount: getUpdateValue(invoiceData.freightInsuranceCharges.insurance.amount, existingInvoice.freightInsuranceCharges?.insurance?.amount) },
                                discount: { amount: getUpdateValue(invoiceData.freightInsuranceCharges.discount.amount, existingInvoice.freightInsuranceCharges?.discount?.amount) }
                            }
                        };
                    } else {
                        // Add new invoice
                        existingInvoices.push(invoiceData);
                    }
                });
                updateData.invoices = existingInvoices;
            }

            // Add consignees if present
            if (consigneesToUpdate && consigneesToUpdate.length > 0) {
                updateData.consignees = consigneesToUpdate;
            }

            // Build seal info arrays (Excel can have multiple containers/seals in one row)
            const sealNoDateList = seal_no_date ? String(seal_no_date).split(',').map(s => s.trim()) : [];
            const sealTypeList = seal_type ? String(seal_type).split(',').map(s => s.trim()) : [];
            const sealNoList = seal_no ? String(seal_no).split(',').map(s => s.trim()) : [];
            const sealDateList = seal_date ? String(seal_date).split(',').map(s => s.trim()) : [];

            // Helper to get seal info for a specific container index
            const getSealInfoForIndex = (index) => {
                let sNo = sealNoList[index] || "";
                let sDate = sealDateList[index] || "";
                let sType = sealTypeList[index] || (sealTypeList.length === 1 ? sealTypeList[0] : "");

                // Fallback to split seal_no_date if separate fields are missing for this index
                const combined = sealNoDateList[index] || (sealNoDateList.length === 1 ? sealNoDateList[0] : "");
                if (!sNo && combined) {
                    const firstDelimMatch = combined.match(/[\s,/]/);
                    if (firstDelimMatch) {
                        const dIndex = firstDelimMatch.index;
                        sNo = combined.substring(0, dIndex).trim();
                        if (!sDate) {
                            sDate = combined.substring(dIndex + 1).trim();
                        }
                    } else {
                        sNo = combined;
                    }
                }

                // Clean up date (remove common prefixes like DT., DT, DATE, etc.)
                if (sDate) {
                    sDate = sDate.replace(/^(DT|DATE|DAT|D)\.?[\s:]*/i, "").trim();
                }

                // Clean up seal number as well just in case
                if (sNo) {
                    sNo = sNo.replace(/^(SEAL|NO)\.?[\s:]*/i, "").trim();
                }

                return {
                    sealNo: sNo,
                    sealDate: sDate,
                    sealType: normalizeSealType(sType)
                };
            };

            // Handle container_nos if present
            if (container_nos && Array.isArray(container_nos)) {
                if (existingJob) {
                    // Merge container sizes with existing containers
                    const existingContainers = existingJob.containers || [];
                    const updatedContainers = existingContainers.map((existingContainer) => {
                        const newContainerData = container_nos.find(
                            (c) => c.containerNo === existingContainer.containerNo
                        );
                        if (newContainerData) {
                            const containerIndexInMatch = container_nos.indexOf(newContainerData);
                            const sInfo = getSealInfoForIndex(containerIndexInMatch);
                            return {
                                ...existingContainer,
                                type: getUpdateValue(newContainerData.type, existingContainer.type),
                                sealNo: getUpdateValue(sInfo.sealNo, existingContainer.sealNo) || "",
                                sealDate: getUpdateValue(sInfo.sealDate, existingContainer.sealDate) || "",
                                sealType: getUpdateValue(sInfo.sealType, existingContainer.sealType) || ""
                            };
                        }
                        return existingContainer;
                    });

                    // Add new containers that don't exist
                    container_nos.forEach((newContainer, idx) => {
                        const exists = updatedContainers.find(
                            (c) => c.containerNo === newContainer.containerNo
                        );
                        if (!exists) {
                            const sInfo = getSealInfoForIndex(idx);
                            updatedContainers.push({
                                containerNo: newContainer.containerNo,
                                type: newContainer.type || "",
                                sealNo: sInfo.sealNo || "",
                                sealDate: sInfo.sealDate || "",
                                sealType: sInfo.sealType || ""
                            });
                        }
                    });

                    updateData.containers = updatedContainers;
                } else {
                    updateData.containers = container_nos.map((c, idx) => {
                        const sInfo = getSealInfoForIndex(idx);
                        return {
                            containerNo: c.containerNo || c.container_number,
                            type: c.type || c.size || "",
                            sealNo: sInfo.sealNo || "",
                            sealDate: sInfo.sealDate || "",
                            sealType: sInfo.sealType || ""
                        };
                    });
                }
            }

            // (Status is already set in updateData above)

            // Remove undefined and null values only (keep empty strings as they may be intentional clears)
            Object.keys(updateData).forEach(key => {
                if (updateData[key] === undefined || updateData[key] === null) {
                    delete updateData[key];
                }
            });

            // Make sure we always have jobNumber if we have job_no
            if (updateData.job_no && !updateData.jobNumber) {
                updateData.jobNumber = updateData.job_no;
            }

            const update = {
                $set: updateData,
            };

            // Process Operations Locked On -> billingDocsSentDt
            if (operations_locked_on) {
                update.$set["operations.0.statusDetails.0.billingDocsSentDt"] = operations_locked_on;
                if (!update.$set.detailedStatus || update.$set.detailedStatus !== "Billing Done") {
                    update.$set.detailedStatus = "Billing Pending";
                }
            }

            // Process Financials Locked On -> Billing Done Milestone
            if (financials_locked_on) {
                update.$set.status = "Completed";
                update.$set.detailedStatus = "Billing Done";

                const hasMilestoneIdx = existingJob?.milestones?.findIndex(m => m.milestoneName === "Billing Done") ?? -1;

                if (hasMilestoneIdx === -1) {
                    update.$push = {
                        milestones: {
                            milestoneName: "Billing Done",
                            actualDate: financials_locked_on,
                            isCompleted: true,
                            status: "Completed",
                            isMandatory: true,
                        }
                    };
                } else {
                    update.$set[`milestones.${hasMilestoneIdx}.actualDate`] = financials_locked_on;
                    update.$set[`milestones.${hasMilestoneIdx}.isCompleted`] = true;
                    update.$set[`milestones.${hasMilestoneIdx}.status`] = "Completed";
                }
            }

            bulkOperations.push({
                updateOne: {
                    filter,
                    update,
                    upsert: true,
                },
            });

            processedCount++;

            // Log progress every 500 jobs during preparation
            if (processedCount % 500 === 0) {
                console.log(
                    `📝 [Backend] Prepared ${processedCount} / ${jsonData.length} jobs`
                );
            }

            // Execute in chunks to prevent database timeout
            if (bulkOperations.length >= CHUNK_SIZE) {
                console.log(
                    `💾 [Backend] Writing chunk of ${bulkOperations.length} jobs to database...`
                );
                await ExportJobModel.bulkWrite(bulkOperations, { ordered: false });
                console.log(
                    `✅ [Backend] Chunk written. Total processed: ${processedCount} / ${jsonData.length}`
                );
                bulkOperations.length = 0;
            }
        }

        // Execute remaining operations
        if (bulkOperations.length > 0) {
            console.log(
                `💾 [Backend] Writing final chunk of ${bulkOperations.length} jobs to database...`
            );
            await ExportJobModel.bulkWrite(bulkOperations, { ordered: false });
            console.log(`✅ [Backend] Final chunk written successfully.`);
        }

        // Update sequence counters in bulk at the end
        if (maxSequences.size > 0) {
            console.log(`🆙 [Backend] Syncing job sequences for ${maxSequences.size} branch/year combinations...`);
            for (const [key, maxSeq] of maxSequences.entries()) {
                const [branch, year] = key.split('|');
                try {
                    await updateJobSequenceIfHigher(branch, year, maxSeq);
                } catch (err) {
                    console.error(`Failed to sync sequence for ${branch}/${year}:`, err.message);
                }
            }
        }

        // Update the last jobs update date
        try {
            const existingDateDocument = await ExLastJobsDate.findOne();
            const date = new Date().toISOString();
            if (existingDateDocument) {
                existingDateDocument.date = date;
                await existingDateDocument.save();
            } else {
                const jobsLastUpdatedOn = new ExLastJobsDate({ date });
                await jobsLastUpdatedOn.save();
            }
        } catch (error) {
            console.error("Error updating the last export jobs date:", error);
        }

        const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
        console.log(
            `🎉 [Backend] Processing complete! Processed: ${processedCount}, Skipped: ${skippedCount}, Time: ${totalTime}s`
        );

        res.status(200).json({
            success: true,
            message: "Export jobs added/updated successfully",
            count: processedCount,
            skipped: skippedCount,
            timeTaken: totalTime,
        });
    } catch (error) {
        console.error("Error handling export job data:", error);
        return res.status(500).json({
            success: false,
            error: "Internal server error.",
            message: error.message,
        });
    }
});

/**
 * GET /api/get-last-export-jobs-date
 * Get the last update date for export jobs
 */
router.get("/api/get-last-export-jobs-date", async (req, res) => {
    try {
        const lastDate = await ExLastJobsDate.findOne();
        res.json({
            success: true,
            data: lastDate,
        });
    } catch (error) {
        console.error("Error fetching last export jobs date:", error);
        res.status(500).json({
            success: false,
            error: "Internal server error",
        });
    }
});

export default router;
