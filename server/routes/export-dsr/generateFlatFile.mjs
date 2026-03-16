/**
 * ICEGATE ICES 1.5 – Shipping Bill (CACHE01) Flat File Generator
 * Verified field-by-field against AMD_EXP_SEA_02956_25-26.sb (Logisys reference)
 *
 * ─── ALL FIXES ───────────────────────────────────────────────────────────────
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
 * FIX 13 – Supportingdocs [21]: beneficiary addr = addressLine1 + city (keep country)
 * FIX 14 – SB [15]: exporter category from exporter_type (R/I)
 * FIX 15 – SB [29]: Port of Loading = ICD loc code (not gateway port)
 * FIX 16 – ITEM [18]: pmvPerUnit (not totalPMV)
 * FIX 17 – Supportingdocs [12]: split at last comma ≤ 35 chars
 * FIX 18 – Supportingdocs [16]: icegateFilename (not documentReferenceNo)
 * FIX 19 – Supportingdocs [27]: beneficiary name truncated to 70 chars
 * FIX 20 – INVOICE [16,19]: freight/insurance currency blank when amount = 0
 * FIX 21 – INVOICE [30]: addFreight exactly 1 char via .charAt(0)
 * FIX 22 – split35(): .trim() each chunk to prevent >35 due to boundary spaces
 * FIX 23 – Consignee/buyer name: preserve internal spacing (no clean() collapse)
 * FIX 24 – CONTAINER: skip entirely for LCL or DOCK/PORT/CFS stuffing
 * FIX 25 – INVOICE: exact 35-field layout verified against Logisys:
 *            [16]=fCurr [17]=fAmt [18]="" [19]=iCurr [20]=iAmt
 *            [21-29]="" (9 empties) [30]=af [31]="" [32]="" [33]=np [34]=pp
 * FIX 26 – ITEM [10]: trimEnd() to prevent trailing space at 40-char boundary
 * FIX 27 – Supportingdocs [27]: preserve internal spaces in beneficiary name
 * FIX 28 – DBK table: never emit empty <TABLE>DBK (only when rows exist)
 * FIX 29 – STATEMENT table: removed (Logisys does not emit it)
 * FIX 30 – SW_INFO_TYPE DTY/RDT: qty+unit only when RODTEP is claimed
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

// FIX 23: preserve internal spaces — only strip leading/trailing and collapse tabs/newlines
const preserveSpaces = (s) => String(s ?? "").replace(/[\r\n\t]/g, " ").replace(/^ +| +$/g, "");

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
    return String(rawNum); // no leading zero
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

const expTypCode = (t) => {
    const map = {
        "MANUFACTURER": "I", "MERCHANT": "R",
        "I": "I", "R": "R", "M": "I", "MANUFACTURER EXPORTER": "I",
    };
    return map[(t || "").toUpperCase()] || "R";
};

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
            const containers = job.containers || [];
            if (containers.length === 0) {
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

    // Strip country name from address string
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

    // Address: strip country, then split into 35-char chunks
    const conAddrStripped = stripCountry(
        con0.consignee_address,
        job.destination_country || job.discharge_country || con0.consignee_country || ""
    );
    const conAddrFull = [
        conAddrStripped,
        clean(job.destination_country || con0.consignee_country || "").replace(/\([^)]+\)/g, "").trim(),
    ].filter(Boolean).join(" ");
    const conAddrChunks = split35(conAddrFull);

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

    let out = "";

    // ══════════════════════════════════════════════════════════════════════════
    // <TABLE>SB  — 50 fields [0-49]
    // ══════════════════════════════════════════════════════════════════════════
    out += `<TABLE>SB${RS}`;
    out += row(PD,
        sbModCHA,                                                         // [6]  CHA Code
        iec,                                                              // [7]  IEC Code
        String(job.branch_sr_no || 0),                                   // [8]  Branch Sr No
        trunc(clean(job.exporter || ""), 50),                            // [9]  Exporter Name
        expAddr1,                                                         // [10] Exporter Addr1 (35)
        expAddr2,                                                         // [11] Exporter Addr2 (35)
        "",                                                               // [12] Exporter Addr3
        "",                                                               // [13] City
        pinCode,                                                          // [14] PIN Code
        expTypCode(job.exporter_type),                                    // [15] Category R/I
        "P",                                                              // [16] Exporter Class
        stOr,                                                             // [17] State Code
        clean(job.adCode || job.ad_code || ""),                          // [18] AD Code
        "",                                                               // [19] EPZ Code
        cL[0],                                                            // [20] Consignee Name (spaces preserved)
        cL[1],                                                            // [21] Consignee Addr1
        cL[2],                                                            // [22] Consignee Addr2
        "",                                                               // [23] Consignee Addr3
        "",                                                               // [24] Consignee Addr4
        cntry(con0.consignee_country || ""),                             // [25] Consignee Country
        "",                                                               // [26] NFEI Category
        "",                                                               // [27] RBI Waiver No
        "",                                                               // [28] RBI Waiver Date
        loc,                                                              // [29] Port of Loading (ICD) — FIX 15
        pod,                                                              // [30] Port of Final Destination
        cntry(job.destination_country || ""),                            // [31] Country of Final Dest
        cntry(job.discharge_country || job.destination_country || ""),  // [32] Country of Discharge
        pod,                                                              // [33] Port of Discharge
        "",                                                               // [34] Seal Type
        nc,                                                               // [35] Nature of Cargo
        parseFloat(job.gross_weight_kg || 0).toFixed(3),                // [36] Gross Weight
        parseFloat(job.net_weight_kg || 0).toFixed(3),                // [37] Net Weight
        "KGS",                                                            // [38] Unit
        clean(String(job.total_no_of_pkgs || job.totalPackages || "")), // [39] Total Packages
        clean(job.marks_nos || job.marksAndNumbers || ""),              // [40] Marks & Numbers
        "",                                                               // [41]
        "0",                                                              // [42] Loose Packets
        "",                                                               // [43]
        mawb,                                                             // [44] MAWB
        hawb,                                                             // [45] HAWB
        "",                                                               // [46]
        "",                                                               // [47]
        gstnTypCode(gid),                                                // [48] GSTN Type
        gid,                                                              // [49] GSTN Number
    );

    // ══════════════════════════════════════════════════════════════════════════
    // <TABLE>INVOICE  — 35 fields [0-34]  ← verified against Logisys exactly
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
        const iCurr = iAmtRaw > 0 ? curr : "";

        const natureFull = ((job.otherInfo || {}).natureOfPayment || "NA").toUpperCase();
        const nopMap = {
            "DELIVERY AGAINST ACCEPTANCE": "DA", "DELIVERY AGAINST PAYMENT": "DP",
            "DEFERRED": "DF", "DIRECT": "DR", "LETTER OF CREDIT": "LC",
            "TELEGRAPHIC TRANSFER": "TT", "NA": "OT",
        };
        const np = nopMap[natureFull] || natureFull.replace(/\s+/g, "").slice(0, 2) || "OT";
        const pp = String((job.otherInfo || {}).paymentPeriod || "");

        // FIX 21: exactly 1 character
        const af = (PRICE_INCLUDES_MAP[(inv.priceIncludes || "N").toUpperCase()] || "N").charAt(0);

        out += row(PD,
            String(i + 1),                               // [6]  Invoice Sr No
            clean(inv.invoiceNumber || ""),              // [7]  Invoice Number
            fmtDate(inv.invoiceDate),                    // [8]  Invoice Date
            curr,                                        // [9]  Currency
            (inv.termsOfInvoice || "FOB").toUpperCase(), // [10] Terms of Invoice
            cL[0],                                       // [11] Buyer Name (spaces preserved)
            cL[1],                                       // [12] Buyer Addr1
            cL[2],                                       // [13] Buyer Addr2
            cL[3],                                       // [14] Buyer Addr3
            cL[4],                                       // [15] Buyer Addr4
            fCurr,                                       // [16] Freight Currency
            fAmt,                                        // [17] Freight Amount
            "",                                          // [18] empty (verified Logisys)
            iCurr,                                       // [19] Insurance Currency
            iAmt,                                        // [20] Insurance Amount
            "", "", "", "", "", "", "", "", "",          // [21-29] 9 empties
            af,                                          // [30] Add Freight 1 char
            "",                                          // [31]
            "",                                          // [32]
            np,                                          // [33] Nature of Payment
            pp,                                          // [34] Payment Period
        );  // total 35 fields [0-34] ✓
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
                String(ii + 1), String(pi + 1),                           // [6][7]  Inv/Item Sr
                sc,                                                         // [8]   Scheme Code
                clean(p.ritc || ""),                                        // [9]   RITC
                trunc(desc, 40).trimEnd(),                                  // [10]  Desc1 — FIX 26
                trunc(desc.slice(40), 40),                                  // [11]  Desc2
                trunc(desc.slice(80), 40),                                  // [12]  Desc3
                uom,                                                        // [13]  UOM
                qty,                                                        // [14]  Quantity
                upr,                                                        // [15]  Unit Price
                uom,                                                        // [16]  Unit of Rate
                "1",                                                        // [17]  Per
                pmv,                                                        // [18]  PMV per unit
                "",                                                         // [19]  Job Work Notif
                "N",                                                        // [20]  Third Party
                p.rewardItem ? "Y" : "N",                                  // [21]  Reward Item
                "", "", "",                                                 // [22-24] Amendment
                "", "", "", "", "", "", "", "",                             // [25-32] Manufacturer
                "",                                                         // [33]  Source State
                "",                                                         // [34]  Transit Country
                "0",                                                        // [35]  Accessory Status
                clean((p.endUse || "").split(" ")[0]),                     // [36]  End Use Code
                hawb,                                                       // [37]  HAWB
                "",                                                         // [38]  Total Package
                ist,                                                        // [39]  IGST Status
                ist === "P" ? parseFloat(ig.taxableValueINR || 0).toFixed(2) : "", // [40]
                ist === "P" ? parseFloat(ig.igstAmountINR || 0).toFixed(2) : "", // [41]
            );  // 42 fields ✓
        });
    });

    // ── LICENCE (optional) ────────────────────────────────────────────────────
    const hasLicence = invs.some(inv => (inv.products || []).some(p => {
        const sc = (p.eximCode || "").split(" ")[0];
        return sc === "03" || sc === "50" || p.deecDetails?.isDeecItem || p.epcgDetails?.isEpcgItem;
    }));

    if (hasLicence) {
        out += `<TABLE>LICENCE${RS}`;
        invs.forEach((inv, ii) => {
            (inv.products || []).forEach((p, pi) => {
                const sc = (p.eximCode || "").split(" ")[0];
                let licSr = 1;
                const handleReg = (reg) => {
                    out += row(PD,
                        String(ii + 1), String(pi + 1), String(licSr++),
                        clean(reg.regnNo || ""), fmtDate(reg.licDate),
                        "1",
                        parseFloat(p.deecDetails?.exportQtyUnderLicence || p.epcgDetails?.exportQtyUnderLicence || 0).toFixed(3),
                        parseFloat(p.quantity || 0).toFixed(3),
                        expTypCode(job.exporter_type),
                    );
                };
                if (sc === "03" || p.deecDetails?.isDeecItem) (p.deecDetails?.deec_reg_obj || []).forEach(handleReg);
                if (sc === "50" || p.epcgDetails?.isEpcgItem) (p.epcgDetails?.epcg_reg_obj || []).forEach(handleReg);
            });
        });
    }

    // ══════════════════════════════════════════════════════════════════════════
    // <TABLE>DBK  — only emit when rows actually exist — FIX 28
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
    // <TABLE>CONTAINER  — 12 fields; skipped for LCL/DOCK — FIX 24
    // Uses PD_CONTAINER (4-field prefix, no extra empties) — FIX 1
    // ══════════════════════════════════════════════════════════════════════════
    const sealDateMap = {};
    (job.containers || []).forEach(c => {
        if (c.containerNo) sealDateMap[c.containerNo.toUpperCase()] = c.sealDate;
    });

    const containers = job.containers || [];

    const isLCL = (job.consignmentType || "").toUpperCase() === "LCL";
    const isPortStuffing = ["DOCK", "PORT", "CFS"].includes((job.goods_stuffed_at || "").toUpperCase());
    const emitContainer = job.transportMode === "SEA" && containers.length > 0 && !isLCL && !isPortStuffing;

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
                clean(c.containerNo),      // [4]  Container No
                isoType,                   // [5]  ISO Type
                rawSealNo,                 // [6]  Seal (combined)
                fmtDate(sealDate || now),  // [7]  Seal Date
                "RFID",                    // [8]  RFID
                "", "", "",               // [9][10][11] → 12 fields ✓
            );
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
            const pDist = clean(p.originDistrict || "").split(/\s*-\s*/)[0];

            let rowNo = 1;

            // ORC/STO — state of origin
            out += row(PD, String(ii + 1), String(pi + 1), String(rowNo++), "ORC", "STO", pState, "", "", "");

            // ORC/DOO — district of origin
            out += row(PD, String(ii + 1), String(pi + 1), String(rowNo++), "ORC", "DOO", pDist, "", "", "");

            // FIX 8: CHR/SQC — qty at slot [13] (2 empties before it)
            out += row(PD, String(ii + 1), String(pi + 1), String(rowNo++), "CHR", "SQC", "", "", socQty, socUnit);

            // ORC/EPT — preferential trade agreement
            out += row(PD, String(ii + 1), String(pi + 1), String(rowNo++), "ORC", "EPT", pta, "", "", "");

            // FIX 9: DTY/GCESS — always emit even when cess = 0
            out += row(PD, String(ii + 1), String(pi + 1), String(rowNo++), "DTY", "GCESS", "", "", cess, "INR");

            // FIX 30: DTY/RDT — qty+unit only when RODTEP claimed
            const rodtepClaim = (p.rodtepInfo || {}).claim === "Yes" ? "RODTEPY" : "RODTEPN";
            const isClaimed = rodtepClaim === "RODTEPY";
            out += row(PD, String(ii + 1), String(pi + 1), String(rowNo++), "DTY", "RDT",
                rodtepClaim, rc, isClaimed ? socQty : "", isClaimed ? socUnit : "");

            // DIR/XSB — Direct port routing (free shipping bills only)
            if (p.eximCode && p.eximCode.startsWith("00")) {
                const portPart = loc.replace(/^IN/, "");
                out += row(PD, String(ii + 1), String(pi + 1), String(rowNo++), "DIR", "XSB", portPart + "U001", "", "", "");
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
            // FIX 11: docType+docCode already combined in DB ("331000")
            const docTypeCode = clean(d.documentType || "331000");

            // FIX 10: invSerialNo = 1-based numeric invoice index
            const invIdx = invs.findIndex(inv => inv.invoiceNumber === d.invSerialNo);
            const invSrNo = String(invIdx >= 0 ? invIdx + 1 : 1);

            // FIX 17: Split issuing party address at last comma within 35 chars
            const ip = d.issuingParty || {};
            const ipRawAddr = clean(ip.addressLine1 || "");
            let ipAddrA, ipAddrB;
            if (ip.addressLine2) {
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
            const ipCity = clean(ip.city || "");
            const ipPin = clean(ip.pinCode || "");

            // FIX 13: Beneficiary address = addressLine1 + city (keep country, matches Logisys "TAIWAN, Taiwan")
            const bp = d.beneficiaryParty || {};
            const bpParts = [clean(bp.addressLine1 || ""), clean(bp.city || "")].filter(Boolean).join(", ");
            const bpAddr35 = trunc(bpParts, 35);

            out += row(PD,
                invSrNo,                                                           // [6]  Invoice index (1-based)
                "0",                                                               // [7]  Item Sr No
                String(di + 1),                                                    // [8]  Doc Sr No
                clean(d.irn || d.imageRefNo || ""),                               // [9]  IRN
                docTypeCode,                                                       // [10] DocType+DocCode combined
                "",                                                                // [11] empty
                ipAddrA,                                                           // [12] Issuing party Addr1 (35)
                ipAddrB,                                                           // [13] Issuing party Addr2 (35)
                ipCity,                                                            // [14] City
                ipPin,                                                             // [15] PIN
                clean(d.icegateFilename || d.documentReferenceNo || ""),          // [16] FIX 18: icegateFilename
                clean(d.placeOfIssue || job.state_of_origin || job.exporter_state || job.state || ""), // [17] State
                fmtDate(d.dateOfIssue || ""),                                     // [18] Date of Issue
                "",                                                                // [19] empty
                "",                                                                // [20] empty
                bpAddr35,                                                          // [21] Beneficiary Addr
                "",                                                                // [22]
                "",                                                                // [23]
                "",                                                                // [24]
                "pdf",                                                             // [25] File ext
                trunc(clean(ip.name || job.exporter || ""), 50),                  // [26] Issuing party Name
                trunc(preserveSpaces(bp.name || ""), 70),                         // [27] FIX 27: preserve spaces ("TO   THE ORDER")
                sid,                                                               // [28] ICEGATE Sender ID
            );  // 29 fields ✓
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
                    String(ii + 1),                                                    // [6]
                    String(pi + 1),                                                    // [7]
                    "1",                                                               // [8]
                    prt(re.importPortCode || loc),                                    // [9]
                    clean(re.beNumber || ""),                                          // [10]
                    fmtDate(re.beDate),                                                // [11]
                    String(re.invoiceSerialNo || 1),                                   // [12]
                    String(re.itemSerialNo || 1),                                   // [13]
                    re.manualBE ? "Y" : "N",                                          // [14]
                    parseFloat(re.quantityExported || p.quantity || 0).toFixed(6),    // [15]
                    trunc(clean(re.beItemDescription || p.description || ""), 40),    // [16]
                    parseFloat(re.quantityImported || 0).toFixed(6),                  // [17]
                    clean(re.qtyImportedUnit || p.qtyUnit || "KGS"),                  // [18]
                    parseFloat(re.assessableValue || 0).toFixed(6),                   // [19]
                    parseFloat(re.totalDutyPaid || 0).toFixed(6),                   // [20]
                    fmtDate(re.dutyPaidDate),                                          // [21]
                    clean(re.otherIdentifyingParameters || "."),                       // [22]
                    parseFloat(re.drawbackAmtClaimed || 0).toFixed(6),                // [23]
                    re.itemUnUsed === true ? "N" : "Y",                               // [24]
                    re.againstExportObligation ? "Y" : "N",                           // [25]
                    re.commissionerPermission ? "Y" : "N",                           // [26]
                    re.modvatAvailed ? "Y" : "N",                                    // [27]
                    re.modvatReversed ? "Y" : "N",                                    // [28]
                    "N",                                                               // [29]
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
