import express from "express";
import axios from "axios";
import ExportJobModel from "../../model/export/ExJobModel.mjs";
import ExJobModel from "../../model/export/ExJobModel.mjs";
import auditMiddleware from "../../middleware/auditTrail.mjs";

const router = express.Router();

const IMPEXCUBE_BASE_URL =
  process.env.IMPEXCUBE_BASE_URL ||
  process.env.IMEXCUBE_BASE_URL ||
  "https://impexapi.impexcube.in";
const IMPEXCUBE_LOGIN_PATH =
  process.env.IMPEXCUBE_LOGIN_PATH || "/api/Authentication/login";
const IMPEXCUBE_EXPORT_CREATE_PATH =
  process.env.IMPEXCUBE_EXPORT_CREATE_PATH || "/api/v1/ExpJobCreation/CreateJob";
const IMPEXCUBE_EXPORT_GET_DETAILS_PATH =
  process.env.IMPEXCUBE_EXPORT_GET_DETAILS_PATH || "/api/v1/GetJobDetails/getexpdetails";
const IMPEXCUBE_TIMEOUT_MS = Number(process.env.IMPEXCUBE_TIMEOUT_MS || 30000);
const IMPEXCUBE_TEST_HOST = "testimpexapi.impexcube.in";
const IMPEXCUBE_TEST_DEFAULTS = {
  username: "test",
  password: "testabc",
  companyBrCode: "8A6EE027-A8FF-40E3-9468-00F1BB57F1C",
};

const buildImpexCubeUrl = (path) =>
  `${IMPEXCUBE_BASE_URL.replace(/\/+$/, "")}/${String(path || "").replace(/^\/+/, "")}`;

export async function getImpexCubeAccessToken(financialYear, branchCode) {
  const isDocumentedTestHost = IMPEXCUBE_BASE_URL.includes(IMPEXCUBE_TEST_HOST);
  const username =
    process.env.IMPEXCUBE_USERNAME ||
    process.env.IMPEX_USERNAME ||
    (isDocumentedTestHost ? IMPEXCUBE_TEST_DEFAULTS.username : "");
  const password =
    process.env.IMPEXCUBE_PASSWORD ||
    process.env.IMPEX_PASSWORD ||
    (isDocumentedTestHost ? IMPEXCUBE_TEST_DEFAULTS.password : "");

  let companyBrCode = "";
  const normalizedBranch = String(branchCode || "").toUpperCase().trim();
  if (normalizedBranch === "AMD") {
    companyBrCode = process.env.COMPANY_BR_CODE_AMD || "5E8D2587-A7BA-49A2-B836-21C70B2AAF47";
  } else if (normalizedBranch === "GIM") {
    companyBrCode = process.env.COMPANY_BR_CODE_GIM || "8677A8AA-D338-4413-8CCD-48DB23D28EBD";
  } else if (normalizedBranch === "COK") {
    companyBrCode = process.env.COMPANY_BR_CODE_COK || "F9BB73B5-C772-4474-866B-C8B2790B7448";
  }

  if (!companyBrCode) {
    companyBrCode =
      process.env.IMPEXCUBE_COMPANY_BR_CODE ||
      process.env.COMPANY_BR_CODE ||
      (isDocumentedTestHost ? IMPEXCUBE_TEST_DEFAULTS.companyBrCode : "");
  }

  const fyear = process.env.IMPEXCUBE_FYEAR || process.env.FYEAR || financialYear;

  const missing = [];
  if (!username) missing.push("IMPEXCUBE_USERNAME");
  if (!password) missing.push("IMPEXCUBE_PASSWORD");
  if (!companyBrCode) missing.push("IMPEXCUBE_COMPANY_BR_CODE");
  if (!fyear) missing.push("IMPEXCUBE_FYEAR");

  if (missing.length > 0) {
    const error = new Error(`Missing ImpexCube configuration: ${missing.join(", ")}`);
    error.statusCode = 500;
    throw error;
  }

  const response = await axios.post(buildImpexCubeUrl(IMPEXCUBE_LOGIN_PATH), null, {
    params: {
      username,
      password,
      CompanyBrCode: companyBrCode,
      Fyear: fyear,
    },
    headers: { accept: "*/*" },
    timeout: IMPEXCUBE_TIMEOUT_MS,
  });

  const token = response.data?.data?.accessToken;
  if (!token) {
    const error = new Error(response.data?.message || "ImpexCube authentication did not return an access token");
    error.statusCode = response.status || 502;
    error.impexCubeResponse = response.data;
    throw error;
  }

  return token;
}

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
    payload?.Message,
    payload?.data?.[0]?.Message,
    payload?.data?.[0]?.ErrorMsg,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (text.includes("updated")) return "updated";
  if (statusCode === 409 || text.includes("already exists") || text.includes("duplicate")) {
    return "duplicate";
  }
  return "created";
};

const getVendorMessage = (payload, fallback = "") => {
  return (
    payload?.data?.[0]?.Message ||
    payload?.data?.[0]?.ErrorMsg ||
    payload?.Message ||
    payload?.message ||
    (Array.isArray(payload?.Errors) && payload.Errors.length > 0 ? payload.Errors.join(", ") : "") ||
    fallback
  );
};

// POST /api/impexcube/export-jobs/send - Send an export job to ImpexCube
router.post("/impexcube/export-jobs/send", auditMiddleware("Job"), async (req, res) => {
  try {
    const jobNo = req.body?.job_no || req.body?.jobNo;
    if (!jobNo) {
      return res.status(400).json({
        success: false,
        message: "job_no is required",
      });
    }

    const exportJob = await ExJobModel.findOne({
      job_no: { $regex: `^${String(jobNo).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" },
    });

    if (!exportJob) {
      return res.status(404).json({
        success: false,
        message: "Export job not found",
      });
    }

    const payload = exportJob.toImpexCubeExportPayload(req.body?.options || {});
    const accessToken = await getImpexCubeAccessToken(payload.CHADetails?.Financial_Year, exportJob.branch_code);
    console.log("==========================================================");
    console.log("[IMEXCUBE EXPORT DSR] SENDING PAYLOAD TO IMPEXCUBE API:");
    console.log(`JOB NO: ${jobNo}`);
    console.log(JSON.stringify(payload, null, 2));
    console.log("==========================================================");
    const impexCubeResponse = await axios.post(
      buildImpexCubeUrl(IMPEXCUBE_EXPORT_CREATE_PATH),
      payload,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        timeout: IMPEXCUBE_TIMEOUT_MS,
      },
    );

    const vendorPayload = impexCubeResponse.data || {};
    const action = classifyImexcubeAction(vendorPayload, impexCubeResponse.status);
    const vendorStatusCode = normalizeVendorStatusCode(vendorPayload, impexCubeResponse.status);
    const vendorMessage = getVendorMessage(vendorPayload, "Job created successfully");

    const queryFilter = { _id: exportJob._id };

    if (action === "duplicate") {
      await ExJobModel.updateOne(
        queryFilter,
        {
          $set: {
            imexcube_last_action: "duplicate",
            imexcube_last_status_code: vendorStatusCode,
            imexcube_last_message: vendorMessage,
            imexcube_response: vendorPayload,
          },
        }
      );

      return res.status(409).json({
        success: false,
        message: vendorMessage || "Duplicate Job in IMEXCUBE",
        data: vendorPayload,
        statusCode: 409,
      });
    }

    // Mark the job as uploaded in our DB
    await ExJobModel.updateOne(
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

    return res.status(impexCubeResponse.status || 200).json({
      success: true,
      message: action === "updated" ? "Job updated in IMEXCUBE (TEST) successfully" : "Job created in IMEXCUBE (TEST) successfully",
      data: vendorPayload,
      job_no: exportJob.job_no,
    });
  } catch (error) {
    const jobNo = req.body?.job_no || req.body?.jobNo;
    const queryFilter = {
      $or: [
        { job_no: jobNo },
        { jobNumber: jobNo }
      ]
    };

    let isNetworkError = false;
    let userFriendlyMessage = "";

    if (!error.response) {
      isNetworkError = true;
      if (error.code === "ECONNRESET") {
        userFriendlyMessage = "ImpexCube API connection was reset by the remote server (ECONNRESET). The API may be offline or unreachable.";
      } else if (error.code === "ETIMEDOUT" || error.message?.toLowerCase().includes("timeout")) {
        userFriendlyMessage = "ImpexCube API connection timed out. The server is currently offline or unreachable.";
      } else if (error.code === "ENOTFOUND" || error.code === "EAI_AGAIN") {
        userFriendlyMessage = "ImpexCube API domain name could not be resolved. Please check your internet connection or URL configuration.";
      } else {
        userFriendlyMessage = `ImpexCube API is unreachable. Network error: ${error.message || "Connection failed"}`;
      }
    }

    const status = isNetworkError ? 503 : (error.response?.status || error.statusCode || 500);
    const impexCubeData = error.response?.data || error.impexCubeResponse;
    const vendorMessage = isNetworkError ? userFriendlyMessage : getVendorMessage(impexCubeData, error.message || "Failed to send export job to ImpexCube");

    console.error("Error sending export job to ImpexCube:", impexCubeData || error.message);

    if (!isNetworkError && jobNo) {
      const action = classifyImexcubeAction(impexCubeData, status);
      const vendorStatusCode = normalizeVendorStatusCode(impexCubeData, status);

      if (action === "updated") {
        await ExJobModel.updateOne(
          queryFilter,
          {
            $set: {
              imexcube_uploaded: true,
              imexcube_uploaded_at: new Date(),
              imexcube_response: impexCubeData,
              imexcube_last_action: "updated",
              imexcube_last_status_code: vendorStatusCode,
              imexcube_last_message: vendorMessage,
            },
          }
        );

        return res.status(200).json({
          success: true,
          message: "Job updated in IMEXCUBE (TEST) successfully",
          data: impexCubeData,
          job_no: jobNo,
        });
      }

      if (action === "duplicate") {
        await ExJobModel.updateOne(
          queryFilter,
          {
            $set: {
              imexcube_last_action: "duplicate",
              imexcube_last_status_code: vendorStatusCode,
              imexcube_last_message: vendorMessage,
              imexcube_response: impexCubeData,
            },
          }
        );

        return res.status(409).json({
          success: false,
          message: vendorMessage,
          data: impexCubeData,
          statusCode: 409,
        });
      }
    }

    return res.status(status).json({
      success: false,
      message: vendorMessage,
      data: impexCubeData || null,
      errors: impexCubeData?.errors || null,
      statusCode: status,
    });
  }
});

// POST /api/impexcube/export-jobs/fetch - Fetch export job details from ImpexCube
router.post("/impexcube/export-jobs/fetch", auditMiddleware("Job"), async (req, res) => {
  try {
    const jobNo = req.body?.job_no || req.body?.jobNo;
    if (!jobNo) {
      return res.status(400).json({
        success: false,
        message: "job_no is required",
      });
    }

    const exportJob = await ExJobModel.findOne({
      job_no: { $regex: `^${String(jobNo).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" },
    });

    if (!exportJob) {
      return res.status(404).json({
        success: false,
        message: "Export job not found",
      });
    }

    const accessToken = await getImpexCubeAccessToken(exportJob.financial_year || exportJob.year, exportJob.branch_code);

    const seqNo = exportJob.job_sequence_no || (jobNo.match(/\d+/g) ? jobNo.match(/\d+/g).pop() : "");
    const fullFyearNo = jobNo.replace(/(\d{2})-(\d{2})$/, (m, y1, y2) => `20${y1}-20${y2}`);
    const candidateJobNos = [
      jobNo,
      fullFyearNo,
      seqNo,
      seqNo ? String(seqNo).padStart(5, "0") : null,
    ].filter(Boolean);
    const uniqueCandidates = [...new Set(candidateJobNos)];

    console.log("[IMEXCUBE EXPORT DSR] Fetching details from ImpexCube with candidate job nos:", uniqueCandidates);

    const candidatePaths = [
      IMPEXCUBE_EXPORT_GET_DETAILS_PATH,
      "/api/v1/GetJobDetails/get-expdetails",
      "/api/v1/GetJobDetails/getexpdetails",
    ].filter(Boolean);
    const uniquePaths = [...new Set(candidatePaths)];

    let vendorPayload = null;
    const reqHeaders = {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      accept: "*/*",
    };

    pathLoop: for (const path of uniquePaths) {
      const targetUrl = buildImpexCubeUrl(path);
      for (const candNo of uniqueCandidates) {
        const payload = {
          Method: "GetJobInfo",
          User_Job_No: candNo,
        };

        try {
          console.log("==========================================================");
          console.log(`[IMEXCUBE EXPORT DSR] FETCHING JOB DETAILS FROM IMPEXCUBE API:`);
          console.log(`URL: ${targetUrl}`);
          console.log(`PAYLOAD SENT:`, JSON.stringify(payload, null, 2));
          console.log("==========================================================");

          let res = null;
          try {
            res = await axios({
              method: "GET",
              url: targetUrl,
              headers: reqHeaders,
              data: payload,
              timeout: IMPEXCUBE_TIMEOUT_MS,
            });
          } catch (getErr) {
            try {
              res = await axios.get(targetUrl, {
                params: {
                  Method: "GetJobInfo",
                  "User Job No.": candNo,
                  User_Job_No: candNo,
                },
                headers: reqHeaders,
                timeout: IMPEXCUBE_TIMEOUT_MS,
              });
            } catch (queryErr) {
              res = await axios.post(targetUrl, payload, {
                headers: reqHeaders,
                timeout: IMPEXCUBE_TIMEOUT_MS,
              });
            }
          }

          const vData = res.data || {};
          const hasData = vData.data || vData.SB_Details || (Array.isArray(vData) && vData.length > 0);
          if (vData.success !== false && vData.statusCode !== 404 && hasData) {
            vendorPayload = vData;
            console.log(`[IMEXCUBE EXPORT DSR] Fetch succeeded for User_Job_No '${candNo}' on ${targetUrl}`);
            break pathLoop;
          }

          if (!vendorPayload) {
            vendorPayload = vData;
          }
        } catch (err) {
          console.log(`[IMEXCUBE EXPORT DSR] Candidate fetch error for '${candNo}' on ${targetUrl}:`, err.message);
          if (err.response?.data) {
            vendorPayload = err.response.data;
          }
        }
      }
    }

    const isSuccess = vendorPayload && vendorPayload.success !== false && (vendorPayload.data || vendorPayload.SB_Details);

    if (!isSuccess) {
      const vendorMsg =
        vendorPayload?.message ||
        vendorPayload?.data?.[0]?.Message ||
        vendorPayload?.data?.[0]?.ErrorMsg;

      const displayMsg = (vendorMsg && !vendorMsg.includes("status code 404"))
        ? vendorMsg
        : `Job details are not available in ImpexCube for job '${jobNo}'. Please ensure the job has been uploaded to ImpexCube first.`;

      return res.status(vendorPayload?.statusCode || 404).json({
        success: false,
        message: displayMsg,
        data: vendorPayload || null,
      });
    }

    const rawSb = vendorPayload?.data?.SB_Details || vendorPayload?.SB_Details;
    const sbDetails = Array.isArray(rawSb) ? (rawSb[0] || {}) : (rawSb || {});

    const updateFields = {
      imexcube_fetch_response: vendorPayload,
      imexcube_last_fetched_at: new Date(),
    };

    const newSbNo = sbDetails.SBNo || sbDetails.SB_No;
    if (newSbNo) {
      updateFields.sb_no = String(newSbNo).trim();
    }
    const newSbDate = sbDetails.SBDate || sbDetails.SB_Date;
    if (newSbDate) {
      updateFields.sb_date = String(newSbDate).split("T")[0];
    }
    const newCustomPort = sbDetails.CustomPort || sbDetails.Custom_house_Code;
    if (newCustomPort) {
      updateFields.custom_house = String(newCustomPort).trim();
    }

    await ExJobModel.updateOne({ _id: exportJob._id }, { $set: updateFields });

    return res.status(200).json({
      success: true,
      message: "Export job details fetched from ImpexCube successfully",
      data: vendorPayload,
      updatedFields: updateFields,
      job_no: exportJob.job_no,
    });
  } catch (error) {
    console.error("Error fetching export job from ImpexCube:", error?.response?.data || error.message);
    const status = error.response?.status || 500;
    const vendorData = error.response?.data || null;

    let userMsg = vendorData?.message || error.message || "Failed to fetch export job details from ImpexCube";
    if (status === 404) {
      userMsg = vendorData?.message || "Job details are not available in ImpexCube. Please ensure the job has been sent to ImpexCube first.";
    }

    return res.status(status).json({
      success: false,
      message: userMsg,
      data: vendorData,
    });
  }
});

// POST /api/sync-all-job-statuses - One-time sync to match detailed status for all jobs
router.post("/sync-all-job-statuses", async (req, res) => {
  try {
    const jobs = await ExportJobModel.find({});
    let count = 0;
    for (const job of jobs) {
      await job.save();
      count++;
    }
    res.json({
      success: true,
      message: `Successfully synchronized ${count} jobs.`,
    });
  } catch (error) {
    console.error("Error syncing jobs:", error);
    res.status(500).json({
      success: false,
      message: "Error synchronizing jobs",
      error: error.message,
    });
  }
});

export default router;
