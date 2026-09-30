import express from "express";
import * as masterData from "./masterListData.js";

const router = express.Router();

// Map category aliases to masterData keys
const CATEGORY_MAP = {
  states: "states",
  statecodemap: "stateCodeMap",
  "state-code-map": "stateCodeMap",
  cfs: "cfs",
  natureofcargo: "natureOfCargo",
  "nature-of-cargo": "natureOfCargo",
  unitcodes: "unitCodes",
  "unit-codes": "unitCodes",
  endusecodes: "END_USE_CODES",
  "end-use-codes": "END_USE_CODES",
  end_use_codes: "END_USE_CODES",
  ptaftacodes: "PTA_FTA_CODES",
  "pta-fta-codes": "PTA_FTA_CODES",
  pta_fta_codes: "PTA_FTA_CODES",
  eximcodes: "eximCodes",
  "exim-codes": "eximCodes",
  currencylist: "currencyList",
  currencies: "currencyList",
  "currency-list": "currencyList",
  shippinglines: "SHIPPING_LINES",
  "shipping-lines": "SHIPPING_LINES",
  shipping_lines: "SHIPPING_LINES",
  hauliers: "hauliers",
};

// Set long-lived HTTP caching headers (1 day cache, 7 days stale-while-revalidate)
const setCacheHeaders = (res) => {
  res.setHeader("Cache-Control", "public, max-age=86400, stale-while-revalidate=604800");
};

/**
 * GET /api/directories/master-list/all
 * GET /api/master-list/all
 * Returns all master list datasets in a single bundle (gzipped over HTTP).
 */
router.get("/all", (req, res) => {
  try {
    setCacheHeaders(res);
    return res.status(200).json({
      success: true,
      data: {
        states: masterData.states || [],
        stateCodeMap: masterData.stateCodeMap || {},
        cfs: masterData.cfs || [],
        natureOfCargo: masterData.natureOfCargo || [],
        unitCodes: masterData.unitCodes || [],
        END_USE_CODES: masterData.END_USE_CODES || [],
        PTA_FTA_CODES: masterData.PTA_FTA_CODES || [],
        eximCodes: masterData.eximCodes || [],
        currencyList: masterData.currencyList || [],
        SHIPPING_LINES: masterData.SHIPPING_LINES || [],
        hauliers: masterData.hauliers || [],
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/directories/master-list
 * GET /api/master-list
 * Returns list of available master list categories and their counts.
 */
router.get("/", (req, res) => {
  try {
    setCacheHeaders(res);
    const summary = {
      states: (masterData.states || []).length,
      cfs: (masterData.cfs || []).length,
      natureOfCargo: (masterData.natureOfCargo || []).length,
      unitCodes: (masterData.unitCodes || []).length,
      END_USE_CODES: (masterData.END_USE_CODES || []).length,
      PTA_FTA_CODES: (masterData.PTA_FTA_CODES || []).length,
      eximCodes: (masterData.eximCodes || []).length,
      currencyList: (masterData.currencyList || []).length,
      stateCodeMap: Object.keys(masterData.stateCodeMap || {}).length,
      SHIPPING_LINES: (masterData.SHIPPING_LINES || []).length,
      hauliers: (masterData.hauliers || []).length,
    };
    return res.status(200).json({
      success: true,
      categories: Object.keys(summary),
      counts: summary,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/directories/master-list/:category
 * GET /api/master-list/:category
 * Returns data for a specific master list category with optional search & pagination.
 */
router.get("/:category", (req, res) => {
  try {
    const rawCategory = (req.params.category || "").toLowerCase();
    const targetKey = CATEGORY_MAP[rawCategory];

    if (!targetKey || masterData[targetKey] === undefined) {
      return res.status(404).json({
        success: false,
        message: `Master list category '${req.params.category}' not found. Available: ${Object.keys(CATEGORY_MAP).join(", ")}`,
      });
    }

    setCacheHeaders(res);
    let data = masterData[targetKey];

    // For stateCodeMap (object)
    if (!Array.isArray(data)) {
      return res.status(200).json({ success: true, data });
    }

    const { search, limit, page } = req.query;

    // Optional search filtering (especially useful for shipping lines & hauliers)
    if (search && typeof search === "string" && search.trim()) {
      const q = search.trim().toUpperCase();
      data = data.filter((item) => {
        if (typeof item === "string") return item.toUpperCase().includes(q);
        if (item && typeof item === "object") {
          return (
            (item.label && item.label.toUpperCase().includes(q)) ||
            (item.value && item.value.toUpperCase().includes(q)) ||
            (item.code && item.code.toUpperCase().includes(q)) ||
            (item.description && item.description.toUpperCase().includes(q)) ||
            (item.country && item.country.toUpperCase().includes(q)) ||
            (item.agreement && item.agreement.toUpperCase().includes(q))
          );
        }
        return false;
      });
    }

    const total = data.length;

    // Optional pagination
    if (limit) {
      const limitNum = parseInt(limit, 10);
      const pageNum = parseInt(page, 10) || 1;
      const skip = (pageNum - 1) * limitNum;
      data = data.slice(skip, skip + limitNum);

      return res.status(200).json({
        success: true,
        data,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum),
        },
      });
    }

    return res.status(200).json({
      success: true,
      total,
      data,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
