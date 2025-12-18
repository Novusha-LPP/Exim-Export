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
            <input
                style={{
                    width: "100%",
                    padding: "3px 6px",
                    border: "1px solid #c4ccd8",
                    borderRadius: 3,
                    fontSize: "inherit",
                    height: "inherit",
                    background: disabled ? "#e9ecef" : "#f7fafc",
                    outline: "none",
                    boxSizing: "border-box",
                    ...style,
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
                        setActive((prev) => Math.min(prev + 1, filteredOptions.length - 1));
                    } else if (e.key === "ArrowUp") {
                        setActive((prev) => Math.max(prev - 1, 0));
                    } else if (e.key === "Enter" && active >= 0) {
                        handleSelect(filteredOptions[active]);
                    } else if (e.key === "Escape") {
                        setOpen(false);
                    }
                }}
            />
            {open && filteredOptions.length > 0 && (
                <div
                    style={{
                        position: "absolute",
                        top: "100%",
                        left: 0,
                        right: 0,
                        zIndex: 1000,
                        background: "#fff",
                        border: "1px solid #c4ccd8",
                        borderRadius: 3,
                        maxHeight: 200,
                        overflowY: "auto",
                        boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
                    }}
                >
                    {filteredOptions.map((opt, i) => {
                        const optVal = typeof opt === "string" ? opt : opt.code || opt.name || "";
                        return (
                            <div
                                key={i}
                                style={{
                                    padding: "6px 8px",
                                    cursor: "pointer",
                                    background: i === active ? "#e3f2fd" : "#fff",
                                    borderBottom: "1px solid #f1f1f1",
                                    fontSize: 11,
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
