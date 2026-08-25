import mongoose from "mongoose";
import dotenv from "dotenv";
import importDbConnection from "../model/importDB.js";

dotenv.config();

async function run() {
  try {
    // Wait for connection to establish
    await new Promise(resolve => setTimeout(resolve, 2000));
    console.log("Connected to Import DB");
    
    // We don't have the exact Opportunity model here, so we'll just query the collection directly
    const db = importDbConnection.db;
    const opps = await db.collection("opportunities").find({
      source: "Export Freight Forwarding System",
      stage: "won"
    }).toArray();
    
    console.log(`Found ${opps.length} CRM opportunities from Freight Forwarding in 'won' stage.`);
    
    const byPeriod = {};
    for (const opp of opps) {
      const p = opp.period || "no-period";
      if (!byPeriod[p]) byPeriod[p] = 0;
      byPeriod[p]++;
    }
    
    console.log("Summary by period:");
    console.log(byPeriod);
    
  } catch (err) {
    console.error("Error:", err);
  } finally {
    process.exit(0);
  }
}

run();
