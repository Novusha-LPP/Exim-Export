import axios from "axios";
import { getCachedDirectory, clearDirectoryCache } from "../../../services/directoryCacheService.js";

const API_BASE = import.meta.env.VITE_API_STRING || "http://localhost:9002/api";

const createMasterService = (endpoint) => {
  const url = `${API_BASE}/${endpoint}`;
  return {
    getAll: async (params = {}, options = {}) => {
      try {
        // Use cached directory fetcher with automatic caching & stale-while-revalidate
        return await getCachedDirectory(endpoint, params, options);
      } catch (error) {
        throw error.response?.data || error;
      }
    },

    getById: async (id) => {
      try {
        const response = await axios.get(`${url}/${id}`);
        return response.data;
      } catch (error) {
        throw error.response?.data || error;
      }
    },

    create: async (data) => {
      try {
        const response = await axios.post(url, data);
        // Invalidate cache on mutations
        clearDirectoryCache(endpoint);
        return response.data;
      } catch (error) {
        throw error.response?.data || error;
      }
    },

    update: async (id, data) => {
      try {
        const response = await axios.put(`${url}/${id}`, data);
        // Invalidate cache on mutations
        clearDirectoryCache(endpoint);
        return response.data;
      } catch (error) {
        throw error.response?.data || error;
      }
    },

    delete: async (id) => {
      try {
        const response = await axios.delete(`${url}/${id}`);
        // Invalidate cache on mutations
        clearDirectoryCache(endpoint);
        return response.data;
      } catch (error) {
        throw error.response?.data || error;
      }
    },

    // Manually refresh/clear cache for this directory
    clearCache: () => {
      clearDirectoryCache(endpoint);
    },
  };
};

export const ShippingLineService = createMasterService("shippingLines");
export const TransporterService = createMasterService("transporters");
export const TerminalCodeService = createMasterService("terminalCodes");
export const CfsCodeService = createMasterService("cfsCodes");
export const EmptyYardCodeService = createMasterService("emptyYardCodes");
export const ForwarderService = createMasterService("forwarders");
export const DrawbackService = createMasterService("drawbacks");

// Additional Directory Services
export const AirlineService = createMasterService("airlines");
export const AirportService = createMasterService("airPorts");
export const SeaPortService = createMasterService("seaPorts");
export const PortService = createMasterService("ports");
export const CountryService = createMasterService("countries");
export const DistrictService = createMasterService("districts");
export const GatewayPortService = createMasterService("gateway-ports");
export const LicenseService = createMasterService("licenses");

export { createMasterService };
export default createMasterService;
