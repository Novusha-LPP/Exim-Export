/**
 * Utility to resolve Import & Export API URLs dynamically across
 * localhost, LAN IPs, and production domains.
 */
export function getTradeApis(currentBaseUrl, isImportProject = true) {
  let importApi = "";
  let exportApi = "";

  const base = (currentBaseUrl || "").trim().replace(/\/+$/, "");

  if (base.includes("/import/api")) {
    importApi = base;
    exportApi = base.replace("/import/api", "/export/api");
  } else if (base.includes("/export/api")) {
    exportApi = base;
    importApi = base.replace("/export/api", "/import/api");
  } else if (base.includes(":9006")) {
    importApi = base;
    exportApi = base.replace(":9006", ":9002");
  } else if (base.includes(":9002")) {
    exportApi = base;
    importApi = base.replace(":9002", ":9006");
  } else {
    if (isImportProject) {
      importApi = base || "http://localhost:9006/api";
      exportApi = (base || "http://localhost:9006/api").replace(/9006/g, "9002");
    } else {
      exportApi = base || "http://localhost:9002/api";
      importApi = (base || "http://localhost:9002/api").replace(/9002/g, "9006");
    }
  }

  // Handle dynamic IP / hostname (e.g. if accessed via LAN or Cloudflare tunnel)
  if (typeof window !== "undefined" && window.location?.hostname) {
    const host = window.location.hostname;
    if (host !== "localhost" && host !== "127.0.0.1") {
      try {
        const u1 = new URL(importApi);
        u1.hostname = host;
        importApi = u1.toString().replace(/\/+$/, "");
      } catch (e) {}
      try {
        const u2 = new URL(exportApi);
        u2.hostname = host;
        exportApi = u2.toString().replace(/\/+$/, "");
      } catch (e) {}
    }
  }

  return { importApi, exportApi };
}
