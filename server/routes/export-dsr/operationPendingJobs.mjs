import express from "express";
import ExJobModel from "../../model/export/ExJobModel.mjs";
import UserModel from "../../model/userModel.mjs";

const router = express.Router();

// Helper to parse DD-MM-YYYY to Date object
const parseDateString = (dateString) => {
    if (!dateString) return null;
    const parts = dateString.split("-");
    if (parts.length === 3) {
        if (parts[0].length === 4) {
            return new Date(dateString); // YYYY-MM-DD
        } else {
            return new Date(`${parts[2]}-${parts[1]}-${parts[0]}`); // DD-MM-YYYY
        }
    }
    return new Date(dateString);
};

// Calculate days difference
const getDaysDifference = (targetDate) => {
    if (!targetDate) return Infinity;
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const tDate = new Date(targetDate);
    tDate.setHours(0, 0, 0, 0);
    if (isNaN(tDate.getTime())) return Infinity;
    const diffTime = now - tDate; // time passed since the gate in date
    // the user said: "IF GATE IN DATE IS 01-01-2026 THEN THE JOB WILL BE PRESENT IN THE API RESPONSE TILL 10-01-2026"
    // this means difference shouldn't exceed 10 days. Also, future gateInDates (negative diff) are valid? Yes, but usually gateIn is past.
    // Actually, Math.abs might be better to be perfectly safe, but simple diff is fine.
    return Math.abs(Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
};

router.get("/api/operation-pending-jobs", async (req, res) => {
    try {
        const requesterUsername = req.headers["username"] || req.headers["x-username"];
        let branchFilter = {};

        if (requesterUsername) {
            const requester = await UserModel.findOne({ username: requesterUsername });
            if (requester && requester.role !== "Admin" && requester.selected_branches?.length > 0) {
                branchFilter = { branch_code: { $in: requester.selected_branches } };
            }
        }

        const { gateInTenDays } = req.query; // If true, apply the 10-day logic

        // Base condition: job must be pending, sb_no should exist
        const matchQuery = {
            ...branchFilter,
            status: { $regex: "^pending$", $options: "i" },
            sb_no: { $exists: true, $nin: [null, ""] },
        };

        // Get jobs that match this base condition
        let jobs = await ExJobModel.find(matchQuery).lean();

        // In-memory filtering for negative conditions
        jobs = jobs.filter((job) => {
            const opsDetails = job.operations?.[0]?.statusDetails?.[0] || {};

            // NEGATIVE CONDITION: handoverForwardingNoteDate exists -> Remove from response
            const handoverDate = opsDetails.handoverForwardingNoteDate || job.handoverForwardingNoteDate;
            if (handoverDate && handoverDate.trim() !== "") {
                return false;
            }

            // If button requested 10 days logic:
            if (gateInTenDays === "true") {
                const gateInDateString = opsDetails.gateInDate || job.gateInDate;

                // gateInDate MUST exist
                if (!gateInDateString || gateInDateString.trim() === "") {
                    return false;
                }

                const parsedDate = parseDateString(gateInDateString);
                const daysDiff = getDaysDifference(parsedDate);

                // but ONLY FOR 10 DAYS
                if (daysDiff > 10) {
                    return false;
                }
            }

            return true;
        });

        // Formatting response
        const formattedJobs = jobs.map((job) => ({
            job_no: job.job_no,
            custom_house: job.custom_house,
            exporter: job.exporter,
            sb_no: job.sb_no,
            sb_date: job.sb_date,
            consignee: job.consignees?.[0]?.consignee_name || "",
            gateInDate: job.operations?.[0]?.statusDetails?.[0]?.gateInDate || job.gateInDate || "",
        }));

        res.json({ success: true, data: formattedJobs });
    } catch (error) {
        console.error("Error fetching operation jobs:", error);
        res.status(500).json({ success: false, message: "Error fetching operation jobs" });
    }
});

export default router;
