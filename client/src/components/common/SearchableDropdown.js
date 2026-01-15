import React, { useState, useEffect, useRef } from "react";

const SearchableDropdown = ({
  options,
  value,
  onChange,
  placeholder = "Select Option",
  style = {},
  disabled = false,
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value || "");
  const [active, setActive] = useState(-1);
  const wrapperRef = useRef(null);

  useEffect(() => {
    setQuery(value || "");
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredOptions = options.filter((opt) => {
    const optVal = typeof opt === "string" ? opt : opt.code || opt.name || "";
    return optVal.toLowerCase().includes(query.toLowerCase());
  });

  const handleSelect = (opt) => {
    const optVal = typeof opt === "string" ? opt : opt.code || opt.name || "";
    setQuery(optVal);
    onChange({ target: { value: optVal } });
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
          style={{
            width: "100%",
            padding: "3px 24px 3px 7px",
            border: "1px solid #cbd5e1",
            borderRadius: 3,
            fontSize: 12,
            height: 25,
            background: disabled ? "#f1f5f9" : "#ffffff",
            outline: "none",
            boxSizing: "border-box",
            color: "#1e293b",
            fontWeight: 600,
            textTransform: "uppercase",
          }}
          placeholder={placeholder}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value.toUpperCase());
            setOpen(true);
          }}
          onFocus={() => !disabled && setOpen(true)}
          disabled={disabled}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              setOpen(true);
              setActive((prev) =>
                Math.min(prev + 1, filteredOptions.length - 1)
              );
            } else if (e.key === "ArrowUp") {
              setActive((prev) => Math.max(prev - 1, 0));
            } else if (e.key === "Enter" && active >= 0) {
              handleSelect(filteredOptions[active]);
            } else if (e.key === "Escape") {
              setOpen(false);
            }
          }}
          onBlur={() => {
            const trimmed = query.trim();
            // Find match in options
            const match = options.find((opt) => {
              const optVal =
                typeof opt === "string" ? opt : opt.code || opt.name || "";
              return optVal.toUpperCase() === trimmed.toUpperCase();
            });

            if (match) {
              handleSelect(match);
            } else {
              // If no match, just update query with trimmed value to ensure clean input
              setQuery(trimmed);
              if (trimmed !== query) {
                onChange({ target: { value: trimmed } });
              }
            }
            // Delay closing slightly to allow click on option to register (if click happened)
            // But onMouseDown on option prevents blur issue usually.
            // However, if we tab away, we want to close.
            setTimeout(() => setOpen(false), 200);
          }}
        />
        <span
          style={{
            position: "absolute",
            right: 8,
            top: "50%",
            transform: "translateY(-50%)",
            fontSize: 10,
            color: "#94a3b8",
            pointerEvents: "none",
          }}
        >
          ▼
        </span>
      </div>
      {open && filteredOptions.length > 0 && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 2px)",
            left: 0,
            right: 0,
            zIndex: 1000,
            background: "#fff",
            border: "1px solid #cbd5e1",
            borderRadius: 4,
            maxHeight: 180,
            overflowY: "auto",
            boxShadow:
              "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
          }}
        >
          {filteredOptions.map((opt, i) => {
            const optVal =
              typeof opt === "string" ? opt : opt.code || opt.name || "";
            return (
              <div
                key={i}
                style={{
                  padding: "6px 10px",
                  cursor: "pointer",
                  background: i === active ? "#f1f5f9" : "#ffffff",
                  borderBottom: "1px solid #f1f5f9",
                  fontSize: 11,
                  fontWeight: i === active ? 700 : 600,
                  color: i === active ? "#1e3a8a" : "#334155",
                  textTransform: "uppercase",
                }}
                onMouseDown={() => handleSelect(opt)}
                onMouseEnter={() => setActive(i)}
              >
                {optVal}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SearchableDropdown;
