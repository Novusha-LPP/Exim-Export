import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { priorityFilter } from "../../utils/filterUtils";

const AutocompleteSelect = ({
  options,
  value,
  onChange,
  placeholder = "Select Option",
  style = {},
  name,
  disabled = false,
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(-1);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });
  const wrapperRef = useRef(null);

  // Update dropdown position when open
  const updateCoords = () => {
    if (wrapperRef.current) {
      const rect = wrapperRef.current.getBoundingClientRect();
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

  // Sync query with selected value only when not open or not typing
  useEffect(() => {
    const selected = options.find((opt) =>
      String(opt.value).toUpperCase() === String(value).toUpperCase()
    );
    if (!open) setQuery(selected ? selected.label : "");
  }, [value, options, open]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        // Also check if click is inside the portal dropdown
        const portalDropdown = document.getElementById(`autocomplete-dropdown-${name}`);
        if (portalDropdown && portalDropdown.contains(event.target)) {
          return;
        }
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [name]);

  const filtered = priorityFilter(options, query, (opt) => opt.label);

  const handleSelect = (opt) => {
    onChange({ target: { name, value: opt.value } });
    setQuery(opt.label);
    setOpen(false);
  };

  return (
    <div
      ref={wrapperRef}
      style={{
        position: "relative",
        width: "100%",
        ...style,
      }}
    >
      <div style={{ position: "relative" }}>
        <input
          disabled={disabled}
          style={{
            width: "100%",
            padding: "2px 20px 2px 6px",
            border: "1px solid #cbd5e1",
            borderRadius: 3,
            fontSize: 11,
            background: disabled ? "#f1f5f9" : "#fff",
            cursor: disabled ? "not-allowed" : "text",
            color: disabled ? "#94a3b8" : "#1e293b",
            boxSizing: "border-box",
            height: 24,
            textTransform: "uppercase",
            fontWeight: 500,
            outline: "none",
          }}
          placeholder={placeholder}
          value={query}
          onChange={(e) => {
            if (disabled) return;
            setQuery(e.target.value.toUpperCase());
            setOpen(true);
          }}
          onFocus={() => {
            if (disabled) return;
            setOpen(true);
            setQuery(""); // Clear on focus to show all options
            setActive(-1);
          }}
          onKeyDown={(e) => {
            if (disabled) return;
            if (e.key === "Tab") {
              if (open) {
                if (active >= 0 && filtered[active]) {
                  handleSelect(filtered[active]);
                } else if (filtered.length === 1) {
                  handleSelect(filtered[0]);
                } else {
                  setOpen(false);
                  const tm = query.trim().toUpperCase();
                  if (tm !== query) {
                    setQuery(tm);
                  }
                }
              }
              return;
            }

            if (e.key === "ArrowDown") {
              setOpen(true);
              setActive((prev) => Math.min(prev + 1, filtered.length - 1));
            } else if (e.key === "ArrowUp") {
              setActive((prev) => Math.max(prev - 1, 0));
            } else if (e.key === "Enter" && active >= 0) {
              e.preventDefault();
              handleSelect(filtered[active]);
            } else if (e.key === "Escape") {
              setOpen(false);
            }
          }}
        />
        {!disabled && (
          <span
            style={{
              position: "absolute",
              right: 6,
              top: "50%",
              transform: "translateY(-50%)",
              fontSize: 8,
              color: "#94a3b8",
              pointerEvents: "none",
            }}
          >
            ▼
          </span>
        )}
      </div>
      {open && !disabled && filtered.length > 0 &&
        createPortal(
          <div
            id={`autocomplete-dropdown-${name}`}
            style={{
              position: "absolute",
              top: coords.top + 2,
              left: coords.left,
              width: Math.max(coords.width, 120),
              maxHeight: 180,
              overflowY: "auto",
              background: "#fff",
              border: "1px solid #cbd5e1",
              borderRadius: 4,
              boxShadow:
                "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
              zIndex: 1000001,
            }}
          >
            {filtered.map((opt, i) => (
              <div
                key={opt.value + i}
                style={{
                  padding: "4px 8px",
                  cursor: "pointer",
                  fontSize: 11,
                  fontWeight: i === active ? 700 : 500,
                  background:
                    i === active
                      ? "#f1f5f9"
                      : value === opt.value
                        ? "#f8fafc"
                        : "#fff",
                  color: i === active ? "#1e3a8a" : "#334155",
                  borderBottom: "1px solid #f1f5f9",
                  textTransform: "uppercase",
                }}
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSelect(opt);
                }}
                onMouseEnter={() => setActive(i)}
              >
                {opt.label}
              </div>
            ))}
          </div>,
          document.body
        )}
    </div>
  );
};

export default AutocompleteSelect;

