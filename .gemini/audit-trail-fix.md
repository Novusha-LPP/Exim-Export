# Audit Trail Object Tracking Fix

## Problem
When updating fields inside objects or arrays, the audit trail was showing "[object Object]" instead of the actual field names and values. This made it impossible to know which specific field within an object was being updated.

### Example of the Issue:
- **Before**: `milestones.0 was set to "[object Object]"`
- **After**: `milestones.0.milestone_name was set to "Shipment Received"`

## Solution

### 1. Backend Changes (auditTrail.mjs)

**File**: `server/middleware/auditTrail.mjs`

**Change**: Modified the `findChanges` function to recursively drill down into objects when array items are added or removed.

**What it does**:
- When a new object is added to an array, instead of storing the entire object, it now recursively finds all individual fields
- When an object is removed from an array, it recursively finds all fields that were removed
- This ensures we track changes at the field level (e.g., `milestones.0.milestone_name`) instead of the object level (e.g., `milestones.0`)

**Code Changes** (lines 156-187):
```javascript
if (i >= oldDoc.length) {
  // New item added - recursively find all fields in the new item
  if (typeof newDoc[i] === "object" && newDoc[i] !== null && !Array.isArray(newDoc[i])) {
    // It's an object, drill down to individual fields
    findChanges(undefined, newDoc[i], currentPath, changes);
  } else {
    // It's a primitive or array, log it directly
    changes.push({
      field: currentPath,
      fieldPath: currentPath,
      oldValue: undefined,
      newValue: newDoc[i],
      changeType: "ADDED",
    });
  }
}
```

### 2. Frontend Changes (AuditTrailViewer.js)

**File**: `client/src/components/audit/AuditTrailViewer.js`

**Changes**:
1. Added `formatValue` helper function to properly format objects, arrays, and primitive values
2. Updated `formatChangeDescription` to use `fieldPath` instead of `field` for more detailed path information
3. Applied `formatValue` to both old and new values before displaying

**What it does**:
- Converts objects to readable JSON strings instead of "[object Object]"
- Shows the complete field path (e.g., `milestones.0.milestone_name` instead of just `milestone_name`)
- Handles null/undefined values gracefully

**Code Changes** (lines 437-469):
```javascript
// Helper function to format values for display
const formatValue = (value) => {
  if (value === null || value === undefined) {
    return "null";
  }
  if (typeof value === "object") {
    try {
      return JSON.stringify(value, null, 2);
    } catch (e) {
      return String(value);
    }
  }
  return String(value);
};

const formatChangeDescription = (change, timestamp) => {
  const time = format(new Date(timestamp), "HH:mm");
  // Use fieldPath for more detailed path information, fallback to field
  const fieldName = change.fieldPath || change.field;
  
  const oldValueFormatted = formatValue(change.oldValue);
  const newValueFormatted = formatValue(change.newValue);
  
  switch (change.changeType) {
    case "ADDED":
      return `${fieldName} was set to "${newValueFormatted}" at ${time}`;
    case "MODIFIED":
      return `${fieldName} was updated from "${oldValueFormatted}" to "${newValueFormatted}" at ${time}`;
    case "REMOVED":
      return `${fieldName} was removed (previous value: "${oldValueFormatted}") at ${time}`;
    // ... other cases
  }
};
```

## Benefits

1. **Precise Tracking**: You can now see exactly which field was changed at which index
   - Example: `milestones.2.milestone_date` instead of `milestones.2`

2. **Readable Values**: Object values are displayed as formatted JSON instead of "[object Object]"

3. **Better Debugging**: When troubleshooting issues, you can see the exact field path and values

4. **Improved User Experience**: Users can clearly understand what changed in their data

## Testing

To test the changes:
1. Update a field inside an object array (e.g., change a milestone name)
2. Check the audit trail - you should now see:
   - The complete field path (e.g., `milestones.0.milestone_name`)
   - The actual old and new values
   - No more "[object Object]" messages

## Example Output

**Before**:
```
milestones.0 was set to "[object Object]" at 16:04
milestones.1 was set to "[object Object]" at 16:04
```

**After**:
```
milestones.0.milestone_name was set to "Booking Confirmed" at 16:04
milestones.0.milestone_date was set to "2025-12-23" at 16:04
milestones.1.milestone_name was set to "Container Loaded" at 16:04
milestones.1.milestone_date was set to "2025-12-24" at 16:04
```
