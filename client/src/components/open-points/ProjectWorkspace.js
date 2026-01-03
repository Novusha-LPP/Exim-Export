import React, { useEffect, useState, useContext } from "react";
import {
  fetchProjectPoints,
  updatePointStatus,
  createOpenPoint,
  fetchProjectDetails,
  addProjectMember,
  fetchAllUsers,
  deleteOpenPoint,
  removeProjectMember,
  deleteProject,
} from "../../services/openPointsService";
import { useParams, useNavigate } from "react-router-dom";
import { UserContext } from "../../contexts/UserContext";
import "../../styles/openPoints.scss";

const ProjectWorkspace = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(UserContext);
  const [points, setPoints] = useState([]);
  const [projectTeam, setProjectTeam] = useState([]); // Array of {user: {_id, username}, role}
  const [projectOwnerId, setProjectOwnerId] = useState(null);
  const [loading, setLoading] = useState(true);

  // Add Member State
  const [showAddMember, setShowAddMember] = useState(false);
  const [newMemberName, setNewMemberName] = useState("");
  const [allUsers, setAllUsers] = useState([]); // For autocomplete
  const [newMemberRole, setNewMemberRole] = useState("L2");
  const [accessDenied, setAccessDenied] = useState(false);

  // Summary Stats
  const [summary, setSummary] = useState([]);
  const [modifiedPoints, setModifiedPoints] = useState(new Set());
  const [projectName, setProjectName] = useState("");
  const [showLegend, setShowLegend] = useState(false);
  const [filters, setFilters] = useState({
    status: "",
    priority: "",
    responsibility: "",
  });

  // Quick Add State (Row at bottom)
  const [newPoint, setNewPoint] = useState({
    title: "",
    responsibility: "",
    level: "L2",
    gap_action: "",
    target_date: "",
    status: "Red",
    review_date: "",
    remarks: "",
    priority: "Low",
  });

  // Custom Dialog State
  const [dialogConfig, setDialogConfig] = useState({
    open: false,
    title: "",
    message: "",
    type: "info",
    onConfirm: null,
  });

  const showDialog = (title, message, type = "info", onConfirm = null) => {
    setDialogConfig({ open: true, title, message, type, onConfirm });
  };

  const closeDialog = () => {
    setDialogConfig({ ...dialogConfig, open: false });
  };

  useEffect(() => {
    loadData();
  }, [projectId]);

  // Auto-resize textarea
  const autoResize = (e) => {
    e.target.style.height = "auto";
    e.target.style.height = e.target.scrollHeight + "px";
  };

  const loadData = async () => {
    setLoading(true);

    // 1. Fetch Users (Critical for UI)
    try {
      const allUsersData = await fetchAllUsers();
      setAllUsers(allUsersData || []);
    } catch (err) {
      console.error("Failed to fetch all users", err);
      setAllUsers([]);
    }

    // 2. Fetch Project Data & Points
    try {
      // We use Promise.allSettled to allow partial failure
      const [pointsResult, projectResult] = await Promise.allSettled([
        fetchProjectPoints(projectId),
        fetchProjectDetails(projectId),
      ]);

      let deniedFlag = false;

      // Handle Points
      if (pointsResult.status === "fulfilled") {
        setPoints(pointsResult.value);
        calculateSummary(pointsResult.value);
      } else {
        console.error("Failed to fetch points", pointsResult.reason);
        if (pointsResult.reason?.response?.status === 403) {
          deniedFlag = true;
          setAccessDenied(true);
        }
      }

      // Handle Project Details
      if (projectResult.status === "fulfilled") {
        const projectData = projectResult.value;
        setProjectName(projectData.name || "");

        // Build Team List
        const teamList = [];
        if (projectData.owner) {
          const ownerIdValue = projectData.owner._id || projectData.owner;
          setProjectOwnerId(ownerIdValue.toString());
          const ownerName =
            projectData.owner.username ||
            `User_${projectData.owner.toString().substring(0, 6)}`;
          teamList.push({
            _id: ownerIdValue,
            username: ownerName,
            role: "Owner",
          });
        }

        if (
          projectData.team_members &&
          Array.isArray(projectData.team_members)
        ) {
          const ownerId = (
            projectData.owner._id ||
            projectData.owner ||
            ""
          ).toString();

          const members = projectData.team_members
            .filter((tm) => {
              if (!tm || !tm.user) return false;
              const tmUserId = (tm.user._id || tm.user || "").toString();
              return tmUserId !== ownerId;
            })
            .map((tm) => {
              const userObj = tm.user;

              let userId = null;
              let userName = null;

              if (typeof userObj === "string") {
                userId = userObj;
                userName = userObj;
              } else if (userObj._id) {
                userId = userObj._id;
                userName =
                  userObj.username || String(userObj._id).substring(0, 6);
              } else if (userObj.$oid) {
                userId = userObj.$oid;
                userName = userObj.username || userObj.$oid;
              } else if (typeof userObj.toString === "function") {
                userId = userObj.toString();
                userName = userObj.username || userId;
              } else {
                userId = JSON.stringify(userObj);
                userName = userObj.username || userId;
              }

              return {
                _id: userId,
                username: userName,
                role: tm.role || "L2",
              };
            })
            .filter((m) => m !== null);

          teamList.push(...members);
        }
        setProjectTeam(teamList);
      } else {
        console.error("Failed to fetch project details", projectResult.reason);
        if (projectResult.reason?.response?.status === 403) {
          deniedFlag = true;
          setAccessDenied(true);
        }
      }

      // If access was denied and no team info is available, show current user as the owner in the team list
      if (deniedFlag && (!projectTeam || projectTeam.length === 0) && user) {
        setProjectTeam([
          { _id: user._id, username: user.username, role: "Owner" },
        ]);
        setProjectOwnerId(user._id);
      }
    } catch (error) {
      console.error("Unexpected error in loadData", error);
    } finally {
      setLoading(false);
    }
  };

  const calculateSummary = (data) => {
    const stats = {};
    data.forEach((p) => {
      const person =
        p.responsibility || p.responsible_person?.username || "Unassigned";
      if (!stats[person])
        stats[person] = { total: 0, green: 0, yellow: 0, red: 0, orange: 0 };

      stats[person].total++;
      const status = p.status || "Red";
      if (status === "Green") stats[person].green++;
      else if (status === "Yellow") stats[person].yellow++;
      else if (status === "Red") stats[person].red++;
      else if (status === "Orange") stats[person].orange++;
    });
    setSummary(
      Object.entries(stats).map(([name, stat]) => ({ name, ...stat }))
    );
  };

  const handleUpdate = (pointId, field, value) => {
    // Update local state only
    const updatedPoints = points.map((p) =>
      p._id === pointId ? { ...p, [field]: value } : p
    );
    setPoints(updatedPoints);
    calculateSummary(updatedPoints);

    // Track modification
    setModifiedPoints((prev) => new Set(prev).add(pointId));
  };

  const handleDeleteRow = (pointId) => {
    showDialog(
      "Confirm Delete",
      "Are you sure you want to delete this point?",
      "confirm",
      async () => {
        try {
          await deleteOpenPoint(pointId);
          const filteredPoints = points.filter((p) => p._id !== pointId);
          setPoints(filteredPoints);
          calculateSummary(filteredPoints);
        } catch (error) {
          console.error("Delete failed", error);
          showDialog("Error", "Failed to delete point", "alert");
        }
      }
    );
  };

  const validateFields = (data) => {
    const missing = [];
    if (!data.title || !data.title.trim()) missing.push("Discussion Points");
    if (!data.responsibility) missing.push("Responsibility");
    if (!data.level) missing.push("Approval Level");
    if (!data.target_date) missing.push("Target Date");
    if (!data.priority) missing.push("Priority");
    return missing;
  };

  const handleSaveRow = async (pointId) => {
    const point = points.find((p) => p._id === pointId);
    if (!point) return;

    const missingFields = validateFields(point);
    if (missingFields.length > 0) {
      showDialog(
        "Action Required",
        `Please explicitly provide the following details to proceed:\n\n• ${missingFields.join(
          "\n• "
        )}`,
        "alert"
      );
      return;
    }

    // Sync responsible_person ID
    let responsibleId =
      point.responsible_person?._id || point.responsible_person;
    let responsibilityName = point.responsibility;

    // Ensure we have an ID for responsible_person
    if (responsibleId) {
      const userObj = allUsers.find(
        (u) => u._id === responsibleId || u.id === responsibleId
      );
      if (userObj) responsibilityName = userObj.username;
    }

    const currentUserId =
      user?._id || allUsers.find((u) => u.username === user?.username)?._id;

    const payload = {
      ...point,
      userId: currentUserId,
      responsible_person: responsibleId,
      responsibility: responsibilityName,
      reviewer: currentUserId,
    };

    // Clean up payload (remove populated objects if simple IDs needed, handled by backend usually, but let's be safe)
    if (payload.owner) delete payload.owner;

    try {
      await updatePointStatus(pointId, payload);
      showDialog("Success", "Saved successfully!", "alert");
      // Remove from modified set
      setModifiedPoints((prev) => {
        const next = new Set(prev);
        next.delete(pointId);
        return next;
      });
    } catch (error) {
      console.error("Save failed", error);
      showDialog("Error", "Failed to save row", "alert");
    }
  };

  const handleQuickAdd = async (e) => {
    if (e.key === "Enter") {
      createPoint();
    }
  };

  const createPoint = async () => {
    const missingFields = validateFields(newPoint);
    if (missingFields.length > 0) {
      showDialog(
        "Action Required",
        `Please explicitly provide the following details before adding:\n\n• ${missingFields.join(
          "\n• "
        )}`,
        "alert"
      );
      return;
    }

    if (!newPoint.title) return; // Redundant but kept for safety

    try {
      // Build payload carefully: avoid sending empty date strings and map responsibility to user id
      const payload = {
        title: newPoint.title,
        project_id: projectId,
        level: newPoint.level,
        gap_action: newPoint.gap_action || "",
        status: newPoint.status || "Red",
        remarks: newPoint.remarks || "",
        priority: newPoint.priority || "Low",
        review_date: newPoint.review_date || "",
      };

      if (newPoint.target_date) {
        // ensure valid date
        payload.target_date = new Date(newPoint.target_date);
      }

      // Map responsibility username to member id
      if (newPoint.responsibility) {
        const found = allUsers.find(
          (u) =>
            u.username === newPoint.responsibility ||
            u._id === newPoint.responsibility
        );
        if (found && found._id) {
          payload.responsible_person = found._id;
          payload.responsibility = found.username;
        }
      }

      // set reviewer to current user id correctly
      const currentUserId =
        user?._id || allUsers.find((u) => u.username === user?.username)?._id;
      if (currentUserId) {
        payload.reviewer = currentUserId;
      }

      await createOpenPoint(payload);
      // Reset and Reload
      setNewPoint({
        title: "",
        responsibility: "",
        level: "L2",
        gap_action: "",
        target_date: "",
        status: "Red",
        review_date: "",
        remarks: "",
        priority: "Medium",
      });
      // Reload specific data to keep UI snappy
      const data = await fetchProjectPoints(projectId);
      setPoints(data);
      calculateSummary(data);
    } catch (error) {
      console.error(error);
      showDialog(
        "Error",
        error.response?.data?.error || error.message || "Error creating point",
        "alert"
      );
    }
  };

  const handleAddMember = async () => {
    try {
      await addProjectMember(projectId, newMemberName, newMemberRole);
      showDialog("Success", "Member added successfully!", "alert");
      setNewMemberName("");
      setShowAddMember(false);
      loadData(); // Reload to update team list
    } catch (error) {
      showDialog(
        "Error",
        error.response?.data?.error || "Failed to add member",
        "alert"
      );
    }
  };

  const handleDeleteProject = () => {
    showDialog(
      "Delete Project",
      "Are you sure you want to delete this entire project? This action cannot be undone and all associated points will be lost.",
      "confirm",
      async () => {
        try {
          await deleteProject(projectId);
          navigate("/open-points");
        } catch (error) {
          console.error("Delete project failed", error);
          showDialog(
            "Error",
            error.response?.data?.error || "Failed to delete project",
            "alert"
          );
        }
      }
    );
  };

  if (loading) return <div>Loading Workspace...</div>;

  return (
    <div className="open-points-container" style={{ padding: "10px" }}>
      {/* Unified Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "15px",
          background: "#f8fafc",
          padding: "10px 15px",
          borderRadius: "8px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
        }}
      >
        <h3
          style={{
            margin: 0,
            fontWeight: "700",
            color: "#334155",
            fontSize: "1.25rem",
          }}
        >
          <span
            style={{
              fontWeight: "400",
              color: "#64748b",
              fontSize: "1rem",
              marginRight: "8px",
            }}
          >
            Project Title:
          </span>
          {projectName || "Project Workspace"}
        </h3>

        <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
          {/* Filters Group */}
          <span style={{ fontSize: "13px", fontWeight: 600, color: "#64748b" }}>
            Filters:
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <select
              className="form-control"
              style={{
                width: "110px",
                height: "32px",
                fontSize: "12px",
                padding: "0 8px",
              }}
              value={filters.status}
              onChange={(e) =>
                setFilters({ ...filters, status: e.target.value })
              }
            >
              <option value="">Status</option>
              <option value="Red">Red</option>
              <option value="Yellow">Yellow</option>
              <option value="Green">Green</option>
              <option value="Orange">Orange</option>
            </select>
            <select
              className="form-control"
              style={{
                width: "110px",
                height: "32px",
                fontSize: "12px",
                padding: "0 8px",
              }}
              value={filters.priority}
              onChange={(e) =>
                setFilters({ ...filters, priority: e.target.value })
              }
            >
              <option value="">Priority</option>
              <option value="Emergency">Emergency</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
            <select
              className="form-control"
              style={{
                width: "140px",
                height: "32px",
                fontSize: "12px",
                padding: "0 8px",
              }}
              value={filters.responsibility}
              onChange={(e) =>
                setFilters({ ...filters, responsibility: e.target.value })
              }
            >
              <option value="">Members</option>
              {projectTeam.map((m) => (
                <option key={m._id} value={m.username}>
                  {m.username}
                </option>
              ))}
            </select>
          </div>

          {/* Actions Group */}
          <div
            style={{
              display: "flex",
              gap: "8px",
              borderLeft: "1px solid #cbd5e1",
              paddingLeft: "15px",
              marginLeft: "5px",
            }}
          >
            <button
              className="btn btn-sm btn-info"
              onClick={() => setShowLegend(true)}
              style={{
                fontSize: "12px",
                padding: "5px 12px",
                fontWeight: "500",
              }}
            >
              ℹ Legend
            </button>
            <button
              className="btn btn-sm btn-primary"
              onClick={() => setShowAddMember(true)}
              style={{
                fontSize: "12px",
                padding: "5px 12px",
                fontWeight: "500",
              }}
            >
              + Add Member
            </button>
            {user && projectOwnerId && user._id === projectOwnerId && (
              <button
                className="btn btn-sm btn-danger"
                onClick={handleDeleteProject}
                style={{
                  fontSize: "12px",
                  padding: "5px 12px",
                  fontWeight: "500",
                  marginLeft: "8px",
                }}
              >
                🗑️ Delete Project
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Legend Modal */}
      {showLegend && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.5)",
            zIndex: 1000,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <div
            style={{
              background: "white",
              padding: "20px",
              borderRadius: "8px",
              maxWidth: "90%",
              maxHeight: "90%",
              overflow: "auto",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "10px",
              }}
            >
              <h3>Status Legend</h3>
              <button
                className="btn btn-sm btn-secondary"
                onClick={() => setShowLegend(false)}
              >
                Close
              </button>
            </div>
            <div style={{ display: "grid", gap: "12px", minWidth: "300px" }}>
              {/* Levels */}
              <h5
                style={{
                  margin: "0 0 5px 0",
                  borderBottom: "1px solid #eee",
                  paddingBottom: "5px",
                }}
              >
                Levels
              </h5>
              <div
                style={{ display: "flex", alignItems: "center", gap: "15px" }}
              >
                <div
                  style={{
                    width: "40px",
                    height: "24px",
                    background: "#bef264",
                    borderRadius: "4px",
                    border: "1px solid #ddd",
                  }}
                ></div>
                <span>
                  <strong>L1</strong> - Development Team
                </span>
              </div>
              <div
                style={{ display: "flex", alignItems: "center", gap: "15px" }}
              >
                <div
                  style={{
                    width: "40px",
                    height: "24px",
                    background: "#22c55e",
                    borderRadius: "4px",
                    border: "1px solid #ddd",
                  }}
                ></div>
                <span>
                  <strong>L2</strong> - HoD
                </span>
              </div>
              <div
                style={{ display: "flex", alignItems: "center", gap: "15px" }}
              >
                <div
                  style={{
                    width: "40px",
                    height: "24px",
                    background: "#0ea5e9",
                    borderRadius: "4px",
                    border: "1px solid #ddd",
                  }}
                ></div>
                <span>
                  <strong>L3</strong> - Stakeholder HoD
                </span>
              </div>
              <div
                style={{ display: "flex", alignItems: "center", gap: "15px" }}
              >
                <div
                  style={{
                    width: "40px",
                    height: "24px",
                    background: "#94a3b8",
                    borderRadius: "4px",
                    border: "1px solid #ddd",
                  }}
                ></div>
                <span>
                  <strong>L4</strong> - MD/Chairman
                </span>
              </div>

              {/* Status */}
              <h5
                style={{
                  margin: "15px 0 5px 0",
                  borderBottom: "1px solid #eee",
                  paddingBottom: "5px",
                }}
              >
                Status
              </h5>
              <div
                style={{ display: "flex", alignItems: "center", gap: "15px" }}
              >
                <div
                  style={{
                    width: "40px",
                    height: "24px",
                    background: "#ef4444",
                    borderRadius: "4px",
                    border: "1px solid #ddd",
                  }}
                ></div>
                <span>
                  <strong>Red</strong> - Not yet started
                </span>
              </div>
              <div
                style={{ display: "flex", alignItems: "center", gap: "15px" }}
              >
                <div
                  style={{
                    width: "40px",
                    height: "24px",
                    background: "#eab308",
                    borderRadius: "4px",
                    border: "1px solid #ddd",
                  }}
                ></div>
                <span>
                  <strong>Yellow</strong> - In Progress
                </span>
              </div>
              <div
                style={{ display: "flex", alignItems: "center", gap: "15px" }}
              >
                <div
                  style={{
                    width: "40px",
                    height: "24px",
                    background: "#f97316",
                    borderRadius: "4px",
                    border: "1px solid #ddd",
                  }}
                ></div>
                <span>
                  <strong>Orange</strong> - Change Request
                </span>
              </div>
              <div
                style={{ display: "flex", alignItems: "center", gap: "15px" }}
              >
                <div
                  style={{
                    width: "40px",
                    height: "24px",
                    background: "#22c55e",
                    borderRadius: "4px",
                    border: "1px solid #ddd",
                  }}
                ></div>
                <span>
                  <strong>Green</strong> - Completed
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {showAddMember && (
        <div
          style={{
            marginBottom: "10px",
            padding: "10px",
            background: "#e0f2fe",
            borderRadius: "4px",
            display: "flex",
            gap: "10px",
          }}
        >
          <select
            className="form-control"
            style={{ maxWidth: "220px" }}
            value={newMemberName}
            onChange={(e) => setNewMemberName(e.target.value)}
          >
            <option value="">Select user</option>
            {allUsers.map((u, i) => (
              <option key={i} value={u.username}>
                {u.username}
              </option>
            ))}
          </select>
          <select
            value={newMemberRole}
            onChange={(e) => setNewMemberRole(e.target.value)}
            className="form-control"
            style={{ maxWidth: "140px" }}
          >
            <option value="L2">L2</option>
            <option value="L3">L3</option>
            <option value="L4">L4</option>
            <option value="L1">L1</option>
          </select>
          <button className="btn btn-sm btn-primary" onClick={handleAddMember}>
            Add to Project
          </button>
          <button
            className="btn btn-sm btn-secondary"
            onClick={() => setShowAddMember(false)}
          >
            Cancel
          </button>
        </div>
      )}

      {accessDenied && (
        <div style={{ marginTop: 10, color: "#a00" }}>
          Limited access: you cannot view full project details or points. If you
          created this project and still see this, try refreshing or re-logging.
          You can still add members below.
        </div>
      )}

      {/* If access was denied but no team info is available, show current user as member so the UI reflects project ownership for the creator */}
      {accessDenied && projectTeam.length === 0 && user && (
        <div
          style={{
            marginTop: 8,
            padding: "6px 10px",
            background: "#f3f4f6",
            borderRadius: 8,
            display: "inline-block",
          }}
        >
          <strong>{user.username}</strong>{" "}
          <span style={{ color: "#666" }}>(You)</span>
        </div>
      )}

      <div className="excel-table-container">
        <table className="excel-table">
          <thead>
            <tr>
              <th style={{ width: "40px" }}>Sr. No</th>
              <th style={{ width: "20%" }}>Discussion Points</th>
              <th style={{ width: "120px" }}>Responsibility</th>
              <th style={{ width: "80px" }}>Approval</th>
              <th style={{ width: "20%" }}>Gap / Action Point</th>
              <th style={{ width: "100px" }}>Target Date</th>
              <th style={{ width: "140px" }}>Status</th>
              <th style={{ width: "100px" }}>Review</th>
              <th style={{ width: "15%" }}>Remarks</th>
              <th style={{ width: "110px" }}>Priority</th>
              <th style={{ width: "80px" }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {points
              .filter((p) => {
                if (filters.status && p.status !== filters.status) return false;
                if (filters.priority && p.priority !== filters.priority)
                  return false;
                if (
                  filters.responsibility &&
                  p.responsibility !== filters.responsibility
                )
                  return false;
                return true;
              })
              .map((point, index) => (
                <tr key={point._id}>
                  <td style={{ textAlign: "center" }}>{index + 1}</td>
                  <td>
                    <textarea
                      value={point.title || ""}
                      onChange={(e) =>
                        handleUpdate(point._id, "title", e.target.value)
                      }
                      onInput={autoResize}
                      style={{ fieldSizing: "content" }}
                    />
                  </td>
                  <td>
                    <select
                      value={
                        point.responsible_person?._id ||
                        point.responsible_person ||
                        allUsers.find(
                          (u) => u.username === point.responsibility
                        )?._id ||
                        ""
                      }
                      onChange={(e) => {
                        const selectedId = e.target.value;
                        const selectedUser = allUsers.find(
                          (u) => u._id === selectedId
                        );
                        handleUpdate(
                          point._id,
                          "responsible_person",
                          selectedId
                        );
                        if (selectedUser) {
                          handleUpdate(
                            point._id,
                            "responsibility",
                            selectedUser.username
                          );
                        }
                      }}
                    >
                      <option value="">Select</option>
                      {allUsers.map((u) => (
                        <option key={u._id} value={u._id}>
                          {u.username}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <select
                      value={point.level || "L2"}
                      onChange={(e) =>
                        handleUpdate(point._id, "level", e.target.value)
                      }
                    >
                      <option value="L1">L1</option>
                      <option value="L2">L2</option>
                      <option value="L3">L3</option>
                      <option value="L4">L4</option>
                      <option value="L5">L5</option>
                    </select>
                  </td>
                  <td>
                    <textarea
                      value={point.gap_action || ""}
                      onChange={(e) =>
                        handleUpdate(point._id, "gap_action", e.target.value)
                      }
                      onInput={autoResize}
                      style={{ fieldSizing: "content" }}
                    />
                  </td>
                  <td>
                    <input
                      type="date"
                      value={
                        point.target_date ? point.target_date.split("T")[0] : ""
                      }
                      onChange={(e) =>
                        handleUpdate(point._id, "target_date", e.target.value)
                      }
                    />
                  </td>

                  {/* Color Coded Status Cell */}
                  <td className={`status-cell-${point.status}`}>
                    <select
                      value={point.status || "Red"}
                      onChange={(e) =>
                        handleUpdate(point._id, "status", e.target.value)
                      }
                    >
                      <option value="Red">Red</option>
                      <option value="Yellow">Yellow</option>
                      <option value="Green">Green</option>
                      <option value="Orange">Orange</option>
                    </select>
                  </td>

                  <td>
                    <input
                      type="date"
                      value={
                        point.review_date
                          ? point.review_date.includes("T")
                            ? point.review_date.split("T")[0]
                            : point.review_date
                          : ""
                      }
                      onChange={(e) =>
                        handleUpdate(point._id, "review_date", e.target.value)
                      }
                    />
                  </td>
                  <td>
                    <textarea
                      value={point.remarks || ""}
                      onChange={(e) =>
                        handleUpdate(point._id, "remarks", e.target.value)
                      }
                      onInput={autoResize}
                      style={{ fieldSizing: "content" }}
                    />
                  </td>
                  <td>
                    <select
                      value={point.priority || "Medium"}
                      onChange={(e) =>
                        handleUpdate(point._id, "priority", e.target.value)
                      }
                    >
                      <option value="Emergency">Emergency</option>
                      <option value="High">High</option>
                      <option value="Medium">Medium</option>
                      <option value="Low">Low</option>
                    </select>
                  </td>
                  <td>
                    <div
                      style={{
                        display: "flex",
                        gap: "5px",
                        justifyContent: "center",
                      }}
                    >
                      {modifiedPoints.has(point._id) && (
                        <button
                          className="btn btn-sm btn-success"
                          style={{ padding: "2px 6px", fontSize: "11px" }}
                          onClick={() => handleSaveRow(point._id)}
                          title="Save Changes"
                        >
                          ✔️
                        </button>
                      )}
                      <button
                        className="btn btn-sm btn-danger"
                        style={{
                          padding: "2px 8px",
                          fontSize: "12px",
                          border: "1px solid #dc3545",
                          background: "#fff",
                          color: "#dc3545",
                        }}
                        onClick={() => handleDeleteRow(point._id)}
                        title="Delete Point"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

            {/* Quick Add Row */}
            <tr style={{ backgroundColor: "#f0f9ff" }}>
              <td style={{ textAlign: "center" }}>
                <button
                  className="btn btn-sm btn-primary"
                  style={{ padding: "2px 6px", fontSize: "10px" }}
                  onClick={createPoint}
                >
                  Add
                </button>
              </td>
              <td>
                <textarea
                  placeholder="Add new point..."
                  value={newPoint.title}
                  onChange={(e) =>
                    setNewPoint({ ...newPoint, title: e.target.value })
                  }
                  onInput={autoResize}
                  style={{ fieldSizing: "content" }}
                />
              </td>
              <td>
                <select
                  value={newPoint.responsibility}
                  onChange={(e) =>
                    setNewPoint({ ...newPoint, responsibility: e.target.value })
                  }
                >
                  <option value="">Select</option>
                  {allUsers.map((u) => (
                    <option key={u._id} value={u.username}>
                      {u.username}
                    </option>
                  ))}
                </select>
              </td>
              <td>
                <select
                  value={newPoint.level}
                  onChange={(e) =>
                    setNewPoint({ ...newPoint, level: e.target.value })
                  }
                >
                  <option value="L2">L2</option>
                  <option value="L3">L3</option>
                  <option value="L4">L4</option>
                  <option value="L5">L5</option>
                </select>
              </td>
              <td>
                <textarea
                  placeholder="Gap / Action"
                  value={newPoint.gap_action}
                  onChange={(e) =>
                    setNewPoint({ ...newPoint, gap_action: e.target.value })
                  }
                  onInput={autoResize}
                  style={{ fieldSizing: "content" }}
                />
              </td>
              <td>
                <input
                  type="date"
                  value={newPoint.target_date}
                  onChange={(e) =>
                    setNewPoint({ ...newPoint, target_date: e.target.value })
                  }
                />
              </td>
              <td>
                <select
                  value={newPoint.status}
                  onChange={(e) =>
                    setNewPoint({ ...newPoint, status: e.target.value })
                  }
                >
                  <option value="Red">Red</option>
                  <option value="Yellow">Yellow</option>
                  <option value="Green">Green</option>
                  <option value="Orange">Orange</option>
                </select>
              </td>
              <td>
                <input
                  type="date"
                  value={newPoint.review_date}
                  onChange={(e) =>
                    setNewPoint({ ...newPoint, review_date: e.target.value })
                  }
                />
              </td>
              <td>
                <textarea
                  placeholder="Remarks"
                  value={newPoint.remarks}
                  onChange={(e) =>
                    setNewPoint({ ...newPoint, remarks: e.target.value })
                  }
                  onInput={autoResize}
                  style={{ fieldSizing: "content" }}
                />
              </td>
              <td>
                <select
                  value={newPoint.priority}
                  onChange={(e) =>
                    setNewPoint({ ...newPoint, priority: e.target.value })
                  }
                >
                  <option value="Emergency">Emergency</option>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </td>
              <td></td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Summary Section */}
      <div className="summary-section">
        <div className="summary-header">Summary</div>
        <table className="summary-table">
          <thead>
            <tr style={{ backgroundColor: "#fff" }}>
              <th>S.No</th>
              <th>Responsible Person</th>
              <th>Total Open Points</th>
              <th className="header-green">Total Green Points [ Completed ]</th>
              <th className="header-yellow">
                Total Yellow Points [ In Progress ]
              </th>
              <th className="header-red">
                Total Red Points [ Not Started - Pending ]
              </th>
              <th className="header-orange">
                Total Orange Points [ New Update ]
              </th>
              <th>Total Yellow + Red Points + Orange</th>
            </tr>
          </thead>
          <tbody>
            {summary.map((stat, index) => (
              <tr key={index}>
                <td>{index + 1}</td>
                <td>{stat.name}</td>
                <td>{stat.total}</td>
                <td>{stat.green}</td>
                <td>{stat.yellow}</td>
                <td>{stat.red}</td>
                <td>{stat.orange}</td>
                <td>{stat.yellow + stat.red + stat.orange}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* Team Members Section */}
      <div className="summary-section" style={{ marginTop: "20px" }}>
        <div className="summary-header">Team Members</div>
        <div
          style={{
            padding: "10px",
            border: "1px solid #ccc",
            background: "white",
          }}
        >
          <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
            {projectTeam.map((member, index) => (
              <div
                key={index}
                style={{
                  padding: "5px 10px",
                  background: member.role === "Owner" ? "#e0f2fe" : "#f3f4f6",
                  borderRadius: "15px",
                  border: "1px solid #ddd",
                  fontSize: "13px",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <div>
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={() => {
                      // If current user is project owner (or first team entry is owner), allow removal prompt
                      const isOwner =
                        user &&
                        (user._id === (projectTeam[0] && projectTeam[0]._id) ||
                          (projectTeam[0] && projectTeam[0].role === "Owner"));
                      if (!isOwner) {
                        showDialog(
                          "Permission Denied",
                          "Only the project owner can remove members.",
                          "alert"
                        );
                        return;
                      }

                      if (member.role === "Owner") {
                        showDialog(
                          "Not Allowed",
                          "Cannot remove the project owner.",
                          "alert"
                        );
                        return;
                      }

                      showDialog(
                        "Remove Member",
                        `Are you sure you want to remove ${member.username} from the project?`,
                        "confirm",
                        async () => {
                          try {
                            await removeProjectMember(
                              projectId,
                              member.username,
                              member._id
                            );
                            showDialog("Success", "Member removed", "alert");
                            // remove locally
                            setProjectTeam((prev) =>
                              prev.filter((p) => p._id !== member._id)
                            );
                          } catch (err) {
                            console.error("Remove member failed", err);
                            showDialog(
                              "Error",
                              err.response?.data?.error ||
                                "Failed to remove member",
                              "alert"
                            );
                          }
                        }
                      );
                    }}
                    onKeyPress={(e) => {
                      if (e.key === "Enter") e.currentTarget.click();
                    }}
                    style={{
                      cursor: "pointer",
                      textDecoration: "underline",
                      color: "#1e40af",
                    }}
                  >
                    <strong>{member.username}</strong>
                  </span>
                  <span style={{ color: "#666", marginLeft: 6 }}>
                    ({member.role || "Member"})
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Custom Dialog */}
      {dialogConfig.open && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.5)",
            zIndex: 2000,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <div
            style={{
              background: "white",
              padding: "20px",
              borderRadius: "8px",
              minWidth: "300px",
              maxWidth: "400px",
              boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
            }}
          >
            <h4 style={{ margin: "0 0 10px 0", color: "#1e293b" }}>
              {dialogConfig.title}
            </h4>
            <p style={{ margin: "0 0 20px 0", color: "#475569" }}>
              {dialogConfig.message}
            </p>
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "10px",
              }}
            >
              {dialogConfig.type === "confirm" && (
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={closeDialog}
                >
                  Cancel
                </button>
              )}
              <button
                className="btn btn-primary btn-sm"
                onClick={() => {
                  if (dialogConfig.onConfirm) dialogConfig.onConfirm();
                  closeDialog();
                }}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectWorkspace;
