import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";

// Custom House options grouped by location
const CUSTOM_HOUSE_OPTIONS = [
    {
        group: "Ahmedabad", branchCode: "AMD", items: [
            { value: "AIR AHMEDABAD", label: "AIR AHMEDABAD", code: "INAMD4" },
            { value: "AHMEDABAD AIR CARGO", label: "AHMEDABAD AIR CARGO", code: "INAMD4" },
            { value: "ICD SABARMATI, AHMEDABAD", label: "ICD SABARMATI, AHMEDABAD", code: "INSBI6" },
            { value: "ICD KHODIYAR", label: "ICD KHODIYAR", code: "INSBI6" },
            { value: "ICD VIRAMGAM", label: "ICD VIRAMGAM", code: "INVGR6" },
            { value: "ICD SACHANA", label: "ICD SACHANA", code: "INJKA6" },
            { value: "ICD VIROCHANNAGAR", label: "ICD VIROCHANNAGAR", code: "INVCN6" },
            { value: "ICD VIROCHAN NAGAR", label: "ICD VIROCHAN NAGAR", code: "INVCN6" },
            { value: "ICD THAR DRY PORT", label: "ICD THAR DRY PORT", code: "INSAU6" },
            { value: "THAR DRY PORT", label: "THAR DRY PORT", code: "INSAU6" },
            { value: "ICD SANAND", label: "ICD SANAND", code: "INSND6" },
        ]
    },
    {
        group: "Baroda", branchCode: "BRD", items: [
            { value: "ANKLESHWAR ICD", label: "Ankleshwar ICD", code: "INAKV6" },
            { value: "ICD VARNAMA", label: "ICD VARNAMA", code: "INVRM6" },
        ]
    },
    {
        group: "Gandhidham", branchCode: "GIM", items: [
            { value: "MUNDRA SEA", label: "Mundra Sea", code: "INMUN1" },
            { value: "KANDLA SEA", label: "Kandla Sea", code: "INIXY1" },
        ]
    },
    {
        group: "Cochin", branchCode: "COK", items: [
            { value: "COCHIN AIR CARGO", label: "Cochin Air Cargo", code: "INCOK4" },
            { value: "COCHIN SEA", label: "Cochin Sea", code: "INCOK1" },
        ]
    },
    {
        group: "Hazira", branchCode: "HAZ", items: [
            { value: "HAZIRA", label: "Hazira", code: "INHZA1" },
        ]
    },
];

// Branch code to group mapping
const BRANCH_TO_GROUP = {
    AMD: "Ahmedabad",
    BRD: "Baroda",
    GIM: "Gandhidham",
    COK: "Cochin",
    HAZ: "Hazira",
};

// Flatten options for search
const getAllOptions = () => {
    const all = [];
    CUSTOM_HOUSE_OPTIONS.forEach(group => {
        group.items.forEach(item => {
            all.push({ ...item, group: group.group, branchCode: group.branchCode });
        });
    });
    return all;
};

// Get options filtered by branch code
const getOptionsForBranch = (branchCode) => {
    if (!branchCode) return CUSTOM_HOUSE_OPTIONS;
    const code = branchCode.toUpperCase();
    const filtered = CUSTOM_HOUSE_OPTIONS.filter(g => g.branchCode === code);
    return filtered.length > 0 ? filtered : CUSTOM_HOUSE_OPTIONS;
};

const styles = {
    input: {
        width: "100%",
        padding: "2px 18px 2px 4px",
        border: "1px solid #d6dae2",
        borderRadius: 3,
        fontSize: 11,
        background: "#fff",
        boxSizing: "border-box",
        height: 24,
        textTransform: "uppercase",
    },
    inputDisabled: {
        width: "100%",
        padding: "2px 4px",
        border: "1px solid #e0e0e0",
        borderRadius: 3,
        fontSize: 11,
        background: "#f5f5f5",
        boxSizing: "border-box",
        height: 24,
        color: "#666",
        textTransform: "uppercase",
    },
    dropdown: {
        position: "absolute",
        maxHeight: 280,
        overflowY: "auto",
        background: "#fff",
        border: "1px solid #d6dae2",
        borderRadius: 4,
        boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
        zIndex: 1000002,
    },
    groupHeader: {
        padding: "4px 8px",
        fontSize: 9,
        fontWeight: 700,
        color: "#1976d2",
        background: "#f0f7ff",
        borderBottom: "1px solid #e3e7ee",
        textTransform: "uppercase",
        letterSpacing: 0.5,
    },
    item: (active) => ({
        padding: "4px 8px 4px 18px",
        cursor: "pointer",
        fontSize: 11,
        fontWeight: 500,
        background: active ? "#e3f2fd" : "#fff",
        color: "#111827",
        borderBottom: "1px solid #f0f0f0",
    }),
};

const CustomHouseDropdown = ({
    value = "",
    onChange,
    name = "custom_house",
    placeholder = "Select Custom House",
    disabled = false,
    style = {},
    branchCode = "", // Optional: filter by branch
}) => {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState(value || "");
    const [active, setActive] = useState(-1);
    const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });
    const wrapperRef = useRef(null);
    const menuRef = useRef(null);

    useEffect(() => {
        setQuery(value || "");
    }, [value]);

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

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (
                wrapperRef.current &&
                !wrapperRef.current.contains(e.target) &&
                (!menuRef.current || !menuRef.current.contains(e.target))
            ) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Get options based on branch code
    const baseOptions = getOptionsForBranch(branchCode);

    // Filter options based on query
    const filteredGroups = baseOptions.map(group => ({
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

    // Get flat list of filtered items for keyboard navigation
    const flatFiltered = [];
    filteredGroups.forEach(group => {
        group.items.forEach(item => flatFiltered.push(item));
    });

    const handleSelect = (item) => {
        const val = item.value.toUpperCase();
        setQuery(val);
        onChange({ target: { name, value: val } });
        setOpen(false);
        setActive(-1);
    };

    const handleInputChange = (e) => {
        if (disabled) return;
        const val = e.target.value.toUpperCase();
        setQuery(val);
        onChange({ target: { name, value: val } });
        setOpen(true);
        setActive(-1);
    };

    const handleKeyDown = (e) => {
        if (disabled) return;

        if (e.key === "Tab") {
            if (open && active >= 0 && flatFiltered[active]) {
                handleSelect(flatFiltered[active]);
            } else if (flatFiltered.length === 1) {
                handleSelect(flatFiltered[0]);
            }
            setOpen(false);
            return;
        }

        if (e.key === "ArrowDown") {
            e.preventDefault();
            setOpen(true);
            setActive(prev => Math.min(prev + 1, flatFiltered.length - 1));
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive(prev => Math.max(prev - 1, 0));
        } else if (e.key === "Enter" && active >= 0 && flatFiltered[active]) {
            e.preventDefault();
            handleSelect(flatFiltered[active]);
        } else if (e.key === "Escape") {
            setOpen(false);
        }
    };

    let itemIndex = -1;

    return (
        <div ref={wrapperRef} style={{ position: "relative", ...style }}>
            <div style={{ position: "relative" }}>
                <input
                    style={disabled ? styles.inputDisabled : styles.input}
                    placeholder={placeholder}
                    autoComplete="off"
                    value={query}
                    onChange={handleInputChange}
                    onFocus={() => {
                        if (!disabled) {
                            setOpen(true);
                            setActive(-1);
                        }
                    }}
                    onKeyDown={handleKeyDown}
                    disabled={disabled}
                />
                {!disabled && (
                    <span
                        style={{
                            position: "absolute",
                            right: 4,
                            top: "50%",
                            transform: "translateY(-50%)",
                            fontSize: 8,
                            color: "#888",
                            pointerEvents: "none",
                        }}
                    >
                        ▼
                    </span>
                )}
            </div>

            {open && !disabled && filteredGroups.length > 0 &&
                createPortal(
                    <div
                        ref={menuRef}
                        style={{
                            ...styles.dropdown,
                            top: coords.top + 2,
                            left: coords.left,
                            width: Math.max(coords.width, 200),
                        }}
                    >
                        {filteredGroups.map((group) => (
                            <div key={group.group}>
                                <div style={styles.groupHeader}>{group.group}</div>
                                {group.items.map((item) => {
                                    itemIndex++;
                                    const currentIndex = itemIndex;
                                    return (
                                        <div
                                            key={item.value}
                                            style={styles.item(active === currentIndex)}
                                            onMouseDown={(e) => {
                                                e.preventDefault();
                                                handleSelect(item);
                                            }}
                                            onMouseEnter={() => setActive(currentIndex)}
                                        >
                                            {item.label} {item.code && <span style={{ color: '#888', marginLeft: 4 }}>({item.code})</span>}
                                        </div>
                                    );
                                })}
                            </div>
                        ))}
                    </div>,
                    document.body
                )}
        </div>
    );
};

export default CustomHouseDropdown;
export { CUSTOM_HOUSE_OPTIONS, getAllOptions, BRANCH_TO_GROUP, getOptionsForBranch };
