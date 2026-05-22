import express from "express";
import axios from "axios";
import ExportJobModel from "../model/export/ExJobModel.mjs";
import dotenv from "dotenv";

dotenv.config();

const router = express.Router();

// IMEXCUBE TEST credentials from env with fallbacks
const IMEXCUBE_BASE_URL =
  process.env.IMPEXCUBE_BASE_URL ||
  process.env.IMEXCUBE_BASE_URL ||
  "http://testimpexapi.impexcube.in";

const IMPEX_USERNAME =
  process.env.IMPEXCUBE_USERNAME ||
  process.env.IMPEX_USERNAME ||
  "";

const IMPEX_PASSWORD =
  process.env.IMPEXCUBE_PASSWORD ||
  process.env.IMPEX_PASSWORD ||
  "";

const COMPANY_BR_CODE =
  process.env.IMPEXCUBE_COMPANY_BR_CODE ||
  process.env.COMPANY_BR_CODE ||
  "";

const FYEAR =
  process.env.IMPEXCUBE_FYEAR ||
  process.env.FYEAR ||
  "";

const ACTION_CREATE = "created";
const ACTION_UPDATE = "updated";
const ACTION_DUPLICATE = "duplicate";

const REQUIRED_FIELDS = {
  "Custom House Code": "SB_Details.Custom_house_Code",
  "User Job No.": "SB_Details.User_Job_No",
  "IEC Code": "SB_Details.Importer_Exporter_Code",
  "Name of the exporter": "SB_Details.Imp_Exp_Name",
  "Port of Loading": "SB_Details.Port_of_Loading",
  "Port of Final Destination": "SB_Details.Port_of_final_destination",
  "Total No. of Packages": "SB_Details.Total_number_of_packages",
};

const normalizeVendorStatusCode = (payload, fallbackStatus = null) => {
  const fromPayload = Number(payload?.statusCode);
  if (Number.isFinite(fromPayload) && fromPayload > 0) return fromPayload;
  const fromNested = Number(payload?.data?.[0]?.Code || payload?.data?.[0]?.code);
  if (Number.isFinite(fromNested) && fromNested > 0) return fromNested;
  return fallbackStatus;
};

const classifyImexcubeAction = (payload, fallbackStatus = null) => {
  const statusCode = normalizeVendorStatusCode(payload, fallbackStatus);
  const text = [
    payload?.message,
    payload?.data?.[0]?.Message,
    payload?.data?.[0]?.ErrorMsg,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (text.includes("updated")) return ACTION_UPDATE;
  if (statusCode === 409 || text.includes("already exists") || text.includes("duplicate")) {
    return ACTION_DUPLICATE;
  }
  return ACTION_CREATE;
};

const getVendorMessage = (payload, fallback = "") => {
  return (
    payload?.data?.[0]?.Message ||
    payload?.data?.[0]?.ErrorMsg ||
    payload?.message ||
    fallback
  );
};

const getRequiredFieldValue = (payload, path) => {
  if (path === "SB_Details.Custom_house_Code") return payload?.SB_Details?.Custom_house_Code;
  if (path === "SB_Details.User_Job_No") return payload?.SB_Details?.User_Job_No;
  if (path === "SB_Details.Importer_Exporter_Code") return payload?.SB_Details?.Importer_Exporter_Code;
  if (path === "SB_Details.Imp_Exp_Name") return payload?.SB_Details?.Imp_Exp_Name;
  if (path === "SB_Details.Port_of_Loading") return payload?.SB_Details?.Port_of_Loading;
  if (path === "SB_Details.Port_of_final_destination") return payload?.SB_Details?.Port_of_final_destination;
  if (path === "SB_Details.Total_number_of_packages") return payload?.SB_Details?.Total_number_of_packages;
  return "";
};

const collectMissingRequiredFields = (payload) => {
  const missing = [];
  Object.entries(REQUIRED_FIELDS).forEach(([fieldName, path]) => {
    const value = getRequiredFieldValue(payload, path);
    if (value === undefined || value === null || String(value).trim() === "") {
      missing.push(`'${fieldName}' is missing`);
    }
  });
  return missing;
};

/**
 * Helper: Build the scmCube-format job payload (reuses the same mapping logic from ExJobModel)
 */
async function buildJobPayload(job_number, isPreview = false) {
  const job = await ExportJobModel.findOne({
    $or: [
      { job_no: job_number },
      { jobNumber: job_number }
    ]
  });
  if (!job) throw new Error("Job not found for the provided job_number");

  const payload = job.toImpexCubeExportPayload();
  const errors = collectMissingRequiredFields(payload);

  if (!isPreview && errors.length > 0) {
    const err = new Error("Validation Failed");
    err.details = { errors };
    throw err;
  }

  return isPreview ? { payload, errors } : payload;
}

/**
 * POST /api/scmCube/upload-export-to-imexcube
 * 1. Builds the scmCube job payload from the local DB
 * 2. Authenticates with IMEXCUBE TEST API
 * 3. Pushes the payload to IMEXCUBE CreateJob for exports
 */
router.post("/api/scmCube/upload-export-to-imexcube", async (req, res) => {
  const { job_number, customPayload } = req.body || {};
  try {
    if (!job_number) {
      return res.status(400).json({ error: "job_number is required" });
    }

    // Step 1: Build or parse the job payload
    let jobPayload;
    if (customPayload) {
      console.log(`[IMEXCUBE EXPORT] Using custom/edited payload for job: ${job_number}`);
      jobPayload = typeof customPayload === "string" ? JSON.parse(customPayload) : customPayload;
      const customPayloadErrors = collectMissingRequiredFields(jobPayload);
      if (customPayloadErrors.length > 0) {
        return res.status(400).json({
          error: "Validation Failed",
          details: { errors: customPayloadErrors },
        });
      }
    } else {
      console.log(`[IMEXCUBE EXPORT] Building payload for job: ${job_number}`);
      jobPayload = await buildJobPayload(job_number);
    }

    // Step 2: Authenticate with IMEXCUBE
    console.log("[IMEXCUBE EXPORT] Authenticating with IMEXCUBE TEST API...");
    const loginUrl = `${IMEXCUBE_BASE_URL}/api/Authentication/login?username=${encodeURIComponent(
      IMPEX_USERNAME
    )}&password=${encodeURIComponent(
      IMPEX_PASSWORD
    )}&CompanyBrCode=${encodeURIComponent(
      COMPANY_BR_CODE
    )}&Fyear=${encodeURIComponent(FYEAR)}`;

    const loginRes = await axios.post(loginUrl, null, {
      headers: { accept: "*/*" },
      timeout: 30000,
    });

    const loginData = loginRes.data;
    if (!loginData?.success || !loginData?.data?.accessToken) {
      console.error("[IMEXCUBE EXPORT] Login failed:", loginData);
      return res.status(502).json({
        error: "IMEXCUBE authentication failed",
        details: loginData,
      });
    }

    const accessToken = loginData.data.accessToken;
    console.log("[IMEXCUBE EXPORT] Authentication successful, pushing job...");

    // Step 3: Push to IMEXCUBE CreateJob for export
    const createJobUrl = `${IMEXCUBE_BASE_URL}/api/v1/ExpJobCreation/CreateJob`;
    console.log("[IMEXCUBE EXPORT] Sending payload to ImpexCube:\n", JSON.stringify(jobPayload, null, 2));
    const createJobRes = await axios.post(createJobUrl, jobPayload, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      timeout: 30000,
    });

    console.log("[IMEXCUBE EXPORT] Job pushed successfully:", createJobRes.data);

    const vendorPayload = createJobRes.data || {};
    const action = classifyImexcubeAction(vendorPayload, createJobRes.status);
    const vendorStatusCode = normalizeVendorStatusCode(vendorPayload, createJobRes.status);
    const vendorMessage = getVendorMessage(vendorPayload, "Job created successfully");

    const queryFilter = {
      $or: [
        { job_no: job_number },
        { jobNumber: job_number }
      ]
    };

    if (action === ACTION_DUPLICATE) {
      await ExportJobModel.updateOne(
        queryFilter,
        {
          $set: {
            imexcube_last_action: ACTION_DUPLICATE,
            imexcube_last_status_code: vendorStatusCode,
            imexcube_last_message: vendorMessage,
            imexcube_response: vendorPayload,
          },
        }
      );

      return res.status(409).json({
        success: false,
        action: ACTION_DUPLICATE,
        message: vendorMessage,
        vendorStatusCode,
        vendorMessage,
        imexcubeResponse: vendorPayload,
      });
    }

    // Mark the job as uploaded in our DB
    await ExportJobModel.updateOne(
      queryFilter,
      {
        $set: {
          imexcube_uploaded: true,
          imexcube_uploaded_at: new Date(),
          imexcube_response: vendorPayload,
          imexcube_last_action: action,
          imexcube_last_status_code: vendorStatusCode,
          imexcube_last_message: vendorMessage,
        },
      }
    );

    return res.status(200).json({
      success: true,
      action,
      message: action === ACTION_UPDATE ? "Job updated in IMEXCUBE (TEST) successfully" : "Job created in IMEXCUBE (TEST) successfully",
      vendorStatusCode,
      vendorMessage,
      imexcubeResponse: vendorPayload,
    });
  } catch (error) {
    if (error.message?.startsWith("Mandatory field")) {
      return res.status(400).json({ error: error.message });
    }
    console.error("[IMEXCUBE EXPORT] Upload error:", error?.response?.data || error.message);

    const errorData = error?.response?.data;
    const errorStatus = error?.response?.status || null;
    const action = classifyImexcubeAction(errorData, errorStatus);
    const vendorStatusCode = normalizeVendorStatusCode(errorData, errorStatus);
    const vendorMessage = getVendorMessage(errorData, "Failed to upload job to IMEXCUBE");

    const queryFilter = {
      $or: [
        { job_no: job_number },
        { jobNumber: job_number }
      ]
    };

    if (action === ACTION_UPDATE) {
      await ExportJobModel.updateOne(
        queryFilter,
        {
          $set: {
            imexcube_uploaded: true,
            imexcube_uploaded_at: new Date(),
            imexcube_response: errorData,
            imexcube_last_action: ACTION_UPDATE,
            imexcube_last_status_code: vendorStatusCode,
            imexcube_last_message: vendorMessage,
          },
        }
      );

      return res.status(200).json({
        success: true,
        action: ACTION_UPDATE,
        message: "Job updated in IMEXCUBE (TEST) successfully",
        vendorStatusCode,
        vendorMessage,
        imexcubeResponse: errorData,
      });
    }

    if (action === ACTION_DUPLICATE) {
      await ExportJobModel.updateOne(
        queryFilter,
        {
          $set: {
            imexcube_last_action: ACTION_DUPLICATE,
            imexcube_last_status_code: vendorStatusCode,
            imexcube_last_message: vendorMessage,
            imexcube_response: errorData,
          },
        }
      );

      return res.status(409).json({
        success: false,
        action: ACTION_DUPLICATE,
        error: "Duplicate Job in IMEXCUBE",
        message: vendorMessage,
        vendorStatusCode,
        vendorMessage,
        imexcubeResponse: errorData,
      });
    }

    return res.status(errorStatus || 500).json({
      error: "Failed to upload job to IMEXCUBE",
      action: "error",
      vendorStatusCode,
      vendorMessage,
      details: errorData || error.message,
    });
  }
});

/**
 * GET /api/scmCube/export-job-data-preview
 * Returns job data with field-level validation metadata
 * Each field has: { value, mandatory, valid }
 */
router.get("/api/scmCube/export-job-data-preview", async (req, res) => {
  try {
    const { job_number } = req.query;
    if (!job_number) {
      return res.status(400).json({ error: "job_number is required" });
    }

    const job = await ExportJobModel.findOne({
      $or: [
        { job_no: job_number },
        { jobNumber: job_number }
      ]
    });
    if (!job) {
      return res.status(404).json({ error: "Job not found" });
    }

    const rawPayload = job.toImpexCubeExportPayload();

    // Helper: non-throwing field builder (value + metadata)
    const field = (val, mandatory = false) => {
      const v = (val === undefined || val === null) ? "" : val;
      const strVal = String(v).trim();
      const valid = mandatory ? strVal.length > 0 : true;
      return { value: strVal, mandatory, valid };
    };

    // Construct preview tree mirroring rawPayload structure
    const preview = {
      CHADetails: {
        CHA_Code: field(rawPayload?.CHADetails?.CHA_Code || rawPayload?.CHADetails?.["CHA Code"], true),
        CHA_Branch_Code: field(rawPayload?.CHADetails?.CHA_Branch_Code || rawPayload?.CHADetails?.["CHA Branch Code"], true),
        Financial_Year: field(rawPayload?.CHADetails?.Financial_Year || rawPayload?.CHADetails?.["Financial Year"], true),
        SenderID: field(rawPayload?.CHADetails?.SenderID, true),
      },
      SB_Details: {
        Custom_house_Code: field(rawPayload?.SB_Details?.Custom_house_Code, true),
        Job_Sequence_No: field(rawPayload?.SB_Details?.Job_Sequence_No, false),
        User_Job_No: field(rawPayload?.SB_Details?.User_Job_No, true),
        User_Job_Date: field(rawPayload?.SB_Details?.User_Job_Date, false),
        SB_No: field(rawPayload?.SB_Details?.SB_No, false),
        SB_Date: field(rawPayload?.SB_Details?.SB_Date, false),
        CHA_License_Number: field(rawPayload?.SB_Details?.CHA_License_Number, false),
        Importer_Exporter_Code: field(rawPayload?.SB_Details?.Importer_Exporter_Code, true),
        Branch_Sr_No_of_Exporter: field(rawPayload?.SB_Details?.Branch_Sr_No_of_Exporter, false),
        Imp_Exp_Name: field(rawPayload?.SB_Details?.Imp_Exp_Name, true),
        Imp_Exp_Address1: field(rawPayload?.SB_Details?.Imp_Exp_Address1, false),
        Imp_Exp_Address2: field(rawPayload?.SB_Details?.Imp_Exp_Address2, false),
        Imp_Exp_City: field(rawPayload?.SB_Details?.Imp_Exp_City, false),
        Imp_Exp_State: field(rawPayload?.SB_Details?.Imp_Exp_State, false),
        Imp_Exp_PIN: field(rawPayload?.SB_Details?.Imp_Exp_PIN, false),
        Type_of_Exporter: field(rawPayload?.SB_Details?.Type_of_Exporter, false),
        Exporter_Class: field(rawPayload?.SB_Details?.Exporter_Class, false),
        State_of_origin_Exporter: field(rawPayload?.SB_Details?.State_of_origin_Exporter, false),
        Authorized_Dealer_Code: field(rawPayload?.SB_Details?.Authorized_Dealer_Code, false),
        EPZ_code: field(rawPayload?.SB_Details?.EPZ_code, false),
        Consignee_name: field(rawPayload?.SB_Details?.Consignee_name, false),
        Consignee_Address_1: field(rawPayload?.SB_Details?.Consignee_Address_1, false),
        Consignee_Address_2: field(rawPayload?.SB_Details?.Consignee_Address_2, false),
        Consignee_Address_3: field(rawPayload?.SB_Details?.Consignee_Address_3, false),
        Consignee_Address_4: field(rawPayload?.SB_Details?.Consignee_Address_4, false),
        Consignee_Country: field(rawPayload?.SB_Details?.Consignee_Country, false),
        Category_of_NFEI_SB: field(rawPayload?.SB_Details?.Category_of_NFEI_SB, false),
        RBI_waiver_number: field(rawPayload?.SB_Details?.RBI_waiver_number, false),
        RBI_waiver_date: field(rawPayload?.SB_Details?.RBI_waiver_date, false),
        Port_of_Loading: field(rawPayload?.SB_Details?.Port_of_Loading, true),
        Port_of_final_destination: field(rawPayload?.SB_Details?.Port_of_final_destination, true),
        Country_of_final_destination: field(rawPayload?.SB_Details?.Country_of_final_destination, false),
        Country_of_Discharge: field(rawPayload?.SB_Details?.Country_of_Discharge, false),
        Port_of_Discharge: field(rawPayload?.SB_Details?.Port_of_Discharge, false),
        Seal_Type: field(rawPayload?.SB_Details?.Seal_Type, false),
        Nature_of_Cargo: field(rawPayload?.SB_Details?.Nature_of_Cargo, false),
        Gross_weight: field(rawPayload?.SB_Details?.Gross_weight, false),
        Net_weight: field(rawPayload?.SB_Details?.Net_weight, false),
        Unit_of_measurement: field(rawPayload?.SB_Details?.Unit_of_measurement, false),
        Total_number_of_packages: field(rawPayload?.SB_Details?.Total_number_of_packages, true),
        Marks_Numbers: field(rawPayload?.SB_Details?.Marks_Numbers, false),
        Number_of_loose_packets: field(rawPayload?.SB_Details?.Number_of_loose_packets, false),
        Number_of_containers: field(rawPayload?.SB_Details?.Number_of_containers, false),
        MAWB_Number: field(rawPayload?.SB_Details?.MAWB_Number, false),
        HAWB_Number: field(rawPayload?.SB_Details?.HAWB_Number, false),
        GSTN_Type: field(rawPayload?.SB_Details?.GSTN_Type, false),
        GSTN_ID: field(rawPayload?.SB_Details?.GSTN_ID, false),
        Hand_Carry: field(rawPayload?.SB_Details?.Hand_Carry, false),
      },
      PACKINGLIST: (rawPayload?.PACKINGLIST || []).map((item) => ({
        Packing_Number_From: field(item.Packing_Number_From, false),
        Packing_Number_To: field(item.Packing_Number_To, false),
        Packing_Code: field(item.Packing_Code, false),
      })),
      STUFF: (rawPayload?.STUFF || []).map((item) => ({
        Factory_stuffed: field(item.Factory_stuffed, false),
        Sample_accompanied: field(item.Sample_accompanied, false),
      })),
      CONTAINER: (rawPayload?.CONTAINER || []).map((item) => ({
        Container_number: field(item.Container_number, false),
        Container_Size: field(item.Container_Size, false),
        "Excise_Seal_No.": field(item["Excise_Seal_No."], false),
        Seal_Date: field(item.Seal_Date, false),
        Seal_Type_Indicator: field(item.Seal_Type_Indicator, false),
        Seal_Device_ID: field(item.Seal_Device_ID, false),
        Movement_Document_Type: field(item.Movement_Document_Type, false),
        Movement_Document_Number: field(item.Movement_Document_Number, false),
      })),
      Supportingdocs: (rawPayload?.Supportingdocs || []).map((item) => ({
        DocumentCode: field(item.DocumentCode, false),
        DocumentName: field(item.DocumentName, false),
        DocumentFilePath: field(item.DocumentFilePath, false),
        DocumentFileFormat: field(item.DocumentFileFormat, false),
      })),
    };

    return res.status(200).json({
      annotated: preview,
      rawPayload,
      requiredFields: REQUIRED_FIELDS,
    });
  } catch (error) {
    console.error("[IMEXCUBE EXPORT Preview] Error:", error);
    return res.status(500).json({ error: error.message || "Internal Server Error" });
  }
});

export default router;
