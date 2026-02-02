/**
 * Database Index Creation Script
 * 
 * Creates necessary indexes for:
 * - Performance optimization
 * - TTL (auto-cleanup) for logs
 * - Query efficiency
 * 
 * Run with: node scripts/createIndexes.mjs
 * 
 * @module scripts/createIndexes
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

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

async function createIndexes() {
    console.log("🔧 Connecting to MongoDB...");
    console.log("Environment:", process.env.NODE_ENV || "development");

    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    const db = mongoose.connection.db;

    try {
        // =========================================================================
        // SERVER LOGS - Critical TTL index to prevent log explosion
        // =========================================================================
        console.log("\n📁 Creating indexes for: serverlogs");

        try {
            // TTL index - auto-delete logs after 7 days
            await db.collection("serverlogs").createIndex(
                { timestamp: 1 },
                {
                    expireAfterSeconds: 604800, // 7 days
                    name: "idx_serverlogs_ttl_7days"
                }
            );
            console.log("  ✅ TTL index created (7 days auto-cleanup)");
        } catch (e) {
            if (e.code === 85) {
                console.log("  ⚠️ TTL index exists with different options, dropping and recreating...");
                await db.collection("serverlogs").dropIndex("idx_serverlogs_ttl_7days").catch(() => { });
                await db.collection("serverlogs").dropIndex("timestamp_1").catch(() => { });
                await db.collection("serverlogs").createIndex(
                    { timestamp: 1 },
                    { expireAfterSeconds: 604800, name: "idx_serverlogs_ttl_7days" }
                );
                console.log("  ✅ TTL index recreated");
            } else {
                console.log("  ❌ Error:", e.message);
            }
        }

        // Index on level for filtering
        await db.collection("serverlogs").createIndex(
            { level: 1, timestamp: -1 },
            { name: "idx_serverlogs_level_time", background: true }
        );
        console.log("  ✅ Level + timestamp index created");

        // =========================================================================
        // EXPORT JOBS - Query optimization
        // =========================================================================
        console.log("\n📁 Creating indexes for: exportjobs");

        // Job number + year (unique compound)
        await db.collection("exportjobs").createIndex(
            { job_no: 1, year: 1 },
            { name: "idx_exportjobs_jobno_year", unique: true, background: true }
        );
        console.log("  ✅ job_no + year index created (unique)");

        // Exporter + year (for reports)
        await db.collection("exportjobs").createIndex(
            { exporter: 1, year: 1 },
            { name: "idx_exportjobs_exporter_year", background: true }
        );
        console.log("  ✅ exporter + year index created");

        // Status for filtering
        await db.collection("exportjobs").createIndex(
            { status: 1, createdAt: -1 },
            { name: "idx_exportjobs_status_created", background: true }
        );
        console.log("  ✅ status + createdAt index created");

        // CreatedAt for sorting
        await db.collection("exportjobs").createIndex(
            { createdAt: -1 },
            { name: "idx_exportjobs_created_desc", background: true }
        );
        console.log("  ✅ createdAt descending index created");

        // Branch code for filtering
        await db.collection("exportjobs").createIndex(
            { branch_code: 1, year: 1 },
            { name: "idx_exportjobs_branch_year", background: true }
        );
        console.log("  ✅ branch_code + year index created");

        // =========================================================================
        // AUDIT TRAILS - Performance and TTL
        // =========================================================================
        console.log("\n📁 Creating indexes for: audittrails");

        // TTL index - auto-delete after 90 days
        try {
            await db.collection("audittrails").createIndex(
                { timestamp: 1 },
                {
                    expireAfterSeconds: 7776000, // 90 days
                    name: "idx_audittrails_ttl_90days"
                }
            );
            console.log("  ✅ TTL index created (90 days auto-cleanup)");
        } catch (e) {
            if (e.code === 85) {
                console.log("  ⚠️ TTL index exists with different options");
            } else {
                console.log("  ❌ Error:", e.message);
            }
        }

        // Username + timestamp for user activity lookups
        await db.collection("audittrails").createIndex(
            { username: 1, timestamp: -1 },
            { name: "idx_audittrails_user_time", background: true }
        );
        console.log("  ✅ username + timestamp index created");

        // Job number + year for job history
        await db.collection("audittrails").createIndex(
            { job_no: 1, year: 1, timestamp: -1 },
            { name: "idx_audittrails_job_time", background: true }
        );
        console.log("  ✅ job_no + year + timestamp index created");

        // Action type for filtering
        await db.collection("audittrails").createIndex(
            { action: 1, timestamp: -1 },
            { name: "idx_audittrails_action_time", background: true }
        );
        console.log("  ✅ action + timestamp index created");

        // =========================================================================
        // USERS
        // =========================================================================
        console.log("\n📁 Creating indexes for: users");

        await db.collection("users").createIndex(
            { username: 1 },
            { name: "idx_users_username", unique: true, background: true }
        );
        console.log("  ✅ username index created (unique)");

        // =========================================================================
        // SUMMARY
        // =========================================================================
        console.log("\n" + "=".repeat(50));
        console.log("✅ All indexes created successfully!");
        console.log("=".repeat(50));

        // List all indexes
        console.log("\n📊 Index Summary:");

        for (const collName of ["serverlogs", "audittrails", "exportjobs", "users"]) {
            try {
                const indexes = await db.collection(collName).indexes();
                console.log(`\n${collName}: ${indexes.length} indexes`);
                indexes.forEach(idx => {
                    const ttl = idx.expireAfterSeconds
                        ? ` (TTL: ${Math.round(idx.expireAfterSeconds / 86400)} days)`
                        : "";
                    console.log(`  - ${idx.name}${ttl}`);
                });
            } catch (e) {
                console.log(`\n${collName}: Collection not found`);
            }
        }

    } catch (error) {
        console.error("❌ Error creating indexes:", error);
    } finally {
        await mongoose.disconnect();
        console.log("\n🔌 Disconnected from MongoDB");
    }
}

// Run the script
createIndexes()
    .then(() => {
        console.log("\n✨ Index creation complete!");
        process.exit(0);
    })
    .catch((error) => {
        console.error("❌ Script failed:", error);
        process.exit(1);
    });
