import React from "react";

const DateInput = ({
  value,
  onChange,
  name,
  placeholder = "DD-MM-YYYY",
  style,
  ...props
}) => {
  const handleChange = (e) => {
    const val = e.target.value;
    // Allow only numbers and hyphens, max length 10
    if (/^[0-9-]*$/.test(val) && val.length <= 10) {
      onChange(e); // Pass the event up to Formik/parent
    }
  };

  return (
    <input
      type="text"
      name={name}
      value={value || ""}
      onChange={handleChange}
      placeholder={placeholder}
      maxLength={10}
      autoComplete="off"
      style={{
        ...style,
        // Ensure consistent styling if style prop is not sufficient, but usually it is passed
      }}
      {...props}
    />
  );
};

export default DateInput;
