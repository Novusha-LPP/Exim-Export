import React, { useState, useEffect } from "react";
import axios from "axios";
import { styles } from "./commonStyles";
import { priorityFilter } from "../../../../utils/filterUtils";

function toUpper(val) {
  return (typeof val === "string" ? val : "")?.toUpperCase() || "";
}
function toUpperVal(e) {
  return e?.target?.value ? e.target.value.toUpperCase() : "";
}

const accessoryOptions = [
  "No Accessories",
  "Accessory Included",
  "Accessory Included in other item ",
];

const ProductOtherDetailsTab = ({ formik, selectedInvoiceIndex, idx = 0 }) => {
  const invoices = formik.values.invoices || [];
  const activeInvoice = invoices[selectedInvoiceIndex] || {};
  const products = activeInvoice.products || [];
  const product = products[idx] || {};
  const otherDetails = product.otherDetails || {};
  const thirdParty = otherDetails.thirdParty || {};
  const manufacturer = otherDetails.manufacturer || {};

  const [manufacturerList, setManufacturerList] = useState([]);
  const [showManufMenu, setShowManufMenu] = useState(false);
  const [filteredManufacturers, setFilteredManufacturers] = useState([]);
  const [manufKeyboardActive, setManufKeyboardActive] = useState(-1);
  const [organizations, setOrganizations] = useState([]);
  const [orgLoading, setOrgLoading] = useState(false);

  const handleChange = (field, value) => {
    const updatedInvoices = [...invoices];
    if (updatedInvoices[selectedInvoiceIndex]) {
      const updatedProducts = [
        ...(updatedInvoices[selectedInvoiceIndex].products || []),
      ];
      if (!updatedProducts[idx]) updatedProducts[idx] = {};
      updatedProducts[idx] = {
        ...updatedProducts[idx],
        otherDetails: { ...otherDetails, [field]: value },
      };
      updatedInvoices[selectedInvoiceIndex] = {
        ...updatedInvoices[selectedInvoiceIndex],
        products: updatedProducts,
      };
      formik.setFieldValue("invoices", updatedInvoices);
    }
  };

  const handleThirdPartyChange = (field, value) =>
    handleChange("thirdParty", { ...thirdParty, [field]: value });

  const handleManufacturerChange = (field, value) =>
    handleChange("manufacturer", { ...manufacturer, [field]: value });

  const isAccessoriesEnabled =
    otherDetails.accessories === "Accessory Included";
  const isThirdPartyEnabled = !!otherDetails.isThirdPartyExport;

  useEffect(() => {
    const fetchManufs = async () => {
      try {
        const res = await axios.get(`${import.meta.env.VITE_API_STRING}/dsr/manufacturers`);
        if (res.data?.success) setManufacturerList(res.data.data);
      } catch (e) {
        console.error("Error fetching manufacturers", e);
      }
    };
    fetchManufs();
  }, []);
  // fetch directory for third-party dropdown
  useEffect(() => {
    const fetchOrgs = async () => {
      try {
        setOrgLoading(true);
        const response = await axios.get(
          `${import.meta.env.VITE_API_STRING}/directory`
        );
        if (response.data?.success) {
          setOrganizations(response.data.data || []);
        }
      } catch (e) {
        console.error("Error fetching organizations for third party", e);
      } finally {
        setOrgLoading(false);
      }
    };
    fetchOrgs();
  }, []);

  // when user types/selects third party name
  const handleThirdPartyInput = (e) => {
    const val = toUpperVal(e);
    handleThirdPartyChange("name", val);

    const org = organizations.find(
      (o) => toUpper(o.organization || "") === val
    );
    if (!org) return;

    const branch = org.branchInfo?.[0] || {};
    const reg = org.registrationDetails || {};

    const auto = {
      name: toUpper(org.organization || ""),
      ieCode: toUpper(reg.ieCode || ""),
      branchSrNo: toUpper(branch.branchCode || ""),
      regnNo: toUpper(branch.gstNo || ""),
      address: toUpper(
        `${branch.address || ""}${branch.postalCode ? `, ${branch.postalCode}` : ""
        }`
      ),
    };

    handleChange("thirdParty", { ...thirdParty, ...auto });
  };
  const handleManufacturerInput = (e) => {
    const val = toUpperVal(e);
    handleManufacturerChange("name", val);

    const filtered = priorityFilter(manufacturerList, val, (m) => m.name);
    setFilteredManufacturers(filtered);
    setShowManufMenu(true);
    setManufKeyboardActive(-1);
  };

  const handleSelectManufacturer = (manuf) => {
    const updatedInvoices = [...invoices];
    const currentInvoice = updatedInvoices[selectedInvoiceIndex];

    if (currentInvoice && currentInvoice.products[idx]) {
      // Keep existing otherDetails (like thirdParty) but update manufacturer
      const existingOtherDetails = currentInvoice.products[idx].otherDetails || {};

      currentInvoice.products[idx].otherDetails = {
        ...existingOtherDetails,
        manufacturer: {
          name: toUpper(manuf.name),
          code: toUpper(manuf.code || ""),
          address: toUpper(manuf.address || ""),
          country: toUpper(manuf.country || ""),
          stateProvince: toUpper(manuf.stateProvince || ""),
          postalCode: toUpper(manuf.postalCode || ""),
          sourceState: toUpper(manuf.sourceState || ""),
          transitCountry: toUpper(manuf.transitCountry || ""),
        }
      };

      formik.setFieldValue("invoices", updatedInvoices);
    }

    setShowManufMenu(false);
    setManufKeyboardActive(-1);
  };
  return (
    <div style={styles.card}>
      <div style={styles.cardTitle}>Other Product Details</div>

      {/* Accessories */}
      <div style={styles.subSectionTitle}>ACCESSORIES</div>
      <div style={styles.grid3}>
        <div style={styles.field}>
          <div style={styles.label}>Accessories</div>
          <select
            style={styles.select}
            value={otherDetails.accessories || "No Accessories"}
            onChange={(e) => handleChange("accessories", e.target.value)}
          >
            {accessoryOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>
        {/* remarks full-width under accessories, like screenshot */}
      </div>
      <div style={styles.grid3}>
        <div style={{ ...styles.field, gridColumn: "1 / 4" }}>
          <div style={styles.label}>Remarks</div>
          <textarea
            style={{
              ...styles.textarea,
              backgroundColor: isAccessoriesEnabled ? "white" : "#f0f0f0",
            }}
            rows={2}
            disabled={!isAccessoriesEnabled}
            value={otherDetails.accessoriesRemarks || ""}
            onChange={(e) => handleChange("accessoriesRemarks", e.target.value)}
          />
        </div>
      </div>

      {/* Third Party + Manufacturer in two columns */}
      <div style={{ ...styles.grid2, alignItems: "flex-start", gap: 32 }}>
        {/* LEFT: Third Party Export */}
        <div style={{ width: "100%" }}>
          <div style={styles.subSectionTitle}>Third Party EXPORT</div>
          <label style={styles.inlineCheckbox}>
            <input
              type="checkbox"
              style={styles.checkbox}
              checked={isThirdPartyEnabled}
              onChange={(e) =>
                handleChange("isThirdPartyExport", e.target.checked)
              }
            />
            Third Party EXPORT
          </label>

          {/* Name row */}
          <div style={styles.grid3}>
            <div style={{ ...styles.field, gridColumn: "1 / 4" }}>
              <div style={styles.label}>
                Name {orgLoading ? "(Loading...)" : ""}
              </div>
              <select
                style={styles.input}
                disabled={!isThirdPartyEnabled}
                value={thirdParty.name || ""}
                onChange={(e) => {
                  const val = toUpperVal(e);
                  handleThirdPartyChange("name", val);

                  const org = organizations.find(
                    (o) => toUpper(o.organization || "") === val
                  );
                  if (!org) return;

                  const branch = org.branchInfo?.[0] || {};
                  const reg = org.registrationDetails || {};

                  handleChange("thirdParty", {
                    ...thirdParty,
                    name: toUpper(org.organization || ""),
                    ieCode: toUpper(reg.ieCode || ""),
                    branchSrNo: toUpper(branch.branchCode || ""),
                    regnNo: toUpper(branch.gstNo || ""),
                    address: toUpper(
                      `${branch.address || ""}${branch.postalCode ? `, ${branch.postalCode}` : ""
                      }`
                    ),
                  });
                }}
              >
                <option value="">-- SELECT --</option>
                {organizations.map((o) => (
                  <option
                    key={o._id || o.organization}
                    value={toUpper(o.organization || "")}
                  >
                    {toUpper(o.organization || "")}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* IE Code / Branch SNo / Regn No row */}
          <div style={styles.grid3}>
            <div style={styles.field}>
              <div style={styles.label}>IE Code</div>
              <input
                style={styles.input}
                disabled={!isThirdPartyEnabled}
                value={thirdParty.ieCode || ""}
                onChange={(e) =>
                  handleThirdPartyChange("ieCode", e.target.value)
                }
              />
            </div>
            <div style={styles.field}>
              <div style={styles.label}>Branch SNo</div>
              <input
                style={styles.input}
                disabled={!isThirdPartyEnabled}
                value={thirdParty.branchSrNo || ""}
                onChange={(e) =>
                  handleThirdPartyChange("branchSrNo", e.target.value)
                }
              />
            </div>
            <div style={styles.field}>
              <div style={styles.label}>Regn. No</div>
              <input
                style={styles.input}
                disabled={!isThirdPartyEnabled}
                value={thirdParty.regnNo || ""}
                onChange={(e) =>
                  handleThirdPartyChange("regnNo", e.target.value)
                }
              />
            </div>
          </div>

          {/* Address row */}
          <div style={styles.grid3}>
            <div style={{ ...styles.field, gridColumn: "1 / 4" }}>
              <div style={styles.label}>Address</div>
              <textarea
                style={styles.textarea}
                rows={2}
                disabled={!isThirdPartyEnabled}
                value={thirdParty.address || ""}
                onChange={(e) =>
                  handleThirdPartyChange("address", e.target.value)
                }
              />
            </div>
          </div>
        </div>

        {/* RIGHT: Manufacturer / Producer / Grower */}
        {/* RIGHT: Manufacturer / Producer / Grower */}
        <div style={{ width: "100%" }}>
          <div style={styles.subSectionTitle}>
            Manufacturer / Producer / Grower Details
          </div>

          {/* Name / Code / Address */}
          <div style={styles.grid3}>
            <div style={{ ...styles.field, position: "relative" }}>
              <div style={styles.label}>Name</div>
              <input
                style={styles.input}
                value={manufacturer.name || ""}
                autoComplete="off"
                placeholder="Type Manufacturer Name..."
                onChange={handleManufacturerInput} // Link to the new input handler
                onFocus={() => {
                  setFilteredManufacturers(manufacturerList);
                  setShowManufMenu(true);
                }}
                onBlur={() => {
                  // Timeout allows the onMouseDown of the list to trigger before hiding
                  setTimeout(() => setShowManufMenu(false), 200);
                }}
                onKeyDown={(e) => {
                  if (!showManufMenu) return;
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setManufKeyboardActive((a) => Math.min(filteredManufacturers.length - 1, a + 1));
                  } else if (e.key === "ArrowUp") {
                    e.preventDefault();
                    setManufKeyboardActive((a) => Math.max(0, a - 1));
                  } else if (e.key === "Enter" && manufKeyboardActive >= 0) {
                    e.preventDefault();
                    handleSelectManufacturer(filteredManufacturers[manufKeyboardActive]);
                  } else if (e.key === "Escape") {
                    setShowManufMenu(false);
                  }
                }}
              />

              {/* Autocomplete Dropdown Menu */}
              {showManufMenu && filteredManufacturers.length > 0 && (
                <div
                  style={{
                    position: "absolute",
                    left: 0,
                    right: 0,
                    top: "100%",
                    background: "#fff",
                    border: "1px solid #cbd5e1",
                    borderRadius: 3,
                    zIndex: 50,
                    maxHeight: 180,
                    overflow: "auto",
                    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                  }}
                >
                  {filteredManufacturers.map((m, i) => (
                    <div
                      key={i}
                      style={{
                        padding: "6px 10px",
                        cursor: "pointer",
                        fontSize: 12,
                        background: manufKeyboardActive === i ? "#e5edff" : "#fff",
                        fontWeight: manufKeyboardActive === i ? 600 : 400,
                        borderBottom: "1px solid #f1f5f9",
                      }}
                      onMouseDown={() => handleSelectManufacturer(m)}
                      onMouseEnter={() => setManufKeyboardActive(i)}
                    >
                      <div style={{ color: "#334155" }}>{toUpper(m.name)}</div>
                      {m.address && (
                        <div style={{ fontSize: 10, color: "#64748b", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {toUpper(m.address)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={styles.field}>
              <div style={styles.label}>Code</div>
              <input
                style={styles.input}
                value={manufacturer.code || ""}
                onChange={(e) => handleManufacturerChange("code", toUpperVal(e))}
              />
            </div>

            <div style={{ ...styles.field, gridColumn: "1 / 4" }}>
              <div style={styles.label}>Address</div>
              <input
                style={styles.input}
                value={manufacturer.address || ""}
                onChange={(e) => handleManufacturerChange("address", toUpperVal(e))}
              />
            </div>
          </div>

          {/* Country / State / Postal / Source State */}
          <div style={styles.grid3}>
            <div style={styles.field}>
              <div style={styles.label}>Country</div>
              <input
                style={styles.input}
                value={manufacturer.country || ""}
                onChange={(e) => handleManufacturerChange("country", toUpperVal(e))}
              />
            </div>
            <div style={styles.field}>
              <div style={styles.label}>State/Province</div>
              <input
                style={styles.input}
                value={manufacturer.stateProvince || ""}
                onChange={(e) => handleManufacturerChange("stateProvince", toUpperVal(e))}
              />
            </div>
            <div style={styles.field}>
              <div style={styles.label}>Postal Code</div>
              <input
                style={styles.input}
                value={manufacturer.postalCode || ""}
                onChange={(e) => handleManufacturerChange("postalCode", toUpperVal(e))}
              />
            </div>
          </div>

          <div style={styles.grid3}>
            <div style={styles.field}>
              <div style={styles.label}>Source State</div>
              <input
                style={styles.input}
                value={manufacturer.sourceState || ""}
                onChange={(e) => handleManufacturerChange("sourceState", toUpperVal(e))}
              />
            </div>
            <div style={{ ...styles.field, gridColumn: "2 / 4" }}>
              <div style={styles.label}>Transit Country</div>
              <input
                style={styles.input}
                value={manufacturer.transitCountry || ""}
                onChange={(e) => handleManufacturerChange("transitCountry", toUpperVal(e))}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductOtherDetailsTab;
