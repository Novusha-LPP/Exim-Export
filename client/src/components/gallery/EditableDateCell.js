import React, { useState, useEffect, useCallback, useMemo, memo } from "react";
import { FcCalendar } from "react-icons/fc";
import axios from "axios";
import { TextField, MenuItem, Button } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import IgstModal from "./IgstModal";

const EditableDateCell = memo(({ cell, onRowDataUpdate }) => {
  const rowData = cell.row.original;
  const {
    _id,
    job_no,
    cth_no,
    assessment_date,
    free_time,
    vessel_berthing,
    gateway_igm_date,
    discharge_date,
    pcv_date,
    out_of_charge,
    type_of_b_e,
    consignment_type,
    container_nos = [],
    detailed_status,
    be_no,
    duty_paid_date,
    assessable_ammount,
    igst_ammount,
    igst_rate,
    job_net_weight,
    bcd_ammount,
    sws_ammount,
    penalty_amount,
    fine_amount,
  } = rowData;

  // Memoize initial dates to prevent unnecessary re-renders
  const initialDates = useMemo(
    () => ({
      assessment_date,
      vessel_berthing,
      gateway_igm_date,
      discharge_date,
      pcv_date,
      out_of_charge,
      duty_paid_date,
    }),
    [
      assessment_date,
      vessel_berthing,
      gateway_igm_date,
      discharge_date,
      pcv_date,
      out_of_charge,
      duty_paid_date,
    ]
  );

  const [dates, setDates] = useState(initialDates);
  const [localStatus, setLocalStatus] = useState(detailed_status);
  const [containers, setContainers] = useState(() => [...container_nos]);
  const [editable, setEditable] = useState(null);
  const [local, setLocalFreeTime] = useState(free_time);
  const [tempDateValue, setTempDateValue] = useState("");
  const [tempTimeValue, setTempTimeValue] = useState("");
  const [dateError, setDateError] = useState("");
  const [igstModalOpen, setIgstModalOpen] = useState(false);

  // Memoize free time options
  const options = useMemo(
    () => Array.from({ length: 25 }, (_, index) => index),
    []
  );

  // Memoized utility function to calculate number of days between two dates
  const calculateDaysBetween = useCallback((startDate, endDate) => {
    if (!startDate || !endDate) return 0;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }, []);

  // Reset data when row ID changes
  useEffect(() => {
    if (cell?.row?.original) {
      const {
        assessment_date,
        vessel_berthing,
        gateway_igm_date,
        discharge_date,
        pcv_date,
        out_of_charge,
        duty_paid_date,
        container_nos = [],
        detailed_status,
        free_time,
      } = cell.row.original;

      setDates({
        assessment_date,
        vessel_berthing,
        gateway_igm_date,
        discharge_date,
        pcv_date,
        out_of_charge,
        duty_paid_date,
      });
      setContainers([...container_nos]);
      setLocalStatus(detailed_status);
      setLocalFreeTime(free_time);
      setEditable(null);
      setTempDateValue("");
      setTempTimeValue("");
      setDateError("");
    }
  }, [_id]);

  // Handle IGST modal open
  const handleOpenIgstModal = useCallback(() => {
    setIgstModalOpen(true);
  }, []);

  const handleCloseIgstModal = useCallback(() => {
    setIgstModalOpen(false);
  }, []);

  const handleIgstSubmit = useCallback(
    async (updateData) => {
      try {
        // Get user info from localStorage for audit trail
        const user = JSON.parse(localStorage.getItem("exim_user") || "{}");
        const headers = {
          "Content-Type": "application/json",
          "user-id": user.username || "unknown",
          username: user.username || "unknown",
          "user-role": user.role || "unknown",
        };

        await axios.patch(
          `${import.meta.env.VITE_API_STRING}/jobs/${_id}`,
          updateData,
          { headers }
        );

        // Update the cell.row.original data to reflect the changes
        if (typeof onRowDataUpdate === "function") {
          onRowDataUpdate(_id, updateData);
        }

        setIgstModalOpen(false);
      } catch (error) {
        console.error("Error submitting IGST data:", error);
      }
    },
    [_id, onRowDataUpdate]
  );

  const updateDetailedStatus = useCallback(async () => {
    const eta = dates.vessel_berthing;
    const gatewayIGMDate = dates.gateway_igm_date;
    const dischargeDate = dates.discharge_date;
    const outOfChargeDate = dates.out_of_charge;
    const pcvDate = dates.pcv_date;
    const billOfEntryNo = be_no;
    const anyContainerArrivalDate = containers.some((c) => c.arrival_date);
    const containerRailOutDate =
      containers?.length > 0 &&
      containers.every((container) => container.container_rail_out_date);
    const emptyContainerOffLoadDate =
      containers?.length > 0 &&
      containers.every((container) => container.emptyContainerOffLoadDate);
    const deliveryDate =
      containers?.length > 0 &&
      containers.every((container) => container.delivery_date);
    const isExBondOrLCL =
      type_of_b_e === "Ex-Bond" || consignment_type === "LCL";

    let newStatus = "";

    if (
      billOfEntryNo &&
      anyContainerArrivalDate &&
      outOfChargeDate &&
      (isExBondOrLCL ? deliveryDate : emptyContainerOffLoadDate)
    ) {
      newStatus = "Billing Pending";
    } else if (billOfEntryNo && anyContainerArrivalDate && outOfChargeDate) {
      newStatus = "Custom Clearance Completed";
    } else if (billOfEntryNo && anyContainerArrivalDate && pcvDate) {
      newStatus = "PCV Done, Duty Payment Pending";
    } else if (billOfEntryNo && anyContainerArrivalDate) {
      newStatus = "BE Noted, Clearance Pending";
    } else if (billOfEntryNo) {
      newStatus = "BE Noted, Arrival Pending";
    } else if (!billOfEntryNo && anyContainerArrivalDate) {
      newStatus = "Arrived, BE Note Pending";
    } else if (containerRailOutDate) {
      newStatus = "Rail Out";
    } else if (dischargeDate) {
      newStatus = "Discharged";
    } else if (gatewayIGMDate) {
      newStatus = "Gateway IGM Filed";
    } else if (!eta || eta === "Invalid Date") {
      newStatus = "ETA Date Pending";
    } else if (eta) {
      newStatus = "Estimated Time of Arrival";
    }

    if (newStatus && newStatus !== localStatus) {
      cell.row.original.detailed_status = newStatus;

      try {
        // Get user info from localStorage for audit trail
        const user = JSON.parse(localStorage.getItem("exim_user") || "{}");
        const headers = {
          "Content-Type": "application/json",
          "user-id": user.username || "unknown",
          username: user.username || "unknown",
          "user-role": user.role || "unknown",
        };

        await axios.patch(
          `${import.meta.env.VITE_API_STRING}/jobs/${_id}`,
          {
            detailed_status: newStatus,
          },
          { headers }
        );
        setLocalStatus(newStatus);
        if (typeof onRowDataUpdate === "function") {
          onRowDataUpdate(_id, { detailed_status: newStatus });
        }
      } catch (err) {
        console.error("Error updating status:", err);
        cell.row.original.detailed_status = localStatus;
      }
    }
  }, [
    dates,
    containers,
    be_no,
    consignment_type,
    type_of_b_e,
    localStatus,
    _id,
  ]);

  useEffect(() => {
    updateDetailedStatus();
  }, [
    dates.vessel_berthing,
    dates.gateway_igm_date,
    dates.discharge_date,
    dates.out_of_charge,
    dates.assessment_date,
    containers,
    updateDetailedStatus,
  ]);

  // Check if arrival date should be disabled based on business logic
  const isArrivalDateDisabled = useCallback(
    (containerIndex) => {
      const container = containers[containerIndex];
      const ExBondflag = type_of_b_e === "Ex-Bond";
      const LCLFlag = consignment_type === "LCL";

      if (ExBondflag) {
        return true;
      }

      if (LCLFlag) {
        return !container?.by_road_movement_date;
      } else {
        return !container?.container_rail_out_date;
      }
    },
    [containers, type_of_b_e, consignment_type]
  );

  // Handle date editing
  const handleEditStart = (field, index = null) => {
    // Check if arrival date is disabled before allowing edit
    if (
      field === "arrival_date" &&
      index !== null &&
      isArrivalDateDisabled(index)
    ) {
      return; // Don't allow editing if disabled
    }

    setEditable(index !== null ? `${field}_${index}` : field);

    // Clear the date when starting to edit
    setTempDateValue("");
    setTempTimeValue("");
    setDateError("");
  };

  const validateDate = (dateString) => {
    if (!dateString || dateString.trim() === "") return true;
    const date = new Date(dateString);
    return !isNaN(date.getTime()); // Only check if valid date
  };

  const handleDateInputChange = (e) => {
    setTempDateValue(e.target.value);
    setDateError("");
  };

  const handleCombinedDateTimeChange = (e) => {
    setTempDateValue(e.target.value);
  };

  // Add this to prevent unnecessary state resets
  useEffect(() => {
    // Only reset when job data actually changes
    if (cell.row.original._id !== _id) {
      // Your existing reset logic...
    }
  }, [cell.row.original]);
  const handleDateSubmit = async (field, index = null) => {
    let finalValue;

    // Allow clearing dates
    if (tempDateValue === "") {
      finalValue = "";
    }
    // Validate non-empty dates
    else if (!validateDate(tempDateValue)) {
      setDateError("Please enter a valid date");
      return;
    } else {
      finalValue = tempDateValue;
    }

    // // Special handling for by-road dates only (keep rail-out with datetime)
    // if (field === "by_road_movement_date") {
    //   // Extract only date portion (YYYY-MM-DD)
    //   finalValue = tempDateValue.split("T")[0];
    // }

    if (index !== null) {
      const oldContainers = [...containers];

      const updatedContainers = containers.map((container, i) => {
        if (i === index) {
          const updatedContainer = {
            ...container,
            [field]: finalValue || null,
          };

          // Auto-calculate detention date - only for non-LCL consignments
          if (field === "arrival_date" && consignment_type !== "LCL") {
            if (!finalValue) {
              updatedContainer.detention_from = "";
            } else {
              const arrival = new Date(finalValue);
              const freeDays = parseInt(localFreeTime) || 0;
              const detentionDate = new Date(arrival);
              detentionDate.setDate(detentionDate.getDate() + freeDays);
              updatedContainer.detention_from = detentionDate
                .toISOString()
                .split("T")[0];
            }
          }
          return updatedContainer;
        }
        return container;
      });

      // Optimistic update
      setContainers(updatedContainers);
      try {
        // Get user info from localStorage for audit trail
        const user = JSON.parse(localStorage.getItem("exim_user") || "{}");
        const headers = {
          "Content-Type": "application/json",
          "user-id": user.username || "unknown",
          username: user.username || "unknown",
          "user-role": user.role || "unknown",
        };

        await axios.patch(
          `${import.meta.env.VITE_API_STRING}/jobs/${_id}`,
          {
            container_nos: updatedContainers,
          },
          { headers }
        );

        // Update parent component data
        if (typeof onRowDataUpdate === "function") {
          onRowDataUpdate(_id, { container_nos: updatedContainers });
        }

        setEditable(null);
        updateDetailedStatus();
      } catch (err) {
        console.error("Error Updating Container:", err);
        // Revert on error
        setContainers(oldContainers);
      }
    } else {
      const oldDates = { ...dates };
      const newDates = { ...dates, [field]: finalValue || null };

      // Optimistic update
      setDates(newDates);
      try {
        // Get user info from localStorage for audit trail
        const user = JSON.parse(localStorage.getItem("exim_user") || "{}");
        const headers = {
          "Content-Type": "application/json",
          "user-id": user.username || "unknown",
          username: user.username || "unknown",
          "user-role": user.role || "unknown",
        };

        await axios.patch(
          `${import.meta.env.VITE_API_STRING}/jobs/${_id}`,
          {
            [field]: finalValue || null,
          },
          { headers }
        );

        // Update parent component data
        if (typeof onRowDataUpdate === "function") {
          onRowDataUpdate(_id, { [field]: finalValue || null });
        }

        setEditable(null);
        updateDetailedStatus();
      } catch (err) {
        console.error(`Error Updating ${field}:`, err);
        // Revert on error
        setDates(oldDates);
      }
    }
  };

  const handleFreeTimeChange = (value) => {
    // Don't update free time for LCL consignments
    if (consignment_type === "LCL") {
      return;
    }

    setLocalFreeTime(value);

    // Get user info from localStorage for audit trail
    const user = JSON.parse(localStorage.getItem("exim_user") || "{}");
    const headers = {
      "Content-Type": "application/json",
      "user-id": user.username || "unknown",
      username: user.username || "unknown",
      "user-role": user.role || "unknown",
    };

    axios
      .patch(
        `${import.meta.env.VITE_API_STRING}/jobs/${_id}`,
        {
          free_time: value,
        },
        { headers }
      )
      .then(() => {
        // Update parent component data for free_time
        if (typeof onRowDataUpdate === "function") {
          onRowDataUpdate(_id, { free_time: value });
        }

        const updatedContainers = containers.map((container) => {
          const updatedContainer = { ...container };
          if (updatedContainer.arrival_date) {
            const arrival = new Date(updatedContainer.arrival_date);
            const freeDays = parseInt(value) || 0;
            const detentionDate = new Date(arrival);
            detentionDate.setDate(detentionDate.getDate() + freeDays);
            updatedContainer.detention_from = detentionDate
              .toISOString()
              .slice(0, 10);
          }
          return updatedContainer;
        });

        if (JSON.stringify(updatedContainers) !== JSON.stringify(containers)) {
          setContainers(updatedContainers);
          axios
            .patch(
              `${import.meta.env.VITE_API_STRING}/jobs/${_id}`,
              {
                container_nos: updatedContainers,
              },
              { headers }
            )
            .then(() => {
              // Update parent component data for containers
              if (typeof onRowDataUpdate === "function") {
                onRowDataUpdate(_id, { container_nos: updatedContainers });
              }
            })
            .catch((err) => console.error("Error Updating Containers:", err));
        }
      })
      .catch((err) => console.error("Error Updating Free Time:", err));
  };

  const isIgstFieldsAvailable = assessable_ammount && igst_ammount;

  return (
    <div style={{ display: "flex", gap: "20px" }}>
      {/* Left Section */}
      <div>
        {type_of_b_e !== "Ex-Bond" && (
          <>
            <div>
              <strong>ETA:</strong>{" "}
              {dates.vessel_berthing?.slice(0, 10).replace("T", " ") || "N/A"}{" "}
              <FcCalendar
                style={styles.icon}
                onClick={() => handleEditStart("vessel_berthing")}
              />
              {editable === "vessel_berthing" && (
                <div>
                  <input
                    type="datetime-local"
                    value={tempDateValue}
                    onChange={handleDateInputChange}
                    style={dateError ? styles.errorInput : {}}
                    autoFocus
                  />
                  <button
                    style={styles.submitButton}
                    onClick={() => handleDateSubmit("vessel_berthing")}
                  >
                    ✓
                  </button>
                  <button
                    style={styles.cancelButton}
                    onClick={() => setEditable(null)}
                  >
                    ✕
                  </button>
                  {dateError && <div style={styles.errorText}>{dateError}</div>}
                </div>
              )}
            </div>
            <br />
            <div>
              <strong>GIGM:</strong>{" "}
              {dates.gateway_igm_date?.slice(0, 10).replace("T", " ") || "N/A"}{" "}
              <FcCalendar
                style={styles.icon}
                onClick={() => handleEditStart("gateway_igm_date")}
              />
              {editable === "gateway_igm_date" && (
                <div>
                  <input
                    type="datetime-local"
                    value={tempDateValue}
                    onChange={handleDateInputChange}
                    style={dateError ? styles.errorInput : {}}
                    autoFocus
                  />
                  <button
                    style={styles.submitButton}
                    onClick={() => handleDateSubmit("gateway_igm_date")}
                  >
                    ✓
                  </button>
                  <button
                    style={styles.cancelButton}
                    onClick={() => setEditable(null)}
                  >
                    ✕
                  </button>
                  {dateError && <div style={styles.errorText}>{dateError}</div>}
                </div>
              )}
            </div>
            <br />
            <div>
              <strong>Discharge:</strong>{" "}
              {dates.discharge_date?.slice(0, 10).replace("T", " ") || "N/A"}{" "}
              <FcCalendar
                style={styles.icon}
                onClick={() => handleEditStart("discharge_date")}
              />
              {editable === "discharge_date" && (
                <div>
                  <input
                    type="datetime-local"
                    value={tempDateValue}
                    onChange={handleDateInputChange}
                    style={dateError ? styles.errorInput : {}}
                    autoFocus
                  />
                  <button
                    style={styles.submitButton}
                    onClick={() => handleDateSubmit("discharge_date")}
                  >
                    ✓
                  </button>
                  <button
                    style={styles.cancelButton}
                    onClick={() => setEditable(null)}
                  >
                    ✕
                  </button>
                  {dateError && <div style={styles.errorText}>{dateError}</div>}
                </div>
              )}
            </div>
            <br />

            {type_of_b_e !== "Ex-Bond" &&
              consignment_type !== "LCL" &&
              containers.map((container, id) => (
                <div key={id}>
                  <div>
                    <strong>Rail-out:</strong>{" "}
                    {container.container_rail_out_date
                      ?.slice(0, 10)
                      .replace("T", " ") || "N/A"}{" "}
                    <FcCalendar
                      style={styles.icon}
                      onClick={() =>
                        handleEditStart("container_rail_out_date", id)
                      }
                    />
                    {editable === `container_rail_out_date_${id}` && (
                      <div>
                        <input
                          type="datetime-local"
                          value={tempDateValue}
                          onChange={handleDateInputChange}
                          style={dateError ? styles.errorInput : {}}
                          autoFocus
                        />
                        <button
                          style={styles.submitButton}
                          onClick={() =>
                            handleDateSubmit("container_rail_out_date", id)
                          }
                        >
                          ✓
                        </button>
                        <button
                          style={styles.cancelButton}
                          onClick={() => setEditable(null)}
                        >
                          ✕
                        </button>
                        {dateError && (
                          <div style={styles.errorText}>{dateError}</div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}

            {consignment_type === "LCL" &&
              containers.map((container, id) => (
                <div key={id}>
                  <div>
                    <strong>ByRoad:</strong>{" "}
                    {container.by_road_movement_date
                      ?.slice(0, 10)
                      .replace("T", " ") || "N/A"}{" "}
                    <FcCalendar
                      style={styles.icon}
                      onClick={() =>
                        handleEditStart("by_road_movement_date", id)
                      }
                    />
                    {editable === `by_road_movement_date_${id}` && (
                      <div>
                        <input
                          type="datetime-local"
                          value={tempDateValue}
                          onChange={handleDateInputChange}
                          style={dateError ? styles.errorInput : {}}
                          autoFocus
                        />
                        <button
                          style={styles.submitButton}
                          onClick={() =>
                            handleDateSubmit("by_road_movement_date", id)
                          }
                        >
                          ✓
                        </button>
                        <button
                          style={styles.cancelButton}
                          onClick={() => setEditable(null)}
                        >
                          ✕
                        </button>
                        {dateError && (
                          <div style={styles.errorText}>{dateError}</div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            <br />
            {type_of_b_e !== "Ex-Bond" && (
              <>
                {containers.map((container, id) => (
                  <div key={id}>
                    <div>
                      <strong>Arrival:</strong>{" "}
                      {container.arrival_date?.slice(0, 10).replace("T", " ") ||
                        "N/A"}{" "}
                      <FcCalendar
                        style={{
                          ...styles.icon,
                          opacity: isArrivalDateDisabled(id) ? 0.4 : 1,
                          filter: isArrivalDateDisabled(id)
                            ? "grayscale(100%)"
                            : "none",
                          cursor: isArrivalDateDisabled(id)
                            ? "not-allowed"
                            : "pointer",
                        }}
                        onClick={() =>
                          !isArrivalDateDisabled(id) &&
                          handleEditStart("arrival_date", id)
                        }
                        title={
                          isArrivalDateDisabled(id)
                            ? "Arrival date is disabled. Please set rail-out/by-road date first."
                            : "Edit date"
                        }
                      />
                      {editable === `arrival_date_${id}` && (
                        <div>
                          <input
                            type="datetime-local"
                            value={tempDateValue}
                            onChange={handleDateInputChange}
                            style={dateError ? styles.errorInput : {}}
                            autoFocus
                          />
                          <button
                            style={styles.submitButton}
                            onClick={() => handleDateSubmit("arrival_date", id)}
                          >
                            ✓
                          </button>
                          <button
                            style={styles.cancelButton}
                            onClick={() => setEditable(null)}
                          >
                            ✕
                          </button>
                          {dateError && (
                            <div style={styles.errorText}>{dateError}</div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                <br />

                {/* Hide free time section for LCL consignments */}
                {consignment_type !== "LCL" && (
                  <div style={{ marginBottom: "10px" }}>
                    <strong>Free time:</strong>{" "}
                    <div
                      style={{
                        display: "inline-block",
                        minWidth: "80px",
                        marginLeft: "5px",
                      }}
                    >
                      <TextField
                        select
                        size="small"
                        variant="outlined"
                        value={localFreeTime || ""}
                        onChange={(e) => handleFreeTimeChange(e.target.value)}
                        style={{ minWidth: "80px" }}
                      >
                        {options.map((option, id) => (
                          <MenuItem key={id} value={option}>
                            {option}
                          </MenuItem>
                        ))}
                      </TextField>
                    </div>
                  </div>
                )}

                <br />
                {/* Hide detention date for LCL consignments */}
                {consignment_type !== "LCL" && type_of_b_e !== "Ex-Bond" && (
                  <>
                    <strong>Detention F.:</strong>
                    {containers.map((container, id) => (
                      <div key={id}>
                        {container.detention_from?.slice(0, 10) || "N/A"}
                      </div>
                    ))}
                  </>
                )}

                <br />
              </>
            )}
          </>
        )}
      </div>
      {/* Right Section */}
      <div>
        <div>
          <strong>Assessment Date:</strong>{" "}
          {dates.assessment_date?.slice(0, 10).replace("T", " ") || "N/A"}{" "}
          <FcCalendar
            style={styles.icon}
            onClick={() => handleEditStart("assessment_date")}
          />
          {editable === "assessment_date" && (
            <div>
              <input
                type="datetime-local"
                value={tempDateValue}
                onChange={handleDateInputChange}
                style={dateError ? styles.errorInput : {}}
                autoFocus
              />
              <button
                style={styles.submitButton}
                onClick={() => handleDateSubmit("assessment_date")}
              >
                ✓
              </button>
              <button
                style={styles.cancelButton}
                onClick={() => setEditable(null)}
              >
                ✕
              </button>
              {dateError && <div style={styles.errorText}>{dateError}</div>}
            </div>
          )}
        </div>
        <br />
        <div>
          <strong>PCV:</strong>{" "}
          {dates.pcv_date?.slice(0, 10).replace("T", " ") || "N/A"}{" "}
          <FcCalendar
            style={styles.icon}
            onClick={() => handleEditStart("pcv_date")}
          />
          {editable === "pcv_date" && (
            <div>
              <input
                type="datetime-local"
                value={tempDateValue}
                onChange={handleDateInputChange}
                style={dateError ? styles.errorInput : {}}
                autoFocus
              />
              <button
                style={styles.submitButton}
                onClick={() => handleDateSubmit("pcv_date")}
              >
                ✓
              </button>
              <button
                style={styles.cancelButton}
                onClick={() => setEditable(null)}
              >
                ✕
              </button>
              {dateError && <div style={styles.errorText}>{dateError}</div>}
            </div>
          )}
        </div>
        <br />
        <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
          <span>
            <strong>Duty Paid:</strong>{" "}
            {dates.duty_paid_date?.slice(0, 10).replace("T", " ") || "N/A"}{" "}
          </span>
          <FcCalendar
            style={{ ...styles.icon, marginRight: "5px" }}
            onClick={() => handleEditStart("duty_paid_date")}
          />
          <AddIcon
            fontSize="small"
            style={{ cursor: "pointer" }}
            onClick={handleOpenIgstModal}
            title="Add Duty Details"
          />
        </div>
        {editable === "duty_paid_date" && (
          <div>
            <input
              type="datetime-local"
              value={tempDateValue}
              onChange={handleDateInputChange}
              style={dateError ? styles.errorInput : {}}
              disabled={!isIgstFieldsAvailable}
              autoFocus
            />
            <button
              style={styles.submitButton}
              onClick={() => handleDateSubmit("duty_paid_date")}
              disabled={!isIgstFieldsAvailable}
            >
              ✓
            </button>
            <button
              style={styles.cancelButton}
              onClick={() => setEditable(null)}
            >
              ✕
            </button>
            {!isIgstFieldsAvailable && (
              <div style={styles.errorText}>
                Please add IGST and Assessable Amount details
              </div>
            )}
            {dateError && <div style={styles.errorText}>{dateError}</div>}
          </div>
        )}
        <br />
        <div>
          <strong>OOC:</strong>{" "}
          {dates.out_of_charge?.slice(0, 10).replace("T", " ") || "N/A"}{" "}
          <FcCalendar
            style={styles.icon}
            onClick={() => handleEditStart("out_of_charge")}
          />
          {editable === "out_of_charge" && (
            <div>
              <input
                type="datetime-local"
                value={tempDateValue}
                onChange={handleDateInputChange}
                style={dateError ? styles.errorInput : {}}
                autoFocus
              />
              <button
                style={styles.submitButton}
                onClick={() => handleDateSubmit("out_of_charge")}
              >
                ✓
              </button>
              <button
                style={styles.cancelButton}
                onClick={() => setEditable(null)}
              >
                ✕
              </button>
              {dateError && <div style={styles.errorText}>{dateError}</div>}
            </div>
          )}
        </div>
        <br />
        {containers.map((container, id) => (
          <div key={id}>
            <div>
              <strong>Delivery:</strong>{" "}
              {container.delivery_date?.slice(0, 10).replace("T", " ") || "N/A"}{" "}
              <FcCalendar
                style={styles.icon}
                onClick={() => handleEditStart("delivery_date", id)}
              />
              {editable === `delivery_date_${id}` && (
                <div>
                  <input
                    type="datetime-local"
                    value={tempDateValue}
                    onChange={handleDateInputChange}
                    style={dateError ? styles.errorInput : {}}
                    autoFocus
                  />
                  <button
                    style={styles.submitButton}
                    onClick={() => handleDateSubmit("delivery_date", id)}
                  >
                    ✓
                  </button>
                  <button
                    style={styles.cancelButton}
                    onClick={() => setEditable(null)}
                  >
                    ✕
                  </button>
                  {dateError && <div style={styles.errorText}>{dateError}</div>}
                </div>
              )}
            </div>
          </div>
        ))}
        <br />
        {consignment_type !== "LCL" && (
          <>
            {/* <strong>EmptyOff:</strong> */}
            {containers.map((container, id) => (
              <div key={id}>
                <div>
                  <strong>EmptyOff:</strong>{" "}
                  {container.emptyContainerOffLoadDate
                    ?.slice(0, 10)
                    .replace("T", " ") || "N/A"}{" "}
                  <FcCalendar
                    style={styles.icon}
                    onClick={() =>
                      handleEditStart("emptyContainerOffLoadDate", id)
                    }
                  />
                  {editable === `emptyContainerOffLoadDate_${id}` && (
                    <div>
                      <input
                        type="datetime-local"
                        value={tempDateValue}
                        onChange={handleDateInputChange}
                        style={dateError ? styles.errorInput : {}}
                        autoFocus
                      />
                      <button
                        style={styles.submitButton}
                        onClick={() =>
                          handleDateSubmit("emptyContainerOffLoadDate", id)
                        }
                      >
                        ✓
                      </button>
                      <button
                        style={styles.cancelButton}
                        onClick={() => setEditable(null)}
                      >
                        ✕
                      </button>
                      {dateError && (
                        <div style={styles.errorText}>{dateError}</div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </>
        )}
        <br />{" "}
      </div>

      {/* IGST Modal */}
      <IgstModal
        open={igstModalOpen}
        onClose={handleCloseIgstModal}
        onSubmit={handleIgstSubmit}
        rowData={rowData}
        dates={dates}
        containers={containers}
      />
    </div>
  );
});

const styles = {
  icon: {
    cursor: "pointer",
    marginLeft: "5px",
    fontSize: "18px",
    color: "#282828",
  },
  errorInput: {
    border: "1px solid red",
  },
  errorText: {
    color: "red",
    fontSize: "12px",
    marginTop: "2px",
  },
  submitButton: {
    marginLeft: "5px",
    backgroundColor: "#28a745",
    color: "white",
    border: "none",
    borderRadius: "3px",
    padding: "2px 6px",
    cursor: "pointer",
  },
  cancelButton: {
    marginLeft: "5px",
    backgroundColor: "#dc3545",
    color: "white",
    border: "none",
    borderRadius: "3px",
    padding: "2px 6px",
    cursor: "pointer",
  },
};

export default EditableDateCell;
