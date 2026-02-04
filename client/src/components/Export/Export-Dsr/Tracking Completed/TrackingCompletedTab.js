import React, { useRef, useCallback, useState, useEffect } from "react";
import DateInput from "../../../common/DateInput.js";

const getMilestones = (isAir) => [
  "SB Filed",
  "SB Receipt",
  "L.E.O",
  isAir ? "File Handover to IATA" : "Container HO to Concor",
  isAir ? "Departure" : "Rail Out",
  "Ready for Billing",
  "Billing Done",
];

const getMandatoryNames = (isAir) =>
  new Set(["SB Filed", "SB Receipt", "L.E.O", "Ready for Billing"]);

const TrackingCompletedTab = ({ formik, directories, params }) => {
  const [filter, setFilter] = useState("Show All");
  const [exportJobsUsers, setExportJobsUsers] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(0); // Default to first milestone

  const handleFieldChange = (field, value) => {
    formik.setFieldValue(field, value);
  };

  // Fetch users with export-jobs module assigned
  useEffect(() => {
    const fetchExportJobsUsers = async () => {
      try {
        const response = await fetch(
          `${import.meta.env.VITE_API_STRING}/export-jobs-module-users`
        );
        if (response.ok) {
          const data = await response.json();
          setExportJobsUsers(data.data || []);
        }
      } catch (error) {
        console.error("Error fetching export-jobs module users:", error);
      }
    };

    fetchExportJobsUsers();
  }, []);

  // 🔑 FIXED: Initialize milestones only after data is loaded
  // We need to detect when real data comes in vs initial empty state
  const hasInitializedRef = useRef(false);

  const consignmentType = (formik.values.consignmentType || "").toUpperCase();
  const isAir = consignmentType === "AIR";

  const currentBaseMilestones = getMilestones(isAir);
  const currentMandatory = getMandatoryNames(isAir);

  // Define all possible system milestones to distinguish from custom ones
  const ALL_SYSTEM_MILESTONES = new Set([
    "SB Filed",
    "SB Receipt",
    "L.E.O",
    "File Handover to IATA",
    "Container HO to Concor",
    "Departure",
    "Rail Out",
    "Ready for Billing",
    "Billing Done",
  ]);

  useEffect(() => {
    const ms = formik.values.milestones || [];
    const currentModeNames = new Set(currentBaseMilestones);

    // Check if we need to update:
    // 1. If not initialized yet (handled by ref check logic below combined with RealData check)
    // 2. If the current milestones don't match the current mode's requirements (e.g. missing "Departure" when AIR)
    // 3. If the current milestones contain "invalid" system milestones for this mode (e.g. "Rail Out" when AIR)

    const isMissingRequired = !currentBaseMilestones.every((name) =>
      ms.some((m) => m.milestoneName === name)
    );

    const hasInvalidSystem = ms.some(
      (m) =>
        ALL_SYSTEM_MILESTONES.has(m.milestoneName) &&
        !currentModeNames.has(m.milestoneName)
    );

    // If perfectly aligned, do nothing
    if (hasInitializedRef.current && !isMissingRequired && !hasInvalidSystem) {
      return;
    }

    // Determine if we are loading real data from server
    const hasRealData = ms.length > 0 && ms.some((m) => m._id);

    // If we haven't initialized and there's no real data, set defaults
    if (!hasInitializedRef.current && ms.length === 0) {
      const defaults = currentBaseMilestones.map((name) => ({
        milestoneName: name,
        actualDate: "",
        isCompleted: false,
        isMandatory: currentMandatory.has(name),
        completedBy: "",
        remarks: "",
      }));
      formik.setFieldValue("milestones", defaults);
      // We don't set initialized=true here ideally until we are sure data loaded,
      // but for new jobs this is the init state.
      // However, to be safe against late-loading data, we usually wait for an ID or explicit 'loaded' flag.
      // Assuming if no milestones, we just set defaults.
      return;
    }

    // Logic for Merging / switching modes
    // 1. Create Map of existing milestones
    const byName = new Map(ms.map((m) => [m.milestoneName, m]));

    // 2. Generate the new base list (preserving existing data if name matches)
    const basePart = currentBaseMilestones.map((name) => {
      const existing = byName.get(name);
      return (
        existing || {
          milestoneName: name,
          actualDate: "",
          isCompleted: false,
          isMandatory: currentMandatory.has(name),
          completedBy: "",
          remarks: "",
        }
      );
    });

    // 3. Keep custom milestones (those not in system list)
    // We filter out any milestone that is a SYSTEM milestone but NOT in the current mode
    const extras = ms.filter((m) => {
      const name = m.milestoneName;
      // Keep if it is in the current base set (already handled in basePart? No, basePart creates NEW array)
      // Wait, basePart contains the *system* milestones for current mode.
      // We want 'extras' to be ONLY non-system milestones.

      // If it's a system milestone, we only keep it if it's in the current mode (which is handled by basePart).
      // Actually, if we put it in basePart, we don't want it in extras.

      if (currentModeNames.has(name)) return false; // Already in basePart

      // If it is a known system milestone but NOT in current mode (e.g. "Rail Out" when AIR), DROP IT.
      if (ALL_SYSTEM_MILESTONES.has(name)) return false;

      // Otherwise it's a user-custom milestone, KEEP IT.
      return true;
    });

    formik.setFieldValue("milestones", [...basePart, ...extras]);
    hasInitializedRef.current = true;
  }, [
    // Depend on the mode-derived lists
    currentBaseMilestones,
    currentMandatory,
    // And formik values - but be careful of loops.
    // The checks inside (isMissingRequired, hasInvalidSystem) prevent infinite loops
    // because once we align, those become false.
    formik.values.milestones,
  ]);

  const handleMilestoneChange = (index, updates) => {
    const current = formik.values.milestones || [];
    const milestones = [...current];
    milestones[index] = { ...milestones[index], ...updates };
    formik.setFieldValue("milestones", milestones);
  };

  const addCustomMilestone = () => {
    const name = window.prompt("Enter new milestone name");
    if (!name) return;
    const current = formik.values.milestones || [];
    const milestones = [
      ...current,
      {
        milestoneName: name,

        actualDate: "",
        isCompleted: false,
        isMandatory: false,
        completedBy: "",
        remarks: "",
      },
    ];
    formik.setFieldValue("milestones", milestones);
  };

  const allMilestones = formik.values.milestones || [];
  const visibleMilestones =
    filter === "Completed Only"
      ? allMilestones.filter((m) => m.isCompleted)
      : filter === "Pending Only"
        ? allMilestones.filter((m) => !m.isCompleted)
        : allMilestones;

  return (
    <div
      style={{
        fontFamily:
          "system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
        fontSize: 12,
        background: "#f5f7fb",
        padding: 12,
        boxSizing: "border-box",
      }}
    >
      {/* Header band - SAME AS BEFORE */}
      <div
        style={{
          background: "#ffffff",
          borderRadius: 4,
          border: "1px solid #d0d7e2",
          padding: "10px 12px",
          marginBottom: 10,
          display: "grid",
          gridTemplateColumns: "260px 1fr 260px",
          columnGap: 12,
          alignItems: "center",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontWeight: 600 }}>Job Tracking Completed</span>
            <input
              type="checkbox"
              checked={formik.values.isJobtrackingEnabled ?? false}
              onChange={(e) => {
                if (e.target.checked) {
                  handleFieldChange("isJobtrackingEnabled", true);
                  handleFieldChange("isJobCanceled", false);
                } else {
                  handleFieldChange("isJobtrackingEnabled", false);
                }
              }}
              disabled={formik.values.isJobCanceled ?? false}
              style={{
                cursor:
                  formik.values.isJobCanceled ?? false
                    ? "not-allowed"
                    : "pointer",
              }}
            />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontWeight: 600 }}>Job Canceled</span>
            <input
              type="checkbox"
              checked={formik.values.isJobCanceled ?? false}
              onChange={(e) => {
                if (e.target.checked) {
                  handleFieldChange("isJobCanceled", true);
                  handleFieldChange("isJobtrackingEnabled", false);
                } else {
                  handleFieldChange("isJobCanceled", false);
                }
              }}
              disabled={formik.values.isJobtrackingEnabled ?? false}
              style={{
                cursor:
                  formik.values.isJobtrackingEnabled ?? false
                    ? "not-allowed"
                    : "pointer",
              }}
            />
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontWeight: 600 }}>Lock Job</span>
            <input
              type="checkbox"
              checked={formik.values.isLocked ?? false}
              onChange={(e) => {
                if (e.target.checked) {
                  if (window.confirm("Do you wanna lock this job?")) {
                    handleFieldChange("isLocked", true);
                  }
                } else {
                  if (window.confirm("Do you wanna unlock this job?")) {
                    handleFieldChange("isLocked", false);
                  }
                }
              }}
              style={{ cursor: "pointer" }}
            />
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>

        </div>
        <div>
          <div style={{ marginBottom: 4, fontWeight: 500 }}>
            Customer Remark
          </div>
          <textarea
            rows={2}
            style={{
              width: "100%",
              fontSize: 12,
              padding: "4px 6px",
              borderRadius: 3,
              border: "1px solid #c4cdd7",
              resize: "none",
            }}
            value={formik.values.customerremark || ""}
            onChange={(e) =>
              handleFieldChange("customerremark", e.target.value)
            }
          />
        </div>
      </div>

      {/* REST OF JSX REMAINS IDENTICAL - Milestones table, right panel, etc. */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 2fr) 280px",
          columnGap: 10,
          alignItems: "flex-start",
        }}
      >
        {/* Milestones table - SAME AS BEFORE */}
        <div
          style={{
            background: "#ffffff",
            borderRadius: 4,
            border: "1px solid #d0d7e2",
            padding: 8,
            boxShadow: "0 1px 2px rgba(15,23,42,0.04)",
          }}
        >
          <div style={{ marginBottom: 6, fontWeight: 600 }}>Milestones</div>
          <div
            style={{
              border: "1px solid #d0d7e2",
              borderRadius: 3,
              overflow: "hidden",
              background: "#fbfcff",
            }}
          >
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                tableLayout: "fixed",
              }}
            >
              <colgroup>
                <col style={{ width: "55%" }} />
                <col style={{ width: "35%" }} />
                <col style={{ width: "10%" }} />
              </colgroup>
              <thead>
                <tr style={{ background: "#e4ecf7" }}>
                  <th
                    style={{
                      padding: "6px 8px",
                      textAlign: "left",
                      fontWeight: 600,
                    }}
                  >
                    Milestone Name
                  </th>
                  <th
                    style={{
                      padding: "6px 8px",
                      textAlign: "left",
                      fontWeight: 600,
                    }}
                  >
                    Actual Date
                  </th>
                  <th
                    style={{
                      padding: "6px 8px",
                      textAlign: "center",
                      fontWeight: 600,
                    }}
                  >
                    Done
                  </th>
                </tr>
              </thead>
              <tbody>
                {visibleMilestones.map((m, idx) => {
                  const realIndex = allMilestones.indexOf(m);
                  const isBase = currentBaseMilestones.includes(
                    m.milestoneName
                  );
                  const isSelected = selectedIndex === realIndex;
                  return (
                    <tr
                      key={realIndex}
                      onClick={() => setSelectedIndex(realIndex)}
                      style={{
                        background: isSelected
                          ? "#e0e7ff"
                          : idx % 2 === 0
                            ? "#ffffff"
                            : "#f7f9fc",
                        borderTop: "1px solid #e1e7f0",
                        cursor: "pointer",
                      }}
                    >
                      <td style={{ padding: "5px 8px", whiteSpace: "nowrap" }}>
                        {m.isMandatory && (
                          <span style={{ color: "#e11d48", marginRight: 4 }}>
                            *
                          </span>
                        )}
                        <span style={{ fontWeight: isBase ? 500 : 400 }}>
                          {m.milestoneName}
                        </span>
                      </td>
                      <td style={{ padding: "4px 8px" }}>
                        <DateInput
                          style={{
                            width: "100%",
                            fontSize: 12,
                            padding: "3px 6px",
                            border: "1px solid #bdc7d1",
                            borderRadius: 3,
                            height: 24,
                            background:
                              m.actualDate &&
                                m.actualDate !== "dd-mm-yyyy" &&
                                m.actualDate !== ""
                                ? "#ecfdf3"
                                : "#ffffff",
                          }}
                          value={m.actualDate || ""}
                          withTime={false}
                          onChange={(e) => {
                            const v = e.target.value;
                            if (!v) {
                              handleMilestoneChange(realIndex, {
                                actualDate: "",
                              });
                              return;
                            }
                            handleMilestoneChange(realIndex, { actualDate: v });
                          }}
                        />
                      </td>
                      <td
                        style={{ textAlign: "center" }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          checked={!!m.isCompleted}
                          onChange={(e) => {
                            const isChecked = e.target.checked;
                            const updates = { isCompleted: isChecked };

                            if (isChecked) {
                              // Smart detection: If empty or starts with "dd-", it's a placeholder
                              const isPlaceholder =
                                !m.actualDate ||
                                String(m.actualDate)
                                  .toLowerCase()
                                  .startsWith("dd-");

                              if (isPlaceholder) {
                                const d = new Date();
                                const day = String(d.getDate()).padStart(
                                  2,
                                  "0"
                                );
                                const month = String(d.getMonth() + 1).padStart(
                                  2,
                                  "0"
                                );
                                const year = d.getFullYear();
                                updates.actualDate = `${day}-${month}-${year}`;
                              }
                            } else {
                              updates.actualDate = "";
                            }

                            handleMilestoneChange(realIndex, updates);
                          }}
                          style={{ cursor: "pointer" }}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div
            style={{
              marginTop: 6,
              display: "flex",
              alignItems: "center",
              gap: 6,
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", gap: 6 }}>
              <button
                type="button"
                onClick={addCustomMilestone}
                style={{
                  fontSize: 11,
                  padding: "4px 10px",
                  borderRadius: 3,
                  border: "1px solid #4b5563",
                  background: "#ffffff",
                  color: "#111827",
                  cursor: "pointer",
                }}
              >
                + Add Milestone
              </button>
            </div>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              style={{
                fontSize: 11,
                padding: "3px 8px",
                borderRadius: 3,
                border: "1px solid #c4cdd7",
                background: "#ffffff",
              }}
            >
              <option value="Show All">Show All</option>
              <option value="Completed Only">Completed Only</option>
              <option value="Pending Only">Pending Only</option>
            </select>
          </div>

          <div style={{ fontSize: 10, marginTop: 4, color: "#4b5563" }}>
            * Mandatory milestones. Actual date cannot be a future date.
          </div>
        </div>

        {/* Right panel */}
        <div
          style={{
            background: "#ffffff",
            borderRadius: 4,
            border: "1px solid #d0d7e2",
            padding: 8,
            boxShadow: "0 1px 2px rgba(15,23,42,0.04)",
          }}
        >
          <div
            style={{
              fontWeight: 600,
              borderBottom: "1px solid #e1e7f0",
              paddingBottom: 4,
              marginBottom: 6,
              color: "#2563eb",
            }}
          >
            Milestone: {allMilestones[selectedIndex]?.milestoneName || "None"}
          </div>

          <div style={{ marginBottom: 8 }}>
            <div style={{ marginBottom: 3, fontWeight: 500 }}>Remarks</div>
            <textarea
              rows={4}
              style={{
                width: "100%",
                fontSize: 11,
                padding: "4px 6px",
                borderRadius: 3,
                border: "1px solid #c4cdd7",
                resize: "vertical",
              }}
              value={allMilestones[selectedIndex]?.remarks || ""}
              onChange={(e) =>
                handleMilestoneChange(selectedIndex, {
                  remarks: e.target.value,
                })
              }
              placeholder="Enter milestone-specific remarks..."
            />
          </div>

          <div style={{ marginBottom: 8 }}>
            <div style={{ marginBottom: 3, fontWeight: 500 }}>
              Upload Documents Link
            </div>
            <input
              type="text"
              style={{
                width: "100%",
                fontSize: 11,
                padding: "4px 6px",
                borderRadius: 3,
                border: "1px solid #c4cdd7",
              }}
              value={allMilestones[selectedIndex]?.documentLink || ""}
              onChange={(e) =>
                handleMilestoneChange(selectedIndex, {
                  documentLink: e.target.value,
                })
              }
              placeholder="https://..."
            />
          </div>

          <div>
            <div style={{ marginBottom: 3, fontWeight: 500 }}>Handled By</div>
            <select
              style={{
                width: "100%",
                fontSize: 11,
                padding: "4px 6px",
                borderRadius: 3,
                border: "1px solid #c4cdd7",
                background: "#ffffff",
              }}
              value={allMilestones[selectedIndex]?.completedBy || ""}
              onChange={(e) =>
                handleMilestoneChange(selectedIndex, {
                  completedBy: e.target.value,
                })
              }
            >
              <option value="">Select User</option>
              {exportJobsUsers?.map((u) => (
                <option key={u.id} value={u.username}>
                  {u.fullName}
                </option>
              ))}
            </select>
          </div>

          <div
            style={{
              marginTop: 15,
              paddingTop: 10,
              borderTop: "1px dashed #d0d7e2",
            }}
          >
            <div
              style={{
                fontWeight: 600,
                fontSize: 11,
                marginBottom: 5,
                color: "#64748b",
              }}
            >
              Global Job Remarks
            </div>
            <textarea
              rows={2}
              style={{
                width: "100%",
                fontSize: 10,
                padding: "4px 6px",
                borderRadius: 3,
                border: "1px solid #e2e8f0",
                resize: "none",
                background: "#f8fafc",
              }}
              value={formik.values.milestoneremarks || ""}
              onChange={(e) =>
                handleFieldChange("milestoneremarks", e.target.value)
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrackingCompletedTab;
