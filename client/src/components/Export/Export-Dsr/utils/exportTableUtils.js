export const getPreviousDayDate = (dateVal) => {
  if (!dateVal) return "";
  const str = String(dateVal).trim();
  let d = null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    const parts = str.split("-");
    d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
  } else {
    const dmy = str.match(/^(\d{2})[\-\/](\d{2})[\-\/](\d{4})/);
    if (dmy) {
      d = new Date(parseInt(dmy[3], 10), parseInt(dmy[2], 10) - 1, parseInt(dmy[1], 10));
    } else {
      d = new Date(str);
    }
  }
  if (!d || isNaN(d.getTime())) return "";
  d.setDate(d.getDate() - 1);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const hasClubBillingDate = (job) =>
  (job?.operations || []).some((operation) =>
    (operation?.statusDetails || []).some((details) =>
      details.billing_details?.agency_bill_date ||
      details.billing_details?.reimbursement_bill_date
    )
  );

// --- UI UX Premium Themes ---
export const statusThemes = {
  "Pending": { bg: "#f8fafc", border: "#94a3b8", text: "#475569", light: "#f1f5f9" },
  "SB Filed": { bg: "#f0f9ff", border: "#0ea5e9", text: "#0369a1", light: "#e0f2fe" },
  "L.E.O": { bg: "#fff1f2", border: "#f43f5e", text: "#be123c", light: "#ffe4e6" },
  "Container HO": { bg: "#f0fdf4", border: "#22c55e", text: "#15803d", light: "#dcfce7" },
  "File Handover to IATA": { bg: "#f0fdf4", border: "#22c55e", text: "#15803d", light: "#dcfce7" },
  "Rail Out": { bg: "#f5f3ff", border: "#8b5cf6", text: "#6d28d9", light: "#ede9fe" },
  "Departure": { bg: "#f5f3ff", border: "#8b5cf6", text: "#6d28d9", light: "#ede9fe" },
  "Send for Billing": { bg: "#fdf2f8", border: "#ec4899", text: "#be185d", light: "#fce7f3" },
  "Billing Pending": { bg: "#fff7ed", border: "#f59e0b", text: "#b45309", light: "#ffedd5" },
  "Billing Done": { bg: "#f0fdfa", border: "#14b8a6", text: "#0f766e", light: "#ccfbf1" },
  "Completed": { bg: "#f1f5f9", border: "#64748b", text: "#334155", light: "#e2e8f0" },
  "default": { bg: "transparent", border: "#e5e7eb", text: "#374151", light: "#f9fafb" }
};

export const getStatusTheme = (statusValue) => {
  return statusThemes[statusValue] || statusThemes["default"];
};

export const getStatusColor = (statusValue) => getStatusTheme(statusValue).bg;

export const buildShippingLineUrls = (num, containerFirst = "") => ({
  MSC: "https://www.msc.com/en/track-a-shipment",
  "M S C": "https://www.msc.com/en/track-a-shipment",
  "MSC LINE": "https://www.msc.com/en/track-a-shipment",
  "Maersk Line": `https://www.maersk.com/tracking/${num}`,
  "CMA CGM AGENCIES INDIA PVT. LTD": "https://www.cma-cgm.com/ebusiness/tracking/search",
  "Hapag-Lloyd": `https://www.hapag-lloyd.com/en/online-business/track/track-by-booking-solution.html?booking=${num}`,
  "Trans Asia": `http://182.72.192.230/TASFREIGHT/AppTasnet/ContainerTracking.aspx?&containerno=${containerFirst}&booking=${num}`,
  "ONE LINE": "https://ecomm.one-line.com/one-ecom/manage-shipment/cargo-tracking",
  HMM: "https://www.hmm21.com/e-service/general/trackNTrace/TrackNTrace.do",
  HYUNDI: "https://www.hmm21.com/e-service/general/trackNTrace/TrackNTrace.do",
  "Cosco Container Lines": "https://elines.coscoshipping.com/ebusiness/cargotracking",
  COSCO: "https://elines.coscoshipping.com/ebusiness/cargotracking",
  "Unifeeder Agencies India Pvt Ltd": num
    ? `https://www.unifeeder.cargoes.com/tracking?ID=${num.slice(0, 3)}%2F${num.slice(3, 6)}%2F${num.slice(6, 8)}%2F${num.slice(8)}`
    : "#",
  UNIFEEDER: num
    ? `https://www.unifeeder.cargoes.com/tracking?ID=${num.slice(0, 3)}%2F${num.slice(3, 6)}%2F${num.slice(6, 8)}%2F${num.slice(8)}`
    : "#",
});

export const isoCodeToType = {
  // 20ft
  "2000": "20 DRY",
  "2054": "20 ODC",
  "2200": "20 GP",
  "2210": "20 VENT",
  "2220": "20 HC",
  "2230": "20 RF",
  "2250": "20 OT",
  "2260": "20 OS",
  "2270": "20 TANK",
  "2276": "20 TANK",
  "2263": "20 FLAT",
  "2510": "20 HC",
  "2530": "20 HCRF",
  "2550": "20 OTHC",
  // 40ft
  "4210": "40 VENT",
  "4230": "40 RF",
  "4250": "40 OT",
  "4260": "40 OS",
  "4270": "40 TANK",
  "4310": "40 GP",
  "4351": "40 OT",
  "4500": "40 HC",
  "4510": "40 VENT HC",
  "4530": "40 RF HC",
  "4532": "40 RF",
  "4550": "40 HC OT",
  // 45ft
  "9500": "45 HC",
  "9510": "45 VENT HC",
  "9530": "45 RF HC",
};

export const getContainerSizeLabel = (value) => {
  const raw = (value || "").toString().toUpperCase().trim();
  if (!raw) return "";

  if (isoCodeToType[raw]) {
    return isoCodeToType[raw];
  }

  if (/^[2]\d{3}$/.test(raw)) return "20";
  if (/^[4]\d{3}$/.test(raw)) return "40";
  if (/^[9]\d{3}$/.test(raw)) return "45";

  let label = raw;
  label = label.replace(/STANDARD DRY/g, "STD");
  label = label.replace(/STANDARD/g, "STD");
  label = label.replace(/COLLAPSIBLE FLAT RACK/g, "CFR");
  label = label.replace(/FLAT RACK/g, "FR");
  label = label.replace(/HIGH CUBE/g, "HC");
  label = label.replace(/OPEN TOP/g, "OT");
  label = label.replace(/HARD TOP/g, "HT");
  label = label.replace(/REEFER/g, "RF");
  return label;
};

export const getJobScrollAndEgmInfo = (job) => {
  const dbkInfoList = [];
  const rosctlInfoList = [];

  if (Array.isArray(job.invoices)) {
    job.invoices.forEach((inv) => {
      if (Array.isArray(inv.products)) {
        inv.products.forEach((prod) => {
          if (Array.isArray(prod.drawbackDetails)) {
            prod.drawbackDetails.forEach((dbk) => {
              if (dbk.drawback_scroll_no) {
                const exists = dbkInfoList.some(
                  (item) => item.no === dbk.drawback_scroll_no
                );
                if (!exists) {
                  dbkInfoList.push({
                    no: dbk.drawback_scroll_no,
                    date: dbk.drawback_scroll_date,
                  });
                }
              }
              if (dbk.rosctl_scroll_no) {
                const exists = rosctlInfoList.some(
                  (item) => item.no === dbk.rosctl_scroll_no
                );
                if (!exists) {
                  rosctlInfoList.push({
                    no: dbk.rosctl_scroll_no,
                    date: dbk.rosctl_scroll_date,
                  });
                }
              }
            });
          }
        });
      }
    });
  }

  if (job.drawback_scroll_no && !dbkInfoList.some((item) => item.no === job.drawback_scroll_no)) {
    dbkInfoList.push({
      no: job.drawback_scroll_no,
      date: job.drawback_scroll_date,
    });
  }

  if (job.rosctl_scroll_no && !rosctlInfoList.some((item) => item.no === job.rosctl_scroll_no)) {
    rosctlInfoList.push({
      no: job.rosctl_scroll_no,
      date: job.rosctl_scroll_date,
    });
  }

  return {
    dbkScrolls: dbkInfoList,
    rosctlScrolls: rosctlInfoList,
    egmNo: job.egm_no,
    egmDate: job.egm_date,
  };
};

export const getCurrentFinancialYear = () => {
  const today = new Date();
  const month = today.getMonth(); // 0-based: 0=Jan, 3=April
  const year = today.getFullYear();
  if (month < 3) {
    return `${(year - 1).toString().slice(-2)}-${year.toString().slice(-2)}`;
  }
  return `${year.toString().slice(-2)}-${(year + 1).toString().slice(-2)}`;
};
