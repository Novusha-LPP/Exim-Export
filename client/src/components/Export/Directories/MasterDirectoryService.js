import axios from "axios";

const createMasterService = (endpoint) => {
  const url = `${import.meta.env.VITE_API_STRING}/${endpoint}`;
  return {
    getAll: async (params = {}) => {
      try {
        const response = await axios.get(url, { params });
        return response.data;
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
        return response.data;
      } catch (error) {
        throw error.response?.data || error;
      }
    },

    update: async (id, data) => {
      try {
        const response = await axios.put(`${url}/${id}`, data);
        return response.data;
      } catch (error) {
        throw error.response?.data || error;
      }
    },

    delete: async (id) => {
      try {
        const response = await axios.delete(`${url}/${id}`);
        return response.data;
      } catch (error) {
        throw error.response?.data || error;
      }
    },
  };
};

export const ShippingLineService = createMasterService("shippingLines");
export const TransporterService = createMasterService("transporters");
export const TerminalCodeService = createMasterService("terminalCodes");
