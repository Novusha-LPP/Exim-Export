import React, { useRef, useState, useEffect } from "react";
import { unitCodes } from "../../../../utils/masterList";

const styles = {
    // Common styles
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
    tableContainer: {
        background: "#fff",
        border: "1.5px solid #e2e8f0",
        borderRadius: 7,
        marginBottom: 18,
        maxHeight: 400,
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
    field: { marginBottom: 8 },
    label: {
        fontSize: 11,
        fontWeight: 700,
        color: "#263046",
        letterSpacing: 0.5,
        marginBottom: 4,
        display: "block",
    },
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
    gridRow: {
        display: "grid",
        gridTemplateColumns: "1fr 1fr 1fr",
        gap: 12,
        marginBottom: 10,
        alignItems: "end"
    },
    gridRow2: {
        display: "grid",
        gridTemplateColumns: "1fr 1fr 2fr",
        gap: 12,
        marginBottom: 10,
        alignItems: "end"
    },
    searchIcon: {
        width: 26,
        height: 26,
        borderRadius: 4,
        border: "1px solid #16408f",
        background: "#f1f5ff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        marginLeft: 4,
    }
};

function UnitDropdownField({ value, onChange, unitOptions, placeholder }) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState(value || "");
    const [active, setActive] = useState(-1);
    const wrapperRef = useRef();

    useEffect(() => {
        setQuery(value || "");
    }, [value]);

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
        const selectedValue = filtered[index].toUpperCase();
        setQuery(selectedValue);
        onChange(selectedValue);
        setOpen(false);
        setActive(-1);
    }

    return (
        <div style={styles.acWrap} ref={wrapperRef}>
            <input
                style={styles.input}
                placeholder={placeholder}
                autoComplete="off"
                value={query.toUpperCase()}
                onChange={(e) => {
                    const val = e.target.value.toUpperCase();
                    setQuery(val);
                    onChange(val);
                    setOpen(true);
                }}
                onFocus={() => {
                    setOpen(true);
                    setActive(-1);
                    setQuery("");
                }}
                onKeyDown={(e) => {
                    if (!open) return;
                    if (e.key === "ArrowDown") {
                        setActive((a) => Math.min(filtered.length - 1, a < 0 ? 0 : a + 1));
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
            {open && filtered.length > 0 && (
                <div style={styles.acMenu}>
                    {filtered.map((val, i) => (
                        <div
                            key={val}
                            style={styles.acItem(active === i)}
                            onMouseDown={() => handleSelect(i)}
                            onMouseEnter={() => setActive(i)}
                        >
                            {val.toUpperCase()}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

const getDefaultJobItem = () => ({
    notnNo: "",
    beNumber: "",
    date: "",
    invSrNo: "",
    actualInvNo: "",
    itemSrNo: "",
    importedAt: "",
    quantity: 0,
    unit: "",
});

const ProductJobWorkTab = ({ formik, selectedInvoiceIndex, productIndex }) => {
    const invoices = formik.values.invoices || [];
    const activeInvoice = invoices[selectedInvoiceIndex] || {};
    const products = activeInvoice.products || [];
    const product = products[productIndex];

    // Initialize jobDetails if missing
    const jobDetails = product?.jobDetails || {
        jobItems: [getDefaultJobItem()],
    };

    const handleJobItemChange = (itemIndex, field, value) => {
        const updatedInvoices = [...invoices];
        if (updatedInvoices[selectedInvoiceIndex]) {
            const updatedProducts = [
                ...(updatedInvoices[selectedInvoiceIndex].products || []),
            ];
            const items = [
                ...(updatedProducts[productIndex].jobDetails?.jobItems || []),
            ];

            if (!items[itemIndex]) {
                items[itemIndex] = getDefaultJobItem();
            }

            items[itemIndex][field] = value;

            if (!updatedProducts[productIndex].jobDetails) {
                updatedProducts[productIndex].jobDetails = {};
            }

            updatedProducts[productIndex].jobDetails.jobItems = items;
            updatedInvoices[selectedInvoiceIndex] = {
                ...updatedInvoices[selectedInvoiceIndex],
                products: updatedProducts,
            };
            formik.setFieldValue("invoices", updatedInvoices);
        }
    };

    const addItem = () => {
        const updatedInvoices = [...invoices];
        if (updatedInvoices[selectedInvoiceIndex]) {
            const updatedProducts = [
                ...(updatedInvoices[selectedInvoiceIndex].products || []),
            ];
            const items = [
                ...(updatedProducts[productIndex].jobDetails?.jobItems || []),
            ];
            items.push(getDefaultJobItem());

            if (!updatedProducts[productIndex].jobDetails) {
                updatedProducts[productIndex].jobDetails = {};
            }

            updatedProducts[productIndex].jobDetails.jobItems = items;
            updatedInvoices[selectedInvoiceIndex] = {
                ...updatedInvoices[selectedInvoiceIndex],
                products: updatedProducts,
            };
            formik.setFieldValue("invoices", updatedInvoices);
        }
    };

    const deleteItem = (itemIndex) => {
        const updatedInvoices = [...invoices];
        if (updatedInvoices[selectedInvoiceIndex]) {
            const updatedProducts = [
                ...(updatedInvoices[selectedInvoiceIndex].products || []),
            ];
            const items = [
                ...(updatedProducts[productIndex].jobDetails?.jobItems || []),
            ];

            if (items.length > 1) {
                items.splice(itemIndex, 1);
                updatedProducts[productIndex].jobDetails.jobItems = items;
                updatedInvoices[selectedInvoiceIndex] = {
                    ...updatedInvoices[selectedInvoiceIndex],
                    products: updatedProducts,
                };
                formik.setFieldValue("invoices", updatedInvoices);
            }
        }
    };

    return (
        <div style={styles.card}>
            <div style={styles.cardTitle}>
                PRODUCT JOB WORK DETAILS
                <span style={styles.chip}>JOB WORK</span>
            </div>

            <div style={styles.tableContainer}>
                <table style={styles.table}>
                    <thead>
                        <tr>
                            <th style={styles.th}>Notn. No</th>
                            <th style={styles.th}>BE Number</th>
                            <th style={styles.th}>Date</th>
                            <th style={styles.th}>Inv SrNo</th>
                            <th style={styles.th}>Actual Inv No</th>
                            <th style={styles.th}>Item SrNo</th>
                            <th style={styles.th}>Imported At</th>
                            <th style={styles.th}>Quantity</th>
                            <th style={styles.th}>Unit</th>
                            <th style={{ ...styles.th, textAlign: "center", width: 50 }}>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {(jobDetails.jobItems || [getDefaultJobItem()]).map((item, idx) => (
                            <tr key={idx}>
                                <td style={styles.td}>{item.notnNo}</td>
                                <td style={styles.td}>{item.beNumber}</td>
                                <td style={styles.td}>{item.date}</td>
                                <td style={styles.td}>{item.invSrNo}</td>
                                <td style={styles.td}>{item.actualInvNo}</td>
                                <td style={styles.td}>{item.itemSrNo}</td>
                                <td style={styles.td}>{item.importedAt}</td>
                                <td style={styles.td}>{item.quantity}</td>
                                <td style={styles.td}>{item.unit}</td>
                                <td style={{ ...styles.td, textAlign: "center" }}>
                                    <button
                                        type="button"
                                        onClick={() => deleteItem(idx)}
                                        style={{
                                            border: "none",
                                            background: "transparent",
                                            color: "#e53e3e",
                                            cursor: "pointer",
                                            fontWeight: 700
                                        }}
                                    >
                                        ✕
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Details input for the ACTIVE (last) item */}
            {(jobDetails.jobItems && jobDetails.jobItems.length > 0) && (() => {
                const activeIdx = jobDetails.jobItems.length - 1;
                const activeItem = jobDetails.jobItems[activeIdx];

                return (
                    <div style={{ background: "#f9fafb", padding: 10, borderRadius: 6, border: "1px solid #e2e8f0" }}>
                        <div style={styles.gridRow}>
                            <div style={styles.field}>
                                <label style={styles.label}>Notn. No</label>
                                <input
                                    style={styles.input}
                                    value={activeItem.notnNo || ""}
                                    onChange={(e) => handleJobItemChange(activeIdx, "notnNo", e.target.value)}
                                />
                            </div>
                            <div style={styles.field}>
                                <label style={styles.label}>BE Number</label>
                                <input
                                    style={styles.input}
                                    value={activeItem.beNumber || ""}
                                    onChange={(e) => handleJobItemChange(activeIdx, "beNumber", e.target.value)}
                                />
                            </div>
                            <div style={styles.field}>
                                <label style={styles.label}>Date</label>
                                <input
                                    type="date"
                                    style={styles.input}
                                    value={activeItem.date || ""}
                                    onChange={(e) => handleJobItemChange(activeIdx, "date", e.target.value)}
                                />
                            </div>
                        </div>

                        <div style={styles.gridRow2}>
                            <div style={styles.field}>
                                <label style={styles.label}>Inv Sr.No</label>
                                <input
                                    style={styles.input}
                                    value={activeItem.invSrNo || ""}
                                    onChange={(e) => handleJobItemChange(activeIdx, "invSrNo", e.target.value)}
                                />
                            </div>
                            <div style={styles.field}>
                                <label style={styles.label}>Actual Inv No</label>
                                <input
                                    style={styles.input}
                                    value={activeItem.actualInvNo || ""}
                                    onChange={(e) => handleJobItemChange(activeIdx, "actualInvNo", e.target.value)}
                                />
                            </div>
                            <div style={styles.field}>
                                <label style={styles.label}>Item Sr.No</label>
                                <input
                                    style={styles.input}
                                    value={activeItem.itemSrNo || ""}
                                    onChange={(e) => handleJobItemChange(activeIdx, "itemSrNo", e.target.value)}
                                />
                            </div>
                        </div>

                        <div style={styles.gridRow}>
                            <div style={styles.field}>
                                <label style={styles.label}>Imported At</label>
                                <input
                                    style={styles.input}
                                    value={activeItem.importedAt || ""}
                                    onChange={(e) => handleJobItemChange(activeIdx, "importedAt", e.target.value)}
                                />
                            </div>
                            <div style={styles.field}>
                                <label style={styles.label}>Quantity</label>
                                <input
                                    style={styles.input}
                                    type="number"
                                    value={activeItem.quantity || 0}
                                    onChange={(e) => handleJobItemChange(activeIdx, "quantity", e.target.value)}
                                />
                            </div>
                            <div style={styles.field}>
                                <label style={styles.label}>Unit</label>
                                <div style={{ display: 'flex', gap: 5 }}>
                                    <div style={{ flex: 1 }}>
                                        <UnitDropdownField
                                            value={activeItem.unit}
                                            onChange={(val) => handleJobItemChange(activeIdx, "unit", val)}
                                            unitOptions={unitCodes}
                                            placeholder="UNIT"
                                        />
                                    </div>
                                    <div style={styles.searchIcon}>🔍</div>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })()}

            <div style={{ marginTop: 10 }}>
                <button type="button" style={styles.addBtn} onClick={addItem}>
                    <span>＋</span>
                    <span>Add New Job Work Item</span>
                </button>
            </div>

        </div>
    );
};

export default ProductJobWorkTab;
