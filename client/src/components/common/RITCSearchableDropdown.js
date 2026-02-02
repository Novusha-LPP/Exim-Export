import React, { useState, useEffect, useRef, useCallback } from "react";
import ReactDOM from "react-dom";
import { priorityFilter } from "../../utils/filterUtils";

const RITCSearchableDropdown = ({
  value,
  onChange,
  style = {},
  disabled = false,
  placeholder = "Search RITC...",
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value || "");
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(-1);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });
  const wrapperRef = useRef(null);
  const abortControllerRef = useRef(null);
  
  // Store onChange in a ref to avoid triggering useEffect when parent re-renders
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

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
          width: Math.max(rect.width, 300),
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

  const fetchOptions = useCallback(async (search) => {
    if (!search || search.trim().length < 2) {
      setOptions([]);
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append("search", search.trim());
      params.append("page", 1);
      params.append("limit", 20);

      const res = await fetch(
        `${import.meta.env.VITE_API_STRING}/getCthsExport?${params.toString()}`,
        { signal: abortControllerRef.current.signal },
      );
      const data = await res.json();
      const list = Array.isArray(data?.data)
        ? data.data
        : Array.isArray(data)
          ? data
          : [];

      // Apply priority sorting on client side to the results fetched from server
      const sorted = priorityFilter(list, search, (opt) =>
        `${opt.hs_code || ""} ${opt.item_description || ""}`,
      );
      setOptions(sorted);

      // Auto-match if exact HS Code is found (for Paste functionality)
      const exactMatch = sorted.find((s) => s.hs_code === search);
      if (exactMatch) {
        onChangeRef.current({ target: { value: search }, origin: exactMatch });
      }
    } catch (e) {
      if (e.name !== "AbortError") {
        console.error("RITC fetch error", e);
        setOptions([]);
      }
    } finally {
      setLoading(false);
    }
  }, []); // No dependencies - uses refs internally

  const firstRender = useRef(true);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }

    // allow fetch even if closed (for paste-and-tab support)
    const timer = setTimeout(() => {
      fetchOptions(query);
    }, 300);
    return () => clearTimeout(timer);
  }, [query, fetchOptions]);

  const handleSelect = (opt) => {
    const hs = opt.hs_code || "";
    setQuery(hs);
    onChange({ target: { value: hs }, origin: opt });
    setOpen(false);
  };

  const dropdownMenu =
    open && (options.length > 0 || loading) ? (
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
          maxHeight: 250,
          overflowY: "auto",
          boxShadow:
            "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
        }}
      >
        {loading && (
          <div style={{ padding: 8, fontSize: 11, color: "#64748b" }}>
            Loading...
          </div>
        )}
        {!loading &&
          options.map((opt, i) => (
            <div
              key={i}
              style={{
                padding: "8px 10px",
                cursor: "pointer",
                background: i === active ? "#f1f5f9" : "#ffffff",
                borderBottom: "1px solid #f1f5f9",
                fontSize: 11,
              }}
              onMouseDown={(e) => {
                e.preventDefault();
                handleSelect(opt);
              }}
              onMouseEnter={() => setActive(i)}
            >
              <div
                style={{
                  fontWeight: 700,
                  color: "#1e3a8a",
                  display: "flex",
                  justifyContent: "space-between",
                }}
              >
                <span>{opt.hs_code}</span>
                {opt.basic_duty_sch_tarrif != null && (
                  <span style={{ fontSize: 10, color: "#2563eb" }}>
                    BD: {opt.basic_duty_sch_tarrif}
                  </span>
                )}
              </div>
              <div
                style={{
                  fontSize: 10,
                  color: "#475569",
                  marginTop: 2,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {opt.item_description}
              </div>
            </div>
          ))}
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
            padding: "3px 7px",
            border: "1px solid #cbd5e1",
            borderRadius: 3,
            fontSize: 12,
            height: 25,
            background: disabled ? "#f1f5f9" : "#ffffff",
            outline: "none",
            boxSizing: "border-box",
            color: "#1e293b",
            fontWeight: 700,
            textTransform: "uppercase",
          }}
          placeholder={placeholder}
          value={query}
          onChange={(e) => {
            const val = e.target.value.toUpperCase();
            setQuery(val);
            onChange({ target: { value: val } }); // Propagate text immediately
            setOpen(true);
            setActive(-1);
          }}
          onFocus={() => !disabled && setOpen(true)}
          disabled={disabled}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              setOpen(true);
              setActive((prev) => Math.min(prev + 1, options.length - 1));
            } else if (e.key === "ArrowUp") {
              setActive((prev) => Math.max(prev - 1, 0));
            } else if (e.key === "Enter" && active >= 0) {
              e.preventDefault();
              handleSelect(options[active]);
            } else if (e.key === "Tab") {
              if (options.length > 0) {
                // Select active option, or first option logic
                const indexToSelect = active >= 0 ? active : 0;
                handleSelect(options[indexToSelect]);
              }
            } else if (e.key === "Escape") {
              setOpen(false);
            }
          }}
          onBlur={() => {
            setTimeout(() => setOpen(false), 200);
          }}
        />
      </div>
      {ReactDOM.createPortal(dropdownMenu, document.body)}
    </div>
  );
};

export default RITCSearchableDropdown;
