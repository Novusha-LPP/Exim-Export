import mongoose from "mongoose";

const MONGO_URI = "mongodb://localhost:27017/export";

async function main() {
  await mongoose.connect(MONGO_URI);
  console.log("Connected to MongoDB");

  try {
    const db = mongoose.connection.db;
    const entries = await db.collection("purchasebookentries").find({}).sort({ createdAt: -1 }).limit(5).toArray();
    console.log("Found entries:");
    entries.forEach((entry, idx) => {
      console.log(`\nEntry #${idx + 1}:`);
      console.log("Keys:", Object.keys(entry));
      console.log("entryNo:", entry.entryNo);
      console.log("tds:", entry.tds);
      console.log("taxableValue:", entry.taxableValue);
      console.log("tdsCategory:", entry.tdsCategory);
      console.log("tdsRate:", entry.tdsRate);
      console.log("TDS Category in entry:", entry["TDS Category"]);
    });
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await mongoose.connection.close();
  }
}

main().catch(console.error);
