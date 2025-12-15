import React, { useCallback, useRef, useState, useEffect } from "react";
import { unitCodes } from "../../../../utils/masterList";
import DateInput from "../../../common/DateInput.js";

// IMPORTANT: import the same `styles` you use in ProductGeneralTab,
// or copy the styles object from paste.txt into a shared file and import here.
// adjust path as per your project
const styles = {
  // ... (Keep your existing styles)
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
  td: { padding: "8px 12px", borderBottom: "1px solid #e2e8f0", zIndex: "999" },
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
  textarea: {
    width: "100%",
    fontSize: 12,
    padding: "5px 8px",
    border: "1.5px solid #ccd6dd",
    borderRadius: 4,
    minHeight: 45,
    background: "#f7fafc",
    resize: "vertical",
    textTransform: "uppercase",
    fontWeight: 600,
    boxSizing: "border-box",
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
  grid3: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 16,
    marginBottom: 8,
    alignItems: "end",
  },
  grid4: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
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
};
// Default DEEC item
const getDefaultDeecItem = (idx = 1) => ({
  serialNumber: idx,
  itemSnoPartC: "",
  description: "",
  quantity: 0,
  unit: "",
  itemType: "Indigenous",
});

// Default Registration Object Item
const getDefaultRegItem = () => ({
  licRefNo: "",
  regnNo: "",
  licDate: "",
});
function UnitDropdownField({
  label,
  fieldName,
  formik,
  unitOptions,
  placeholder,
  onSelect,
}) {
  const [open, setOpen] = useState(false);

  // Helper to get deeply nested value from object using path like "products[0].rodtepInfo.unit"
  function getValueByPath(obj, path) {
    return path
      .split(/[\.\[\]]/)
      .filter(Boolean)
      .reduce(
        (acc, key) => (acc && acc[key] !== undefined ? acc[key] : ""),
        obj
      );
  }

  const [query, setQuery] = useState(
    getValueByPath(formik.values, fieldName) || ""
  );

  useEffect(() => {
    setQuery(getValueByPath(formik.values, fieldName) || "");
  }, [formik.values, fieldName]);

  const [active, setActive] = useState(-1);
  const wrapperRef = useRef();

  // Filter options case-insensitive based on query input
  const filtered = (unitOptions || [])
    .filter((opt) => opt.toUpperCase().includes(query.toUpperCase()))
    .slice(0, 15);

  useEffect(() => {
    // Close dropdown menu if clicked outside component
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
    formik.setFieldValue(fieldName, selectedValue);

    if (onSelect) {
      onSelect(selectedValue);
    }

    setOpen(false);
    setActive(-1);
  }

  return (
    <div style={styles.field} ref={wrapperRef}>
      {label && <div style={styles.label}>{label}</div>}
      <div style={styles.acWrap}>
        <input
          style={styles.input}
          placeholder={placeholder}
          autoComplete="off"
          value={query.toUpperCase()}
          onChange={(e) => {
            const val = e.target.value.toUpperCase();
            setQuery(val);
            formik.setFieldValue(fieldName, val);
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
                onMouseDown={() => handleSelect(i)} // use onMouseDown to prevent blur before click
                onMouseEnter={() => setActive(i)}
              >
                {val.toUpperCase()}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
const ProductDEECTab = ({ formik, productIndex }) => {
  const saveTimeoutRef = useRef(null);
  const product = formik.values.products[productIndex];

  const deecDetails = product?.deecDetails || {
    isDeecItem: false,
    deecItems: [getDefaultDeecItem(1)],
    deec_reg_obj: [getDefaultRegItem()],
  };

  const autoSave = useCallback(() => formik.submitForm(), [formik]);

  // Top-level fields
  const handleDeecFieldChange = (field, value) => {
    const updatedProducts = [...formik.values.products];
    if (!updatedProducts[productIndex].deecDetails) {
      updatedProducts[productIndex].deecDetails = {};
    }
    updatedProducts[productIndex].deecDetails[field] = value;
    formik.setFieldValue("products", updatedProducts);
  };

  // DEEC items (Part C)
  const handleDeecItemChange = (itemIndex, field, value) => {
    const updatedProducts = [...formik.values.products];
    const deecItems = [
      ...(updatedProducts[productIndex].deecDetails?.deecItems || []),
    ];

    if (!deecItems[itemIndex]) {
      deecItems[itemIndex] = getDefaultDeecItem(itemIndex + 1);
    }

    deecItems[itemIndex][field] = value;
    updatedProducts[productIndex].deecDetails.deecItems = deecItems;
    formik.setFieldValue("products", updatedProducts);
  };

  const addDeecItem = () => {
    const updatedProducts = [...formik.values.products];
    const deecItems = [
      ...(updatedProducts[productIndex].deecDetails?.deecItems || []),
    ];
    deecItems.push(getDefaultDeecItem(deecItems.length + 1));

    if (!updatedProducts[productIndex].deecDetails) {
      updatedProducts[productIndex].deecDetails = { isDeecItem: true };
    }
    updatedProducts[productIndex].deecDetails.deecItems = deecItems;

    formik.setFieldValue("products", updatedProducts);
  };

  const deleteDeecItem = (itemIndex) => {
    const updatedProducts = [...formik.values.products];
    const deecItems = [
      ...(updatedProducts[productIndex].deecDetails?.deecItems || []),
    ];

    if (deecItems.length > 1) {
      deecItems.splice(itemIndex, 1);
      deecItems.forEach((item, idx) => {
        item.serialNumber = idx + 1;
      });
      updatedProducts[productIndex].deecDetails.deecItems = deecItems;
      formik.setFieldValue("products", updatedProducts);
    }
  };

  // License registration items
  const handleRegItemChange = (itemIndex, field, value) => {
    const updatedProducts = [...formik.values.products];
    const regItems = [
      ...(updatedProducts[productIndex].deecDetails?.deec_reg_obj || []),
    ];

    if (regItems.length === 0) {
      regItems.push(getDefaultRegItem());
    }

    regItems[itemIndex][field] = value;
    updatedProducts[productIndex].deecDetails.deec_reg_obj = regItems;

    formik.setFieldValue("products", updatedProducts);
  };

  const addRegItem = () => {
    const updatedProducts = [...formik.values.products];
    const regItems = [
      ...(updatedProducts[productIndex].deecDetails?.deec_reg_obj || []),
    ];
    regItems.push(getDefaultRegItem());

    updatedProducts[productIndex].deecDetails.deec_reg_obj = regItems;
    formik.setFieldValue("products", updatedProducts);
  };

  const deleteRegItem = (itemIndex) => {
    const updatedProducts = [...formik.values.products];
    const regItems = [
      ...(updatedProducts[productIndex].deecDetails?.deec_reg_obj || []),
    ];

    if (regItems.length > 1) {
      regItems.splice(itemIndex, 1);
      updatedProducts[productIndex].deecDetails.deec_reg_obj = regItems;
      formik.setFieldValue("products", updatedProducts);
    }
  };

  return (
    <div style={styles.card}>
      <div style={styles.cardTitle}>
        PRODUCT DEEC DETAILS
        <span style={styles.chip}>PART C / LICENSE</span>
      </div>

      {/* Checkbox */}
      <div style={{ marginBottom: 10 }}>
        <label style={styles.inlineCheckbox}>
          <input
            type="checkbox"
            style={styles.checkbox}
            checked={deecDetails.isDeecItem || false}
            onChange={(e) =>
              handleDeecFieldChange("isDeecItem", e.target.checked)
            }
          />
          THIS IS A DEEC ITEM
        </label>
      </div>

      {/* 1. Part E & Quantity Details */}
      <div style={styles.subSectionTitle}>PART E & QUANTITY DETAILS</div>
      <div style={styles.grid3}>
        <div style={styles.field}>
          <label style={styles.label}>Item SNo (Part E)</label>
          <input
            style={styles.input}
            type="text"
            value={deecDetails.itemSnoPartE || ""}
            onChange={(e) =>
              handleDeecFieldChange("itemSnoPartE", e.target.value)
            }
            placeholder="ITEM SERIAL NUMBER"
          />
        </div>
        <div style={styles.field}>
          <label style={styles.label}>Export Qty Under Licence</label>
          <input
            style={styles.input}
            type="number"
            value={deecDetails.exportQtyUnderLicence || 0}
            onChange={(e) =>
              handleDeecFieldChange(
                "exportQtyUnderLicence",
                parseFloat(e.target.value) || 0
              )
            }
          />
        </div>
      </div>

      {/* 2. License Registration Details */}
      <div style={styles.subSectionTitle}>LICENSE REGISTRATION DETAILS</div>

      <div style={styles.tableContainer}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Sr No</th>
              <th style={styles.th}>License Ref No</th>
              <th style={styles.th}>Registration No</th>
              <th style={styles.th}>License Date</th>
              <th style={{ ...styles.th, textAlign: "center", width: 70 }}>
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {(deecDetails.deec_reg_obj && deecDetails.deec_reg_obj.length > 0
              ? deecDetails.deec_reg_obj
              : [getDefaultRegItem()]
            ).map((item, idx) => (
              <tr key={`reg-${idx}`}>
                <td style={styles.td}>{idx + 1}</td>
                <td style={styles.td}>
                  <input
                    style={styles.input}
                    type="text"
                    value={item.licRefNo || ""}
                    placeholder="LIC REF NO"
                    onChange={(e) =>
                      handleRegItemChange(idx, "licRefNo", e.target.value)
                    }
                  />
                </td>
                <td style={styles.td}>
                  <input
                    style={styles.input}
                    type="text"
                    value={item.regnNo || ""}
                    placeholder="REGISTRATION NO"
                    onChange={(e) =>
                      handleRegItemChange(idx, "regnNo", e.target.value)
                    }
                  />
                </td>
                <td style={styles.td}>
                  <DateInput
                    style={styles.input}
                    value={item.licDate || ""}
                    onChange={(e) =>
                      handleRegItemChange(idx, "licDate", e.target.value)
                    }
                  />
                </td>
                <td style={{ ...styles.td, textAlign: "center" }}>
                  <button
                    type="button"
                    onClick={() => deleteRegItem(idx)}
                    disabled={
                      (deecDetails.deec_reg_obj || [getDefaultRegItem()])
                        .length <= 1
                    }
                    style={{
                      border: "none",
                      background: "transparent",
                      color: "#e53e3e",
                      cursor:
                        (deecDetails.deec_reg_obj || [getDefaultRegItem()])
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

      <button type="button" style={styles.addBtn} onClick={addRegItem}>
        <span>＋</span>
        <span>Add License Detail</span>
      </button>

      {/* 3. DEEC Items (Part C) */}
      <div style={styles.subSectionTitle}>DEEC ITEMS (PART C)</div>

      <div style={styles.tableContainer}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Sr No</th>
              <th style={styles.th}>Item SNo Part C</th>
              <th style={styles.th}>Description</th>
              <th style={styles.th}>Quantity</th>
              <th style={styles.th}>Unit</th>
              <th style={styles.th}>Item Type</th>
              <th style={{ ...styles.th, textAlign: "center", width: 70 }}>
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {deecDetails.deecItems?.map((item, idx) => (
              <tr key={`deec-${idx}`}>
                <td style={styles.td}>{item.serialNumber}</td>
                <td style={styles.td}>
                  <input
                    style={styles.input}
                    type="text"
                    value={item.itemSnoPartC || ""}
                    onChange={(e) =>
                      handleDeecItemChange(idx, "itemSnoPartC", e.target.value)
                    }
                  />
                </td>
                <td style={styles.td}>
                  <input
                    style={styles.input}
                    type="text"
                    value={item.description || ""}
                    onChange={(e) =>
                      handleDeecItemChange(idx, "description", e.target.value)
                    }
                  />
                </td>
                <td style={styles.td}>
                  <input
                    style={styles.input}
                    type="number"
                    value={item.quantity || 0}
                    onChange={(e) =>
                      handleDeecItemChange(
                        idx,
                        "quantity",
                        parseFloat(e.target.value) || 0
                      )
                    }
                  />
                </td>
                <td style={{ ...styles.td, minWidth: 150 }}>
                  <div style={{ position: "relative" }}>
                    <UnitDropdownField
                      label=""
                      fieldName={`products[${productIndex}].deecDetails.deecItems[${idx}].unit`}
                      formik={formik}
                      unitOptions={unitCodes}
                      placeholder="UNIT"
                      onSelect={(value) =>
                        handleDeecItemChange(idx, "unit", value)
                      }
                    />
                  </div>
                </td>
                <td style={styles.td}>
                  <select
                    style={styles.select}
                    value={item.itemType || "Indigenous"}
                    onChange={(e) =>
                      handleDeecItemChange(idx, "itemType", e.target.value)
                    }
                  >
                    <option value="Indigenous">INDIGENOUS</option>
                    <option value="Imported">IMPORTED</option>
                  </select>
                </td>
                <td style={{ ...styles.td, textAlign: "center" }}>
                  <button
                    type="button"
                    onClick={() => deleteDeecItem(idx)}
                    disabled={deecDetails.deecItems?.length <= 1}
                    style={{
                      border: "none",
                      background: "transparent",
                      color: "#e53e3e",
                      cursor:
                        deecDetails.deecItems?.length <= 1
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

      <button type="button" style={styles.addBtn} onClick={addDeecItem}>
        <span>＋</span>
        <span>Add DEEC Item</span>
      </button>
    </div>
  );
};

export default ProductDEECTab;
