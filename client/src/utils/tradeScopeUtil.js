/**
 * Utility to resolve Import & Export API URLs dynamically across
 * localhost, LAN IPs, and production domains.
 *
 * In Vite, environment variables MUST be referenced directly
 * (e.g. import.meta.env.VITE_API_STRING) so that Vite's compiler
 * can statically inline their values into the production bundle.
 */

// Direct static references so Vite compiler inlines string literals at compile time
const STATIC_EXPORT_API =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_EXPORT_API_STRING) ||
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_STRING) ||
  "";

const STATIC_IMPORT_API =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_IMPORT_API_STRING) ||
  "";

const NODE_EXPORT_API =
  (typeof process !== "undefined" && (process.env?.VITE_EXPORT_API_STRING || process.env?.VITE_API_STRING || process.env?.REACT_APP_EXPORT_API_STRING || process.env?.REACT_APP_API_STRING)) || "";

const NODE_IMPORT_API =
  (typeof process !== "undefined" && (process.env?.VITE_IMPORT_API_STRING || process.env?.REACT_APP_IMPORT_API_STRING)) || "";

const EFFECTIVE_EXPORT = STATIC_EXPORT_API || NODE_EXPORT_API || "";
const EFFECTIVE_IMPORT = STATIC_IMPORT_API || NODE_IMPORT_API || "";

export function getTradeApis(currentBaseUrl, isImportProject = false) {
  let importApi = "";
  let exportApi = "";

  const hasWindow = typeof window !== "undefined" && window.location;
  const protocol = hasWindow ? window.location.protocol : "http:";
  const hostname = hasWindow ? (window.location.hostname || "localhost") : "localhost";

  const base = (currentBaseUrl || (isImportProject ? EFFECTIVE_IMPORT : EFFECTIVE_EXPORT) || "").trim().replace(/\/+$/, "");
  const exportEnv = (EFFECTIVE_EXPORT || "").trim().replace(/\/+$/, "");
  const importEnv = (EFFECTIVE_IMPORT || "").trim().replace(/\/+$/, "");

  // 1. If explicit export & import overrides are provided from env, use them
  if (base && exportEnv && isImportProject) {
    return {
      importApi: base,
      exportApi: exportEnv,
    };
  }

  if (base && importEnv && !isImportProject) {
    return {
      importApi: importEnv,
      exportApi: base,
    };
  }

  if (exportEnv && importEnv) {
    return {
      importApi: importEnv,
      exportApi: exportEnv,
    };
  }

  // 2. Derive export/import from configured base URL (.env)
  if (base) {
    if (base.includes("/import/api")) {
      return {
        importApi: base,
        exportApi: exportEnv || base.replace("/import/api", "/export/api"),
      };
    }

    if (base.includes("/export/api")) {
      return {
        importApi: importEnv || base.replace("/export/api", "/import/api"),
        exportApi: base,
      };
    }

    if (base.includes(":9006")) {
      let resolvedImport = base;
      let resolvedExport = base.replace(":9006", ":9002");
      // If accessed from LAN (e.g. 192.168.x.x) and base is localhost, rewrite hostname to LAN IP
      if (hasWindow && hostname !== "localhost" && hostname !== "127.0.0.1") {
        try {
          const u1 = new URL(resolvedImport);
          if (u1.hostname === "localhost" || u1.hostname === "127.0.0.1") {
            u1.hostname = hostname;
            resolvedImport = u1.toString().replace(/\/+$/, "");
          }
          const u2 = new URL(resolvedExport);
          if (u2.hostname === "localhost" || u2.hostname === "127.0.0.1") {
            u2.hostname = hostname;
            resolvedExport = u2.toString().replace(/\/+$/, "");
          }
        } catch (_) {}
      }
      return { importApi: resolvedImport, exportApi: resolvedExport };
    }

    if (base.includes(":9002")) {
      let resolvedExport = base;
      let resolvedImport = base.replace(":9002", ":9006");
      if (hasWindow && hostname !== "localhost" && hostname !== "127.0.0.1") {
        try {
          const u1 = new URL(resolvedImport);
          if (u1.hostname === "localhost" || u1.hostname === "127.0.0.1") {
            u1.hostname = hostname;
            resolvedImport = u1.toString().replace(/\/+$/, "");
          }
          const u2 = new URL(resolvedExport);
          if (u2.hostname === "localhost" || u2.hostname === "127.0.0.1") {
            u2.hostname = hostname;
            resolvedExport = u2.toString().replace(/\/+$/, "");
          }
        } catch (_) {}
      }
      return { importApi: resolvedImport, exportApi: resolvedExport };
    }

    if (/testingimport\./i.test(base)) {
      return {
        importApi: base,
        exportApi: base.replace(/testingimport\./i, "testingexport."),
      };
    }

    if (/testingexport\./i.test(base)) {
      return {
        importApi: base.replace(/testingexport\./i, "testingimport."),
        exportApi: base,
      };
    }

    // Default derivation from base URL
    if (isImportProject) {
      return {
        importApi: base,
        exportApi: base.replace(/9006/g, "9002").replace(/import/gi, "export"),
      };
    } else {
      return {
        importApi: base.replace(/9002/g, "9006").replace(/export/gi, "import"),
        exportApi: base,
      };
    }
  }

  // 3. Fallback when NO .env / base URL is provided
  // Never point API to import.alvision.in or export.alvision.in (those are S3 static web hosts, not API servers!)
  const isLocalOrIp =
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "0.0.0.0" ||
    /^192\.168\.\d+\.\d+$/.test(hostname) ||
    /^10\.\d+\.\d+\.\d+$/.test(hostname) ||
    /^172\.(1[6-9]|2\d|3[01])\.\d+\.\d+$/.test(hostname);

  if (isLocalOrIp) {
    importApi = `${protocol}//${hostname}:9006/api`;
    exportApi = `${protocol}//${hostname}:9002/api`;
    return { importApi, exportApi };
  }

  // Production fallback: API server is eximbot.alvision.in
  return {
    importApi: "https://eximbot.alvision.in/import/api",
    exportApi: "https://eximbot.alvision.in/export/api",
  };
}
