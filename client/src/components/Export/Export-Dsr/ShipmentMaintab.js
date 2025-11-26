import React, { useState, useRef, useCallback, useEffect } from "react";
import {states} from "../../../utils/masterList";

const apiBase = import.meta.env.VITE_API_STRING;

const styles = {
  page: { fontFamily: "'Segoe UI', Roboto, Arial, sans-serif", fontSize: 13, color: "#1e2e38" },
  row: { display: "flex", gap: 20, alignItems: "stretch", marginBottom: 0 },
  col: { flex: 1, minWidth: 0 },
  card: { background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 7, padding: 13, marginBottom: 18 },
  sectionTitle: { fontWeight: 700, color: "#16408f", fontSize: 12, marginBottom: 10, letterSpacing: 1.3 },
  split: { display: "flex", gap: 8 },
  half: { flex: 1, minWidth: 0 },
  field: { marginBottom: 8 },
  label: { fontSize: 11, fontWeight: 700, color: "#263046", letterSpacing: 1, textTransform: "uppercase", marginBottom: 1 },
  input: {
    width: "100%", textTransform: "uppercase", fontWeight: 600,
    fontSize: 12, padding: "2.5px 8px", border: "1px solid #bdc7d1", borderRadius: 3,
    height: 26, background: "#f7fafc", outline: "none", boxSizing: "border-box"
  },
  acWrap: { position: "relative" },
  acIcon: { position: "absolute", right: 8, top: 8, fontSize: 11, color: "#bbbbbb", pointerEvents: "none" },
  acMenu: {
    position: "absolute", left: 0, right: 0, top: 28, background: "#fff", border: "1.5px solid #d3e3ea",
    borderRadius: 4, zIndex: 13, fontSize: 12, fontWeight: 600, maxHeight: 154, overflow: "auto"
  },
  acItem: (active) => ({
    padding: "6px 9px", cursor: "pointer", textTransform: "uppercase",
    background: active ? "#eaf2fe" : "#fff", color: active ? "#18427c" : "#1b2b38", fontWeight: active ? 700 : 600
  }),
  textarea: { width: "100%", fontSize: 13, padding: "5px 8px", border: "1.5px solid #ccd6dd", borderRadius: 4, minHeight: 45, background: "#f7fafc", resize: "vertical", textTransform: "uppercase", fontWeight: 600 }
};

function toUpper(v) { return (typeof v === "string" ? v : "")?.toUpperCase() || ""; }

function useCompactCountryDropdown(fieldName, formik) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(formik.values[fieldName] || "");
  const [opts, setOpts] = useState([]);
  const [active, setActive] = useState(-1);
  const wrapperRef = useRef();
  // To prevent blur focus-loss bug
  const keepOpenOnInput = useRef(false);

  // Keep query in sync with formik
  useEffect(() => { setQuery(formik.values[fieldName] || ""); }, [formik.values[fieldName]]);

  useEffect(() => {
    if (!open || !query?.trim()) { setOpts([]); return; }
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`${apiBase}/countries?search=${encodeURIComponent(query.trim())}`);
        const data = await res.json();
        setOpts(data?.data || []);
      } catch { setOpts([]); }
    }, 220);
    return () => clearTimeout(t);
  }, [open, query]);

  // Outside click closes only if NOT in input/list
  useEffect(() => {
    function close(e) {
      if (!keepOpenOnInput.current &&
        wrapperRef.current && !wrapperRef.current.contains(e.target)
      ) setOpen(false);
    }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  return {
    wrapperRef, open, setOpen, query, setQuery, opts, active, setActive,
    handle: val => { setQuery(val); formik.setFieldValue(fieldName, val); setOpen(true); },
    select: i => {
      if (opts[i]) {
        setQuery(toUpper(opts[i].countryName || opts[i].country_name));
        formik.setFieldValue(fieldName, toUpper(opts[i].countryName || opts[i].country_name));
        setOpen(false); setActive(-1);
      }
    },
    onInputFocus: () => { setOpen(true); setActive(-1); keepOpenOnInput.current = true; },
    onInputBlur: () => { setTimeout(() => { keepOpenOnInput.current = false; }, 100); }
  };
}

function CountryField({ label, fieldName, placeholder, formik }) {
  const d = useCompactCountryDropdown(fieldName, formik);
  return (
    <div style={styles.field} ref={d.wrapperRef}>
      <div style={styles.label}>{label}</div>
      <div style={styles.acWrap}>
        <input
          style={styles.input}
          placeholder={placeholder}
          autoComplete="off"
          value={toUpper(d.query)}
          onChange={e => d.handle(e.target.value.toUpperCase())}
          onFocus={d.onInputFocus}
          onBlur={d.onInputBlur}
          onKeyDown={e => {
            if (!d.open) return;
            if (e.key === "ArrowDown") d.setActive(a => Math.min(d.opts.length - 1, a < 0 ? 0 : a + 1));
            else if (e.key === "ArrowUp") d.setActive(a => Math.max(0, a - 1));
            else if (e.key === "Enter" && d.active >= 0) { e.preventDefault(); d.select(d.active); }
            else if (e.key === "Escape") d.setOpen(false);
          }}
        />
        <span style={styles.acIcon}>▼</span>
        {d.open && d.opts.length > 0 && (
          <div style={styles.acMenu}>
            {d.opts.map((opt, i) =>
              <div key={opt._id || opt.countryCode || opt.countryName || i}
                style={styles.acItem(d.active === i)}
                onMouseDown={() => d.select(i)}
                onMouseEnter={() => d.setActive(i)}
              >
                {toUpper(opt.countryName || opt.country_name)}
                {opt.countryCode && <span style={{ marginLeft: 8, color: "#668", fontWeight: 400 }}>({opt.countryCode})</span>}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function usePortDropdown(fieldName, formik) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(formik.values[fieldName] || "");
  const [opts, setOpts] = useState([]);
  const [active, setActive] = useState(-1);
  const wrapperRef = useRef();
  const keepOpen = useRef(false);

  useEffect(() => { setQuery(formik.values[fieldName] || ""); }, [formik.values[fieldName]]);
  useEffect(() => {
    if (!open || !query.trim()) { setOpts([]); return; }
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`${apiBase}/ports?search=${encodeURIComponent(query.trim())}`);
        const data = await res.json();
        setOpts(data?.data || []);
      } catch { setOpts([]); }
    }, 220);
    return () => clearTimeout(t);
  }, [open, query]);

  useEffect(() => {
    function close(e) {
      if (!keepOpen.current && wrapperRef.current && !wrapperRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", close); return () => document.removeEventListener("mousedown", close);
  }, []);

  function select(i) {
    if (opts[i]) {
      const sel = opts[i];
      // Compose: portCode + '(' + portDetails + ')'
      const value = toUpper(sel.portName) + "(" + toUpper(sel.portDetails) + ")";
      setQuery(value);
      formik.setFieldValue(fieldName, value);
      setOpen(false); setActive(-1);
    }
  }

  return {
    wrapperRef, open, setOpen, query, setQuery, opts, active, setActive,
    handle: val => { setQuery(val); formik.setFieldValue(fieldName, val); setOpen(true); },
    select,
    onInputFocus: () => { setOpen(true); setActive(-1); keepOpen.current = true; },
    onInputBlur: () => { setTimeout(() => { keepOpen.current = false; }, 100); }
  };
}

function PortField({ label, fieldName, placeholder, formik }) {
  const d = usePortDropdown(fieldName, formik);
  return (
    <div style={styles.field} ref={d.wrapperRef}>
      <div style={styles.label}>{label}</div>
      <div style={styles.acWrap}>
        <input
          style={styles.input}
          placeholder={placeholder}
          autoComplete="off"
          value={toUpper(d.query)}
          onChange={e => d.handle(e.target.value.toUpperCase())}
          onFocus={d.onInputFocus}
          onBlur={d.onInputBlur}
          onKeyDown={e => {
            if (!d.open) return;
            if (e.key === "ArrowDown") d.setActive(a => Math.min(d.opts.length - 1, a < 0 ? 0 : a + 1));
            else if (e.key === "ArrowUp") d.setActive(a => Math.max(0, a - 1));
            else if (e.key === "Enter" && d.active >= 0) { e.preventDefault(); d.select(d.active); }
            else if (e.key === "Escape") d.setOpen(false);
          }}
        />
        <span style={styles.acIcon}>▼</span>
        {d.open && d.opts.length > 0 && (
          <div style={styles.acMenu}>
            {d.opts.map((opt, i) =>
              <div
                key={opt._id || opt.portCode || opt.portName || i}
                style={styles.acItem(d.active === i)}
                onMouseDown={() => d.select(i)}
                onMouseEnter={() => d.setActive(i)}
              >
                {toUpper(opt.portCode)} ({toUpper(opt.portDetails)}) - {toUpper(opt.portName)}
                {opt.country && <span style={{ marginLeft: 8, color: "#668", fontWeight: 400 }}>[{toUpper(opt.country)}]</span>}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
function StateDropdownField({ label, fieldName, formik, states, placeholder = "GUJARAT" }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(formik.values[fieldName] || "");
  const [active, setActive] = useState(-1);
  const wrapperRef = useRef();

  // Filtering states by substring match, always upper-case
  const filteredStates = (states || [])
    .filter(s =>
      toUpper(typeof s === "string" ? s : s.name).includes(query.toUpperCase())
    )
    .slice(0, 10); // Limit for dropdown height

  useEffect(() => { setQuery(formik.values[fieldName] || ""); }, [formik.values[fieldName]]);

  // Close dropdown on outside click
  useEffect(() => {
    const close = (e) => { if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", close); return () => document.removeEventListener("mousedown", close);
  }, []);

  function handleSelect(i) {
    const stateName = typeof filteredStates[i] === "string"
      ? filteredStates[i]
      : filteredStates[i].name;
    setQuery(toUpper(stateName));
    formik.setFieldValue(fieldName, toUpper(stateName));
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
          onChange={e => {
            setQuery(e.target.value.toUpperCase());
            formik.setFieldValue(fieldName, e.target.value.toUpperCase());
            setOpen(true);
          }}
          onFocus={() => { setOpen(true); setActive(-1); }}
          onKeyDown={e => {
            if (!open) return;
            if (e.key === "ArrowDown") setActive(a => Math.min(filteredStates.length - 1, a < 0 ? 0 : a + 1));
            else if (e.key === "ArrowUp") setActive(a => Math.max(0, a - 1));
            else if (e.key === "Enter" && active >= 0) { e.preventDefault(); handleSelect(active); }
            else if (e.key === "Escape") setOpen(false);
          }}
        />
        <span style={styles.acIcon}>▼</span>
        {open && filteredStates.length > 0 && (
          <div style={styles.acMenu}>
            {filteredStates.map((val, i) =>
              <div
                key={typeof val === "string" ? val : val.name}
                style={styles.acItem(active === i)}
                onMouseDown={() => handleSelect(i)}
                onMouseEnter={() => setActive(i)}
              >
                {toUpper(typeof val === "string" ? val : val.name)}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}


function ShipmentMainTab({ formik, onUpdate }) {
  const saveTimeoutRef = useRef(null);

  // Compact auto-save
  const autoSave = useCallback(
    async (values) => { if (onUpdate) await onUpdate(values); },
    [onUpdate]
  );
  function handleFieldChange(field, value) {
    formik.setFieldValue(field, value);
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => autoSave(formik.values), 1100);
  }

  return (
    <div style={styles.page}>
      <div style={styles.row}>
        {/* Left: further split into two cols */}
        <div style={styles.col}>
          <div style={styles.card}>
            <div style={styles.sectionTitle}>PORT & LOCATION DETAILS</div>
            <div style={styles.split}>
              <div style={styles.half}>
                <PortField label="DISCHARGE PORT" fieldName="port_of_discharge" placeholder="BUSAN (KRBUS)" formik={formik} />
                <CountryField label="DISCHARGE COUNTRY" fieldName="discharge_country" placeholder="KOREA, REPUBLIC OF" formik={formik} />
                <div style={styles.field}>
                  <div style={styles.label}>SHIPPING LINE</div>
                  <input style={styles.input}
                    value={toUpper(formik.values.shipping_line || "")}
                    onChange={e => handleFieldChange("shipping_line", e.target.value.toUpperCase())}
                  />
                </div>
                <div style={styles.field}>
                  <div style={styles.label}>VOYAGE NO</div>
                  <input style={styles.input}
                    value={toUpper(formik.values.voyage_no || "")}
                    onChange={e => handleFieldChange("voyage_no", e.target.value.toUpperCase())}
                  />
                </div>
                <div style={styles.field}>
                  <div style={styles.label}>MBL NO</div>
                  <input style={styles.input}
                    value={toUpper(formik.values.mbl_no || "")}
                    onChange={e => handleFieldChange("mbl_no", e.target.value.toUpperCase())}
                  />
                </div>
                <div style={styles.field}>
                  <div style={styles.label}>HBL NO</div>
                  <input style={styles.input}
                    value={toUpper(formik.values.hbl_no || "")}
                    onChange={e => handleFieldChange("hbl_no", e.target.value.toUpperCase())}
                  />
                </div>
                <div style={styles.field}>
                  <div style={styles.label}>PRE-CARRIAGE BY</div>
                  <input style={styles.input}
                    value={toUpper(formik.values.pre_carriage_by || "")}
                    onChange={e => handleFieldChange("pre_carriage_by", e.target.value.toUpperCase())}
                  />
                </div>
                <div style={styles.field}>
                  <div style={styles.label}>TRANSHIPPER CODE</div>
                  <input style={styles.input}
                    value={toUpper(formik.values.transhipper_code || "")}
                    onChange={e => handleFieldChange("transhipper_code", e.target.value.toUpperCase())}
                  />
                </div>
<StateDropdownField
  label="STATE OF ORIGIN"
  fieldName="state_of_origin"
  formik={formik}
  states={states} // your imported states array
  placeholder="States"
/>

                <div style={{ ...styles.field, marginTop: 5 }}>
                  <label style={{ fontSize: 10.5, color: "#485", display: "flex", alignItems: "center", gap: 6 }}>
                    <input
                      type="checkbox"
                      checked={formik.values["annexure_c_details"] || false}
                      onChange={e => handleFieldChange("annexure_c_details", e.target.checked)}
                      style={{ marginRight: 7 }}
                    />ANNEXURE-C DETAILS BEING FILED WITH ANNEXURE-A
                  </label>
                </div>
              </div>
              <div style={styles.half}>
   <PortField label="DESTINATION PORT" fieldName="destination_port" placeholder="Enter Port" formik={formik} />
                <CountryField label="DESTINATION COUNTRY" fieldName="country_of_final_destination" placeholder="Enter Port" formik={formik} />
                <div style={styles.field}>
                  <div style={styles.label}>VESSEL/SAILING DATE</div>
                  <input style={styles.input} type="date"
                    value={formik.values.vessel_sailing_date || ""}
                    onChange={e => handleFieldChange("vessel_sailing_date", e.target.value)}
                  />
                </div>
                <div style={styles.field}>
                  <div style={styles.label}>EGM NO</div>
                  <input style={styles.input}
                    value={toUpper(formik.values.egm_no || "")}
                    onChange={e => handleFieldChange("egm_no", e.target.value.toUpperCase())}
                  />
                </div>
                <div style={styles.field}>
                  <div style={styles.label}>EGM DATE</div>
                  <input style={styles.input} type="date"
                    value={formik.values.egm_date || ""}
                    onChange={e => handleFieldChange("egm_date", e.target.value)}
                  />
                </div>
                <div style={styles.field}>
                  <div style={styles.label}>MBL DATE</div>
                  <input style={styles.input} type="date"
                    value={formik.values.mbl_date || ""}
                    onChange={e => handleFieldChange("mbl_date", e.target.value)}
                  />
                </div>
                <div style={styles.field}>
                  <div style={styles.label}>HBL DATE</div>
                  <input style={styles.input} type="date"
                    value={formik.values.hbl_date || ""}
                    onChange={e => handleFieldChange("hbl_date", e.target.value)}
                  />
                </div>
                <div style={styles.field}>
                  <div style={styles.label}>PLACE OF RECEIPT</div>
                  <input style={styles.input}
                    value={toUpper(formik.values.place_of_receipt || "")}
                    onChange={e => handleFieldChange("place_of_receipt", e.target.value.toUpperCase())}
                  />
                </div>
                <div style={styles.field}>
                  <div style={styles.label}>GATEWAY PORT</div>
                  <input style={styles.input}
                    value={toUpper(formik.values.gateway_port || "")}
                    onChange={e => handleFieldChange("gateway_port", e.target.value.toUpperCase())}
                    placeholder="ICD SACHANA"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
        {/* Right */}
        <div style={styles.col}>
          <div style={styles.card}>
            <div style={styles.sectionTitle}>CARGO & WEIGHT DETAILS</div>
            <div style={styles.field}>
              <div style={styles.label}>NATURE OF CARGO</div>
              <input style={styles.input}
                value={toUpper(formik.values.nature_of_cargo || "")}
                onChange={e => handleFieldChange("nature_of_cargo", e.target.value.toUpperCase())}
                placeholder="C - CONTAINERISED" />
            </div>
            <div style={styles.split}>
              <div style={styles.half}>
                <div style={styles.label}>TOTAL NO. OF PKGS</div>
                <input style={styles.input}
                  type="number"
                  value={formik.values.total_no_of_pkgs || ""}
                  onChange={e => handleFieldChange("total_no_of_pkgs", e.target.value)}
                  placeholder="31" />
              </div>
              <div style={styles.half}>
                <div style={styles.label}>UNIT</div>
                <input style={{ ...styles.input, background: "#f9fafb" }}
                  value="BDL" disabled tabIndex={-1} />
              </div>
              <div style={styles.half}>
                <div style={styles.label}>&nbsp;</div>
                <button type="button" style={{
                  ...styles.input, height: 26, background: "#e5fafa", fontWeight: 700,
                  color: "#1e3965", cursor: "pointer"
                }}>PACKING DETAILS</button>
              </div>
            </div>
            <div style={styles.field}>
              <div style={styles.label}>LOOSE PKGS</div>
              <input style={styles.input} type="number"
                value={formik.values.loose_pkgs || ""}
                onChange={e => handleFieldChange("loose_pkgs", e.target.value)}
                placeholder="0" />
            </div>
            <div style={styles.field}>
              <div style={styles.label}>NO OF CONTAINERS</div>
              <input style={styles.input} type="number"
                value={formik.values.no_of_containers || ""}
                onChange={e => handleFieldChange("no_of_containers", e.target.value)} />
            </div>
            <div style={styles.split}>
              <div style={styles.half}>
                <div style={styles.label}>GROSS WEIGHT</div>
                <input style={styles.input} type="number" step="0.001"
                  value={formik.values.gross_weight || ""}
                  onChange={e => handleFieldChange("gross_weight", e.target.value)}
                  placeholder="22827.000" />
              </div>
              <div style={styles.half}>
                <div style={styles.label}>UNIT</div>
                <input style={{ ...styles.input, background: "#f9fafb" }} value="KGS" disabled tabIndex={-1} />
              </div>
            </div>
            <div style={styles.split}>
              <div style={styles.half}>
                <div style={styles.label}>NET WEIGHT</div>
                <input style={styles.input} type="number" step="0.001"
                  value={formik.values.net_weight || ""}
                  onChange={e => handleFieldChange("net_weight", e.target.value)}
                  placeholder="22669.000" />
              </div>
              <div style={styles.half}>
                <div style={styles.label}>UNIT</div>
                <input style={{ ...styles.input, background: "#f9fafb" }} value="KGS" disabled tabIndex={-1} />
              </div>
            </div>
            <div style={styles.split}>
              <div style={styles.half}>
                <div style={styles.label}>VOLUME</div>
                <input style={styles.input} type="number" step="0.001"
                  value={formik.values.volume || ""}
                  onChange={e => handleFieldChange("volume", e.target.value)}
                  placeholder="0.000" />
              </div>
              <div style={styles.half}>
                <div style={styles.label}>UNIT</div>
                <input style={{ ...styles.input, background: "#f9fafb" }} value="CBM" disabled tabIndex={-1} />
              </div>
            </div>
            <div style={styles.split}>
              <div style={styles.half}>
                <div style={styles.label}>CHARGEABLE WEIGHT</div>
                <input style={styles.input} type="number" step="0.001"
                  value={formik.values.chargeable_weight || ""}
                  onChange={e => handleFieldChange("chargeable_weight", e.target.value)}
                  placeholder="0.000" />
              </div>
              <div style={styles.half}>
                <div style={styles.label}>UNIT</div>
                <input style={{ ...styles.input, background: "#f9fafb" }} value="KGS" disabled tabIndex={-1} />
              </div>
            </div>
            <div style={styles.field}>
              <div style={styles.label}>MARKS &amp; NOS</div>
              <textarea style={styles.textarea}
                value={toUpper(formik.values.marks_nos || "")}
                onChange={e => handleFieldChange("marks_nos", e.target.value.toUpperCase())}
                rows={4} />
              <div style={{ fontSize: 10, color: "#487", marginTop: 1 }}>{formik.values.marks_nos?.length || 0} CHARS</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ShipmentMainTab;
