/**
 * Role Utility for Authorization Checks
 */

/**
 * Checks if a given user role corresponds to an Admin or Head of Department (HOD)
 * @param {string} role - The user's role string
 * @returns {boolean} True if user is Admin or HOD
 */
export const isHodOrAdmin = (role) => {
  if (!role || typeof role !== "string") return false;
  const r = role.toLowerCase().trim();
  return (
    r === "admin" ||
    r === "hod" ||
    r === "head_of_department" ||
    r === "head of department" ||
    r.includes("head_of_department") ||
    r.includes("hod")
  );
};
