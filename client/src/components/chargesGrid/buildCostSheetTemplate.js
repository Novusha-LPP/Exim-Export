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

  // Grouping logic for the bottom summary grid
  const receiveGroups = {};
  const payGroups = {};

  charges.forEach(ch => {
    // Group Receivables
    if (ch.revenue?.partyName && Number(ch.revenue?.amount) > 0) {
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
      receiveGroups[key].amountINR += Number(ch.revenue.amountINR || 0);
    }

    // Group Payables
    if (ch.cost?.partyName && Number(ch.cost?.amount) > 0) {
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
      payGroups[key].amountINR += Number(ch.cost.amountINR || 0);
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
        <td style="padding: 4px; border: 1px solid #e5e7eb; font-size: 8.5px; text-align: left; max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${rec.party || ""}</td>
        <td style="padding: 4px; border: 1px solid #e5e7eb; font-size: 8.5px; text-align: right;">${rec.amount ? `${rec.currency} ${formatNumber(rec.amount)}` : ""}</td>
        <td style="padding: 4px; border: 1px solid #e5e7eb; font-size: 8.5px; text-align: right;">${rec.amount ? recExRate.toFixed(6) : ""}</td>
        <td style="padding: 4px; border: 1px solid #e5e7eb; font-size: 8.5px; text-align: right; font-weight: bold;">${rec.amountINR ? formatNumber(rec.amountINR) : ""}</td>
        
        <td style="padding: 4px; border: 1px solid #e5e7eb; font-size: 8.5px; text-align: left; max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${pay.party || ""}</td>
        <td style="padding: 4px; border: 1px solid #e5e7eb; font-size: 8.5px; text-align: right;">${pay.amount ? `${pay.currency} ${formatNumber(pay.amount)}` : ""}</td>
        <td style="padding: 4px; border: 1px solid #e5e7eb; font-size: 8.5px; text-align: right;">${pay.amount ? payExRate.toFixed(6) : ""}</td>
        <td style="padding: 4px; border: 1px solid #e5e7eb; font-size: 8.5px; text-align: right; font-weight: bold;">${pay.amountINR ? formatNumber(pay.amountINR) : ""}</td>
      </tr>
    `;
  }

  // Operation Table rows
  let totalRevenueINR = 0;
  let totalCostINR = 0;
  let totalProfitINR = 0;

  const operationRowsHtml = charges.map((ch) => {
    const revAmt = Number(ch.revenue?.amount || 0);
    const revEx = Number(ch.revenue?.exchangeRate || 1);
    const revAmtINR = Number(ch.revenue?.amountINR || 0);

    const costAmt = Number(ch.cost?.amount || 0);
    const costEx = Number(ch.cost?.exchangeRate || 1);
    const costAmtINR = Number(ch.cost?.amountINR || 0);

    const profit = revAmtINR - costAmtINR;

    totalRevenueINR += revAmtINR;
    totalCostINR += costAmtINR;
    totalProfitINR += profit;

    return `
      <tr style="border-bottom: 1px solid #ccc;">
        <td style="padding: 5px; border: 1px solid #bbb; text-align: left; font-weight: bold; font-size: 9px;">${ch.chargeHead || ""}</td>
        <td style="padding: 5px; border: 1px solid #bbb; text-align: left; font-size: 8.5px; line-height: 1.3;">
          ${ch.revenue?.partyName ? `<span style="font-weight: 600;">C:-</span> ${ch.revenue.partyName}<br/>` : ''}
          ${ch.cost?.partyName ? `<span style="font-weight: 600;">V:-</span> ${ch.cost.partyName}` : ''}
        </td>
        <!-- Revenue Details -->
        <td style="padding: 5px; border: 1px solid #bbb; text-align: right; font-size: 8.5px;">${revAmt > 0 ? `${ch.revenue?.currency || "INR"} ${formatNumber(revAmt)}` : ""}</td>
        <td style="padding: 5px; border: 1px solid #bbb; text-align: right; font-size: 8.5px;">${revAmt > 0 ? revEx.toFixed(6) : ""}</td>
        <td style="padding: 5px; border: 1px solid #bbb; text-align: right; font-size: 8.5px; font-weight: 600;">${revAmt > 0 ? formatNumber(revAmtINR) : ""}</td>
        <!-- Cost Details -->
        <td style="padding: 5px; border: 1px solid #bbb; text-align: right; font-size: 8.5px;">${costAmt > 0 ? `${ch.cost?.currency || "INR"} ${formatNumber(costAmt)}` : ""}</td>
        <td style="padding: 5px; border: 1px solid #bbb; text-align: right; font-size: 8.5px;">${costAmt > 0 ? costEx.toFixed(6) : ""}</td>
        <td style="padding: 5px; border: 1px solid #bbb; text-align: right; font-size: 8.5px; font-weight: 600;">${costAmt > 0 ? formatNumber(costAmtINR) : ""}</td>
        <!-- Profit -->
        <td style="padding: 5px; border: 1px solid #bbb; text-align: right; font-size: 8.5px; font-weight: bold; color: ${profit >= 0 ? '#1e293b' : '#dc2626'}">${formatNumber(profit)}</td>
      </tr>
    `;
  }).join("");

  return `
    <div style="font-family: Arial, Helvetica, sans-serif; color: #000; width: 1000px; margin: 0 auto; padding: 15px; box-sizing: border-box; background: #fff; line-height: 1.2;">
      
      <!-- Company Header -->
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 10px;">
        <tr>
          <td style="width: 15%; vertical-align: middle; border: none; padding: 0;">
            ${logoSrc ? `<img src="${logoSrc}" style="max-height: 55px; width: auto; display: block;" />` : ''}
          </td>
          <td style="width: 85%; text-align: center; vertical-align: middle; border: none; padding: 0;">
            <h2 style="margin: 0; font-size: 17px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px;">SURAJ FORWARDERS PVT LTD</h2>
            <div style="font-size: 10.5px; font-weight: bold; margin-top: 2px;">Branch :- FORWARDING BRANCH</div>
            <div style="font-size: 13px; font-weight: bold; text-decoration: underline; margin-top: 4px; text-transform: uppercase; letter-spacing: 0.5px;">Cost Sheet</div>
          </td>
        </tr>
      </table>

      <!-- Shipment Details Grid -->
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 10px; font-size: 9px; border: 1.5px solid #000;">
        <tbody>
          <tr>
            <td style="padding: 4px 6px; border: 1px solid #ccc; width: 16.66%;"><b>Shipment No.</b><br/>: ${job.job_no || job.jobNumber || ""}</td>
            <td style="padding: 4px 6px; border: 1px solid #ccc; width: 16.66%;"><b>dt</b><br/>: ${formatDate(job.job_date || job.jobDate)}</td>
            <td style="padding: 4px 6px; border: 1px solid #ccc; width: 16.66%;"><b>Gross Wt./Unit</b><br/>: ${job.gross_weight_kg || ""} ${job.gross_weight_unit || ""}</td>
            <td style="padding: 4px 6px; border: 1px solid #ccc; width: 16.66%;"><b>Movement Type</b><br/>: ${job.movement_type || ""}</td>
            <td style="padding: 4px 6px; border: 1px solid #ccc; width: 16.66%;"><b>Shipper Name</b><br/>: ${job.shipper || job.exporter || ""}</td>
            <td style="padding: 4px 6px; border: 1px solid #ccc; width: 16.66%;"><b>Vessel</b><br/>: ${job.vessel_name || ""}</td>
          </tr>
          <tr>
            <td style="padding: 4px 6px; border: 1px solid #ccc;"><b>Booking No.</b><br/>: ${job.booking_no || ""}</td>
            <td style="padding: 4px 6px; border: 1px solid #ccc;"><b>dt</b><br/>: ${formatDate(job.booking_date)}</td>
            <td style="padding: 4px 6px; border: 1px solid #ccc;"><b>Chg. Wt./Unit</b><br/>: ${job.chargeable_weight || ""} ${job.chargeable_weight_unit || ""}</td>
            <td style="padding: 4px 6px; border: 1px solid #ccc;"><b>Place of Receipt</b><br/>: ${job.place_of_receipt || ""}</td>
            <td style="padding: 4px 6px; border: 1px solid #ccc;"><b>Consignee Name</b><br/>: ${job.consignees?.[0]?.consignee_name || job.consignee_name || ""}</td>
            <td style="padding: 4px 6px; border: 1px solid #ccc;"><b>Voyage</b><br/>: ${job.voyage_no || ""}</td>
          </tr>
          <tr>
            <td style="padding: 4px 6px; border: 1px solid #ccc;"><b>Consol No.</b><br/>: ${job.consol_no || ""}</td>
            <td style="padding: 4px 6px; border: 1px solid #ccc;"><b>dt</b><br/>: ${formatDate(job.consol_date)}</td>
            <td style="padding: 4px 6px; border: 1px solid #ccc;"><b>Volume/Unit</b><br/>: ${job.volume_cbm || ""} ${job.volume_unit || ""}</td>
            <td style="padding: 4px 6px; border: 1px solid #ccc;"><b>Loading Port</b><br/>: ${job.port_of_loading || ""}</td>
            <td style="padding: 4px 6px; border: 1px solid #ccc;"><b>Booking Thru</b><br/>: ${job.booking_thru || ""}</td>
            <td style="padding: 4px 6px; border: 1px solid #ccc;"><b>ETA (Dest)</b><br/>: ${formatDate(job.eta_date)}</td>
          </tr>
          <tr>
            <td style="padding: 4px 6px; border: 1px solid #ccc;"><b>BL No</b><br/>: ${job.mbl_no || ""}</td>
            <td style="padding: 4px 6px; border: 1px solid #ccc;"><b>dt</b><br/>: ${formatDate(job.mbl_date)}</td>
            <td style="padding: 4px 6px; border: 1px solid #ccc;"><b>No of Pkgs</b><br/>: ${job.total_no_of_pkgs || ""} ${job.package_unit || ""}</td>
            <td style="padding: 4px 6px; border: 1px solid #ccc;"><b>Discharge Port</b><br/>: ${job.port_of_discharge || ""}</td>
            <td style="padding: 4px 6px; border: 1px solid #ccc;"><b>Sales Person</b><br/>: ${job.sales_person || ""}</td>
            <td style="padding: 4px 6px; border: 1px solid #ccc;"><b>ETD</b><br/>: ${formatDate(job.sailing_date)}</td>
          </tr>
          <tr>
            <td style="padding: 4px 6px; border: 1px solid #ccc;"><b>HBL No</b><br/>: ${job.hbl_no || ""}</td>
            <td style="padding: 4px 6px; border: 1px solid #ccc;"><b>dt</b><br/>: ${formatDate(job.hbl_date)}</td>
            <td style="padding: 4px 6px; border: 1px solid #ccc;"><b>Volume Weight</b><br/>: ${job.volume_weight || ""}</td>
            <td style="padding: 4px 6px; border: 1px solid #ccc;"><b>Delivery</b><br/>: ${job.place_of_delivery || ""}</td>
            <td style="padding: 4px 6px; border: 1px solid #ccc;"><b>Shipping line</b><br/>: ${job.shipping_line_airline || ""}</td>
            <td style="padding: 4px 6px; border: 1px solid #ccc;"><b>Freight Type</b><br/>: ${job.freight_type || ""}</td>
          </tr>
          <tr>
            <td style="padding: 4px 6px; border: 1px solid #ccc;" colspan="2"><b>Shipment Terms</b> : ${job.shipment_terms || ""}</td>
            <td style="padding: 4px 6px; border: 1px solid #ccc;"><b>Cargo Type</b> : ${job.cargo_type || ""}</td>
            <td style="padding: 4px 6px; border: 1px solid #ccc;" colspan="3"><b>Container Qty & Type</b> : ${job.container_qty_type || ""}</td>
          </tr>
        </tbody>
      </table>

      <!-- Operation Main Charges Grid -->
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 12px; font-size: 9px; border: 2px solid #000;">
        <thead>
          <tr style="background: #ccc; border-bottom: 2px solid #000;">
            <th style="padding: 6px; border: 1px solid #888; text-align: left; width: 22%;" rowspan="2">Charge Name</th>
            <th style="padding: 6px; border: 1px solid #888; text-align: left; width: 22%;" rowspan="2">Receive From / Pay To</th>
            <th style="padding: 4px; border: 1px solid #888; text-align: center; background: #e0e0e0;" colspan="3">Revenue</th>
            <th style="padding: 4px; border: 1px solid #888; text-align: center; background: #e0e0e0;" colspan="3">Cost</th>
            <th style="padding: 6px; border: 1px solid #888; text-align: right; width: 10%;" rowspan="2">Profit<br/>INR</th>
          </tr>
          <tr style="background: #e9e9e9; border-bottom: 1px solid #000;">
            <th style="padding: 4px; border: 1px solid #888; text-align: right; width: 8%;">Amount</th>
            <th style="padding: 4px; border: 1px solid #888; text-align: right; width: 7%;">Ex. rate</th>
            <th style="padding: 4px; border: 1px solid #888; text-align: right; width: 8%;">Amount INR</th>
            <th style="padding: 4px; border: 1px solid #888; text-align: right; width: 8%;">Amount</th>
            <th style="padding: 4px; border: 1px solid #888; text-align: right; width: 7%;">Ex. rate</th>
            <th style="padding: 4px; border: 1px solid #888; text-align: right; width: 8%;">Amount INR</th>
          </tr>
        </thead>
        <tbody>
          ${operationRowsHtml}
          <!-- Totals Row -->
          <tr style="background: #f3f4f6; font-weight: bold; border-top: 2px solid #000;">
            <td style="padding: 6px; border: 1px solid #bbb; text-align: left; font-size: 9.5px;" colspan="2">Total :</td>
            <td style="padding: 6px; border: 1px solid #bbb; text-align: right;" colspan="2"></td>
            <td style="padding: 6px; border: 1px solid #bbb; text-align: right; font-size: 9.5px;">${formatNumber(totalRevenueINR)}</td>
            <td style="padding: 6px; border: 1px solid #bbb; text-align: right;" colspan="2"></td>
            <td style="padding: 6px; border: 1px solid #bbb; text-align: right; font-size: 9.5px;">${formatNumber(totalCostINR)}</td>
            <td style="padding: 6px; border: 1px solid #bbb; text-align: right; font-size: 9.5px; color: ${totalProfitINR >= 0 ? '#1e293b' : '#dc2626'}">${formatNumber(totalProfitINR)}</td>
          </tr>
        </tbody>
      </table>

      <!-- Bottom Notes and consolidated summary grid -->
      <div style="font-size: 8px; font-style: italic; color: #555; margin-bottom: 10px;">
        * Indicates GL Head; # Indicates Consolidated Charge
      </div>

      <table style="width: 100%; border-collapse: collapse; font-size: 9px; border: 1.5px solid #000;">
        <thead>
          <tr style="background: #e5e7eb; font-weight: bold; border-bottom: 1.5px solid #000;">
            <th style="padding: 5px; border: 1px solid #ccc; text-align: left; width: 22%;">Receive From</th>
            <th style="padding: 5px; border: 1px solid #ccc; text-align: right; width: 11%;">Amount</th>
            <th style="padding: 5px; border: 1px solid #ccc; text-align: right; width: 7%;">Ex. Rate</th>
            <th style="padding: 5px; border: 1px solid #ccc; text-align: right; width: 10%;">Amount INR</th>
            
            <th style="padding: 5px; border: 1px solid #ccc; text-align: left; width: 22%; border-left: 2px solid #000;">Pay To</th>
            <th style="padding: 5px; border: 1px solid #ccc; text-align: right; width: 11%;">Amount</th>
            <th style="padding: 5px; border: 1px solid #ccc; text-align: right; width: 7%;">Ex. Rate</th>
            <th style="padding: 5px; border: 1px solid #ccc; text-align: right; width: 10%;">Amount INR</th>
          </tr>
        </thead>
        <tbody>
          ${summaryRowsHtml || `
            <tr>
              <td colspan="4" style="padding: 10px; text-align: center; color: #666; font-style: italic;">No receivables recorded</td>
              <td colspan="4" style="padding: 10px; text-align: center; color: #666; font-style: italic; border-left: 2px solid #000;">No payables recorded</td>
            </tr>
          `}
        </tbody>
      </table>

      <!-- Bottom print footer -->
      <table style="width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 8.5px;">
        <tr>
          <td style="border: none; padding: 0; text-align: left; color: #666;">
            ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
          </td>
          <td style="border: none; padding: 0; text-align: right; color: #666;">
            Page 1 of 1
          </td>
        </tr>
      </table>

    </div>
  `;
};
