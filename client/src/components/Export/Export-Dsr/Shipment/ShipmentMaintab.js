import React, { useState, useRef, useCallback, useEffect } from "react";
import { Alert } from "@mui/material";
import DateInput from "../../../common/DateInput.js";
import { states } from "../../../../utils/masterList";
import { natureOfCargo } from "../../../../utils/masterList";
import { unitCodes } from "../../../../utils/masterList";
import { priorityFilter } from "../../../../utils/filterUtils";

const apiBase = import.meta.env.VITE_API_STRING;

const styles = {
  page: {
    fontFamily: "'Segoe UI', Roboto, Arial, sans-serif",
    fontSize: 13,
    color: "#1e2e38",
  },
  row: { display: "flex", gap: 20, alignItems: "stretch", marginBottom: 0 },
  col: { flex: 1, minWidth: 0 },
  card: {
    background: "#fff",
    border: "1.5px solid #e2e8f0",
    borderRadius: 7,
    padding: 13,
    marginBottom: 18,
  },
  sectionTitle: {
    fontWeight: 700,
    color: "#16408f",
    fontSize: 12,
    marginBottom: 10,
    letterSpacing: 1.3,
  },
  split: { display: "flex", gap: 8 },
  half: { flex: 1, minWidth: 0 },
  field: { marginBottom: 8 },
  label: {
    fontSize: 11,
    fontWeight: 700,
    color: "#263046",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 1,
  },
  input: {
    width: "100%",
    textTransform: "uppercase",
    fontWeight: 600,
    fontSize: 12,
    padding: "2.5px 8px",
    border: "1px solid #bdc7d1",
    borderRadius: 3,
    height: 26,
    background: "#f7fafc",
    outline: "none",
    boxSizing: "border-box",
  },
  acWrap: { position: "relative" },
  acIcon: {
    position: "absolute",
    right: 8,
    top: 8,
    fontSize: 11,
    color: "#bbbbbb",
    pointerEvents: "none",
  },
  acMenu: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 28,
    background: "#fff",
    border: "1.5px solid #d3e3ea",
    borderRadius: 4,
    zIndex: 13,
    fontSize: 12,
    fontWeight: 600,
    maxHeight: 154,
    overflow: "auto",
  },
  acItem: (active) => ({
    padding: "6px 9px",
    cursor: "pointer",
    textTransform: "uppercase",
    background: active ? "#eaf2fe" : "#fff",
    color: active ? "#18427c" : "#1b2b38",
    fontWeight: active ? 700 : 600,
  }),
  textarea: {
    width: "100%",
    fontSize: 13,
    padding: "5px 8px",
    border: "1.5px solid #ccd6dd",
    borderRadius: 4,
    minHeight: 45,
    background: "#f7fafc",
    resize: "vertical",
    textTransform: "uppercase",
    fontWeight: 600,
  },
};

function toUpper(v) {
  return (typeof v === "string" ? v : "")?.toUpperCase() || "";
}

function useCompactCountryDropdown(fieldName, formik) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(formik.values[fieldName] || "");
  const [opts, setOpts] = useState([]);
  const [active, setActive] = useState(-1);
  const [isTyping, setIsTyping] = useState(false);
  const wrapperRef = useRef();
  const keepOpenOnInput = useRef(false);

  useEffect(() => {
    setQuery(formik.values[fieldName] || "");
  }, [formik.values[fieldName]]);

  useEffect(() => {
    if (!open) {
      setOpts([]);
      return;
    }
    const searchVal = isTyping ? (query || "").trim() : "";
    const t = setTimeout(async () => {
      try {
        const res = await fetch(
          `${apiBase}/countries?search=${encodeURIComponent(searchVal)}`,
        );
        const data = await res.json();
        const list = data?.data || [];
        const sorted = priorityFilter(list, query, (c) =>
          `${c.countryCode || ""} ${c.countryName || c.country_name || ""}`,
        );
        setOpts(sorted);
      } catch {
        setOpts([]);
      }
    }, 220);
    return () => clearTimeout(t);
  }, [open, query, isTyping]);

  useEffect(() => {
    function close(e) {
      if (
        !keepOpenOnInput.current &&
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target)
      ) {
        setOpen(false);
        setIsTyping(false);
      }
    }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  return {
    wrapperRef,
    open,
    setOpen,
    query,
    setQuery,
    opts,
    active,
    setActive,
    handle: (val) => {
      setQuery(val);
      formik.setFieldValue(fieldName, val);
      setOpen(true);
      setIsTyping(true);
    },
    select: (i) => {
      if (opts[i]) {
        setQuery(toUpper(opts[i].countryName || opts[i].country_name));
        formik.setFieldValue(
          fieldName,
          toUpper(opts[i].countryName || opts[i].country_name),
        );
        setOpen(false);
        setActive(-1);
        setIsTyping(false);
      }
    },
    onInputFocus: () => {
      setOpen(true);
      setActive(-1);
      keepOpenOnInput.current = true;
    },
    onInputBlur: () => {
      setTimeout(() => {
        keepOpenOnInput.current = false;
      }, 100);
    },
  };
}

function CountryField({ label, fieldName, placeholder, formik }) {
  const d = useCompactCountryDropdown(fieldName, formik);
  return (
    <div style={styles.field} ref={d.wrapperRef}>
      <div style={styles.label}>{label}</div>
      <div style={styles.acWrap}>
        <input
          style={styles.input}
          placeholder={placeholder}
          autoComplete="off"
          value={toUpper(d.query)}
          onChange={(e) => d.handle(e.target.value.toUpperCase())}
          onFocus={d.onInputFocus}
          onBlur={d.onInputBlur}
          onKeyDown={(e) => {
            if (e.key === "Tab") {
              if (d.open) {
                if (d.active >= 0 && d.opts[d.active]) {
                  d.select(d.active);
                } else if (d.opts.length === 1) {
                  d.select(0);
                } else {
                  d.setOpen(false);
                }
              }
              const trimmed = d.query.trim();
              if (trimmed !== d.query) {
                const upper = toUpper(trimmed);
                d.setQuery(upper);
                formik.setFieldValue(fieldName, upper);
              }
              return;
            }

            if (!d.open) return;
            if (e.key === "ArrowDown")
              d.setActive((a) =>
                Math.min(d.opts.length - 1, a < 0 ? 0 : a + 1),
              );
            else if (e.key === "ArrowUp")
              d.setActive((a) => Math.max(0, a - 1));
            else if (e.key === "Enter" && d.active >= 0) {
              e.preventDefault();
              d.select(d.active);
            } else if (e.key === "Escape") d.setOpen(false);
          }}
        />
        <span style={styles.acIcon}>▼</span>
        {d.open && d.opts.length > 0 && (
          <div style={styles.acMenu}>
            {d.opts.map((opt, i) => (
              <div
                key={opt._id || opt.countryCode || opt.countryName || i}
                style={styles.acItem(d.active === i)}
                onMouseDown={() => d.select(i)}
                onMouseEnter={() => d.setActive(i)}
              >
                {toUpper(opt.countryName || opt.country_name)}
                {opt.countryCode && (
                  <span
                    style={{ marginLeft: 8, color: "#668", fontWeight: 400 }}
                  >
                    ({opt.countryCode})
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

function useGatewayPortDropdown(fieldName, formik) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(formik.values[fieldName] || "");
  const [opts, setOpts] = useState([]);
  const [active, setActive] = useState(-1);
  const [isTyping, setIsTyping] = useState(false);
  const wrapperRef = useRef();
  const apiBase = import.meta.env.VITE_API_STRING;
  const keepOpen = useRef(false);

  useEffect(() => {
    setQuery(formik.values[fieldName] || "");
  }, [formik.values[fieldName]]);

  useEffect(() => {
    if (!open) {
      setOpts([]);
      return;
    }

    const searchVal = isTyping ? (query || "").trim() : "";
    const url = `${apiBase}/gateway-ports/?page=1&status=&type=&search=${encodeURIComponent(
      searchVal,
    )}`;

    const t = setTimeout(async () => {
      try {
        const res = await fetch(url);
        const data = await res.json();
        setOpts(
          Array.isArray(data?.data)
            ? data.data
            : Array.isArray(data)
              ? data
              : [],
        );
      } catch {
        setOpts([]);
      }
    }, 220);

    return () => clearTimeout(t);
  }, [open, query, apiBase, isTyping]);

  useEffect(() => {
    function close(e) {
      if (
        !keepOpen.current &&
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target)
      ) {
        setOpen(false);
        setIsTyping(false);
      }
    }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  function select(i) {
    const item = opts[i];
    if (!item) return;

    const value = `${(item.unece_code || "").toUpperCase()} - ${(
      item.name || ""
    ).toUpperCase()}`.trim();
    setQuery(value);
    formik.setFieldValue(fieldName, value);
    setOpen(false);
    setActive(-1);
    setIsTyping(false);
  }

  return {
    wrapperRef,
    open,
    setOpen,
    query,
    setQuery,
    opts,
    active,
    setActive,
    handle: (val) => {
      const v = val.toUpperCase();
      setQuery(v);
      formik.setFieldValue(fieldName, v);
      setOpen(true);
      setIsTyping(true);
    },
    select,
    onInputFocus: () => {
      setOpen(true);
      setActive(-1);
      keepOpen.current = true;
    },
    onInputBlur: () => {
      setTimeout(() => {
        keepOpen.current = false;
      }, 100);
    },
  };
}

function GatewayPortDropdownField({
  label,
  fieldName,
  formik,
  placeholder = "ENTER GATEWAY PORT",
}) {
  const d = useGatewayPortDropdown(fieldName, formik);

  const filtered = priorityFilter(d.opts, d.query, (p) => {
    const code = p.unece_code || "";
    const name = p.name || "";
    return `${code} ${name}`;
  });

  return (
    <div style={styles.field} ref={d.wrapperRef}>
      <div style={styles.label}>{label}</div>
      <div style={styles.acWrap}>
        <input
          style={styles.input}
          placeholder={placeholder}
          autoComplete="off"
          value={toUpper(d.query)}
          onChange={(e) => d.handle(e.target.value)}
          onFocus={d.onInputFocus}
          onBlur={d.onInputBlur}
          onKeyDown={(e) => {
            if (e.key === "Tab") {
              if (d.open) {
                if (d.active >= 0 && filtered[d.active]) {
                  d.select(d.active);
                } else if (filtered.length === 1) {
                  d.select(0);
                } else {
                  d.setOpen(false);
                }
              }
              const trimmed = d.query.trim();
              if (trimmed !== d.query) {
                const upper = toUpper(trimmed);
                d.setQuery(upper);
                formik.setFieldValue(fieldName, upper);
              }
              return;
            }

            if (!d.open) return;
            if (e.key === "ArrowDown")
              d.setActive((a) =>
                Math.min(filtered.length - 1, a < 0 ? 0 : a + 1),
              );
            else if (e.key === "ArrowUp")
              d.setActive((a) => Math.max(0, a - 1));
            else if (e.key === "Enter" && d.active >= 0) {
              e.preventDefault();
              d.select(d.active);
            } else if (e.key === "Escape") d.setOpen(false);
          }}
        />
        <span style={styles.acIcon}>▼</span>
        {d.open && filtered.length > 0 && (
          <div style={styles.acMenu}>
            {filtered.map((port, i) => (
              <div
                key={port._id || port.unece_code || port.name || i}
                style={styles.acItem(d.active === i)}
                onMouseDown={() => d.select(i)}
                onMouseEnter={() => d.setActive(i)}
              >
                {(port.unece_code || "").toUpperCase()} -{" "}
                {(port.name || "").toUpperCase()}
                {port.port_type && (
                  <span
                    style={{ marginLeft: 6, color: "#667", fontWeight: 400 }}
                  >
                    ({port.port_type.toUpperCase()})
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

function NatureOfCargoDropdownField({
  label,
  fieldName,
  formik,
  natureOptions,
  placeholder = "",
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(formik.values[fieldName] || "");
  const [active, setActive] = useState(-1);
  const wrapperRef = useRef();

  // Filter options by search (always toUpper)
  const filtered = priorityFilter(natureOptions || [], query, (opt) =>
    typeof opt === "string" ? opt : opt.name
  ).slice(0, 10);

  useEffect(() => {
    setQuery(formik.values[fieldName] || "");
  }, [formik.values[fieldName]]);
  useEffect(() => {
    const close = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target))
        setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  function handleSelect(i) {
    const val =
      typeof filtered[i] === "string" ? filtered[i] : filtered[i].name;
    setQuery(toUpper(val));
    formik.setFieldValue(fieldName, toUpper(val));
    setOpen(false);
    setActive(-1);
  }

  return (
    <div style={styles.field} ref={wrapperRef}>
      <div style={styles.label}>{label}</div>
      <div style={styles.acWrap}>
        <input
          style={styles.input}
          placeholder={placeholder}
          autoComplete="off"
          value={toUpper(query)}
          onChange={(e) => {
            setQuery(e.target.value.toUpperCase());
            formik.setFieldValue(fieldName, e.target.value.toUpperCase());
            setOpen(true);
          }}
          onFocus={() => {
            setOpen(true);
            setActive(-1);
          }}
          onKeyDown={(e) => {
            if (e.key === "Tab") {
              if (open) {
                if (active >= 0 && filtered[active]) {
                  handleSelect(active);
                } else if (filtered.length === 1) {
                  handleSelect(0);
                } else {
                  setOpen(false);
                }
              }
              const trimmed = query.trim();
              if (trimmed !== query) {
                const upper = toUpper(trimmed);
                setQuery(upper);
                formik.setFieldValue(fieldName, upper);
              }
              return;
            }

            if (!open) return;
            if (e.key === "ArrowDown")
              setActive((a) =>
                Math.min(filtered.length - 1, a < 0 ? 0 : a + 1),
              );
            else if (e.key === "ArrowUp") setActive((a) => Math.max(0, a - 1));
            else if (e.key === "Enter" && active >= 0) {
              e.preventDefault();
              handleSelect(active);
            } else if (e.key === "Escape") setOpen(false);
          }}
        />
        <span style={styles.acIcon}>▼</span>
        {open && filtered.length > 0 && (
          <div style={styles.acMenu}>
            {filtered.map((val, i) => (
              <div
                key={typeof val === "string" ? val : val.name}
                style={styles.acItem(active === i)}
                onMouseDown={() => handleSelect(i)}
                onMouseEnter={() => setActive(i)}
              >
                {toUpper(typeof val === "string" ? val : val.name)}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function UnitDropdownField({
  label,
  fieldName,
  formik,
  unitOptions,
  placeholder,
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(formik.values[fieldName] || "");
  const [active, setActive] = useState(-1);
  const wrapperRef = useRef();

  // Filter unit codes (toupper)
  const filtered = priorityFilter(unitOptions || [], query).slice(0, 15);

  useEffect(() => {
    setQuery(formik.values[fieldName] || "");
  }, [formik.values[fieldName]]);
  useEffect(() => {
    const close = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target))
        setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  function handleSelect(i) {
    setQuery(toUpper(filtered[i]));
    formik.setFieldValue(fieldName, toUpper(filtered[i]));
    setOpen(false);
    setActive(-1);
  }

  return (
    <div style={styles.field} ref={wrapperRef}>
      <div style={styles.label}>{label}</div>
      <div style={styles.acWrap}>
        <input
          style={styles.input}
          placeholder={placeholder}
          autoComplete="off"
          value={toUpper(query)}
          onChange={(e) => {
            setQuery(e.target.value.toUpperCase());
            formik.setFieldValue(fieldName, e.target.value.toUpperCase());
            setOpen(true);
          }}
          onFocus={() => {
            setOpen(true);
            setActive(-1);
          }}
          onKeyDown={(e) => {
            if (e.key === "Tab") {
              if (open) {
                if (active >= 0 && filtered[active]) {
                  handleSelect(active);
                } else if (filtered.length === 1) {
                  handleSelect(0);
                } else {
                  setOpen(false);
                }
              }
              const trimmed = query.trim();
              if (trimmed !== query) {
                const upper = toUpper(trimmed);
                setQuery(upper);
                formik.setFieldValue(fieldName, upper);
              }
              return;
            }

            if (!open) return;
            if (e.key === "ArrowDown")
              setActive((a) =>
                Math.min(filtered.length - 1, a < 0 ? 0 : a + 1),
              );
            else if (e.key === "ArrowUp") setActive((a) => Math.max(0, a - 1));
            else if (e.key === "Enter" && active >= 0) {
              e.preventDefault();
              handleSelect(active);
            } else if (e.key === "Escape") setOpen(false);
          }}
        />
        <span style={styles.acIcon}>▼</span>
        {open && filtered.length > 0 && (
          <div style={styles.acMenu}>
            {filtered.map((val, i) => (
              <div
                key={val}
                style={styles.acItem(active === i)}
                onMouseDown={() => handleSelect(i)}
                onMouseEnter={() => setActive(i)}
              >
                {toUpper(val)}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function usePortDropdown(fieldName, formik, onSelect, endpoint) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(formik.values[fieldName] || "");
  const [opts, setOpts] = useState([]);
  const [active, setActive] = useState(-1);
  const [isTyping, setIsTyping] = useState(false);
  const wrapperRef = useRef();
  const keepOpen = useRef(false);
  const apiBase = import.meta.env.VITE_API_STRING;

  useEffect(() => {
    setQuery(formik.values[fieldName] || "");
  }, [formik.values[fieldName]]);

  useEffect(() => {
    if (!open) {
      setOpts([]);
      return;
    }
    const searchVal = isTyping ? (query || "").trim() : "";
    const t = setTimeout(async () => {
      try {
        const fetchUrl = endpoint
          ? `${apiBase}/${endpoint}?search=${encodeURIComponent(searchVal)}`
          : `${apiBase}/ports?search=${encodeURIComponent(searchVal)}`;

        const res = await fetch(fetchUrl);
        const data = await res.json();
        setOpts(
          Array.isArray(data?.data)
            ? data.data
            : Array.isArray(data)
              ? data
              : [],
        );
      } catch {
        setOpts([]);
      }
    }, 220);
    return () => clearTimeout(t);
  }, [open, query, isTyping, apiBase, endpoint]);

  useEffect(() => {
    function close(e) {
      if (
        !keepOpen.current &&
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target)
      ) {
        setOpen(false);
        setIsTyping(false);
      }
    }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  function select(i) {
    if (opts[i]) {
      const sel = opts[i];
      const pName = sel.portName || sel.name || "";
      const pDetails = sel.uneceCode || "";

      // Format: PNAME (UNECECODE)
      let value = toUpper(pName);
      if (pDetails) {
        value += ` (${toUpper(pDetails)})`;
      }

      setQuery(value);
      formik.setFieldValue(fieldName, value);
      setOpen(false);
      setActive(-1);
      setIsTyping(false);

      if (onSelect) {
        onSelect(sel);
      }
    }
  }

  return {
    wrapperRef,
    open,
    setOpen,
    query,
    setQuery,
    opts,
    active,
    setActive,
    handle: (val) => {
      setQuery(val);
      formik.setFieldValue(fieldName, val);
      setOpen(true);
      setIsTyping(true);
    },
    select,
    onInputFocus: () => {
      setOpen(true);
      setActive(-1);
      keepOpen.current = true;
    },
    onInputBlur: () => {
      setTimeout(() => {
        keepOpen.current = false;
      }, 100);
    },
  };
}

function PortField({
  label,
  fieldName,
  placeholder,
  formik,
  onSelect,
  endpoint,
}) {
  const d = usePortDropdown(fieldName, formik, onSelect, endpoint);
  return (
    <div style={styles.field} ref={d.wrapperRef}>
      <div style={styles.label}>{label}</div>
      <div style={styles.acWrap}>
        <input
          style={styles.input}
          placeholder={placeholder}
          autoComplete="on"
          value={toUpper(d.query)}
          onChange={(e) => d.handle(e.target.value.toUpperCase())}
          onFocus={d.onInputFocus}
          onBlur={d.onInputBlur}
          onKeyDown={(e) => {
            if (e.key === "Tab") {
              if (d.open) {
                if (d.active >= 0 && d.opts[d.active]) {
                  d.select(d.active);
                } else if (d.opts.length === 1) {
                  d.select(0);
                } else {
                  d.setOpen(false);
                }
              }
              const trimmed = d.query.trim();
              if (trimmed !== d.query) {
                const upper = toUpper(trimmed);
                d.setQuery(upper);
                formik.setFieldValue(fieldName, upper);
              }
              return;
            }

            if (!d.open) return;
            if (e.key === "ArrowDown")
              d.setActive((a) =>
                Math.min(d.opts.length - 1, a < 0 ? 0 : a + 1),
              );
            else if (e.key === "ArrowUp")
              d.setActive((a) => Math.max(0, a - 1));
            else if (e.key === "Enter" && d.active >= 0) {
              e.preventDefault();
              d.select(d.active);
            } else if (e.key === "Escape") d.setOpen(false);
          }}
        />
        <span style={styles.acIcon}>▼</span>
        {d.open && d.opts.length > 0 && (
          <div style={styles.acMenu}>
            {d.opts.map((opt, i) => {
              const pName = opt.portName || opt.name || "";
              const pDetails = opt.uneceCode || "";

              return (
                <div
                  key={opt._id || pName || i}
                  style={styles.acItem(d.active === i)}
                  onMouseDown={() => d.select(i)}
                  onMouseEnter={() => d.setActive(i)}
                >
                  {toUpper(pName)} {pDetails && `(${toUpper(pDetails)})`}
                  {opt.country && (
                    <span
                      style={{ marginLeft: 8, color: "#668", fontWeight: 400 }}
                    >
                      [{toUpper(opt.country)}]
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
function StateDropdownField({
  label,
  fieldName,
  formik,
  states,
  placeholder = "GUJARAT",
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(formik.values[fieldName] || "");
  const [active, setActive] = useState(-1);
  const wrapperRef = useRef();

  // Filtering states by substring match, always upper-case
  const filteredStates = (states || [])
    .filter((s) =>
      toUpper(typeof s === "string" ? s : s.name).includes(query.toUpperCase()),
    )
    .slice(0, 10); // Limit for dropdown height

  useEffect(() => {
    setQuery(formik.values[fieldName] || "");
  }, [formik.values[fieldName]]);

  // Close dropdown on outside click
  useEffect(() => {
    const close = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target))
        setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  function handleSelect(i) {
    const stateName =
      typeof filteredStates[i] === "string"
        ? filteredStates[i]
        : filteredStates[i].name;
    setQuery(toUpper(stateName));
    formik.setFieldValue(fieldName, toUpper(stateName));
    setOpen(false);
    setActive(-1);
  }

  return (
    <div style={styles.field} ref={wrapperRef}>
      <div style={styles.label}>{label}</div>
      <div style={styles.acWrap}>
        <input
          style={styles.input}
          placeholder={placeholder}
          autoComplete="off"
          value={toUpper(query)}
          onChange={(e) => {
            setQuery(e.target.value.toUpperCase());
            formik.setFieldValue(fieldName, e.target.value.toUpperCase());
            setOpen(true);
          }}
          onFocus={() => {
            setOpen(true);
            setActive(-1);
          }}
          onKeyDown={(e) => {
            if (e.key === "Tab") {
              if (open) {
                if (active >= 0 && filteredStates[active]) {
                  handleSelect(active);
                } else if (filteredStates.length === 1) {
                  handleSelect(0);
                } else {
                  setOpen(false);
                }
              }
              const trimmed = query.trim();
              if (trimmed !== query) {
                const upper = toUpper(trimmed);
                setQuery(upper);
                formik.setFieldValue(fieldName, upper);
              }
              return;
            }

            if (!open) return;
            if (e.key === "ArrowDown")
              setActive((a) =>
                Math.min(filteredStates.length - 1, a < 0 ? 0 : a + 1),
              );
            else if (e.key === "ArrowUp") setActive((a) => Math.max(0, a - 1));
            else if (e.key === "Enter" && active >= 0) {
              e.preventDefault();
              handleSelect(active);
            } else if (e.key === "Escape") setOpen(false);
          }}
        />
        <span style={styles.acIcon}>▼</span>
        {open && filteredStates.length > 0 && (
          <div style={styles.acMenu}>
            {filteredStates.map((val, i) => (
              <div
                key={typeof val === "string" ? val : val.name}
                style={styles.acItem(active === i)}
                onMouseDown={() => handleSelect(i)}
                onMouseEnter={() => setActive(i)}
              >
                {toUpper(typeof val === "string" ? val : val.name)}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function useShippingOrAirlineDropdown(fieldName, formik) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(formik.values[fieldName] || "");
  const [opts, setOpts] = useState([]);
  const [active, setActive] = useState(-1);
  const [isTyping, setIsTyping] = useState(false);
  const wrapperRef = useRef();
  const keepOpen = useRef(false);
  const apiBase = import.meta.env.VITE_API_STRING;

  const transportMode = toUpper(formik.values.transportMode || ""); // "AIR" / "SEA"

  useEffect(() => {
    setQuery(formik.values[fieldName] || "");
  }, [formik.values[fieldName]]);

  useEffect(() => {
    if (!open) {
      setOpts([]);
      return;
    }
    const searchVal = isTyping ? (query || "").trim() : "";
    const isAir = transportMode === "AIR";

    const url = isAir
      ? `${apiBase}/airlines/?page=1&status=&search=${encodeURIComponent(
        searchVal,
      )}`
      : `${apiBase}/shippingLines/?page=1&location=&status=&search=${encodeURIComponent(
        searchVal,
      )}`;

    const t = setTimeout(async () => {
      try {
        const res = await fetch(url);
        const data = await res.json();
        setOpts(
          Array.isArray(data?.data)
            ? data.data
            : Array.isArray(data)
              ? data
              : [],
        );
      } catch {
        setOpts([]);
      }
    }, 220);

    return () => clearTimeout(t);
  }, [open, query, transportMode, isTyping]);

  useEffect(() => {
    function close(e) {
      if (
        !keepOpen.current &&
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target)
      ) {
        setOpen(false);
        setIsTyping(false);
      }
    }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  function select(i) {
    const item = opts[i];
    if (!item) return;

    const isAir = transportMode === "AIR";

    const code = isAir
      ? item.alphanumericCode || item.code || ""
      : item.shippingLineCode || item.code || "";
    const name = isAir
      ? item.airlineName || item.name || ""
      : item.shippingName || item.name || "";

    const value = `${toUpper(code)} - ${toUpper(name)}`.trim();
    setQuery(value);
    formik.setFieldValue(fieldName, value);
    setOpen(false);
    setActive(-1);
    setIsTyping(false);
  }

  return {
    wrapperRef,
    open,
    setOpen,
    query,
    setQuery,
    opts,
    active,
    setActive,
    handle: (val) => {
      const v = val.toUpperCase();
      setQuery(v);
      formik.setFieldValue(fieldName, v);
      setOpen(true);
      setIsTyping(true);
    },
    select,
    onInputFocus: () => {
      setOpen(true);
      setActive(-1);
      keepOpen.current = true;
    },
    onInputBlur: () => {
      setTimeout(() => {
        keepOpen.current = false;
      }, 100);
    },
  };
}

function ShippingLineDropdownField({
  fieldName,
  formik,
  placeholder = "ENTER LINE",
}) {
  const consignmentType = toUpper(formik.values.consignmentType || "");
  const isAir = consignmentType === "AIR";
  const label = isAir ? "AIR LINE" : "SHIPPING LINE";

  const d = useShippingOrAirlineDropdown(fieldName, formik);

  const filteredOpts = priorityFilter(d.opts, d.query, (opt) => {
    const code = isAir
      ? opt.alphanumericCode || opt.code || ""
      : opt.shippingLineCode || opt.code || "";
    const name = isAir
      ? opt.airlineName || opt.name || ""
      : opt.shippingName || opt.name || "";
    return `${code} ${name}`;
  });

  // helper: map filtered index -> original opts index
  const indexInOpts = (filteredIndex) => {
    const target = filteredOpts[filteredIndex];
    if (!target) return -1;
    return d.opts.findIndex((o) => o === target);
  };

  return (
    <div style={styles.field} ref={d.wrapperRef}>
      <div style={styles.label}>{label}</div>
      <div style={styles.acWrap}>
        <input
          style={styles.input}
          placeholder={placeholder}
          autoComplete="off"
          value={toUpper(d.query)}
          onChange={(e) => d.handle(e.target.value)}
          onFocus={d.onInputFocus}
          onBlur={d.onInputBlur}
          onKeyDown={(e) => {
            if (e.key === "Tab") {
              if (d.open) {
                if (d.active >= 0) {
                  const originalIndex = indexInOpts(d.active);
                  if (originalIndex >= 0) d.select(originalIndex);
                } else if (filteredOpts.length === 1) {
                  const originalIndex = indexInOpts(0);
                  if (originalIndex >= 0) d.select(originalIndex);
                } else {
                  d.setOpen(false);
                }
              }
              const trimmed = d.query.trim();
              if (trimmed !== d.query) {
                const upper = toUpper(trimmed);
                d.setQuery(upper);
                formik.setFieldValue(fieldName, upper);
              }
              return;
            }

            if (!d.open) return;
            if (e.key === "ArrowDown")
              d.setActive((a) =>
                Math.min(filteredOpts.length - 1, a < 0 ? 0 : a + 1),
              );
            else if (e.key === "ArrowUp")
              d.setActive((a) => Math.max(0, a - 1));
            else if (e.key === "Enter" && d.active >= 0) {
              e.preventDefault();
              const originalIndex = indexInOpts(d.active);
              if (originalIndex >= 0) d.select(originalIndex);
            } else if (e.key === "Escape") d.setOpen(false);
          }}
        />
        <span style={styles.acIcon}>▼</span>
        {d.open && filteredOpts.length > 0 && (
          <div style={styles.acMenu}>
            {filteredOpts.map((opt, i) => {
              const code = isAir
                ? toUpper(opt.alphanumericCode || opt.code || "")
                : toUpper(opt.shippingLineCode || opt.code || "");
              const name = isAir
                ? toUpper(opt.airlineName || opt.name || "")
                : toUpper(opt.shippingName || opt.name || "");
              const originalIndex = indexInOpts(i);
              return (
                <div
                  key={opt._id || code || name || i}
                  style={styles.acItem(d.active === i)}
                  onMouseDown={() => {
                    if (originalIndex >= 0) d.select(originalIndex);
                  }}
                  onMouseEnter={() => d.setActive(i)}
                >
                  {code} - {name}
                  {opt.status && (
                    <span
                      style={{ marginLeft: 8, color: "#8ad", fontWeight: 500 }}
                    >
                      ({toUpper(opt.status)})
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function ShipmentMainTab({ formik, onUpdate, directories }) {
  const consignmentType = toUpper(formik.values.consignmentType || "");
  const isAir = consignmentType == "AIR";

  // Auto-populate State of Origin from Directory based on Exporter
  // Auto-populate State of Origin from Directory based on Exporter
  useEffect(() => {
    const exportersList = directories?.exporters || [];

    if (formik.values.exporter && exportersList.length > 0) {
      const dir = exportersList.find(
        (d) =>
          (d.organization || "").toUpperCase() ===
          (formik.values.exporter || "").toUpperCase(),
      );

      if (dir && dir.branchInfo && dir.branchInfo.length > 0) {
        // Use the first branch's state as default reference
        const state = dir.branchInfo[0].state;

        if (state && !formik.values.state_of_origin) {
          formik.setFieldValue("state_of_origin", toUpper(state));
        }
      }
    }
  }, [formik.values.exporter, directories, formik.values.state_of_origin]);

  useEffect(() => {
    if (isAir) {
      formik.setFieldValue("nature_of_cargo", "NON-CONTAINERIZED");
    } else {
      formik.setFieldValue("nature_of_cargo", "CONTAINERIZED");
    }
  }, [isAir]);


  const saveTimeoutRef = useRef(null);

  // Compact auto-save
  const autoSave = useCallback(
    async (values) => {
      if (onUpdate) await onUpdate(values);
    },
    [onUpdate],
  );
  function handleFieldChange(field, value) {
    formik.setFieldValue(field, value);
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => autoSave(formik.values), 1100);
  }

  return (
    <div style={styles.page}>
      <div style={styles.row}>
        {/* Left: further split into two cols */}
        <div style={styles.col}>
          <div style={styles.card}>
            <div style={styles.sectionTitle}>PORT & LOCATION DETAILS</div>

            {/* Row 1: Discharge Port | Discharge Country */}
            <div style={styles.split}>
              <div style={styles.half}>
                <PortField
                  label="DISCHARGE PORT"
                  fieldName="port_of_discharge"
                  placeholder="ENTER PORT"
                  formik={formik}
                  endpoint={isAir ? "airPorts" : "seaPorts"}
                  onSelect={async (opt) => {
                    if (opt.country) {
                      let country = toUpper(opt.country);
                      try {
                        const res = await fetch(
                          `${apiBase}/countries?search=${encodeURIComponent(
                            country,
                          )}`,
                        );
                        const data = await res.json();
                        const found = (data?.data || []).find(
                          (c) => (c.countryCode || "").toUpperCase() === country,
                        );
                        if (found) {
                          country = toUpper(found.countryName);
                        }
                      } catch (err) {
                        console.error("Error fetching country name:", err);
                      }
                      formik.setFieldValue("discharge_country", country);
                      formik.setFieldValue("destination_country", country);
                    }
                    const pName = opt.portName || opt.name || "";
                    const pDetails = opt.uneceCode || "";
                    let value = toUpper(pName);
                    if (pDetails) {
                      value += ` (${toUpper(pDetails)})`;
                    }
                    formik.setFieldValue("destination_port", value);
                  }}
                />
              </div>
              <div style={styles.half}>
                <CountryField
                  label="DISCHARGE COUNTRY"
                  fieldName="discharge_country"
                  placeholder="ENTER COUNTRY"
                  formik={formik}
                />
              </div>
            </div>

            {/* Row 2: Destination Port | Destination Country */}
            <div style={styles.split}>
              <div style={styles.half}>
                <PortField
                  label="DESTINATION PORT"
                  fieldName="destination_port"
                  placeholder="ENTER PORT"
                  formik={formik}
                  endpoint={isAir ? "airPorts" : "seaPorts"}
                  onSelect={async (opt) => {
                    if (opt.country) {
                      let country = toUpper(opt.country);
                      try {
                        const res = await fetch(
                          `${apiBase}/countries?search=${encodeURIComponent(
                            country,
                          )}`,
                        );
                        const data = await res.json();
                        const found = (data?.data || []).find(
                          (c) => (c.countryCode || "").toUpperCase() === country,
                        );
                        if (found) {
                          country = toUpper(found.countryName);
                        }
                      } catch (err) {
                        console.error("Error fetching country name:", err);
                      }

                      formik.setFieldValue("destination_country", country);
                    }
                  }}
                />
              </div>
              <div style={styles.half}>
                <CountryField
                  label="DESTINATION COUNTRY"
                  fieldName="destination_country"
                  placeholder="Enter Country"
                  formik={formik}
                />
              </div>
            </div>

            {/* Row 3: Shipping Line | Flight/Vessel Name */}
            <div style={styles.split}>
              <div style={styles.half}>
                <ShippingLineDropdownField
                  fieldName="shipping_line_airline"
                  formik={formik}
                  placeholder="ENTER LINE"
                />
              </div>
              <div style={styles.half}>
                {isAir ? (
                  <div style={styles.field}>
                    <div style={styles.label}>FLIGHT NO</div>
                    <input
                      style={styles.input}
                      placeholder="ENTER FLIGHT NO"
                      value={toUpper(formik.values.flight_no || "")}
                      onChange={(e) =>
                        handleFieldChange(
                          "flight_no",
                          e.target.value.toUpperCase(),
                        )
                      }
                    />
                  </div>
                ) : (
                  <div style={styles.field}>
                    <div style={styles.label}>VESSEL NAME</div>
                    <input
                      style={styles.input}
                      placeholder="Enter Vessel Name"
                      value={toUpper(formik.values.vessel_name || "")}
                      onChange={(e) =>
                        handleFieldChange(
                          "vessel_name",
                          e.target.value.toUpperCase(),
                        )
                      }
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Row 4: Voyage No | Flight/Sailing Date */}
            <div style={styles.split}>
              <div style={styles.half}>
                {!isAir && (
                  <div style={styles.field}>
                    <div style={styles.label}>VOYAGE NO</div>
                    <input
                      style={styles.input}
                      value={toUpper(formik.values.voyage_no || "")}
                      onChange={(e) =>
                        handleFieldChange(
                          "voyage_no",
                          e.target.value.toUpperCase(),
                        )
                      }
                    />
                  </div>
                )}
              </div>
              <div style={styles.half}>
                <div style={styles.field}>
                  <div style={styles.label}>
                    {isAir ? "FLIGHT DATE" : "SAILING DATE"}
                  </div>
                  <DateInput
                    style={styles.input}
                    value={
                      isAir
                        ? formik.values.flight_date || ""
                        : formik.values.sailing_date || ""
                    }
                    onChange={(e) =>
                      handleFieldChange(
                        isAir ? "flight_date" : "sailing_date",
                        e.target.value,
                      )
                    }
                  />
                </div>
              </div>
            </div>

            {/* Row 5: EGM No | EGM Date */}
            <div style={styles.split}>
              <div style={styles.half}>
                <div style={styles.field}>
                  <div style={styles.label}>EGM NO</div>
                  <input
                    style={styles.input}
                    value={toUpper(formik.values.egm_no || "")}
                    onChange={(e) =>
                      handleFieldChange("egm_no", e.target.value.toUpperCase())
                    }
                  />
                </div>
              </div>
              <div style={styles.half}>
                <div style={styles.field}>
                  <div style={styles.label}>EGM DATE</div>
                  <DateInput
                    style={styles.input}
                    value={formik.values.egm_date || ""}
                    onChange={(e) =>
                      handleFieldChange("egm_date", e.target.value)
                    }
                  />
                </div>
              </div>
            </div>

            {/* Row 6: MAWB/MBL No | MAWB/MBL Date */}
            <div style={styles.split}>
              <div style={styles.half}>
                <div style={styles.field}>
                  <div style={styles.label}>{isAir ? "MAWB NO" : "MBL NO"}</div>
                  <input
                    style={styles.input}
                    value={toUpper(formik.values.mbl_no || "")}
                    onChange={(e) =>
                      handleFieldChange("mbl_no", e.target.value.toUpperCase())
                    }
                  />
                </div>
              </div>
              <div style={styles.half}>
                <div style={styles.field}>
                  <div style={styles.label}>
                    {isAir ? "MAWB DATE" : "MBL DATE"}
                  </div>
                  <DateInput
                    style={styles.input}
                    value={formik.values.mbl_date || ""}
                    onChange={(e) =>
                      handleFieldChange("mbl_date", e.target.value)
                    }
                  />
                </div>
              </div>
            </div>

            {/* Row 7: HAWB/HBL No | HAWB/HBL Date */}
            <div style={styles.split}>
              <div style={styles.half}>
                <div style={styles.field}>
                  <div style={styles.label}>{isAir ? "HAWB NO" : "HBL NO"}</div>
                  <input
                    style={styles.input}
                    value={toUpper(formik.values.hbl_no || "")}
                    onChange={(e) =>
                      handleFieldChange("hbl_no", e.target.value.toUpperCase())
                    }
                  />
                </div>
              </div>
              <div style={styles.half}>
                <div style={styles.field}>
                  <div style={styles.label}>
                    {isAir ? "HAWB DATE" : "HBL DATE"}
                  </div>
                  <DateInput
                    style={styles.input}
                    value={formik.values.hbl_date || ""}
                    onChange={(e) =>
                      handleFieldChange("hbl_date", e.target.value)
                    }
                  />
                </div>
              </div>
            </div>

            {/* Row 8 (Sea Only): Pre-Carriage | Place of Receipt */}
            {!isAir && (
              <div style={styles.split}>
                <div style={styles.half}>
                  <div style={styles.field}>
                    <div style={styles.label}>PRE-CARRIAGE BY</div>
                    <input
                      style={styles.input}
                      value={toUpper(formik.values.pre_carriage_by || "")}
                      onChange={(e) =>
                        handleFieldChange(
                          "pre_carriage_by",
                          e.target.value.toUpperCase(),
                        )
                      }
                    />
                  </div>
                </div>
                <div style={styles.half}>
                  <div style={styles.field}>
                    <div style={styles.label}>PLACE OF RECEIPT</div>
                    <input
                      style={styles.input}
                      value={toUpper(formik.values.place_of_receipt || "")}
                      onChange={(e) =>
                        handleFieldChange(
                          "place_of_receipt",
                          e.target.value.toUpperCase(),
                        )
                      }
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Row 9: Transhipper/State(Air) | Gateway Port */}
            <div style={styles.split}>
              <div style={styles.half}>
                {!isAir ? (
                  <div style={styles.field}>
                    <div style={styles.label}>TRANSHIPPER CODE</div>
                    <input
                      style={styles.input}
                      value={toUpper(formik.values.transhipper_code || "")}
                      onChange={(e) =>
                        handleFieldChange(
                          "transhipper_code",
                          e.target.value.toUpperCase(),
                        )
                      }
                    />
                  </div>
                ) : (
                  <StateDropdownField
                    label="STATE OF ORIGIN"
                    fieldName="state_of_origin"
                    formik={formik}
                    states={states} // your imported states array
                    placeholder="STATES"
                  />
                )}
              </div>
              <div style={styles.half}>
                <GatewayPortDropdownField
                  label="GATEWAY PORT"
                  fieldName="gateway_port"
                  formik={formik}
                  placeholder="ENTER GATEWAY PORT"
                />
              </div>
            </div>

            {/* Row 10: State(Sea) | Annexure C */}
            <div style={styles.split}>
              <div style={styles.half}>
                {!isAir && (
                  <StateDropdownField
                    label="STATE OF ORIGIN"
                    fieldName="state_of_origin"
                    formik={formik}
                    states={states} // your imported states array
                    placeholder="STATES"
                  />
                )}
                <div style={{ ...styles.field, marginTop: 5 }}>
                  <label
                    style={{
                      fontSize: 10.5,
                      color: "#485",
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={formik.values["annexure_c_details"] || false}
                      onChange={(e) =>
                        handleFieldChange(
                          "annexure_c_details",
                          e.target.checked,
                        )
                      }
                      style={{ marginRight: 7 }}
                    />
                    ANNEXURE-C DETAILS BEING FILED WITH ANNEXURE-A
                  </label>
                </div>
              </div>
              <div style={styles.half}>{/* Empty right Col */}</div>
            </div>
          </div>
        </div>
        {/* Right */}
        <div style={styles.col}>
          <div style={styles.card}>
            <div style={styles.sectionTitle}>CARGO & WEIGHT DETAILS</div>
            <NatureOfCargoDropdownField
              label="NATURE OF CARGO"
              fieldName="nature_of_cargo"
              formik={formik}
              natureOptions={natureOfCargo}
              placeholder="enter nature of cargo"
            />
            <div style={styles.split}>
              <div style={styles.half}>
                <div style={styles.label}>TOTAL NO. OF PKGS</div>
                <input
                  style={styles.input}
                  type="number"
                  value={
                    Number(formik.values.total_no_of_pkgs) === 0
                      ? ""
                      : formik.values.total_no_of_pkgs || ""
                  }
                  onChange={(e) =>
                    handleFieldChange("total_no_of_pkgs", e.target.value)
                  }
                  placeholder="0.00"
                />
              </div>
              <UnitDropdownField
                label="UNIT"
                fieldName="package_unit" // use your desired formik field
                formik={formik}
                unitOptions={unitCodes}
                placeholder="Enter Unit"
              />
            </div>
            {!isAir && (
              <>
                <div style={styles.field}>
                  <div style={styles.label}>LOOSE PKGS</div>
                  <input
                    style={styles.input}
                    type="number"
                    value={
                      Number(formik.values.loose_pkgs) === 0
                        ? ""
                        : formik.values.loose_pkgs || ""
                    }
                    onChange={(e) =>
                      handleFieldChange("loose_pkgs", e.target.value)
                    }
                    placeholder="0.00"
                  />
                </div>
                <div style={styles.field}>
                  <div style={styles.label}>NO OF CONTAINERS</div>
                  <input
                    style={styles.input}
                    type="number"
                    value={
                      Number(formik.values.no_of_containers) === 0
                        ? ""
                        : formik.values.no_of_containers || ""
                    }
                    onChange={(e) =>
                      handleFieldChange("no_of_containers", e.target.value)
                    }
                    placeholder="0.00"
                  />
                </div>
              </>
            )}

            <>
              <div style={styles.split}>
                <div style={styles.half}>
                  <div style={styles.label}>GROSS WEIGHT</div>
                  <input
                    style={styles.input}
                    type="number"
                    step="0.001"
                    value={
                      Number(formik.values.gross_weight_kg) === 0
                        ? ""
                        : formik.values.gross_weight_kg || ""
                    }
                    onChange={(e) =>
                      handleFieldChange("gross_weight_kg", e.target.value)
                    }
                    onBlur={(e) => {
                      const val = parseFloat(e.target.value);
                      if (!isNaN(val)) {
                        handleFieldChange("gross_weight_kg", val.toFixed(3));
                      }
                    }}
                    placeholder="0.00"
                  />
                </div>
                <UnitDropdownField
                  label="UNIT"
                  fieldName="gross_weight_unit" // use your desired formik field
                  formik={formik}
                  unitOptions={unitCodes}
                  placeholder="Enter Unit"
                />
              </div>
              <div style={styles.split}>
                <div style={styles.half}>
                  <div style={styles.label}>NET WEIGHT</div>
                  <input
                    style={styles.input}
                    type="number"
                    step="0.001"
                    value={
                      Number(formik.values.net_weight_kg) === 0
                        ? ""
                        : formik.values.net_weight_kg || ""
                    }
                    onChange={(e) =>
                      handleFieldChange("net_weight_kg", e.target.value)
                    }
                    onBlur={(e) => {
                      const val = parseFloat(e.target.value);
                      if (!isNaN(val)) {
                        handleFieldChange("net_weight_kg", val.toFixed(3));
                      }
                    }}
                    placeholder="0.00"
                  />
                </div>
                <UnitDropdownField
                  label="UNIT"
                  fieldName="net_weight_unit"
                  formik={formik}
                  unitOptions={unitCodes}
                  placeholder="Enter Unit"
                />
              </div>
              {parseFloat(formik.values.net_weight_kg || 0) >
                parseFloat(formik.values.gross_weight_kg || 0) && (
                  <Alert
                    severity="warning"
                    sx={{ mt: 1, py: 0, fontSize: "0.80rem" }}
                  >
                    Warning: Net Weight cannot be greater than Gross Weight.
                  </Alert>
                )}
            </>
            <div style={styles.split}>
              <div style={styles.half}>
                <div style={styles.label}>VOLUME</div>
                <input
                  style={styles.input}
                  type="number"
                  step="0.001"
                  value={
                    Number(formik.values.volume_cbm) === 0
                      ? ""
                      : formik.values.volume_cbm || ""
                  }
                  onChange={(e) =>
                    handleFieldChange("volume_cbm", e.target.value)
                  }
                  onBlur={(e) => {
                    const val = parseFloat(e.target.value);
                    if (!isNaN(val)) {
                      handleFieldChange("volume_cbm", val.toFixed(3));
                    }
                  }}
                  placeholder="0.00"
                />
              </div>
              <UnitDropdownField
                label="UNIT"
                fieldName="volume_unit" // use your desired formik field
                formik={formik}
                unitOptions={unitCodes}
                placeholder="Enter Unit"
              />
            </div>
            <div style={styles.split}>
              <div style={styles.half}>
                <div style={styles.label}>CHARGEABLE WEIGHT</div>
                <input
                  style={styles.input}
                  type="number"
                  step="0.001"
                  value={
                    Number(formik.values.chargeable_weight) === 0
                      ? ""
                      : formik.values.chargeable_weight || ""
                  }
                  onChange={(e) =>
                    handleFieldChange("chargeable_weight", e.target.value)
                  }
                  onBlur={(e) => {
                    const val = parseFloat(e.target.value);
                    if (!isNaN(val)) {
                      handleFieldChange("chargeable_weight", val.toFixed(3));
                    }
                  }}
                  placeholder="0.00"
                />
              </div>
              <UnitDropdownField
                label="UNIT"
                fieldName="chargeable_weight_unit" // use your desired formik field
                formik={formik}
                unitOptions={unitCodes}
                placeholder="Enter Unit"
              />
            </div>
            <div style={styles.field}>
              <div style={styles.label}>MARKS &amp; NOS</div>
              <textarea
                style={styles.textarea}
                value={toUpper(formik.values.marks_nos || "")}
                onChange={(e) =>
                  handleFieldChange("marks_nos", e.target.value.toUpperCase())
                }
                rows={4}
              />
              <div style={{ fontSize: 10, color: "#487", marginTop: 1 }}>
                {formik.values.marks_nos?.length || 0} CHARS
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ShipmentMainTab;
