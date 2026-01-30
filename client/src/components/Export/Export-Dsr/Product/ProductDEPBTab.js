import React, { useRef, useState, useEffect } from "react";
import { productGroups, unitCodes } from "../../../../utils/masterList";

const styles = {
    page: {
        fontFamily: "'Segoe UI', Roboto, Arial, sans-serif",
        fontSize: 13,
        color: "#1e2e38",
        padding: 16,
    },
    sectionTitle: {
        fontWeight: 700,
        color: "#16408f",
        fontSize: 12,
        marginBottom: 10,
        letterSpacing: 1.3,
        textTransform: "uppercase",
    },
    subSectionTitle: {
        fontWeight: 700,
        color: "#16408f",
        fontSize: 11,
        marginTop: 12,
        marginBottom: 8,
        borderBottom: "1px solid #e2e8f0",
        paddingBottom: 4,
    },
    tableContainer: {
        background: "#fff",
        border: "1.5px solid #e2e8f0",
        borderRadius: 7,
        marginBottom: 18,
        maxHeight: 400,
        overflow: "auto"
    },
    table: { width: "100%", borderCollapse: "collapse", minWidth: 800 },
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
        whiteSpace: "nowrap"
    },
    td: { padding: "8px 12px", borderBottom: "1px solid #e2e8f0", verticalAlign: "top" },
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
    checkbox: { cursor: "pointer", marginRight: 6 },
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
    inlineCheckbox: {
        display: "flex",
        alignItems: "center",
        fontSize: 11,
        fontWeight: 700,
        color: "#263046",
        textTransform: "uppercase",
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
};

// Reused Unit Dropdown
function UnitDropdownField({
    label,
    value,
    onChange,
    unitOptions,
    placeholder,
}) {
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
                }}
                onKeyDown={(e) => {
                    if (!open) return;
                    if (e.key === "ArrowDown") {
                        setActive((a) =>
                            Math.min(filtered.length - 1, a < 0 ? 0 : a + 1)
                        );
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

const getDefaultDepbItem = () => ({
    productGroup: "",
    rateListSrNo: "",
    stdIoNorms: "",
    depbRate: 0,
    depbQty: 0,
    unit: "",
    capValue: "",
});

const getDefaultDepbParentItem = () => ({
    productGroup: "",
    rateListSrNo: "",
    depbRate: 0,
    depbQty: 0,
    unit: "",
    percentQty: 0,
    capValue: "",
});


const ProductDEPBTab = ({ formik, selectedInvoiceIndex, productIndex }) => {
    const invoices = formik.values.invoices || [];
    const activeInvoice = invoices[selectedInvoiceIndex] || {};
    const products = activeInvoice.products || [];
    const product = products[productIndex];

    // Initialize depbDetails if missing
    // We now have depbItems (Array) instead of single fields
    const depbDetails = product?.depbDetails || {
        isDepbItem: false,
        depbItems: [getDefaultDepbItem()],
        isDepbParent: false,
        depbParentItems: [getDefaultDepbParentItem()],
    };

    // Ensure forward compatibility if migrating from object to array
    // If only deprecated single fields exist, migrate them to an array
    if (!depbDetails.depbItems && depbDetails.productGroup !== undefined) {
        depbDetails.depbItems = [{
            productGroup: depbDetails.productGroup,
            rateListSrNo: depbDetails.rateListSrNo,
            stdIoNorms: depbDetails.stdIoNorms,
            depbRate: depbDetails.depbRate,
            depbQty: depbDetails.depbQty,
            unit: depbDetails.unit,
            capValue: depbDetails.capValue
        }];
    }
    // Fallback if no items at all
    if (!depbDetails.depbItems) {
        depbDetails.depbItems = [getDefaultDepbItem()];
    }

    const handleDeecBooleanChange = (field, value) => {
        const updatedInvoices = [...invoices];
        if (updatedInvoices[selectedInvoiceIndex]) {
            const updatedProducts = [
                ...(updatedInvoices[selectedInvoiceIndex].products || []),
            ];
            if (!updatedProducts[productIndex].depbDetails) {
                updatedProducts[productIndex].depbDetails = {};
            }
            updatedProducts[productIndex].depbDetails[field] = value;
            updatedInvoices[selectedInvoiceIndex] = {
                ...updatedInvoices[selectedInvoiceIndex],
                products: updatedProducts,
            };
            formik.setFieldValue("invoices", updatedInvoices);
        }
    };

    // Handle updates for MAIN DEPB ITEMS
    const handleDepbItemChange = (itemIndex, field, value) => {
        const updatedInvoices = [...invoices];
        if (updatedInvoices[selectedInvoiceIndex]) {
            const updatedProducts = [
                ...(updatedInvoices[selectedInvoiceIndex].products || []),
            ];
            const items = [
                ...(updatedProducts[productIndex].depbDetails?.depbItems || []),
            ];

            if (!items[itemIndex]) {
                items[itemIndex] = getDefaultDepbItem();
            }
            items[itemIndex][field] = value;

            if (!updatedProducts[productIndex].depbDetails) {
                updatedProducts[productIndex].depbDetails = {};
            }
            updatedProducts[productIndex].depbDetails.depbItems = items;

            updatedInvoices[selectedInvoiceIndex] = {
                ...updatedInvoices[selectedInvoiceIndex],
                products: updatedProducts,
            };
            formik.setFieldValue("invoices", updatedInvoices);
        }
    };

    const addDepbItem = () => {
        const updatedInvoices = [...invoices];
        if (updatedInvoices[selectedInvoiceIndex]) {
            const updatedProducts = [
                ...(updatedInvoices[selectedInvoiceIndex].products || []),
            ];
            const items = [
                ...(updatedProducts[productIndex].depbDetails?.depbItems || []),
            ];
            items.push(getDefaultDepbItem());

            if (!updatedProducts[productIndex].depbDetails) {
                updatedProducts[productIndex].depbDetails = {};
            }
            updatedProducts[productIndex].depbDetails.depbItems = items;

            updatedInvoices[selectedInvoiceIndex] = {
                ...updatedInvoices[selectedInvoiceIndex],
                products: updatedProducts,
            };
            formik.setFieldValue("invoices", updatedInvoices);
        }
    };

    const deleteDepbItem = (index) => {
        const updatedInvoices = [...invoices];
        if (updatedInvoices[selectedInvoiceIndex]) {
            const updatedProducts = [
                ...(updatedInvoices[selectedInvoiceIndex].products || []),
            ];
            const items = [
                ...(updatedProducts[productIndex].depbDetails?.depbItems || []),
            ];
            if (items.length > 1) {
                items.splice(index, 1);
                updatedProducts[productIndex].depbDetails.depbItems = items;
                updatedInvoices[selectedInvoiceIndex] = {
                    ...updatedInvoices[selectedInvoiceIndex],
                    products: updatedProducts,
                };
                formik.setFieldValue("invoices", updatedInvoices);
            }
        }
    };

    const copyDepbItem = (index) => {
        const updatedInvoices = [...invoices];
        if (updatedInvoices[selectedInvoiceIndex]) {
            const updatedProducts = [
                ...(updatedInvoices[selectedInvoiceIndex].products || []),
            ];
            const items = [
                ...(updatedProducts[productIndex].depbDetails?.depbItems || []),
            ];
            const itemToCopy = items[index] || getDefaultDepbItem();
            // Duplicate item
            items.push({ ...itemToCopy });

            updatedProducts[productIndex].depbDetails.depbItems = items;
            updatedInvoices[selectedInvoiceIndex] = {
                ...updatedInvoices[selectedInvoiceIndex],
                products: updatedProducts,
            };
            formik.setFieldValue("invoices", updatedInvoices);
        }
    };


    // Handle updates for PARENT ITEMS
    const handleParentItemChange = (itemIndex, field, value) => {
        const updatedInvoices = [...invoices];
        if (updatedInvoices[selectedInvoiceIndex]) {
            const updatedProducts = [
                ...(updatedInvoices[selectedInvoiceIndex].products || []),
            ];
            const parentItems = [
                ...(updatedProducts[productIndex].depbDetails?.depbParentItems || []),
            ];

            if (!parentItems[itemIndex]) {
                parentItems[itemIndex] = getDefaultDepbParentItem();
            }

            parentItems[itemIndex][field] = value;

            if (!updatedProducts[productIndex].depbDetails) {
                updatedProducts[productIndex].depbDetails = {};
            }

            updatedProducts[productIndex].depbDetails.depbParentItems = parentItems;
            updatedInvoices[selectedInvoiceIndex] = {
                ...updatedInvoices[selectedInvoiceIndex],
                products: updatedProducts,
            };
            formik.setFieldValue("invoices", updatedInvoices);
        }
    };

    const addParentItem = () => {
        const updatedInvoices = [...invoices];
        if (updatedInvoices[selectedInvoiceIndex]) {
            const updatedProducts = [
                ...(updatedInvoices[selectedInvoiceIndex].products || []),
            ];
            const parentItems = [
                ...(updatedProducts[productIndex].depbDetails?.depbParentItems || []),
            ];
            parentItems.push(getDefaultDepbParentItem());

            if (!updatedProducts[productIndex].depbDetails) {
                updatedProducts[productIndex].depbDetails = {};
            }

            updatedProducts[productIndex].depbDetails.depbParentItems = parentItems;
            updatedInvoices[selectedInvoiceIndex] = {
                ...updatedInvoices[selectedInvoiceIndex],
                products: updatedProducts,
            };
            formik.setFieldValue("invoices", updatedInvoices);
        }
    };

    const deleteParentItem = (itemIndex) => {
        const updatedInvoices = [...invoices];
        if (updatedInvoices[selectedInvoiceIndex]) {
            const updatedProducts = [
                ...(updatedInvoices[selectedInvoiceIndex].products || []),
            ];
            const parentItems = [
                ...(updatedProducts[productIndex].depbDetails?.depbParentItems || []),
            ];

            if (parentItems.length > 1) {
                parentItems.splice(itemIndex, 1);
                updatedProducts[productIndex].depbDetails.depbParentItems = parentItems;
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
                PRODUCT DEPB DETAILS
                <span style={styles.chip}>DEPB</span>
            </div>

            <div style={{ marginBottom: 15 }}>
                <label style={styles.inlineCheckbox}>
                    <input
                        type="checkbox"
                        style={styles.checkbox}
                        checked={depbDetails.isDepbItem || false}
                        onChange={(e) =>
                            handleDeecBooleanChange("isDepbItem", e.target.checked)
                        }
                    />
                    This is DEPB Item
                </label>
            </div>

            {/* Changed from single fields to table as per request */}
            <div style={styles.tableContainer}>
                <table style={styles.table}>
                    <thead>
                        <tr>
                            <th style={styles.th}>Product Group</th>
                            <th style={styles.th}>Rate List Sr No</th>
                            <th style={styles.th}>Std. I/O Norms</th>
                            <th style={styles.th}>DEPB Rate</th>
                            <th style={styles.th}>DEPB Qty</th>
                            <th style={styles.th}>Unit</th>
                            <th style={styles.th}>CAP Value</th>
                            <th style={{ ...styles.th, textAlign: "center", width: 90 }}>
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {(depbDetails.depbItems || [getDefaultDepbItem()]).map((item, idx) => (
                            <tr key={idx}>
                                <td style={{ ...styles.td, minWidth: 200 }}>
                                    <select
                                        style={styles.select}
                                        value={item.productGroup || ""}
                                        onChange={(e) => handleDepbItemChange(idx, "productGroup", e.target.value)}
                                    >
                                        <option value="">Select Group</option>
                                        {productGroups.map((group) => (
                                            <option key={group} value={group}>
                                                {group}
                                            </option>
                                        ))}
                                    </select>
                                </td>
                                <td style={{ ...styles.td, minWidth: 120 }}>
                                    <div style={{ display: 'flex', alignItems: 'center' }}>
                                        <input
                                            style={styles.input}
                                            value={item.rateListSrNo || ""}
                                            onChange={(e) => handleDepbItemChange(idx, "rateListSrNo", e.target.value)}
                                        />
                                        <div style={styles.searchIcon}>🔍</div>
                                    </div>
                                </td>
                                <td style={{ ...styles.td, minWidth: 100 }}>
                                    <input
                                        style={styles.input}
                                        value={item.stdIoNorms || ""}
                                        onChange={(e) => handleDepbItemChange(idx, "stdIoNorms", e.target.value)}
                                    />
                                </td>
                                <td style={{ ...styles.td, minWidth: 100 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                        <input
                                            style={styles.input}
                                            type="number"
                                            value={item.depbRate || 0}
                                            onChange={(e) => handleDepbItemChange(idx, "depbRate", e.target.value)}
                                        />
                                        <span style={{ fontWeight: 600, fontSize: 13 }}>%</span>
                                    </div>
                                </td>
                                <td style={{ ...styles.td, minWidth: 100 }}>
                                    <input
                                        style={styles.input}
                                        type="number"
                                        value={item.depbQty || 0}
                                        onChange={(e) => handleDepbItemChange(idx, "depbQty", e.target.value)}
                                    />
                                </td>
                                <td style={{ ...styles.td, minWidth: 120 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                        <UnitDropdownField
                                            value={item.unit}
                                            onChange={(val) => handleDepbItemChange(idx, "unit", val)}
                                            unitOptions={unitCodes}
                                            placeholder="UNIT"
                                        />
                                        <div style={styles.searchIcon}>🔍</div>
                                    </div>
                                </td>
                                <td style={{ ...styles.td, minWidth: 100 }}>
                                    <input
                                        style={styles.input}
                                        value={item.capValue || ""}
                                        onChange={(e) => handleDepbItemChange(idx, "capValue", e.target.value)}
                                    />
                                </td>
                                <td style={{ ...styles.td, textAlign: "center" }}>
                                    <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                                        <button
                                            type="button"
                                            onClick={() => copyDepbItem(idx)}
                                            style={{
                                                border: "none",
                                                background: "transparent",
                                                color: "#16408f",
                                                cursor: "pointer",
                                                fontWeight: 700,
                                                fontSize: 14
                                            }}
                                            title="Copy"
                                        >
                                            ❐
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => deleteDepbItem(idx)}
                                            disabled={
                                                (depbDetails.depbItems || [getDefaultDepbItem()]).length <= 1
                                            }
                                            style={{
                                                border: "none",
                                                background: "transparent",
                                                color: "#e53e3e",
                                                cursor: (depbDetails.depbItems || [getDefaultDepbItem()]).length <= 1 ? "not-allowed" : "pointer",
                                                fontWeight: 700,
                                                fontSize: 14
                                            }}
                                            title="Delete"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <button type="button" style={styles.addBtn} onClick={addDepbItem}>
                <span>＋</span>
                <span>Add Row</span>
            </button>

            <div style={{ marginTop: 15, marginBottom: 15 }}>
                <label style={styles.inlineCheckbox}>
                    <input
                        type="checkbox"
                        style={styles.checkbox}
                        checked={depbDetails.isDepbParent || false}
                        onChange={(e) =>
                            handleDeecBooleanChange("isDepbParent", e.target.checked)
                        }
                    />
                    DEPB Credit based on item used in this product (DEPB Parent)
                </label>
            </div>

            <div style={{ border: "1px solid #ccc", padding: 10, borderRadius: 5, background: '#f9f9f9', display: depbDetails.isDepbParent ? 'block' : 'none' }}>
                <div style={styles.tableContainer}>
                    <table style={styles.table}>
                        <thead>
                            <tr>
                                <th style={styles.th}>Product Group</th>
                                <th style={styles.th}>Rate List Sr No</th>
                                <th style={styles.th}>DEPB Rate</th>
                                <th style={styles.th}>DEPB Qty</th>
                                <th style={styles.th}>Unit</th>
                                <th style={styles.th}>% Qty</th>
                                <th style={styles.th}>CAP Value</th>
                                <th style={{ ...styles.th, textAlign: "center", width: 70 }}>
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {(depbDetails.depbParentItems || [getDefaultDepbParentItem()]).map((item, idx) => (
                                <tr key={idx}>
                                    <td style={{ ...styles.td, minWidth: 200 }}>
                                        <select
                                            style={styles.select}
                                            value={item.productGroup || ""}
                                            onChange={(e) => handleParentItemChange(idx, "productGroup", e.target.value)}
                                        >
                                            <option value="">Select</option>
                                            {productGroups.map((group) => (
                                                <option key={group} value={group}>
                                                    {group}
                                                </option>
                                            ))}
                                        </select>
                                    </td>
                                    <td style={{ ...styles.td, minWidth: 100 }}>
                                        <input
                                            style={styles.input}
                                            value={item.rateListSrNo || ""}
                                            onChange={(e) => handleParentItemChange(idx, "rateListSrNo", e.target.value)}
                                        />
                                    </td>
                                    <td style={{ ...styles.td, minWidth: 100 }}>
                                        <input
                                            style={styles.input}
                                            type="number"
                                            value={item.depbRate || 0}
                                            onChange={(e) => handleParentItemChange(idx, "depbRate", e.target.value)}
                                        />
                                    </td>
                                    <td style={{ ...styles.td, minWidth: 100 }}>
                                        <input
                                            style={styles.input}
                                            type="number"
                                            value={item.depbQty || 0}
                                            onChange={(e) => handleParentItemChange(idx, "depbQty", e.target.value)}
                                        />
                                    </td>
                                    <td style={{ ...styles.td, minWidth: 120 }}>
                                        <UnitDropdownField
                                            value={item.unit}
                                            onChange={(val) => handleParentItemChange(idx, "unit", val)}
                                            unitOptions={unitCodes}
                                            placeholder="UNIT"
                                        />
                                    </td>
                                    <td style={{ ...styles.td, minWidth: 100 }}>
                                        <input
                                            style={styles.input}
                                            type="number"
                                            value={item.percentQty || 0}
                                            onChange={(e) => handleParentItemChange(idx, "percentQty", e.target.value)}
                                        />
                                    </td>
                                    <td style={{ ...styles.td, minWidth: 100 }}>
                                        <input
                                            style={styles.input}
                                            value={item.capValue || ""}
                                            onChange={(e) => handleParentItemChange(idx, "capValue", e.target.value)}
                                        />
                                    </td>
                                    <td style={{ ...styles.td, textAlign: "center" }}>
                                        <button
                                            type="button"
                                            onClick={() => deleteParentItem(idx)}
                                            disabled={
                                                (depbDetails.depbParentItems || [getDefaultDepbParentItem()])
                                                    .length <= 1
                                            }
                                            style={{
                                                border: "none",
                                                background: "transparent",
                                                color: "#e53e3e",
                                                cursor:
                                                    (depbDetails.depbParentItems || [getDefaultDepbParentItem()])
                                                        .length <= 1
                                                        ? "not-allowed"
                                                        : "pointer",
                                                fontWeight: 700,
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
                <button type="button" style={styles.addBtn} onClick={addParentItem}>
                    <span>＋</span>
                    <span>Add Row</span>
                </button>
            </div>
        </div>
    );
};

export default ProductDEPBTab;
