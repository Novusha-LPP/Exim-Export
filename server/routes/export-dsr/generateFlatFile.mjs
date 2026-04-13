/**
 * ICEGATE ICES 1.5 – Shipping Bill (CACHE01) Flat File Generator
 * Verified field-by-field against Logisys reference .sb files
 *
 * ─── ALL FIXES (cumulative) ──────────────────────────────────────────────────
 * FIX 1  – PREFIX: 2 extra empty fields after Date for all tables except CONTAINER
 * FIX 2  – SB [6]: "AB" + CHA license as ONE combined field
 * FIX 3  – SB [10-14]: Exporter address split at 35 chars; PIN in own field [14]
 * FIX 4  – INVOICE [11-15]: Buyer name in [11], address chunks in [12-15]
 * FIX 5  – INVOICE: No exporter_ref_no field
 * FIX 6  – CONTAINER: Seal as ONE combined field (not split)
 * FIX 7  – CONTAINER: sealDate from job.containers (not operations)
 * FIX 8  – SW_INFO_TYPE: CHR/SQC qty at slot [13] (2 empties before it)
 * FIX 9  – SW_INFO_TYPE: DTY/GCESS always emitted even when cess = 0
 * FIX 10 – Supportingdocs [6]: invSerialNo = numeric 1-based invoice index
 * FIX 11 – Supportingdocs [10]: docType+docCode as ONE combined field
 * FIX 12 – Supportingdocs [12-15]: issuing party addr1(35)|addr2(35)|city|pin
 * FIX 13 – Supportingdocs [21-22]: beneficiary addr split across two 35-char fields
 * FIX 14 – SB [15]: exporter category from exporter_type (R/F/M/I)
 * FIX 15 – SB [29]: Port of Loading = ICD loc code (not gateway port)
 * FIX 16 – ITEM [18]: pmvPerUnit (not totalPMV)
 * FIX 17 – Supportingdocs [12]: split at last comma <= 35 chars
 * FIX 18 – Supportingdocs [16]: documentReferenceNo (always invoice number for ALL docs)
 * FIX 19 – Supportingdocs [27]: beneficiary name truncated to 70 chars
 * FIX 20 – INVOICE [16,19]: freight/insurance currency blank when amount = 0
 * FIX 21 – INVOICE [30]: addFreight exactly 1 char via .charAt(0)
 * FIX 22 – split35(): .trim() each chunk to prevent >35 due to boundary spaces
 * FIX 23 – Consignee/buyer name: preserve internal spacing (no clean() collapse)
 * FIX 24 – CONTAINER: skip entirely for LCL or DOCK/PORT/CFS stuffing
 * FIX 25 – INVOICE: exact 49-field layout (35 data + 14 trailing empties)
 * FIX 26 – ITEM [10]: trimEnd() to prevent trailing space at 40-char boundary
 * FIX 27 – Supportingdocs [27]: preserve internal spaces in beneficiary name
 * FIX 28 – DBK table: never emit empty <TABLE>DBK (only when rows exist)
 * FIX 29 – STATEMENT: remove trailing empty fields — end row after "RD001" (12 fields)
 * FIX 30 – SW_INFO_TYPE DTY/RDT: qty+unit only when RODTEP claimed
 * FIX 31 – SB [8]: Branch Sr No — use branchSrNo/branch_sno (not branch_sr_no = always 0)
 * FIX 32 – SB [23]: Consignee Addr3 uses cL[3] (was hardcoded "")
 * FIX 33 – SB [42]: Loose packets = "0" for containerised cargo (confirmed Logisys sends "0")
 * FIX 34 – SB [43]: Container count = containers.length (Logisys confirmed both jobs)
 * FIX 35 – INVOICE [14]: Do NOT re-append country name — conAddrFull = conAddrStripped only
 * FIX 36 – LICENCE: add 3 trailing empty fields to match Logisys 19-field layout
 * FIX 37 – Supportingdocs [14]: city in title case ("Gandhinagar" not "GANDHINAGAR")
 * FIX 38 – Supportingdocs [18]: use invoice date (not upload/dateOfIssue) for all docs
 * FIX 39 – Supportingdocs [10]: invSerialNo match by numeric index fallback
 * FIX 40 – marks_nos: use preserveSpaces() not clean() — preserves double spaces
 * FIX 41 – INVOICE [22-23]: commission currency+amount from fic.commission (was ignored)
 * FIX 42 – INVOICE [30]: addFreight derived from termsOfInvoice, NOT priceIncludes field
 *           C&F/CF -> F  |  CIF -> B  |  C&I/CI -> I  |  FOB/others -> N
 *           (priceIncludes in DB is unreliable — e.g. "Both" for a C&F invoice)
 * FIX 43 – LICENCE: also emit EPCG licences (epcgDetails.epcg_reg_obj) after DEEC rows
 *           licSr counter is shared so EPCG rows continue numbering from DEEC rows
 * FIX 44 – getUnitIndicator: "SET"/"SETS"/"UNIT"/"UNITS" -> "N" (EPCG items are counted)
 * FIX 45 – Supportingdocs [13-14]: issuing party addr1/addr2 split at 70 chars each (not comma within 35)
 *           ICES spec: Addr1 = C(70), Addr2 = C(70). Comma-split logic caused addr2 > 70 → ICEGATE rejection
 * FIX 46 – INVOICE [21]: commission RATE (%) emitted when stored in fic.commission.rate (5 decimals)
 *           Logisys sends rate (e.g. "2.00000") + currency + amount; rate blank only when not stored
 * FIX 47 – SW_INFO_TYPE DTY/RDT: only emit for free SBs (sc=00/19) or when RoDTEP is claimed
 *           For DBK (60), RoSCTL, Advance Licence (03), EPCG (50) — skip row entirely (Logisys confirmed)
 *           Previous code emitted RODTEPN "Not Claimed" for all schemes — wrong
 * FIX 48 – DBK quantity: use d.quantity (drawback schedule unit e.g. KGS) NOT p.quantity (invoice unit e.g. PCS)
 *           Logisys: 10464 PCS item → DBK qty = 3997.248 KGS. Falling back to p.quantity gives wrong unit.
 *           If d.quantity not stored, send blank (not zero) to avoid wrong data in Customs record
 * FIX 49 – CONTAINER ISO type code: complete rewrite covering all dropdown types
 *           Bug: "40 High Cube" was producing "42G1" instead of correct "45G0"
 *           Root cause: ISO 6346 size code "45" = 40ft HIGH CUBE (not 45-foot!)
 *           "42" = 40ft standard, "45" = 40ft HC, "22" = 20ft standard, "25" = 20ft HC
 *           "L2" = actual 45-foot standard, "L5" = actual 45-foot HC
 *           tCode: G0=dry, R1=reefer, U1=open top, P1=flat rack, P3=collapsible, P0=platform, T0=tank, H0=hard top
 *           Logisys confirmed: 40ft High Cube → "45G0" (checks combined size+type fields)
 * FIX 50 – STATEMENT code: RS001 for RoSCTL (eximCode 60), RD001 for RoDTEP (eximCode 00/19)
 *           Bug: always emitted RD001 regardless of scheme → ICEGATE rejected GIM 00640 with 1 error
 *           Rule: if rosctlInfo.claim="Yes" OR eximCode="60" → RS001; if rodtepInfo.claim="Yes" → RD001
 *           Only emit STATEMENT row when a benefit is actually claimed (not for every product)
 * FIX 51 – INVOICE [31]: packing charges from inv.packing_charges (was always blank)
 *           Logisys sends 2329.00 for this field when packing charges are present
 * FIX 52 – FIX 46 corrected: commission rate reads ONLY fic.commission.rate (the agent %)
 *           NOT fic.commission.exchangeRate (the INR/USD rate). The exchangeRate field
 *           stores the currency conversion rate (~90), not the commission %. Wrongly reading
 *           it caused "92.55000" to appear in invoice [21] for jobs with no commission.
 * FIX 35 – REVERTED (again): Logisys DOES append country name to consignee address before
 *           split35. Confirmed on AMD AIR 00142 (Australia): "...VICTORIA AUSTRALIA" spans
 *           into [23]="A". FIX 35 was incorrectly stripping the country from all shipments.
 * FIX 53 – HREC seq field [9]: use plain parseInt(sbNo) only — NOT appended with DDMM.
 *           Bug: seq = parseInt(sbNo)+"01"+"04" → "10104" → ICEGATE "Header validation failed"
 *           Fix: seq = String(parseInt(sbNo, 10))  (matches Logisys: sbNo "0001" → seq "1")
 * FIX 54 – SB [2] sbNo: strip ALL leading zeros, not just from 5-digit numbers.
 *           Logisys sends sbNo "1" for job_no ending in "0001"; was sending "0001".
 *           Rule: always parseInt to strip leading zeros → String(parseInt(rawNumStr, 10))
 * FIX 55 – SB [20-24] Consignee: join name + " " + address as ONE string, then hard-split
 *           at 35-char boundaries across all 5 slots using split35().
 *           Bug: name was placed in [20] then address split separately in [21-24].
 *           When DB stores "L.L.C." as part of address (not name), [20] was truncated
 *           and address started with "L.L.C." — diverging from Logisys layout.
 *           Fix: conFull = clean(name + " " + address), then split35(conFull) for cL[0-4].
 *           The same joined+split35 logic applies to INVOICE buyer fields [11-15].
 * FIX 56 – SB [12][13]: Exporter city and state were hardcoded "". Now populated from
 *           job.exporter_city [12] and job.exporter_state/job.state [13].
 *           Confirmed: Logisys sends "RAJASTHAN" in both [12] and [13] for this exporter.
 * FIX 57 – SB [34] Seal type: added fallback matching for single-char values ("S","C","O")
 *           and additional aliases ("SELF","AGENT") so mappedSealType is never blank
 *           when a value is stored in job.stuffing_seal_type.
 * FIX 58 – SB [41] Loose packets: Logisys sends "0" for containerised cargo, not "".
 *           Changed: nc === "C" now emits "0" instead of "".
 * FIX 59 – Address splitting: removed aggressive comma-space stripping.
 *           Logisys preserves spaces after commas (e.g. "TALHETI, VILLAGE").
 *           Updated SB [10,11] (Exporter) and Supportingdocs [12,13,21,22]
 *           to use split35() for consistent 35-char chunking with trimming.
 */

import express from "express";
import ExportJob from "../../model/export/ExJobModel.mjs";

const router = express.Router();

// ─── Lookup Maps ─────────────────────────────────────────────────────────────

const CUSTOM_HOUSE_MAP = {
    "AHMEDABAD AIR CARGO": "INAMD4",
    "ICD SABARMATI": "INSBI6",
    "ICD KHODIYAR": "INSBI6",
    "ICD SACHANA": "INJKA6",
    "ICD VIROCHAN NAGAR": "INVCN6",
    "ICD VIROCHANNAGAR": "INVCN6",
    "THAR DRY PORT": "INSAU6",
    "ICD SANAND": "INSND6",
    "ANKLESHWAR ICD": "INAKV6",
    "ICD VARNAMA": "INVRM6",
    "MUNDRA SEA": "INMUN1",
    "KANDLA SEA": "INIXY1",
    "COCHIN AIR CARGO": "INCOK4",
    "COCHIN SEA": "INCOK1",
    "HAZIRA": "INHZA1",
};

const STATE_CODE_MAP = {
    "JAMMU AND KASHMIR": "01", "HIMACHAL PRADESH": "02", "PUNJAB": "03",
    "CHANDIGARH": "04", "UTTARAKHAND": "05", "HARYANA": "06", "DELHI": "07",
    "RAJASTHAN": "08", "UTTAR PRADESH": "09", "BIHAR": "10", "SIKKIM": "11",
    "ARUNACHAL PRADESH": "12", "NAGALAND": "13", "MANIPUR": "14", "MIZORAM": "15",
    "TRIPURA": "16", "MEGHALAYA": "17", "ASSAM": "18", "WEST BENGAL": "19",
    "JHARKHAND": "20", "ODISHA": "21", "CHHATTISGARH": "22", "MADHYA PRADESH": "23",
    "GUJARAT": "24", "DADRA AND NAGAR HAVELI AND DAMAN AND DIU": "26",
    "MAHARASHTRA": "27", "ANDHRA PRADESH": "28", "KARNATAKA": "29", "GOA": "30",
    "LAKSHADWEEP": "31", "KERALA": "32", "TAMIL NADU": "33", "PUDUCHERRY": "34",
    "ANDAMAN AND NICOBAR ISLANDS": "35", "TELANGANA": "36", "LADAKH": "37",
};

const COUNTRY_CODE_MAP = {
    "INDIA": "IN", "UNITED ARAB EMIRATES": "AE", "UAE": "AE",
    "USA": "US", "UNITED STATES": "US", "UNITED STATES OF AMERICA": "US",
    "UK": "GB", "UNITED KINGDOM": "GB", "GERMANY": "DE", "FRANCE": "FR",
    "CHINA": "CN", "JAPAN": "JP", "AUSTRALIA": "AU", "CANADA": "CA",
    "SINGAPORE": "SG", "MALAYSIA": "MY", "SOUTH AFRICA": "ZA",
    "SAUDI ARABIA": "SA", "QATAR": "QA", "KUWAIT": "KW", "OMAN": "OM",
    "BAHRAIN": "BH", "JORDAN": "JO", "TURKEY": "TR", "ITALY": "IT",
    "SPAIN": "ES", "NETHERLANDS": "NL", "BELGIUM": "BE", "SWEDEN": "SE",
    "DENMARK": "DK", "NORWAY": "NO", "FINLAND": "FI", "SWITZERLAND": "CH",
    "AUSTRIA": "AT", "POLAND": "PL", "PORTUGAL": "PT", "GREECE": "GR",
    "MEXICO": "MX", "BRAZIL": "BR", "ARGENTINA": "AR", "INDONESIA": "ID",
    "THAILAND": "TH", "VIETNAM": "VN", "SOUTH KOREA": "KR",
    "TAIWAN": "TW", "HONG KONG": "HK", "NEW ZEALAND": "NZ",
    "ISRAEL": "IL", "SRI LANKA": "LK", "LK": "LK", "UKRAINE": "UA",
};

const PORT_CODE_MAP = {
    "DUBAI": "AEDXB", "ABU DHABI": "AEAUH", "SHARJAH": "AESHJ", "JEBEL ALI": "AEJEA",
    "MUMBAI": "INBOM1", "NHAVA SHEVA": "INNSA1", "CHENNAI": "INMAA1", "KOLKATA": "INCCU1",
    "COCHIN": "INCOK1", "KANDLA": "INIXY1", "MUNDRA": "INMUN1", "HAZIRA": "INHZA1",
    "AHMEDABAD": "INAMD4", "INAMD4": "INAMD4", "INAMD4 - AHMEDABAD AIR PORT": "INAMD4",
    "DELHI": "INDEL4", "DELHI AIR": "INDEL4", "MUMBAI AIR": "INBOM4",
    "BANGALORE": "INBLR4", "HYDERABAD": "INHYD4", "CHENNAI AIR": "INMAA4",
    "SINGAPORE": "SGSIN", "PORT KLANG": "MYPKG", "HAMBURG": "DEHAM",
    "ROTTERDAM": "NLRTM", "ANTWERP": "BEANR", "NEW YORK": "USNYC",
    "LOS ANGELES": "USLAX", "HOUSTON": "USHOU", "COLOMBO": "LKCMB",
    "CHARLESTON": "USCHS", "MONROE": "USCHS",
};

// ─── Utility Functions ────────────────────────────────────────────────────────

const FS = "\x1D";
const RS = "\r\n";

const pad = (s, n) => String(s ?? "").padStart(n, "0");
const trunc = (s, n) => String(s ?? "").slice(0, n);
const clean = (s) => String(s ?? "")
    .replace(/[\r\n\t]/g, " ")
    // ALLOW , . / - ( ) : & per ICEGATE spec
    .replace(/[^a-zA-Z0-9\s,.\/:()\-&]/g, " ")
    .toUpperCase()
    // .replace(/\s+/g, " ") // REMOVED: ICEGATE flat files preserve internal spacing for field position accuracy
    .trim();

// FIX 23 / FIX 40: preserve internal spaces (consignee name, beneficiary name, marks_nos)
const preserveSpaces = (s) => String(s ?? "").replace(/[\r\n\t]/g, " ").replace(/^ +| +$/g, "");

// FIX 37: title-case ("GANDHINAGAR" -> "Gandhinagar")
const toTitleCase = (s) => String(s ?? "").replace(/\w\S*/g, t => t.charAt(0).toUpperCase() + t.slice(1).toLowerCase());

const fmtDate = (d) => {
    if (!d) return "";
    let dt;
    if (typeof d === "string") {
        const dateStr = d.split(/[T ]/)[0]; // Strip time portion
        const s = clean(dateStr);
        if (/^\d{8}$/.test(s)) return s;
        const parts = s.split(/[-/]/);
        if (parts.length === 3) {
            let day, month, year;
            if (parts[2].length === 4) {
                day = parseInt(parts[0]); month = parts[1]; year = parseInt(parts[2]);
            } else if (parts[0].length === 4) {
                year = parseInt(parts[0]); month = parts[1]; day = parseInt(parts[2]);
            }
            if (year) {
                const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
                let mIdx = months.indexOf((month || "").toUpperCase());
                if (mIdx === -1) mIdx = parseInt(month) - 1;
                dt = new Date(year, mIdx, day);
            }
        }
    }
    if (!dt) dt = new Date(d);
    if (isNaN(dt)) return "";
    return `${dt.getFullYear()}${pad(dt.getMonth() + 1, 2)}${pad(dt.getDate(), 2)}`;
};

const cntry = (n) => {
    if (Array.isArray(n)) n = n[0];
    if (n && n.country) return clean(n.country).slice(0, 2).toUpperCase();
    if (typeof n === "string") {
        const match = n.match(/\(([^)]+)\)/);
        if (match) return clean(match[1]).toUpperCase();
        return COUNTRY_CODE_MAP[n.toUpperCase()] || clean(n).slice(0, 2).toUpperCase();
    }
    return "";
};

const prt = (n) => {
    if (Array.isArray(n)) n = n[0];
    if (n && n.uneceCode) return clean(n.uneceCode).toUpperCase();
    if (typeof n === "string") {
        const match = n.match(/\(([^)]+)\)/);
        if (match) return clean(match[1]).toUpperCase();
        return PORT_CODE_MAP[n.toUpperCase()] || clean(n).slice(0, 6).toUpperCase();
    }
    return "";
};

const stCd = (n) => STATE_CODE_MAP[(n || "").toUpperCase()] || "24";

const extractSbNo = (j) => {
    // FIX 54: always parseInt to strip ALL leading zeros, not just 5-digit case.
    // Logisys: job_no ending "0001" → sbNo "1"; job_no ending "03492" → sbNo "3492".
    const parts = (j || "").split("/");
    let rawNumStr = "";
    if (parts.length > 1) {
        for (let i = parts.length - 1; i >= 0; i--) {
            if (parts[i].includes("-")) continue;
            const num = (parts[i] || "").replace(/\D/g, "");
            if (num && num.length >= 1 && num.length <= 7) {
                rawNumStr = num;
                break;
            }
        }
    } else {
        rawNumStr = (j || "").replace(/\D/g, "");
    }

    // Strip all leading zeros by parsing as integer
    const parsed = parseInt(rawNumStr, 10);
    return isNaN(parsed) ? "0" : String(parsed);
};

// FIX 22 / FIX 60: strict 35-char chunking for ICEGATE
const split35 = (s) => {
    const out = [];
    const str = clean(s);
    for (let i = 0; i < 5; i++) {
        out.push(str.slice(i * 35, (i + 1) * 35).trim());
    }
    return out;
};

function expTypCode(type) {
    const t = (type || "").toUpperCase();
    if (t.includes("MANUFACTURER")) return "F";
    if (t.includes("MERCHANT")) return "M";
    if (t.includes("REGISTERED")) return "R";
    if (t.includes("INDIVIDUAL")) return "I";
    return "F";
}

const gstnTypCode = (g) => {
    const str = clean(g || "");
    if (str.length === 15) return "GSN";
    if (str.length === 10) return "PAN";
    return "OTH";
};

// FIX 44: unit indicator — metric vs count/set
const getUnitIndicator = (unit) => {
    const u = (unit || "").toUpperCase();
    if (["KGS", "KG", "MTS", "MT"].includes(u)) return "M";
    if (["NOS", "NO", "PCS", "PIECES", "SET", "SETS", "UNT", "UNIT", "UNITS"].includes(u)) return "N";
    return "M";
};

const row = (prefix, ...fields) => prefix + FS + fields.join(FS) + RS;

// ─── Validation Logic ─────────────────────────────────────────────────────────

function validateJobData(job) {
    const errors = [];
    if (!job.custom_house) errors.push("Custom House is missing.");
    if (!job.exporter) errors.push("Exporter Name is missing.");
    if (!job.ieCode) errors.push("IEC Code is missing.");
    if (!job.adCode && !job.ad_code) errors.push("AD Code is missing.");
    if (!job.port_of_discharge) errors.push("Port of Discharge is missing.");
    if (!job.gross_weight_kg) errors.push("Gross Weight is missing.");
    if (!job.net_weight_kg) errors.push("Net Weight is missing.");
    if (!job.total_no_of_pkgs) errors.push("Total Packages count is missing.");
    if (!job.gstin && !job.exporter_gstin) errors.push("GSTIN is missing.");

    if (!job.invoices || job.invoices.length === 0) {
        errors.push("At least one Invoice is required.");
    } else {
        job.invoices.forEach((inv, i) => {
            const pfx = `Invoice [${inv.invoiceNumber || (i + 1)}]: `;
            if (!inv.invoiceNumber) errors.push(pfx + "Invoice Number is missing.");
            if (!inv.invoiceDate) errors.push(pfx + "Invoice Date is missing.");
            if (!inv.products || inv.products.length === 0) {
                errors.push(pfx + "At least one Product is required.");
            } else {
                inv.products.forEach((p, j) => {
                    const pp = `${pfx}Product #${j + 1}: `;
                    if (!p.description) errors.push(pp + "Description is missing.");
                    if (!p.ritc) errors.push(pp + "RITC Code is missing.");
                    if (!p.quantity) errors.push(pp + "Quantity is missing.");
                    if (!p.qtyUnit) errors.push(pp + "Quantity Unit is missing.");
                    if (!p.unitPrice) errors.push(pp + "Unit Price is missing.");
                    if (!p.pmvInfo?.pmvPerUnit) errors.push(pp + "PMV Per Unit is missing.");
                    if (!p.endUse) errors.push(pp + "End Use is missing.");
                    if (!p.originDistrict) errors.push(pp + "Origin District is missing.");
                    if (!p.ptaFtaInfo) errors.push(pp + "PTA/FTA Info is missing.");
                });
            }
        });
    }

    if (job.transportMode === "SEA") {
        const isLCL = (job.consignmentType || "").toUpperCase() === "LCL";
        const isPortStuffing = ["DOCK", "PORT", "CFS"].includes((job.goods_stuffed_at || "").toUpperCase());
        if (!isLCL && !isPortStuffing) {
            if ((job.containers || []).length === 0) {
                errors.push("Transport mode is SEA, but no Container details are provided.");
            }
        }
    }

    return errors;
}

// ─── Core Generator ───────────────────────────────────────────────────────────

export function generateSBFlatFile(job) {
    const loc = CUSTOM_HOUSE_MAP[(job.custom_house || "").toUpperCase()] || "INAMD4";
    const sbNo = extractSbNo(job.job_no);
    const jdt = fmtDate(job.sb_date || new Date());
    const sid = clean(job.icegateId || "RAJANSFPL").toUpperCase();

    const now = new Date();
    const fdt = fmtDate(now);
    const ftm24 = pad(now.getHours(), 2) + pad(now.getMinutes(), 2);

    // FIX 53: seq = plain SB number only — DO NOT append DDMM.
    // Logisys sends "1" for SB "0001"; appending date caused "10104" → ICEGATE header rejection.
    const seq = sbNo;

    // FIX 1: Standard prefix — 2 extra empty fields after date
    const PD = `F${FS}${loc}${FS}${sbNo}${FS}${jdt}${FS}${FS}`;
    // CONTAINER prefix — NO extra empties
    const PD_CONTAINER = `F${FS}${loc}${FS}${sbNo}${FS}${jdt}`;

    const invs = job.invoices || [];
    const con0 = (job.consignees || [])[0] || {};
    const containers = job.containers || [];

    const isNFEI = invs.some(inv =>
        (inv.products || []).some(p => (p.eximCode || "").split(" ")[0] === "99")
    );
    const isPortStuffing = ["DOCK", "PORT", "CFS"].includes((job.goods_stuffed_at || "").toUpperCase());
    const emitContainer = job.transportMode === "SEA" && containers.length > 0 && !isPortStuffing;

    // FIX 55: Consignee — join name + " " + address as ONE string, then split35 across 5 slots.
    // Logisys treats the entire consignee block as a continuous 175-char field (5 × 35).
    // This avoids misalignment when "L.L.C." or other suffix is stored as part of address in DB.
    // Note: country name is intentionally appended (FIX 35 reverted) — Logisys does include it.
    // FIX 55 / Bug 3: Consignee name and address joined as ONE 175-char string (5 × 35).
    // Rule: Logisys strips spaces after commas BEFORE splitting. This ensures tighter chunks.
    // Example: "LLC, PO BOX 3159" -> "LLC,PO BOX 3159"
    // Build conFull WITHOUT calling clean() on the already-cleaned parts
    // CORRECT — separate name and address, never join them (REVERT FIX 55)
    const conName = trunc(clean(con0.consignee_name || ""), 35);
    const conAddrRaw = clean(con0.consignee_address || "");
    const cLA = split35(conAddrRaw);
    const cL = [conName, cLA[0], cLA[1], cLA[2], cLA[3]];

    let podest = prt(job.destination_port || "");
    let podisc = prt(job.port_of_discharge || "");

    if (job.transportMode === "AIR") {
        if (podest.length > 2) podest = podest.slice(2);
        if (podisc.length > 2) podisc = podisc.slice(2);
    }

    const iec = clean(job.ieCode || "");
    const gid = clean(job.gstin || iec);
    const mawb = clean(job.mbl_no || job.masterblno || "");
    const hawb = clean(job.hbl_no || job.houseblno || "");

    const isContainerized =
        job.transportMode === "SEA" &&
        containers.length > 0 &&
        !["DOCK", "PORT", "CFS"].includes((job.goods_stuffed_at || "").toUpperCase());

    const nc = isContainerized ? "C" : "P";

    // FIX 58: Logisys sends "0" for loose packets when containerised/AIR, not "".
    const loosePktsFinal = (job.loose_pkgs && Number(job.loose_pkgs) > 0)
        ? String(job.loose_pkgs)
        : "0";

    // SB [17] — exporter's state where goods originate
    const stOr = stCd(job.exporter_state || job.state || "GUJARAT");

    const addrNorm = clean(job.exporter_address || "");
    const pinMatch = addrNorm.match(/,?\s*(\d{6})\s*$/);
    const pinCode = clean(job.exporter_pincode || (pinMatch ? pinMatch[1] : ""));
    const addrRawTrimmed = pinMatch ? addrNorm.replace(/,?\s*\d{6}\s*$/, "").trim() : addrNorm;
    // Use split35 (now 35 chars with clean())
    const eL = split35(addrRawTrimmed);
    const expAddr1 = eL[0];
    const expAddr2 = eL[1];

    let chaLicNo = clean(
        job.cha_code ||
        ((job.cha || "").toUpperCase().includes("SURAJ") ? "OFS1766LCH005" : job.cha || "")
    );

    // Port-specific CHA License Override
    if (["INSBI6", "INJKA6", "INAMD4", "INSAU6", "INHZA1", "INVRM6"].includes(loc)) {
        chaLicNo = "OFS1766LCH005";
    } else if (loc === "INMUN1") {
        chaLicNo = "OFS1766LCH006";
    }

    const sbModCHA = "AB" + chaLicNo;

    // SB [34] — seal type: 'S' = shipper seal for FCL
    const mappedSealType = (isContainerized || containers.length > 0) ? "S" : "";

    let out = "";

    // ══════════════════════════════════════════════════════════════════════════
    // <TABLE>SB  — 50 fields [0-49]
    // ══════════════════════════════════════════════════════════════════════════
    out += `<TABLE>SB${RS}`;
    out += row(PD,
        sbModCHA,                                                           // [6]  AB+CHA licence
        iec,                                                                // [7]  IEC
        String(job.branchSrNo || job.branch_sno || job.branch_sr_no || 1), // [8]  FIX 31
        trunc(clean(job.exporter || ""), 49),                              // [9]  Exporter name
        expAddr1,                                                           // [10] Exporter addr1
        expAddr2,                                                           // [11] Exporter addr2
        clean(job.exporter_city || ""),        // [12] City — FIX 56
        clean(job.exporter_state || job.state || ""),                      // [13] State — FIX 56
        pinCode,                                                            // [14] PIN
        expTypCode(job.exporter_type),                                      // [15] Exporter type
        "P",                                                                // [16] Exporter class
        stOr,                                                               // [17] State of origin
        clean(isNFEI ? "" : (job.adCode || job.ad_code || "")),             // [18] AD Code
        "",                                                                 // [19] EPZ
        cL[0],                                                              // [20] Consignee name/start — FIX 55
        cL[1],                                                              // [21]
        cL[2],                                                              // [22]
        cL[3],                                                              // [23]
        cL[4],                                                              // [24]
        cntry(con0.consignee_country || ""),                               // [25] Consignee country
        isNFEI ? "01" : "",                                               // [26] NFEI
        "",                                                                 // [27] RBI Waiver No
        "",                                                                 // [28] RBI Waiver Date
        loc,                                                                // [29] Port of Loading — FIX 15
        podisc,                                                             // [30] Port of destination
        cntry(job.destination_country || ""),                              // [31] Dest country
        cntry(job.discharge_country || ""),                                // [32] Discharge country
        podest,                                                             // [33] Port of discharge
        mappedSealType,                                                     // [34] Seal type — FIX 57
        nc,                                                                 // [35] Nature of cargo
        parseFloat(job.gross_weight_kg || 0).toFixed(3),                  // [36] Gross weight
        parseFloat(job.net_weight_kg || 0).toFixed(3),                    // [37] Net weight
        "KGS",                                                              // [38] Weight unit
        clean(String(job.total_no_of_pkgs || job.totalPackages || "")),   // [39] Total packages
        preserveSpaces(job.marks_nos || job.marksAndNumbers || ""),       // [40] Marks & numbers
        loosePktsFinal,                                                     // [41] Loose packets — FIX 58
        String(emitContainer ? containers.length : "0"),                    // [42] Container count — FIX 34
        "",                                                                 // [43]
        mawb,                                                               // [44] MAWB/MBL
        hawb,                                                               // [45] HAWB/HBL
        "",                                                                 // [46] Amend type
        "",                                                                 // [47] Amend no
        gstnTypCode(gid),                                                  // [48] GSTN type
        gid,                                                                // [49] GSTN ID
    );

    // ══════════════════════════════════════════════════════════════════════════
    // <TABLE>INVOICE  — 49 fields [0-48]
    // ══════════════════════════════════════════════════════════════════════════
    out += `<TABLE>INVOICE${RS}`;
    invs.forEach((inv, i) => {
        const fic = inv.freightInsuranceCharges || {};
        const curr = clean(inv.currency || "USD");

        // Freight
        const fAmtRaw = parseFloat((fic.freight || {}).amount || 0);
        const fAmt = fAmtRaw > 0 ? fAmtRaw.toFixed(2) : "";
        const fCurr = fAmtRaw > 0 ? curr : "";

        // Insurance
        const iAmtRaw = parseFloat((fic.insurance || {}).amount || 0);
        const iAmt = iAmtRaw > 0 ? iAmtRaw.toFixed(2) : "";
        const iCurr = iAmtRaw > 0 ? curr : "";

        // Commission — FIX 41 / FIX 52: rate ONLY from fic.commission.rate (not exchangeRate)
        const commAmtRaw = parseFloat((fic.commission || {}).amount || 0);
        const commRateRaw = parseFloat((fic.commission || {}).rate || 0);
        const commAmt = commAmtRaw > 0 ? commAmtRaw.toFixed(2) : "";
        const commCurr = commAmtRaw > 0 ? curr : "";
        const commRate = commRateRaw > 0 ? commRateRaw.toFixed(5) : "";

        // Packing charges — FIX 51
        const packingChargesRaw = parseFloat(inv.packing_charges || 0);
        const packingCharges = packingChargesRaw > 0 ? packingChargesRaw.toFixed(2) : "";

        // Discount
        const discAmtRaw = parseFloat((fic.discount || {}).amount || 0);
        const discAmt = discAmtRaw > 0 ? discAmtRaw.toFixed(2) : "";
        const discCurr = discAmtRaw > 0 ? curr : "";

        // Other deductions
        const otherAmtRaw = parseFloat((fic.otherDeduction || {}).amount || 0);
        const otherAmt = otherAmtRaw > 0 ? otherAmtRaw.toFixed(2) : "";
        const otherCurr = otherAmtRaw > 0 ? curr : "";

        // Nature of payment
        const nopMap = {
            "DIRECT PAYMENT": "DP", "DELIVERY AGAINST PAYMENT": "DP",
            "DELIVERY AGAINST ACCEPTANCE": "DA", "ADVANCE PAYMENT": "AP",
            "LETTER OF CREDIT": "LC", "NOT APPLICABLE": "NA", "NA": "NA",
        };
        const natureFull = clean((job.otherInfo || {}).natureOfPayment || "NA").toUpperCase();
        const np = nopMap[natureFull] || "NA";
        const pp = String((job.otherInfo || {}).paymentPeriod || "");

        // Contract type
        const contractTypeMap = { "CIF": "CIF", "FOB": "FOB", "C&F": "CF", "CF": "CF", "C&I": "CI", "CI": "CI" };
        const terms = clean(inv.termsOfInvoice || "FOB").toUpperCase();
        const ct = contractTypeMap[terms] || "FOB";

        // FIX 42: addFreight from termsOfInvoice only
        const addFreightMap = { "CIF": "B", "C&F": "F", "CF": "F", "C&I": "I", "CI": "I", "FOB": "N" };
        const af = addFreightMap[terms] || "N";

        // FIX Bug: prioritizing actual overseas buyer from buyerThirdPartyInfo if present.
        let bL;
        const oBuyer = job.buyerThirdPartyInfo?.buyer || {};
        if (oBuyer.name) {
            const bName = trunc(clean(oBuyer.name), 35);
            const bAddr = clean(oBuyer.addressLine1 || oBuyer.address || "");
            const bLA = split35(bAddr);
            bL = [bName, bLA[0], bLA[1], bLA[2], bLA[3]];
        } else if (job.isBuyer && job.buyer_name) {
            const bName = trunc(clean(job.buyer_name), 35);
            const bAddr = clean(job.buyer_address || "");
            const bLA = split35(bAddr);
            bL = [bName, bLA[0], bLA[1], bLA[2], bLA[3]];
        } else {
            bL = cL; // Buyer same as Consignee
        }

        // FIX 55 (INVOICE): buyer fields use bL array (conditionally calculated above)
        out += row(PD,
            String(i + 1),                  // [6]  Invoice Sr No
            clean(inv.invoiceNumber || ""), // [7]  Invoice Number
            fmtDate(inv.invoiceDate),       // [8]  Invoice Date
            curr,                           // [9]  Currency
            ct,                             // [10] Contract Type
            bL[0],                          // [11] Buyer Name/start
            bL[1],                          // [12] Buyer Addr1
            bL[2],                          // [13] Buyer Addr2
            bL[3],                          // [14] Buyer Addr3
            bL[4],                          // [15] Buyer Addr4
            fCurr,                          // [16] Freight Currency
            fAmt,                           // [17] Freight Amount
            "",                             // [18] Insurance Rate
            iCurr,                          // [19] Insurance Currency
            iAmt,                           // [20] Insurance Amount
            commRate,                       // [21] Commission Rate (%)
            commCurr,                       // [22] Commission Currency
            commAmt,                        // [23] Commission Amount
            "",                             // [24] Discount Rate
            discCurr,                       // [25] Discount Currency
            discAmt,                        // [26] Discount Amount
            "",                             // [27] Other Deductions Rate
            otherCurr,                      // [28] Other Deductions Currency
            otherAmt,                       // [29] Other Deductions Amount
            af,                             // [30] Add Freight — FIX 42
            packingCharges,                 // [31] Packing Charges — FIX 51
            clean(job.otherInfo?.exportContractNo || ""), // [32] Exporter Contract No — FIX Bug 5
            np,                             // [33] Nature of Payment
            pp,                             // [34] Payment Period
            "", "",                         // [35-36]
            clean(job.buyerThirdPartyInfo?.thirdParty?.ieCode || ""), // [37] Third Party IE Code
            trunc(clean(job.buyerThirdPartyInfo?.thirdParty?.name || ""), 70),   // [38] Third Party Name
            trunc(clean(job.buyerThirdPartyInfo?.thirdParty?.address || ""), 70), // [39] Third Party Address
            "", "", "", "", "", "", "", "", "", // [40-48]
        );
    });

    // ══════════════════════════════════════════════════════════════════════════
    // <TABLE>EXCHANGE
    // ══════════════════════════════════════════════════════════════════════════
    out += `<TABLE>EXCHANGE${RS}`;
    // FIX Bug 6: only emit invoice currencies, no INR
    [...new Set(invs.map(inv => clean(inv.currency || "USD")))].forEach(c => {
        out += row(PD, c, "", "", "", "", "Y", "", "", "");
    });

    // ══════════════════════════════════════════════════════════════════════════
    // <TABLE>ITEM
    // ══════════════════════════════════════════════════════════════════════════
    out += `<TABLE>ITEM${RS}`;
    invs.forEach((inv, ii) => {
        (inv.products || []).forEach((p, pi) => {
            const ig = p.igstCompensationCess || {};
            const igstRaw = (ig.igstPaymentStatus || "").toUpperCase();
            const isLUT = !igstRaw || igstRaw.includes("BOND") || igstRaw.includes("NOT") || igstRaw === "LUT";
            const ist = isLUT ? "LUT" : "P";
            const desc = clean(p.description || "");
            const uom = clean(p.qtyUnit || "KGS");
            const qty = parseFloat(p.quantity || 0).toFixed(3);
            const upr = parseFloat(p.unitPrice || 0).toFixed(5);
            const pmv = parseFloat((p.pmvInfo || {}).pmvPerUnit || 0).toFixed(2);
            const sc = (p.eximCode || "19").split(" ")[0];

            out += row(PD,
                String(ii + 1), String(pi + 1),
                sc,
                clean(p.ritc || ""),
                trunc(desc, 40).trimEnd(),           // [10] FIX 26
                trunc(desc.slice(40), 40),            // [11]
                trunc(desc.slice(80), 40),            // [12]
                uom, qty, upr, uom, "1", pmv,
                "",                                   // [19] Job Work
                "N",                                  // [20] Third Party
                p.rewardItem ? "Y" : "N",            // [21] Reward
                "", "", "",                           // [22-24] Amendment
                "", "", "", "", "", "", "", "",        // [25-32] Manufacturer
                "", "",                               // [33-34] Source State, Transit Country
                "0",                                  // [35] Accessory
                clean((p.endUse || "").split(" ")[0]),// [36] End Use
                hawb,                                 // [37] HAWB
                "",                                   // [38] Total Package
                ist,
                ist === "P" ? parseFloat(ig.taxableValueINR || 0).toFixed(2) : "",
                ist === "P" ? parseFloat(ig.igstAmountINR || 0).toFixed(2) : "",
            );
        });
    });

    // ══════════════════════════════════════════════════════════════════════════
    // <TABLE>EOU  — emitted when job.annexure_c_details === true
    // ══════════════════════════════════════════════════════════════════════════
    if (job.annexure_c_details) {
        const ac = job.annexC1Details || {};
        const dot = (v) => clean(v) || ".";
        const euSeal = clean(ac.virtualSealNumber || job.annex_seal_number || "")
            || clean((containers[0] || {}).sealNo || "");
        out += `<TABLE>EOU${RS}`;
        out += row(PD,
            clean(ac.ieCodeOfEOU || job.ie_code_of_eou || iec),
            String(ac.branchSerialNo ?? 0),
            fmtDate(ac.examinationDate || job.examination_date),
            dot(ac.examiningOfficer || job.examining_officer),
            dot(ac.supervisingOfficer || job.supervising_officer),
            dot(ac.designation || job.annex_designation),
            dot(ac.division || job.annex_division),
            dot(ac.range || job.annex_range),
            dot(job.commissionerate),
            dot(ac.virtualSealType),
            euSeal,
            (ac.sampleForwarded || job.sample_forwarded) ? "Y" : "N",
            job.sample_accompanied ? "Y" : "N",
            "", "", "",
        );
    }

    // ══════════════════════════════════════════════════════════════════════════
    // <TABLE>LICENCE  — FIX 43: DEEC + EPCG rows, shared licSr counter
    // ══════════════════════════════════════════════════════════════════════════
    const hasLicence = invs.some(inv => (inv.products || []).some(p => {
        const sc = (p.eximCode || "").split(" ")[0];
        return sc === "03" || sc === "50"
            || p.deecDetails?.isDeecItem
            || p.epcgDetails?.isEpcgItem
            || (p.deecDetails?.deec_reg_obj || []).some(r => r.regnNo)
            || (p.epcgDetails?.epcg_reg_obj || []).some(r => r.regnNo);
    }));

    if (hasLicence) {
        out += `<TABLE>LICENCE${RS}`;
        invs.forEach((inv, ii) => {
            (inv.products || []).forEach((p, pi) => {
                let licSr = 1;

                const deec = p.deecDetails || {};
                const deecRegs = deec.deec_reg_obj || [];
                const deecItems = deec.deecItems || [];
                if (deecRegs.length && deecItems.length) {
                    deecRegs.forEach(reg => {
                        if (!clean(reg.regnNo)) return;
                        deecItems.forEach(item => {
                            out += row(PD,
                                String(ii + 1), String(pi + 1), String(licSr++),
                                clean(reg.regnNo), fmtDate(reg.licDate),
                                clean(deec.itemSnoPartE || "1"), clean(item.itemSnoPartC || "1"),
                                parseFloat(item.quantity || 0).toFixed(3),
                                parseFloat(deec.exportQtyUnderLicence || 0).toFixed(3),
                                getUnitIndicator(item.unit),
                                "", "", "",
                            );
                        });
                    });
                }

                const epcg = p.epcgDetails || {};
                const epcgRegs = epcg.epcg_reg_obj || [];
                const epcgItems = epcg.epcgItems || [];
                if (epcgRegs.length && epcgItems.length) {
                    epcgRegs.forEach(reg => {
                        if (!clean(reg.regnNo)) return;
                        epcgItems.forEach(item => {
                            out += row(PD,
                                String(ii + 1), String(pi + 1), String(licSr++),
                                clean(reg.regnNo), fmtDate(reg.licDate),
                                clean(epcg.itemSnoPartE || "1"), clean(item.itemSnoPartC || "1"),
                                parseFloat(item.quantity || 0).toFixed(3),
                                parseFloat(epcg.exportQtyUnderLicence || 0).toFixed(3),
                                getUnitIndicator(item.unit),
                                "", "", "",
                            );
                        });
                    });
                }
            });
        });
    }

    // ══════════════════════════════════════════════════════════════════════════
    // <TABLE>DBK  — FIX 28: only when rows exist
    // ══════════════════════════════════════════════════════════════════════════
    const dbkRows = [];
    invs.forEach((inv, ii) => {
        (inv.products || []).forEach((p, pi) => {
            const sc = (p.eximCode || "").split(" ")[0];
            if (sc === "03" || sc === "50") return;
            (p.drawbackDetails || []).forEach(d => {
                if (!d.dbkitem && !d.dbkSrNo) return;
                let dbkId = clean(d.dbkSrNo || d.dbkitem || "");
                if (dbkId && !dbkId.endsWith("B")) dbkId += "B";
                const dbkQty = d.quantity ? parseFloat(d.quantity).toFixed(3) : "";
                dbkRows.push(row(PD,
                    String(ii + 1), String(pi + 1),
                    dbkId, dbkQty,
                    "", "", "",
                ));
            });
        });
    });
    if (dbkRows.length > 0) {
        out += `<TABLE>DBK${RS}`;
        dbkRows.forEach(r => out += r);
    }

    // ══════════════════════════════════════════════════════════════════════════
    // <TABLE>CONTAINER  — FIX 24: skip for LCL/DOCK/PORT/CFS
    // ══════════════════════════════════════════════════════════════════════════
    const sealDateMap = {};
    containers.forEach(c => {
        if (c.containerNo) sealDateMap[c.containerNo.toUpperCase()] = c.sealDate;
    });

    if (emitContainer) {
        out += `<TABLE>CONTAINER${RS}`;
        containers.forEach(c => {
            // FIX Bug 7: send raw size number only (e.g. "40"), not ISO type code ("45G0")
            // FIX Bug 6: Extract size "20" or "40" correctly from name/type
            const rawSizeStr = clean(c.containerSize || c.type || "20");
            const containerSize = rawSizeStr.replace(/[^0-9]/g, "").slice(0, 2) || "20";

            const rawSealNo = clean(c.customSealNo || c.sealNo || c.shippingLineSealNo || "");
            const sealDate = sealDateMap[(clean(c.containerNo || "")).toUpperCase()] || c.sealDate;

            out += row(PD_CONTAINER,
                clean(c.containerNo),
                containerSize,
                rawSealNo,
                fmtDate(sealDate || now),
                "RFID",
                "", "", "",
            );
        });
    }

    // ══════════════════════════════════════════════════════════════════════════
    // <TABLE>SW_INFO_TYPE
    // ══════════════════════════════════════════════════════════════════════════
    out += `<TABLE>SW_INFO_TYPE${RS}`;
    invs.forEach((inv, ii) => {
        (inv.products || []).forEach((p, pi) => {
            const socQty = parseFloat(p.socQuantity || p.quantity || 0).toFixed(6);
            const socUnit = clean(p.socunit || p.qtyUnit || "");
            const pta = clean((p.ptaFtaInfo || "NCPTI").split(" ")[0]);
            const cess = parseFloat(p.compensationCessAmountINR || 0).toFixed(6);
            const pState = stCd(clean(p.originState || job.exporter_state || job.state || "GUJARAT"));
            const pDist = clean(p.originDistrict || "").split(/\s*-\s*/)[0];
            let rowNo = 1;

            out += row(PD, String(ii + 1), String(pi + 1), String(rowNo++), "ORC", "STO", pState, "", "", "");
            out += row(PD, String(ii + 1), String(pi + 1), String(rowNo++), "ORC", "DOO", pDist, "", "", "");
            out += row(PD, String(ii + 1), String(pi + 1), String(rowNo++), "CHR", "SQC", "", "", socQty, socUnit);
            out += row(PD, String(ii + 1), String(pi + 1), String(rowNo++), "ORC", "EPT", pta, "", "", "");
            out += row(PD, String(ii + 1), String(pi + 1), String(rowNo++), "DTY", "GCESS", "", "", cess, "INR");

            // FIX 47: DTY/RDT only for free SBs or when RoDTEP is explicitly claimed
            const sc_sw = (p.eximCode || "").split(" ")[0];
            const isFreeShipping = sc_sw === "00" || sc_sw === "" || sc_sw === "19" || sc_sw === "99";
            if ((isFreeShipping || (p.rodtepInfo || {}).claim === "Yes") && (p.rodtepInfo || {}).claim !== "Not Applicable") {
                const rodtepClaim = (p.rodtepInfo || {}).claim === "Yes" ? "RODTEPY" : "RODTEPN";
                const isClaimed = rodtepClaim === "RODTEPY";
                out += row(PD, String(ii + 1), String(pi + 1), String(rowNo++), "DTY", "RDT",
                    rodtepClaim, isClaimed ? "Claimed" : "Not Claimed",
                    isClaimed ? socQty : "", isClaimed ? socUnit : "");
            }

            if (p.eximCode && p.eximCode.startsWith("00") && p.reExport?.isReExport) {
                out += row(PD, String(ii + 1), String(pi + 1), String(rowNo++),
                    "DIR", "XSB", loc.replace(/^IN/, "") + "U001", "", "", "");
            }
        });
    });

    // ══════════════════════════════════════════════════════════════════════════
    // <TABLE>STATEMENT  — FIX 50: RS001 for RoSCTL, RD001 for RoDTEP
    // ══════════════════════════════════════════════════════════════════════════
    let statementAdded = false;
    invs.forEach((inv, ii) => {
        (inv.products || []).forEach((p, pi) => {
            const sc_stmt = (p.eximCode || "").split(" ")[0];
            const isRoSCTL = (p.rosctlInfo || {}).claim === "Yes" || sc_stmt === "60";
            const isRoDTEP = (p.rodtepInfo || {}).claim === "Yes" && !isRoSCTL;

            if (isRoSCTL || isRoDTEP) {
                if (!statementAdded) { out += `<TABLE>STATEMENT${RS}`; statementAdded = true; }
                const stmtCode = isRoSCTL ? "RS001" : "RD001";
                out += row(PD, String(ii + 1), String(pi + 1), "1", "DEC", stmtCode, "");
            }
        });
    });

    // ══════════════════════════════════════════════════════════════════════════
    // <TABLE>Supportingdocs
    // ══════════════════════════════════════════════════════════════════════════
    const docs = job.eSanchitDocuments || [];
    if (docs.length > 0) {
        out += `<TABLE>Supportingdocs${RS}`;
        docs.forEach((d, di) => {
            const docTypeCode = clean(d.documentType || "331000");

            let invIdx = invs.findIndex(inv => inv.invoiceNumber === d.invSerialNo);
            if (invIdx === -1) {
                const parsed = parseInt(d.invSerialNo, 10);
                invIdx = !isNaN(parsed) && parsed >= 1 && parsed <= invs.length ? parsed - 1 : 0;
            }
            const invSrNo = String(invIdx + 1);

            // FIX 12/17: Issuing party addr — split into addr1/addr2 (35 chars each)
            const ip = d.issuingParty || {};
            const ipFullAddr = clean(ip.addressLine1 || "");
            const ipL = split35(ipFullAddr);
            const ipAddr1 = ipL[0];
            const ipAddr2 = ipL[1];

            const ipCity = clean(ip.city || job.exporter_city || "GANDHINAGAR").toUpperCase();
            const ipPin = clean(ip.pinCode || job.exporter_pincode || "");

            // FIX Bug 10/2: Beneficiary addr — strip L.L.C. prefix; preserve :
            const bp = d.beneficiaryParty || {};
            const bpRaw = clean(bp.addressLine1 || "");
            const bpMatch = bpRaw.match(/^(L\s*L\s*C|LLC|LTD|PVT)\s*/i);
            const bpAddr = bpMatch ? bpRaw.slice(bpMatch[0].length) : bpRaw;
            const bL = split35(bpAddr);
            const bpAddr21 = bL[0];
            const bpAddr22 = bL[1];

            // [18] — use upload date (dateTimeOfUpload) not invoice date
            const uploadDate = fmtDate(d.dateTimeOfUpload || d.dateOfIssue || "");
            // [16] — Document Reference Number (MAX 17)
            // Logisys sends a 16-17 char identifier here. IRN is typically too long.
            const docRefRaw = d.imageRefNo || d.documentReferenceNo || d.irn || invs[invIdx]?.invoiceNumber || "";
            const docRefFinal = trunc(clean(docRefRaw), 16);

            out += row(PD,
                invSrNo, "0", String(di + 1),
                clean(d.irn || d.imageRefNo || ""),
                docTypeCode, "",
                ipAddr1, ipAddr2, ipCity, ipPin,
                docRefFinal,
                clean(d.placeOfIssue || job.originState || ""),
                uploadDate,
                "", "",
                bpAddr21, bpAddr22,
                "", "",
                "PDF",
                // FIX Bug 11: Beneficiary name — append L.L.C. back (keep trailing dot)
                trunc(clean(ip.name || job.exporter || ""), 69),
                (() => {
                    const bpNameRaw = preserveSpaces(bp.name || "").toUpperCase();
                    return bpMatch
                        ? trunc(bpNameRaw + " " + bpMatch[1].toUpperCase(), 69)
                        : trunc(bpNameRaw, 69);
                })(),
                sid,
            );
        });
    }

    // ══════════════════════════════════════════════════════════════════════════
    // <TABLE>REEXPORT  (optional)
    // ══════════════════════════════════════════════════════════════════════════
    const hasReExport = invs.some(inv => (inv.products || []).some(p => p.reExport?.isReExport));
    if (hasReExport) {
        out += `<TABLE>REEXPORT${RS}`;
        invs.forEach((inv, ii) => {
            (inv.products || []).forEach((p, pi) => {
                const re = p.reExport || {};
                if (!re.isReExport) return;
                out += row(PD,
                    String(ii + 1), String(pi + 1), "1",
                    prt(re.importPortCode || loc),
                    clean(re.beNumber || ""),
                    fmtDate(re.beDate),
                    String(re.invoiceSerialNo || 1),
                    String(re.itemSerialNo || 1),
                    re.manualBE ? "Y" : "N",
                    parseFloat(re.quantityExported || p.quantity || 0).toFixed(6),
                    trunc(clean(re.beItemDescription || p.description || ""), 39),
                    parseFloat(re.quantityImported || 0).toFixed(6),
                    clean(re.qtyImportedUnit || p.qtyUnit || "KGS"),
                    parseFloat(re.assessableValue || 0).toFixed(6),
                    parseFloat(re.totalDutyPaid || 0).toFixed(6),
                    fmtDate(re.dutyPaidDate),
                    clean(re.otherIdentifyingParameters || "."),
                    parseFloat(re.drawbackAmtClaimed || 0).toFixed(6),
                    re.itemUnUsed === true ? "N" : "Y",
                    re.againstExportObligation ? "Y" : "N",
                    re.commissionerPermission ? "Y" : "N",
                    re.modvatAvailed ? "Y" : "N",
                    re.modvatReversed ? "Y" : "N",
                    "N",
                );
            });
        });
    }

    out += `<END-SB>${RS}`;

    // FIX 53: seq in HREC and TREC = plain sbNo (no date suffix)
    const hrec = `HREC${FS}ZZ${FS}${sid}${FS}ZZ${FS}${loc}${FS}ICES1_5${FS}P${FS}${FS}CACHE01${FS}${seq}${FS}${fdt}${FS}${ftm24}${RS}`;
    const trec = `TREC${FS}${seq}${RS}`;

    return { content: hrec + out + trec, fileName: `${sbNo}${fdt.slice(0, 4)}.sb` };
}

// ─── Express Route ────────────────────────────────────────────────────────────

router.get("/api/generate-sb-file/:jobId", async (req, res) => {
    try {
        const job = await ExportJob.findById(req.params.jobId).lean();
        if (!job) return res.status(404).json({ success: false, message: "Job not found" });

        const validationErrors = validateJobData(job);
        if (validationErrors.length > 0) {
            return res.status(400).json({
                success: false,
                message: "Mandatory fields missing. Please fill them before generating the flat file.",
                errors: validationErrors,
            });
        }

        const { content, fileName } = generateSBFlatFile(job);
        res.setHeader("Content-Type", "text/plain; charset=utf-8");
        res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
        res.send(content);
    } catch (err) {
        console.error("SB flat file generation error:", err);
        res.status(500).json({ success: false, message: err.message });
    }
});

export default router;
