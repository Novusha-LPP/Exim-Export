import React, { useState, useEffect, useRef } from "react";

const AutocompleteSelect = ({
    options,
    value,
    onChange,
    placeholder = "Select Option",
    style = {},
    name,
}) => {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [active, setActive] = useState(-1);
    const wrapperRef = useRef(null);

    // Sync query with selected value only when not open or not typing
    useEffect(() => {
        const selected = options.find((opt) => opt.value === value);
        if (!open) setQuery(selected ? selected.label : "");
    }, [value, options, open]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const filtered = options.filter((opt) =>
        (opt.label || "").toUpperCase().includes(query.toUpperCase())
    );

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
                    style={{
                        width: "100%",
                        padding: "3px 24px 3px 7px",
                        border: "1px solid #cbd5e1",
                        borderRadius: 3,
                        fontSize: 12,
                        background: "#fff",
                        boxSizing: "border-box",
                        height: 25,
                        textTransform: "uppercase",
                        fontWeight: 500,
                        outline: "none",
                        color: "#1e293b",
                    }}
                    placeholder={placeholder}
                    value={query}
                    onChange={(e) => {
                        setQuery(e.target.value.toUpperCase());
                        setOpen(true);
                    }}
                    onFocus={() => {
                        setOpen(true);
                        setQuery(""); // Clear on focus to show all options
                        setActive(-1);
                    }}
                    onKeyDown={(e) => {
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
            {open && filtered.length > 0 && (
                <div
                    style={{
                        position: "absolute",
                        top: "calc(100% + 2px)",
                        left: 0,
                        right: 0,
                        maxHeight: 180,
                        overflowY: "auto",
                        background: "#fff",
                        border: "1px solid #cbd5e1",
                        borderRadius: 4,
                        boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
                        zIndex: 9999,
                    }}
                >
                    {filtered.map((opt, i) => (
                        <div
                            key={opt.value + i}
                            style={{
                                padding: "6px 10px",
                                cursor: "pointer",
                                fontSize: 11,
                                fontWeight: i === active ? 700 : 600,
                                background: i === active ? "#f1f5f9" : value === opt.value ? "#f8fafc" : "#fff",
                                color: i === active ? "#1e3a8a" : "#334155",
                                borderBottom: "1px solid #f1f5f9",
                                textTransform: "uppercase",
                            }}
                            onMouseDown={() => handleSelect(opt)}
                            onMouseEnter={() => setActive(i)}
                        >
                            {opt.label}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default AutocompleteSelect;
