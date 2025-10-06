import React, { useState, useEffect } from "react";
import FileUpload from "./FileUpload";
import { FaUpload } from "react-icons/fa";
import axios from "axios";

const ChecklistCell = ({ cell, onDocumentsUpdated }) => {
  const [activeUpload, setActiveUpload] = useState(null);
  const [checklistFiles, setChecklistFiles] = useState(
    cell.row.original.checklist || []
  );

  // Sync checklist documents
  useEffect(() => {
    setChecklistFiles(cell.row.original.checklist || []);
  }, [cell.row.original.checklist]);

  const rowId = cell.row.original._id || cell.row.original.id || cell.row.id;

  // Handle file uploads
  const handleFilesUploaded = async (newFiles) => {
    const updatedFiles = [...checklistFiles, ...newFiles];
    setChecklistFiles(updatedFiles);

    // Update the database with the complete array
    try {
      // Get user info from localStorage for audit trail
      const user = JSON.parse(localStorage.getItem("exim_user") || "{}");
      const headers = {
        "Content-Type": "application/json",
        "user-id": user.username || "unknown",
        username: user.username || "unknown",
        "user-role": user.role || "unknown",
      };

      // Fix: Use the correct API endpoint structure that matches your backend
      await axios.patch(
        `${import.meta.env.VITE_API_STRING}/jobs/${rowId}`,
        {
          checklist: updatedFiles,
        },
        { headers }
      );

      // Call parent component's update function if available
      if (onDocumentsUpdated) {
        onDocumentsUpdated(rowId, "checklist", updatedFiles);
      }
    } catch (error) {
      // Add minimal error handling to alert the user
      alert("Failed to update checklist documents. Please try again.");
    }

    // Close the upload popup
    setActiveUpload(null);
  };

  // Component to render the upload button and popup
  const renderUploadButton = () => {
    const isActive = activeUpload === "checklist";

    return (
      <div
        style={{
          position: "relative",
          display: "inline-block",
          marginLeft: "10px",
        }}
      >
        <button
          type="button"
          onClick={() => setActiveUpload(isActive ? null : "checklist")}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: "0",
            color: "#0066cc",
          }}
          title="Upload Checklist Document"
        >
          <FaUpload size={14} />
        </button>

        {isActive && (
          <div
            style={{
              position: "absolute",
              zIndex: 10,
              width: "100px",
              height: "100px",
              padding: "10px",
              borderRadius: "4px",
              right: 0,
              marginTop: "5px",
            }}
          >
            <FileUpload
              label="Upload Checklist"
              bucketPath="checklist"
              onFilesUploaded={(newFiles) => handleFilesUploaded(newFiles)}
              multiple={true}
            />
            <button
              type="button"
              onClick={() => setActiveUpload(null)}
              style={{
                marginTop: "5px",
                padding: "3px 8px",
                background: "#f0f0f0",
                border: "1px solid #ccc",
                borderRadius: "3px",
                cursor: "pointer",
                fontSize: "12px",
              }}
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    );
  };

  // Render document links with proper indexing
  const renderDocumentLinks = (documents) => {
    if (!documents || documents.length === 0) {
      return <span style={{ color: "gray" }}>No Checklist</span>;
    }

    return (
      <>
        {documents.map((doc, index) => (
          <a
            key={index}
            href={doc}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: "blue",
              textDecoration: "underline",
              cursor: "pointer",
              display: "block",
              marginTop: index === 0 ? 0 : "3px",
            }}
          >
            Checklist {index + 1}
          </a>
        ))}
      </>
    );
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
        position: "relative",
      }}
    >
      <div style={{ display: "flex", alignItems: "center" }}>
        <div style={{ flex: 1 }}>{renderDocumentLinks(checklistFiles)}</div>
        {renderUploadButton()}
      </div>
    </div>
  );
};

export default ChecklistCell;
