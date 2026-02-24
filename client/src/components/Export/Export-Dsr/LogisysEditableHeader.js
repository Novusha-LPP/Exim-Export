import React, { useState, useEffect, useContext, useRef } from "react";
import { createPortal } from "react-dom";
import { UserContext } from "../../../contexts/UserContext";
import DateInput from "../../common/DateInput.js";
import AutocompleteSelect from "../../common/AutocompleteSelect.js";
import CustomHouseDropdown from "../../common/CustomHouseDropdown.js";
import { Menu, MenuItem, IconButton, Tooltip } from "@mui/material";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import LockIcon from "@mui/icons-material/Lock";
import LockOpenIcon from "@mui/icons-material/LockOpen";
import ExportChecklistGenerator from "./StandardDocuments/ExportChecklistGenerator";
import ConsignmentNoteGenerator from "./StandardDocuments/ConsignmentNoteGenerator";
import FileCoverGenerator from "./StandardDocuments/FileCoverGenerator";
import ForwardingNoteTharGenerator from "./StandardDocuments/ForwardingNoteTharGenerator";
import AnnexureCGenerator from "./StandardDocuments/AnnexureCGenerator";
import ConcorForwardingNoteGenerator from "./StandardDocuments/ConcorForwardingNoteGenerator.js";
import VGMAuthorizationGenerator from "./StandardDocuments/VGMAuthorizationGenerator";
import FreightCertificateGenerator from "./StandardDocuments/FreightCertificateGenerator";
import BillOfLadingGenerator from "./StandardDocuments/BillOfLadingGenerator";

// Helper function
const toUpper = (str) => (str || "").toUpperCase();

// Compact styles for single-row layout
const styles = {
  field: {
    flex: "1 1 80px",
    minWidth: 70,
    position: "relative",
  },
  label: {
    fontSize: 10,
    color: "#888",
    marginBottom: 1,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  acWrap: {
    position: "relative",
  },
  input: {
    width: "100%",
    padding: "2px 18px 2px 4px",
    border: "1px solid #d6dae2",
    borderRadius: 3,
    fontSize: 11,
    background: "#fff",
    boxSizing: "border-box",
    height: 24,
  },
  inputDisabled: {
    width: "100%",
    padding: "2px 4px",
    border: "1px solid #e0e0e0",
    borderRadius: 3,
    fontSize: 11,
    background: "#f5f5f5",
    boxSizing: "border-box",
    height: 24,
    color: "#666",
  },
  acIcon: {
    position: "absolute",
    right: 4,
    top: "50%",
    transform: "translateY(-50%)",
    fontSize: 8,
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
    zIndex: 1000000,
  },
  acItem: (active) => ({
    padding: "4px 8px",
    cursor: "pointer",
    fontSize: 11,
    fontWeight: 500,
    background: active ? "#e3f2fd" : "#fff",
    color: "#111827",
    borderBottom: "1px solid #f0f0f0",
  }),
};

// Hook for Gateway Port Dropdown
function useGatewayPortDropdown(fieldName, formik, disabled) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(formik.values[fieldName] || "");
  const [opts, setOpts] = useState([]);
  const [active, setActive] = useState(-1);
  const [isTyping, setIsTyping] = useState(false);
  const wrapperRef = useRef();
  const menuRef = useRef();
  const apiBase = import.meta.env.VITE_API_STRING;
  const keepOpen = useRef(false);

  useEffect(() => {
    setQuery(formik.values[fieldName] || "");
  }, [formik.values[fieldName], fieldName]);

  useEffect(() => {
    if (!open || disabled) {
      setOpts([]);
      return;
    }

    const searchVal = isTyping ? (query || "").trim() : "";
    const url = `${apiBase}/gateway-ports/?page=1&status=&type=&search=${encodeURIComponent(
      searchVal,
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
              : [],
        );
      } catch {
        setOpts([]);
      }
    }, 220);

    return () => clearTimeout(t);
  }, [open, query, apiBase, isTyping, disabled]);

  useEffect(() => {
    function close(e) {
      if (
        !keepOpen.current &&
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target) &&
        (!menuRef.current || !menuRef.current.contains(e.target))
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
    menuRef,
    open,
    setOpen,
    query,
    setQuery,
    opts,
    active,
    setActive,
    handle: (val) => {
      if (disabled) return;
      const v = val.toUpperCase();
      setQuery(v);
      formik.setFieldValue(fieldName, v);
      setOpen(true);
      setIsTyping(true);
    },
    select,
    onInputFocus: () => {
      if (disabled) return;
      setOpen(true);
      setActive(-1);
      keepOpen.current = true;
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
  placeholder = "Select",
  disabled = false,
}) {
  const d = useGatewayPortDropdown(fieldName, formik, disabled);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });

  const updateCoords = () => {
    if (d.wrapperRef.current) {
      const rect = d.wrapperRef.current.getBoundingClientRect();
      setCoords({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width,
      });
    }
  };

  useEffect(() => {
    if (d.open) {
      updateCoords();
      window.addEventListener("scroll", updateCoords, true);
      window.addEventListener("resize", updateCoords);
    }
    return () => {
      window.removeEventListener("scroll", updateCoords, true);
      window.removeEventListener("resize", updateCoords);
    };
  }, [d.open]);

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
          style={disabled ? styles.inputDisabled : styles.input}
          placeholder={placeholder}
          autoComplete="off"
          value={toUpper(d.query)}
          onChange={(e) => d.handle(e.target.value)}
          onFocus={d.onInputFocus}
          onBlur={d.onInputBlur}
          disabled={disabled}
          onKeyDown={(e) => {
            if (disabled) return;
            if (e.key === "Tab") {
              if (d.open) {
                if (d.active >= 0 && filtered[d.active]) {
                  d.select(d.active);
                } else if (filtered.length === 1) {
                  d.select(0);
                } else {
                  d.setOpen(false);
                }
              }
              const trimmed = d.query.trim();
              if (trimmed !== d.query) {
                const upper = toUpper(trimmed);
                d.setQuery(upper);
                formik.setFieldValue(fieldName, upper);
              }
              return;
            }

            if (!d.open) return;
            if (e.key === "ArrowDown")
              d.setActive((a) =>
                Math.min(filtered.length - 1, a < 0 ? 0 : a + 1),
              );
            else if (e.key === "ArrowUp")
              d.setActive((a) => Math.max(0, a - 1));
            else if (e.key === "Enter" && d.active >= 0) {
              e.preventDefault();
              d.select(d.active);
            } else if (e.key === "Escape") d.setOpen(false);
          }}
        />
        {!disabled && <span style={styles.acIcon}>▼</span>}
        {d.open &&
          !disabled &&
          filtered.length > 0 &&
          createPortal(
            <div
              ref={d.menuRef}
              style={{
                ...styles.acMenu,
                position: "absolute",
                top: coords.top + 2,
                left: coords.left,
                width: Math.max(coords.width, 200),
                zIndex: 1000000,
              }}
            >
              {filtered.map((port, i) => (
                <div
                  key={port._id || port.unece_code || port.name || i}
                  style={styles.acItem(d.active === i)}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    d.select(i);
                  }}
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
            </div>,
            document.body,
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
  // Lock state - default to locked (not editable)
  const [isEditable, setIsEditable] = useState(false);

  useEffect(() => {
    const isAir = formik.values.consignmentType === "AIR";
    const mode = isAir ? "AIR" : "SEA";
    if (toUpper(formik.values.transportMode) !== mode) {
      formik.setFieldValue("transportMode", mode);
    }
    // Auto-select Ahmedabad Air Port for AIR consignment
    if (isAir) {
      const ahmedabadPort = "INAMD4 - AHMEDABAD AIR PORT";
      if (toUpper(formik.values.port_of_loading || "") !== ahmedabadPort) {
        formik.setFieldValue("port_of_loading", ahmedabadPort);
      }
    }
  }, [formik.values.consignmentType, formik.values.transportMode, formik.setFieldValue]);

  useEffect(() => {
    const stuffed = toUpper(formik.values.goods_stuffed_at || "");
    const type = toUpper(formik.values.consignmentType || "");

    if (stuffed === "FACTORY" && type !== "FCL" && type !== "") {
      formik.setFieldValue("consignmentType", "FCL");
    }

    if (type === "LCL" && stuffed !== "DOCK") {
      formik.setFieldValue("goods_stuffed_at", "DOCK");
    }
  }, [formik.values.goods_stuffed_at, formik.values.consignmentType, formik.setFieldValue]);

  const [snackbar, setSnackbar] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const { user } = useContext(UserContext);
  const isNewJob = !formik.values.job_no;

  const handleCopyText = (text) => {
    navigator.clipboard.writeText(text || "");
    setSnackbar(true);
    setTimeout(() => setSnackbar(false), 2000);
  };

  const toggleLock = () => {
    setIsEditable(!isEditable);
  };

  const shipperOpts = (directories?.exporters || []).map((exp) => ({
    label: `${exp.organization} (${exp.registrationDetails?.ieCode || ""})`,
    value: exp.organization,
  }));

  const isAirType = toUpper(formik.values.consignmentType) === "AIR";

  return (
    <div
      style={{
        marginBottom: 8,
        background: "linear-gradient(90deg, #f7fafc 85%, #e3f2fd 100%)",
        borderBottom: "1px solid #e0e0e0",
        border: "1px solid #e3e7ee",
        borderRadius: 10,

        boxShadow: "0 1px 4px 0 rgba(60,72,100,0.06)",
        // boxShadow: "0 1px 3px 0 rgba(0,0,0,0.05)",
        padding: "12px 16px",
        position: "sticky",
        top: 0,
        zIndex: 10, // Reduced from 99999 to be below MUI Overlays (1300)
        display: "flex",
        alignItems: "center"
      }}
    >
      {/* Responsive Row Container */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          gap: 12, // Increased gap
          flexWrap: "wrap",
          width: "100%",
          rowGap: 12,
        }}
      >
        {/* Lock/Unlock Button */}
        <div style={{ flex: "0 0 auto", display: "flex", alignItems: "center" }}>
          <Tooltip title={isEditable ? "Lock Editing" : "Unlock to Edit"}>
            <IconButton
              onClick={toggleLock}
              size="small"
              sx={{
                padding: "4px",
                backgroundColor: isEditable ? "#e8f5e9" : "#ffebee",
                border: isEditable ? "1px solid #4caf50" : "1px solid #f44336",
                "&:hover": {
                  backgroundColor: isEditable ? "#c8e6c9" : "#ffcdd2",
                },
              }}
            >
              {isEditable ? (
                <LockOpenIcon sx={{ fontSize: 16, color: "#4caf50" }} />
              ) : (
                <LockIcon sx={{ fontSize: 16, color: "#f44336" }} />
              )}
            </IconButton>
          </Tooltip>
        </div>

        {/* Job Number */}
        <div style={{ flex: "0 0 auto", minWidth: 70 }}>
          <div style={styles.label}>Job No</div>
          {isNewJob ? (
            <input
              style={!isEditable ? styles.inputDisabled : styles.input}
              name="job_no"
              value={formik.values.job_no}
              onChange={formik.handleChange}
              placeholder="Auto"
              disabled={!isEditable}
            />
          ) : (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                background: "#eef4fa",
                border: "1px solid #e0e0e0",
                borderRadius: 3,
                padding: "1px 4px",
                fontSize: 11,
                color: "#000",
                height: 22,
                whiteSpace: "nowrap",
              }}
            >
              <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
                {formik.values.job_no}
              </span>
              <button
                title="Copy"
                onClick={() => handleCopyText(formik.values.job_no)}
                style={{
                  background: "none",
                  border: "none",
                  marginLeft: 4,
                  cursor: "pointer",
                  fontSize: 10,
                  color: "#666",
                  padding: 0,
                }}
              >
                📋
              </button>
            </div>
          )}
        </div>

        {/* Job Date */}
        <div style={{ flex: "0 0 auto", minWidth: 70 }}>
          <div style={styles.label}>Job Date</div>
          <DateInput
            name="job_date"
            value={formik.values.job_date}
            onChange={formik.handleChange}
            disabled={!isEditable}
            style={!isEditable ? styles.inputDisabled : {
              ...styles.input,
              width: "100%",
            }}
          />
        </div>

        {/* SB No */}
        <div style={{ flex: "0 0 auto", minWidth: 50 }}>
          <div style={styles.label}>SB No</div>
          <input
            name="sb_no"
            value={formik.values.sb_no}
            onChange={formik.handleChange}
            disabled={!isEditable}
            style={!isEditable ? styles.inputDisabled : styles.input}
          />
        </div>

        {/* SB Date */}
        <div style={{ flex: "0 0 auto", minWidth: 70 }}>
          <div style={styles.label}>SB Date</div>
          <DateInput
            name="sb_date"
            value={formik.values.sb_date}
            onChange={formik.handleChange}
            disabled={!isEditable}
            style={!isEditable ? styles.inputDisabled : {
              ...styles.input,
              width: "100%",
            }}
          />
        </div>

        {/* Job Owner */}
        <div style={{ flex: "1 1 auto", minWidth: 70, maxWidth: 100 }}>
          <div style={styles.label}>Job Owner</div>
          <AutocompleteSelect
            name="job_owner"
            value={formik.values.job_owner || ""}
            options={[
              { value: "", label: "Select" },
              ...(exportJobsUsers?.map((user) => ({
                value: user.username,
                label: user.fullName,
              })) || []),
            ]}
            onChange={formik.handleChange}
            placeholder="Select"
            disabled={!isEditable}
          />
        </div>

        {/* Shipper */}
        <div style={{ flex: "1 1 auto", minWidth: 80, maxWidth: 130 }}>
          <div style={styles.label}>Shipper</div>
          <input
            name="shipper"
            list="shipper-list"
            value={formik.values.exporter}
            onChange={formik.handleChange}
            disabled={!isEditable}
            style={!isEditable ? styles.inputDisabled : styles.input}
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
        <div style={{ flex: "0 0 auto", minWidth: 40 }}>
          <div style={styles.label}>Mode</div>
          <input
            style={{ ...styles.inputDisabled, width: 50 }}
            value={toUpper(formik.values.transportMode)}
            readOnly
          />
        </div>

        {/* Custom House */}
        <div style={{ flex: "1 1 auto", minWidth: 70, maxWidth: 130 }}>
          <div style={styles.label}>Custom House</div>
          <CustomHouseDropdown
            name="custom_house"
            value={formik.values.custom_house || ""}
            onChange={formik.handleChange}
            placeholder="Select"
            disabled={!isEditable}
            branchCode={formik.values.branch_code || ""}
          />
        </div>

        {/* Loading Port - Only show for non-AIR */}
        {!isAirType && (
          <div style={{ flex: "1 1 auto", minWidth: 70, maxWidth: 110 }}>
            <div style={styles.label}>Port Of Loading</div>
            <select
              name="port_of_loading"
              value={formik.values.port_of_loading || ""}
              onChange={(e) => formik.setFieldValue("port_of_loading", e.target.value)}
              disabled={!isEditable}
              style={!isEditable ? styles.inputDisabled : { ...styles.input, cursor: "pointer" }}
            >
              <option value="">Select</option>
              <option value="INMUN1 - MUNDRA">Mundra (INMUN1)</option>
              <option value="INIXY1 - KANDLA">Kandla (INIXY1)</option>
              <option value="INPAV1 - PIPAVAV">Pipavav (INPAV1)</option>
              <option value="INHZA1 - HAZIRA">Hazira (INHZA1)</option>
              <option value="INNSA1 - NHAVA SHEVA">Nhava Sheva (INNSA1)</option>
              <option value="INAMD4 - AHMEDABAD AIR PORT">Ahmedabad Air Port</option>
            </select>
          </div>
        )}

        {/* Consignment Type */}
        <div style={{ flex: "0 0 auto", minWidth: 60 }}>
          <div style={styles.label}>Type</div>
          <AutocompleteSelect
            name="consignmentType"
            value={formik.values.consignmentType}
            options={[
              { value: "", label: "-Select-" },
              { value: "FCL", label: "FCL" },
              { value: "LCL", label: "LCL" },
              { value: "AIR", label: "AIR" },
              { value: "Break Bulk", label: "Break Bulk" },
            ]}
            onChange={formik.handleChange}
            placeholder="Type"
            disabled={!isEditable}
          />
        </div>

        {/* Goods Stuffed At */}
        <div style={{ flex: "0 0 auto", minWidth: 60 }}>
          <div style={styles.label}>Stuffed At</div>
          <AutocompleteSelect
            name="goods_stuffed_at"
            value={formik.values.goods_stuffed_at || ""}
            options={[
              { value: "", label: "Select" },
              toUpper(formik.values.consignmentType) !== "LCL" && {
                value: "FACTORY",
                label: "FACTORY",
              },
              { value: "DOCK", label: "DOCK" },
            ].filter(Boolean)}
            onChange={formik.handleChange}
            placeholder="Select"
            disabled={!isEditable}
          />
        </div>

        {/* Documents Button */}
        <div style={{ flex: "0 0 auto" }}>
          <button
            style={{
              background: "#fff",
              border: "1px solid #1976d2",
              color: "#1976d2",
              padding: "3px 8px",
              borderRadius: 3,
              fontWeight: 500,
              fontSize: 11,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              height: 24,
              whiteSpace: "nowrap",
            }}
            type="button"
            onClick={(e) => setAnchorEl(e.currentTarget)}
          >
            Docs
            <ArrowDropDownIcon sx={{ fontSize: 14, ml: 0.3 }} />
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
                sx={{ fontSize: 12, minWidth: 140 }}
              >
                Checklist
              </MenuItem>
            </ExportChecklistGenerator>

            <FileCoverGenerator jobNo={formik.values.job_no}>
              <MenuItem
                disableRipple
                onClick={() => setAnchorEl(null)}
                sx={{ fontSize: 12, minWidth: 140 }}
              >
                File Cover
              </MenuItem>
            </FileCoverGenerator>

            <ConsignmentNoteGenerator jobNo={formik.values.job_no}>
              <MenuItem
                disableRipple
                onClick={() => setAnchorEl(null)}
                sx={{ fontSize: 12, minWidth: 140 }}
              >
                Consignment Note
              </MenuItem>
            </ConsignmentNoteGenerator>

            <ForwardingNoteTharGenerator jobNo={formik.values.job_no}>
              <MenuItem
                disableRipple
                onClick={() => setAnchorEl(null)}
                sx={{ fontSize: 12, minWidth: 140 }}
              >
                Forwarding Note (THAR)
              </MenuItem>
            </ForwardingNoteTharGenerator>

            <AnnexureCGenerator jobNo={formik.values.job_no}>
              <MenuItem
                disableRipple
                onClick={() => setAnchorEl(null)}
                sx={{ fontSize: 12, minWidth: 140 }}
              >
                Annexure C
              </MenuItem>
            </AnnexureCGenerator>

            <ConcorForwardingNoteGenerator jobNo={formik.values.job_no}>
              <MenuItem
                disableRipple
                onClick={() => setAnchorEl(null)}
                sx={{ fontSize: 12, minWidth: 140 }}
              >
                Forwarding Note (CONCOR)
              </MenuItem>
            </ConcorForwardingNoteGenerator>

            <VGMAuthorizationGenerator jobNo={formik.values.job_no}>
              <MenuItem
                disableRipple
                onClick={() => setAnchorEl(null)}
                sx={{ fontSize: 12, minWidth: 140 }}
              >
                VGM Authorization
              </MenuItem>
            </VGMAuthorizationGenerator>

            <FreightCertificateGenerator jobNo={formik.values.job_no}>
              <MenuItem
                disableRipple
                onClick={() => setAnchorEl(null)}
                sx={{ fontSize: 12, minWidth: 140 }}
              >
                Freight Certificate
              </MenuItem>
            </FreightCertificateGenerator>

            <BillOfLadingGenerator jobNo={formik.values.job_no}>
              <MenuItem
                disableRipple
                onClick={() => setAnchorEl(null)}
                sx={{ fontSize: 12, minWidth: 140 }}
              >
                Bill of Lading
              </MenuItem>
            </BillOfLadingGenerator>
          </Menu>
        </div>
      </div>

      {snackbar && (
        <div
          style={{
            background: "#1976d2",
            color: "#fff",
            padding: "3px 12px",
            fontSize: 11,
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
