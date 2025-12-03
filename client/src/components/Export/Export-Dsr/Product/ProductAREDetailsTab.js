import React from "react";
import { styles } from "./commonStyles";

const defaultAreRow = (idx) => ({
  serialNumber: idx + 1,
  areNumber: "",
  areDate: "",
  commissionerate: "",
  division: "",
  range: "",
  remark: "",
});

const ProductAREDetailsTab = ({ formik, idx = 0 }) => {
  const product = formik.values.products?.[idx] || {};
  const areDetails = product.areDetails || [];

  const handleAreChange = (rowIdx, field, value) => {
    const updatedProducts = [...(formik.values.products || [])];
    if (!updatedProducts[idx]) updatedProducts[idx] = {};
    const areRows = [...(updatedProducts[idx].areDetails || [])];
    areRows[rowIdx] = { ...areRows[rowIdx], [field]: value };
    updatedProducts[idx].areDetails = areRows;
    formik.setFieldValue("products", updatedProducts);
  };

  const addAreRow = () => {
    const updatedProducts = [...(formik.values.products || [])];
    const areRows = [...(updatedProducts[idx]?.areDetails || [])];
    areRows.push(defaultAreRow(areRows.length));
    updatedProducts[idx].areDetails = areRows;
    formik.setFieldValue("products", updatedProducts);
  };

  const deleteAreRow = (i) => {
    const updatedProducts = [...(formik.values.products || [])];
    const areRows = [...(updatedProducts[idx]?.areDetails || [])];
    areRows.splice(i, 1);
    updatedProducts[idx].areDetails = areRows;
    formik.setFieldValue("products", updatedProducts);
  };

  return (
    <div style={styles.card}>
      <div style={styles.cardTitle}>ARE Details</div>

      <div style={styles.tableContainer}>
        <div
          style={{
            ...styles.tableHeaderRow,
            gridTemplateColumns: "0.5fr 1.2fr 1fr 1.2fr 0.8fr 1fr 1.2fr 0.6fr",
          }}
        >
          <div>Sr No</div>
          <div>ARE Number</div>
          <div>ARE Date</div>
          <div>Commissionerate</div>
          <div>Division</div>
          <div>Range</div>
          <div>Remark</div>
          <div></div>
        </div>

        {areDetails.map((row, i) => (
          <div
            key={i}
            style={{
              ...styles.tableRow,
              gridTemplateColumns:
                "0.5fr 1.2fr 1fr 1.2fr 0.8fr 1fr 1.2fr 0.6fr",
            }}
          >
            <div style={{ fontSize: 12 }}>{i + 1}</div>
            <div>
              <input
                style={styles.input}
                value={row.areNumber || ""}
                onChange={(e) => handleAreChange(i, "areNumber", e.target.value)}
              />
            </div>
            <div>
              <input
                type="date"
                style={styles.input}
                value={row.areDate ? row.areDate.substring(0, 10) : ""}
                onChange={(e) => handleAreChange(i, "areDate", e.target.value)}
              />
            </div>
            <div>
              <input
                style={styles.input}
                value={row.commissionerate || ""}
                onChange={(e) =>
                  handleAreChange(i, "commissionerate", e.target.value)
                }
              />
            </div>
            <div>
              <input
                style={styles.input}
                value={row.division || ""}
                onChange={(e) => handleAreChange(i, "division", e.target.value)}
              />
            </div>
            <div>
              <input
                style={styles.input}
                value={row.range || ""}
                onChange={(e) => handleAreChange(i, "range", e.target.value)}
              />
            </div>
            <div>
              <input
                style={styles.input}
                value={row.remark || ""}
                onChange={(e) => handleAreChange(i, "remark", e.target.value)}
              />
            </div>
            <div style={{ textAlign: "center" }}>
              <button
                type="button"
                style={styles.linkButton}
                onClick={() => deleteAreRow(i)}
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      <button type="button" style={styles.smallButton} onClick={addAreRow}>
        + Add ARE Detail
      </button>
    </div>
  );
};

export default ProductAREDetailsTab;
