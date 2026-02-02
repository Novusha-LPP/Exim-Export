import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import ConfirmDialog from "../../gallery/ConfirmDialog.js";
import DateInput from "../../common/DateInput.js";
import { currencyList } from "../../../utils/masterList.js";

// --- Ultra-Compact Enterprise Styles ---

const s = {
  wrapper: {
    fontFamily: "'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    backgroundColor: "#f0f2f5",
    padding: "20px",
    minHeight: "80vh",
    color: "#1f2937",
    fontSize: "12px",
    fontWeight: "700",
  },
  container: {
    maxWidth: "1100px",
    margin: "0 auto",
    fontWeight: "700",
  },
  pageHeader: {
    marginBottom: "15px",
    fontWeight: "700",
  },
  pageTitle: {
    fontSize: "18px",
    fontWeight: "700",
    color: "#111827",
    margin: "0 0 4px 0",
    fontWeight: "700",
  },
  subTitle: {
    fontSize: "12px",
    color: "#6b7280",
    margin: 0,
    fontWeight: "700",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: "4px",
    boxShadow: "0 1px 2px rgba(0,0,0,0.06)",
    marginBottom: "10px",
    border: "1px solid #e5e7eb",
    position: "relative",
    fontWeight: "700",
  },
  cardHeader: {
    padding: "8px 15px",
    borderBottom: "1px solid #f3f4f6",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    backgroundColor: "#fff",
    borderRadius: "4px 4px 0 0",
    fontWeight: "700",
  },
  cardTitle: {
    fontWeight: "700",
    fontSize: "12px",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    color: "#374151",
    fontWeight: "700",
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
    fontWeight: "700",
  },
  label: {
    fontSize: "11px",
    fontWeight: "600",
    color: "#4b5563",
    marginBottom: "2px",
    fontWeight: "700",
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
    fontWeight: "700",
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
    fontWeight: "700",
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
    fontWeight: "700",
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
    fontWeight: "700",
  },
  comboWrapper: {
    position: "relative",
    width: "100%",
    fontWeight: "700",
  },
  comboIcon: {
    position: "absolute",
    right: "8px",
    top: "50%",
    transform: "translateY(-50%)",
    fontSize: "10px",
    color: "#6b7280",
    pointerEvents: "none",
    fontWeight: "700",
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
    fontWeight: "700",
  },
  dropdownItem: {
    padding: "4px 8px",
    cursor: "pointer",
    borderBottom: "1px solid #f3f4f6",
    display: "flex",
    flexDirection: "column",
    fontWeight: "500",
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
    fontWeight: "700",
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
    fontWeight: "700",
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
    fontWeight: "700",
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
    fontWeight: "700",
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
    fontWeight: "700",
  },
  iconBox: {
    width: "20px",
    height: "20px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "3px",
    fontSize: "12px",
    fontWeight: "700",
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
    fontWeight: "700",
  },
};

// helper
const toUpper = (val) => (typeof val === "string" ? val.toUpperCase() : val);

function useConsigneeCountryDropdown(value, onChange, apiBase) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value || "");
  const [opts, setOpts] = useState([]);
  const [active, setActive] = useState(-1);
  const wrapRef = useRef(null);
  const keepOpen = useRef(false);

  useEffect(() => {
    setQuery(value || "");
  }, [value]);

  // fetch from your /countries API
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
  }, [open, query, apiBase]);

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

  const filtered = opts; // server already filters

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

function ConsigneeCountryField({ value, onChange }) {
  const apiBase = import.meta.env.VITE_API_STRING;
  const d = useConsigneeCountryDropdown(value, onChange, apiBase);

  return (
    <div style={s.col} ref={d.wrapRef}>
      <label style={s.label}>Country</label>
      <div style={s.comboWrapper}>
        <input
          style={s.inputWithIcon}
          placeholder="TYPE TO SEARCH COUNTRY"
          autoComplete="off"
          value={toUpper(d.query)}
          onChange={(e) => d.handleChange(e.target.value)}
          onFocus={d.handleFocus}
          onBlur={d.handleBlur}
          // 🔥 ADD THIS
          onKeyDown={(e) => {
            if (e.key === "Tab") {
              if (d.open) {
                if (d.active >= 0 && d.filtered[d.active]) {
                  d.selectIndex(d.active);
                } else if (d.filtered.length === 1) {
                  d.selectIndex(0);
                } else {
                  d.setOpen(false);
                }
              }
              const trimmed = d.query.trim();
              if (trimmed !== d.query) {
                const upper = toUpper(trimmed);
                d.setQuery(upper);
                // Since this component uses a parent onChange for the value string
                onChange(upper);
              }
              return;
            }

            if (!d.open) return;
            if (e.key === "ArrowDown") {
              e.preventDefault();
              d.setActive((a) =>
                Math.min(d.filtered.length - 1, a < 0 ? 0 : a + 1),
              );
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              d.setActive((a) => Math.max(0, a - 1));
            } else if (e.key === "Enter") {
              e.preventDefault(); // 👈 Prevent form submission
              if (d.active >= 0) {
                d.selectIndex(d.active);
              }
            } else if (e.key === "Escape") {
              e.preventDefault();
              d.setOpen(false);
            }
          }}
        />
        <span style={s.comboIcon}>▼</span>
        {d.open && d.filtered.length > 0 && (
          <div style={s.dropdownList}>
            {d.filtered.map((opt, i) => (
              <div
                key={opt._id || opt.countryCode || opt.countryName || i}
                style={{
                  ...s.dropdownItem,
                  backgroundColor: i === d.active ? "#f9fafb" : "#fff",
                }}
                onMouseDown={() => d.selectIndex(i)}
                onMouseEnter={() => d.setActive(i)}
              >
                {toUpper(opt.countryName || opt.country_name)}
                {opt.countryCode && (
                  <span
                    style={{ marginLeft: 6, color: "#6b7280", fontSize: 10 }}
                  >
                    ({opt.countryCode.toUpperCase()})
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Gateway Port dropdown (directory-backed)

function useCurrencyDropdown(value, onChange) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value || "");
  const [active, setActive] = useState(-1);
  const wrapRef = useRef(null);
  const keepOpen = useRef(false);

  useEffect(() => {
    setQuery(value || "");
  }, [value]);

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

  const filtered = (currencyList || []).filter((c) => {
    const code = c.code || "";
    const desc = c.description || "";
    const haystack = `${code} ${desc}`.toUpperCase();
    const needle = (query || "").toUpperCase();
    return !needle || haystack.includes(needle);
  });

  function selectIndex(i) {
    const item = filtered[i];
    if (!item) return;
    const val = item.code; // store only code in form
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

function CurrencyDropdown({
  label,
  value,
  onChange,
  placeholder = "SELECT CURRENCY",
}) {
  const d = useCurrencyDropdown(value, onChange);

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
            {d.filtered.map((c, i) => (
              <div
                key={c.code}
                style={s.dropdownItem}
                onMouseDown={() => d.selectIndex(i)}
                onMouseEnter={() => d.setActive(i)}
              >
                <div style={{ fontWeight: 600, color: "#111827" }}>
                  {c.code} – {c.description}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function useGatewayPortDropdown(value, onChange, priorityList = []) {
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
      searchVal,
    )}`;
    const t = setTimeout(async () => {
      try {
        const res = await fetch(url);
        const data = await res.json();
        let options = Array.isArray(data?.data)
          ? data.data
          : Array.isArray(data)
            ? data
            : [];

        // Apply Priority Sorting
        if (priorityList.length > 0) {
          options.sort((a, b) => {
            const nameA = (a.name || "").toUpperCase();
            const nameB = (b.name || "").toUpperCase();

            // Find index in priority list (checking if name INCLUDES priority keyword)
            const pIndexA = priorityList.findIndex((p) =>
              nameA.includes(p.toUpperCase()),
            );
            const pIndexB = priorityList.findIndex((p) =>
              nameB.includes(p.toUpperCase()),
            );

            // Both in priority list -> sort by order in priority list
            if (pIndexA !== -1 && pIndexB !== -1) return pIndexA - pIndexB;
            // Only A in priority -> A first
            if (pIndexA !== -1) return -1;
            // Only B in priority -> B first
            if (pIndexB !== -1) return 1;
            // Neither -> keep original order
            return 0;
          });
        }

        setOpts(options);
      } catch {
        setOpts([]);
      }
    }, 220);
    return () => clearTimeout(t);
  }, [open, query, apiBase, priorityList]); // added priorityList dependency

  useEffect(() => {
    function close(e) {
      if (
        !keepOpen.current &&
        wrapRef.current &&
        !wrapRef.current.contains(e.target)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  function selectIndex(i) {
    const item = opts[i];
    if (!item) return;
    const code = (item.unece_code || item.uneceCode || "").toUpperCase();
    const name = (item.name || "").toUpperCase();
    const val = code ? `${code} - ${name}`.trim() : name;
    setQuery(val);
    onChange(val);
    setOpen(false);
    setActive(-1);
  }

  const filtered = opts.filter((p) => {
    const code = p.unece_code || p.uneceCode || "";
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

function GatewayPortDropdown({
  label,
  value,
  onChange,
  placeholder = "SELECT PORT",
  priorityList = [],
}) {
  const d = useGatewayPortDropdown(value, onChange, priorityList);
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
          // 🔥 ADD THIS onKeyDown handler to prevent form submission
          onKeyDown={(e) => {
            if (e.key === "Tab") {
              if (d.open) {
                if (d.active >= 0 && d.filtered[d.active]) {
                  d.selectIndex(d.active);
                } else if (d.filtered.length === 1) {
                  d.selectIndex(0);
                } else {
                  d.setOpen(false);
                }
              }
              const trimmed = d.query.trim();
              if (trimmed !== d.query) {
                const upper = toUpper(trimmed);
                d.setQuery(upper);
                onChange(upper);
              }
              return;
            }

            if (!d.open) return;

            if (e.key === "Enter") {
              e.preventDefault(); // 👈 Prevent form submission
              if (d.active >= 0) {
                d.selectIndex(d.active);
              }
            } else if (e.key === "ArrowDown") {
              e.preventDefault();
              d.setActive((a) =>
                Math.min(d.filtered.length - 1, a < 0 ? 0 : a + 1),
              );
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              d.setActive((a) => Math.max(0, a - 1));
            } else if (e.key === "Escape") {
              e.preventDefault();
              d.setOpen(false);
            }
          }}
        />
        <span style={s.comboIcon}>▼</span>
        {d.open && d.filtered.length > 0 && (
          <div style={s.dropdownList}>
            {d.filtered.map((p, i) => (
              <div
                key={p._id || p.unece_code || p.name || i}
                style={{
                  ...s.dropdownItem,
                  backgroundColor: i === d.active ? "#f9fafb" : "#fff",
                }}
                onMouseDown={() => d.selectIndex(i)}
                onMouseEnter={() => d.setActive(i)}
              >
                <div style={{ fontWeight: 600, color: "#111827" }}>
                  {(p.unece_code || p.uneceCode || "").toUpperCase()} -{" "}
                  {(p.name || "").toUpperCase()}
                </div>
                {(p.port_type || p.portType) && (
                  <div style={{ fontSize: 10, color: "#6b7280" }}>
                    TYPE: {(p.port_type || p.portType).toUpperCase()}
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

// Custom House options grouped by location with branch codes
const CUSTOM_HOUSE_OPTIONS = [
  {
    group: "Ahmedabad", branchCode: "AMD", items: [
      { value: "AHMEDABAD AIR CARGO", label: "Ahmedabad Air Cargo", code: "INAMD4" },
      { value: "ICD SABARMATI, AHMEDABAD", label: "ICD Sabarmati, Ahmedabad", code: "INSBI6" },
      { value: "ICD SACHANA", label: "ICD SACHANA", code: "INJKA6" },
      { value: "ICD VIROCHAN NAGAR", label: "ICD Virochan Nagar", code: "INVCN6" },
      { value: "THAR DRY PORT", label: "THAR DRY PORT", code: "INSAU6" },
    ]
  },
  {
    group: "Baroda", branchCode: "BRD", items: [
      { value: "ANKLESHWAR ICD", label: "ANKLESHWAR ICD", code: "INAKV6" },
      { value: "ICD VARNAMA", label: "ICD VARNAMA", code: "INVRM6" },
    ]
  },
  {
    group: "Gandhidham", branchCode: "GIM", items: [
      { value: "MUNDRA SEA", label: "MUNDRA SEA", code: "INMUN1" },
      { value: "KANDLA SEA", label: "KANDLA SEA", code: "INIXY1" },
    ]
  },
  {
    group: "Cochin", branchCode: "COK", items: [
      { value: "COCHIN AIR CARGO", label: "COCHIN AIR CARGO", code: "INCOK4" },
      { value: "COCHIN SEA", label: "COCHIN SEA", code: "INCOK1" },
    ]
  },
  {
    group: "Hazira", branchCode: "HAZ", items: [
      { value: "HAZIRA", label: "HAZIRA", code: "INHZA1" },
    ]
  },
];

import { createPortal } from "react-dom";

function CustomHouseDropdownLocal({ label, value, onChange, branchCode = "" }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value || "");
  const [active, setActive] = useState(-1);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });
  const wrapRef = useRef(null);
  const menuRef = useRef(null);
  const keepOpen = useRef(false);

  useEffect(() => {
    setQuery(value || "");
  }, [value]);

  const updateCoords = () => {
    if (wrapRef.current) {
      const rect = wrapRef.current.getBoundingClientRect();
      setCoords({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width,
      });
    }
  };

  useEffect(() => {
    if (open) {
      updateCoords();
      window.addEventListener("scroll", updateCoords, true);
      window.addEventListener("resize", updateCoords);
    }
    return () => {
      window.removeEventListener("scroll", updateCoords, true);
      window.removeEventListener("resize", updateCoords);
    };
  }, [open]);

  useEffect(() => {
    function close(e) {
      if (
        !keepOpen.current &&
        wrapRef.current &&
        !wrapRef.current.contains(e.target) &&
        (!menuRef.current || !menuRef.current.contains(e.target))
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  // Filter options by branch code first
  const branchOptions = branchCode
    ? CUSTOM_HOUSE_OPTIONS.filter(g => g.branchCode === branchCode.toUpperCase())
    : CUSTOM_HOUSE_OPTIONS;

  // Flatten and filter options by query
  const filteredGroups = branchOptions.map(group => ({
    ...group,
    items: group.items.filter(item => {
      const needle = (query || "").toUpperCase();
      return !needle ||
        item.value.toUpperCase().includes(needle) ||
        item.label.toUpperCase().includes(needle) ||
        (item.code && item.code.toUpperCase().includes(needle)) ||
        group.group.toUpperCase().includes(needle);
    }),
  })).filter(group => group.items.length > 0);

  // Flat list for keyboard navigation
  const flatFiltered = [];
  filteredGroups.forEach(group => {
    group.items.forEach(item => flatFiltered.push(item));
  });

  const handleSelect = (item) => {
    const val = item.value.toUpperCase();
    setQuery(val);
    onChange(val);
    setOpen(false);
    setActive(-1);
  };

  let itemIndex = -1;

  return (
    <div style={s.col} ref={wrapRef}>
      <label style={s.label}>{label}</label>
      <div style={s.comboWrapper}>
        <input
          style={s.inputWithIcon}
          value={toUpper(query)}
          onChange={(e) => {
            const v = e.target.value.toUpperCase();
            setQuery(v);
            onChange(v);
            setOpen(true);
          }}
          onFocus={() => {
            setOpen(true);
            setActive(-1);
            keepOpen.current = true;
          }}
          onBlur={() => {
            setTimeout(() => {
              keepOpen.current = false;
            }, 100);
          }}
          placeholder="SELECT CUSTOM HOUSE"
          autoComplete="off"
          onKeyDown={(e) => {
            if (e.key === "Tab") {
              if (open && active >= 0 && flatFiltered[active]) {
                handleSelect(flatFiltered[active]);
              } else if (flatFiltered.length === 1) {
                handleSelect(flatFiltered[0]);
              }
              setOpen(false);
              return;
            }
            if (e.key === "Enter") {
              e.preventDefault();
              if (active >= 0 && flatFiltered[active]) {
                handleSelect(flatFiltered[active]);
              }
            } else if (e.key === "ArrowDown") {
              e.preventDefault();
              setOpen(true);
              setActive((a) => Math.min(flatFiltered.length - 1, a < 0 ? 0 : a + 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((a) => Math.max(0, a - 1));
            } else if (e.key === "Escape") {
              e.preventDefault();
              setOpen(false);
            }
          }}
        />
        <span style={s.comboIcon}>▼</span>
        {open && filteredGroups.length > 0 &&
          createPortal(
            <div
              ref={menuRef}
              style={{
                ...s.dropdownList,
                position: "absolute",
                top: coords.top + 2,
                left: coords.left,
                width: Math.max(coords.width, 200),
                zIndex: 1000000,
              }}
            >
              {filteredGroups.map((group) => (
                <div key={group.group}>
                  <div style={{
                    padding: "4px 8px",
                    fontSize: 9,
                    fontWeight: 700,
                    color: "#1976d2",
                    background: "#f0f7ff",
                    borderBottom: "1px solid #e3e7ee",
                    textTransform: "uppercase",
                    letterSpacing: 0.5,
                  }}>
                    {group.group}
                  </div>
                  {group.items.map((item) => {
                    itemIndex++;
                    const currentIndex = itemIndex;
                    return (
                      <div
                        key={item.value}
                        style={{
                          ...s.dropdownItem,
                          paddingLeft: 18,
                          backgroundColor: currentIndex === active ? "#f9fafb" : "#fff",
                        }}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          handleSelect(item);
                        }}
                        onMouseEnter={() => setActive(currentIndex)}
                      >
                        <div style={{ fontWeight: 600, color: "#111827" }}>
                          {item.label.toUpperCase()} {item.code && <span style={{ color: '#888', marginLeft: 4, fontWeight: 400 }}>({item.code})</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>,
            document.body,
          )}
      </div>
    </div>
  );
}

const AddExJobs = ({ onJobCreated }) => {
  const emptyConsignee = {
    consignee_name: "",
    consignee_address: "",
    consignee_country: "",
  };
  const [formData, setFormData] = useState({
    branch_code: "AMD", // 👈 default
    exporter: "",
    job_owner: "",
    port_of_loading: "",
    consignees: [{ ...emptyConsignee }],
    ieCode: "",
    panNo: "",
    job_no: "",
    consignmentType: "FCL",
    discharge_country: "",
    custom_house: "",
    total_no_of_pkgs: "",
    gross_weight_kg: "",
    net_weight_kg: "",
    status: "Pending",
    year: "25-26",
    transportMode: "SEA",
    goods_stuffed_at: "",
    job_date: new Date().toISOString().split("T")[0],
  });

  const [organizations, setOrganizations] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const wrapperRef = useRef(null);

  // Consignee autocomplete state
  const [consigneeList, setConsigneeList] = useState([]);
  const [activeConsigneeIdx, setActiveConsigneeIdx] = useState(-1);
  const [showConsigneeMenu, setShowConsigneeMenu] = useState(false);
  const [filteredConsignees, setFilteredConsignees] = useState([]);
  const [keyboardActive, setKeyboardActive] = useState(-1);
  const consigneeMenuRef = useRef(null);

  // Users for Job Owner
  const [users, setUsers] = useState([]);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await axios.get(
          `${import.meta.env.VITE_API_STRING}/export-jobs-module-users`
        );
        if (res.data.success) {
          setUsers(res.data.data || []);
        } else if (Array.isArray(res.data.data)) {
          setUsers(res.data.data);
        }
      } catch (e) {
        console.error("Error fetching users", e);
      }
    };
    fetchUsers();
  }, []);

  // inside AddExJobs.jsx, before component
  useEffect(() => {
    const isAir = formData.consignmentType === "AIR";
    setFormData((prev) => ({
      ...prev,
      transportMode: isAir ? "AIR" : "SEA",
    }));
  }, [formData.consignmentType]);

  useEffect(() => {
    const stuffed = toUpper(formData.goods_stuffed_at || "");
    const type = toUpper(formData.consignmentType || "");
    if (stuffed === "FACTORY" && type !== "FCL") {
      setFormData((prev) => ({ ...prev, consignmentType: "FCL" }));
    }
    if (type === "LCL" && stuffed !== "DOCK") {
      setFormData((prev) => ({ ...prev, goods_stuffed_at: "DOCK" }));
    }
  }, [formData.goods_stuffed_at, formData.consignmentType]);

  const branchOptions = [
    { code: "BRD", label: "BRD - BARODA" },
    { code: "GIM", label: "GIM - GANDHIDHAM" },
    { code: "HAZ", label: "HAZ - HAZIRA" },
    { code: "AMD", label: "AMD - AHMEDABAD" },
    { code: "COK", label: "COK - COCHIN" },
  ];

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Fetch consignees for autocomplete
  useEffect(() => {
    const fetchConsignees = async () => {
      try {
        const res = await axios.get(
          `${import.meta.env.VITE_API_STRING}/dsr/consignees`,
        );
        if (res.data?.success && Array.isArray(res.data.data)) {
          setConsigneeList(res.data.data);
        }
      } catch (e) {
        console.error("Error fetching consignees", e);
      }
    };
    fetchConsignees();
  }, []);

  // Close consignee menu on click outside
  useEffect(() => {
    const close = (e) => {
      if (
        consigneeMenuRef.current &&
        !consigneeMenuRef.current.contains(e.target)
      ) {
        setShowConsigneeMenu(false);
        setActiveConsigneeIdx(-1);
      }
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target))
        setShowDropdown(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const fetchOrgs = async () => {
      try {
        setLoading(true);
        const response = await axios.get(
          `${import.meta.env.VITE_API_STRING}/directory`,
          { params: { limit: 1000 } },
        );
        if (response.data.success) {
          const allOrgs = response.data.data;
          const filtered = formData.exporter
            ? allOrgs.filter((o) =>
              (o.organization || "")
                .toUpperCase()
                .includes(formData.exporter.toUpperCase()),
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
  }, [formData.exporter]);

  const handleInputChange = (field, value) => {
    // Exempt job_owner from uppercasing as it maps to usernames (often case-sensitive)
    const processedValue = field === "job_owner" ? value : toUpper(value);
    setFormData((prev) => ({ ...prev, [field]: processedValue }));
  };

  const handleDirectorySelect = (org) => {
    const ieCode = org.registrationDetails?.ieCode || "";
    const panNo = org.registrationDetails?.panNo || "";

    const displayValue = ieCode || panNo;

    setFormData((prev) => ({
      ...prev,
      exporter: toUpper(org.organization),
      ieCode: toUpper(displayValue), // 👈 match state + input
      panNo: toUpper(panNo),
    }));

    setShowDropdown(false);
    showToast(
      ieCode
        ? "Exporter details populated!"
        : "PAN auto-filled in IE Code field",
    );
  };

  const handleConsigneeChange = (idx, field, val) => {
    const updated = [...formData.consignees];
    updated[idx][field] = toUpper(val);
    setFormData({ ...formData, consignees: updated });
  };

  const handleConsigneeNameChange = (idx, e) => {
    const val = toUpper(e.target.value);
    handleConsigneeChange(idx, "consignee_name", val);

    // Filter list
    const filtered = consigneeList.filter((c) =>
      toUpper(c.consignee_name).includes(val),
    );
    setFilteredConsignees(filtered);
    setActiveConsigneeIdx(idx);
    setShowConsigneeMenu(true);
    setKeyboardActive(-1);
  };

  const handleSelectConsignee = (idx, consignee) => {
    const updated = [...formData.consignees];
    updated[idx].consignee_name = toUpper(consignee.consignee_name);
    updated[idx].consignee_address = toUpper(consignee.consignee_address || "");
    updated[idx].consignee_country = toUpper(consignee.consignee_country || "");
    setFormData({ ...formData, consignees: updated });

    setShowConsigneeMenu(false);
    setActiveConsigneeIdx(-1);
  };

  const addConsignee = () =>
    setFormData((p) => ({
      ...p,
      consignees: [...p.consignees, { ...emptyConsignee }],
    }));

  const removeConsignee = (idx) => {
    if (formData.consignees.length === 1) return;
    setFormData((p) => ({
      ...p,
      consignees: p.consignees.filter((_, i) => i !== idx),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.exporter) {
      showToast("Exporter Name is required", "error");
      return;
    }
    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_STRING}/jobs/add-job-exp-man`,
        formData,
      );
      if (response.data.success) {
        showToast(`Job Created! No: ${response.data.job.job_no}`);
        handleClear();
        if (onJobCreated) onJobCreated();
      }
    } catch (e) {
      showToast("Failed to create job", "error");
    }
  };

  const handleClear = () => {
    setFormData({
      branch_code: "AMD",
      exporter: "",
      job_owner: "",
      port_of_loading: "",
      consignees: [{ ...emptyConsignee }],
      ieCode: "",
      pan_no: "",
      job_no: "",
      consignmentType: "FCL",
      discharge_country: "",
      custom_house: "", // 👈 reset
      gross_weight_kg: "",
      net_weight_kg: "",
      status: "Pending",
      year: "25-26",
      transportMode: "SEA",
      goods_stuffed_at: "",
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

        <form onSubmit={handleSubmit}>
          {/* 1. Organization */}
          <div style={{ ...s.card, ...s.borderBlue }}>
            <div style={s.cardHeader}>
              <span
                style={{
                  ...s.iconBox,
                  backgroundColor: "#eff6ff",
                  color: "#2563eb",
                }}
              >
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
                      value={formData.exporter}
                      onChange={(e) => {
                        handleInputChange("exporter", e.target.value);
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
                              (e.currentTarget.style.backgroundColor =
                                "#f9fafb")
                              }
                              onMouseLeave={(e) =>
                                (e.currentTarget.style.backgroundColor = "#fff")
                              }
                              onMouseDown={() => handleDirectorySelect(org)}
                            >
                              <div
                                style={{ fontWeight: "600", color: "#1f2937" }}
                              >
                                {org.organization}
                              </div>
                              <div
                                style={{ fontSize: "10px", color: "#6b7280" }}
                              >
                                IE Code:{" "}
                                {org.registrationDetails?.ieCode || "N/A"}
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
                  <label style={s.label}>
                    IE Code / PAN *
                    {formData.ieCode && (
                      <span
                        style={{
                          fontSize: "10px",
                          color: "#10b981",
                          marginLeft: "4px",
                        }}
                      >
                        ✓ Auto-filled
                      </span>
                    )}
                  </label>
                  <input
                    style={{
                      ...s.input,
                      backgroundColor: formData.ieCode ? "#f9fafb" : "#fff",
                      ...(formData.ieCode && { cursor: "not-allowed" }),
                    }}
                    value={formData.ieCode}
                    placeholder="Enter IE Code/PAN or select exporter"
                    onChange={(e) => {
                      if (!formData.ieCode) {
                        handleInputChange(
                          "ieCode",
                          e.target.value.replace(/\D/g, ""),
                        );
                      }
                    }}
                    maxLength={10}
                    readOnly={!!formData.ieCode}
                    required
                  />
                </div>

                <div style={s.col}>
                  <label style={s.label}>Job Date</label>
                  <DateInput
                    style={s.input}
                    value={formData.job_date || ""}
                    onChange={(e) =>
                      handleInputChange("job_date", e.target.value)
                    }
                  />
                </div>

                <div style={{ ...s.col, maxWidth: "160px" }}>
                  <label style={s.label}>Job Owner</label>
                  <select
                    style={s.select}
                    value={formData.job_owner}
                    onChange={(e) => handleInputChange("job_owner", e.target.value)}
                  >
                    <option value="">Select Owner</option>
                    {users.map((u) => (
                      <option key={u.username} value={u.username}>
                        {u.fullName}
                      </option>
                    ))}
                  </select>
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
                <div style={{ ...s.col, maxWidth: "160px" }}>
                  <label style={s.label}>Branch</label>
                  <select
                    style={s.select}
                    value={formData.branch_code}
                    onChange={(e) =>
                      handleInputChange("branch_code", e.target.value)
                    }
                  >
                    {branchOptions.map((b) => (
                      <option key={b.code} value={b.code}>
                        {b.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* 2. Consignees */}
          <div style={{ ...s.card, ...s.borderTeal }}>
            <div style={s.cardHeader}>
              <span
                style={{
                  ...s.iconBox,
                  backgroundColor: "#ecfeff",
                  color: "#0891b2",
                }}
              >
                👥
              </span>
              <span style={s.cardTitle}>Party Details (Consignees)</span>
            </div>
            <div style={s.cardBody}>
              {formData.consignees.map((item, idx) => (
                <div key={idx} style={s.consigneeRow}>
                  <div
                    style={{ ...s.col, flex: 2, position: "relative" }}
                    ref={idx === activeConsigneeIdx ? consigneeMenuRef : null}
                  >
                    <label style={s.label}>Consignee Name *</label>
                    <input
                      style={s.input}
                      placeholder="Name"
                      value={item.consignee_name}
                      onChange={(e) => handleConsigneeNameChange(idx, e)}
                      onFocus={() => {
                        const val = toUpper(item.consignee_name);
                        const filtered = consigneeList.filter((c) =>
                          toUpper(c.consignee_name).includes(val),
                        );
                        setFilteredConsignees(filtered);
                        setActiveConsigneeIdx(idx);
                        setShowConsigneeMenu(true);
                      }}
                      onKeyDown={(e) => {
                        if (activeConsigneeIdx !== idx || !showConsigneeMenu)
                          return;
                        if (e.key === "ArrowDown") {
                          e.preventDefault();
                          setKeyboardActive((a) =>
                            Math.min(filteredConsignees.length - 1, a + 1),
                          );
                        } else if (e.key === "ArrowUp") {
                          e.preventDefault();
                          setKeyboardActive((a) => Math.max(0, a - 1));
                        } else if (e.key === "Enter" && keyboardActive >= 0) {
                          e.preventDefault();
                          handleSelectConsignee(
                            idx,
                            filteredConsignees[keyboardActive],
                          );
                        } else if (e.key === "Escape") {
                          setShowConsigneeMenu(false);
                        }
                      }}
                      required
                    />
                    {showConsigneeMenu &&
                      activeConsigneeIdx === idx &&
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
                            zIndex: 9999,
                            maxHeight: 150,
                            overflow: "auto",
                            boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                            marginTop: 2,
                          }}
                        >
                          {filteredConsignees.map((c, i) => (
                            <div
                              key={i}
                              style={{
                                padding: "4px 8px",
                                cursor: "pointer",
                                fontSize: 11,
                                background:
                                  keyboardActive === i ? "#e5edff" : "#fff",
                                fontWeight: keyboardActive === i ? 600 : 400,
                                borderBottom: "1px solid #f3f4f6",
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
                  <div style={{ ...s.col, flex: 3 }}>
                    <label style={s.label}>Address</label>
                    <input
                      style={s.input}
                      placeholder="Full Address"
                      value={item.consignee_address}
                      onChange={(e) =>
                        handleConsigneeChange(
                          idx,
                          "consignee_address",
                          e.target.value,
                        )
                      }
                    />
                  </div>
                  <div style={{ ...s.col, flex: 1 }}>
                    <ConsigneeCountryField
                      value={item.consignee_country}
                      onChange={(val) =>
                        handleConsigneeChange(idx, "consignee_country", val)
                      }
                    />
                  </div>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-end",
                      paddingBottom: "1px",
                    }}
                  >
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
              <span
                style={{
                  ...s.iconBox,
                  backgroundColor: "#eff6ff",
                  color: "#2563eb",
                }}
              >
                🚢
              </span>
              <span style={s.cardTitle}>Shipment Details</span>
            </div>
            {/* Shipment Details card body */}
            <div style={s.cardBody}>
              <div style={s.row}>
                <div style={{ ...s.col, maxWidth: "120px" }}>
                  <label style={s.label}>Consignment Type</label>
                  <select
                    style={s.select}
                    value={formData.consignmentType}
                    onChange={(e) =>
                      handleInputChange("consignmentType", e.target.value)
                    }
                  >
                    <option value="FCL">FCL</option>
                    <option value="LCL">LCL</option>
                    <option value="AIR">AIR</option>
                    <option value="Break Bulk">Break Bulk</option>
                  </select>
                </div>

                <div style={{ ...s.col, maxWidth: "120px" }}>
                  <label style={s.label}>Transport</label>
                  <input
                    style={{ ...s.input, backgroundColor: "#f9fafb" }}
                    value={formData.transportMode}
                    readOnly
                  />
                </div>

                <div style={{ ...s.col, maxWidth: "120px" }}>
                  <label style={s.label}>Goods Stuffed At</label>
                  <select
                    style={s.select}
                    value={formData.goods_stuffed_at}
                    onChange={(e) =>
                      handleInputChange("goods_stuffed_at", e.target.value)
                    }
                  >
                    <option value="">SELECT</option>
                    {toUpper(formData.consignmentType) !== "LCL" && (
                      <option value="FACTORY">FACTORY</option>
                    )}
                    <option value="DOCK">DOCK</option>
                  </select>
                </div>

                {/* Custom House with static grouped options */}
                <CustomHouseDropdownLocal
                  label="Custom House"
                  value={formData.custom_house}
                  onChange={(val) => handleInputChange("custom_house", val)}
                  branchCode={formData.branch_code}
                />

                <GatewayPortDropdown
                  label="Port of Loading"
                  value={formData.port_of_loading}
                  onChange={(val) => handleInputChange("port_of_loading", val)}
                />
              </div>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              marginTop: "15px",
            }}
          >
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
