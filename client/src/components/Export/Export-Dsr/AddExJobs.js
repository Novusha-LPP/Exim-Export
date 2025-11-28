import React, { useState, useEffect, useRef } from "react";
import axios from "axios";

// --- Ultra-Compact Enterprise Styles ---
const s = {
  wrapper: {
    fontFamily: "'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    backgroundColor: "#f0f2f5",
    padding: "20px",
    minHeight: "100vh",
    color: "#1f2937",
    fontSize: "12px",
  },
  container: {
    maxWidth: "1100px",
    margin: "0 auto",
  },
  pageHeader: {
    marginBottom: "15px",
  },
  pageTitle: {
    fontSize: "18px",
    fontWeight: "700",
    color: "#111827",
    margin: "0 0 4px 0",
  },
  subTitle: {
    fontSize: "12px",
    color: "#6b7280",
    margin: 0,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: "4px",
    boxShadow: "0 1px 2px rgba(0,0,0,0.06)",
    marginBottom: "10px",
    border: "1px solid #e5e7eb",
    position: "relative",
  },
  cardHeader: {
    padding: "8px 15px",
    borderBottom: "1px solid #f3f4f6",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    backgroundColor: "#fff",
    borderRadius: "4px 4px 0 0",
  },
  cardTitle: {
    fontWeight: "700",
    fontSize: "12px",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    color: "#374151",
  },
  cardBody: {
    padding: "12px 15px",
  },
  borderBlue: { borderLeft: "3px solid #2563eb" },
  borderTeal: { borderLeft: "3px solid #0891b2" },
  borderOrange: { borderLeft: "3px solid #f97316" },
  borderGreen: { borderLeft: "3px solid #16a34a" },
  row: {
    display: "flex",
    gap: "12px",
    marginBottom: "8px",
  },
  col: {
    flex: 1,
    minWidth: "150px",
    display: "flex",
    flexDirection: "column",
    position: "relative",
  },
  label: {
    fontSize: "11px",
    fontWeight: "600",
    color: "#4b5563",
    marginBottom: "2px",
  },
  input: {
    height: "28px",
    padding: "0 8px",
    fontSize: "12px",
    border: "1px solid #d1d5db",
    borderRadius: "3px",
    outline: "none",
    width: "100%",
    boxSizing: "border-box",
    color: "#111827",
    transition: "border-color 0.15s",
  },
  inputWithIcon: {
    height: "28px",
    padding: "0 25px 0 8px",
    fontSize: "12px",
    border: "1px solid #d1d5db",
    borderRadius: "3px",
    outline: "none",
    width: "100%",
    boxSizing: "border-box",
    color: "#111827",
    cursor: "pointer",
  },
  select: {
    height: "28px",
    padding: "0 4px",
    fontSize: "12px",
    border: "1px solid #d1d5db",
    borderRadius: "3px",
    backgroundColor: "#fff",
    width: "100%",
    boxSizing: "border-box",
    color: "#111827",
  },
  textarea: {
    padding: "6px 8px",
    fontSize: "12px",
    border: "1px solid #d1d5db",
    borderRadius: "3px",
    width: "100%",
    boxSizing: "border-box",
    color: "#111827",
    minHeight: "45px",
    resize: "vertical",
    fontFamily: "inherit",
  },
  comboWrapper: {
    position: "relative",
    width: "100%",
  },
  comboIcon: {
    position: "absolute",
    right: "8px",
    top: "50%",
    transform: "translateY(-50%)",
    fontSize: "10px",
    color: "#6b7280",
    pointerEvents: "none",
  },
  dropdownList: {
    position: "absolute",
    top: "100%",
    left: 0,
    right: 0,
    border: "1px solid #d1d5db",
    backgroundColor: "#fff",
    zIndex: 9999,
    maxHeight: "250px",
    overflowY: "auto",
    boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
    borderRadius: "3px",
    marginTop: "2px",
  },
  dropdownItem: {
    padding: "6px 10px",
    cursor: "pointer",
    borderBottom: "1px solid #f3f4f6",
    display: "flex",
    flexDirection: "column",
  },
  consigneeRow: {
    display: "flex",
    gap: "10px",
    marginBottom: "6px",
    alignItems: "center",
    backgroundColor: "#f9fafb",
    padding: "6px",
    borderRadius: "3px",
    border: "1px solid #e5e7eb",
  },
  btnPrimary: {
    backgroundColor: "#2563eb",
    color: "#fff",
    padding: "0 20px",
    height: "30px",
    borderRadius: "3px",
    border: "none",
    fontWeight: "600",
    cursor: "pointer",
    fontSize: "12px",
  },
  btnClear: {
    backgroundColor: "#fff",
    color: "#4b5563",
    padding: "0 15px",
    height: "30px",
    borderRadius: "3px",
    border: "1px solid #d1d5db",
    fontWeight: "500",
    cursor: "pointer",
    fontSize: "12px",
    marginRight: "8px",
  },
  btnAdd: {
    backgroundColor: "#eff6ff",
    color: "#1d4ed8",
    border: "1px solid #bfdbfe",
    padding: "0 10px",
    height: "24px",
    borderRadius: "3px",
    fontSize: "11px",
    fontWeight: "600",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
  },
  btnRemove: {
    backgroundColor: "#fee2e2",
    color: "#b91c1c",
    border: "1px solid #fecaca",
    width: "24px",
    height: "24px",
    borderRadius: "3px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "14px",
    fontWeight: "bold",
  },
  iconBox: {
    width: "20px",
    height: "20px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "3px",
    fontSize: "12px",
  },
  notification: {
    position: "fixed",
    top: "20px",
    right: "20px",
    zIndex: 2000,
    padding: "10px 15px",
    borderRadius: "4px",
    fontSize: "13px",
    fontWeight: "600",
    boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
    border: "1px solid transparent",
  },
};

// helper
const toUpper = (val) => (typeof val === "string" ? val.toUpperCase() : val);

// Gateway Port dropdown (directory-backed)
function useGatewayPortDropdown(value, onChange) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value || "");
  const [opts, setOpts] = useState([]);
  const [active, setActive] = useState(-1);
  const wrapRef = useRef(null);
  const keepOpen = useRef(false);
  const apiBase = import.meta.env.VITE_API_STRING;

  useEffect(() => {
    setQuery(value || "");
  }, [value]);

  useEffect(() => {
    if (!open) {
      setOpts([]);
      return;
    }
    const searchVal = (query || "").trim();
    const url = `${apiBase}/gateway-ports/?page=1&status=&type=&search=${encodeURIComponent(
      searchVal
    )}`;
    const t = setTimeout(async () => {
      try {
        const res = await fetch(url);
        const data = await res.json();
        setOpts(Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : []);
      } catch {
        setOpts([]);
      }
    }, 220);
    return () => clearTimeout(t);
  }, [open, query, apiBase]);

  useEffect(() => {
    function close(e) {
      if (!keepOpen.current && wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  function selectIndex(i) {
    const item = opts[i];
    if (!item) return;
    const val = `${(item.unece_code || "").toUpperCase()} - ${(item.name || "").toUpperCase()}`.trim();
    setQuery(val);
    onChange(val);
    setOpen(false);
    setActive(-1);
  }

  const filtered = opts.filter((p) => {
    const code = p.unece_code || "";
    const name = p.name || "";
    const haystack = `${code} ${name}`.toUpperCase();
    const needle = (query || "").toUpperCase();
    return !needle || haystack.includes(needle);
  });

  return {
    wrapRef,
    open,
    setOpen,
    query,
    setQuery,
    active,
    setActive,
    filtered,
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

function GatewayPortDropdown({ label, value, onChange, placeholder = "SELECT LOADING PORT" }) {
  const d = useGatewayPortDropdown(value, onChange);
  return (
    <div style={s.col} ref={d.wrapRef}>
      <label style={s.label}>{label}</label>
      <div style={s.comboWrapper}>
        <input
          style={s.inputWithIcon}
          value={toUpper(d.query)}
          onChange={(e) => d.handleChange(e.target.value)}
          onFocus={d.handleFocus}
          onBlur={d.handleBlur}
          placeholder={placeholder}
          autoComplete="off"
        />
        <span style={s.comboIcon}>▼</span>
        {d.open && d.filtered.length > 0 && (
          <div style={s.dropdownList}>
            {d.filtered.map((p, i) => (
              <div
                key={p._id || p.unece_code || p.name || i}
                style={s.dropdownItem}
                onMouseDown={() => d.selectIndex(i)}
                onMouseEnter={() => d.setActive(i)}
              >
                <div style={{ fontWeight: 600, color: "#111827" }}>
                  {(p.unece_code || "").toUpperCase()} - {(p.name || "").toUpperCase()}
                </div>
                {p.port_type && (
                  <div style={{ fontSize: 10, color: "#6b7280" }}>
                    TYPE: {p.port_type.toUpperCase()}
                  </div>
                )}
                {p.location && (
                  <div style={{ fontSize: 10, color: "#9ca3af" }}>
                    {p.location.toUpperCase()}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const AddExJobs = () => {
  const emptyConsignee = { consignee_name: "", consignee_address: "", consignee_country: "" };
  const [formData, setFormData] = useState({
    exporter_name: "",
    consignees: [{ ...emptyConsignee }],
    ie_code: "",
    job_no: "",
    movement_type: "FCL",
    country_of_final_destination: "",
    commodity_description: "",
    commercial_invoice_value: "",
    invoice_currency: "USD",
    port_of_loading: "",
    // port_of_discharge removed
    // country_of_final_destination still kept for data but not displayed in UI
    total_no_of_pkgs: "",
    gross_weight_kg: "",
    net_weight_kg: "",
    status: "Pending",
    year: "25-26",
    transportMode: "SEA",
    job_date: new Date().toISOString().split("T")[0],
  });

  const [organizations, setOrganizations] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const wrapperRef = useRef(null);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setShowDropdown(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const fetchOrgs = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`${import.meta.env.VITE_API_STRING}/directory`);
        if (response.data.success) {
          const allOrgs = response.data.data;
          const filtered = formData.exporter_name
            ? allOrgs.filter((o) =>
                (o.organization || "")
                  .toUpperCase()
                  .includes(formData.exporter_name.toUpperCase())
              )
            : allOrgs;
          setOrganizations(filtered);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    const timer = setTimeout(fetchOrgs, 200);
    return () => clearTimeout(timer);
  }, [formData.exporter_name]);

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: toUpper(value) }));
  };

  const handleDirectorySelect = (org) => {
    setFormData((prev) => ({
      ...prev,
      exporter_name: toUpper(org.organization),
      ie_code: toUpper(org.registrationDetails?.ieCode || ""),
    }));
    setShowDropdown(false);
    showToast("Exporter details populated!");
  };

  const handleConsigneeChange = (idx, field, val) => {
    const updated = [...formData.consignees];
    updated[idx][field] = toUpper(val);
    setFormData({ ...formData, consignees: updated });
  };

  const addConsignee = () =>
    setFormData((p) => ({ ...p, consignees: [...p.consignees, { ...emptyConsignee }] }));

  const removeConsignee = (idx) => {
    if (formData.consignees.length === 1) return;
    setFormData((p) => ({ ...p, consignees: p.consignees.filter((_, i) => i !== idx) }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.exporter_name) {
      showToast("Exporter Name is required", "error");
      return;
    }
    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_STRING}/jobs/add-job-exp-man`,
        formData
      );
      if (response.data.success) {
        showToast(`Job Created! No: ${response.data.job.job_no}`);
        handleClear();
      }
    } catch (e) {
      showToast("Failed to create job", "error");
    }
  };

  const handleClear = () => {
    setFormData({
      exporter_name: "",
      consignees: [{ ...emptyConsignee }],
      ie_code: "",
      job_no: "",
      movement_type: "FCL",
      country_of_final_destination: "",
      commodity_description: "",
      commercial_invoice_value: "",
      invoice_currency: "USD",
      port_of_loading: "",
      total_no_of_pkgs: "",
      gross_weight_kg: "",
      net_weight_kg: "",
      status: "Pending",
      year: "25-26",
      transportMode: "SEA",
      job_date: new Date().toISOString().split("T")[0],
    });
  };

  return (
    <div style={s.wrapper}>
      <div style={s.container}>
        {toast && (
          <div
            style={{
              ...s.notification,
              backgroundColor: toast.type === "error" ? "#fef2f2" : "#ecfdf5",
              color: toast.type === "error" ? "#991b1b" : "#047857",
              borderColor: toast.type === "error" ? "#fca5a5" : "#6ee7b7",
            }}
          >
            {toast.msg}
          </div>
        )}

        <div style={s.pageHeader}>
          <h1 style={s.pageTitle}>Create Export Job</h1>
          <p style={s.subTitle}>Create a new job record manually.</p>
        </div>

        <form onSubmit={handleSubmit}>
          {/* 1. Organization */}
          <div style={{ ...s.card, ...s.borderBlue }}>
            <div style={s.cardHeader}>
              <span style={{ ...s.iconBox, backgroundColor: "#eff6ff", color: "#2563eb" }}>
                🏢
              </span>
              <span style={s.cardTitle}>Organization & Directory</span>
            </div>
            <div style={s.cardBody}>
              <div style={s.row}>
                <div style={{ ...s.col, flex: 2 }} ref={wrapperRef}>
                  <label style={s.label}>Exporter Name *</label>
                  <div style={s.comboWrapper}>
                    <input
                      style={s.inputWithIcon}
                      value={formData.exporter_name}
                      onChange={(e) => {
                        handleInputChange("exporter_name", e.target.value);
                        setShowDropdown(true);
                      }}
                      onFocus={() => setShowDropdown(true)}
                      placeholder="Select or Type Exporter..."
                      required
                      autoComplete="off"
                    />
                    <span style={s.comboIcon}>▼</span>
                    {showDropdown && (
                      <div style={s.dropdownList}>
                        {loading ? (
                          <div
                            style={{
                              padding: "8px",
                              color: "#9ca3af",
                              fontStyle: "italic",
                            }}
                          >
                            Loading...
                          </div>
                        ) : organizations.length > 0 ? (
                          organizations.map((org, i) => (
                            <div
                              key={i}
                              style={s.dropdownItem}
                              onMouseEnter={(e) =>
                                (e.currentTarget.style.backgroundColor = "#f9fafb")
                              }
                              onMouseLeave={(e) =>
                                (e.currentTarget.style.backgroundColor = "#fff")
                              }
                              onMouseDown={() => handleDirectorySelect(org)}
                            >
                              <div style={{ fontWeight: "600", color: "#1f2937" }}>
                                {org.organization}
                              </div>
                              <div
                                style={{ fontSize: "10px", color: "#6b7280" }}
                              >
                                IE Code: {org.registrationDetails?.ieCode || "N/A"}
                              </div>
                            </div>
                          ))
                        ) : (
                          <div style={{ padding: "8px", color: "#9ca3af" }}>
                            No exporters found
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div style={s.col}>
                  <label style={s.label}>IE Code *</label>
                  <input
                    style={s.input}
                    value={formData.ie_code}
                    onChange={(e) =>
                      handleInputChange("ie_code", e.target.value.replace(/\D/g, ""))
                    }
                    maxLength={10}
                    required
                  />
                </div>

                <div style={s.col}>
                  <label style={s.label}>Job Date</label>
                  <input
                    type="date"
                    style={s.input}
                    value={formData.job_date}
                    onChange={(e) => handleInputChange("job_date", e.target.value)}
                  />
                </div>

                <div style={{ ...s.col, maxWidth: "100px" }}>
                  <label style={s.label}>Year</label>
                  <select
                    style={s.select}
                    value={formData.year}
                    onChange={(e) => handleInputChange("year", e.target.value)}
                  >
                    <option value="25-26">25-26</option>
                    <option value="26-27">26-27</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* 2. Consignees */}
          <div style={{ ...s.card, ...s.borderTeal }}>
            <div style={s.cardHeader}>
              <span style={{ ...s.iconBox, backgroundColor: "#ecfeff", color: "#0891b2" }}>
                👥
              </span>
              <span style={s.cardTitle}>Party Details (Consignees)</span>
            </div>
            <div style={s.cardBody}>
              {formData.consignees.map((item, idx) => (
                <div key={idx} style={s.consigneeRow}>
                  <div style={{ ...s.col, flex: 2 }}>
                    <label style={s.label}>Consignee Name *</label>
                    <input
                      style={s.input}
                      placeholder="Name"
                      value={item.consignee_name}
                      onChange={(e) =>
                        handleConsigneeChange(idx, "consignee_name", e.target.value)
                      }
                      required
                    />
                  </div>
                  <div style={{ ...s.col, flex: 3 }}>
                    <label style={s.label}>Address</label>
                    <input
                      style={s.input}
                      placeholder="Full Address"
                      value={item.consignee_address}
                      onChange={(e) =>
                        handleConsigneeChange(idx, "consignee_address", e.target.value)
                      }
                    />
                  </div>
                  <div style={{ ...s.col, flex: 1 }}>
                    <label style={s.label}>Country</label>
                    <input
                      style={s.input}
                      placeholder="Country"
                      value={item.consignee_country}
                      onChange={(e) =>
                        handleConsigneeChange(idx, "consignee_country", e.target.value)
                      }
                    />
                  </div>
                  <div style={{ display: "flex", alignItems: "flex-end", paddingBottom: "1px" }}>
                    <button
                      type="button"
                      onClick={() => removeConsignee(idx)}
                      style={s.btnRemove}
                      disabled={formData.consignees.length === 1}
                      title="Remove"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
              <button type="button" onClick={addConsignee} style={s.btnAdd}>
                + Add Consignee
              </button>
            </div>
          </div>

          {/* 3. Shipment Details */}
          <div style={{ ...s.card, ...s.borderBlue }}>
            <div style={s.cardHeader}>
              <span style={{ ...s.iconBox, backgroundColor: "#eff6ff", color: "#2563eb" }}>
                🚢
              </span>
              <span style={s.cardTitle}>Shipment Details</span>
            </div>
            <div style={s.cardBody}>
              <div style={s.row}>
                <div style={{ ...s.col, maxWidth: "120px" }}>
                  <label style={s.label}>Movement</label>
                  <select
                    style={s.select}
                    value={formData.movement_type}
                    onChange={(e) => handleInputChange("movement_type", e.target.value)}
                  >
                    <option value="FCL">FCL</option>
                    <option value="LCL">LCL</option>
                  </select>
                </div>
                <div style={{ ...s.col, maxWidth: "120px" }}>
                  <label style={s.label}>Transport</label>
                  <select
                    style={s.select}
                    value={formData.transportMode}
                    onChange={(e) => handleInputChange("transportMode", e.target.value)}
                  >
                    <option value="SEA">SEA</option>
                    <option value="AIR">AIR</option>
                    <option value="LAND">LAND</option>
                  </select>
                </div>

                {/* Port of Loading from Gateway Port Directory */}
                <GatewayPortDropdown
                  label="Port of Loading"
                  value={formData.port_of_loading}
                  onChange={(val) => handleInputChange("port_of_loading", val)}
                />
              </div>
            </div>
          </div>

          {/* 4. Commercial & Cargo */}
          <div style={{ ...s.card, ...s.borderOrange }}>
            <div style={s.cardHeader}>
              <span style={{ ...s.iconBox, backgroundColor: "#fff7ed", color: "#ea580c" }}>
                📦
              </span>
              <span style={s.cardTitle}>Commercial & Cargo</span>
            </div>
            <div style={s.cardBody}>
              <div style={s.row}>
                <div style={s.col}>
                  <label style={s.label}>Invoice Value</label>
                  <input
                    type="number"
                    step="0.01"
                    style={s.input}
                    value={formData.commercial_invoice_value}
                    onChange={(e) =>
                      handleInputChange("commercial_invoice_value", e.target.value)
                    }
                  />
                </div>
                <div style={{ ...s.col, maxWidth: "100px" }}>
                  <label style={s.label}>Currency</label>
                  <select
                    style={s.select}
                    value={formData.invoice_currency}
                    onChange={(e) =>
                      handleInputChange("invoice_currency", e.target.value)
                    }
                  >
                    {["USD", "EUR", "INR"].map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div style={s.col}>
                  <label style={s.label}>Packages</label>
                  <input
                    type="number"
                    style={s.input}
                    value={formData.total_no_of_pkgs}
                    onChange={(e) => handleInputChange("total_no_of_pkgs", e.target.value)}
                  />
                </div>
                <div style={s.col}>
                  <label style={s.label}>Gross Wt (KG)</label>
                  <input
                    type="number"
                    step="0.001"
                    style={s.input}
                    value={formData.gross_weight_kg}
                    onChange={(e) => handleInputChange("gross_weight_kg", e.target.value)}
                  />
                </div>
                <div style={s.col}>
                  <label style={s.label}>Net Wt (KG)</label>
                  <input
                    type="number"
                    step="0.001"
                    style={s.input}
                    value={formData.net_weight_kg}
                    onChange={(e) => handleInputChange("net_weight_kg", e.target.value)}
                  />
                </div>
              </div>
              <div style={s.row}>
                <div style={{ ...s.col, flex: 1 }}>
                  <label style={s.label}>Commodity Description</label>
                  <textarea
                    style={s.textarea}
                    value={formData.commodity_description}
                    onChange={(e) =>
                      handleInputChange("commodity_description", e.target.value)
                    }
                  />
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "15px" }}>
            <button type="button" onClick={handleClear} style={s.btnClear}>
              Clear
            </button>
            <button type="submit" style={s.btnPrimary} disabled={loading}>
              {loading ? "Saving..." : "Create Job"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddExJobs;
