import React, { useEffect, useState } from "react";
import axios from "axios"; // Ensure axios is imported
import FileUpload from "../../../gallery/FileUpload.js";
import ImagePreview from "../../../gallery/ImagePreview.js";
import ConfirmDialog from "../../../gallery/ConfirmDialog.js";

// Helper to safely uppercase strings
function toUpper(val) {
  return (typeof val === "string" ? val : "")?.toUpperCase() || "";
}

const ESanchitEditDialog = ({ open, onClose, onSave, doc, setDoc }) => {
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [organizations, setOrganizations] = useState([]); // Store directory data
  const [orgLoading, setOrgLoading] = useState(false);

  const safeDoc = doc || {};

  // Sync doc prop to local if needed (though you are using parent state setter directly)
  useEffect(() => {
    if (setDoc && doc) {
      setDoc(doc);
    }
  }, [doc, setDoc]);

  // Fetch Organization Directory on Mount
  useEffect(() => {
    if (open) {
      const fetchOrgs = async () => {
        try {
          setOrgLoading(true);
          // Adjust API string if your environment variable is different
          const response = await axios.get(
            `${import.meta.env.VITE_API_STRING}/directory`
          );
          if (response.data?.success) {
            setOrganizations(response.data.data || []);
          }
        } catch (e) {
          console.error("Error fetching organizations for eSanchit", e);
        } finally {
          setOrgLoading(false);
        }
      };
      fetchOrgs();
    }
  }, [open]);

  const issuingParty = safeDoc.issuingParty || {};
  const beneficiaryParty = safeDoc.beneficiaryParty || {};
  const level = safeDoc.documentLevel || "Invoice";

  const disableInvSrNo = level === "Job" || level === "Item";
  const disableItemSrNo = level === "Job" || level === "Invoice";

  // -- Handlers --
  const handleFieldChange = (field, value) => {
    setDoc((prev) => ({ ...(prev || {}), [field]: value }));
  };

  const handleIssuingPartyChange = (field, value) => {
    setDoc((prev) => ({
      ...(prev || {}),
      issuingParty: { ...(prev?.issuingParty || {}), [field]: value },
    }));
  };

  const handleBeneficiaryPartyChange = (field, value) => {
    setDoc((prev) => ({
      ...(prev || {}),
      beneficiaryParty: { ...(prev?.beneficiaryParty || {}), [field]: value },
    }));
  };

  // -- Organization Selection Handlers --

  // Handler for Issuing Party Selection
  const onSelectIssuingParty = (e) => {
    const val = toUpper(e.target.value);

    // Set name first
    handleIssuingPartyChange("name", val);

    // Find org details
    const org = organizations.find(
      (o) => toUpper(o.organization || "") === val
    );
    if (!org) return;

    const branch = org.branchInfo?.[0] || {};

    // Auto-fill address fields
    // Map directory fields to eSanchit fields:
    // code -> branchCode (or ieCode depending on your need)
    // addressLine1 -> branch.address
    // city -> branch.city
    // pinCode -> branch.postalCode

    handleIssuingPartyChange("code", toUpper(branch.branchCode || ""));
    handleIssuingPartyChange("addressLine1", toUpper(branch.address || ""));
    handleIssuingPartyChange("addressLine2", ""); // Directory might not have line 2 split
    handleIssuingPartyChange("city", toUpper(branch.city || ""));
    handleIssuingPartyChange("pinCode", toUpper(branch.postalCode || ""));
  };

  // Handler for Beneficiary Party Selection
  const onSelectBeneficiaryParty = (e) => {
    const val = toUpper(e.target.value);

    handleBeneficiaryPartyChange("name", val);

    const org = organizations.find(
      (o) => toUpper(o.organization || "") === val
    );
    if (!org) return;

    const branch = org.branchInfo?.[0] || {};

    handleBeneficiaryPartyChange("code", toUpper(branch.branchCode || ""));
    handleBeneficiaryPartyChange("addressLine1", toUpper(branch.address || ""));
    handleBeneficiaryPartyChange("addressLine2", "");
    handleBeneficiaryPartyChange("city", toUpper(branch.city || ""));
    handleBeneficiaryPartyChange("pinCode", toUpper(branch.postalCode || ""));
  };

  // -- File Deletion Logic --
  const initiateDelete = () => {
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = () => {
    handleFieldChange("fileUrl", "");
    setDeleteConfirmOpen(false);
  };

  const handleCancelDelete = () => {
    setDeleteConfirmOpen(false);
  };

  // Helper to extract filename from URL
  const getFileName = (url) => {
    if (!url) return "";
    return url.split("/").pop().split("?")[0];
  };

  if (!open) return null;

  // -- Styles (Compact Version) --
  const s = {
    overlay: {
      position: "fixed",
      inset: 0,
      backgroundColor: "rgba(0,0,0,0.5)",
      display: "flex",
      justifyContent: "center",
      alignItems: "flex-start",
      zIndex: 1300,
      overflowY: "auto",
      padding: "20px 0",
    },
    container: {
      backgroundColor: "#fff",
      width: "98vw",
      maxWidth: "950px",
      borderRadius: "6px",
      boxShadow: "0 10px 25px rgba(0,0,0,0.5)",
      display: "flex",
      flexDirection: "column",
      fontFamily: "'Segoe UI', Roboto, Arial, sans-serif",
      fontSize: "11px",
      color: "#1e2e38",
      border: "1px solid #16408f",
      height: "fit-content",
      margin: "auto",
    },
    header: {
      background: "linear-gradient(to bottom, #dbeafe 0%, #bfdbfe 100%)",
      borderBottom: "1px solid #16408f",
      padding: "6px 10px",
      fontWeight: "700",
      color: "#16408f",
      fontSize: "12px",
      borderTopLeftRadius: "6px",
      borderTopRightRadius: "6px",
    },
    body: {
      padding: "10px",
      backgroundColor: "#f8f9fa",
      display: "flex",
      flexDirection: "column",
      gap: "4px",
    },
    row: {
      display: "flex",
      alignItems: "center",
      gap: "15px",
      marginBottom: "2px",
    },
    col: {
      flex: 1,
      display: "flex",
      flexDirection: "column",
      gap: "4px",
    },
    fieldGroup: {
      display: "flex",
      alignItems: "center",
      width: "100%",
    },
    label: {
      width: "110px",
      fontWeight: "700",
      color: "#263046",
      fontSize: "10px",
      flexShrink: 0,
    },
    input: {
      flex: 1,
      padding: "2px 5px",
      border: "1px solid #bdc7d1",
      borderRadius: "3px",
      fontSize: "11px",
      outline: "none",
      height: "22px",
      backgroundColor: "#fff",
      boxSizing: "border-box",
      width: "100%",
    },
    select: {
      flex: 1,
      padding: "0px 2px",
      border: "1px solid #bdc7d1",
      borderRadius: "3px",
      fontSize: "11px",
      height: "22px",
      backgroundColor: "#fff",
      width: "100%",
    },
    sectionLink: {
      fontWeight: "700",
      color: "blue",
      textDecoration: "underline",
      fontSize: "10px",
      marginBottom: "4px",
      marginTop: "6px",
      cursor: "pointer",
    },
    // -- NEW DOCUMENT SECTION STYLES --
    docSectionContainer: {
      marginTop: "6px",
      borderTop: "1px solid #e2e8f0",
      paddingTop: "6px",
    },
    docHeader: {
      fontSize: "11px",
      fontWeight: "700",
      color: "#16408f",
      textTransform: "uppercase",
      marginBottom: "4px",
    },
    fileDisplayBox: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      border: "1px solid #cbd5e0",
      borderRadius: "4px",
      padding: "4px 8px",
      backgroundColor: "#fff",
      marginBottom: "6px",
    },
    fileNameText: {
      fontWeight: "600",
      fontSize: "11px",
      color: "#2d3748",
      marginBottom: "0px",
    },
    fileUrlText: {
      fontSize: "10px",
      color: "#718096",
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap",
      maxWidth: "500px",
    },
    iconButton: {
      width: "22px",
      height: "22px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      border: "1px solid #cbd5e0",
      borderRadius: "4px",
      backgroundColor: "#fff",
      cursor: "pointer",
      marginLeft: "6px",
      fontSize: "14px",
      color: "#4a5568",
    },
    deleteBtn: {
      color: "#e53e3e",
      borderColor: "#feb2b2",
      backgroundColor: "#fff5f5",
    },
    footerActions: {
      display: "flex",
      justifyContent: "flex-end",
      gap: "8px",
      marginTop: "8px",
      paddingTop: "8px",
      borderTop: "1px solid #e2e8f0",
    },
    btnSave: {
      backgroundColor: "#3182ce",
      color: "#fff",
      border: "none",
      padding: "5px 15px",
      borderRadius: "4px",
      cursor: "pointer",
      fontWeight: "600",
      fontSize: "12px",
    },
    btnClose: {
      backgroundColor: "#edf2f7",
      color: "#2d3748",
      border: "1px solid #cbd5e0",
      padding: "5px 15px",
      borderRadius: "4px",
      cursor: "pointer",
      fontWeight: "600",
      fontSize: "12px",
    },
  };

  const Field = ({
    label,
    value,
    onChange,
    type = "text",
    style = {},
    disabled = false,
  }) => (
    <div style={s.fieldGroup}>
      <span style={s.label}>{label}</span>
      <input
        type={type}
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        style={{
          ...s.input,
          ...style,
          backgroundColor: disabled ? "#e5e7eb" : "#fff",
        }}
        disabled={disabled}
      />
    </div>
  );

  const fileArray = safeDoc.fileUrl ? [safeDoc.fileUrl] : [];

  return (
    <div style={s.overlay}>
      <div style={s.container}>
        <div style={s.header}>eSanchit Document Details</div>

        <div style={s.body}>
          {/* Top Row */}
          <div style={s.row}>
            <div style={s.col}>
              <div style={s.fieldGroup}>
                <span style={s.label}>Document Level</span>
                <select
                  style={s.select}
                  value={safeDoc.documentLevel || "Invoice"}
                  onChange={(e) =>
                    handleFieldChange("documentLevel", e.target.value)
                  }
                >
                  <option value="Job">Job</option>
                  <option value="Invoice">Invoice</option>
                  <option value="Item">Item</option>
                </select>
              </div>
              <Field
                label="Inv.Sr.No."
                value={safeDoc.invSerialNo}
                onChange={(v) => handleFieldChange("invSerialNo", v)}
                disabled={disableInvSrNo}
              />
              <Field
                label="IRN (Image Ref)"
                value={safeDoc.irn}
                onChange={(v) => handleFieldChange("irn", v)}
              />
              <div style={s.fieldGroup}>
                <span style={s.label}>ICEGATE ID</span>
                <select
                  style={s.select}
                  value={safeDoc.icegateIdSelect || ""}
                  onChange={(e) =>
                    handleFieldChange("icegateIdSelect", e.target.value)
                  }
                >
                  <option value="">-- Select --</option>
                  <option value="RAJANSFPL - GCard - RAJANSFPL">
                    RAJANSFPL - GCard - RAJANSFPL
                  </option>
                  <option value="SURAJAHD - FCard - SURAJAHD">
                    SURAJAHD - FCard - SURAJAHD
                  </option>
                  <option value="SURAJAMD - GCard - SURAJAMD">
                    SURAJAMD - GCard - SURAJAMD
                  </option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <Field
                label="ICEGATE Filename"
                value={safeDoc.icegateFilename}
                onChange={(v) => handleFieldChange("icegateFilename", v)}
              />
              <Field
                label="Date-Time Upload"
                type="datetime-local"
                value={
                  safeDoc.dateTimeOfUpload
                    ? safeDoc.dateTimeOfUpload.substring(0, 16)
                    : ""
                }
                onChange={(v) => handleFieldChange("dateTimeOfUpload", v)}
              />
              <Field
                label="Doc Ref No."
                value={safeDoc.documentReferenceNo}
                onChange={(v) => handleFieldChange("documentReferenceNo", v)}
              />
              <Field
                label="Date of Issue"
                type="date"
                value={
                  safeDoc.dateOfIssue
                    ? safeDoc.dateOfIssue.substring(0, 10)
                    : ""
                }
                onChange={(v) => handleFieldChange("dateOfIssue", v)}
              />
            </div>

            <div style={s.col}>
              <div style={s.fieldGroup}>
                <span style={s.label}>Scope</span>
                <select
                  style={s.select}
                  value={safeDoc.scope || "This job only"}
                  onChange={(e) => handleFieldChange("scope", e.target.value)}
                >
                  <option value="This job only">This job only</option>
                  <option value="Multiple jobs">Multiple jobs</option>
                </select>
              </div>
              <Field
                label="Item.Sr.No."
                value={safeDoc.itemSerialNo}
                onChange={(v) => handleFieldChange("itemSerialNo", v)}
                disabled={disableItemSrNo}
              />
              <div style={s.fieldGroup}>
                <span style={s.label}>Document Type</span>
                <select
                  style={s.select}
                  value={safeDoc.documentType || ""}
                  onChange={(e) =>
                    handleFieldChange("documentType", e.target.value)
                  }
                >
                  <option value="">Select Type...</option>
                  <option value="380">Commercial Invoice</option>
                  <option value="Packing List">Packing List</option>
                  {/* Add more types as needed */}
                </select>
              </div>
              <Field
                label="Other ICEGATE ID"
                value={safeDoc.icegateId}
                onChange={(v) => handleFieldChange("icegateId", v)}
              />
              <div style={s.fieldGroup}>
                <span style={s.label}>File Type</span>
                <input type="text" value="pdf" disabled style={s.input} />
              </div>
              <div style={{ height: "22px" }}></div>
              <Field
                label="Place of Issue"
                value={safeDoc.placeOfIssue}
                onChange={(v) => handleFieldChange("placeOfIssue", v)}
              />
              <Field
                label="Expiry Date"
                type="date"
                value={
                  safeDoc.expiryDate ? safeDoc.expiryDate.substring(0, 10) : ""
                }
                onChange={(v) => handleFieldChange("expiryDate", v)}
              />
            </div>
          </div>

          {/* Party Details */}
          <div style={s.row}>
            <div style={s.col}>
              <div style={s.sectionLink}>Issuing Party Details</div>

              {/* ISSUING PARTY NAME SELECT */}
              <div style={s.fieldGroup}>
                <span style={s.label}>Name {orgLoading ? "(...)" : ""}</span>
                <select
                  style={s.select}
                  value={issuingParty.name || ""}
                  onChange={onSelectIssuingParty}
                >
                  <option value="">-- Select / Type --</option>
                  {organizations.map((o) => (
                    <option
                      key={o._id || o.organization}
                      value={toUpper(o.organization || "")}
                    >
                      {toUpper(o.organization || "")}
                    </option>
                  ))}
                </select>
              </div>
              {/* Fallback Input if they need to type a name not in list, optional: usually Select + Searchable or just select. 
                  Since native select doesn't support typing custom values easily, users select from directory. 
                  If manual entry is needed, you'd need a Creatable Select component. 
                  For now, we stick to Select from Directory as per request. 
              */}

              <Field
                label="Code"
                value={issuingParty.code}
                onChange={(v) => handleIssuingPartyChange("code", v)}
              />
              <Field
                label="Address Line 1"
                value={issuingParty.addressLine1}
                onChange={(v) => handleIssuingPartyChange("addressLine1", v)}
              />
              <Field
                label="Address Line 2"
                value={issuingParty.addressLine2}
                onChange={(v) => handleIssuingPartyChange("addressLine2", v)}
              />
              <Field
                label="City"
                value={issuingParty.city}
                onChange={(v) => handleIssuingPartyChange("city", v)}
              />
              <Field
                label="Pin Code"
                value={issuingParty.pinCode}
                onChange={(v) => handleIssuingPartyChange("pinCode", v)}
              />
            </div>

            <div style={s.col}>
              <div style={s.sectionLink}>Beneficiary Party Details</div>

              {/* BENEFICIARY PARTY NAME SELECT */}
              <div style={s.fieldGroup}>
                <span style={s.label}>Name {orgLoading ? "(...)" : ""}</span>
                <select
                  style={s.select}
                  value={beneficiaryParty.name || ""}
                  onChange={onSelectBeneficiaryParty}
                >
                  <option value="">-- Select / Type --</option>
                  {organizations.map((o) => (
                    <option
                      key={o._id || o.organization}
                      value={toUpper(o.organization || "")}
                    >
                      {toUpper(o.organization || "")}
                    </option>
                  ))}
                </select>
              </div>

              <Field
                label="Code"
                value={beneficiaryParty.code}
                onChange={(v) => handleBeneficiaryPartyChange("code", v)}
              />
              <Field
                label="Address Line 1"
                value={beneficiaryParty.addressLine1}
                onChange={(v) =>
                  handleBeneficiaryPartyChange("addressLine1", v)
                }
              />
              <Field
                label="Address Line 2"
                value={beneficiaryParty.addressLine2}
                onChange={(v) =>
                  handleBeneficiaryPartyChange("addressLine2", v)
                }
              />
              <Field
                label="City"
                value={beneficiaryParty.city}
                onChange={(v) => handleBeneficiaryPartyChange("city", v)}
              />
              <Field
                label="Pin Code"
                value={beneficiaryParty.pinCode}
                onChange={(v) => handleBeneficiaryPartyChange("pinCode", v)}
              />
            </div>
          </div>

          {/* --- NEW DOCUMENT UPLOAD SECTION --- */}
          <div style={s.docSectionContainer}>
            <div style={s.docHeader}>UNSIGNED DOCUMENT PDF</div>

            {/* If no file, show browse button */}
            {!safeDoc.fileUrl && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  marginBottom: 8,
                }}
              >
                <FileUpload
                  label="Browse"
                  bucketPath="esanchit"
                  multiple={false}
                  acceptedFileTypes={[".pdf", ".jpg", ".png"]}
                  onFilesUploaded={(urls) => {
                    const url = urls && urls.length ? urls[0] : "";
                    handleFieldChange("fileUrl", url);
                  }}
                />
              </div>
            )}

            {/* ImagePreview handles listing and deleting */}
            <ImagePreview
              images={fileArray}
              readOnly={false}
              onDeleteImage={(idx) => handleFieldChange("fileUrl", "")}
            />
          </div>

          {/* Footer Actions */}
          <div style={s.footerActions}>
            <button style={s.btnSave} onClick={() => onSave(safeDoc)}>
              Save
            </button>
            <button style={s.btnClose} onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation Dialog Component */}
      <ConfirmDialog
        open={deleteConfirmOpen}
        handleClose={handleCancelDelete}
        handleConfirm={handleConfirmDelete}
        message="Are you sure you want to remove this file?"
        isEdit={false}
      />
    </div>
  );
};

export default ESanchitEditDialog;
