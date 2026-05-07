import express from "express";
import ExJobModel from "../../model/export/ExJobModel.mjs";

const router = express.Router();

router.get("/api/export-dsr/historical-freight", async (req, res) => {
  try {
    const { pol, pod } = req.query;

    if (!pol || !pod) {
      return res.status(400).json({ success: false, message: "POL and POD are required" });
    }

    // Calculate date 2 months ago
    const twoMonthsAgo = new Date();
    twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);

    // Extract significant keywords (longer than 3 chars) to match ports
    const getKeywords = (str) => {
      return str.split(/[^A-Z0-9]/i)
        .filter(w => w.length >= 4)
        .map(w => w.toUpperCase());
    };

    const polKeywords = getKeywords(pol);
    const podKeywords = getKeywords(pod);

    // Build regex queries
    const polRegex = polKeywords.length > 0 ? polKeywords.join("|") : pol.toUpperCase();
    const podRegex = podKeywords.length > 0 ? podKeywords.join("|") : pod.toUpperCase();

    const jobs = await ExJobModel.find({
      port_of_loading: { $regex: polRegex, $options: "i" },
      destination_port: { $regex: podRegex, $options: "i" },
      createdAt: { $gte: twoMonthsAgo }
    })
    .sort({ createdAt: -1 })
    .limit(10);

    if (!jobs || jobs.length === 0) {
      return res.status(200).json({ success: true, data: [] });
    }

    // Extract unique freight values
    const results = [];
    jobs.forEach(job => {
      (job.invoices || []).forEach(inv => {
        const f = inv.freightInsuranceCharges?.freight;
        if (f && f.amount > 0) {
          results.push({
            jobNo: job.job_no,
            date: job.job_date || job.createdAt,
            amount: f.amount,
            currency: f.currency,
            exchangeRate: f.exchangeRate
          });
        }
      });
    });

    // Return unique combinations to avoid clutter
    const uniqueResults = results.filter((v, i, a) => 
      a.findIndex(t => t.amount === v.amount && t.currency === v.currency) === i
    ).slice(0, 5);

    res.status(200).json({ success: true, data: uniqueResults });

  } catch (error) {
    console.error("Error fetching historical freight:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

export default router;
