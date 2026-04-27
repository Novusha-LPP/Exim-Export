import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './charges.css';

const RequestPaymentModal = ({ isOpen, onClose, initialData, jobNumber, jobYear, onSuccess }) => {
    const [loading, setLoading] = useState(false);
    const [apiKeys, setApiKeys] = useState([]);
    const [selectedKey, setSelectedKey] = useState(null);
    const [formData, setFormData] = useState({
        "Request No": '',
        "Request Date": new Date().toISOString().split('T')[0],
        "Bank From": '',
        "Payment To": '',
        "Against Bill": '',
        "Amount": '',
        "Transaction Type": 'NEFT',
        "Account No": '',
        "IFSC Code": '',
        "Bank Name": '',
        "Instrument No": '',
        "Instrument Date": '',
        "Transfer Mode": 'Online',
        "Beneficiary Code": '',
        "Status": '',
        "jobNo": '',
        "chargeRef": '',
        "jobRef": '',
        "apiKeyName": '',
        "Gross Amount": '',
        "TDS Amount": '',
        "TDS Category": 'U/S N/A 0.00 %'
    });

    useEffect(() => {
        const fetchApiKeys = async () => {
            try {
                const response = await axios.get(`${import.meta.env.VITE_API_STRING}/admin/api-keys`, { withCredentials: true });
                setApiKeys(response.data || []);
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
                // Generate request number using canonical job reference (e.g. IMP/24-25/0001)
                const jobRefStr = initialData.jobDisplayNumber || initialData.jobNumber || jobNumber || '';

                // Fetch next sequence from backend using canonical job identifier
                let finalRequestNo = `R1/01/${jobRefStr}`;
                try {
                    const API_KEY = selectedKey?.key || "TALLY_INTEGRATION_KEY";
                    const yearParam = jobYear ? `&year=${jobYear}` : '';
                    const response = await axios.get(
                        `${import.meta.env.VITE_API_STRING}/tally/next-sequence?type=payment&jobNo=${jobRefStr}${yearParam}`,
                        { headers: { 'x-api-key': API_KEY } }
                    );
                    if (response.data.success && response.data.fullNo) {
                        finalRequestNo = response.data.fullNo;
                    }
                } catch (error) {
                    console.error("Error fetching sequence:", error);
                }

                const party = initialData.partyDetails;
                const branchIndex = initialData.branchIndex || 0;
                const branch = party?.branches?.[branchIndex];
                const account = branch?.accounts?.[0] || {};

                setFormData(prev => ({
                    ...prev,
                    "Request No": finalRequestNo,
                    "Payment To": initialData.partyName || '',
                    "Amount": initialData.netPayable || '',
                    "Against Bill": initialData.chargeHead || '',
                    "Account No": account.accountNo || '',
                    "Bank Name": account.bankName || '',
                    "IFSC Code": account.ifsc || '',
                    "Status": '',
                    "jobNo": jobRefStr,
                    "chargeRef": initialData.chargeId || '',
                    "jobRef": initialData.jobId || '',
                    "Gross Amount": initialData.basicAmount || initialData.amount || '',
                    "TDS Amount": initialData.tdsAmount || 0,
                    "TDS Category": initialData.tdsCategory || 'U/S N/A 0.00 %'
                }));
            }
        };

        fetchNextSequence();
    }, [isOpen, initialData, jobNumber, jobYear, selectedKey]);

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
                `${import.meta.env.VITE_API_STRING}/tally/payment-request`,
                tallyData,
                {
                    headers: { 'x-api-key': API_KEY }
                }
            );

            if (response.data.success) {
                alert("Payment Request Submitted Successfully to Tally!");
                if (onSuccess) onSuccess(formData["Request No"]);
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
            <div className="edit-charge-modal" style={{ width: '800px' }}>
                <div className="modal-title">Request Payment</div>
                <form>
                    <div className="modal-body">
                        {/* API Key Selection (Admin Only in UI) */}
                        <div className="ep-row" style={{ marginBottom: '20px', borderBottom: '1px solid #eee', pb: '10px' }}>
                            <span className="ep-label" style={{ fontWeight: 800, color: '#d32f2f' }}>Integration Key</span>
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
                        <div className="ep-grid" style={{ gridTemplateColumns: '1fr 1fr 30px', gap: '10px 20px', marginRight: '10px' }}>
                            <div className="ep-row">
                                <span className="ep-label">Request No</span>
                                <input type="text" name="Request No" className="ep-desc-input" value={formData["Request No"]} onChange={handleInputChange} />
                            </div>
                            <div className="ep-row">
                                <span className="ep-label">Request Date</span>
                                <input type="date" name="Request Date" className="ep-desc-input" value={formData["Request Date"]} onChange={handleInputChange} />
                            </div>
                            <div /> {/* Spacer */}
                            <div className="ep-row">
                                <span className="ep-label">Bank From</span>
                                <select name="Bank From" className="ep-select" value={formData["Bank From"]} onChange={handleInputChange}>
                                    <option value="">Select Bank</option>
                                    <option value="HDFC">HDFC Bank</option>
                                    <option value="ICICI">ICICI Bank</option>
                                    <option value="SBI">SBI Bank</option>
                                </select>
                            </div>
                            <div className="ep-row">
                                <span className="ep-label">Payment to</span>
                                <input type="text" name="Payment To" className="ep-desc-input" value={formData["Payment To"]} onChange={handleInputChange} />
                            </div>
                            <div /> {/* Spacer */}
                            <div className="ep-row">
                                <span className="ep-label">Against Bill</span>
                                <input type="text" name="Against Bill" className="ep-desc-input" value={formData["Against Bill"]} onChange={handleInputChange} />
                            </div>
                            <div className="ep-row">
                                <span className="ep-label">Amount</span>
                                <input type="number" name="Amount" className="ep-desc-input" value={formData["Amount"]} onChange={handleInputChange} />
                            </div>
                            <div /> {/* Spacer */}
                            <div className="ep-row">
                                <span className="ep-label">Transfer Mode</span>
                                <select name="Transfer Mode" className="ep-select" value={formData["Transfer Mode"]} onChange={handleInputChange}>
                                    <option value="Online">Online</option>
                                    <option value="Offline">Offline</option>
                                </select>
                            </div>
                            <div className="ep-row">
                                <span className="ep-label">A/c No</span>
                                <input type="text" name="Account No" className="ep-desc-input" value={formData["Account No"]} onChange={handleInputChange} />
                            </div>
                            <div /> {/* Spacer */}
                            <div className="ep-row">
                                <span className="ep-label">IFS Code</span>
                                <input type="text" name="IFSC Code" className="ep-desc-input" value={formData["IFSC Code"]} onChange={handleInputChange} />
                            </div>
                            <div className="ep-row">
                                <span className="ep-label">Bank Name</span>
                                <input type="text" name="Bank Name" className="ep-desc-input" value={formData["Bank Name"]} onChange={handleInputChange} />
                            </div>
                            <div /> {/* Spacer */}
                            <div className="ep-row">
                                <span className="ep-label">Transaction Type</span>
                                <select name="Transaction Type" className="ep-select" value={formData["Transaction Type"]} onChange={handleInputChange}>
                                    <option value="NEFT">NEFT</option>
                                    <option value="RTGS">RTGS</option>
                                    <option value="IMPS">IMPS</option>
                                    <option value="CHEQUE">CHEQUE</option>
                                    <option value="CASH">CASH</option>
                                </select>
                            </div>
                            <div className="ep-row">
                                <span className="ep-label">Beneficiary Code</span>
                                <input type="text" name="Beneficiary Code" className="ep-desc-input" value={formData["Beneficiary Code"]} onChange={handleInputChange} />
                            </div>
                            <div /> {/* Spacer */}
                            {formData["Transaction Type"] === 'CHEQUE' && (
                                <>
                                    <div className="ep-row">
                                        <span className="ep-label">Instrument No</span>
                                        <input type="text" name="Instrument No" className="ep-desc-input" value={formData["Instrument No"]} onChange={handleInputChange} />
                                    </div>
                                    <div className="ep-row">
                                        <span className="ep-label">Instrument Date</span>
                                        <input type="date" name="Instrument Date" className="ep-desc-input" value={formData["Instrument Date"]} onChange={handleInputChange} />
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn" onClick={handleSubmit} disabled={loading}>
                            {loading ? "Submitting..." : "Submit Request"}
                        </button>
                        <button type="button" className="btn btn-secondary" onClick={onClose} style={{ marginRight: '30px' }}>Cancel</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default RequestPaymentModal;
