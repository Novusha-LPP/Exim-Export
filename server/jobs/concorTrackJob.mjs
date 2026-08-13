import cron from "node-cron";
import axios from "axios";
import https from "https";
import express from "express";
import ExJobModel from "../model/export/ExJobModel.mjs";

const httpsAgent = new https.Agent({
    rejectUnauthorized: false
});

const CONCOR_API_URL = "https://www.concorindia.co.in/api/multipalContainer";
const LOG_PREFIX = "[CONCOR Track Job]";
const BATCH_SIZE = 25; // Batch up to 25 containers per API request
const CONCOR_TIMEOUT_MS = 30000;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Parses date from DETAILS string (e.g. "Departed from Gate <b>KHODIYAR</b> on 20/07/2026 23:52:00</b>")
 * Returns { railOutDate: "YYYY-MM-DD", railReachedDate: "YYYY-MM-DD" } or null
 */
function parseDepartedGateDetails(details) {
    if (!details || typeof details !== "string") return null;
    if (!/Departed from Gate/i.test(details)) return null;

    // Extract DD/MM/YYYY or YYYY-MM-DD or DD-MM-YYYY
    const dateMatch = details.match(/(\d{2})[\/\-](\d{2})[\/\-](\d{4})/);
    if (!dateMatch) return null;

    const day = parseInt(dateMatch[1], 10);
    const month = parseInt(dateMatch[2], 10);
    const year = parseInt(dateMatch[3], 10);

    const departedDate = new Date(year, month - 1, day);
    if (isNaN(departedDate.getTime())) return null;

    // Rail Out Date = departedDate (YYYY-MM-DD format)
    const outYear = departedDate.getFullYear();
    const outMonth = String(departedDate.getMonth() + 1).padStart(2, "0");
    const outDay = String(departedDate.getDate()).padStart(2, "0");
    const railOutDateStr = `${outYear}-${outMonth}-${outDay}`;

    // Rail Reached Date = departedDate + 1 day
    const reachedDate = new Date(departedDate);
    reachedDate.setDate(reachedDate.getDate() + 1);
    const rYear = reachedDate.getFullYear();
    const rMonth = String(reachedDate.getMonth() + 1).padStart(2, "0");
    const rDay = String(reachedDate.getDate()).padStart(2, "0");
    const railReachedDateStr = `${rYear}-${rMonth}-${rDay}`;

    return {
        railOutDate: railOutDateStr,
        railReachedDate: railReachedDateStr,
        departedDateStr: `${outDay}-${outMonth}-${outYear}`
    };
}

/**
 * Main function to run CONCOR Container Tracking Job
 */
export async function runConcorTrackJob(force = false) {
    try {
        // Query active export jobs that are pending Rail Out or Rail Reached
        const pendingJobs = await ExJobModel.find({
            isJobCanceled: { $ne: true },
            "containers.0": { $exists: true },
            $or: [
                { "operations.0.statusDetails.0.handoverConcorTharSanganaRailRoadDate": { $in: [null, ""] } },
                { "operations.0.statusDetails.0.railOutReachedDate": { $in: [null, ""] } },
                { "operations.statusDetails.handoverConcorTharSanganaRailRoadDate": { $in: [null, ""] } },
                { "operations.statusDetails.railOutReachedDate": { $in: [null, ""] } }
            ]
        });

        // Map container number -> array of jobs referencing that container
        const containerToJobsMap = new Map();
        for (const job of pendingJobs) {
            if (Array.isArray(job.containers)) {
                for (const c of job.containers) {
                    const cNo = (c.containerNo || c.container_number || "").trim().toUpperCase();
                    if (cNo && cNo.length >= 10) {
                        if (!containerToJobsMap.has(cNo)) {
                            containerToJobsMap.set(cNo, []);
                        }
                        containerToJobsMap.get(cNo).push(job);
                    }
                }
            }
        }

        const allContainers = Array.from(containerToJobsMap.keys());
        if (allContainers.length === 0) {
            return { totalJobs: pendingJobs.length, updatedJobs: 0, trackedContainers: 0 };
        }

        let updatedCount = 0;
        let matchedCount = 0;

        // Process containers in batches
        for (let i = 0; i < allContainers.length; i += BATCH_SIZE) {
            const batch = allContainers.slice(i, i + BATCH_SIZE);
            try {
                const apiRes = await axios.post(
                    CONCOR_API_URL,
                    { containerNo: batch },
                    {
                        headers: {
                            "Content-Type": "application/json",
                            "Accept": "application/json",
                            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
                        },
                        httpsAgent,
                        timeout: CONCOR_TIMEOUT_MS
                    }
                );

                const resData = apiRes.data;
                const containerResults = resData?.data?.data || resData?.data || {};

                for (const [cNo, info] of Object.entries(containerResults)) {
                    const details = info?.containerTrack?.DETAILS;
                    if (!details) continue;

                    const parsedDates = parseDepartedGateDetails(details);
                    if (!parsedDates) continue;
                    matchedCount++;

                    const jobsToUpdate = containerToJobsMap.get(cNo.toUpperCase()) || [];
                    for (const job of jobsToUpdate) {
                        // Refresh job from DB
                        const dbJob = await ExJobModel.findById(job._id);
                        if (!dbJob) continue;

                        if (!dbJob.operations || dbJob.operations.length === 0) {
                            dbJob.operations = [{ statusDetails: [{}] }];
                        }
                        if (!dbJob.operations[0].statusDetails || dbJob.operations[0].statusDetails.length === 0) {
                            dbJob.operations[0].statusDetails = [{}];
                        }

                        const statusObj = dbJob.operations[0].statusDetails[0];
                        let modified = false;

                        if (!statusObj.handoverConcorTharSanganaRailRoadDate) {
                            statusObj.handoverConcorTharSanganaRailRoadDate = parsedDates.railOutDate;
                            modified = true;
                        }
                        if (!statusObj.railOutReachedDate) {
                            statusObj.railOutReachedDate = parsedDates.railReachedDate;
                            modified = true;
                        }
                        if (statusObj.railRoad !== "rail") {
                            statusObj.railRoad = "rail";
                            modified = true;
                        }

                        if (modified) {
                            dbJob.markModified("operations");
                            await dbJob.save();
                            updatedCount++;

                            // If parent club job, also update clubbed child jobs
                            if (dbJob.is_club_job_parent && Array.isArray(dbJob.clubbed_jobs) && dbJob.clubbed_jobs.length > 0) {
                                for (const cJobNo of dbJob.clubbed_jobs) {
                                    await ExJobModel.updateOne(
                                        { job_no: cJobNo },
                                        {
                                            $set: {
                                                "operations.0.statusDetails.0.handoverConcorTharSanganaRailRoadDate": parsedDates.railOutDate,
                                                "operations.0.statusDetails.0.railOutReachedDate": parsedDates.railReachedDate,
                                                "operations.0.statusDetails.0.railRoad": "rail"
                                            }
                                        }
                                    );
                                }
                            }
                        }
                    }
                }
            } catch (batchErr) {
                console.error(`${LOG_PREFIX} Batch polling error:`, batchErr.message);
            }

            // Sleep between batches to avoid overloading API
            if (i + BATCH_SIZE < allContainers.length) {
                await sleep(1500);
            }
        }

        return { totalJobs: pendingJobs.length, updatedJobs: updatedCount, matchedContainers: matchedCount };
    } catch (error) {
        console.error(`${LOG_PREFIX} Error running CONCOR tracking job:`, error);
        throw error;
    }
}

/**
 * Initializes CONCOR Cron Job (runs daily at 12:00 PM IST)
 */
export const initConcorTrackCronJob = () => {
    cron.schedule(
        "0 12 * * *",
        async () => {
            try {
                await runConcorTrackJob();
            } catch (err) {
                console.error(`${LOG_PREFIX} Cron Execution Error:`, err);
            }
        },
        { timezone: "Asia/Kolkata" }
    );
};

// ── Manual Admin Router ────────────────────────────────────────────────────────

export const concorTrackJobRouter = express.Router();

/**
 * POST /api/admin/run-concor-track-job
 * Manually triggers CONCOR container tracking job in background
 */
concorTrackJobRouter.post("/api/admin/run-concor-track-job", (req, res) => {
    const force = req.query.force === "true";

    res.status(202).json({
        success: true,
        message: `CONCOR Container Track job started in background.${force ? " Force mode enabled." : ""} Check server logs for details.`
    });

    setImmediate(() => {
        runConcorTrackJob(force).catch((err) => {
        });
    });
});
