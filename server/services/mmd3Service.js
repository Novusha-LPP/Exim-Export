import axios from "axios";

const mmd3Api = axios.create({
  baseURL: process.env.MMD3_API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
    "x-api-key": process.env.MMD3_API_KEY,
    // add additional authentication headers if required
  },
  timeout: 10000,
});

export const submitHandoverToMmd3 = async (handoverData) => {
  // Map handoverData to MMD3 api payload structure here as per MMD3 docs
  const payload = {
    exportJobId: handoverData.exportJobId,
    shippingBillNumber: handoverData.shippingBillNumber,
    containerNumbers: handoverData.containerNumbers,
    vgmWeight: handoverData.vgmWeight,
    form13Number: handoverData.form13Number,
    exportDate: handoverData.exportDate,
    // Add other required fields here...
  };

  const response = await mmd3Api.post("/handover", payload);
  return response.data;
};
