import React, { useState, useRef, useEffect } from "react";
import axios from "axios";
import DateInput from "../../../common/DateInput.js";
import AutocompleteSelect from "../../../common/AutocompleteSelect.js";
import { priorityFilter } from "../../../../utils/filterUtils.js";

const apiBase = import.meta.env.VITE_API_STRING;

function toUpper(val) {
  return (typeof val === "string" ? val : "")?.toUpperCase() || "";
}
function toUpperVal(e) {
  return e?.target?.value ? e.target.value.toUpperCase() : "";
}

function useConsigneeCountryDropdown(value, onChange) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value || "");
  const [opts, setOpts] = useState([]);
  const [active, setActive] = useState(-1);
  const wrapRef = useRef(null);
  const keepOpen = useRef(false);

  useEffect(() => {
    setQuery(value || "");
  }, [value]);

  useEffect(() => {
    if (!open || !query.trim()) {
      setOpts([]);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const res = await fetch(
          `${apiBase}/countries?search=${encodeURIComponent(query.trim())}`,
        );
        const data = await res.json();
        setOpts(data?.data || []);
      } catch {
        setOpts([]);
      }
    }, 220);
    return () => clearTimeout(t);
  }, [open, query]);

  useEffect(() => {
    const close = (e) => {
      if (
        !keepOpen.current &&
        wrapRef.current &&
        !wrapRef.current.contains(e.target)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  function selectIndex(i) {
    const opt = opts[i];
    if (!opt) return;
    const name = toUpper(opt.countryName || opt.country_name || "");
    const code = (opt.countryCode || opt.iso2 || "").toUpperCase();
    const val = code ? `${name} (${code})` : name;
    setQuery(val);
    onChange(val);
    setOpen(false);
    setActive(-1);
  }

  return {
    wrapRef,
    open,
    setOpen,
    query,
    setQuery,
    active,
    setActive,
    opts,
    handleChange: (val) => {
      const v = val.toUpperCase();
      setQuery(v);
      onChange(v);
      setOpen(true);
    },
    handleFocus: () => {
      setOpen(true);
      setActive(-1);
      keepOpen.current = true;
    },
    handleBlur: () => {
      setTimeout(() => {
        keepOpen.current = false;
      }, 100);
    },
    selectIndex,
  };
}

const ConsigneeCountryAutocomplete = ({ value, onChange }) => {
  const d = useConsigneeCountryDropdown(value, onChange);

  return (
    <div style={{ flex: 1, position: "relative" }} ref={d.wrapRef}>
      <input
        style={{
          border: "1px solid #cbd5e1",
          borderRadius: 4,
          fontSize: 11,
          padding: "2px 7px",
          height: 24,
          width: "100%",
          boxSizing: "border-box",
          background: "#fafaffff",
          fontWeight: 500,
          outline: "none",
        }}
        value={toUpper(d.query)}
        placeholder="Consignee Country"
        autoComplete="off"
        onChange={(e) => d.handleChange(e.target.value)}
        onFocus={d.handleFocus}
        onBlur={d.handleBlur}
        onKeyDown={(e) => {
          if (e.key === "Tab") {
            if (d.open) {
              if (d.active >= 0 && d.opts[d.active]) {
                d.selectIndex(d.active);
              } else if (d.opts.length === 1) {
                d.selectIndex(0);
              } else {
                d.setOpen(false);
              }
            }
            const trimmed = d.query.trim();
            if (trimmed !== d.query) {
              const upper = toUpper(trimmed);
              d.handleChange(upper);
            }
            return;
          }

          if (!d.open) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            d.setActive((a) => Math.min(d.opts.length - 1, a + 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            d.setActive((a) => Math.max(0, a - 1));
          } else if (e.key === "Enter" && d.active >= 0) {
            e.preventDefault();
            d.selectIndex(d.active);
          } else if (e.key === "Escape") {
            d.setOpen(false);
          }
        }}
      />
      {d.open && d.opts.length > 0 && (
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: "100%",
            background: "#fff",
            border: "1px solid #cbd5e1",
            borderRadius: 3,
            zIndex: 30,
            maxHeight: 150,
            overflow: "auto",
            boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
          }}
        >
          {d.opts.map((opt, i) => (
            <div
              key={i}
              style={{
                padding: "4px 8px",
                cursor: "pointer",
                fontSize: 12,
                background: d.active === i ? "#e5edff" : "#fff",
                fontWeight: d.active === i ? 600 : 400,
              }}
              onMouseDown={() => d.selectIndex(i)}
              onMouseEnter={() => d.setActive(i)}
            >
              {toUpper(opt.countryName || opt.country_name)}
              {opt.countryCode && (
                <span style={{ marginLeft: 6, color: "#6b7280", fontSize: 10 }}>
                  ({opt.countryCode.toUpperCase()})
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const GeneralTab = ({ formik, directories, isEditable = true }) => {
  const saveTimeoutRef = useRef(null);
  const [exporterDetails, setExporterDetails] = useState(null);

  // Consignee logic
  const emptyConsignee = {
    consignee_name: "",
    consignee_address: "",
    consignee_country: "",
    consignee_email: "",
  };
  const [consignees, setConsignees] = useState([{ ...emptyConsignee }]);

  function handleConsigneeChange(idx, field, value) {
    const updated = [...consignees];
    updated[idx][field] = value;
    setConsignees(updated);
    formik.setFieldValue("consignees", updated);
  }

  function handleAddConsignee() {
    const updated = [...consignees, { ...emptyConsignee }];
    setConsignees(updated);
    formik.setFieldValue("consignees", updated);
  }

  useEffect(() => {
    if (formik.values.consignees && formik.values.consignees.length > 0) {
      setConsignees(formik.values.consignees);
    }
  }, [formik.values.consignees]);

  function handleFieldChange(field, value) {
    formik.setFieldValue(field, value);
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
    }, 1000);
  }

  // Validate email format function
  const isValidEmail = (email) => {
    if (!email) return true; // Optional field
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  // --- Consignee Autocomplete Logic ---
  const [consigneeList, setConsigneeList] = useState([]);
  const [activeIdx, setActiveIdx] = useState(-1); // which row is active
  const [showMenu, setShowMenu] = useState(false);
  const [filteredConsignees, setFilteredConsignees] = useState([]);
  const [keyboardActive, setKeyboardActive] = useState(-1);
  const menuRef = useRef(null);

  useEffect(() => {
    const fetchConsignees = async () => {
      try {
        const res = await axios.get(`${apiBase}/dsr/consignees`);
        if (res.data?.success && Array.isArray(res.data.data)) {
          setConsigneeList(res.data.data);
        }
      } catch (e) {
        console.error("Error fetching consignees", e);
      }
    };
    fetchConsignees();
  }, []);

  // Close menu on click outside
  useEffect(() => {
    const close = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowMenu(false);
        setActiveIdx(-1);
      }
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const handleConsigneeNameChange = (idx, e) => {
    const val = toUpperVal(e);
    handleConsigneeChange(idx, "consignee_name", val);

    // Filter list with priority sorting
    const filtered = priorityFilter(consigneeList, val, (c) => c.consignee_name);
    setFilteredConsignees(filtered);
    setActiveIdx(idx);
    setShowMenu(true);
    setKeyboardActive(-1);
  };

  const handleSelectConsignee = (idx, consignee) => {
    const updated = [...consignees];
    updated[idx].consignee_name = toUpper(consignee.consignee_name);
    updated[idx].consignee_address = toUpper(consignee.consignee_address || "");
    updated[idx].consignee_country = toUpper(consignee.consignee_country || "");
    updated[idx].consignee_email = consignee.consignee_email || "";
    setConsignees(updated);
    formik.setFieldValue("consignees", updated);

    setShowMenu(false);
    setActiveIdx(-1);
  };

  // Directory options
  const exporters = directories?.exporterNames || [];
  const banks = (exporterDetails?.bankDetails || []).map((bank) => ({
    ...bank,
    label: `${toUpper(bank.entityName)} ${toUpper(bank.branchLocation)}`,
  }));

  function getVal(f) {
    return toUpper(formik.values[f] || "");
  }

  // --- 1. Directory-aware autofill: live on any input
  function onExporterInput(e) {
    const val = toUpperVal(e);
    handleFieldChange("exporter", val);
    handleFieldChange("bank_index", ""); // Reset bank selection
  }

  function handleRemoveConsignee(idx) {
    const updated = consignees.filter((_, i) => i !== idx);
    setConsignees(updated);
    formik.setFieldValue("consignees", updated);
  }

  // 2. Bank population
  function onBankInput(e) {
    const val = toUpperVal(e);
    handleFieldChange("bank_dealer", val);
    const chosen = banks.find((bank) => bank.label === val);
    if (chosen) {
      formik.setFieldValue("bank_name", toUpper(chosen.entityName));
      formik.setFieldValue("ac_number", toUpper(chosen.accountNumber));
      formik.setFieldValue("ad_code", toUpper(chosen.adCode));
    }
  }

  useEffect(() => {
    const exporterName = getVal("exporter");
    if (!exporterName) return;

    const fetchExporterDetails = async () => {
      try {
        const res = await axios.get(
          `${apiBase}/directory/exporter?exporter=${encodeURIComponent(exporterName)}`,
        );
        if (res.data?.success && res.data.data) {
          const exp = res.data.data;
          setExporterDetails(exp);
          // pick branch by selected index, default 0
          const idx = Number.isInteger(Number(formik.values.branch_index))
            ? Number(formik.values.branch_index)
            : 0;
          const branch = exp.branchInfo?.[idx] || exp.branchInfo?.[0] || {};

          // IE Code or PAN fallback
          const ieFromDir = exp.registrationDetails?.ieCode || "";
          const panFromDir = exp.registrationDetails?.panNo || "";
          const effectiveIe = ieFromDir || panFromDir;

          const updates = {
            ieCode: toUpper(effectiveIe),
            gstin: toUpper(branch.gstNo || ""),
            state: toUpper(branch.state || ""),
            branch_sno: toUpper(branch.branchCode || ""),
            exporter_type: toUpper(exp.generalInfo?.exporterType || ""),
            exporter_address: toUpper(
              `${branch.address || ""}${branch.postalCode ? `, ${branch.postalCode}` : ""}`,
            ),
            exporter_branch_name: toUpper(branch.branchName || ""),
          };

          const shouldUpdate =
            getVal("ieCode") !== updates.ieCode ||
            getVal("gstin") !== updates.gstin ||
            getVal("state") !== updates.state ||
            getVal("branch_sno") !== updates.branch_sno ||
            getVal("exporter_type") !== updates.exporter_type ||
            getVal("exporter_address") !== updates.exporter_address ||
            getVal("exporter_branch_name") !== updates.exporter_branch_name;

          if (shouldUpdate) {
            Object.entries(updates).forEach(([key, val]) =>
              formik.setFieldValue(key, val),
            );
          }

          const bankIdxVal = formik.values.bank_index;
          let bank;

          if (exp.bankDetails && exp.bankDetails.length > 0) {
            if (
              bankIdxVal !== undefined &&
              bankIdxVal !== "" &&
              exp.bankDetails[bankIdxVal]
            ) {
              bank = exp.bankDetails[bankIdxVal];
            } else {
              // Find default or first
              const defaultIdx = exp.bankDetails.findIndex((b) => b.isDefault);
              const finalIdx = defaultIdx >= 0 ? defaultIdx : 0;
              bank = exp.bankDetails[finalIdx];
              if (bankIdxVal !== finalIdx) {
                formik.setFieldValue("bank_index", finalIdx);
              }
            }
          }

          if (bank) {
            const bankDealerVal = `${toUpper(bank.entityName)} ${toUpper(bank.branchLocation)}`;
            if (getVal("bank_dealer") !== bankDealerVal) {
              formik.setFieldValue("bank_dealer", bankDealerVal);
            }
            if (getVal("bank_name") !== toUpper(bank.entityName)) {
              formik.setFieldValue("bank_name", toUpper(bank.entityName));
            }
            if (getVal("ac_number") !== toUpper(bank.accountNumber)) {
              formik.setFieldValue("ac_number", toUpper(bank.accountNumber));
              formik.setFieldValue(
                "bank_account_number",
                toUpper(bank.accountNumber),
              );
            }
            if (getVal("ad_code") !== toUpper(bank.adCode)) {
              formik.setFieldValue("ad_code", toUpper(bank.adCode));
              formik.setFieldValue("adCode", toUpper(bank.adCode));
            }
          }
        }
      } catch (err) {
        console.error("Error fetching exporter details on mount/change:", err);
      }
    };

    fetchExporterDetails();
    // eslint-disable-next-line
  }, [formik.values.exporter, formik.values.branch_index, formik.values.bank_index]);

  function handleIsBuyerToggle() {
    const isBuyer = !formik.values.isBuyer;
    handleFieldChange("isBuyer", isBuyer);

    // If isBuyer is checked, copy exporter details to buyer details
    if (isBuyer) {
      formik.setFieldValue("buyer_name", getVal("exporter"));
      formik.setFieldValue("buyer_address", getVal("exporter_address"));
      formik.setFieldValue("buyer_state", getVal("state"));
    } else {
      // Clear buyer details when unchecked
      formik.setFieldValue("buyer_name", "");
      formik.setFieldValue("buyer_address", "");
      formik.setFieldValue("buyer_state", "");
    }
  }

  // --- UI generators ---
  function field(label, name, opts = {}) {
    return (
      <div style={{ flex: opts.flex || 1, marginBottom: 8 }}>
        <div style={{ fontSize: 11, color: "#666", marginBottom: 1 }}>
          {label}
        </div>
        <input
          name={name}
          value={getVal(name)}
          onChange={(e) => handleFieldChange(name, toUpperVal(e))}
          style={{
            border: "1px solid #cbd5e1",
            borderRadius: 4,
            fontSize: 11,
            padding: "2px 7px",
            height: 24,
            width: "100%",
            boxSizing: "border-box",
            background: "#fafaffff",
            outline: "none",
            fontWeight: 500,
          }}
        />
      </div>
    );
  }

  function exporterInputField() {
    return (
      <div style={{ marginBottom: 8 }}>
        <div style={{ fontSize: 11, color: "#666", marginBottom: 1 }}>Exporter</div>
        <AutocompleteSelect
          name="exporter"
          value={getVal("exporter")}
          options={[
            { value: "", label: "-- SELECT --" },
            ...exporters.map((name) => ({
              value: toUpper(name),
              label: toUpper(name),
            })),
          ]}
          onChange={async (e) => {
            const val = e.target.value;
            handleFieldChange("exporter", val);
            handleFieldChange("branch_index", 0);

            // Use the new API to fetch fresh exporter data
            try {
              const res = await axios.get(`${apiBase}/directory/exporter?exporter=${encodeURIComponent(val)}`);
              if (res.data?.success && res.data.data) {
                const exp = res.data.data;
                setExporterDetails(exp);
                const branch = exp.branchInfo?.[0] || {};
                handleFieldChange("branch_sno", toUpper(branch.branchCode || ""));
                handleFieldChange("state", toUpper(branch.state || ""));
              }
            } catch (err) {
              console.error("Failed to fetch exporter from new API, falling back to local data", err);
            }

            handleFieldChange("bank_index", "");
            onExporterInput({ target: { value: val } });
          }}
          placeholder="Select Exporter"
        />
      </div>
    );
  }

  function branchSelectField() {
    if (!exporterDetails || !exporterDetails.branchInfo || exporterDetails.branchInfo.length <= 1) {
      return null;
    }

    const branches = exporterDetails.branchInfo || [];
    const currentBranchIndex = formik.values.branch_index || 0;

    return (
      <div style={{ marginBottom: 8 }}>
        <div style={{ fontSize: 11, color: "#666", marginBottom: 1 }}>Select Branch</div>
        <select
          value={currentBranchIndex}
          onChange={(e) => {
            const newIndex = parseInt(e.target.value);
            handleFieldChange("branch_index", newIndex);
            // Sync branch info
            if (branches[newIndex]) {
              handleFieldChange("branch_sno", toUpper(branches[newIndex].branchCode || ""));
              handleFieldChange("state", toUpper(branches[newIndex].state || ""));
            }
          }}
          style={{
            border: "1px solid #cbd5e1",
            borderRadius: 4,
            fontSize: 11,
            padding: "2px 7px",
            height: 24,
            width: "100%",
            background: "#fafaffff",
            outline: "none",
            fontWeight: 500,
          }}
        >
          {branches.map((b, i) => (
            <option key={i} value={i}>
              {toUpper(b.branchName || b.branchCode || `BRANCH ${i + 1}`)} -{" "}
              {toUpper(b.city || "")}
            </option>
          ))}
        </select>
      </div>
    );
  }

  function bankSelectField() {
    if (!exporterDetails || !exporterDetails.bankDetails || exporterDetails.bankDetails.length <= 1) {
      return null;
    }

    const banksList = exporterDetails.bankDetails || [];
    const currentBankIndex = formik.values.bank_index || 0;

    return (
      <div style={{ marginBottom: 4 }}>
        <div style={{ fontSize: 11, color: "#666" }}>Select Bank</div>
        <select
          value={currentBankIndex}
          onChange={(e) =>
            handleFieldChange("bank_index", parseInt(e.target.value))
          }
          style={{
            border: "1px solid #cbd5e1",
            borderRadius: 4,
            fontSize: 11,
            padding: "2px 7px",
            height: 24,
            width: "100%",
            background: "#fafaffff",
            outline: "none",
            fontWeight: 500,
          }}
        >
          {banksList.map((b, i) => (
            <option key={i} value={i}>
              {toUpper(b.entityName)} - {toUpper(b.branchLocation)}
              {b.isDefault ? " (DEFAULT)" : ""}
            </option>
          ))}
        </select>
      </div>
    );
  }

  function bankInputField() {
    return (
      <div style={{ marginBottom: 8 }}>
        <div style={{ fontSize: 11, color: "#666", marginBottom: 1 }}>Bank/Dealer</div>
        <input
          list="bank-list"
          value={getVal("bank_dealer")}
          onInput={onBankInput}
          style={{
            border: "1px solid #cbd5e1",
            borderRadius: 4,
            fontSize: 11,
            padding: "2px 7px",
            height: 24,
            width: "100%",
            background: "#fafaffff",
            outline: "none",
            boxSizing: "border-box",
            fontWeight: 500,
          }}
        />
        <datalist id="bank-list">
          {banks.map((opt, i) => (
            <option key={`${opt.label}_${i}`} value={opt.label}>
              {opt.label}
            </option>
          ))}
        </datalist>
      </div>
    );
  }

  const updateDirectoryExporterType = async (organization, type) => {
    if (!organization || !type) return;
    try {
      await axios.patch(`${apiBase}/directory/update-exporter-type`, {
        organization,
        exporterType: type,
      });
    } catch (err) {
      console.error("Failed to update directory exporter type", err);
    }
  };

  return (
    <fieldset disabled={!isEditable} style={{ border: 'none', padding: 0, margin: 0, width: '100%', background: 'transparent' }}>
      <div
        style={{
          background: "#fafaffff",
          borderRadius: 8,
          padding: 15,
          border: "1.5px solid #e2e8f0",
          margin: "10px 0",
        }}
      >
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          {/* Left: Exporter & Bank */}
          <div
            style={{
              flex: 1,
              minWidth: 295,
              background: "#fff",
              borderRadius: 6,
              border: "1px solid #e3e7ee",
              padding: 14,
              marginBottom: 8,
            }}
          >
            <div style={{ fontWeight: 700, color: "#2366b3", marginBottom: 8 }}>
              Exporter & Bank
            </div>
            {exporterInputField()}
            {branchSelectField()}
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 11, color: "#666", marginBottom: 1 }}>Exporter Type</div>
              <AutocompleteSelect
                name="exporter_type"
                value={getVal("exporter_type")}
                options={[
                  { value: "", label: "-- SELECT --" },
                  {
                    value: "MANUFACTURER EXPORTER",
                    label: "MANUFACTURER EXPORTER",
                  },
                  { value: "MERCHANT EXPORTER", label: "MERCHANT EXPORTER" },
                  { value: "MARCHANT EXPORTER", label: "MARCHANT EXPORTER" },
                  { value: "SERVICE EXPORTER", label: "SERVICE EXPORTER" },
                ]}
                onChange={(e) => {
                  const val = e.target.value;
                  handleFieldChange("exporter_type", val);
                  updateDirectoryExporterType(getVal("exporter"), val);
                }}
                placeholder="Select Exporter Type"
              />
            </div>
            {field("Address", "exporter_address")}
            <div style={{ display: "flex", gap: 10, width: "100%" }}>
              <div style={{ flex: 1, marginBottom: 8 }}>
                <div style={{ fontSize: 11, color: "#666", marginBottom: 1 }}>Branch S/No</div>
                <input
                  name="branch_sno"
                  value={getVal("branch_sno")}
                  onChange={(e) => {
                    const val = toUpperVal(e);
                    handleFieldChange("branch_sno", val);

                    // Auto sync dropdown index
                    if (exporterDetails && exporterDetails.branchInfo) {
                      const matchIdx = exporterDetails.branchInfo.findIndex(b => toUpper(b.branchCode) === val);
                      if (matchIdx !== -1 && matchIdx !== formik.values.branch_index) {
                        handleFieldChange("branch_index", matchIdx);
                      }
                    }
                  }}
                  style={{
                    border: "1px solid #cbd5e1",
                    borderRadius: 4,
                    fontSize: 11,
                    padding: "2px 7px",
                    height: 24,
                    width: "100%",
                    boxSizing: "border-box",
                    background: "#fafaffff",
                    outline: "none",
                    fontWeight: 500,
                  }}
                />
              </div>
              {field("State", "state")}
              {field("IE Code No", "ieCode")}
            </div>
            {field("GSTIN", "gstin")}

            <div
              style={{
                fontWeight: 700,
                color: "#a37035",
                margin: "10px 0 8px 0",
              }}
            >
              Bank Details
            </div>
            {bankSelectField()}
            {bankInputField()}
            <div style={{ display: "flex", gap: 10 }}>
              {field("A/C Number", "ac_number")}
              {field("AD Code", "ad_code")}
            </div>

            {/* Add the isBuyer checkbox here - right after the GSTIN field */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                margin: "8px 0 12px 0",
              }}
            >
              <input
                type="checkbox"
                id="isBuyer"
                name="isBuyer"
                checked={formik.values.isBuyer || false}
                onChange={handleIsBuyerToggle}
                style={{
                  marginRight: "6px",
                  cursor: "pointer",
                }}
              />
              <label
                htmlFor="isBuyer"
                style={{
                  fontSize: "13px",
                  color: "#555",
                  cursor: "pointer",
                  userSelect: "none",
                }}
              >
                Buyer Other Than Consignee
              </label>
            </div>
          </div>
          {/* Right: Reference Details */}
          <div
            style={{
              flex: 1,
              minWidth: 295,
              background: "#fff",
              borderRadius: 6,
              border: "1px solid #e3e7ee",
              padding: 14,
              marginBottom: 8,
            }}
          >
            <div style={{ fontWeight: 700, color: "#2366b3", marginBottom: 8 }}>
              Reference Details
            </div>
            {field("Exporter Ref No.", "exporter_ref_no")}
            <div style={{ display: "flex", gap: 10 }}>
              {field("SB Number", "sb_no")}
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, color: "#666" }}>SB Date</div>
                <DateInput
                  name="sb_date"
                  value={formik.values["sb_date"] || ""}
                  onChange={(e) => handleFieldChange("sb_date", e.target.value)}
                  style={{
                    border: "1px solid #cbd5e1",
                    borderRadius: 4,
                    fontSize: 11,
                    padding: "2px 7px",
                    height: 24,
                    width: "100%",
                    marginBottom: 3,
                    boxSizing: "border-box",
                    background: "#fafaffff",
                    outline: "none",
                    fontWeight: 500,
                  }}
                />
              </div>
            </div>
            {field("RBI App. No & Date", "rbi_app_no")}
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <label style={{ fontSize: 11, color: "#666", marginBottom: 0 }}>
                <input
                  type="checkbox"
                  checked={formik.values["gr_waived"] || false}
                  onChange={(e) =>
                    handleFieldChange("gr_waived", e.target.checked)
                  }
                  style={{ marginRight: 6 }}
                />
                GR Waived
              </label>
              {field("GR No", "gr_no")}
            </div>
            {field("RBI Waiver No", "rbi_waiver_no")}
          </div>
        </div>
        {/* Consignee - Below both sections in a row */}
        <div
          style={{
            background: "#fff",
            borderRadius: 6,
            border: "1px solid #dfe6ee",
            padding: "10px 14px",
            marginTop: 10,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 5,
            }}
          >
            <div style={{ fontWeight: 600, fontSize: 14, color: "#14492c" }}>
              Consignee Details
            </div>
            <button
              onClick={handleAddConsignee}
              style={{
                background: "#e7f8e7",
                color: "#0a7921",
                border: "1px solid #8ddd8d",
                borderRadius: 4,
                padding: "2px 10px",
                fontWeight: 600,
                fontSize: 11,
                cursor: "pointer",
                height: 22,
                display: "flex",
                alignItems: "center",
              }}
              type="button"
            >
              + New
            </button>
          </div>
          {consignees.map((consignee, idx) => (
            <div key={idx} style={{ display: "flex", gap: 10, marginBottom: 5 }}>
              <div style={{ flex: 1, position: "relative" }} ref={menuRef}>
                <input
                  style={{
                    border: "1px solid #cbd5e1",
                    borderRadius: 4,
                    fontSize: 11,
                    padding: "2px 7px",
                    width: "100%",
                    boxSizing: "border-box",
                    height: 24,
                    background: "#fafaffff",
                    outline: "none",
                    fontWeight: 500,
                  }}
                  value={toUpper(consignee.consignee_name)}
                  placeholder="Consignee Name"
                  onChange={(e) => handleConsigneeNameChange(idx, e)}
                  onFocus={() => {
                    setFilteredConsignees(consigneeList);
                    setActiveIdx(idx);
                    setShowMenu(true);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Tab") {
                      if (activeIdx === idx && showMenu) {
                        if (
                          keyboardActive >= 0 &&
                          filteredConsignees[keyboardActive]
                        ) {
                          handleSelectConsignee(
                            idx,
                            filteredConsignees[keyboardActive],
                          );
                        } else if (filteredConsignees.length === 1) {
                          handleSelectConsignee(idx, filteredConsignees[0]);
                        } else {
                          setShowMenu(false);
                        }
                      }
                      const val = toUpper(consignee.consignee_name).trim();
                      if (val !== toUpper(consignee.consignee_name)) {
                        handleConsigneeChange(idx, "consignee_name", val);
                      }
                      return;
                    }

                    if (activeIdx !== idx || !showMenu) return;
                    if (e.key === "ArrowDown") {
                      setKeyboardActive((a) =>
                        Math.min(filteredConsignees.length - 1, a + 1),
                      );
                    } else if (e.key === "ArrowUp") {
                      setKeyboardActive((a) => Math.max(0, a - 1));
                    } else if (e.key === "Enter" && keyboardActive >= 0) {
                      e.preventDefault();
                      handleSelectConsignee(
                        idx,
                        filteredConsignees[keyboardActive],
                      );
                    } else if (e.key === "Escape") {
                      setShowMenu(false);
                    }
                  }}
                />
                {showMenu &&
                  activeIdx === idx &&
                  filteredConsignees.length > 0 && (
                    <div
                      style={{
                        position: "absolute",
                        left: 0,
                        right: 0,
                        top: "100%",
                        background: "#fff",
                        border: "1px solid #cbd5e1",
                        borderRadius: 3,
                        zIndex: 20,
                        maxHeight: 150,
                        overflow: "auto",
                        boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                      }}
                    >
                      {filteredConsignees.map((c, i) => (
                        <div
                          key={i}
                          style={{
                            padding: "4px 8px",
                            cursor: "pointer",
                            fontSize: 12,
                            background: keyboardActive === i ? "#e5edff" : "#fff",
                            fontWeight: keyboardActive === i ? 600 : 400,
                          }}
                          onMouseDown={() => handleSelectConsignee(idx, c)}
                          onMouseEnter={() => setKeyboardActive(i)}
                        >
                          {toUpper(c.consignee_name)}
                        </div>
                      ))}
                    </div>
                  )}
              </div>
              <input
                style={{
                  border: "1px solid #cbd5e1",
                  borderRadius: 4,
                  fontSize: 11,
                  padding: "2px 7px",
                  flex: 2,
                  height: 24,
                  width: "100%",
                  background: "#fafaffff",
                  outline: "none",
                  fontWeight: 500,
                  boxSizing: "border-box",
                }}
                value={toUpper(consignee.consignee_address)}
                placeholder="Consignee Address"
                onChange={(e) =>
                  handleConsigneeChange(idx, "consignee_address", toUpperVal(e))
                }
              />
              <ConsigneeCountryAutocomplete
                value={consignee.consignee_country || ""}
                onChange={(val) =>
                  handleConsigneeChange(idx, "consignee_country", val)
                }
              />
              <button
                type="button"
                onClick={() => handleRemoveConsignee(idx)}
                style={{
                  background: "#ffeaea",
                  border: "1px solid #ff5555",
                  color: "#c40000",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontWeight: 700,
                  fontSize: 18,
                  width: 24,
                  height: 24,
                  padding: 0,
                  marginLeft: 5,
                }}
                title="Remove consignee"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      </div>
    </fieldset>
  );
};

export default GeneralTab;
