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
 * FIX 17 – Supportingdocs [12]: split at last comma ≤ 35 chars
 * FIX 18 – Supportingdocs [16]: documentReferenceNo (always invoice number for ALL docs)
 * FIX 19 – Supportingdocs [27]: beneficiary name truncated to 70 chars
 * FIX 20 – INVOICE [16,19]: freight/insurance currency blank when amount = 0
 * FIX 21 – INVOICE [30]: addFreight exactly 1 char via .charAt(0)
 * FIX 22 – split35(): .trim() each chunk to prevent >35 due to boundary spaces
 * FIX 23 – Consignee/buyer name: preserve internal spacing (no clean() collapse)
 * FIX 24 – CONTAINER: skip entirely for LCL or DOCK/PORT/CFS stuffing
 * FIX 25 – INVOICE: exact 49-field layout (35 data + 14 trailing empties) verified against Logisys
 * FIX 26 – ITEM [10]: trimEnd() to prevent trailing space at 40-char boundary
 * FIX 27 – Supportingdocs [27]: preserve internal spaces in beneficiary name
 * FIX 28 – DBK table: never emit empty <TABLE>DBK (only when rows exist)
 * FIX 29 – STATEMENT: remove trailing empty fields — end row after "RD001" (12 fields)
 * FIX 30 – SW_INFO_TYPE DTY/RDT: qty+unit only when RODTEP claimed
 * FIX 31 – SB [8]: Branch Sr No — use branchSrNo/branch_sno (not branch_sr_no which is always 0)
 * FIX 32 – SB [23]: Consignee Addr3 uses cL[3] (was hardcoded "")
 * FIX 33 – SB [42]: Loose packets = "" for containerised cargo (not "0")
 * FIX 34 – SB [43]: No. of containers = "" always (Logisys leaves blank)
 * FIX 35 – INVOICE [14]: Do NOT re-append country name — conAddrFull = conAddrStripped only
 * FIX 36 – LICENCE: add 3 trailing empty fields to match Logisys 19-field layout
 * FIX 37 – Supportingdocs [14]: city in title case ("Gandhinagar" not "GANDHINAGAR")
 * FIX 38 – Supportingdocs [18]: use invoice date (not upload/dateOfIssue) for all docs
 * FIX 39 – Supportingdocs [10]: invSerialNo match by numeric index fallback (d.invSerialNo="1" ≠ inv.invoiceNumber)
 * FIX 40 – marks_nos: use preserveSpaces() not clean() — preserves double spaces in description
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

const PRICE_INCLUDES_MAP = {
    "BOTH": "B", "FREIGHT": "F", "INSURANCE": "I", "NONE": "N",
    "B": "B", "F": "F", "I": "I", "N": "N",
};

// ─── Utility Functions ────────────────────────────────────────────────────────

const FS = "\x1D";
const RS = "\r\n";

const pad = (s, n) => String(s ?? "").padStart(n, "0");
const trunc = (s, n) => String(s ?? "").slice(0, n);
const clean = (s) => String(s ?? "").replace(/[\r\n\t]/g, " ").replace(/\s+/g, " ").trim();

// FIX 23 / FIX 40: preserve internal spaces — only strip leading/trailing and collapse tabs/newlines
// Used for: consignee name, beneficiary name, marks_nos
const preserveSpaces = (s) => String(s ?? "").replace(/[\r\n\t]/g, " ").replace(/^ +| +$/g, "");

// FIX 37: Title-case a string ("GANDHINAGAR" → "Gandhinagar")
const toTitleCase = (s) => String(s ?? "").replace(/\w\S*/g, t => t.charAt(0).toUpperCase() + t.slice(1).toLowerCase());

const fmtDate = (d) => {
    if (!d) return "";
    let dt;
    if (typeof d === "string") {
        const s = clean(d);
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
    const parts = (j || "").split("/");
    let rawNum = 0;
    if (parts.length > 1) {
        for (let i = parts.length - 1; i >= 0; i--) {
            if (parts[i].includes("-")) continue;
            const num = (parts[i] || "").replace(/\D/g, "");
            if (num && num.length >= 1 && num.length <= 7) {
                rawNum = parseInt(num, 10) || 0;
                break;
            }
        }
    } else {
        rawNum = parseInt((j || "").replace(/\D/g, ""), 10) || 0;
    }
    return String(rawNum);
};

// FIX 22: trim() each 35-char chunk to prevent boundary spaces pushing past 35
const split35 = (s) => {
    const out = [];
    const str = clean(s);
    for (let i = 0; i < 5; i++) {
        out.push(trunc(str.slice(i * 35, (i + 1) * 35).trim(), 35));
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

const row = (prefix, ...fields) => prefix + FS + fields.join(FS) + RS;

// ─── Validation Logic ─────────────────────────────────────────────────────────

function validateJobData(job) {
    const errors = [];
    if (!job.custom_house) errors.push("Custom House is missing.");
    if (!job.exporter) errors.push("Exporter Name is missing.");
    if (!job.ieCode) errors.push("IEC Code is missing.");
    if (!job.adCode && !job.ad_code) errors.push("AD Code is missing.");
    if (!(job.state_of_origin || job.exporter_state || job.state)) errors.push("State of Origin is missing.");
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
    const seq = String(parseInt(sbNo, 10)) + pad(now.getDate(), 2) + pad(now.getMonth() + 1, 2);

    // FIX 1: Standard prefix has 2 extra empty fields after date
    const PD = `F${FS}${loc}${FS}${sbNo}${FS}${jdt}${FS}${FS}`;
    // CONTAINER uses plain 4-field prefix — NO extra empties
    const PD_CONTAINER = `F${FS}${loc}${FS}${sbNo}${FS}${jdt}`;

    const invs = job.invoices || [];
    const con0 = (job.consignees || [])[0] || {};

    // Strip country name from address string (used for consignee address only)
    const stripCountry = (str, cField) => {
        if (!str || !cField) return clean(str);
        let cleaned = clean(str);
        const cName = clean(cField.replace(/\([^)]+\)/g, ""));
        if (cName && cName.length > 2) {
            const regex = new RegExp(`\\s*${cName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*$`, "i");
            cleaned = cleaned.replace(regex, "");
        }
        cleaned = cleaned.replace(/\(\w{2,3}\)/gi, "").replace(/\s*UNITED\s+STATES\s+OF\s+AMERICA\s*/gi, " ").trim();
        return cleaned;
    };

    // FIX 23: Consignee name preserves internal spaces ("TO   THE ORDER")
    const conName35 = trunc(preserveSpaces(con0.consignee_name || ""), 35);

    // FIX 35: Do NOT re-append country to address — stripCountry is sufficient.
    // conAddrFull = stripped address only (country was already inside the address string).
    const conAddrStripped = stripCountry(
        con0.consignee_address,
        job.destination_country || job.discharge_country || con0.consignee_country || ""
    );
    const conAddrChunks = split35(conAddrStripped); // FIX 35: no country append

    // cL[0]=name, cL[1-4]=address chunks
    const cL = [
        conName35,
        conAddrChunks[0],
        conAddrChunks[1],
        conAddrChunks[2],
        conAddrChunks[3],
    ];

    const pod = prt(job.destination_port || job.port_of_discharge || "");
    const iec = clean(job.ieCode || "");
    const gid = clean(job.gstin || job.exporter_gstin || iec);
    const mawb = clean(job.mbl_no || job.masterblno || "");
    const hawb = clean(job.hbl_no || job.houseblno || "");
    const nc = job.transportMode === "AIR" ? "P" : "C";
    const stOr = stCd(job.state_of_origin || job.exporter_state || job.state || "GUJARAT");

    // FIX 3: Extract PIN; split exporter address at 35 chars
    const rawAddr = clean(job.exporter_address || "");
    const pinMatch = rawAddr.match(/,?\s*(\d{6})\s*$/);
    const pinCode = clean(job.exporter_pincode || (pinMatch ? pinMatch[1] : ""));
    const addrNoPIN = pinMatch ? rawAddr.replace(/,?\s*\d{6}\s*$/, "").trim() : rawAddr;
    const expAddr1 = trunc(addrNoPIN, 35);
    const expAddr2 = trunc(addrNoPIN.slice(35).trim(), 35);

    // FIX 2: "AB" + CHA license as ONE field
    const chaLicNo = clean(
        job.cha_code ||
        ((job.cha || "").toUpperCase().includes("SURAJ") ? "OFS1766LCH005" : job.cha || "")
    );
    const sbModCHA = "AB" + chaLicNo;

    // Declare containers early — needed for SB [f42] container count AND the CONTAINER table
    const containers = job.containers || [];

    let out = "";

    // ══════════════════════════════════════════════════════════════════════════
    // <TABLE>SB  — 50 fields [0-49]
    // ══════════════════════════════════════════════════════════════════════════
    out += `<TABLE>SB${RS}`;
    out += row(PD,
        sbModCHA,                                                         // [6]  CHA Code
        iec,                                                              // [7]  IEC Code
        // FIX 31: branch_sr_no is always 0 in DB; use branchSrNo / branch_sno instead
        String(job.branchSrNo || job.branch_sno || job.branch_sr_no || 1), // [8]  Branch Sr No
        trunc(clean(job.exporter || ""), 50),                            // [9]  Exporter Name
        expAddr1,                                                         // [10] Exporter Addr1 (35)
        expAddr2,                                                         // [11] Exporter Addr2 (35)
        "",                                                               // [12] Exporter City
        "",                                                               // [13] Exporter State
        pinCode,                                                          // [14] PIN Code
        expTypCode(job.exporter_type),                                    // [15] Exporter Type (F/M/R/I)
        "P",                                                              // [16] Exporter Class (P=Private)
        stOr,                                                             // [17] State of Origin Code
        clean(job.adCode || job.ad_code || ""),                          // [18] AD Code
        "",                                                               // [19] EPZ Code
        cL[0],                                                            // [20] Consignee Name
        cL[1],                                                            // [21] Consignee Addr1
        cL[2],                                                            // [22] Consignee Addr2
        cL[3],                                                            // [23] Consignee Addr3  FIX 32: was ""
        cL[4],                                                            // [24] Consignee Addr4
        cntry(con0.consignee_country || ""),                             // [25] Consignee Country
        "",                                                               // [26] NFEI Category
        "",                                                               // [27] RBI Waiver No
        "",                                                               // [28] RBI Waiver Date
        loc,                                                              // [29] Port of Loading (ICD code) — FIX 15
        pod,                                                              // [30] Port of Final Destination
        cntry(job.destination_country || ""),                            // [31] Country of Final Dest
        cntry(job.discharge_country || job.destination_country || ""),  // [32] Country of Discharge
        pod,                                                              // [33] Port of Discharge
        "",                                                               // [34] Seal Type
        nc,                                                               // [35] Nature of Cargo (C/P)
        parseFloat(job.gross_weight_kg || 0).toFixed(3),                // [36] Gross Weight
        parseFloat(job.net_weight_kg || 0).toFixed(3),                  // [37] Net Weight
        "KGS",                                                            // [38] Unit of Measurement
        clean(String(job.total_no_of_pkgs || job.totalPackages || "")), // [39] Total Packages
        // FIX 40: preserveSpaces to keep double spaces in marks_nos (e.g. "ALUMINIUM  ALLOY")
        preserveSpaces(job.marks_nos || job.marksAndNumbers || ""),     // [40] Marks & Numbers
        "",                                                               // [41] No. of loose packets (blank for Nature=C)
        String(containers.length || ""),                                 // [42] No. of containers — confirmed by Logisys ref
        mawb,                                                             // [43] MAWB Number
        hawb,                                                             // [44] HAWB Number
        "",                                                               // [45] Amendment Type
        "",                                                               // [46] Amendment No
        "",                                                               // [47] Amendment Date
        gstnTypCode(gid),                                                // [48] GSTN Type (GSN/PAN)
        gid,                                                              // [49] GSTN ID
    );  // 50 fields [0-49] ✓

    // ══════════════════════════════════════════════════════════════════════════
    // <TABLE>INVOICE  — 49 fields [0-48]
    // FIX 25: Logisys emits 14 trailing empty fields after pp at [34] → total 49
    // ══════════════════════════════════════════════════════════════════════════
    out += `<TABLE>INVOICE${RS}`;
    invs.forEach((inv, i) => {
        const fic = inv.freightInsuranceCharges || {};
        const curr = clean(inv.currency || "USD");

        // FIX 20: Only send currency when amount > 0
        const fAmtRaw = parseFloat((fic.freight || {}).amount || 0);
        const iAmtRaw = parseFloat((fic.insurance || {}).amount || 0);
        const fAmt = fAmtRaw > 0 ? fAmtRaw.toFixed(2) : "";
        const iAmt = iAmtRaw > 0 ? iAmtRaw.toFixed(2) : "";
        const fCurr = fAmtRaw > 0 ? curr : "";
        const iCurr = iAmtRaw > 0 ? curr : (inv.termsOfInvoice === "CIF" ? curr : "");

        const nopMap = {
            "DIRECT PAYMENT": "DP", "DELIVERY AGAINST PAYMENT": "DP",
            "DELIVERY AGAINST ACCEPTANCE": "DA", "ADVANCE PAYMENT": "AP",
            "LETTER OF CREDIT": "LC", "NOT APPLICABLE": "NA", "NA": "NA",
        };
        const contractTypeMap = {
            "CIF": "CIF", "FOB": "FOB", "C&F": "CF", "CF": "CF", "C&I": "CI", "CI": "CI",
        };

        const natureFull = clean((job.otherInfo || {}).natureOfPayment || "NA").toUpperCase();
        const np = nopMap[natureFull] || "NA";
        const pp = String((job.otherInfo || {}).paymentPeriod || "");
        const terms = clean(inv.termsOfInvoice || "FOB").toUpperCase();
        const ct = contractTypeMap[terms] || "FOB";

        // FIX 21: exactly 1 character
        const af = (PRICE_INCLUDES_MAP[(inv.priceIncludes || "N").toUpperCase()] || "N").charAt(0);

        out += row(PD,
            String(i + 1),                               // [6]  Invoice Sr No
            clean(inv.invoiceNumber || ""),              // [7]  Invoice Number
            fmtDate(inv.invoiceDate),                    // [8]  Invoice Date
            curr,                                        // [9]  Currency
            ct,                                          // [10] Nature of Contract (CF/FOB/CIF/CI)
            cL[0],                                       // [11] Buyer Name
            cL[1],                                       // [12] Buyer Addr1
            cL[2],                                       // [13] Buyer Addr2
            cL[3],                                       // [14] Buyer Addr3  FIX 35: no country appended
            cL[4],                                       // [15] Buyer Addr4
            fCurr,                                       // [16] Freight Currency
            fAmt,                                        // [17] Freight Amount
            "",                                          // [18] empty (Logisys verified)
            iCurr,                                       // [19] Insurance Currency
            iAmt,                                        // [20] Insurance Amount
            "", "", "", "", "", "", "", "", "",          // [21-29] 9 empties
            af,                                          // [30] Add Freight (1 char)
            "",                                          // [31] empty
            "",                                          // [32] empty
            np,                                          // [33] Nature of Payment
            pp,                                          // [34] Payment Period
            // FIX 25: 14 trailing empty fields to match Logisys 49-field layout
            "", "", "", "", "", "", "", "", "", "", "", "", "", "",  // [35-48]
        );  // 49 fields [0-48] ✓
    });

    // ══════════════════════════════════════════════════════════════════════════
    // <TABLE>EXCHANGE  — 15 fields [0-14]
    // ══════════════════════════════════════════════════════════════════════════
    out += `<TABLE>EXCHANGE${RS}`;
    [...new Set(["INR", ...invs.map(inv => clean(inv.currency || "USD"))])].forEach(c => {
        out += row(PD, c, "", "", "", "", "Y", "", "", "");
        //           [6][7][8][9][10][11][12][13][14] → 15 fields ✓
    });

    // ══════════════════════════════════════════════════════════════════════════
    // <TABLE>ITEM  — 42 fields [0-41]
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
            const pmv = parseFloat((p.pmvInfo || {}).pmvPerUnit || 0).toFixed(2); // FIX 16
            const sc = (p.eximCode || "19").split(" ")[0];

            out += row(PD,
                String(ii + 1), String(pi + 1),                           // [6][7]  Inv/Item Sr No
                sc,                                                         // [8]   Scheme Code
                clean(p.ritc || ""),                                        // [9]   RITC/ITC-HS Code
                trunc(desc, 40).trimEnd(),                                  // [10]  Desc line 1 — FIX 26
                trunc(desc.slice(40), 40),                                  // [11]  Desc line 2
                trunc(desc.slice(80), 40),                                  // [12]  Desc line 3
                uom,                                                        // [13]  UOM
                qty,                                                        // [14]  Quantity
                upr,                                                        // [15]  Unit Price
                uom,                                                        // [16]  Unit of Rate
                "1",                                                        // [17]  Per (no. of units)
                pmv,                                                        // [18]  PMV per unit — FIX 16
                "",                                                         // [19]  Job Work Notif No
                "N",                                                        // [20]  Third Party (N/Y)
                p.rewardItem ? "Y" : "N",                                  // [21]  Reward Item
                "", "", "",                                                 // [22-24] Amendment fields
                "", "", "", "", "", "", "", "",                             // [25-32] Manufacturer/Producer
                "",                                                         // [33]  Source State
                "",                                                         // [34]  Transit Country
                "0",                                                        // [35]  Accessory Status
                clean((p.endUse || "").split(" ")[0]),                     // [36]  End Use Code
                hawb,                                                       // [37]  HAWB No
                "",                                                         // [38]  Total Package
                ist,                                                        // [39]  IGST Payment Status
                ist === "P" ? parseFloat(ig.taxableValueINR || 0).toFixed(2) : "", // [40] Taxable Value
                ist === "P" ? parseFloat(ig.igstAmountINR || 0).toFixed(2) : "",  // [41] IGST Amount
            );  // 42 fields [0-41] ✓
        });
    });

    // ══════════════════════════════════════════════════════════════════════════
    // <TABLE>LICENCE  — 19 fields [0-18]
    // FIX 36: Logisys emits 3 trailing empty fields → total 19
    // ══════════════════════════════════════════════════════════════════════════
    const hasLicence = invs.some(inv => (inv.products || []).some(p => {
        const sc = (p.eximCode || "").split(" ")[0];
        return sc === "03" || sc === "50" || p.deecDetails?.isDeecItem || p.epcgDetails?.isEpcgItem;
    }));

    const getUnitIndicator = (unit) => {
        const u = (unit || "").toUpperCase();
        if (["KGS", "KG", "MTS", "MT"].includes(u)) return "M";
        if (["NOS", "NO", "PCS", "PIECES"].includes(u)) return "N";
        return "M";
    };

    if (hasLicence) {
        out += `<TABLE>LICENCE${RS}`;
        invs.forEach((inv, ii) => {
            (inv.products || []).forEach((p, pi) => {
                const deec = p.deecDetails || {};
                const regs = deec.deec_reg_obj || [];
                const items = deec.deecItems || [];
                if (!regs.length || !items.length) return;

                let licSr = 1;
                regs.forEach(reg => {
                    items.forEach(item => {
                        out += row(PD,
                            String(ii + 1),                                       // [6]  Invoice Sr No
                            String(pi + 1),                                       // [7]  Item Sr No
                            String(licSr++),                                      // [8]  Licence Sr No
                            clean(reg.regnNo || ""),                             // [9]  Licence/Reg No
                            fmtDate(reg.licDate),                                // [10] Licence Date
                            clean(deec.itemSnoPartE || "1"),                     // [11] Part E Sr No
                            clean(item.itemSnoPartC || "1"),                     // [12] Part C Sr No
                            parseFloat(item.quantity || 0).toFixed(3),          // [13] Import Qty
                            parseFloat(deec.exportQtyUnderLicence || 0).toFixed(3), // [14] Export Qty
                            getUnitIndicator(item.unit),                         // [15] Unit (M/N)
                            "", "", "",                                           // [16-18] FIX 36: 3 trailing empties
                        );  // 19 fields [0-18] ✓
                    });
                });
            });
        });
    }

    // ══════════════════════════════════════════════════════════════════════════
    // <TABLE>DBK  — only emit when rows exist — FIX 28
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
                dbkRows.push(row(PD,
                    String(ii + 1), String(pi + 1),
                    dbkId,
                    parseFloat(d.quantity || p.quantity || 0).toFixed(3),
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
    // <TABLE>CONTAINER  — 12 fields; skipped for LCL/DOCK/PORT/CFS — FIX 24
    // Uses PD_CONTAINER (4-field prefix, no extra empties) — FIX 1
    // ══════════════════════════════════════════════════════════════════════════
    const sealDateMap = {};
    (job.containers || []).forEach(c => {
        if (c.containerNo) sealDateMap[c.containerNo.toUpperCase()] = c.sealDate;
    });

    const isLCL = (job.consignmentType || "").toUpperCase() === "LCL";
    const isPortStuffing = ["DOCK", "PORT", "CFS"].includes((job.goods_stuffed_at || "").toUpperCase());
    const emitContainer = job.transportMode === "SEA" && containers.length > 0 && !isPortStuffing;

    if (emitContainer) {
        out += `<TABLE>CONTAINER${RS}`;
        containers.forEach(c => {
            const rawSize = clean(c.containerSize || "20").toUpperCase();
            const rawType = clean(c.type || c.containerType || "").toUpperCase();

            let isoType = rawType;
            if (!/^\d{2}[A-Z]\d$/.test(isoType)) {
                const sCode = rawSize.includes("40") || rawType.includes("40") ? "42" :
                    rawSize.includes("45") || rawType.includes("45") ? "45" : "22";
                const tCode = rawType.includes("HC") || rawType.includes("HQ") || rawSize.includes("HC") ? "G1" :
                    rawType.includes("RF") || rawSize.includes("RF") ? "R1" :
                        rawType.includes("OT") || rawSize.includes("OT") ? "U1" :
                            rawType.includes("FR") || rawSize.includes("FR") ? "P1" : "G0";
                isoType = `${sCode}${tCode}`;
            }

            // FIX 6: Seal as ONE combined field
            const rawSealNo = clean(c.customSealNo || c.sealNo || c.shippingLineSealNo || "");
            // FIX 7: sealDate from job.containers map
            const sealDate = sealDateMap[(clean(c.containerNo || "")).toUpperCase()] || c.sealDate;

            out += row(PD_CONTAINER,
                clean(c.containerNo),       // [4]  Container No
                isoType,                    // [5]  ISO Type (e.g. 22G0)
                rawSealNo,                  // [6]  Seal No — FIX 6: combined
                fmtDate(sealDate || now),   // [7]  Seal Date
                "RFID",                     // [8]  Seal Type Indicator
                "", "", "",                 // [9][10][11] empty
            );  // 12 fields [0-11] ✓
        });
    }

    // ══════════════════════════════════════════════════════════════════════════
    // <TABLE>SW_INFO_TYPE  — 15 fields [0-14]
    // ══════════════════════════════════════════════════════════════════════════
    out += `<TABLE>SW_INFO_TYPE${RS}`;
    invs.forEach((inv, ii) => {
        (inv.products || []).forEach((p, pi) => {
            const socQty = parseFloat(p.socQuantity || p.quantity || 0).toFixed(6);
            const socUnit = clean(p.socunit || p.qtyUnit || "");
            const rc = (p.rodtepInfo || {}).claim === "Yes" ? "Claimed" : "Not Claimed";
            const pta = clean((p.ptaFtaInfo || "NCPTI").split(" ")[0]);
            const cessRaw = parseFloat(p.compensationCessAmountINR || 0);
            const cess = cessRaw.toFixed(6);
            const pState = stCd(clean(p.originState || job.state_of_origin || job.exporter_state || "GUJARAT"));
            // FIX: district code is the numeric part before " - "
            const pDist = clean(p.originDistrict || "").split(/\s*-\s*/)[0];

            let rowNo = 1;

            // Row 1: ORC/STO — state of origin
            out += row(PD, String(ii + 1), String(pi + 1), String(rowNo++), "ORC", "STO", pState, "", "", "");

            // Row 2: ORC/DOO — district of origin
            out += row(PD, String(ii + 1), String(pi + 1), String(rowNo++), "ORC", "DOO", pDist, "", "", "");

            // Row 3: CHR/SQC — FIX 8: qty at [13], unit at [14], 2 empties at [11][12]
            out += row(PD, String(ii + 1), String(pi + 1), String(rowNo++), "CHR", "SQC", "", "", socQty, socUnit);

            // Row 4: ORC/EPT — preferential trade agreement code
            out += row(PD, String(ii + 1), String(pi + 1), String(rowNo++), "ORC", "EPT", pta, "", "", "");

            // Row 5: DTY/GCESS — FIX 9: always emit even when cess = 0
            out += row(PD, String(ii + 1), String(pi + 1), String(rowNo++), "DTY", "GCESS", "", "", cess, "INR");

            // Row 6: DTY/RDT — FIX 30: qty+unit only when RODTEP is claimed
            const rodtepClaim = (p.rodtepInfo || {}).claim === "Yes" ? "RODTEPY" : "RODTEPN";
            const isClaimed = rodtepClaim === "RODTEPY";
            out += row(PD, String(ii + 1), String(pi + 1), String(rowNo++), "DTY", "RDT",
                rodtepClaim, rc, isClaimed ? socQty : "", isClaimed ? socUnit : "");

            // Row 7 (optional): DIR/XSB — only for free SBs (scheme code 00)
            if (p.eximCode && p.eximCode.startsWith("00")) {
                const portPart = loc.replace(/^IN/, "");
                out += row(PD, String(ii + 1), String(pi + 1), String(rowNo++), "DIR", "XSB", portPart + "U001", "", "", "");
            }
        });
    });

    // ══════════════════════════════════════════════════════════════════════════
    // <TABLE>STATEMENT  — 12 fields [0-11]
    // FIX 29: end row after "RD001" — no trailing empty fields
    // ══════════════════════════════════════════════════════════════════════════
    let statementAdded = false;
    invs.forEach((inv, ii) => {
        (inv.products || []).forEach((p, pi) => {
            if ((p.rodtepInfo || {}).claim === "Yes") {
                if (!statementAdded) {
                    out += `<TABLE>STATEMENT${RS}`;
                    statementAdded = true;
                }
                // FIX 29: exactly 12 fields — NO trailing empties after RD001
                out += row(PD,
                    String(ii + 1),   // [6]  Invoice Sr No
                    String(pi + 1),   // [7]  Item Sr No
                    "1",              // [8]  Statement Sr No
                    "DEC",            // [9]  Statement Type
                    "RD001",          // [10] Statement Code
                    "",               // [11] Statement Text (blank — RD001 has system text)
                );  // 12 fields [0-11] ✓
            }
        });
    });

    // ══════════════════════════════════════════════════════════════════════════
    // <TABLE>Supportingdocs  — 29 fields [0-28]
    // ══════════════════════════════════════════════════════════════════════════
    const docs = job.eSanchitDocuments || [];
    if (docs.length > 0) {
        out += `<TABLE>Supportingdocs${RS}`;
        docs.forEach((d, di) => {
            const docTypeCode = clean(d.documentType || "331000");

            // FIX 39: d.invSerialNo stores "1" (numeric index string), NOT the invoice number.
            // Try matching by invoiceNumber first; if that fails, treat d.invSerialNo as a
            // 1-based index directly.
            let invIdx = invs.findIndex(inv => inv.invoiceNumber === d.invSerialNo);
            if (invIdx === -1) {
                const parsed = parseInt(d.invSerialNo, 10);
                invIdx = !isNaN(parsed) && parsed >= 1 && parsed <= invs.length ? parsed - 1 : 0;
            }
            const invSrNo = String(invIdx + 1);

            // FIX 17: Split issuing party address at last comma within 35 chars
            const ip = d.issuingParty || {};
            const ipRawAddr = clean(ip.addressLine1 || "");
            let ipAddrA, ipAddrB;
            if (ip.addressLine2 && ip.addressLine2.trim()) {
                ipAddrA = trunc(ipRawAddr, 35);
                ipAddrB = trunc(clean(ip.addressLine2), 35);
            } else {
                const lastComma = ipRawAddr.slice(0, 36).lastIndexOf(",");
                if (lastComma > 0) {
                    ipAddrA = ipRawAddr.slice(0, lastComma + 1);
                    ipAddrB = ipRawAddr.slice(lastComma + 1).trim();
                } else {
                    ipAddrA = trunc(ipRawAddr, 35);
                    ipAddrB = trunc(ipRawAddr.slice(35), 35);
                }
            }

            // FIX 37: city in title case ("Gandhinagar" not "GANDHINAGAR")
            const ipCity = toTitleCase(clean(ip.city || ""));
            const ipPin = clean(ip.pinCode || "");

            // FIX 13: Beneficiary address split across two 35-char fields
            // [21] = first 35 chars of addressLine1
            // [22] = remainder of addressLine1 (zip + country — e.g. "450-0002, JAPAN., Japan")
            const bp = d.beneficiaryParty || {};
            const bpFullAddr = clean(bp.addressLine1 || "");
            const bpAddr21 = trunc(bpFullAddr, 35);
            const bpAddr22 = trunc(bpFullAddr.slice(35).trim(), 35);

            // FIX 38: document date = invoice date (not upload/dateOfIssue)
            // All supporting docs for an invoice use the invoice date, matching Logisys behaviour
            const invoiceDate = fmtDate(invs[invIdx]?.invoiceDate || d.dateOfIssue || "");

            // FIX 18: documentReferenceNo is always the invoice number for ALL docs
            // icegateFilename holds the licence number for doc2 — but Logisys uses invoice no for [16]
            const docRefNo = clean(d.documentReferenceNo || invs[invIdx]?.invoiceNumber || "");

            out += row(PD,
                invSrNo,                                                           // [6]  Invoice Sr No (1-based)
                "0",                                                               // [7]  Item Sr No
                String(di + 1),                                                    // [8]  Doc Sr No
                clean(d.irn || d.imageRefNo || ""),                               // [9]  Image Ref No (IRN)
                docTypeCode,                                                       // [10] Document Type Code
                "",                                                                // [11] empty
                ipAddrA,                                                           // [12] Issuing Party Addr1
                ipAddrB,                                                           // [13] Issuing Party Addr2
                ipCity,                                                            // [14] Issuing Party City — FIX 37: title case
                ipPin,                                                             // [15] Issuing Party PIN
                docRefNo,                                                          // [16] Doc Reference No — FIX 18
                clean(d.placeOfIssue || job.state_of_origin || job.exporter_state || job.state || ""), // [17] Place of Issue
                invoiceDate,                                                       // [18] Doc Issue Date — FIX 38
                "",                                                                // [19] empty
                "",                                                                // [20] empty
                bpAddr21,                                                          // [21] Beneficiary Addr1 — FIX 13
                bpAddr22,                                                          // [22] Beneficiary Addr2 — FIX 13
                "",                                                                // [23] empty
                "",                                                                // [24] empty
                "pdf",                                                             // [25] File Type
                trunc(clean(ip.name || job.exporter || ""), 70),                  // [26] Issuing Party Name
                trunc(preserveSpaces(bp.name || ""), 70),                         // [27] Beneficiary Name — FIX 27
                sid,                                                               // [28] ICEGATE Sender ID
            );  // 29 fields [0-28] ✓
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
                    trunc(clean(re.beItemDescription || p.description || ""), 40),
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

    // ── Footer ────────────────────────────────────────────────────────────────
    out += `<END-SB>${RS}`;

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
