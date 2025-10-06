import axios from "axios";

const odexApi = axios.create({
  baseURL: process.env.ODEX_API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
    "x-api-key": process.env.ODEX_API_KEY,
    // add more headers or auth as needed
  },
  timeout: 10000,
});

export const submitHandoverToOdex = async (handoverData) => {
  // Map handoverData to ODEx api payload structure here as per ODEx docs
  const payload = {
    exportJobId: handoverData.exportJobId,
    shippingBillNumber: handoverData.shippingBillNumber,
    containerNumbers: handoverData.containerNumbers,
    vgmWeight: handoverData.vgmWeight,
    form13Number: handoverData.form13Number,
    exportDate: handoverData.exportDate,
    // Add other required fields here...
  };

  const response = await odexApi.post("/handover", payload);
  return response.data;
};
