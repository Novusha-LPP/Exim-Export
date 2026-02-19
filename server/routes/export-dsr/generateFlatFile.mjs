import express from "express";
import ExportJob from "../../model/export/ExJobModel.mjs";

const router = express.Router();

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
    "HAZIRA": "INHZA1"
};

// Help to format numbers for ICEGATE (e.g. 123.45 -> 123.450)
const formatNum = (num, decimals = 3) => {
    if (num === undefined || num === null || isNaN(num)) return "".padEnd(decimals + 2, "0").replace("0", "0.");
    return parseFloat(num).toFixed(decimals);
};

const formatDate = (dateStr) => {
    if (!dateStr) return "";
    // Handle both YYYY-MM-DD and other formats
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "";
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}${mm}${dd}`;
};

const formatDateDDMMYYYY = (dateStr) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "";
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}${mm}${yyyy}`;
};

const getNumericJobNo = (jobNo) => {
    if (!jobNo) return "";
    const parts = jobNo.split('/');
    // Extract numeric sequence (usually middle part like AMD/00123/25-26)
    const seq = parts.find(p => /^\d+$/.test(p));
    return seq || jobNo.replace(/[^0-9]/g, '').slice(0, 7);
};

// Field Separator for ICEGATE is often GS (0x1D) but user sample shows concatenated
// I will use NO delimiter as per user sample, but will add \x1D if it fails later
const FS = "";

router.get("/api/generate-sb-file/:jobId", async (req, res) => {
    try {
        const job = await ExportJob.findById(req.params.jobId).lean();
        if (!job) return res.status(404).json({ success: false, message: "Job not found" });

        const locationCode = CUSTOM_HOUSE_MAP[job.custom_house] || "UNKNOWN";
        const jobNoNum = getNumericJobNo(job.job_no);
        const jobDate = formatDate(job.job_date);
        const filingDate = formatDateDDMMYYYY(new Date());
        const hm = new Date().getHours().toString().padStart(2, '0') + new Date().getMinutes().toString().padStart(2, '0');

        const senderId = `SURAJ${job.branch_code || "AMD"}`.toUpperCase();

        // --- HREC ---
        let content = `HREC${FS}ZZ${FS}${senderId}${FS}ZZ${FS}${locationCode}${FS}ICES1_5${FS}P${FS}CACHE01${FS}${jobNoNum}${FS}${filingDate}${FS}${hm}0102\n`;

        // Common row prefix: Action + Location + JobNo + Date
        const rowPrefix = `F${locationCode}${jobNoNum}${jobDate}`;

        // --- SB Table ---
        content += `<TABLE>SB\n`;
        let sb = `${rowPrefix}`;
        sb += `ABOFS1766`; // AEO Substring
        sb += `LCH0050`; // LIC Code?
        sb += (job.ieCode || "").padEnd(10, " ");
        sb += `0`; // ??
        sb += (job.exporter || "").slice(0, 50);
        sb += (job.exporter_address || "").slice(0, 100);
        // Add more fields if known...
        content += sb + "\n";

        // --- INVOICE Table ---
        content += `<TABLE>INVOICE\n`;
        const invoices = job.invoices || [];
        invoices.forEach((inv, idx) => {
            let invLine = `${rowPrefix}`;
            invLine += (idx + 1).toString(); // Inv Serial 
            invLine += (inv.invoiceNumber || "").slice(0, 20);
            invLine += formatDate(inv.invoiceDate);
            invLine += (inv.currency || "USD");
            invLine += formatNum(inv.invoiceValue, 2);
            // ...
            content += invLine + "\n";
        });

        // --- EXCHANGE Table ---
        content += `<TABLE>EXCHANGE\n`;
        const currencies = [...new Set(invoices.map(i => i.currency || "USD"))];
        currencies.forEach(curr => {
            content += `${rowPrefix}${curr}${FS}Y\n`;
        });

        // --- ITEM Table ---
        content += `<TABLE>ITEM\n`;
        invoices.forEach((inv, invIdx) => {
            (inv.products || []).forEach((prod, prodIdx) => {
                let itemLine = `${rowPrefix}`;
                itemLine += (invIdx + 1).toString();
                itemLine += (prodIdx + 1).toString();
                itemLine += (prod.ritc || "").padEnd(8, "0");
                itemLine += (prod.description || "").slice(0, 50);
                itemLine += (prod.qtyUnit || prod.socunit || "KGS");
                itemLine += formatNum(prod.quantity, 3);
                itemLine += formatNum(prod.unitPrice, 5);
                content += itemLine + "\n";
            });
        });

        // --- DBK Table ---
        content += `<TABLE>DBK\n`;
        invoices.forEach((inv, invIdx) => {
            (inv.products || []).forEach((prod, prodIdx) => {
                const dbk = (prod.drawbackDetails || [])[0];
                if (dbk && dbk.dbkitem) {
                    let dbkLine = `${rowPrefix}`;
                    dbkLine += (invIdx + 1).toString();
                    dbkLine += (prodIdx + 1).toString();
                    dbkLine += (dbk.dbkSrNo || "").slice(0, 10);
                    dbkLine += "B"; // Category
                    dbkLine += formatNum(prod.quantity, 3);
                    content += dbkLine + "\n";
                }
            });
        });

        // --- SW_INFO_TYPE ---
        content += `<TABLE>SW_INFO_TYPE\n`;
        invoices.forEach((inv, invIdx) => {
            (inv.products || []).forEach((prod, prodIdx) => {
                const i = invIdx + 1;
                const p = prodIdx + 1;
                // Standard Single Window rows from user sample
                content += `${rowPrefix}${i}${p}1ORCSTO24\n`;
                content += `${rowPrefix}${i}${p}2ORCDOO438\n`;
                content += `${rowPrefix}${i}${p}3CHRSQC${formatNum(prod.quantity, 6)}KGS\n`;
                content += `${rowPrefix}${i}${p}4ORCEPTNCPTI\n`;
                content += `${rowPrefix}${i}${p}5DTYGCESS0.000000INR\n`;
                content += `${rowPrefix}${i}${p}6DTYRDTRODTEPYClaimed${formatNum(prod.quantity, 6)}KGS\n`;
            });
        });

        // --- STATEMENT ---
        content += `<TABLE>STATEMENT\n`;
        invoices.forEach((inv, invIdx) => {
            (inv.products || []).forEach((prod, prodIdx) => {
                content += `${rowPrefix}${invIdx + 1}${prodIdx + 1}1DECRD001\n`;
            });
        });

        // --- Supportingdocs ---
        content += `<TABLE>Supportingdocs\n`;
        const docs = job.eSanchitDocuments || [];
        if (docs.length > 0) {
            docs.forEach(doc => {
                let docLine = `${rowPrefix}`;
                docLine += (doc.invSerialNo || "1");
                docLine += (doc.itemSerialNo || "01");
                docLine += formatDate(doc.dateOfIssue);
                docLine += (doc.documentType || "380000").padEnd(6, " "); // Typical Invoice doc type
                docLine += (doc.irn || "IRN00000000001");
                docLine += (doc.documentReferenceNo || "DOCREF001");
                docLine += (job.exporter_address || "").slice(0, 50).padEnd(50, " ");
                docLine += (doc.icegateFilename || "pdf").padEnd(10, " ");
                docLine += (job.exporter || "").slice(0, 50);
                content += docLine + "\n";
            });
        }

        content += `<END-SB>\n`;

        // --- TREC ---
        // TREC + JobNo + Time + Date
        content += `TREC${jobNoNum}${hm}${formatDate(new Date())}\n`;

        res.setHeader('Content-Type', 'text/plain');
        res.setHeader('Content-Disposition', `attachment; filename="${job.job_no.replace(/\//g, '_')}.sb"`);
        res.send(content);

    } catch (error) {
        console.error("Flat file generation error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
});

export default router;
