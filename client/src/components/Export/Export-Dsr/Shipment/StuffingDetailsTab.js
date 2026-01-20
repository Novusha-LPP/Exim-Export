import React, { useState, useRef, useCallback, useEffect } from "react";
import { cfs } from "../../../../utils/masterList";
import DateInput from "../../../common/DateInput.js";

const styles = {
  page: {
    fontFamily: "'Segoe UI', Roboto, Arial, sans-serif",
    fontSize: 13,
    color: "#1e2e38",
  },
  row: { display: "flex", gap: 20, alignItems: "stretch" },
  col: { flex: 1, minWidth: 0 },
  card: {
    background: "#fff",
    border: "1.5px solid #e2e8f0",
    borderRadius: 7,
    padding: 13,
    marginBottom: 18,
  },
  sectionTitleMain: {
    fontWeight: 700,
    color: "#16408f",
    fontSize: 13,
    marginBottom: 10,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  sectionTitle: {
    fontWeight: 700,
    color: "#1e2e38",
    fontSize: 12,
    marginBottom: 8,
  },
  field: { marginBottom: 8 },
  label: {
    fontSize: 11,
    fontWeight: 700,
    color: "#263046",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 3,
  },
  input: {
    width: "100%",
    fontSize: 12,
    padding: "3px 8px",
    border: "1px solid #bdc7d1",
    borderRadius: 3,
    height: 26,
    background: "#f7fafc",
    outline: "none",
    boxSizing: "border-box",
    textTransform: "uppercase",
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

  textarea: {
    width: "100%",
    fontSize: 12,
    padding: "4px 8px",
    border: "1.5px solid #ccd6dd",
    borderRadius: 4,
    minHeight: 60,
    background: "#f7fafc",
    resize: "vertical",
    textTransform: "uppercase",
    fontWeight: 600,
  },
  split: { display: "flex", gap: 10 },
  half: { flex: 1, minWidth: 0 },
  select: {
    width: "100%",
    fontSize: 12,
    padding: "3px 6px",
    border: "1px solid #bdc7d1",
    borderRadius: 3,
    height: 26,
    background: "#f7fafc",
    outline: "none",
    boxSizing: "border-box",
    textTransform: "uppercase",
    fontWeight: 600,
  },
  checkboxRow: { display: "flex", alignItems: "center", gap: 6, marginTop: 4 },
  checkboxLabel: {
    fontSize: 11,
    color: "#34495e",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
};

function toUpper(v) {
  return (typeof v === "string" ? v : "")?.toUpperCase() || "";
}

const goodsStuffedAtOptions = ["Factory", "Dock"];

const sealTypeOptions = ["Agent Seal", "Self Seal", "Wearhouse"];

function CFSDropdownField({
  label,
  fieldName,
  formik,
  cfsList,
  placeholder = "ENTER WAREHOUSE CODE",
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(formik.values[fieldName] || "");
  const [active, setActive] = useState(-1);
  const wrapperRef = useRef();

  // cfsList can be array of strings or objects { code, name }
  const filtered = (cfsList || [])
    .filter((item) => {
      const text =
        typeof item === "string"
          ? item
          : `${item.code || ""} ${item.name || ""}`;
      return !query || text.toUpperCase().includes(query.toUpperCase());
    })
    .slice(0, 15);

  useEffect(() => {
    setQuery(formik.values[fieldName] || "");
  }, [formik.values[fieldName]]);

  useEffect(() => {
    const close = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target))
        setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  function handleSelect(i) {
    const item = filtered[i];
    if (!item) return;
    const val =
      typeof item === "string"
        ? item
        : `${item.code || ""}${item.name ? ` - ${item.name}` : ""}`;
    const upper = val.toUpperCase();
    setQuery(upper);
    formik.setFieldValue(fieldName, upper);
    setOpen(false);
    setActive(-1);
  }

  return (
    <div style={styles.field} ref={wrapperRef}>
      <div style={styles.label}>{label}</div>
      <div style={styles.acWrap}>
        <input
          style={styles.input}
          placeholder={placeholder}
          autoComplete="off"
          value={toUpper(query)}
          onChange={(e) => {
            const v = e.target.value.toUpperCase();
            setQuery(v);
            formik.setFieldValue(fieldName, v);
            setOpen(true);
          }}
          onFocus={() => {
            setOpen(true);
            setActive(-1);
          }}
          onKeyDown={(e) => {
            if (!open) return;
            if (e.key === "ArrowDown")
              setActive((a) =>
                Math.min(filtered.length - 1, a < 0 ? 0 : a + 1),
              );
            else if (e.key === "ArrowUp") setActive((a) => Math.max(0, a - 1));
            else if (e.key === "Enter" && active >= 0) {
              e.preventDefault();
              handleSelect(active);
            } else if (e.key === "Escape") setOpen(false);
          }}
        />
        {open && filtered.length > 0 && (
          <div style={styles.acMenu}>
            {filtered.map((item, i) => {
              const code = typeof item === "string" ? item : item.code || "";
              const name = typeof item === "string" ? "" : item.name || "";
              return (
                <div
                  key={code || name || i}
                  style={styles.acItem(active === i)}
                  onMouseDown={() => handleSelect(i)}
                  onMouseEnter={() => setActive(i)}
                >
                  {toUpper(code)}
                  {name && (
                    <span style={{ marginLeft: 6, color: "#667" }}>
                      {" "}
                      - {toUpper(name)}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function StuffingDetailsTab({ formik, onUpdate }) {
  const saveTimeoutRef = useRef(null);

  const autoSave = useCallback(
    async (values) => {
      if (onUpdate) await onUpdate(values);
    },
    [onUpdate],
  );

  const handleFieldChange = (field, value) => {
    formik.setFieldValue(field, value);
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      autoSave(formik.values);
    }, 1100);
  };

  return (
    <div style={styles.page}>
      <div style={styles.sectionTitleMain}>STUFFING DETAILS</div>
      <div style={styles.row}>
        {/* LEFT COLUMN */}
        <div style={styles.col}>
          <div style={styles.card}>
            <div style={styles.sectionTitle}>STUFFING LOCATION & DETAILS</div>

            {/* Goods Stuffed At + Sample Accompanied */}
            <div style={styles.split}>
              <div style={styles.half}>
                <div style={{ ...styles.checkboxRow, marginTop: 20 }}>
                  <input
                    type="checkbox"
                    checked={formik.values.sample_accompanied || false}
                    onChange={(e) =>
                      handleFieldChange("sample_accompanied", e.target.checked)
                    }
                    style={{ width: 14, height: 14 }}
                  />
                  <span style={styles.checkboxLabel}>SAMPLE ACCOMPANIED</span>
                </div>
              </div>
            </div>

            {formik.values.goods_stuffed_at === "Dock" && (
              <CFSDropdownField
                label="cfs"
                fieldName="cfs"
                formik={formik}
                cfsList={cfs}
                placeholder="ENTER WAREHOUSE CODE"
              />
            )}

            {/* Factory Address */}
            <div style={styles.field}>
              <div style={styles.label}>FACTORY ADDRESS</div>
              <textarea
                style={styles.textarea}
                rows={5}
                value={formik.values.factory_address || ""}
                onChange={(e) =>
                  handleFieldChange(
                    "factory_address",
                    e.target.value.toUpperCase(),
                  )
                }
                placeholder="ENTER FACTORY ADDRESS DETAILS..."
              />
            </div>

            {/* Warehouse Code */}

            <div style={styles.field}>
              <div style={styles.label}>
                WAREHOUSE CODE (OF CFS/ICD/TERMINAL)
              </div>
              <input
                style={styles.input}
                value={toUpper(formik.values.warehouse_code || "")}
                onChange={(e) =>
                  handleFieldChange(
                    "warehouse_code",
                    e.target.value.toUpperCase(),
                  )
                }
                placeholder="ENTER WAREHOUSE CODE"
              />
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div style={styles.col}>
          <div style={styles.card}>
            <div style={styles.sectionTitle}>SEAL & AGENCY INFORMATION</div>

            {/* Seal Type */}
            <div style={styles.field}>
              <div style={styles.label}>SEAL TYPE</div>
              <select
                style={styles.select}
                value={formik.values.stuffing_seal_type || ""}
                onChange={(e) =>
                  handleFieldChange("stuffing_seal_type", e.target.value)
                }
              >
                <option value="">SELECT</option>
                {sealTypeOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {toUpper(opt)}
                  </option>
                ))}
              </select>
            </div>

            {/* Seal No */}
            <div style={styles.field}>
              <div style={styles.label}>SEAL NO</div>
              <input
                style={styles.input}
                value={toUpper(formik.values.stuffing_seal_no || "")}
                onChange={(e) =>
                  handleFieldChange(
                    "stuffing_seal_no",
                    e.target.value.toUpperCase(),
                  )
                }
                placeholder="ENTER SEAL NUMBER"
              />
            </div>

            {/* Agency Name */}
            <div style={styles.field}>
              <div style={styles.label}>AGENCY NAME</div>
              <input
                style={styles.input}
                value={toUpper(formik.values.stuffing_agency_name || "")}
                onChange={(e) =>
                  handleFieldChange(
                    "stuffing_agency_name",
                    e.target.value.toUpperCase(),
                  )
                }
                placeholder="ENTER AGENCY NAME"
              />
            </div>

            {/* Additional Information */}
            <div style={{ ...styles.sectionTitle, marginTop: 10 }}>
              ADDITIONAL INFORMATION
            </div>

            {/* Stuffing Date */}
            <div style={styles.field}>
              <div style={styles.label}>STUFFING DATE</div>
              <DateInput
                style={{
                  ...styles.input,
                  textTransform: "none",
                  fontWeight: 500,
                }}
                value={formik.values.stuffing_date || ""}
                onChange={(e) =>
                  handleFieldChange("stuffing_date", e.target.value)
                }
              />
            </div>

            {/* Supervisor Name */}
            <div style={styles.field}>
              <div style={styles.label}>SUPERVISOR NAME</div>
              <input
                style={styles.input}
                value={toUpper(formik.values.stuffing_supervisor || "")}
                onChange={(e) =>
                  handleFieldChange(
                    "stuffing_supervisor",
                    e.target.value.toUpperCase(),
                  )
                }
                placeholder="ENTER SUPERVISOR NAME"
              />
            </div>

            {/* Remarks */}
            <div style={styles.field}>
              <div style={styles.label}>STUFFING REMARKS</div>
              <textarea
                style={styles.textarea}
                rows={3}
                value={formik.values.stuffing_remarks || ""}
                onChange={(e) =>
                  handleFieldChange(
                    "stuffing_remarks",
                    e.target.value.toUpperCase(),
                  )
                }
                placeholder="ENTER ANY ADDITIONAL REMARKS..."
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default StuffingDetailsTab;
