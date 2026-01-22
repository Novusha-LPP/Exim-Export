import React, { useState, useEffect, useRef } from "react";
import ReactDOM from "react-dom";
import { priorityFilter } from "../../utils/filterUtils";

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
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });
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

  // Update position on scroll or resize when open
  useEffect(() => {
    const updatePosition = () => {
      if (open && wrapperRef.current) {
        const rect = wrapperRef.current.getBoundingClientRect();
        setCoords({
          top: rect.bottom,
          left: rect.left,
          width: rect.width,
        });
      }
    };

    if (open) {
      updatePosition();
      window.addEventListener("scroll", updatePosition, true);
      window.addEventListener("resize", updatePosition);
    }
    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [open]);

  const filteredOptions = priorityFilter(options, query, (opt) =>
    typeof opt === "string" ? opt : opt.code || opt.name || "",
  );

  const handleSelect = (opt) => {
    const optVal = typeof opt === "string" ? opt : opt.code || opt.name || "";
    setQuery(optVal);
    onChange({ target: { value: optVal } });
    setOpen(false);
  };

  const dropdownMenu =
    open && filteredOptions.length > 0 ? (
      <div
        style={{
          position: "fixed",
          top: coords.top + 2,
          left: coords.left,
          width: coords.width,
          zIndex: 999999,
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
              onMouseDown={(e) => {
                e.preventDefault();
                handleSelect(opt);
              }}
              onMouseEnter={() => setActive(i)}
            >
              {optVal}
            </div>
          );
        })}
      </div>
    ) : null;

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
            if (e.key === "Tab") {
              if (open) {
                if (active >= 0 && filteredOptions[active]) {
                  handleSelect(filteredOptions[active]);
                } else if (filteredOptions.length === 1) {
                  handleSelect(filteredOptions[0]);
                } else {
                  setOpen(false);
                  const tm = query.trim().toUpperCase();
                  if (tm !== query) {
                    setQuery(tm);
                    onChange({ target: { value: tm } });
                  }
                }
              } else {
                const tm = query.trim().toUpperCase();
                if (tm !== query) {
                  setQuery(tm);
                  onChange({ target: { value: tm } });
                }
              }
              return;
            }

            if (e.key === "ArrowDown") {
              setOpen(true);
              setActive((prev) =>
                Math.min(prev + 1, filteredOptions.length - 1),
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
            const match = options.find((opt) => {
              const optVal =
                typeof opt === "string" ? opt : opt.code || opt.name || "";
              return optVal.toUpperCase() === trimmed.toUpperCase();
            });

            if (match) {
              handleSelect(match);
            } else {
              setQuery(trimmed);
              if (trimmed !== query) {
                onChange({ target: { value: trimmed } });
              }
            }
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
      {ReactDOM.createPortal(dropdownMenu, document.body)}
    </div>
  );
};

export default SearchableDropdown;
