/**
 * Log Cleanup Script
 * 
 * Safely cleans up old logs from the serverlogs collection.
 * Should be run after the incident to reduce collection size.
 * 
 * Run with: node scripts/cleanupLogs.mjs
 * 
 * Options (via environment variables):
 * - CLEANUP_DAYS: Days of logs to keep (default: 7)
 * - DRY_RUN: If "true", only shows what would be deleted
 * 
 * @module scripts/cleanupLogs
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import readline from "readline";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env from parent directory
dotenv.config({ path: path.join(__dirname, "..", ".env") });

const MONGODB_URI =
    process.env.NODE_ENV === "production"
        ? process.env.PROD_MONGODB_URI
        : process.env.NODE_ENV === "server"
            ? process.env.SERVER_MONGODB_URI
            : process.env.DEV_MONGODB_URI;

// Configuration
const DAYS_TO_KEEP = parseInt(process.env.CLEANUP_DAYS) || 7;
const DRY_RUN = process.env.DRY_RUN === "true";

/**
 * Prompt user for confirmation
 */
function askConfirmation(question) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            rl.close();
            resolve(answer.toLowerCase() === "y" || answer.toLowerCase() === "yes");
        });
    });
}

/**
 * Format bytes to human readable
 */
function formatBytes(bytes) {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

async function cleanupLogs() {
    console.log("=".repeat(60));
    console.log("🧹 Log Cleanup Script");
    console.log("=".repeat(60));
    console.log(`Mode: ${DRY_RUN ? "DRY RUN (no changes)" : "LIVE"}`);
    console.log(`Days to keep: ${DAYS_TO_KEEP}`);
    console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
    console.log("");

    console.log("🔧 Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected");

    const db = mongoose.connection.db;

    try {
        // Get current stats
        console.log("\n📊 Current Collection Stats:");

        let serverlogStats;
        try {
            serverlogStats = await db.collection("serverlogs").stats();
            console.log(`  serverlogs:`);
            console.log(`    - Documents: ${serverlogStats.count.toLocaleString()}`);
            console.log(`    - Size: ${formatBytes(serverlogStats.size)}`);
            console.log(`    - Storage: ${formatBytes(serverlogStats.storageSize)}`);
        } catch (e) {
            serverlogStats = { count: 0, size: 0 };
            console.log("  serverlogs: Collection not found or empty");
        }

        if (serverlogStats.count === 0) {
            console.log("\n✅ No logs to clean up!");
            return;
        }

        // Calculate cutoff date
        const cutoffDate = new Date(Date.now() - DAYS_TO_KEEP * 24 * 60 * 60 * 1000);
        console.log(`\n📅 Cutoff date: ${cutoffDate.toISOString()}`);
        console.log(`   (Logs older than this will be deleted)`);

        // Count logs to delete
        const deleteFilter = { timestamp: { $lt: cutoffDate } };
        const toDeleteCount = await db.collection("serverlogs").countDocuments(deleteFilter);
        const toKeepCount = serverlogStats.count - toDeleteCount;

        console.log(`\n📈 Cleanup Analysis:`);
        console.log(`   - Logs to DELETE: ${toDeleteCount.toLocaleString()}`);
        console.log(`   - Logs to KEEP: ${toKeepCount.toLocaleString()}`);
        console.log(`   - Estimated size reduction: ~${formatBytes(serverlogStats.size * (toDeleteCount / serverlogStats.count))}`);

        if (toDeleteCount === 0) {
            console.log("\n✅ No logs older than cutoff date!");
            return;
        }

        // Sample of logs to delete
        console.log("\n📝 Sample of logs to delete (first 5):");
        const sampleLogs = await db.collection("serverlogs")
            .find(deleteFilter)
            .limit(5)
            .sort({ timestamp: 1 })
            .toArray();

        sampleLogs.forEach((log, i) => {
            const msg = (log.message || "").substring(0, 60);
            console.log(`   ${i + 1}. [${log.timestamp?.toISOString()}] ${msg}...`);
        });

        if (DRY_RUN) {
            console.log("\n⚠️ DRY RUN MODE - No changes made");
            console.log("   Set DRY_RUN=false to actually delete logs");
            return;
        }

        // Confirm deletion
        console.log("");
        const confirmed = await askConfirmation(
            `⚠️ Delete ${toDeleteCount.toLocaleString()} logs? (y/N): `
        );

        if (!confirmed) {
            console.log("❌ Cleanup cancelled by user");
            return;
        }

        // Perform deletion in batches
        console.log("\n🗑️ Deleting logs in batches...");

        const BATCH_SIZE = 10000;
        let totalDeleted = 0;
        let batchNum = 0;

        while (true) {
            batchNum++;

            // Delete a batch
            const result = await db.collection("serverlogs").deleteMany(
                deleteFilter,
                { maxTimeMS: 60000 } // 60 second timeout per batch
            );

            if (result.deletedCount === 0) break;

            totalDeleted += result.deletedCount;
            const progress = Math.round((totalDeleted / toDeleteCount) * 100);
            console.log(`   Batch ${batchNum}: Deleted ${result.deletedCount} (Total: ${totalDeleted.toLocaleString()}, ${progress}%)`);

            // Small delay between batches to reduce load
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        console.log(`\n✅ Total deleted: ${totalDeleted.toLocaleString()} logs`);

        // Compact collection
        console.log("\n🔧 Compacting collection...");
        try {
            await db.command({ compact: "serverlogs" });
            console.log("✅ Collection compacted");
        } catch (e) {
            console.log("⚠️ Compact failed (may require admin privileges):", e.message);
        }

        // Final stats
        console.log("\n📊 Final Collection Stats:");
        try {
            const finalStats = await db.collection("serverlogs").stats();
            console.log(`  serverlogs:`);
            console.log(`    - Documents: ${finalStats.count.toLocaleString()}`);
            console.log(`    - Size: ${formatBytes(finalStats.size)}`);
            console.log(`    - Storage: ${formatBytes(finalStats.storageSize)}`);

            console.log(`\n📉 Space Saved: ~${formatBytes(serverlogStats.size - finalStats.size)}`);
        } catch (e) {
            console.log("  Could not fetch final stats");
        }

    } catch (error) {
        console.error("\n❌ Error during cleanup:", error);
    } finally {
        await mongoose.disconnect();
        console.log("\n🔌 Disconnected from MongoDB");
    }
}

// Run the script
console.log("");
cleanupLogs()
    .then(() => {
        console.log("\n" + "=".repeat(60));
        console.log("✨ Cleanup script complete!");
        console.log("=".repeat(60));
        process.exit(0);
    })
    .catch((error) => {
        console.error("❌ Script failed:", error);
        process.exit(1);
    });
