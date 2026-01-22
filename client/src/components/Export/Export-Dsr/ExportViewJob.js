import React, { useState, useEffect, useContext, useRef } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import {
  Typography,
  Button,
  Box,
  Paper,
  Tabs,
  Tab,
  Snackbar,
  Divider,
  Menu,
  MenuItem,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { UserContext } from "../../../contexts/UserContext";
import useExportJobDetails from "../../../customHooks/useExportJobDetails.js";
import ShipmentTab from "./Shipment/ShipmentTab.js";
import axios from "axios";
import FinancialTab from "./Financial/FinancialTab.js";
import GeneralTab from "./General/GeneralTab.js";
import ContainerTab from "./Container/ContainerTab.js";
import InvoiceTab from "./Invoices/InvoiceTab.js";
import ProductTab from "./Product/ProductTab.js";
import TrackingCompletedTab from "./Tracking Completed/TrackingCompletedTab.js";
import ChargesTab from "./Charges/ChargesTab.js";
import ESanchitTab from ".//E-sanchit/EsanchitTab.js";
import ExportChecklistGenerator from "./StandardDocuments/ExportChecklistGenerator.js";
import AnnexureCGenerator from "./StandardDocuments/AnnexureCGenerator.js";
import DateInput from "../../common/DateInput.js";
import OperationsTab from "./Operations/OperationsTab.jsx";
import AutocompleteSelect from "../../common/AutocompleteSelect.js";

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
  const keepOpen = useRef(false);
  const apiBase = import.meta.env.VITE_API_STRING;

  // Sync internal query state with formik values when they change externally (e.g. on load)
  useEffect(() => {
    if (!isTyping) {
      setQuery(formik.values[fieldName] || "");
    }
  }, [formik.values[fieldName], isTyping, fieldName]);

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
            if (e.key === "Enter") {
              if (d.open && d.active >= 0) {
                e.preventDefault();
                d.select(d.active);
              } else if (props.onEnter) {
                e.preventDefault();
                props.onEnter();
              }
              return;
            }

            if (!d.open) return;
            if (e.key === "ArrowDown")
              d.setActive((a) =>
                Math.min(filtered.length - 1, a < 0 ? 0 : a + 1)
              );
            else if (e.key === "ArrowUp")
              d.setActive((a) => Math.max(0, a - 1));
            else if (e.key === "Escape") d.setOpen(false);
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

export default LogisysExportViewJob;

// Force reload - Loading Port field added

