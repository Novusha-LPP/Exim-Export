import mongoose from "mongoose";

const { Schema, model } = mongoose;

const CUSTOM_HOUSE_CODE_MAP = {
  "AHMEDABAD AIR CARGO": "INAMD4",
  "AHMEDABAD AIR": "INAMD4",
  "AHMEDABAD": "INAMD4",
  "ICD SABARMATI": "INSBI6",
  "SABARMATI": "INSBI6",
  "ICD KHODIYAR": "INSBI6",
  "KHODIYAR": "INSBI6",
  "ICD SACHANA": "INJKA6",
  "SACHANA": "INJKA6",
  "ICD VIROCHAN NAGAR": "INVCN6",
  "ICD VIROCHANNAGAR": "INVCN6",
  "THAR DRY PORT": "INSAU6",
  "THAR": "INSAU6",
  "ICD SANAND": "INSND6",
  "SANAND": "INSND6",
  "ANKLESHWAR ICD": "INAKV6",
  "ANKLESHWAR": "INAKV6",
  "ICD VARNAMA": "INVRM6",
  "VARNAMA": "INVRM6",
  "MUNDRA SEA": "INMUN1",
  "MUNDRA": "INMUN1",
  "KANDLA SEA": "INIXY1",
  "KANDLA": "INIXY1",
  "COCHIN AIR CARGO": "INCOK4",
  "COCHIN AIR": "INCOK4",
  "COCHIN SEA": "INCOK1",
  "COCHIN": "INCOK1",
  HAZIRA: "INHZA1",
  "HAZIRA SEA": "INHZA1",
};

const COUNTRY_CODE_MAP = {
  INDIA: "IN",
  "UNITED ARAB EMIRATES": "AE",
  UAE: "AE",
  USA: "US",
  "UNITED STATES": "US",
  "UNITED STATES OF AMERICA": "US",
  UK: "GB",
  "UNITED KINGDOM": "GB",
  GERMANY: "DE",
  FRANCE: "FR",
  CHINA: "CN",
  JAPAN: "JP",
  AUSTRALIA: "AU",
  CANADA: "CA",
  SINGAPORE: "SG",
  MALAYSIA: "MY",
  "SOUTH AFRICA": "ZA",
  "SAUDI ARABIA": "SA",
  QATAR: "QA",
  KUWAIT: "KW",
  OMAN: "OM",
  BAHRAIN: "BH",
  TURKEY: "TR",
  ITALY: "IT",
  SPAIN: "ES",
  NETHERLANDS: "NL",
  BELGIUM: "BE",
  MEXICO: "MX",
  BRAZIL: "BR",
  "SRI LANKA": "LK",
};

const PORT_CODE_MAP = {
  DUBAI: "AEDXB",
  "ABU DHABI": "AEAUH",
  SHARJAH: "AESHJ",
  "JEBEL ALI": "AEJEA",
  MUMBAI: "INBOM1",
  "NHAVA SHEVA": "INNSA1",
  CHENNAI: "INMAA1",
  KOLKATA: "INCCU1",
  COCHIN: "INCOK1",
  KANDLA: "INIXY1",
  MUNDRA: "INMUN1",
  HAZIRA: "INHZA1",
  AHMEDABAD: "INAMD4",
  DELHI: "INDEL4",
  "DELHI AIR": "INDEL4",
  "MUMBAI AIR": "INBOM4",
  BANGALORE: "INBLR4",
  HYDERABAD: "INHYD4",
  "CHENNAI AIR": "INMAA4",
  SINGAPORE: "SGSIN",
  "PORT KLANG": "MYPKG",
  HAMBURG: "DEHAM",
  ROTTERDAM: "NLRTM",
  ANTWERP: "BEANR",
  "NEW YORK": "USNYC",
  "LOS ANGELES": "USLAX",
  HOUSTON: "USHOU",
  COLOMBO: "LKCMB",
};

const STATE_CODE_MAP = {
  "JAMMU AND KASHMIR": "01",
  "HIMACHAL PRADESH": "02",
  PUNJAB: "03",
  CHANDIGARH: "04",
  UTTARAKHAND: "05",
  HARYANA: "06",
  DELHI: "07",
  RAJASTHAN: "08",
  "UTTAR PRADESH": "09",
  BIHAR: "10",
  SIKKIM: "11",
  "ARUNACHAL PRADESH": "12",
  NAGALAND: "13",
  MANIPUR: "14",
  MIZORAM: "15",
  TRIPURA: "16",
  MEGHALAYA: "17",
  ASSAM: "18",
  "WEST BENGAL": "19",
  JHARKHAND: "20",
  ODISHA: "21",
  CHHATTISGARH: "22",
  "MADHYA PRADESH": "23",
  GUJARAT: "24",
  "DADRA AND NAGAR HAVELI AND DAMAN AND DIU": "26",
  MAHARASHTRA: "27",
  "ANDHRA PRADESH": "28",
  KARNATAKA: "29",
  GOA: "30",
  LAKSHADWEEP: "31",
  KERALA: "32",
  "TAMIL NADU": "33",
  TAMILNADU: "33",
  PUDUCHERRY: "34",
  "ANDAMAN AND NICOBAR ISLANDS": "35",
  TELANGANA: "36",
  LADAKH: "37",
};

const MONTH_CODE_MAP = {
  JAN: 1,
  FEB: 2,
  MAR: 3,
  APR: 4,
  MAY: 5,
  JUN: 6,
  JUL: 7,
  AUG: 8,
  SEP: 9,
  OCT: 10,
  NOV: 11,
  DEC: 12,
};

const toPlainObject = (value) =>
  value && typeof value.toObject === "function"
    ? value.toObject({ virtuals: false })
    : value || {};

const text = (value) =>
  String(value ?? "")
    .replace(/[^\x00-\x7F]/g, " ")
    .replace(/[\x00-\x1F\x7F]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const upperText = (value) => text(value).toUpperCase();

const firstValue = (...values) => {
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

const firstText = (...values) => text(firstValue(...values));
const firstUpperText = (...values) => upperText(firstValue(...values));

const splitFixed = (value, size, slots) => {
  const normalized = text(value);
  return Array.from({ length: slots }, (_, index) =>
    normalized.slice(index * size, (index + 1) * size).trim(),
  );
};

const extractPinFromAddress = (address) => {
  const normalized = text(address);
  const match = normalized.match(/(?:^|[,\s])(\d{6})\s*$/);
  if (!match) return { address: normalized, pin: "" };
  return {
    address: normalized.replace(/,?\s*\d{6}\s*$/, "").trim(),
    pin: match[1],
  };
};

const parseDateParts = (value) => {
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

const pad2 = (value) => String(value).padStart(2, "0");

const toImpexCubeDate = (value) => {
  const parts = parseDateParts(value);
  if (!parts) return "";
  return `${parts.year}${pad2(parts.month)}${pad2(parts.day)}`;
};

const toDisplayDate = (value) => {
  const parts = parseDateParts(value);
  if (!parts) return "";
  return `${pad2(parts.day)}-${pad2(parts.month)}-${parts.year}`;
};

const normalizeFinancialYear = (value, dateValue) => {
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

const toShortFinancialYear = (value) => {
  const normalized = normalizeFinancialYear(value);
  const match = normalized.match(/^(\d{4})-(\d{4})$/);
  if (!match) return text(value);
  return `${match[1].slice(-2)}-${match[2].slice(-2)}`;
};

const stripLeadingZeros = (value) => {
  const parsed = Number.parseInt(String(value || "").replace(/\D/g, ""), 10);
  return Number.isNaN(parsed) ? "" : String(parsed);
};

const extractJobSequenceNo = (jobNo) => {
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

const codeFromText = (value, lookup, fallbackLength) => {
  const raw = upperText(value);
  if (!raw) return "";

  const parenthesizedCode = raw.match(/\(([^)]+)\)/);
  if (parenthesizedCode) return upperText(parenthesizedCode[1]);

  if (lookup[raw]) return lookup[raw];
  if (/^[A-Z]{2}[A-Z0-9]{3,4}$/.test(raw)) return raw;
  if (/^[A-Z0-9]{2,6}$/.test(raw)) return raw;

  return fallbackLength ? raw.slice(0, fallbackLength) : raw;
};

const customHouseCode = (value) => codeFromText(value, CUSTOM_HOUSE_CODE_MAP, 6);
const portCode = (value) => codeFromText(value, PORT_CODE_MAP, 6);

const countryCode = (value) => {
  const raw = upperText(value);
  if (!raw) return "";

  const parenthesizedCode = raw.match(/\(([^)]+)\)/);
  if (parenthesizedCode) return upperText(parenthesizedCode[1]).slice(0, 2);
  if (/^[A-Z]{2}$/.test(raw)) return raw;
  if (COUNTRY_CODE_MAP[raw]) return COUNTRY_CODE_MAP[raw];

  return raw.slice(0, 2);
};

const stateCode = (value) => {
  const raw = upperText(value);
  if (!raw) return "";
  if (/^\d{2}$/.test(raw)) return raw;

  return (
    STATE_CODE_MAP[raw] ||
    STATE_CODE_MAP[raw.replace(/\s+/g, "")] ||
    ""
  );
};

const exporterTypeCode = (value) => {
  const raw = upperText(value);
  if (/^[RFMI]$/.test(raw)) return raw;
  if (raw.includes("MERCHANT") || raw.includes("REGISTERED")) return "R";
  if (raw.includes("MANUFACTURER")) return "F";
  return raw || "F";
};

const natureOfCargoCode = (value) => {
  const raw = upperText(value);
  if (["C", "P", "L", "D"].includes(raw)) return raw;
  if (raw.includes("CONTAINER") || raw.startsWith("C -") || raw.startsWith("CP -")) {
    return "C";
  }
  if (raw.startsWith("LB") || raw.includes("LIQUID BULK")) return "L";
  if (raw.startsWith("DB") || raw.includes("DRY BULK")) return "D";
  return raw ? "P" : "";
};

const gstnTypeCode = (value) => {
  const raw = upperText(value);
  if (raw.length === 15) return "GSN";
  if (raw.length === 10) return "PAN";
  return raw ? "OTH" : "";
};

const panFromGstin = (value) => {
  const raw = upperText(value);
  return raw.length === 15 ? raw.slice(2, 12) : "";
};

const numberString = (value, decimals) => {
  if (value === null || value === undefined || text(value) === "") return "";
  const parsed = Number(String(value).replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed.toFixed(decimals) : text(value);
};

const toYN = (value) => {
  if (value === null || value === undefined || text(value) === "") return "";
  if (typeof value === "boolean") return value ? "Y" : "N";

  const raw = upperText(value);
  if (["Y", "YES", "TRUE", "1"].includes(raw)) return "Y";
  if (["N", "NO", "FALSE", "0"].includes(raw)) return "N";
  return raw;
};

const factoryStuffedFlag = (value) => {
  const raw = upperText(value);
  if (!raw) return "";
  if (raw.includes("FACTORY")) return "Y";
  if (raw.includes("DOCK") || raw.includes("CFS") || raw.includes("PORT")) return "N";
  return toYN(raw);
};

const sealTypeCode = (...values) => {
  const raw = firstUpperText(...values);
  if (!raw) return "";
  if (raw === "S" || raw.includes("SELF") || raw.includes("SHIPPER") || raw.includes("AGENT")) {
    return "S";
  }
  if (raw === "W" || raw.includes("WAREHOUSE") || raw.includes("WEARHOUSE")) {
    return "W";
  }
  if (raw === "C" || raw.includes("CUSTOM")) return "C";
  return raw.slice(0, 1);
};

const getFirstProduct = (job) => {
  const invoice = (job.invoices || []).find((item) => (item.products || []).length > 0);
  return invoice?.products?.[0] || {};
};

const hasNfeiProduct = (job) =>
  (job.invoices || []).some((invoice) =>
    (invoice.products || []).some((product) => {
      const schemeCode = firstText(product.eximCode).split(" ")[0];
      return schemeCode === "99" || firstText(product.nfeiCategory);
    }),
  );

const arrayFrom = (value) => {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
};

const firstArray = (...values) => {
  for (const value of values) {
    if (!value) continue;
    if (Array.isArray(value) && value.length > 0) return value;
    if (!Array.isArray(value) && text(value) !== "") return [value];
  }
  return [];
};

const hasAnyValue = (value) =>
  Object.values(value || {}).some((item) => text(item) !== "");

const extensionFromPath = (value) => {
  const cleanPath = text(value);
  const match = cleanPath.match(/\.([a-zA-Z0-9]+)(?:$|\?)/);
  return match ? match[1].toUpperCase() : "";
};

function buildImpexCubeExportPayload(jobOrDoc, options = {}) {
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
  const exporterAddressInfo = extractPinFromAddress(job.exporter_address);
  const exporterAddressLines = splitFixed(exporterAddressInfo.address, 35, 2);
  const consigneeAddressLines = splitFixed(consignee.consignee_address, 35, 4);
  const gstin = firstUpperText(job.gstin, job.gstn, job.panNo, job.pan_no, job.ieCode);
  const loadingPort = customHouseCode(firstValue(job.port_of_loading, job.custom_house));
  const destinationPort = portCode(firstValue(job.destination_port, job.final_destination));
  const dischargePort = portCode(firstValue(job.port_of_discharge, job.discharge_port));
  const containers = arrayFrom(job.containers).filter((container) =>
    firstText(container?.containerNo),
  );
  const docs = firstArray(job.eSanchitDocuments, job.supportingDocs);
  const includeEmptyRows = options.includeEmptyRows !== false;

  const packingRows = firstArray(job.packingList, job.packing_list).map((item) => ({
    Packing_Number_From: firstText(item?.Packing_Number_From, item?.packingNumberFrom, item?.packing_number_from, item?.from),
    Packing_Number_To: firstText(item?.Packing_Number_To, item?.packingNumberTo, item?.packing_number_to, item?.to),
    Packing_Code: firstText(item?.Packing_Code, item?.packingCode, item?.packing_code, item?.code),
  })).filter(hasAnyValue);

  const stuffRows = firstArray(job.stuffDetails, job.stuff, job.STUFF).map((item) => ({
    Factory_stuffed: toYN(firstValue(item?.Factory_stuffed, item?.factoryStuffed, item?.factory_stuffed)),
    Sample_accompanied: toYN(firstValue(item?.Sample_accompanied, item?.sampleAccompanied, item?.sample_accompanied)),
  })).filter(hasAnyValue);

  const defaultStuffRow = {
    Factory_stuffed: factoryStuffedFlag(job.goods_stuffed_at),
    Sample_accompanied: toYN(job.sample_accompanied),
  };

  return {
    CHADetails: {
      CHA_Code: firstText(options.chaCode, process.env.IMPEXCUBE_CHA_CODE, job.cha_code, job.chaCode, "NOVU"),
      "CHA Code": firstText(options.chaCode, process.env.IMPEXCUBE_CHA_CODE, job.cha_code, job.chaCode, "NOVU"),
      CHA_Branch_Code: mapBranchToChaBranch(firstText(options.chaBranchCode, process.env.IMPEXCUBE_CHA_BRANCH_CODE, job.cha_branch_code, job.chaBranchCode, job.branch_code, "NOVUAMD")),
      "CHA Branch Code": mapBranchToChaBranch(firstText(options.chaBranchCode, process.env.IMPEXCUBE_CHA_BRANCH_CODE, job.cha_branch_code, job.chaBranchCode, job.branch_code, "NOVUAMD")),
      Financial_Year: firstText(
        options.financialYear,
        process.env.IMPEXCUBE_FYEAR,
        process.env.FYEAR,
        job.financial_year,
        job.financialYear,
        normalizeFinancialYear(job.year, job.job_date),
        "2026-2027",
      ),
      "Financial Year": firstText(
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
      Custom_house_Code: customHouseCode(job.custom_house),
      Job_Sequence_No: firstText(
        job.job_sequence_no,
        job.jobSequenceNo,
        extractJobSequenceNo(firstValue(job.job_no, job.jobNumber)),
      ),
      User_Job_No: firstText(job.job_no, job.jobNumber),
      User_Job_Date: toImpexCubeDate(job.job_date),
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
      Branch_Sr_No_of_Exporter: firstText(job.branchSrNo, job.branch_sno, job.branch_sr_no, "1"),
      Imp_Exp_Name: firstText(job.exporter),
      Imp_Exp_Address1: firstText(job.exporter_address1, exporterAddressLines[0]),
      Imp_Exp_Address2: firstText(job.exporter_address2, exporterAddressLines[1]),
      Imp_Exp_City: firstText(job.exporter_city, job.city),
      Imp_Exp_State: firstText(job.exporter_state, job.state),
      Imp_Exp_PIN: firstText(job.exporter_pincode, exporterAddressInfo.pin),
      Type_of_Exporter: exporterTypeCode(job.exporter_type),
      Exporter_Class: firstUpperText(job.exporter_class, "P"),
      State_of_origin_Exporter: firstText(
        job.state_of_origin,
        stateCode(firstValue(job.exporter_state, job.state)),
      ),
      Authorized_Dealer_Code: firstText(job.adCode, job.ad_code),
      EPZ_code: firstText(job.epz_code, job.epzCode),
      Consignee_name: firstText(consignee.consignee_name),
      Consignee_Address_1: consigneeAddressLines[0],
      Consignee_Address_2: consigneeAddressLines[1],
      Consignee_Address_3: consigneeAddressLines[2],
      Consignee_Address_4: consigneeAddressLines[3],
      Consignee_Country: countryCode(consignee.consignee_country),
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
      Country_of_final_destination: firstText(countryCode(job.destination_country), destinationPort.slice(0, 2)),
      Country_of_Discharge: firstText(countryCode(job.discharge_country), dischargePort.slice(0, 2)),
      Port_of_Discharge: dischargePort,
      Seal_Type: sealTypeCode(job.seal_type, job.stuffing_seal_type, containers[0]?.sealType),
      Nature_of_Cargo: natureOfCargoCode(job.nature_of_cargo),
      Gross_weight: numberString(job.gross_weight_kg, 3),
      Net_weight: numberString(job.net_weight_kg, 3),
      Unit_of_measurement: firstUpperText(job.gross_weight_unit, job.net_weight_unit, "KGS"),
      Total_number_of_packages: firstText(job.total_no_of_pkgs, job.totalPackages),
      Marks_Numbers: firstText(job.marks_nos, job.marksAndNumbers),
      Number_of_loose_packets: firstText(job.loose_pkgs, "0"),
      Number_of_containers: firstText(job.no_of_containers, containers.length ? String(containers.length) : "0"),
      MAWB_Number: firstText(job.mawb_no, job.mbl_no),
      HAWB_Number: firstText(job.hawb_no, job.hbl_no),
      GSTN_Type: firstUpperText(job.gstn_type, job.gstnType, gstnTypeCode(gstin)),
      GSTN_ID: gstin,
      Hand_Carry: toYN(firstValue(job.hand_carry, job.handCarry)),
    },
    PACKINGLIST: packingRows.length || !includeEmptyRows
      ? packingRows
      : [{ Packing_Number_From: "", Packing_Number_To: "", Packing_Code: "" }],
    STUFF: stuffRows.length || !includeEmptyRows
      ? stuffRows
      : [defaultStuffRow],
    CONTAINER: containers.length || !includeEmptyRows
      ? containers.map((container) => ({
        Container_number: firstText(container.containerNo, container.container_number),
        Container_Size: firstText(container.containerSize, container.container_size, container.type).replace(/[^0-9]/g, "").slice(0, 2),
        "Excise_Seal_No.": firstText(container.customSealNo, container.exciseSealNo, container.sealNo, container.shippingLineSealNo),
        Seal_Date: toImpexCubeDate(container.sealDate),
        Seal_Type_Indicator: sealTypeCode(container.sealType, job.stuffing_seal_type),
        Seal_Device_ID: firstText(container.sealDeviceId, container.rfid),
        Movement_Document_Type: firstText(container.movementDocumentType, container.movement_document_type),
        Movement_Document_Number: firstText(container.movementDocumentNumber, container.movement_document_number),
      }))
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
    Supportingdocs: docs.length || !includeEmptyRows
      ? docs.map((doc) => {
        const filePath = firstText(doc.documentFilePath, doc.fileUrl, doc.icegateFilename);
        return {
          DocumentCode: firstText(doc.DocumentCode, doc.documentCode, doc.documentType),
          DocumentName: firstText(doc.DocumentName, doc.documentName, doc.documentReferenceNo, doc.icegateFilename),
          DocumentFilePath: filePath,
          DocumentFileFormat: firstUpperText(doc.DocumentFileFormat, doc.documentFileFormat, extensionFromPath(filePath)),
        };
      })
      : [{ DocumentCode: "", DocumentName: "", DocumentFilePath: "", DocumentFileFormat: "" }],
  };
}

function buildExportJobFromImpexCubePayload(payload = {}) {
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

const isImpexCubeExportPayload = (payload) =>
  Boolean(
    payload &&
    typeof payload === "object" &&
    (payload.CHADetails || payload.SB_Details || payload.PACKINGLIST || payload.CONTAINER || payload.Supportingdocs),
  );

const buildImpexCubeExportGetDetailsPayload = (jobOrJobNo) => ({
  Method: "GetJobInfo",
  User_Job_No:
    typeof jobOrJobNo === "string"
      ? text(jobOrJobNo)
      : firstText(toPlainObject(jobOrJobNo).job_no, toPlainObject(jobOrJobNo).jobNumber),
});

// Sub-schemas for complex nested data
const areDetailsSchema = new Schema(
  {
    serialNumber: { type: Number },
    areNumber: { type: String, trim: true },
    areDate: { type: String, trim: true }, // Changed to String for dd-mm-yyyy
    commissionerate: { type: String, trim: true },
    division: { type: String, trim: true },
    range: { type: String, trim: true },
    remark: { type: String, trim: true },
  },
  { _id: true },
);
const deecSchema = new Schema(
  {
    isDeecItem: { type: Boolean, default: false },
    itemSnoPartE: { type: String, trim: true },
    exportQtyUnderLicence: { type: Number, default: 0 },
    exportQtyUnit: { type: String, trim: true },

    // DEEC Items table
    deecItems: [
      {
        serialNumber: { type: Number },
        itemSnoPartC: { type: String, trim: true },
        description: { type: String, trim: true },
        quantity: { type: Number, default: 0 },
        unit: { type: String, trim: true },
        itemType: {
          type: String,
          enum: ["Indigenous", "Imported"],
          default: "Indigenous",
        },
      },
    ],

    // Reference information
    deec_reg_obj: [
      {
        licRefNo: { type: String, trim: true },
        regnNo: { type: String, trim: true },
        licDate: { type: String, trim: true },
      },
    ],
  },
  { _id: true },
);

// EPCG Schema
const epcgSchema = new Schema(
  {
    isEpcgItem: { type: Boolean, default: false },
    itemSnoPartE: { type: String, trim: true },
    exportQtyUnderLicence: { type: Number, default: 0 },
    exportQtyUnit: { type: String, trim: true },

    // EPCG Items table
    epcgItems: [
      {
        serialNumber: { type: Number },
        itemSnoPartC: { type: String, trim: true },
        description: { type: String, trim: true },
        quantity: { type: Number, default: 0 },
        unit: { type: String, trim: true },
        itemType: {
          type: String,
          enum: ["Indigenous", "Imported"],
          default: "Indigenous",
        },
      },
    ],

    // Reference information
    epcg_reg_obj: [
      {
        licRefNo: { type: String, trim: true },
        regnNo: { type: String, trim: true },
        licDate: { type: String, trim: true },
      },
    ],
  },
  { _id: true },
);
const cessExpDutySchema = new Schema(
  {
    // master flag
    cessDutyApplicable: { type: Boolean, default: false },

    // each row has: code dropdown, rate value+unit, TV value+factor, qty, desc
    exportDutyCode: { type: String, trim: true },
    exportDuty: { type: Number, default: 0 }, // base amount if needed
    exportDutyRate: { type: Number, default: 0 },
    exportDutyRateUnit: { type: String, trim: true }, // "% or Rs"
    exportDutyTariffValue: { type: Number, default: 0 },
    exportDutyTariffFactor: { type: Number, default: 0 },
    exportDutyQty: { type: Number, default: 0 },
    exportDutyDesc: { type: String, trim: true },

    cessCode: { type: String, trim: true },
    cess: { type: Number, default: 0 },
    cessRate: { type: Number, default: 0 },
    cessRateUnit: { type: String, trim: true },
    cessTariffValue: { type: Number, default: 0 },
    cessTariffFactor: { type: Number, default: 0 },
    cessQty: { type: Number, default: 0 },
    cessDesc: { type: String, trim: true },

    otherDutyCessCode: { type: String, trim: true },
    otherDutyCess: { type: Number, default: 0 },
    otherDutyCessRate: { type: Number, default: 0 },
    otherDutyCessRateUnit: { type: String, trim: true },
    otherDutyCessTariffValue: { type: Number, default: 0 },
    otherDutyCessTariffFactor: { type: Number, default: 0 },
    otherDutyCessQty: { type: Number, default: 0 },
    otherDutyCessDesc: { type: String, trim: true },

    tariffValue_tv: { type: Number, default: 0 },
    tariffUnit_tv: { type: String, trim: true },

    thirdCessCode: { type: String, trim: true },
    thirdCess: { type: Number, default: 0 },
    thirdCessRate: { type: Number, default: 0 },
    thirdCessRateUnit: { type: String, trim: true },
    thirdCessTariffValue: { type: Number, default: 0 },
    thirdCessTariffFactor: { type: Number, default: 0 },
    thirdCessQty: { type: Number, default: 0 },
    thirdCessDesc: { type: String, trim: true },

    // common unit field at bottom right
    cessUnit: { type: String, trim: true },

    // nested CENVAT block from screenshot
    cenvat: {
      certificateNumber: { type: String, trim: true },
      date: { type: String, trim: true },
      validUpto: { type: String, trim: true },
      cexOfficeCode: { type: String, trim: true },
      assesseeCode: { type: String, trim: true },
    },
  },
  { _id: false },
);

const freightInsuranceChargesSchema = new Schema(
  {
    freight: {
      currency: { type: String, ref: "Currency" },
      exchangeRate: { type: Number },
      rate: { type: Number },
      baseValue: { type: Number },
      amount: { type: Number },
    },
    insurance: {
      currency: { type: String, ref: "Currency" },
      exchangeRate: { type: Number },
      rate: { type: Number },
      baseValue: { type: Number },
      amount: { type: Number },
    },
    discount: {
      currency: { type: String, ref: "Currency" },
      exchangeRate: { type: Number },
      rate: { type: Number },
      amount: { type: Number },
    },
    otherDeduction: {
      currency: { type: String, ref: "Currency" },
      exchangeRate: { type: Number },
      rate: { type: Number },
      amount: { type: Number },
    },
    commission: {
      currency: { type: String, ref: "Currency" },
      exchangeRate: { type: Number },
      rate: { type: Number },
      amount: { type: Number },
    },
    fobValue: {
      currency: { type: String, ref: "Currency" },
      fobValueUSD: { type: Number },
      amount: { type: Number },
    },
  },
  { _id: false },
);

// Drawback Details Schema
const drawbackDetailsSchema = new Schema(
  {
    dbkitem: { type: Boolean, default: false },
    dbkSrNo: { type: String },
    fobValue: { type: String, min: 0 },
    quantity: { type: Number, min: 0 },
    unit: { type: String, trim: true },
    dbkUnder: {
      type: String,
      enum: ["Actual", "Provisional"],
      default: "Actual",
    },
    dbkDescription: { type: String, maxlength: 500 },
    dbkRate: { type: Number, default: 0, min: 0 },
    dbkCap: { type: Number, default: 0, min: 0 },
    dbkCapunit: { type: String, trim: true },
    dbkAmount: { type: Number, default: 0, min: 0 },
    percentageOfFobValue: { type: String },
    // ROSCTL fields
    slRate: { type: Number, default: 0 },
    slCap: { type: Number, default: 0 },
    ctlRate: { type: Number, default: 0 },
    ctlCap: { type: Number, default: 0 },
    rosctlAmount: { type: Number, default: 0 },
    rosctlCategory: { type: String, trim: true }, // "B" or "D"
    showRosctl: { type: Boolean, default: false },
    drawback_scroll_date: { type: String, trim: true },
    drawback_scroll_no: { type: String, trim: true },
    rosctl_scroll_no: { type: String, trim: true },
    rosctl_scroll_date: { type: String, trim: true },
    manualQuantity: { type: Boolean, default: false },
    manualUnit: { type: Boolean, default: false },

  },
  { _id: true },
);
// Product/Item Details Schema (for multiple products per invoice)
const productDetailsSchema = new Schema(
  {
    serialNumber: { type: String },
    description: { type: String, maxlength: 500 },
    ritc: { type: String, ref: "TariffHead" },
    quantity: { type: String },
    qtyUnit: { type: String },
    socQuantity: { type: String, default: "0" },
    socunit: { type: String },
    isSqcQuantityManual: { type: Boolean, default: false },
    isSqcUnitManual: { type: Boolean, default: false },
    unitPrice: { type: String },
    priceUnit: { type: String },
    per: { type: String },
    perUnit: { type: String },
    amount: { type: String },
    amountUnit: { type: String },

    // --- General / Origin Details ---

    eximCode: { type: String, trim: true },
    nfeiCategory: { type: String, trim: true },
    rewardItem: { type: Boolean, default: false }, // Changed to Boolean
    strCode: { type: String, trim: true },
    endUse: { type: String, trim: true },
    originDistrict: { type: String, trim: true },
    originState: { type: String, trim: true },
    ptaFtaInfo: { type: String, trim: true },
    alternateQty: { type: String, default: "0" },
    materialCode: { type: String, trim: true },
    medicinalPlant: { type: String, trim: true },
    formulation: { type: String, trim: true },
    surfaceMaterialInContact: { type: String, trim: true },
    labGrownDiamond: { type: String, trim: true },

    // --- PMV Info (Grouped) ---
    pmvInfo: {
      currency: { type: String },
      calculationMethod: { type: String, trim: true }, // 'percentage' or 'value'
      percentage: { type: String, default: "110" },
      pmvPerUnit: { type: String, default: "0" },
      totalPMV: { type: String, default: "0" },
    },

    // --- IGST & Compensation Cess Info (Grouped) ---
    igstCompensationCess: {
      igstPaymentStatus: { type: String, trim: true, default: "LUT" },
      taxableValueINR: { type: String, default: "0" },
      isTaxableValueManual: { type: Boolean, default: false },
      igstRate: { type: String, default: "0" },
      igstAmountINR: { type: String, default: "0" },
      isIgstManual: { type: Boolean, default: false },
      compensationCessRate: { type: String, default: "0" },
      compensationCessAmountINR: { type: String, default: "0" },
    },

    // --- RODTEP Info (Grouped) ---
    rodtepInfo: {
      claim: { type: String, trim: true, default: "Yes" },
      quantity: { type: String, default: "0" },
      ratePercent: { type: String, default: "0" },
      capValue: { type: String, default: "0" },
      capValuePerUnits: { type: String, default: "0" },
      amountINR: { type: String, default: "0" },
      unit: { type: String, trim: true }, // Added unit if needed
      capUnit: { type: String, trim: true }, // Added capUnit if needed
      isCapUnitManual: { type: Boolean, default: false },
    },

    // --- ROSCTL Info (Grouped) ---
    rosctlInfo: {
      claim: { type: String, trim: true, default: "No" },
      quantity: { type: String, default: "0" },
      slRate: { type: String, default: "0" },
      slCap: { type: String, default: "0" },
      ctlRate: { type: String, default: "0" },
      ctlCap: { type: String, default: "0" },
      amountINR: { type: String, default: "0" },
      category: { type: String, trim: true }, // "B" or "D"
    },

    cessExpDuty: { type: cessExpDutySchema },

    // --- Re-Export Details ---
    reExport: {
      isReExport: { type: Boolean, default: false },
      warehouseName: { type: String, trim: true },
      warehouseCode: { type: String, trim: true },

      // Import / B/E Side
      beNumber: { type: String, trim: true },
      beDate: { type: String, trim: true }, // Date picker
      invoiceSerialNo: { type: String, trim: true },
      itemSerialNo: { type: String, trim: true },
      importPortCode: { type: String, trim: true },
      manualBE: { type: Boolean, default: false },
      beItemDescription: { type: String, trim: true },

      quantityImported: { type: Number, default: 0 },
      qtyImportedUnit: { type: String, trim: true }, // Added (Missing in original)

      assessableValue: { type: Number, default: 0 },
      totalDutyPaid: { type: Number, default: 0 },
      dutyPaidDate: { type: String, trim: true },

      // Export Side
      quantityExported: { type: Number, default: 0 },
      qtyExportedUnit: { type: String, trim: true }, // Added (Missing in original)

      technicalDetails: { type: String, trim: true },

      inputCreditAvailed: { type: Boolean, default: false },
      personalUseItem: { type: Boolean, default: false },

      otherIdentifyingParameters: { type: String, trim: true },

      againstExportObligation: { type: Boolean, default: false }, // Changed to Boolean to match checkbox
      obligationNo: { type: String, trim: true },

      drawbackAmtClaimed: { type: Number, default: 0 },

      itemUnUsed: { type: Boolean, default: false },
      commissionerPermission: { type: Boolean, default: false }, // Changed to Boolean to match checkbox

      boardNumber: { type: String, trim: true },
      boardDate: { type: String, trim: true }, // Added (Missing in original)

      modvatAvailed: { type: Boolean, default: false },
      modvatReversed: { type: Boolean, default: false },

      // Legacy fields just in case
      commPermissionDate: { type: String, trim: true },
    },

    // --- Other Details ---
    otherDetails: {
      accessories: { type: String, trim: true, default: "" },
      accessoriesRemarks: { type: String, trim: true, default: "" },
      isThirdPartyExport: { type: Boolean, default: false },
      thirdParty: {
        name: { type: String, trim: true },
        ieCode: { type: String, trim: true },
        branchSrNo: { type: String, trim: true },
        regnNo: { type: String, trim: true },
        address: { type: String, trim: true },
      },
      manufacturer: {
        name: { type: String, trim: true },
        code: { type: String, trim: true },
        address: { type: String, trim: true },
        country: { type: String, trim: true },
        stateProvince: { type: String, trim: true },
        postalCode: { type: String, trim: true },
        sourceState: { type: String, trim: true },
        transitCountry: { type: String, trim: true },
      },
    },

    areDetails: [areDetailsSchema],
    deecDetails: deecSchema,
    epcgDetails: epcgSchema,
    drawbackDetails: [drawbackDetailsSchema],

    // --- Legacy / Flat fields (kept for SB Type logic compatibility) ---
    sbTypeDetails: { type: String, trim: true },
    dbkType: { type: String, trim: true },
    cessExciseDuty: { type: String, default: "0" },
    compensationCess: { type: String, default: "0" },
  },
  { _id: true },
);

// Invoice Schema (multiple invoices per job)
const invoiceSchema = new Schema(
  {
    invoiceNumber: { type: String },
    invoiceDate: { type: String, trim: true },
    termsOfInvoice: {
      type: String,
      default: "FOB",
    },
    toiPlace: {
      type: String,
      trim: true,
    },
    currency: {
      type: String,
      ref: "Currency",
    },
    invoiceValue: { type: Number, min: 0 },
    productValue: { type: Number, min: 0 },
    priceIncludes: {
      type: String,
      enum: ["Both", "Freight", "Insurance", "None"],
      default: "Both",
    },
    packing_charges: { type: Number, default: 0 },
    products: [productDetailsSchema],
    freightInsuranceCharges: { type: freightInsuranceChargesSchema },
  },
  { _id: true },
);
// Payment Request Schema

// Container Details Schema
const containerDetailsSchema = new Schema(
  {
    serialNumber: { type: Number },
    containerNo: { type: String },
    containerSize: { type: String, trim: true },
    sealNo: String,
    customSealNo: { type: String, trim: true },
    shippingLineSealNo: String,
    sealDate: { type: String, trim: true },
    type: {
      type: String,
    },
    pkgsStuffed: { type: Number, default: 0 },
    grossWeight: { type: Number, default: 0 },
    maxGrossWeightKgs: { type: Number, default: 0 },
    vgmWtInvoice: { type: Number, default: 0 },
    maxPayloadKgs: { type: Number, default: 0 },
    sealType: {
      type: String,
    },
    grWtPlusTrWt: { type: Number, default: 0 },
    tareWeightKgs: { type: Number, default: 0 },
    sealDeviceId: String,
    rfid: String,
    movementDocumentType: { type: String, trim: true },
    movementDocumentNumber: { type: String, trim: true },
    images: [String],
    // Weighment Details
    weighBridgeName: { type: String, trim: true },
    weighmentTransporterName: { type: String, trim: true },
    weighmentRegNo: { type: String, trim: true },
    weighmentDateTime: { type: String, trim: true },
    weighmentVehicleNo: { type: String, trim: true },
    weighmentTareWeight: { type: Number, default: 0 },
    weighmentAddress: { type: String, trim: true },
    weighmentImages: [String],
  },
  { _id: true },
);

const packingListSchema = new Schema(
  {
    packingNumberFrom: { type: String, trim: true },
    packingNumberTo: { type: String, trim: true },
    packingCode: { type: String, trim: true },
  },
  { _id: true },
);

const stuffingDetailsSchema = new Schema(
  {
    factoryStuffed: { type: String, trim: true },
    sampleAccompanied: { type: String, trim: true },
  },
  { _id: true },
);
// Buyer/Third Party Information Schema
const buyerThirdPartySchema = new Schema(
  {
    // Buyer Information
    buyer: {
      name: { type: String },
      addressLine1: String,
      city: String,
      pin: String,
      country: { type: String, ref: "Country" },
      state: String,
    },

    // Third Party Information (if applicable)
    thirdParty: {
      isThirdPartyExport: { type: Boolean, default: false },
      name: String,
      city: String,
      pin: String,
      country: { type: String, ref: "Country" },
      state: String,
      address: String,
    },

    // Manufacturer/Producer/Grower Details
    manufacturer: {
      name: String,
      ieCode: String,
      branchSerialNo: String,
      registrationNo: String,
      address: String,
      country: { type: String, ref: "Country", default: "IN" },
      stateProvince: String,
      postalCode: String,
      sourceState: { type: String, ref: "State" },
      transitCountry: { type: String, ref: "Country" },
    },
  },
  { _id: false },
);
// AP Invoice Schema (Financial - Accounts Payable)
const apInvoiceSchema = new Schema(
  {
    date: { type: String, trim: true },
    bill_no: { type: String, trim: true },
    type: { type: String, trim: true, default: "INV" },
    organization: { type: String, trim: true },
    currency: { type: String, trim: true },
    amount: { type: Number, default: 0 },
    balance: { type: Number, default: 0 },
    vendor_bill_no: { type: String, trim: true },
  },
  { _id: true },
);

const arInvoiceSchema = new Schema(
  {
    date: { type: String, trim: true },
    bill_no: { type: String, trim: true },
    type: { type: String, trim: true, default: "INV" },
    organization: { type: String, trim: true },
    currency: { type: String, trim: true },
    amount: { type: Number, default: 0 },
    balance: { type: Number, default: 0 },
  },
  { _id: true },
);

// eSanchit Document Schema
const eSanchitDocumentSchema = new Schema({
  documentLevel: { type: String, enum: ["Invoice", "Item", "Job"] },
  scope: {
    type: String,
  },
  invSerialNo: String,
  itemSerialNo: String,
  irn: String,
  documentType: String,
  documentReferenceNo: String,
  documentCode: String,
  documentName: String,
  documentFilePath: String,
  documentFileFormat: String,
  otherIcegateId: String,
  icegateFilename: String,
  dateOfIssue: { type: String, trim: true },
  placeOfIssue: String,
  expiryDate: { type: String, trim: true },
  fileUrl: String,

  dateTimeOfUpload: { type: String, trim: true },
  issuingParty: {
    name: String,
    code: String,
    addressLine1: String,
    addressLine2: String,
    city: String,
    pinCode: String,
  },
  beneficiaryParty: {
    name: String,
    code: String,
    addressLine1: String,
    addressLine2: String,
    city: String,
    pinCode: String,
  },
});

// Charge Schema
const chargeSchema = new Schema(
  {
    chargeHead: { type: String },
    category: { type: String },
    chargeType: { type: String, enum: ['Margin', 'Reimbursement'], default: 'Margin' },
    hsnCode: { type: String, trim: true },
    tdsCategory: { type: String, trim: true },
    isPbMandatory: { type: Boolean, default: false },

    // Top-level fields
    invoice_number: { type: String, trim: true },
    invoice_date: { type: String, trim: true },
    remark: { type: String, trim: true },
    purchase_book_no: { type: String, trim: true },
    purchase_book_status: { type: String, trim: true },
    purchase_book_is_approved: { type: Boolean, default: false },
    payment_request_no: { type: String, trim: true },
    payment_request_status: { type: String, trim: true },
    payment_request_is_approved: { type: Boolean, default: false },
    payment_request_receipt_url: { type: String, trim: true },
    purchase_book_receipt_url: { type: String, trim: true },
    payment_request_transaction_type: { type: String, trim: true },

    revenue: {
      particulars: { type: String },
      url: { type: [String], default: [] },
      amount: { type: Number, default: 0 },
      amountINR: { type: Number, default: 0 },
      currency: { type: String, default: 'INR' },
      exRate: { type: Number, default: 1 },
      exchangeRate: { type: Number, default: 1 }, // alias for exRate sometimes used in UI
      gst: { type: Number, default: 0 },
      total: { type: Number, default: 0 },
      invoiceNo: { type: String },
      invoiceDate: { type: String },
      status: { type: String },
      isSynced: { type: Boolean, default: false },

      // Added fields for GST/TDS persistence
      isGst: { type: Boolean, default: false },
      gstRate: { type: Number, default: 18 },
      basicAmount: { type: Number, default: 0 },
      gstAmount: { type: Number, default: 0 },
      cgst: { type: Number, default: 0 },
      sgst: { type: Number, default: 0 },
      igst: { type: Number, default: 0 },
      isTds: { type: Boolean, default: false },
      tdsPercent: { type: Number, default: 0 },
      tdsAmount: { type: Number, default: 0 },
      netPayable: { type: Number, default: 0 },
      chargeDescription: { type: String, trim: true },
      partyName: { type: String, trim: true },
      partyType: { type: String, trim: true },
      branchIndex: { type: Number, default: 0 },
      basis: { type: String, trim: true },
      qty: { type: Number, default: 1 },
      rate: { type: Number, default: 0 },
    },
    cost: {
      particulars: { type: String },
      url: { type: [String], default: [] },
      amount: { type: Number, default: 0 },
      amountINR: { type: Number, default: 0 },
      currency: { type: String, default: 'INR' },
      exRate: { type: Number, default: 1 },
      exchangeRate: { type: Number, default: 1 },
      gst: { type: Number, default: 0 },
      total: { type: Number, default: 0 },
      vendorName: { type: String }, // maintained for legacy
      invoiceNo: { type: String },
      invoiceDate: { type: String },
      status: { type: String },
      isSynced: { type: Boolean, default: false },

      // Added fields for GST/TDS persistence
      isGst: { type: Boolean, default: false },
      gstRate: { type: Number, default: 18 },
      basicAmount: { type: Number, default: 0 },
      gstAmount: { type: Number, default: 0 },
      cgst: { type: Number, default: 0 },
      sgst: { type: Number, default: 0 },
      igst: { type: Number, default: 0 },
      isTds: { type: Boolean, default: false },
      tdsPercent: { type: Number, default: 0 },
      tdsAmount: { type: Number, default: 0 },
      netPayable: { type: Number, default: 0 },
      chargeDescription: { type: String, trim: true },
      partyName: { type: String, trim: true },
      partyType: { type: String, trim: true },
      branchIndex: { type: Number, default: 0 },
      basis: { type: String, trim: true },
      qty: { type: Number, default: 1 },
      rate: { type: Number, default: 0 },
    },
    copyToCost: { type: Boolean, default: true },
    parentId: { type: Schema.Types.ObjectId },
    parentModule: { type: String },
  },
  { _id: true, timestamps: true },
);

// Milestone Tracking Schema
const milestoneSchema = new Schema(
  {
    milestoneName: { type: String, trim: true },

    actualDate: { type: String, trim: true }, // Format: dd-MMM-yyyy HH:mm
    isCompleted: { type: Boolean, default: false },
    isMandatory: { type: Boolean, default: false },
    completedBy: { type: String, trim: true },
    remarks: { type: String, trim: true },
  },
  { _id: true },
);

const statusDetailsSchema = new Schema(
  {
    rms: { type: String, trim: true },
    goodsRegistrationDate: { type: String, trim: true },
    goodsReportDate: { type: String, trim: true },
    leoDate: { type: String, trim: true },
    leoUpload: [String],
    booking_copy: [String], // Added for status-level storage
    stuffingDate: { type: String, trim: true },
    stuffingSheetUpload: [String],
    stuffingPhotoUpload: [String],
    eGatePassCopyDate: { type: String, trim: true },
    eGatePassUpload: [String],
    icdPort: { type: String, trim: true },
    handoverForwardingNoteDate: { type: String, trim: true },
    forwardingNoteUpload: [String],
    handoverImageUpload: [String],
    manualVgmUpload: [String],
    odexVgmUpload: [String],
    odexEsbUpload: [String],
    odexForm13Upload: [String],
    cmaForwardingNoteUpload: [String],
    containerDoorPhotoUpload: [String],
    cartingPhotoUpload: [String],
    weighmentSlipUpload: [String],
    clpUpload: [String],
    completionCopyUpload: [String],
    movementCopyUpload: [String],
    shippingInstructionsUpload: [String],
    form13CopyUpload: [String],
    assessmentCopy: [String],
    forwarderName: { type: String, trim: true },
    handoverConcorTharSanganaRailRoadDate: { type: String, trim: true },
    billingDocsSentDt: { type: String, trim: true },
    billingDocsSentUpload: [String],
    billing_details: {
      agency_bill_date: { type: String, trim: true },
      agency_bill_no: { type: String, trim: true },
      reimbursement_bill_date: { type: String, trim: true },
      reimbursement_bill_no: { type: String, trim: true },
    },
    otherDocUpload: [String],
    forwardingNoteDocUpload: [String],
    billingDocsStatus: { type: String, trim: true },
    railRoad: { type: String, trim: true },
    concorPrivate: { type: String, trim: true },
    privateTransporterName: { type: String, trim: true },
    hoToConsoleDate: { type: String, trim: true },
    hoToConsoleDate2: { type: String, trim: true },
    hoToConsoleName: { type: String, trim: true },
    containerPlacementDate: { type: String, trim: true },
    gateInDate: { type: String, trim: true },
    railOutReachedDate: { type: String, trim: true },
  },
  { _id: true },
);

// Container/Package Schema for Export - FIXED as proper Mongoose Schema
const exportOperationSchema = new Schema(
  {
    transporterDetails: [
      {
        transporterName: { type: String, trim: true },
        vehicleNo: { type: String, trim: true },
        noOfPackages: { type: Number, trim: true },
        grossWeightKgs: { type: Number, trim: true },
        images: [String],
        cartingDate: { type: String, trim: true },
      },
    ],

    statusDetails: [statusDetailsSchema],
  },
  { _id: true },
);

// Main Export Job Schema
const exportJobSchema = new mongoose.Schema(
  {
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
    isBuyer: { type: Boolean },
    isGeneralJob: { type: Boolean, default: false },

    ////////////////////////////////////////////////// Excel sheet
    year: { type: String, trim: true },
    financial_year: { type: String, trim: true },
    jobNumber: { type: String, trim: true }, // unique index handled below with isGeneralJob
    job_sequence_no: { type: String, trim: true },
    custom_house: { type: String, trim: true },
    job_date: { type: String, trim: true },
    exporter: { type: String, trim: true },
    description: { type: String, trim: true },
    sb_no: { type: String, trim: true },
    consignmentType: {
      type: String, trim: true
    },
    shipping_line_airline: { type: String, trim: true },
    branchSrNo: { type: String, trim: true },
    adCode: { type: String, trim: true },
    bank_name: { type: String, trim: true },
    ieCode: { type: String, trim: true },
    branch_index: { type: String, trim: true },
    bank_index: { type: String, trim: true },
    exporter_ref_no: { type: String, trim: true },
    shipper: { type: String, trim: true },
    sb_type: { type: String, trim: true },
    transportMode: { type: String, trim: true },
    exporter_type: { type: String, trim: true },
    exporter_class: { type: String, trim: true },
    exporter_branch_name: { type: String, trim: true },
    cha_code: { type: String, trim: true },
    cha_branch_code: { type: String, trim: true },
    cha_license_number: { type: String, trim: true },
    senderId: { type: String, trim: true },
    gstn_type: { type: String, trim: true },
    epz_code: { type: String, trim: true },
    category_of_nfei_sb: { type: String, trim: true },

    // Exporter Additional Fields (Missing)
    branch_sno: { type: String, trim: true },
    regn_no: { type: String, trim: true },
    gstin: { type: String, trim: true },
    state: { type: String, trim: true },

    // Reference & Regulatory Fields (Missing)
    sb_date: { type: String, trim: true },
    rbi_app_no: { type: String, trim: true },
    gr_waived: { type: Boolean, default: false },
    gr_no: { type: String, trim: true },
    rbi_waiver_no: { type: String, trim: true },
    rbi_waiver_date: { type: String, trim: true },
    notify: { type: String, trim: true },

    // Commercial Fields (Missing)
    currency: { type: String, trim: true },

    // Enhanced Shipping Fields (Missing)
    discharge_port: { type: String, trim: true },
    discharge_country: { type: String, trim: true },
    destination_port: { type: String, trim: true },
    destination_country: { type: String, trim: true },
    egm_no: { type: String, trim: true },
    egm_date: { type: String, trim: true },
    mbl_date: { type: String, trim: true },
    hbl_date: { type: String, trim: true },
    hbl_no: { type: String, trim: true },
    mbl_no: { type: String, trim: true },
    hawb_no: { type: String, trim: true },
    mawb_no: { type: String, trim: true },
    transhipper_code: { type: String, trim: true },
    pre_carriage_by: { type: String, trim: true },
    gateway_port: { type: String, trim: true },
    state_of_origin: { type: String, trim: true },

    sailing_date: { type: String, trim: true },
    voyage_no: { type: String, trim: true },
    vessel_name: { type: String, trim: true },
    flight_no: { type: String, trim: true },
    flight_date: { type: String, trim: true },
    nature_of_cargo: { type: String, trim: true },
    booking_no: { type: String, trim: true },
    booking_date: { type: String, trim: true },
    forwarder: { type: String, trim: true },
    pickup_loc: { type: String, trim: true },
    drop_loc: { type: String, trim: true },
    cut_off_date: { type: String, trim: true },
    booking_copy: [String],
    leo_date: { type: String, trim: true },
    gate_in: { type: String, trim: true },
    loose_pkgs: { type: String, trim: true },
    no_of_containers: { type: String, trim: true },
    marks_nos: { type: String, trim: true },
    goods_stuffed_at: { type: String, trim: true },
    stuffing_seal_type: { type: String, trim: true },
    sample_accompanied: { type: Boolean, default: false },
    hand_carry: { type: String, trim: true },
    factory_address: { type: String, trim: true },
    warehouse_code: { type: String, trim: true },


    total_no_of_pkgs: { type: String, trim: true },
    package_unit: { type: String, trim: true },
    gross_weight_kg: { type: String, trim: true },
    gross_weight_unit: { type: String, trim: true },
    net_weight_kg: { type: String, trim: true },
    net_weight_unit: { type: String, trim: true },
    volume_cbm: { type: String, trim: true },
    volume_unit: { type: String, trim: true },
    chargeable_weight: { type: String, trim: true },
    chargeable_weight_unit: { type: String, trim: true },

    consol_no: { type: String, trim: true },
    consol_date: { type: String, trim: true },
    eta_date: { type: String, trim: true },
    booking_thru: { type: String, trim: true },
    sales_person: { type: String, trim: true },
    freight_type: { type: String, trim: true },
    cargo_type: { type: String, trim: true },
    movement_type: { type: String, trim: true },
    volume_weight: { type: String, trim: true },
    shipment_terms: { type: String, trim: true },
    container_qty_type: { type: String, trim: true },

    // Boolean Control Fields (Missing)
    buyer_other_than_consignee: { type: Boolean, default: false },

    // products: { type: Array, default: [] },
    charges: [chargeSchema],
    documents: { type: Object, default: {} },

    status: { type: String, trim: true },
    // --- DSC Signing Status ---
    signingStatus: {
      type: String,
      enum: ["Pending", "ReadyToSign", "Signed", "Failed"],
      default: "Pending",
    },
    signedFilePath: { type: String, trim: true }, // Path to .sb file or .sig file in S3/Local
    signedDate: { type: Date },
    detailedStatus: { type: String, default: "" },
    vgm_done: { type: Boolean, default: false },
    vgm_date: { type: String, trim: true },
    form13_done: { type: Boolean, default: false },
    form13_date: { type: String, trim: true },
    shipping_bill_done: { type: Boolean, default: false },
    shipping_bill_done_date: { type: String, trim: true },
    freight_done: { type: Boolean, default: false },
    freight_enquiry_id: { type: String, trim: true },

    ////////////////////////////////////////////////// Exporter Information
    exporter_address: { type: String, trim: true },
    exporter_city: { type: String, trim: true },
    exporter_state: { type: String, trim: true },
    exporter_country: { type: String, trim: true, default: "India" },
    exporter_pincode: { type: String, trim: true },
    exporter_phone: { type: String, trim: true },
    exporter_email: { type: String, trim: true },
    exporter_fax: { type: String, trim: true },
    exporter_website: { type: String, trim: true },
    branch_code: { type: String, trim: true },

    // Regulatory Information
    ieCode: { type: String, trim: true }, // Import Export Code
    exporter_pan: { type: String, trim: true },
    exporter_tan: { type: String, trim: true },
    ad_code: { type: String, trim: true }, // Authorized Dealer Code

    // Banking Information - Removed duplicate bank_name
    bank_account_number: { type: String, trim: true },
    bank_ifsc_code: { type: String, trim: true },

    ////////////////////////////////////////////////// Consignee/Importer Information
    consignees: [
      {
        consignee_name: { type: String, trim: true },
        consignee_address: { type: String, trim: true },
        consignee_country: { type: String, trim: true },
      },
    ],

    ////////////////////////////////////////////////// Shipment Details
    port_of_loading: { type: String, trim: true },
    port_of_discharge: { type: String, trim: true },
    final_destination: { type: String, trim: true },
    place_of_receipt: { type: String, trim: true },
    place_of_delivery: { type: String, trim: true },

    // Invoice Details

    exchange_rate: { type: String, trim: true },

    ////////////////////////////////////////////////// Containers Information
    operations: [exportOperationSchema], // ✅ CORRECT - works directly



    ////////////////////////////////////////////////// Charges and Financial
    remarks: { type: String, trim: true },

    // Job Assignment
    job_owner: { type: String, trim: true },

    job_no: {
      type: String,
      uppercase: true,
    },

    // Multiple Invoices
    invoices: [invoiceSchema],

    // Container Details
    containers: [containerDetailsSchema],
    packingList: [packingListSchema],
    stuffingDetails: [stuffingDetailsSchema],

    // Buyer and Third Party Information
    buyerThirdPartyInfo: buyerThirdPartySchema,

    // ARE Details

    // Other Information
    otherInfo: {
      exportContractNo: String,
      exportContractDate: String,
      natureOfPayment: {
        type: String,
        enum: [
          "Not Applicable",
          "Letter Of Credit",
          "Delivery against Acceptance",
          "Direct Payment",
          "Advance Payment",
        ],
        default: "Letter Of Credit",
      },
      paymentPeriod: { type: Number, default: 0 }, // in days

      // AEO Details (use from directory if available)
      aeoCode: String,
      aeoCountry: { type: String, ref: "Country", default: "IN" },
      aeoRole: String,
    },
    // Missing Global Fields from UI
    bank_dealer: { type: String, trim: true },
    ac_number: { type: String, trim: true },
    adCode: { type: String, trim: true },
    panNo: { type: String, trim: true },
    pan_no: { type: String, trim: true },
    annexure_c_details: { type: Boolean, default: false },
    annex_additional_notes: { type: String, trim: true },
    annex_c1_documents: { type: Array, default: [] },
    ie_code_of_eou: { type: String, trim: true },
    branch_sr_no: { type: Number, default: 0 },
    examination_date: { type: String, trim: true },
    examining_officer: { type: String, trim: true },
    supervising_officer: { type: String, trim: true },
    commissionerate: { type: String, trim: true },
    verified_by_examining_officer: { type: Boolean, default: false },
    annex_seal_number: { type: String, trim: true },
    annex_designation: { type: String, trim: true },
    annex_division: { type: String, trim: true },
    annex_range: { type: String, trim: true },
    sample_forwarded: { type: Boolean, default: false },
    buyer_name: { type: String, trim: true },
    buyer_address: { type: String, trim: true },
    buyer_gstin: { type: String, trim: true },
    buyer_state: { type: String, trim: true },

    annexC1Details: {
      ieCodeOfEOU: {
        type: String,
        trim: true,
      },
      branchSerialNo: {
        type: Number,
        default: 0,
      },
      examinationDate: { type: String, trim: true },
      examiningOfficer: {
        type: String,
        trim: true,
      },
      supervisingOfficer: {
        type: String,
        trim: true,
      },
      commissionerate: {
        type: String,
        trim: true,
      },
      verifiedByExaminingOfficer: {
        type: Boolean,
        default: false,
      },

      sealNumber: {
        type: String,
        trim: true,
      },

      // Documents for Annex C1
      documents: [
        {
          serialNo: {
            type: Number,
          },
          documentName: {
            type: String,
            trim: true,
          },
        },
      ],

      // Additional C1 fields
      designation: {
        type: String,
        trim: true,
      },
      division: {
        type: String,
        trim: true,
      },
      range: {
        type: String,
        trim: true,
      },
      sampleForwarded: {
        type: Boolean,
        default: false,
      },
    },

    // Charges and Billing
    charges: [chargeSchema],


    // eSanchit Documents
    eSanchitDocuments: [eSanchitDocumentSchema],

    // Milestone Tracking
    isJobtrackingEnabled: { type: Boolean, default: false },
    jobtrackingCompletedDate: { type: String, trim: true },
    operational_lock: { type: Boolean, default: false },
    financial_lock: { type: Boolean, default: false },
    isJobCanceled: { type: Boolean, default: false },
    jobCanceledDate: { type: String, trim: true },
    cancellationReason: { type: String, trim: true },
    send_for_billing: { type: Boolean, default: false },
    send_for_billing_date: { type: String, trim: true },
    milestones: [milestoneSchema],
    customerremark: { type: String, trim: true },
    shipmenttype: { type: String, trim: true },
    milestoneremarks: { type: String, trim: true },
    milestoneviewuploaddocuments: { type: String, trim: true },
    milestonehandledby: { type: String, trim: true },

    // Fine Report Fields
    fine_amount: { type: Number, default: 0 },
    fine_accountability: { type: String, trim: true }, // "By Us" or "By Exporter"
    fine_remarks: { type: String, trim: true },
    fines: [
      {
        fineType: { type: String, trim: true }, // "Challan", "Fine by Officer", "Notesheet Amount", "Misc"
        accountability: { type: String, trim: true },
        amount: { type: Number, default: 0 },
        remarks: { type: String, trim: true },
      },
    ],

    // System Fields
    createdBy: { type: String },
    updatedBy: String,

    // Add to main exportJobSchema:
    charges: [chargeSchema],
    // Export Checklist Additional Fields - Missing Fields Added
    cha: {
      type: String,
      default: "SURAJ FORWARDERS & SHIPPING AGENCIES",
      trim: true,
    },
    icegateId: { type: String, trim: true, default: "RAJANSFPL" },
    isLocked: { type: Boolean, default: false },
    isGeneralJob: { type: Boolean, default: false },
    lockedBy: { type: String, trim: true, default: null }, // User who currently has the job open
    lockedAt: { type: Date, default: null }, // Timestamp when the job was locked
    imexcube_uploaded: { type: Boolean, default: false },
    imexcube_uploaded_at: { type: Date },
    imexcube_response: { type: Schema.Types.Mixed },
    imexcube_last_action: { type: String, trim: true },
    imexcube_last_status_code: { type: Number },
    imexcube_last_message: { type: String, trim: true },
  },

  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

exportJobSchema.pre("save", function (next) {
  // Enforce ONLY ONE operation
  if (this.operations && this.operations.length > 1) {
    this.operations = [this.operations[0]];
  }

  // Ensure at least one operation exists
  if (!this.operations || this.operations.length === 0) {
    this.operations = [{
      transporterDetails: [],
      statusDetails: [{}]
    }];
  } else if (this.operations[0]) {
    // Ensure the first operation has at least one statusDetails entry
    if (!this.operations[0].statusDetails || this.operations[0].statusDetails.length === 0) {
      this.operations[0].statusDetails = [{}];
    }
  }

  next();
});

// Remove redundant indexes and add compound indexes
exportJobSchema.index({ jobNumber: 1, isGeneralJob: 1 }, { unique: true });
exportJobSchema.index({ job_no: 1, isGeneralJob: 1 }, { unique: true });
exportJobSchema.index({ filingMode: 1, status: 1 }); // Compound index
exportJobSchema.index({ jobDate: -1, customHouse: 1 }); // Common query pattern
exportJobSchema.index({ createdAt: -1 }); // For recent jobs
exportJobSchema.index({ "invoices.invoiceNumber": 1 }, { sparse: true });

exportJobSchema.virtual("totalCharges").get(function () {
  return (this.charges || []).reduce(
    (total, charge) => total + (charge.selling || 0),
    0,
  );
});

exportJobSchema.virtual("isCompleted").get(function () {
  return this.status === "Completed";
});

// Methods
exportJobSchema.methods.addMilestone = function (
  milestoneName,

  actualDate = null,
) {
  this.milestones.push({
    milestoneName,
    actualDate,
    status: actualDate ? "Completed" : "Pending",
  });
  return this.save();
};

exportJobSchema.methods.updateMilestone = function (milestoneName, actualDate) {
  const milestone = this.milestones.find(
    (m) => m.milestoneName === milestoneName,
  );
  if (milestone) {
    milestone.actualDate = actualDate;
    milestone.status = "Completed";
  }
  return this.save();
};

exportJobSchema.methods.addCharge = function (chargeDetails) {
  this.charges.push(chargeDetails);
  return this.save();
};

exportJobSchema.methods.toImpexCubeExportPayload = function (options = {}) {
  return buildImpexCubeExportPayload(this, options);
};

exportJobSchema.methods.toImpexCubeExportGetDetailsPayload = function () {
  return buildImpexCubeExportGetDetailsPayload(this);
};

// Static methods
exportJobSchema.statics.isImpexCubeExportPayload = isImpexCubeExportPayload;

exportJobSchema.statics.fromImpexCubeExportPayload = function (payload) {
  return buildExportJobFromImpexCubePayload(payload);
};

exportJobSchema.statics.buildImpexCubeExportPayload = function (job, options = {}) {
  return buildImpexCubeExportPayload(job, options);
};

exportJobSchema.statics.buildImpexCubeExportGetDetailsPayload = function (jobOrJobNo) {
  return buildImpexCubeExportGetDetailsPayload(jobOrJobNo);
};

exportJobSchema.statics.findByJobNumber = function (jobNumber) {
  return this.findOne({ jobNumber: jobNumber.toUpperCase() });
};

exportJobSchema.statics.findByDateRange = function (startDate, endDate) {
  return this.find({
    jobDate: {
      $gte: startDate,
      $lte: endDate,
    },
  });
};

exportJobSchema.statics.findByStatus = function (status) {
  return this.find({ status: status });
};


exportJobSchema.pre("save", function (next) {
  // 0. Sync dates from operations to milestones to ensure automated status updates
  // Priorities: Date fields are now EXCEPTIONAL and are the absolute source of truth
  const op0Status = (this.operations && this.operations[0] && this.operations[0].statusDetails && this.operations[0].statusDetails[0]);
  const isAirJob = (this.job_no && String(this.job_no).toUpperCase().includes('/AIR/'));

  const isFCL = this.consignmentType === "FCL";
  const handoverDate = op0Status ? op0Status.handoverForwardingNoteDate : null;
  const railOutDate = op0Status ? op0Status.railOutReachedDate : null;

  const hasCompleteAgencyBill = op0Status?.billing_details?.agency_bill_date && op0Status?.billing_details?.agency_bill_no;
  const hasCompleteReimbursementBill = op0Status?.billing_details?.reimbursement_bill_date && op0Status?.billing_details?.reimbursement_bill_no;

  const billingDateVal = (hasCompleteAgencyBill ? op0Status.billing_details.agency_bill_date : null) ||
    (hasCompleteReimbursementBill ? op0Status.billing_details.reimbursement_bill_date : null) ||
    (op0Status ? op0Status.billingDocsSentDt : null);

  const syncMap = [
    { date: this.sb_date, name: "SB Filed" },
    { date: op0Status ? op0Status.leoDate : null, name: "L.E.O" },
    { date: handoverDate, name: isAirJob ? "File Handover to IATA" : "Container HO" },
    {
      date: (isAirJob || !isFCL) ? handoverDate : (handoverDate && railOutDate ? handoverDate : null),
      name: "Billing Pending"
    },
    { date: railOutDate, name: isAirJob ? "Departure" : "Rail Out" },
    { date: billingDateVal, name: "Billing Done" },
  ];

  (this.milestones || []).forEach((m) => {
    const match = syncMap.find((s) => s.name === m.milestoneName);
    if (match) {
      if (match.date) {
        m.isCompleted = true;
        m.actualDate = match.date;
      } else {
        // PRIORITIZE DATE: If date field is empty, the milestone MUST be incomplete
        m.isCompleted = false;
        m.actualDate = "";
      }
    }
  });

  // 1. Bi-directional sync between detailedStatus and milestones
  // Prevent string casting bug by handling detailedStatus as a single string item
  const currentStatusItems = [];
  if (typeof this.detailedStatus === "string" && this.detailedStatus.trim() !== "") {
    currentStatusItems.push(this.detailedStatus);
  } else if (Array.isArray(this.detailedStatus)) {
    // Legacy support if somehow array
    currentStatusItems.push(...this.detailedStatus);
  }

  const detailedSet = new Set(currentStatusItems);

  // Normalize "Road Out" to "Rail Out" to ensure consistency
  if (detailedSet.has("Road Out")) {
    detailedSet.delete("Road Out");
    detailedSet.add("Rail Out");
  } else if (detailedSet.has("Road out")) {
    detailedSet.delete("Road out");
    detailedSet.add("Rail Out");
  }

  // A. Update detailedSet based on Milestones (handling unchecks)
  (this.milestones || []).forEach((m) => {
    if (m.milestoneName) {
      if (m.isCompleted) {
        detailedSet.add(m.milestoneName);
      } else {
        detailedSet.delete(m.milestoneName);
      }
    }
  });

  // B. Update Milestones based on detailedSet (handling unchecks)
  let latestCompletedMilestone = "";

  // Define priority order to find the "highest" milestone regardless of array position
  const isAir = isAirJob;
  const milestonePriority = [
    "SB Filed",
    "L.E.O",
    isAir ? "File Handover to IATA" : "Container HO",
    isAir ? "Departure" : "Rail Out",
    "Road Out", // Treat Road Out as equivalent status
    "Billing Pending",
    "Billing Done"
  ];

  if (this.milestones && this.milestones.length > 0) {
    this.milestones.forEach((m) => {
      if (detailedSet.has(m.milestoneName)) {
        if (!m.isCompleted) {
          m.isCompleted = true;
        }

        // Determine if this milestone is "higher" than the current latest
        const currentPriority = milestonePriority.indexOf(m.milestoneName);
        const latestPriority = milestonePriority.indexOf(latestCompletedMilestone);

        if (currentPriority >= latestPriority) {
          latestCompletedMilestone = m.milestoneName;
        }

        // Auto-fill date if missing - BUT ONLY if it's NOT a milestone driven by a specific date field
        const isDateDriven = syncMap.some(s => s.name === m.milestoneName);
        if (!isDateDriven && (!m.actualDate || m.actualDate.startsWith("dd-"))) {
          const d = new Date();
          const day = String(d.getDate()).padStart(2, "0");
          const month = String(d.getMonth() + 1).padStart(2, "0");
          const year = d.getFullYear();
          m.actualDate = `${day}-${month}-${year}`;
        }
      } else {
        // If not in detailedStatus, it must not be completed
        if (m.isCompleted) {
          m.isCompleted = false;
        }
        // Clear date if not completed or reset to empty
        if (
          !m.isCompleted ||
          (m.actualDate && m.actualDate.startsWith("dd-"))
        ) {
          m.actualDate = "";
        }
      }
    });

    // Make sure detailedStatus is a primitive String and properly reflects the latest tracked tracking progression point.
    // Normalized check: If the latest milestone is "Road Out", we treat it as "Rail Out" for the primary detailedStatus label.
    if (latestCompletedMilestone === "Road Out" || latestCompletedMilestone === "Road out") {
      latestCompletedMilestone = "Rail Out";
    }

    if (latestCompletedMilestone) {
      this.detailedStatus = latestCompletedMilestone;
    } else {
      // If no milestones are checked but they typed something custom
      let customSt = Array.from(detailedSet).pop() || "";
      if (customSt === "Road Out" || customSt === "Road out") customSt = "Rail Out";
      this.detailedStatus = customSt;
    }
  } else {
    // If there are no milestones array to reference, simply store the topmost status
    this.detailedStatus = Array.from(detailedSet).pop() || "";
  }

  // 2. Business Logic: Status transitions
  if (this.detailedStatus.includes("Billing Done")) {
    this.status = "Completed";
  } else if (this.status === "Completed" && !this.isJobCanceled) {
    // Revert to Pending if Billing Done is removed and it was previously Completed
    this.status = "Pending";
  }

  // Auto-sync jobNumber with job_no for indexing and consistency
  if (this.isModified("job_no")) {
    this.jobNumber = this.job_no;
  }

  // 3. Auto-populate completion dates for VGM, Form 13, and shipping bill
  const getTodayStr = () => {
    const today = new Date();
    const day = String(today.getDate()).padStart(2, "0");
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const year = today.getFullYear();
    return `${day}-${month}-${year}`;
  };

  if (this.isModified("vgm_done") || this.isModified("form13_done") || this.isModified("shipping_bill_done")) {
    if (this.vgm_done && !this.vgm_date) this.vgm_date = getTodayStr();
    else if (!this.vgm_done) this.vgm_date = "";

    if (this.form13_done && !this.form13_date) this.form13_date = getTodayStr();
    else if (!this.form13_done) this.form13_date = "";

    if (this.shipping_bill_done && !this.shipping_bill_done_date) this.shipping_bill_done_date = getTodayStr();
    else if (!this.shipping_bill_done) this.shipping_bill_done_date = "";
  }

  // 4. Sync leo_date and booking_copy with operations[0].statusDetails[0]
  const op0 = this.operations && this.operations[0];
  const stat0 = op0 && op0.statusDetails && op0.statusDetails[0];
  if (stat0) {
    // Sync LEO Date - prioritize the one that was actually modified in the request
    if (this.isModified("operations")) {
      this.leo_date = stat0.leoDate || "";
    } else if (this.isModified("leo_date")) {
      stat0.leoDate = this.leo_date || "";
    }

    // Sync Booking Copy - prioritize the one that was actually modified in the request
    if (this.isModified("operations")) {
      this.booking_copy = stat0.booking_copy || [];
    } else if (this.isModified("booking_copy")) {
      stat0.booking_copy = this.booking_copy || [];
    }
  }

  next();
});

// Static method to find by seal number
exportJobSchema.statics.findBySealNumber = function (sealNo) {
  return this.findOne({ "annexC1Details.sealNumber": sealNo });
};
// Create and export the model
const ExJobModel = mongoose.model("ExportJob", exportJobSchema);
export default ExJobModel;
