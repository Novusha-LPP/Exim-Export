import React, { useState, useEffect } from "react";
import FileUpload from "./FileUpload";
import { FaUpload } from "react-icons/fa";
import axios from "axios";

const DocsCell = ({ cell, onDocumentsUpdated }) => {
  const [activeUpload, setActiveUpload] = useState(null);
  const [oocFiles, setOocFiles] = useState(cell.row.original.ooc_copies || []);
  const [icdCfsInvoices, setIcdCfsInvoices] = useState(
    cell.row.original.icd_cfs_invoice_img || []
  );
  const [shippingLineInvoices, setShippingLineInvoices] = useState(
    cell.row.original.shipping_line_invoice_imgs || []
  );
  const [concorInvoices, setConcorInvoices] = useState(
    cell.row.original.concor_invoice_and_receipt_copy || []
  );

  const rowId = cell.row.original._id || cell.row.id;

  // Sync OOC Copies
  useEffect(() => {
    setOocFiles(cell.row.original.ooc_copies || []);
  }, [cell.row.original.ooc_copies]);

  // Sync ICD/CFS Invoice Images
  useEffect(() => {
    setIcdCfsInvoices(cell.row.original.icd_cfs_invoice_img || []);
  }, [cell.row.original.icd_cfs_invoice_img]);

  // Sync Shipping Line Invoice Images
  useEffect(() => {
    setShippingLineInvoices(cell.row.original.shipping_line_invoice_imgs || []);
  }, [cell.row.original.shipping_line_invoice_imgs]);

  // Sync Concor Invoice & Receipt Copies
  useEffect(() => {
    setConcorInvoices(cell.row.original.concor_invoice_and_receipt_copy || []);
  }, [cell.row.original.concor_invoice_and_receipt_copy]);

  // Handle file uploads for different document types
  const handleFilesUploaded = async (newFiles, fieldName) => {
    let updatedFiles;

    // Determine which state to update based on the field
    if (fieldName === "ooc_copies") {
      updatedFiles = [...oocFiles, ...newFiles];
      setOocFiles(updatedFiles);
    } else if (fieldName === "icd_cfs_invoice_img") {
      updatedFiles = [...icdCfsInvoices, ...newFiles];
      setIcdCfsInvoices(updatedFiles);
    } else if (fieldName === "shipping_line_invoice_imgs") {
      updatedFiles = [...shippingLineInvoices, ...newFiles];
      setShippingLineInvoices(updatedFiles);
    } else if (fieldName === "concor_invoice_and_receipt_copy") {
      updatedFiles = [...concorInvoices, ...newFiles];
      setConcorInvoices(updatedFiles);
    }

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
          [fieldName]: updatedFiles,
        },
        { headers }
      );

      // Call parent component's update function if available
      if (onDocumentsUpdated) {
        onDocumentsUpdated(rowId, fieldName, updatedFiles);
      }
    } catch (error) {
      console.error(`Error updating ${fieldName}:`, error);
      // You might want to show an error message to the user
    }

    // Close the upload popup
    setActiveUpload(null);
  };

  // Component to render the upload button and popup
  const renderUploadButton = (fieldName, title) => {
    const isActive = activeUpload === fieldName;

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
          onClick={() => setActiveUpload(isActive ? null : fieldName)}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: "0",
            color: "#0066cc",
          }}
          title={`Upload ${title}`}
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
              label={`Upload ${title}`}
              bucketPath={fieldName}
              onFilesUploaded={(newFiles) =>
                handleFilesUploaded(newFiles, fieldName)
              }
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
  const renderDocumentLinks = (documents, baseLabel) => {
    if (!documents || documents.length === 0) {
      return <span style={{ color: "gray" }}>No {baseLabel}</span>;
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
            {baseLabel} {index + 1}
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
        alignItems: "flex-start",
        padding: "8px 0",
      }}
    >
      {/* OOC Copies */}
      <div
        style={{
          width: "100%",
          marginBottom: "12px",
          display: "flex",
          alignItems: "center",
        }}
      >
        <div style={{ flex: 1 }}>
          {renderDocumentLinks(oocFiles, "OOC Copy")}
        </div>
        {renderUploadButton("ooc_copies", "OOC Copy")}
      </div>

      {/* ICD/CFS Invoice */}
      <div
        style={{
          width: "100%",
          marginBottom: "12px",
          display: "flex",
          alignItems: "center",
        }}
      >
        <div style={{ flex: 1 }}>
          {renderDocumentLinks(icdCfsInvoices, "ICD/CFS Invoice")}
        </div>
        {renderUploadButton("icd_cfs_invoice_img", "ICD/CFS Invoice")}
      </div>

      {/* Shipping Line Invoice */}
      <div
        style={{
          width: "100%",
          marginBottom: "12px",
          display: "flex",
          alignItems: "center",
        }}
      >
        <div style={{ flex: 1 }}>
          {renderDocumentLinks(shippingLineInvoices, "Shipping Line Invoice")}
        </div>
        {renderUploadButton(
          "shipping_line_invoice_imgs",
          "Shipping Line Invoice"
        )}
      </div>

      {/* Concor Invoice & Receipt */}
      <div
        style={{
          width: "100%",
          marginBottom: "12px",
          display: "flex",
          alignItems: "center",
        }}
      >
        <div style={{ flex: 1 }}>
          {renderDocumentLinks(concorInvoices, "Concor Invoice/Receipt")}
        </div>
        {renderUploadButton(
          "concor_invoice_and_receipt_copy",
          "Concor Invoice/Receipt"
        )}
      </div>
    </div>
  );
};

export default DocsCell;
