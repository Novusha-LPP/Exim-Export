import {
    CUSTOM_HOUSE_CODE_MAP,
    COUNTRY_CODE_MAP,
    PORT_CODE_MAP,
    STATE_CODE_MAP,
    MONTH_CODE_MAP,
} from "../constants/geoCodes.mjs";

export const toPlainObject = (value) =>
    value && typeof value.toObject === "function"
        ? value.toObject({ virtuals: false })
        : value || {};

export const text = (value) =>
    String(value ?? "")
        .replace(/[^\x00-\x7F]/g, " ")
        .replace(/[\x00-\x1F\x7F]/g, " ")
        .replace(/\s+/g, " ")
        .trim();

export const upperText = (value) => text(value).toUpperCase();

export const firstValue = (...values) => {
    for (const value of values) {
        if (value === null || value === undefined) continue;
        if (Array.isArray(value)) {
            const nested = firstValue(...value);
            if (nested !== "") return nested;
            continue;
        }
        if (String(value).trim() !== "") return value;
    }
    return "";
};

export const firstText = (...values) => text(firstValue(...values));
export const firstUpperText = (...values) => upperText(firstValue(...values));

export const splitFixed = (value, size, slots) => {
    const normalized = text(value);
    return Array.from({ length: slots }, (_, index) =>
        normalized.slice(index * size, (index + 1) * size).trim(),
    );
};

export const extractPinFromAddress = (address) => {
    const normalized = text(address);
    const match = normalized.match(/(?:^|[,\s])(\d{6})\s*$/);
    if (!match) return { address: normalized, pin: "" };
    return {
        address: normalized.replace(/,?\s*\d{6}\s*$/, "").trim(),
        pin: match[1],
    };
};

export const parseDateParts = (value) => {
    if (!value) return null;

    if (value instanceof Date && !Number.isNaN(value.getTime())) {
        return {
            year: value.getFullYear(),
            month: value.getMonth() + 1,
            day: value.getDate(),
        };
    }

    const raw = text(value).split(/[T ]/)[0];
    if (/^\d{8}$/.test(raw)) {
        return {
            year: Number(raw.slice(0, 4)),
            month: Number(raw.slice(4, 6)),
            day: Number(raw.slice(6, 8)),
        };
    }

    const parts = raw.split(/[-/.]/).filter(Boolean);
    if (parts.length === 3) {
        let year;
        let month;
        let day;

        if (parts[0].length === 4) {
            year = Number(parts[0]);
            month = parts[1];
            day = Number(parts[2]);
        } else if (parts[2].length === 4) {
            day = Number(parts[0]);
            month = parts[1];
            year = Number(parts[2]);
        }

        const monthNumber =
            typeof month === "string"
                ? MONTH_CODE_MAP[month.slice(0, 3).toUpperCase()] || Number(month)
                : Number(month);

        if (year && monthNumber && day) {
            return { year, month: monthNumber, day };
        }
    }

    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
        return {
            year: parsed.getFullYear(),
            month: parsed.getMonth() + 1,
            day: parsed.getDate(),
        };
    }

    return null;
};

export const pad2 = (value) => String(value).padStart(2, "0");

export const toImpexCubeDate = (value) => {
    const parts = parseDateParts(value);
    if (!parts) return "";
    return `${parts.year}${pad2(parts.month)}${pad2(parts.day)}`;
};

export const toDisplayDate = (value) => {
    const parts = parseDateParts(value);
    if (!parts) return "";
    return `${pad2(parts.day)}-${pad2(parts.month)}-${parts.year}`;
};

export const normalizeFinancialYear = (value, dateValue) => {
    const raw = text(value);
    let match = raw.match(/^(\d{4})-(\d{4})$/);
    if (match) return raw;

    match = raw.match(/^(\d{4})-(\d{2})$/);
    if (match) {
        const start = Number(match[1]);
        return `${start}-${String(start + 1)}`;
    }

    match = raw.match(/^(\d{2})-(\d{2})$/);
    if (match) {
        const start = 2000 + Number(match[1]);
        return `${start}-${start + 1}`;
    }

    const dateParts = parseDateParts(dateValue);
    if (!dateParts) return "";

    const start = dateParts.month >= 4 ? dateParts.year : dateParts.year - 1;
    return `${start}-${start + 1}`;
};

export const toShortFinancialYear = (value) => {
    const normalized = normalizeFinancialYear(value);
    const match = normalized.match(/^(\d{4})-(\d{4})$/);
    if (!match) return text(value);
    return `${match[1].slice(-2)}-${match[2].slice(-2)}`;
};

export const stripLeadingZeros = (value) => {
    const parsed = Number.parseInt(String(value || "").replace(/\D/g, ""), 10);
    return Number.isNaN(parsed) ? "" : String(parsed);
};

export const extractJobSequenceNo = (jobNo) => {
    const raw = text(jobNo);
    if (!raw) return "";

    const segments = raw.split(/[\\/]/).filter(Boolean);
    for (let index = segments.length - 1; index >= 0; index -= 1) {
        const segment = segments[index];
        if (/^\d{2,4}-\d{2,4}$/.test(segment)) continue;
        const number = segment.match(/\d+/g)?.pop();
        if (number) return stripLeadingZeros(number);
    }

    const hyphenSegments = raw.split("-").filter(Boolean);
    const last = hyphenSegments[hyphenSegments.length - 1];
    if (/^\d+$/.test(last)) return stripLeadingZeros(last);

    const number = raw.match(/\d+/g)?.pop();
    return number ? stripLeadingZeros(number) : "";
};

export const codeFromText = (value, lookup, fallbackLength) => {
    const raw = upperText(value);
    if (!raw) return "";

    const parenthesizedCode = raw.match(/\(([^)]+)\)/);
    if (parenthesizedCode) return upperText(parenthesizedCode[1]);

    if (lookup[raw]) return lookup[raw];
    if (/^[A-Z]{2}[A-Z0-9]{3,4}$/.test(raw)) return raw;
    if (/^[A-Z0-9]{2,6}$/.test(raw)) return raw;

    return fallbackLength ? raw.slice(0, fallbackLength) : raw;
};

export const customHouseCode = (value) => codeFromText(value, CUSTOM_HOUSE_CODE_MAP, 6);
export const portCode = (value) => codeFromText(value, PORT_CODE_MAP, 6);

export const countryCode = (value) => {
    const raw = upperText(value);
    if (!raw) return "";

    const parenthesizedCode = raw.match(/\(([^)]+)\)/);
    if (parenthesizedCode) return upperText(parenthesizedCode[1]).slice(0, 2);
    if (/^[A-Z]{2}$/.test(raw)) return raw;
    if (COUNTRY_CODE_MAP[raw]) return COUNTRY_CODE_MAP[raw];

    return raw.slice(0, 2);
};

export const stateCode = (value) => {
    const raw = upperText(value);
    if (!raw) return "";
    if (/^\d{2}$/.test(raw)) return raw;

    return (
        STATE_CODE_MAP[raw] ||
        STATE_CODE_MAP[raw.replace(/\s+/g, "")] ||
        ""
    );
};

export const exporterTypeCode = (value) => {
    const raw = upperText(value);
    if (/^[RFMI]$/.test(raw)) return raw;
    if (raw.includes("MERCHANT") || raw.includes("REGISTERED")) return "R";
    if (raw.includes("MANUFACTURER")) return "F";
    return raw || "F";
};

export const natureOfCargoCode = (value) => {
    const raw = upperText(value);
    if (["C", "P", "L", "D"].includes(raw)) return raw;
    if (raw.includes("CONTAINER") || raw.startsWith("C -") || raw.startsWith("CP -")) {
        return "C";
    }
    if (raw.startsWith("LB") || raw.includes("LIQUID BULK")) return "L";
    if (raw.startsWith("DB") || raw.includes("DRY BULK")) return "D";
    return raw ? "P" : "";
};

export const gstnTypeCode = (value) => {
    const raw = upperText(value);
    if (raw.length === 15) return "GSN";
    if (raw.length === 10) return "PAN";
    return raw ? "OTH" : "";
};

export const panFromGstin = (value) => {
    const raw = upperText(value);
    return raw.length === 15 ? raw.slice(2, 12) : "";
};

export const numberString = (value, decimals) => {
    if (value === null || value === undefined || text(value) === "") return "";
    const parsed = Number(String(value).replace(/,/g, ""));
    return Number.isFinite(parsed) ? parsed.toFixed(decimals) : text(value);
};

export const toYN = (value) => {
    if (value === null || value === undefined || text(value) === "") return "";
    if (typeof value === "boolean") return value ? "Y" : "N";

    const raw = upperText(value);
    if (["Y", "YES", "TRUE", "1"].includes(raw)) return "Y";
    if (["N", "NO", "FALSE", "0"].includes(raw)) return "N";
    return raw;
};

export const factoryStuffedFlag = (value) => {
    const raw = upperText(value);
    if (!raw) return "";
    if (raw.includes("FACTORY")) return "Y";
    if (raw.includes("DOCK") || raw.includes("CFS") || raw.includes("PORT")) return "N";
    return toYN(raw);
};

export const sealTypeCode = (...values) => {
    const raw = firstUpperText(...values);
    if (!raw) return "";
    if (raw === "S" || raw.includes("SELF") || raw.includes("SHIPPER") || raw.includes("AGENT") || raw.includes("RFID") || raw === "R") {
        return "S";
    }
    if (raw === "W" || raw.includes("WAREHOUSE") || raw.includes("WEARHOUSE")) {
        return "W";
    }
    if (raw === "C" || raw.includes("CUSTOM")) return "C";
    return "S";
};

export const getFirstProduct = (job) => {
    const invoice = (job.invoices || []).find((item) => (item.products || []).length > 0);
    return invoice?.products?.[0] || {};
};

export const hasNfeiProduct = (job) =>
    (job.invoices || []).some((invoice) =>
        (invoice.products || []).some((product) => {
            const schemeCode = firstText(product.eximCode).split(" ")[0];
            return schemeCode === "99" || firstText(product.nfeiCategory);
        }),
    );

export const arrayFrom = (value) => {
    if (!value) return [];
    return Array.isArray(value) ? value : [value];
};

export const firstArray = (...values) => {
    for (const value of values) {
        if (!value) continue;
        if (Array.isArray(value) && value.length > 0) return value;
        if (!Array.isArray(value) && text(value) !== "") return [value];
    }
    return [];
};

export const hasAnyValue = (value) =>
    Object.values(value || {}).some((item) => text(item) !== "");

export const extensionFromPath = (value) => {
    const cleanPath = text(value);
    const match = cleanPath.match(/\.([a-zA-Z0-9]+)(?:$|\?)/);
    return match ? match[1].toUpperCase() : "";
};

export function buildImpexCubeExportPayload(jobOrDoc, options = {}) {
    const job = toPlainObject(jobOrDoc);
    const mapBranchToChaBranch = (val) => {
        const raw = String(val || "").toUpperCase().trim();
        if (raw === "AMD") return "NOVUAMD";
        if (raw === "GIM") return "NOVUGDM";
        if (raw === "COK") return "NOVUCOK";
        return val;
    };
    const firstProduct = getFirstProduct(job);
    const consignee = (job.consignees || [])[0] || {};
    const consigneeName = firstText(consignee.consignee_name, job.consignee_name, job.buyer_name, "TO ORDER");
    const consigneeCountryRaw = countryCode(firstText(consignee.consignee_country, job.destination_country));
    const exporterAddressInfo = extractPinFromAddress(job.exporter_address);
    const exporterAddressLines = splitFixed(exporterAddressInfo.address, 35, 2);
    const consigneeAddressLines = splitFixed(consignee.consignee_address, 35, 4);
    const gstin = firstUpperText(job.gstin, job.gstn, job.panNo, job.pan_no, job.ieCode);
    
    const loadingPort = customHouseCode(firstValue(job.port_of_loading, job.custom_house)) || "INSBI6";
    const destinationPort = portCode(firstValue(job.destination_port, job.final_destination, job.port_of_discharge, job.discharge_port)) || loadingPort || "AEDXB";
    const dischargePort = portCode(firstValue(job.port_of_discharge, job.discharge_port, job.destination_port, job.final_destination)) || destinationPort;
    
    const destCountry = firstText(countryCode(job.destination_country), consigneeCountryRaw, destinationPort.length >= 2 ? destinationPort.slice(0, 2) : "IN");
    const dischCountry = firstText(countryCode(job.discharge_country), dischargePort.length >= 2 ? dischargePort.slice(0, 2) : destCountry);
    const finalConsigneeCountry = firstText(consigneeCountryRaw, destCountry, "IN");

    const containers = arrayFrom(job.containers).filter((container) =>
        firstText(container?.containerNo),
    );
    const docs = firstArray(job.eSanchitDocuments, job.supportingDocs);

    const packingRows = firstArray(job.packingList, job.packing_list).map((item) => ({
        Packing_Number_From: firstText(item?.Packing_Number_From, item?.packingNumberFrom, item?.packing_number_from, item?.from),
        Packing_Number_To: firstText(item?.Packing_Number_To, item?.packingNumberTo, item?.packing_number_to, item?.to),
        Packing_Code: firstText(item?.Packing_Code, item?.packingCode, item?.packing_code, item?.code),
    })).filter(hasAnyValue);

    const stuffRows = firstArray(job.stuffDetails, job.stuff, job.STUFF).map((item) => ({
        Factory_stuffed: toYN(firstValue(item?.Factory_stuffed, item?.factoryStuffed, item?.factory_stuffed)),
        Sample_accompanied: toYN(firstValue(item?.Sample_accompanied, item?.sampleAccompanied, item?.sample_accompanied)),
    })).filter(hasAnyValue);

    const rawInvoices = firstArray(job.invoices);
    const invoiceList = rawInvoices.length > 0 ? rawInvoices : [
        {
            invoiceNumber: firstText(job.invoice_number, job.invoice_no, job.invoiceNo, "INV-01"),
            invoiceDate: firstValue(job.invoice_date, job.invoiceDate, job.job_date),
            invoiceValue: firstValue(job.invoice_value, job.invoiceValue, 100),
            currency: firstText(job.currency, "USD"),
            termsOfInvoice: firstText(job.termsOfInvoice, job.terms_of_invoice, "FOB"),
            products: firstArray(job.products, job.items)
        }
    ];

    const mappedInvoices = invoiceList.map((inv, invIdx) => {
        const invProducts = firstArray(inv.products, inv.items);
        let productsList = invProducts.map((prod, prodIdx) => {
            const ritc = firstText(prod.ritcNo, prod.hsnCode, prod.hsn_code, prod.ritc_code, prod.ritc, "00000000");
            const desc = firstText(prod.productName, prod.item_description, prod.description, prod.product_description, "GOODS");
            const qty = numberString(firstValue(prod.quantity, prod.qty, 1), 3);
            const unit = firstUpperText(prod.unit, prod.uom, prod.unit_of_measurement, "KGS");
            const price = numberString(firstValue(prod.unitPrice, prod.unit_price, prod.price, 100), 4);
            const amount = numberString(firstValue(prod.totalAmount, prod.total_amount, prod.amount, prod.value, 100), 2);
            const scheme = firstText(prod.eximCode, prod.scheme_code, prod.schemeCode, "00");

            return {
                Invoice_Serial_No: String(invIdx + 1),
                Item_Serial_No: String(prodIdx + 1),
                RITC_Code: ritc,
                Item_Description: desc,
                Quantity: qty,
                Unit_of_measurement: unit,
                Unit_Price: price,
                Total_Amount: amount,
                Scheme_Code: scheme,
            };
        }).filter(hasAnyValue);

        if (productsList.length === 0) {
            productsList = [
                {
                    Invoice_Serial_No: String(invIdx + 1),
                    Item_Serial_No: "1",
                    RITC_Code: "00000000",
                    Item_Description: firstText(job.description, "GENERAL CARGO"),
                    Quantity: "1.000",
                    Unit_of_measurement: "KGS",
                    Unit_Price: numberString(firstValue(inv.invoiceValue, inv.invoice_value, 100), 4) || "100.0000",
                    Total_Amount: numberString(firstValue(inv.invoiceValue, inv.invoice_value, 100), 2) || "100.00",
                    Scheme_Code: "00",
                }
            ];
        }

        return {
            Invoice_Number: firstText(inv.invoiceNumber, inv.invoiceNo, inv.invoice_number, inv.invoice_no, `INV-${invIdx + 1}`),
            Invoice_Date: toImpexCubeDate(firstValue(inv.invoiceDate, inv.invoice_date, job.job_date)),
            Invoice_Value: numberString(firstValue(inv.invoiceValue, inv.invoice_value, inv.amount, inv.invValue, 100), 2),
            Currency_Code: firstUpperText(inv.currency, job.currency, "USD"),
            Terms_of_Invoice: firstUpperText(inv.termsOfInvoice, inv.terms_of_invoice, job.termsOfInvoice, "FOB"),
            Nature_of_Contract: firstUpperText(inv.natureOfContract, inv.nature_of_contract, "FOB"),
            Buyer_Name: consigneeName,
            Buyer_Address1: consigneeAddressLines[0] || "SAME AS EXPORTER ADDRESS",
            Buyer_Address2: consigneeAddressLines[1] || "",
            Buyer_Address3: consigneeAddressLines[2] || "",
            Buyer_Address4: consigneeAddressLines[3] || "",
            Buyer_Country: finalConsigneeCountry,
            PRODUCTS: productsList
        };
    });

    const mappedContainers = containers
        .map((container) => {
            const cNo = firstText(container.containerNo, container.container_number);
            if (!cNo) return null;
            return {
                Container_number: cNo,
                Container_Size: firstText(container.containerSize, container.container_size, container.type).replace(/[^0-9]/g, "").slice(0, 2),
                "Excise_Seal_No.": firstText(container.customSealNo, container.exciseSealNo, container.sealNo, container.shippingLineSealNo),
                Seal_Date: toImpexCubeDate(container.sealDate),
                Seal_Type_Indicator: sealTypeCode(container.sealType, job.stuffing_seal_type),
                Seal_Device_ID: firstText(container.sealDeviceId, container.rfid),
                Movement_Document_Type: firstText(container.movementDocumentType, container.movement_document_type),
                Movement_Document_Number: firstText(container.movementDocumentNumber, container.movement_document_number),
            };
        })
        .filter(Boolean);

    const mappedDocs = docs
        .map((doc) => {
            const filePath = firstText(doc.documentFilePath, doc.fileUrl, doc.icegateFilename);
            const docName = firstText(doc.DocumentName, doc.documentName, doc.documentReferenceNo, doc.icegateFilename);
            if (!filePath && !docName) return null;
            return {
                DocumentCode: firstText(doc.DocumentCode, doc.documentCode, doc.documentType),
                DocumentName: docName,
                DocumentFilePath: filePath,
                DocumentFileFormat: firstUpperText(doc.DocumentFileFormat, doc.documentFileFormat, extensionFromPath(filePath)),
            };
        })
        .filter(Boolean);

    const branchSrNoVal = firstText(job.branchSrNo, job.branch_sno, job.branch_sr_no);
    const grossWt = numberString(job.gross_weight_kg, 3) || "1.000";
    const netWt = numberString(job.net_weight_kg, 3) || grossWt || "1.000";
    const totalPkgs = firstText(job.total_no_of_pkgs, job.totalPackages) || "1";

    return {
        CHADetails: {
            CHA_Code: firstText(options.chaCode, process.env.IMPEXCUBE_CHA_CODE, job.cha_code, job.chaCode, "NOVU"),
            CHA_Branch_Code: firstText(options.chaBranchCode, process.env.IMPEXCUBE_CHA_BRANCH_CODE, job.cha_branch_code, job.chaBranchCode, mapBranchToChaBranch(job.branch_code), "NOVUAMD"),
            Financial_Year: firstText(
                options.financialYear,
                process.env.IMPEXCUBE_FYEAR,
                process.env.FYEAR,
                job.financial_year,
                job.financialYear,
                normalizeFinancialYear(job.year, job.job_date),
                "2026-2027",
            ),
            SenderID: firstUpperText(
                options.senderId,
                process.env.IMPEXCUBE_SENDER_ID,
                job.senderId,
                job.senderID,
                job.sender_id,
                "PROTRANS",
            ),
        },
        SB_Details: {
            Custom_house_Code: customHouseCode(job.custom_house) || "INSBI6",
            Job_Sequence_No: firstText(
                job.job_sequence_no,
                job.jobSequenceNo,
                extractJobSequenceNo(firstValue(job.job_no, job.jobNumber)),
            ),
            User_Job_No: firstText(job.job_no, job.jobNumber),
            User_Job_Date: toImpexCubeDate(job.job_date) || toImpexCubeDate(new Date()),
            SB_No: firstText(job.sb_no),
            SB_Date: toImpexCubeDate(job.sb_date),
            CHA_License_Number: firstText(
                job.cha_license_number,
                job.chaLicenseNumber,
                job.cha_code,
                job.chaCode,
                options.chaLicenseNumber,
                process.env.IMPEXCUBE_CHA_LICENSE_NUMBER,
                customHouseCode(job.custom_house) === "INMUN1" ? "OFS1766LCH006" : "OFS1766LCH005",
            ),
            Importer_Exporter_Code: firstText(job.ieCode, job.iec, job.importer_exporter_code),
            Branch_Sr_No_of_Exporter: (!branchSrNoVal || branchSrNoVal === "0") ? "1" : branchSrNoVal,
            Imp_Exp_Name: firstText(job.exporter),
            Imp_Exp_Address1: firstText(job.exporter_address1, exporterAddressLines[0]),
            Imp_Exp_Address2: firstText(job.exporter_address2, exporterAddressLines[1]),
            Imp_Exp_City: firstText(job.exporter_city, job.city, "AHMEDABAD"),
            Imp_Exp_State: firstUpperText(job.exporter_state, job.state, "GUJARAT"),
            Imp_Exp_PIN: firstText(job.exporter_pincode, exporterAddressInfo.pin),
            Type_of_Exporter: exporterTypeCode(job.exporter_type),
            Exporter_Class: firstUpperText(job.exporter_class, "P"),
            State_of_origin_Exporter: stateCode(firstValue(job.state_of_origin, job.exporter_state, job.state)) || "24",
            Authorized_Dealer_Code: firstText(job.adCode, job.ad_code),
            EPZ_code: firstText(job.epz_code, job.epzCode),
            Consignee_name: consigneeName,
            Consignee_Address_1: consigneeAddressLines[0] || "SAME AS EXPORTER ADDRESS",
            Consignee_Address_2: consigneeAddressLines[1] || "",
            Consignee_Address_3: consigneeAddressLines[2] || "",
            Consignee_Address_4: consigneeAddressLines[3] || "",
            Consignee_Country: finalConsigneeCountry,
            Category_of_NFEI_SB: firstText(
                job.category_of_nfei_sb,
                job.nfeiCategory,
                firstProduct.nfeiCategory,
                hasNfeiProduct(job) ? "01" : "",
            ),
            RBI_waiver_number: firstText(job.rbi_waiver_no, job.rbiWaiverNo, job.rbi_app_no),
            RBI_waiver_date: toImpexCubeDate(firstValue(job.rbi_waiver_date, job.rbiWaiverDate)),
            Port_of_Loading: loadingPort,
            Port_of_final_destination: destinationPort,
            Country_of_final_destination: destCountry,
            Country_of_Discharge: dischCountry,
            Port_of_Discharge: dischargePort,
            Seal_Type: sealTypeCode(job.seal_type, job.stuffing_seal_type, containers[0]?.sealType),
            Nature_of_Cargo: natureOfCargoCode(job.nature_of_cargo),
            Gross_weight: grossWt,
            Net_weight: netWt,
            Unit_of_measurement: firstUpperText(job.gross_weight_unit, job.net_weight_unit, "KGS"),
            Total_number_of_packages: totalPkgs,
            Marks_Numbers: firstText(job.marks_nos, job.marksAndNumbers).slice(0, 100),
            Number_of_loose_packets: firstText(job.loose_pkgs, "0"),
            Number_of_containers: firstText(job.no_of_containers, mappedContainers.length ? String(mappedContainers.length) : "0"),
            MAWB_Number: firstText(job.mawb_no, job.mbl_no),
            HAWB_Number: firstText(job.hawb_no, job.hbl_no),
            GSTN_Type: firstUpperText(job.gstn_type, job.gstnType, gstnTypeCode(gstin)),
            GSTN_ID: gstin,
            Hand_Carry: toYN(firstValue(job.hand_carry, job.handCarry)),
        },
        INVOICE: mappedInvoices,
        PACKINGLIST: packingRows.length
            ? packingRows
            : [{ Packing_Number_From: "", Packing_Number_To: "", Packing_Code: "" }],
        STUFF: stuffRows.length
            ? stuffRows
            : [{ Factory_stuffed: "", Sample_accompanied: "" }],
        CONTAINER: mappedContainers.length
            ? mappedContainers
            : [{
                Container_number: "",
                Container_Size: "",
                "Excise_Seal_No.": "",
                Seal_Date: "",
                Seal_Type_Indicator: "",
                Seal_Device_ID: "",
                Movement_Document_Type: "",
                Movement_Document_Number: "",
            }],
        Supportingdocs: mappedDocs.length
            ? mappedDocs
            : [{ DocumentCode: "", DocumentName: "", DocumentFilePath: "", DocumentFileFormat: "" }],
    };
}

export function buildExportJobFromImpexCubePayload(payload = {}) {
    const cha = payload.CHADetails || payload.chaDetails || {};
    const sb = payload.SB_Details || payload.SBDetails || payload.sbDetails || {};
    const jobNo = firstText(sb.User_Job_No, sb.UserJobNo);
    const consigneeAddress = [
        sb.Consignee_Address_1,
        sb.Consignee_Address_2,
        sb.Consignee_Address_3,
        sb.Consignee_Address_4,
    ].map(text).filter(Boolean).join(" ");

    return {
        custom_house: firstText(sb.Custom_house_Code, sb.CustomHouseCode),
        transportMode: firstText(sb.Mode, sb.Mode_of_Transport, sb["Mode of Transport"], sb.ModeOfTransport) === "A" ? "AIR" : "SEA",
        job_sequence_no: firstText(sb.Job_Sequence_No, sb.JobSequenceNo),
        job_no: jobNo,
        jobNumber: jobNo,
        job_date: toDisplayDate(firstValue(sb.User_Job_Date, sb.UserJobDate)),
        year: toShortFinancialYear(firstText(cha["Financial Year"], cha.Financial_Year)),
        financial_year: firstText(cha["Financial Year"], cha.Financial_Year),
        cha_code: firstText(cha["CHA Code"], cha.CHA_Code, cha.CHACode),
        cha_branch_code: firstText(cha["CHA Branch Code"], cha.CHA_Branch_Code, cha.CHABranchCode),
        senderId: firstText(cha.SenderID, cha.SenderId, cha.senderId),
        sb_no: firstText(sb.SB_No, sb.SBNo),
        sb_date: toDisplayDate(firstValue(sb.SB_Date, sb.SBDate)),
        cha_license_number: firstText(sb.CHA_License_Number, sb.CHALicenseNumber),
        ieCode: firstText(sb.Importer_Exporter_Code, sb.ImporterExporterCode),
        branchSrNo: firstText(sb.Branch_Sr_No_of_Exporter, sb.BranchSrNoOfExporter),
        branch_sno: firstText(sb.Branch_Sr_No_of_Exporter, sb.BranchSrNoOfExporter),
        exporter: firstText(sb.Imp_Exp_Name, sb.ImpExpName),
        exporter_address: [sb.Imp_Exp_Address1, sb.Imp_Exp_Address2].map(text).filter(Boolean).join(" "),
        exporter_city: firstText(sb.Imp_Exp_City, sb.ImpExpCity),
        exporter_state: firstText(sb.Imp_Exp_State, sb.ImpExpState),
        exporter_pincode: firstText(sb.Imp_Exp_PIN, sb.ImpExpPIN),
        exporter_type: firstText(sb.Type_of_Exporter, sb.TypeOfExporter),
        exporter_class: firstText(sb.Exporter_Class, sb.ExporterClass),
        state_of_origin: firstText(sb.State_of_origin_Exporter, sb.StateOfOriginExporter),
        adCode: firstText(sb.Authorized_Dealer_Code, sb.AuthorizedDealerCode),
        ad_code: firstText(sb.Authorized_Dealer_Code, sb.AuthorizedDealerCode),
        epz_code: firstText(sb.EPZ_code, sb.EPZCode),
        consignees: [
            {
                consignee_name: firstText(sb.Consignee_name, sb.ConsigneeName),
                consignee_address: consigneeAddress,
                consignee_country: firstText(sb.Consignee_Country, sb.ConsigneeCountry),
            },
        ].filter((consignee) => hasAnyValue(consignee)),
        category_of_nfei_sb: firstText(sb.Category_of_NFEI_SB, sb.CategoryOfNFEISB),
        rbi_waiver_no: firstText(sb.RBI_waiver_number, sb.RBIWaiverNumber),
        rbi_waiver_date: toDisplayDate(firstValue(sb.RBI_waiver_date, sb.RBIWaiverDate)),
        port_of_loading: firstText(sb.Port_of_Loading, sb.PortOfLoading),
        destination_port: firstText(sb.Port_of_final_destination, sb.PortOfFinalDestination),
        destination_country: firstText(sb.Country_of_final_destination, sb.CountryOfFinalDestination),
        discharge_country: firstText(sb.Country_of_Discharge, sb.CountryOfDischarge),
        port_of_discharge: firstText(sb.Port_of_Discharge, sb.PortOfDischarge),
        stuffing_seal_type: firstText(sb.Seal_Type, sb.SealType),
        nature_of_cargo: firstText(sb.Nature_of_Cargo, sb.NatureOfCargo),
        gross_weight_kg: firstText(sb.Gross_weight, sb.GrossWeight),
        net_weight_kg: firstText(sb.Net_weight, sb.NetWeight),
        gross_weight_unit: firstText(sb.Unit_of_measurement, sb.UnitOfMeasurement),
        net_weight_unit: firstText(sb.Unit_of_measurement, sb.UnitOfMeasurement),
        total_no_of_pkgs: firstText(sb.Total_number_of_packages, sb.TotalNumberOfPackages),
        marks_nos: firstText(sb.Marks_Numbers, sb.MarksNumbers),
        loose_pkgs: firstText(sb.Number_of_loose_packets, sb.NumberOfLoosePackets),
        no_of_containers: firstText(sb.Number_of_containers, sb.NumberOfContainers),
        mawb_no: firstText(sb.MAWB_Number, sb.MAWBNumber),
        mbl_no: firstText(sb.MAWB_Number, sb.MAWBNumber),
        hawb_no: firstText(sb.HAWB_Number, sb.HAWBNumber),
        hbl_no: firstText(sb.HAWB_Number, sb.HAWBNumber),
        gstn_type: firstText(sb.GSTN_Type, sb.GSTNType),
        gstin: firstText(sb.GSTN_ID, sb.GSTNID),
        hand_carry: firstText(sb.Hand_Carry, sb.HandCarry),
        packingList: arrayFrom(payload.PACKINGLIST).filter(hasAnyValue).map((item) => ({
            packingNumberFrom: firstText(item.Packing_Number_From, item.packingNumberFrom),
            packingNumberTo: firstText(item.Packing_Number_To, item.packingNumberTo),
            packingCode: firstText(item.Packing_Code, item.packingCode),
        })),
        stuffingDetails: arrayFrom(payload.STUFF).filter(hasAnyValue).map((item) => ({
            factoryStuffed: firstText(item.Factory_stuffed, item.factoryStuffed),
            sampleAccompanied: firstText(item.Sample_accompanied, item.sampleAccompanied),
        })),
        containers: arrayFrom(payload.CONTAINER).filter(hasAnyValue).map((container) => ({
            containerNo: firstText(container.Container_number, container.containerNumber),
            containerSize: firstText(container.Container_Size, container.containerSize),
            customSealNo: firstText(container["Excise_Seal_No."], container.Excise_Seal_No, container.exciseSealNo),
            sealNo: firstText(container["Excise_Seal_No."], container.Excise_Seal_No, container.exciseSealNo),
            sealDate: toDisplayDate(firstValue(container.Seal_Date, container.sealDate)),
            sealType: firstText(container.Seal_Type_Indicator, container.sealTypeIndicator),
            sealDeviceId: firstText(container.Seal_Device_ID, container.sealDeviceId),
            movementDocumentType: firstText(container.Movement_Document_Type, container.movementDocumentType),
            movementDocumentNumber: firstText(container.Movement_Document_Number, container.movementDocumentNumber),
        })),
        eSanchitDocuments: arrayFrom(payload.Supportingdocs).filter(hasAnyValue).map((document) => ({
            documentCode: firstText(document.DocumentCode, document.documentCode),
            documentType: firstText(document.DocumentCode, document.documentCode),
            documentName: firstText(document.DocumentName, document.documentName),
            documentFilePath: firstText(document.DocumentFilePath, document.documentFilePath),
            fileUrl: firstText(document.DocumentFilePath, document.documentFilePath),
            documentFileFormat: firstText(document.DocumentFileFormat, document.documentFileFormat),
        })),
        status: "Pending",
    };
}

export const isImpexCubeExportPayload = (payload) =>
    Boolean(
        payload &&
        typeof payload === "object" &&
        (payload.CHADetails || payload.SB_Details || payload.PACKINGLIST || payload.CONTAINER || payload.Supportingdocs),
    );

export const buildImpexCubeExportGetDetailsPayload = (jobOrJobNo) => {
    const rawJob = typeof jobOrJobNo === "object" && jobOrJobNo ? toPlainObject(jobOrJobNo) : {};
    const targetJobNo = typeof jobOrJobNo === "string"
        ? text(jobOrJobNo)
        : firstText(rawJob.job_no, rawJob.jobNumber);

    return {
        Method: "GetJobInfo",
        User_Job_No: targetJobNo,
    };
};
