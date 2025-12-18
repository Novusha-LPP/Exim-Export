import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  eximCodes,
  states,
  PTA_FTA_CODES,
  unitCodes,
  END_USE_CODES,
  currencyList,
} from "../../../../utils/masterList";
import { toUpperVal } from "./commonStyles.js";

const apiBase = import.meta.env.VITE_API_STRING;

const styles = {
  page: {
    fontFamily: "'Segoe UI', Roboto, Arial, sans-serif",
    fontSize: 13,
    color: "#1e2e38",
    padding: 16,
  },
  sectionTitle: {
    fontWeight: 700,
    color: "#16408f",
    fontSize: 12,
    marginBottom: 10,
    letterSpacing: 1.3,
    textTransform: "uppercase",
  },
  subSectionTitle: {
    fontWeight: 700,
    color: "#16408f",
    fontSize: 11,
    marginTop: 12,
    marginBottom: 8,
    borderBottom: "1px solid #e2e8f0",
    paddingBottom: 4,
  },
  tableContainer: {
    background: "#fff",
    border: "1.5px solid #e2e8f0",
    borderRadius: 7,
    marginBottom: 18,
    maxHeight: 400,
    overflow: "auto",
  },
  table: { width: "100%", borderCollapse: "collapse" },
  th: {
    background: "#16408f",
    color: "white",
    fontWeight: 700,
    fontSize: 11,
    padding: "8px 12px",
    textAlign: "left",
    position: "sticky",
    top: 0,
    zIndex: 10,
  },
  td: { padding: "8px 12px", borderBottom: "1px solid #e2e8f0" },
  input: {
    width: "100%",
    textTransform: "uppercase",
    fontWeight: 600,
    fontSize: 12,
    padding: "4px 8px",
    border: "1px solid #bdc7d1",
    borderRadius: 3,
    height: 28,
    background: "#f7fafc",
    outline: "none",
    boxSizing: "border-box",
  },
  checkbox: { cursor: "pointer", marginRight: 6 },
  select: {
    width: "100%",
    textTransform: "uppercase",
    fontWeight: 600,
    fontSize: 12,
    padding: "4px 8px",
    border: "1px solid #bdc7d1",
    borderRadius: 3,
    height: 28,
    background: "#f7fafc",
    outline: "none",
    boxSizing: "border-box",
    cursor: "pointer",
  },
  textarea: {
    width: "100%",
    fontSize: 12,
    padding: "5px 8px",
    border: "1.5px solid #ccd6dd",
    borderRadius: 4,
    minHeight: 45,
    background: "#f7fafc",
    resize: "vertical",
    textTransform: "uppercase",
    fontWeight: 600,
    boxSizing: "border-box",
  },
  acWrap: { position: "relative", display: "inline-block", width: "100%" },
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
    top: "100%",
    background: "#fff",
    border: "1.5px solid #d3e3ea",
    borderRadius: 4,
    zIndex: 1300,
    maxHeight: 154,
    overflow: "auto",
    fontSize: 12,
    fontWeight: 600,
  },
  acItem: (active) => ({
    padding: "6px 9px",
    cursor: "pointer",
    textTransform: "uppercase",
    background: active ? "#eaf2fe" : "#fff",
    color: active ? "#18427c" : "#1b2b38",
    fontWeight: active ? 700 : 600,
  }),
  card: {
    background: "#fff",
    border: "1.5px solid #e2e8f0",
    borderRadius: 7,
    padding: 16,
    marginBottom: 18,
  },
  cardTitle: {
    fontWeight: 700,
    color: "#16408f",
    fontSize: 14,
    marginBottom: 12,
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  chip: {
    background: "#e2e8f0",
    color: "#1e2e38",
    fontSize: 10,
    fontWeight: 600,
    padding: "2px 8px",
    borderRadius: 12,
    height: 20,
  },
  grid3: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 16,
    marginBottom: 8,
    alignItems: "end",
  },
  grid4: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: 16,
    marginBottom: 8,
    alignItems: "end",
  },
  field: { marginBottom: 8 },
  label: {
    fontSize: 11,
    fontWeight: 700,
    color: "#263046",
    letterSpacing: 0.5,
    marginBottom: 4,
    display: "block",
  },
  addBtn: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "8px 16px",
    background: "#16408f",
    color: "white",
    border: "none",
    borderRadius: 4,
    cursor: "pointer",
    fontWeight: 600,
    fontSize: 12,
  },
  inlineCheckbox: {
    display: "flex",
    alignItems: "center",
    fontSize: 11,
    fontWeight: 700,
    color: "#263046",
    textTransform: "uppercase",
  },
};

function toUpper(v) {
  return (typeof v === "string" ? v : "")?.toUpperCase() || "";
}

/* ---------- UnitDropdownField (unchanged) ---------- */

function UnitDropdownField({
  label,
  fieldName,
  formik,
  unitOptions,
  placeholder,
  onSelect,
  disabled = false,
}) {
  const [open, setOpen] = useState(false);

  function getValueByPath(obj, path) {
    return path
      .split(/[.\[\]]/)
      .filter(Boolean)
      .reduce(
        (acc, key) => (acc && acc[key] !== undefined ? acc[key] : ""),
        obj
      );
  }

  const [query, setQuery] = useState(
    getValueByPath(formik.values, fieldName) || ""
  );

  useEffect(() => {
    setQuery(getValueByPath(formik.values, fieldName) || "");
  }, [formik.values, fieldName]);

  const [active, setActive] = useState(-1);
  const wrapperRef = useRef();

  useEffect(() => {
    if (disabled && open) setOpen(false);
  }, [disabled]);

  const filtered = (unitOptions || [])
    .filter((opt) => opt.toUpperCase().includes(query.toUpperCase()))
    .slice(0, 15);

  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleSelect(index) {
    if (disabled) return;
    const selectedValue = filtered[index].toUpperCase();
    setQuery(selectedValue);
    formik.setFieldValue(fieldName, selectedValue);
    if (onSelect) onSelect(selectedValue);
    setOpen(false);
    setActive(-1);
  }

  return (
    <div style={styles.field} ref={wrapperRef}>
      {label && <div style={styles.label}>{label}</div>}
      <div style={styles.acWrap}>
        <input
          style={{
            ...styles.input,
            ...(disabled ? { background: "#e6eef7", cursor: "not-allowed", opacity: 0.8 } : {}),
          }}
          placeholder={placeholder}
          autoComplete="off"
          disabled={disabled}
          value={query.toUpperCase()}
          onChange={(e) => {
            if (disabled) return;
            const val = e.target.value.toUpperCase();
            setQuery(val);
            formik.setFieldValue(fieldName, val);
            setOpen(true);
          }}
          onFocus={() => {
            if (disabled) return;
            setOpen(true);
            setActive(-1);
          }}
          onKeyDown={(e) => {
            if (disabled || !open) return;
            if (e.key === "ArrowDown") {
              setActive((a) =>
                Math.min(filtered.length - 1, a < 0 ? 0 : a + 1)
              );
            } else if (e.key === "ArrowUp") {
              setActive((a) => Math.max(0, a - 1));
            } else if (e.key === "Enter" && active >= 0) {
              e.preventDefault();
              handleSelect(active);
            } else if (e.key === "Escape") {
              setOpen(false);
            }
          }}
        />
        <span style={styles.acIcon}>▼</span>
        {open && !disabled && filtered.length > 0 && (
          <div style={styles.acMenu}>
            {filtered.map((val, i) => (
              <div
                key={val}
                style={styles.acItem(active === i)}
                onMouseDown={() => !disabled && handleSelect(i)}
                onMouseEnter={() => setActive(i)}
              >
                {val.toUpperCase()}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- Dropdown hooks (unchanged behaviour) ---------- */

function useEximCodeDropdown(
  fieldName,
  productIndex,
  formik,
  handleProductChange
) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(-1);
  const wrapperRef = useRef();
  const keepOpenOnInput = useRef(false);

  useEffect(() => {
    setQuery(formik.values.products[productIndex]?.[fieldName] || "");
  }, [formik.values.products, productIndex, fieldName]);

  useEffect(() => {
    const close = (e) => {
      if (
        !keepOpenOnInput.current &&
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const filtered = eximCodes
    .filter((opt) => {
      const code = toUpper(typeof opt === "string" ? opt : opt.code || "");
      const desc = toUpper(
        typeof opt === "string" ? "" : opt.description || ""
      );
      const q = toUpper(query);
      const formatted = desc ? `${code} - ${desc}` : code;
      return code.includes(q) || desc.includes(q) || formatted.includes(q);
    })
    .slice(0, 15);

  const handle = (val) => {
    const v = val.toUpperCase();
    setQuery(v);
    handleProductChange(productIndex, fieldName, v);
    setOpen(true);
  };

  const select = (i) => {
    const item = filtered[i];
    if (item) {
      const code = item.code || item;
      const desc = item.description || "";
      const formattedValue = desc ? `${code} - ${desc}` : code;
      setQuery(toUpper(formattedValue));
      handleProductChange(productIndex, fieldName, toUpper(formattedValue));
      setOpen(false);
      setActive(-1);
    }
  };

  return {
    wrapperRef,
    open,
    setOpen,
    query,
    handle,
    select,
    active,
    setActive,
    filtered,
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

function useStateDropdown(
  fieldName,
  productIndex,
  formik,
  handleProductChange
) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(-1);
  const wrapperRef = useRef();

  useEffect(() => {
    setQuery(formik.values.products[productIndex]?.[fieldName] || "");
  }, [formik.values.products, productIndex, fieldName]);

  useEffect(() => {
    const close = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target))
        setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const filteredStates = states
    .filter((s) =>
      toUpper(typeof s === "string" ? s : s.name || "").includes(toUpper(query))
    )
    .slice(0, 10);

  const handleSelect = (i) => {
    const stateName = toUpper(
      typeof filteredStates[i] === "string"
        ? filteredStates[i]
        : filteredStates[i].name
    );
    setQuery(stateName);
    handleProductChange(productIndex, fieldName, stateName);
    setOpen(false);
    setActive(-1);
  };

  const handleInput = (e) => {
    const v = e.target.value.toUpperCase();
    setQuery(v);
    handleProductChange(productIndex, fieldName, v);
    setOpen(true);
  };

  return {
    wrapperRef,
    open,
    setOpen,
    query,
    filteredStates,
    active,
    setActive,
    handleInput,
    handleSelect,
  };
}

function useDistrictApiDropdown(
  fieldName,
  productIndex,
  formik,
  handleProductChange
) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [opts, setOpts] = useState([]);
  const [active, setActive] = useState(-1);
  const wrapperRef = useRef();
  const keepOpenOnInput = useRef(false);

  useEffect(() => {
    setQuery(formik.values.products[productIndex]?.[fieldName] || "");
  }, [formik.values.products, productIndex, fieldName]);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(async () => {
      try {
        const res = await fetch(
          `${apiBase}/districts/?status=Active&search=${encodeURIComponent(
            query.trim()
          )}`
        );
        const data = await res.json();
        setOpts(
          Array.isArray(data?.data)
            ? data.data
            : Array.isArray(data)
              ? data
              : []
        );
      } catch {
        setOpts([]);
      }
    }, 220);
    return () => clearTimeout(t);
  }, [open, query]);

  useEffect(() => {
    const close = (e) => {
      if (
        !keepOpenOnInput.current &&
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const handle = (val) => {
    const v = val.toUpperCase();
    setQuery(v);
    handleProductChange(productIndex, fieldName, v);
    setOpen(true);
  };

  const select = (i) => {
    const item = opts[i];
    if (item) {
      const districtValue = `${item.districtCode} - ${toUpper(
        item.districtName
      )}`;
      setQuery(districtValue);
      handleProductChange(productIndex, fieldName, districtValue);
      if (item.stateName) {
        handleProductChange(
          productIndex,
          "originState",
          toUpper(item.stateName)
        );
      } else if (item.stateCode) {
        const matchedState = states.find(
          (s) =>
            (s.code && s.code == item.stateCode) ||
            (s.stateCode && s.stateCode == item.stateCode)
        );
        if (matchedState)
          handleProductChange(
            productIndex,
            "originState",
            toUpper(matchedState.name || matchedState)
          );
      }
      setOpen(false);
      setActive(-1);
    }
  };

  return {
    wrapperRef,
    open,
    setOpen,
    query,
    handle,
    select,
    active,
    setActive,
    opts,
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

function usePtaFtaDropdown(
  fieldName,
  productIndex,
  formik,
  handleProductChange
) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(-1);
  const wrapperRef = useRef();
  const keepOpenOnInput = useRef(false);

  useEffect(() => {
    setQuery(formik.values.products[productIndex]?.[fieldName] || "");
  }, [formik.values.products, productIndex, fieldName]);

  useEffect(() => {
    const close = (e) => {
      if (
        !keepOpenOnInput.current &&
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const filtered = PTA_FTA_CODES.filter((opt) => {
    const code = toUpper(opt.code || "");
    const desc = toUpper(opt.description || "");
    const q = toUpper(query);
    return code.includes(q) || desc.includes(q);
  }).slice(0, 15);

  const handle = (val) => {
    const v = val.toUpperCase();
    setQuery(v);
    handleProductChange(productIndex, fieldName, v);
    setOpen(true);
  };

  const select = (i) => {
    const item = filtered[i];
    if (item) {
      const formattedValue = `${item.code} - ${item.description}`;
      setQuery(toUpper(formattedValue));
      handleProductChange(productIndex, fieldName, toUpper(formattedValue));
      setOpen(false);
      setActive(-1);
    }
  };

  return {
    wrapperRef,
    open,
    setOpen,
    query,
    handle,
    select,
    active,
    setActive,
    filtered,
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

function useEndUseDropdown(
  fieldName,
  productIndex,
  formik,
  handleProductChange
) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(-1);
  const wrapperRef = useRef(null);
  const keepOpenOnInput = useRef(false);

  useEffect(() => {
    setQuery(formik.values.products?.[productIndex]?.[fieldName] || "");
  }, [formik.values.products, productIndex, fieldName]);

  useEffect(() => {
    const close = (e) => {
      if (
        !keepOpenOnInput.current &&
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const filtered = END_USE_CODES.filter((opt) => {
    const code = (opt.code || "").toUpperCase();
    const desc = (opt.description || "").toUpperCase();
    const q = (query || "").toUpperCase();
    return code.includes(q) || desc.includes(q);
  }).slice(0, 15);

  const handle = (val) => {
    const v = (val || "").toUpperCase();
    setQuery(v);
    handleProductChange(productIndex, fieldName, v);
    setOpen(true);
  };

  const select = (i) => {
    const item = filtered[i];
    if (!item) return;
    const formattedValue = `${item.code} - ${item.description}`;
    const upper = formattedValue.toUpperCase();
    setQuery(upper);
    handleProductChange(productIndex, fieldName, upper);
    setOpen(false);
    setActive(-1);
  };

  const onInputFocus = () => {
    setOpen(true);
    setActive(-1);
    keepOpenOnInput.current = true;
  };

  const onInputBlur = () => {
    setTimeout(() => {
      keepOpenOnInput.current = false;
    }, 100);
  };

  return {
    wrapperRef,
    open,
    setOpen,
    query,
    handle,
    select,
    active,
    setActive,
    filtered,
    onInputFocus,
    onInputBlur,
  };
}

/* ---------- Field components using hooks (unchanged) ---------- */

const EximCodeField = ({
  label,
  fieldName,
  productIndex,
  placeholder,
  formik,
  handleProductChange,
}) => {
  const d = useEximCodeDropdown(
    fieldName,
    productIndex,
    formik,
    handleProductChange
  );
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
            if (!d.open) return;
            if (e.key === "ArrowDown")
              d.setActive((a) =>
                Math.min(d.filtered.length - 1, a < 0 ? 0 : a + 1)
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
        {d.open && d.filtered.length > 0 && (
          <div style={styles.acMenu}>
            {d.filtered.map((opt, i) => (
              <div
                key={i}
                style={styles.acItem(d.active === i)}
                onMouseDown={() => d.select(i)}
                onMouseEnter={() => d.setActive(i)}
              >
                {toUpper(typeof opt === "string" ? opt : opt.code || "")}
                {typeof opt !== "string" && opt.description && (
                  <span
                    style={{ marginLeft: 8, color: "#668", fontWeight: 400 }}
                  >
                    ({opt.description})
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const DistrictApiField = ({
  label,
  fieldName,
  productIndex,
  placeholder,
  formik,
  handleProductChange,
}) => {
  const d = useDistrictApiDropdown(
    fieldName,
    productIndex,
    formik,
    handleProductChange
  );
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
            if (!d.open) return;
            if (e.key === "ArrowDown")
              d.setActive((a) =>
                Math.min(d.opts.length - 1, a < 0 ? 0 : a + 1)
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
                key={opt._id || i}
                style={styles.acItem(d.active === i)}
                onMouseDown={() => d.select(i)}
                onMouseEnter={() => d.setActive(i)}
              >
                {opt.districtCode} - {toUpper(opt.districtName)}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const PtaFtaField = ({
  label,
  fieldName,
  productIndex,
  placeholder,
  formik,
  handleProductChange,
}) => {
  const d = usePtaFtaDropdown(
    fieldName,
    productIndex,
    formik,
    handleProductChange
  );
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
            if (!d.open) return;
            if (e.key === "ArrowDown")
              d.setActive((a) =>
                Math.min(d.filtered.length - 1, a < 0 ? 0 : a + 1)
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
        {d.open && d.filtered.length > 0 && (
          <div style={styles.acMenu}>
            {d.filtered.map((opt, i) => (
              <div
                key={i}
                style={styles.acItem(d.active === i)}
                onMouseDown={() => d.select(i)}
                onMouseEnter={() => d.setActive(i)}
              >
                {opt.code}{" "}
                <span style={{ fontWeight: 400, fontSize: 11, color: "#555" }}>
                  {opt.description}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
const EndUseField = ({
  label,
  fieldName,
  productIndex,
  placeholder,
  formik,
  handleProductChange,
}) => {
  const d = useEndUseDropdown(
    fieldName,
    productIndex,
    formik,
    handleProductChange
  );

  return (
    <div style={styles.field} ref={d.wrapperRef}>
      <div style={styles.label}>{label}</div>
      <div style={styles.acWrap}>
        <input
          style={styles.input}
          placeholder={placeholder}
          autoComplete="off"
          value={(d.query || "").toUpperCase()}
          onChange={(e) => d.handle(e.target.value)}
          onFocus={d.onInputFocus}
          onBlur={d.onInputBlur}
          onKeyDown={(e) => {
            if (!d.open) return;
            if (e.key === "ArrowDown") {
              d.setActive((a) =>
                Math.min(d.filtered.length - 1, a < 0 ? 0 : a + 1)
              );
            } else if (e.key === "ArrowUp") {
              d.setActive((a) => Math.max(0, a - 1));
            } else if (e.key === "Enter" && d.active >= 0) {
              e.preventDefault();
              d.select(d.active);
            } else if (e.key === "Escape") {
              d.setOpen(false);
            }
          }}
        />
        <span style={styles.acIcon}>⌄</span>
        {d.open && d.filtered.length > 0 && (
          <div style={styles.acMenu}>
            {d.filtered.map((opt, i) => (
              <div
                key={opt.code}
                style={styles.acItem(d.active === i)}
                onMouseDown={() => d.select(i)}
                onMouseEnter={() => d.setActive(i)}
              >
                {opt.code}
                <span style={{ fontWeight: 400, fontSize: 11, color: "#555" }}>
                  {" "}
                  {opt.description}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

/* ---------- ProductRow component: all hooks per-product here ---------- */

function ProductRow({
  product,
  invoice,
  index,
  formik,
  handleProductChange,
  handleUnitChange,
}) {
  const stateData = useStateDropdown(
    "originState",
    index,
    formik,
    handleProductChange
  );

  return (
    <div style={styles.card}>
      <div style={styles.cardTitle}>
        Product {index + 1} - General Details
        <span style={styles.chip}>S.No: {product.serialNumber}</span>
      </div>

      {/* 1. TOP SECTION */}
      <div style={styles.grid3}>
        <EximCodeField
          label="Exim Code"
          fieldName="eximCode"
          productIndex={index}
          placeholder="Select Exim Code"
          formik={formik}
          handleProductChange={handleProductChange}
        />
        <div style={styles.field}>
          <label style={styles.label}>NFEI Category</label>
          <input
            style={styles.input}
            value={toUpperVal(product.nfeiCategory || "")}
            onChange={(e) =>
              handleProductChange(
                index,
                "nfeiCategory",
                toUpperVal(e.target.value)
              )
            }
          />
        </div>
        <div
          style={{
            ...styles.field,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              display: "flex",
              gap: 10,
              alignItems: "center",
              marginBottom: 4,
            }}
          >
            <label style={styles.inlineCheckbox}>
              <input
                type="checkbox"
                style={styles.checkbox}
                checked={product.rewardItem || false}
                onChange={(e) =>
                  handleProductChange(index, "rewardItem", e.target.checked)
                }
              />
              Reward Item
            </label>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <label
              style={{
                ...styles.label,
                marginBottom: 0,
                whiteSpace: "nowrap",
              }}
            >
              STR Code
            </label>
            <input
              style={styles.input}
              value={product.strCode || ""}
              onChange={(e) =>
                handleProductChange(index, "strCode", e.target.value)
              }
            />
          </div>
        </div>

        {/* Row 2 */}
        <EndUseField
          label="End Use"
          fieldName="endUse"
          productIndex={index}
          placeholder="Select End Use"
          formik={formik}
          handleProductChange={handleProductChange}
        />

        <DistrictApiField
          label="Origin District"
          fieldName="originDistrict"
          productIndex={index}
          placeholder="Type Code/Name"
          formik={formik}
          handleProductChange={handleProductChange}
        />
        <div style={styles.field} ref={stateData.wrapperRef}>
          <div style={styles.label}>Origin State</div>
          <div style={styles.acWrap}>
            <input
              style={styles.input}
              placeholder="State"
              autoComplete="off"
              value={toUpper(stateData.query)}
              onChange={stateData.handleInput}
              onFocus={() => {
                stateData.setOpen(true);
                stateData.setActive(-1);
              }}
              onKeyDown={(e) => {
                if (!stateData.open) return;
                if (e.key === "ArrowDown")
                  stateData.setActive((a) =>
                    Math.min(
                      stateData.filteredStates.length - 1,
                      a < 0 ? 0 : a + 1
                    )
                  );
                else if (e.key === "ArrowUp")
                  stateData.setActive((a) => Math.max(0, a - 1));
                else if (e.key === "Enter" && stateData.active >= 0) {
                  e.preventDefault();
                  stateData.handleSelect(stateData.active);
                } else if (e.key === "Escape") stateData.setOpen(false);
              }}
            />
            {stateData.open && stateData.filteredStates.length > 0 && (
              <div style={styles.acMenu}>
                {stateData.filteredStates.map((state, i) => (
                  <div
                    key={i}
                    style={styles.acItem(stateData.active === i)}
                    onMouseDown={() => stateData.handleSelect(i)}
                    onMouseEnter={() => stateData.setActive(i)}
                  >
                    {toUpper(
                      typeof state === "string" ? state : state.name || ""
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Row 3 */}
        <PtaFtaField
          label="PTA/FTA Info"
          fieldName="ptaFtaInfo"
          productIndex={index}
          placeholder="Select PTA/FTA"
          formik={formik}
          handleProductChange={handleProductChange}
        />
        <div style={styles.field}>
          <label style={styles.label}>Alternate Qty</label>
          <input
            style={styles.input}
            type="number"
            value={product.alternateQty || 0}
            onChange={(e) =>
              handleProductChange(
                index,
                "alternateQty",
                parseFloat(e.target.value) || 0
              )
            }
          />
        </div>
        <div style={styles.field}>
          <label style={styles.label}>Material Code</label>
          <input
            style={styles.input}
            value={product.materialCode || ""}
            onChange={(e) =>
              handleProductChange(index, "materialCode", e.target.value)
            }
          />
        </div>

        {/* Row 4 */}
        <div style={styles.field}>
          <label style={styles.label}>Medicinal Plant</label>
          <input
            style={styles.input}
            value={product.medicinalPlant || ""}
            onChange={(e) =>
              handleProductChange(index, "medicinalPlant", e.target.value)
            }
          />
        </div>
        <div style={styles.field}>
          <label style={styles.label}>Formulation</label>
          <input
            style={styles.input}
            value={product.formulation || ""}
            onChange={(e) =>
              handleProductChange(index, "formulation", e.target.value)
            }
          />
        </div>
        <div style={styles.field}>
          <label style={styles.label}>Surface Material in Contact</label>
          <input
            style={styles.input}
            value={product.surfaceMaterialInContact || ""}
            onChange={(e) =>
              handleProductChange(
                index,
                "surfaceMaterialInContact",
                e.target.value
              )
            }
          />
        </div>

        {/* Row 5 */}
        <div style={styles.field}>
          <label style={styles.label}>Lab Grown Diamond</label>
          <select
            style={styles.select}
            value={product.labGrownDiamond || ""}
            onChange={(e) =>
              handleProductChange(index, "labGrownDiamond", e.target.value)
            }
          >
            <option value="">Select</option>
            <option value="Yes">Yes</option>
            <option value="No">No</option>
          </select>
        </div>
      </div>

      {/* PMV INFO */}
      <div style={styles.subSectionTitle}>PMV Info</div>
      <div style={styles.grid4}>
        <div style={styles.field}>
          <label style={styles.label}>Currency</label>
          <select
            style={styles.select}
            value={product.pmvInfo?.currency || "INR"}
            onChange={(e) =>
              handleProductChange(index, "pmvInfo.currency", e.target.value)
            }
          >
            <option value="INR">INR</option>
            {invoice?.currency && invoice.currency !== "INR" && (
              <option value={invoice.currency}>{invoice.currency}</option>
            )}
          </select>
        </div>

        <div style={styles.field}>
          <label style={styles.label}>Calc. Method</label>
          <div style={{ display: "flex", gap: 4 }}>
            <select
              style={{ ...styles.select, width: "60%" }}
              value={product.pmvInfo?.calculationMethod || "percentage"}
              onChange={(e) =>
                handleProductChange(
                  index,
                  "pmvInfo.calculationMethod",
                  e.target.value
                )
              }
            >
              <option value="percentage">%age</option>
              <option value="manual">Manual</option>
            </select>
            {/* Only show percentage input in percentage mode (default to percentage) */}
            {(product.pmvInfo?.calculationMethod ?? "percentage") ===
              "percentage" && (
                <input
                  style={{ ...styles.input, width: "40%" }}
                  type="number"
                  value={product.pmvInfo?.percentage ?? 110.0}
                  onChange={(e) =>
                    handleProductChange(
                      index,
                      "pmvInfo.percentage",
                      parseFloat(e.target.value)
                    )
                  }
                />
              )}
          </div>
        </div>

        <div style={styles.field}>
          <label style={styles.label}>PMV/Unit</label>
          <div style={{ position: "relative" }}>
            <input
              style={{
                ...styles.input,
                paddingRight: 35,
                backgroundColor:
                  (product.pmvInfo?.calculationMethod ?? "percentage") ===
                    "percentage"
                    ? "#e2e8f0"
                    : "#f7fafc",
              }}
              type="number"
              value={product.pmvInfo?.pmvPerUnit ?? 0}
              onChange={(e) =>
                handleProductChange(
                  index,
                  "pmvInfo.pmvPerUnit",
                  parseFloat(e.target.value)
                )
              }
              disabled={(product.pmvInfo?.calculationMethod ?? "percentage") ===
                "percentage"}
              readOnly={(product.pmvInfo?.calculationMethod ?? "percentage") ===
                "percentage"}
            />
            <span
              style={{
                position: "absolute",
                right: 5,
                top: 5,
                fontSize: 10,
                color: "#666",
              }}
            >
              {product.pmvInfo?.currency || "INR"}
            </span>
          </div>
        </div>

        <div style={styles.field}>
          <label style={styles.label}>Total PMV</label>
          <div style={{ position: "relative" }}>
            <input
              style={{
                ...styles.input,
                paddingRight: 35,
                backgroundColor:
                  (product.pmvInfo?.calculationMethod ?? "percentage") ===
                    "percentage"
                    ? "#e2e8f0"
                    : "#f7fafc",
              }}
              type="number"
              value={product.pmvInfo?.totalPMV ?? 0}
              onChange={(e) =>
                handleProductChange(
                  index,
                  "pmvInfo.totalPMV",
                  parseFloat(e.target.value)
                )
              }
              disabled={(product.pmvInfo?.calculationMethod ?? "percentage") ===
                "percentage"}
              readOnly={(product.pmvInfo?.calculationMethod ?? "percentage") ===
                "percentage"}
            />
            <span
              style={{
                position: "absolute",
                right: 5,
                top: 5,
                fontSize: 10,
                color: "#666",
              }}
            >
              {product.pmvInfo?.currency || "INR"}
            </span>
          </div>
        </div>
      </div>

      {/* IGST INFO */}
      <div style={styles.subSectionTitle}>IGST & Compensation Cess Info</div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: 16,
          marginBottom: 8,
        }}
      >
        <div style={{ display: "grid", gap: 8 }}>
          <div style={styles.field}>
            <label style={styles.label}>IGST Pymt Status</label>
            <select
              style={styles.select}
              value={product.igstCompensationCess?.igstPaymentStatus || "LUT"}
              onChange={(e) =>
                handleProductChange(
                  index,
                  "igstCompensationCess.igstPaymentStatus",
                  e.target.value
                )
              }
            >
              <option value="LUT">LUT (BOND)</option>
              <option value="Export Against Payment">
                Export Against Payment
              </option>
            </select>
          </div>
          <div style={styles.field}>
            <label style={styles.label}>IGST Rate (%)</label>
            <input
              style={styles.input}
              type="number"
              value={product.igstCompensationCess?.igstRate ?? 0}
              onChange={(e) =>
                handleProductChange(
                  index,
                  "igstCompensationCess.igstRate",
                  parseFloat(e.target.value)
                )
              }
            />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Comp. Cess(%)</label>
            <input
              style={styles.input}
              type="number"
              value={product.igstCompensationCess?.compensationCessRate ?? 0}
              onChange={(e) =>
                handleProductChange(
                  index,
                  "igstCompensationCess.compensationCessRate",
                  parseFloat(e.target.value)
                )
              }
            />
          </div>
        </div>
        <div style={{ display: "grid", gap: 8 }}>
          <div style={styles.field}>
            <label style={styles.label}>Taxable Value (INR)</label>
            <input
              style={styles.input}
              type="number"
              value={product.igstCompensationCess?.taxableValueINR ?? 0}
              onChange={(e) =>
                handleProductChange(
                  index,
                  "igstCompensationCess.taxableValueINR",
                  parseFloat(e.target.value)
                )
              }
            />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>IGST Amt (INR)</label>
            <input
              style={styles.input}
              type="number"
              value={product.igstCompensationCess?.igstAmountINR ?? 0}
              onChange={(e) =>
                handleProductChange(
                  index,
                  "igstCompensationCess.igstAmountINR",
                  parseFloat(e.target.value)
                )
              }
            />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Comp. Cess Amt(INR)</label>
            <input
              style={styles.input}
              type="number"
              value={
                product.igstCompensationCess?.compensationCessAmountINR ?? 0
              }
              onChange={(e) =>
                handleProductChange(
                  index,
                  "igstCompensationCess.compensationCessAmountINR",
                  parseFloat(e.target.value)
                )
              }
            />
          </div>
        </div>
      </div>

      {/* RODTEP INFO */}
      <div style={styles.subSectionTitle}>RODTEP Info</div>
      <div style={styles.grid3}>
        <div style={styles.field}>
          <label style={styles.label}>RODTEP Claim</label>
          <select
            style={styles.select}
            value={product.rodtepInfo?.claim || "Yes"}
            onChange={(e) =>
              handleProductChange(index, "rodtepInfo.claim", e.target.value)
            }
          >
            <option value="Yes">Yes</option>
            <option value="No">No</option>
          </select>
        </div>

        <div style={styles.field}>
          <label style={styles.label}>Quantity</label>
          <div style={{ display: "flex", gap: 4 }}>
            <input
              style={{ ...styles.input, width: "65%" }}
              type="number"
              value={product.rodtepInfo?.quantity ?? 0}
              onChange={(e) =>
                handleProductChange(
                  index,
                  "rodtepInfo.quantity",
                  parseFloat(e.target.value)
                )
              }
            />
            <div style={{ width: "35%" }}>
              <UnitDropdownField
                label=""
                fieldName={`products[${index}].rodtepInfo.unit`}
                formik={formik}
                unitOptions={unitCodes}
                placeholder="UNIT"
                onSelect={(value) => handleUnitChange(index, "unit", value)}
                disabled={true}
              />
            </div>
          </div>
        </div>

        <div style={styles.field}>
          <label style={styles.label}>Rate (in %)</label>
          <input
            style={styles.input}
            type="number"
            value={product.rodtepInfo?.ratePercent ?? 0}
            onChange={(e) =>
              handleProductChange(
                index,
                "rodtepInfo.ratePercent",
                parseFloat(e.target.value)
              )
            }
          />
        </div>

        <div style={styles.field}>
          <label style={styles.label}>Cap Value</label>
          <input
            style={styles.input}
            type="number"
            value={product.rodtepInfo?.capValue ?? 0}
            onChange={(e) =>
              handleProductChange(
                index,
                "rodtepInfo.capValue",
                parseFloat(e.target.value)
              )
            }
          />
        </div>

        <div style={styles.field}>
          <label style={styles.label}>Cap value per units</label>
          <div style={{ display: "flex", gap: 4 }}>
            <input
              style={{ ...styles.input, width: "65%" }}
              type="number"
              value={product.rodtepInfo?.capValuePerUnits ?? 0}
              onChange={(e) =>
                handleProductChange(
                  index,
                  "rodtepInfo.capValuePerUnits",
                  parseFloat(e.target.value)
                )
              }
            />
            <div style={{ width: "35%" }}>
              <UnitDropdownField
                label=""
                fieldName={`products[${index}].rodtepInfo.capUnit`}
                formik={formik}
                unitOptions={unitCodes}
                placeholder="UNIT"
                onSelect={(value) => handleUnitChange(index, "capUnit", value)}
                disabled={true}
              />
            </div>
          </div>
        </div>

        <div style={styles.field}>
          <label style={styles.label}>RODTEP Amount(INR)</label>
          <input
            style={styles.input}
            type="number"
            value={product.rodtepInfo?.amountINR ?? 0}
            onChange={(e) =>
              handleProductChange(
                index,
                "rodtepInfo.amountINR",
                parseFloat(e.target.value)
              )
            }
          />
        </div>
      </div>
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: "#4a5568",
          fontStyle: "italic",
          marginTop: -8,
        }}
      >
        RODTEP Amt is Calculated on FOB value
      </div>
    </div>
  );
}

/* ---------- MAIN COMPONENT ---------- */

// ...imports and helper hooks unchanged above

/* ---------- MAIN COMPONENT ---------- */

const ProductGeneralTab = ({ formik, selectedProductIndex }) => {
  const products = formik.values.products || [];
  const product = products[selectedProductIndex]; // single product
  const invoice = formik.values.invoices?.[0];

  const [exchangeRates, setExchangeRates] = useState([]);
  const [ratesLoading, setRatesLoading] = useState(true);

  const getTodayFormatted = () => {
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, "0");
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const yyyy = today.getFullYear();
    return `${dd}-${mm}-${yyyy}`;
  };

  useEffect(() => {
    const fetchRates = async () => {
      try {
        const todayDate = getTodayFormatted(); // DD-MM-YYYY format
        setRatesLoading(true);
        const res = await fetch(`${apiBase}/currency-rates/by-date/${todayDate}`);
        const data = await res.json();
        if (data && data.success && data.data) {
          const latestRates = data.data.exchange_rates || [];
          setExchangeRates(latestRates);
        } else if (data && data.success && Array.isArray(data.data) && data.data.length > 0) {
          const latestEntry = data.data[0];
          setExchangeRates(latestEntry.exchange_rates || []);
        }
      } catch (error) {
        // quiet error
      } finally {
        setRatesLoading(false);
      }
    };
    fetchRates();
  }, []);

  const getExportRate = useCallback(
    (currencyCode) => {
      if (!currencyCode || currencyCode === "INR") return 1;
      const code = currencyCode.toString().toUpperCase();
      const rateObj = exchangeRates.find(
        (r) => (r.currency_code || r.code || "").toString().toUpperCase() === code
      );
      if (!rateObj) return 1;
      const raw = rateObj.export_rate ?? rateObj.exportRate ?? rateObj.rate ?? 0;
      const unit = parseFloat(rateObj.unit) || 1;
      const num = parseFloat(raw);
      if (isNaN(num) || unit <= 0) return 1;
      return num / unit;
    },
    [exchangeRates]
  );

  const convertToINR = useCallback(
    (amount, fromCurrency) => {
      if (!amount) return 0;
      if (!fromCurrency || fromCurrency === "INR") return parseFloat(amount) || 0;

      const rate = getExportRate(fromCurrency);
      const total = parseFloat(amount) * rate;
      return Number.isFinite(total) ? total : 0;
    },
    [getExportRate]
  );

  // Calculate PMV values
  const calculatePMV = useCallback(
    (prod, inv) => {
      const pmvCurrency = prod.pmvInfo?.currency || "INR";
      const amount = parseFloat(prod.amount) || 0;
      const quantity = parseFloat(prod.quantity) || 1;
      const amountCurrency = inv?.currency || "INR";

      const amountInINR = convertToINR(amount, amountCurrency);
      const method = prod.pmvInfo?.calculationMethod || "percentage";

      if (method === "percentage") {
        const percentage = parseFloat(prod.pmvInfo?.percentage) || 110;
        let totalPMV_INR = (amountInINR * percentage) / 100;
        let pmvPerUnit_INR = totalPMV_INR / quantity;

        let totalPMV = totalPMV_INR;
        let pmvPerUnit = pmvPerUnit_INR;

        if (pmvCurrency !== "INR") {
          const rate = getExportRate(pmvCurrency);
          if (rate > 0) {
            totalPMV = totalPMV_INR / rate;
            pmvPerUnit = pmvPerUnit_INR / rate;
          }
        }

        return {
          pmvPerUnit: pmvPerUnit.toFixed(2),
          totalPMV: totalPMV.toFixed(2),
        };
      }
      return {
        pmvPerUnit: prod.pmvInfo?.pmvPerUnit || 0,
        totalPMV: prod.pmvInfo?.totalPMV || 0,
      };
    },
    [convertToINR, getExportRate]
  );

  const handleProductChange = useCallback(
    (index, field, value) => {
      const updatedProducts = [...formik.values.products];

      if (field.includes(".")) {
        const [parent, child] = field.split(".");
        if (!updatedProducts[index][parent])
          updatedProducts[index][parent] = {};
        updatedProducts[index][parent] = {
          ...updatedProducts[index][parent],
          [child]: value,
        };
      } else {
        updatedProducts[index][field] = value;
      }

      // Auto-calculate PMV if in percentage mode
      const prod = updatedProducts[index];
      const method = prod.pmvInfo?.calculationMethod || "percentage";
      if (method === "percentage") {
        const calculated = calculatePMV(prod, invoice);
        updatedProducts[index].pmvInfo = {
          ...updatedProducts[index].pmvInfo,
          pmvPerUnit: calculated.pmvPerUnit,
          totalPMV: calculated.totalPMV,
        };
      }

      formik.setFieldValue("products", updatedProducts);
    },
    [formik, calculatePMV, invoice]
  );

  const handleUnitChange = useCallback(
    (index, unitField, unitValue) => {
      formik.setFieldValue(
        `products[${index}].rodtepInfo.${unitField}`,
        unitValue
      );
      handleProductChange(index, `rodtepInfo.${unitField}`, unitValue);
    },
    [formik, handleProductChange]
  );

  // const addNewProduct = useCallback(() => {
  //   const newProduct = {
  //     serialNumber: formik.values.products.length + 1,
  //     description: "",
  //     ritc: "",
  //     quantity: 0,
  //     unitPrice: 0,
  //     per: "",
  //     amount: 0,
  //     eximCode: "",
  //     nfeiCategory: "",
  //     rewardItem: false,
  //     strCode: "",
  //     endUse: "",
  //     originDistrict: "",
  //     originState: "",
  //     ptaFtaInfo: "",
  //     alternateQty: 0,
  //     materialCode: "",
  //     medicinalPlant: "",
  //     formulation: "",
  //     surfaceMaterialInContact: "",
  //     labGrownDiamond: "",
  //     pmvInfo: {
  //       currency: "INR",
  //       calculationMethod: "percentage",
  //       percentage: 110.0,
  //       pmvPerUnit: 0,
  //       totalPMV: 0,
  //     },
  //     igstCompensationCess: {
  //       igstPaymentStatus: "LUT",
  //       taxableValueINR: 0,
  //       igstRate: 18.0,
  //       igstAmountINR: 0,
  //       compensationCessRate: 0,
  //       compensationCessAmountINR: 0,
  //     },
  //     rodtepInfo: {
  //       claim: "Yes",
  //       quantity: 0,
  //       ratePercent: 0.9,
  //       capValue: 0,
  //       capValuePerUnits: 0,
  //       amountINR: 0,
  //       unit: "KGS",
  //     },
  //   };
  //   formik.setFieldValue("products", [...formik.values.products, newProduct]);
  // }, [formik]);

  const removeProduct = useCallback(
    (index) => {
      if (formik.values.products.length > 1) {
        formik.setFieldValue(
          "products",
          formik.values.products.filter((_, i) => i !== index)
        );
      }
    },
    [formik]
  );

  // Recalculate PMV for all products when invoice currency changes
  // keep invoice, calculatePMV defined as in your file

  useEffect(() => {
    if (!invoice?.currency) return;

    const currentProducts = formik.values.products || [];
    let changed = false;
    const updatedProducts = currentProducts.map((prod) => {
      const method = prod.pmvInfo?.calculationMethod || "percentage";
      if (method !== "percentage") return prod;

      const calculated = calculatePMV(prod, invoice);
      const nextPmv = {
        ...(prod.pmvInfo || {}),
        pmvPerUnit: calculated.pmvPerUnit,
        totalPMV: calculated.totalPMV,
      };

      // shallow equality check to avoid useless updates
      if (
        nextPmv.pmvPerUnit !== prod.pmvInfo?.pmvPerUnit ||
        nextPmv.totalPMV !== prod.pmvInfo?.totalPMV
      ) {
        changed = true;
        return { ...prod, pmvInfo: nextPmv };
      }
      return prod;
    });

    if (changed) {
      formik.setFieldValue("products", updatedProducts);
    }
  }, [invoice?.currency, calculatePMV]); // ❗ remove formik.values.products, formik, invoice

  return (
    <div style={styles.page}>
      <div style={styles.sectionTitle}>Product General Information</div>

      {/* Top table of products */}
      <div style={styles.tableContainer}>
        <table style={styles.table}>
          <thead>
            <tr>
              {[
                "S.No",
                "Description",
                "RITC/Tariff",
                "Qty",
                "Qty Unit",
                "Unit Price",
                "Unit Currency",
                "Per",
                "Per Unit",
                "Amount",
                "Amount Unit",
              ].map((h) => (
                <th key={h} style={styles.th}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(() => {
              const productsLocal = formik.values.products || [];
              const rowProduct = productsLocal[selectedProductIndex] || null;
              if (!rowProduct) return null;
              const index = selectedProductIndex;

              return (
                <tr key={rowProduct._id || index}>
                  <td style={styles.td}>{rowProduct.serialNumber}</td>

                  <td style={styles.td}>
                    <textarea
                      style={styles.textarea}
                      value={toUpperVal(rowProduct.description || "")}
                      readOnly
                    />
                  </td>

                  <td style={styles.td}>
                    <input
                      style={styles.input}
                      value={rowProduct.ritc || ""}
                      readOnly
                    />
                  </td>

                  <td style={styles.td}>
                    <input
                      style={styles.input}
                      type="number"
                      value={rowProduct.quantity || 0}
                      readOnly
                    />
                  </td>
                  <td style={styles.td}>
                    <input
                      style={styles.input}
                      value={rowProduct.qtyUnit || ""}
                      readOnly
                    ></input>
                  </td>

                  <td style={styles.td}>
                    <input
                      style={styles.input}
                      type="number"
                      value={rowProduct.unitPrice || 0}
                      readOnly
                    />
                  </td>

                  <td style={styles.td}>
                    <input
                      style={styles.input}
                      value={invoice?.currency || ""}
                      readOnly
                    />
                  </td>

                  <td style={styles.td}>
                    <input
                      style={styles.input}
                      value={rowProduct.per || ""}
                      readOnly
                    />
                  </td>
                  <td style={styles.td}>
                    <input
                      style={styles.input}
                      value={rowProduct.perUnit || ""}
                      readOnly
                    />
                  </td>

                  <td style={styles.td}>
                    <input
                      style={styles.input}
                      type="number"
                      value={rowProduct.amount || 0}
                      readOnly
                    />
                  </td>

                  <td style={styles.td}>
                    <input
                      style={styles.input}
                      value={invoice?.currency || ""}
                      readOnly
                    />
                  </td>
                </tr>
              );
            })()}
          </tbody>
        </table>
      </div>
      {/* 
      <button style={styles.addBtn} onClick={addNewProduct}>
        ➕ Add New Product
      </button> */}

      {/* Detailed card for selected product only */}
      {product && (
        <ProductRow
          key={product.id || selectedProductIndex}
          invoice={invoice}
          product={product}
          index={selectedProductIndex}
          formik={formik}
          handleProductChange={handleProductChange}
          handleUnitChange={handleUnitChange}
        />
      )}
    </div>
  );
};

export default ProductGeneralTab;
