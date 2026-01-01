// routes/currencyRateRoutes.js
import express from "express";
import { scrapeAndSaveCurrencyRates } from "../services/currencyRateScraper.js";
import CurrencyRate from "../model/CurrencyRate.mjs";

const router = express.Router();

// Manual test API to trigger scraping
router.post("/api/currency-rates/scrape", async (req, res) => {
  try {
    console.log("🔧 Manual scrape triggered via API");

    const result = await scrapeAndSaveCurrencyRates();

    res.status(200).json({
      success: true,
      message: "Currency rate scraping completed",
      data: result,
    });
  } catch (error) {
    console.error("❌ Scraping error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to scrape currency rates",
      error: error.message,
    });
  }
});

// Get all currency rates
router.get("/api/currency-rates", async (req, res) => {
  try {
    const { notification_number, effective_date, limit = 50, skip = 0 } = req.query;

    const filter = { is_active: true };

    if (notification_number) {
      filter.notification_number = notification_number;
    }

    if (effective_date) {
      filter.effective_date = effective_date;
    }

    const currencyRates = await CurrencyRate.find(filter)
      .sort({ scraped_at: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip));

    const total = await CurrencyRate.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: currencyRates,
      pagination: {
        total,
        limit: parseInt(limit),
        skip: parseInt(skip),
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch currency rates",
      error: error.message,
    });
  }
});

// Get currency rate for a specific date (finds immediate lower date)
router.get("/api/currency-rates/by-date/:date", async (req, res) => {
  try {
    const { date } = req.params; // Format: dd-mm-yyyy

    // Parse the input date
    const [day, month, year] = date.split("-");
    const inputDate = new Date(`${year}-${month}-${day}`);

    if (isNaN(inputDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid date format. Use dd-mm-yyyy",
      });
    }

    // Find all currency rates with effective_date <= input date
    const allRates = await CurrencyRate.find({ is_active: true });

    // Filter and parse dates
    const validRates = allRates
      .map((rate) => {
        const [d, m, y] = rate.effective_date.split("-");
        const effectiveDate = new Date(`${y}-${m}-${d}`);

        return {
          ...rate.toObject(),
          parsedDate: effectiveDate,
        };
      })
      .filter(
        (rate) =>
          !isNaN(rate.parsedDate.getTime()) && rate.parsedDate <= inputDate
      )
      .sort((a, b) => b.parsedDate - a.parsedDate); // Sort descending (latest first)

    if (validRates.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No currency rates found for the selected date or before",
      });
    }

    // Get the immediate lower (most recent before or on selected date)
    const immediateLower = validRates[0];

    // Remove parsedDate before sending response
    delete immediateLower.parsedDate;

    res.status(200).json({
      success: true,
      data: immediateLower,
      message: `Showing rates for ${immediateLower.effective_date} (immediate lower to ${date})`,
    });
  } catch (error) {
    console.error("Error fetching currency rate by date:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch currency rate",
      error: error.message,
    });
  }
});

export default router;
