import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './charges.css';

const PurchaseBookModal = ({ isOpen, onClose, initialData, jobNumber, jobYear, onSuccess }) => {
    const [loading, setLoading] = useState(false);
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
        "chargeRef": '',
        "jobRef": '',
        "apiKeyName": '' // To track which key name is selected
    });

    useEffect(() => {
        const fetchApiKeys = async () => {
            try {
                const response = await axios.get(`${import.meta.env.VITE_API_STRING}/admin/api-keys`, { withCredentials: true });
                setApiKeys(response.data || []);
                // Default to the first active key if available
                if (response.data?.length > 0) {
                    const activeKey = response.data.find(k => k.isActive);
                    if (activeKey) {
                        setSelectedKey(activeKey);
                        setFormData(prev => ({ ...prev, apiKeyName: activeKey.name }));
                    }
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

                const jobNum = initialData.jobDisplayNumber || initialData.jobNumber || jobNumber || '';

                // Fetch next sequence from backend using canonical job reference
                let finalEntryNo = `PB/01/${jobNum}`;
                try {
                    const API_KEY = selectedKey?.key || "TALLY_INTEGRATION_KEY";
                    const yearParam = jobYear ? `&year=${jobYear}` : '';
                    const response = await axios.get(
                        `${import.meta.env.VITE_API_STRING}/tally/next-sequence?type=purchase&jobNo=${jobNum}${yearParam}`,
                        { headers: { 'x-api-key': API_KEY } }
                    );
                    if (response.data.success && response.data.fullNo) {
                        finalEntryNo = response.data.fullNo;
                    }
                } catch (error) {
                    console.error("Error fetching sequence:", error);
                }

                setFormData(prev => ({
                    ...prev,
                    "Entry No": finalEntryNo,
                    "Job No": jobNum,
                    "Supplier Inv No": initialData.invoice_number || '',
                    "Supplier Inv Date": initialData.invoice_date || '',
                    "Supplier Name": initialData.partyName || '',
                    "Address 1": branch.address || '',
                    "Address 2": branch.city || '',
                    "Address 3": branch.state || branch.city || '',
                    "State": branch.state || '',
                    "Country": branch.country || '',
                    "Pin Code": branch.pincode || branch.postal_code || '',
                    "GSTIN No": branch.gst || '',
                    "PAN": branch.pan || '',
                    "CIN": party?.cin || '',
                    "Credit Terms": party?.credit_terms || '',
                    "Taxable Value": initialData.basicAmount ? initialData.basicAmount.toFixed(2) : (initialData.amount ? initialData.amount.toFixed(2) : ''),
                    "GST%": initialData.gstRate || '',
                    "CGST": (initialData.cgst > 0) ? initialData.cgst.toFixed(2) : '',
                    "SGST": (initialData.sgst > 0) ? initialData.sgst.toFixed(2) : '',
                    "IGST": (initialData.igst > 0) ? initialData.igst.toFixed(2) : '',
                    "TDS": initialData.tdsAmount ? initialData.tdsAmount.toFixed(2) : '',
                    "Total": initialData.netPayable ? initialData.netPayable.toFixed(2) : '',
                    "Description of Services": initialData.chargeHead || '',
                    "SAC": initialData.cthNo || '',
                    "Status": '',
                    "chargeRef": initialData.chargeId || '',
                    "jobRef": initialData.jobId || ''
                }));
            }
        };

        fetchNextSequence();
    }, [isOpen, initialData, jobNumber, selectedKey]);

    if (!isOpen) return null;

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        if (e && e.preventDefault) e.preventDefault();
        setLoading(true);
        try {
            const API_KEY = selectedKey?.key || "TALLY_INTEGRATION_KEY";

            // Prepare clean data for Tally (removing internal fields)
            const { apiKeyName, ...tallyData } = formData;

            // Fixed URL: import.meta.env.VITE_API_STRING already contains '/api'
            const response = await axios.post(
                `${import.meta.env.VITE_API_STRING}/tally/purchase-entry`,
                tallyData,
                {
                    headers: { 'x-api-key': API_KEY }
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
        <div className="modal-overlay active" style={{ zIndex: 1100 }}>
            <div className="edit-charge-modal" style={{ width: '1000px', maxWidth: '95vw' }}>
                <div className="modal-title">Purchase Book Entry</div>
                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
                        {/* API Key Selection (Admin Only in UI) */}
                        <div className="ep-row" style={{ marginBottom: '20px', borderBottom: '1px solid #eee', pb: '10px' }}>
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
                        <button type="button" className="btn" onClick={onClose} style={{ marginRight: '30px' }}>Cancel</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default PurchaseBookModal;
