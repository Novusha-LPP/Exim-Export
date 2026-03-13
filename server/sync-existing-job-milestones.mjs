import mongoose from "mongoose";
import dotenv from "dotenv";
import ExJobModel from "./model/export/ExJobModel.mjs";

dotenv.config();

const MONGO_URI = process.env.MONGO_URI;

mongoose.connect(MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
}).then(async () => {
    console.log("🚀 Connected to MongoDB for Milestone Sync");

    const cursor = ExJobModel.find({}).cursor();
    let totalProcessed = 0;
    let updatedCount = 0;

    for (let job = await cursor.next(); job != null; job = await cursor.next()) {
        totalProcessed++;

        const isAir = (job.job_no && String(job.job_no).toUpperCase().includes('/AIR/'));
        const op = job.operations?.[0]?.statusDetails?.[0] || {};

        // Define trigger fields based on your business logic
        const triggerFields = [
            { name: "SB Filed", date: job.sb_date },
            { name: "L.E.O", date: op.leoDate || job.leo_date },
            {
                name: isAir ? "File Handover to IATA" : "Container HO",
                date: op.handoverForwardingNoteDate || op.handoverConcorTharSanganaRailRoadDate || job.handover_date
            },
            {
                name: isAir ? "Departure" : "Rail Out",
                date: op.railOutReachedDate || job.rail_out_date || job.rail_out
            },
            { name: "Billing Pending", date: op.billingDocsSentDt || job.operations_locked_on },
            { name: "Billing Done", date: job.financials_locked_on }
        ];

        let milestonesList = job.milestones ? [...job.milestones] : [];
        let changed = false;

        const milestonePriority = [
            "SB Filed",
            "L.E.O",
            isAir ? "File Handover to IATA" : "Container HO",
            isAir ? "Departure" : "Rail Out",
            "Billing Pending",
            "Billing Done"
        ];

        triggerFields.forEach(tf => {
            if (tf.date && String(tf.date).trim() !== "" && String(tf.date).trim() !== "dd-mm-yyyy") {
                const dStr = String(tf.date).trim();
                const existingIdx = milestonesList.findIndex(m => m.milestoneName === tf.name);

                if (existingIdx === -1) {
                    milestonesList.push({
                        milestoneName: tf.name,
                        actualDate: dStr,
                        isCompleted: true,
                        isMandatory: ["SB Filed", "L.E.O", "Billing Pending", "Billing Done"].includes(tf.name)
                    });
                    changed = true;
                } else if (!milestonesList[existingIdx].isCompleted || milestonesList[existingIdx].actualDate !== dStr) {
                    milestonesList[existingIdx].isCompleted = true;
                    milestonesList[existingIdx].actualDate = dStr;
                    changed = true;
                }
            }
        });

        // 2. Identify Highest Completed Milestone based on fixed priority
        let highestMilestone = "";
        let highestPriority = -1;

        milestonesList.forEach(m => {
            if (m.isCompleted) {
                const priority = milestonePriority.indexOf(m.milestoneName);
                if (priority > highestPriority) {
                    highestPriority = priority;
                    highestMilestone = m.milestoneName;
                }
            }
        });

        if (changed || job.detailedStatus !== highestMilestone) {
            job.milestones = milestonesList;
            job.detailedStatus = highestMilestone || job.detailedStatus;

            // Mark job as completed if billing is done
            if (highestMilestone === "Billing Done") {
                job.status = "Completed";
            }

            await job.save();
            updatedCount++;
        }

        if (totalProcessed % 100 === 0) {
            console.log(`⏳ Processed ${totalProcessed} jobs...`);
        }
    }

    console.log(`✅ Finished. Total Processed: ${totalProcessed}, Updated: ${updatedCount}`);
    process.exit(0);
}).catch(err => {
    console.error("❌ MongoDB Connection Error:", err);
    process.exit(1);
});
