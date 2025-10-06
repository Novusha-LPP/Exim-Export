import React, { useState, useEffect } from "react";
import { FcCalendar } from "react-icons/fc";
import { Tooltip } from "@mui/material";
import axios from "axios";

const EditableDateSummaryCell = ({ row, onRowDataUpdate }) => {
  const {
    _id,
    container_nos = [],
    pcv_date,
    out_of_charge,
    examination_planning_date,
    examination_date,
    firstCheck,
  } = row.original;

  const [dates, setDates] = useState({
    pcv_date,
    out_of_charge,
    examination_planning_date,
    examination_date,
  });

  const [containers, setContainers] = useState([...container_nos]);
  const [editable, setEditable] = useState(null);
  const [tempDateValue, setTempDateValue] = useState("");
  const [dateError, setDateError] = useState("");

  // Reset data when row ID changes
  useEffect(() => {
    if (row?.original) {
      const {
        container_nos = [],
        pcv_date,
        out_of_charge,
        examination_planning_date,
        examination_date,
      } = row.original;

      setDates({
        pcv_date,
        out_of_charge,
        examination_planning_date,
        examination_date,
      });
      setContainers([...container_nos]);
      setEditable(null);
      setTempDateValue("");
      setDateError("");
    }
  }, [_id]);

  // Handle date editing
  const handleEditStart = (field, index = null) => {
    setEditable(index !== null ? `${field}_${index}` : field);
    setTempDateValue("");
    setDateError("");
  };

  const validateDate = (dateString) => {
    if (!dateString || dateString.trim() === "") return true;
    const date = new Date(dateString);
    return !isNaN(date.getTime());
  };

  const handleDateInputChange = (e) => {
    setTempDateValue(e.target.value);
    setDateError("");
  };

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

    if (index !== null) {
      // Handle container-specific dates (arrival_date)
      const oldContainers = [...containers];

      const updatedContainers = containers.map((container, i) => {
        if (i === index) {
          return {
            ...container,
            [field]: finalValue || null,
          };
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
      } catch (err) {
        console.error("Error Updating Container:", err);
        // Revert on error
        setContainers(oldContainers);
      }
    } else {
      // Handle job-level dates
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
      } catch (err) {
        console.error(`Error Updating ${field}:`, err);
        // Revert on error
        setDates(oldDates);
      }
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return dateString.slice(0, 10);
  };

  const DateField = ({
    label,
    value,
    field,
    index = null,
    tooltip,
    isEditable = true,
  }) => (
    <div style={{ marginBottom: "2px" }}>
      <Tooltip title={tooltip} arrow>
        <strong>{label}: </strong>
      </Tooltip>
      {formatDate(value)}
      {isEditable && (
        <>
          {" "}
          <FcCalendar
            style={styles.icon}
            onClick={() => handleEditStart(field, index)}
          />
        </>
      )}
      {editable === (index !== null ? `${field}_${index}` : field) && (
        <div style={styles.editContainer}>
          <input
            type="datetime-local"
            value={tempDateValue}
            onChange={handleDateInputChange}
            style={dateError ? styles.errorInput : styles.dateInput}
          />
          <button
            style={styles.submitButton}
            onClick={() => handleDateSubmit(field, index)}
          >
            ✓
          </button>
          <button style={styles.cancelButton} onClick={() => setEditable(null)}>
            ✕
          </button>
          {dateError && <div style={styles.errorText}>{dateError}</div>}
        </div>
      )}
    </div>
  );

  return (
    <div style={{ lineHeight: "1.5" }}>
      <Tooltip title="Arrival Date" arrow>
        <strong>Arrival: </strong>
      </Tooltip>
      {containers.length > 0
        ? containers.map((container, id) => (
            <React.Fragment key={id}>
              {formatDate(container.arrival_date)}
              <FcCalendar
                style={styles.icon}
                onClick={() => handleEditStart("arrival_date", id)}
              />
              {editable === `arrival_date_${id}` && (
                <div style={styles.editContainer}>
                  <input
                    type="datetime-local"
                    value={tempDateValue}
                    onChange={handleDateInputChange}
                    style={dateError ? styles.errorInput : styles.dateInput}
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
                  {dateError && <div style={styles.errorText}>{dateError}</div>}
                </div>
              )}
              <br />
            </React.Fragment>
          ))
        : "N/A"}

      <DateField
        label="FC"
        value={firstCheck}
        field="firstCheck"
        tooltip="First Check Date"
        isEditable={false}
      />

      <DateField
        label="Ex.Plan date"
        value={dates.examination_planning_date}
        field="examination_planning_date"
        tooltip="Examination Planning Date"
      />

      <DateField
        label="Ex. Date"
        value={dates.examination_date}
        field="examination_date"
        tooltip="Examination Date"
      />

      <DateField
        label="PCV"
        value={dates.pcv_date}
        field="pcv_date"
        tooltip="PCV Date"
      />

      <DateField
        label="OOC"
        value={dates.out_of_charge}
        field="out_of_charge"
        tooltip="Out of Charge Date"
      />
    </div>
  );
};

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

export default EditableDateSummaryCell;
