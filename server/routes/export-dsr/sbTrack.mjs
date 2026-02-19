import express from "express";
import axios from "axios";

const router = express.Router();

/**
 * Custom House to Location Code mapping
 * Maps the custom house name to the ICEGATE location code
 */
const CUSTOM_HOUSE_CODE_MAP = {
    "AHMEDABAD AIR CARGO": "INAMD4",
    "AIR AHMEDABAD": "INAMD4",
    "ICD SABARMATI": "INSBI6",
    "ICD KHODIYAR": "INSBI6",
    "ICD VIRAMGAM": "INVGR6",
    "ICD SACHANA": "INJKA6",
    "ICD VIROCHANNAGAR": "INVCN6",
    "ICD VIROCHAN NAGAR": "INVCN6",
    "THAR DRY PORT": "INSAU6",
    "ICD SANAND": "INSND6",
    "ANKLESHWAR ICD": "INAKV6",
    "ICD VARNAMA": "INVRM6",
    "MUNDRA SEA": "INMUN1",
    "KANDLA SEA": "INIXY1",
    "COCHIN AIR CARGO": "INCOK4",
    "COCHIN SEA": "INCOK1",
    "HAZIRA": "INHZA1",
};

/**
 * POST /api/sb-track
 * Proxy API for ICEGATE SB Track service
 * 
 * Request body:
 * {
 *   sbNo: string,       // Shipping Bill Number
 *   sbDate: string,     // SB Date in YYYYMMDD format
 *   customHouse: string // Custom House name (to map to location code)
 * }
 * 
 * OR with locationCode directly:
 * {
 *   sbNo: string,
 *   sbDate: string,
 *   locationCode: string // Direct ICEGATE location code like "INSAU6"
 * }
 */
router.post("/api/sb-track", async (req, res) => {
    try {
        const { sbNo, sbDate, customHouse, locationCode } = req.body;

        if (!sbNo || !sbDate) {
            return res.status(400).json({
                success: false,
                message: "sbNo and sbDate are required"
            });
        }

        // Get location code - either from direct input or map from custom house
        let location = locationCode;
        if (!location && customHouse) {
            location = CUSTOM_HOUSE_CODE_MAP[customHouse.toUpperCase()] ||
                CUSTOM_HOUSE_CODE_MAP[customHouse];
        }

        if (!location) {
            return res.status(400).json({
                success: false,
                message: "locationCode or valid customHouse is required"
            });
        }

        // Format sbDate to YYYYMMDD if it's in different format
        let formattedSbDate = sbDate;
        if (sbDate.includes("-")) {
            // Convert from YYYY-MM-DD or DD-MM-YYYY to YYYYMMDD
            const parts = sbDate.split("-");
            if (parts[0].length === 4) {
                // YYYY-MM-DD format
                formattedSbDate = parts.join("");
            } else {
                // DD-MM-YYYY format
                formattedSbDate = `${parts[2]}${parts[1]}${parts[0]}`;
            }
        }

        // Call ICEGATE API
        const icegateUrl = "https://foservices.icegate.gov.in/enquiry/publicEnquiries/SBTrack_Ices_action_Public";

        const response = await axios.post(icegateUrl, {
            location: location,
            sbNo: sbNo,
            sbDate: formattedSbDate
        }, {
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json",
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
            },
            timeout: 30000 // 30 second timeout
        });

        res.json({
            success: true,
            data: response.data
        });

    } catch (error) {
        console.error("ICEGATE SB Track API error:", error.message);

        if (error.response) {
            return res.status(error.response.status).json({
                success: false,
                message: "ICEGATE API error",
                error: error.response.data
            });
        }

        if (error.code === "ECONNABORTED") {
            return res.status(504).json({
                success: false,
                message: "Request timeout - ICEGATE is taking too long to respond"
            });
        }

        res.status(500).json({
            success: false,
            message: "Failed to fetch SB tracking data",
            error: error.message
        });
    }
});

export default router;
