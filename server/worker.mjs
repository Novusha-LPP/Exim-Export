import "dotenv/config";
import mongoose from "mongoose";
import dotenv from "dotenv";

import { initDsrCronJob } from "./jobs/dsrJob.mjs";
import { initSbTrackCronJob } from "./jobs/sbTrackJob.mjs";
import { initConcorTrackCronJob } from "./jobs/concorTrackJob.mjs";
import { initFreightAutoRejectCronJob } from "./jobs/freightAutoRejectJob.mjs";

dotenv.config();

console.log("=================================================");
console.log("🚀 Starting EXIM-Export Dedicated Background Worker");
console.log(`🕒 Process PID: ${process.pid} | Node: ${process.version}`);
console.log("=================================================");

const MONGODB_URI =
  process.env.NODE_ENV === "production"
    ? process.env.PROD_MONGODB_URI
    : process.env.NODE_ENV === "server"
      ? process.env.SERVER_MONGODB_URI
      : process.env.DEV_MONGODB_URI;

mongoose.set("strictQuery", true);

mongoose
  .connect(MONGODB_URI, {
    appName: "EximExportWorker",
    minPoolSize: 2,
    maxPoolSize: 15,
    maxIdleTimeMS: 30000,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  })
  .then(() => {
    console.log("🟢 [Worker] MongoDB connected successfully.");

    // Initialize all background cron tasks
    console.log("🕒 [Worker] Initializing scheduled background tasks...");
    initDsrCronJob();               // Daily 4 PM DSR Excel generation & bulk emailing
    initSbTrackCronJob();           // Daily 12 PM ICEGATE shipping bill auto-poll
    initConcorTrackCronJob();       // Daily 12 PM CONCOR container track auto-poll
    initFreightAutoRejectCronJob(); // Hourly freight auto-reject check

    console.log("✅ [Worker] All background jobs registered. Worker is active and running.");
  })
  .catch((err) => {
    console.error("❌ [Worker] Fatal: Error connecting to MongoDB:", err);
    process.exit(1);
  });

// Graceful shutdown handling
const handleShutdown = async (signal) => {
  console.log(`\n🛑 [Worker] Received ${signal}. Shutting down worker gracefully...`);
  try {
    await mongoose.connection.close(false);
    console.log("🟢 [Worker] MongoDB connection closed cleanly.");
    process.exit(0);
  } catch (err) {
    console.error("❌ [Worker] Error closing MongoDB connection during shutdown:", err);
    process.exit(1);
  }
};

process.on("SIGINT", () => handleShutdown("SIGINT"));
process.on("SIGTERM", () => handleShutdown("SIGTERM"));
