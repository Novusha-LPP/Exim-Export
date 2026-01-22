import express from "express";
import ExportJob from "../../model/export/ExJobModel.mjs";

const router = express.Router();

// Route to fetch unique manufacturers from previous jobs
router.get("/api/dsr/manufacturers", async (req, res) => {
    try {
        const manufacturers = await ExportJob.aggregate([
            // 1. Sort by newest jobs first
            { $sort: { createdAt: -1 } },

            // 2. Break down into invoices and then products
            { $unwind: "$invoices" },
            { $unwind: "$invoices.products" },

            // 3. Filter for products that actually have a manufacturer name
            {
                $match: {
                    "invoices.products.otherDetails.manufacturer.name": { $exists: true, $ne: "" }
                }
            },

            // 4. Group by name - because we sorted by createdAt, 
            //    $first will pick the most recent data for that name
            {
                $group: {
                    _id: { $toUpper: "$invoices.products.otherDetails.manufacturer.name" },
                    name: { $first: "$invoices.products.otherDetails.manufacturer.name" },
                    code: { $first: "$invoices.products.otherDetails.manufacturer.code" },
                    address: { $first: "$invoices.products.otherDetails.manufacturer.address" },
                    country: { $first: "$invoices.products.otherDetails.manufacturer.country" },
                    stateProvince: { $first: "$invoices.products.otherDetails.manufacturer.stateProvince" },
                    postalCode: { $first: "$invoices.products.otherDetails.manufacturer.postalCode" },
                    sourceState: { $first: "$invoices.products.otherDetails.manufacturer.sourceState" },
                    transitCountry: { $first: "$invoices.products.otherDetails.manufacturer.transitCountry" },
                },
            },

            // 5. Clean up output
            { $project: { _id: 0 } },
            { $sort: { name: 1 } },
        ]);

        res.json({ success: true, data: manufacturers });
    } catch (error) {
        console.error("Error fetching manufacturers:", error);
        res.status(500).json({ success: false, message: error.message });
    }
});

export default router;
