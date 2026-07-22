import cron from "node-cron";
import axios from "axios";
import express from "express";
import ExJobModel from "../model/export/ExJobModel.mjs";

// Custom House → ICEGATE Location Code mapping
const CUSTOM_HOUSE_CODE_MAP = {
    "AHMEDABAD AIR CARGO": "INAMD4",
    "AIR AHMEDABAD": "INAMD4",
    "ICD SABARMATI": "INSBI6",
    "ICD SABARMATI, AHMEDABAD": "INSBI6",
    "ICD KHODIYAR": "INSBI6",
    "ICD VIRAMGAM": "INVGR6",
    "ICD SACHANA": "INJKA6",
    "ICD VIROCHANNAGAR": "INVCN6",
    "ICD VIROCHAN NAGAR": "INVCN6",
    "THAR DRY PORT": "INSAU6",
    "ICD SANAND": "INSND6",
    "ANKLESHWAR ICD": "INAKV6",
    "ICD VARNAMA": "INVRM6",
    "MUNDRA SEA": "INMUN1",
    "KANDLA SEA": "INIXY1",
    "COCHIN AIR CARGO": "INCOK4",
    "COCHIN SEA": "INCOK1",
    "HAZIRA": "INHZA1",
};

const POLL_INTERVAL_DAYS = 15;
const DELAY_BETWEEN_JOBS_MS = 2000;
const ICEGATE_TIMEOUT_MS = 30000;
const LOG_PREFIX = "[SB Track Job]";

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Returns true if the job has not been polled in the last POLL_INTERVAL_DAYS days */
function isDue(lastPolled) {
    if (!lastPolled) return true;
    const diffDays = (Date.now() - new Date(lastPolled).getTime()) / (1000 * 60 * 60 * 24);
    return diffDays >= POLL_INTERVAL_DAYS;
}

/** Format DD-MM-YYYY or YYYY-MM-DD → YYYYMMDD for ICEGATE */
function formatSbDate(sbDate) {
    if (!sbDate) return null;
    const cleaned = sbDate.trim();
    if (!cleaned.includes("-")) return cleaned;
    const parts = cleaned.split("-");
    if (parts.length !== 3) return null;
    return parts[0].length === 4
        ? parts.join("")
        : `${parts[2]}${parts[1]}${parts[0]}`;
}

/** Parse ICEGATE date string → yyyy-MM-dd, or null if N/A */
function extractDate(dateStr) {
    if (!dateStr) return null;
    const u = dateStr.trim().toUpperCase();
    if (["N.A.", "N/A", "NA", ""].includes(u)) return null;
    try {
        const d = new Date(dateStr);
        if (!isNaN(d.getTime())) return d.toISOString().split("T")[0];
    } catch (_) { }
    return null;
}

/** True if value is present and not a placeholder */
function isValidVal(val) {
    if (!val || typeof val !== "string") return false;
    const u = val.trim().toUpperCase();
    return u !== "" && u !== "N.A." && u !== "N/A" && u !== "NA";
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ── ICEGATE API caller ────────────────────────────────────────────────────────

async function callIcegate(sbNo, sbDate, customHouse) {
    const location =
        CUSTOM_HOUSE_CODE_MAP[customHouse?.toUpperCase()] ||
        CUSTOM_HOUSE_CODE_MAP[customHouse];
    if (!location) return null;

    const formattedDate = formatSbDate(sbDate);
    if (!formattedDate) return null;

    const response = await axios.post(
        "https://foservices.icegate.gov.in/enquiry/publicEnquiries/SBTrack_Ices_action_Public",
        { location, sbNo, sbDate: formattedDate },
        {
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            },
            timeout: ICEGATE_TIMEOUT_MS,
        }
    );
    return response.data;
}

// ── Core job logic ────────────────────────────────────────────────────────────

export async function runSbTrackJob(force = false) {
    console.log(`${LOG_PREFIX} ═══════════════════════════════════════════`);
    console.log(`${LOG_PREFIX} Started at ${new Date().toISOString()}`);
    if (force) console.log(`${LOG_PREFIX} ⚠️ FORCE MODE ENABLED — Ignoring 15-day polling gate.`);

    // Compute current Indian financial year (Apr–Mar) as "YY-YY" e.g. "26-27"
    const now = new Date();
    const calYear = now.getFullYear();
    const month = now.getMonth() + 1; // 1-based
    const fyStartYear = month >= 4 ? calYear : calYear - 1;
    const currentFY = `${String(fyStartYear).slice(-2)}-${String(fyStartYear + 1).slice(-2)}`;
    console.log(`${LOG_PREFIX} Financial Year: ${currentFY}`);

    const jobs = await ExJobModel.find({
        isJobCanceled: { $ne: true },
        year: currentFY,
        sb_no: { $exists: true, $ne: "" },
        sb_date: { $exists: true, $ne: "" },
        custom_house: { $exists: true, $ne: "" },
    })
        .select(
            "job_no sb_no sb_date custom_house egm_no egm_date " +
            "invoices.products.drawbackDetails sb_track_last_polled leo_date rms container_no seal_no"
        )
        .lean();

    let skippedNotDue = 0, skippedNoLocation = 0;
    const eligibleJobs = [];

    for (const job of jobs) {
        // Add the force check here
        if (!force && !isDue(job.sb_track_last_polled)) { skippedNotDue++; continue; }

        const loc = CUSTOM_HOUSE_CODE_MAP[job.custom_house?.toUpperCase()] || CUSTOM_HOUSE_CODE_MAP[job.custom_house];
        if (!loc) { skippedNoLocation++; continue; }
        eligibleJobs.push(job);
    }

    console.log(`${LOG_PREFIX} ───────────────────────────────────────────`);
    console.log(`${LOG_PREFIX} Total candidates (FY ${currentFY}) : ${jobs.length}`);
    console.log(`${LOG_PREFIX} Polled recently / not due (skip)    : ${skippedNotDue}`);
    console.log(`${LOG_PREFIX} Unknown custom house (skip)         : ${skippedNoLocation}`);
    console.log(`${LOG_PREFIX} ► PENDING TO POLL                   : ${eligibleJobs.length}`);
    console.log(`${LOG_PREFIX} ───────────────────────────────────────────`);

    const stats = {
        total: jobs.length,
        pending: eligibleJobs.length,
        processed: 0,
        updated: 0,
        noNewData: 0,
        errors: 0,
        skippedNotDue,
        skippedNoLocation,
    };

    for (let i = 0; i < eligibleJobs.length; i++) {
        const job = eligibleJobs[i];
        const progress = `[${i + 1}/${eligibleJobs.length}]`;

        try {
            console.log(`${LOG_PREFIX} ${progress} Polling ${job.job_no} | SB: ${job.sb_no} | ${job.custom_house}`);
            const icegateData = await callIcegate(job.sb_no, job.sb_date, job.custom_house);

            const updates = { sb_track_last_polled: new Date() };
            const changeLog = []; // human-readable list of what changed

            if (icegateData) {
                // ── currentStatusModel ────────────────────────────────────
                const statusList = icegateData.currentStatusModel || [];
                if (statusList.length > 0) {
                    const status = statusList[0];

                    const leoDate = extractDate(status.leoDate);
                    if (leoDate && !job.leo_date) {
                        updates.leo_date = leoDate;
                        changeLog.push(`leo_date: (empty) → ${leoDate}`);
                    }

                    if (!job.rms) {
                        if (isValidVal(status.leoDate)) {
                            updates.rms = "RMS";
                            changeLog.push(`rms: (empty) → RMS`);
                        } else if (status.currQueue?.toUpperCase().includes("EXAM")) {
                            updates.rms = "Assessment";
                            changeLog.push(`rms: (empty) → Assessment`);
                        }
                    }

                    const dbkScrollNo = isValidVal(status.custScrollNo) ? status.custScrollNo.trim() : null;
                    const dbkScrollDate = extractDate(status.scrollDate);

                    if (dbkScrollNo || dbkScrollDate) {
                        let dbkUpdated = false;
                        if (job.invoices && Array.isArray(job.invoices)) {
                            for (let i = 0; i < job.invoices.length; i++) {
                                const inv = job.invoices[i];
                                if (inv.products && Array.isArray(inv.products)) {
                                    for (let j = 0; j < inv.products.length; j++) {
                                        const prod = inv.products[j];
                                        if (prod.drawbackDetails && Array.isArray(prod.drawbackDetails) && prod.drawbackDetails.length > 0) {
                                            const d = prod.drawbackDetails[0];
                                            const basePath = `invoices.${i}.products.${j}.drawbackDetails.0`;

                                            if (dbkScrollNo && !d.drawback_scroll_no) {
                                                updates[`${basePath}.drawback_scroll_no`] = dbkScrollNo;
                                                changeLog.push(`drawback_scroll_no: (empty) → ${dbkScrollNo}`);
                                                dbkUpdated = true;
                                            }
                                            if (dbkScrollDate && !d.drawback_scroll_date) {
                                                updates[`${basePath}.drawback_scroll_date`] = dbkScrollDate;
                                                changeLog.push(`drawback_scroll_date: (empty) → ${dbkScrollDate}`);
                                                dbkUpdated = true;
                                            }
                                            if (dbkUpdated) break;
                                        }
                                    }
                                }
                                if (dbkUpdated) break;
                            }
                        }
                    }
                }

                // ── egmStatusModel ────────────────────────────────────────
                const egmList = icegateData.egmStatusModel || [];
                if (egmList.length > 0) {
                    const egm = egmList[0];
                    if (isValidVal(egm.egmNo) && !job.egm_no) {
                        updates.egm_no = egm.egmNo.trim();
                        changeLog.push(`egm_no: (empty) → ${egm.egmNo.trim()}`);
                    }
                    const egmDate = extractDate(egm.egmDate);
                    if (egmDate && !job.egm_date) {
                        updates.egm_date = egmDate;
                        changeLog.push(`egm_date: (empty) → ${egmDate}`);
                    }
                    if (egmList.length === 1) {
                        if (isValidVal(egm.containerNo) && !job.container_no) {
                            updates.container_no = egm.containerNo.trim();
                            changeLog.push(`container_no: (empty) → ${egm.containerNo.trim()}`);
                        }
                        if (isValidVal(egm.sealNo) && !job.seal_no) {
                            updates.seal_no = egm.sealNo.trim();
                            changeLog.push(`seal_no: (empty) → ${egm.sealNo.trim()}`);
                        }
                    }
                }

                // ── roslStatusModel (ROSCTL) ──────────────────────────────
                const roslList = icegateData.roslStatusModel || [];
                if (roslList.length > 0) {
                    const rosl = roslList[0];
                    const rosctlScrollNo = isValidVal(rosl.roslScrollNo) ? rosl.roslScrollNo.trim() : null;
                    const rosctlScrollDate = extractDate(rosl.roslScrollDate);

                    if (rosctlScrollNo || rosctlScrollDate) {
                        let roslUpdated = false;
                        if (job.invoices && Array.isArray(job.invoices)) {
                            for (let i = 0; i < job.invoices.length; i++) {
                                const inv = job.invoices[i];
                                if (inv.products && Array.isArray(inv.products)) {
                                    for (let j = 0; j < inv.products.length; j++) {
                                        const prod = inv.products[j];
                                        if (prod.drawbackDetails && Array.isArray(prod.drawbackDetails) && prod.drawbackDetails.length > 0) {
                                            const d = prod.drawbackDetails[0];
                                            const basePath = `invoices.${i}.products.${j}.drawbackDetails.0`;

                                            if (rosctlScrollNo && !d.rosctl_scroll_no) {
                                                updates[`${basePath}.rosctl_scroll_no`] = rosctlScrollNo;
                                                changeLog.push(`rosctl_scroll_no: (empty) → ${rosctlScrollNo}`);
                                                roslUpdated = true;
                                            }
                                            if (rosctlScrollDate && !d.rosctl_scroll_date) {
                                                updates[`${basePath}.rosctl_scroll_date`] = rosctlScrollDate;
                                                changeLog.push(`rosctl_scroll_date: (empty) → ${rosctlScrollDate}`);
                                                roslUpdated = true;
                                            }
                                            if (roslUpdated) break;
                                        }
                                    }
                                }
                                if (roslUpdated) break;
                            }
                        }
                    }
                }
            }

            await ExJobModel.findByIdAndUpdate(job._id, { $set: updates });
            stats.processed++;

            if (changeLog.length > 0) {
                stats.updated++;
                console.log(`${LOG_PREFIX} ${progress} ✅ ${job.job_no} — ${changeLog.length} field(s) updated:`);
                changeLog.forEach((line) => console.log(`${LOG_PREFIX}       • ${line}`));
            } else {
                stats.noNewData++;
                console.log(`${LOG_PREFIX} ${progress} ℹ️  ${job.job_no} — no new data from ICEGATE`);
            }

        } catch (err) {
            stats.errors++;
            const msg = err.code === "ECONNABORTED" ? "ICEGATE timeout" : err.message;
            console.error(`${LOG_PREFIX} ${progress} ❌ ${job.job_no} — ERROR: ${msg}`);
            try {
                await ExJobModel.findByIdAndUpdate(job._id, { $set: { sb_track_last_polled: new Date() } });
            } catch (_) { }
        }

        await sleep(DELAY_BETWEEN_JOBS_MS);
    }

    console.log(`${LOG_PREFIX} ═══════════════════════════════════════════`);
    console.log(`${LOG_PREFIX} ✅ RUN COMPLETE`);
    console.log(`${LOG_PREFIX}    Total FY ${currentFY} jobs     : ${stats.total}`);
    console.log(`${LOG_PREFIX}    Pending polled              : ${stats.pending}`);
    console.log(`${LOG_PREFIX}    With new data (updated)     : ${stats.updated}`);
    console.log(`${LOG_PREFIX}    No new data from ICEGATE    : ${stats.noNewData}`);
    console.log(`${LOG_PREFIX}    Errors                      : ${stats.errors}`);
    console.log(`${LOG_PREFIX}    Skipped (polled < 15d ago)  : ${stats.skippedNotDue}`);
    console.log(`${LOG_PREFIX}    Skipped (unknown location)  : ${stats.skippedNoLocation}`);
    console.log(`${LOG_PREFIX} ═══════════════════════════════════════════`);
    return stats;
}

// ── Cron registration ─────────────────────────────────────────────────────────

/**
 * Runs daily at 12:00 PM IST.
 * Most jobs are skipped (15-day gate via sb_track_last_polled), so the daily
 * cron is cheap — it only does real work once per 15 days per job.
 */
export const initSbTrackCronJob = () => {
    cron.schedule(
        "0 12 * * *",
        async () => {
            try {
                await runSbTrackJob();
            } catch (err) {
                console.error(`${LOG_PREFIX} Critical cron error:`, err);
            }
        },
        { timezone: "Asia/Kolkata" }
    );
    console.log(`${LOG_PREFIX} Registered — runs daily 12:00 PM IST, 15-day gate per job.`);
};

// ── Manual trigger endpoint ───────────────────────────────────────────────────

export const sbTrackJobRouter = express.Router();

/**
 * POST /api/admin/run-sb-track-job
 * Fire-and-forget: responds immediately with 202, runs job in background.
 * Monitor progress in server logs (prefixed with [SB Track Job]).
 */
sbTrackJobRouter.post("/api/admin/run-sb-track-job", (req, res) => {
    // Check if force=true was passed in the URL query string
    const force = req.query.force === "true";
    console.log(`${LOG_PREFIX} Manual trigger received — starting in background.${force ? " (FORCE MODE)" : ""}`);

    // Respond immediately so the HTTP connection isn't held open
    res.status(202).json({
        success: true,
        message: `SB Track job started in background.${force ? " Force mode enabled." : ""} Check server logs for progress.`,
    });

    // Run job fully detached from the request/response lifecycle
    setImmediate(() => {
        runSbTrackJob(force).catch((err) => {
            console.error(`${LOG_PREFIX} Background job error:`, err);
        });
    });
});