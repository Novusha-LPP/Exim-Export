export const formMasterList = [
  "Add a vendor",
  "Add a vehicle",
  "Tyre types",
  "Tyre sizes",
  "Tyre brands",
  "Tyre models",
  "Repair types",
  "Ply ratings",
  "Driver details",
  "Type of vehicle",
  "Container type",
  "Location master",
  "Organisation master",
];

export const viewMasterList = [
  // "General Information",
  // "Contact Information",
  // "Account Information",
  // "Bank Details",
  "Organization",
  "State Code",
  "Airline Code",
  "Country Code",
  "ITCHS and Standard UQC",
  "Shipping Line Code",
  "Scheme Code",
  "Custom EDI Location",
  "Custom Non-EDI Location",
  "Port Code-Sea",
  "Port Code-Air",
  "Unit Quantity Code (UQC)",
  "Currency",
  "Package",
  "Supporting Document Codes",
  "Gateway Port",
  "District Code"
];

export const directoryFields = {
  "Unit Measurement": [
    { name: "name", label: "Name", type: "text" },
    { name: "symbol", label: "Symbol", type: "text" },
    {
      name: "unit_type",
      label: "Unit Type",
      type: "select",
      options: [
        "number",
        "weight",
        "distance",
        "volume",
        "area",
        "time",
        "pressure",
        "power",
        "temperature",
      ],
    },
    { name: "decimal_places", label: "No. of Decimal Places", type: "number" },
  ],

  "Container Type": [
    { name: "container_type", label: "Container Type", type: "text" },
    { name: "iso_code", label: "ISO Code", type: "text" },
    { name: "teu", label: "TEU", type: "number", min: 1 },
    { name: "outer_dimension", label: "Outer Dimension", type: "text" },
    { name: "tare_weight", label: "Tare Weight", type: "number", min: 0 },
    { name: "payload", label: "Payload", type: "number", min: 0 },
  ],
  Location: [
    // ✅ Location Fields Added
    { name: "name", label: "Name", type: "text", disabled: true },
    {
      name: "postal_code",
      label: "Postal Code * (Enter correct PIN to auto-fill other details)",
      type: "text",
    },
    { name: "city", label: "Taluka", type: "text", disabled: true },
    { name: "district", label: "District", type: "text", disabled: true },
    { name: "state", label: "State", type: "text", disabled: true },
    { name: "country", label: "Country", type: "text", disabled: true },
  ],
  "State District": [
    { name: "state", label: "State Name", type: "text" },
    { name: "districts", label: "Districts", type: "multi-select" },
  ],
};
