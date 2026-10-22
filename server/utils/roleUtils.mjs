import UserModel from "../model/userModel.mjs";

/**
 * Checks if a given role string is Admin or Head of Department (HOD)
 * @param {string} role
 * @returns {boolean}
 */
export function isHodOrAdmin(role) {
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
}

/**
 * Verifies if the incoming Express request is made by an Admin or HOD
 * Checks user-role / x-user-role headers, and falls back to verifying from UserModel in DB
 * @param {import('express').Request} req
 * @returns {Promise<boolean>}
 */
export async function verifyIsHodOrAdmin(req) {
  // 1. Direct header check
  const roleHeader =
    req.headers["user-role"] ||
    req.headers["x-user-role"] ||
    req.body?.userRole;

  if (isHodOrAdmin(roleHeader)) {
    return true;
  }

  // 2. Fallback to DB verification via username or userId
  const username =
    req.headers["username"] ||
    req.headers["x-username"] ||
    req.body?.username;

  const userId =
    req.headers["user-id"] ||
    req.headers["x-user-id"] ||
    req.body?.userId;

  if (username || userId) {
    try {
      const query = userId
        ? { _id: userId }
        : { username: { $regex: `^${username.trim()}$`, $options: "i" } };

      const dbUser = await UserModel.findOne(query).select("role").lean();
      if (dbUser && isHodOrAdmin(dbUser.role)) {
        return true;
      }
    } catch (e) {
      console.error("Error verifying user role from DB in verifyIsHodOrAdmin:", e);
    }
  }

  return false;
}
