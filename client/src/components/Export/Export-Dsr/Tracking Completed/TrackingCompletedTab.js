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

const TrackingCompletedTab = ({ formik, directories, params, isAdmin, isEditable = true }) => {
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

  // Milestone sync and initialization is now handled globally in ExportJobsModule.js
  // handleInitializedRef and useEffects removed to avoid duplicate/conflicting updates.

  const consignmentType = (formik.values.consignmentType || "").toUpperCase();
  const isAir = consignmentType === "AIR";
  const currentBaseMilestones = getMilestones(isAir);

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
    <fieldset disabled={!isEditable} style={{ border: 'none', padding: 0, margin: 0, width: '100%', background: 'transparent' }}>
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
                  handleFieldChange("status", "Cancelled");
                } else {
                  handleFieldChange("jobCanceledDate", "");
                  handleFieldChange("status", "Pending");
                }
              }}
              disabled={(formik.values.isJobCanceled && !isAdmin)}
              style={{
                cursor:
                  ((formik.values.isJobCanceled && !isAdmin))
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
          display: "block",
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


      </div>
    </div>
    </fieldset>
  );
};

export default TrackingCompletedTab;
