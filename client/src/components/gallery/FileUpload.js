// FileUpload.jsx (updated, no MUI, enterprise style)
import React, { useState, useContext } from "react";
import { uploadFileToS3 } from "../../utils/awsFileUpload";
import { UserContext } from "../../contexts/UserContext";

const styles = {
  wrapper: { marginTop: 6, display: "flex", alignItems: "center", gap: 8 },
  button: (disabled) => ({
    padding: "4px 10px",
    fontSize: 11,
    borderRadius: 4,
    border: "1px solid #16408f",
    background: disabled ? "#cbd5e1" : "#16408f",
    color: "#ffffff",
    cursor: disabled ? "not-allowed" : "pointer",
    fontWeight: 600,
  }),
  label: { fontSize: 11, fontWeight: 600, marginRight: 8, color: "#374151" },
  spinner: {
    width: 16,
    height: 16,
    borderRadius: "999px",
    border: "2px solid #e5e7eb",
    borderTopColor: "#16408f",
    animation: "spin 0.8s linear infinite",
  },
};

// add keyframes globally once in your app’s CSS:
// @keyframes spin { to { transform: rotate(360deg); } }

const FileUpload = ({
  label,
  onFilesUploaded,
  bucketPath,
  multiple = true,
  acceptedFileTypes = [],
  readOnly = false,
}) => {
  const [uploading, setUploading] = useState(false);
  const { user } = useContext(UserContext);
  const fileInputRef = React.useRef(null);

  const handleFileUpload = async (event) => {
    if (readOnly) return;
    const files = event.target.files;
    if (!files?.length) return;

    const uploadedFiles = [];
    setUploading(true);

    for (const file of files) {
      try {
        const result = await uploadFileToS3(file, bucketPath);
        uploadedFiles.push(result.Location);
      } catch (error) {
        console.error(`Failed to upload ${file.name}:`, error);
      }
    }

    setUploading(false);
    onFilesUploaded(uploadedFiles);

    // Reset input value to allow re-uploading the same file if needed
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const disabled = readOnly || uploading;

  return (
    <div style={styles.wrapper}>
      {label && <span style={styles.label}>{label}</span>}
      <button
        type="button"
        style={styles.button(disabled)}
        disabled={disabled}
        onClick={() => !disabled && fileInputRef.current?.click()}
      >
        {uploading ? "Uploading..." : "Browse"}
      </button>
      <input
        ref={fileInputRef}
        type="file"
        hidden
        multiple={multiple}
        accept={acceptedFileTypes.length ? acceptedFileTypes.join(",") : ""}
        onChange={handleFileUpload}
        disabled={disabled}
      />
      {uploading && <div style={styles.spinner} />}
    </div>
  );
};

export default FileUpload;
