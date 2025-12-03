import React from "react";
import { styles } from "./commonStyles";
import { unitCodes } from "../../../../utils/masterList";

const ProductReExportTab = ({ formik, idx = 0 }) => {
  const product = formik.values.products?.[idx] || {};
  const reExport = product.reExport || {};
  const isEnabled = !!reExport.isReExport;

  const handleChange = (field, value) => {
    const updatedProducts = [...(formik.values.products || [])];
    if (!updatedProducts[idx]) updatedProducts[idx] = {};
    const currentReExport = updatedProducts[idx].reExport || {};
    updatedProducts[idx].reExport = { ...currentReExport, [field]: value };
    formik.setFieldValue("products", updatedProducts);
  };

  const formatDate = (dateStr) => (dateStr ? dateStr.substring(0, 10) : "");

  return (
    <div style={styles.card}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 12,
        }}
      >
        <div style={styles.cardTitle}>Re-Export / Import Details</div>
        <label style={styles.checkboxRow}>
          <input
            type="checkbox"
            checked={isEnabled}
            onChange={(e) => handleChange("isReExport", e.target.checked)}
          />
          THIS IS RE-EXPORT ITEM
        </label>
      </div>

      {/* Main Split: Left (Import) vs Right (Export) */}
      <div style={{ ...styles.grid2, alignItems: "start", gap: 32 }}>
        {/* ================= LEFT COLUMN: IMPORT / B/E DETAILS ================= */}
        <div>
          <div style={styles.sectionTitle}>Import / B/E Details</div>

          {/* B/E Number & Date */}
          <div style={styles.grid2}>
            <div style={styles.field}>
              <span style={styles.label}>B/E Number</span>
              <input
                style={styles.input}
                value={reExport.beNumber || ""}
                onChange={(e) => handleChange("beNumber", e.target.value)}
                disabled={!isEnabled}
              />
            </div>
            <div style={styles.field}>
              <span style={styles.label}>B/E Date</span>
              <input
                type="date"
                style={styles.input}
                value={formatDate(reExport.beDate)}
                onChange={(e) => handleChange("beDate", e.target.value)}
                disabled={!isEnabled}
              />
            </div>
          </div>

          {/* Invoice SNo & Item SNo */}
          <div style={styles.grid2}>
            <div style={styles.field}>
              <span style={styles.label}>Invoice SNo</span>
              <input
                style={styles.input}
                value={reExport.invoiceSerialNo || ""}
                onChange={(e) =>
                  handleChange("invoiceSerialNo", e.target.value)
                }
                disabled={!isEnabled}
              />
            </div>
            <div style={styles.field}>
              <span style={styles.label}>Item SNo</span>
              <input
                style={styles.input}
                value={reExport.itemSerialNo || ""}
                onChange={(e) => handleChange("itemSerialNo", e.target.value)}
                disabled={!isEnabled}
              />
            </div>
          </div>

          {/* Import Port Code & Manual B/E */}
          <div style={styles.grid2}>
            <div style={styles.field}>
              <span style={styles.label}>Import Port Code</span>
              <input
                style={styles.input}
                value={reExport.importPortCode || ""}
                onChange={(e) => handleChange("importPortCode", e.target.value)}
                disabled={!isEnabled}
              />
            </div>
            <div style={{ ...styles.field, paddingTop: 20 }}>
              <label style={styles.checkboxRow}>
                <input
                  type="checkbox"
                  checked={!!reExport.manualBE}
                  onChange={(e) => handleChange("manualBE", e.target.checked)}
                  disabled={!isEnabled}
                />
                Manual B/E
              </label>
            </div>
          </div>

          {/* B/E Item Desc */}
          <div style={styles.field}>
            <span style={styles.label}>B/E Item Desc.</span>
            <textarea
              style={{ ...styles.textarea, height: 60 }}
              value={reExport.beItemDescription || ""}
              onChange={(e) =>
                handleChange("beItemDescription", e.target.value)
              }
              disabled={!isEnabled}
            />
          </div>

          {/* Quantity Imported & Unit */}
          <div style={{ ...styles.grid2, gridTemplateColumns: "2fr 1fr" }}>
            <div style={styles.field}>
              <span style={styles.label}>Quantity Imported</span>
              <input
                type="number"
                style={styles.input}
                value={reExport.quantityImported || 0}
                onChange={(e) =>
                  handleChange("quantityImported", e.target.value)
                }
                disabled={!isEnabled}
              />
            </div>
            <div style={styles.field}>
              <span style={styles.label}>Unit</span>
              <select
                style={styles.input}
                value={reExport.qtyImportedUnit || ""}
                onChange={(e) =>
                  handleChange("qtyImportedUnit", e.target.value)
                }
                disabled={!isEnabled}
              >
                <option value="">Select Unit</option>
                {unitCodes.map((unit) => (
                  <option key={unit.code} value={unit.code}>
                    {unit.code} - {unit.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Assessable Value */}
          <div style={styles.field}>
            <span style={styles.label}>Assessable Value</span>
            <input
              type="number"
              style={styles.input}
              value={reExport.assessableValue || 0}
              onChange={(e) => handleChange("assessableValue", e.target.value)}
              disabled={!isEnabled}
            />
          </div>

          {/* Total Duty Paid & Date */}
          <div style={styles.grid2}>
            <div style={styles.field}>
              <span style={styles.label}>Total Duty Paid</span>
              <input
                type="number"
                style={styles.input}
                value={reExport.totalDutyPaid || 0}
                onChange={(e) => handleChange("totalDutyPaid", e.target.value)}
                disabled={!isEnabled}
              />
            </div>
            <div style={styles.field}>
              <span style={styles.label}>Duty Paid Date</span>
              <input
                type="date"
                style={styles.input}
                value={formatDate(reExport.dutyPaidDate)}
                onChange={(e) => handleChange("dutyPaidDate", e.target.value)}
                disabled={!isEnabled}
              />
            </div>
          </div>
        </div>

        {/* ================= RIGHT COLUMN: EXPORT / TECHNICAL DETAILS ================= */}
        <div>
          <div style={styles.sectionTitle}>Export / Technical Details</div>

          {/* Quantity Exported & Unit */}
          <div style={{ ...styles.grid2, gridTemplateColumns: "2fr 1fr" }}>
            <div style={styles.field}>
              <span style={styles.label}>Quantity Exported</span>
              <input
                type="number"
                style={styles.input}
                value={reExport.quantityExported || 0}
                onChange={(e) =>
                  handleChange("quantityExported", e.target.value)
                }
                disabled={!isEnabled}
              />
            </div>
            <div style={styles.field}>
              <span style={styles.label}>Unit</span>
              <select
                style={styles.input}
                value={reExport.qtyExportedUnit || ""}
                onChange={(e) =>
                  handleChange("qtyExportedUnit", e.target.value)
                }
                disabled={!isEnabled}
              >
                <option value="">Select Unit</option>
                {unitCodes.map((unit) => (
                  <option key={unit.code} value={unit.code}>
                    {unit.code} - {unit.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Technical Details */}
          <div style={styles.field}>
            <span style={styles.label}>Technical Details</span>
            <input
              style={styles.input}
              value={reExport.technicalDetails || ""}
              onChange={(e) => handleChange("technicalDetails", e.target.value)}
              disabled={!isEnabled}
            />
          </div>

          {/* Checkboxes: Input Credit / Personal Use */}
          <div style={{ display: "flex", gap: 16, marginBottom: 16 }}>
            <label style={styles.checkboxRow}>
              <input
                type="checkbox"
                checked={!!reExport.inputCreditAvailed}
                onChange={(e) =>
                  handleChange("inputCreditAvailed", e.target.checked)
                }
                disabled={!isEnabled}
              />
              Input Credit Availed
            </label>
            <label style={styles.checkboxRow}>
              <input
                type="checkbox"
                checked={!!reExport.personalUseItem}
                onChange={(e) =>
                  handleChange("personalUseItem", e.target.checked)
                }
                disabled={!isEnabled}
              />
              Personal Use Item
            </label>
          </div>

          {/* Other Identifying Params */}
          <div style={styles.field}>
            <span style={styles.label}>Other Identifying Parameters</span>
            <input
              style={styles.input}
              value={reExport.otherIdentifyingParameters || ""}
              onChange={(e) =>
                handleChange("otherIdentifyingParameters", e.target.value)
              }
              disabled={!isEnabled}
            />
          </div>

          {/* Export Obligation */}
          <div
            style={{
              ...styles.grid2,
              gridTemplateColumns: "1fr 1.5fr",
              alignItems: "center",
            }}
          >
            <label
              style={{ ...styles.checkboxRow, marginBottom: 0, marginTop: 12 }}
            >
              <input
                type="checkbox"
                checked={!!reExport.againstExportObligation}
                onChange={(e) =>
                  handleChange("againstExportObligation", e.target.checked)
                }
                disabled={!isEnabled}
              />
              Against Exp. Oblig.
            </label>
            <div style={styles.field}>
              <span style={styles.label}>Obligation No.</span>
              <input
                style={styles.input}
                value={reExport.obligationNo || ""}
                onChange={(e) => handleChange("obligationNo", e.target.value)}
                disabled={!isEnabled}
              />
            </div>
          </div>

          {/* Drawback Claimed */}
          <div style={{ ...styles.grid2, gridTemplateColumns: "1.5fr 1fr" }}>
            <div style={styles.field}>
              <span style={styles.label}>Drawback Amt Claimed</span>
              <input
                type="number"
                style={styles.input}
                value={reExport.drawbackAmtClaimed || 0}
                onChange={(e) =>
                  handleChange("drawbackAmtClaimed", e.target.value)
                }
                disabled={!isEnabled}
              />
            </div>
            <div />
          </div>

          {/* Unused / Commissioner Permission */}
          <div style={{ display: "flex", gap: 16, marginBottom: 16 }}>
            <label style={styles.checkboxRow}>
              <input
                type="checkbox"
                checked={!!reExport.itemUnUsed}
                onChange={(e) => handleChange("itemUnUsed", e.target.checked)}
                disabled={!isEnabled}
              />
              Item Un-Used
            </label>
            <label style={styles.checkboxRow}>
              <input
                type="checkbox"
                checked={!!reExport.commissionerPermission}
                onChange={(e) =>
                  handleChange("commissionerPermission", e.target.checked)
                }
                disabled={!isEnabled}
              />
              Commissioner Permission
            </label>
          </div>

          {/* Board No & Date */}
          <div style={styles.grid2}>
            <div style={styles.field}>
              <span style={styles.label}>Board Number</span>
              <input
                style={styles.input}
                value={reExport.boardNumber || ""}
                onChange={(e) => handleChange("boardNumber", e.target.value)}
                disabled={!isEnabled}
              />
            </div>
            <div style={styles.field}>
              <span style={styles.label}>Board Date</span>
              <input
                type="date"
                style={styles.input}
                value={formatDate(reExport.boardDate)}
                onChange={(e) => handleChange("boardDate", e.target.value)}
                disabled={!isEnabled}
              />
            </div>
          </div>

          {/* MODVAT */}
          <div style={{ display: "flex", gap: 16, marginTop: 8 }}>
            <label style={styles.checkboxRow}>
              <input
                type="checkbox"
                checked={!!reExport.modvatAvailed}
                onChange={(e) =>
                  handleChange("modvatAvailed", e.target.checked)
                }
                disabled={!isEnabled}
              />
              MODVAT Availed
            </label>
            <label style={styles.checkboxRow}>
              <input
                type="checkbox"
                checked={!!reExport.modvatReversed}
                onChange={(e) =>
                  handleChange("modvatReversed", e.target.checked)
                }
                disabled={!isEnabled}
              />
              MODVAT Reversed
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductReExportTab;
