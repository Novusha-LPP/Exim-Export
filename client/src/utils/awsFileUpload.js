import axios from "axios";

const API_URL = import.meta.env.VITE_API_STRING;

export const handleFileUpload = async (
  e,
  folderName,
  formikKey,
  formik,
  setFileSnackbar
) => {
  if (e.target.files.length === 0) {
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

    const response = await axios.post(`${API_URL}/upload`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    const uploadedFiles = response.data.locations;

    // Update formik values with the uploaded file URLs
    formik.setValues((values) => ({
      ...values,
      [formikKey]: uploadedFiles,
    }));

    setFileSnackbar(true);

    setTimeout(() => {
      setFileSnackbar(false);
    }, 3000);
  } catch (err) {
    console.error("Error uploading files:", err);
    // Optional: show user error
    if (err.response) {
      console.error("Server Error:", err.response.data);
    }
  }
};

export const uploadFileToS3 = async (file, folderName) => {
  // Kept for compatibility with other components that might use this specific function
  // It mimics the AWS SDK v2 behavior of returning a promise that resolves to file data

  const formData = new FormData();
  formData.append("files", file);
  formData.append("folderName", folderName);

  const response = await axios.post(`${API_URL}/upload`, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  const location = response.data.locations[0];

  // Return structure compatible with AWS SDK .promise() result
  return {
    Location: location,
    Key: location.split(".com/")[1] || `${folderName}/${file.name}`,
    Bucket: "exim-export", // Dummy or extract if needed
    Etag: "mock-etag",
  };
};
