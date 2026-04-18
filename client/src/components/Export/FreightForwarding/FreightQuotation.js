import React, { useState } from "react";

const THEME = {
  blue: "#2563eb",
  border: "#ccd3de",
  text: "#1e293b",
};

const s = {
  quoteWrapper: {
    fontFamily: "'Segoe UI', Roboto, sans-serif",
    width: "794px", // A4 width approx
    margin: "0 auto",
    padding: "40px",
    backgroundColor: "#fff",
    color: THEME.text,
  },
  header: { display: "flex", justifyContent: "space-between", marginBottom: "20px" },
  address: { fontSize: "12px", lineHeight: "1.6" },
  title: { textAlign: "center", fontSize: "16px", fontWeight: "bold", textDecoration: "underline", margin: "15px 0" },
  table: { width: "100%", borderCollapse: "collapse", marginBottom: "15px" },
  th: { backgroundColor: "#e2e8f0", padding: "8px", textAlign: "left", fontSize: "13px", border: `1px solid ${THEME.border}` },
  td: { padding: "8px", border: `1px solid ${THEME.border}`, fontSize: "13px" },
  footerNote: { fontSize: "11px", marginTop: "15px", display: "flex", flexDirection: "column", gap: "5px" },
  input: { border: "none", backgroundColor: "#f8fafc", width: "80px", textAlign: "right", padding: "2px" },
};

function FreightQuotation({ enquiry, selectedRate, onBack }) {
  const [quoteData, setQuoteData] = useState({
    base_rates: selectedRate.base_rates.map(r => ({ ...r, margin: 0 })),
    shipping_line_rates: selectedRate.shipping_line_rates.map(r => ({ ...r, margin: 0 })),
  });

  const calculateTotal = (list) => list.reduce((acc, curr) => acc + (Number(curr.amount) + Number(curr.margin || 0)), 0);

  const totalA = calculateTotal(quoteData.base_rates);
  const totalB = calculateTotal(quoteData.shipping_line_rates);

  return (
    <div style={{ backgroundColor: "#f3f4f6", padding: "20px", maxHeight: "80vh", overflowY: "auto" }}>
      <style>
        {`
          @media print {
            @page { margin: 0; }
            body * {
              visibility: hidden;
            }
            #quotation-print-area, #quotation-print-area * {
              visibility: visible;
            }
            #quotation-print-area {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
              margin: 0 !important;
              padding: 1.5cm 2cm !important;
              box-shadow: none !important;
              background-color: white !important;
            }
            .no-print {
              display: none !important;
              visibility: hidden !important;
            }
            input {
              border: none !important;
              background: transparent !important;
              -webkit-appearance: none;
              -moz-appearance: textfield;
              margin: 0;
            }
            input::-webkit-outer-spin-button,
            input::-webkit-inner-spin-button {
              -webkit-appearance: none;
              margin: 0;
            }
          }
        `}
      </style>
      <button 
        className="no-print"
        onClick={onBack} 
        style={{ marginBottom: "15px", padding: "6px 12px", borderRadius: "5px", border: "1px solid #ccc", cursor: "pointer" }}
      >
        ← Back to Rates
      </button>

      <div style={s.quoteWrapper} id="quotation-print-area">
        <div style={s.header}>
          <div style={s.address}>
            <strong>A 204 to 206, Wall Street II</strong><br />
            Opp Orient Club, Ellis Bridge<br />
            Ahmedabad - 380006<br />
            Phone: 079-26402005 / 26402006<br />
            Email: sojith@surajforwarders.com
          </div>
          <div style={{ textAlign: "right", fontSize: "12px" }}>
            Date: {new Date().toLocaleDateString("en-GB")}
          </div>
        </div>

        <div style={{ fontSize: "13px", marginBottom: "20px" }}>
          To: M/s <strong>{enquiry.organization_name}</strong>
        </div>

        <div style={s.title}>
          FREIGHT QUOTATION ({enquiry.container_size || "LCL"})
        </div>

        <table style={s.table}>
          <thead>
            <tr>
              <th style={s.th}>Charges</th>
              <th style={{ ...s.th, textAlign: "right" }}>Amount (Rs)</th>
            </tr>
          </thead>
          <tbody>
            {quoteData.base_rates.map((item, i) => (
              <tr key={i}>
                <td style={s.td}>{item.charge_name}</td>
                <td style={{ ...s.td, textAlign: "right" }}>
                  <input 
                    type="number" 
                    style={{...s.input, backgroundColor: 'transparent'}} 
                    className="no-border-print"
                    value={Number(item.amount) + Number(item.margin)} 
                    onChange={(e) => {
                      const val = e.target.value;
                      const next = [...quoteData.base_rates];
                      next[i].margin = Number(val) - Number(item.amount);
                      setQuoteData({ ...quoteData, base_rates: next });
                    }}
                  />
                </td>
              </tr>
            ))}
            <tr style={{ fontWeight: "bold", backgroundColor: "#f8fafc" }}>
              <td style={{ ...s.td, textAlign: "right" }}>TOTAL (A)</td>
              <td style={{ ...s.td, textAlign: "right" }}>{totalA.toLocaleString()}</td>
            </tr>
          </tbody>
        </table>

        <table style={s.table}>
          <thead>
            <tr>
              <th style={s.th}>Shipping Line Cost</th>
              <th style={{ ...s.th, textAlign: "right" }}>Amount (Rs)</th>
            </tr>
          </thead>
          <tbody>
            {quoteData.shipping_line_rates.map((item, i) => (
              <tr key={i}>
                <td style={s.td}>{item.charge_name}</td>
                <td style={{ ...s.td, textAlign: "right" }}>
                  <input 
                    type="number" 
                    style={{...s.input, backgroundColor: 'transparent'}} 
                    className="no-border-print"
                    value={Number(item.amount) + Number(item.margin)} 
                    onChange={(e) => {
                      const val = e.target.value;
                      const next = [...quoteData.shipping_line_rates];
                      next[i].margin = Number(val) - Number(item.amount);
                      setQuoteData({ ...quoteData, shipping_line_rates: next });
                    }}
                  />
                </td>
              </tr>
            ))}
            <tr style={{ fontWeight: "bold", backgroundColor: "#f8fafc" }}>
              <td style={{ ...s.td, textAlign: "right" }}>TOTAL (B)</td>
              <td style={{ ...s.td, textAlign: "right" }}>{totalB.toLocaleString()}</td>
            </tr>
          </tbody>
        </table>

        <div style={{ textAlign: "right", fontWeight: "bold", fontSize: "14px" }}>
          GRAND TOTAL (A + B): ₹{(totalA + totalB).toLocaleString()} + GST
        </div>

        <div style={s.footerNote}>
          <div>➤ Payment: 100% advance or against Bill of Lading</div>
          <div>➤ Transit Time: 12 to 15 days</div>
          <div>➤ Free days: 14 days at FPOD</div>
          <div>➤ Subject to space availability, equipment & rate approval</div>
          <div>➤ Booking cancellation charges as per liner tariff</div>
          <div>➤ Rates valid till: {new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString("en-GB")}</div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", marginTop: "40px" }}>
          <div style={{ fontSize: "12px", fontWeight: "bold" }}>For Suraj Forwarders</div>
          <div style={{ fontSize: "12px", fontWeight: "bold" }}>Authorized Signatory</div>
        </div>

        <div style={{ marginTop: "30px", textAlign: "center" }} className="no-print">
           <button 
             onClick={() => window.print()} 
             style={{ backgroundColor: "#1e293b", color: "#fff", padding: "10px 20px", border: 'none', borderRadius: '5px', cursor: 'pointer' }}
           >
             Download / Print Quotation
           </button>
        </div>
      </div>
    </div>
  );
}

export default FreightQuotation;
