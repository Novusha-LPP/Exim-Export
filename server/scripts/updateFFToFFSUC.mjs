import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env from parent directory
dotenv.config({ path: path.join(__dirname, "..", ".env") });

let EXPORT_MONGODB_URI =
  process.argv.includes("--prod")
    ? process.env.PROD_MONGODB_URI
    : process.argv.includes("--server")
    ? process.env.SERVER_MONGODB_URI
    : process.env.NODE_ENV === "production"
    ? process.env.PROD_MONGODB_URI
    : process.env.NODE_ENV === "server"
    ? process.env.SERVER_MONGODB_URI
    : process.env.DEV_MONGODB_URI;

let IMPORT_MONGODB_URI =
  process.argv.includes("--prod")
    ? process.env.IMPORT_MONGODB_URI_PROD
    : process.argv.includes("--server")
    ? process.env.IMPORT_MONGODB_URI_SERVER
    : process.env.NODE_ENV === "production"
    ? process.env.IMPORT_MONGODB_URI_PROD
    : process.env.NODE_ENV === "server"
    ? process.env.IMPORT_MONGODB_URI_SERVER
    : process.env.IMPORT_MONGODB_URI_DEV;

async function migrateJobNumbers() {
  console.log("==========================================");
  console.log("🚀 Starting Job Number Migration Script (FF -> FF-SUC)");
  console.log("==========================================");
  console.log("Export DB URI:", EXPORT_MONGODB_URI ? EXPORT_MONGODB_URI.substring(0, 45) + "..." : "undefined");
  console.log("Import DB URI:", IMPORT_MONGODB_URI ? IMPORT_MONGODB_URI.substring(0, 45) + "..." : "undefined");

  if (!EXPORT_MONGODB_URI) {
    console.error("❌ EXPORT_MONGODB_URI is undefined. Exiting.");
    process.exit(1);
  }

  // Connect to Export database
  const exportConn = await mongoose.createConnection(EXPORT_MONGODB_URI).asPromise();
  console.log("✅ Connected to Export Database");

  let importConn = null;
  if (IMPORT_MONGODB_URI) {
    try {
      importConn = await mongoose.createConnection(IMPORT_MONGODB_URI).asPromise();
      console.log("✅ Connected to Import/Client Database");
    } catch (err) {
      console.warn("⚠️ Could not connect to Import Database:", err.message);
    }
  }

  try {
    const exportDb = exportConn.db;

    // Helper function to update matching documents in a collection
    const updateCollectionFields = async (db, collectionName, fields) => {
      const coll = db.collection(collectionName);
      let totalUpdated = 0;

      // Find documents where any specified field matches ^FF/
      const filter = {
        $or: fields.map((f) => ({ [f]: { $regex: /^FF\//i } }))
      };

      const cursor = coll.find(filter);
      const docs = await cursor.toArray();

      if (docs.length === 0) {
        console.log(`ℹ️  [${collectionName}] No records found starting with 'FF/'`);
        return 0;
      }

      console.log(`🔄 [${collectionName}] Found ${docs.length} matching document(s):`);

      for (const doc of docs) {
        const updateDoc = {};
        for (const field of fields) {
          const val = doc[field];
          if (typeof val === "string" && /^FF\//i.test(val)) {
            const newVal = val.replace(/^FF\//i, "FF-SUC/");
            updateDoc[field] = newVal;
            console.log(`   └─ ID: ${doc._id} | Field '${field}': "${val}" ──► "${newVal}"`);
          }
        }

        if (Object.keys(updateDoc).length > 0) {
          await coll.updateOne({ _id: doc._id }, { $set: updateDoc });
          totalUpdated++;
        }
      }

      console.log(`✅ [${collectionName}] Updated ${totalUpdated} document(s).`);
      return totalUpdated;
    };

    // 1. Update freightenquiries collection
    console.log("\n--- Updating Export Database Collections ---");
    await updateCollectionFields(exportDb, "freightenquiries", [
      "enquiry_no",
      "success_no",
      "rejected_no",
      "source_job_no"
    ]);

    // 2. Update exportjobs collection
    await updateCollectionFields(exportDb, "exportjobs", [
      "job_no",
      "jobNumber",
      "parent_club_job",
      "tally_club_ref_no"
    ]);

    // 3. Update paymentrequests collection
    await updateCollectionFields(exportDb, "paymentrequests", ["jobNo"]);

    // 4. Update purchasebookentries collection
    await updateCollectionFields(exportDb, "purchasebookentries", ["jobNo"]);

    // 5. Update audit_trails collection
    await updateCollectionFields(exportDb, "audit_trails", ["job_no"]);

    // 6. Update Import / Client Database Collections if connected
    if (importConn) {
      console.log("\n--- Updating Import/Client Database Collections ---");
      const importDb = importConn.db;

      // Update jobs collection in import DB
      await updateCollectionFields(importDb, "jobs", ["job_no", "jobNumber"]);

      // Update CRM leads collection in import DB
      await updateCollectionFields(importDb, "leads", ["freightEnquiryRef"]);

      // Update CRM opportunities collection in import DB
      await updateCollectionFields(importDb, "opportunities", [
        "freightEnquiryRef",
        "freightData.enquiryNo",
        "freightData.successNo",
        "freightData.sourceJobNo"
      ]);
    }

    console.log("\n==========================================");
    console.log("🎉 Migration completed successfully!");
    console.log("==========================================");

  } catch (err) {
    console.error("❌ Migration failed with error:", err);
  } finally {
    await exportConn.close();
    if (importConn) await importConn.close();
    console.log("🔌 Database connections closed.");
  }
}

migrateJobNumbers()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Fatal script error:", err);
    process.exit(1);
  });
