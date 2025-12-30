import React, { useState } from "react";

const DateInput = ({
  value,
  onChange,
  name,
  placeholder = "DD-MM-YYYY",
  style,
  ...props
}) => {
  const [pickerMode, setPickerMode] = useState(false);

  // Convert DD-MM-YYYY to YYYY-MM-DD for native date picker
  const toPickerFormat = (val) => {
    if (!val || typeof val !== "string") return "";
    const parts = val.split("-");
    if (parts.length === 3 && parts[0].length === 2 && parts[2].length === 4) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return val;
  };

  // Convert YYYY-MM-DD to DD-MM-YYYY from native date picker
  const fromPickerFormat = (val) => {
    if (!val || typeof val !== "string") return "";
    const parts = val.split("-");
    if (parts.length === 3 && parts[0].length === 4 && parts[2].length === 2) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return val;
  };

  const handleChange = (e) => {
    const originalVal = e.target.value;

    if (pickerMode) {
      // Brower sends YYYY-MM-DD for type="date"
      const ddmmVal = fromPickerFormat(originalVal);
      const syntheticEvent = {
        target: {
          name,
          value: ddmmVal,
        },
        persist: () => { },
      };
      onChange(syntheticEvent);
    } else {
      // Regular text mode
      if (/^[0-9-]*$/.test(originalVal) && originalVal.length <= 10) {
        onChange(e);
      }
    }
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

  const handleBlur = (e) => {
    setPickerMode(false);
    e.target.type = "text";
    if (props.onBlur) props.onBlur(e);
  };

  // If in picker mode, input value must be YYYY-MM-DD
  const displayValue = pickerMode ? toPickerFormat(value) : (value || "");

  return (
    <input
      type="text"
      name={name}
      value={displayValue}
      onChange={handleChange}
      onDoubleClick={handleDoubleClick}
      onBlur={handleBlur}
      placeholder={placeholder}
      maxLength={10}
      autoComplete="off"
      title="Double click to open date picker"
      style={{
        ...style,
        cursor: "pointer",
      }}
      {...props}
    />
  );
};

export default DateInput;
