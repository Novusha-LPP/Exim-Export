# Global Date Formatting System

This project now has a centralized date formatting system that ensures all dates are displayed and handled consistently across the application.

## Overview

All date fields in the application now:

- Display in **dd/MM/yyyy** format
- Accept dates in multiple formats (ISO, dd/MM/yyyy, MM/dd/yyyy, yyyy-MM-dd, etc.)
- Automatically convert pasted dates to dd/MM/yyyy format
- Handle string dates with or without timestamps

## Files

- **`/client/src/utils/dateUtils.js`** - Global date utility functions
- **`/client/src/components/common/DateInput.js`** - Updated DateInput component with auto-formatting

## Usage

### 1. Displaying Dates (Read-only)

Use `formatDate()` to display dates from the backend:

```javascript
import { formatDate } from "../../../utils/dateUtils";

// In your component
&lt;div&gt;{formatDate(job.sb_date)}&lt;/div&gt;
&lt;div&gt;{formatDate(job.invoices?.[0]?.invoiceDate)}&lt;/div&gt;
```

**What it does:**

- Accepts any date format (ISO string, timestamp, date string, etc.)
- Returns formatted string in dd/MM/yyyy format
- Returns empty string if date is invalid or null

### 2. Date Input Fields

Use the `DateInput` component for editable date fields:

```javascript
import DateInput from "../components/common/DateInput";

function MyForm() {
  const [sbDate, setSbDate] = useState("");

  return (
    &lt;DateInput
      value={sbDate}
      onChange={(e) =&gt; setSbDate(e.target.value)}
      name="sbDate"
      placeholder="dd/MM/yyyy"
    /&gt;
  );
}
```

**Features:**

- Type a date in any format
- Paste a date from Excel/clipboard - it will auto-convert to dd/MM/yyyy
- Double-click to open native date picker
- Auto-formats on blur

### 3. Sending Dates to Backend

Use `toISOString()` to convert dates for backend:

```javascript
import { toISOString } from "../../../utils/dateUtils";

const handleSubmit = async () =&gt; {
  const payload = {
    sb_date: toISOString(sbDate),  // Converts to ISO string
    invoice_date: toISOString(invoiceDate),
  };

  await axios.post("/api/jobs", payload);
};
```

### 4. Parsing Dates

Use `parseDate()` to convert strings to Date objects:

```javascript
import { parseDate } from "../../../utils/dateUtils";

const date = parseDate("31/12/2024"); // Returns Date object
```

### 5. Custom Input with Paste Handler

If you need a custom input field (not using DateInput component):

```javascript
import { useDateInput } from "../../../utils/dateUtils";

function MyCustomInput() {
  const [date, setDate] = useState("");
  const dateHandlers = useDateInput(setDate);

  return (
    &lt;input
      type="text"
      value={date}
      {...dateHandlers}  // Adds onPaste, onChange, onBlur handlers
      placeholder="dd/MM/yyyy"
    /&gt;
  );
}
```

## Supported Input Formats

The system automatically recognizes and converts these formats:

- **ISO Formats:** `2024-12-31T00:00:00.000Z`, `2024-12-31`
- **dd/MM/yyyy:** `31/12/2024`, `31-12-2024`, `31.12.2024`
- **d/M/yyyy:** `1/1/2024`, `1-1-2024`
- **MM/dd/yyyy:** `12/31/2024`, `12-31-2024`
- **yyyy/MM/dd:** `2024/12/31`

All are converted to: **dd/MM/yyyy** (e.g., `31/12/2024`)

## Example: Complete Form

```javascript
import React, { useState } from "react";
import DateInput from "../components/common/DateInput";
import { toISOString, formatDate } from "../utils/dateUtils";
import axios from "axios";

function JobForm({ initialData }) {
  const [formData, setFormData] = useState({
    sbDate: formatDate(initialData?.sb_date) || "",
    invoiceDate: formatDate(initialData?.invoice_date) || "",
  });

  const handleChange = (field) =&gt; (e) =&gt; {
    setFormData({ ...formData, [field]: e.target.value });
  };

  const handleSubmit = async (e) =&gt; {
    e.preventDefault();

    const payload = {
      sb_date: toISOString(formData.sbDate),
      invoice_date: toISOString(formData.invoiceDate),
    };

    await axios.post("/api/jobs", payload);
  };

  return (
    &lt;form onSubmit={handleSubmit}&gt;
      &lt;DateInput
        value={formData.sbDate}
        onChange={handleChange("sbDate")}
        name="sbDate"
      /&gt;

      &lt;DateInput
        value={formData.invoiceDate}
        onChange={handleChange("invoiceDate")}
        name="invoiceDate"
      /&gt;

      &lt;button type="submit"&gt;Save&lt;/button&gt;
    &lt;/form&gt;
  );
}
```

## Migration Guide

### Before:

```javascript
import { format, parseISO, isValid } from "date-fns";

const safeDate = (val) =&gt; {
  if (!val) return "";
  try {
    const date = parseISO(val);
    return isValid(date) ? format(date, "dd/MM/yyyy") : "";
  } catch (e) {
    return "";
  }
};

&lt;div&gt;{safeDate(job.sb_date)}&lt;/div&gt;
```

### After:

```javascript
import { formatDate } from "../../../utils/dateUtils";

&lt;div&gt;{formatDate(job.sb_date)}&lt;/div&gt;
```

## Changes Made

### 1. ExportJobsTable.js

- Replaced local `safeDate` function with global `formatDate`
- All date displays now use `formatDate()`
- Fixed SB date column to show dates even for string values without timestamps

### 2. DateInput Component

- Added automatic paste conversion
- Added auto-formatting on blur
- Supports multiple input formats
- Uses global date utility functions

### 3. New Date Utility

- Created `/client/src/utils/dateUtils.js`
- Provides consistent date formatting across the app
- Handles all edge cases (nulls, invalid dates, various formats)

## Benefits

1. **Consistency:** All dates display in the same format
2. **User-Friendly:** Paste dates from anywhere, they'll auto-convert
3. **Robust:** Handles edge cases like null values, invalid dates, etc.
4. **Maintainable:** Centralized logic, easy to update
5. **Flexible:** Accepts dates in many formats

## Notes

- Date format is **dd/MM/yyyy** (day/month/year)
- All dates stored in backend should be ISO strings
- Use `formatDate()` for display, `toISOString()` for submission
- The DateInput component is backward compatible with existing forms
