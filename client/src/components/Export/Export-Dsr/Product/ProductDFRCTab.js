import React, { useRef, useState, useEffect } from "react";
import { productGroups, unitCodes } from "../../../../utils/masterList";

const styles = {
    // ... (Styles copied from ProductDEPBTab or similar)
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
    grid2: {
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
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
    },
    gridRowInput: {
        display: "grid",
        gridTemplateColumns: "1fr 1fr 1fr 1.5fr",
        gap: 10,
        marginBottom: 10,
        alignItems: "end"
    },
    gridRowInput2: {
        display: "grid",
        gridTemplateColumns: "1fr 3fr",
        gap: 10,
        marginBottom: 10,
        alignItems: "end"
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

const getDefaultDfrcItem = (idx = 1) => ({
    serialNumber: idx,
    sionSrNo: "",
    sionIoNormSNo: "",
    quantity: 0,
    unit: "",
    itemType: "Indigenous",
    techDetails: "",
    itemDescription: "",
});

const ProductDFRCTab = ({ formik, selectedInvoiceIndex, productIndex }) => {
    const invoices = formik.values.invoices || [];
    const activeInvoice = invoices[selectedInvoiceIndex] || {};
    const products = activeInvoice.products || [];
    const product = products[productIndex];

    // Initialize dfrcDetails if missing
    const dfrcDetails = product?.dfrcDetails || {
        dfrcRegnNumber: "",
        productGroup: "",
        dfrcItems: [getDefaultDfrcItem(1)],
    };

    const handleDfrcFieldChange = (field, value) => {
        const updatedInvoices = [...invoices];
        if (updatedInvoices[selectedInvoiceIndex]) {
            const updatedProducts = [
                ...(updatedInvoices[selectedInvoiceIndex].products || []),
            ];
            if (!updatedProducts[productIndex].dfrcDetails) {
                updatedProducts[productIndex].dfrcDetails = {};
            }
            updatedProducts[productIndex].dfrcDetails[field] = value;
            updatedInvoices[selectedInvoiceIndex] = {
                ...updatedInvoices[selectedInvoiceIndex],
                products: updatedProducts,
            };
            formik.setFieldValue("invoices", updatedInvoices);
        }
    };

    const handleItemChange = (itemIndex, field, value) => {
        const updatedInvoices = [...invoices];
        if (updatedInvoices[selectedInvoiceIndex]) {
            const updatedProducts = [
                ...(updatedInvoices[selectedInvoiceIndex].products || []),
            ];
            const items = [
                ...(updatedProducts[productIndex].dfrcDetails?.dfrcItems || []),
            ];

            if (!items[itemIndex]) {
                items[itemIndex] = getDefaultDfrcItem(itemIndex + 1);
            }

            items[itemIndex][field] = value;

            if (!updatedProducts[productIndex].dfrcDetails) {
                updatedProducts[productIndex].dfrcDetails = {};
            }

            updatedProducts[productIndex].dfrcDetails.dfrcItems = items;
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
                ...(updatedProducts[productIndex].dfrcDetails?.dfrcItems || []),
            ];
            items.push(getDefaultDfrcItem(items.length + 1));

            if (!updatedProducts[productIndex].dfrcDetails) {
                updatedProducts[productIndex].dfrcDetails = {};
            }

            updatedProducts[productIndex].dfrcDetails.dfrcItems = items;
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
                ...(updatedProducts[productIndex].dfrcDetails?.dfrcItems || []),
            ];

            if (items.length > 1) {
                items.splice(itemIndex, 1);
                // Re-index
                items.forEach((item, idx) => item.serialNumber = idx + 1);

                updatedProducts[productIndex].dfrcDetails.dfrcItems = items;
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
                PRODUCT DFRC DETAILS
                <span style={styles.chip}>DFRC</span>
            </div>

            <div style={styles.grid2}>
                <div style={styles.field}>
                    <label style={styles.label}>DFRC Regn. Number</label>
                    <input
                        style={styles.input}
                        value={dfrcDetails.dfrcRegnNumber || ""}
                        onChange={(e) => handleDfrcFieldChange("dfrcRegnNumber", e.target.value)}
                    />
                </div>
                <div style={styles.field}>
                    <label style={styles.label}>Product Group</label>
                    <select
                        style={styles.select}
                        value={dfrcDetails.productGroup || ""}
                        onChange={(e) => handleDfrcFieldChange("productGroup", e.target.value)}
                    >
                        <option value="">Select Group</option>
                        {productGroups.map((group) => (
                            <option key={group} value={group}>
                                {group}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            <div style={styles.tableContainer}>
                <table style={styles.table}>
                    <thead>
                        <tr>
                            <th style={styles.th}>Sr No</th>
                            <th style={styles.th}>SION Sr No</th>
                            <th style={styles.th}>SION IONorm SNo</th>
                            <th style={styles.th}>Quantity</th>
                            <th style={styles.th}>Unit</th>
                            <th style={styles.th}>Item Type</th>
                            <th style={styles.th}>Item Description</th>
                            <th style={{ ...styles.th, textAlign: "center", width: 50 }}>
                                Action
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {(dfrcDetails.dfrcItems || [getDefaultDfrcItem(1)]).map((item, idx) => (
                            <tr key={idx}>
                                <td style={styles.td}>{idx + 1}</td>
                                <td style={styles.td}>{item.sionSrNo}</td>
                                <td style={styles.td}>{item.sionIoNormSNo}</td>
                                <td style={styles.td}>{item.quantity}</td>
                                <td style={styles.td}>{item.unit}</td>
                                <td style={styles.td}>{item.itemType}</td>
                                <td style={styles.td}>{item.itemDescription}</td>
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

            {/* Input Form for new Item (Binding to the last item for simplicity or a separate state? 
          Usually in these forms, the input fields edit the currently selected or last added item. 
          Given the user image shows inputs below the table, I will make them edit the LAST item or a NEW item. 
          Standard pattern: The inputs edit the currently existing row or a new row. 
          Based on the image, it looks like a "Detail View" for the row. 
          I will render the input fields for the *last* item in the list or allow selection. 
          For now, I'll just render inputs for the last item to keep it simple and functional.
      */}

            {(dfrcDetails.dfrcItems && dfrcDetails.dfrcItems.length > 0) && (() => {
                const activeIdx = dfrcDetails.dfrcItems.length - 1;
                const activeItem = dfrcDetails.dfrcItems[activeIdx];

                return (
                    <div style={{ background: "#f9fafb", padding: 10, borderRadius: 6, border: "1px solid #e2e8f0" }}>
                        <div style={styles.gridRowInput}>
                            <div style={styles.field}>
                                <label style={styles.label}>SION Sr No</label>
                                <input
                                    style={styles.input}
                                    value={activeItem.sionSrNo || ""}
                                    onChange={(e) => handleItemChange(activeIdx, "sionSrNo", e.target.value)}
                                />
                            </div>
                            <div style={styles.field}>
                                <label style={styles.label}>SION IONorm SNo</label>
                                <input
                                    style={styles.input}
                                    value={activeItem.sionIoNormSNo || ""}
                                    onChange={(e) => handleItemChange(activeIdx, "sionIoNormSNo", e.target.value)}
                                />
                            </div>
                            <div style={styles.field}>
                                <label style={styles.label}>Quantity</label>
                                <input
                                    style={styles.input}
                                    type="number"
                                    value={activeItem.quantity || 0}
                                    onChange={(e) => handleItemChange(activeIdx, "quantity", e.target.value)}
                                />
                            </div>
                            <div style={styles.field}>
                                <label style={styles.label}>Unit</label>
                                <div style={{ display: 'flex', gap: 5 }}>
                                    <div style={{ flex: 1 }}>
                                        <UnitDropdownField
                                            value={activeItem.unit}
                                            onChange={(val) => handleItemChange(activeIdx, "unit", val)}
                                            unitOptions={unitCodes}
                                            placeholder="UNIT"
                                        />
                                    </div>
                                    <div style={styles.searchIcon}>🔍</div>
                                </div>
                            </div>
                        </div>

                        <div style={styles.gridRowInput2}>
                            <div style={styles.field}>
                                <label style={styles.label}>Item Type</label>
                                <select
                                    style={styles.select}
                                    value={activeItem.itemType || "Indigenous"}
                                    onChange={(e) => handleItemChange(activeIdx, "itemType", e.target.value)}
                                >
                                    <option value="Indigenous">Indigenous</option>
                                    <option value="Imported">Imported</option>
                                </select>
                            </div>
                            <div style={styles.field}>
                                <label style={styles.label}>Item Description</label>
                                <input
                                    style={styles.input}
                                    value={activeItem.itemDescription || ""}
                                    onChange={(e) => handleItemChange(activeIdx, "itemDescription", e.target.value)}
                                />
                            </div>
                        </div>

                        <div style={styles.field}>
                            <label style={styles.label}>Tech. Details</label>
                            <input
                                style={styles.input}
                                value={activeItem.techDetails || ""}
                                onChange={(e) => handleItemChange(activeIdx, "techDetails", e.target.value)}
                            />
                        </div>
                    </div>
                );
            })()}

            <div style={{ marginTop: 10 }}>
                <button type="button" style={styles.addBtn} onClick={addItem}>
                    <span>＋</span>
                    <span>Add New DFRC Item</span>
                </button>
            </div>

        </div>
    );
};

export default ProductDFRCTab;
