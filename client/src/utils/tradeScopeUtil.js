/**
 * Utility to resolve Import & Export API URLs dynamically across
 * localhost, LAN IPs, and production domains.
 */
export function getTradeApis(currentBaseUrl, isImportProject = true) {
  let importApi = "";
  let exportApi = "";

  const hasWindow = typeof window !== "undefined" && window.location;
  const protocol = hasWindow ? window.location.protocol : "http:";
  const hostname = hasWindow ? (window.location.hostname || "localhost") : "localhost";

  // Check if access is local or LAN IP
  const isLocalOrIp =
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "0.0.0.0" ||
    /^192\.168\.\d+\.\d+$/.test(hostname) ||
    /^10\.\d+\.\d+\.\d+$/.test(hostname) ||
    /^172\.(1[6-9]|2\d|3[01])\.\d+\.\d+$/.test(hostname);

  // 1. Localhost or LAN IP: Use distinct backend ports (9006 for Import, 9002 for Export)
  if (isLocalOrIp) {
    importApi = `${protocol}//${hostname}:9006/api`;
    exportApi = `${protocol}//${hostname}:9002/api`;
    return { importApi, exportApi };
  }

  // 2. Production Domain: Subdomain pattern (e.g., import.alvision.in <-> export.alvision.in)
  // NEVER attach ports (like :9002 or :9006) to production domains!
  if (/^import\./i.test(hostname)) {
    importApi = `${protocol}//${hostname}/api`;
    exportApi = `${protocol}//${hostname.replace(/^import\./i, "export.")}/api`;
    return { importApi, exportApi };
  }

  if (/^export\./i.test(hostname)) {
    exportApi = `${protocol}//${hostname}/api`;
    importApi = `${protocol}//${hostname.replace(/^export\./i, "import.")}/api`;
    return { importApi, exportApi };
  }

  if (/^testingimport\./i.test(hostname)) {
    importApi = `${protocol}//${hostname}/api`;
    exportApi = `${protocol}//${hostname.replace(/^testingimport\./i, "testingexport.")}/api`;
    return { importApi, exportApi };
  }

  if (/^testingexport\./i.test(hostname)) {
    exportApi = `${protocol}//${hostname}/api`;
    importApi = `${protocol}//${hostname.replace(/^testingexport\./i, "testingimport.")}/api`;
    return { importApi, exportApi };
  }

  // 3. Path-based production pattern (e.g. eximbot.alvision.in/import/api <-> eximbot.alvision.in/export/api)
  const base = (currentBaseUrl || "").trim().replace(/\/+$/, "");

  if (base.includes("/import/api")) {
    importApi = base;
    exportApi = base.replace("/import/api", "/export/api");
    return { importApi, exportApi };
  }

  if (base.includes("/export/api")) {
    exportApi = base;
    importApi = base.replace("/export/api", "/import/api");
    return { importApi, exportApi };
  }

  if (base.includes("import.")) {
    importApi = base;
    exportApi = base.replace(/import\./i, "export.");
    return { importApi, exportApi };
  }

  if (base.includes("export.")) {
    exportApi = base;
    importApi = base.replace(/export\./i, "import.");
    return { importApi, exportApi };
  }

  // 4. Fallback based on project mode
  const originBase = hasWindow ? `${window.location.origin}/api` : "";
  const effective = base || originBase;

  if (isImportProject) {
    importApi = effective || "http://localhost:9006/api";
    exportApi = importApi.includes("9006")
      ? importApi.replace(/9006/g, "9002")
      : (importApi.includes("import") ? importApi.replace(/import/gi, "export") : importApi);
  } else {
    exportApi = effective || "http://localhost:9002/api";
    importApi = exportApi.includes("9002")
      ? exportApi.replace(/9002/g, "9006")
      : (exportApi.includes("export") ? exportApi.replace(/export/gi, "import") : exportApi);
  }

  return { importApi, exportApi };
}
