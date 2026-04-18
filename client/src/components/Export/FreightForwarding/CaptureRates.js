import React, { useState } from "react";
import axios from "axios";
import FreightQuotation from "./FreightQuotation";

const THEME = {
  blue: "#2563eb",
  border: "#e5e7eb",
  text: "#111827",
  textMuted: "#6b7280",
};

const s = {
  section: { marginBottom: "20px" },
  title: { fontSize: "14px", fontWeight: 700, borderBottom: `1px solid ${THEME.border}`, paddingBottom: "5px", marginBottom: "10px" },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "10px" },
  label: { fontSize: "11px", color: THEME.textMuted },
  value: { fontSize: "13px", fontWeight: 600 },
  input: { width: "100%", height: "30px", border: `1px solid ${THEME.border}`, borderRadius: "4px", padding: "0 8px", fontSize: "12px" },
  btn: { padding: "6px 12px", borderRadius: "5px", border: "none", fontWeight: 700, cursor: "pointer", fontSize: "12px" },
  btnPrimary: { backgroundColor: THEME.blue, color: "#fff" },
};

function CaptureRates({ enquiry, onUpdate, forwarders }) {
  const [showAdd, setShowAdd] = useState(false);
  const [selectedRateForQuote, setSelectedRateForQuote] = useState(null);
  const [newRate, setNewRate] = useState({
    forwarder_name: "",
    base_rates: [
      { charge_name: "Agency Charges", amount: 0 },
      { charge_name: "VGM / ESB / FORM-13 filing", amount: 0 },
      { charge_name: "Certificate of Origin", amount: 0 },
      { charge_name: "Concor Charges", amount: 0 },
      { charge_name: "Transportation Charges", amount: 0 },
      { charge_name: "Lift on Lift off", amount: 0 },
    ],
    shipping_line_rates: [
      { charge_name: "Ocean Freight", amount: 0 },
      { charge_name: "Terminal Handling Charges", amount: 0 },
      { charge_name: "BL Charges", amount: 0 },
      { charge_name: "Seal Charges", amount: 0 },
      { charge_name: "MUC Charges", amount: 0 },
    ],
  });

  const handleSaveRate = async () => {
    try {
      const baseTotal = newRate.base_rates.reduce((acc, curr) => acc + Number(curr.amount), 0);
      const shippingTotal = newRate.shipping_line_rates.reduce((acc, curr) => acc + Number(curr.amount), 0);
      const total = baseTotal + shippingTotal;

      const rateToSave = { ...newRate, total };
      const updatedRates = [...(enquiry.received_rates || []), rateToSave];

      const res = await axios.post(`${import.meta.env.VITE_API_STRING}/freight-enquiries/${enquiry._id}/rates`, { rates: updatedRates });
      if (res.data.success) {
        onUpdate(res.data.data);
        setShowAdd(false);
      }
    } catch (err) {
      alert("Error saving rate");
    }
  };

  if (selectedRateForQuote) {
    return (
      <FreightQuotation 
        enquiry={enquiry} 
        selectedRate={selectedRateForQuote} 
        onBack={() => setSelectedRateForQuote(null)} 
      />
    );
  }

  return (
    <div style={{ padding: "20px" }}>
      <div style={s.section}>
        <div style={s.title}>Enquiry Details</div>
        <div style={s.grid}>
          {Object.entries({
            "No": enquiry.enquiry_no,
            "Org": enquiry.organization_name,
            "POL": enquiry.port_of_loading,
            "POD": enquiry.port_of_destination,
            "Type": enquiry.consignment_type,
            "Stuffing": enquiry.goods_stuffed
          }).map(([k, v]) => (
            <div key={k}>
              <div style={s.label}>{k}</div>
              <div style={s.value}>{v}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={s.section}>
        <div style={{ ...s.title, display: "flex", justifyContent: "space-between" }}>
          <span>Received Rates</span>
          <button onClick={() => setShowAdd(!showAdd)} style={{ ...s.btn, ...s.btnPrimary }}>
            {showAdd ? "Cancel" : "+ Add Rate"}
          </button>
        </div>

        {showAdd && (
          <div style={{ background: "#f9fafb", padding: "15px", borderRadius: "8px", marginBottom: "20px" }}>
            <div style={{ marginBottom: "15px" }}>
              <label style={s.label}>Forwarder</label>
              <select 
                style={s.input} 
                onChange={(e) => setNewRate({ ...newRate, forwarder_name: e.target.value })}
              >
                <option value="">Select Forwarder</option>
                {forwarders.map(f => <option key={f._id} value={f.name}>{f.name}</option>)}
              </select>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
              <div>
                <div style={s.label}>Local/Agency Charges</div>
                {newRate.base_rates.map((item, idx) => (
                  <div key={idx} style={{ display: "flex", gap: "10px", marginTop: "5px" }}>
                    <div style={{ flex: 2, fontSize: "12px" }}>{item.charge_name}</div>
                    <input 
                      type="number" 
                      style={{ ...s.input, flex: 1 }} 
                      value={item.amount}
                      onChange={(e) => {
                        const next = [...newRate.base_rates];
                        next[idx].amount = e.target.value;
                        setNewRate({ ...newRate, base_rates: next });
                      }}
                    />
                  </div>
                ))}
              </div>
              <div>
                <div style={s.label}>Shipping Line Charges</div>
                {newRate.shipping_line_rates.map((item, idx) => (
                  <div key={idx} style={{ display: "flex", gap: "10px", marginTop: "5px" }}>
                    <div style={{ flex: 2, fontSize: "12px" }}>{item.charge_name}</div>
                    <input 
                      type="number" 
                      style={{ ...s.input, flex: 1 }} 
                      value={item.amount}
                      onChange={(e) => {
                        const next = [...newRate.shipping_line_rates];
                        next[idx].amount = e.target.value;
                        setNewRate({ ...newRate, shipping_line_rates: next });
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
            <button 
              onClick={handleSaveRate} 
              style={{ ...s.btn, ...s.btnPrimary, marginTop: "15px", width: "100%" }}
            >
              Save Rate Entry
            </button>
          </div>
        )}

        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ backgroundColor: "#f3f4f6" }}>
              <th style={{ textAlign: "left", padding: "8px", fontSize: "12px" }}>Forwarder</th>
              <th style={{ textAlign: "right", padding: "8px", fontSize: "12px" }}>Total Amount</th>
              <th style={{ textAlign: "right", padding: "8px", fontSize: "12px" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {(enquiry.received_rates || []).map((r, i) => (
              <tr key={i} style={{ borderBottom: "1px solid #e5e7eb" }}>
                <td style={{ padding: "8px", fontSize: "13px" }}>{r.forwarder_name}</td>
                <td style={{ padding: "8px", fontSize: "13px", textAlign: "right", fontWeight: 700 }}>₹{r.total?.toLocaleString()}</td>
                <td style={{ padding: "8px", fontSize: "13px", textAlign: "right" }}>
                   <button 
                     onClick={() => setSelectedRateForQuote(r)}
                     style={{ ...s.btn, backgroundColor: "#10b981", color: "#fff" }}
                    >
                      Prepare Quote
                    </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default CaptureRates;
