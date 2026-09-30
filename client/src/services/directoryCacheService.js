import axios from "axios";

const API_BASE = import.meta.env.VITE_API_STRING || "http://localhost:9002/api";

// Cache keys & configuration
const MASTER_LIST_STORAGE_KEY = "exim_master_list_cache_v2";
const DIRECTORY_STORAGE_PREFIX = "exim_dir_cache_v2_";
const DEFAULT_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days for master lists
const DIRECTORY_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours for directory data
const STALE_THRESHOLD_MS = 12 * 60 * 60 * 1000; // 12 hours before background revalidation

// In-memory fast cache
const memoryCache = new Map();

// Default baseline fallbacks if localStorage is empty on initial cold start
const DEFAULT_FALLBACKS = {
  states: [
    "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa",
    "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala",
    "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland",
    "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura",
    "Uttar Pradesh", "Uttarakhand", "West Bengal", "Delhi", "Jammu and Kashmir", "Ladakh"
  ],
  cfs: [
    "Golden Horn Containers Service", "ICD AHMEDABAD", "ICD SACHANA", "ICD SANAND", "QUEST CONTIANER DEPOT"
  ],
  natureOfCargo: [
    "C - containerized", "P - non containerized packaged", "LB - liquid bulk", "DB - dry bulk", "CP - containerized and packaged"
  ],
  unitCodes: [
    "BAG", "BDL", "BGS", "BLS", "BOX", "BRL", "BTL", "CAN", "CAR", "CBM", "CFT", "CMS", "CON", "CTN",
    "CYL", "DOZ", "DRM", "GMS", "GRS", "KGS", "KIT", "KLT", "LTR", "MTR", "MTS", "NOS", "PAC", "PCS",
    "PKT", "PRS", "QNT", "ROL", "SET", "SQF", "SQM", "SQY", "TNE", "TON", "TUB", "UNT", "YDS"
  ],
  END_USE_CODES: [],
  PTA_FTA_CODES: [],
  eximCodes: [
    { code: "00", description: "Free Shipping bill involving remittance of Foreign exchange" },
    { code: "03", description: "Advance licence" },
    { code: "19", description: "Drawback (DBK)" },
    { code: "21", description: "EQU/EPZ/SEZ/EHTP/STP" },
    { code: "43", description: "Drawback and zero duty PECG" },
    { code: "50", description: "EPCG and Advance license" },
    { code: "60", description: "DRAWBACK AND ROSCTL" },
    { code: "61", description: "EPCG, DRAWBACK AND ROSCTL" },
    { code: "99", description: "NFEI" },
  ],
  currencyList: [
    { code: "INR", description: "Indian Rupee" },
    { code: "USD", description: "US Dollar" },
    { code: "EUR", description: "Euro" },
    { code: "GBP", description: "Pound Sterling" },
    { code: "AED", description: "UAE Dirham" },
    { code: "SAR", description: "Saudi Riyal" },
    { code: "QAR", description: "Qatari Riyal" },
    { code: "OMR", description: "Omani Rial" },
    { code: "KWD", description: "Kuwaiti Dinar" },
    { code: "BHD", description: "Bahraini Dinar" },
    { code: "AUD", description: "Australian Dollar" },
    { code: "CAD", description: "Canadian Dollar" },
    { code: "SGD", description: "Singapore Dollar" },
    { code: "JPY", description: "Japanese Yen" },
    { code: "CNY", description: "Chinese Yuan" },
    { code: "CHF", description: "Swiss Franc" },
  ],
  stateCodeMap: {
    "JAMMU AND KASHMIR": "01", "HIMACHAL PRADESH": "02", "PUNJAB": "03", "CHANDIGARH": "04",
    "UTTARAKHAND": "05", "HARYANA": "06", "DELHI": "07", "RAJASTHAN": "08", "UTTAR PRADESH": "09",
    "BIHAR": "10", "SIKKIM": "11", "ARUNACHAL PRADESH": "12", "NAGALAND": "13", "MANIPUR": "14",
    "MIZORAM": "15", "TRIPURA": "16", "MEGHALAYA": "17", "ASSAM": "18", "WEST BENGAL": "19",
    "JHARKHAND": "20", "ODISHA": "21", "CHHATTISGARH": "22", "MADHYA PRADESH": "23",
    "GUJARAT": "24", "MAHARASHTRA": "27", "ANDHRA PRADESH": "28", "KARNATAKA": "29", "GOA": "30",
    "KERALA": "32", "TAMIL NADU": "33", "TELANGANA": "36", "LADAKH": "37"
  },
  SHIPPING_LINES: [],
  hauliers: [],
};

// Safe localStorage access
const storage = {
  get: (key) => {
    try {
      const val = localStorage.getItem(key);
      return val ? JSON.parse(val) : null;
    } catch {
      return null;
    }
  },
  set: (key, val) => {
    try {
      localStorage.setItem(key, JSON.stringify(val));
    } catch (e) {
      console.warn("Storage quota exceeded or unavailable:", e);
    }
  },
  remove: (key) => {
    try {
      localStorage.removeItem(key);
    } catch {}
  },
};

// Listeners for reactive updates
const subscribers = new Set();
const notifySubscribers = (category, data) => {
  subscribers.forEach((cb) => cb(category, data));
};

export const subscribeToMasterList = (callback) => {
  subscribers.add(callback);
  return () => subscribers.delete(callback);
};

// ============================================================================
// MASTER LIST METHODS
// ============================================================================

/**
 * Initializes and gets synchronous cached master list.
 * Loads from localStorage or memory. Falls back to baseline defaults.
 */
export const getCachedMasterListSync = (category) => {
  // Check memory cache first
  if (memoryCache.has(`master_${category}`)) {
    return memoryCache.get(`master_${category}`);
  }

  // Check localStorage
  const cachedBundle = storage.get(MASTER_LIST_STORAGE_KEY);
  if (cachedBundle && cachedBundle.data && cachedBundle.data[category] !== undefined) {
    const val = cachedBundle.data[category];
    memoryCache.set(`master_${category}`, val);
    return val;
  }

  // Fallback
  return DEFAULT_FALLBACKS[category] || (category === "stateCodeMap" ? {} : []);
};

/**
 * Fetches all master lists from API and updates cache.
 */
export const fetchAllMasterLists = async (force = false) => {
  const now = Date.now();
  const cached = storage.get(MASTER_LIST_STORAGE_KEY);

  if (!force && cached && cached.timestamp && now - cached.timestamp < DEFAULT_TTL_MS) {
    // Populate memory cache
    Object.keys(cached.data || {}).forEach((k) => {
      memoryCache.set(`master_${k}`, cached.data[k]);
    });

    console.log("⚡ [MasterList] Loaded from local cache (0ms network, valid for 7d):", Object.keys(cached.data || {}));
    return cached.data;
  }

  try {
    console.log(`📦 [MasterList] Fetching master lists from API: ${API_BASE}/directories/master-list/all`);
    const res = await axios.get(`${API_BASE}/directories/master-list/all`);
    if (res.data && res.data.success && res.data.data) {
      const bundle = res.data.data;
      storage.set(MASTER_LIST_STORAGE_KEY, {
        timestamp: now,
        data: bundle,
      });

      Object.keys(bundle).forEach((k) => {
        memoryCache.set(`master_${k}`, bundle[k]);
        notifySubscribers(k, bundle[k]);
      });

      console.log("✅ [MasterList] Received & cached all master lists from API:", Object.keys(bundle));
      return bundle;
    }
  } catch (error) {
    console.warn("Failed to fetch master list bundle from API, using cached/fallback:", error?.message);
  }

  return cached?.data || DEFAULT_FALLBACKS;
};

/**
 * Gets specific master list category (Async with caching).
 */
export const getMasterList = async (category, options = {}) => {
  const { force = false, search, limit } = options;

  // If specific search or pagination is requested, query API directly
  if (search || limit) {
    try {
      const res = await axios.get(`${API_BASE}/directories/master-list/${category}`, {
        params: { search, limit },
      });
      return res.data?.data || [];
    } catch (e) {
      console.warn(`Failed to search master list for ${category}:`, e?.message);
    }
  }

  // Fast memory cache check
  if (!force && memoryCache.has(`master_${category}`)) {
    return memoryCache.get(`master_${category}`);
  }

  // Full bundle fetch
  const allData = await fetchAllMasterLists(force);
  if (allData && allData[category] !== undefined) {
    return allData[category];
  }

  return getCachedMasterListSync(category);
};

// ============================================================================
// DIRECTORY DATA CACHING (Shipping Lines, Transporters, CFS, Ports, etc.)
// ============================================================================

/**
 * Generic cached directory fetcher.
 * @param {string} endpoint - API endpoint (e.g., 'shippingLines', 'ports', 'cfsCodes')
 * @param {object} params - Query params (page, limit, search, etc.)
 * @param {object} options - { force: boolean, ttl: number }
 */
export const getCachedDirectory = async (endpoint, params = {}, options = {}) => {
  const { force = false, ttl = DIRECTORY_TTL_MS } = options;
  const paramKey = Object.keys(params).length ? JSON.stringify(params) : "all";
  const storageKey = `${DIRECTORY_STORAGE_PREFIX}${endpoint}_${paramKey}`;
  const now = Date.now();

  // Check memory cache
  const memKey = `dir_${endpoint}_${paramKey}`;
  if (!force && memoryCache.has(memKey)) {
    const memEntry = memoryCache.get(memKey);
    if (now - memEntry.timestamp < ttl) {
      return memEntry.data;
    }
  }

  // Check localStorage
  if (!force) {
    const cached = storage.get(storageKey);
    if (cached && cached.timestamp && now - cached.timestamp < ttl) {
      memoryCache.set(memKey, cached);
      return cached.data;
    }
  }

  // Fetch from API
  try {
    const url = `${API_BASE}/${endpoint}`;
    const response = await axios.get(url, { params });
    const resultData = response.data;

    const cacheEntry = {
      timestamp: now,
      data: resultData,
    };

    memoryCache.set(memKey, cacheEntry);
    storage.set(storageKey, cacheEntry);

    return resultData;
  } catch (error) {
    // If API fails, return cached if available
    const staleCached = storage.get(storageKey);
    if (staleCached && staleCached.data) {
      console.warn(`API error on ${endpoint}, serving stale cached directory data:`, error?.message);
      return staleCached.data;
    }
    throw error?.response?.data || error;
  }
};

/**
 * Invalidates cache for a specific directory or all directory data.
 * Useful when an item is added, updated, or deleted.
 */
export const clearDirectoryCache = (endpoint = null) => {
  try {
    if (!endpoint) {
      // Clear all directory and master list cache
      memoryCache.clear();
      storage.remove(MASTER_LIST_STORAGE_KEY);
      Object.keys(localStorage)
        .filter((k) => k.startsWith(DIRECTORY_STORAGE_PREFIX))
        .forEach((k) => localStorage.removeItem(k));
      return;
    }

    // Clear specific endpoint
    const prefix = `${DIRECTORY_STORAGE_PREFIX}${endpoint}`;
    Object.keys(localStorage)
      .filter((k) => k.startsWith(prefix))
      .forEach((k) => localStorage.removeItem(k));

    // Clear memory cache entries matching endpoint
    for (const key of memoryCache.keys()) {
      if (key.startsWith(`dir_${endpoint}`)) {
        memoryCache.delete(key);
      }
    }
  } catch (e) {
    console.warn("Error clearing directory cache:", e);
  }
};

// Preload master lists in background on app load and expose window helpers
if (typeof window !== "undefined") {
  window.refreshMasterList = () => fetchAllMasterLists(true);
  window.clearDirectoryCache = clearDirectoryCache;
  window.getMasterList = getMasterList;
  setTimeout(() => {
    fetchAllMasterLists().catch(() => {});
  }, 100);
}

export default {
  getMasterList,
  getCachedMasterListSync,
  fetchAllMasterLists,
  getCachedDirectory,
  clearDirectoryCache,
  subscribeToMasterList,
};
