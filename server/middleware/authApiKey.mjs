const authApiKey = (req, res, next) => {
    const apiKey = req.header("x-api-key");
    const validKey = process.env.TALLY_API_KEY || "suraj123";
    if (!apiKey || apiKey !== validKey) {
        return res.status(403).json({ error: "Unauthorized access: Invalid API Key" });
    }
    next();
};
export default authApiKey;