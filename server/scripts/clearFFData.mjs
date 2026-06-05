import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env from parent directory
dotenv.config({ path: path.join(__dirname, "..", ".env") });

let MONGODB_URI =
    process.env.NODE_ENV === "production"
        ? process.env.PROD_MONGODB_URI
        : process.env.NODE_ENV === "server"
            ? process.env.SERVER_MONGODB_URI
            : process.env.DEV_MONGODB_URI;

if (process.argv.includes('--prod')) {
    MONGODB_URI = process.env.PROD_MONGODB_URI;
}

async function runCleanup() {
    console.log("🧹 Connecting to MongoDB...");
    console.log("Connection URI:", MONGODB_URI ? MONGODB_URI.substring(0, 30) + "..." : "undefined");
    console.log("Environment:", process.env.NODE_ENV || "development");

    if (!MONGODB_URI) {
        console.error("❌ MONGODB_URI is not defined in env variables!");
        process.exit(1);
    }

    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    const db = mongoose.connection.db;

    try {
        // 1. Clear freightenquiries
        const r1 = await db.collection("freightenquiries").deleteMany({
            $or: [
                { enquiry_no: /^FF/ },
                { success_no: /^FF/ },
                { rejected_no: /^FF/ }
            ]
        });
        console.log(`Deleted ${r1.deletedCount} documents from freightenquiries`);

        // 2. Clear exportjobs
        const r2 = await db.collection("exportjobs").deleteMany({
            $or: [
                { job_no: /^FF/ },
                { jobNumber: /^FF/ }
            ]
        });
        console.log(`Deleted ${r2.deletedCount} documents from exportjobs`);

        // 3. Clear paymentrequests
        const r3 = await db.collection("paymentrequests").deleteMany({
            jobNo: /^FF/
        });
        console.log(`Deleted ${r3.deletedCount} documents from paymentrequests`);

        // 4. Clear purchasebookentries
        const r4 = await db.collection("purchasebookentries").deleteMany({
            jobNo: /^FF/
        });
        console.log(`Deleted ${r4.deletedCount} documents from purchasebookentries`);

        console.log("✅ Cleanup complete!");
    } catch (err) {
        console.error("❌ Cleanup failed:", err);
    } finally {
        await mongoose.disconnect();
        console.log("🔌 Disconnected from MongoDB");
    }
}

runCleanup()
    .then(() => {
        process.exit(0);
    })
    .catch((error) => {
        console.error("❌ Script run failed:", error);
        process.exit(1);
    });
