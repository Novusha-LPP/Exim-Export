import React, { useState, useRef, useEffect } from "react";

function toUpper(val) {
  return (typeof val === "string" ? val : "")?.toUpperCase() || "";
}
function toUpperVal(e) {
  return e?.target?.value ? e.target.value.toUpperCase() : "";
}

const GeneralTab = ({ formik, directories }) => {
  const saveTimeoutRef = useRef(null);

  // Consignee logic
  const emptyConsignee = { consignee_name: "", consignee_address: "", consignee_country: "" };
  const [consignees, setConsignees] = useState([{ ...emptyConsignee }]);
  function handleConsigneeChange(idx, field, value) {
    const updated = [...consignees];
    updated[idx][field] = value;
    setConsignees(updated);
    formik.setFieldValue("consignees", updated);
  }
  function handleAddConsignee() {
    const updated = [...consignees, { ...emptyConsignee }];
    setConsignees(updated);
    formik.setFieldValue("consignees", updated);
  }
  useEffect(() => {
    if (formik.values.consignees && formik.values.consignees.length > 0) {
      setConsignees(formik.values.consignees);
    }
  }, [formik.values.consignees]);

  function handleFieldChange(field, value) {
    formik.setFieldValue(field, value);
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {}, 1000);
  }

  // Directory options
  const exporters = directories?.exporters || [];
  const banks = [];
  exporters.forEach(exp => {
    (exp.bankDetails || []).forEach(bank => {
      banks.push({
        ...bank,
        label: `${toUpper(bank.entityName)} ${toUpper(bank.branchLocation)}`,
      });
    });
  });

  function getVal(f) { return toUpper(formik.values[f] || ""); }

  // --- 1. Directory-aware autofill: live on any input
  function onExporterInput(e) {
    const val = toUpperVal(e);
    handleFieldChange("exporter_name", val);
    // UseEffect below will now take care of population as needed.
  }
  function handleRemoveConsignee(idx) {
  const updated = consignees.filter((_, i) => i !== idx);
  setConsignees(updated);
  formik.setFieldValue("consignees", updated);
}


  // 2. Bank population
  function onBankInput(e) {
    const val = toUpperVal(e);
    handleFieldChange("bank_dealer", val);
    const chosen = banks.find(bank => bank.label === val);
    if (chosen) {
      formik.setFieldValue("bank_name", toUpper(chosen.entityName));
      formik.setFieldValue("ac_number", toUpper(chosen.accountNumber));
      formik.setFieldValue("ad_code", toUpper(chosen.adCode));
    }
  }

  // 3. Watch exporter_name, do instant, one-time population when directory match occurs!
  useEffect(() => {
    const exporterName = getVal("exporter_name");
    const exp = exporters.find(ex => toUpper(ex.organization) === exporterName);
    if (exp) {
      // Only populate if (a) IE Code or GST/other fields on form do *not* match exporter directory (avoids infinite update loop)
      const shouldUpdate =
        getVal("ie_code_no") !== toUpper(exp.registrationDetails?.ieCode || "") ||
        getVal("gstin") !== toUpper(exp.registrationDetails?.gstinMainBranch || "") ||
        getVal("exporter_address") !== toUpper(`${exp.branchInfo?.[0]?.address || ""}${exp.branchInfo?.[0]?.postalCode ? `, ${exp.branchInfo?.[0]?.postalCode}` : ""}`);

      if (shouldUpdate) {
        const branch = exp.branchInfo?.[0] || {};
        const updates = {
          exporter_name: toUpper(exp.organization),
          exporter: toUpper(exp.organization),
          exporter_address: toUpper(`${branch.address || ""}${branch.postalCode ? `, ${branch.postalCode}` : ""}`),
          branch_sno: toUpper(branch.branchCode || "0"),
          branchSrNo: toUpper(branch.branchCode || "0"),
          state: toUpper(branch.state || ""),
          ie_code_no: toUpper(exp.registrationDetails?.ieCode || ""),
          ie_code: toUpper(exp.registrationDetails?.ieCode || ""),
          gstin: toUpper(exp.registrationDetails?.gstinMainBranch || ""),
          gstinMainBranch: toUpper(exp.registrationDetails?.gstinMainBranch || ""),
          regn_no: toUpper(exp.registrationDetails?.gstinMainBranch || ""),
          exporter_gstin: toUpper(exp.registrationDetails?.gstinMainBranch || "")
        };
        Object.entries(updates).forEach(([key, val]) => formik.setFieldValue(key, val));

        if (exp.bankDetails?.[0]) {
          const bank = exp.bankDetails[0];
          formik.setFieldValue("bank_dealer", `${toUpper(bank.entityName)} ${toUpper(bank.branchLocation)}`);
          formik.setFieldValue("bank_name", toUpper(bank.entityName));
          formik.setFieldValue("ac_number", toUpper(bank.accountNumber));
          formik.setFieldValue("bank_account_number", toUpper(bank.accountNumber));
          formik.setFieldValue("ad_code", toUpper(bank.adCode));
          formik.setFieldValue("adCode", toUpper(bank.adCode));
        }
      }
    }
    // eslint-disable-next-line
  }, [directories, formik.values.exporter_name]); // react on directory or user input/name change only

  // --- UI generators ---
  function field(label, name, opts = {}) {
    return (
      <div style={{ flex: opts.flex || 1 }}>
        <div style={{ fontSize: 11, color: "#666", marginBottom: 0 }}>{label}</div>
        <input
          name={name}
          value={getVal(name)}
          onChange={e => handleFieldChange(name, toUpperVal(e))}
          style={{
            border: "1px solid #cad3db", borderRadius: 4, fontSize: 13, padding: "2px 7px",
            height: 28, width: "100%", marginBottom: 3, boxSizing: "border-box"
          }}
        />
      </div>
    );
  }

  function exporterInputField() {
    return (
      <div>
        <div style={{ fontSize: 11, color: "#666" }}>Exporter</div>
        <input
          list="exporter_name-datalist"
          name="exporter_name"
          value={getVal("exporter_name")}
          onInput={onExporterInput}
          onChange={onExporterInput}
          style={{
            border: "1px solid #cad3db", borderRadius: 4, fontSize: 13,
            padding: "2px 7px", height: 28, width: "100%", marginBottom: 3
          }}
        />
        <datalist id="exporter_name-datalist">
          {exporters.map(exp =>
            <option key={exp.organization} value={toUpper(exp.organization || "")}>
              {toUpper(exp.organization || "")}
            </option>
          )}
        </datalist>
      </div>
    );
  }

  function bankInputField() {
    return (
      <div>
        <div style={{ fontSize: 11, color: "#666" }}>Bank/Dealer</div>
        <input
          list="bank-list"
          value={getVal("bank_dealer")}
          onInput={onBankInput}
          style={{
            border: "1px solid #cad3db", borderRadius: 4, fontSize: 13,
            padding: "2px 7px", height: 28, width: "100%", marginBottom: 3
          }}
        />
        <datalist id="bank-list">
          {banks.map(opt =>
            <option key={opt.label} value={opt.label}>{opt.label}</option>
          )}
        </datalist>
      </div>
    );
  }

  return (
    <div style={{ background: "#f7fafc", borderRadius: 8, padding: 15, border: "1.5px solid #e3e7ee", margin: "10px 0" }}>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        {/* Left: Exporter & Bank */}
        <div style={{
          flex: 1, minWidth: 295, background: "#fff", borderRadius: 6, border: "1px solid #e3e7ee", padding: 14, marginBottom: 8
        }}>
          <div style={{ fontWeight: 700, color: "#2366b3", marginBottom: 8 }}>Exporter & Bank</div>
          {exporterInputField()}
          {field("Address", "exporter_address")}
          <div style={{ display: "flex", gap: 10 }}>
            {field("Branch S/No", "branch_sno")}
            {field("State", "state")}
            {field("IE Code No", "ie_code_no")}
          </div>
          {field("GSTIN", "gstin")}
          <div style={{ fontWeight: 700, color: "#a37035", margin: "10px 0 8px 0" }}>Bank Details</div>
          {bankInputField()}
          <div style={{ display: "flex", gap: 10 }}>
            {field("A/C Number", "ac_number")}
            {field("AD Code", "ad_code")}
          </div>
        </div>
        {/* Right: Reference Details */}
        <div style={{
          flex: 1, minWidth: 295, background: "#fff", borderRadius: 6, border: "1px solid #e3e7ee", padding: 14, marginBottom: 8
        }}>
          <div style={{ fontWeight: 700, color: "#2366b3", marginBottom: 8 }}>Reference Details</div>
          {field("Exporter Ref No.", "exporter_ref_no")}
          <div>
            <div style={{ fontSize: 11, color: "#666" }}>Exporter Type</div>
            <select
              name="exporter_type"
              value={getVal("exporter_type")}
              onChange={e => handleFieldChange("exporter_type", toUpperVal(e))}
              style={{
                border: "1px solid #cad3db", borderRadius: 4, fontSize: 13,
                padding: "2px 7px", height: 28, width: "100%", marginBottom: 3
              }}
            >
              <option value="">--SELECT--</option>
              <option value="MANUFACTURER EXPORTER">MANUFACTURER EXPORTER</option>
              <option value="MERCHANT EXPORTER">MERCHANT EXPORTER</option>
              <option value="SERVICE EXPORTER">SERVICE EXPORTER</option>
            </select>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            {field("SB Number", "sb_no")}
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, color: "#666" }}>SB Date</div>
              <input
                type="datetime-local"
                name="sb_date"
                value={formik.values["sb_date"] || ""}
                onChange={e => handleFieldChange("sb_date", e.target.value)}
                style={{
                  border: "1px solid #cad3db", borderRadius: 4, fontSize: 13,
                  padding: "2px 7px", height: 28, width: "100%", marginBottom: 3
                }}
              />
            </div>
          </div>
          {field("RBI App. No & Date", "rbi_app_no")}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <label style={{ fontSize: 11, color: "#666", marginBottom: 0 }}>
              <input
                type="checkbox"
                checked={formik.values["gr_waived"] || false}
                onChange={e => handleFieldChange("gr_waived", e.target.checked)}
                style={{ marginRight: 6 }}
              />GR Waived
            </label>
            {field("GR No", "gr_no")}
          </div>
          {field("RBI Waiver No", "rbi_waiver_no")}
        </div>
      </div>
      {/* Consignee */}
      <div style={{
        background: "#fff",
        borderRadius: 6,
        border: "1px solid #dfe6ee",
        padding: "10px 14px",
        marginTop: 10
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 5 }}>
          <div style={{ fontWeight: 600, fontSize: 14, color: "#14492c" }}>Consignee Details</div>
          <button
            onClick={handleAddConsignee}
            style={{
              background: "#e7f8e7", color: "#0a7921", border: "1px solid #8ddd8d", borderRadius: 4,
              padding: "2px 13px", fontWeight: 500, fontSize: 13, cursor: "pointer"
            }}
            type="button"
          >+ New</button>
        </div>
        {consignees.map((consignee, idx) => (
          <div key={idx} style={{ display: "flex", gap: 10, marginBottom: 5 }}>
            <input
              style={{ border: "1px solid #cad3db", borderRadius: 4, fontSize: 13, padding: "2px 7px", flex: 1 }}
              value={toUpper(consignee.consignee_name)}
              placeholder="Consignee Name"
              onChange={e => handleConsigneeChange(idx, "consignee_name", toUpperVal(e))}
            />
            <input
              style={{ border: "1px solid #cad3db", borderRadius: 4, fontSize: 13, padding: "2px 7px", flex: 2 }}
              value={toUpper(consignee.consignee_address)}
              placeholder="Consignee Address"
              onChange={e => handleConsigneeChange(idx, "consignee_address", toUpperVal(e))}
            />
            <input
              style={{ border: "1px solid #cad3db", borderRadius: 4, fontSize: 13, padding: "2px 7px", flex: 1 }}
              value={toUpper(consignee.consignee_country)}
              placeholder="Consignee Country"
              onChange={e => handleConsigneeChange(idx, "consignee_country", toUpperVal(e))}
            />
              <button
      type="button"
      onClick={() => handleRemoveConsignee(idx)}
      style={{
        background: "#ffeaea",
        border: "1px solid #ff5555",
        color: "#c40000",
        borderRadius: "4px",
        cursor: "pointer",
        fontWeight: 700,
        fontSize: 18,
        width: 28,
        height: 28,
        padding: 0,
        marginLeft: 5
      }}
      title="Remove consignee"
    >×</button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default GeneralTab;
