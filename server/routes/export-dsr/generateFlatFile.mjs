/**
 * ICEGATE ICES 1.5 – Shipping Bill (CACHE01) Flat File Generator
 * Matches message format spec v2.8 and verified against sample .sb files.
 *
 * Field Separator : ASCII 0x1D (Group Separator / ^])
 * Record Separator: CRLF (\r\n)
 * File naming     : <4-digit-jobno><YYYY>.sb  (e.g. 00012025.sb)
 *
 * Tables generated (in order):
 *   HREC → <TABLE>SB → <TABLE>INVOICE → <TABLE>EXCHANGE → <TABLE>ITEM
 *   → <TABLE>DBK → <TABLE>SW_INFO_TYPE → <TABLE>STATEMENT
 *   → <TABLE>Supportingdocs (if eSanchitDocuments present) → <END-SB> → TREC
 */

import express from "express";
import ExportJob from "../../model/export/ExJobModel.mjs";

const router = express.Router();

// ─── Lookup Maps ─────────────────────────────────────────────────────────────

const CUSTOM_HOUSE_MAP = {
    "AHMEDABAD AIR CARGO": "INAMD4",
    "ICD SABARMATI": "INSBI6",
    "ICD SACHANA": "INJKA6",
    "ICD VIROCHAN NAGAR": "INVCN6",
    "THAR DRY PORT": "INSAU6",
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
    "SRI LANKA": "LK", "LK": "LK",
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
};

const PRICE_INCLUDES_MAP = {
    "BOTH": "B", "FREIGHT": "F", "INSURANCE": "I", "NONE": "N",
    "B": "B", "F": "F", "I": "I", "N": "N",
};

// ─── Utility Functions ────────────────────────────────────────────────────────

const FS = "\x1D";   // ASCII Group Separator  ^]
const RS = "\r\n";   // CRLF record delimiter

const pad = (s, n) => String(s ?? "").padStart(n, "0");
const trunc = (s, n) => String(s ?? "").slice(0, n);
const clean = (s) => String(s ?? "").trim();

/** Returns YYYYMMDD for all fields (HREC, Invoice, etc.) */
const fmtDate = (d) => {
    if (!d) return "";
    let dt;
    if (typeof d === "string") {
        const s = clean(d);
        if (/^\d{8}$/.test(s)) return s; // already YYYYMMDD
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

/** Returns DDMMYYYY for Prefix */
const fmtDDMMYYYY = (d) => {
    const ymd = fmtDate(d);
    if (!ymd) return "";
    return ymd.slice(6, 8) + ymd.slice(4, 6) + ymd.slice(0, 4); // DD + MM + YYYY
};

const cntry = (n) => {
    if (Array.isArray(n)) n = n[0];
    if (n && n.country) return clean(n.country).slice(0, 2).toUpperCase();
    if (typeof n === 'string') {
        const match = n.match(/\(([^)]+)\)/);
        if (match) return clean(match[1]).toUpperCase();
        return COUNTRY_CODE_MAP[n.toUpperCase()] || clean(n).slice(0, 2).toUpperCase();
    }
    return "";
};

const prt = (n) => {
    if (Array.isArray(n)) n = n[0];
    if (n && n.uneceCode) return clean(n.uneceCode).toUpperCase();
    if (typeof n === 'string') {
        const match = n.match(/\(([^)]+)\)/);
        if (match) return clean(match[1]).toUpperCase();
        return PORT_CODE_MAP[n.toUpperCase()] || clean(n).slice(0, 6).toUpperCase();
    }
    return "";
};

const stCd = (n) => STATE_CODE_MAP[(n || "").toUpperCase()] || "24";

const jobNo4 = (j) => {
    const parts = (j || "").split("/");
    return parts.length > 1 ? pad(parts[1], 4) : pad((j || "").replace(/\D/g, ""), 4);
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

/**
 * Build one data row.
 * prefix = "F^]LOC^]JOBNO^]JOBDATE^]^]" (5 fields, NO trailing ^])
 * Result: prefix + ^] + f1 + ^] + f2 + ... + CRLF
 */
const row = (prefix, ...fields) => prefix + FS + fields.join(FS) + RS;

// ─── Core Generator ───────────────────────────────────────────────────────────

export function generateSBFlatFile(job) {
    const loc = CUSTOM_HOUSE_MAP[(job.custom_house || "").toUpperCase()] || "INAMD4";
    const j4 = jobNo4(job.job_no);
    const jdtPrefix = fmtDDMMYYYY(job.sb_date || new Date());
    const jdt = fmtDate(job.sb_date || new Date());
    const sid = clean(job.cha || "SURAJ").replace(/\s+/g, "").slice(0, 5).toUpperCase()
        + clean(job.branch_code || "AMD").toUpperCase();

    // Sequence number used in HREC and TREC (job number + DDMM of SB date)
    const seq = j4 + jdt.slice(6, 8) + jdt.slice(4, 6);

    // PH (Header Prefix): F^]LOC^]JOBNO4^]JOBDATE^]^]^] (6 fields total)
    // PD (Data Prefix): F^]LOC^]JOBNO4^]JOBDATE^] (4 fields total)
    const now = new Date();
    const fdt = fmtDate(now); // YYYYMMDD for HREC
    const ftm = pad(now.getHours(), 2) + pad(now.getMinutes(), 2); // HHMM for HREC

    const PH = `F${FS}${loc}${FS}${j4}${FS}${jdtPrefix}${FS}${FS}`;
    const PD = `F${FS}${loc}${FS}${j4}${FS}${jdtPrefix}`;

    const invs = job.invoices || [];
    const con0 = (job.consignees || [])[0] || {};
    const byr = (job.buyerThirdPartyInfo || {}).buyer || {};
    const adr = clean(job.exporter_address || "");
    const cL = split35(clean(con0.consignee_name || ""));
    const bNm = clean(byr.name || "");
    const bL = split35(bNm + " " + clean(byr.addressLine1 || ""));
    const pol = prt(job.port_of_loading || "");
    const pod = prt(job.destination_port || job.port_of_discharge || "");
    const iec = clean(job.ieCode || "");
    const gid = clean(job.gstin || job.exporter_gstin || iec);
    const mawb = clean(job.mbl_no || job.masterblno || "");
    const hawb = clean(job.hbl_no || job.houseblno || "");
    const nc = job.transportMode === "AIR" ? "P" : (job.nature_of_cargo || "C").slice(0, 2);
    const stOr = stCd(job.state_of_origin || job.state || "GUJARAT");

    let out = "";

    // ── HREC ────────────────────────────────────────────────────────────────────
    // HREC^]ZZ^]<SenderID>^]ZZ^]<ReceiverID/LocationCode>^]ICES1_5^]P^]^]CACHE01^]<Seq>^]<Date>^]<Time>
    out += `HREC${FS}ZZ${FS}${sid}${FS}ZZ${FS}${loc}${FS}ICES1_5${FS}P${FS}${FS}CACHE01${FS}${seq}${FS}${fdt}${FS}${ftm}${RS}`;

    // ── <TABLE>SB (Part 1/32) ────────────────────────────────────────────────────
    // Fields 1-6 come from prefix (PH); fields 7-50 follow.
    out += `<TABLE>SB${RS}`;
    out += row(PH,
        clean(job.cha_code || ((job.cha || "").toUpperCase().includes("SURAJ") ? "AAOFS1766LCH005" : job.cha || "")), // 7. CHA License Number
        iec,                                            //  8. IEC Code
        String(job.branch_sr_no || 0),                 //  9. Branch Sr No
        trunc(clean(job.exporter || ""), 50),           // 10. Exporter Name
        trunc(adr, 35),                                 // 11. Exporter Addr1
        trunc(adr.slice(35), 35),                       // 12. Exporter Addr2
        "",                                             // 13. City
        "",                                             // 14. State
        clean(job.exporter_pincode || ""),              // 15. PIN
        expTypCode(job.exporter_type || ""),            // 16. Type of Exporter (F/R)
        "P",                                            // 17. Exporter Class (P=Private)
        stOr,                                           // 18. State of Origin
        clean(job.adCode || job.ad_code || ""),         // 19. Authorized Dealer Code
        "",                                             // 20. EPZ Code
        cL[0] || "",                                    // 21. Consignee Name (row 1)
        cL[1] || "",                                    // 22. Consignee Addr1
        cL[2] || "",                                    // 23. Consignee Addr2
        cL[3] || "",                                    // 24. Consignee Addr3
        "",                                             // 25. Consignee Addr4
        cntry(con0.consignee_country || ""),            // 26. Consignee Country
        "",                                             // 27. NFEI Category
        "", "",                                         // 28-29. RBI Waiver No/Date
        pol,                                            // 30. Port of Loading
        pod,                                            // 31. Port of Final Destination
        cntry(job.destination_country || ""),           // 32. Country of Final Destination
        cntry(job.discharge_country || job.destination_country || ""), // 33. Country of Discharge
        pod,                                            // 34. Port of Discharge
        "",                                             // 35. Seal Type
        nc,                                             // 36. Nature of Cargo (P for AIR)
        parseFloat(job.gross_weight_kg || job.grossWeight || job.gross_weight || 0).toFixed(3), // 37. Gross Weight
        parseFloat(job.net_weight_kg || job.netWeight || job.net_weight || 0).toFixed(3), // 38. Net Weight
        "KGS",                                          // 39. Unit of Measurement
        clean(job.total_no_of_pkgs || job.totalPackages || job.packages || ""), // 40. Total Number of Packages
        clean(job.marks_nos || job.marksAndNumbers || job.marksNumbers || ""), // 41. Marks & Numbers
        "",                                             // 42. Number of Loose Packets
        job.transportMode === "SEA" ? String((job.containers || []).length) : "", // 43. Number of Containers (blank for AIR)
        mawb,                                           // 44. MAWB Number
        hawb,                                           // 45. HAWB Number
        "", "", "",                                     // 46-48. Amendment fields (blank for fresh)
        gstnTypCode(gid),                               // 49. GSTN Type
        gid,                                            // 50. GSTN ID
    );

    // ── <TABLE>INVOICE (Part 2/32) ───────────────────────────────────────────────
    out += `<TABLE>INVOICE${RS}`;
    invs.forEach((inv, i) => {
        const fic = inv.freightInsuranceCharges || {};
        const fAmt = parseFloat((fic.freight || {}).amount || 0).toFixed(2);
        const iAmt = parseFloat((fic.insurance || {}).amount || 0).toFixed(2);
        const invVal = parseFloat(inv.invoiceValue || fic.totalValue || 0).toFixed(2);
        const curr = clean(inv.currency || "USD");

        // Nature of Payment Mapping: Map full string to 2-char code
        const natureFull = ((job.otherInfo || {}).natureOfPayment || "NA").toUpperCase();
        const nopMap = {
            "DELIVERY AGAINST ACCEPTANCE": "DA",
            "DELIVERY AGAINST PAYMENT": "DP",
            "DEFERRED": "DF",
            "DIRECT": "DR",
            "LETTER OF CREDIT": "LC",
            "TELEGRAPHIC TRANSFER": "TT",
            "NA": "OT"
        };
        const np = nopMap[natureFull] || natureFull.replace(/\s+/g, "").slice(0, 2) || "OT";
        const pp = String((job.otherInfo || {}).paymentPeriod || "");

        const af = PRICE_INCLUDES_MAP[(inv.priceIncludes || "N").toUpperCase()] || "N";

        out += row(PH,
            String(i + 1),                                //  7. Invoice Sr No
            clean(inv.invoiceNumber || ""),               //  8. Actual Invoice Number
            fmtDate(inv.invoiceDate),                     //  9. Invoice Date
            curr,                                         // 10. Invoice Currency
            (inv.termsOfInvoice || "FOB").toUpperCase(),  // 11. Nature of Contract
            trunc(bNm, 35),                               // 12. Buyer Name
            trunc(bL[0] || "", 35),                       // 13. Buyer Addr1
            trunc(bL[1] || "", 35),                       // 14. Buyer Addr2
            trunc(bL[2] || "", 35),                       // 15. Buyer Addr3
            trunc(bL[3] || "", 35),                       // 16. Buyer Addr4
            invVal,                                       // 17. Invoice Value
            fAmt !== "0.00" ? curr : "",                  // 18. Freight Currency
            fAmt !== "0.00" ? fAmt : "",                  // 19. Freight Amount
            "", "", "", "",                               // 20-23. Commission/Dummy
            iAmt !== "0.00" ? curr : "",                  // 24. Insurance Currency
            iAmt !== "0.00" ? iAmt : "",                  // 25. Insurance Amount
            "", "", "", "", "",                           // 26-30. Discount/Other/Dummy
            af,                                           // 31. Add Freight (F/I/B/N)
            String(inv.packing_charges || ""),            // 32. Packing Charges
            clean(job.exporter_ref_no || ""),             // 33. Exporter Contract Number
            np,                                           // 34. Nature of Payment
            pp,                                           // 35. Period of Payment (days)
            "",                                           // 36. Terms Place
        );
    });

    // ── <TABLE>EXCHANGE (Part 3/32) ──────────────────────────────────────────────
    // One row per unique currency. INR always first. Standard currencies → "Y".
    out += `<TABLE>EXCHANGE${RS}`;
    [...new Set(["INR", ...invs.map(inv => clean(inv.currency || "USD"))])].forEach(c => {
        // Fields: 7.CurrCode 8.CurrName 9.UnitInRs 10.Rate 11.EffDate 12.IsStandard 13-15.Amend
        out += row(PH, c, "", "", "", "", "Y", "", "", "");
    });

    // ── <TABLE>ITEM (Part 4/32) ──────────────────────────────────────────────────
    out += `<TABLE>ITEM${RS}`;
    invs.forEach((inv, ii) => {
        (inv.products || []).forEach((p, pi) => {
            const ig = p.igstCompensationCess || {};
            const igstRaw = (ig.igstPaymentStatus || "").toUpperCase();
            // If empty, contains "BOND", "NOT PAID", "NOT APPLICABLE", or "LUT" → LUT, else P
            const isLUT = !igstRaw || igstRaw.includes("BOND") || igstRaw.includes("NOT") || igstRaw === "LUT";
            const ist = isLUT ? "LUT" : "P";
            const desc = clean(p.description || "");
            const uom = clean(p.qtyUnit || "KGS");
            const qty = parseFloat(p.quantity || 0).toFixed(3);
            const upr = parseFloat(p.unitPrice || 0).toFixed(5);
            const pmv = parseFloat((p.pmvInfo || {}).totalPMV || 0).toFixed(2);
            const sc = (p.eximCode || "19").split(" ")[0];  // Scheme Code (e.g. "19")

            out += row(PD,
                String(ii + 1), String(pi + 1),               //  5-6.  Invoice Sr No / Item Sr No
                sc,                                            //  7.    Scheme Code
                clean(p.ritc || ""),                           //  8.    RITC/ITCHS Code
                trunc(desc, 40),                               //  9.    Description 1
                trunc(desc.slice(40), 40),                     // 10.    Description 2
                trunc(desc.slice(80), 40),                     // 11.    Description 3
                uom,                                           // 12.    Unit of Measurement
                qty,                                           // 13.    Quantity
                upr,                                           // 14.    Unit Price
                uom,                                           // 15.    Unit of Rate
                "01",                                          // 16.    No of Units (per)
                pmv,                                           // 17.    Present Market Value (Rs)
                "",                                            // 18.    Job Work Notification No
                "N",                                           // 19.    Third Party (N=No)
                p.rewardItem ? "Y" : "N",                     // 20.    Reward Item
                "", "", "",                                    // 21-23. Amendment (blank)
                "", "", "", "", "", "", "", "",                // 24-31. Manufacturer details (blank)
                "",                                            // 32.    Source State
                "",                                            // 33.    Transit Country
                "0",                                           // 34.    Accessory Status (0=none)
                clean((p.endUse || "GNX200").split(" ")[0]),    // 35.    End Use of Item (code only)
                hawb,                                          // 36.    HAWB No
                "",                                            // 37.    Total Package
                ist,                                           // 38.    IGST Payment Status (LUT or P)
                ist === "P" ? parseFloat(ig.taxableValueINR || 0).toFixed(2) : "", // 39. Taxable Value
                ist === "P" ? parseFloat(ig.igstAmountINR || 0).toFixed(2) : "", // 40. IGST Amount
            );
        });
    });

    // ── <TABLE>LICENCE (Part 11/32) ──────────────────────────────────────────────
    // Show LICENCE if Scheme Code is 03 (DEEC) or 50 (EPCG)
    const hasLicence = invs.some(inv => (inv.products || []).some(p => {
        const sc = (p.eximCode || "").split(" ")[0];
        return sc === "03" || sc === "50" || (p.deecDetails && p.deecDetails.isDeecItem) || (p.epcgDetails && p.epcgDetails.isEpcgItem);
    }));

    if (hasLicence) {
        out += `<TABLE>LICENCE${RS}`;
        invs.forEach((inv, ii) => {
            (inv.products || []).forEach((p, pi) => {
                const sc = (p.eximCode || "").split(" ")[0];
                let licSr = 1;
                const handleReg = (reg) => {
                    out += row(PD,
                        String(ii + 1), String(pi + 1),       // 5-6. Inv/Item Sr
                        String(licSr++),                      // 7. Sr No
                        clean(reg.regnNo || ""),              // 8. Registration No
                        fmtDate(reg.licDate),                 // 9. Registration Date
                        "1",                                  // 10. Item Sr No in Licence
                        parseFloat(p.deecDetails?.exportQtyUnderLicence || p.epcgDetails?.exportQtyUnderLicence || 0).toFixed(3), // 11. Lic Qty
                        parseFloat(p.quantity || 0).toFixed(3), // 12. Export Qty
                        expTypCode(job.exporter_type)         // 13. Exp Type
                    );
                };
                if (sc === "03" || (p.deecDetails && p.deecDetails.isDeecItem)) {
                    (p.deecDetails?.deec_reg_obj || []).forEach(handleReg);
                }
                if (sc === "50" || (p.epcgDetails && p.epcgDetails.isEpcgItem)) {
                    (p.epcgDetails?.epcg_reg_obj || []).forEach(handleReg);
                }
            });
        });
    }

    out += `<TABLE>DBK${RS}`;
    invs.forEach((inv, ii) => {
        (inv.products || []).forEach((p, pi) => {
            const sc = (p.eximCode || "").split(" ")[0];
            if (sc === "03" || sc === "50") return;
            if (!(p.eximCode || "").includes("19") && !(p.drawbackDetails && p.drawbackDetails.length > 0)) return;

            (p.drawbackDetails || []).forEach(d => {
                if (!d.dbkitem) return;
                out += row(PD,
                    String(ii + 1), String(pi + 1),            //  5-6.  Invoice Sr No / Item Sr No
                    clean(d.dbkSrNo || ""),                     //  7.    DBK Schedule Serial Number
                    parseFloat(d.quantity || p.quantity || 0).toFixed(3), // 8. Drawback Quantity
                    "", "", "",                                 // 9-11. Amendment (blank)
                );
            });
        });
    });

    const containers = job.containers || [];
    if (job.transportMode === "SEA" && containers.length > 0) {
        out += `<TABLE>CONTAINER${RS}`;
        containers.forEach(c => {
            out += row(PD,
                clean(c.containerNo),
                clean(c.type || "20").slice(0, 2),
                clean(c.type || "GP").slice(-2),
                clean(c.sealNo || c.shippingLineSealNo || ""),
                fmtDate(c.sealDate || now),
                clean(c.sealType || "RFID")
            );
        });
    }

    // ── <TABLE>SW_INFO_TYPE (Part 25/32) ─────────────────────────────────────────
    out += `<TABLE>SW_INFO_TYPE${RS}`;
    invs.forEach((inv, ii) => {
        (inv.products || []).forEach((p, pi) => {
            const qty = parseFloat(p.socQuantity || 0).toFixed(6);
            const uom = clean(p.socunit || "KGS");
            const rc = (p.rodtepInfo || {}).claim === "Yes" ? "Claimed" : "Not Claimed";
            const pta = clean((p.ptaFtaInfo || "NCPTI").split(" ")[0]);
            const cess = (p.compensationCessAmountINR || 0.000000).toFixed(6);

            // Origin State: use product-level originState, fallback to job-level
            const pStateRaw = clean(p.originState || job.state_of_origin || job.state || "GUJARAT");
            const pStateCode = stCd(pStateRaw);

            // Origin District: extract numeric code from "438 - AHMADABAD" format
            const pDistRaw = clean(p.originDistrict || "");
            const pDistCode = pDistRaw.split(/\s*-\s*/)[0] || "438";

            [
                ["1", "ORC", "STO", pStateCode, "", "", ""],
                ["2", "ORC", "DOO", pDistCode, "", "", ""],
                ["3", "CHR", "SQC", qty, "0.000000", uom, ""],
                ["4", "ORC", "EPT", pta, "", "", ""],
                ["5", "DTY", "GCESS", cess, "", "0.000000", "INR"],
                ["6", "DTY", "RDT", "RODTEPY", rc, qty, uom],
            ].forEach((r, rx) => {
                out += row(PD, String(ii + 1), String(pi + 1), ...r);
            });
        });
    });

    // ── <TABLE>STATEMENT (Part 29/32) ────────────────────────────────────────────
    out += `<TABLE>STATEMENT${RS}`;
    invs.forEach((inv, ii) => {
        (inv.products || []).forEach((p, pi) => {
            const isDbk = (p.eximCode || "").includes("19");
            out += row(PD,
                String(ii + 1), String(pi + 1),
                "1",
                "DEC",
                isDbk ? "DB001" : "RD001",
                "",
            );
        });
    });

    // ── <TABLE>Supportingdocs (Part 30/32) ───────────────────────────────────────
    const docs = job.eSanchitDocuments || [];
    if (docs.length > 0) {
        out += `<TABLE>Supportingdocs${RS}`;
        docs.forEach((d, di) => {
            out += row(PD,
                clean(d.invSerialNo || "1"),
                clean(d.itemSerialNo || "0"),
                String(di + 1),
                clean(d.irn || d.imageRefNo || ""),
                clean(d.documentType || ""),
                "",
                trunc(adr, 70),
                "", "",
                clean(job.exporter_pincode || ""),
                clean(d.documentReferenceNo || ""),
                "",
                fmtDate(d.dateOfIssue || ""),
                "", "",
                trunc(bNm, 70),
                "", "", "",
                clean(d.icegateFilename || "pdf"),
                trunc(clean(job.exporter || ""), 70),
                trunc(bNm, 70),
                sid,
            );
        });
    }

    // ── <END-SB> ──────────────────────────────────────────────────────────────────
    out += `<END-SB>${RS}`;

    // ── TREC ──────────────────────────────────────────────────────────────────────
    out += `TREC${FS}${seq}${RS}`;

    // File name: <4-digit-job-no><4-digit-year>.sb  e.g. "00012025.sb"
    const fileName = `${j4}${fdt.slice(0, 4)}.sb`;

    return { content: out, fileName };
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
