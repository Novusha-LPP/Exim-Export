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
    return formatDate(val);
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
      // Only restrict to valid date characters
      if (/^[0-9\/\-\.]*$/.test(originalVal) && originalVal.length <= 10) {
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
      const formattedDate = handleDateInput(e.target.value);
      const syntheticEvent = {
        target: {
          name,
          value: formattedDate,
        },
        persist: () => { },
      };
      onChange(syntheticEvent);
    }

    if (props.onBlur) props.onBlur(e);
  };

  const handleDoubleClick = (e) => {
    setPickerMode(true);
    e.target.type = "date";
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
      maxLength={10}
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
