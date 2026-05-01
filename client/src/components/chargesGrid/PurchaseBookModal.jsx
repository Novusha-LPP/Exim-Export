import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './charges.css';

const PurchaseBookModal = ({ isOpen, onClose, initialData, jobNumber, jobDisplayNumber, jobYear, onSuccess }) => {
    const [loading, setLoading] = useState(false);
    const isReimbursement = initialData ? (initialData.chargeType === 'Reimbursement' || initialData.category === 'Reimbursement') : false;
    const [apiKeys, setApiKeys] = useState([]);
    const [selectedKey, setSelectedKey] = useState(null);
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
        "GSTIN No": '',
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
        "Status": '',
        "Charge Head Category": '',
        "TDS Category": '',
        "chargeRef": '',
        "jobRef": '',
        "apiKeyName": ''
    });

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
        const fetchNextSequence = async () => {
            if (isOpen && initialData) {
                const party = initialData.partyDetails;
                const branchIndex = initialData.branchIndex || 0;
                const branch = party?.branches?.[branchIndex] || {};
                const jobNum = initialData.jobDisplayNumber || jobDisplayNumber || initialData.jobNumber || jobNumber || '';

                let finalEntryNo = `PB/01/${jobNum}`;
                let updatedJobNum = jobNum;
                try {
                    const API_KEY = selectedKey?.key;
                    if (!API_KEY) {
                        console.warn("No API key selected, skipping sequence fetch");
                    } else {
                        const response = await axios.get(
                            `${import.meta.env.VITE_API_STRING}/tally/next-sequence`,
                            {
                                params: {
                                    type: 'purchase',
                                    jobNo: jobNum,
                                    year: jobYear,
                                    jobId: initialData.jobId
                                },
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



                setFormData(prev => ({
                    ...prev,
                    "Entry No": finalEntryNo,
                    "Job No": updatedJobNum,
                    "Supplier Inv No": initialData.invoice_number || '',
                    "Supplier Inv Date": initialData.invoice_date || '',
                    "Supplier Name": initialData.partyName || '',
                    "Address 1": branch.address || branch.Address || '',
                    "Address 2": branch.city || branch.City || '',
                    "Address 3": branch.state || branch.State || branch.city || '',
                    "State": branch.state || branch.State || '',
                    "Country": branch.country || branch.Country || 'India',
                    "Pin Code": branch.pincode || branch.Pincode || branch.postal_code || '',
                    "GSTIN NO": branch.gst || branch.GST || '',
                    "PAN": branch.pan || branch.PAN || party?.pan || '',
                    "CIN": party?.cin || party?.CIN || '',
                    "Place of Supply": branch.state || branch.State || '',
                    "Credit Terms": party?.credit_terms || party?.CreditTerms || '',
                    "Description of Services": initialData.chargeHead || '',
                    "SAC": initialData.cthNo || '',
                    "Taxable Value": initialData.basicAmount ? Number(initialData.basicAmount).toFixed(2) : (initialData.amount ? Number(initialData.amount).toFixed(2) : ''),
                    "GST%": (initialData.gstAmount > 0) ? (initialData.gstRate || '18') : '',
                    "CGST": (branch.gst?.startsWith("24") || (branch.GST?.startsWith("24"))) ? Number(initialData.gstAmount / 2).toFixed(2) : '',
                    "SGST": (branch.gst?.startsWith("24") || (branch.GST?.startsWith("24"))) ? Number(initialData.gstAmount / 2).toFixed(2) : '',
                    "IGST": (branch.gst?.startsWith("24") || (branch.GST?.startsWith("24"))) ? '' : (initialData.gstAmount > 0 ? Number(initialData.gstAmount).toFixed(2) : ''),
                    "TDS": initialData.tdsAmount ? Number(initialData.tdsAmount).toFixed(2) : '',
                    "Total": initialData.netPayable ? Math.round(initialData.netPayable) : (initialData.totalAmount ? Math.round(initialData.totalAmount) : ''),
                    "Charge Head Category": initialData.chargeType || initialData.category || '',
                    "TDS Category": initialData.tdsCategory || '',
                    "chargeRef": initialData.chargeId || '',
                    "jobRef": initialData.jobId || ''
                }));
            }
        };

        if (isOpen) fetchNextSequence();
    }, [isOpen, initialData, jobNumber, jobDisplayNumber, jobYear, selectedKey]);

    if (!isOpen) return null;

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => {
            const updated = { ...prev, [name]: value };
            
            // IF GST NO STARTS WITH 24 AND ITS A MARGIN CHARGE (or any taxable charge)
            // WE WILL SHOW GST AS CGST AND SGST 18 PERCENT DEVIDE BY 2 EACH 9%
            // BUT IF IT IS EMPTY OR NOT STARTS WITH 24 THEN SHOW GST IN ONE FIELD ONLY WHICH IS IGST
            if (name === "GSTIN NO" || name === "Taxable Value" || name === "GST%" || name === "TDS") {
                const gstin = updated["GSTIN NO"] || "";
                const taxable = parseFloat(updated["Taxable Value"]) || 0;
                const gstRate = parseFloat(updated["GST%"]) || 0;
                const totalGst = Number((taxable * (gstRate / 100)).toFixed(2));
                const tds = parseFloat(updated["TDS"]) || 0;
                
                if (gstin.trim().startsWith("24")) {
                    updated["CGST"] = totalGst > 0 ? (totalGst / 2).toFixed(2) : "";
                    updated["SGST"] = totalGst > 0 ? (totalGst / 2).toFixed(2) : "";
                    updated["IGST"] = "";
                } else {
                    updated["CGST"] = "";
                    updated["SGST"] = "";
                    updated["IGST"] = totalGst > 0 ? totalGst.toFixed(2) : "";
                }
                updated["Total"] = Math.round(taxable + totalGst - tds);
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

            const response = await axios.post(
                `${import.meta.env.VITE_API_STRING}/tally/purchase-entry`,
                tallyData,
                {
                    headers: { 'x-api-key': API_KEY },
                    withCredentials: true
                }
            );

            if (response.data.success) {
                alert("Purchase Book Entry Submitted Successfully to Tally!");
                if (onSuccess) onSuccess(formData["Entry No"]);
                onClose();
            } else {
                alert("Failed to submit to Tally: " + response.data.message);
            }
        } catch (error) {
            console.error("Submission Error:", error);
            alert("Error submitting to Tally. Please check the logs.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="charge-modal-overlay active" style={{ zIndex: 1100 }}>
            <div className="edit-charge-modal" style={{ width: '1000px', maxWidth: '95vw' }}>
                <div className="modal-title">Purchase Book Entry</div>
                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
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
                                <input type="text" name="Supplier Name" className="ep-desc-input" value={formData["Supplier Name"]} onChange={handleInputChange} />
                            </div>
                            <div className="ep-row">
                                <span className="ep-label">Address 1</span>
                                <input type="text" name="Address 1" className="ep-desc-input" value={formData["Address 1"]} onChange={handleInputChange} />
                            </div>
                            <div className="ep-row">
                                <span className="ep-label">Address 2</span>
                                <input type="text" name="Address 2" className="ep-desc-input" value={formData["Address 2"]} onChange={handleInputChange} />
                            </div>
                            <div className="ep-row">
                                <span className="ep-label">Address 3</span>
                                <input type="text" name="Address 3" className="ep-desc-input" value={formData["Address 3"]} onChange={handleInputChange} />
                            </div>
                            <div className="ep-row">
                                <span className="ep-label">State</span>
                                <input type="text" name="State" className="ep-desc-input" value={formData["State"]} onChange={handleInputChange} />
                            </div>
                            <div className="ep-row">
                                <span className="ep-label">Country</span>
                                <input type="text" name="Country" className="ep-desc-input" value={formData["Country"]} onChange={handleInputChange} />
                            </div>
                            <div className="ep-row">
                                <span className="ep-label">Pin code</span>
                                <input type="text" name="Pin Code" className="ep-desc-input" value={formData["Pin Code"]} onChange={handleInputChange} />
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
                                <span className="ep-label">GSTIN No</span>
                                <input type="text" name="GSTIN No" className="ep-desc-input" value={formData["GSTIN No"]} onChange={handleInputChange} />
                            </div>
                            <div className="ep-row">
                                <span className="ep-label">PAN</span>
                                <input type="text" name="PAN" className="ep-desc-input" value={formData["PAN"]} onChange={handleInputChange} />
                            </div>
                            <div className="ep-row">
                                <span className="ep-label">CIN</span>
                                <input type="text" name="CIN" className="ep-desc-input" value={formData["CIN"]} onChange={handleInputChange} />
                            </div>
                            <div className="ep-row">
                                <span className="ep-label">Place of Supply</span>
                                <input type="text" name="Place of Supply" className="ep-desc-input" value={formData["Place of Supply"]} onChange={handleInputChange} />
                            </div>
                            <div className="ep-row">
                                <span className="ep-label">Credit Terms</span>
                                <input type="text" name="Credit Terms" className="ep-desc-input" value={formData["Credit Terms"]} onChange={handleInputChange} />
                            </div>
                            <div className="ep-row">
                                <span className="ep-label">Description of Services</span>
                                <input type="text" name="Description of Services" className="ep-desc-input" value={formData["Description of Services"]} onChange={handleInputChange} />
                            </div>
                            <div className="ep-row">
                                <span className="ep-label">SAC</span>
                                <input type="text" name="SAC" className="ep-desc-input" value={formData["SAC"]} onChange={handleInputChange} />
                            </div>
                            <div className="ep-row">
                                <span className="ep-label">Taxable Value</span>
                                <input type="number" name="Taxable Value" className="ep-desc-input" value={formData["Taxable Value"]} onChange={handleInputChange} />
                            </div>
                            {!isReimbursement && (
                                <>
                                    <div className="ep-row">
                                        <span className="ep-label">GST%</span>
                                        <input type="number" name="GST%" className="ep-desc-input" value={formData["GST%"]} onChange={handleInputChange} />
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
                                </>
                            )}
                            <div className="ep-row">
                                <span className="ep-label">TDS</span>
                                <input type="number" name="TDS" className="ep-desc-input" value={formData["TDS"]} onChange={handleInputChange} />
                            </div>
                            <div className="ep-row">
                                <span className="ep-label">Total</span>
                                <input type="number" name="Total" className="ep-desc-input" value={formData["Total"]} onChange={handleInputChange} />
                            </div>
                            <div className="ep-row">
                                <span className="ep-label">Status</span>
                                <input type="text" name="Status" className="ep-desc-input" value={formData["Status"]} onChange={handleInputChange} />
                            </div>
                        </div>
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn" onClick={handleSubmit} disabled={loading}>
                            {loading ? "Submitting..." : "Submit Purchase Entry"}
                        </button>
                        <button type="button" className="btn btn-secondary" onClick={onClose} style={{ marginRight: '30px' }}>Cancel</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default PurchaseBookModal;
