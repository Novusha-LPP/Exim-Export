import React from "react";
import { styles as baseStyles } from "./commonStyles";
import { unitCodes } from "../../../../utils/masterList";
import { toUpperVal } from "./commonStyles.js";
import DateInput from "../../../common/DateInput.js";
import SearchableDropdown from "../../../common/SearchableDropdown.js";
const dutyRows = [
  { key: "exportDuty", label: "Export Duty" },
  { key: "cess", label: "Cess" },
  { key: "otherDutyCess", label: "Oth.Duty/Cess" },
  { key: "thirdCess", label: "Third Cess" },
];

const dutyOptions = [
  "1 (5%)",
  "1 (10%)",
  "1 (15%)",
  "1 (Rs.8000/MTS)",
  "1 (0%)",
  "1 (8%)",
];

const styles = {
  ...baseStyles,
  cessCard: {
    border: "1px solid #c0cad8",
    borderRadius: 4,
    padding: 6,
    marginBottom: 10,
    background: "#f7f9fc",
  },
  innerPanel: {
    border: "1px solid #b4c0cc",
    background: "#ffffff",
    padding: 4,
  },
  checkboxRow: {
    display: "flex",
    alignItems: "center",
    gap: 4,
    fontSize: 11,
    color: "#003366",
    marginBottom: 4,
  },
  hdrRow: {
    display: "grid",
    gridTemplateColumns: "120px 130px 320px 180px 130px 180px", // ✅ Increased Rates: 270→320px, Desc: 130→180px
    fontSize: 11,
    fontWeight: 600,
    background: "#d5dde8",
    border: "1px solid #b4c0cc",
    borderBottom: "none",
  },
  hdrCell: {
    padding: "3px 6px",
    borderLeft: "1px solid #b4c0cc",
    boxSizing: "border-box",
  },
  bodyRow: {
    display: "grid",
    gridTemplateColumns: "120px 130px 320px 180px 130px 180px", // ✅ Same increased widths applied
    fontSize: 11,
    alignItems: "center",
    borderLeft: "1px solid #b4c0cc",
    borderRight: "1px solid #b4c0cc",
    borderBottom: "1px solid #b4c0cc",
  },
  cell: {
    padding: "2px 6px",
    borderLeft: "1px solid #e0e5ee",
    boxSizing: "border-box",
  },
  rowLabel: { fontSize: 11, color: "#222" },
  select: {
    width: "100%",
    fontSize: 11,
    height: 22,
    border: "1px solid #9aa7b8",
    borderRadius: 2,
    padding: "0 3px",
    background: "#fdfdfd",
    boxSizing: "border-box",
  },
  inputNum: {
    width: "100%",
    fontSize: 11,
    height: 20,
    border: "1px solid #9aa7b8",
    borderRadius: 2,
    padding: "0 3px",
    boxSizing: "border-box",
    textAlign: "right",
  },
  inputText: {
    width: "100%",
    fontSize: 11,
    height: 20,
    border: "1px solid #9aa7b8",
    borderRadius: 2,
    padding: "0 3px",
    boxSizing: "border-box",
  },
  cenvatGrid: {
    display: "grid",
    gridTemplateColumns: "170px 130px 130px 130px 130px",
    gap: 8,
    fontSize: 11,
    alignItems: "center",
  },
  fieldBlock: { display: "flex", flexDirection: "column", gap: 2 },
  smallLabel: { fontSize: 11, color: "#222" },
};

const ProductCessDutyTab = ({ formik, idx = 0 }) => {
  const products = formik.values.products || [];
  const product = products[idx] || {};
  const cessExpDuty = product.cessExpDuty || {};
  const cenvat = cessExpDuty.cenvat || {};

  const setCess = (field, value) => {
    const currentProducts = formik.values.products || [];
    const updated = [...currentProducts];

    if (!updated[idx]) updated[idx] = {};
    if (!updated[idx].cessExpDuty) updated[idx].cessExpDuty = {};

    updated[idx].cessExpDuty = {
      ...updated[idx].cessExpDuty,
      [field]: value,
    };

    formik.setFieldValue("products", updated);
  };

  const setCenvat = (field, value) => {
    const currentProducts = formik.values.products || [];
    const updated = [...currentProducts];

    if (!updated[idx]) updated[idx] = {};
    if (!updated[idx].cessExpDuty) updated[idx].cessExpDuty = {};
    if (!updated[idx].cessExpDuty.cenvat) updated[idx].cessExpDuty.cenvat = {};

    updated[idx].cessExpDuty.cenvat = {
      ...updated[idx].cessExpDuty.cenvat,
      [field]: value,
    };

    formik.setFieldValue("products", updated);
  };

  return (
    <div>
      <label style={styles.checkboxRow}>
        <input
          type="checkbox"
          checked={!!cessExpDuty.cessDutyApplicable}
          onChange={(e) => setCess("cessDutyApplicable", e.target.checked)}
        />
        <span>CESS / Exp. Duty is leviable on this item</span>
      </label>
      {/* CESS / EXPORT DUTY */}
      <div style={styles.cessCard}>
        {/* header row */}
        <div style={styles.hdrRow}>
          <div style={styles.hdrCell}></div>
          <div style={{ ...styles.hdrCell, textAlign: "center" }}>
            Cess/Duty
          </div>
          <div style={{ ...styles.hdrCell, textAlign: "center" }}>
            Cess/Duty Rates
          </div>
          <div style={{ ...styles.hdrCell, textAlign: "center" }}>
            Tariff Value (T.V.)
          </div>
          <div style={{ ...styles.hdrCell, textAlign: "center" }}>
            Qty for Cess/Duty
          </div>
          <div style={{ ...styles.hdrCell, textAlign: "center" }}>
            Cess Desc
          </div>
        </div>

        {/* body rows */}
        {dutyRows.map((r) => (
          <div key={r.key} style={styles.bodyRow}>
            {/* row label */}
            <div style={{ ...styles.cell, borderLeft: "none" }}>
              <div style={styles.rowLabel}>{r.label}</div>
            </div>

            {/* Cess/Duty dropdown */}
            <div style={styles.cell}>
              <select
                style={styles.select}
                value={cessExpDuty[`${r.key}Code`] || ""}
                onChange={(e) => setCess(`${r.key}Code`, e.target.value)}
              >
                <option value=""></option>
                {dutyOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            {/* Rate: value + '% or Rs' */}
            <div style={styles.cell}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <input
                  type="number"
                  style={{ ...styles.inputNum, width: "30%" }}
                  value={cessExpDuty[`${r.key}Rate`] ?? ""}
                  onChange={(e) => setCess(`${r.key}Rate`, e.target.value)}
                />
                <div
                  style={{
                    fontSize: 11,
                    color: "#444",
                    width: "25%",
                    textAlign: "center",
                    // background: "blue",
                  }}
                >
                  % or Rs
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 4,
                  }}
                >
                  <input
                    type="number"
                    style={{ ...styles.inputNum, width: "40%" }}
                    value={cessExpDuty[`${r.key}TariffValue`] ?? ""}
                    onChange={(e) =>
                      setCess(`${r.key}TariffValue`, e.target.value)
                    }
                  />
                  <span style={{ fontSize: 11 }}>/</span>
                  <SearchableDropdown
                    options={unitCodes}
                    value={cessExpDuty[`${r.key}RateUnit`] ?? ""}
                    onChange={(e) =>
                      setCess(`${r.key}RateUnit`, e.target.value)
                    }
                    placeholder="Unit"
                    style={{ width: "40%", height: 20, fontSize: 11 }}
                  />
                </div>
              </div>
            </div>

            {/* Tariff value (T.V.) + factor */}
            {["cess"].includes(r.key) ? (
              <div
                style={{
                  ...styles.cell,
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <input
                    type="number"
                    style={{ ...styles.inputNum, width: "55%" }}
                    value={cessExpDuty.tariffValue_tv ?? ""}
                    onChange={(e) => setCess("tariffValue_tv", e.target.value)}
                  />
                  <span style={{ fontSize: 11 }}>/</span>
                  <SearchableDropdown
                    options={unitCodes}
                    value={cessExpDuty.tariffUnit_tv || ""}
                    onChange={(e) => setCess("tariffUnit_tv", e.target.value)}
                    placeholder="Unit"
                    style={{ width: "35%", height: 20, fontSize: 11 }}
                  />
                </div>
              </div>
            ) : (
              <div style={styles.cell}></div>
            )}

            {/* Qty */}
            <div style={styles.cell}>
              <input
                type="number"
                style={styles.inputNum}
                value={cessExpDuty[`${r.key}Qty`] ?? ""}
                onChange={(e) => setCess(`${r.key}Qty`, e.target.value)}
              />
            </div>

            {/* Description */}
            <div style={styles.cell}>
              <input
                type="text"
                style={{
                  width: "380%",
                  fontSize: 11,
                  height: 20,
                  border: "1px solid #9aa7b8",
                  borderRadius: 2,
                  padding: "0 3px",
                  boxSizing: "border-box",
                }}
                value={cessExpDuty[`${r.key}Desc`] || ""}
                onChange={(e) =>
                  setCess(`${r.key}Desc`, toUpperVals(e.target.value))
                }
              />
            </div>
          </div>
        ))}

        {/* bottom right Cess Unit - MISSING FROM YOUR CODE, ADDED BACK */}
        <div
          style={{
            marginTop: 4,
            display: "flex",
            justifyContent: "flex-end",
            gap: 6,
            alignItems: "center",
            fontSize: 11,
          }}
        >
          <span>Cess Unit</span>
          <input
            type="text"
            style={{ ...styles.inputText, width: 120 }}
            value={cessExpDuty.cessUnit || ""}
            onChange={(e) => setCess("cessUnit", toUpperVal(e.target.value))}
          />
        </div>
      </div>

      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: "#003366",
          marginBottom: 4,
        }}
      >
        CENVAT Details
      </div>
      {/* CENVAT DETAILS */}
      <div style={styles.cessCard}>
        <div style={styles.cenvatGrid}>
          <div style={styles.fieldBlock}>
            <span style={styles.smallLabel}>Certificate Number</span>
            <input
              style={styles.inputText}
              value={cenvat.certificateNumber || ""}
              onChange={(e) =>
                setCenvat("certificateNumber", toUpperVal(e.target.value))
              }
            />
          </div>
          <div style={styles.fieldBlock}>
            <span style={styles.smallLabel}>Date</span>
            <DateInput
              style={styles.inputText}
              value={cenvat.date || ""}
              onChange={(e) => setCenvat("date", toUpperVal(e.target.value))}
            />
          </div>
          <div style={styles.fieldBlock}>
            <span style={styles.smallLabel}>Valid Upto</span>
            <DateInput
              style={styles.inputText}
              value={cenvat.validUpto || ""}
              onChange={(e) => setCenvat("validUpto", e.target.value)}
            />
          </div>
          <div style={styles.fieldBlock}>
            <span style={styles.smallLabel}>CEx Office Code</span>
            <input
              style={styles.inputText}
              value={cenvat.cexOfficeCode || ""}
              onChange={(e) =>
                setCenvat("cexOfficeCode", toUpperVal(e.target.value))
              }
            />
          </div>
          <div style={styles.fieldBlock}>
            <span style={styles.smallLabel}>Assessee Code</span>
            <input
              style={styles.inputText}
              value={cenvat.assesseeCode || ""}
              onChange={(e) =>
                setCenvat("assesseeCode", toUpperVal(e.target.value))
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductCessDutyTab;
