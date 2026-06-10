import mongoose from "mongoose";
import dotenv from "dotenv";
import ExJobModel from "./model/export/ExJobModel.mjs";

dotenv.config({ path: './.env' });

async function run() {
    await mongoose.connect(process.env.MONGO_URI);
    
    // Pulse totalPendingJobs logic
    const pulseCount = await ExJobModel.countDocuments({
        job_no: { $not: /^FF/i },
        isGeneralJob: { $ne: true },
        $and: [
            {
                $or: [
                    { parent_club_job: { $exists: false } },
                    { parent_club_job: null },
                    { parent_club_job: "" }
                ]
            },
            { status: { $regex: "^pending$", $options: "i" } },
            { detailedStatus: { $ne: "Billing Done" } },
            { isJobCanceled: { $ne: true } },
        ]
    });
    
    // Tab pending logic
    const tabCount = await ExJobModel.countDocuments({
        job_no: { $not: /^FF/i },
        isGeneralJob: { $ne: true },
        $and: [
            {
                $or: [
                    { parent_club_job: { $exists: false } },
                    { parent_club_job: null },
                    { parent_club_job: "" }
                ]
            },
            {
                $or: [
                    { status: { $regex: "^pending$", $options: "i" } },
                    { status: { $exists: false } },
                    { status: null },
                    { status: "" },
                ],
            },
            { detailedStatus: { $ne: "Billing Done" } },
            { isJobCanceled: { $ne: true } },
        ]
    });

    console.log("Pulse Count (with child exclusion):", pulseCount);
    console.log("Tab Count (with child exclusion):", tabCount);

    const pulseWithoutChildExclusion = await ExJobModel.countDocuments({
        job_no: { $not: /^FF/i },
        isGeneralJob: { $ne: true },
        $and: [
            { status: { $regex: "^pending$", $options: "i" } },
            { detailedStatus: { $ne: "Billing Done" } },
            { isJobCanceled: { $ne: true } },
        ]
    });

    console.log("Pulse Count WITHOUT child exclusion:", pulseWithoutChildExclusion);

    process.exit(0);
}

run();
