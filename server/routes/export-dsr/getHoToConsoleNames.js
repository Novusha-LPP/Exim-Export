import express from "express";
import ExportJob from "../../model/export/ExJobModel.mjs";

const router = express.Router();

router.get("/api/dsr/ho-to-console-names", async (req, res) => {
    try {
        const names = await ExportJob.aggregate([
            { $unwind: "$operations" },
            { $unwind: "$operations.statusDetails" },
            {
                $match: {
                    "operations.statusDetails.hoToConsoleName": { $exists: true, $ne: "" },
                },
            },
            {
                $group: {
                    _id: "$operations.statusDetails.hoToConsoleName",
                },
            },
            { $sort: { _id: 1 } },
        ]);

        const result = names.map((n) => n._id);
        res.json({ success: true, data: result });
    } catch (error) {
        console.error("Error fetching HO names:", error);
        res.status(500).json({ success: false, message: error.message });
    }
});

export default router;
