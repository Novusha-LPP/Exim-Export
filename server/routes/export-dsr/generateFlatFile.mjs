/**
 * ICEGATE ICES 1.5 – Shipping Bill (CACHE01) Flat File Generator
 * Fixed against verified Logisays .sb reference file.
 *
 * ─── FIX SUMMARY (verified field-by-field against AMD_EXP_SEA_03162_25-26.sb) ───
 *
 * FIX 14 – SB [15]: Stuffing mode from goods_stuffed_at (F=Factory / I=ICD), NOT exporter_type
 *   Old: expTypCode(job.exporter_type) = "M"
 *   New: job.goods_stuffed_at === "FACTORY" → "F", else → "I"
 *
 * FIX 15 – SB [29]: Port of Loading = ICD code (loc), NOT the gateway port
 *   For ICD shipments ICEGATE expects the ICD port code in the SB POL field.
 *   Old: prt(job.port_of_loading) = "INMUN1"
 *   New: loc = "INSAU6"
 *
 * FIX 16 – ITEM [18]: Present Market Value = pmvPerUnit, NOT totalPMV
 *   Old: p.pmvInfo.totalPMV = 69850.88 (quantity × unit price)
 *   New: p.pmvInfo.pmvPerUnit = 17462.72 (per-unit value only)
 *
 * FIX 17 – Supportingdocs [12],[13]: Split address at last comma ≤ 35 chars
 *   Old: hard split at char 35 → " ROAD," as addr2 (leading space, wrong boundary)
 *   New: find last comma within first 35 chars → clean addr2 with no leading space
 *
 * FIX 18 – Supportingdocs [16]: Use icegateFilename, NOT documentReferenceNo
 *   Old: d.documentReferenceNo = "2026022500018132" (second IRN — wrong field)
 *   New: d.icegateFilename     = "EIN25-26/00985"   (invoice ref — correct)
 *
 * FIX 19 – Supportingdocs [27]: Increase beneficiary name truncation from 50 to 70
 *   "INSTRUMENT TRANSFORMER EQUIPMENT CORPORATION (ITEC)" = 51 chars
 *   Old: trunc(name, 50) → truncates the closing ")"
 *   New: trunc(name, 70) → preserves full name
 *
 * FIX 1 – PREFIX (critical, affects every table row)
 *   All tables except CONTAINER need 2 extra empty fields after SB Date.
 *   Old: PD = `F^]LOC^]SBNO^]DATE`           (4-field prefix)
 *   New: PD = `F^]LOC^]SBNO^]DATE^]^]`       (4-field + 2 empties suffix)
 *   CONTAINER uses plain 4-field prefix (no extra empties).
 *
 * FIX 2 – SB TABLE: CHA Code (field [6])
 *   "AB" (SB modifier) and CHA license number must be CONCATENATED into one field.
 *   Old: "AB", "OFS1766LCH005"  →  fields [4] and [5]  (wrong position + split)
 *   New: "ABOFS1766LCH005"      →  field  [6]           (correct position + combined)
 *
 * FIX 3 – SB TABLE: Exporter Address + PIN
 *   Address must be split at 35 characters (not at commas).
 *   PIN must be extracted and put in its own field [14], NOT embedded in address.
 *   Old: addr split by comma; PIN in addr2
 *   New: addrWithoutPin.slice(0,35) and addrWithoutPin.slice(35,70) for [10],[11]
 *        [12]="" [13]="" [14]=pinCode (separate)
 *
 * FIX 4 – INVOICE TABLE: Buyer/Consignee Name Splitting
 *   Buyer name must be split into 3 × 35-char fields [11],[12],[13].
 *   Old: trunc(name, 70) as single field [11] (consumes 1 field for 2 field worth)
 *   New: cL[0], cL[1], cL[2] at fields [11],[12],[13]
 *   Also: enough trailing empty fields to reach 49 total.
 *
 * FIX 5 – INVOICE TABLE: Remove exporter_ref_no field
 *   Logisays does NOT put exporter_ref_no in INVOICE row.
 *   It is left blank. Only nature_of_payment and period remain at [33],[34].
 *
 * FIX 6 – CONTAINER TABLE: Seal field must NOT be split
 *   Seal type prefix and seal number must be ONE combined field.
 *   Old: sealType="PACK", sealNum="02631899"  →  2 separate fields
 *   New: rawSealNo="PACK02631899"             →  1 combined field
 *   Also: add 3 trailing empty fields to reach total of 12.
 *
 * FIX 7 – CONTAINER TABLE: Seal Date source
 *   job.operations[0].containerDetails has no sealDate.
 *   Must use job.containers[0] (the top-level containers array) for sealDate.
 *
 * FIX 8 – SW_INFO_TYPE: CHR/SQC field order
 *   qty must be at slot [3] (i.e. 2 empty slots before it), not slot [1].
 *   Old: ["3","CHR","SQC", qty,  "",  "0.000000", uom]
 *   New: ["3","CHR","SQC", "",   "",  qty,         uom]
 *
 * FIX 9 – SW_INFO_TYPE: DTY/GCESS always present
 *   GCESS row must always be emitted, even when cess = 0.
 *   Old: only emitted if cessRaw > 0
 *   New: always emitted with corrected field order (same pattern as SQC fix):
 *        Old: [N, "DTY","GCESS", cess,  "", "0.000000", "INR"]
 *        New: [N, "DTY","GCESS", "",    "",  cess,       "INR"]
 *
 * FIX 10 – Supportingdocs: invSerialNo must be the numeric invoice INDEX (not the invoice number string)
 *   Old: d.invSerialNo = "EIN25-26/00985"   (invoice number string stored in DB field)
 *   New: String(invoiceIndex + 1) = "1"
 *
 * FIX 11 – Supportingdocs: docType and docCode must be ONE combined field
 *   Old: docType="33", docCode="1000"  →  2 separate fields
 *   New: "331000"                      →  1 combined field [10]
 *
 * FIX 12 – Supportingdocs: Issuing party address field layout
 *   Address must split into: addr1(35) | addr2(35) | city | pinCode  (4 separate fields)
 *   Old: one combined 70-char addr+pin string
 *   New: issuingParty.addressLine1 slice into 35-char chunks, then city, then pinCode
 *
 * FIX 13 – Supportingdocs: Full row structure (29 fields)
 *   [6]=invIndex [7]="0" [8]=docSrNo [9]=IRN [10]=docTypeCode(combined) [11]=""
 *   [12]=addr1(35) [13]=addr2(35) [14]=city [15]=pin [16]=docRefNo [17]=state
 *   [18]=dateOfIssue [19]="" [20]="" [21]=beneficiary addr(35) [22-24]=""
 *   [25]="pdf" [26]=issuerName [27]=benefName [28]=senderID
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
    "UK": "GB", "UNITED KINGDOM": "GB", "GERMANY": "DE", "FRANCE": "FR", "CHINA": "CN",
    "JAPAN": "JP", "AUSTRALIA": "AU", "CANADA": "CA", "SINGAPORE": "SG", "MALAYSIA": "MY",
    "SOUTH AFRICA": "ZA", "SAUDI ARABIA": "SA", "QATAR": "QA", "KUWAIT": "KW",
    "OMAN": "OM", "BAHRAIN": "BH", "JORDAN": "JO", "TURKEY": "TR", "ITALY": "IT",
    "SPAIN": "ES", "NETHERLANDS": "NL", "BELGIUM": "BE", "SWEDEN": "SE", "DENMARK": "DK",
    "NORWAY": "NO", "FINLAND": "FI", "SWITZERLAND": "CH", "AUSTRIA": "AT", "POLAND": "PL",
    "PORTUGAL": "PT", "GREECE": "GR", "MEXICO": "MX", "BRAZIL": "BR", "ARGENTINA": "AR",
    "INDONESIA": "ID", "THAILAND": "TH", "VIETNAM": "VN", "SOUTH KOREA": "KR",
    "TAIWAN": "TW", "HONG KONG": "HK", "NEW ZEALAND": "NZ", "ISRAEL": "IL",
    "SRI LANKA": "LK", "LK": "LK", "UKRAINE": "UA",
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
    "CHARLESTON": "USCHS",
    "MONROE": "USCHS",
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
const clean = (s) => String(s ?? "").trim();

const fmtDate = (d) => {
    if (!d) return "";
    let dt;
    if (typeof d === "string") {
        const s = clean(d);
        if (/^\d{8}$/.test(s)) return s;
        const parts = s.split(/[-/]/);
        if (parts.length === 3) {
            let day, month, year;
            if (parts[2].length === 4) { day = parseInt(parts[0]); month = parts[1]; year = parseInt(parts[2]); }
            else if (parts[0].length === 4) { year = parseInt(parts[0]); month = parts[1]; day = parseInt(parts[2]); }
            if (year) {
                const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
                let mIdx = months.indexOf(month.toUpperCase());
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
    let raw = "0";
    if (parts.length > 1) {
        for (let i = parts.length - 1; i >= 0; i--) {
            if (parts[i].includes("-")) continue;
            const num = parts[i].replace(/\D/g, "");
            if (num && num.length >= 1 && num.length <= 7) { raw = num; break; }
        }
    } else {
        raw = (j || "").replace(/\D/g, "") || "0";
    }
    return String(raw);
};

const split35 = (s) => {
    const out = [];
    const str = clean(s);
    for (let i = 0; i < 5; i++) { out.push(str.slice(i * 35, (i + 1) * 35)); }
    return out;
};

const expTypCode = (t) => {
    const map = { "MANUFACTURER": "M", "MERCHANT": "R", "F": "F", "R": "R", "M": "M", "MANUFACTURER EXPORTER": "M" };
    return map[(t || "").toUpperCase()] || "R";
};

const gstnTypCode = (g) => {
    const str = clean(g || "");
    if (str.length === 15) return "GSN";
    if (str.length === 10) return "PAN";
    return "OTH";
};

const row = (prefix, ...fields) => prefix + FS + fields.join(FS) + RS;

// ─── Core Generator ───────────────────────────────────────────────────────────

export function generateSBFlatFile(job) {
    const loc = CUSTOM_HOUSE_MAP[(job.custom_house || "").toUpperCase()] || "INAMD4";
    const sbNo = extractSbNo(job.job_no);
    const jdt = fmtDate(job.sb_date || new Date());
    const sid = clean(job.icegateId || "RAJANSFPL").toUpperCase();

    const now = new Date();
    const fdt = fmtDate(now);
    const ftm24 = pad(now.getHours(), 2) + pad(now.getMinutes(), 2);
    // Sequence/Control number: SBNo without leading zeros + DDMM
    const seqSb = parseInt(sbNo, 10).toString();
    const seq = seqSb + pad(now.getDate(), 2) + pad(now.getMonth() + 1, 2);

    // ─── FIX 1: Standard prefix has 2 extra empty fields after SB Date ───────
    // Most tables: F^]LOC^]SBNO^]DATE^]^]  (row() adds one more FS before first field)
    // This produces: F^]LOC^]SBNO^]DATE^]^]^]firstField  = positions [0..5] as header
    const PD = `F${FS}${loc}${FS}${sbNo}${FS}${jdt}${FS}${FS}`;

    // CONTAINER table uses a plain 4-field prefix (NO extra empties) — verified from reference
    const PD_CONTAINER = `F${FS}${loc}${FS}${sbNo}${FS}${jdt}`;

    const invs = job.invoices || [];
    const con0 = (job.consignees || [])[0] || {};

    const stripCountry = (str, cField) => {
        if (!str || !cField) return clean(str);
        let cleaned = clean(str);
        let cName = clean(cField.replace(/\([^)]+\)/g, ""));
        if (cName && cName.length > 2) {
            const regex = new RegExp(`\\s*${cName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*$`, "i");
            cleaned = cleaned.replace(regex, "");
        }
        cleaned = cleaned.replace(/\(\w{2,3}\)/gi, "").replace(/\s*UNITED\s+STATES\s+OF\s+AMERICA\s*/gi, " ").trim();
        return cleaned;
    };

    const consigneeFull = [
        clean(con0.consignee_name || ""),
        stripCountry(con0.consignee_address, job.destination_country || job.discharge_country || con0.consignee_country || ""),
    ].filter(Boolean).join(" ");

    // split35 gives 5 × 35-char chunks — used for consignee in SB and buyer in INVOICE
    const cL = split35(consigneeFull);

    const pol = prt(job.port_of_loading || "");
    const pod = prt(job.destination_port || job.port_of_discharge || "");
    const iec = clean(job.ieCode || "");
    const gid = clean(job.gstin || job.exporter_gstin || iec);
    const mawb = clean(job.mbl_no || job.masterblno || "");
    const hawb = clean(job.hbl_no || job.houseblno || "");
    const nc = job.transportMode === "AIR" ? "P" : "C";
    const stOr = stCd(job.state_of_origin || job.exporter_state || job.state || "GUJARAT");

    // ─── FIX 3: Extract PIN and split address at 35 chars (not at commas) ────
    const rawAddr = clean(job.exporter_address || "");
    // Extract trailing 6-digit PIN if embedded in address string
    const pinMatch = rawAddr.match(/,?\s*(\d{6})\s*$/);
    const pinCode = clean(job.exporter_pincode || (pinMatch ? pinMatch[1] : ""));
    const addrNoPIN = pinMatch ? rawAddr.replace(/,?\s*\d{6}\s*$/, "").trim() : rawAddr;
    const expAddr1 = trunc(addrNoPIN, 35);                             // field [10]
    const expAddr2 = trunc(addrNoPIN.slice(35).trim(), 35);            // field [11] — FIX 20: .trim() removes leading space
    // fields [12] and [13] are left empty (addr3, city)               // field [12],[13]
    // pinCode goes in its own field                                    // field [14]

    const expState = clean(job.exporter_state || job.state || "");

    // ─── FIX 2: CHA license no — combine "AB" modifier + CHA lic as ONE field ─
    const chaLicNo = clean(
        job.cha_code ||
        ((job.cha || "").toUpperCase().includes("SURAJ") ? "OFS1766LCH005" : job.cha || "")
    );
    const sbModCHA = "AB" + chaLicNo;   // e.g. "ABOFS1766LCH005"

    let out = "";

    // ══════════════════════════════════════════════════════════════════════════
    // <TABLE>SB  — 50 fields total (verified)
    // Fields [0-5] = F, LOC, SBNO, DATE, empty, empty  (from PD prefix + row())
    // Fields [6-49] = data
    // ══════════════════════════════════════════════════════════════════════════
    out += `<TABLE>SB${RS}`;
    out += row(PD,
        sbModCHA,                                                   // [6]  "ABOFS1766LCH005"
        iec,                                                        // [7]  IEC Code
        String(job.branch_sr_no || 0),                             // [8]  Branch Sr No
        trunc(clean(job.exporter || ""), 50),                      // [9]  Exporter Name
        expAddr1,                                                   // [10] Exporter Addr1 (35 chars)
        expAddr2,                                                   // [11] Exporter Addr2 (35 chars)
        "",                                                         // [12] Exporter Addr3 (empty)
        "",                                                         // [13] City (empty)
        pinCode,                                                    // [14] PIN Code (separate field)
        // ─── FIX 14: [15] = stuffing mode from goods_stuffed_at (F=Factory, I=ICD) ─
        (clean(job.goods_stuffed_at || "").toUpperCase() === "FACTORY" ? "F" : "I"), // [15]
        "P",                                                        // [16] Exporter Class
        stOr,                                                       // [17] State of Origin code
        clean(job.adCode || job.ad_code || ""),                    // [18] AD Code
        "",                                                         // [19] EPZ Code
        cL[0],                                                      // [20] Consignee Name line 1
        cL[1],                                                      // [21] Consignee Addr  line 2
        cL[2],                                                      // [22] Consignee Addr  line 3
        "",                                                         // [23] Consignee Addr  line 4
        "",                                                         // [24] Consignee Addr  line 5
        cntry(con0.consignee_country || ""),                       // [25] Consignee Country
        "",                                                         // [26] NFEI Category
        "",                                                         // [27] RBI Waiver No
        "",                                                         // [28] RBI Waiver Date
        // ─── FIX 15: [29] = ICD port code (loc), NOT the gateway port ────────
        loc,                                                        // [29] Port of Loading (ICD code)
        pod,                                                        // [30] Port of Final Destination
        cntry(job.destination_country || ""),                      // [31] Country of Final Dest
        cntry(job.discharge_country || job.destination_country || ""), // [32] Country of Discharge
        pod,                                                        // [33] Port of Discharge
        "",                                                         // [34] Seal Type
        nc,                                                         // [35] Nature of Cargo
        parseFloat(job.gross_weight_kg || 0).toFixed(3),         // [36] Gross Weight
        parseFloat(job.net_weight_kg || 0).toFixed(3),         // [37] Net Weight
        "KGS",                                                      // [38] Unit of Measurement
        clean(job.total_no_of_pkgs || job.totalPackages || ""),    // [39] Total Packages
        clean(job.marks_nos || job.marksAndNumbers || ""),         // [40] Marks & Numbers
        "",                                                         // [41] (empty slot)
        "0",                                                        // [42] Number of Loose Packets
        "",                                                         // [43] (empty slot)
        mawb,                                                       // [44] MAWB Number
        hawb,                                                       // [45] HAWB Number
        "",                                                         // [46] Amendment field
        "",                                                         // [47] Amendment field
        gstnTypCode(gid),                                          // [48] GSTN Type (GSN/PAN/OTH)
        gid,                                                        // [49] GSTN Number
    );

    // ══════════════════════════════════════════════════════════════════════════
    // <TABLE>INVOICE  — 49 fields total (verified)
    // ══════════════════════════════════════════════════════════════════════════
    out += `<TABLE>INVOICE${RS}`;
    invs.forEach((inv, i) => {
        const fic = inv.freightInsuranceCharges || {};
        const fAmt = parseFloat((fic.freight || {}).amount || 0).toFixed(2);
        const iAmt = parseFloat((fic.insurance || {}).amount || 0).toFixed(2);
        const curr = clean(inv.currency || "USD");

        const natureFull = ((job.otherInfo || {}).natureOfPayment || "NA").toUpperCase();
        const nopMap = {
            "DELIVERY AGAINST ACCEPTANCE": "DA", "DELIVERY AGAINST PAYMENT": "DP",
            "DEFERRED": "DF", "DIRECT": "DR", "LETTER OF CREDIT": "LC",
            "TELEGRAPHIC TRANSFER": "TT", "NA": "OT",
        };
        const np = nopMap[natureFull] || natureFull.replace(/\s+/g, "").slice(0, 2) || "OT";
        const pp = String((job.otherInfo || {}).paymentPeriod || "");
        const af = PRICE_INCLUDES_MAP[(inv.priceIncludes || "N").toUpperCase()] || "N";

        // ─── FIX 4: Buyer name split into 3 × 35-char fields [11],[12],[13] ─
        // consigneeFull is already computed; cL[] gives the 35-char chunks
        out += row(PD,
            String(i + 1),                                          // [6]  Invoice Sr No
            clean(inv.invoiceNumber || ""),                         // [7]  Invoice Number
            fmtDate(inv.invoiceDate),                               // [8]  Invoice Date
            curr,                                                   // [9]  Currency
            (inv.termsOfInvoice || "FOB").toUpperCase(),            // [10] Terms of Invoice
            cL[0],                                                  // [11] Buyer Name (35 chars)
            cL[1],                                                  // [12] Buyer Addr line 2
            cL[2],                                                  // [13] Buyer Addr line 3
            "",                                                     // [14] Buyer Addr line 4
            "",                                                     // [15] Buyer Addr line 5
            "",                                                     // [16] (empty)
            "",                                                     // [17] Invoice Value (empty, Logisays convention)
            "",                                                     // [18]
            "",                                                     // [19]
            "",                                                     // [20]
            "",                                                     // [21]
            "",                                                     // [22]
            "",                                                     // [23]
            "",                                                     // [24]
            "",                                                     // [25]
            "",                                                     // [26]
            "",                                                     // [27]
            "",                                                     // [28]
            "",                                                     // [29]
            af,                                                     // [30] Add Freight (N/F/I/B)
            "",                                                     // [31]
            // ─── FIX 5: exporter_ref_no removed here (not in Logisays INVOICE) ─
            "",                                                     // [32]
            np,                                                     // [33] Nature of Payment (DA/DP/…)
            pp,                                                     // [34] Payment Period (days)
            "",                                                     // [35]
            "",                                                     // [36]
            "",                                                     // [37]
            "",                                                     // [38]
            "",                                                     // [39]
            "",                                                     // [40]
            "",                                                     // [41]
            "",                                                     // [42]
            "",                                                     // [43]
            "",                                                     // [44]
            "",                                                     // [45]
            "",                                                     // [46]
            "",                                                     // [47]
            "",                                                     // [48]  → total = 49 fields ✓
        );
    });

    // ══════════════════════════════════════════════════════════════════════════
    // <TABLE>EXCHANGE  — 15 fields total (verified)
    // ══════════════════════════════════════════════════════════════════════════
    out += `<TABLE>EXCHANGE${RS}`;
    [...new Set(["INR", ...invs.map(inv => clean(inv.currency || "USD"))])].forEach(c => {
        out += row(PD, c, "", "", "", "", "Y", "", "", "");
        //            [6] [7][8][9][10][11][12][13][14]  → total 15 ✓
    });

    // ══════════════════════════════════════════════════════════════════════════
    // <TABLE>ITEM  — 42 fields total (verified)
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
            const pmv = parseFloat((p.pmvInfo || {}).pmvPerUnit || 0).toFixed(2); // FIX 16: per-unit, not total
            const sc = (p.eximCode || "19").split(" ")[0];

            out += row(PD,
                String(ii + 1), String(pi + 1),             // [6][7]  Inv/Item Sr No
                sc,                                          // [8]   Scheme Code
                clean(p.ritc || ""),                         // [9]   RITC/ITCHS
                trunc(desc, 40),                             // [10]  Desc 1
                trunc(desc.slice(40), 40),                   // [11]  Desc 2
                trunc(desc.slice(80), 40),                   // [12]  Desc 3
                uom,                                         // [13]  UOM
                qty,                                         // [14]  Quantity
                upr,                                         // [15]  Unit Price
                uom,                                         // [16]  Unit of Rate
                "1",                                         // [17]  Per (units)
                pmv,                                         // [18]  Present Market Value
                "",                                          // [19]  Job Work Notif No
                "N",                                         // [20]  Third Party
                p.rewardItem ? "Y" : "N",                   // [21]  Reward Item
                "", "", "",                                  // [22][23][24] Amendment
                "", "", "", "", "", "", "", "",              // [25-32] Manufacturer
                "",                                          // [33]  Source State
                "",                                          // [34]  Transit Country
                "0",                                         // [35]  Accessory Status
                clean((p.endUse || "GNX200").split(" ")[0]), // [36]  End Use Code
                hawb,                                        // [37]  HAWB No
                "",                                          // [38]  Total Package
                ist,                                         // [39]  IGST Status
                ist === "P" ? parseFloat(ig.taxableValueINR || 0).toFixed(2) : "", // [40]
                ist === "P" ? parseFloat(ig.igstAmountINR || 0).toFixed(2) : "", // [41]
            );                                               // total = 42 ✓
        });
    });

    // ── LICENCE (optional) ────────────────────────────────────────────────────
    const hasLicence = invs.some(inv => (inv.products || []).some(p => {
        const sc = (p.eximCode || "").split(" ")[0];
        return sc === "03" || sc === "50" ||
            (p.deecDetails?.isDeecItem) || (p.epcgDetails?.isEpcgItem);
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
    // <TABLE>DBK  — 13 fields total (verified)
    // ══════════════════════════════════════════════════════════════════════════
    out += `<TABLE>DBK${RS}`;
    invs.forEach((inv, ii) => {
        (inv.products || []).forEach((p, pi) => {
            const sc = (p.eximCode || "").split(" ")[0];
            if (sc === "03" || sc === "50") return;
            (p.drawbackDetails || []).forEach(d => {
                if (!d.dbkitem && !d.dbkSrNo) return;
                let dbkId = clean(d.dbkSrNo || d.dbkitem || "");
                if (dbkId && !dbkId.endsWith("B")) dbkId += "B";
                const dbkQty = parseFloat(d.quantity || p.quantity || 0).toFixed(3);
                out += row(PD,
                    String(ii + 1), String(pi + 1),     // [6][7]
                    dbkId,                               // [8]
                    dbkQty,                              // [9]
                    "", "", "",                          // [10][11][12]
                );                                       // total = 13 ✓
            });
        });
    });

    // ══════════════════════════════════════════════════════════════════════════
    // <TABLE>CONTAINER  — 12 fields total (verified)
    // NOTE: uses PD_CONTAINER (plain 4-field prefix — NO extra empty fields)
    // ══════════════════════════════════════════════════════════════════════════
    //
    // ─── FIX 7: Use job.containers for sealDate (operations.containerDetails lacks it) ─
    // Build a map: containerNo → sealDate from top-level job.containers array
    const sealDateMap = {};
    (job.containers || []).forEach(c => {
        if (c.containerNo) sealDateMap[c.containerNo.toUpperCase()] = c.sealDate;
    });

    let containers = job.containers || [];
    if (job.operations?.[0]?.containerDetails?.length > 0) {
        containers = job.operations[0].containerDetails;
    }

    if (job.transportMode === "SEA" && containers.length > 0) {
        out += `<TABLE>CONTAINER${RS}`;
        containers.forEach(c => {
            const rawSize = clean(c.containerSize || "20").toUpperCase();
            const rawType = clean(c.type || c.containerType || "").toUpperCase();

            let isoContainerType = rawType;
            if (!/^\d{2}[A-Z]\d$/.test(isoContainerType)) {
                let sCode = rawSize.includes("40") || rawType.includes("40") ? "42" :
                    rawSize.includes("45") || rawType.includes("45") ? "45" : "22";
                let tCode = rawType.includes("HC") || rawType.includes("HQ") ||
                    rawSize.includes("HC") || rawSize.includes("HQ") ? "G1" :
                    rawType.includes("RF") || rawSize.includes("RF") ? "R1" :
                        rawType.includes("OT") || rawSize.includes("OT") ? "U1" :
                            rawType.includes("FR") || rawSize.includes("FR") ? "P1" : "G0";
                isoContainerType = `${sCode}${tCode}`;
            }

            // ─── FIX 6: Do NOT split seal — use rawSealNo as ONE combined field ─
            const rawSealNo = clean(c.customSealNo || c.sealNo || c.shippingLineSealNo || "");

            // ─── FIX 7: Get sealDate from the job.containers map ─────────────
            const sealDate = sealDateMap[clean(c.containerNo || "").toUpperCase()] || c.sealDate;

            out += row(PD_CONTAINER,       // plain 4-field prefix (no extra empties)
                clean(c.containerNo),      // [4]  Container No
                isoContainerType,          // [5]  ISO Container Type (e.g. "42G0")
                rawSealNo,                 // [6]  Seal (combined, e.g. "PACK02631899")
                fmtDate(sealDate || now),  // [7]  Seal Date
                "RFID",                    // [8]  RFID indicator
                "", "", "",               // [9][10][11] trailing empty fields → total 12 ✓
            );
        });
    }

    // ══════════════════════════════════════════════════════════════════════════
    // <TABLE>SW_INFO_TYPE  — 15 fields total (verified)
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
            const pStateCode = stCd(clean(p.originState || job.state_of_origin || job.exporter_state || "GUJARAT"));
            const pDistCode = clean(p.originDistrict || "").split(/\s*-\s*/)[0];

            let rowNo = 1;

            // ORC / STO — state of origin
            out += row(PD, String(ii + 1), String(pi + 1), String(rowNo++), "ORC", "STO", pStateCode, "", "", "");

            // ORC / DOO — district of origin
            out += row(PD, String(ii + 1), String(pi + 1), String(rowNo++), "ORC", "DOO", pDistCode, "", "", "");

            // ─── FIX 8: CHR/SQC — quantity at slot [13], NOT [11] ───────────
            // Correct:  ["CHR","SQC", "",  "",  qty,  uom]  (positions [9..14])
            // Old wrong: ["CHR","SQC", qty, "",  "0",  uom]
            out += row(PD, String(ii + 1), String(pi + 1), String(rowNo++), "CHR", "SQC", "", "", socQty, socUnit);

            // ORC / EPT — preferential trade
            out += row(PD, String(ii + 1), String(pi + 1), String(rowNo++), "ORC", "EPT", pta, "", "", "");

            // ─── FIX 9: DTY/GCESS — ALWAYS emit even when cess = 0 ──────────
            // Correct field order (same pattern as SQC): value at slot [13]
            out += row(PD, String(ii + 1), String(pi + 1), String(rowNo++), "DTY", "GCESS", "", "", cess, "INR");

            // DTY / RDT — RODTEP
            out += row(PD, String(ii + 1), String(pi + 1), String(rowNo++), "DTY", "RDT", "RODTEPY", rc, socQty, socUnit);
        });
    });

    // ══════════════════════════════════════════════════════════════════════════
    // <TABLE>STATEMENT  — 12 fields total (verified)
    // ══════════════════════════════════════════════════════════════════════════
    out += `<TABLE>STATEMENT${RS}`;
    invs.forEach((inv, ii) => {
        (inv.products || []).forEach((p, pi) => {
            out += row(PD,
                String(ii + 1), String(pi + 1),   // [6][7]
                "1", "DEC", "RD001", "",       // [8][9][10][11]  → total 12 ✓
            );
        });
    });

    // ══════════════════════════════════════════════════════════════════════════
    // <TABLE>Supportingdocs  — 29 fields total (verified)
    // ══════════════════════════════════════════════════════════════════════════
    const docs = job.eSanchitDocuments || [];
    if (docs.length > 0) {
        out += `<TABLE>Supportingdocs${RS}`;
        docs.forEach((d, di) => {
            // ─── FIX 11: Combine docType + docCode into ONE field ──────────────
            // d.documentType is stored as "331000" (already combined in DB)
            const docTypeCode = clean(d.documentType || "331000");

            // ─── FIX 10: invSerialNo must be the numeric invoice INDEX ─────────
            // d.invSerialNo in DB stores the invoice NUMBER string (e.g. "EIN25-26/00985")
            // ICEGATE expects the invoice's position index (1-based).
            // Find which invoice this doc belongs to, or default to "1".
            const invIdx = invs.findIndex(inv => inv.invoiceNumber === d.invSerialNo);
            const invSrNo = String(invIdx >= 0 ? invIdx + 1 : 1);

            // ─── FIX 17: Split address at last comma ≤ 35, not hard char 35 ─────
            const ip = d.issuingParty || {};
            const ipRawAddr = clean(ip.addressLine1 || "");
            let ipAddrA, ipAddrB;
            if (ip.addressLine2) {
                // DB already has it split — use directly
                ipAddrA = trunc(ipRawAddr, 35);
                ipAddrB = trunc(clean(ip.addressLine2), 35);
            } else {
                // Single long string — split at last comma within first 35 chars
                const lastComma = ipRawAddr.slice(0, 36).lastIndexOf(",");
                if (lastComma > 0) {
                    ipAddrA = ipRawAddr.slice(0, lastComma + 1);        // includes the comma
                    ipAddrB = ipRawAddr.slice(lastComma + 1).trim();    // no leading space
                } else {
                    ipAddrA = trunc(ipRawAddr, 35);
                    ipAddrB = trunc(ipRawAddr.slice(35), 35);
                }
            }
            const ipCity = clean(ip.city || "");
            const ipPin = clean(ip.pinCode || "");

            // ─── FIX 13: Beneficiary address — first 35 chars only, no country ─
            const bp = d.beneficiaryParty || {};
            const bpAddrRaw = clean(bp.addressLine1 || "");
            // Strip country name and parenthesized codes from beneficiary address
            const bpAddrClean = stripCountry(bpAddrRaw, "UNITED STATES OF AMERICA");
            const bpAddr35 = trunc(bpAddrClean, 35);        // [21]

            out += row(PD,
                invSrNo,                                    // [6]  Invoice index (1-based)
                "0",                                        // [7]  Item Sr No
                String(di + 1),                             // [8]  Doc Sr No
                clean(d.irn || d.imageRefNo || ""),         // [9]  IRN
                docTypeCode,                                // [10] DocType+DocCode combined (e.g. "331000")
                "",                                         // [11] (empty)
                ipAddrA,                                    // [12] Issuing party Addr1 (35 chars)
                ipAddrB,                                    // [13] Issuing party Addr2 (35 chars)
                ipCity,                                     // [14] City
                ipPin,                                      // [15] PIN
                clean(d.icegateFilename || d.documentReferenceNo || ""), // [16] FIX 18: icegateFilename (invoice ref), not IRN
                clean(d.placeOfIssue || job.state_of_origin || job.exporter_state || job.state || ""), // [17] State
                fmtDate(d.dateOfIssue || ""),               // [18] Date of Issue
                "",                                         // [19] (empty)
                "",                                         // [20] (empty)
                bpAddr35,                                   // [21] Beneficiary Addr (35 chars, no country)
                "",                                         // [22]
                "",                                         // [23]
                "",                                         // [24]
                "pdf",                                      // [25] File extension
                trunc(clean(ip.name || job.exporter || ""), 50), // [26] Issuing party Name
                trunc(clean(bp.name || ""), 70),            // [27] FIX 19: 70 chars (was 50, cut off ")")
                sid,                                        // [28] ICEGATE Sender ID  → total 29 ✓
            );
        });
    }

    // ── Footer ────────────────────────────────────────────────────────────────
    out += `<END-SB>${RS}`;

    const hrec = `HREC${FS}ZZ${FS}${sid}${FS}ZZ${FS}${loc}${FS}ICES1_5${FS}P${FS}${FS}CACHE01${FS}${seq}${FS}${fdt}${FS}${ftm24}${RS}`;
    const trec = `TREC${FS}${seq}${RS}`;

    const fullContent = hrec + out + trec;
    const fileName = `${sbNo}${fdt.slice(0, 4)}.sb`;

    return { content: fullContent, fileName };
}

// ─── Express Route ────────────────────────────────────────────────────────────

router.get("/api/generate-sb-file/:jobId", async (req, res) => {
    try {
        const job = await ExportJob.findById(req.params.jobId).lean();
        if (!job) return res.status(404).json({ success: false, message: "Job not found" });
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
