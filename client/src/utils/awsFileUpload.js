import axios from "axios";

const API_URL = import.meta.env.VITE_API_STRING;

/**
 * Robust helper for file uploads with automatic retry on transient HTTP/2 or network errors.
 */
const postUploadWithRetry = async (formData, retries = 2, initialDelay = 1000) => {
  let delay = initialDelay;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      // NOTE: Do NOT set "Content-Type": "multipart/form-data" manually in Axios.
      // Axios and browser automatically set Content-Type WITH the multipart boundary parameter.
      return await axios.post(`${API_URL}/upload`, formData, {
        timeout: 120000, // 2-minute timeout for large file uploads
      });
    } catch (err) {
      const isNetworkOrHttp2Error =
        err.code === "ERR_NETWORK" ||
        err.code === "ERR_HTTP2_PROTOCOL_ERROR" ||
        err.message?.includes("Network Error") ||
        err.message?.includes("HTTP2") ||
        !err.response;

      if (isNetworkOrHttp2Error && attempt < retries) {
        console.warn(
          `[FileUpload] Upload attempt ${attempt + 1} failed (${err.message}). Retrying in ${delay}ms...`
        );
        await new Promise((res) => setTimeout(res, delay));
        delay *= 2; // exponential backoff
      } else {
        throw err;
      }
    }
  }
};

export const handleFileUpload = async (
  e,
  folderName,
  formikKey,
  formik,
  setFileSnackbar
) => {
  if (!e?.target?.files || e.target.files.length === 0) {
    alert("No file selected");
    return;
  }

  try {
    const formData = new FormData();
    formData.append("folderName", folderName);

    // Append all files
    for (let i = 0; i < e.target.files.length; i++) {
      formData.append("files", e.target.files[i]);
    }

    const response = await postUploadWithRetry(formData);
    const uploadedFiles = response.data.locations;

    // Update formik values with the uploaded file URLs
    if (typeof formik?.setValues === "function") {
      formik.setValues((values) => ({
        ...values,
        [formikKey]: uploadedFiles,
      }));
    } else if (typeof formik?.setFieldValue === "function") {
      formik.setFieldValue(formikKey, uploadedFiles);
    }

    if (typeof setFileSnackbar === "function") {
      setFileSnackbar(true);
      setTimeout(() => {
        setFileSnackbar(false);
      }, 3000);
    }
  } catch (err) {
    console.error("Error uploading files:", err);
    alert(
      `File upload failed: ${
        err.response?.data?.message || err.response?.data || err.message || "Network Error"
      }`
    );
  }
};

export const uploadFileToS3 = async (file, folderName) => {
  const formData = new FormData();
  formData.append("files", file);
  formData.append("folderName", folderName);

  const response = await postUploadWithRetry(formData);
  const location = response.data?.locations?.[0];

  if (!location) {
    throw new Error("Server returned no upload location");
  }

  return {
    Location: location,
    Key: location.split(".com/")[1] || `${folderName}/${file.name}`,
    Bucket: "exim-export",
    Etag: "mock-etag",
  };
};
