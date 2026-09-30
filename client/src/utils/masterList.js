/**
 * Master List Service & Directory Cache Adapter
 *
 * Sourced dynamically from the backend Directory API (/api/directories/master-list)
 * with robust client-side caching (localStorage + memory cache) and background
 * stale-while-revalidate.
 */

import {
  getCachedMasterListSync,
  getMasterList,
  fetchAllMasterLists,
  clearDirectoryCache,
  subscribeToMasterList,
} from "../services/directoryCacheService.js";
import { useState, useEffect } from "react";

// ============================================================================
// REACTIVE SYNCHRONOUS EXPORTS (Synchronous fallback + reactive API cache)
// ============================================================================

// Initialize mutable arrays/objects from cache
export let states = getCachedMasterListSync("states");
export let cfs = getCachedMasterListSync("cfs");
export let natureOfCargo = getCachedMasterListSync("natureOfCargo");
export let unitCodes = getCachedMasterListSync("unitCodes");
export let END_USE_CODES = getCachedMasterListSync("END_USE_CODES");
export let PTA_FTA_CODES = getCachedMasterListSync("PTA_FTA_CODES");
export let eximCodes = getCachedMasterListSync("eximCodes");
export let currencyList = getCachedMasterListSync("currencyList");
export let stateCodeMap = getCachedMasterListSync("stateCodeMap");
export let SHIPPING_LINES = getCachedMasterListSync("SHIPPING_LINES");
export let hauliers = getCachedMasterListSync("hauliers");

// Subscribe to updates from API cache revalidations
subscribeToMasterList((category, freshData) => {
  switch (category) {
    case "states":
      states = freshData;
      break;
    case "cfs":
      cfs = freshData;
      break;
    case "natureOfCargo":
      natureOfCargo = freshData;
      break;
    case "unitCodes":
      unitCodes = freshData;
      break;
    case "END_USE_CODES":
      END_USE_CODES = freshData;
      break;
    case "PTA_FTA_CODES":
      PTA_FTA_CODES = freshData;
      break;
    case "eximCodes":
      eximCodes = freshData;
      break;
    case "currencyList":
      currencyList = freshData;
      break;
    case "stateCodeMap":
      stateCodeMap = freshData;
      break;
    case "SHIPPING_LINES":
      SHIPPING_LINES = freshData;
      break;
    case "hauliers":
      hauliers = freshData;
      break;
    default:
      break;
  }
});

// Trigger initial background load from API on module import
if (typeof window !== "undefined") {
  fetchAllMasterLists().then((bundle) => {
    if (bundle) {
      if (bundle.states) states = bundle.states;
      if (bundle.cfs) cfs = bundle.cfs;
      if (bundle.natureOfCargo) natureOfCargo = bundle.natureOfCargo;
      if (bundle.unitCodes) unitCodes = bundle.unitCodes;
      if (bundle.END_USE_CODES) END_USE_CODES = bundle.END_USE_CODES;
      if (bundle.PTA_FTA_CODES) PTA_FTA_CODES = bundle.PTA_FTA_CODES;
      if (bundle.eximCodes) eximCodes = bundle.eximCodes;
      if (bundle.currencyList) currencyList = bundle.currencyList;
      if (bundle.stateCodeMap) stateCodeMap = bundle.stateCodeMap;
      if (bundle.SHIPPING_LINES) SHIPPING_LINES = bundle.SHIPPING_LINES;
      if (bundle.hauliers) hauliers = bundle.hauliers;
    }
  }).catch(() => {});
}

// ============================================================================
// REACT HOOK FOR MASTER LISTS
// ============================================================================

/**
 * React hook to consume master list data with automatic loading & reactivity.
 * @param {string} category - e.g. "currencyList", "unitCodes", "states", "SHIPPING_LINES"
 * @returns {Array|Object}
 */
export function useMasterList(category) {
  const [data, setData] = useState(() => getCachedMasterListSync(category));

  useEffect(() => {
    let isMounted = true;
    getMasterList(category).then((fresh) => {
      if (isMounted && fresh) setData(fresh);
    });

    const unsubscribe = subscribeToMasterList((cat, fresh) => {
      if (isMounted && cat === category) setData(fresh);
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [category]);

  return data;
}

// ============================================================================
// ASYNC API GETTERS
// ============================================================================

export const fetchMasterList = (category, options) => getMasterList(category, options);
export const refreshMasterList = () => fetchAllMasterLists(true);
export { clearDirectoryCache };

export default {
  states,
  cfs,
  natureOfCargo,
  unitCodes,
  END_USE_CODES,
  PTA_FTA_CODES,
  eximCodes,
  currencyList,
  stateCodeMap,
  SHIPPING_LINES,
  hauliers,
  useMasterList,
  fetchMasterList,
  refreshMasterList,
  clearDirectoryCache,
};