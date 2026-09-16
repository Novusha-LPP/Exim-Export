import cron from "node-cron";
import express from "express";
import { autoRejectPendingEnquiries } from "../routes/export-dsr/freightEnquiryRoutes.mjs";

const LOG_PREFIX = "[Freight Auto-Reject Job]";

/**
 * Runs the auto-reject job for stale pending enquiries (>= 5 days old)
 */
export const runFreightAutoRejectJob = async () => {
  console.log(`${LOG_PREFIX} Running check for pending enquiries older than 5 days...`);
  try {
    await autoRejectPendingEnquiries();
    console.log(`${LOG_PREFIX} Finished check for stale enquiries.`);
  } catch (err) {
    console.error(`${LOG_PREFIX} Error during execution:`, err);
  }
};

/**
 * Initializes hourly cron job (runs every hour at minute 0)
 */
export const initFreightAutoRejectCronJob = () => {
  // Run check immediately on server startup
  runFreightAutoRejectJob().catch((err) => {
    console.error(`${LOG_PREFIX} Startup check error:`, err);
  });

  // Schedule to run hourly at minute 0
  cron.schedule(
    "0 * * * *",
    async () => {
      try {
        await runFreightAutoRejectJob();
      } catch (err) {
        console.error(`${LOG_PREFIX} Cron Execution Error:`, err);
      }
    },
    { timezone: "Asia/Kolkata" }
  );
  console.log(`${LOG_PREFIX} Hourly cron job registered.`);
};

export const freightAutoRejectRouter = express.Router();

/**
 * POST /api/admin/run-freight-auto-reject-job
 * Manually trigger freight auto-reject job
 */
freightAutoRejectRouter.post("/api/admin/run-freight-auto-reject-job", (req, res) => {
  res.status(202).json({
    success: true,
    message: "Freight auto-reject job started in background."
  });

  setImmediate(() => {
    runFreightAutoRejectJob().catch((err) => {
      console.error(`${LOG_PREFIX} Manual trigger error:`, err);
    });
  });
});
