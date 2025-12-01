// convert-districts-from-csv.js
import fs from "fs";
import path from "path";

const inputFile = path.resolve("districtcode.csv");
const outputFile = path.resolve("districts.json");

const text = fs.readFileSync(inputFile, "utf8");

// split into lines while preserving empty columns
const lines = text
  .split(/\r?\n/)
  .map((l) => l.trim())
  .filter(Boolean);

// find the first line that looks like the header line (contains "S.No")
let startIndex = 0;
for (let i = 0; i < Math.min(lines.length, 5); i++) {
  if (lines[i].toLowerCase().includes("s.no")) {
    startIndex = i;
    break;
  }
}

// header line
const headerLine = lines[startIndex];
// data starts after header
const dataLines = lines.slice(startIndex + 1);

const results = [];

for (const line of dataLines) {
  // ignore lines that look like footers/notes (they don't start with a number)
  const firstToken = line.split(",")[0].trim();
  if (!/^\d+$/.test(firstToken)) {
    // Not a data row
    continue;
  }

  // split by comma — your file does not appear to have quoted fields with commas,
  // so simple split works. If you have quoted fields with embedded commas, use a CSV parser.
  const cols = line.split(",").map((c) => c.trim());

  // Based on the header you showed, expected columns (by index):
  // 0: S.No.
  // 1: State Code
  // 2: State Name
  // 3: District Code
  // 4: District Name
  // If file sometimes has missing trailing empty columns, handle that gracefully.

  const sno = cols[0] ?? "";
  const stateCode = cols[1] ?? "";
  const stateName = cols[2] ?? "";
  const districtCode = cols[3] ?? "";
  const districtName = cols[4] ?? "";

  // basic validation: need at least stateCode + districtCode + districtName
  if (!stateCode || !districtCode || !districtName) {
    // skip malformed lines
    continue;
  }

  results.push({
    sno: sno,
    stateCode: String(stateCode),
    stateName: String(stateName),
    districtCode: String(districtCode),
    districtName: String(districtName),
    status: "Active",
  });
}

fs.writeFileSync(outputFile, JSON.stringify(results, null, 2), "utf8");
console.log(`Wrote ${results.length} district records to ${outputFile}`);
