import express from "express";
import ExJobModel from "../../model/export/ExJobModel.mjs";

const router = express.Router();

router.get("/api/export-dsr/historical-freight", async (req, res) => {
  try {
    const { pol, pod } = req.query;

    if (!pol || !pod) {
      return res.status(400).json({ success: false, message: "POL and POD are required" });
    }

    // Calculate date 6 months ago for broader historical coverage
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

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
      createdAt: { $gte: sixMonthsAgo }
    })
    .select("job_no job_date createdAt shipping_line_airline forwarder invoices.freightInsuranceCharges invoices.currency invoices.invoiceValue exchange_rate")
    .sort({ createdAt: -1 })
    .limit(20)
    .lean();

    if (!jobs || jobs.length === 0) {
      return res.status(200).json({ success: true, data: [] });
    }

    // Extract freight values with both USD and INR
    const results = [];
    jobs.forEach(job => {
      (job.invoices || []).forEach(inv => {
        const f = inv.freightInsuranceCharges?.freight;
        if (f && f.amount > 0) {
          const currency = f.currency || inv.currency || "INR";
          const exchangeRate = Number(f.exchangeRate || job.exchange_rate || 1);
          const amountOriginal = Number(f.amount);

          // Calculate both USD and INR values
          let amountUSD = amountOriginal;
          let amountINR = amountOriginal;

          if (currency !== "INR" && exchangeRate > 1) {
            // Original amount is in foreign currency (e.g. USD)
            amountUSD = amountOriginal;
            amountINR = Math.round(amountOriginal * exchangeRate);
          } else if (currency === "INR") {
            // Already in INR, try to calculate USD if exchange rate available
            amountINR = amountOriginal;
            amountUSD = exchangeRate > 1 ? Math.round(amountOriginal / exchangeRate) : amountOriginal;
          }

          results.push({
            jobNo: job.job_no,
            date: job.job_date || job.createdAt,
            amountOriginal,
            amountUSD,
            amountINR,
            currency,
            exchangeRate,
            shippingLine: job.shipping_line_airline || "",
            forwarder: job.forwarder || ""
          });
        }
      });
    });

    // Deduplicate by jobNo (keep first invoice per job)
    const seen = new Set();
    const uniqueResults = results.filter(r => {
      if (seen.has(r.jobNo)) return false;
      seen.add(r.jobNo);
      return true;
    }).slice(0, 10);

    res.status(200).json({ success: true, data: uniqueResults });

  } catch (error) {
    console.error("Error fetching historical freight:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

export default router;
