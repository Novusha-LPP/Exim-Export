import fs from "fs";
import path from "path";
import xlsx from "xlsx";

function normalizeCell(value) {
  if (value === undefined || value === null) return "";
  return String(value).replace(/\s+/g, " ").trim();
}

function extractChapter(text) {
  const match = text.match(/chapter\s*[-–]?\s*(\d+)/i);
  if (!match) return "";
  return match[1].padStart(2, "0");
}

function looksLikeTariffItem(value) {
  return /^\d{4,}$/.test(value);
}

function normalizeTariffItem(value) {
  const text = normalizeCell(value).toUpperCase();
  if (!text) return "";
  return text.endsWith("B") ? text : `${text}B`;
}

function buildRecord(cells, currentChapter) {
  const normalized = cells.map(normalizeCell).filter(Boolean);
  if (normalized.length === 0) return null;

  const rawTariffItem = normalized.find(looksLikeTariffItem) || "";
  if (!rawTariffItem) return null;
  const tariffItem = normalizeTariffItem(rawTariffItem);

  const tariffIndex = normalized.findIndex((value) => value === rawTariffItem);
  const afterTariff = normalized.slice(tariffIndex + 1);

  let description = "";
  let unit = "";
  let drawbackRate = "";
  let drawbackCap = "";

  if (afterTariff.length >= 1) {
    description = afterTariff[0];
  }
  if (afterTariff.length >= 2) {
    const possibleTail = afterTariff.slice(1);
    if (possibleTail.length === 1) {
      drawbackRate = possibleTail[0];
    } else if (possibleTail.length === 2) {
      unit = possibleTail[0];
      drawbackRate = possibleTail[1];
    } else if (possibleTail.length >= 3) {
      unit = possibleTail[0];
      drawbackRate = possibleTail[1];
      drawbackCap = possibleTail[2];
    }
  }

  return {
    chapter: currentChapter,
    tariff_item: tariffItem,
    description_of_goods: description,
    unit,
    drawback_rate: drawbackRate,
    drawback_cap: drawbackCap,
  };
}

function convertSheetRows(rows) {
  const records = [];
  let currentChapter = "";

  for (const row of rows) {
    const cells = Array.isArray(row) ? row.map(normalizeCell) : [];
    const nonEmpty = cells.filter(Boolean);

    if (nonEmpty.length === 0) continue;

    const chapterCell = nonEmpty.find((cell) => /chapter/i.test(cell));
    if (chapterCell) {
      const chapter = extractChapter(chapterCell);
      if (chapter) {
        currentChapter = chapter;
      }
      continue;
    }

    const record = buildRecord(nonEmpty, currentChapter);
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
      "Usage: node scripts/convertDrawbackExcelToJson.mjs <input.xlsx> [output.json]"
    );
    process.exit(1);
  }

  const inputPath = path.resolve(process.cwd(), inputArg);
  const outputPath = path.resolve(
    process.cwd(),
    outputArg || "drawback-data.json"
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

  console.log(`Converted ${records.length} drawback rows.`);
  console.log(`Sheet: ${firstSheetName}`);
  console.log(`Output: ${outputPath}`);
}

main();
