import React, { useState, useEffect, useContext, useRef } from "react";
import { UserContext } from "../../../contexts/UserContext";
import DateInput from "../../common/DateInput.js";
import AutocompleteSelect from "../../common/AutocompleteSelect.js";
import { Menu, MenuItem } from "@mui/material";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import ExportChecklistGenerator from "./StandardDocuments/ExportChecklistGenerator";
import ConsignmentNoteGenerator from "./StandardDocuments/ConsignmentNoteGenerator";
import FileCoverGenerator from "./StandardDocuments/FileCoverGenerator";
import ForwardingNoteTharGenerator from "./StandardDocuments/ForwardingNoteTharGenerator";
import AnnexureCGenerator from "./StandardDocuments/AnnexureCGenerator";

// Helper function
const toUpper = (str) => (str || "").toUpperCase();

// Styles object
const styles = {
  field: {
    flex: "1 1 120px",
    minWidth: 110,
    position: "relative",
  },
  label: {
    fontSize: 11,
    color: "#888",
    marginBottom: 2,
  },
  acWrap: {
    position: "relative",
  },
  input: {
    width: "100%",
    padding: "3px 24px 3px 6px",
    border: "1px solid #d6dae2",
    borderRadius: 4,
    fontSize: 13,
    background: "#fff",
    boxSizing: "border-box",
  },
  acIcon: {
    position: "absolute",
    right: 6,
    top: "50%",
    transform: "translateY(-50%)",
    fontSize: 10,
    color: "#888",
    pointerEvents: "none",
  },
  acMenu: {
    position: "absolute",
    top: "calc(100% + 2px)",
    left: 0,
    right: 0,
    maxHeight: 240,
    overflowY: "auto",
    background: "#fff",
    border: "1px solid #d6dae2",
    borderRadius: 4,
    boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
    zIndex: 9999,
  },
  acItem: (active) => ({
    padding: "8px 10px",
    cursor: "pointer",
    fontSize: 12,
    fontWeight: 500,
    background: active ? "#e3f2fd" : "#fff",
    color: "#111827",
    borderBottom: "1px solid #f0f0f0",
  }),
};

// Hook for Gateway Port Dropdown
function useGatewayPortDropdown(fieldName, formik) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(formik.values[fieldName] || "");
  const [opts, setOpts] = useState([]);
  const [active, setActive] = useState(-1);
  const [isTyping, setIsTyping] = useState(false);
  const wrapperRef = useRef();
  const apiBase = import.meta.env.VITE_API_STRING;
  const keepOpen = useRef(false);

  useEffect(() => {
    setQuery(formik.values[fieldName] || "");
  }, [formik.values[fieldName], fieldName]);

  useEffect(() => {
    if (!open) {
      setOpts([]);
      return;
    }

    // When dropdown opens, fetch all options (empty search)
    // Only use query for search if user is actively typing
    const searchVal = isTyping ? (query || "").trim() : "";
    const url = `${apiBase}/gateway-ports/?page=1&status=&type=&search=${encodeURIComponent(
      searchVal
    )}`;

    const t = setTimeout(async () => {
      try {
        const res = await fetch(url);
        const data = await res.json();
        setOpts(
          Array.isArray(data?.data)
            ? data.data
            : Array.isArray(data)
            ? data
            : []
        );
      } catch {
        setOpts([]);
      }
    }, 220);

    return () => clearTimeout(t);
  }, [open, query, apiBase, isTyping]);

  useEffect(() => {
    function close(e) {
      if (
        !keepOpen.current &&
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target)
      ) {
        setOpen(false);
        setIsTyping(false);
      }
    }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  function select(i) {
    const item = opts[i];
    if (!item) return;

    const value = `${(item.unece_code || "").toUpperCase()} - ${(
      item.name || ""
    ).toUpperCase()}`.trim();
    setQuery(value);
    formik.setFieldValue(fieldName, value);
    setOpen(false);
    setActive(-1);
    setIsTyping(false);
  }

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
      const v = val.toUpperCase();
      setQuery(v);
      formik.setFieldValue(fieldName, v);
      setOpen(true);
      setIsTyping(true);
    },
    select,
    onInputFocus: () => {
      setOpen(true);
      setActive(-1);
      keepOpen.current = true;
      // Don't set isTyping here - we want to show all options on focus
    },
    onInputBlur: () => {
      setTimeout(() => {
        keepOpen.current = false;
      }, 100);
    },
  };
}

// Gateway Port Dropdown Component
function GatewayPortDropdown({
  fieldName,
  formik,
  placeholder = "ENTER GATEWAY PORT",
}) {
  const d = useGatewayPortDropdown(fieldName, formik);

  const filtered = d.opts.filter((p) => {
    const code = p.unece_code || "";
    const name = p.name || "";
    const haystack = `${code} ${name}`.toUpperCase();
    const needle = (d.query || "").toUpperCase();
    return !needle || haystack.includes(needle);
  });

  return (
    <div style={{ position: "relative" }} ref={d.wrapperRef}>
      <div style={styles.acWrap}>
        <input
          style={styles.input}
          placeholder={placeholder}
          autoComplete="off"
          value={toUpper(d.query)}
          onChange={(e) => d.handle(e.target.value)}
          onFocus={d.onInputFocus}
          onBlur={d.onInputBlur}
          onKeyDown={(e) => {
            if (!d.open) return;
            if (e.key === "ArrowDown")
              d.setActive((a) =>
                Math.min(filtered.length - 1, a < 0 ? 0 : a + 1)
              );
            else if (e.key === "ArrowUp")
              d.setActive((a) => Math.max(0, a - 1));
            else if (e.key === "Enter" && d.active >= 0) {
              e.preventDefault();
              d.select(d.active);
            } else if (e.key === "Escape") d.setOpen(false);
          }}
        />
        <span style={styles.acIcon}>▼</span>
        {d.open && filtered.length > 0 && (
          <div style={styles.acMenu}>
            {filtered.map((port, i) => (
              <div
                key={port._id || port.unece_code || port.name || i}
                style={styles.acItem(d.active === i)}
                onMouseDown={() => d.select(i)}
                onMouseEnter={() => d.setActive(i)}
              >
                {(port.unece_code || "").toUpperCase()} -{" "}
                {(port.name || "").toUpperCase()}
                {port.port_type && (
                  <span
                    style={{ marginLeft: 6, color: "#667", fontWeight: 400 }}
                  >
                    ({port.port_type.toUpperCase()})
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

const LogisysEditableHeader = ({
  formik,
  onUpdate,
  directories,
  exportJobsUsers = [],
}) => {
  const [snackbar, setSnackbar] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const { user } = useContext(UserContext);
  const isNewJob = !formik.values.job_no;

  const handleCopyText = (text) => {
    navigator.clipboard.writeText(text || "");
    setSnackbar(true);
    setTimeout(() => setSnackbar(false), 2000);
  };

  const shipperOpts = (directories?.exporters || []).map((exp) => ({
    label: `${exp.organization} (${exp.registrationDetails?.ieCode || ""})`,
    value: exp.organization,
  }));

  return (
    <div
      style={{
        marginBottom: 20,
        background: "linear-gradient(90deg, #f7fafc 85%, #e3f2fd 100%)",
        border: "1px solid #e3e7ee",
        borderRadius: 8,
        boxShadow: "0 2px 6px 0 rgba(60,72,100,0.08)",
        padding: "17px 23px",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          marginBottom: 2,
        }}
      ></div>

      {/* ROWS */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "10px 18px",
          alignItems: "flex-end",
        }}
      >
        {/* Job Number */}
        <div style={{ flex: "1 1 210px", minWidth: 120 }}>
          <div style={{ fontSize: 11, color: "#888" }}>Job Number</div>
          {isNewJob ? (
            <input
              style={{
                width: "97%",
                padding: "3px 6px",
                border: "1px solid #d6dae2",
                borderRadius: 4,
                fontSize: 12,
                background: "#fff",
              }}
              name="job_no"
              value={formik.values.job_no}
              onChange={formik.handleChange}
              placeholder="Auto-generated if empty"
            />
          ) : (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                background: "#eef4fa",
                border: "1px solid #e0e0e0",
                borderRadius: 4,
                padding: "2px 9px",
                fontSize: 12,
                color: "#000",
              }}
            >
              <span>{formik.values.job_no}</span>
              <button
                title="Copy"
                onClick={() => handleCopyText(formik.values.job_no)}
                style={{
                  background: "none",
                  border: "none",
                  marginLeft: 8,
                  cursor: "pointer",
                  fontSize: 15,
                  color: "#666",
                }}
              >
                📋
              </button>
            </div>
          )}
        </div>

        {/* Job Date */}
        <div style={{ flex: "1 1 110px", minWidth: 100 }}>
          <div style={{ fontSize: 11, color: "#888" }}>Job Date</div>
          <DateInput
            name="job_date"
            value={formik.values.job_date}
            onChange={formik.handleChange}
            style={{
              width: "98%",
              padding: "3px 6px",
              border: "1px solid #d6dae2",
              borderRadius: 4,
              background: "#fff",
              fontSize: 13,
            }}
          />
        </div>

        {/* SB No */}
        <div style={{ flex: "1 1 90px", minWidth: 80 }}>
          <div style={{ fontSize: 11, color: "#888" }}>SB No</div>
          <input
            name="sb_no"
            value={formik.values.sb_no}
            onChange={formik.handleChange}
            style={{
              width: "97%",
              padding: "3px 6px",
              border: "1px solid #d6dae2",
              borderRadius: 4,
              fontSize: 13,
              background: "#fff",
            }}
          />
        </div>

        {/* SB Date */}
        <div style={{ flex: "1 1 150px", minWidth: 120 }}>
          <div style={{ fontSize: 11, color: "#888" }}>SB Date</div>
          <DateInput
            name="sb_date"
            value={formik.values.sb_date}
            onChange={formik.handleChange}
            style={{
              width: "97%",
              padding: "3px 6px",
              border: "1px solid #d6dae2",
              borderRadius: 4,
              fontSize: 13,
              background: "#fff",
            }}
          />
        </div>

        {/* Job Owner */}
        <div style={{ flex: "1 1 150px", minWidth: 90 }}>
          <div style={{ fontSize: 11, color: "#888" }}>Job Owner</div>
          <AutocompleteSelect
            name="job_owner"
            value={formik.values.job_owner || ""}
            options={[
              { value: "", label: "Select Job Owner" },
              ...(exportJobsUsers?.map((user) => ({
                value: user.username,
                label: user.fullName,
              })) || []),
            ]}
            onChange={formik.handleChange}
            placeholder="Select Job Owner"
          />
        </div>

        {/* Shipper */}
        <div style={{ flex: "1 1 170px", minWidth: 130 }}>
          <div style={{ fontSize: 11, color: "#888" }}>Shipper</div>
          <input
            name="shipper"
            list="shipper-list"
            value={formik.values.exporter}
            onChange={formik.handleChange}
            style={{
              width: "98%",
              padding: "3px 6px",
              border: "1px solid #d6dae2",
              borderRadius: 4,
              fontSize: 13,
              background: "#fff",
            }}
          />
          <datalist id="shipper-list">
            {shipperOpts.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </datalist>
        </div>

        {/* Transport Mode */}
        <div style={{ flex: "1 1 100px", minWidth: 80 }}>
          <div style={{ fontSize: 11, color: "#888" }}>Transport Mode</div>
          <AutocompleteSelect
            name="transportMode"
            value={formik.values.transportMode}
            options={[
              { value: "Sea", label: "Sea" },
              { value: "Air", label: "Air" },
            ]}
            onChange={formik.handleChange}
            placeholder="Select Mode"
          />
        </div>

        {/* Custom House - Now with Gateway Port Dropdown */}
        <div style={{ flex: "1 1 120px", minWidth: 110 }}>
          <div style={{ fontSize: 11, color: "#888" }}>Custom House</div>
          <GatewayPortDropdown
            fieldName="custom_house"
            formik={formik}
            placeholder="Select Custom House"
          />
        </div>

        {/* Consignment Type */}
        <div style={{ flex: "1 1 120px", minWidth: 100 }}>
          <div style={{ fontSize: 11, color: "#888" }}>Consignment Type</div>
          <AutocompleteSelect
            name="consignmentType"
            value={formik.values.consignmentType}
            options={[
              { value: "FCL", label: "FCL" },
              { value: "LCL", label: "LCL" },
              { value: "AIR", label: "AIR" },
              { value: "Break Bulk", label: "Break Bulk" },
            ]}
            onChange={formik.handleChange}
            placeholder="Select Type"
          />
        </div>

        {/* SB Type */}
        <div style={{ flex: "1 1 120px", minWidth: 100 }}>
          <div style={{ fontSize: 11, color: "#888" }}>SB Type</div>
          <AutocompleteSelect
            name="sb_type"
            value={formik.values.sb_type}
            options={[
              { value: "", label: "All" },
              { value: "White - Free/DEEC", label: "White - Free/DEEC" },
              { value: "Green - Drawback", label: "Green - Drawback" },
              { value: "Green - RODTEP", label: "Green - RODTEP" },
              { value: "Blue - DEPB", label: "Blue - DEPB" },
              { value: "Yellow - Dutiable", label: "Yellow - Dutiable" },
              { value: "Pink - ExBond", label: "Pink - ExBond" },
              { value: "SEZ - Regular", label: "SEZ - Regular" },
              { value: "SEZ - ExBond", label: "SEZ - ExBond" },
              {
                value: "SEZ - DTA Procurement",
                label: "SEZ - DTA Procurement",
              },
              { value: "Red", label: "Red" },
            ]}
            onChange={formik.handleChange}
            placeholder="Select SB Type"
          />
        </div>

        {/* Standard Documents Button */}
        <div
          style={{
            flex: "1 1 105px",
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "flex-end",
            minWidth: 25,
          }}
        >
          <button
            style={{
              background: "#fff",
              border: "1.2px solid #1976d2",
              color: "#1976d2",
              marginLeft: 7,
              padding: "3px 12px",
              borderRadius: 4,
              fontWeight: 500,
              fontSize: 12,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
            }}
            type="button"
            onClick={(e) => setAnchorEl(e.currentTarget)}
          >
            Standard Documents
            <ArrowDropDownIcon sx={{ fontSize: 16, ml: 0.5 }} />
          </button>
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={() => setAnchorEl(null)}
          >
            <ExportChecklistGenerator
              jobNo={formik.values.job_no}
              renderAsIcon={false}
            >
              <MenuItem
                disableRipple
                onClick={() => setAnchorEl(null)}
                sx={{ fontSize: 13, minWidth: 150 }}
              >
                Checklist
              </MenuItem>
            </ExportChecklistGenerator>

            <FileCoverGenerator jobNo={formik.values.job_no}>
              <MenuItem
                disableRipple
                onClick={() => setAnchorEl(null)}
                sx={{ fontSize: 13, minWidth: 150 }}
              >
                File Cover
              </MenuItem>
            </FileCoverGenerator>

            <ConsignmentNoteGenerator jobNo={formik.values.job_no}>
              <MenuItem
                disableRipple
                onClick={() => setAnchorEl(null)}
                sx={{ fontSize: 13, minWidth: 150 }}
              >
                Consignment Note
              </MenuItem>
            </ConsignmentNoteGenerator>

            <ForwardingNoteTharGenerator jobNo={formik.values.job_no}>
              <MenuItem
                disableRipple
                onClick={() => setAnchorEl(null)}
                sx={{ fontSize: 13, minWidth: 150 }}
              >
                Forwarding Note (THAR)
              </MenuItem>
            </ForwardingNoteTharGenerator>

            <AnnexureCGenerator jobNo={formik.values.job_no}>
              <MenuItem
                disableRipple
                onClick={() => setAnchorEl(null)}
                sx={{ fontSize: 13, minWidth: 150 }}
              >
                Annexure C
              </MenuItem>
            </AnnexureCGenerator>
          </Menu>
        </div>
      </div>

      {snackbar && (
        <div
          style={{
            background: "#1976d2",
            color: "#fff",
            padding: "3px 16px",
            fontSize: 13,
            position: "fixed",
            right: 20,
            top: 76,
            borderRadius: 4,
          }}
        >
          Copied to clipboard
        </div>
      )}
    </div>
  );
};

export default LogisysEditableHeader;
