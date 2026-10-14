/**
 * Admin Role Verification Middleware
 * 
 * This middleware validates the user's role directly from the database
 * to prevent client-side localStorage tampering.
 * 
 * SECURITY: Never trust client-side role claims (localStorage, headers, etc.)
 * Always verify against the database for admin operations.
 */

import UserModel from "../model/userModel.mjs";

/**
 * Middleware to verify user has Admin role from the database
 * Expects 'username' to be passed in request body, query, or headers
 */
export const requireAdmin = async (req, res, next) => {
    try {
        // 1. If user was already cryptographically authenticated by JWT middleware
        if (req.user) {
            if ((req.user.role || "").toLowerCase() !== "admin") {
                console.warn(`⚠️ Unauthorized admin access attempt by user: ${req.user.username} (role: ${req.user.role})`);
                return res.status(403).json({
                    success: false,
                    message: "Access denied: Admin privileges required"
                });
            }
            req.verifiedUser = req.user;
            return next();
        }

        // 2. Fallback for endpoints before global JWT or without req.user
        const username =
            req.body?.requestingUser ||
            req.query?.requestingUser ||
            req.headers["x-username"] ||
            req.headers["username"];

        if (!username) {
            return res.status(401).json({
                success: false,
                message: "Authentication required: No username provided"
            });
        }

        // Always verify role from database, never trust client
        const user = await UserModel.findOne({ username }).select("role username");

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "User not found"
            });
        }

        if (user.role?.toLowerCase() !== "admin") {
            console.warn(`⚠️ Unauthorized admin access attempt by user: ${username} (role: ${user.role})`);
            return res.status(403).json({
                success: false,
                message: "Access denied: Admin privileges required"
            });
        }

        // Attach verified user info to request for downstream use
        req.verifiedUser = user;
        next();
    } catch (error) {
        console.error("Admin verification error:", error);
        return res.status(500).json({
            success: false,
            message: "Server error during authorization"
        });
    }
};

/**
 * Middleware to verify user exists and attach to request
 * Less strict than requireAdmin, just validates user exists
 */
export const requireAuth = async (req, res, next) => {
    try {
        const username =
            req.body?.username ||
            req.body?.requestingUser ||
            req.query?.username ||
            req.headers["x-username"] ||
            req.headers["username"];

        if (!username) {
            return res.status(401).json({
                success: false,
                message: "Authentication required"
            });
        }

        const user = await UserModel.findOne({ username }).select("role username modules");

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "User not found"
            });
        }

        req.verifiedUser = user;
        next();
    } catch (error) {
        console.error("Auth verification error:", error);
        return res.status(500).json({
            success: false,
            message: "Server error during authentication"
        });
    }
};

/**
 * Utility function to check admin role in any route handler
 * Use this when you need inline role checking instead of middleware
 */
export const isAdminUser = async (username) => {
    if (!username) return false;

    try {
        const user = await UserModel.findOne({ username }).select("role");
        return user?.role?.toLowerCase() === "admin";
    } catch (error) {
        console.error("Admin check error:", error);
        return false;
    }
};

export default { requireAdmin, requireAuth, isAdminUser };
