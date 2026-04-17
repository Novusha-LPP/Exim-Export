import fs from "fs";
import path from "path";
import xlsx from "xlsx";

function normalizeCell(value) {
  if (value === undefined || value === null) return "";
  return String(value).replace(/\s+/g, " ").trim();
}

function looksLikeRodtepEntry(value) {
  return /^\d+$/.test(value);
}

function looksLikeTariffItem(value) {
  return /^\d{7,8}$/.test(value);
}

function extractChapterFromTariffItem(tariffItem) {
  const code = normalizeCell(tariffItem);
  if (code.length < 2) return "";
  return code.slice(0, 2);
}

function parsePercent(value) {
  const text = normalizeCell(value).replace(/%/g, "");
  const num = parseFloat(text);
  return Number.isFinite(num) ? num : 0;
}

function parseNumber(value) {
  const text = normalizeCell(value).replace(/,/g, "");
  const num = parseFloat(text);
  return Number.isFinite(num) ? num : 0;
}

function buildRecord(cells) {
  const normalized = cells.map(normalizeCell).filter(Boolean);
  if (normalized.length < 3) return null;

  const rodtepEntry = normalized.find(looksLikeRodtepEntry) || "";
  const tariffItem = normalized.find(looksLikeTariffItem) || "";

  if (!rodtepEntry || !tariffItem) return null;

  const tariffIndex = normalized.findIndex((value) => value === tariffItem);
  const tail = normalized.slice(tariffIndex + 1);
  if (tail.length < 3) return null;

  const description_of_goods = tail[0] || "";
  const uqc = tail[1] || "";
  const rate_percentage_fob = parsePercent(tail[2] || "");
  const cap_per_uqc = parseNumber(tail[3] || "");

  return {
    chapter: extractChapterFromTariffItem(tariffItem),
    rodtep_entry: parseInt(rodtepEntry, 10),
    tariff_item: tariffItem,
    description_of_goods,
    uqc,
    rate_percentage_fob,
    cap_per_uqc,
  };
}

function convertSheetRows(rows) {
  const records = [];

  for (const row of rows) {
    const cells = Array.isArray(row) ? row.map(normalizeCell) : [];
    const nonEmpty = cells.filter(Boolean);
    if (nonEmpty.length === 0) continue;

    const firstCell = nonEmpty[0];
    if (
      /appendix|rodtep schedule|dated|tariff item|description of goods|rate as|cap/i.test(
        firstCell
      )
    ) {
      continue;
    }

    const record = buildRecord(nonEmpty);
    if (record) {
      records.push(record);
    }
  }

  return records;
}

function main() {
  const inputArg = process.argv[2];
  const outputArg = process.argv[3];

  if (!inputArg) {
    console.error(
      "Usage: node scripts/convertRodtepExcelToJson.mjs <input.xlsx> [output.json]"
    );
    process.exit(1);
  }

  const inputPath = path.resolve(process.cwd(), inputArg);
  const outputPath = path.resolve(
    process.cwd(),
    outputArg || "rodtep-data.json"
  );

  if (!fs.existsSync(inputPath)) {
    console.error(`Input file not found: ${inputPath}`);
    process.exit(1);
  }

  const workbook = xlsx.readFile(inputPath, { cellDates: false });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  const rows = xlsx.utils.sheet_to_json(worksheet, {
    header: 1,
    raw: false,
    defval: "",
  });

  const records = convertSheetRows(rows);
  fs.writeFileSync(outputPath, JSON.stringify(records, null, 2), "utf8");

  console.log(`Converted ${records.length} RoDTEP rows.`);
  console.log(`Sheet: ${firstSheetName}`);
  console.log(`Output: ${outputPath}`);
}

main();
