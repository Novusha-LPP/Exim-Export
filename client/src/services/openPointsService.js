import axios from "axios";

const API_URL = import.meta.env.VITE_API_STRING || "http://localhost:9002";

const getHeaders = () => {
  const user = JSON.parse(localStorage.getItem("exim_user") || "{}");

  // Be resilient: prefer _id, fall back to id or username
  const userId = user._id || user.id || user.username || "";

  return {
    headers: {
      "Content-Type": "application/json",
      "user-id": userId,
      username: user.username || userId,
      "user-role": user.role || "",
    },
  };
};

export const fetchMyProjects = async () => {
  const response = await axios.get(
    `${API_URL}/open-points/my-projects`,
    getHeaders()
  );
  return response.data;
};

export const createProject = async (projectData) => {
  const response = await axios.post(
    `${API_URL}/open-points/projects`,
    projectData,
    getHeaders()
  );
  return response.data;
};

export const fetchProjectPoints = async (projectId) => {
  const response = await axios.get(
    `${API_URL}/open-points/project/${projectId}/points`,
    getHeaders()
  );
  return response.data;
};

export const createOpenPoint = async (pointData) => {
  const response = await axios.post(
    `${API_URL}/open-points/points`,
    pointData,
    getHeaders()
  );
  return response.data;
};

export const updatePointStatus = async (pointId, statusData) => {
  // statusData = { status, remarks, evidence, userId, ...otherFields }
  const response = await axios.put(
    `${API_URL}/open-points/points/${pointId}`,
    statusData,
    getHeaders()
  );
  return response.data;
};

export const fetchProjectDetails = async (projectId) => {
  const response = await axios.get(
    `${API_URL}/open-points/project/${projectId}`,
    getHeaders()
  );
  return response.data;
};

export const addProjectMember = async (projectId, username, role) => {
  const response = await axios.post(
    `${API_URL}/open-points/project/${projectId}/add-member`,
    { username, role },
    getHeaders()
  );
  return response.data;
};

export const removeProjectMember = async (projectId, username, userId) => {
  const payload = {};
  if (username) payload.username = username;
  if (userId) payload.userId = userId;
  const response = await axios.post(
    `${API_URL}/open-points/project/${projectId}/remove-member`,
    payload,
    getHeaders()
  );
  return response.data;
};

export const fetchAllUsers = async () => {
  const response = await axios.get(`${API_URL}/get-all-users`);
  return response.data; // returns array of user objects
};

export const deleteOpenPoint = async (pointId) => {
  const response = await axios.delete(
    `${API_URL}/open-points/points/${pointId}`,
    getHeaders()
  );
  return response.data;
};

export const deleteProject = async (projectId) => {
  const response = await axios.delete(
    `${API_URL}/open-points/projects/${projectId}`,
    getHeaders()
  );
  return response.data;
};
export const changeProjectOwner = async (projectId, newOwnerId) => {
  const response = await axios.put(
    `${API_URL}/open-points/projects/${projectId}/change-owner`,
    { newOwnerId },
    getHeaders()
  );
  return response.data;
};
