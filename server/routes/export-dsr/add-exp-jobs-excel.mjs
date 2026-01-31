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
    return false;
}

/**
 * Helper to get value only if existing is empty
 * Used to preserve existing data and not overwrite with Excel data
 * @param {any} newValue - New value from Excel
 * @param {any} existingValue - Existing value in database
 * @returns {any} - Value to use (existing if present, else new)
 */
function getValueIfEmpty(newValue, existingValue) {
    // If existing has data, keep it
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

                // Weight & Packages
                total_no_of_pkgs,
                package_unit,
                gross_weight_kg,
                net_weight_kg,

                // Financial
                exchange_rate,
                currency,
                cif_amount,
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
            } = data;

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

                        // Log what we are trying to update
                        console.log(`Title: Syncing Sequence | Job: ${job_no} | Branch: ${targetBranch} | Year: ${targetYear} | Seq: ${seqNum}`);

                        if (targetBranch && targetYear && !isNaN(seqNum)) {
                            await updateJobSequenceIfHigher(targetBranch, targetYear, seqNum);
                        } else {
                            console.warn(`Skipping sequence sync for ${job_no} - Missing Branch/Year/Seq`);
                        }
                    }
                }
            } catch (err) {
                console.warn(`Could not sync sequence for job ${job_no}:`, err.message);
            }

            // Define the filter to find existing jobs
            const filter = { job_no };

            // OPTIMIZATION: Use Map lookup instead of database query
            const existingJob = existingJobsMap.get(job_no);

            // Handle fields that should only update if empty in existing record
            let vesselBerthingToUpdate = existingJob?.vessel_berthing || "";
            let gatewayIgmDateUpdate = existingJob?.gateway_igm_date || "";
            let lineNoUpdate = existingJob?.line_no || "";
            let ieCodeUpdate = existingJob?.ieCode || "";

            // Only update vessel_berthing if it's empty in the database
            if (
                vessel_berthing &&
                (!vesselBerthingToUpdate || vesselBerthingToUpdate.trim() === "")
            ) {
                vesselBerthingToUpdate = vessel_berthing;
            }
            if (
                gateway_igm_date &&
                (!gatewayIgmDateUpdate || gatewayIgmDateUpdate.trim() === "")
            ) {
                gatewayIgmDateUpdate = gateway_igm_date;
            }
            if (line_no && (!lineNoUpdate || lineNoUpdate.trim() === "")) {
                lineNoUpdate = line_no;
            }
            // ieCode now comes directly from frontend
            if (ieCode) {
                ieCodeUpdate = ieCode;
            }

            // Build consignees array if consignee info exists
            const consignees = [];
            if (consignee_name) {
                consignees.push({
                    consignee_name: consignee_name,
                    consignee_address: consignee_address || "",
                    consignee_country: consignee_country || "",
                });
            }

            // Build the update data with all fields from the Excel
            // Use getValueIfEmpty to preserve existing data - only update if field is empty
            const updateData = {
                // Core identification - these are always set (they define the record)
                year: normalizeYear(year),
                job_no,
                jobNumber: job_no, // Required for unique index
                job_date: getValueIfEmpty(job_date, existingJob?.job_date),
                branch_code: normalizeBranchCode(branch_code),

                // Custom House - preserve if exists
                custom_house: getValueIfEmpty(custom_house, existingJob?.custom_house),

                // Exporter - preserve if exists
                exporter: getValueIfEmpty(exporter, existingJob?.exporter),
                exporter_address: getValueIfEmpty(exporter_address, existingJob?.exporter_address),
                exporter_type: getValueIfEmpty(exporter_type, existingJob?.exporter_type),
                exporter_gstin: getValueIfEmpty(exporter_gstin || gstin, existingJob?.exporter_gstin),
                gstin: getValueIfEmpty(gstin || exporter_gstin, existingJob?.gstin),

                // Shipping Bill - preserve if exists
                sb_no: getValueIfEmpty(sb_no, existingJob?.sb_no),
                sb_date: getValueIfEmpty(sb_date, existingJob?.sb_date),
                sb_type: getValueIfEmpty(sb_type, existingJob?.sb_type),

                // BE - preserve if exists
                be_no: getValueIfEmpty(be_no, existingJob?.be_no),
                be_date: getValueIfEmpty(be_date, existingJob?.be_date),

                // AWB/BL - preserve if exists
                awb_bl_no: getValueIfEmpty(awb_bl_no, existingJob?.awb_bl_no),
                awb_bl_date: getValueIfEmpty(awb_bl_date, existingJob?.awb_bl_date),
                mbl_no: getValueIfEmpty(mbl_no, existingJob?.mbl_no),
                mbl_date: getValueIfEmpty(mbl_date, existingJob?.mbl_date),
                hbl_no: getValueIfEmpty(hbl_no, existingJob?.hbl_no),
                hbl_date: getValueIfEmpty(hbl_date, existingJob?.hbl_date),

                // Invoice - preserve if exists
                invoice_number: getValueIfEmpty(invoice_number, existingJob?.invoice_number),
                invoice_date: getValueIfEmpty(invoice_date, existingJob?.invoice_date),
                total_inv_value: getValueIfEmpty(total_inv_value, existingJob?.total_inv_value),

                // Weight & Packages - preserve if exists
                total_no_of_pkgs: getValueIfEmpty(total_no_of_pkgs, existingJob?.total_no_of_pkgs),
                package_unit: getValueIfEmpty(package_unit, existingJob?.package_unit),
                gross_weight_kg: getValueIfEmpty(gross_weight_kg, existingJob?.gross_weight_kg),
                net_weight_kg: getValueIfEmpty(net_weight_kg, existingJob?.net_weight_kg),

                // Financial - preserve if exists
                exchange_rate: getValueIfEmpty(exchange_rate, existingJob?.exchange_rate),
                currency: getValueIfEmpty(currency, existingJob?.currency),
                cif_amount: getValueIfEmpty(cif_amount, existingJob?.cif_amount),
                unit_price: getValueIfEmpty(unit_price, existingJob?.unit_price),

                // IE Code
                ieCode: ieCodeUpdate,

                // Consignment/Transport - preserve if exists
                consignmentType: getValueIfEmpty(consignmentType, existingJob?.consignmentType),
                transportMode: getValueIfEmpty(transportMode, existingJob?.transportMode),

                // Shipping Line - preserve if exists
                shipping_line_airline: getValueIfEmpty(shipping_line_airline, existingJob?.shipping_line_airline),

                // Ports - preserve if exists
                port_of_loading: getValueIfEmpty(port_of_loading, existingJob?.port_of_loading),
                port_of_discharge: getValueIfEmpty(port_of_discharge, existingJob?.port_of_discharge),
                final_destination: getValueIfEmpty(final_destination, existingJob?.final_destination),
                gateway_port: getValueIfEmpty(gateway_port, existingJob?.gateway_port),
                discharge_country: getValueIfEmpty(discharge_country, existingJob?.discharge_country),
                destination_country: getValueIfEmpty(destination_country, existingJob?.destination_country),
                destination_port: getValueIfEmpty(destination_port, existingJob?.destination_port),

                // Vessel/Flight - preserve if exists
                vessel_name: getValueIfEmpty(vessel_name, existingJob?.vessel_name),
                voyage_no: getValueIfEmpty(voyage_no, existingJob?.voyage_no),
                flight_no: getValueIfEmpty(flight_no, existingJob?.flight_no),
                flight_date: getValueIfEmpty(flight_date, existingJob?.flight_date),
                sailing_date: getValueIfEmpty(sailing_date, existingJob?.sailing_date),

                // Container count - preserve if exists
                no_of_containers: getValueIfEmpty(no_of_containers, existingJob?.no_of_containers),

                // EGM - preserve if exists
                egm_no: getValueIfEmpty(egm_no, existingJob?.egm_no),
                egm_date: getValueIfEmpty(egm_date, existingJob?.egm_date),

                // Description & Other - preserve if exists
                description: getValueIfEmpty(description, existingJob?.description),
                hss_name: getValueIfEmpty(hss_name, existingJob?.hss_name),
                cha: getValueIfEmpty(cha, existingJob?.cha),
                remarks: getValueIfEmpty(remarks, existingJob?.remarks),
                job_owner: getValueIfEmpty(job_owner, existingJob?.job_owner),
                shipper: getValueIfEmpty(shipper, existingJob?.shipper),
                notify: getValueIfEmpty(notify, existingJob?.notify),
                exporter_ref_no: getValueIfEmpty(exporter_ref_no, existingJob?.exporter_ref_no),
                nature_of_cargo: getValueIfEmpty(nature_of_cargo, existingJob?.nature_of_cargo),
                state_of_origin: getValueIfEmpty(state_of_origin, existingJob?.state_of_origin),

                // Bank - preserve if exists
                adCode: getValueIfEmpty(adCode, existingJob?.adCode),
                bank_name: getValueIfEmpty(bank_name, existingJob?.bank_name),

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

            // Add consignees if present
            if (consignees.length > 0) {
                updateData.consignees = consignees;
            }

            // Handle container_nos if present
            if (container_nos && Array.isArray(container_nos)) {
                if (existingJob) {
                    // Merge container sizes with existing containers
                    const existingContainers = existingJob.containers || [];
                    const updatedContainers = existingContainers.map((existingContainer) => {
                        const newContainerData = container_nos.find(
                            (c) => c.containerNo === existingContainer.containerNo
                        );
                        return newContainerData
                            ? { ...existingContainer, type: newContainerData.type }
                            : existingContainer;
                    });

                    // Add new containers that don't exist
                    container_nos.forEach((newContainer) => {
                        const exists = updatedContainers.find(
                            (c) => c.containerNo === newContainer.containerNo
                        );
                        if (!exists) {
                            updatedContainers.push({
                                containerNo: newContainer.containerNo,
                                type: newContainer.type || "",
                            });
                        }
                    });

                    updateData.containers = updatedContainers;
                } else {
                    updateData.containers = container_nos.map((c) => ({
                        containerNo: c.containerNo || c.container_number,
                        type: c.type || c.size || "",
                    }));
                }
            }

            // (Status is already set in updateData above)

            // Remove undefined and null values to avoid overwriting existing data
            Object.keys(updateData).forEach(key => {
                if (updateData[key] === undefined || updateData[key] === null || updateData[key] === '') {
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
