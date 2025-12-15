import React, { useRef, useCallback, useState, useEffect } from "react";
import DateInput from "../../../common/DateInput.js";

const BASE_MILESTONES = [
  "SB Filed",
  "SB Receipt",
  "L.E.O",
  "Container HO to Concor",
  "Rail Out",
  "Ready for Billing",
  "Billing Done",
];

const mandatoryNames = new Set([
  "SB Filed",
  "SB Receipt",
  "L.E.O",
  "Ready for Billing",
]);

const TrackingCompletedTab = ({ formik, directories, params, onUpdate }) => {
  const saveTimeoutRef = useRef(null);
  const [filter, setFilter] = useState("Show All");

  const autoSave = useCallback(
    async (values) => {
      try {
        if (onUpdate) await onUpdate(values);
      } catch (err) {
        console.error("Auto-save failed:", err);
      }
    },
    [onUpdate]
  );

  const scheduleSave = () => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      autoSave(formik.values);
    }, 1200);
  };

  const handleFieldChange = (field, value) => {
    formik.setFieldValue(field, value);
    scheduleSave();
  };

  // ONE‑TIME normalization of base milestones
  useEffect(() => {
    const ms = formik.values.milestones || [];
    if (!ms.length) {
      const defaults = BASE_MILESTONES.map((name) => ({
        milestoneName: name,
        planDate: "dd-MMM-yyyy HH:mm",
        actualDate: "dd-mmm-yyyy hh:mm",
        isCompleted: false,
        isMandatory: mandatoryNames.has(name),
        completedBy: "",
        remarks: "",
      }));
      formik.setFieldValue("milestones", defaults);
    } else {
      const byName = new Map(ms.map((m) => [m.milestoneName, m]));
      const basePart = BASE_MILESTONES.map((name) => {
        const existing = byName.get(name);
        return (
          existing || {
            milestoneName: name,
            planDate: "dd-MMM-yyyy HH:mm",
            actualDate: "dd-mmm-yyyy hh:mm",
            isCompleted: false,
            isMandatory: mandatoryNames.has(name),
            completedBy: "",
            remarks: "",
          }
        );
      });
      const extra = ms.filter(
        (m) => !BASE_MILESTONES.includes(m.milestoneName)
      );
      formik.setFieldValue("milestones", [...basePart, ...extra]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleMilestoneChange = (index, field, value) => {
    const current = formik.values.milestones || [];
    const milestones = [...current];
    milestones[index] = { ...milestones[index], [field]: value };
    formik.setFieldValue("milestones", milestones);
    scheduleSave();
  };

  const addCustomMilestone = () => {
    const name = window.prompt("Enter new milestone name");
    if (!name) return;
    const current = formik.values.milestones || [];
    const milestones = [
      ...current,
      {
        milestoneName: name,
        planDate: "dd-MMM-yyyy HH:mm",
        actualDate: "dd-mmm-yyyy hh:mm",
        isCompleted: false,
        isMandatory: false,
        completedBy: "",
        remarks: "",
      },
    ];
    formik.setFieldValue("milestones", milestones);
    scheduleSave();
  };

  const updatePlanDate = () => {
    const now = new Date();
    const current = formik.values.milestones || [];
    const milestones = current.map((m, idx) => {
      if (!m.planDate || m.planDate === "dd-MMM-yyyy HH:mm") {
        const d = new Date(now);
        d.setHours(now.getHours() + idx * 2);
        const iso = d.toISOString().slice(0, 16);
        return { ...m, planDate: iso };
      }
      return m;
    });
    formik.setFieldValue("milestones", milestones);
    scheduleSave();
  };

  const getMaxDateTime = () => {
    const d = new Date();
    return d.toISOString().slice(0, 16);
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
      {/* Header band */}
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
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontWeight: 600 }}>Job Tracking Completed</span>
          <DateInput
            style={{
              fontSize: 12,
              padding: "4px 6px",
              borderRadius: 3,
              border: "1px solid #c4cdd7",
              minWidth: 135,
            }}
            value={formik.values.jobtrackingcompleted || ""}
            onChange={(e) =>
              handleFieldChange("jobtrackingcompleted", e.target.value)
            }
          />
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

        <div
          style={{
            borderLeft: "1px solid #e1e7f0",
            paddingLeft: 10,
            fontSize: 11,
            lineHeight: 1.4,
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: 2 }}>Workflow for</div>
          <div>
            Location : {formik.values.workflowlocation || "All Locations"}
          </div>
          <div>
            Shipment Type : {formik.values.shipmenttype || "International"}
          </div>
        </div>
      </div>

      {/* Body */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 2fr) 280px",
          columnGap: 10,
          alignItems: "flex-start",
        }}
      >
        {/* Milestones */}
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
                <col style={{ width: "34%" }} />
                <col style={{ width: "28%" }} />
                <col style={{ width: "28%" }} />
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
                    Plan Date
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
                  const isBase = BASE_MILESTONES.includes(m.milestoneName);
                  return (
                    <tr
                      key={realIndex}
                      style={{
                        background: idx % 2 === 0 ? "#ffffff" : "#f7f9fc",
                        borderTop: "1px solid #e1e7f0",
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
                            fontSize: 11,
                            padding: "3px 4px",
                            borderRadius: 3,
                            border: "1px solid #c4cdd7",
                            background: "#ffffff",
                          }}
                          value={
                            m.planDate && m.planDate !== "dd-MMM-yyyy HH:mm"
                              ? m.planDate
                              : ""
                          }
                          onChange={(e) =>
                            handleMilestoneChange(
                              realIndex,
                              "planDate",
                              e.target.value || "dd-MMM-yyyy HH:mm"
                            )
                          }
                        />
                      </td>
                      <td style={{ padding: "4px 8px" }}>
                        <DateInput
                          style={{
                            width: "100%",
                            fontSize: 11,
                            padding: "3px 4px",
                            borderRadius: 3,
                            border: "1px solid #c4cdd7",
                            background:
                              m.actualDate &&
                              m.actualDate !== "dd-mmm-yyyy hh:mm"
                                ? "#ecfdf3"
                                : "#ffffff",
                          }}
                          value={
                            m.actualDate && m.actualDate !== "dd-mmm-yyyy hh:mm"
                              ? m.actualDate
                              : ""
                          }
                          onChange={(e) => {
                            const v = e.target.value;
                            if (!v) {
                              handleMilestoneChange(
                                realIndex,
                                "actualDate",
                                "dd-mmm-yyyy hh:mm"
                              );
                              return;
                            }
                            // Validate DD-MM-YYYY vs Now
                            const parts = v.split("-");
                            if (parts.length === 3) {
                              const day = parseInt(parts[0], 10);
                              const month = parseInt(parts[1], 10) - 1;
                              const year = parseInt(parts[2], 10);
                              const picked = new Date(year, month, day);
                              const now = new Date();
                              // Allow today (ignore time), prevent future
                              now.setHours(0, 0, 0, 0);
                              if (picked > now) return;
                            }
                            handleMilestoneChange(realIndex, "actualDate", v);
                          }}
                        />
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <input
                          type="checkbox"
                          checked={!!m.isCompleted}
                          onChange={(e) => {
                            handleMilestoneChange(
                              realIndex,
                              "isCompleted",
                              e.target.checked
                            );
                            if (
                              e.target.checked &&
                              (!m.actualDate ||
                                m.actualDate === "dd-mmm-yyyy hh:mm")
                            ) {
                              const nowIso = new Date()
                                .toISOString()
                                .slice(0, 16);
                              handleMilestoneChange(
                                realIndex,
                                "actualDate",
                                nowIso
                              );
                            }
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
                onClick={updatePlanDate}
                style={{
                  fontSize: 11,
                  padding: "4px 10px",
                  borderRadius: 3,
                  border: "1px solid #2563eb",
                  background: "#2563eb",
                  color: "#ffffff",
                  cursor: "pointer",
                }}
              >
                Update Plan Date
              </button>
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
            }}
          >
            Milestone
          </div>

          <div style={{ marginBottom: 8 }}>
            <div style={{ marginBottom: 3 }}>Remarks</div>
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
              value={formik.values.milestoneremarks || ""}
              onChange={(e) =>
                handleFieldChange("milestoneremarks", e.target.value)
              }
            />
          </div>

          <div style={{ marginBottom: 8 }}>
            <div style={{ marginBottom: 3 }}>View/Upload Documents</div>
            <input
              type="text"
              style={{
                width: "100%",
                fontSize: 11,
                padding: "4px 6px",
                borderRadius: 3,
                border: "1px solid #c4cdd7",
              }}
              value={formik.values.milestoneviewuploaddocuments || ""}
              onChange={(e) =>
                handleFieldChange(
                  "milestoneviewuploaddocuments",
                  e.target.value
                )
              }
            />
          </div>

          <div>
            <div style={{ marginBottom: 3 }}>Handled By</div>
            <select
              style={{
                width: "100%",
                fontSize: 11,
                padding: "4px 6px",
                borderRadius: 3,
                border: "1px solid #c4cdd7",
                background: "#ffffff",
              }}
              value={formik.values.milestonehandledby || ""}
              onChange={(e) =>
                handleFieldChange("milestonehandledby", e.target.value)
              }
            >
              <option value="">Select User</option>
              {directories?.users?.map((u) => (
                <option key={u.id} value={u.username}>
                  {u.username}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrackingCompletedTab;
