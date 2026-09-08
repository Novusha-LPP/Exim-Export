// services/currencyRateScraper.js
import axios from "axios";
import https from "https";
import CurrencyRate from "../model/CurrencyRate.mjs";

// ====== Config ======
const ICEGATE_BASE_URL = "https://foservices.icegate.gov.in/cbu/icegateapi";
const NOTIFICATION_LIST_URL = `${ICEGATE_BASE_URL}/getnotdetails`;
const NOTIFICATION_RATES_URL = `${ICEGATE_BASE_URL}/igexratepublishnot`;

// HTTPS Agent with rejectUnauthorized: false to prevent SSL certificate verification issues with Indian gov sites
const httpsAgent = new https.Agent({
  rejectUnauthorized: false,
});

// Common headers matching browser requests to ICEGATE
const ICEGATE_HEADERS = {
  "Content-Type": "application/json",
  "Accept": "application/json, text/plain, */*",
  "channel": "browser",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Origin": "https://foservices.icegate.gov.in",
  "Referer": "https://foservices.icegate.gov.in/",
};

// Parse date string like dd-mm-yyyy or dd/mm/yyyy to Date object
const parseDate = (dateStr) => {
  if (!dateStr) return new Date(0);
  const parts = dateStr.split(/[-/]/);
  if (parts.length === 3) {
    const d = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const y = parseInt(parts[2], 10);
    if (!isNaN(d) && !isNaN(m) && !isNaN(y)) {
      return new Date(y, m, d);
    }
  }
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? new Date(0) : d;
};

/**
 * Fetch the list of published exchange rate notifications from ICEGATE
 */
export const fetchNotificationList = async () => {
  const response = await axios.post(
    NOTIFICATION_LIST_URL,
    {},
    {
      headers: ICEGATE_HEADERS,
      httpsAgent,
      timeout: 15000,
    }
  );
  return Array.isArray(response.data) ? response.data : [];
};

/**
 * Fetch currency rate details for a specific notification number
 */
export const fetchNotificationRates = async (notificationNumber) => {
  const response = await axios.post(
    NOTIFICATION_RATES_URL,
    { notNum: notificationNumber },
    {
      headers: ICEGATE_HEADERS,
      httpsAgent,
      timeout: 15000,
    }
  );
  return response.data;
};

/**
 * Main scraper function:
 * Directly fetches structured currency rate data from ICEGATE REST APIs.
 * Uses parallel fetching for missing notifications so it completes in 1-2 seconds.
 *
 * @param {Object} options
 * @param {number} [options.limit=5] Number of latest notifications to inspect (default: 5)
 */
export const scrapeAndSaveCurrencyRates = async ({ limit = 5 } = {}) => {
  const results = {
    success: true,
    total_scraped: 0,
    total_saved: 0,
    total_skipped: 0,
    errors: [],
  };

  try {
    console.log("🔄 Fetching notification list from ICEGATE API...");
    const notifications = await fetchNotificationList();

    if (!notifications || notifications.length === 0) {
      console.warn("⚠️ No notifications returned by ICEGATE API.");
      return results;
    }

    console.log(`📋 Found ${notifications.length} notifications on ICEGATE.`);

    // Sort notifications descending by publish date (latest first)
    notifications.sort((a, b) => {
      const dateA = parseDate(a.notPublishDate);
      const dateB = parseDate(b.notPublishDate);
      return dateB - dateA;
    });

    // Inspect the top N latest notifications (default: 5)
    const candidatesToProcess = notifications.slice(0, Math.max(1, limit));

    // Check which ones already exist in Mongo
    const missingNotifs = [];
    for (const notif of candidatesToProcess) {
      const notifNum = notif.notificationNumber;
      if (!notifNum) continue;

      const existing = await CurrencyRate.findOne({
        notification_number: notifNum,
      });

      if (existing && existing.exchange_rates && existing.exchange_rates.length > 0) {
        console.log(`⏩ Notification ${notifNum} already in DB, skipping.`);
        results.total_skipped++;
      } else {
        missingNotifs.push({ notif, existing });
      }
    }

    if (missingNotifs.length === 0) {
      console.log("✨ All inspected notifications are already up to date.");
      return results;
    }

    console.log(`📥 Fetching ${missingNotifs.length} missing notification(s) in parallel...`);

    // Fetch missing notifications in parallel for maximum speed
    await Promise.all(
      missingNotifs.map(async ({ notif, existing }) => {
        const notifNum = notif.notificationNumber;
        try {
          const rateResponse = await fetchNotificationRates(notifNum);

          if (
            !rateResponse ||
            !rateResponse.currencyDetail ||
            rateResponse.currencyDetail.length === 0
          ) {
            console.warn(`⚠️ No currency rates in response for notification ${notifNum}`);
            results.errors.push({ notification: notifNum, error: "Empty currencyDetail" });
            return;
          }

          const exchangeRates = rateResponse.currencyDetail
            .map((c) => ({
              currency_code: (c.currencyCode || "").trim().toUpperCase(),
              currency_name: (c.currencyDesc || "").trim(),
              unit: parseFloat(c.units) || 1.0,
              import_rate: parseFloat(c.cbicImport) || 0,
              export_rate: parseFloat(c.cbicExport) || 0,
            }))
            .filter((r) => r.currency_code && (r.import_rate > 0 || r.export_rate > 0))
            .sort((a, b) => a.currency_code.localeCompare(b.currency_code));

          const effectiveDate = (rateResponse.notPublishDate || notif.notPublishDate || "").trim();

          if (existing) {
            existing.effective_date = effectiveDate;
            existing.exchange_rates = exchangeRates;
            existing.meta = {
              parsed_currency_count: exchangeRates.length,
              raw_lines_detected: exchangeRates.length,
              total_lines: exchangeRates.length,
            };
            existing.scraped_at = new Date();
            await existing.save();
            console.log(`🔄 Updated existing record: ${notifNum}`);
            results.total_saved++;
          } else {
            const currencyRate = new CurrencyRate({
              notification_number: notifNum,
              effective_date: effectiveDate,
              exchange_rates: exchangeRates,
              meta: {
                parsed_currency_count: exchangeRates.length,
                raw_lines_detected: exchangeRates.length,
                total_lines: exchangeRates.length,
              },
              scraped_at: new Date(),
              is_active: true,
            });

            await currencyRate.save();
            console.log(
              `✅ Saved new record: ${notifNum} (effective: ${effectiveDate}, currencies: ${exchangeRates.length})`
            );
            results.total_saved++;
          }

          results.total_scraped++;
        } catch (err) {
          console.error(`❌ Error fetching notification ${notifNum}:`, err.message);
          results.errors.push({ notification: notifNum, error: err.message });
        }
      })
    );
  } catch (error) {
    console.error("❌ ICEGATE API error:", error.message);
    results.success = false;
    results.errors.push({ general: error.message });
    throw error;
  }

  return results;
};