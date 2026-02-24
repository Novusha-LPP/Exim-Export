import * as xlsx from "xlsx";
import axios from "axios";
import { useState } from "react";

/**
 * Custom hook for uploading Excel/CSV data and converting to MongoDB documents
 * for Export Jobs
 */
function useExportExcelUpload(inputRef, onSuccess) {
    const [snackbar, setSnackbar] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [progress, setProgress] = useState({ current: 0, total: 0 });
    const [uploadStats, setUploadStats] = useState(null);

    /**
     * Main file upload handler
     */
    const handleFileUpload = (event) => {
        setLoading(true);
        setError(null);
        setUploadStats(null);
        setProgress({ current: 0, total: 0 });

        const file = event.target.files[0];
        if (!file) {
            setLoading(false);
            return;
        }

        const fileName = file.name.toLowerCase();
        const reader = new FileReader();

        if (fileName.endsWith(".xml")) {
            reader.onload = (e) => handleXMLRead(e);
            reader.onerror = () => {
                setError("Error reading XML file");
                setLoading(false);
            };
            reader.readAsText(file);
        } else {
            reader.onload = (e) => validateAndProcessFile(e, file);
            reader.onerror = () => {
                setError("Error reading file");
                setLoading(false);
            };
            reader.readAsBinaryString(file);
        }
    };

    /**
     * Validate Excel/CSV file format and content
     */
    const validateAndProcessFile = async (event, file) => {
        try {
            const content = event.target.result;
            const workbook = xlsx.read(content, { type: "binary" });

            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];

            // Get all data including headers for validation
            const allData = xlsx.utils.sheet_to_json(worksheet, { header: 1 });

            // Check if at least 2 rows exist (header + data)
            if (allData.length < 2) {
                setError("Invalid file format: File must contain at least 2 rows");
                setLoading(false);
                if (inputRef?.current) inputRef.current.value = null;
                return;
            }

            // Validation: Check for export-specific keywords in the data
            // We scan the first 10 rows to find a header row
            let hasJobNoColumn = false;
            for (let i = 0; i < Math.min(10, allData.length); i++) {
                const row = allData[i];
                if (row.some((cell) => {
                    const str = String(cell || "").toUpperCase();
                    return str.includes("JOB") || str.includes("DOC_ID") || str.includes("DOC ID") || str.includes("SB");
                })) {
                    hasJobNoColumn = true;
                    break;
                }
            }

            if (!hasJobNoColumn) {
                setError("Error: The provided file doesn't appear to be a valid Export DSR file. Missing 'Job No' or 'Doc ID' column.");
                setLoading(false);
                if (inputRef?.current) inputRef.current.value = null;
                return;
            }

            // If validation passes, continue with processing
            handleFileRead(event);
        } catch (err) {
            console.error("Error validating file:", err);
            setError("Error processing file. Please check the format.");
            setLoading(false);
            if (inputRef?.current) inputRef.current.value = null;
        }
    };

    /**
     * Parse Excel date value to YYYY-MM-DD format
     */
    const parseExcelDate = (value) => {
        if (!value) return "";

        // If it's a number (Excel serial date)
        if (!isNaN(value) && typeof value === "number") {
            const excelEpoch = new Date(1899, 11, 30);
            const jsDate = new Date(excelEpoch.getTime() + value * 86400000);
            const year = jsDate.getFullYear();
            const month = String(jsDate.getMonth() + 1).padStart(2, "0");
            const day = String(jsDate.getDate()).padStart(2, "0");
            return `${year}-${month}-${day}`;
        }

        // If it's a string, try to parse various formats
        if (typeof value === "string") {
            // Format: DD/MM/YYYY or DD/MM/YYYY HH:MM
            const dateParts = value.split(" ")[0].split("/");
            if (dateParts.length === 3) {
                const day = String(dateParts[0]).padStart(2, "0");
                const month = String(dateParts[1]).padStart(2, "0");
                const year = String(dateParts[2]);
                return `${year}-${month}-${day}`;
            }

            // Format: DD-MMM-YYYY or DD/MMM/YYYY (e.g., 15-Jan-2025 or 15/Jan/2025)
            // Handle lists by mapping each part
            if (value.includes(",")) {
                return value.split(",").map(v => parseExcelDate(v.trim())).join(", ");
            }

            const monthMatch = value.match(/^(\d{1,2})[-/]([A-Za-z]{3})[-/](\d{4})$/);
            if (monthMatch) {
                const day = monthMatch[1].padStart(2, "0");
                const month = monthMatch[2];
                const year = monthMatch[3];
                const monthMapping = {
                    Jan: "01", Feb: "02", Mar: "03", Apr: "04",
                    May: "05", Jun: "06", Jul: "07", Aug: "08",
                    Sep: "09", Oct: "10", Nov: "11", Dec: "12",
                };
                const formattedMonth = monthMapping[month.charAt(0).toUpperCase() + month.slice(1).toLowerCase()];
                if (formattedMonth) {
                    return `${year}-${formattedMonth}-${day}`;
                }
            }

            // Format: YYYY-MM-DD (already correct)
            if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
                return value;
            }
        }

        return String(value);
    };

    /**
     * Parse job number to extract components and convert to BRANCH/JOB_NO/YEAR format
     * Input formats could be:
     *   - AMD/EXP/SEA/00001/25-26 => AMD/00001/25-26
     *   - AMD/EXP/AIR/00123/25-26 => AMD/00123/25-26
     *   - AMD/00123/25-26 => AMD/00123/25-26 (already correct)
     * Output format: BRANCH/JOB_NO/YEAR (e.g., AMD/00001/25-26)
     */
    const parseJobNumber = (jobNoValue) => {
        if (!jobNoValue) return { job_no: "", year: "", branch_code: "" };

        const originalValue = String(jobNoValue).trim().toUpperCase();
        const parts = originalValue.split("/");

        if (parts.length >= 3) {
            // First part is always the branch code
            const branch_code = parts[0];

            // Last part is always the year (format: YY-YY like 25-26)
            const year = parts[parts.length - 1];

            // Find the numeric job sequence (usually the part before the year)
            // It's typically a 5-digit number like 00001, 00123, etc.
            let jobSequence = "";

            // Look for the numeric sequence (job number)
            for (let i = parts.length - 2; i >= 1; i--) {
                // Check if this part is primarily numeric (job sequence)
                if (/^\d+$/.test(parts[i])) {
                    jobSequence = parts[i].padStart(5, "0"); // Ensure 5 digits
                    break;
                }
            }

            // If no numeric sequence found, try the second-to-last part
            if (!jobSequence && parts.length >= 2) {
                const potentialSeq = parts[parts.length - 2];
                if (/^\d+$/.test(potentialSeq)) {
                    jobSequence = potentialSeq.padStart(5, "0");
                }
            }

            // Build the formatted job_no: BRANCH/JOB_NO/YEAR
            if (branch_code && jobSequence && year) {
                const formatted_job_no = `${branch_code}/${jobSequence}/${year}`;
                console.log(`🔄 Job No. converted: "${originalValue}" => "${formatted_job_no}"`);
                return {
                    job_no: formatted_job_no,
                    year: year,
                    branch_code: branch_code,
                };
            }
        }

        // If format doesn't match expected patterns, check if it's already in correct format
        if (parts.length === 3 && /^\d+$/.test(parts[1]) && /^\d{2}-\d{2}$/.test(parts[2])) {
            // Already in BRANCH/JOB_NO/YEAR format
            return {
                job_no: originalValue,
                year: parts[2],
                branch_code: parts[0],
            };
        }

        // Return as-is if format doesn't match
        console.warn(`⚠️ Could not parse job_no: "${originalValue}"`);
        return {
            job_no: originalValue,
            year: "",
            branch_code: "",
        };
    };

    /**
     * Process container numbers from Excel
     */
    const parseContainerNumbers = (containerValue, noOfContainerValue) => {
        if (!containerValue || typeof containerValue !== "string") {
            return [];
        }

        const containerNumbers = containerValue.split(",").map((c) => c.trim()).filter(Boolean);

        // Parse container sizes if provided
        let sizes = { "40": 0, "20": 0 };
        if (noOfContainerValue) {
            const sizeEntries = String(noOfContainerValue).split(",");
            sizeEntries.forEach((entry) => {
                const match = entry.match(/(\d+)\s*x\s*(\d+)/i);
                if (match) {
                    const count = parseInt(match[1], 10);
                    const size = match[2];
                    if (size.includes("40")) {
                        sizes["40"] += count;
                    } else if (size.includes("20")) {
                        sizes["20"] += count;
                    }
                }
            });
        }

        const predominantSize = sizes["40"] >= sizes["20"] ? "40" : "20";

        return containerNumbers.map((container) => ({
            containerNo: container,
            type: predominantSize,
        }));
    };

    /**
     * Main XML processing function
     */
    const handleXMLRead = async (event) => {
        try {
            const xmlText = event.target.result;
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xmlText, "text/xml");

            // Check for parsing errors
            if (xmlDoc.getElementsByTagName("parsererror").length > 0) {
                setError("Invalid XML file format");
                setLoading(false);
                return;
            }

            const documents = xmlDoc.getElementsByTagName("SBDocument");
            if (documents.length === 0) {
                setError("No shipping bill records found in XML");
                setLoading(false);
                return;
            }

            const modifiedData = [];

            for (let i = 0; i < documents.length; i++) {
                const doc = documents[i];

                const getText = (tagName, parent = doc) => {
                    const el = parent.getElementsByTagName(tagName)[0];
                    return el ? el.textContent.trim() : "";
                };

                // Job Identification
                const jobNoRaw = getText("Doc_ID");
                
                // XML validation for Doc_ID
                if (!jobNoRaw) {
                    setError("Error: The provided file doesn't appear to be a valid Export DSR file. Missing 'Job No' or 'Doc ID' column.");
                    setLoading(false);
                    if (inputRef?.current) inputRef.current.value = null;
                    return;
                }
                
                const { job_no, year, branch_code } = parseJobNumber(jobNoRaw);

                // Container Details
                const containerNodes = doc.getElementsByTagName("ContainerDetail");
                const contNos = [];
                const sealNos = [];
                const sealDates = [];
                const sealTypes = [];
                const contSizes = [];

                for (let j = 0; j < containerNodes.length; j++) {
                    const cNode = containerNodes[j];
                    contNos.push(getText("ContainerNumber", cNode));
                    sealNos.push(getText("SealNumber", cNode));
                    sealDates.push(parseExcelDate(getText("SealDate", cNode)));
                    sealTypes.push(getText("Seal_Type", cNode));

                    const size = getText("ContainerSize", cNode);
                    const type = getText("ContainerType", cNode);
                    if (size) contSizes.push(`1 x ${size}`);
                }

                // Invoice Details
                const invoiceNodes = doc.getElementsByTagName("InvoiceDetail");
                const invNos = [];
                const invDates = [];
                const invValues = [];
                const invCurrencies = [];
                const invTerms = [];

                // Products (Aggregated summary for DSR)
                // Products (Structure: Array of Arrays of Objects)
                const detailedProductsPerInvoice = [];

                // Arrays for invoice level details
                const invFreights = [];
                const invInsurances = [];
                const invDiscounts = [];
                const invCommissions = [];
                const invProductValues = [];

                // Buyer/ThirdParty extraction logic variables
                // Since Job has single Buyer/ThirdParty, we'll pick from the first invoice or aggregate.
                // Assuming uniform data across invoices for job-level fields.
                let extractedBuyerName = "";
                let extractedBuyerAddr = "";
                let extractedTPName = "";
                let extractedTPAddr = "";

                for (let j = 0; j < invoiceNodes.length; j++) {
                    const invNode = invoiceNodes[j];
                    invNos.push(getText("InvoiceNo", invNode));
                    invDates.push(parseExcelDate(getText("InvoiceDate", invNode)));
                    invValues.push(getText("InvoiceValue", invNode));
                    invCurrencies.push(getText("InvoiceCurrency", invNode));
                    invTerms.push(getText("TermsOfInvoice", invNode));

                    // Extract invoice financials
                    invProductValues.push(getText("ProductValue", invNode));
                    invFreights.push(getText("Freight", invNode));
                    invInsurances.push(getText("Insurance", invNode));
                    invDiscounts.push(getText("DiscountAmount", invNode));
                    invCommissions.push(getText("CommissionAmount", invNode));

                    // Extract Buyer/Third Party from the FIRST invoice (assuming check consistency or primary)
                    if (j === 0) {
                        extractedBuyerName = getText("InvBuyer_Name", invNode);
                        extractedBuyerAddr = getText("InvBuyer_Address", invNode);
                        // If InvBuyer fields are missing, try fallback? 
                        // But user specifically complained about combined field, so avoid fallback to <Buyer> tag.

                        extractedTPName = getText("ThirdParty_Name", invNode);
                        extractedTPAddr = getText("ThirdParty_Address", invNode);
                    }

                    // Get products for this invoice
                    const productNodes = invNode.getElementsByTagName("Product");
                    const currentInvoiceProducts = [];

                    for (let k = 0; k < productNodes.length; k++) {
                        const pNode = productNodes[k];

                        // Extract all detailed product fields
                        currentInvoiceProducts.push({
                            description: getText("ProductDesc", pNode),
                            ritc: getText("RITCNumber", pNode),
                            quantity: getText("Quantity", pNode),
                            qtyUnit: getText("Unit", pNode), // Correct unit from XML
                            unitPrice: getText("UnitPrice", pNode),
                            amount: getText("Amount", pNode),
                            eximCode: getText("EXIMCode", pNode),
                            endUse: getText("End_Use", pNode),

                            // PMV
                            pmvInfo: {
                                totalPMV: getText("PMVAmount", pNode),
                                currency: getText("PMVCurrency", pNode),
                                percentage: getText("PMVRate", pNode),
                            },

                            // IGST
                            igstCompensationCess: {
                                igstPaymentStatus: getText("IGSTPayStat", pNode), // Will map LUT/Payment backend side if needed
                                taxableValueINR: getText("IGSTTaxableVal", pNode),
                                igstAmountINR: getText("IGSTAmt", pNode),
                                igstRate: getText("IGSTRate", pNode),
                            },

                            // RoDTEP
                            rodtepInfo: {
                                claim: getText("RoDTEPClaim", pNode) || "No", // Assuming empty means No? Or check value
                                ratePercent: getText("RoDTEPRate", pNode),
                                amountINR: getText("RoDTEPAmt", pNode),
                                quantity: getText("RoDTEPRate_SQC", pNode), // SQC might be quantity used for calc
                                unit: getText("RoDTEPUnit", pNode), // Check if this is unit
                            },

                            // DBK
                            drawbackDetails: { // Helper structure for backend to flatten or use
                                dbkSrNo: getText("DBKSNo", pNode.getElementsByTagName("DBKDetails")[0]),
                                dbkRate: getText("CustomDBKRate", pNode.getElementsByTagName("DBKDetails")[0]),
                                dbkAmount: "0", // Need to calc or find? XML doesn't allow explicit Total DBK amt sometimes
                                quantity: getText("DBKQty", pNode.getElementsByTagName("DBKDetails")[0]),
                                unit: getText("DBKUnit", pNode.getElementsByTagName("DBKDetails")[0]),
                                dbkUnder: getText("DBKUnder", pNode.getElementsByTagName("DBKDetails")[0])
                            },

                            // EPCG Details
                            epcgDetails: (() => {
                                const epcgNodes = pNode.getElementsByTagName("EPCGDetail");
                                if (!epcgNodes || epcgNodes.length === 0) return null;
                                const items = [];
                                for (let ep = 0; ep < epcgNodes.length; ep++) {
                                    const eNode = epcgNodes[ep];
                                    items.push({
                                        regnNo: getText("RegnNo", eNode),
                                        regnDate: getText("RegnDate", eNode),
                                        itemSnoPartC: getText("ItemSNoPartC", eNode),
                                        itemSnoPartE: getText("ItemSNoPartE", eNode),
                                        rawMaterial: getText("RawMaterial", eNode),
                                        quantity: getText("Quantity", eNode),
                                        unit: getText("Unit", eNode),
                                        exportQty: getText("ExportQty", eNode),
                                        rawMaterialType: getText("RawMaterialType", eNode),
                                    });
                                }
                                return {
                                    isEpcgItem: true,
                                    epcg_reg_obj: items.map(it => ({
                                        regnNo: it.regnNo,
                                        licDate: it.regnDate,
                                        licRefNo: "",
                                    })),
                                    itemSnoPartE: items[0]?.itemSnoPartE || "",
                                    exportQtyUnderLicence: parseFloat(items[0]?.exportQty) || 0,
                                    epcgItems: items.map((it, idx) => ({
                                        serialNumber: idx + 1,
                                        itemSnoPartC: it.itemSnoPartC,
                                        description: (it.rawMaterial || "").trim(),
                                        quantity: parseFloat(it.quantity) || 0,
                                        unit: it.unit,
                                        itemType: it.rawMaterialType === "M" ? "Indigenous" : "Imported",
                                    })),
                                };
                            })(),

                            // DEEC (Advance Licence) Details
                            deecDetails: (() => {
                                const deecNodes = pNode.getElementsByTagName("DEECDetail");
                                if (!deecNodes || deecNodes.length === 0) return null;
                                const items = [];
                                for (let dc = 0; dc < deecNodes.length; dc++) {
                                    const dNode = deecNodes[dc];
                                    items.push({
                                        regnNo: getText("RegnNo", dNode),
                                        regnDate: getText("RegnDate", dNode),
                                        itemSnoPartC: getText("ItemSNoPartC", dNode),
                                        itemSnoPartE: getText("ItemSNoPartE", dNode),
                                        rawMaterial: getText("RawMaterial", dNode),
                                        quantity: getText("Quantity", dNode),
                                        unit: getText("Unit", dNode),
                                        exportQty: getText("ExportQty", dNode),
                                        rawMaterialType: getText("RawMaterialType", dNode),
                                    });
                                }
                                return {
                                    isDeecItem: true,
                                    deec_reg_obj: items.map(it => ({
                                        regnNo: it.regnNo,
                                        licDate: it.regnDate,
                                        licRefNo: "",
                                    })),
                                    itemSnoPartE: items[0]?.itemSnoPartE || "",
                                    exportQtyUnderLicence: parseFloat(items[0]?.exportQty) || 0,
                                    deecItems: items.map((it, idx) => ({
                                        serialNumber: idx + 1,
                                        itemSnoPartC: it.itemSnoPartC,
                                        description: (it.rawMaterial || "").trim(),
                                        quantity: parseFloat(it.quantity) || 0,
                                        unit: it.unit,
                                        itemType: it.rawMaterialType === "M" ? "Indigenous" : "Imported",
                                    })),
                                };
                            })(),
                        });
                    }
                    detailedProductsPerInvoice.push(currentInvoiceProducts);
                }

                const item = {
                    job_no,
                    year,
                    branch_code,
                    exporter: ((raw) => {
                        if (!raw) return "";
                        if (raw.includes("AIA ENGINEERING LIMITED (EXPORT)")) {
                            return "AIA ENGINEERING LIMITED";
                        }
                        let clean = raw.split(/\r?\n/)[0];
                        if (clean.includes(" - ")) clean = clean.split(" - ")[0];
                        return clean.trim();
                    })(getText("Exporter")),
                    custom_house: getText("LoadingPort"),
                    port_of_loading: getText("LoadingPort"),
                    transportMode: getText("TransportMode") === "S" ? "SEA" : getText("TransportMode") === "A" ? "AIR" : getText("TransportMode"),
                    sb_no: getText("SBNo"),
                    sb_date: parseExcelDate(getText("SBDate")),
                    consignee_name: getText("Consignee"),
                    consignee_country: getText("ConsigneeCountry"),

                    // Corrected Mapping based on user feedback:
                    // Use extracted Invoice Buyer details. If missing, assume NO update or handle gracefully.
                    // Only map Third Party if explicit third party fields exist.
                    buyer_name: extractedBuyerName,
                    buyer_address: extractedBuyerAddr,

                    third_party_name: extractedTPName,
                    third_party_address: extractedTPAddr,

                    port_of_discharge: getText("DischPort"),
                    discharge_country: getText("DischCountry"),
                    destination_port: getText("DestPort"),
                    destination_country: getText("DestCountry"),

                    goods_stuffed_at: getText("GoodsStuffedAt") === "F" ? "FACTORY" : getText("GoodsStuffedAt") === "D" ? "DOCK" : getText("GoodsStuffedAt"),

                    gross_weight_kg: getText("GrossWt"),
                    net_weight_kg: getText("NetWt"),
                    total_no_of_pkgs: getText("NoOfPkg"),
                    package_unit: getText("PkgUnit"),
                    state_of_origin: getText("StateOfOrigin"),
                    exporter_ref_no: getText("ExporterRefNo"),
                    ieCode: getText("RegistrationNo"),
                    adCode: getText("DealerCode"),
                    bank_name: getText("BankNameAddr"),
                    bank_account_number: getText("BankAccountNo"),
                    shipping_line_airline: getText("Carrier"),
                    flight_no: getText("FlightNo"),
                    flight_date: parseExcelDate(getText("FlightDate")),
                    voyage_no: getText("VoyageNo"),
                    awb_bl_no: getText("MAWBNo") || getText("HAWBNo"),
                    awb_bl_date: parseExcelDate(getText("MAWBDate") || getText("HAWBDate")),
                    consignmentType: (getText("TransportMode") === "A") ? "AIR" : (getText("CargoType") === "C" ? "FCL" : "LCL"),

                    // Payment Mapping
                    nature_of_payment: (() => {
                        const pt = getText("PaymentType");
                        if (pt === "DA") return "Delivery against Acceptance";
                        if (pt === "LC") return "Letter Of Credit";
                        if (pt === "DP") return "Direct Payment"; // Confirm mapping
                        if (pt === "AP") return "Advance Payment";
                        return "Not Applicable";
                    })(),
                    payment_period: getText("PaymentPeriod"),

                    // Containers (Pass as Array for backend to process)
                    container_nos: contNos.map((no, idx) => ({
                        containerNo: no,
                        sealNo: sealNos[idx] || "",
                        sealDate: sealDates[idx] || "",
                        sealType: sealTypes[idx] || "",
                        type: contSizes[idx]?.replace("1 x ", "") || ""
                    })),

                    // Comma-separated lists for backend compatibility
                    container_nos_raw: contNos.join(", "),
                    seal_no: sealNos.join(", "),
                    seal_date: sealDates.join(", "),
                    seal_type: sealTypes.join(", "),
                    no_of_container_raw: contSizes.join(", "),

                    invoice_number: invNos.join(", "),
                    invoice_date: invDates.join(", "),
                    invoice_value: invValues.join(", "),
                    total_inv_value: invProductValues.join(", "), // Mapping ProductValue to total_inv_value based on user note? Or keep invoice_value? 
                    // User said "product value and invoice value is also present". 
                    // Usually total_inv_value = Sum of products. invoice_value = Final value (CIF/FOB).
                    // We'll pass both arrays for backend to handle.

                    // Passing as explicit arrays via comma-separated strings for now (backend splits them)
                    product_value_list: invProductValues.join(", "),
                    freight_amount: invFreights.join(", "),
                    insurance_amount: invInsurances.join(", "),
                    discount_amount: invDiscounts.join(", "),
                    commission_amount: invCommissions.join(", "),

                    currency: invCurrencies.join(", "),
                    terms_of_invoice: invTerms.join(", "),

                    // Structured Products (Pass as JSON string or handle in backend as object)
                    // We'll pass it as a field that the backend hooks will look for.
                    // Since it's a complex array of arrays, we can stick it in a specific field.
                    products_per_invoice: detailedProductsPerInvoice,

                    product_description: "", // Deprecated for XML
                    ritc_no: "",
                    product_qty: "",
                    product_amount: "",
                    exim_scheme: "",
                    total_dbk_inr: "",
                    total_rodtep_amount: "",
                };

                modifiedData.push(item);
            }

            console.log(`🎉 XML processing complete! Found ${modifiedData.length} documents.`);
            await uploadAndCheckStatus(modifiedData);
        } catch (err) {
            console.error("Error parsing XML:", err);
            setError("Error parsing XML file: " + err.message);
            setLoading(false);
        }
    };

    /**
     * Transform Excel column key to snake_case field name
     */
    const transformKey = (key) => {
        return key
            .toLowerCase()
            .replace(/\s+/g, "_")
            .replace(/[^\w\s]/gi, "_")
            .replace(/\//g, "_")
            .replace(/_+$/, "")
            .replace(/_+/g, "_");
    };

    /**
     * Main Excel/CSV processing function
     */
    const handleFileRead = async (event) => {
        try {
            const content = event.target.result;
            const workbook = xlsx.read(content, { type: "binary" });

            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];

            // Format AWB/BL column to prevent scientific notation
            Object.keys(worksheet).forEach((cell) => {
                if (cell.startsWith("H") || cell.startsWith("I")) {
                    if (worksheet[cell] && worksheet[cell].w) {
                        delete worksheet[cell].w;
                        worksheet[cell].z = "0";
                    }
                }
            });

            // Get all data to analyze the structure
            const allData = xlsx.utils.sheet_to_json(worksheet, { header: 1 });

            // Debug: Log the first 3 rows to understand the structure
            console.log("📋 First 3 rows of file:");
            allData.slice(0, 3).forEach((row, idx) => {
                console.log(`  Row ${idx + 1}:`, row.slice(0, 5), "...");
            });

            // Auto-detect header row: Find the row that contains "Job" column
            let headerRowIndex = 0;
            for (let i = 0; i < Math.min(10, allData.length); i++) {
                const row = allData[i];
                const hasJobColumn = row.some((cell) => {
                    const str = String(cell || "").toUpperCase();
                    return str.includes("JOB") || str.includes("DOC_ID") || str.includes("DOC ID") || str.includes("SB");
                });
                if (hasJobColumn) {
                    headerRowIndex = i;
                    console.log(`✅ Found header row at index ${i} (Row ${i + 1})`);
                    break;
                }
            }

            // Data starts from the row after the header
            const dataStartRow = headerRowIndex + 1;
            console.log(`📍 Data starts from row ${dataStartRow + 1} (index ${dataStartRow})`);

            // Read data with the correct range (using header row as reference)
            const jsonData = xlsx.utils.sheet_to_json(worksheet, { range: headerRowIndex });

            // Debug: Log the first data row to see the keys
            if (jsonData.length > 0) {
                console.log("🔑 Column headers detected:", Object.keys(jsonData[0]));
                console.log("📝 First data row (sample):", JSON.stringify(jsonData[0]).substring(0, 500) + "...");
            }

            console.log(`📊 Starting to process ${jsonData.length} rows from file...`);

            // Define comprehensive field mapping from Excel columns to ExJobModel fields
            // Key: transformed Excel header (snake_case), Value: model field name
            const FIELD_MAPPING = {
                // Job Identification
                "job_no": "job_no",
                "job_no_": "job_no",
                "job_number": "job_no",
                "jobno": "job_no",
                "doc_id": "job_no",
                "docid": "job_no",
                "doc_id_": "job_no",
                
                // Dates
                "job_date": "job_date",
                "jobdate": "job_date",
                "sb_date": "sb_date",
                "sbdate": "sb_date",
                "s_b_date": "sb_date",
                "be_date": "be_date",
                "bedate": "be_date",
                "invoice_date": "invoice_date",
                "invoicedate": "invoice_date",
                "awb_bl_date": "awb_bl_date",
                "awbbldate": "awb_bl_date",
                "sailing_date": "sailing_date",
                "sailingdate": "sailing_date",
                "flight_date": "flight_date",
                "flightdate": "flight_date",
                "gateway_igm_date": "gateway_igm_date",
                "egm_date": "egm_date",
                "mbl_date": "mbl_date",
                "hbl_date": "hbl_date",

                // Custom House / Location
                "custom_house": "custom_house",
                "customhouse": "custom_house",
                "cus_loc": "custom_house",

                // Exporter
                "exporter": "exporter",
                "exporter_name": "exporter",
                "exportername": "exporter",
                "exporter_address": "exporter_address",
                "exporter_type": "exporter_type",
                "exporter_gstin": "exporter_gstin",
                "gstin": "gstin",
                "exporter_pan": "exporter_pan",
                "exporter_state": "exporter_state",

                // IE Code
                "ie_code": "ieCode",
                "iecode": "ieCode",
                "ie_code_no": "ieCode",
                "iecodeno": "ieCode",
                "iec": "ieCode",

                // Consignee
                "consignee_name": "consignee_name",
                "consigneename": "consignee_name",
                "consignee": "consignee_name",
                "consignee_address": "consignee_address",
                "consignee_country": "consignee_country",

                // Shipping Bill
                "sb_no": "sb_no",
                "sbno": "sb_no",
                "s_b_no": "sb_no",
                "shipping_bill_no": "sb_no",
                "shippingbillno": "sb_no",
                "sb_type": "sb_type",
                "sbtype": "sb_type",

                // BE
                "be_no": "be_no",
                "beno": "be_no",

                // AWB/BL
                "awb_bl_no": "awb_bl_no",
                "awbblno": "awb_bl_no",
                "awb_no": "awb_bl_no",
                "awbno": "awb_bl_no",
                "bl_no": "awb_bl_no",
                "blno": "awb_bl_no",
                "mbl_no": "mbl_no",
                "mblno": "mbl_no",
                "hbl_no": "hbl_no",
                "hblno": "hbl_no",

                // Invoice
                // Invoice
                "invoice_no": "invoice_number",
                "invoiceno": "invoice_number",
                "invoice_number": "invoice_number",
                "invoicenumber": "invoice_number",
                "total_inv_value": "invoice_value",
                "totalinvvalue": "invoice_value",
                "total_prod_value": "total_inv_value",
                "totalprodvalue": "total_inv_value",
                "invoice_value": "invoice_value",
                "invoicevalue": "invoice_value",
                "total_igst_amount": "total_igst_amount",
                "total_dbk_inr": "total_dbk_inr",
                "total_igst_taxable_value": "total_igst_taxable_value",
                "total_rodtep_amount": "total_rodtep_amount",
                "total_rosctl_amount": "total_rosctl_amount",
                "ritc_no": "ritc_no",
                "product_qty": "product_qty",
                "product_description": "product_description",
                "amount": "product_amount",
                "toi": "terms_of_invoice",
                "fob_in_inr": "fob_value_inr",

                // Consignment Type
                "consignment_type": "consignmentType",
                "consignmenttype": "consignmentType",
                "cons_type": "consignmentType",
                "constype": "consignmentType",
                "type": "consignmentType",

                // Transport Mode
                "transport_mode": "transportMode",
                "transportmode": "transportMode",
                "mode": "transportMode",

                // Shipping Line/Airline
                "shipping_line_airline": "shipping_line_airline",
                "shippinglineairline": "shipping_line_airline",
                "shipping_line": "shipping_line_airline",
                "shippingline": "shipping_line_airline",
                "airline": "shipping_line_airline",
                "carrier": "shipping_line_airline",

                // Vessel/Flight
                "vessel_name": "vessel_name",
                "vesselname": "vessel_name",
                "vessel": "vessel_name",
                "flight_no": "flight_no",
                "flightno": "flight_no",
                "flight": "flight_no",
                "voyage_no": "voyage_no",
                "voyageno": "voyage_no",
                "voyage": "voyage_no",

                // Ports
                "port_of_loading": "port_of_loading",
                "portofloading": "port_of_loading",
                "pol": "port_of_loading",
                "loading_port": "port_of_loading",
                "port_of_discharge": "port_of_discharge",
                "portofdischarge": "port_of_discharge",
                "pod": "port_of_discharge",
                "discharge_port": "port_of_discharge",
                "destination_port": "destination_port",
                "destinationport": "destination_port",
                "final_destination": "final_destination",
                "finaldestination": "final_destination",
                "gateway_port": "gateway_port",
                "gatewayport": "gateway_port",
                "discharge_country": "discharge_country",
                "dischargecountry": "discharge_country",
                "destination_country": "destination_country",
                "destinationcountry": "destination_country",

                // Weight & Packages
                "no_of_pkgs": "total_no_of_pkgs",
                "noofpkgs": "total_no_of_pkgs",
                "no_of_packages": "total_no_of_pkgs",
                "packages": "total_no_of_pkgs",
                "total_no_of_pkgs": "total_no_of_pkgs",
                "package_unit": "package_unit",
                "packageunit": "package_unit",
                "gross_weight": "gross_weight_kg",
                "grossweight": "gross_weight_kg",
                "gr_wt": "gross_weight_kg",
                "grwt": "gross_weight_kg",
                "gross_weight_kg": "gross_weight_kg",
                "net_weight": "net_weight_kg",
                "netweight": "net_weight_kg",
                "net_weight_kg": "net_weight_kg",

                // Container
                "container_no": "container_nos_raw",
                "containerno": "container_nos_raw",
                "container_nos": "container_nos_raw",
                "containernos": "container_nos_raw",
                "containers": "container_nos_raw",
                "no_of_containers": "no_of_containers",
                "noofcontainers": "no_of_containers",
                "no_of_container": "no_of_container_raw",
                "noofcontainer": "no_of_container_raw",

                // Financial
                "exchange_rate": "exchange_rate",
                "exchangerate": "exchange_rate",
                "ex_rate": "exchange_rate",
                "exrate": "exchange_rate",
                "currency": "currency",
                "cif_amount": "cif_amount",
                "cifamount": "cif_amount",
                "fob_value": "fob_value",
                "fobvalue": "fob_value",
                "unit_price": "unit_price",
                "unitprice": "unit_price",

                // Bank Details
                "ad_code": "adCode",
                "adcode": "adCode",
                "bank_name": "bank_name",
                "bankname": "bank_name",
                "bank_account_number": "bank_account_number",
                "bankaccountnumber": "bank_account_number",

                // EGM
                "egm_no": "egm_no",
                "egmno": "egm_no",

                // Description
                "description": "description",
                "product_description": "description",
                "productdescription": "description",
                "goods_description": "description",

                // HSS/CHA
                "hss_name": "hss_name",
                "hssname": "hss_name",
                "cha": "cha",
                "cha_name": "cha",
                "chaname": "cha",

                // Status
                "status": "status",
                "job_status": "status",
                "jobstatus": "status",

                // Locked Dates
                "operations_locked_on": "operations_locked_on",
                "operationslockedon": "operations_locked_on",
                "financials_locked_on": "financials_locked_on",
                "financialslockedon": "financials_locked_on",

                // Branch
                "branch_code": "branch_code",
                "branchcode": "branch_code",
                "branch": "branch_code",
                "branch_sr_no": "branchSrNo",
                "branchsrno": "branchSrNo",

                // Other fields
                "remarks": "remarks",
                "remark": "remarks",
                "line_no": "line_no",
                "lineno": "line_no",
                "job_owner": "job_owner",
                "jobowner": "job_owner",
                "shipper": "shipper",
                "notify": "notify",
                "notify_party": "notify",
                "notifyparty": "notify",
                "exporter_ref_no": "exporter_ref_no",
                "exporterrefno": "exporter_ref_no",
                "nature_of_cargo": "nature_of_cargo",
                "natureofcargo": "nature_of_cargo",
                "state_of_origin": "state_of_origin",
                "stateoforigin": "state_of_origin",
                "buyer_name": "buyer_name",
                "buyername": "buyer_name",
                "buyer_address": "buyer_address",
                "buyeraddress": "buyer_address",
                "commission_amount": "commission_amount",
                "commissionamount": "commission_amount",
                "seal_no_date": "seal_no_date",
                "sealnodate": "seal_no_date",
                "cont_seal_no_date": "seal_no_date",
                "seal_no": "seal_no",
                "sealno": "seal_no",
                "seal_date": "seal_date",
                "sealdate": "seal_date",
                "seal_type": "seal_type",
                "cont_seal_type": "seal_type",
                "exim_scheme": "exim_scheme",
                "eximscheme": "exim_scheme",
            };

            // Date fields that need date parsing
            const DATE_FIELDS = [
                "job_date", "sb_date", "be_date", "invoice_date",
                "awb_bl_date", "sailing_date", "flight_date",
                "gateway_igm_date", "egm_date",
                "mbl_date", "hbl_date", "operations_locked_on", "financials_locked_on"
            ];

            // Transform each row
            const modifiedData = jsonData.map((item, rowIndex) => {
                const modifiedItem = {};

                for (const key in item) {
                    if (Object.hasOwnProperty.call(item, key)) {
                        const transformedKey = transformKey(key);
                        const value = item[key];

                        // Get the mapped field name, or use the transformed key if not in mapping
                        const mappedField = FIELD_MAPPING[transformedKey] || transformedKey;

                        // Skip certain fields
                        if (["noofconts", "noofcontsbytype", "sr_no", "sno", "__rownum__"].includes(transformedKey)) {
                            continue;
                        }

                        // Handle date fields
                        if (DATE_FIELDS.includes(mappedField)) {
                            modifiedItem[mappedField] = parseExcelDate(value);
                        }
                        // Handle job number - special parsing
                        else if (mappedField === "job_no") {
                            const parsed = parseJobNumber(value);
                            modifiedItem.job_no = parsed.job_no;
                            if (parsed.year) modifiedItem.year = parsed.year;
                            if (parsed.branch_code) modifiedItem.branch_code = parsed.branch_code;
                        }
                        // Handle IE Code - ensure 10 characters
                        else if (mappedField === "ieCode") {
                            let ieCodeValue = String(value || "").trim();
                            if (ieCodeValue.length < 10 && ieCodeValue.length > 0) {
                                ieCodeValue = ieCodeValue.padStart(10, "0");
                            }
                            modifiedItem.ieCode = ieCodeValue;
                        }
                        // Handle consignment type
                        else if (mappedField === "consignmentType") {
                            modifiedItem.consignmentType = String(value).split(",")[0].trim().toUpperCase();
                        }
                        // Handle container_nos_raw (special handling for containers)
                        else if (mappedField === "container_nos_raw") {
                            modifiedItem.container_nos_raw = value;
                        }
                        else if (mappedField === "no_of_container_raw") {
                            modifiedItem.no_of_container_raw = value;
                        }
                        // Handle consignee_name (needs to become consignees array later)
                        else if (mappedField === "consignee_name") {
                            modifiedItem.consignee_name = value;
                        }
                        else if (mappedField === "consignee_address") {
                            modifiedItem.consignee_address = value;
                        }
                        else if (mappedField === "consignee_country") {
                            modifiedItem.consignee_country = value;
                        }
                        // Format specific Custom House value
                        else if (mappedField === "custom_house" && value) {
                            let customHouseVal = String(value).trim();
                            if (customHouseVal.toLowerCase() === "icd sabarmati, ahmedabad") {
                                customHouseVal = "ICD Sabarmati";
                            }
                            modifiedItem.custom_house = customHouseVal;
                        }
                        // Default: use the mapped field name
                        else {
                            modifiedItem[mappedField] = value;
                        }
                    }
                }

                // Log progress every 100 rows
                if ((rowIndex + 1) % 100 === 0) {
                    console.log(
                        `✅ Processed ${rowIndex + 1} / ${jsonData.length} rows (${Math.round(
                            ((rowIndex + 1) / jsonData.length) * 100
                        )}%)`
                    );
                }

                return modifiedItem;
            });

            // Process container numbers
            modifiedData.forEach((item) => {
                if (item.container_nos_raw) {
                    item.container_nos = parseContainerNumbers(
                        item.container_nos_raw,
                        item.no_of_container_raw
                    );
                    delete item.container_nos_raw;
                    delete item.no_of_container_raw;
                }
            });

            // Reset file input
            if (inputRef?.current) {
                inputRef.current.value = null;
            }

            // Debug: Log job_no statistics
            const withJobNo = modifiedData.filter(d => d.job_no);
            const withoutJobNo = modifiedData.filter(d => !d.job_no);
            console.log(`📊 Job No. Statistics:`);
            console.log(`   ✅ Records with job_no: ${withJobNo.length}`);
            console.log(`   ❌ Records without job_no: ${withoutJobNo.length}`);
            if (withJobNo.length > 0) {
                console.log(`   📝 Sample job numbers:`, withJobNo.slice(0, 5).map(d => d.job_no));
            }
            if (withoutJobNo.length > 0 && withoutJobNo.length <= 5) {
                console.log(`   ⚠️ Records without job_no (first 5):`, withoutJobNo.slice(0, 5));
            }

            if (withJobNo.length === 0) {
                setError("Error: No valid Job Numbers found in the file. Please check the data format.");
                setLoading(false);
                if (inputRef?.current) inputRef.current.value = null;
                return;
            }

            console.log(`🎉 File processing complete! Total rows processed: ${modifiedData.length}`);
            console.log(`📤 Starting upload to server...`);

            // Upload the data
            await uploadAndCheckStatus(modifiedData);
        } catch (err) {
            console.error("Error processing Excel file:", err);
            setError("Error processing file. Please check the format.");
            setLoading(false);
            if (inputRef?.current) inputRef.current.value = null;
        }
    };

    /**
     * Upload processed data to backend
     */
    async function uploadAndCheckStatus(modifiedData) {
        const startTime = Date.now();

        try {
            // Upload in chunks to prevent timeout
            const CHUNK_SIZE = 200;
            const totalChunks = Math.ceil(modifiedData.length / CHUNK_SIZE);
            let failed = false;

            // Initialize progress
            setProgress({ current: 0, total: totalChunks });

            console.log(`Starting chunked upload: ${modifiedData.length} records in ${totalChunks} chunks`);

            let skippedCount = 0;
            let successCount = 0;

            for (let i = 0; i < modifiedData.length; i += CHUNK_SIZE) {
                const chunk = modifiedData.slice(i, i + CHUNK_SIZE);
                const currentChunk = Math.floor(i / CHUNK_SIZE) + 1;

                console.log(`Uploading chunk ${currentChunk}/${totalChunks}...`);

                try {
                    const uploadResponse = await axios.post(
                        `${import.meta.env.VITE_API_STRING}/jobs/add-job`,
                        chunk,
                        {
                            headers: {
                                "Content-Type": "application/json",
                            },
                        }
                    );

                    if (uploadResponse.status !== 200) {
                        failed = true;
                        setError(`Failed to upload chunk ${currentChunk}`);
                        break;
                    }
                    
                    // Add the chunk statistics
                    if (uploadResponse.data) {
                        successCount += (uploadResponse.data.count || 0);
                        skippedCount += (uploadResponse.data.skipped || 0);
                    }

                    // Update progress
                    setProgress({ current: currentChunk, total: totalChunks });
                } catch (err) {
                    console.error(`Error uploading chunk ${currentChunk}:`, err);
                    failed = true;
                    setError(
                        err.response?.data?.message ||
                        `Error uploading chunk ${currentChunk}. Check console for details.`
                    );
                    break;
                }
            }

            if (!failed) {
                const endTime = Date.now();
                const durationSeconds = ((endTime - startTime) / 1000).toFixed(2);
                
                if (skippedCount === modifiedData.length && successCount === 0) {
                    setError(`Error: All ${skippedCount} records were skipped. Missing or invalid Job Numbers.`);
                    setLoading(false);
                    return;
                }
                
                setUploadStats({
                    count: successCount > 0 ? successCount : modifiedData.length,
                    timeTaken: durationSeconds,
                });

                setSnackbar(true);
                console.log(`✅ Upload complete! ${modifiedData.length} records in ${durationSeconds}s`);

                // Call success callback if provided
                if (onSuccess) {
                    onSuccess();
                }

                // Hide snackbar after 5 seconds
                setTimeout(() => {
                    setSnackbar(false);
                }, 5000);
            }
        } catch (error) {
            setError("Error occurred during the upload");
            console.error("Error:", error);
        } finally {
            setLoading(false);
        }
    }

    return {
        handleFileUpload,
        snackbar,
        loading,
        error,
        setError,
        progress,
        uploadStats,
    };
}

export default useExportExcelUpload;
