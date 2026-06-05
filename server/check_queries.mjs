import mongoose from "mongoose";
import QueryModel from "./model/export/QueryModel.mjs";

const MONGO_URI = "mongodb://localhost:27017/export";

async function main() {
  console.log("Connecting to MongoDB...");
  await mongoose.connect(MONGO_URI);
  console.log("Connected!");

  try {
    const queries = await QueryModel.find({}).sort({ createdAt: -1 }).limit(20).lean();
    console.log(`Found ${queries.length} queries total.`);

    queries.forEach((q, index) => {
      console.log(`\nQuery #${index + 1}:`);
      console.log(`  ID: ${q._id}`);
      console.log(`  Job No: "${q.job_no}"`);
      console.log(`  Field: ${q.fieldName} (${q.fieldLabel})`);
      console.log(`  Raised By: ${q.raisedBy} (${q.raisedByName})`);
      console.log(`  Raised From Module: "${q.raisedFromModule}"`);
      console.log(`  Target Module: "${q.targetModule}"`);
      console.log(`  Status: "${q.status}"`);
      console.log(`  Subject: "${q.subject}"`);
      console.log(`  Message: "${q.message}"`);
      console.log(`  Replies Count: ${q.replies ? q.replies.length : 0}`);
    });

  } catch (error) {
    console.error("Error running query check:", error);
  } finally {
    await mongoose.connection.close();
    console.log("Database connection closed.");
  }
}

main().catch(console.error);
