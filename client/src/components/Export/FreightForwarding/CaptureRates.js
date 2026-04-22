import React, { useState } from "react";
import axios from "axios";
import CreateFreightEnquiry from "./CreateFreightEnquiry";
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
  const [isEditingDetails, setIsEditingDetails] = useState(false);
  const [selectedRateForQuote, setSelectedRateForQuote] = useState(null);
  const [newRate, setNewRate] = useState({
    forwarder_name: "",
    base_rates: [
      { charge_name: "Agency Charges", amount: 2750 },
      { charge_name: "VGM / ESB / FORM-13 filing", amount: 500 },
      { charge_name: "Certificate of Origin", amount: 500 },
      { charge_name: "Concor Charges", amount: 25000 },
      { charge_name: "Transportation Charges", amount: 10000 },
      { charge_name: "Lift on Lift off", amount: 2500 },
    ],
    shipping_line_rates: [
      { charge_name: "Ocean Freight", amount: 300 },
      { charge_name: "Terminal Handling Charges", amount: 15000 },
      { charge_name: "BL Charges", amount: 5500 },
      { charge_name: "Seal Charges", amount: 1000 },
      { charge_name: "MUC Charges", amount: 175 },
    ],
  });

  const handleUpdateEnquiryDetails = async (updatedData) => {
    try {
      const res = await axios.put(`${import.meta.env.VITE_API_STRING}/freight-enquiries/${enquiry._id}`, updatedData);
      if (res.data.success) {
        onUpdate(res.data.data);
        setIsEditingDetails(false);
        alert("Enquiry updated successfully");
      }
    } catch (err) {
      alert("Error updating enquiry details");
    }
  };

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

  const handleUpdateStatus = async (newStatus) => {
    if (!window.confirm(`Are you sure you want to mark this enquiry as ${newStatus}?`)) return;
    try {
      const res = await axios.put(`${import.meta.env.VITE_API_STRING}/freight-enquiries/${enquiry._id}`, { status: newStatus });
      if (res.data.success) {
        onUpdate(res.data.data);
        alert(`Enquiry marked as ${newStatus}`);
      }
    } catch (err) {
      alert("Error updating status");
    }
  };

  const handlePushChargesToJob = async (rate) => {
    if (!enquiry.source_job_no) {
      alert("No source job linked to this enquiry.");
      return;
    }
    if (!window.confirm(`Push these charges to Job ${enquiry.source_job_no}?`)) return;

    try {
      // 1. Fetch job to get its _id (using the existing search endpoint)
      const jobRes = await axios.get(`${import.meta.env.VITE_API_STRING}/exports`, {
        params: { search: enquiry.source_job_no }
      });
      const job = jobRes.data.data.find(j => j.job_no === enquiry.source_job_no);
      if (!job) {
        alert("Source Job not found. Internal ID required for pushing charges.");
        return;
      }

      // 2. Prepare charges from rates
      const charges = [
        ...rate.base_rates.map(r => ({
          chargeHead: r.charge_name,
          category: "Logistics",
          parentId: job._id || job.id,
          parentModule: "Job",
          cost: {
            amount: Number(r.amount),
            total: Number(r.amount),
            particulars: r.charge_name,
            vendorName: rate.forwarder_name,
            basicAmount: Number(r.amount),
            netPayable: Number(r.amount)
          }
        })),
        ...rate.shipping_line_rates.map(r => ({
          chargeHead: r.charge_name,
          category: "Logistics",
          parentId: job._id || job.id,
          parentModule: "Job",
          cost: {
            amount: Number(r.amount),
            total: Number(r.amount),
            particulars: r.charge_name,
            vendorName: rate.forwarder_name,
            basicAmount: Number(r.amount),
            netPayable: Number(r.amount)
          }
        }))
      ].filter(c => c.cost.amount > 0);

      if (charges.length === 0) {
        alert("No charges with amount > 0 to push.");
        return;
      }

      // 3. Post to bulk charges
      const res = await axios.post(`${import.meta.env.VITE_API_STRING}/charges/bulk`, { charges });
      if (res.data.success) {
        alert("Charges successfully transferred to Job!");
      }
    } catch (err) {
      console.error("Error pushing charges:", err);
      alert("Error pushing charges to job. Check console for details.");
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
        <div style={{ ...s.title, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>Enquiry Details</span>
          <div style={{ display: "flex", gap: "8px" }}>
            {enquiry.status === "Open" && (
              <>
                <button
                  onClick={() => handleUpdateStatus("Converted")}
                  style={{ ...s.btn, backgroundColor: "#059669", color: "#fff" }}
                >
                  Success
                </button>
                <button
                  onClick={() => handleUpdateStatus("Rejected")}
                  style={{ ...s.btn, backgroundColor: "#dc2626", color: "#fff" }}
                >
                  Reject
                </button>
              </>
            )}
            {!isEditingDetails && (
              <button
                onClick={() => setIsEditingDetails(true)}
                style={{ ...s.btn, backgroundColor: "#6366f1", color: "#fff" }}
              >
                Edit Info
              </button>
            )}
          </div>
        </div>

        {isEditingDetails ? (
          <div style={{ background: "#fff", border: `1px solid ${THEME.border}`, borderRadius: "8px", overflow: "hidden" }}>
            <CreateFreightEnquiry
              initialData={enquiry}
              submitLabel="Save Changes"
              onCreate={handleUpdateEnquiryDetails}
              onClose={() => setIsEditingDetails(false)}
            />
          </div>
        ) : (
          <div style={s.grid}>
            {Object.entries({
              "No": enquiry.enquiry_no,
              "Org": enquiry.organization_name,
              "POL": enquiry.port_of_loading,
              "POD": enquiry.port_of_destination,
              "Type": enquiry.consignment_type,
              "Stuffing": enquiry.goods_stuffed,
              "Pkgs": enquiry.no_packages,
              "G.W": enquiry.gross_weight,
              "N.W": enquiry.net_weight
            }).map(([k, v]) => (
              <div key={k}>
                <div style={s.label}>{k}</div>
                <div style={s.value}>{v || "-"}</div>
              </div>
            ))}
          </div>
        )}
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
                  <div style={{ display: "flex", gap: "5px", justifyContent: "flex-end" }}>
                    {enquiry.status === "Converted" && (
                      <button
                        onClick={() => handlePushChargesToJob(r)}
                        style={{ ...s.btn, backgroundColor: "#2563eb", color: "#fff" }}
                      >
                        Push to Job
                      </button>
                    )}
                    <button
                      onClick={() => setSelectedRateForQuote(r)}
                      style={{ ...s.btn, backgroundColor: "#10b981", color: "#fff" }}
                    >
                      Prepare Quote
                    </button>
                  </div>
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
