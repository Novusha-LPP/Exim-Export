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
 * FIX 33 – SB [42]: Loose packets = "" for containerised cargo (not "0")
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
const clean = (s) => String(s ?? "").replace(/[\r\n\t]/g, " ").replace(/\s+/g, " ").trim();

// FIX 23 / FIX 40: preserve internal spaces (consignee name, beneficiary name, marks_nos)
const preserveSpaces = (s) => String(s ?? "").replace(/[\r\n\t]/g, " ").replace(/^ +| +$/g, "");

// FIX 37: title-case ("GANDHINAGAR" -> "Gandhinagar")
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

// FIX 44: unit indicator — metric vs count/set
// "SET"/"SETS"/"UNIT"/"UNITS"/"NOS"/"PCS" -> "N" (number/count)
// "KGS"/"KG"/"MTS"/"MT" -> "M" (metric)
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
    const seq = String(parseInt(sbNo, 10)) + pad(now.getDate(), 2) + pad(now.getMonth() + 1, 2);

    // FIX 1: Standard prefix — 2 extra empty fields after date
    const PD = `F${FS}${loc}${FS}${sbNo}${FS}${jdt}${FS}${FS}`;
    // CONTAINER prefix — NO extra empties
    const PD_CONTAINER = `F${FS}${loc}${FS}${sbNo}${FS}${jdt}`;

    const invs = job.invoices || [];
    const con0 = (job.consignees || [])[0] || {};

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
    const containers = job.containers || [];

    const isNFEI = invs.some(inv =>
        (inv.products || []).some(p => (p.eximCode || "").split(" ")[0] === "99")
    );
    const isLCL = (job.consignmentType || "").toUpperCase() === "LCL";
    const isPortStuffing = ["DOCK", "PORT", "CFS"].includes((job.goods_stuffed_at || "").toUpperCase());
    const emitContainer = job.transportMode === "SEA" && containers.length > 0 && !isPortStuffing;
    const conName35 = trunc(preserveSpaces(con0.consignee_name || ""), 35);
    const conAddrStripped = stripCountry(
        con0.consignee_address,
        job.destination_country || job.discharge_country || con0.consignee_country || ""
    );
    const conAddrChunks = split35(conAddrStripped);

    const cL = [conName35, conAddrChunks[0], conAddrChunks[1], conAddrChunks[2], conAddrChunks[3]];

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

    const loosePktsA =
        job.loose_pkgs && Number(job.loose_pkgs) > 0
            ? String(job.loose_pkgs)
            : "";
    const isContainerized =
        job.transportMode === "SEA" &&
        containers.length > 0 &&
        !["DOCK", "PORT", "CFS"].includes((job.goods_stuffed_at || "").toUpperCase());

    const nc = isContainerized ? "C" : "P";
    const loosePkts =
        nc === "C" ? "" :
            (job.loose_pkgs && Number(job.loose_pkgs) > 0 ? String(job.loose_pkgs) : "");

    // SB [17] — exporter's state where goods originate
    // job.state = "RAJASTHAN" (correct — where factory is)
    // job.state_of_origin = "GUJARAT" (this is the CHA/branch state, NOT product origin)
    const stOr = stCd(job.exporter_state || job.state || "GUJARAT");

    const rawAddr = clean(job.exporter_address || "");
    const pinMatch = rawAddr.match(/,?\s*(\d{6})\s*$/);
    const pinCode = clean(job.exporter_pincode || (pinMatch ? pinMatch[1] : ""));
    const addrNoPIN = pinMatch ? rawAddr.replace(/,?\s*\d{6}\s*$/, "").trim() : rawAddr;
    const expAddr1 = trunc(addrNoPIN, 35);
    const expAddr2 = trunc(addrNoPIN.slice(35).trim(), 35);
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


    let out = "";
    const loosePktsFinal = loosePkts || loosePktsA || "";

    // ══════════════════════════════════════════════════════════════════════════
    // <TABLE>SB  — 50 fields [0-49]
    // ══════════════════════════════════════════════════════════════════════════
    out += `<TABLE>SB${RS}`;
    out += row(PD,
        sbModCHA,                                                           // [6]
        iec,                                                                // [7]
        String(job.branchSrNo || job.branch_sno || job.branch_sr_no || 1), // [8]  FIX 31
        trunc(clean(job.exporter || ""), 50),                              // [9]
        expAddr1,                                                           // [10]
        expAddr2,                                                           // [11]
        "",                                                                 // [12] City
        "",                                                                 // [13] State
        pinCode,                                                            // [14]
        expTypCode(job.exporter_type),                                      // [15]
        "P",                                                                // [16] Exporter Class
        stOr,                                                               // [17]
        clean(isNFEI ? "" : (job.adCode || job.ad_code || "")),             // [18] AD Code — blank for NFEI
        "",                                                                 // [19] EPZ
        cL[0],                                                              // [20] Consignee Name
        cL[1],                                                              // [21]
        cL[2],                                                              // [22]
        cL[3],                                                              // [23] FIX 32
        cL[4],                                                              // [24]
        cntry(con0.consignee_country || ""),                               // [25]
        isNFEI ? "01" : "",                                               // [26] NFEI
        "",                                                                 // [27] RBI Waiver No
        "",                                                                 // [28] RBI Waiver Date
        loc,                                                                // [29] Port of Loading — FIX 15
        podest,                                                                // [30] Port of Dest
        cntry(job.destination_country || ""),                              // [31]
        cntry(job.discharge_country || ""),    // [32]
        podisc,                                                                // [33] Port of Discharge
        "",                                                                 // [34] Seal Type
        nc,                                                                 // [35] Nature of Cargo
        parseFloat(job.gross_weight_kg || 0).toFixed(3),                  // [36]
        parseFloat(job.net_weight_kg || 0).toFixed(3),                    // [37]
        "KGS",                                                              // [38]
        clean(String(job.total_no_of_pkgs || job.totalPackages || "")),   // [39]
        preserveSpaces(job.marks_nos || job.marksAndNumbers || ""),       // [40] FIX 40
        loosePktsFinal,   // ONLY ONE FIELD

        String(emitContainer ? containers.length : ""),                   // [43] No. of Containers — FIX 34
        "",
        mawb,                                                               // [44]
        hawb,                                                               // [45]
        "",                                                                 // [46] Amend Type
        "",                                                                 // [47] Amend No
        gstnTypCode(gid),                                                  // [48] GSTN Type
        gid,                                                                // [49] GSTN ID
    );

    // ══════════════════════════════════════════════════════════════════════════
    // <TABLE>INVOICE  — 49 fields [0-48]
    //
    // Full layout (0-based):
    // [16]=fCurr  [17]=fAmt   [18]=iRate  [19]=iCurr  [20]=iAmt
    // [21]=commRate  [22]=commCurr  [23]=commAmt          FIX 41
    // [24]=discRate  [25]=discCurr  [26]=discAmt
    // [27]=otherRate [28]=otherCurr [29]=otherAmt
    // [30]=addFreight (from termsOfInvoice)                FIX 42
    // [31]=packingCharges  [32]=exporterContractNo
    // [33]=natureOfPayment  [34]=paymentPeriod
    // [35-48] = 14 trailing empties                        FIX 25
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

        // Commission — FIX 41: read fic.commission, emit rate+currency+amount in [21-23]
        // Logisys sends commission RATE (e.g. 2.00000%) in [21] when stored in DB
        // If only amount is stored (no rate), [21] stays blank (amount-only mode)
        const commAmtRaw = parseFloat((fic.commission || {}).amount);
        const commRateRaw = parseFloat((fic.commission || {}).rate);
        const commAmt = commAmtRaw > 0 ? commAmtRaw.toFixed(2) : "";
        const commCurr = commAmtRaw > 0 ? curr : "";
        // FIX 46: send commission rate (%) only when it is explicitly stored and non-zero
        // Format matches Logisys: 5 decimal places (e.g. "2.00000")
        const commRate = commRateRaw > 0 ? commRateRaw.toFixed(5) : "";

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

        // FIX 42: addFreight MUST come from termsOfInvoice — priceIncludes in DB is unreliable
        // C&F = freight in price -> F | CIF = both -> B | C&I = insurance only -> I | FOB = neither -> N
        const addFreightMap = { "CIF": "B", "C&F": "F", "CF": "F", "C&I": "I", "CI": "I", "FOB": "N" };
        const af = addFreightMap[terms] || "N";

        out += row(PD,
            String(i + 1),                 // [6]  Invoice Sr No
            clean(inv.invoiceNumber || ""),// [7]  Invoice Number
            fmtDate(inv.invoiceDate),      // [8]  Invoice Date
            curr,                          // [9]  Currency
            ct,                            // [10] Contract Type
            cL[0],                         // [11] Buyer Name
            cL[1],                         // [12] Buyer Addr1
            cL[2],                         // [13] Buyer Addr2
            cL[3],                         // [14] Buyer Addr3
            cL[4],                         // [15] Buyer Addr4
            fCurr,                         // [16] Freight Currency
            fAmt,                          // [17] Freight Amount
            "",                            // [18] Insurance Rate
            iCurr,                         // [19] Insurance Currency
            iAmt,                          // [20] Insurance Amount
            commRate,                      // [21] Commission Rate (%) — FIX 46: 5 decimals when stored
            commCurr,                      // [22] Commission Currency — FIX 41
            commAmt,                       // [23] Commission Amount   — FIX 41
            "",                            // [24] Discount Rate
            discCurr,                      // [25] Discount Currency
            discAmt,                       // [26] Discount Amount
            "",                            // [27] Other Deductions Rate
            otherCurr,                     // [28] Other Deductions Currency
            otherAmt,                      // [29] Other Deductions Amount
            af,                            // [30] Add Freight — FIX 42
            "",                            // [31] Packing Charges
            "",                            // [32] Exporter Contract No
            np,                            // [33] Nature of Payment
            pp,                            // [34] Payment Period
            "", "", "", "", "", "", "", "", "", "", "", "", "", "", // [35-48] FIX 25: 14 trailing empties
        );
    });

    // ══════════════════════════════════════════════════════════════════════════
    // <TABLE>EXCHANGE
    // ══════════════════════════════════════════════════════════════════════════
    out += `<TABLE>EXCHANGE${RS}`;
    [...new Set(["INR", ...invs.map(inv => clean(inv.currency || "USD"))])].forEach(c => {
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
                trunc(desc, 40).trimEnd(),          // [10] FIX 26
                trunc(desc.slice(40), 40),           // [11]
                trunc(desc.slice(80), 40),           // [12]
                uom, qty, upr, uom, "1", pmv,
                "",                                  // [19] Job Work
                "N",                                 // [20] Third Party
                p.rewardItem ? "Y" : "N",           // [21] Reward
                "", "", "",                          // [22-24] Amendment
                "", "", "", "", "", "", "", "",       // [25-32] Manufacturer
                "", "",                              // [33-34] Source State, Transit Country
                "0",                                 // [35] Accessory
                clean((p.endUse || "").split(" ")[0]), // [36] End Use
                hawb,                                // [37] HAWB
                "",                                  // [38] Total Package
                ist,
                ist === "P" ? parseFloat(ig.taxableValueINR || 0).toFixed(2) : "",
                ist === "P" ? parseFloat(ig.igstAmountINR || 0).toFixed(2) : "",
            );
        });
    });

    // ══════════════════════════════════════════════════════════════════════════
    // <TABLE>LICENCE  — 19 fields [0-18]
    //
    // FIX 43: emit BOTH DEEC (Advance Licence) AND EPCG licence rows
    //         licSr counter is shared per product — EPCG rows continue after DEEC
    //
    // Trigger: sc="03" (Adv Lic only), sc="50" (Adv Lic + EPCG), or explicit flags
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
                let licSr = 1; // shared counter for this product (DEEC + EPCG combined)

                // ── DEEC / Advance Licence ────────────────────────────────────
                const deec = p.deecDetails || {};
                const deecRegs = deec.deec_reg_obj || [];
                const deecItems = deec.deecItems || [];

                if (deecRegs.length && deecItems.length) {
                    deecRegs.forEach(reg => {
                        if (!clean(reg.regnNo)) return;
                        deecItems.forEach(item => {
                            out += row(PD,
                                String(ii + 1), String(pi + 1),
                                String(licSr++),
                                clean(reg.regnNo),
                                fmtDate(reg.licDate),
                                clean(deec.itemSnoPartE || "1"),
                                clean(item.itemSnoPartC || "1"),
                                parseFloat(item.quantity || 0).toFixed(3),
                                parseFloat(deec.exportQtyUnderLicence || 0).toFixed(3),
                                getUnitIndicator(item.unit),
                                "", "", "",   // FIX 36: 3 trailing empties
                            );
                        });
                    });
                }

                // ── EPCG Licence — FIX 43 ────────────────────────────────────
                const epcg = p.epcgDetails || {};
                const epcgRegs = epcg.epcg_reg_obj || [];
                const epcgItems = epcg.epcgItems || [];

                if (epcgRegs.length && epcgItems.length) {
                    epcgRegs.forEach(reg => {
                        if (!clean(reg.regnNo)) return;
                        epcgItems.forEach(item => {
                            out += row(PD,
                                String(ii + 1), String(pi + 1),
                                String(licSr++),               // continues from DEEC licSr
                                clean(reg.regnNo),
                                fmtDate(reg.licDate),
                                clean(epcg.itemSnoPartE || "1"),
                                clean(item.itemSnoPartC || "1"),
                                parseFloat(item.quantity || 0).toFixed(3),
                                parseFloat(epcg.exportQtyUnderLicence || 0).toFixed(3),
                                getUnitIndicator(item.unit),   // FIX 44: SET->N
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
                // FIX 48: DBK quantity MUST be the drawback schedule quantity (in schedule unit e.g. KGS)
                // NOT the invoice quantity (which may be in PCS, MTS, etc.)
                // Logisys: 10464 PCS item → DBK qty = 3997.248 KGS (the drawback-schedule-unit weight)
                // d.quantity holds the schedule-unit qty if stored separately; do NOT fall back to p.quantity
                // If d.quantity is missing, send blank rather than wrongly sending the invoice qty
                const dbkQty = d.quantity ? parseFloat(d.quantity).toFixed(3) : "";
                dbkRows.push(row(PD,
                    String(ii + 1), String(pi + 1),
                    dbkId,
                    dbkQty,  // FIX 48
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
            // ── FIX 49: ISO 6346 container type code — complete mapping ──────────────
            // Covers all types visible in the Logisys dropdown:
            // 20/40 Standard Dry, Flat Rack, Collapsible Flat Rack, Reefer, Tank,
            // Open Top, Hard Top, High Cube, Reefer High Cube, Platform
            //
            // IMPORTANT: In ICEGATE/ISO 6346, size code "45" does NOT mean 45-foot!
            // "45" = 40-foot HIGH CUBE (9ft 6in tall). Real 45ft uses "L2".
            // Logisys confirmed: 40ft High Cube → "45G0" (not "42G1")
            //
            // Full size code table:
            //   22 = 20ft standard height  |  42 = 40ft standard height
            //   25 = 20ft high cube        |  45 = 40ft high cube
            //   L2 = 45ft standard height  |  L5 = 45ft high cube
            //
            // tCode table (ICEGATE simplified):
            //   G0 = Dry/General (standard and high cube dry)
            //   R1 = Reefer (refrigerated)
            //   U1 = Open Top
            //   P1 = Flat Rack (non-collapsible)
            //   P3 = Collapsible Flat Rack
            //   P0 = Platform
            //   T0 = Tank
            //   H0 = Hard Top / Ventilated

            const rawSize = clean(c.containerSize || "20").toUpperCase();
            const rawType = clean(c.type || c.containerType || "").toUpperCase();
            // Combined string for detection — check both fields
            const combined = rawSize + " " + rawType;

            let isoType = rawType;

            // Only compute if not already a valid 4-char ISO code
            if (!/^\d{2}[A-Z]\d$/.test(isoType) && !/^[A-Z]\d[A-Z]\d$/.test(isoType)) {

                // ── Detect flags ──────────────────────────────────────────────────
                const isHC = combined.includes("HC") || combined.includes("HQ")
                    || combined.includes("HIGH CUBE") || combined.includes("HIGHCUBE");
                const isRF = combined.includes("RF") || combined.includes("REEFER")
                    || combined.includes("REFRIGERAT");
                const isOT = combined.includes("OT") || combined.includes("OPEN TOP")
                    || combined.includes("OPEN-TOP");
                const isFR = (combined.includes("FR") || combined.includes("FLAT RACK")
                    || combined.includes("FLAT-RACK")) && !combined.includes("COLL");
                const isCFR = combined.includes("COLLAPSIBLE") || combined.includes("CFR");
                const isTK = combined.includes("TK") || combined.includes("TANK");
                const isHT = combined.includes("HT") || combined.includes("HARD TOP")
                    || combined.includes("VENTILAT");
                const isPL = combined.includes("PL") || combined.includes("PLATFORM");
                const is45ft = combined.includes("45FT") || combined.includes("45 FT")
                    || rawSize === "45FT" || rawSize === "L2" || rawSize === "L5";
                const is40 = combined.includes("40") && !is45ft;
                const is20 = !is40 && !is45ft;

                // ── Size code ─────────────────────────────────────────────────────
                let sCode;
                if (is45ft) {
                    sCode = isHC ? "L5" : "L2";          // actual 45-foot container
                } else if (is40) {
                    sCode = isHC ? "45" : "42";           // 40ft HC=45, 40ft standard=42
                } else {
                    sCode = isHC ? "25" : "22";           // 20ft HC=25, 20ft standard=22
                }

                // ── Type code ─────────────────────────────────────────────────────
                let tCode;
                if (isRF) tCode = "R1";             // Reefer (any size)
                else if (isOT) tCode = "U1";             // Open Top
                else if (isCFR) tCode = "P3";             // Collapsible Flat Rack
                else if (isFR) tCode = "P1";             // Flat Rack
                else if (isPL) tCode = "P0";             // Platform
                else if (isTK) tCode = "T0";             // Tank
                else if (isHT) tCode = "H0";             // Hard Top / Ventilated
                else tCode = "G0";             // Standard Dry or High Cube Dry

                isoType = `${sCode}${tCode}`;
            }

            const rawSealNo = clean(c.customSealNo || c.sealNo || c.shippingLineSealNo || "");
            const sealDate = sealDateMap[(clean(c.containerNo || "")).toUpperCase()] || c.sealDate;

            out += row(PD_CONTAINER,
                clean(c.containerNo),
                isoType,
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
            const rc = (p.rodtepInfo || {}).claim === "Yes" ? "Claimed" : "Not Claimed";
            const pta = clean((p.ptaFtaInfo || "NCPTI").split(" ")[0]);
            const cess = parseFloat(p.compensationCessAmountINR || 0).toFixed(6);
            const pState = stCd(clean(p.originState || job.exporter_state || job.state || "GUJARAT")); const pDist = clean(p.originDistrict || "").split(/\s*-\s*/)[0];
            let rowNo = 1;

            out += row(PD, String(ii + 1), String(pi + 1), String(rowNo++), "ORC", "STO", pState, "", "", "");
            out += row(PD, String(ii + 1), String(pi + 1), String(rowNo++), "ORC", "DOO", pDist, "", "", "");
            out += row(PD, String(ii + 1), String(pi + 1), String(rowNo++), "CHR", "SQC", "", "", socQty, socUnit);
            out += row(PD, String(ii + 1), String(pi + 1), String(rowNo++), "ORC", "EPT", pta, "", "", "");
            out += row(PD, String(ii + 1), String(pi + 1), String(rowNo++), "DTY", "GCESS", "", "", cess, "INR");

            // FIX 47: DTY/RDT (RoDTEP declaration) is ONLY emitted for free SBs (eximCode starts "00")
            // For DBK (60), RoSCTL (60), Advance Licence (03), EPCG (50) — Logisys does NOT send this row
            // Emitting RODTEPN for non-free schemes causes confusion and is not expected by Customs
            const sc_sw = (p.eximCode || "").split(" ")[0];
            const isFreeShipping = sc_sw === "00" || sc_sw === "" || sc_sw === "19" || sc_sw === "99";
            if (isFreeShipping || (p.rodtepInfo || {}).claim === "Yes") {
                const rodtepClaim = (p.rodtepInfo || {}).claim === "Yes" ? "RODTEPY" : "RODTEPN";
                const isClaimed = rodtepClaim === "RODTEPY";
                out += row(PD, String(ii + 1), String(pi + 1), String(rowNo++), "DTY", "RDT",
                    rodtepClaim, isClaimed ? "Claimed" : "Not Claimed",
                    isClaimed ? socQty : "", isClaimed ? socUnit : "");
            }

            if (p.eximCode && p.eximCode.startsWith("00")) {
                out += row(PD, String(ii + 1), String(pi + 1), String(rowNo++),
                    "DIR", "XSB", loc.replace(/^IN/, "") + "U001", "", "", "");
            }
        });
    });

    // ══════════════════════════════════════════════════════════════════════════
    // <TABLE>STATEMENT  — FIX 29: 12 fields, no trailing empties
    // ══════════════════════════════════════════════════════════════════════════
    let statementAdded = false;
    invs.forEach((inv, ii) => {
        (inv.products || []).forEach((p, pi) => {
            const sc = (p.eximCode || "").split(" ")[0];
            if ((p.rodtepInfo || {}).claim === "Yes" || sc === "60" || sc === "61" || sc === "03") {
                if (!statementAdded) { out += `<TABLE>STATEMENT${RS}`; statementAdded = true; }
                // 60 = DRAWBACK AND ROSCTL, 61 = EPCG, DRAWBACK AND ROSCTL → RS001
                // RoDTEP claims and scheme 03 (Advance Licence) → RD001
                const declCode = (sc === "60" || sc === "61") ? "RS001" : "RD001";
                out += row(PD, String(ii + 1), String(pi + 1), "1", "DEC", declCode, "");
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

            // FIX 45: Issuing party address — ICES spec Addr1=C(70), Addr2=C(70)
            // Old comma-split-within-36 caused Addr2 to exceed 70 chars on long addresses
            // (e.g. "PLOT NO. 118/1,2,3,4 AND...CHHATRAL" → comma at pos 18 → Addr2=94 chars)
            // → ICEGATE error: "documentIssuingPartyNameAddress2 max length 70"
            // Fix: straight 70-char split; if explicit addressLine2 exists, use it directly.
            const ip = d.issuingParty || {};
            const ipRawAddr = clean(ip.addressLine1 || "");
            let ipAddrA, ipAddrB;
            if (ip.addressLine2 && ip.addressLine2.trim()) {
                ipAddrA = trunc(ipRawAddr, 70);
                ipAddrB = trunc(clean(ip.addressLine2), 70);
            } else {
                // Split at 70 chars — matches ICES spec field width exactly
                ipAddrA = trunc(ipRawAddr, 70);
                ipAddrB = trunc(ipRawAddr.slice(70).trim(), 70);
            }

            const ipCity = toTitleCase(clean(ip.city || ""));
            const ipPin = clean(ip.pinCode || "");

            // Beneficiary address: ICES spec Addr1=C(70), Addr2=C(70)
            const bp = d.beneficiaryParty || {};
            const bpFull = clean(bp.addressLine1 || "");
            const bpAddr21 = trunc(bpFull, 70);
            const bpAddr22 = trunc(bpFull.slice(70).trim(), 70);

            const invoiceDate = fmtDate(invs[invIdx]?.invoiceDate || d.dateOfIssue || "");
            const docRefNo = clean(d.documentReferenceNo || invs[invIdx]?.invoiceNumber || "");

            out += row(PD,
                invSrNo, "0", String(di + 1),
                clean(d.irn || d.imageRefNo || ""),
                docTypeCode, "",
                ipAddrA, ipAddrB, ipCity, ipPin,
                docRefNo,
                clean(d.placeOfIssue || job.originState || ""),
                invoiceDate,
                "", "",
                bpAddr21, bpAddr22,
                "", "",
                "pdf",
                trunc(clean(ip.name || job.exporter || ""), 70),
                trunc(preserveSpaces(bp.name || ""), 70),
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
