import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Autocomplete,
  TextField,
} from "@mui/material";
import { priorityFilter } from "../../../../../utils/filterUtils";

const DsrReportDialog = ({
  open,
  onClose,
  exporters,
  selectedExporter,
  setSelectedExporter,
  dsrYear,
  setDsrYear,
  dsrStartDate,
  setDsrStartDate,
  dsrEndDate,
  setDsrEndDate,
  dsrTab,
  setDsrTab,
  dsrLoading,
  handleDownloadTableDSR,
  handleDownloadDSR,
  modalStyles,
  selectStyle,
}) => {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
    >
      <DialogTitle
        style={{
          borderBottom: "1px solid #e5e7eb",
          fontSize: "16px",
          fontWeight: "700",
        }}
      >
        Download DSR Report
      </DialogTitle>
      <DialogContent style={{ padding: "20px" }}>
        <div style={{ marginBottom: "15px" }}>
          <label
            style={{
              display: "block",
              fontSize: "12px",
              fontWeight: "600",
              color: "#374151",
              marginBottom: "5px",
            }}
          >
            Select Exporter
          </label>
          <Autocomplete
            size="small"
            options={["All Exporters", ...exporters]}
            value={selectedExporter || "All Exporters"}
            onChange={(event, newValue) => {
              setSelectedExporter(newValue || "All Exporters");
            }}
            filterOptions={(options, { inputValue }) =>
              priorityFilter(options, inputValue)
            }
            renderInput={(params) => (
              <TextField
                {...params}
                placeholder="-- Choose Exporter --"
                variant="outlined"
                sx={{
                  width: "100%",
                  "& .MuiInputBase-root": {
                    fontSize: "12px",
                  },
                }}
              />
            )}
          />
        </div>

        <div style={{ marginBottom: "15px" }}>
          <label
            style={{
              display: "block",
              fontSize: "12px",
              fontWeight: "600",
              color: "#374151",
              marginBottom: "5px",
            }}
          >
            Select Year
          </label>
          <select
            style={{
              ...selectStyle,
              width: "100%",
              height: "35px",
            }}
            value={dsrYear}
            onChange={(e) => setDsrYear(e.target.value)}
          >
            <option value="">All Years</option>
            <option value="26-27">26-27</option>
            <option value="25-26">25-26</option>
            <option value="24-25">24-25</option>
            <option value="23-24">23-24</option>
            <option value="22-23">22-23</option>
            <option value="21-22">21-22</option>
          </select>
        </div>

        <div style={{ display: "flex", gap: "10px", marginBottom: "15px" }}>
          <div style={{ flex: 1 }}>
            <label
              style={{
                display: "block",
                fontSize: "12px",
                fontWeight: "600",
                color: "#374151",
                marginBottom: "5px",
              }}
            >
              From Date
            </label>
            <input
              type="date"
              style={{
                width: "100%",
                height: "35px",
                padding: "5px 10px",
                fontSize: "12px",
                border: "1px solid #d1d5db",
                borderRadius: "4px",
                outline: "none",
              }}
              value={dsrStartDate}
              onChange={(e) => setDsrStartDate(e.target.value)}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label
              style={{
                display: "block",
                fontSize: "12px",
                fontWeight: "600",
                color: "#374151",
                marginBottom: "5px",
              }}
            >
              To Date
            </label>
            <input
              type="date"
              style={{
                width: "100%",
                height: "35px",
                padding: "5px 10px",
                fontSize: "12px",
                border: "1px solid #d1d5db",
                borderRadius: "4px",
                outline: "none",
              }}
              value={dsrEndDate}
              onChange={(e) => setDsrEndDate(e.target.value)}
            />
          </div>
        </div>

        <div style={{ marginBottom: "15px" }}>
          <label
            style={{
              display: "block",
              fontSize: "12px",
              fontWeight: "600",
              color: "#374151",
              marginBottom: "5px",
            }}
          >
            Select Tab / Status
          </label>
          <select
            style={{
              ...selectStyle,
              width: "100%",
              height: "35px",
            }}
            value={dsrTab}
            onChange={(e) => setDsrTab(e.target.value)}
          >
            <option value="all">All Jobs</option>
            <option value="only-pending">Only Pending Jobs</option>
            <option value="Pending">Pending</option>
            <option value="Booking Pending">Booking Pending</option>
            <option value="Handover Pending">Handover Pending</option>
            <option value="Prepare for Billing">Prepare for Billing</option>
            <option value="Sent for Billing">Sent for Billing</option>
            <option value="Op Completed">Op Completed</option>
            <option value="Completed">Completed</option>
            <option value="club-jobs">Club Jobs</option>
            <option value="General Jobs">General Jobs</option>
            <option value="Freight Forwarding">Freight Forwarding</option>
          </select>
        </div>
        <div
          style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}
        >
          <button
            style={{ ...modalStyles?.cancelButton, padding: "8px 20px" }}
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            style={{
              ...modalStyles?.submitButton,
              padding: "8px 20px",
              backgroundColor: dsrLoading ? "#cbd5e1" : "#2563eb",
            }}
            onClick={handleDownloadTableDSR}
            disabled={dsrLoading}
          >
            {dsrLoading ? "Generating..." : "Download Table DSR"}
          </button>
          <button
            style={{
              ...modalStyles?.submitButton,
              padding: "8px 20px",
              backgroundColor: dsrLoading ? "#cbd5e1" : "#059669",
            }}
            onClick={handleDownloadDSR}
            disabled={dsrLoading}
          >
            {dsrLoading ? "Generating..." : "Download Excel"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DsrReportDialog;
