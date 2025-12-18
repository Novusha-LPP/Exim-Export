// services/currencyRateScraper.js
import { chromium } from "playwright";
import CurrencyRate from "../model/CurrencyRate.mjs";
import path from "path";
import { existsSync, mkdirSync } from "fs";
import fs from "fs/promises";

// ====== Config ======
const URL = "https://foservices.icegate.gov.in/#/services/notifyPublishScreen";
const TEMP_DIR = "temp_pdfs";
const PAGE_TIMEOUT = 60000;
const CLICK_TIMEOUT = 30000;
const SLEEP_BETWEEN = 800;

// ====== Helpers ======
const ensureDir = (dirPath) => {
  if (!existsSync(dirPath)) {
    mkdirSync(dirPath, { recursive: true });
  }
};

const removeDirIfExists = async (dirPath) => {
  try {
    if (existsSync(dirPath)) {
      await fs.rm(dirPath, { recursive: true, force: true });
    }
  } catch (e) {
    console.warn(`⚠️ Could not remove temp dir ${dirPath}:`, e.message);
  }
};

const sanitizeFilename = (s) => {
  if (!s) return "unknown";
  return s.trim().replace(/[\/\\:\*\?\"<>\|]+/g, "_").replace(/\s+/g, "_");
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const parseDate = (dateStr) => {
  if (!dateStr) return new Date(0);
  // Handle DD-MM-YYYY or DD/MM/YYYY
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

const findHeaderIndices = async (page) => {
  try {
    let headerCells = await page.$$("table thead th");
    if (!headerCells || headerCells.length === 0) {
      headerCells = await page.$$("thead th");
    }

    const headers = await Promise.all(headerCells.map((h) => h.innerText()));
    const headersLower = headers.map((h) => h.trim().toLowerCase());

    let notifIdx = null;
    let dateIdx = null;

    for (let i = 0; i < headersLower.length; i++) {
      const h = headersLower[i];
      if (h.includes("notification") && notifIdx === null) notifIdx = i;
      if (h.includes("publish") && dateIdx === null) dateIdx = i;
      if (h === "date" && dateIdx === null) dateIdx = i;
    }

    return { notifIdx: notifIdx ?? 1, dateIdx: dateIdx ?? 2 };
  } catch (e) {
    console.warn("Could not find headers, falling back...", e.message);
    return { notifIdx: 1, dateIdx: 2 };
  }
};

// ====== PDF Parsing ======
const parseExchangePdf = async (pdfPath) => {
  try {
    const pdfBuffer = await fs.readFile(pdfPath);
    const pdfBase64 = pdfBuffer.toString("base64");

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    let extractedText = "";

    try {
      await page.addScriptTag({
        url: "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js",
      });

      await page.waitForFunction(() => typeof pdfjsLib !== "undefined");

      extractedText = await page.evaluate(async (base64Data) => {
        try {
          pdfjsLib.GlobalWorkerOptions.workerSrc =
            "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

          const loadingTask = pdfjsLib.getDocument({ data: atob(base64Data) });
          const pdf = await loadingTask.promise;

          let fullText = "";

          for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
            const page = await pdf.getPage(pageNum);
            const textContent = await page.getTextContent();

            let lastY = null;
            let lineText = "";

            for (const item of textContent.items) {
              if (lastY !== null && Math.abs(lastY - item.transform[5]) > 5) {
                fullText += lineText.trim() + "\n";
                lineText = "";
              }
              lineText += item.str + " ";
              lastY = item.transform[5];
            }

            if (lineText.trim()) {
              fullText += lineText.trim() + "\n";
            }
          }

          return fullText;
        } catch (error) {
          console.error("PDF.js parsing error:", error);
          return "";
        }
      }, pdfBase64);

      await browser.close();
    } catch (error) {
      await browser.close();
      throw error;
    }

    if (!extractedText) {
      throw new Error("No text extracted from PDF");
    }

    return parsePdfText(extractedText, pdfPath);
  } catch (e) {
    console.error(`❌ Failed to parse PDF ${pdfPath}:`, e.message);
    return {
      error: `Failed to parse PDF: ${e.message}`,
      file: pdfPath,
      exchange_rates: [],
    };
  }
};

const parsePdfText = (text, pdfPath) => {
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line);

  // Extract notification number
  let notifMatch = null;
  for (const line of lines) {
    notifMatch = line.match(
      /Notification\s*(No\.?|Number)?\s*[:\-]?\s*([0-9]+\/?[0-9]*)/i
    );
    if (notifMatch) break;
    notifMatch = line.match(/([0-9]+\/[0-9]{4})\s*\/?Customs?/i);
    if (notifMatch) break;
  }

  const notificationNumber = notifMatch
    ? notifMatch[notifMatch.length - 1].trim()
    : "unknown";

  // Extract effective date
  let effMatch = null;
  const datePatterns = [
    /w\.e\.f\.?\s*[:\s]*(\d{2}-\d{2}-\d{4})/i,
    /effective\s*date[:\s]*(\d{2}-\d{2}-\d{4})/i,
    /Date\s*[:\s]*(\d{2}-\d{2}-\d{4})/i,
    /(\d{2}-\d{2}-\d{4})/,
  ];

  for (const line of lines) {
    for (const pattern of datePatterns) {
      effMatch = line.match(pattern);
      if (effMatch && !line.toLowerCase().includes("notification")) break;
    }
    if (effMatch) break;
  }

  const effectiveDate = effMatch ? effMatch[1] : "unknown";

  // Parse currency rates
  const exchangeRates = parseCurrencyRates(lines);

  return {
    notification_number: notificationNumber,
    effective_date: effectiveDate,
    exchange_rates: exchangeRates,
    meta: {
      parsed_currency_count: exchangeRates.length,
      raw_lines_detected: exchangeRates.length,
      total_lines: lines.length,
    },
    pdf_filename: path.basename(pdfPath),
  };
};

const parseCurrencyRates = (lines) => {
  const parsed = [];
  const seenCurrencies = new Set(); // Track already parsed currencies

  const currencies = [
    { code: "AED", name: "UAE Dirham" },
    { code: "AUD", name: "Australian Dollar" },
    { code: "BHD", name: "Bahraini Dinar" },
    { code: "CAD", name: "Canadian Dollar" },
    { code: "CHF", name: "Swiss Franc" },
    { code: "CNY", name: "Chinese Yuan" },
    { code: "DKK", name: "Danish Kroner" },
    { code: "EUR", name: "EURO" },
    { code: "GBP", name: "Pound Sterling" },
    { code: "HKD", name: "Hong Kong Dollar" },
    { code: "JPY", name: "Japanese Yen", unit: 100 },
    { code: "KRW", name: "Korean won", unit: 100 },
    { code: "KWD", name: "Kuwaiti Dinar" },
    { code: "NOK", name: "Norwegian Kroner" },
    { code: "NZD", name: "New Zealand Dollar" },
    { code: "QAR", name: "Qatari Riyal" },
    { code: "SAR", name: "Saudi Arabian Riyal" },
    { code: "SEK", name: "Swedish Kroner" },
    { code: "SGD", name: "Singapore Dollar" },
    { code: "TRY", name: "Turkish Lira" },
    { code: "USD", name: "US Dollar" },
    { code: "ZAR", name: "South African Rand" },
  ];

  // Find where the table starts
  let tableStartIndex = -1;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].toLowerCase();
    if (
      line.includes("currency code") ||
      line.includes("currency name") ||
      (line.includes("rate") && line.includes("import"))
    ) {
      tableStartIndex = i;
      break;
    }
  }

  if (tableStartIndex === -1) {
    // Fallback: look for first currency
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].match(/^[A-Z]{3}\s/)) {
        tableStartIndex = i;
        break;
      }
    }
  }

  // Parse each line starting from table
  for (let i = Math.max(0, tableStartIndex); i < lines.length; i++) {
    const line = lines[i];

    // Check if this line contains a currency code
    for (const currency of currencies) {
      // Skip if already parsed
      if (seenCurrencies.has(currency.code)) continue;

      // Match pattern: CODE Name Unit ImportRate ExportRate
      // Example: "AED UAE Dirham 1.0 25.4 23.9"
      const pattern = new RegExp(
        `^${currency.code}\\s+${currency.name.replace(/\s+/g, "\\s+")}\\s+([\\d.]+)\\s+([\\d.]+)\\s+([\\d.]+)`,
        "i"
      );

      const match = line.match(pattern);

      if (match) {
        const unit = parseFloat(match[1]);
        const importRate = parseFloat(match[2]);
        const exportRate = parseFloat(match[3]);

        // Validate rates
        if (
          !isNaN(unit) &&
          !isNaN(importRate) &&
          !isNaN(exportRate) &&
          importRate > 0 &&
          exportRate > 0 &&
          importRate < 10000 &&
          exportRate < 10000
        ) {
          parsed.push({
            currency_code: currency.code,
            currency_name: currency.name,
            unit: currency.unit || unit,
            import_rate: importRate,
            export_rate: exportRate,
          });

          seenCurrencies.add(currency.code);
          break;
        }
      }
    }
  }

  // Sort by currency code
  return parsed.sort((a, b) => a.currency_code.localeCompare(b.currency_code));
};

// ====== Main Scraper Function ======
export const scrapeAndSaveCurrencyRates = async () => {
  ensureDir(TEMP_DIR);
  const results = {
    success: true,
    total_scraped: 0,
    total_saved: 0,
    total_skipped: 0,
    errors: [],
  };

  const browser = await chromium.launch({ headless: true, timeout: 60000 });
  const context = await browser.newContext({
    acceptDownloads: true,
    viewport: { width: 1280, height: 720 },
  });
  const page = await context.newPage();

  try {
    await page.goto(URL, { waitUntil: "domcontentloaded", timeout: PAGE_TIMEOUT });
    await page.waitForTimeout(5000);

    try {
      await page.waitForSelector("text=Download PDF", { timeout: 30000 });
    } catch (e) {
      console.warn("⚠️ 'Download PDF' did not appear within timeout");
    }

    const { notifIdx, dateIdx } = await findHeaderIndices(page);
    let rows = await page.$$("table tbody tr");
    if (!rows || rows.length === 0) rows = await page.$$("tbody tr");
    if (!rows || rows.length === 0) rows = await page.$$("tr");

    const candidates = [];
    for (const [row_i, row] of rows.entries()) {
      const cells = await row.$$("td");
      if (cells.length === 0) continue;

      let notifText = "";
      let dateText = "";

      try {
        if (notifIdx < cells.length) {
          notifText = (await cells[notifIdx].innerText()).trim();
        }
        if (dateIdx < cells.length) {
          dateText = (await cells[dateIdx].innerText()).trim();
        }
      } catch (e) { }

      if (!notifText && !dateText) continue;

      candidates.push({
        row,
        notifText,
        dateText,
        rowNum: row_i + 1,
        parsedDate: parseDate(dateText),
      });
    }

    if (candidates.length === 0) {
      console.warn("⚠️ No notifications found in the table.");
      return results;
    }

    // Sort by date descending and pick the latest one
    candidates.sort((a, b) => b.parsedDate - a.parsedDate);
    const latest = candidates[0];
    const rowNum = latest.rowNum;
    const row = latest.row;

    console.log(`🚀 Processing latest notification: ${latest.notifText} (${latest.dateText})`);

    try {
      let downloadEl = await row.$("text=Download PDF");
      if (!downloadEl) {
        downloadEl = await row.$(
          "a:has-text('Download PDF'), button:has-text('Download PDF')"
        );
      }

      if (!downloadEl) {
        throw new Error("Download button not found in row");
      }

      const notifSafe = sanitizeFilename(latest.notifText || `row${rowNum}`);
      const dateSafe = sanitizeFilename(latest.dateText || "unknown-date");
      const pdfName = `${notifSafe}-${dateSafe}.pdf`;
      let outPath = path.join(TEMP_DIR, pdfName);

      let download;
      try {
        const downloadPromise = page.waitForEvent("download", {
          timeout: CLICK_TIMEOUT,
        });
        await downloadEl.scrollIntoViewIfNeeded({ timeout: 2000 });
        await downloadEl.click({ timeout: CLICK_TIMEOUT });
        download = await downloadPromise;
      } catch (e) {
        results.errors.push({ row: rowNum, error: e.message });
        return results;
      }

      await download.saveAs(outPath);
      results.total_scraped++;

      // Parse PDF
      const parsed = await parseExchangePdf(outPath);

      if (parsed.error) {
        results.errors.push({ row: rowNum, error: parsed.error });
      } else {
        // Check if this EXACT record already exists
        const existing = await CurrencyRate.findOne({
          notification_number: parsed.notification_number,
          effective_date: parsed.effective_date,
        });

        if (existing) {
          console.log(`✅ Latest notification ${parsed.notification_number} already in database.`);
          results.total_skipped++;
        } else {
          // It's a NEW notification. Since we only want the LATEST one, 
          // we delete all old records and save this one.
          console.log(`✨ New notification found: ${parsed.notification_number}. Updating database...`);

          await CurrencyRate.deleteMany({}); // Clear collection to keep only ONE latest record

          const currencyRate = new CurrencyRate({
            ...parsed,
            scraped_at: new Date(),
          });

          await currencyRate.save();
          results.total_saved++;
        }
      }

      // Clean up PDF file
      try {
        await fs.unlink(outPath);
      } catch (e) {
        console.log(`  ⚠️ Could not delete PDF: ${e.message}`);
      }
    } catch (e) {
      console.error(`❌ Error processing row ${rowNum}: ${e.message}`);
      results.errors.push({ row: rowNum, error: e.message });
    }
  } catch (e) {
    console.error("❌ Main process error:", e);
    results.success = false;
    results.errors.push({ general: e.message });
  } finally {
    await browser.close();
    await removeDirIfExists(TEMP_DIR);
  }

  return results;
};