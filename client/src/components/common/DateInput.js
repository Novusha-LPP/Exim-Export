import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  formatDate,
  handleDateInput,
  parseDate,
} from "../../utils/dateUtils";

const DateInput = ({
  value,
  onChange,
  name,
  placeholder = "dd-mm-yyyy",
  style,
  withTime = false,
  className,
  disabled = false,
  readOnly = false,
  ...props
}) => {
  const [showCalendar, setShowCalendar] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });

  const updateCoords = () => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setCoords({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
      });
    }
  };

  useEffect(() => {
    if (showCalendar) {
      updateCoords();
      // Listen to scroll events on window and all scrollable parent containers (using capture phase)
      window.addEventListener("scroll", updateCoords, true);
      window.addEventListener("resize", updateCoords);
    }
    return () => {
      window.removeEventListener("scroll", updateCoords, true);
      window.removeEventListener("resize", updateCoords);
    };
  }, [showCalendar]);
  
  // Keep track of the month/year currently shown in the calendar popover
  const [activeDate, setActiveDate] = useState(() => {
    const parsed = parseDate(value);
    return parsed && !isNaN(parsed.getTime()) ? parsed : new Date();
  });

  const containerRef = useRef(null);

  // Sync activeDate with value when calendar is opened or value changes
  useEffect(() => {
    if (showCalendar) {
      const parsed = parseDate(value);
      if (parsed && !isNaN(parsed.getTime())) {
        setActiveDate(parsed);
      } else {
        setActiveDate(new Date());
      }
    }
  }, [showCalendar, value]);

  // Click outside listener to close the calendar popover
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setShowCalendar(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleChange = (e) => {
    const originalVal = e.target.value;
    // Allow users to type freely. Only restrict characters to date/time format patterns
    if (/^[0-9\/\-\. :]*$/.test(originalVal) && originalVal.length <= (withTime ? 16 : 10)) {
      onChange(e);
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData("text");
    const formattedDate = handleDateInput(pastedText);

    const syntheticEvent = {
      target: {
        name,
        value: formattedDate,
      },
      persist: () => { },
    };

    onChange(syntheticEvent);
  };

  const handleBlurInput = (e) => {
    // Auto-format the date when user blurs the field
    if (e.target.value) {
      let valToFormat = e.target.value;
      const formattedDate = handleDateInput(valToFormat);

      const finalFormatted = withTime && !formattedDate.includes(":")
        ? formatDate(formattedDate, "dd-MM-yyyy") + " 00:00"
        : formattedDate;

      const syntheticEvent = {
        target: {
          name,
          value: finalFormatted,
        },
        persist: () => { },
      };
      onChange(syntheticEvent);
    }

    if (props.onBlur) props.onBlur(e);
  };

  const handleSelectDay = (cell, e) => {
    e.preventDefault();
    e.stopPropagation();

    // Preserve time if present
    let hours = "00";
    let minutes = "00";
    if (withTime && value) {
      const parsedCurrent = parseDate(value);
      if (parsedCurrent && !isNaN(parsedCurrent.getTime())) {
        hours = String(parsedCurrent.getHours()).padStart(2, "0");
        minutes = String(parsedCurrent.getMinutes()).padStart(2, "0");
      }
    }

    const dayStr = String(cell.day).padStart(2, "0");
    const monthStr = String(cell.month + 1).padStart(2, "0");
    const formattedDate = withTime
      ? `${dayStr}-${monthStr}-${cell.year} ${hours}:${minutes}`
      : `${dayStr}-${monthStr}-${cell.year}`;

    onChange({
      target: {
        name,
        value: formattedDate,
      }
    });
    setShowCalendar(false);
  };

  const handleToday = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const today = new Date();
    const dayStr = String(today.getDate()).padStart(2, "0");
    const monthStr = String(today.getMonth() + 1).padStart(2, "0");
    const yearStr = today.getFullYear();
    
    let formatted = `${dayStr}-${monthStr}-${yearStr}`;
    if (withTime) {
      const hours = String(today.getHours()).padStart(2, "0");
      const minutes = String(today.getMinutes()).padStart(2, "0");
      formatted = `${dayStr}-${monthStr}-${yearStr} ${hours}:${minutes}`;
    }

    onChange({
      target: {
        name,
        value: formatted,
      }
    });
    setShowCalendar(false);
  };

  const handleClear = (e) => {
    e.preventDefault();
    e.stopPropagation();
    onChange({
      target: {
        name,
        value: "",
      }
    });
    setShowCalendar(false);
  };

  const handleMonthChange = (e) => {
    const m = parseInt(e.target.value, 10);
    setActiveDate(new Date(activeDate.getFullYear(), m, 1));
  };

  const handleYearChange = (e) => {
    const y = parseInt(e.target.value, 10);
    setActiveDate(new Date(y, activeDate.getMonth(), 1));
  };

  const handlePrevMonth = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setActiveDate(new Date(activeDate.getFullYear(), activeDate.getMonth() - 1, 1));
  };

  const handleNextMonth = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setActiveDate(new Date(activeDate.getFullYear(), activeDate.getMonth() + 1, 1));
  };

  // Calendar calculations
  const activeYear = activeDate.getFullYear();
  const activeMonth = activeDate.getMonth();
  const firstDayIdx = new Date(activeYear, activeMonth, 1).getDay();
  const daysInMonth = new Date(activeYear, activeMonth + 1, 0).getDate();
  const daysInPrevMonth = new Date(activeYear, activeMonth, 0).getDate();

  const cells = [];
  // Pad previous month days
  for (let i = firstDayIdx - 1; i >= 0; i--) {
    cells.push({
      day: daysInPrevMonth - i,
      month: activeMonth - 1,
      year: activeMonth === 0 ? activeYear - 1 : activeYear,
      isCurrentMonth: false,
    });
  }
  // Current month days
  for (let i = 1; i <= daysInMonth; i++) {
    cells.push({
      day: i,
      month: activeMonth,
      year: activeYear,
      isCurrentMonth: true,
    });
  }
  // Pad next month days
  const remaining = 42 - cells.length;
  for (let i = 1; i <= remaining; i++) {
    cells.push({
      day: i,
      month: activeMonth + 1,
      year: activeMonth === 11 ? activeYear + 1 : activeYear,
      isCurrentMonth: false,
    });
  }

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  
  const currentYear = new Date().getFullYear();
  const yearsList = [];
  for (let y = currentYear - 80; y <= currentYear + 20; y++) {
    yearsList.push(y);
  }

  const isToday = (cell) => {
    const today = new Date();
    return (
      today.getDate() === cell.day &&
      today.getMonth() === cell.month &&
      today.getFullYear() === cell.year
    );
  };

  // Parse current value for highlighting
  const parsedVal = parseDate(value);
  const isSelected = (cell) => {
    const today = new Date();
    if (!parsedVal) {
      return (
        today.getDate() === cell.day &&
        today.getMonth() === cell.month &&
        today.getFullYear() === cell.year
      );
    }
    return (
      parsedVal.getDate() === cell.day &&
      parsedVal.getMonth() === cell.month &&
      parsedVal.getFullYear() === cell.year
    );
  };

  return (
    <div ref={containerRef} style={{ position: "relative", display: "inline-block", width: "100%" }}>
      <input
        type="text"
        name={name}
        value={value || ""}
        onChange={handleChange}
        onPaste={handlePaste}
        onDoubleClick={() => {
          if (disabled || readOnly) return;
          setShowCalendar(true);
          if (!value) {
            const today = new Date();
            const dayStr = String(today.getDate()).padStart(2, "0");
            const monthStr = String(today.getMonth() + 1).padStart(2, "0");
            const yearStr = today.getFullYear();
            let formatted = `${dayStr}-${monthStr}-${yearStr}`;
            if (withTime) {
              const hours = String(today.getHours()).padStart(2, "0");
              const minutes = String(today.getMinutes()).padStart(2, "0");
              formatted = `${dayStr}-${monthStr}-${yearStr} ${hours}:${minutes}`;
            }
            onChange({
              target: {
                name,
                value: formatted,
              }
            });
          }
        }}
        onBlur={handleBlurInput}
        placeholder={placeholder}
        maxLength={withTime ? 16 : 10}
        autoComplete="off"
        className={className}
        disabled={disabled}
        readOnly={readOnly}
        title="Double-click to open calendar picker popup"
        style={{
          width: "100%",
          cursor: "pointer",
          boxSizing: "border-box",
          ...style,
        }}
        {...props}
      />
      {showCalendar && createPortal(
        <div
          style={{
            position: "absolute",
            top: `${coords.top}px`,
            left: `${coords.left}px`,
            zIndex: 999999,
            marginTop: "4px",
            width: "220px",
            backgroundColor: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: "8px",
            boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
            padding: "8px",
            fontFamily: "Arial, sans-serif",
            fontSize: "11px",
            userSelect: "none",
            boxSizing: "border-box",
          }}
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          {/* Header Controls */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
            <button
              onClick={handlePrevMonth}
              style={{
                border: "none",
                background: "#f1f5f9",
                borderRadius: "4px",
                width: "22px",
                height: "22px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: "bold",
                color: "#475569",
                fontSize: "11px",
              }}
            >
              &larr;
            </button>
            <div style={{ display: "flex", gap: "2px" }}>
              <select
                value={activeMonth}
                onChange={handleMonthChange}
                style={{
                  border: "none",
                  fontWeight: "bold",
                  color: "#1e293b",
                  fontSize: "11px",
                  cursor: "pointer",
                  outline: "none",
                  background: "transparent",
                }}
              >
                {months.map((m, idx) => (
                  <option key={m} value={idx}>{m}</option>
                ))}
              </select>
              <select
                value={activeYear}
                onChange={handleYearChange}
                style={{
                  border: "none",
                  fontWeight: "bold",
                  color: "#1e293b",
                  fontSize: "11px",
                  cursor: "pointer",
                  outline: "none",
                  background: "transparent",
                }}
              >
                {yearsList.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
            <button
              onClick={handleNextMonth}
              style={{
                border: "none",
                background: "#f1f5f9",
                borderRadius: "4px",
                width: "22px",
                height: "22px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: "bold",
                color: "#475569",
                fontSize: "11px",
              }}
            >
              &rarr;
            </button>
          </div>

          {/* Days Header */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", textAlign: "center", fontSize: "10px", fontWeight: "bold", color: "#64748b", marginBottom: "4px" }}>
            <span>Su</span>
            <span>Mo</span>
            <span>Tu</span>
            <span>We</span>
            <span>Th</span>
            <span>Fr</span>
            <span>Sa</span>
          </div>

          {/* Days Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "2px" }}>
            {cells.map((cell, idx) => {
              const selected = isSelected(cell);
              const cellIsToday = isToday(cell);
              return (
                <button
                  key={idx}
                  onClick={(e) => handleSelectDay(cell, e)}
                  style={{
                    border: cellIsToday && !selected ? "1px solid #2563eb" : "none",
                    height: "22px",
                    borderRadius: "3px",
                    fontSize: "11px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: "all 0.15s ease",
                    fontWeight: (selected || cellIsToday) ? "bold" : "normal",
                    backgroundColor: selected ? "#2563eb" : "transparent",
                    color: selected
                      ? "#ffffff"
                      : cellIsToday
                        ? "#2563eb"
                        : cell.isCurrentMonth
                          ? "#1e293b"
                          : "#cbd5e1",
                  }}
                  onMouseEnter={(e) => {
                    if (!selected) {
                      e.currentTarget.style.backgroundColor = "#f1f5f9";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!selected) {
                      e.currentTarget.style.backgroundColor = "transparent";
                    }
                  }}
                >
                  {cell.day}
                </button>
              );
            })}
          </div>

          {/* Footer controls */}
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "8px", paddingTop: "6px", borderTop: "1px solid #f1f5f9" }}>
            <button
              onClick={handleClear}
              style={{
                border: "none",
                background: "transparent",
                color: "#ef4444",
                fontSize: "10px",
                fontWeight: "bold",
                cursor: "pointer",
                padding: "2px 4px",
              }}
            >
              Clear
            </button>
            <button
              onClick={handleToday}
              style={{
                border: "none",
                background: "transparent",
                color: "#2563eb",
                fontSize: "10px",
                fontWeight: "bold",
                cursor: "pointer",
                padding: "2px 4px",
              }}
            >
              Today
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default DateInput;
