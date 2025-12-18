import React, { useRef, useState, useEffect } from "react";
import { styles as commonStyles } from "../Product/commonStyles";
import DateInput from "../../../common/DateInput.js";

const apiBase = import.meta.env.VITE_API_STRING;

function toUpper(val) {
  return (typeof val === "string" ? val : "").toUpperCase();
}
function toUpperVal(e) {
  return e?.target?.value ? e.target.value.toUpperCase() : "";
}

const natureOfPaymentOptions = [
  "Not Applicable",
  "Letter Of Credit",
  "Delivery against Acceptance",
  "Direct Payment",
  "Advance Payment",
];

// ------ path helpers + hook ------
function getByPath(values, path) {
  return path
    .split(".")
    .reduce(
      (acc, key) => (acc && acc[key] !== undefined ? acc[key] : ""),
      values
    );
}

function useCompactCountryDropdown(fieldPath, formik) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(getByPath(formik.values, fieldPath) || "");
  const [opts, setOpts] = useState([]);
  const [active, setActive] = useState(-1);
  const wrapperRef = useRef(null);
  const keepOpenOnInput = useRef(false);

  useEffect(() => {
    setQuery(getByPath(formik.values, fieldPath) || "");
  }, [formik.values, fieldPath]);

  useEffect(() => {
    if (!open || !query.trim()) {
      setOpts([]);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const res = await fetch(
          `${apiBase}/countries?search=${encodeURIComponent(query.trim())}`
        );
        const data = await res.json();
        setOpts(data?.data || []);
      } catch {
        setOpts([]);
      }
    }, 220);
    return () => clearTimeout(t);
  }, [open, query]);

  useEffect(() => {
    const close = (e) => {
      if (
        !keepOpenOnInput.current &&
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  return {
    wrapperRef,
    open,
    setOpen,
    query,
    setQuery,
    opts,
    active,
    setActive,
    handle: (val) => {
      setQuery(val);
      formik.setFieldValue(fieldPath, val);
      setOpen(true);
    },
    select: (i) => {
      const opt = opts[i];
      if (!opt) return;
      const name = toUpper(opt.countryName || opt.country_name);
      setQuery(name);
      formik.setFieldValue(fieldPath, name);
      setOpen(false);
      setActive(-1);
    },
    onInputFocus: () => {
      setOpen(true);
      setActive(-1);
      keepOpenOnInput.current = true;
    },
    onInputBlur: () => {
      setTimeout(() => {
        keepOpenOnInput.current = false;
      }, 100);
    },
  };
}

// ------ CountryField (compact, enterprise) ------
function CountryField({ label, fieldName, placeholder, formik }) {
  const d = useCompactCountryDropdown(fieldName, formik);
  const s = commonStyles;

  return (
    <div style={s.field} ref={d.wrapperRef}>
      {label && <div style={s.label}>{label}</div>}
      <div style={s.acWrap}>
        <input
          style={s.input}
          placeholder={placeholder}
          autoComplete="off"
          value={toUpper(d.query)}
          onChange={(e) => d.handle(e.target.value.toUpperCase())}
          onFocus={d.onInputFocus}
          onBlur={d.onInputBlur}
          onKeyDown={(e) => {
            if (!d.open) return;
            if (e.key === "ArrowDown")
              d.setActive((a) =>
                Math.min(d.opts.length - 1, a < 0 ? 0 : a + 1)
              );
            else if (e.key === "ArrowUp")
              d.setActive((a) => Math.max(0, a - 1));
            else if (e.key === "Enter" && d.active >= 0) {
              e.preventDefault();
              d.select(d.active);
            } else if (e.key === "Escape") d.setOpen(false);
          }}
        />
        <span style={s.acIcon}>▼</span>
        {d.open && d.opts.length > 0 && (
          <div style={s.acMenu}>
            {d.opts.map((opt, i) => (
              <div
                key={opt._id || opt.countryCode || opt.countryName || i}
                style={s.acItem(d.active === i)}
                onMouseDown={() => d.select(i)}
                onMouseEnter={() => d.setActive(i)}
              >
                {toUpper(opt.countryName || opt.country_name)}
                {opt.countryCode && (
                  <span
                    style={{
                      marginLeft: 8,
                      color: "#668",
                      fontWeight: 400,
                    }}
                  >
                    ({opt.countryCode})
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ------ Local layout styles to tighten structure ------
const styles = {
  page: {
    ...commonStyles.page,
    paddingTop: 10,
  },
  card: {
    ...commonStyles.card,
    padding: 12,
  },
  title: {
    fontWeight: 700,
    fontSize: 13,
    color: "#16408f",
    marginBottom: 6,
  },
  sectionLabel: {
    fontWeight: 700,
    fontSize: 11,
    color: "#444",
    marginTop: 6,
    marginBottom: 4,
  },
  grid2: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    columnGap: 18,
    rowGap: 6,
    alignItems: "end",
  },
  field: {
    ...commonStyles.field,
    marginBottom: 4,
  },
  label: {
    ...commonStyles.label,
    fontSize: 11,
    fontWeight: 700,
    marginBottom: 2,
  },
  input: {
    ...commonStyles.input,
    height: 26,
    fontSize: 12,
  },
  select: {
    ...commonStyles.select,
    height: 26,
    fontSize: 12,
  },
};

const OtherInfoTab = ({ formik }) => {
  const saveTimeoutRef = useRef(null);
  const otherInfo = formik.values.otherInfo || {};

  const handleFieldChange = (field, value) => {
    formik.setFieldValue(`otherInfo.${field}`, value);
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.title}>Other Info</div>

        {/* Row 1: Export Contract */}
        <div style={styles.grid2}>
          <div style={styles.field}>
            <div style={styles.label}>Export Contract No</div>
            <input
              style={styles.input}
              value={otherInfo.exportContractNo || ""}
              onChange={(e) =>
                handleFieldChange("exportContractNo", e.target.value)
              }
            />
          </div>
          <div style={styles.field}>
            <div style={styles.label}>Export Contract Date</div>
            <DateInput
              style={styles.input}
              value={otherInfo.exportContractDate || ""}
              onChange={(e) =>
                handleFieldChange("exportContractDate", e.target.value)
              }
            />
          </div>
        </div>

        {/* Row 2: Nature of Payment / Payment Period */}
        <div style={styles.grid2}>
          <div style={styles.field}>
            <div style={styles.label}>Nature Of Payment</div>
            <select
              style={styles.select}
              value={otherInfo.natureOfPayment || "Not Applicable"}
              onChange={(e) =>
                handleFieldChange("natureOfPayment", e.target.value)
              }
            >
              {natureOfPaymentOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
          <div style={styles.field}>
            <div style={styles.label}>Payment Period (days)</div>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <input
                type="number"
                style={{ ...styles.input, flex: 1 }}
                value={otherInfo.paymentPeriod || 0}
                onChange={(e) =>
                  handleFieldChange("paymentPeriod", e.target.value)
                }
              />
              <span style={{ fontSize: 11, color: "#555" }}>days</span>
            </div>
          </div>
        </div>

        {/* AEO header */}
        <div style={styles.sectionLabel}>AEO Info</div>

        {/* Row 3: AEO Code / AEO Country */}
        <div style={styles.grid2}>
          <div style={styles.field}>
            <div style={styles.label}>AEO Code</div>
            <input
              style={styles.input}
              value={otherInfo.aeoCode || ""}
              onChange={(e) => handleFieldChange("aeoCode", toUpperVal(e))}
            />
          </div>
          <div style={styles.field}>
            <div style={styles.label}>AEO Country</div>
            <CountryField
              label=""
              fieldName="otherInfo.aeoCountry"
              placeholder="TYPE COUNTRY"
              formik={formik}
            />
          </div>
        </div>

        {/* Row 4: AEO Role full width */}
        <div style={styles.grid2}>
          <div style={{ ...styles.field, gridColumn: "1 / 3" }}>
            <div style={styles.label}>AEO Role</div>
            <input
              style={styles.input}
              value={otherInfo.aeoRole || ""}
              onChange={(e) => handleFieldChange("aeoRole", toUpperVal(e))}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default OtherInfoTab;
