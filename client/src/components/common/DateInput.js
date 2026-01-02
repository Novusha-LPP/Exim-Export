import React, { useState } from "react";
import {
  formatDate,
  handleDateInput,
  parseDate,
  toISOString,
} from "../../utils/dateUtils";

const DateInput = ({
  value,
  onChange,
  name,
  placeholder = "dd-mm-yyyy",
  style,
  withTime = false,
  ...props
}) => {
  const [pickerMode, setPickerMode] = useState(false);

  // Convert dd-MM-yyyy to yyyy-MM-dd for native date picker
  const toPickerFormat = (val) => {
    if (!val) return "";
    try {
      const parsedDate = parseDate(val);
      if (parsedDate) {
        const year = parsedDate.getFullYear();
        const month = String(parsedDate.getMonth() + 1).padStart(2, "0");
        const day = String(parsedDate.getDate()).padStart(2, "0");
        if (withTime) {
          const hours = String(parsedDate.getHours()).padStart(2, "0");
          const minutes = String(parsedDate.getMinutes()).padStart(2, "0");
          return `${year}-${month}-${day}T${hours}:${minutes}`;
        }
        return `${year}-${month}-${day}`;
      }
    } catch (e) {
      console.warn("Date conversion error:", e);
    }
    return "";
  };

  // Convert yyyy-MM-dd to dd-MM-yyyy from native date picker
  const fromPickerFormat = (val) => {
    if (!val) return "";
    return formatDate(val, withTime ? "dd-MM-yyyy HH:mm" : "dd-MM-yyyy");
  };

  const handleChange = (e) => {
    const originalVal = e.target.value;

    if (pickerMode) {
      // Browser sends yyyy-MM-dd for type="date"
      const formattedDate = fromPickerFormat(originalVal);
      const syntheticEvent = {
        target: {
          name,
          value: formattedDate,
        },
        persist: () => { },
      };
      onChange(syntheticEvent);
    } else {
      // Regular text mode - allow user to type freely
      // Only restrict to valid date characters (now including space and colon for time)
      if (/^[0-9\/\-\. :]*$/.test(originalVal) && originalVal.length <= (withTime ? 16 : 10)) {
        onChange(e);
      }
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData("text");

    // Use the global date utility to format the pasted date
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
    setPickerMode(false);
    e.target.type = "text";

    // Auto-format the date when user blurs the field
    if (e.target.value) {
      // If we expect time, ensure the utility knows even if the user didn't type it perfectly
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

  const handleDoubleClick = (e) => {
    setPickerMode(true);
    e.target.type = withTime ? "datetime-local" : "date";
    if (e.target.showPicker) {
      setTimeout(() => {
        try {
          e.target.showPicker();
        } catch (err) {
          console.warn("Date picker not supported or gesture failed", err);
        }
      }, 10);
    }
  };

  // If in picker mode, input value must be yyyy-MM-dd
  const displayValue = pickerMode ? toPickerFormat(value) : value || "";

  return (
    <input
      type="text"
      name={name}
      value={displayValue}
      onChange={handleChange}
      onPaste={handlePaste}
      onDoubleClick={handleDoubleClick}
      onBlur={handleBlurInput}
      placeholder={placeholder}
      maxLength={withTime ? 16 : 10}
      autoComplete="off"
      title="Type or paste a date (any format), or double-click to open date picker"
      style={{
        ...style,
        cursor: "pointer",
      }}
      {...props}
    />
  );
};

export default DateInput;
