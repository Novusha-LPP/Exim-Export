import React, { useState } from "react";
import axios from "axios";
import CreateFreightEnquiry from "./CreateFreightEnquiry";
import FreightQuotation from "./FreightQuotation";

const THEME = {
  blue: "#16408f",
  border: "#cbd5e1",
  text: "#0f172a",
  textMuted: "#64748b",
};

const s = {
  section: { marginBottom: "24px", padding: "12px 0px" },
  title: {
    fontSize: "13px",
    fontWeight: 700,
    borderBottom: `2px solid ${THEME.border}`,
    paddingBottom: "8px",
    marginBottom: "16px",
    color: "#1e293b",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
    gap: "16px",
    backgroundColor: "#f8fafc",
    padding: "16px 20px",
    borderRadius: "3px",
    border: "1px solid #cbd5e1",
  },
  label: { fontSize: "11px", color: THEME.textMuted, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.3px", marginBottom: "2px" },
  value: { fontSize: "13px", fontWeight: 700, color: "#1e293b" },
  input: {
    width: "100%",
    height: "34px",
    border: `1px solid ${THEME.border}`,
    borderRadius: "3px",
    padding: "0 12px",
    fontSize: "12.5px",
    backgroundColor: "#fff",
    outline: "none",
    transition: "all 0.15s ease",
    color: "#0f172a",
  },
  btn: {
    padding: "0 16px",
    height: "32px",
    borderRadius: "3px",
    border: "none",
    fontWeight: 700,
    cursor: "pointer",
    fontSize: "12px",
    transition: "all 0.15s ease",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "6px",
  },
  btnPrimary: {
    backgroundColor: THEME.blue,
    color: "#fff",
  },
};

function CaptureRates({ enquiry, onUpdate, forwarders }) {
  const [showAdd, setShowAdd] = useState(false);

  const handleHistoricalFreight = async () => {
    try {
      const pol = enquiry.port_of_loading;
      const pod = enquiry.port_of_destination;

      if (!pol || !pod) {
        alert("Please ensure POL and POD are present in enquiry details");
        return;
      }

      const res = await axios.get(`${import.meta.env.VITE_API_STRING}/export-dsr/historical-freight`, {
        params: { pol, pod }
      });

      if (res.data.success && res.data.data.length > 0) {
        const hist = res.data.data[0]; 
        let amount = Number(hist.amount);
        let currency = hist.currency || "INR";
        let exchangeRate = Number(hist.exchangeRate || 1);

        if (currency !== "INR") {
          amount = amount * exchangeRate;
        }

        const next = [...newRate.shipping_line_rates];
        const idx = next.findIndex(r => r.charge_name === "Ocean Freight");
        if (idx !== -1) {
          next[idx].amount = Math.round(amount);
          setNewRate({ ...newRate, shipping_line_rates: next });
          alert(`Fetched historical freight: ₹${Math.round(amount)} (from Job ${hist.jobNo})`);
        }
      } else {
        alert("No historical freight found for this POL/POD in last 2 months");
      }
    } catch (error) {
      console.error("Error fetching historical freight:", error);
      alert("Failed to fetch historical freight");
    }
  };

  const handleAddCharge = (category) => {
    const next = { ...newRate };
    next[category].push({ charge_name: "", amount: 0 });
    setNewRate(next);
  };

  const handleRemoveCharge = (category, index) => {
    const next = { ...newRate };
    next[category].splice(index, 1);
    setNewRate(next);
  };

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
                style={{ ...s.btn, backgroundColor: "#16408f", color: "#fff" }}
              >
                Edit Info
              </button>
            )}
          </div>
        </div>

        {isEditingDetails ? (
          <div style={{ background: "#fff", border: `1px solid ${THEME.border}`, borderRadius: "3px", overflow: "visible" }}>
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
              "Shipper/Org": enquiry.organization_name,
              "POL": enquiry.port_of_loading,
              "POD": enquiry.port_of_destination,
              "Type": enquiry.consignment_type,
              "Stuffing": enquiry.goods_stuffed,
              "Movement": enquiry.movement_type,
              "Pkgs": `${enquiry.no_packages || "-"} ${enquiry.package_unit || ""}`,
              "G.W": `${enquiry.gross_weight || "-"} ${enquiry.gross_weight_unit || ""}`,
              "N.W": `${enquiry.net_weight || "-"} ${enquiry.net_weight_unit || ""}`,
              "Volume": `${enquiry.volume_cbm || "-"} ${enquiry.volume_unit || ""}`,
              "Vol. Wt": `${enquiry.volume_weight || "-"} ${enquiry.gross_weight_unit || ""}`,
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
          <div style={{ background: "#f9fafb", padding: "15px", borderRadius: "3px", marginBottom: "20px" }}>
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
                <div style={{ ...s.label, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Local/Agency Charges</span>
                  <button 
                    type="button" 
                    onClick={() => handleAddCharge('base_rates')}
                    style={{ fontSize: 10, padding: '2px 6px', cursor: 'pointer', background: '#16408f', color: '#fff', border: 'none', borderRadius: 3 }}
                  >
                    + Add
                  </button>
                </div>
                {newRate.base_rates.map((item, idx) => (
                  <div key={idx} style={{ display: "flex", gap: "8px", marginTop: "5px", alignItems: 'center' }}>
                    <input
                      style={{ ...s.input, flex: 2, fontSize: "11px" }}
                      value={item.charge_name}
                      placeholder="Charge Name"
                      onChange={(e) => {
                        const next = [...newRate.base_rates];
                        next[idx].charge_name = e.target.value;
                        setNewRate({ ...newRate, base_rates: next });
                      }}
                    />
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
                    <button 
                      type="button"
                      onClick={() => handleRemoveCharge('base_rates', idx)}
                      style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 14, fontWeight: 700 }}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
              <div>
                <div style={{ ...s.label, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Shipping Line Charges</span>
                  <button 
                    type="button" 
                    onClick={() => handleAddCharge('shipping_line_rates')}
                    style={{ fontSize: 10, padding: '2px 6px', cursor: 'pointer', background: '#16408f', color: '#fff', border: 'none', borderRadius: 3 }}
                  >
                    + Add
                  </button>
                </div>
                {newRate.shipping_line_rates.map((item, idx) => (
                  <div key={idx} style={{ display: "flex", gap: "8px", marginTop: "5px", alignItems: 'center' }}>
                    <div style={{ flex: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <input
                          style={{ ...s.input, flex: 1, fontSize: "11px" }}
                          value={item.charge_name}
                          placeholder="Charge Name"
                          onChange={(e) => {
                            const next = [...newRate.shipping_line_rates];
                            next[idx].charge_name = e.target.value;
                            setNewRate({ ...newRate, shipping_line_rates: next });
                          }}
                        />
                        {item.charge_name === "Ocean Freight" && (
                          <button 
                            type="button"
                            onClick={handleHistoricalFreight}
                            style={{ 
                              fontSize: 9, padding: '1px 4px', cursor: 'pointer', 
                              backgroundColor: '#e2e8f0', border: '1px solid #cbd5e1', borderRadius: 3,
                              fontWeight: 700, color: '#475569'
                            }}
                          >
                            HIST
                          </button>
                        )}
                      </div>
                    </div>
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
                    <button 
                      type="button"
                      onClick={() => handleRemoveCharge('shipping_line_rates', idx)}
                      style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 14, fontWeight: 700 }}
                    >
                      ×
                    </button>
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

        <div style={{ border: "1px solid #cbd5e1", borderRadius: "3px", overflow: "hidden", marginTop: "12px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12.5px" }}>
            <thead>
              <tr style={{ backgroundColor: "#19448aff", borderBottom: "2px solid #cbd5e1" }}>
                <th style={{ textAlign: "left", padding: "12px 16px", fontSize: "11px", fontWeight: 700, color: "#ffffff", textTransform: "uppercase", letterSpacing: "0.5px" }}>Forwarder</th>
                <th style={{ textAlign: "right", padding: "12px 16px", fontSize: "11px", fontWeight: 700, color: "#ffffff", textTransform: "uppercase", letterSpacing: "0.5px" }}>Total Amount</th>
                <th style={{ textAlign: "right", padding: "12px 16px", fontSize: "11px", fontWeight: 700, color: "#ffffff", textTransform: "uppercase", letterSpacing: "0.5px" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {(enquiry.received_rates || []).map((r, i) => (
                <tr key={i} style={{ borderBottom: "1px solid #cbd5e1", transition: "background-color 0.15s ease" }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#f8fafc"} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}>
                  <td style={{ padding: "12px 16px", fontSize: "13px", fontWeight: 600, color: "#1e293b" }}>{r.forwarder_name}</td>
                  <td style={{ padding: "12px 16px", fontSize: "13px", textAlign: "right", fontWeight: 700, color: "#16408f" }}>₹{r.total?.toLocaleString()}</td>
                  <td style={{ padding: "12px 16px", textAlign: "right" }}>
                    <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                      {enquiry.status === "Converted" && (
                        <button
                          onClick={() => handlePushChargesToJob(r)}
                          style={{ ...s.btn, backgroundColor: "#16408f", color: "#fff" }}
                        >
                          Push to Job
                        </button>
                      )}
                      <button
                        onClick={() => setSelectedRateForQuote(r)}
                        style={{ ...s.btn, backgroundColor: "#059669", color: "#fff" }}
                      >
                        Prepare Quote
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {(!enquiry.received_rates || enquiry.received_rates.length === 0) && (
                <tr>
                  <td colSpan={3} style={{ textAlign: "center", padding: "30px 16px", color: THEME.textMuted }}>
                    No rates received yet. Click <strong>+ Add Rate</strong> to record.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default CaptureRates;
