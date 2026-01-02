import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import FileUpload from "../../../gallery/FileUpload.js";
import ImagePreview from "../../../gallery/ImagePreview.js";
import ConfirmDialog from "../../../gallery/ConfirmDialog.js";
import DateInput from "../../../common/DateInput.js";

// Helper
function toUpper(val) {
  return (typeof val === "string" ? val : "")?.toUpperCase() || "";
}

// Searchable Organization Dropdown Component
function SearchableOrganizationDropdown({ value, options, onChange, placeholder }) {
  const [query, setQuery] = useState(value || "");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const wrapperRef = useRef(null);

  useEffect(() => {
    setQuery(value || "");
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = options.filter((org) =>
    toUpper(org.organization || "").includes(toUpper(query))
  );

  const handleSelect = (org) => {
    setQuery(toUpper(org.organization || ""));
    setOpen(false);
    setActive(-1);
    onChange(org);
  };

  return (
    <div style={{ position: "relative", flex: 1 }} ref={wrapperRef}>
      <input
        type="text"
        value={toUpper(query)}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (!open || filtered.length === 0) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((a) => Math.min(filtered.length - 1, a + 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((a) => Math.max(0, a - 1));
          } else if (e.key === "Enter" && active >= 0) {
            e.preventDefault();
            handleSelect(filtered[active]);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
        placeholder={placeholder}
        style={{
          flex: 1,
          width: "100%",
          padding: "3px 6px",
          border: "1px solid #cbd5e1",
          borderRadius: 3,
          fontSize: 12,
          outline: "none",
          height: 25,
          backgroundColor: "#ffffff",
          boxSizing: "border-box",
          fontWeight: 600,
          paddingRight: "28px",
          color: "#1e293b",
        }}
      />
      <span
        style={{
          position: "absolute",
          right: "8px",
          top: "50%",
          transform: "translateY(-50%)",
          fontSize: "10px",
          color: "#64748b",
          pointerEvents: "none",
        }}
      >
        ▼
      </span>
      {open && filtered.length > 0 && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            background: "#fff",
            border: "1px solid #cbd5e1",
            borderRadius: "4px",
            marginTop: "2px",
            maxHeight: "200px",
            overflowY: "auto",
            zIndex: 9999,
            boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
          }}
        >
          {filtered.map((org, idx) => (
            <div
              key={org._id || idx}
              style={{
                padding: "8px 12px",
                cursor: "pointer",
                background: active === idx ? "#f1f5f9" : "#fff",
                fontSize: "11px",
                fontWeight: active === idx ? "700" : "600",
                borderBottom: "1px solid #f3f4f6",
              }}
              onMouseDown={() => handleSelect(org)}
              onMouseEnter={() => setActive(idx)}
            >
              {toUpper(org.organization || "")}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Searchable Consignee Dropdown Component
function SearchableConsigneeDropdown({ value, options, onChange, placeholder }) {
  const [query, setQuery] = useState(value || "");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const wrapperRef = useRef(null);

  useEffect(() => {
    setQuery(value || "");
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = options.filter((consignee) =>
    toUpper(consignee.consignee_name || "").includes(toUpper(query))
  );

  const handleSelect = (consignee) => {
    setQuery(toUpper(consignee.consignee_name || ""));
    setOpen(false);
    setActive(-1);
    onChange(consignee);
  };

  return (
    <div style={{ position: "relative", flex: 1 }} ref={wrapperRef}>
      <input
        type="text"
        value={toUpper(query)}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (!open || filtered.length === 0) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((a) => Math.min(filtered.length - 1, a + 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((a) => Math.max(0, a - 1));
          } else if (e.key === "Enter" && active >= 0) {
            e.preventDefault();
            handleSelect(filtered[active]);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
        placeholder={placeholder}
        style={{
          flex: 1,
          padding: "3px 6px",
          width: "100%",
          border: "1px solid #cbd5e1",
          borderRadius: 3,
          fontSize: 12,
          outline: "none",
          height: 25,
          backgroundColor: "#ffffff",
          boxSizing: "border-box",
          fontWeight: 600,
          paddingRight: "28px",
          color: "#1e293b",
        }}
      />
      <span
        style={{
          position: "absolute",
          right: "8px",
          top: "50%",
          transform: "translateY(-50%)",
          fontSize: "10px",
          color: "#64748b",
          pointerEvents: "none",
        }}
      >
        ▼
      </span>
      {open && filtered.length > 0 && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            background: "#fff",
            border: "1px solid #cbd5e1",
            borderRadius: "4px",
            marginTop: "2px",
            maxHeight: "200px",
            overflowY: "auto",
            zIndex: 9999,
            boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
          }}
        >
          {filtered.map((consignee, idx) => (
            <div
              key={consignee._id || idx}
              style={{
                padding: "8px 12px",
                cursor: "pointer",
                background: active === idx ? "#f1f5f9" : "#fff",
                fontSize: "11px",
                fontWeight: active === idx ? "700" : "600",
                borderBottom: "1px solid #f3f4f6",
              }}
              onMouseDown={() => handleSelect(consignee)}
              onMouseEnter={() => setActive(idx)}
            >
              {toUpper(consignee.consignee_name || "")}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Small field helper
const Field = ({ label, value, onChange, type = "text", disabled = false }) => (
  <div style={s.fieldGroup}>
    <span style={s.label}>{label}</span>
    <input
      type={type}
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      style={{
        ...s.input,
        backgroundColor: disabled ? "#e5e7eb" : "#ffffff",
      }}
    />
  </div>
);

// Enterprise styles
const s = {
  overlay: {
    position: "fixed",
    inset: 0,
    backgroundColor: "rgba(15,23,42,0.55)",
    display: "flex",
    justifyContent: "center",
    alignItems: "flex-start",
    zIndex: 1300,
    overflowY: "auto",
    padding: "20px 0",
    fontFamily: "'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    fontWeight: "700",
  },
  container: {
    backgroundColor: "#ffffff",
    width: "98vw",
    maxWidth: "980px",
    borderRadius: 6,
    boxShadow: "0 18px 45px rgba(15,23,42,0.45)",
    display: "flex",
    flexDirection: "column",
    fontSize: 11,
    color: "#111827",
    border: "1px solid #1d4ed8",
    margin: "auto",
  },
  header: {
    background: "linear-gradient(to bottom, #e0ecff 0%, #c7d7ff 100%)",
    borderBottom: "1px solid #1d4ed8",
    padding: "8px 12px",
    fontWeight: 700,
    color: "#1d4ed8",
    fontSize: 12,
    letterSpacing: "0.04em",
    textTransform: "uppercase",
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
  },
  body: {
    padding: "10px 12px 12px 12px",
    backgroundColor: "#f3f4f6",
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  row: {
    display: "flex",
    gap: 16,
    marginBottom: 4,
    alignItems: "flex-start",
  },
  col: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
  fieldGroup: {
    display: "flex",
    alignItems: "center",
    width: "100%",
  },
  label: {
    width: 120,
    fontWeight: 700,
    color: "#374151",
    fontSize: 10,
    flexShrink: 0,
    textTransform: "uppercase",
  },
  input: {
    flex: 1,
    padding: "3px 7px",
    border: "1px solid #cbd5e1",
    borderRadius: 3,
    fontSize: 12,
    outline: "none",
    height: 25,
    backgroundColor: "#ffffff",
    boxSizing: "border-box",
    fontWeight: 600,
    color: "#1e293b",
  },
  select: {
    flex: 1,
    padding: "0 6px",
    border: "1px solid #cbd5e1",
    borderRadius: 3,
    fontSize: 12,
    height: 25,
    backgroundColor: "#ffffff",
    boxSizing: "border-box",
    fontWeight: 600,
    color: "#1e293b",
  },
  sectionTitleLink: {
    fontWeight: 700,
    color: "#1d4ed8",
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    margin: "6px 0 4px 0",
  },
  docSectionContainer: {
    marginTop: 8,
    borderTop: "1px solid #e5e7eb",
    paddingTop: 6,
  },
  docHeader: {
    fontSize: 11,
    fontWeight: 700,
    color: "#1d4ed8",
    textTransform: "uppercase",
    marginBottom: 4,
    letterSpacing: "0.04em",
  },
  footerActions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: 8,
    marginTop: 8,
    paddingTop: 8,
    borderTop: "1px solid #e5e7eb",
  },
  btnPrimary: {
    backgroundColor: "#2563eb",
    color: "#ffffff",
    border: "1px solid #1d4ed8",
    padding: "6px 16px",
    borderRadius: 4,
    cursor: "pointer",
    fontWeight: 700,
    fontSize: 12,
    boxShadow: "0 1px 2px rgba(15,23,42,0.2)",
  },
  btnSecondary: {
    backgroundColor: "#e5e7eb",
    color: "#374151",
    border: "1px solid #d1d5db",
    padding: "6px 14px",
    borderRadius: 4,
    cursor: "pointer",
    fontWeight: 700,
    fontSize: 12,
  },
};

const ESanchitEditDialog = ({ open, onClose, onSave, doc, setDoc, jobData }) => {
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [organizations, setOrganizations] = useState([]);
  const [consigneeList, setConsigneeList] = useState([]);
  const [orgLoading, setOrgLoading] = useState(false);

  const safeDoc = doc || {};

  useEffect(() => {
    if (setDoc && doc) setDoc(doc);
  }, [doc, setDoc]);

  const issuingParty = safeDoc.issuingParty || {};
  const beneficiaryParty = safeDoc.beneficiaryParty || {};
  const level = safeDoc.documentLevel || "Invoice";

  const disableInvSrNo = level === "Job" || level === "Item";
  const disableItemSrNo = level === "Job" || level === "Invoice";

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

  // Fetch organizations for Issuing Party
  useEffect(() => {
    if (!open) return;
    const fetchOrgs = async () => {
      try {
        setOrgLoading(true);
        const res = await axios.get(
          `${import.meta.env.VITE_API_STRING}/directory`,
          { params: { limit: 1000 } }
        );
        if (res.data?.success) setOrganizations(res.data.data || []);
      } catch (e) {
        console.error("Error fetching organizations for eSanchit", e);
      } finally {
        setOrgLoading(false);
      }
    };
    fetchOrgs();
  }, [open]);

  // Fetch consignees for Beneficiary Party
  useEffect(() => {
    if (!open) return;
    const fetchConsignees = async () => {
      try {
        const res = await axios.get(
          `${import.meta.env.VITE_API_STRING}/dsr/consignees`
        );
        if (res.data?.success && Array.isArray(res.data.data)) {
          setConsigneeList(res.data.data);
        }
      } catch (e) {
        console.error("Error fetching consignees for eSanchit", e);
      }
    };
    fetchConsignees();
  }, [open]);

  // Auto-populate Issuing Party and Beneficiary Party from job data
  useEffect(() => {
    if (!open || !jobData) return;

    // Only auto-populate if the fields are currently empty (for new documents)
    const isIssuingPartyEmpty = !safeDoc.issuingParty?.name;
    const isBeneficiaryPartyEmpty = !safeDoc.beneficiaryParty?.name;

    // Auto-populate Issuing Party from exporter
    if (isIssuingPartyEmpty && jobData.exporter && organizations.length > 0) {
      const exporterName = toUpper(jobData.exporter);

      // Find and populate exporter details
      const org = organizations.find(
        (o) => toUpper(o.organization || "") === exporterName
      );

      if (org) {
        const branch = org.branchInfo?.[0] || {};
        handleIssuingPartyChange("name", exporterName);
        handleIssuingPartyChange("code", toUpper(branch.branchCode || ""));
        handleIssuingPartyChange("addressLine1", toUpper(branch.address || ""));
        handleIssuingPartyChange("addressLine2", "");
        handleIssuingPartyChange("city", toUpper(branch.city || ""));
        handleIssuingPartyChange("pinCode", toUpper(branch.postalCode || ""));
      }
    }

    // Auto-populate Beneficiary Party from first consignee
    if (isBeneficiaryPartyEmpty && jobData.consignees && jobData.consignees.length > 0 && consigneeList.length > 0) {
      const firstConsignee = jobData.consignees[0];
      const consigneeName = toUpper(firstConsignee.consignee_name || "");

      // Try to find full consignee details from the consignee list
      const fullConsignee = consigneeList.find(
        (c) => toUpper(c.consignee_name || "") === consigneeName
      );

      if (fullConsignee) {
        handleBeneficiaryPartyChange("name", toUpper(fullConsignee.consignee_name || ""));
        handleBeneficiaryPartyChange("addressLine1", toUpper(fullConsignee.consignee_address || ""));
        handleBeneficiaryPartyChange("addressLine2", "");
        handleBeneficiaryPartyChange("city", "");
        handleBeneficiaryPartyChange("pinCode", "");
      } else {
        // Fallback to job data if not found in consignee list
        handleBeneficiaryPartyChange("name", consigneeName);
        handleBeneficiaryPartyChange("addressLine1", toUpper(firstConsignee.consignee_address || ""));
        handleBeneficiaryPartyChange("addressLine2", "");
        handleBeneficiaryPartyChange("city", "");
        handleBeneficiaryPartyChange("pinCode", "");
      }
    }
  }, [open, jobData, organizations, consigneeList]);

  const onSelectIssuingParty = (e) => {
    const val = toUpper(e.target.value);
    handleIssuingPartyChange("name", val);
    const org = organizations.find(
      (o) => toUpper(o.organization || "") === val
    );
    if (!org) return;
    const branch = org.branchInfo?.[0] || {};
    handleIssuingPartyChange("code", toUpper(branch.branchCode || ""));
    handleIssuingPartyChange("addressLine1", toUpper(branch.address || ""));
    handleIssuingPartyChange("addressLine2", "");
    handleIssuingPartyChange("city", toUpper(branch.city || ""));
    handleIssuingPartyChange("pinCode", toUpper(branch.postalCode || ""));
  };

  const onSelectBeneficiaryParty = (e) => {
    const val = toUpper(e.target.value);
    handleBeneficiaryPartyChange("name", val);

    // Find consignee and populate details
    const consignee = consigneeList.find(
      (c) => toUpper(c.consignee_name || "") === val
    );
    if (!consignee) return;

    handleBeneficiaryPartyChange("code", "");
    handleBeneficiaryPartyChange("addressLine1", toUpper(consignee.consignee_address || ""));
    handleBeneficiaryPartyChange("addressLine2", "");
    handleBeneficiaryPartyChange("city", "");
    handleBeneficiaryPartyChange("pinCode", "");
  };

  const handleConfirmDelete = () => {
    handleFieldChange("fileUrl", "");
    setDeleteConfirmOpen(false);
  };

  const fileArray = safeDoc.fileUrl ? [safeDoc.fileUrl] : [];

  if (!open) return null;

  return (
    <div style={s.overlay}>
      <div style={s.container}>
        <div style={s.header}>ESANCHIT DOCUMENT DETAILS</div>

        <div style={s.body}>
          {/* Top details rows */}
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
                label="Inv. Sr. No."
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
              <div style={s.fieldGroup}>
                <span style={s.label}>Date-Time Upload</span>
                <DateInput
                  style={s.input}
                  value={safeDoc.dateTimeOfUpload || ""}
                  onChange={(e) =>
                    handleFieldChange("dateTimeOfUpload", e.target.value)
                  }
                />
              </div>
              <Field
                label="Doc Ref No."
                value={safeDoc.documentReferenceNo}
                onChange={(v) => handleFieldChange("documentReferenceNo", v)}
              />
              <div style={s.fieldGroup}>
                <span style={s.label}>Date of Issue</span>
                <DateInput
                  style={s.input}
                  value={safeDoc.dateOfIssue || ""}
                  onChange={(e) =>
                    handleFieldChange("dateOfIssue", e.target.value)
                  }
                />
              </div>
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
                label="Item Sr. No."
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
                </select>
              </div>
              <Field
                label="Other ICEGATE ID"
                value={safeDoc.icegateId}
                onChange={(v) => handleFieldChange("icegateId", v)}
              />
              <Field
                label="File Type"
                value="PDF"
                onChange={() => { }}
                disabled
              />
              <Field
                label="Place of Issue"
                value={safeDoc.placeOfIssue}
                onChange={(v) => handleFieldChange("placeOfIssue", v)}
              />
              <div style={s.fieldGroup}>
                <span style={s.label}>Expiry Date</span>
                <DateInput
                  style={s.input}
                  value={safeDoc.expiryDate || ""}
                  onChange={(e) =>
                    handleFieldChange("expiryDate", e.target.value)
                  }
                />
              </div>
            </div>
          </div>

          {/* Party details */}
          <div style={s.row}>
            <div style={s.col}>
              <div style={s.sectionTitleLink}>Issuing Party Details</div>
              <div style={s.fieldGroup}>
                <span style={s.label}>Name {orgLoading ? "(...)" : ""}</span>
                <SearchableOrganizationDropdown
                  value={issuingParty.name || ""}
                  options={organizations}
                  onChange={(selectedOrg) => {
                    if (selectedOrg) {
                      const branch = selectedOrg.branchInfo?.[0] || {};
                      handleIssuingPartyChange("name", toUpper(selectedOrg.organization || ""));
                      handleIssuingPartyChange("code", toUpper(branch.branchCode || ""));
                      handleIssuingPartyChange("addressLine1", toUpper(branch.address || ""));
                      handleIssuingPartyChange("addressLine2", "");
                      handleIssuingPartyChange("city", toUpper(branch.city || ""));
                      handleIssuingPartyChange("pinCode", toUpper(branch.postalCode || ""));
                    }
                  }}
                  placeholder="TYPE TO SEARCH ORGANIZATION"
                />
              </div>
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
              <div style={s.sectionTitleLink}>Beneficiary Party Details</div>
              <div style={s.fieldGroup}>
                <span style={s.label}>Name</span>
                <SearchableConsigneeDropdown
                  value={beneficiaryParty.name || ""}
                  options={consigneeList}
                  onChange={(selectedConsignee) => {
                    if (selectedConsignee) {
                      handleBeneficiaryPartyChange("name", toUpper(selectedConsignee.consignee_name || ""));
                      handleBeneficiaryPartyChange("code", "");
                      handleBeneficiaryPartyChange("addressLine1", toUpper(selectedConsignee.consignee_address || ""));
                      handleBeneficiaryPartyChange("addressLine2", "");
                      handleBeneficiaryPartyChange("city", "");
                      handleBeneficiaryPartyChange("pinCode", "");
                    }
                  }}
                  placeholder="TYPE TO SEARCH CONSIGNEE"
                />
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

          {/* Unsigned document section */}
          <div style={s.docSectionContainer}>
            <div style={s.docHeader}>Unsigned Document PDF</div>

            {!safeDoc.fileUrl && (
              <div style={{ marginBottom: 8 }}>
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

            <ImagePreview
              images={fileArray}
              readOnly={false}
              onDeleteImage={() => setDeleteConfirmOpen(true)}
            />
          </div>

          {/* Footer buttons */}
          <div style={s.footerActions}>
            <button
              type="button"
              style={s.btnPrimary}
              onClick={() => onSave(safeDoc)}
            >
              Save
            </button>
            <button type="button" style={s.btnSecondary} onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={deleteConfirmOpen}
        handleClose={() => setDeleteConfirmOpen(false)}
        handleConfirm={handleConfirmDelete}
        message="Are you sure you want to remove this file?"
        isEdit={false}
      />
    </div>
  );
};

export default ESanchitEditDialog;
