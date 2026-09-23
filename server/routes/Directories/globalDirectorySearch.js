import express from "express";
import Directory from "../../model/Directorties/Directory.js";
import AirlineCode from "../../model/Directorties/AirlineCode.js";
import Country from "../../model/Directorties/Country.js";
import ShippingLine from "../../model/Directorties/ShippingLine.js";
import SeaPort from "../../model/Directorties/SeaPort.js";
import AirPort from "../../model/Directorties/AirPort.js";
import GatewayPort from "../../model/Directorties/gatwayPort.js";
import District from "../../model/Directorties/District.js";
import Transporter from "../../model/Directorties/Transporter.js";
import TerminalCode from "../../model/Directorties/TerminalCode.js";
import GeneralOrg from "../../model/Directorties/GeneralOrg.js";
import ForwarderModel from "../../model/export/ForwarderModel.mjs";
import Drawback from "../../model/export/DrawbackModel.js";

const router = express.Router();

function escapeRegex(str) {
  return str.replace(/[.*+?^$\{\}()|[\]\\]/g, "\\$&");
}

router.get("/api/directories/global-search", async (req, res) => {
  try {
    const rawQuery = (req.query.q || req.query.search || "").trim();
    if (!rawQuery) {
      return res.json({ success: true, results: [], total: 0 });
    }

    const escaped = escapeRegex(rawQuery);
    const regex = new RegExp(escaped, "i");
    const limitPerCategory = 5;

    const tasks = [
      // 1. Organization
      (async () => {
        const docs = await Directory.find({
          $or: [
            { organization: regex },
            { alias: regex },
            { "registrationDetails.ieCode": regex },
            { "registrationDetails.panNo": regex },
            { "branchInfo.gstNo": regex },
            { "branchInfo.city": regex },
          ],
        })
          .limit(limitPerCategory)
          .lean();

        return docs.map((doc) => ({
          directory: "Organization",
          id: doc._id,
          title: doc.organization || "Unnamed Org",
          subtitle: `IE: ${doc.registrationDetails?.ieCode || "N/A"} | PAN: ${
            doc.registrationDetails?.panNo || "N/A"
          } | City: ${doc.branchInfo?.[0]?.city || doc.branchInfo?.[0]?.state || "N/A"}`,
        }));
      })(),

      // 2. Airline Code
      (async () => {
        const docs = await AirlineCode.find({
          $or: [
            { airlineName: regex },
            { alphanumericCode: regex },
            { numericCode: regex },
          ],
        })
          .limit(limitPerCategory)
          .lean();

        return docs.map((doc) => ({
          directory: "Airline Code",
          id: doc._id,
          title: doc.airlineName || doc.alphanumericCode,
          subtitle: `Alphanumeric: ${doc.alphanumericCode || "N/A"} | Numeric: ${
            doc.numericCode || "N/A"
          } | Status: ${doc.status || "Active"}`,
        }));
      })(),

      // 3. Country Code
      (async () => {
        const docs = await Country.find({
          $or: [{ countryName: regex }, { countryCode: regex }],
        })
          .limit(limitPerCategory)
          .lean();

        return docs.map((doc) => ({
          directory: "Country Code",
          id: doc._id,
          title: doc.countryName || doc.countryCode,
          subtitle: `Code: ${doc.countryCode || "N/A"} | Status: ${doc.status || "Active"}`,
        }));
      })(),

      // 4. Shipping Line Code & Shipping Line
      (async () => {
        const docs = await ShippingLine.find({
          $or: [
            { name: regex },
            { "branches.branchName": regex },
            { "branches.city": regex },
            { "branches.gst": regex },
            { "branches.pan": regex },
          ],
        })
          .limit(limitPerCategory)
          .lean();

        return docs.map((doc) => ({
          directory: "Shipping Line",
          id: doc._id,
          title: doc.name,
          subtitle: `GST: ${doc.branches?.[0]?.gst || "N/A"} | City: ${
            doc.branches?.[0]?.city || "N/A"
          }`,
        }));
      })(),

      // 5. Port Code-Sea
      (async () => {
        const docs = await SeaPort.find({
          $or: [
            { portName: regex },
            { portCode: regex },
            { uneceCode: regex },
            { country: regex },
            { state: regex },
          ],
        })
          .limit(limitPerCategory)
          .lean();

        return docs.map((doc) => ({
          directory: "Port Code-Sea",
          id: doc._id,
          title: `${doc.portName || "Unnamed"} (${doc.portCode || "N/A"})`,
          subtitle: `UNECE: ${doc.uneceCode || "N/A"} | Country: ${doc.country || "N/A"}`,
        }));
      })(),

      // 6. Port Code-Air
      (async () => {
        const docs = await AirPort.find({
          $or: [
            { portName: regex },
            { portCode: regex },
            { uneceCode: regex },
            { country: regex },
            { state: regex },
          ],
        })
          .limit(limitPerCategory)
          .lean();

        return docs.map((doc) => ({
          directory: "Port Code-Air",
          id: doc._id,
          title: `${doc.portName || "Unnamed"} (${doc.portCode || "N/A"})`,
          subtitle: `UNECE: ${doc.uneceCode || "N/A"} | Country: ${doc.country || "N/A"}`,
        }));
      })(),

      // 7. Gateway Port
      (async () => {
        const docs = await GatewayPort.find({
          $or: [
            { name: regex },
            { unece_code: regex },
            { location: regex },
            { port_type: regex },
          ],
        })
          .limit(limitPerCategory)
          .lean();

        return docs.map((doc) => ({
          directory: "Gateway Port",
          id: doc._id,
          title: doc.name || "Unnamed Gateway Port",
          subtitle: `UNECE: ${doc.unece_code || "N/A"} | Type: ${
            doc.port_type || "N/A"
          } | Location: ${doc.location || "N/A"}`,
        }));
      })(),

      // 8. District
      (async () => {
        const docs = await District.find({
          $or: [
            { districtName: regex },
            { districtCode: regex },
            { stateName: regex },
            { stateCode: regex },
          ],
        })
          .limit(limitPerCategory)
          .lean();

        return docs.map((doc) => ({
          directory: "District",
          id: doc._id,
          title: `${doc.districtName || "Unnamed"} (${doc.districtCode || "N/A"})`,
          subtitle: `State: ${doc.stateName || "N/A"} (${doc.stateCode || "N/A"})`,
        }));
      })(),

      // 9. Transporter
      (async () => {
        const docs = await Transporter.find({
          $or: [
            { name: regex },
            { "branches.branchName": regex },
            { "branches.city": regex },
            { "branches.gst": regex },
            { "branches.pan": regex },
          ],
        })
          .limit(limitPerCategory)
          .lean();

        return docs.map((doc) => ({
          directory: "Transporter",
          id: doc._id,
          title: doc.name,
          subtitle: `GST: ${doc.branches?.[0]?.gst || "N/A"} | City: ${
            doc.branches?.[0]?.city || "N/A"
          }`,
        }));
      })(),

      // 10. Terminal Code
      (async () => {
        const docs = await TerminalCode.find({
          $or: [
            { name: regex },
            { "branches.branchName": regex },
            { "branches.city": regex },
            { "branches.gst": regex },
          ],
        })
          .limit(limitPerCategory)
          .lean();

        return docs.map((doc) => ({
          directory: "Terminal Code",
          id: doc._id,
          title: doc.name,
          subtitle: `GST: ${doc.branches?.[0]?.gst || "N/A"} | City: ${
            doc.branches?.[0]?.city || "N/A"
          }`,
        }));
      })(),

      // 11. General Org
      (async () => {
        const docs = await GeneralOrg.find({
          $or: [
            { name: regex },
            { "branches.branchName": regex },
            { "branches.city": regex },
            { "branches.gst": regex },
            { "branches.pan": regex },
          ],
        })
          .limit(limitPerCategory)
          .lean();

        return docs.map((doc) => ({
          directory: "General Org",
          id: doc._id,
          title: doc.name,
          subtitle: `GST: ${doc.branches?.[0]?.gst || "N/A"} | City: ${
            doc.branches?.[0]?.city || "N/A"
          }`,
        }));
      })(),

      // 12. Forwarder
      (async () => {
        const docs = await ForwarderModel.find({
          $or: [
            { name: regex },
            { "branches.branchName": regex },
            { "branches.city": regex },
            { "branches.gst": regex },
            { "branches.pan": regex },
          ],
        })
          .limit(limitPerCategory)
          .lean();

        return docs.map((doc) => ({
          directory: "Forwarder",
          id: doc._id,
          title: doc.name,
          subtitle: `GST: ${doc.branches?.[0]?.gst || "N/A"} | City: ${
            doc.branches?.[0]?.city || "N/A"
          }`,
        }));
      })(),

      // 13. Drawback
      (async () => {
        const docs = await Drawback.find({
          $or: [
            { tariff_item: regex },
            { description_of_goods: regex },
            { chapter: regex },
          ],
        })
          .limit(limitPerCategory)
          .lean();

        return docs.map((doc) => ({
          directory: "Drawback",
          id: doc._id,
          title: `${doc.tariff_item} - ${(doc.description_of_goods || "").substring(0, 60)}`,
          subtitle: `Chapter: ${doc.chapter || "N/A"} | Rate: ${
            doc.drawback_rate || "N/A"
          } | Cap: ${doc.drawback_cap || "N/A"}`,
        }));
      })(),
    ];

    const settled = await Promise.allSettled(tasks);
    const results = [];

    settled.forEach((res) => {
      if (res.status === "fulfilled" && Array.isArray(res.value)) {
        results.push(...res.value);
      } else if (res.status === "rejected") {
        console.error("Directory search error in task:", res.reason);
      }
    });

    return res.json({
      success: true,
      query: rawQuery,
      total: results.length,
      results,
    });
  } catch (error) {
    console.error("Global directory search handler error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error during directory search",
      error: error.message,
    });
  }
});

export default router;
