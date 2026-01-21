# Invoice Multiple Array Implementation - Summary

## Date: 2025-12-31

## Changes Made to InvoiceMainTab.js

### Overview

Transformed the `InvoiceMainTab.js` component to support **multiple invoices as an array** with a UI that matches the `ProductMainTab.js` design pattern.

---

## Key Changes

### 1. **Data Structure**

- **Before**: Single invoice object accessed via `formik.values.invoices[0]`
- **After**: Array of invoice objects via `formik.values.invoices`
- Each invoice is stored as a separate object in the array
- Server schema already supports this: `invoices: [invoiceSchema]` ✅

### 2. **UI Design Pattern**

Adopted the ProductMainTab.js UI pattern:

- **Layout**: Table-based instead of card-based
- **Color Scheme**: Blue theme (`#16408f`) for headers
- **Sticky Headers**: Table headers remain visible while scrolling
- **Consistent Styling**: Matching button styles, inputs, and borders

### 3. **Style Updates**

```javascript
// New styles matching ProductMainTab:
- page: Light blue background (#f5f7fb)
- card: White card with border
- cardTitle: Blue (#16408f) title
- tableWrapper: Scrollable table container (maxHeight: 400px)
- table: Full-width table (minWidth: 1600px)
- th: Sticky blue header (#16408f background)
- td: Table cell with bottom border
- smallButton: Blue action buttons
- linkButton: Red delete buttons
```

### 4. **Features Implemented**

#### **Table Layout**

- Each invoice = one row in the table
- 13 columns:
  1. Sr No
  2. Invoice No
  3. Invoice Date
  4. TOI (Terms of Invoice)
  5. Place
  6. Currency
  7. Exchange Rate
  8. Price Includes
  9. Taxable Base (IGST)
  10. Invoice Value
  11. Product Value
  12. Packing / FOB
  13. Action (Copy/Delete buttons)

#### **CRUD Operations**

- ✅ **Add**: "+ Add New Invoice" button at bottom
- ✅ **Copy**: Duplicate an existing invoice (inserted after current)
- ✅ **Delete**: Remove invoice (minimum 1 required)
- ✅ **Edit**: All fields editable inline

#### **Logic Preserved**

- Currency rate auto-fetch based on job date
- TOI to PriceIncludes mapping
- Exchange rate propagation to freight/insurance charges
- Auto-save with debounce (800ms)

---

## Component Structure

```javascript
InvoiceMainTab
  └── <div style={styles.page}>
       └── <div style={styles.card}>
            ├── <div style={styles.cardTitle}>Invoice Items</div>
            ├── <div style={styles.tableWrapper}>
            │    └── <table>
            │         ├── <thead> (sticky blue header)
            │         └── <tbody>
            │              └── {invoices.map((invoice, index) => (
            │                   <tr> (one row per invoice)
            │                        └── <td> × 13 columns
            └── <button>+ Add New Invoice</button>
```

---

## Data Flow

### Adding Invoice

```javascript
addInvoice() → formik.setFieldValue("invoices", [...invoices, newInvoice])
```

### Editing Invoice

```javascript
handleInvChange(index, field, value) →
  updatedInvoices[index][field] = value →
  formik.setFieldValue("invoices", updatedInvoices)
```

### Deleting Invoice

```javascript
removeInvoice(index) →
  if (length > 1) →
  formik.setFieldValue("invoices", filtered array)
```

### Copying Invoice

```javascript
Copy button →
  updatedInvoices.splice(index + 1, 0, clonedInvoice) →
  formik.setFieldValue("invoices", updatedInvoices)
```

---

## Backend Compatibility

### Server Schema (ExJobModel.mjs)

```javascript
const invoiceSchema = new Schema(
  {
    invoiceNumber: { type: String },
    invoiceDate: { type: String, trim: true },
    termsOfInvoice: { type: String, default: "FOB" },
    toiPlace: { type: String, trim: true },
    currency: { type: String, ref: "Currency" },
    invoiceValue: { type: Number, min: 0 },
    productValue: { type: Number, min: 0 },
    priceIncludes: {
      type: String,
      enum: ["Both", "Freight", "Insurance", "None"],
      default: "Both",
    },
    packing_charges: { type: Number, default: 0 },
  },
  { _id: true },
);

// Used in main schema as:
invoices: [invoiceSchema]; // ✅ Already an array!
```

**No server-side changes needed!** The schema already supports multiple invoices.

---

## Visual Comparison

### Before (Card Layout)

```
┌─────────────────────────────────┐
│ INVOICES (1)    [+ Add Invoice] │
├─────────────────────────────────┤
│ ┌─────────────────────────────┐ │
│ │ Invoice #1        [Remove]  │ │
│ ├─────────────────────────────┤ │
│ │ Invoice No: [________]      │ │
│ │ Date: [________]            │ │
│ │ TOI: [________]             │ │
│ │ ...                         │ │
│ └─────────────────────────────┘ │
└─────────────────────────────────┘
```

### After (Table Layout) - Matches ProductMainTab

```
┌─────────────────────────────────────────────────────────────┐
│ Invoice Items                                               │
├─────┬───────────┬──────────┬─────┬────────┬─────────┬──────┤
│Sr No│Invoice No │   Date   │ TOI │ Place  │Currency │ ...  │
├─────┼───────────┼──────────┼─────┼────────┼─────────┼──────┤
│  1  │ [_______] │[________]│ [_] │ [____] │  [___]  │ [Btn]│
│  2  │ [_______] │[________]│ [_] │ [____] │  [___]  │ [Btn]│
└─────┴───────────┴──────────┴─────┴────────┴─────────┴──────┘
[+ Add New Invoice]
```

---

## Testing Checklist

- [x] Multiple invoices can be added
- [x] Each invoice can be edited independently
- [x] Invoice can be copied (duplicated)
- [x] Invoice can be deleted (minimum 1 enforced)
- [x] Currency changes propagate to exchange rate
- [x] TOI changes update Price Includes
- [x] UI matches ProductMainTab styling
- [x] Table is scrollable (horizontal and vertical)
- [x] Sticky header works on scroll
- [x] No syntax errors or lint issues

---

## Files Modified

1. **`/client/src/components/Export/Export-Dsr/Invoices/InvoiceMainTab.js`**
   - Complete UI overhaul
   - Changed from card-based to table-based layout
   - Added Copy functionality
   - Updated all styles to match ProductMainTab

## Files Unchanged

1. **`/server/model/export/ExJobModel.mjs`**
   - Already had `invoices: [invoiceSchema]` array support
   - No changes needed! ✅
