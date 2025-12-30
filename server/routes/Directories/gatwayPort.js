import express from "express";
import GatewayPort from "../../model/Directorties/gatwayPort.js";

const router = express.Router();

// GET /api/gateway-ports?search=&status=&type=&page=1&limit=20
router.get("/", async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search = "",
      status = "",
      type = "",
    } = req.query;

    const query = {};

    if (status) query.status = status;
    if (type) query.port_type = type;

    if (search?.trim()) {
      const s = search.trim();
      query.$or = [
        { name: { $regex: s, $options: "i" } },
        { unece_code: { $regex: s, $options: "i" } },
        { portName: { $regex: s, $options: "i" } },
        { portCode: { $regex: s, $options: "i" } },
      ];
    }

    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const lim = Math.max(parseInt(limit, 10) || 20, 1);
    const skip = (pageNum - 1) * lim;

    const [data, total] = await Promise.all([
      GatewayPort.find(query)
        .sort({ name: 1 })
        .skip(skip)
        .limit(lim),
      GatewayPort.countDocuments(query),
    ]);

    const totalPages = Math.ceil(total / lim) || 1;

    res.json({
      data,
      pagination: {
        total,
        totalPages,
        currentPage: pageNum,
        limit: lim,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/gateway-ports/:id
router.get("/:id", async (req, res) => {
  try {
    const port = await GatewayPort.findById(req.params.id);
    if (!port) return res.status(404).json({ message: "Not found" });
    res.json(port);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST /api/gateway-ports
router.post("/", async (req, res) => {
  try {
    const newPort = new GatewayPort(req.body);
    const saved = await newPort.save();
    res.status(201).json(saved);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// PUT /api/gateway-ports/:id
router.put("/:id", async (req, res) => {
  try {
    const updated = await GatewayPort.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!updated) return res.status(404).json({ message: "Not found" });
    res.json(updated);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// DELETE /api/gateway-ports/:id
router.delete("/:id", async (req, res) => {
  try {
    const deleted = await GatewayPort.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Not found" });
    res.json({ message: "Deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// BULK DELETE /api/gateway-ports  body: { ids: [] }
router.delete("/", async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || !ids.length) {
      return res.status(400).json({ message: "ids array required" });
    }
    const result = await GatewayPort.deleteMany({ _id: { $in: ids } });
    res.json({ deletedCount: result.deletedCount });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
