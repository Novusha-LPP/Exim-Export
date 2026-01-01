import { format, parse, parseISO, isValid } from "date-fns";

/**
 * Formats a date value to dd/MM/yyyy format
 * Handles multiple input formats:
 * - ISO strings (2024-12-31T00:00:00.000Z)
 * - Date strings (2024-12-31, 31/12/2024, 31-12-2024, etc.)
 * - Date objects
 * - Timestamps
 * - String dates in various formats
 *
 * @param {string|Date|number} val - The date value to format
 * @returns {string} - Formatted date string in dd-MM-yyyy format or empty string
 */
export const formatDate = (val) => {
  if (!val) return "";

  try {
    let date;

    // If it's already a Date object
    if (val instanceof Date) {
      date = val;
    }
    // If it's a number (timestamp)
    else if (typeof val === "number") {
      date = new Date(val);
    }
    // If it's a string
    else if (typeof val === "string") {
      const trimmedVal = val.trim();

      // Try ISO format first (most common from backend)
      date = parseISO(trimmedVal);

      // If ISO parsing didn't work, try other formats
      if (!isValid(date)) {
        // Try dd/MM/yyyy format
        const ddMMyyyyFormats = [
          "dd/MM/yyyy",
          "dd-MM-yyyy",
          "dd.MM.yyyy",
          "d/M/yyyy",
          "d-M-yyyy",
        ];

        for (const dateFormat of ddMMyyyyFormats) {
          try {
            date = parse(trimmedVal, dateFormat, new Date());
            if (isValid(date)) break;
          } catch (e) {
            continue;
          }
        }
      }

      // If still not valid, try MM/dd/yyyy format
      if (!isValid(date)) {
        const mmDDyyyyFormats = [
          "MM/dd/yyyy",
          "M/d/yyyy",
          "yyyy-MM-dd",
          "yyyy/MM/dd",
        ];

        for (const dateFormat of mmDDyyyyFormats) {
          try {
            date = parse(trimmedVal, dateFormat, new Date());
            if (isValid(date)) break;
          } catch (e) {
            continue;
          }
        }
      }

      // Last resort - try new Date()
      if (!isValid(date)) {
        date = new Date(trimmedVal);
      }
    }

    // Return formatted date if valid
    return isValid(date) ? format(date, "dd-MM-yyyy") : "";
  } catch (e) {
    console.warn("Date formatting error:", e, "for value:", val);
    return "";
  }
};

/**
 * Parses a date string and returns a Date object
 * Handles multiple input formats
 *
 * @param {string|Date|number} val - The date value to parse
 * @returns {Date|null} - Parsed Date object or null if invalid
 */
export const parseDate = (val) => {
  if (!val) return null;

  try {
    let date;

    if (val instanceof Date) {
      return val;
    }

    if (typeof val === "number") {
      date = new Date(val);
      return isValid(date) ? date : null;
    }

    if (typeof val === "string") {
      const trimmedVal = val.trim();

      // Try ISO format first
      date = parseISO(trimmedVal);

      if (!isValid(date)) {
        const formats = [
          "dd/MM/yyyy",
          "dd-MM-yyyy",
          "dd.MM.yyyy",
          "d/M/yyyy",
          "MM/dd/yyyy",
          "M/d/yyyy",
          "yyyy-MM-dd",
          "yyyy/MM/dd",
        ];

        for (const dateFormat of formats) {
          try {
            date = parse(trimmedVal, dateFormat, new Date());
            if (isValid(date)) break;
          } catch (e) {
            continue;
          }
        }
      }

      if (!isValid(date)) {
        date = new Date(trimmedVal);
      }
    }

    return isValid(date) ? date : null;
  } catch (e) {
    console.warn("Date parsing error:", e, "for value:", val);
    return null;
  }
};

/**
 * Formats date input on paste or input change
 * Automatically converts any pasted date to dd-MM-yyyy format
 *
 * @param {string} value - The input value
 * @returns {string} - Formatted date string in dd-MM-yyyy format
 */
export const handleDateInput = (value) => {
  if (!value) return "";

  const trimmedValue = value.trim();

  // First, try to parse dates with month names (e.g., "31-dec-2025", "31 December 2025")
  // Check if the value contains letters (potential month name)
  if (/[a-zA-Z]/.test(trimmedValue)) {
    try {
      // Try various formats with month names
      const monthNameFormats = [
        "dd-MMM-yyyy", // 31-dec-2025
        "dd MMM yyyy", // 31 dec 2025
        "dd/MMM/yyyy", // 31/dec/2025
        "dd.MMM.yyyy", // 31.dec.2025
        "dd-MMMM-yyyy", // 31-December-2025
        "dd MMMM yyyy", // 31 December 2025
        "dd/MMMM/yyyy", // 31/December/2025
        "dd.MMMM.yyyy", // 31.December.2025
        "d-MMM-yyyy", // 1-dec-2025
        "d MMM yyyy", // 1 dec 2025
        "MMM dd, yyyy", // Dec 31, 2025
        "MMMM dd, yyyy", // December 31, 2025
      ];

      for (const dateFormat of monthNameFormats) {
        try {
          const date = parse(trimmedValue, dateFormat, new Date());
          if (isValid(date)) {
            return format(date, "dd-MM-yyyy");
          }
        } catch (e) {
          continue;
        }
      }

      // Try using native Date parser as fallback for month names
      const nativeDate = new Date(trimmedValue);
      if (isValid(nativeDate)) {
        return format(nativeDate, "dd-MM-yyyy");
      }
    } catch (e) {
      console.warn("Date parsing with month name failed:", e);
    }
  }

  // Remove any non-numeric, non-slash, non-dash characters
  const cleanValue = trimmedValue.replace(/[^\d\/\-\.]/g, "");

  // Try to parse and format the date
  const parsedDate = parseDate(cleanValue);

  if (parsedDate && isValid(parsedDate)) {
    return format(parsedDate, "dd-MM-yyyy");
  }

  // If parsing fails, return the cleaned value as-is
  // This allows users to type in the date
  return cleanValue;
};

/**
 * Hook for date input fields - handles paste events
 * Use this in your input field's onPaste and onChange handlers
 *
 * @param {Function} setValue - setState function to update the value
 * @returns {Object} - Object with onPaste and onChange handlers
 */
export const useDateInput = (setValue) => {
  const handlePaste = (e) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData("text");
    const formattedDate = handleDateInput(pastedText);
    setValue(formattedDate);
  };

  const handleChange = (e) => {
    const inputValue = e.target.value;

    // Allow user to type freely, only format when they blur or paste
    // Or format automatically if they've entered a complete date
    if (inputValue.length >= 8) {
      const formattedDate = handleDateInput(inputValue);
      setValue(formattedDate);
    } else {
      setValue(inputValue);
    }
  };

  const handleBlur = (e) => {
    const inputValue = e.target.value;
    if (inputValue) {
      const formattedDate = handleDateInput(inputValue);
      setValue(formattedDate);
    }
  };

  return {
    onPaste: handlePaste,
    onChange: handleChange,
    onBlur: handleBlur,
  };
};

/**
 * Convert date to ISO string for backend
 *
 * @param {string|Date} val - The date value
 * @returns {string} - ISO string or empty string
 */
export const toISOString = (val) => {
  const date = parseDate(val);
  return date ? date.toISOString() : "";
};
