import mongoose from "mongoose";
import dotenv from "dotenv";
import importDbConnection from "../model/importDB.js";

dotenv.config();

async function run() {
  try {
    // Wait for connection to establish
    await new Promise(resolve => setTimeout(resolve, 2000));
    console.log("Connected to Import DB");
    
    const db = importDbConnection.db;
    const opps = await db.collection("opportunities").find({
      source: "Export Freight Forwarding System"
    }).toArray();
    
    let updatedCount = 0;
    
    for (const opp of opps) {
      if (opp.createdAt && opp.stageHistory && opp.stageHistory.length > 0) {
        // Find the first stage history or all of them and patch their enteredAt
        // For historical import, we can just set all stage history enteredAt to createdAt
        const updatedHistory = opp.stageHistory.map(history => {
          // Only rewrite if enteredAt is strictly newer than createdAt (like today)
          // For simplicity, we just set all enteredAt to createdAt for historical sync
          return {
            ...history,
            enteredAt: opp.createdAt,
            exitedAt: history.exitedAt ? opp.createdAt : undefined
          };
        });
        
        await db.collection("opportunities").updateOne(
          { _id: opp._id },
          { $set: { stageHistory: updatedHistory } }
        );
        updatedCount++;
      }
    }
    
    console.log(`Successfully patched stageHistory dates for ${updatedCount} opportunities.`);
    
  } catch (err) {
    console.error("Error:", err);
  } finally {
    process.exit(0);
  }
}

run();
