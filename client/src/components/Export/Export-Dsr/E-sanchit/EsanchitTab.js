// ESanchitTab.jsx
import React, { useState } from "react";
import { styles as baseStyles } from "../Product/commonStyles.js";
import ESanchitEditDialog from "./ESanchitEditDialog";

const ESanchitTab = ({ formik }) => {
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);

  // uploads per document; if you want this in formik later, you can move it
  const handleNew = () => {
    setSelectedDoc(null);
    setEditMode(false);
    setIsDialogOpen(true);
  };

  const handleEdit = (doc, idx) => {
    setSelectedDoc({ ...doc, _index: idx });
    setEditMode(true);
    setIsDialogOpen(true);
  };

  const handleSave = (updatedDoc) => {
    const documents = [...(formik.values.eSanchitDocuments || [])];
    if (editMode && selectedDoc && selectedDoc._index !== undefined) {
      documents[selectedDoc._index] = updatedDoc;
    } else {
      documents.push(updatedDoc);
    }
    formik.setFieldValue("eSanchitDocuments", documents);
    setIsDialogOpen(false);
  };

  const tableStyles = {
    width: "100%",
    borderCollapse: "collapse",
  };

  const thTdCommon = {
    border: "1px solid #ccc",
    padding: "4px 8px",
    fontSize: "12px",
    textAlign: "left",
  };

  return (
    <div style={{ ...baseStyles.sectionContainer }}>
      <div style={{ ...baseStyles.sectionHeader }}>
        <span style={{ fontWeight: "bold" }}>eSanchit Documents</span>
      </div>

      <div style={{ ...baseStyles.card }}>
        <div style={{ overflowX: "auto" }}>
          <table style={tableStyles}>
            <thead>
              <tr>
                <th style={thTdCommon}>Doc. Level</th>
                <th style={thTdCommon}>Scope</th>
                <th style={thTdCommon}>Inv. Sr. No.</th>
                <th style={thTdCommon}>Item Sr. No.</th>
                <th style={thTdCommon}>Doc. IRN</th>
                <th style={thTdCommon}>Doc. Type</th>
                <th style={thTdCommon}>Doc. Ref. No.</th>
                <th style={thTdCommon}>ICEGATE ID</th>
                <th style={thTdCommon}>ICEGATE Filename</th>
                <th style={thTdCommon}>Doc. Issue Date</th>
                <th style={thTdCommon}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {(formik.values.eSanchitDocuments || []).map((doc, idx) => (
                <tr
                  key={idx}
                  style={{ cursor: "pointer" }}
                  onClick={() => handleEdit(doc, idx)}
                >
                  <td style={thTdCommon}>{doc.documentLevel || "Invoice"}</td>
                  <td style={thTdCommon}>{doc.scope || "This job only"}</td>
                  <td style={thTdCommon}>{doc.invSerialNo}</td>
                  <td style={thTdCommon}>{doc.itemSerialNo}</td>
                  <td style={thTdCommon}>{doc.irn}</td>
                  <td style={thTdCommon}>{doc.documentType}</td>
                  <td style={thTdCommon}>{doc.documentReferenceNo}</td>
                  <td style={thTdCommon}>{doc.otherIcegateId}</td>
                  <td style={thTdCommon}>{doc.icegateFilename}</td>
                  <td style={thTdCommon}>
                    {doc.dateOfIssue
                      ? new Date(doc.dateOfIssue).toLocaleDateString()
                      : ""}
                  </td>
                  <td style={thTdCommon}>
                    <button
                      type="button"
                      style={baseStyles.linkButton}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEdit(doc, idx);
                      }}
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}

              {(!formik.values.eSanchitDocuments ||
                formik.values.eSanchitDocuments.length === 0) && (
                <tr>
                  <td style={thTdCommon} colSpan={11}>
                    No eSanchit documents added.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div style={{ marginTop: "8px", display: "flex", gap: "8px" }}>
          <button
            type="button"
            style={baseStyles.primaryButton}
            onClick={handleNew}
          >
            New
          </button>
        </div>
      </div>

{isDialogOpen && (
  <ESanchitEditDialog
    open={isDialogOpen}
    doc={selectedDoc}
    setDoc={setSelectedDoc}
    onClose={() => setIsDialogOpen(false)}
    onSave={handleSave}
  />
)}
    </div>
  );
};

export default ESanchitTab;
