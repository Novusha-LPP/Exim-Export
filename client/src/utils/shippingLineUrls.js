// shippingLineUrls.js
export const shippingLineUrls = {
  MSC: "https://www.msc.com/en/track-a-shipment",
  "M S C": "https://www.msc.com/en/track-a-shipment",
  "MSC LINE": "https://www.msc.com/en/track-a-shipment",
  "Maersk Line": (blNumber) => `https://www.maersk.com/tracking/${blNumber}`,
  "Hapag-Lloyd": (blNumber) =>
    `https://www.hapag-lloyd.com/en/online-business/track/track-by-booking-solution.html?blno=${blNumber}`,
  "Trans Asia": (blNumber, containerFirst) =>
    `http://182.72.192.230/TASFREIGHT/AppTasnet/ContainerTracking.aspx?&containerno=${containerFirst}&blNo=${blNumber}`,
  UNIFEEDER: (blNumber) =>
    `https://www.unifeeder.cargoes.com/tracking?ID=${blNumber.slice(
      0,
      3
    )}%2F${blNumber.slice(3, 6)}%2F${blNumber.slice(6, 8)}%2F${blNumber.slice(
      8
    )}`,
  "Unifeeder Agencies India Pvt Ltd": (blNumber) =>
    `https://www.unifeeder.cargoes.com/tracking?ID=${blNumber.slice(
      0,
      3
    )}%2F${blNumber.slice(3, 6)}%2F${blNumber.slice(6, 8)}%2F${blNumber.slice(
      8
    )}`,
};
