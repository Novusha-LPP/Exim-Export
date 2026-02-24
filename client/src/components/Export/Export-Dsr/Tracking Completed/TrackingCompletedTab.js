import React, { useRef, useCallback, useState, useEffect } from "react";
import DateInput from "../../../common/DateInput.js";

const getMilestones = (isAir) => [
  "SB Filed",
  "L.E.O",
  isAir ? "File Handover to IATA" : "Container HO",
  isAir ? "Departure" : "Rail Out",
  "Billing Pending",
  "Billing Done",
];

const getMandatoryNames = (isAir) =>
  new Set(["SB Filed", "L.E.O", "Billing Pending"]);

const TrackingCompletedTab = ({ formik, directories, params, isAdmin }) => {
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
    "L.E.O",
    "File Handover to IATA",
    "Container HO to Concor",
    "Departure",
    "Rail Out",
    "Billing Pending",
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
      if (!name) return false; // Ignore empty names
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

  // Sync milestones with source fields from operations/job details
  useEffect(() => {
    // Only proceed if initialized
    if (!hasInitializedRef.current) return;

    const op = formik.values.operations?.[0]?.statusDetails?.[0] || {};
    const sbDate = formik.values.sb_date;

    // Helper to map milestone name to source data
    const getSource = (name) => {
      // 1. SB Filed -> sb_date
      if (name === "SB Filed") return { val: sbDate, isDoc: false };

      // 2. L.E.O -> LEO (leoDate)
      if (name === "L.E.O") return { val: op.leoDate, isDoc: false };

      // 3. Container HO / File Handover -> Handover doc (handoverImageUpload)
      if (name === "Container HO" || name === "File Handover to IATA") {
        const docs = op.handoverImageUpload;
        const dateVal = op.handoverForwardingNoteDate || op.handoverConcorTharSanganaRailRoadDate || "";
        // Fix: Consider it "has docs" (completed) if either doc upload exists OR the date is set
        const hasDocs = (Array.isArray(docs) && docs.length > 0) || !!dateVal;
        return { val: dateVal, isDoc: true, hasDoc: hasDocs };
      }

      // 4. Rail Out / Departure -> Rail Reached (railOutReachedDate)
      if (name === "Rail Out" || name === "Departure") return { val: op.railOutReachedDate, isDoc: false };

      return null;
    };

    const currentMilestones = formik.values.milestones || [];
    if (currentMilestones.length === 0) return;

    let changed = false;
    const newMilestones = currentMilestones.map((m) => {
      const source = getSource(m.milestoneName);
      if (!source) return m;

      let updates = {};

      if (source.isDoc) {
        // Document-driven logic
        if (source.hasDoc) {
          if (!m.isCompleted) updates.isCompleted = true;
          // Only update date if we have a valid one from source, otherwise keep existing manual or empty?
          // User said "if Handover doc has value...". 
          // If source date is valid, sync it.
          if (source.val && m.actualDate !== source.val) updates.actualDate = source.val;
        } else {
          // If doc is removed, we likely uncheck it to stay in sync
          if (m.isCompleted) {
            updates.isCompleted = false;
            updates.actualDate = "";
          }
        }
      } else {
        // Date-driven logic
        if (source.val) {
          if (!m.isCompleted) updates.isCompleted = true;
          if (m.actualDate !== source.val) updates.actualDate = source.val;
        } else {
          if (m.isCompleted) {
            updates.isCompleted = false;
            updates.actualDate = "";
          }
        }
      }

      if (Object.keys(updates).length > 0) {
        changed = true;
        return { ...m, ...updates };
      }
      return m;
    });

    if (changed) {
      formik.setFieldValue("milestones", newMilestones);
    }
  }, [
    // Dependencies to trigger the check
    formik.values.sb_date,
    formik.values.operations,
    formik.values.milestones
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
                const isChecked = e.target.checked;
                handleFieldChange("isJobtrackingEnabled", isChecked);
                if (isChecked) {
                  const today = new Date();
                  const dateString = `${String(today.getDate()).padStart(2, '0')}-${String(today.getMonth() + 1).padStart(2, '0')}-${today.getFullYear()}`;
                  handleFieldChange("jobtrackingCompletedDate", dateString);
                  handleFieldChange("isJobCanceled", false);
                  handleFieldChange("jobCanceledDate", "");
                } else {
                  handleFieldChange("jobtrackingCompletedDate", "");
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
            {formik.values.isJobtrackingEnabled && formik.values.jobtrackingCompletedDate && (
              <span style={{ fontSize: 11, color: "#666", fontWeight: 500 }}>
                ({formik.values.jobtrackingCompletedDate})
              </span>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontWeight: 600 }}>Job Canceled</span>
            <input
              type="checkbox"
              checked={formik.values.isJobCanceled ?? false}
              onChange={(e) => {
                const isChecked = e.target.checked;
                handleFieldChange("isJobCanceled", isChecked);
                if (isChecked) {
                  const today = new Date();
                  const dateString = `${String(today.getDate()).padStart(2, '0')}-${String(today.getMonth() + 1).padStart(2, '0')}-${today.getFullYear()}`;
                  handleFieldChange("jobCanceledDate", dateString);
                  handleFieldChange("isJobtrackingEnabled", false);
                  handleFieldChange("jobtrackingCompletedDate", "");
                } else {
                  handleFieldChange("jobCanceledDate", "");
                }
              }}
              disabled={(formik.values.isJobtrackingEnabled ?? false) || (formik.values.isJobCanceled && !isAdmin)}
              style={{
                cursor:
                  ((formik.values.isJobtrackingEnabled ?? false) || (formik.values.isJobCanceled && !isAdmin))
                    ? "not-allowed"
                    : "pointer",
              }}
            />
            {formik.values.isJobCanceled && formik.values.jobCanceledDate && (
              <span style={{ fontSize: 11, color: "#d32f2f", fontWeight: 500 }}>
                ({formik.values.jobCanceledDate})
              </span>
            )}
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
          {formik.values.isJobCanceled && (
            <div>
              <div style={{ marginBottom: 4, fontWeight: 500, color: "#d32f2f" }}>
                Cancellation Reason <span style={{ color: "red" }}>*</span>
              </div>
              <textarea
                rows={2}
                style={{
                  width: "100%",
                  fontSize: 12,
                  padding: "4px 6px",
                  borderRadius: 3,
                  border: "1px solid #ef5350",
                  resize: "none",
                }}
                value={formik.values.cancellationReason || ""}
                onChange={(e) =>
                  handleFieldChange("cancellationReason", e.target.value)
                }
              />
            </div>
          )}
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
                  const isAutoMilestone =
                    (currentBaseMilestones.includes(m.milestoneName) &&
                      m.milestoneName !== "Billing Done") ||
                    m.milestoneName === "Billing Pending";
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
                        {isAutoMilestone && (
                          <span
                            title="Auto-set from billing date in Operations tab"
                            style={{ marginLeft: 4, fontSize: 10, color: "#94a3b8" }}
                          >
                            🔒
                          </span>
                        )}
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
                            background: isAutoMilestone
                              ? "#f1f5f9"
                              : m.actualDate &&
                                m.actualDate !== "dd-mm-yyyy" &&
                                m.actualDate !== ""
                                ? "#ecfdf3"
                                : "#ffffff",
                            ...(isAutoMilestone
                              ? { color: "#64748b", cursor: "not-allowed" }
                              : {}),
                          }}
                          value={m.actualDate || ""}
                          withTime={false}
                          disabled={isAutoMilestone}
                          onChange={(e) => {
                            if (isAutoMilestone) return;
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
                          disabled={isAutoMilestone}
                          onChange={(e) => {
                            if (isAutoMilestone) return;
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
                          style={{ cursor: isAutoMilestone ? "not-allowed" : "pointer" }}
                          title={isAutoMilestone ? "Auto-set from billing date in Operations tab" : ""}
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
