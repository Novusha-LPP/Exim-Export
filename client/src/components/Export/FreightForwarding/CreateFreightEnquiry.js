import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";

const s = {
  wrapper: {
    fontFamily: "'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    backgroundColor: "#fafaff",
    padding: "18px",
    color: "#1f2937",
    fontSize: "12px",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: "4px",
    boxShadow: "0 1px 2px rgba(0,0,0,0.06)",
    marginBottom: "10px",
    border: "1px solid #e5e7eb",
  },
  cardHeader: {
    padding: "8px 15px",
    borderBottom: "1px solid #f3f4f6",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontWeight: 700,
    fontSize: "12px",
    textTransform: "uppercase",
    color: "#374151",
  },
  cardBody: {
    padding: "12px 15px",
  },
  borderBlue: { borderLeft: "3px solid #2563eb" },
  borderTeal: { borderLeft: "3px solid #0891b2" },
  row: {
    display: "flex",
    gap: "12px",
    marginBottom: "10px",
    flexWrap: "wrap",
  },
  col: {
    flex: 1,
    minWidth: "170px",
    display: "flex",
    flexDirection: "column",
  },
  label: {
    fontSize: "11px",
    fontWeight: 600,
    color: "#4b5563",
    marginBottom: "2px",
  },
  input: {
    height: "30px",
    padding: "0 8px",
    fontSize: "12px",
    border: "1px solid #d1d5db",
    borderRadius: "3px",
    outline: "none",
    width: "100%",
    boxSizing: "border-box",
    color: "#111827",
  },
  select: {
    height: "30px",
    padding: "0 6px",
    fontSize: "12px",
    border: "1px solid #d1d5db",
    borderRadius: "3px",
    backgroundColor: "#fff",
    width: "100%",
    boxSizing: "border-box",
    color: "#111827",
  },
  textarea: {
    minHeight: "65px",
    padding: "6px 8px",
    fontSize: "12px",
    border: "1px solid #d1d5db",
    borderRadius: "3px",
    resize: "vertical",
    fontFamily: "inherit",
  },
  comboWrapper: {
    position: "relative",
    width: "100%",
  },
  inputWithIcon: {
    height: "30px",
    padding: "0 24px 0 8px",
    fontSize: "12px",
    border: "1px solid #d1d5db",
    borderRadius: "3px",
    width: "100%",
    boxSizing: "border-box",
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
    zIndex: 1000,
    maxHeight: "220px",
    overflowY: "auto",
    boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
    borderRadius: "3px",
    marginTop: "2px",
  },
  dropdownItem: {
    padding: "6px 8px",
    cursor: "pointer",
    borderBottom: "1px solid #f3f4f6",
    fontSize: "11.5px",
  },
  btnPrimary: {
    backgroundColor: "#2563eb",
    color: "#fff",
    padding: "0 20px",
    height: "32px",
    borderRadius: "3px",
    border: "none",
    fontWeight: 600,
    cursor: "pointer",
    fontSize: "12px",
  },
  btnClear: {
    backgroundColor: "#fff",
    color: "#4b5563",
    padding: "0 15px",
    height: "32px",
    borderRadius: "3px",
    border: "1px solid #d1d5db",
    fontWeight: 600,
    cursor: "pointer",
    fontSize: "12px",
    marginRight: "8px",
  },
};

const toUpper = (value) => (typeof value === "string" ? value.toUpperCase() : value);

const emptyForm = {
  organization_name: "",
  container_size: "",
  consignment_type: "",
  goods_stuffed: "",
  port_of_loading: "",
  port_of_destination: "",
  contact_no: "",
  email: "",
  net_weight: "",
  gross_weight: "",
  remarks: "",
  shipment_type: "",
  dimension: "",
  no_packages: "",
};

const seaPortOptions = [
  "INMUN1 - MUNDRA",
  "INIXY1 - KANDLA",
  "INPAV1 - PIPAVAV",
  "INHZA1 - HAZIRA",
  "INNSA1 - NHAVA SHEVA",
];

const airPortOptions = [
  "INAMD4 - AHMEDABAD AIR PORT",
];

function CreateFreightEnquiry({ onCreate, onClose, initialData = null, submitLabel = "Create Enquiry" }) {
  const [formData, setFormData] = useState({ ...emptyForm, ...(initialData || {}) });
  const [organizations, setOrganizations] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loadingOrgs, setLoadingOrgs] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [loadingPorts, setLoadingPorts] = useState([]);
  const [destinationPorts, setDestinationPorts] = useState([]);
  const [showLoadingDropdown, setShowLoadingDropdown] = useState(false);
  const [showDestinationDropdown, setShowDestinationDropdown] = useState(false);

  const wrapperRef = useRef(null);
  const loadingPortRef = useRef(null);
  const destinationPortRef = useRef(null);

  useEffect(() => {
    const close = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
      if (loadingPortRef.current && !loadingPortRef.current.contains(e.target)) {
        setShowLoadingDropdown(false);
      }
      if (destinationPortRef.current && !destinationPortRef.current.contains(e.target)) {
        setShowDestinationDropdown(false);
      }
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  useEffect(() => {
    const fetchOrgs = async () => {
      try {
        setLoadingOrgs(true);
        const response = await axios.get(`${import.meta.env.VITE_API_STRING}/directory`, {
          params: { limit: 1000 },
        });
        if (response.data.success) {
          const all = response.data.data || [];
          const needle = (formData.organization_name || "").toUpperCase().trim();
          const filtered = needle
            ? all.filter((o) => (o.organization || "").toUpperCase().includes(needle))
            : all;
          setOrganizations(filtered);
        }
      } catch (error) {
        setOrganizations([]);
      } finally {
        setLoadingOrgs(false);
      }
    };
    const timer = setTimeout(fetchOrgs, 200);
    return () => clearTimeout(timer);
  }, [formData.organization_name]);

  // Port fetching logic
  useEffect(() => {
    const fetchPorts = async (search, setFn) => {
      const type = formData.shipment_type;
      if (!type) {
        setFn([]);
        return;
      }

      // Default options to show if search is empty or no results
      const isAir = type.includes("Air");
      const defaults = isAir ? airPortOptions : seaPortOptions;
      
      try {
        const endpoint = isAir ? "airPorts" : (type.includes("Sea") ? "seaPorts" : "ports");
        const res = await axios.get(`${import.meta.env.VITE_API_STRING}/${endpoint}`, {
          params: { search: search.trim(), limit: 100 }
        });

        const data = Array.isArray(res.data?.data) ? res.data.data : Array.isArray(res.data) ? res.data : [];
        let formatted = data.map(p => {
          const code = p.uneceCode || p.unece_code || "";
          const name = p.portName || p.name || "";
          return code ? `(${code.toUpperCase()}) ${name.toUpperCase()}` : name.toUpperCase();
        });

        // Merge with defaults if search is empty
        if (!search.trim()) {
           const unique = [...new Set([...defaults, ...formatted])];
           setFn(unique);
        } else {
           setFn(formatted);
        }
      } catch (err) {
        console.error("Error fetching ports:", err);
        setFn(search.trim() ? [] : defaults);
      }
    };

    if (showLoadingDropdown) fetchPorts(formData.port_of_loading, setLoadingPorts);
    if (showDestinationDropdown) fetchPorts(formData.port_of_destination, setDestinationPorts);
  }, [formData.port_of_loading, formData.port_of_destination, formData.shipment_type, showLoadingDropdown, showDestinationDropdown]);

  const requiredMissing = useMemo(() => {
    return !formData.organization_name || !formData.shipment_type || !formData.port_of_loading;
  }, [formData.organization_name, formData.shipment_type, formData.port_of_loading]);

  const handleChange = (field, value) => {
    const upperFields = ["organization_name", "consignment_type", "goods_stuffed", "port_of_loading", "port_of_destination", "dimension", "remarks"];
    setFormData((prev) => ({
      ...prev,
      [field]: upperFields.includes(field) ? toUpper(value) : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log("Submit clicked, requiredMissing:", requiredMissing);
    if (requiredMissing) return;

    try {
      setIsSubmitting(true);
      const payload = {
        ...formData,
        enquiry_date: new Date().toISOString().split("T")[0],
        status: "Open",
      };
      console.log("Calling onCreate with:", payload);
      await onCreate(payload);
      setFormData(emptyForm);
    } catch (err) {
      console.error("Error in handleSubmit:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={s.wrapper}>
      <form onSubmit={handleSubmit}>
        <div style={{ ...s.card, ...s.borderBlue }}>
          <div style={s.cardHeader}>Organization & Shipment Basics</div>
          <div style={s.cardBody}>
            <div style={s.row}>
              <div style={{ ...s.col, flex: 2 }} ref={wrapperRef}>
                <label style={s.label}>Organization Name *</label>
                <div style={s.comboWrapper}>
                  <input
                    style={s.inputWithIcon}
                    value={formData.organization_name}
                    onChange={(e) => {
                      handleChange("organization_name", e.target.value);
                      setShowDropdown(true);
                    }}
                    onFocus={() => setShowDropdown(true)}
                    placeholder="Select from directory or type manually"
                    autoComplete="off"
                  />
                  <span style={s.comboIcon}>▼</span>
                  {showDropdown && (
                    <div style={s.dropdownList}>
                      {loadingOrgs ? (
                        <div style={{ padding: "8px", color: "#9ca3af" }}>Loading...</div>
                      ) : organizations.length ? (
                        organizations.map((org, i) => (
                          <div
                            key={`${org.organization}-${i}`}
                            style={s.dropdownItem}
                            onMouseDown={() => {
                              handleChange("organization_name", org.organization || "");
                              setShowDropdown(false);
                            }}
                          >
                            {toUpper(org.organization || "")}
                          </div>
                        ))
                      ) : (
                        <div style={{ padding: "8px", color: "#9ca3af" }}>No match, you can type manually.</div>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div style={s.col}>
                <label style={s.label}>Shipment Type *</label>
                <select
                  style={s.select}
                  value={formData.shipment_type}
                  onChange={(e) => handleChange("shipment_type", e.target.value)}
                >
                  <option value="">SELECT</option>
                  <option value="Import-Sea">Import - Sea</option>
                  <option value="Export-Sea">Export - Sea</option>
                  <option value="Import-Air">Import - Air</option>
                  <option value="Export-Air">Export - Air</option>
                </select>
              </div>
              <div style={s.col}>
                <label style={s.label}>Container Size</label>
                <select
                  style={s.select}
                  value={formData.container_size}
                  onChange={(e) => handleChange("container_size", e.target.value)}
                >
                  <option value="">SELECT</option>
                  <option value="20 FT">20 FT</option>
                  <option value="40 FT">40 FT</option>
                  <option value="45 FT">45 FT</option>
                </select>
              </div>
              <div style={s.col}>
                <label style={s.label}>Consignment Type</label>
                <select
                  style={s.select}
                  value={formData.consignment_type}
                  onChange={(e) => handleChange("consignment_type", e.target.value)}
                >
                  <option value="">SELECT</option>
                  <option value="LCL">LCL</option>
                  <option value="FCL">FCL</option>
                  <option value="AIR">AIR</option>
                </select>
              </div>
              <div style={s.col}>
                <label style={s.label}>Goods Stuffed</label>
                <select
                  style={s.select}
                  value={formData.goods_stuffed}
                  onChange={(e) => handleChange("goods_stuffed", e.target.value)}
                >
                  <option value="">SELECT</option>
                  <option value="FACTORY STUFFED">FACTORY STUFFED</option>
                  <option value="DOCK STUFFED">DOCK STUFFED</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <div style={{ ...s.card, ...s.borderTeal }}>
          <div style={s.cardHeader}>Ports & Contact</div>
          <div style={s.cardBody}>
            <div style={s.row}>
              <div style={s.col} ref={loadingPortRef}>
                <label style={s.label}>Port of Loading *</label>
                <div style={s.comboWrapper}>
                  <input
                    style={s.inputWithIcon}
                    value={formData.port_of_loading}
                    onChange={(e) => {
                      handleChange("port_of_loading", e.target.value);
                      setShowLoadingDropdown(true);
                    }}
                    onFocus={() => setShowLoadingDropdown(true)}
                    placeholder={formData.shipment_type ? "Search port..." : "Select type first..."}
                    autoComplete="off"
                  />
                  <span style={s.comboIcon}>▼</span>
                  {showLoadingDropdown && (
                    <div style={s.dropdownList}>
                      {loadingPorts.length > 0 ? (
                        loadingPorts.map((p, i) => (
                          <div
                            key={`${p}-${i}`}
                            style={s.dropdownItem}
                            onMouseDown={() => {
                              handleChange("port_of_loading", p);
                              setShowLoadingDropdown(false);
                            }}
                          >
                            {p}
                          </div>
                        ))
                      ) : (
                        <div style={{ padding: "8px", color: "#9ca3af" }}>{formData.shipment_type ? "No matches found." : "Select shipment type first."}</div>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div style={s.col} ref={destinationPortRef}>
                <label style={s.label}>Port of Destination</label>
                <div style={s.comboWrapper}>
                  <input
                    style={s.inputWithIcon}
                    value={formData.port_of_destination}
                    onChange={(e) => {
                      handleChange("port_of_destination", e.target.value);
                      setShowDestinationDropdown(true);
                    }}
                    onFocus={() => setShowDestinationDropdown(true)}
                    placeholder={formData.shipment_type ? "Search port..." : "Select type first..."}
                    autoComplete="off"
                  />
                  <span style={s.comboIcon}>▼</span>
                  {showDestinationDropdown && (
                    <div style={s.dropdownList}>
                      {destinationPorts.length > 0 ? (
                        destinationPorts.map((p, i) => (
                          <div
                            key={`${p}-${i}`}
                            style={s.dropdownItem}
                            onMouseDown={() => {
                              handleChange("port_of_destination", p);
                              setShowDestinationDropdown(false);
                            }}
                          >
                            {p}
                          </div>
                        ))
                      ) : (
                        <div style={{ padding: "8px", color: "#9ca3af" }}>{formData.shipment_type ? "No matches found." : "Select shipment type first."}</div>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div style={s.col}>
                <label style={s.label}>Contact No</label>
                <input
                  style={s.input}
                  value={formData.contact_no}
                  onChange={(e) => handleChange("contact_no", e.target.value)}
                  placeholder="Enter contact number"
                />
              </div>
              <div style={s.col}>
                <label style={s.label}>Email</label>
                <input
                  style={s.input}
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange("email", e.target.value)}
                  placeholder="Enter email"
                />
              </div>
            </div>
            <div style={s.row}>
              <div style={s.col}>
                <label style={s.label}>Net Weight</label>
                <input
                  style={s.input}
                  value={formData.net_weight}
                  onChange={(e) => handleChange("net_weight", e.target.value)}
                  placeholder="Net weight"
                />
              </div>
              <div style={s.col}>
                <label style={s.label}>Gross Weight</label>
                <input
                  style={s.input}
                  value={formData.gross_weight}
                  onChange={(e) => handleChange("gross_weight", e.target.value)}
                  placeholder="Gross weight"
                />
              </div>
              <div style={s.col}>
                <label style={s.label}>Dimension</label>
                <input
                  style={s.input}
                  value={formData.dimension}
                  onChange={(e) => handleChange("dimension", e.target.value)}
                  placeholder="L x W x H"
                />
              </div>
              <div style={s.col}>
                <label style={s.label}>No Packages</label>
                <input
                  style={s.input}
                  value={formData.no_packages}
                  onChange={(e) => handleChange("no_packages", e.target.value)}
                  placeholder="No of packages"
                />
              </div>
            </div>
            <div style={s.row}>
              <div style={{ ...s.col, minWidth: "100%" }}>
                <label style={s.label}>Remarks</label>
                <textarea
                  style={s.textarea}
                  value={formData.remarks}
                  onChange={(e) => handleChange("remarks", e.target.value)}
                  placeholder="Additional instructions or remarks"
                />
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "10px" }}>
          <button type="button" style={s.btnClear} onClick={onClose}>
            Cancel
          </button>
          <button type="submit" style={s.btnPrimary} disabled={requiredMissing || isSubmitting}>
            {isSubmitting ? "Processing..." : submitLabel}
          </button>
        </div>
      </form>
    </div>
  );
}

export default CreateFreightEnquiry;
