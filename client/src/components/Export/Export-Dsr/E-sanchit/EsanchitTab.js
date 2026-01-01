// ESanchitTab.jsx
import React, { useState } from "react";
import ESanchitEditDialog from "./ESanchitEditDialog";
import { formatDate } from "../../../../utils/dateUtils";

// Enterprise styles
const styles = {
  sectionContainer: {
    marginTop: 12,
    fontFamily: "'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    color: "#111827",
    fontSize: 12,
  },
  sectionHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: 700,
    letterSpacing: "0.04em",
    textTransform: "uppercase",
    color: "#374151",
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 4,
    border: "1px solid #e5e7eb",
    boxShadow: "0 1px 2px rgba(15,23,42,0.04)",
    padding: 10,
  },
  tableWrapper: {
    overflowX: "auto",
    borderRadius: 4,
    border: "1px solid #e5e7eb",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    tableLayout: "fixed",
    fontSize: 12,
  },
  th: {
    borderBottom: "1px solid #e5e7eb",
    padding: "6px 8px",
    textAlign: "left",
    backgroundColor: "#f9fafb",
    color: "#4b5563",
    fontWeight: 700,
    whiteSpace: "nowrap",
  },
  td: {
    borderBottom: "1px solid #f3f4f6",
    padding: "5px 8px",
    color: "#111827",
    fontWeight: 700,
    backgroundColor: "#ffffff",
  },
  rowClickable: {
    cursor: "pointer",
  },
  emptyRow: {
    textAlign: "center",
    color: "#9ca3af",
    fontStyle: "italic",
    fontWeight: 700,
  },
  footerBar: {
    marginTop: 8,
    display: "flex",
    justifyContent: "flex-start",
    gap: 8,
  },
  primaryButton: {
    padding: "6px 14px",
    borderRadius: 4,
    border: "1px solid #1d4ed8",
    backgroundColor: "#2563eb",
    color: "#ffffff",
    fontSize: 12,
    fontWeight: 700,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 1px 2px rgba(15,23,42,0.15)",
  },
  linkButton: {
    border: "none",
    background: "transparent",
    color: "#2563eb",
    fontSize: 12,
    fontWeight: 700,
    cursor: "pointer",
    padding: 0,
    textDecoration: "underline",
  },
};

const ESanchitTab = ({ formik }) => {
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);

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

  const docs = formik.values.eSanchitDocuments || [];

  return (
    <div style={styles.sectionContainer}>
      <div style={styles.sectionHeader}>
        <span style={styles.sectionTitle}>ESANCHIT DOCUMENTS</span>
      </div>

      <div style={styles.card}>
        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Doc. Level</th>
                <th style={styles.th}>Scope</th>
                <th style={styles.th}>Inv. Sr. No.</th>
                <th style={styles.th}>Item Sr. No.</th>
                <th style={styles.th}>Doc. IRN</th>
                <th style={styles.th}>Doc. Type</th>
                <th style={styles.th}>Doc. Ref. No.</th>
                <th style={styles.th}>ICEGATE ID</th>
                <th style={styles.th}>ICEGATE Filename</th>
                <th style={styles.th}>Doc. Issue Date</th>
                <th style={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {docs.map((doc, idx) => (
                <tr
                  key={idx}
                  style={{ ...styles.rowClickable }}
                  onClick={() => handleEdit(doc, idx)}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "#f3f4ff";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "#ffffff";
                  }}
                >
                  <td style={styles.td}>{doc.documentLevel || "Invoice"}</td>
                  <td style={styles.td}>{doc.scope || "This job only"}</td>
                  <td style={styles.td}>{doc.invSerialNo}</td>
                  <td style={styles.td}>{doc.itemSerialNo}</td>
                  <td style={styles.td}>{doc.irn}</td>
                  <td style={styles.td}>{doc.documentType}</td>
                  <td style={styles.td}>{doc.documentReferenceNo}</td>
                  <td style={styles.td}>{doc.otherIcegateId}</td>
                  <td style={styles.td}>{doc.icegateFilename}</td>
                  <td style={styles.td}>
                    {doc.dateOfIssue
                      ? formatDate(doc.dateOfIssue)
                      : ""}
                  </td>
                  <td style={styles.td}>
                    <button
                      type="button"
                      style={styles.linkButton}
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

              {docs.length === 0 && (
                <tr>
                  <td style={{ ...styles.td, ...styles.emptyRow }} colSpan={11}>
                    No eSanchit documents added.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div style={styles.footerBar}>
          <button
            type="button"
            style={styles.primaryButton}
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
          jobData={formik.values}
        />
      )}
    </div>
  );
};

export default ESanchitTab;
