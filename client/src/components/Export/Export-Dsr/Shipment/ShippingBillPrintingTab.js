// ShippingBillPrintingTab.jsx - Shipping Bill Printing tab component refactored for Premium Compact UI
import React, { useRef, useCallback } from "react";
import DateInput from "../../../common/DateInput";
import { styles, toUpperVal } from "../Product/commonStyles";

const ShippingBillPrintingTab = ({ formik, onUpdate }) => {
  const saveTimeoutRef = useRef(null);

  // Auto-save function
  const autoSave = useCallback(
    async (values) => {
      try {
        if (onUpdate) await onUpdate(values);
      } catch (error) {
        console.error("Auto-save failed:", error);
      }
    },
    [onUpdate]
  );

  // Handle field changes with auto-save
  const handleFieldChange = (field, value) => {
    formik.setFieldValue(field, value);
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      autoSave(formik.values);
    }, 1500);
  };

  const typeOfShipmentOptions = [
    "Outright Sale",
    "Consignment",
    "Branch Transfer",
    "Others",
  ];

  const exportUnderOptions = [
    "Other",
    "Advance License",
    "EPCG",
    "SEZ",
  ];

  return (
    <div style={styles.page}>
      <div style={styles.sectionTitle}>Shipping Bill Printing Details</div>

      <div style={styles.grid2}>
        {/* Left Column - Main Fields */}
        <div style={styles.card}>
          <div style={styles.cardTitle}>Shipping Bill Information</div>

          <div style={styles.field}>
            <label style={styles.label}>O/I-Cert. No./Date/Initiative</label>
            <textarea
              style={{ ...styles.textarea, height: 80 }}
              value={toUpperVal(formik.values.oi_cert_details || "")}
              onChange={(e) =>
                handleFieldChange("oi_cert_details", toUpperVal(e.target.value))
              }
              placeholder="ENTER O/I CERTIFICATE DETAILS..."
            />
          </div>

          <div style={styles.grid2}>
            <div style={styles.field}>
              <label style={styles.label}>Type of Shipment</label>
              <select
                style={styles.select}
                value={formik.values.type_of_shipment || ""}
                onChange={(e) =>
                  handleFieldChange("type_of_shipment", e.target.value)
                }
              >
                <option value="">-- SELECT --</option>
                {typeOfShipmentOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Specify, if Other</label>
              <input
                style={styles.input}
                value={toUpperVal(formik.values.specify_if_other || "")}
                onChange={(e) =>
                  handleFieldChange("specify_if_other", toUpperVal(e.target.value))
                }
                disabled={formik.values.type_of_shipment !== "Others"}
              />
            </div>
          </div>

          <div style={styles.grid2}>
            <div style={styles.field}>
              <label style={styles.label}>Permission No.</label>
              <input
                style={styles.input}
                value={toUpperVal(formik.values.permission_no || "")}
                onChange={(e) =>
                  handleFieldChange("permission_no", toUpperVal(e.target.value))
                }
              />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Permission Date</label>
              <DateInput
                style={styles.input}
                value={formik.values.permission_date || ""}
                onChange={(e) =>
                  handleFieldChange("permission_date", e.target.value)
                }
              />
            </div>
          </div>

          <div style={styles.grid2}>
            <div style={styles.field}>
              <label style={styles.label}>Export Under</label>
              <select
                style={styles.select}
                value={formik.values.export_under || ""}
                onChange={(e) =>
                  handleFieldChange("export_under", e.target.value)
                }
              >
                <option value="">-- SELECT --</option>
                {exportUnderOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>
            <div style={styles.field}>
              <label style={styles.label}>S/B Heading</label>
              <input
                style={styles.input}
                value={toUpperVal(formik.values.sb_heading || "")}
                onChange={(e) =>
                  handleFieldChange("sb_heading", toUpperVal(e.target.value))
                }
                placeholder="E.G. STAINLESS STEEL BAR"
              />
            </div>
          </div>
        </div>

        {/* Right Column - Export Trade Control & Text Area */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={styles.card}>
            <div style={styles.cardTitle}>Export Trade Control & Additional Details</div>

            <div style={styles.field}>
              <label style={styles.label}>Export Trade Control</label>
              <textarea
                style={{ ...styles.textarea, height: 100 }}
                value={toUpperVal(formik.values.export_trade_control || "")}
                onChange={(e) =>
                  handleFieldChange("export_trade_control", toUpperVal(e.target.value))
                }
                placeholder="ENTER EXPORT TRADE CONTROL DETAILS..."
              />
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Text to be printed on S/B bottom area</label>
              <textarea
                style={{ ...styles.textarea, height: 120 }}
                value={toUpperVal(formik.values.sb_bottom_text || "")}
                onChange={(e) =>
                  handleFieldChange("sb_bottom_text", toUpperVal(e.target.value))
                }
                placeholder="ENTER TEXT FOR SHIPPING BILL BOTTOM AREA..."
              />
            </div>
          </div>

          <div style={styles.card}>
            <div style={styles.cardTitle}>Additional Reference Information</div>

            <div style={styles.grid2}>
              <div style={styles.field}>
                <label style={styles.label}>Reference Type</label>
                <input
                  style={styles.input}
                  value={toUpperVal(formik.values.sb_reference_type || "")}
                  onChange={(e) =>
                    handleFieldChange("sb_reference_type", toUpperVal(e.target.value))
                  }
                />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Reference Number</label>
                <input
                  style={styles.input}
                  value={toUpperVal(formik.values.sb_reference_number || "")}
                  onChange={(e) =>
                    handleFieldChange("sb_reference_number", toUpperVal(e.target.value))
                  }
                />
              </div>
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Additional Notes</label>
              <textarea
                style={{ ...styles.textarea, height: 60 }}
                value={toUpperVal(formik.values.sb_additional_notes || "")}
                onChange={(e) =>
                  handleFieldChange("sb_additional_notes", toUpperVal(e.target.value))
                }
                placeholder="ENTER ANY ADDITIONAL NOTES..."
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShippingBillPrintingTab;
