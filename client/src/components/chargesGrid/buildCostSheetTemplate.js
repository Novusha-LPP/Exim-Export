/**
 * Helper to build the HTML template for the Freight Forwarding Cost Sheet.
 */
export const buildCostSheetTemplate = (job = {}, charges = [], logoSrc = '') => {
  // Helper to format dates
  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return date
      .toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
      .replace(/ /g, "-");
  };

  const formatNumber = (num) => {
    if (num === null || num === undefined || isNaN(Number(num))) return "0.00";
    return Number(num).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // Grouping logic for the bottom summary grid (Taxable / Basic amounts only, excluding GST)
  const receiveGroups = {};
  const payGroups = {};

  charges.forEach(ch => {
    // Determine taxable/basic amounts
    const revBasic = ch.revenue?.basicAmount !== undefined && ch.revenue?.basicAmount !== null
      ? Number(ch.revenue.basicAmount)
      : Number(ch.revenue?.amountINR || 0);

    const costBasic = ch.cost?.basicAmount !== undefined && ch.cost?.basicAmount !== null
      ? Number(ch.cost.basicAmount)
      : (ch.cost?.amountINR !== undefined ? Number(ch.cost.amountINR) - Number(ch.cost?.gstAmount || 0) : 0);

    // Group Receivables
    if (ch.revenue?.partyName && revBasic > 0) {
      const party = ch.revenue.partyName;
      const curr = ch.revenue.currency || "INR";
      const key = `${party}_${curr}`;
      if (!receiveGroups[key]) {
        receiveGroups[key] = {
          party,
          currency: curr,
          amount: 0,
          amountINR: 0
        };
      }
      receiveGroups[key].amount += Number(ch.revenue.amount || 0);
      receiveGroups[key].amountINR += revBasic;
    }

    // Group Payables
    if (ch.cost?.partyName && costBasic > 0) {
      const party = ch.cost.partyName;
      const curr = ch.cost.currency || "INR";
      const key = `${party}_${curr}`;
      if (!payGroups[key]) {
        payGroups[key] = {
          party,
          currency: curr,
          amount: 0,
          amountINR: 0
        };
      }
      payGroups[key].amount += Number(ch.cost.amount || 0);
      payGroups[key].amountINR += costBasic;
    }
  });

  const receiveRows = Object.values(receiveGroups);
  const payRows = Object.values(payGroups);
  const maxSummaryRows = Math.max(receiveRows.length, payRows.length);

  // Generate bottom summary table rows
  let summaryRowsHtml = "";
  for (let i = 0; i < maxSummaryRows; i++) {
    const rec = receiveRows[i] || {};
    const pay = payRows[i] || {};

    const recExRate = (rec.amount > 0) ? (rec.amountINR / rec.amount) : 1;
    const payExRate = (pay.amount > 0) ? (pay.amountINR / pay.amount) : 1;

    summaryRowsHtml += `
      <tr style="border-bottom: 1px solid #e5e7eb;">
        <td style="padding: 5px 6px; border: 1px solid #e5e7eb; font-size: 8.5px; text-align: left; vertical-align: middle; max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${rec.party || ""}</td>
        <td style="padding: 5px 6px; border: 1px solid #e5e7eb; font-size: 8.5px; text-align: right; vertical-align: middle;">${rec.amount ? `${rec.currency} ${formatNumber(rec.amount)}` : ""}</td>
        <td style="padding: 5px 6px; border: 1px solid #e5e7eb; font-size: 8.5px; text-align: right; vertical-align: middle;">${rec.amount ? recExRate.toFixed(6) : ""}</td>
        <td style="padding: 5px 6px; border: 1px solid #e5e7eb; font-size: 8.5px; text-align: right; vertical-align: middle; font-weight: bold;">${rec.amountINR ? formatNumber(rec.amountINR) : ""}</td>
        
        <td style="padding: 5px 6px; border: 1px solid #e5e7eb; font-size: 8.5px; text-align: left; vertical-align: middle; max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${pay.party || ""}</td>
        <td style="padding: 5px 6px; border: 1px solid #e5e7eb; font-size: 8.5px; text-align: right; vertical-align: middle;">${pay.amount ? `${pay.currency} ${formatNumber(pay.amount)}` : ""}</td>
        <td style="padding: 5px 6px; border: 1px solid #e5e7eb; font-size: 8.5px; text-align: right; vertical-align: middle;">${pay.amount ? payExRate.toFixed(6) : ""}</td>
        <td style="padding: 5px 6px; border: 1px solid #e5e7eb; font-size: 8.5px; text-align: right; vertical-align: middle; font-weight: bold;">${pay.amountINR ? formatNumber(pay.amountINR) : ""}</td>
      </tr>
    `;
  }

  // Operation Table rows (All amounts are Taxable / Basic, excluding GST)
  let totalRevenueINR = 0;
  let totalCostINR = 0;
  let totalProfitINR = 0;

  const operationRowsHtml = charges.map((ch) => {
    const revAmt = Number(ch.revenue?.amount || 0);
    const revEx = Number(ch.revenue?.exchangeRate || 1);
    const revAmtINR = ch.revenue?.basicAmount !== undefined && ch.revenue?.basicAmount !== null
      ? Number(ch.revenue.basicAmount)
      : Number(ch.revenue?.amountINR || 0);

    const costAmt = Number(ch.cost?.amount || 0);
    const costEx = Number(ch.cost?.exchangeRate || 1);
    const costAmtINR = ch.cost?.basicAmount !== undefined && ch.cost?.basicAmount !== null
      ? Number(ch.cost.basicAmount)
      : (ch.cost?.amountINR !== undefined ? Number(ch.cost.amountINR) - Number(ch.cost?.gstAmount || 0) : 0);

    const profit = revAmtINR - costAmtINR;

    totalRevenueINR += revAmtINR;
    totalCostINR += costAmtINR;
    totalProfitINR += profit;

    return `
      <tr style="border-bottom: 1px solid #ccc;">
        <td style="padding: 6px 5px; border: 1px solid #bbb; text-align: left; vertical-align: middle; font-weight: bold; font-size: 9px;">${ch.chargeHead || ""}</td>
        <td style="padding: 6px 5px; border: 1px solid #bbb; text-align: left; vertical-align: middle; font-size: 8.5px; line-height: 1.3;">
          ${ch.revenue?.partyName ? `<span style="font-weight: 600;">C:-</span> ${ch.revenue.partyName}<br/>` : ''}
          ${ch.cost?.partyName ? `<span style="font-weight: 600;">V:-</span> ${ch.cost.partyName}` : ''}
        </td>
        <!-- Revenue Details -->
        <td style="padding: 6px 5px; border: 1px solid #bbb; text-align: right; vertical-align: middle; font-size: 8.5px;">${revAmt > 0 ? `${ch.revenue?.currency || "INR"} ${formatNumber(revAmt)}` : ""}</td>
        <td style="padding: 6px 5px; border: 1px solid #bbb; text-align: right; vertical-align: middle; font-size: 8.5px;">${revAmt > 0 ? revEx.toFixed(6) : ""}</td>
        <td style="padding: 6px 5px; border: 1px solid #bbb; text-align: right; vertical-align: middle; font-size: 8.5px; font-weight: 600;">${revAmt > 0 ? formatNumber(revAmtINR) : ""}</td>
        <!-- Cost Details -->
        <td style="padding: 6px 5px; border: 1px solid #bbb; text-align: right; vertical-align: middle; font-size: 8.5px;">${costAmt > 0 ? `${ch.cost?.currency || "INR"} ${formatNumber(costAmt)}` : ""}</td>
        <td style="padding: 6px 5px; border: 1px solid #bbb; text-align: right; vertical-align: middle; font-size: 8.5px;">${costAmt > 0 ? costEx.toFixed(6) : ""}</td>
        <td style="padding: 6px 5px; border: 1px solid #bbb; text-align: right; vertical-align: middle; font-size: 8.5px; font-weight: 600;">${costAmt > 0 ? formatNumber(costAmtINR) : ""}</td>
        <!-- Profit -->
        <td style="padding: 6px 5px; border: 1px solid #bbb; text-align: right; vertical-align: middle; font-size: 8.5px; font-weight: bold; color: ${profit >= 0 ? '#1e293b' : '#dc2626'}">${formatNumber(profit)}</td>
      </tr>
    `;
  }).join("");

  return `
    <div style="font-family: Arial, Helvetica, sans-serif; color: #000; width: 1020px; margin: 0 auto; padding: 4px 8px; box-sizing: border-box; background: #fff; line-height: 1.25;">
      
      <!-- Company Header -->
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 4px; border: none;">
        <tr>
          <td style="width: 16%; vertical-align: middle; border: none; padding: 0;">
            ${logoSrc ? `<img src="${logoSrc}" style="max-height: 48px; width: auto; display: block;" />` : ''}
          </td>
          <td style="width: 84%; text-align: center; vertical-align: middle; border: none; padding: 0;">
            <h2 style="margin: 0; font-size: 15px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; line-height: 1.2;">SURAJ FORWARDERS PVT LTD</h2>
            <div style="font-size: 10px; font-weight: bold; margin-top: 1px;">Branch :- FORWARDING BRANCH</div>
            <div style="font-size: 12px; font-weight: bold; text-decoration: underline; margin-top: 2px; text-transform: uppercase; letter-spacing: 0.5px;">Cost Sheet</div>
          </td>
        </tr>
      </table>

      <!-- Shipment Details Grid -->
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 6px; font-size: 8.5px; border: 1.5px solid #000; table-layout: fixed;">
        <tbody>
          <tr>
            <td style="padding: 4px 5px; border: 1px solid #999; width: 16.66%; vertical-align: middle;"><div style="font-weight: bold; color: #111; line-height: 1.15;">Shipment No.</div><div style="line-height: 1.2; margin-top: 1px;">: ${job.job_no || job.jobNumber || ""}</div></td>
            <td style="padding: 4px 5px; border: 1px solid #999; width: 16.66%; vertical-align: middle;"><div style="font-weight: bold; color: #111; line-height: 1.15;">dt</div><div style="line-height: 1.2; margin-top: 1px;">: ${formatDate(job.job_date || job.jobDate)}</div></td>
            <td style="padding: 4px 5px; border: 1px solid #999; width: 16.66%; vertical-align: middle;"><div style="font-weight: bold; color: #111; line-height: 1.15;">Gross Wt./Unit</div><div style="line-height: 1.2; margin-top: 1px;">: ${job.gross_weight_kg || ""} ${job.gross_weight_unit || ""}</div></td>
            <td style="padding: 4px 5px; border: 1px solid #999; width: 16.66%; vertical-align: middle;"><div style="font-weight: bold; color: #111; line-height: 1.15;">Movement Type</div><div style="line-height: 1.2; margin-top: 1px;">: ${job.movement_type || ""}</div></td>
            <td style="padding: 4px 5px; border: 1px solid #999; width: 16.66%; vertical-align: middle;"><div style="font-weight: bold; color: #111; line-height: 1.15;">Shipper Name</div><div style="line-height: 1.2; margin-top: 1px;">: ${job.shipper || job.exporter || ""}</div></td>
            <td style="padding: 4px 5px; border: 1px solid #999; width: 16.66%; vertical-align: middle;"><div style="font-weight: bold; color: #111; line-height: 1.15;">Vessel</div><div style="line-height: 1.2; margin-top: 1px;">: ${job.vessel_name || ""}</div></td>
          </tr>
          <tr>
            <td style="padding: 4px 5px; border: 1px solid #999; vertical-align: middle;"><div style="font-weight: bold; color: #111; line-height: 1.15;">Booking No.</div><div style="line-height: 1.2; margin-top: 1px;">: ${job.booking_no || ""}</div></td>
            <td style="padding: 4px 5px; border: 1px solid #999; vertical-align: middle;"><div style="font-weight: bold; color: #111; line-height: 1.15;">dt</div><div style="line-height: 1.2; margin-top: 1px;">: ${formatDate(job.booking_date)}</div></td>
            <td style="padding: 4px 5px; border: 1px solid #999; vertical-align: middle;"><div style="font-weight: bold; color: #111; line-height: 1.15;">Chg. Wt./Unit</div><div style="line-height: 1.2; margin-top: 1px;">: ${job.chargeable_weight || ""} ${job.chargeable_weight_unit || ""}</div></td>
            <td style="padding: 4px 5px; border: 1px solid #999; vertical-align: middle;"><div style="font-weight: bold; color: #111; line-height: 1.15;">Place of Receipt</div><div style="line-height: 1.2; margin-top: 1px;">: ${job.place_of_receipt || ""}</div></td>
            <td style="padding: 4px 5px; border: 1px solid #999; vertical-align: middle;"><div style="font-weight: bold; color: #111; line-height: 1.15;">Consignee Name</div><div style="line-height: 1.2; margin-top: 1px;">: ${job.consignees?.[0]?.consignee_name || job.consignee_name || ""}</div></td>
            <td style="padding: 4px 5px; border: 1px solid #999; vertical-align: middle;"><div style="font-weight: bold; color: #111; line-height: 1.15;">Voyage</div><div style="line-height: 1.2; margin-top: 1px;">: ${job.voyage_no || ""}</div></td>
          </tr>
          <tr>
            <td style="padding: 4px 5px; border: 1px solid #999; vertical-align: middle;" colspan="2"><div style="font-weight: bold; color: #111; line-height: 1.15;">Volume/Unit</div><div style="line-height: 1.2; margin-top: 1px;">: ${job.volume_cbm || ""} ${job.volume_unit || ""}</div></td>
            <td style="padding: 4px 5px; border: 1px solid #999; vertical-align: middle;" colspan="2"><div style="font-weight: bold; color: #111; line-height: 1.15;">Loading Port</div><div style="line-height: 1.2; margin-top: 1px;">: ${job.port_of_loading || ""}</div></td>
            <td style="padding: 4px 5px; border: 1px solid #999; vertical-align: middle;"><div style="font-weight: bold; color: #111; line-height: 1.15;">Booking Thru</div><div style="line-height: 1.2; margin-top: 1px;">: ${job.booking_thru || ""}</div></td>
            <td style="padding: 4px 5px; border: 1px solid #999; vertical-align: middle;"><div style="font-weight: bold; color: #111; line-height: 1.15;">ETA (Dest)</div><div style="line-height: 1.2; margin-top: 1px;">: ${formatDate(job.eta_date)}</div></td>
          </tr>
          <tr>
            <td style="padding: 4px 5px; border: 1px solid #999; vertical-align: middle;"><div style="font-weight: bold; color: #111; line-height: 1.15;">BL No</div><div style="line-height: 1.2; margin-top: 1px;">: ${job.mbl_no || ""}</div></td>
            <td style="padding: 4px 5px; border: 1px solid #999; vertical-align: middle;"><div style="font-weight: bold; color: #111; line-height: 1.15;">dt</div><div style="line-height: 1.2; margin-top: 1px;">: ${formatDate(job.mbl_date)}</div></td>
            <td style="padding: 4px 5px; border: 1px solid #999; vertical-align: middle;"><div style="font-weight: bold; color: #111; line-height: 1.15;">No of Pkgs</div><div style="line-height: 1.2; margin-top: 1px;">: ${job.total_no_of_pkgs || ""} ${job.package_unit || ""}</div></td>
            <td style="padding: 4px 5px; border: 1px solid #999; vertical-align: middle;"><div style="font-weight: bold; color: #111; line-height: 1.15;">Discharge Port</div><div style="line-height: 1.2; margin-top: 1px;">: ${job.port_of_discharge || ""}</div></td>
            <td style="padding: 4px 5px; border: 1px solid #999; vertical-align: middle;"><div style="font-weight: bold; color: #111; line-height: 1.15;">Sales Person</div><div style="line-height: 1.2; margin-top: 1px;">: ${job.sales_person || ""}</div></td>
            <td style="padding: 4px 5px; border: 1px solid #999; vertical-align: middle;"><div style="font-weight: bold; color: #111; line-height: 1.15;">ETD</div><div style="line-height: 1.2; margin-top: 1px;">: ${formatDate(job.sailing_date)}</div></td>
          </tr>
          <tr>
            <td style="padding: 4px 5px; border: 1px solid #999; vertical-align: middle;"><div style="font-weight: bold; color: #111; line-height: 1.15;">HBL No</div><div style="line-height: 1.2; margin-top: 1px;">: ${job.hbl_no || ""}</div></td>
            <td style="padding: 4px 5px; border: 1px solid #999; vertical-align: middle;"><div style="font-weight: bold; color: #111; line-height: 1.15;">dt</div><div style="line-height: 1.2; margin-top: 1px;">: ${formatDate(job.hbl_date)}</div></td>
            <td style="padding: 4px 5px; border: 1px solid #999; vertical-align: middle;"><div style="font-weight: bold; color: #111; line-height: 1.15;">Volume Weight</div><div style="line-height: 1.2; margin-top: 1px;">: ${job.volume_weight || ""}</div></td>
            <td style="padding: 4px 5px; border: 1px solid #999; vertical-align: middle;"><div style="font-weight: bold; color: #111; line-height: 1.15;">Delivery</div><div style="line-height: 1.2; margin-top: 1px;">: ${job.place_of_delivery || ""}</div></td>
            <td style="padding: 4px 5px; border: 1px solid #999; vertical-align: middle;"><div style="font-weight: bold; color: #111; line-height: 1.15;">Shipping line</div><div style="line-height: 1.2; margin-top: 1px;">: ${job.shipping_line_airline || ""}</div></td>
            <td style="padding: 4px 5px; border: 1px solid #999; vertical-align: middle;"><div style="font-weight: bold; color: #111; line-height: 1.15;">Freight Type</div><div style="line-height: 1.2; margin-top: 1px;">: ${job.freight_type || ""}</div></td>
          </tr>
          <tr>
            <td style="padding: 4px 5px; border: 1px solid #999; vertical-align: middle;" colspan="2"><b>Shipment Terms</b> : ${job.shipment_terms || ""}</td>
            <td style="padding: 4px 5px; border: 1px solid #999; vertical-align: middle;"><b>Cargo Type</b> : ${job.cargo_type || ""}</td>
            <td style="padding: 4px 5px; border: 1px solid #999; vertical-align: middle;" colspan="3"><b>Container Qty & Type</b> : ${job.container_qty_type || ""}</td>
          </tr>
        </tbody>
      </table>

      <!-- Operation Main Charges Grid -->
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 6px; font-size: 8.5px; border: 1.5px solid #000; table-layout: fixed;">
        <thead>
          <tr style="background: #e2e8f0; font-weight: bold; border-bottom: 1.5px solid #000;">
            <th style="padding: 5px 5px; border: 1px solid #888; text-align: left; vertical-align: middle; width: 14%;">Charge Name</th>
            <th style="padding: 5px 5px; border: 1px solid #888; text-align: left; vertical-align: middle; width: 20%;">Receive From / Pay To</th>
            <th style="padding: 5px 4px; border: 1px solid #888; text-align: right; vertical-align: middle; width: 9%; background: #cbd5e1;">Rev. Amount</th>
            <th style="padding: 5px 4px; border: 1px solid #888; text-align: right; vertical-align: middle; width: 7.5%; background: #cbd5e1;">Rev. Ex. Rate</th>
            <th style="padding: 5px 4px; border: 1px solid #888; text-align: right; vertical-align: middle; width: 10%; background: #cbd5e1;">Rev. INR</th>
            <th style="padding: 5px 4px; border: 1px solid #888; text-align: right; vertical-align: middle; width: 9%; background: #e2e8f0;">Cost Amount</th>
            <th style="padding: 5px 4px; border: 1px solid #888; text-align: right; vertical-align: middle; width: 7.5%; background: #e2e8f0;">Cost Ex. Rate</th>
            <th style="padding: 5px 4px; border: 1px solid #888; text-align: right; vertical-align: middle; width: 10%; background: #e2e8f0;">Cost INR</th>
            <th style="padding: 5px 5px; border: 1px solid #888; text-align: right; vertical-align: middle; width: 13%;">Profit INR</th>
          </tr>
        </thead>
        <tbody>
          ${operationRowsHtml}
          <!-- Totals Row -->
          <tr style="background: #f8fafc; font-weight: bold; border-top: 1.5px solid #000;">
            <td style="padding: 5px 5px; border: 1px solid #999; text-align: left; vertical-align: middle; font-size: 9px;" colspan="2">Total :</td>
            <td style="padding: 5px 5px; border: 1px solid #999; text-align: right; vertical-align: middle;" colspan="2"></td>
            <td style="padding: 5px 5px; border: 1px solid #999; text-align: right; vertical-align: middle; font-size: 9px;">${formatNumber(totalRevenueINR)}</td>
            <td style="padding: 5px 5px; border: 1px solid #999; text-align: right; vertical-align: middle;" colspan="2"></td>
            <td style="padding: 5px 5px; border: 1px solid #999; text-align: right; vertical-align: middle; font-size: 9px;">${formatNumber(totalCostINR)}</td>
            <td style="padding: 5px 5px; border: 1px solid #999; text-align: right; vertical-align: middle; font-size: 9px; color: ${totalProfitINR >= 0 ? '#0f172a' : '#dc2626'}">${formatNumber(totalProfitINR)}</td>
          </tr>
        </tbody>
      </table>

      <!-- Bottom Notes and consolidated summary grid -->
      <div style="font-size: 8px; font-style: italic; color: #475569; margin-bottom: 4px;">
        * Indicates GL Head; # Indicates Consolidated Charge
      </div>

      <table style="width: 100%; border-collapse: collapse; font-size: 8.5px; border: 1.5px solid #000; table-layout: fixed;">
        <thead>
          <tr style="background: #e2e8f0; font-weight: bold; border-bottom: 1.5px solid #000;">
            <th style="padding: 5px 5px; border: 1px solid #999; text-align: left; vertical-align: middle; width: 22%;">Receive From</th>
            <th style="padding: 5px 5px; border: 1px solid #999; text-align: right; vertical-align: middle; width: 11%;">Amount</th>
            <th style="padding: 5px 5px; border: 1px solid #999; text-align: right; vertical-align: middle; width: 7%;">Ex. Rate</th>
            <th style="padding: 5px 5px; border: 1px solid #999; text-align: right; vertical-align: middle; width: 10%;">Amount INR</th>
            
            <th style="padding: 5px 5px; border: 1px solid #999; text-align: left; vertical-align: middle; width: 22%; border-left: 2px solid #000;">Pay To</th>
            <th style="padding: 5px 5px; border: 1px solid #999; text-align: right; vertical-align: middle; width: 11%;">Amount</th>
            <th style="padding: 5px 5px; border: 1px solid #999; text-align: right; vertical-align: middle; width: 7%;">Ex. Rate</th>
            <th style="padding: 5px 5px; border: 1px solid #999; text-align: right; vertical-align: middle; width: 10%;">Amount INR</th>
          </tr>
        </thead>
        <tbody>
          ${summaryRowsHtml || `
            <tr>
              <td colspan="4" style="padding: 6px; text-align: center; color: #64748b; font-style: italic;">No receivables recorded</td>
              <td colspan="4" style="padding: 6px; text-align: center; color: #64748b; font-style: italic; border-left: 2px solid #000;">No payables recorded</td>
            </tr>
          `}
        </tbody>
      </table>

      <!-- Bottom print footer -->
      <table style="width: 100%; border-collapse: collapse; margin-top: 6px; font-size: 8px; border: none;">
        <tr>
          <td style="border: none; padding: 0; text-align: left; color: #64748b;">
            ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
          </td>
          <td style="border: none; padding: 0; text-align: right; color: #64748b;">
            Page 1 of 1
          </td>
        </tr>
      </table>

    </div>
  `;
};
