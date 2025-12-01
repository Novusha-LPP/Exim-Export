import React, { useState, useRef, useEffect } from "react";

// Styles matching your existing design
const styles = {
  field: { marginBottom: 8 },
  label: { 
    fontSize: 11, 
    fontWeight: 700, 
    color: "#263046", 
    letterSpacing: 1, 
    textTransform: "uppercase", 
    marginBottom: 1 
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
    boxSizing: "border-box"
  },
  acWrap: { position: "relative" },
  acIcon: { 
    position: "absolute", 
    right: 8, 
    top: 8, 
    fontSize: 11, 
    color: "#bbbbbb", 
    pointerEvents: "none" 
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
    overflow: "auto"
  },
  acItem: (active) => ({
    padding: "6px 9px", 
    cursor: "pointer", 
    textTransform: "uppercase",
    background: active ? "#eaf2fe" : "#fff", 
    color: active ? "#18427c" : "#1b2b38", 
    fontWeight: active ? 700 : 600,
    borderBottom: "1px solid #f0f0f0"
  }),
  description: {
    fontSize: 10,
    color: "#666",
    fontWeight: 400,
    marginTop: 2,
    fontStyle: "italic"
  }
};

function toUpper(v) { 
  return (typeof v === "string" ? v : "")?.toUpperCase() || ""; 
}

function EximCodeDropdownField({ label, fieldName, formik, eximOptions, placeholder = "SELECT EXIM CODE" }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(formik.values[fieldName] || "");
  const [active, setActive] = useState(-1);
  const wrapperRef = useRef();

  // Filter options by code or description
  const filtered = (eximOptions || [])
    .filter(opt => 
      toUpper(opt.code).includes(query.toUpperCase()) ||
      toUpper(opt.description).includes(query.toUpperCase())
    )
    .slice(0, 10);

  // Sync with formik value
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
    const selected = filtered[i];
    if (selected) {
      const displayValue = `${selected.code} - ${selected.description}`;
      setQuery(toUpper(displayValue));
      formik.setFieldValue(fieldName, toUpper(selected.code)); // Store only the code
      setOpen(false);
      setActive(-1);
    }
  }

  function getDisplayValue(currentValue) {
    if (!currentValue) return "";
    
    // If it's already in "CODE - DESCRIPTION" format, return as is
    if (currentValue.includes("-")) return currentValue;
    
    // If it's just the code, find the description
    const found = eximOptions.find(opt => opt.code === currentValue);
    return found ? `${found.code} - ${found.description}` : currentValue;
  }

  return (
    <div style={styles.field} ref={wrapperRef}>
      <div style={styles.label}>{label}</div>
      <div style={styles.acWrap}>
        <input
          style={styles.input}
          placeholder={placeholder}
          autoComplete="off"
          value={getDisplayValue(query)}
          onChange={e => {
            const value = e.target.value.toUpperCase();
            setQuery(value);
            formik.setFieldValue(fieldName, value.split(" - ")[0]); // Store only code part
            setOpen(true);
          }}
          onFocus={() => { setOpen(true); setActive(-1); }}
          onKeyDown={e => {
            if (!open) return;
            if (e.key === "ArrowDown") setActive(a => Math.min(filtered.length - 1, a < 0 ? 0 : a + 1));
            else if (e.key === "ArrowUp") setActive(a => Math.max(0, a - 1));
            else if (e.key === "Enter" && active >= 0) { 
              e.preventDefault(); 
              handleSelect(active); 
            }
            else if (e.key === "Escape") setOpen(false);
          }}
        />
        <span style={styles.acIcon}>▼</span>
        {open && filtered.length > 0 && (
          <div style={styles.acMenu}>
            {filtered.map((opt, i) => (
              <div
                key={opt.code}
                style={styles.acItem(active === i)}
                onMouseDown={() => handleSelect(i)}
                onMouseEnter={() => setActive(i)}
              >
                <div>{opt.code} - {opt.description}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default EximCodeDropdownField;