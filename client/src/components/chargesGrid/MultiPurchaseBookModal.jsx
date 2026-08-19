import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { formatDate } from '../../utils/dateUtils';
import './charges.css';

const MultiPurchaseBookModal = ({ isOpen, onClose, chargesData, jobNumber, jobDisplayNumber, jobYear, onSuccess }) => {
    const [loading, setLoading] = useState(false);
    const [apiKeys, setApiKeys] = useState([]);
    const [selectedKey, setSelectedKey] = useState(null);

    // Aggregated form data (supplier-level fields + totals)
    const [formData, setFormData] = useState({
        "Entry No": '',
        "Entry Date": new Date().toISOString().split('T')[0],
        "Supplier Inv No": '',
        "Supplier Inv Date": '',
        "Job No": '',
        "Supplier Name": '',
        "Address 1": '',
        "Address 2": '',
        "Address 3": '',
        "State": '',
        "Country": '',
        "Pin Code": '',
        "Registration Type": 'Regular',
        "GSTIN NO": '',
        "PAN": '',
        "CIN": '',
        "Place of Supply": '',
        "Credit Terms": '',
        "Description of Services": '',
        "SAC": '',
        "Taxable Value": '',
        "GST%": '',
        "CGST": '',
        "SGST": '',
        "IGST": '',
        "TDS": '',
        "Total": '',
        "Net Amount": '',
        "Status": '',
        "Charge Head Category": '',
        "TDS Category": '',
        "chargeRef": '',
        "jobRef": '',
        "apiKeyName": '',
        isClubJob: false,
        clubbedJobs: []
    });

    // Individual charge items for the summary table
    const [chargeItems, setChargeItems] = useState([]);

    useEffect(() => {
        const fetchApiKeys = async () => {
            try {
                const response = await axios.get(`${import.meta.env.VITE_API_STRING}/admin/api-keys`, { withCredentials: true });
                setApiKeys(response.data || []);
                if (response.data?.length > 0) {
                    const activeKey = response.data.find(k => k.isActive) || response.data[0];
                    setSelectedKey(activeKey);
                    setFormData(prev => ({ ...prev, apiKeyName: activeKey.name }));
                }
            } catch (error) {
                console.error("Error fetching API keys:", error);
            }
        };
        if (isOpen) fetchApiKeys();
    }, [isOpen]);

    useEffect(() => {
        const initialize = async () => {
            if (!isOpen || !chargesData || chargesData.length === 0) return;

            const firstCharge = chargesData[0];
            const party = firstCharge.partyDetails;
            const branchIndex = firstCharge.branchIndex || 0;
            const branch = (party?.branches?.[branchIndex] || party?.branchInfo?.[branchIndex] || {});
            const jobNum = firstCharge.jobDisplayNumber || jobDisplayNumber || jobNumber || '';

            // Build charge items array
            const items = chargesData.map(c => {
                const isReimb = c.chargeType === 'Reimbursement' || c.category === 'Reimbursement';
                const costAmt = Number(c.amount || 0);
                const costBasic = Number(c.basicAmount || c.amount || 0);
                const costGst = !isReimb ? Number(c.gstAmount || 0) : 0;
                const costCgst = !isReimb ? Number(c.cgst || 0) : 0;
                const costSgst = !isReimb ? Number(c.sgst || 0) : 0;
                const costIgst = !isReimb ? Number(c.igst || 0) : 0;
                const tdsVal = Number(c.tdsAmount || 0);
                const costTot = Number(c.amountINR || c.totalAmount || c.amount || 0);
                const netPay = Number(c.netPayable || 0);

                const revAmt = Number(c.revenueAmount || c.revenueTotal || 0);
                const revBasic = Number(c.revenueBasicAmount || c.revenueAmount || 0);
                const revGst = Number(c.revenueGstAmount || 0);
                const revCgst = Number(c.revenueCgst || 0);
                const revSgst = Number(c.revenueSgst || 0);
                const revIgst = Number(c.revenueIgst || 0);
                const revTot = Number(c.revenueTotal || c.revenueAmount || 0);

                return {
                    chargeHead: c.chargeHead || c.name || '',
                    chargeDescription: c.chargeHead || c.name || '',
                    chargeId: c.chargeId || '',
                    sac: c.cthNo || '',
                    chargeType: c.chargeType || c.category || '',
                    category: c.category || '',
                    taxableValue: isReimb
                        ? Number(c.totalAmount || c.amount || c.amountINR || c.netPayable || 0)
                        : costBasic,
                    basicAmount: costBasic,
                    costAmount: costAmt,
                    costBasicAmount: costBasic,
                    gstRate: !isReimb ? Number(c.gstRate || 0) : 0,
                    gstAmount: costGst,
                    costGstAmount: costGst,
                    cgst: costCgst,
                    sgst: costSgst,
                    igst: costIgst,
                    costCgst,
                    costSgst,
                    costIgst,
                    tdsAmount: tdsVal,
                    costTdsAmount: tdsVal,
                    total: costTot,
                    costTotal: costTot,
                    netPayable: netPay,
                    costNetPayable: netPay,

                    // Individual Revenue Details
                    revenueAmount: revAmt,
                    revenueBasicAmount: revBasic,
                    revenueGstAmount: revGst,
                    revenueGstRate: Number(c.revenueGstRate || 0),
                    revenueCgst: revCgst,
                    revenueSgst: revSgst,
                    revenueIgst: revIgst,
                    revenueTotal: revTot,

                    invoiceNumber: c.invoice_number || '',
                    invoiceDate: c.invoice_date || '',
                    currency: c.currency || c.costCurrency || 'INR',
                    currencyAmount: Number(c.currencyAmount || c.foreignCurrencyAmount || 0),
                    exchangeRate: Number(c.exchangeRate || c.exRate || 1)
                };
            });
            setChargeItems(items);

            // Aggregate totals
            let totalTaxable = 0, totalCGST = 0, totalSGST = 0, totalIGST = 0, totalTDS = 0, totalAmount = 0, totalNet = 0;
            let totalRevAmount = 0, totalRevBasic = 0, totalRevGST = 0, totalRevCGST = 0, totalRevSGST = 0, totalRevIGST = 0, totalRevTotal = 0;

            items.forEach(item => {
                totalTaxable += item.taxableValue;
                totalCGST += item.cgst;
                totalSGST += item.sgst;
                totalIGST += item.igst;
                totalTDS += item.tdsAmount;
                totalAmount += item.total;
                totalNet += item.netPayable;

                totalRevAmount += item.revenueAmount;
                totalRevBasic += item.revenueBasicAmount;
                totalRevGST += item.revenueGstAmount;
                totalRevCGST += item.revenueCgst;
                totalRevSGST += item.revenueSgst;
                totalRevIGST += item.revenueIgst;
                totalRevTotal += item.revenueTotal;
            });

            // Fetch next sequence
            let finalEntryNo = `PB/01/${jobNum}`;
            let updatedJobNum = jobNum;
            try {
                const API_KEY = selectedKey?.key;
                if (API_KEY) {
                    const response = await axios.get(
                        `${import.meta.env.VITE_API_STRING}/tally/next-sequence`,
                        {
                            params: { type: 'purchase', jobNo: jobNum, year: jobYear, jobId: firstCharge.jobId },
                            headers: { 'x-api-key': API_KEY },
                            withCredentials: true
                        }
                    );
                    if (response.data.success) {
                        if (response.data.fullNo) finalEntryNo = response.data.fullNo;
                        if (response.data.jobNo) updatedJobNum = response.data.jobNo;
                    }
                }
            } catch (error) {
                console.error("Error fetching sequence:", error);
            }

            // Common invoice number & date
            const invNumbers = [...new Set(items.map(i => i.invoiceNumber).filter(Boolean))];
            const commonInvNo = invNumbers[0] || '';
            const invDates = [...new Set(items.map(i => i.invoiceDate).filter(Boolean))];
            const firstInvDate = invDates[0] || '';

            // Description: list all charge heads
            const chargeHeadList = items.map(i => i.chargeHead).filter(Boolean).join(', ');
            const gstin = branch.gst || branch.gstNo || branch.GST || '';
            const isIntraState = gstin.trim().startsWith("24");

            setFormData(prev => ({
                ...prev,
                "Entry No": finalEntryNo,
                "Job No": updatedJobNum,
                "Supplier Inv No": commonInvNo,
                "Supplier Inv Date": formatDate(firstInvDate, 'yyyy-MM-dd') || '',
                "Supplier Name": firstCharge.partyName || '',
                "Address 1": branch.address || branch.addressLine || branch.Address || '',
                "Address 2": branch.city || branch.City || '',
                "Address 3": branch.state || branch.State || branch.city || '',
                "State": branch.state || branch.State || '',
                "Country": branch.country || branch.Country || 'India',
                "Pin Code": branch.pincode || branch.Pincode || branch.postalCode || '',
                "GSTIN NO": gstin,
                "PAN": branch.pan || branch.PAN || branch.panNo || party?.pan || party?.panNo || '',
                "CIN": party?.cin || party?.CIN || '',
                "Place of Supply": branch.state || branch.State || '',
                "Credit Terms": party?.credit_terms || party?.CreditTerms || '',
                "Description of Services": `COMBINED PB - ${chargeHeadList}`,
                "SAC": items[0]?.sac || '',
                "Taxable Value": totalTaxable.toFixed(2),
                "GST%": '',
                "CGST": isIntraState ? totalCGST.toFixed(2) : '',
                "SGST": isIntraState ? totalSGST.toFixed(2) : '',
                "IGST": !isIntraState ? totalIGST.toFixed(2) : '',
                "TDS": totalTDS > 0 ? String(Math.round(totalTDS)) : '',
                "Total": Math.round(totalAmount),
                "Net Amount": Math.round(totalNet),
                "Revenue Amount": totalRevAmount.toFixed(2),
                "Revenue Basic Amount": totalRevBasic.toFixed(2),
                "Revenue GST Amount": totalRevGST.toFixed(2),
                "Revenue CGST": totalRevCGST.toFixed(2),
                "Revenue SGST": totalRevSGST.toFixed(2),
                "Revenue IGST": totalRevIGST.toFixed(2),
                "Revenue Total": Math.round(totalRevTotal),
                revenueAmount: totalRevAmount,
                revenueBasicAmount: totalRevBasic,
                revenueGstAmount: totalRevGST,
                revenueCgst: totalRevCGST,
                revenueSgst: totalRevSGST,
                revenueIgst: totalRevIGST,
                revenueTotal: Math.round(totalRevTotal),
                "Charge Head Category": firstCharge.chargeType || '',
                "TDS Category": firstCharge.tdsCategory || '',
                "chargeRef": chargesData.map(c => c.chargeId).filter(Boolean).join(','),
                "jobRef": firstCharge.jobId || '',
                isClubJob: firstCharge.isClubJob || false,
                clubbedJobs: firstCharge.clubbedJobs || [],
                "Virtual Balance Terminal": firstCharge.virtualBalanceTerminal || '',
                "Currency": firstCharge.currency || firstCharge.costCurrency || 'INR',
                "Currency Amount": firstCharge.currencyAmount || firstCharge.foreignCurrencyAmount || (firstCharge.currency && firstCharge.currency !== 'INR' ? (firstCharge.basicAmount || firstCharge.amount || '') : ''),
                "Exchange Rate": firstCharge.exchangeRate || firstCharge.exRate || '',
                "ETA Date": formatDate(firstCharge.eta_date || firstCharge.etaDate, 'yyyy-MM-dd') || '',
                "Volume (CBM)": firstCharge.volume_cbm || firstCharge.volume || '',
                "IGM Number": firstCharge.igm_no || firstCharge.igmNo || '',
                "IGM Date": formatDate(firstCharge.igm_date || firstCharge.igmDate, 'yyyy-MM-dd') || ''
            }));
        };

        if (isOpen) initialize();
    }, [isOpen, chargesData, jobNumber, jobDisplayNumber, jobYear, selectedKey]);

    if (!isOpen) return null;

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => {
            const updated = { ...prev, [name]: value };

            if (name === "GSTIN NO" || name === "Taxable Value" || name === "TDS" || name === "Total") {
                const tds = parseFloat(updated["TDS"]) || 0;
                const totalVal = parseFloat(updated["Total"]) || 0;
                updated["Net Amount"] = Math.round(totalVal - tds);
            }
            return updated;
        });
    };

    const handleSubmit = async (e) => {
        if (e && e.preventDefault) e.preventDefault();
        setLoading(true);
        try {
            const API_KEY = selectedKey?.key || "TALLY_INTEGRATION_KEY";
            const { apiKeyName: _unused, ...tallyData } = formData;

            const updatedItems = chargeItems.map(item => ({
                ...item,
                invoiceNumber: tallyData["Supplier Inv No"] || item.invoiceNumber,
                invoiceDate: tallyData["Supplier Inv Date"] || item.invoiceDate
            }));

            const submissionData = {
                ...tallyData,
                "Entry Date": formatDate(tallyData["Entry Date"], 'dd-MM-yyyy'),
                "Supplier Inv Date": formatDate(tallyData["Supplier Inv Date"], 'dd-MM-yyyy'),
                isMultiCharge: true,
                chargeItems: updatedItems,
                chargeRefs: chargesData.map(c => c.chargeId).filter(Boolean)
            };

            const response = await axios.post(
                `${import.meta.env.VITE_API_STRING}/tally/purchase-entry`,
                submissionData,
                {
                    headers: { 'x-api-key': API_KEY },
                    withCredentials: true
                }
            );

            if (response.data.success) {
                alert("Combined Purchase Book Entry Submitted Successfully!");
                if (onSuccess) onSuccess(formData["Entry No"]);
                onClose();
            } else {
                alert("Failed to submit: " + response.data.message);
            }
        } catch (error) {
            console.error("Submission Error:", error);
            alert("Error submitting Combined Purchase Book. Please check the logs.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="charge-modal-overlay active" style={{ zIndex: 1100 }}>
            <div className="edit-charge-modal" style={{ width: '1100px', maxWidth: '95vw', maxHeight: '90vh', overflow: 'auto' }}>
                <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ background: '#e8f5e9', color: '#2e7d32', padding: '2px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 600 }}>COMBINED</span>
                    Purchase Book Entry — {chargeItems.length} Charges
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
                        {/* API Key Selector */}
                        {apiKeys.length > 0 && (
                            <div className="ep-row" style={{ marginBottom: '20px', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>
                                <span className="ep-label" style={{ fontWeight: 800, color: '#1a237e' }}>Integration Key</span>
                                <select
                                    name="apiKeyName"
                                    className="ep-select"
                                    style={{ width: '300px', fontWeight: 600 }}
                                    value={formData.apiKeyName}
                                    onChange={(e) => {
                                        const keyName = e.target.value;
                                        const keyObj = apiKeys.find(k => k.name === keyName);
                                        if (keyObj) {
                                            setSelectedKey(keyObj);
                                            setFormData(prev => ({ ...prev, apiKeyName: keyName }));
                                        }
                                    }}
                                >
                                    {apiKeys.map(k => (
                                        <option key={k._id} value={k.name}>{k.name} {k.isActive ? '' : '(Inactive)'}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {/* Charge Items Summary Table */}
                        <div style={{ marginBottom: '20px', border: '1px solid #e0e0e0', borderRadius: '8px', overflow: 'hidden' }}>
                            <div style={{ background: '#1a237e', color: '#fff', padding: '8px 16px', fontWeight: 700, fontSize: '13px' }}>
                                Selected Charges Summary
                            </div>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                                <thead>
                                    <tr style={{ background: '#f5f5f5' }}>
                                        <th style={{ padding: '8px 12px', textAlign: 'left', borderBottom: '1px solid #e0e0e0' }}>#</th>
                                        <th style={{ padding: '8px 12px', textAlign: 'left', borderBottom: '1px solid #e0e0e0' }}>Charge Head</th>
                                        <th style={{ padding: '8px 12px', textAlign: 'left', borderBottom: '1px solid #e0e0e0' }}>Type</th>
                                        <th style={{ padding: '8px 12px', textAlign: 'right', borderBottom: '1px solid #e0e0e0' }}>Cost Taxable</th>
                                        <th style={{ padding: '8px 12px', textAlign: 'right', borderBottom: '1px solid #e0e0e0' }}>Revenue Amt</th>
                                        <th style={{ padding: '8px 12px', textAlign: 'right', borderBottom: '1px solid #e0e0e0' }}>GST</th>
                                        <th style={{ padding: '8px 12px', textAlign: 'right', borderBottom: '1px solid #e0e0e0' }}>TDS</th>
                                        <th style={{ padding: '8px 12px', textAlign: 'right', borderBottom: '1px solid #e0e0e0' }}>Total</th>
                                        <th style={{ padding: '8px 12px', textAlign: 'right', borderBottom: '1px solid #e0e0e0' }}>Net Payable</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {chargeItems.map((item, idx) => (
                                        <tr key={idx} style={{ borderBottom: '1px solid #f0f0f0' }}>
                                            <td style={{ padding: '6px 12px' }}>{idx + 1}</td>
                                            <td style={{ padding: '6px 12px', fontWeight: 600 }}>{item.chargeHead}</td>
                                            <td style={{ padding: '6px 12px' }}>
                                                <span style={{
                                                    background: item.chargeType === 'Reimbursement' ? '#fff3e0' : '#e3f2fd',
                                                    color: item.chargeType === 'Reimbursement' ? '#e65100' : '#1565c0',
                                                    padding: '2px 8px', borderRadius: '10px', fontSize: '10px', fontWeight: 600
                                                }}>
                                                    {item.chargeType || item.category || '—'}
                                                </span>
                                            </td>
                                            <td style={{ padding: '6px 12px', textAlign: 'right' }}>₹{item.taxableValue.toFixed(2)}</td>
                                            <td style={{ padding: '6px 12px', textAlign: 'right', color: '#2e7d32', fontWeight: 600 }}>₹{item.revenueAmount.toFixed(2)}</td>
                                            <td style={{ padding: '6px 12px', textAlign: 'right' }}>₹{item.gstAmount.toFixed(2)}</td>
                                            <td style={{ padding: '6px 12px', textAlign: 'right' }}>₹{Math.round(item.tdsAmount)}</td>
                                            <td style={{ padding: '6px 12px', textAlign: 'right', fontWeight: 600 }}>₹{Math.round(item.total)}</td>
                                            <td style={{ padding: '6px 12px', textAlign: 'right', fontWeight: 600, color: '#d32f2f' }}>₹{Math.round(item.netPayable)}</td>
                                        </tr>
                                    ))}
                                    <tr style={{ background: '#f5f5f5', fontWeight: 700 }}>
                                        <td colSpan="3" style={{ padding: '8px 12px', textAlign: 'right' }}>TOTALS</td>
                                        <td style={{ padding: '8px 12px', textAlign: 'right' }}>₹{Number(formData["Taxable Value"] || 0).toFixed(2)}</td>
                                        <td style={{ padding: '8px 12px', textAlign: 'right', color: '#2e7d32' }}>₹{Number(formData["Revenue Amount"] || 0).toFixed(2)}</td>
                                        <td style={{ padding: '8px 12px', textAlign: 'right' }}>
                                            ₹{(Number(formData["CGST"] || 0) + Number(formData["SGST"] || 0) + Number(formData["IGST"] || 0)).toFixed(2)}
                                        </td>
                                        <td style={{ padding: '8px 12px', textAlign: 'right' }}>₹{formData["TDS"] || 0}</td>
                                        <td style={{ padding: '8px 12px', textAlign: 'right' }}>₹{formData["Total"]}</td>
                                        <td style={{ padding: '8px 12px', textAlign: 'right', color: '#d32f2f' }}>₹{formData["Net Amount"]}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        {/* Supplier & PB Details Form */}
                        <div className="ep-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px 20px', marginRight: '30px' }}>
                            <div className="ep-row">
                                <span className="ep-label">Entry No</span>
                                <input type="text" name="Entry No" className="ep-desc-input" value={formData["Entry No"]} onChange={handleInputChange} />
                            </div>
                            <div className="ep-row">
                                <span className="ep-label">Entry Date</span>
                                <input type="date" name="Entry Date" className="ep-desc-input" value={formData["Entry Date"]} onChange={handleInputChange} />
                            </div>
                            <div className="ep-row">
                                <span className="ep-label">Supplier Inv No</span>
                                <input type="text" name="Supplier Inv No" className="ep-desc-input" value={formData["Supplier Inv No"]} onChange={handleInputChange} />
                            </div>
                            <div className="ep-row">
                                <span className="ep-label">Supplier Inv Date</span>
                                <input type="date" name="Supplier Inv Date" className="ep-desc-input" value={formData["Supplier Inv Date"]} onChange={handleInputChange} />
                            </div>
                            <div className="ep-row">
                                <span className="ep-label">Job No</span>
                                <input type="text" name="Job No" className="ep-desc-input" value={formData["Job No"]} onChange={handleInputChange} />
                            </div>
                            <div className="ep-row">
                                <span className="ep-label">Supplier Name</span>
                                <input type="text" name="Supplier Name" className="ep-desc-input" value={formData["Supplier Name"]} readOnly style={{ background: '#f5f5f5' }} />
                            </div>
                            <div className="ep-row">
                                <span className="ep-label">Address 1</span>
                                <input type="text" name="Address 1" className="ep-desc-input" value={formData["Address 1"]} onChange={handleInputChange} />
                            </div>
                            <div className="ep-row">
                                <span className="ep-label">State</span>
                                <input type="text" name="State" className="ep-desc-input" value={formData["State"]} onChange={handleInputChange} />
                            </div>
                            <div className="ep-row">
                                <span className="ep-label">GSTIN NO</span>
                                <input type="text" name="GSTIN NO" className="ep-desc-input" value={formData["GSTIN NO"]} onChange={handleInputChange} />
                            </div>
                            <div className="ep-row">
                                <span className="ep-label">PAN</span>
                                <input type="text" name="PAN" className="ep-desc-input" value={formData["PAN"]} onChange={handleInputChange} />
                            </div>
                            <div className="ep-row">
                                <span className="ep-label">Description of Services</span>
                                <input type="text" name="Description of Services" className="ep-desc-input" value={formData["Description of Services"]} onChange={handleInputChange} />
                            </div>
                            <div className="ep-row">
                                <span className="ep-label">Registration Type</span>
                                <select name="Registration Type" className="ep-select" value={formData["Registration Type"]} onChange={handleInputChange}>
                                    <option value="Regular">Regular</option>
                                    <option value="Composite">Composite</option>
                                    <option value="Exempt">Exempt</option>
                                    <option value="Nil Rated">Nil Rated</option>
                                    <option value="SEZ">SEZ</option>
                                    <option value="Consumers">Consumers</option>
                                </select>
                            </div>
                            <div className="ep-row">
                                <span className="ep-label">Taxable Value</span>
                                <input type="number" name="Taxable Value" className="ep-desc-input" value={formData["Taxable Value"]} onChange={handleInputChange} />
                            </div>
                            <div className="ep-row">
                                <span className="ep-label">CGST</span>
                                <input type="number" name="CGST" className="ep-desc-input" value={formData["CGST"]} onChange={handleInputChange} />
                            </div>
                            <div className="ep-row">
                                <span className="ep-label">SGST</span>
                                <input type="number" name="SGST" className="ep-desc-input" value={formData["SGST"]} onChange={handleInputChange} />
                            </div>
                            <div className="ep-row">
                                <span className="ep-label">IGST</span>
                                <input type="number" name="IGST" className="ep-desc-input" value={formData["IGST"]} onChange={handleInputChange} />
                            </div>
                            <div className="ep-row">
                                <span className="ep-label">TDS</span>
                                <input type="number" name="TDS" className="ep-desc-input" value={formData["TDS"]} onChange={handleInputChange} />
                            </div>
                            <div className="ep-row">
                                <span className="ep-label">Total</span>
                                <input type="number" name="Total" className="ep-desc-input" value={formData["Total"]} onChange={handleInputChange} />
                            </div>
                            <div className="ep-row">
                                <span className="ep-label">Net Amount</span>
                                <input type="number" name="Net Amount" className="ep-desc-input" value={formData["Net Amount"]} onChange={handleInputChange} />
                            </div>
                        </div>
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn" onClick={handleSubmit} disabled={loading}
                            style={{ background: '#2e7d32', color: '#fff', border: 'none', padding: '8px 24px', borderRadius: '6px', fontWeight: 700, cursor: 'pointer' }}>
                            {loading ? "Submitting..." : `Submit Combined PB (${chargeItems.length} charges)`}
                        </button>
                        <button type="button" className="btn btn-secondary" onClick={onClose} style={{ marginRight: '30px' }}>Cancel</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default MultiPurchaseBookModal;
