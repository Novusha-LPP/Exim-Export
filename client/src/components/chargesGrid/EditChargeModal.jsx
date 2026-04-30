import React, { useState, useEffect, useRef, memo } from 'react';
import { createPortal } from 'react-dom';
import FileUploadModal from './FileUploadModal';
import RequestPaymentModal from './RequestPaymentModal';
import PurchaseBookModal from './PurchaseBookModal';
import { Chip } from '@mui/material';
import DescriptionIcon from '@mui/icons-material/Description';
import axios from 'axios';
import './charges.css';
import { generatePurchaseBookPDF } from '../../utils/purchaseBookPrint';
import logo from '../../assets/images/logo.jpg';
import PrintIcon from '@mui/icons-material/Print';
import { IconButton } from '@mui/material';
import { currencyList } from '../../utils/masterList';
const EditChargeModal = ({ 
  isOpen, 
  onClose, 
  selectedCharges, 
  onSave, 
  updateCharge,
  parentId,
  shippingLineAirline, 
  exporterName,
  jobNumber = '',
  jobDisplayNumber = '',
  jobYear = '',
  jobInvoiceNumber = '',
  jobInvoiceDate = '',
  jobInvoiceValue = '',
  jobCthNo = '',
  workMode = 'Payment'
}) => {
  const [formData, setFormData] = useState([]);
  const [panelOpen, setPanelOpen] = useState({}); // { rowIndex: 'rev' | 'cost' | null }
  const [uploadIndex, setUploadIndex] = useState(null); // index of charge being uploaded for
  const [uploadSection, setUploadSection] = useState(null); // 'revenue' | 'cost'
  const [paymentRequestData, setPaymentRequestData] = useState(null);
  const [purchaseBookData, setPurchaseBookData] = useState(null);
  const [shippingLines, setShippingLines] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [cfsList, setCfsList] = useState([]);
  const [transporters, setTransporters] = useState([]);
  const [activeDropdown, setActiveDropdown] = useState({ index: null, section: null }); // Track which row/section has open dropdown
  const [paymentDetailsAudit, setPaymentDetailsAudit] = useState({});
  const [rateMap, setRateMap] = useState({});
  const dropdownRef = useRef(null);
  const modalRef = useRef(null);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => { document.body.style.overflow = 'auto'; };
  }, [isOpen]);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setActiveDropdown({ index: null, section: null });
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const fetchMasterData = async () => {
      try {
        const [slRes, supRes, orgRes, cfsRes, transRes] = await Promise.all([
          axios.get(`${import.meta.env.VITE_API_STRING}/get-shipping-lines`),
          axios.get(`${import.meta.env.VITE_API_STRING}/get-suppliers`),
          axios.get(`${import.meta.env.VITE_API_STRING}/organization`),
          axios.get(`${import.meta.env.VITE_API_STRING}/get-cfs-list`),
          axios.get(`${import.meta.env.VITE_API_STRING}/get-transporters`)
        ]);
        setShippingLines(slRes.data);
        setSuppliers(supRes.data);
        setOrganizations(orgRes.data.organizations || []);
        setCfsList(cfsRes.data);
        setTransporters(transRes.data);
      } catch (error) {
        console.error("Error fetching master data:", error);
      }
    };
    if (isOpen) fetchMasterData();
  }, [isOpen]);

  // Fetch Payment Request Audit Info on demand
  useEffect(() => {
    const fetchAudits = async () => {
      const prNos = [...new Set(formData.map(r => r.payment_request_no).filter(Boolean))];
      const pbNos = [...new Set(formData.map(r => r.purchase_book_no).filter(Boolean))];
      const allNos = [...new Set([...prNos, ...pbNos])];
      const newAudits = { ...paymentDetailsAudit };
      let changed = false;

      for (const pr of allNos) {
        if (!newAudits[pr]) {
          try {
            const res = await axios.get(`${import.meta.env.VITE_API_STRING}/get-payment-request-details/${encodeURIComponent(pr)}`);
            if (res.data) {
              newAudits[pr] = res.data;
              changed = true;
            }
          } catch (err) {
            console.error("Error fetching PR audit for", pr, err);
          }
        }
      }

      if (changed) {
        setPaymentDetailsAudit(newAudits);
      }
    };

    if (isOpen && formData.length > 0) {
      fetchAudits();
    }
  }, [isOpen, formData]);

  useEffect(() => {
    if (isOpen) {
      const initialData = JSON.parse(JSON.stringify(selectedCharges)).map(charge => ({
        ...charge,
        invoice_number: charge.invoice_number || '',
        invoice_date: charge.invoice_date || '',
        payment_request_no: charge.payment_request_no || '',
        payment_request_status: charge.payment_request_status || '',
        revenue: {
          ...(charge.revenue || {}),
          isGst: (charge.revenue && charge.revenue.isGst !== undefined) ? charge.revenue.isGst : true
        },
        cost: {
          ...(charge.cost || {}),
          isGst: (charge.cost && charge.cost.isGst !== undefined) ? charge.cost.isGst : true
        }
      }));
      setFormData(initialData);
      setPanelOpen(selectedCharges.reduce((acc, _, i) => ({ ...acc, [i]: 'cost' }), {}));
      setUploadIndex(null);
    }
  }, [isOpen, selectedCharges]);

  // Fetch currency rates based on invoiceDate or current date
  useEffect(() => {
    const fetchRates = async () => {
      try {
        const getJobDateFormatted = (dateStr) => {
          if (!dateStr) return "";
          const parts = dateStr.split("-");
          if (parts.length === 3 && parts[0].length === 4) {
            return `${parts[2]}-${parts[1]}-${parts[0]}`;
          }
          return dateStr;
        };
        // Use jobInvoiceDate if available, else current date
        const dateStr = getJobDateFormatted(jobInvoiceDate || new Date().toISOString().split('T')[0]);
        if (!dateStr) return;
        
        const res = await axios.get(`${import.meta.env.VITE_API_STRING}/currency-rates/by-date/${dateStr}`);
        const json = res.data;
        if (json?.success && json?.data) {
          const map = {};
          (json.data.exchange_rates || []).forEach((r) => {
            if (r.currency_code && typeof r.export_rate === "number") {
              map[r.currency_code.toUpperCase()] = r.export_rate;
            }
          });
          setRateMap(map);
        }
      } catch (err) {
        console.error("Failed to fetch rates", err);
      }
    };
    if (isOpen) fetchRates();
  }, [isOpen, jobInvoiceDate]);

  if (!isOpen) return null;

  const extractFileName = (url) => {
    try {
        if (!url) return "File";
        const parts = url.split("/");
        return decodeURIComponent(parts[parts.length - 1]);
    } catch (error) {
        return "File";
    }
  };

  const handleFieldChange = (index, field, value, section = null) => {
    const updated = [...formData];
    if (section) {
      updated[index][section] = updated[index][section] || {};
      updated[index][section][field] = value;
      
      // Synchronize 'url' (attachments) between revenue and cost
      if (field === 'url') {
        const otherSection = section === 'revenue' ? 'cost' : 'revenue';
        updated[index][otherSection] = updated[index][otherSection] || {};
        updated[index][otherSection][field] = value;
      }
      
      if (field === 'currency') {
        const newCurrency = value?.toUpperCase();
        if (newCurrency && newCurrency !== 'INR' && rateMap[newCurrency]) {
          updated[index][section].exchangeRate = rateMap[newCurrency];
        } else if (newCurrency === 'INR') {
          updated[index][section].exchangeRate = 1;
        }
      }

      // Auto-populate TDS if selecting a shipping line or CFS or transporter
      if (section === 'cost' && field === 'partyName') {
        const allParties = [...shippingLines, ...cfsList, ...transporters];
        const matchedSL = allParties.find(sl => sl.name?.toUpperCase() === value?.toUpperCase());
        if (matchedSL && matchedSL.tds_percent > 0) {
          updated[index][section].isTds = true;
          updated[index][section].tdsPercent = matchedSL.tds_percent;
        }
      }

      // Auto-populate Payable To if type is 'Others' in Cost section
      if (section === 'cost' && field === 'partyType' && value === 'Others' && shippingLineAirline) {
        updated[index][section].partyName = shippingLineAirline;
      }

      // Auto-populate Payable To if type is 'Exporter' in Cost section
      if (section === 'cost' && field === 'partyType' && (value === 'Exporter' || value === 'EXPORTER') && exporterName) {
        updated[index][section].partyName = exporterName;
      }
      
      // Open dropdown when typing party name
      if (field === 'partyName') {
        setActiveDropdown({ index, section });
      } else if (field === 'partyType') {
        // Clear party selected when type changes
        updated[index][section].partyName = '';
        updated[index][section].isTds = false;
        updated[index][section].tdsPercent = 0;
        setActiveDropdown({ index: null, section: null });
      }
    } else {
      updated[index][field] = value;
    }

    // Calculation Logic
    const sectionsToCalc = section ? [section] : ['revenue', 'cost'];
    
    sectionsToCalc.forEach(sec => {
      const fieldsToTriggerRecalc = ['qty', 'rate', 'isGst', 'gstRate', 'isTds', 'tdsPercent', 'exchangeRate', 'partyName', 'chargeType'];
      if (fieldsToTriggerRecalc.includes(field) || field === 'chargeType') {
        const sectionRef = updated[index][sec];
        if (!sectionRef) return;
        
        const qty = parseFloat(sectionRef.qty) || 0;
        const rate = parseFloat(sectionRef.rate) || 0;
        const exRate = parseFloat(sectionRef.exchangeRate) || 1;
        const gstRate = parseFloat(sectionRef.gstRate) || 18;
        const chargeType = updated[index].chargeType || 'Margin';
        const isGst = sectionRef.isGst !== false;

        let basic = 0;
        let gstAmount = 0;
        let totalAmount = 0;
        let foreignAmount = 0;

        const inrRate = Number((rate * exRate).toFixed(2));

        if (chargeType === 'Reimbursement') {
          // REIMBURSEMENT: Back-calculation (Rate is Total Inclusive)
          foreignAmount = Number((qty * rate).toFixed(2));
          totalAmount = Number((qty * inrRate).toFixed(2));
          if (isGst) {
            basic = Number((totalAmount / (1 + (gstRate / 100))).toFixed(2));
            gstAmount = Number((totalAmount - basic).toFixed(2));
          } else {
            basic = totalAmount;
            gstAmount = 0;
          }
        } else {
          // MARGIN: Normal calculation (Rate is Basic Exclusive)
          foreignAmount = Number((qty * rate).toFixed(2));
          basic = Number((qty * inrRate).toFixed(2));
          if (isGst) {
            gstAmount = Number((basic * (gstRate / 100)).toFixed(2));
          } else {
            gstAmount = 0;
          }
          totalAmount = Number((basic + gstAmount).toFixed(2));
        }

        sectionRef.basicAmount = basic;
        sectionRef.gstAmount = gstAmount;
        sectionRef.amount = foreignAmount;
        sectionRef.amountINR = totalAmount;

        // GST Split Logic
        const partyName = sectionRef.partyName;
        const party = [...shippingLines, ...suppliers, ...cfsList, ...transporters].find(p => p.name?.toUpperCase() === partyName?.toUpperCase());
        const branchIndex = sectionRef.branchIndex || 0;
        const gstin = party?.branches?.[branchIndex]?.gst || "";
        
        if (gstin && gstin.startsWith("24")) {
          sectionRef.cgst = Number((gstAmount / 2).toFixed(2));
          sectionRef.sgst = Number((gstAmount / 2).toFixed(2));
          sectionRef.igst = 0;
        } else {
          sectionRef.cgst = 0;
          sectionRef.sgst = 0;
          sectionRef.igst = gstAmount;
        }

        // TDS Calculation (Always on Basic)
        const isTds = sectionRef.isTds || false;
        const tdsPercent = parseFloat(sectionRef.tdsPercent) || 0;
        if (isTds) {
          sectionRef.tdsAmount = Number((basic * (tdsPercent / 100)).toFixed(2));
        } else {
          sectionRef.tdsAmount = 0;
        }

        // Net Payable: Total Amount - TDS (Maintain precision as per design)
        const tentativeNet = totalAmount - sectionRef.tdsAmount;
        sectionRef.netPayable = Number(tentativeNet.toFixed(2));
      }
    });
    
    setFormData(updated);
  };

  const handleSelectParty = (index, section, item) => {
    handleFieldChange(index, 'partyName', item.name, section);
    // Initialize branch index and trigger recalc
    const updated = [...formData];
    updated[index][section].branchIndex = 0;
    setFormData(updated);
    // Explicitly trigger recalc for branch change
    handleFieldChange(index, 'branchIndex', 0, section);
    setActiveDropdown({ index: null, section: null });
  };

  const syncSection = (index, fromSec, toSec) => {
    const updated = [...formData];
    const source = updated[index][fromSec];
    if (!source) return;
    
    updated[index][toSec] = {
      ...updated[index][toSec],
      basis: source.basis,
      qty: source.qty,
      rate: source.rate,
      exchangeRate: source.exchangeRate,
      currency: source.currency,
      isGst: source.isGst || false,
      gstRate: source.gstRate
    };
    setFormData(updated);
    // Trigger recalc for the target section to ensure basicAmount, amountINR, etc. are updated
    handleFieldChange(index, 'qty', source.qty, toSec);
  };

  const handleSave = (shouldClose = true) => {
    onSave(formData, shouldClose);
  };

  const togglePanel = (idx, panel) => {
    setPanelOpen(prev => ({
      ...prev,
      [idx]: prev[idx] === panel ? null : panel
    }));
  };

  const formatNumber = (num) => {
    if (num === null || num === undefined) return '0.00';
    return Number(num).toFixed(2);
  };

  return createPortal(
    <div className="charge-modal-overlay active" onMouseDown={() => setActiveDropdown({ index: null, section: null })}>
      <div className="edit-charge-modal" ref={modalRef} onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-title">Edit Charge</div>
        <div className="modal-body">
          {formData.map((row, i) => (
            <div key={row._id || i} style={{ marginBottom: formData.length > 1 ? '30px' : '0' }}>
              <div className="form-section-new">
                <div className="form-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginRight: '30px', gap: '10px 20px' }}>
                   <div className="form-row" style={{ gridColumn: 'span 2', alignItems: 'center' }}>
                    <span className="form-label" style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                        CHARGE 
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <span style={{ fontSize: '10px', color: '#1565c0', fontWeight: 'bold', border: '1px solid currentColor', padding: '0 2px', borderRadius: '2px' }}>PB</span>
                            {row.isPbMandatory && <span style={{ fontSize: '8px', color: '#d32f2f', fontWeight: 'bold' }}>MANDATORY</span>}
                        </div>
                    </span>
                    <div className="form-input-search">
                      <input type="text" readOnly className="form-input" style={{ background: '#f5f8fc', color: '#1a3a5c', fontWeight: 'bold' }} value={row.chargeHead || ''} />
                      <button type="button" className="search-btn">🔍</button>
                    </div>
                  </div>
                  <div className="form-row" style={{ gridColumn: 'span 1' }}>
                    <span className="form-label">CATEGORY</span>
                    <select className="form-input" value={row.chargeType || 'Margin'} onChange={e => handleFieldChange(i, 'chargeType', e.target.value)}>
                      <option value="Margin">Margin</option>
                      <option value="Reimbursement">Reimbursement</option>
                    </select>
                  </div>
                  <div className="form-row" style={{ gridColumn: 'span 1' }}>
                    <span className="form-label">SAC / HSN</span>
                    <input type="text" className="form-input" placeholder="Enter HSN Code" value={row.cthNo || ''} onChange={e => handleFieldChange(i, 'cthNo', e.target.value)} />
                  </div>

                  <div className="form-row" style={{ gridColumn: 'span 2' }}>
                    <span className="form-label">INVOICE NUMBER</span>
                    <input type="text" className="form-input" value={row.invoice_number || ''} onChange={e => handleFieldChange(i, 'invoice_number', e.target.value)} />
                  </div>
                  <div className="form-row" style={{ gridColumn: 'span 2' }}>
                    <span className="form-label">INVOICE DATE</span>
                    <input type="date" className="form-input" value={row.invoice_date || ''} onChange={e => handleFieldChange(i, 'invoice_date', e.target.value)} />
                  </div>

                  {/* Tally Numbers & Status Row */}
                  <div className="form-row" style={{ gridColumn: 'span 2' }}>
                    <span className="form-label" style={{ color: '#1565c0', fontWeight: 'bold' }}>PB No</span>
                    <div className="ep-inline">
                        <input type="text" readOnly className="form-input" style={{ background: '#e3f2fd', color: '#1565c0', width: '60%' }} value={row.purchase_book_no || ''} />
                        {!row.purchase_book_no && <span className="ep-status-pill" style={{ background: '#e2e3e5', color: '#383d41', fontSize: '10px', marginLeft: '10px', padding: '2px 8px', borderRadius: '10px' }}>Pending</span>}
                        {row.purchase_book_no && (
                            <IconButton 
                                size="small" 
                                color="primary" 
                                onClick={async () => {
                                    let data = paymentDetailsAudit[row.purchase_book_no];
                                    if (!data) {
                                        try {
                                            const res = await axios.get(`${import.meta.env.VITE_API_STRING}/get-payment-request-details/${encodeURIComponent(row.purchase_book_no)}`);
                                            data = res.data;
                                            setPaymentDetailsAudit(prev => ({ ...prev, [row.purchase_book_no]: data }));
                                        } catch (err) { console.error(err); alert('Could not fetch details'); return; }
                                    }
                                    generatePurchaseBookPDF(data, logo);
                                }}
                                style={{ marginLeft: '4px' }}
                                title="Print Payment Advice"
                            >
                                <PrintIcon style={{ fontSize: '18px' }} />
                            </IconButton>
                        )}
                        <span className="ep-status-pill" style={{ marginLeft: '10px', fontSize: '11px', padding: '2px 8px', borderRadius: '10px', background: row.purchase_book_status ? '#e8f5e9' : '#f5f5f5', color: row.purchase_book_status === 'Active' ? '#2e7d32' : '#757575', border: '1px solid #ddd' }}>
                            {row.purchase_book_status || 'PENDING'}
                        </span>
                    </div>
                  </div>
                  <div className="form-row" style={{ gridColumn: 'span 2' }}>
                    <span className="form-label" style={{ color: '#d32f2f', fontWeight: 'bold' }}>PR NO</span>
                    <div className="ep-inline" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                        <div style={{ display: 'flex', width: '100%', alignItems: 'center' }}>
                            <input type="text" readOnly className="form-input" style={{ background: '#ffebee', color: '#c62828', width: '60%' }} value={row.payment_request_no || ''} />
                            {row.payment_request_no && (
                                <IconButton 
                                    size="small" 
                                    color="error" 
                                    onClick={async () => {
                                        let data = paymentDetailsAudit[row.payment_request_no];
                                        if (!data) {
                                            try {
                                                const res = await axios.get(`${import.meta.env.VITE_API_STRING}/get-payment-request-details/${encodeURIComponent(row.payment_request_no)}`);
                                                data = res.data;
                                                setPaymentDetailsAudit(prev => ({ ...prev, [row.payment_request_no]: data }));
                                            } catch (err) { console.error(err); alert('Could not fetch details'); return; }
                                        }
                                        generatePurchaseBookPDF(data, logo);
                                    }}
                                    style={{ marginLeft: '4px' }}
                                    title="Print Payment Advice"
                                >
                                    <PrintIcon style={{ fontSize: '18px' }} />
                                </IconButton>
                            )}
                            <span className="ep-status-pill" style={{ 
                                marginLeft: '10px', 
                                fontSize: '11px', 
                                padding: '2px 8px', 
                                borderRadius: '10px', 
                                background: (row.payment_request_status === 'Paid' || paymentDetailsAudit[row.payment_request_no]?.utrNumber) ? '#e8f5e9' : '#fff3e0', 
                                color: (row.payment_request_status === 'Paid' || paymentDetailsAudit[row.payment_request_no]?.utrNumber) ? '#2e7d32' : '#ef6c00', 
                                border: '1px solid #ffe0e0' 
                            }}>
                                {(row.payment_request_status === 'Paid' || paymentDetailsAudit[row.payment_request_no]?.utrNumber) ? 'PAYMENT DONE' : (row.payment_request_status || 'PENDING')}
                            </span>
                        </div>
                        {paymentDetailsAudit[row.payment_request_no]?.utrNumber && (
                            <div style={{ fontSize: '10px', color: '#2e7d32', marginTop: '4px', fontWeight: '500', display: 'flex', flexDirection: 'column' }}>
                                <span>UTR: {paymentDetailsAudit[row.payment_request_no].utrNumber}</span>
                                <span style={{ opacity: 0.8 }}>By {paymentDetailsAudit[row.payment_request_no].utrAddedBy || 'Accounts'} on {new Date(paymentDetailsAudit[row.payment_request_no].utrAddedAt).toLocaleString('en-GB')}</span>
                                {paymentDetailsAudit[row.payment_request_no].paymentReceiptUrl && (
                                    <a 
                                        href={paymentDetailsAudit[row.payment_request_no].paymentReceiptUrl} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        style={{ 
                                            color: '#1565c0', 
                                            textDecoration: 'underline', 
                                            marginTop: '4px',
                                            fontWeight: 'bold',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '4px'
                                        }}
                                    >
                                        <DescriptionIcon style={{ fontSize: '12px' }} /> VIEW PAYMENT RECEIPT
                                    </a>
                                )}
                            </div>
                        )}
                    </div>
                  </div>

                  <div className="form-row" style={{ gridColumn: 'span 4' }}>
                    <span className="form-label">REMARK</span>
                    <input type="text" className="form-input" style={{ flex: 1 }} value={row.remark || ''} onChange={e => handleFieldChange(i, 'remark', e.target.value)} />
                  </div>
                </div>
              </div>

              <div className="charge-table-wrap">
                <table className="charge-table">
                  <thead>
                    <tr>
                      <th style={{ width: '60px' }}></th>
                      <th style={{ width: '80px' }}>BASIS</th>
                      <th>QTY/UNIT</th>
                      <th style={{ width: '40px' }}></th>
                      <th>RATE</th>
                      <th>TOTAL AMOUNT</th>
                      <th>TOTAL AMOUNT(INR)</th>
                      <th style={{ width: '34px' }}>OVRD</th>
                      <th style={{ width: '34px' }}>PSTD</th>
                      <th style={{ width: '26px' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* --- REVENUE ROW --- */}
                    <tr style={{ cursor: 'pointer' }} onClick={() => togglePanel(i, 'rev')}>
                      <td className="row-label">REVENUE</td>
                      <td>{row.revenue?.basis || 'Per B/E - Per Shp'}</td>
                      <td>{row.revenue?.qty || '1.00'}</td>
                      <td>{row.revenue?.currency || 'INR'}</td>
                      <td>{formatNumber(row.revenue?.rate)}</td>
                      <td>{formatNumber(row.revenue?.amount)}</td>
                      <td>{formatNumber(row.revenue?.amountINR)}</td>
                      <td style={{ textAlign: 'center' }}><input type="checkbox" checked={row.revenue?.overrideAutoRate || false} readOnly /></td>
                      <td style={{ textAlign: 'center' }}><input type="checkbox" checked={row.revenue?.isPosted || false} readOnly /></td>
                      <td>
                        <button type="button" className="arrow-btn" onClick={(e) => { e.stopPropagation(); togglePanel(i, 'rev'); }}>
                          {panelOpen[i] === 'rev' ? '▲' : '▼'}
                        </button>
                      </td>
                    </tr>
                    
                    {/* --- REVENUE EXPANDED --- */}
                    {panelOpen[i] === 'rev' && (
                      <tr className="expand-row">
                        <td colSpan="10">
                          <div className="expand-panel open">
                            <div className="ep-desc-row">
                              <span className="ep-label">CHARGE DESCRIPTION</span>
                              <input type="text" className="ep-desc-input" value={row.revenue?.chargeDescription || ''} onChange={e => handleFieldChange(i, 'chargeDescription', e.target.value, 'revenue')} />
                            </div>
                            <div className="ep-desc-row">
                                <span className="ep-label">ATTACHMENT</span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', flex: 1 }}>
                                    {Array.isArray(row.revenue?.url) && row.revenue.url.length > 0 ? (
                                        row.revenue.url.map((url, urlIdx) => (
                                            <Chip
                                                key={urlIdx}
                                                icon={<DescriptionIcon style={{ fontSize: "14px" }} />}
                                                label={extractFileName(url)}
                                                size="small"
                                                onDelete={() => {
                                                    const newUrls = row.revenue.url.filter((_, i) => i !== urlIdx);
                                                    handleFieldChange(i, 'url', newUrls, 'revenue');
                                                }}
                                                component="a"
                                                href={url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                clickable
                                                sx={{ maxWidth: "180px", fontSize: "10px", height: "22px", backgroundColor: "#e3f2fd", color: "#1565c0" }}
                                            />
                                        ))
                                    ) : (
                                        <span style={{ fontSize: '11px', color: '#8aA0b0', fontStyle: 'italic' }}>NO FILES ATTACHED</span>
                                    )}
                                    <button type="button" className="upload-btn" style={{ padding: '2px 8px' }} onClick={() => { setUploadIndex(i); setUploadSection('revenue'); }}>
                                        {Array.isArray(row.revenue?.url) && row.revenue.url.length > 0 ? 'EDIT FILES' : 'UPLOAD FILES'}
                                    </button>
                                </div>
                            </div>
                            <div className="ep-grid" style={{ marginRight: '30px' }}>
                              <div className="ep-row">
                                <span className="ep-label">BASIS</span>
                                <select className="ep-select" value={row.revenue?.basis || 'Per B/E - Per Shp'} onChange={e => handleFieldChange(i, 'basis', e.target.value, 'revenue')}>
                                  <option>Per Package</option><option>By Gross Wt</option><option>By Chg Wt</option>
                                  <option>By Volume</option><option>Per Container</option><option>Per TEU</option>
                                  <option>Per FEU</option><option>% of Other Charges</option>
                                  <option>% of Assessable Value</option><option>% of AV+Duty</option>
                                  <option>% of CIF Value</option><option>Per Vehicle</option>
                                  <option>% of Invoice Value</option><option>Per License</option>
                                  <option>Per B/E - Per Shp</option>
                                  <option>% of Product Value</option><option>Per Labour</option>
                                  <option>Per Product</option><option>By Net Wt</option><option>Per Invoice</option>
                                </select>
                              </div>
                              <div className="ep-row">
                                <span className="ep-label">OVERRIDE AUTO RATE</span>
                                <input type="checkbox" checked={row.revenue?.overrideAutoRate || false} onChange={e => handleFieldChange(i, 'overrideAutoRate', e.target.checked, 'revenue')} />
                              </div>
                              <div className="ep-row">
                                <span className="ep-label">QTY/UNIT</span>
                                <div className="ep-inline">
                                  <input type="number" step="0.01" value={row.revenue?.qty ?? 1.00} onChange={e => handleFieldChange(i, 'qty', e.target.value, 'revenue')} />
                                  <input type="text" value={row.revenue?.unit || ''} onChange={e => handleFieldChange(i, 'unit', e.target.value, 'revenue')} />
                                </div>
                              </div>
                              <div className="ep-row">
                                <span className="ep-label">RECEIVABLE TYPE</span>
                                <select className="ep-select" value={row.revenue?.partyType || 'Customer'} onChange={e => handleFieldChange(i, 'partyType', e.target.value, 'revenue')}>
                                  <option>Customer</option><option>Agent</option><option>Carrier</option>
                                </select>
                              </div>
                              <div className="ep-row">
                                <span className="ep-label">RATE</span>
                                <div className="ep-inline">
                                  <input type="number" step="0.01" value={row.revenue?.rate === 0 || row.revenue?.rate === "0" ? '' : (row.revenue?.rate ?? '')} onChange={e => handleFieldChange(i, 'rate', e.target.value, 'revenue')} />
                                  <select value={row.revenue?.currency || 'INR'} onChange={e => handleFieldChange(i, 'currency', e.target.value, 'revenue')}>
                                    {currencyList.map(c => <option key={c.code} value={c.code}>{c.code}</option>)}
                                  </select>
                                  {row.revenue?.currency && row.revenue.currency !== 'INR' && (
                                    <>
                                      <span style={{ fontSize: '10px', marginLeft: '8px', color: '#64748b', fontWeight: 'bold' }}>EX. RATE</span>
                                      <input type="number" step="0.01" style={{ width: '60px', marginLeft: '4px' }} value={row.revenue?.exchangeRate ?? 1} onChange={e => handleFieldChange(i, 'exchangeRate', e.target.value, 'revenue')} />
                                    </>
                                  )}
                                </div>
                              </div>
                              <div className="ep-row">
                                <span className="ep-label">RECEIVABLE FROM</span>
                                <div className="ep-search-container">
                                  <div className="ep-search-wrap">
                                    <input 
                                      type="text" 
                                      value={row.revenue?.partyName || ''} 
                                      onChange={e => handleFieldChange(i, 'partyName', e.target.value, 'revenue')} 
                                      onFocus={() => setActiveDropdown({ index: i, section: 'revenue' })}
                                    />
                                    <button type="button" className="ep-search-btn">🔍</button>
                                  </div>
                                  {activeDropdown.index === i && activeDropdown.section === 'revenue' && (row.revenue?.partyName?.length >= 1 || activeDropdown.clicked) && (
                                    <ul className="ep-dropdown-list" ref={dropdownRef}>
                                      {(row.revenue?.partyType?.toUpperCase() === 'AGENT' || row.revenue?.partyType?.toUpperCase() === 'CARRIER' ? shippingLines : 
                                        row.revenue?.partyType?.toUpperCase() === 'CUSTOMER' ? organizations : [])
                                        .filter(item => !row.revenue?.partyName || item.name.toLowerCase().includes(row.revenue.partyName.toLowerCase()))
                                        .slice(0, 20)
                                        .map((item, idx) => (
                                          <li key={idx} className="ep-dropdown-item" onClick={() => handleSelectParty(i, 'revenue', item)}>
                                            <span className="ep-item-name">{item.name}</span>
                                            <span className="ep-item-sub">{item.city || 'Master Directory'}</span>
                                          </li>
                                        ))}
                                      {((row.revenue?.partyType?.toUpperCase() === 'AGENT' || row.revenue?.partyType?.toUpperCase() === 'CARRIER' ? shippingLines : 
                                        row.revenue?.partyType?.toUpperCase() === 'CUSTOMER' ? organizations : [])
                                        .filter(item => !row.revenue?.partyName || item.name.toLowerCase().includes(row.revenue.partyName.toLowerCase()))
                                        .length === 0) && <li className="ep-dropdown-item"><span className="ep-item-sub">NO RESULTS FOUND</span></li>}
                                    </ul>
                                  )}
                                </div>
                                {row.revenue?.branchCode && <span className="ep-link" style={{ marginLeft: '6px', whiteSpace: 'nowrap' }}>{row.revenue.branchCode}</span>}
                              </div>
                              <div className="ep-row">
                                <span className="ep-label">TOTAL AMOUNT</span>
                                <div className="ep-inline">
                                  <input type="number" readOnly className="ep-read" style={{ background: '#f4f8fc' }} value={row.revenue?.amountINR || 0} />
                                  <span style={{ fontSize: '11px', color: '#555', paddingLeft: '4px' }}>INR</span>
                                </div>
                              </div>
                              <div className="ep-row" style={{ marginTop: '5px' }}>
                                <span className="ep-label"></span>
                                <button 
                                  type="button" 
                                  className="action-btn" 
                                  style={{ backgroundColor: '#f1f5f9', color: '#475569', borderColor: '#cbd5e1', textTransform: 'none', height: '26px', fontSize: '10px' }}
                                  onClick={() => syncSection(i, 'revenue', 'cost')}
                                >
                                  COPY TO COST ➔
                                </button>
                              </div>
                              {(() => {
                                const party = [...shippingLines, ...suppliers].find(p => p.name?.toUpperCase() === row.revenue?.partyName?.toUpperCase());
                                if (party && party.branches?.length > 1) {
                                  return (
                                    <div className="ep-row">
                                      <span className="ep-label">BRANCH</span>
                                      <select className="ep-select" value={row.revenue?.branchIndex || 0} onChange={e => handleFieldChange(i, 'branchIndex', parseInt(e.target.value), 'revenue')}>
                                        {party.branches.map((b, bIdx) => (
                                          <option key={bIdx} value={bIdx}>{b.branchName || `Branch ${bIdx + 1}`}</option>
                                        ))}
                                      </select>
                                    </div>
                                  );
                                }
                                return null;
                              })()}

                              {/* GST FIELDS FOR REVENUE */}
                              <div className="ep-row">
                                <span className="ep-label">INCLUDE GST?</span>
                                <div className="ep-inline">
                                  <input type="checkbox" checked={row.revenue?.isGst !== false} onChange={e => handleFieldChange(i, 'isGst', e.target.checked, 'revenue')} />
                                  {row.revenue?.isGst !== false && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                      <input type="number" style={{ width: '50px' }} value={row.revenue?.gstRate ?? 18} onChange={e => handleFieldChange(i, 'gstRate', e.target.value, 'revenue')} />
                                      <span style={{ fontSize: '11px' }}>%</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="ep-row">
                                <span className="ep-label">APPLY TDS?</span>
                                <div className="ep-inline">
                                  <input type="checkbox" checked={row.revenue?.isTds || false} onChange={e => handleFieldChange(i, 'isTds', e.target.checked, 'revenue')} />
                                  {row.revenue?.isTds && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                      <input type="number" style={{ width: '50px' }} value={row.revenue?.tdsPercent ?? 0} onChange={e => handleFieldChange(i, 'tdsPercent', e.target.value, 'revenue')} />
                                      <span style={{ fontSize: '11px' }}>%</span>
                                      <select className="ep-select" style={{ width: '70px', marginLeft: '6px', fontSize: '10px' }} value={row.revenue?.tdsCategory || ''} onChange={e => handleFieldChange(i, 'tdsCategory', e.target.value, 'revenue')}>
                                        <option value="">--</option>
                                        <option value="94C">94C</option>
                                        <option value="94J">94J</option>
                                        <option value="94I">94I</option>
                                        <option value="94H">94H</option>
                                      </select>
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="ep-row">
                                <span className="ep-label">BASIC AMOUNT</span>
                                <div className="ep-inline">
                                  <input type="number" readOnly className="ep-read" style={{ background: '#f4f8fc' }} value={formatNumber(row.revenue?.basicAmount)} />
                                </div>
                              </div>
                              <div className="ep-row">
                                <span className="ep-label">GST AMOUNT</span>
                                <div className="ep-inline">
                                  <input type="number" readOnly className="ep-read" style={{ background: '#f4f8fc' }} value={formatNumber(row.revenue?.gstAmount)} />
                                </div>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}

                    {/* --- COST ROW --- */}
                    <tr style={{ cursor: 'pointer' }} onClick={() => togglePanel(i, 'cost')}>
                      <td className="row-label">COST</td>
                      <td>{row.cost?.basis || 'Per B/E - Per Shp'}</td>
                      <td>{row.cost?.qty || '1.00'}</td>
                      <td>{row.cost?.currency || 'INR'}</td>
                      <td>{formatNumber(row.cost?.rate)}</td>
                      <td>{formatNumber(row.cost?.amount)}</td>
                      <td>{formatNumber(row.cost?.amountINR)}</td>
                      <td style={{ textAlign: 'center' }}><input type="checkbox" checked={row.cost?.overrideAutoRate || false} readOnly /></td>
                      <td style={{ textAlign: 'center' }}><input type="checkbox" checked={row.cost?.isPosted || false} readOnly /></td>
                      <td>
                        <button type="button" className="arrow-btn" onClick={(e) => { e.stopPropagation(); togglePanel(i, 'cost'); }}>
                          {panelOpen[i] === 'cost' ? '▲' : '▼'}
                        </button>
                      </td>
                    </tr>

                    {/* --- COST EXPANDED --- */}
                    {panelOpen[i] === 'cost' && (
                      <tr className="expand-row">
                        <td colSpan="10">
                          <div className="expand-panel open">
                            <div className="ep-desc-row">
                              <span className="ep-label">CHARGE DESCRIPTION</span>
                              <input type="text" className="ep-desc-input" value={row.cost?.chargeDescription || ''} onChange={e => handleFieldChange(i, 'chargeDescription', e.target.value, 'cost')} />
                            </div>
                            <div className="ep-desc-row">
                                <span className="ep-label">ATTACHMENT</span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', flex: 1 }}>
                                    {Array.isArray(row.cost?.url) && row.cost.url.length > 0 ? (
                                        row.cost.url.map((url, urlIdx) => (
                                            <Chip
                                                key={urlIdx}
                                                icon={<DescriptionIcon style={{ fontSize: "14px" }} />}
                                                label={extractFileName(url)}
                                                size="small"
                                                onDelete={() => {
                                                    const newUrls = row.cost.url.filter((_, i) => i !== urlIdx);
                                                    handleFieldChange(i, 'url', newUrls, 'cost');
                                                }}
                                                component="a"
                                                href={url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                clickable
                                                sx={{ maxWidth: "180px", fontSize: "10px", height: "22px", backgroundColor: "#e3f2fd", color: "#1565c0" }}
                                            />
                                        ))
                                    ) : (
                                        <span style={{ fontSize: '11px', color: '#8aA0b0', fontStyle: 'italic' }}>NO FILES ATTACHED</span>
                                    )}
                                    <button type="button" className="upload-btn" style={{ padding: '2px 8px' }} onClick={() => { setUploadIndex(i); setUploadSection('cost'); }}>
                                        {Array.isArray(row.cost?.url) && row.cost.url.length > 0 ? 'EDIT FILES' : 'UPLOAD FILES'}
                                    </button>
                                </div>
                            </div>
                            <div className="ep-grid" style={{ marginRight: '30px' }}>
                              <div className="ep-row">
                                <span className="ep-label">BASIS</span>
                                <select className="ep-select" value={row.cost?.basis || 'Per B/E - Per Shp'} onChange={e => handleFieldChange(i, 'basis', e.target.value, 'cost')}>
                                  <option>Per Package</option><option>By Gross Wt</option><option>By Chg Wt</option>
                                  <option>By Volume</option><option>Per Container</option><option>Per TEU</option>
                                  <option>Per FEU</option><option>% of Other Charges</option>
                                  <option>% of Assessable Value</option><option>% of AV+Duty</option>
                                  <option>% of CIF Value</option><option>Per Vehicle</option>
                                  <option>% of Invoice Value</option><option>Per License</option>
                                  <option>Per B/E - Per Shp</option>
                                  <option>% of Product Value</option><option>Per Labour</option>
                                  <option>Per Product</option><option>By Net Wt</option><option>Per Invoice</option>
                                </select>
                              </div>
                              <div className="ep-row">
                                <span className="ep-label">OVERRIDE AUTO RATE</span>
                                <input type="checkbox" checked={row.cost?.overrideAutoRate || false} onChange={e => handleFieldChange(i, 'overrideAutoRate', e.target.checked, 'cost')} />
                              </div>
                              <div className="ep-row">
                                <span className="ep-label">QTY/UNIT</span>
                                <div className="ep-inline">
                                  <input type="number" step="0.01" value={row.cost?.qty ?? 1.00} onChange={e => handleFieldChange(i, 'qty', e.target.value, 'cost')} />
                                  <input type="text" value={row.cost?.unit || ''} onChange={e => handleFieldChange(i, 'unit', e.target.value, 'cost')} />
                                </div>
                              </div>
                              <div className="ep-row">
                                <span className="ep-label">PAYABLE TYPE</span>
                                <select className="ep-select" value={row.cost?.partyType || 'Others'} onChange={e => handleFieldChange(i, 'partyType', e.target.value, 'cost')}>
                                  <option>Vendor</option><option>Transporter</option><option>Exporter</option><option>Others</option><option>Agent</option><option>CFS</option>
                                </select>
                              </div>
                              <div className="ep-row">
                                <span className="ep-label">RATE</span>
                                <div className="ep-inline">
                                  <input type="number" step="0.01" value={row.cost?.rate === 0 || row.cost?.rate === "0" ? '' : (row.cost?.rate ?? '')} onChange={e => handleFieldChange(i, 'rate', e.target.value, 'cost')} />
                                  <select value={row.cost?.currency || 'INR'} onChange={e => handleFieldChange(i, 'currency', e.target.value, 'cost')}>
                                    {currencyList.map(c => <option key={c.code} value={c.code}>{c.code}</option>)}
                                  </select>
                                  {row.cost?.currency && row.cost.currency !== 'INR' && (
                                    <>
                                      <span style={{ fontSize: '10px', marginLeft: '8px', color: '#64748b', fontWeight: 'bold' }}>EX. RATE</span>
                                      <input type="number" step="0.01" style={{ width: '60px', marginLeft: '4px' }} value={row.cost?.exchangeRate ?? 1} onChange={e => handleFieldChange(i, 'exchangeRate', e.target.value, 'cost')} />
                                    </>
                                  )}
                                </div>
                              </div>
                              <div className="ep-row">
                                <span className="ep-label">PAYABLE TO</span>
                                <div className="ep-search-container">
                                  <div className="ep-search-wrap">
                                    <input 
                                      type="text" 
                                      value={row.cost?.partyName || ''} 
                                      onChange={e => handleFieldChange(i, 'partyName', e.target.value, 'cost')} 
                                      onFocus={() => setActiveDropdown({ index: i, section: 'cost' })}
                                    />
                                    <button type="button" className="ep-search-btn">🔍</button>
                                  </div>
                                  {activeDropdown.index === i && activeDropdown.section === 'cost' && (row.cost?.partyName?.length >= 1 || activeDropdown.clicked) && (
                                    <ul className="ep-dropdown-list" ref={dropdownRef}>
                                      {(row.cost?.partyType?.toUpperCase() === 'AGENT' || row.cost?.partyType?.toUpperCase() === 'OTHERS' ? shippingLines : 
                                        row.cost?.partyType?.toUpperCase() === 'VENDOR' ? suppliers :
                                        row.cost?.partyType?.toUpperCase() === 'TRANSPORTER' ? transporters :
                                        row.cost?.partyType?.toUpperCase() === 'EXPORTER' ? organizations : 
                                        row.cost?.partyType?.toUpperCase() === 'CFS' ? cfsList : [])
                                        .filter(item => !row.cost?.partyName || item.name.toLowerCase().includes(row.cost.partyName.toLowerCase()))
                                        .slice(0, 20)
                                        .map((item, idx) => (
                                          <li key={idx} className="ep-dropdown-item" onClick={() => handleSelectParty(i, 'cost', item)}>
                                            <span className="ep-item-name">{item.name}</span>
                                            <span className="ep-item-sub">{item.city || 'Master Directory'}</span>
                                          </li>
                                        ))}
                                      {((row.cost?.partyType?.toUpperCase() === 'AGENT' || row.cost?.partyType?.toUpperCase() === 'OTHERS' ? shippingLines : 
                                        row.cost?.partyType?.toUpperCase() === 'VENDOR' ? suppliers :
                                        row.cost?.partyType?.toUpperCase() === 'TRANSPORTER' ? transporters :
                                        row.cost?.partyType?.toUpperCase() === 'EXPORTER' ? organizations : 
                                        row.cost?.partyType?.toUpperCase() === 'CFS' ? cfsList : [])
                                        .filter(item => !row.cost?.partyName || item.name.toLowerCase().includes(row.cost.partyName.toLowerCase()))
                                        .length === 0) && <li className="ep-dropdown-item"><span className="ep-item-sub">NO RESULTS FOUND</span></li>}
                                    </ul>
                                  )}
                                </div>
                              </div>
                              <div className="ep-row">
                                <span className="ep-label">TOTAL AMOUNT</span>
                                <div className="ep-inline">
                                  <input type="number" readOnly className="ep-read" style={{ background: '#f4f8fc' }} value={row.cost?.amountINR || 0} />
                                  <span style={{ fontSize: '11px', color: '#555', paddingLeft: '4px' }}>INR</span>
                                </div>
                              </div>
                              {(() => {
                                const party = [...shippingLines, ...suppliers, ...cfsList].find(p => p.name?.toUpperCase() === row.cost?.partyName?.toUpperCase());
                                if (party && party.branches?.length > 1) {
                                  return (
                                    <div className="ep-row">
                                      <span className="ep-label">BRANCH</span>
                                      <select className="ep-select" value={row.cost?.branchIndex || 0} onChange={e => handleFieldChange(i, 'branchIndex', parseInt(e.target.value), 'cost')}>
                                        {party.branches.map((b, bIdx) => (
                                          <option key={bIdx} value={bIdx}>{b.branchName || `Branch ${bIdx + 1}`}</option>
                                        ))}
                                      </select>
                                    </div>
                                  );
                                }
                                return null;
                              })()}

                              {/* GST & TDS FIELDS FOR COST */}
                              <div className="ep-row">
                                <span className="ep-label">INCLUDE GST?</span>
                                <div className="ep-inline">
                                  <input type="checkbox" checked={row.cost?.isGst !== false} onChange={e => handleFieldChange(i, 'isGst', e.target.checked, 'cost')} />
                                  {row.cost?.isGst !== false && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                      <input type="number" style={{ width: '50px' }} value={row.cost?.gstRate ?? 18} onChange={e => handleFieldChange(i, 'gstRate', e.target.value, 'cost')} />
                                      <span style={{ fontSize: '11px' }}>%</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="ep-row">
                                <span className="ep-label">BASIC AMOUNT</span>
                                <div className="ep-inline">
                                  <input type="number" readOnly className="ep-read" style={{ background: '#f4f8fc' }} value={formatNumber(row.cost?.basicAmount)} />
                                </div>
                              </div>
                              <div className="ep-row">
                                <span className="ep-label">GST AMOUNT</span>
                                <div className="ep-inline">
                                  <input type="number" readOnly className="ep-read" style={{ background: '#f4f8fc' }} value={formatNumber(row.cost?.gstAmount)} />
                                </div>
                              </div>
                              <div className="ep-row">
                                <span className="ep-label">APPLY TDS?</span>
                                <div className="ep-inline">
                                  <input type="checkbox" checked={row.cost?.isTds || false} onChange={e => handleFieldChange(i, 'isTds', e.target.checked, 'cost')} />
                                  {row.cost?.isTds && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                      <input type="number" style={{ width: '50px' }} value={row.cost?.tdsPercent ?? 0} onChange={e => handleFieldChange(i, 'tdsPercent', e.target.value, 'cost')} />
                                      <span style={{ fontSize: '11px' }}>%</span>
                                      <select className="ep-select" style={{ width: '70px', marginLeft: '6px', fontSize: '10px' }} value={row.cost?.tdsCategory || ''} onChange={e => handleFieldChange(i, 'tdsCategory', e.target.value, 'cost')}>
                                        <option value="">--</option>
                                        <option value="94C">94C</option>
                                        <option value="94J">94J</option>
                                        <option value="94I">94I</option>
                                        <option value="94H">94H</option>
                                      </select>
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="ep-row">
                                <span className="ep-label">TDS AMOUNT</span>
                                <div className="ep-inline">
                                  <input type="number" readOnly className="ep-read" style={{ background: '#f4f8fc' }} value={formatNumber(row.cost?.tdsAmount)} />
                                </div>
                              </div>
                              <div className="ep-row">
                                <span className="ep-label" style={{ fontWeight: 'bold', color: '#d32f2f' }}>NET PAYABLE</span>
                                <div className="ep-inline">
                                  <input type="number" readOnly className="ep-read" style={{ background: '#fff9f9', fontWeight: 'bold', color: '#d32f2f', border: '1px solid #ffcdd2' }} value={row.cost?.netPayable} />
                                  <button 
                                    type="button" 
                                    className="action-btn" 
                                    style={{ backgroundColor: '#f1f5f9', color: '#475569', borderColor: '#cbd5e1', textTransform: 'none', height: '26px', fontSize: '10px', marginLeft: '10px' }}
                                    onClick={() => syncSection(i, 'cost', 'revenue')}
                                  >
                                    Copy to Revenue ➔
                                  </button>
                                </div>
                              </div>
                              <div className="ep-row">
                                <span className="ep-label"></span>
                                <div className="ep-inline">
                                  {/* Conditionally show based on workMode or if already exists */}
                                  {(!row.purchase_book_no && (workMode === 'Purchase Book' || !row.payment_request_no)) && (
                                    <button 
                                      type="button" 
                                      className="action-btn action-btn-blue"
                                      style={{ marginLeft: '10px' }}
                                      onClick={() => {
                                        const partyName = row.cost?.partyName;
                                        const partyDetails = [...shippingLines, ...suppliers, ...organizations, ...cfsList, ...transporters].find(p => p.name?.toUpperCase() === partyName?.toUpperCase());
                                        setPurchaseBookData(() => {
                                          const cost = row.cost || {};
                                          return {
                                            partyName: cost.partyName,
                                            partyDetails,
                                            amount: cost.amount,
                                            basicAmount: cost.basicAmount,
                                            gstAmount: cost.gstAmount,
                                            gstRate: cost.gstRate,
                                            cgst: cost.cgst,
                                            sgst: cost.sgst,
                                            igst: cost.igst,
                                            tdsAmount: cost.tdsAmount,
                                            netPayable: cost.netPayable,
                                            totalAmount: cost.amount,
                                            chargeHead: row.chargeHead,
                                            chargeType: row.chargeType,
                                            category: row.category,
                                            tdsCategory: cost.tdsCategory,
                                            invoice_number: row.invoice_number,
                                            invoice_date: row.invoice_date,
                                            jobDisplayNumber: jobDisplayNumber,
                                            cthNo: row.hsnCode,
                                            chargeId: row._id,
                                            jobId: parentId,
                                            branchIndex: cost.branchIndex || 0
                                          };
                                        });
                                      }}
                                    >
                                      Purchase book
                                    </button>
                                  )}
                                  {(!row.payment_request_no && (workMode === 'Payment' || !row.purchase_book_no)) && (
                                    <button 
                                      type="button" 
                                      className="action-btn action-btn-red"
                                      style={{ marginLeft: '10px' }}
                                      onClick={() => {
                                        const partyName = row.cost?.partyName;
                                        const partyDetails = [...shippingLines, ...suppliers, ...organizations, ...cfsList, ...transporters].find(p => p.name?.toUpperCase() === partyName?.toUpperCase());
                                        setPaymentRequestData({
                                          partyName,
                                          partyDetails,
                                          jobDisplayNumber,
                                          branchIndex: row.cost?.branchIndex || 0,
                                          netPayable: row.cost?.netPayable,
                                          chargeHead: row.chargeHead,
                                          chargeId: row._id,
                                          jobId: parentId
                                        });
                                      }}
                                    >
                                      Request Payment
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
        <div className="modal-footer">
          <button type="button" className="btn" onClick={() => handleSave(false)}>Update</button>
          <button type="button" className="btn" onClick={() => handleSave(true)}>Update & Close</button>
          <button type="button" className="btn" onClick={onClose} style={{ marginRight: '30px' }}>Cancel</button>
        </div>
      </div>

      {uploadIndex !== null && (
        <FileUploadModal 
            isOpen={true}
            onClose={() => { setUploadIndex(null); setUploadSection(null); }}
            chargeLabel={`${formData[uploadIndex]?.chargeHead} (${uploadSection})`}
            initialUrls={formData[uploadIndex]?.[uploadSection]?.url || []}
            onAttach={(urls) => {
                handleFieldChange(uploadIndex, 'url', urls, uploadSection);
                setUploadIndex(null);
                setUploadSection(null);
            }}
        />
      )}

      <RequestPaymentModal 
        isOpen={paymentRequestData !== null}
        onClose={() => setPaymentRequestData(null)}
        initialData={paymentRequestData}
        jobNumber={jobNumber}
        jobDisplayNumber={jobDisplayNumber}
        jobYear={jobYear}
        onSuccess={(requestNo) => {
          // Update the localized formData state with the new number
          const updated = [...formData];
          const activeIndex = formData.findIndex(c => c._id === paymentRequestData.chargeId || c.chargeHead === paymentRequestData.chargeHead);
          if (activeIndex !== -1) {
            const initialStatus = 'Pending';
            updated[activeIndex].payment_request_no = requestNo;
            updated[activeIndex].payment_request_status = initialStatus;
            setFormData(updated);
            // PERSIST IMMEDIATELY
            if (updateCharge && updated[activeIndex]._id) {
              updateCharge(updated[activeIndex]._id, { 
                payment_request_no: requestNo, 
                payment_request_status: initialStatus 
              });
            }
          }
        }}
      />

      <PurchaseBookModal 
        isOpen={purchaseBookData !== null}
        onClose={() => setPurchaseBookData(null)}
        initialData={purchaseBookData}
        jobNumber={jobNumber}
        jobDisplayNumber={jobDisplayNumber}
        jobYear={jobYear}
        onSuccess={(entryNo) => {
          // Update the localized formData state with the new number
          const updated = [...formData];
          const activeIndex = formData.findIndex(c => c.chargeHead === purchaseBookData.chargeHead);
          if (activeIndex !== -1) {
            const initialStatus = 'Pending';
            updated[activeIndex].purchase_book_no = entryNo;
            updated[activeIndex].purchase_book_status = initialStatus;
            setFormData(updated);
            // PERSIST IMMEDIATELY
            if (updateCharge && updated[activeIndex]._id) {
              updateCharge(updated[activeIndex]._id, { 
                purchase_book_no: entryNo, 
                purchase_book_status: initialStatus 
              });
            }
          }
        }}
      />
    </div>,
    document.body
  );
};

export default memo(EditChargeModal);
