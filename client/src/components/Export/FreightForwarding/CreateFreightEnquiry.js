import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";

const s = {
  wrapper: {
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif",
    backgroundColor: "#f8fafc",
    padding: "20px 24px",
    color: "#0f172a",
    fontSize: "12.5px",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: "3px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
    marginBottom: "16px",
    border: "1px solid #cbd5e1",
    overflow: "hidden",
  },
  cardHeader: {
    padding: "12px 20px",
    borderBottom: "1px solid #cbd5e1",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontWeight: 700,
    fontSize: "12.5px",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    color: "#334155",
    backgroundColor: "#f8fafc",
  },
  cardBody: {
    padding: "16px 20px",
  },
  borderBlue: { borderLeft: "3px solid #16408f" },
  borderTeal: { borderLeft: "3px solid #16408f" },
  row: {
    display: "flex",
    gap: "16px",
    marginBottom: "12px",
    flexWrap: "wrap",
  },
  col: {
    flex: 1,
    minWidth: "180px",
    display: "flex",
    flexDirection: "column",
  },
  label: {
    fontSize: "11.5px",
    fontWeight: 600,
    color: "#475569",
    marginBottom: "4px",
  },
  input: {
    height: "34px",
    padding: "0 12px",
    fontSize: "12.5px",
    border: "1px solid #cbd5e1",
    borderRadius: "3px",
    outline: "none",
    width: "100%",
    boxSizing: "border-box",
    color: "#0f172a",
    backgroundColor: "#fff",
    transition: "all 0.15s ease",
  },
  select: {
    height: "34px",
    padding: "0 10px",
    fontSize: "12.5px",
    border: "1px solid #cbd5e1",
    borderRadius: "3px",
    backgroundColor: "#fff",
    width: "100%",
    boxSizing: "border-box",
    color: "#0f172a",
    outline: "none",
    transition: "all 0.15s ease",
  },
  textarea: {
    minHeight: "75px",
    padding: "8px 12px",
    fontSize: "12.5px",
    border: "1px solid #cbd5e1",
    borderRadius: "3px",
    backgroundColor: "#fff",
    resize: "vertical",
    fontFamily: "inherit",
    outline: "none",
    transition: "all 0.15s ease",
  },
  comboWrapper: {
    position: "relative",
    width: "100%",
  },
  inputWithIcon: {
    height: "34px",
    padding: "0 28px 0 12px",
    fontSize: "12.5px",
    border: "1px solid #cbd5e1",
    borderRadius: "3px",
    width: "100%",
    boxSizing: "border-box",
    backgroundColor: "#fff",
    outline: "none",
    transition: "all 0.15s ease",
  },
  comboIcon: {
    position: "absolute",
    right: "10px",
    top: "50%",
    transform: "translateY(-50%)",
    fontSize: "9px",
    color: "#64748b",
    pointerEvents: "none",
  },
  dropdownList: {
    position: "absolute",
    top: "100%",
    left: 0,
    right: 0,
    border: "1px solid #cbd5e1",
    backgroundColor: "#fff",
    zIndex: 1000,
    maxHeight: "220px",
    overflowY: "auto",
    boxShadow: "0 2px 5px rgba(0,0,0,0.1)",
    borderRadius: "3px",
    marginTop: "4px",
  },
  dropdownItem: {
    padding: "8px 12px",
    cursor: "pointer",
    borderBottom: "1px solid #f1f5f9",
    fontSize: "12px",
    color: "#334155",
    transition: "all 0.1s ease",
  },
  dropdownItemActive: {
    backgroundColor: "#eff6ff",
    color: "#16408f",
  },
  btnPrimary: {
    backgroundColor: "#16408f",
    color: "#fff",
    padding: "0 24px",
    height: "36px",
    borderRadius: "3px",
    border: "none",
    fontWeight: 600,
    cursor: "pointer",
    fontSize: "12.5px",
    transition: "all 0.15s ease",
  },
  btnClear: {
    backgroundColor: "#fff",
    color: "#475569",
    padding: "0 20px",
    height: "36px",
    borderRadius: "3px",
    border: "1px solid #cbd5e1",
    fontWeight: 600,
    cursor: "pointer",
    fontSize: "12.5px",
    marginRight: "8px",
    transition: "all 0.15s ease",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    marginTop: "8px",
    marginBottom: "8px",
  },
  th: {
    textAlign: "left",
    padding: "10px 12px",
    fontSize: "11px",
    fontWeight: 700,
    color: "#ffffff",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    borderBottom: "2px solid #cbd5e1",
    backgroundColor: "#19448aff",
  },
  td: {
    padding: "8px 12px",
    borderBottom: "1px solid #cbd5e1",
    verticalAlign: "middle",
  },
  btnDanger: {
    backgroundColor: "#ef4444",
    color: "#fff",
    padding: "0 12px",
    height: "30px",
    borderRadius: "3px",
    border: "none",
    fontWeight: 600,
    cursor: "pointer",
    fontSize: "11px",
    transition: "all 0.15s ease",
  },
  btnAddRow: {
    backgroundColor: "#10b981",
    color: "#fff",
    padding: "0 16px",
    height: "30px",
    borderRadius: "3px",
    border: "none",
    fontWeight: 600,
    cursor: "pointer",
    fontSize: "11.5px",
    transition: "all 0.15s ease",
  },
  calcField: {
    height: "34px",
    padding: "0 12px",
    fontSize: "12.5px",
    border: "1px solid #cbd5e1",
    borderRadius: "3px",
    backgroundColor: "#f1f5f9",
    width: "100%",
    boxSizing: "border-box",
    color: "#334155",
    display: "flex",
    alignItems: "center",
    fontWeight: "bold",
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
  dimensions: [],
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

const calculateRowCbm = (row) => {
  const l = parseFloat(row.length) || 0;
  const b = parseFloat(row.breadth) || 0;
  const h = parseFloat(row.height) || 0;
  const qty = parseFloat(row.no_packages) || 0;
  const uom = row.uom || "cm";

  let cbm = 0;
  if (uom === "cm") {
    cbm = (l * b * h * qty) / 1000000;
  } else if (uom === "inch") {
    cbm = (l * b * h * qty) * 0.000016387064;
  } else if (uom === "m") {
    cbm = (l * b * h * qty);
  } else if (uom === "ft") {
    cbm = (l * b * h * qty) * 0.028316846592;
  }
  return parseFloat(cbm.toFixed(4));
};

function CreateFreightEnquiry({ onCreate, onClose, initialData = null, submitLabel = "Create Enquiry" }) {
  const [formData, setFormData] = useState(() => {
    const initial = { ...emptyForm, ...(initialData || {}) };
    if (!initial.dimensions || initial.dimensions.length === 0) {
      initial.dimensions = [{
        length: "",
        breadth: "",
        height: "",
        uom: "cm",
        no_packages: initial.no_packages || "",
        net_weight: initial.net_weight || "",
        gross_weight: initial.gross_weight || "",
        calculated_cbm: 0
      }];
    }
    return initial;
  });

  const [organizations, setOrganizations] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loadingOrgs, setLoadingOrgs] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleDimensionChange = (index, field, value) => {
    setFormData((prev) => {
      const updatedDimensions = prev.dimensions.map((row, i) => {
        if (i === index) {
          const updatedRow = { ...row, [field]: value };
          updatedRow.calculated_cbm = calculateRowCbm(updatedRow);
          return updatedRow;
        }
        return row;
      });

      let totalNet = 0;
      let totalGross = 0;
      let totalPkgs = 0;

      updatedDimensions.forEach((row) => {
        totalNet += parseFloat(row.net_weight) || 0;
        totalGross += parseFloat(row.gross_weight) || 0;
        totalPkgs += parseInt(row.no_packages) || 0;
      });

      const dimensionText = updatedDimensions
        .map((row) => {
          if (!row.length || !row.breadth || !row.height) return "";
          const l = row.length;
          const b = row.breadth;
          const h = row.height;
          const uom = row.uom || "";
          const pkgs = row.no_packages || 0;
          return `${l}x${b}x${h} ${uom} (${pkgs} pkgs)`;
        })
        .filter(Boolean)
        .join("; ");

      return {
        ...prev,
        dimensions: updatedDimensions,
        net_weight: totalNet > 0 ? String(parseFloat(totalNet.toFixed(3))) : "",
        gross_weight: totalGross > 0 ? String(parseFloat(totalGross.toFixed(3))) : "",
        no_packages: totalPkgs > 0 ? String(totalPkgs) : "",
        dimension: dimensionText,
      };
    });
  };

  const handleAddDimensionRow = () => {
    setFormData((prev) => {
      const newRow = {
        length: "",
        breadth: "",
        height: "",
        uom: "cm",
        no_packages: "",
        net_weight: "",
        gross_weight: "",
        calculated_cbm: 0,
      };
      return {
        ...prev,
        dimensions: [...prev.dimensions, newRow],
      };
    });
  };

  const handleRemoveDimensionRow = (index) => {
    setFormData((prev) => {
      if (prev.dimensions.length <= 1) {
        const clearedRow = {
          length: "",
          breadth: "",
          height: "",
          uom: "cm",
          no_packages: "",
          net_weight: "",
          gross_weight: "",
          calculated_cbm: 0,
        };
        return {
          ...prev,
          dimensions: [clearedRow],
          net_weight: "",
          gross_weight: "",
          no_packages: "",
          dimension: "",
        };
      }
      const updatedDimensions = prev.dimensions.filter((_, i) => i !== index);

      let totalNet = 0;
      let totalGross = 0;
      let totalPkgs = 0;

      updatedDimensions.forEach((row) => {
        totalNet += parseFloat(row.net_weight) || 0;
        totalGross += parseFloat(row.gross_weight) || 0;
        totalPkgs += parseInt(row.no_packages) || 0;
      });

      const dimensionText = updatedDimensions
        .map((row) => {
          if (!row.length || !row.breadth || !row.height) return "";
          const l = row.length;
          const b = row.breadth;
          const h = row.height;
          const uom = row.uom || "";
          const pkgs = row.no_packages || 0;
          return `${l}x${b}x${h} ${uom} (${pkgs} pkgs)`;
        })
        .filter(Boolean)
        .join("; ");

      return {
        ...prev,
        dimensions: updatedDimensions,
        net_weight: totalNet > 0 ? String(parseFloat(totalNet.toFixed(3))) : "",
        gross_weight: totalGross > 0 ? String(parseFloat(totalGross.toFixed(3))) : "",
        no_packages: totalPkgs > 0 ? String(totalPkgs) : "",
        dimension: dimensionText,
      };
    });
  };

  const totalVolumeCbm = useMemo(() => {
    return formData.dimensions.reduce((acc, row) => acc + (row.calculated_cbm || 0), 0);
  }, [formData.dimensions]);

  const totalGrossWeight = useMemo(() => {
    return formData.dimensions.reduce((acc, row) => acc + (parseFloat(row.gross_weight) || 0), 0);
  }, [formData.dimensions]);

  const totalNetWeight = useMemo(() => {
    return formData.dimensions.reduce((acc, row) => acc + (parseFloat(row.net_weight) || 0), 0);
  }, [formData.dimensions]);

  const totalPackages = useMemo(() => {
    return formData.dimensions.reduce((acc, row) => acc + (parseInt(row.no_packages) || 0), 0);
  }, [formData.dimensions]);

  const volumetricWeight = useMemo(() => {
    const isAir = formData.shipment_type && formData.shipment_type.includes("Air");
    const factor = isAir ? 167 : 1000;
    return totalVolumeCbm * factor;
  }, [totalVolumeCbm, formData.shipment_type]);

  const chargeableWeight = useMemo(() => {
    return Math.max(totalGrossWeight, volumetricWeight);
  }, [totalGrossWeight, volumetricWeight]);

  const [loadingPorts, setLoadingPorts] = useState([]);
  const [destinationPorts, setDestinationPorts] = useState([]);
  const [showLoadingDropdown, setShowLoadingDropdown] = useState(false);
  const [showDestinationDropdown, setShowDestinationDropdown] = useState(false);

  const [activeOrgIndex, setActiveOrgIndex] = useState(-1);
  const [activeLoadingPortIndex, setActiveLoadingPortIndex] = useState(-1);
  const [activeDestinationPortIndex, setActiveDestinationPortIndex] = useState(-1);

  const wrapperRef = useRef(null);
  const loadingPortRef = useRef(null);
  const destinationPortRef = useRef(null);

  const orgListRef = useRef(null);
  const loadingPortListRef = useRef(null);
  const destinationPortListRef = useRef(null);

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
    setActiveOrgIndex(-1);
  }, [organizations, showDropdown]);

  useEffect(() => {
    setActiveLoadingPortIndex(-1);
  }, [loadingPorts, showLoadingDropdown]);

  useEffect(() => {
    setActiveDestinationPortIndex(-1);
  }, [destinationPorts, showDestinationDropdown]);

  useEffect(() => {
    if (showDropdown && orgListRef.current && activeOrgIndex >= 0) {
      const listEl = orgListRef.current;
      const activeEl = listEl.children[activeOrgIndex];
      if (activeEl) {
        activeEl.scrollIntoView({ block: "nearest" });
      }
    }
  }, [activeOrgIndex, showDropdown]);

  useEffect(() => {
    if (showLoadingDropdown && loadingPortListRef.current && activeLoadingPortIndex >= 0) {
      const listEl = loadingPortListRef.current;
      const activeEl = listEl.children[activeLoadingPortIndex];
      if (activeEl) {
        activeEl.scrollIntoView({ block: "nearest" });
      }
    }
  }, [activeLoadingPortIndex, showLoadingDropdown]);

  useEffect(() => {
    if (showDestinationDropdown && destinationPortListRef.current && activeDestinationPortIndex >= 0) {
      const listEl = destinationPortListRef.current;
      const activeEl = listEl.children[activeDestinationPortIndex];
      if (activeEl) {
        activeEl.scrollIntoView({ block: "nearest" });
      }
    }
  }, [activeDestinationPortIndex, showDestinationDropdown]);

  const handleOrgKeyDown = (e) => {
    if (!showDropdown) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        setShowDropdown(true);
      }
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveOrgIndex((prev) => {
        const next = prev + 1;
        return next >= organizations.length ? 0 : next;
      });
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveOrgIndex((prev) => {
        const next = prev - 1;
        return next < 0 ? organizations.length - 1 : next;
      });
    } else if (e.key === "Enter") {
      if (activeOrgIndex >= 0 && activeOrgIndex < organizations.length) {
        e.preventDefault();
        const selectedOrg = organizations[activeOrgIndex];
        handleChange("organization_name", selectedOrg.organization || "");
        setShowDropdown(false);
      }
    } else if (e.key === "Escape") {
      setShowDropdown(false);
    }
  };

  const handleLoadingPortKeyDown = (e) => {
    if (!showLoadingDropdown) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        setShowLoadingDropdown(true);
      }
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveLoadingPortIndex((prev) => {
        const next = prev + 1;
        return next >= loadingPorts.length ? 0 : next;
      });
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveLoadingPortIndex((prev) => {
        const next = prev - 1;
        return next < 0 ? loadingPorts.length - 1 : next;
      });
    } else if (e.key === "Enter") {
      if (activeLoadingPortIndex >= 0 && activeLoadingPortIndex < loadingPorts.length) {
        e.preventDefault();
        const selectedPort = loadingPorts[activeLoadingPortIndex];
        handleChange("port_of_loading", selectedPort);
        setShowLoadingDropdown(false);
      }
    } else if (e.key === "Escape") {
      setShowLoadingDropdown(false);
    }
  };

  const handleDestinationPortKeyDown = (e) => {
    if (!showDestinationDropdown) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        setShowDestinationDropdown(true);
      }
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveDestinationPortIndex((prev) => {
        const next = prev + 1;
        return next >= destinationPorts.length ? 0 : next;
      });
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveDestinationPortIndex((prev) => {
        const next = prev - 1;
        return next < 0 ? destinationPorts.length - 1 : next;
      });
    } else if (e.key === "Enter") {
      if (activeDestinationPortIndex >= 0 && activeDestinationPortIndex < destinationPorts.length) {
        e.preventDefault();
        const selectedPort = destinationPorts[activeDestinationPortIndex];
        handleChange("port_of_destination", selectedPort);
        setShowDestinationDropdown(false);
      }
    } else if (e.key === "Escape") {
      setShowDestinationDropdown(false);
    }
  };

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
                    onKeyDown={handleOrgKeyDown}
                    placeholder="Select from directory or type manually"
                    autoComplete="off"
                  />
                  <span style={s.comboIcon}>▼</span>
                  {showDropdown && (
                    <div
                      style={s.dropdownList}
                      ref={orgListRef}
                      onMouseLeave={() => setActiveOrgIndex(-1)}
                    >
                      {loadingOrgs ? (
                        <div style={{ padding: "8px", color: "#9ca3af" }}>Loading...</div>
                      ) : organizations.length ? (
                        organizations.map((org, i) => (
                          <div
                            key={`${org.organization}-${i}`}
                            style={{
                              ...s.dropdownItem,
                              ...(activeOrgIndex === i ? s.dropdownItemActive : {})
                            }}
                            onMouseDown={() => {
                              handleChange("organization_name", org.organization || "");
                              setShowDropdown(false);
                            }}
                            onMouseEnter={() => setActiveOrgIndex(i)}
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
                    onKeyDown={handleLoadingPortKeyDown}
                    placeholder={formData.shipment_type ? "Search port..." : "Select type first..."}
                    autoComplete="off"
                  />
                  <span style={s.comboIcon}>▼</span>
                  {showLoadingDropdown && (
                    <div
                      style={s.dropdownList}
                      ref={loadingPortListRef}
                      onMouseLeave={() => setActiveLoadingPortIndex(-1)}
                    >
                      {loadingPorts.length > 0 ? (
                        loadingPorts.map((p, i) => (
                          <div
                            key={`${p}-${i}`}
                            style={{
                              ...s.dropdownItem,
                              ...(activeLoadingPortIndex === i ? s.dropdownItemActive : {})
                            }}
                            onMouseDown={() => {
                              handleChange("port_of_loading", p);
                              setShowLoadingDropdown(false);
                            }}
                            onMouseEnter={() => setActiveLoadingPortIndex(i)}
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
                    onKeyDown={handleDestinationPortKeyDown}
                    placeholder={formData.shipment_type ? "Search port..." : "Select type first..."}
                    autoComplete="off"
                  />
                  <span style={s.comboIcon}>▼</span>
                  {showDestinationDropdown && (
                    <div
                      style={s.dropdownList}
                      ref={destinationPortListRef}
                      onMouseLeave={() => setActiveDestinationPortIndex(-1)}
                    >
                      {destinationPorts.length > 0 ? (
                        destinationPorts.map((p, i) => (
                          <div
                            key={`${p}-${i}`}
                            style={{
                              ...s.dropdownItem,
                              ...(activeDestinationPortIndex === i ? s.dropdownItemActive : {})
                            }}
                            onMouseDown={() => {
                              handleChange("port_of_destination", p);
                              setShowDestinationDropdown(false);
                            }}
                            onMouseEnter={() => setActiveDestinationPortIndex(i)}
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
            <div style={{ marginTop: "15px", marginBottom: "15px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <span style={{ fontSize: "12px", fontWeight: 700, color: "#374151" }}>Dimensions & Weight Grid</span>
                <button
                  type="button"
                  style={s.btnAddRow}
                  onClick={handleAddDimensionRow}
                >
                  + Add Row
                </button>
              </div>

              <div style={{ overflowX: "auto", border: "1px solid #e5e7eb", borderRadius: "4px" }}>
                <table style={s.table}>
                  <thead>
                    <tr>
                      <th style={s.th}>Length</th>
                      <th style={s.th}>Breadth</th>
                      <th style={s.th}>Height</th>
                      <th style={s.th}>UOM</th>
                      <th style={s.th}>No Packages</th>
                      <th style={s.th}>Net Wt (Kg)</th>
                      <th style={s.th}>Gross Wt (Kg)</th>
                      <th style={s.th}>Calculated CBM</th>
                      <th style={{ ...s.th, width: "50px", textAlign: "center" }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {formData.dimensions.map((row, index) => (
                      <tr key={index}>
                        <td style={s.td}>
                          <input
                            type="number"
                            style={s.input}
                            value={row.length}
                            onChange={(e) => handleDimensionChange(index, "length", e.target.value)}
                            placeholder="L"
                            min="0"
                            step="any"
                          />
                        </td>
                        <td style={s.td}>
                          <input
                            type="number"
                            style={s.input}
                            value={row.breadth}
                            onChange={(e) => handleDimensionChange(index, "breadth", e.target.value)}
                            placeholder="B"
                            min="0"
                            step="any"
                          />
                        </td>
                        <td style={s.td}>
                          <input
                            type="number"
                            style={s.input}
                            value={row.height}
                            onChange={(e) => handleDimensionChange(index, "height", e.target.value)}
                            placeholder="H"
                            min="0"
                            step="any"
                          />
                        </td>
                        <td style={s.td}>
                          <select
                            style={s.select}
                            value={row.uom}
                            onChange={(e) => handleDimensionChange(index, "uom", e.target.value)}
                          >
                            <option value="cm">cm</option>
                            <option value="inch">inch</option>
                            <option value="m">m</option>
                            <option value="ft">ft</option>
                          </select>
                        </td>
                        <td style={s.td}>
                          <input
                            type="number"
                            style={s.input}
                            value={row.no_packages}
                            onChange={(e) => handleDimensionChange(index, "no_packages", e.target.value)}
                            placeholder="Pkgs"
                            min="0"
                          />
                        </td>
                        <td style={s.td}>
                          <input
                            type="number"
                            style={s.input}
                            value={row.net_weight}
                            onChange={(e) => handleDimensionChange(index, "net_weight", e.target.value)}
                            placeholder="Net weight"
                            min="0"
                            step="any"
                          />
                        </td>
                        <td style={s.td}>
                          <input
                            type="number"
                            style={s.input}
                            value={row.gross_weight}
                            onChange={(e) => handleDimensionChange(index, "gross_weight", e.target.value)}
                            placeholder="Gross weight"
                            min="0"
                            step="any"
                          />
                        </td>
                        <td style={s.td}>
                          <div style={s.calcField}>
                            {row.calculated_cbm ? row.calculated_cbm.toFixed(4) : "0.0000"}
                          </div>
                        </td>
                        <td style={{ ...s.td, textAlign: "center" }}>
                          <button
                            type="button"
                            style={s.btnDanger}
                            onClick={() => handleRemoveDimensionRow(index)}
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div style={{
              display: "flex",
              gap: "10px",
              flexWrap: "wrap",
              backgroundColor: "#f9fafb",
              border: "1px solid #e5e7eb",
              borderRadius: "4px",
              padding: "12px",
              marginBottom: "15px",
              marginTop: "10px"
            }}>
              <div style={{ flex: "1 1 120px", display: "flex", flexDirection: "column" }}>
                <span style={{ fontSize: "10px", fontWeight: 700, color: "#6b7280", textTransform: "uppercase" }}>Total Packages</span>
                <span style={{ fontSize: "14px", fontWeight: 700, color: "#111827" }}>{totalPackages}</span>
              </div>
              <div style={{ flex: "1 1 120px", display: "flex", flexDirection: "column" }}>
                <span style={{ fontSize: "10px", fontWeight: 700, color: "#6b7280", textTransform: "uppercase" }}>Total Net Wt (Kg)</span>
                <span style={{ fontSize: "14px", fontWeight: 700, color: "#111827" }}>{totalNetWeight.toFixed(2)}</span>
              </div>
              <div style={{ flex: "1 1 120px", display: "flex", flexDirection: "column" }}>
                <span style={{ fontSize: "10px", fontWeight: 700, color: "#6b7280", textTransform: "uppercase" }}>Total Gross Wt (Kg)</span>
                <span style={{ fontSize: "14px", fontWeight: 700, color: "#111827" }}>{totalGrossWeight.toFixed(2)}</span>
              </div>
              <div style={{ flex: "1 1 120px", display: "flex", flexDirection: "column" }}>
                <span style={{ fontSize: "10px", fontWeight: 700, color: "#6b7280", textTransform: "uppercase" }}>Total Volume (CBM)</span>
                <span style={{ fontSize: "14px", fontWeight: 700, color: "#16408f" }}>{totalVolumeCbm.toFixed(4)}</span>
              </div>
              <div style={{ flex: "1 1 120px", display: "flex", flexDirection: "column" }}>
                <span style={{ fontSize: "10px", fontWeight: 700, color: "#6b7280", textTransform: "uppercase" }}>
                  Volumetric Wt ({formData.shipment_type && formData.shipment_type.includes("Air") ? "Air: 1:167" : "Sea: 1:1000"})
                </span>
                <span style={{ fontSize: "14px", fontWeight: 700, color: "#4b5563" }}>{volumetricWeight.toFixed(2)} Kg</span>
              </div>
              <div style={{ flex: "1 1 150px", display: "flex", flexDirection: "column", borderLeft: "2px solid #16408f", paddingLeft: "10px" }}>
                <span style={{ fontSize: "10px", fontWeight: 700, color: "#16408f", textTransform: "uppercase" }}>Chargeable Weight</span>
                <span style={{ fontSize: "16px", fontWeight: 800, color: "#16408f" }}>{chargeableWeight.toFixed(2)} Kg</span>
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
