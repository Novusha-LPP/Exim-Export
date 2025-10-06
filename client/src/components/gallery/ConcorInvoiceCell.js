import React, { useState, useEffect } from "react";
import FileUpload from "./FileUpload";
import { FaUpload } from "react-icons/fa";
import axios from "axios";

const ConcorInvoiceCell = ({ cell, onDocumentsUpdated }) => {
  const [activeUpload, setActiveUpload] = useState(null);
  const [invoiceFiles, setInvoiceFiles] = useState(
    cell.row.original.concor_invoice_and_receipt_copy || []
  );

  // Sync invoice documents
  useEffect(() => {
    setInvoiceFiles(cell.row.original.concor_invoice_and_receipt_copy || []);
  }, [cell.row.original.concor_invoice_and_receipt_copy]);

  const rowId = cell.row.original._id || cell.row.original.id || cell.row.id;

  // Handle file uploads
  const handleFilesUploaded = async (newFiles) => {
    const updatedFiles = [...invoiceFiles, ...newFiles];
    setInvoiceFiles(updatedFiles);

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

      await axios.patch(
        `${import.meta.env.VITE_API_STRING}/jobs/${rowId}`,
        {
          concor_invoice_and_receipt_copy: updatedFiles,
        },
        { headers }
      );

      // Call parent component's update function if available
      if (onDocumentsUpdated) {
        onDocumentsUpdated(
          rowId,
          "concor_invoice_and_receipt_copy",
          updatedFiles
        );
      }
    } catch (error) {
      // Add minimal error handling to alert the user
      alert("Failed to update Concor invoice documents. Please try again.");
    }

    // Close the upload popup
    setActiveUpload(null);
  };

  // Component to render the upload button and popup
  const renderUploadButton = () => {
    const isActive = activeUpload === "invoice";

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
          onClick={() => setActiveUpload(isActive ? null : "invoice")}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: "0",
            color: "#0066cc",
          }}
          title="Upload Concor Invoice/Receipt"
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
              label="Upload Invoice"
              bucketPath="concor_invoices"
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
      return <span style={{ color: "gray" }}>No Invoice</span>;
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
            Invoice {index + 1}
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
        <div style={{ flex: 1 }}>{renderDocumentLinks(invoiceFiles)}</div>
        {renderUploadButton()}
      </div>
    </div>
  );
};

export default ConcorInvoiceCell;
