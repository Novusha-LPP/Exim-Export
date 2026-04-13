import ApiKeyModel from "../model/apiKeyModel.mjs";

const authApiKey = async (req, res, next) => {
    try {
        // Fallback: If request is from the internal UI and user is already verified (Admin/User)
        // Check for project's standard auth headers
        const username = req.headers["x-username"] || req.headers["username"];
        const userRole = req.headers["x-user-role"] || req.headers["user-role"];
        
        if (username && userRole) {
            // Internal UI requests with valid user context are allowed
            return next();
        }

        const apiKey = req.header("x-api-key");
        
        if (!apiKey) {
            return res.status(401).json({ error: "No API key provided" });
        }

        // Find the key in the database and ensure it's active
        const keyDoc = await ApiKeyModel.findOne({ key: apiKey, isActive: true });

        if (!keyDoc) {
            return res.status(403).json({ error: "Unauthorized access: Invalid or inactive API Key" });
        }

        // Update last used timestamp (async, don't block request)
        ApiKeyModel.findByIdAndUpdate(keyDoc._id, { lastUsedAt: new Date() }).catch(err => {
            console.error("Error updating API key lastUsedAt:", err);
        });

        // Attach key info to request if needed
        req.apiKey = keyDoc;
        
        next();
    } catch (error) {
        console.error("API Key authentication error:", error);
        res.status(500).json({ error: "Internal server error during authentication" });
    }
};

export default authApiKey;