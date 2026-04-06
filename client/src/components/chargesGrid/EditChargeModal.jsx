import React, { useState, useEffect, useRef, memo } from 'react';
import FileUploadModal from './FileUploadModal';
import RequestPaymentModal from './RequestPaymentModal';
import PurchaseBookModal from './PurchaseBookModal';
import { Chip } from '@mui/material';
import DescriptionIcon from '@mui/icons-material/Description';
import axios from 'axios';
import './charges.css';

const EditChargeModal = ({ 
  isOpen, 
  onClose, 
  selectedCharges, 
  onSave, 
  updateCharge,
  parentId,
  shippingLineAirline, 
  importerName,
  jobNumber = '',
  jobDisplayNumber = '',
  jobYear = '',
  jobInvoiceNumber = '',
  jobInvoiceDate = '',
  jobInvoiceValue = '',
  jobInvoiceCount = 1,
  jobContainerCount = 0,
  jobCthNo = ''
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
  const [activeDropdown, setActiveDropdown] = useState({ index: null, section: null }); // Track which row/section has open dropdown
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
        const [slRes, supRes, orgRes] = await Promise.all([
          axios.get(`${import.meta.env.VITE_API_STRING}/get-shipping-lines`),
          axios.get(`${import.meta.env.VITE_API_STRING}/get-suppliers`),
          axios.get(`${import.meta.env.VITE_API_STRING}/organization`)
        ]);
        setShippingLines(slRes.data);
        setSuppliers(supRes.data);
        setOrganizations(orgRes.data.organizations || []);
      } catch (error) {
        console.error("Error fetching master data:", error);
      }
    };
    fetchMasterData();
  }, []);

  useEffect(() => {
    if (isOpen) {
      const initialData = JSON.parse(JSON.stringify(selectedCharges)).map(charge => ({
        ...charge,
        invoice_number: charge.invoice_number || '',
        invoice_date: charge.invoice_date || '',
        remark: charge.remark || '',
        purchase_book_no: charge.purchase_book_no || '',
        purchase_book_status: charge.purchase_book_status || '',
        payment_request_no: charge.payment_request_no || '',
        payment_request_status: charge.payment_request_status || ''
      }));
      setFormData(initialData);
      setPanelOpen(selectedCharges.reduce((acc, _, i) => ({ ...acc, [i]: 'cost' }), {}));
      setUploadIndex(null);
    }
  }, [isOpen, selectedCharges]);

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
      
      // Auto-populate TDS if selecting a shipping line
      if (section === 'cost' && field === 'partyName') {
        const matchedSL = shippingLines.find(sl => sl.name?.toUpperCase() === value?.toUpperCase());
        if (matchedSL && matchedSL.tds_percent > 0) {
          updated[index][section].isTds = true;
          updated[index][section].tdsPercent = matchedSL.tds_percent;
        }
      }

      // Auto-populate Payable To if type is 'Others' in Cost section
      if (section === 'cost' && field === 'partyType' && value === 'Others' && shippingLineAirline) {
        updated[index][section].partyName = shippingLineAirline;
      }

      // Auto-populate Payable To if type is 'Importer' in Cost section
      if (section === 'cost' && field === 'partyType' && value === 'Importer' && importerName) {
        updated[index][section].partyName = importerName;
      }
      
      // Auto-populate Qty based on selected Basis
      if (field === 'basis') {
        if (value === 'Per S/B') {
          updated[index][section].qty = 1;
        } else if (value === 'Per Invoice') {
          updated[index][section].qty = jobInvoiceCount || 1;
        } else if (value === 'Per Container') {
          updated[index][section].qty = jobContainerCount || 1;
        }
        // Also trigger recalculation of amounts
        field = 'qty';
        value = updated[index][section].qty;
      }

      const fieldsToTriggerRecalc = ['qty', 'rate', 'isGst', 'gstRate', 'isTds', 'tdsPercent', 'exchangeRate', 'partyName'];
      if (fieldsToTriggerRecalc.includes(field)) {
        const sectionRef = updated[index][section];
        const qty = parseFloat(sectionRef.qty) || 0;
        const rate = parseFloat(sectionRef.rate) || 0;
        const exRate = parseFloat(sectionRef.exchangeRate) || 1;
        
        // Total Amount: Qty * Rate (Rate is always GST-inclusive)
        const amount = qty * rate;
        sectionRef.amount = amount;
        sectionRef.amountINR = amount * exRate;

        // GST & Basic Amount Calculation:
        // Basic is always GST-exclusive (Amount / 1.18)
        // GST is the difference (Amount - Basic)
        const gstRate = parseFloat(sectionRef.gstRate) || 18;
        const derivedBasic = amount / (1 + (gstRate / 100));
        const derivedGst = amount - derivedBasic;
        
        sectionRef.gstAmount = derivedGst;
        sectionRef.basicAmount = derivedBasic; // TDS always calculated on this

        // GST Split Logic based on GSTIN (24 = Gujarat)
        const partyName = sectionRef.partyName;
        const party = [...shippingLines, ...suppliers].find(p => p.name?.toUpperCase() === partyName?.toUpperCase());
        const branchIndex = sectionRef.branchIndex || 0;
        const gstin = party?.branches?.[branchIndex]?.gst || "";
        
        if (gstin.startsWith("24")) {
          sectionRef.cgst = derivedGst / 2;
          sectionRef.sgst = derivedGst / 2;
          sectionRef.igst = 0;
        } else {
          sectionRef.cgst = 0;
          sectionRef.sgst = 0;
          sectionRef.igst = derivedGst;
        }

        // TDS Calculation: ALWAYS on the GST-exclusive Basic Amount
        const isTds = sectionRef.isTds || false;
        const tdsPercent = parseFloat(sectionRef.tdsPercent) || 0;
        if (isTds) {
          sectionRef.tdsAmount = sectionRef.basicAmount * (tdsPercent / 100);
        } else {
          sectionRef.tdsAmount = 0;
        }

        // Net Payable Calculation:
        // "Include GST" (Checked): Net = Total Amount - TDS
        // "Exclude GST" (Unchecked): Net = Basic Amount - TDS
        const includeGst = sectionRef.isGst || false;
        if (includeGst) {
          sectionRef.netPayable = amount - sectionRef.tdsAmount;
        } else {
          sectionRef.netPayable = sectionRef.basicAmount - sectionRef.tdsAmount;
        }
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

  return (
    <div className="modal-overlay active" onMouseDown={() => setActiveDropdown({ index: null, section: null })}>
      <div className="edit-charge-modal" ref={modalRef} onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-title">Edit Charge</div>
        <div className="modal-body">
          {formData.map((row, i) => (
            <div key={row._id || i} style={{ marginBottom: formData.length > 1 ? '30px' : '0' }}>
              <div className="form-section-new">
                <div className="form-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginRight: '30px', gap: '10px 20px' }}>
                  <div className="form-row" style={{ gridColumn: 'span 2' }}>
                    <span className="form-label">Charge</span>
                    <div className="form-input-search">
                      <input type="text" readOnly className="form-input" style={{ background: '#f5f8fc', color: '#1a3a5c', fontWeight: 'bold' }} value={row.chargeHead || ''} />
                      <button type="button" className="search-btn">🔍</button>
                    </div>
                  </div>
                  <div className="form-row" style={{ gridColumn: 'span 2' }}>
                    <span className="form-label">Category</span>
                    <input type="text" className="form-input" value={row.category || ''} onChange={e => handleFieldChange(i, 'category', e.target.value)} />
                  </div>

                  <div className="form-row" style={{ gridColumn: 'span 2' }}>
                    <span className="form-label">Invoice Number</span>
                    <input type="text" className="form-input" value={row.invoice_number || ''} onChange={e => handleFieldChange(i, 'invoice_number', e.target.value)} />
                  </div>
                  <div className="form-row" style={{ gridColumn: 'span 2' }}>
                    <span className="form-label">Invoice Date</span>
                    <input type="date" className="form-input" value={row.invoice_date || ''} onChange={e => handleFieldChange(i, 'invoice_date', e.target.value)} />
                  </div>

                  {/* Tally Numbers & Status Row */}
                  <div className="form-row" style={{ gridColumn: 'span 2' }}>
                    <span className="form-label" style={{ color: '#1565c0', fontWeight: 'bold' }}>PB No</span>
                    <div className="ep-inline">
                        <input type="text" readOnly className="form-input" style={{ background: '#e3f2fd', color: '#1565c0', width: '60%' }} value={row.purchase_book_no || ''} />
                        <span className="ep-status-pill" style={{ marginLeft: '10px', fontSize: '11px', padding: '2px 8px', borderRadius: '10px', background: row.purchase_book_status ? '#e8f5e9' : '#f5f5f5', color: row.purchase_book_status === 'Active' ? '#2e7d32' : '#757575', border: '1px solid #ddd' }}>
                            {row.purchase_book_status || 'Pending'}
                        </span>
                    </div>
                  </div>
                  <div className="form-row" style={{ gridColumn: 'span 2' }}>
                    <span className="form-label" style={{ color: '#d32f2f', fontWeight: 'bold' }}>PR No</span>
                    <div className="ep-inline">
                        <input type="text" readOnly className="form-input" style={{ background: '#ffebee', color: '#c62828', width: '60%' }} value={row.payment_request_no || ''} />
                        <span className="ep-status-pill" style={{ marginLeft: '10px', fontSize: '11px', padding: '2px 8px', borderRadius: '10px', background: row.payment_request_status ? '#e8f5e9' : '#f5f5f5', color: row.payment_request_status === 'Active' ? '#2e7d32' : '#757575', border: '1px solid #ddd' }}>
                            {row.payment_request_status || 'Pending'}
                        </span>
                    </div>
                  </div>

                  <div className="form-row" style={{ gridColumn: 'span 4' }}>
                    <span className="form-label">Remark</span>
                    <input type="text" className="form-input" value={row.remark || ''} onChange={e => handleFieldChange(i, 'remark', e.target.value)} />
                  </div>
                </div>
              </div>

              <div className="charge-table-wrap">
                <table className="charge-table">
                  <thead>
                    <tr>
                      <th style={{ width: '60px' }}></th>
                      <th style={{ width: '80px' }}>Basis</th>
                      <th>Qty/Unit</th>
                      <th style={{ width: '40px' }}></th>
                      <th>Rate</th>
                      <th>Total Amount</th>
                      <th>Total Amount(INR)</th>
                      <th style={{ width: '34px' }}>Ovrd</th>
                      <th style={{ width: '34px' }}>Pstd</th>
                      <th style={{ width: '26px' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* --- REVENUE ROW --- */}
                    <tr style={{ cursor: 'pointer' }} onClick={() => togglePanel(i, 'rev')}>
                      <td className="row-label">Revenue</td>
                      <td>{row.revenue?.basis || 'Per S/B'}</td>
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
                              <span className="ep-label">Charge Description</span>
                              <input type="text" className="ep-desc-input" value={row.revenue?.chargeDescription || ''} onChange={e => handleFieldChange(i, 'chargeDescription', e.target.value, 'revenue')} />
                            </div>
                            <div className="ep-desc-row">
                                <span className="ep-label">Attachment</span>
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
                                                href={url && url.toString().startsWith('http') ? url : '#'}
                                                onClick={(e) => { if (!url || !url.toString().startsWith('http')) e.preventDefault(); }}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                clickable
                                                sx={{ maxWidth: "180px", fontSize: "10px", height: "22px", backgroundColor: "#e3f2fd", color: "#1565c0" }}
                                            />
                                        ))
                                    ) : (
                                        <span style={{ fontSize: '11px', color: '#8aA0b0', fontStyle: 'italic' }}>No files attached</span>
                                    )}
                                    <button type="button" className="upload-btn" style={{ padding: '2px 8px' }} onClick={() => { setUploadIndex(i); setUploadSection('revenue'); }}>
                                        {Array.isArray(row.revenue?.url) && row.revenue.url.length > 0 ? 'Edit Files' : 'Upload Files'}
                                    </button>
                                </div>
                            </div>
                            <div className="ep-grid" style={{ marginRight: '30px' }}>
                              <div className="ep-row">
                                <span className="ep-label">Basis</span>
                                <select className="ep-select" value={row.revenue?.basis || 'Per S/B'} onChange={e => handleFieldChange(i, 'basis', e.target.value, 'revenue')}>
                                  <option>Per S/B</option>
                                  <option>Per Invoice</option>
                                  <option>Per Container</option>
                                </select>
                              </div>
                              <div className="ep-row">
                                <span className="ep-label">Override Auto Rate</span>
                                <input type="checkbox" checked={row.revenue?.overrideAutoRate || false} onChange={e => handleFieldChange(i, 'overrideAutoRate', e.target.checked, 'revenue')} />
                              </div>
                              <div className="ep-row">
                                <span className="ep-label">Qty/Unit</span>
                                <div className="ep-inline">
                                  <input type="number" step="0.01" value={row.revenue?.qty ?? 1.00} onChange={e => handleFieldChange(i, 'qty', e.target.value, 'revenue')} />
                                  <input type="text" value={row.revenue?.unit || ''} onChange={e => handleFieldChange(i, 'unit', e.target.value, 'revenue')} />
                                </div>
                              </div>
                              <div className="ep-row">
                                <span className="ep-label">Receivable Type</span>
                                <select className="ep-select" value={row.revenue?.partyType || ''} onChange={e => handleFieldChange(i, 'partyType', e.target.value, 'revenue')}>
                                  <option>Customer</option><option>Agent</option><option>Carrier</option>
                                </select>
                              </div>
                              <div className="ep-row">
                                <span className="ep-label">Rate</span>
                                <div className="ep-inline">
                                  <input type="number" step="0.01" value={row.revenue?.rate ?? 0.00} onChange={e => handleFieldChange(i, 'rate', e.target.value, 'revenue')} />
                                  <select value={row.revenue?.currency || 'INR'} onChange={e => handleFieldChange(i, 'currency', e.target.value, 'revenue')}>
                                    <option>INR</option><option>USD</option><option>EUR</option>
                                  </select>
                                </div>
                              </div>
                              <div className="ep-row">
                                <span className="ep-label">Receivable From</span>
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
                                  {activeDropdown.index === i && activeDropdown.section === 'revenue' && (row.revenue?.partyName?.length >= 2) && (
                                    <ul className="ep-dropdown-list" ref={dropdownRef}>
                                      {(row.revenue?.partyType?.toUpperCase() === 'AGENT' || row.revenue?.partyType?.toUpperCase() === 'CARRIER' ? shippingLines : 
                                        row.revenue?.partyType?.toUpperCase() === 'CUSTOMER' ? organizations : [])
                                        .filter(item => !row.revenue?.partyName || (item.name && item.name.toLowerCase().includes(row.revenue.partyName.toLowerCase())))
                                        .slice(0, 20)
                                        .map((item, idx) => (
                                          <li key={idx} className="ep-dropdown-item" onClick={() => handleSelectParty(i, 'revenue', item)}>
                                            <span className="ep-item-name">{item.name}</span>
                                            <span className="ep-item-sub">{item.city || 'Master Directory'}</span>
                                          </li>
                                        ))}
                                      {/* Click outside to close is handled by modal background or focus loss usually, but let's add no-results */}
                                      {((row.revenue?.partyType === 'Agent' || row.revenue?.partyType === 'Carrier' ? shippingLines : 
                                        row.revenue?.partyType === 'Customer' ? organizations : [])
                                        .filter(item => !row.revenue?.partyName || (item.name && item.name.toLowerCase().includes(row.revenue.partyName.toLowerCase())))
                                        .length === 0) && <li className="ep-dropdown-item"><span className="ep-item-sub">No results found</span></li>}
                                    </ul>
                                  )}
                                </div>
                                {row.revenue?.branchCode && <span className="ep-link" style={{ marginLeft: '6px', whiteSpace: 'nowrap' }}>{row.revenue.branchCode}</span>}
                              </div>
                              <div className="ep-row">
                                <span className="ep-label">Total Amount</span>
                                <div className="ep-inline">
                                  <input type="number" readOnly className="ep-read" style={{ background: '#f4f8fc' }} value={row.revenue?.amountINR || 0} />
                                  <span style={{ fontSize: '11px', color: '#555', paddingLeft: '4px' }}>INR</span>
                                </div>
                              </div>
                              {(() => {
                                const party = [...shippingLines, ...suppliers].find(p => p.name && p.name.toUpperCase() === row.revenue?.partyName?.toUpperCase());
                                if (party && party.branches?.length > 1) {
                                  return (
                                    <div className="ep-row">
                                      <span className="ep-label">Branch</span>
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
                            </div>
                            <div className="ep-copy-row">
                              Copy to Cost <input type="checkbox" checked={row.copyToCost || false} onChange={e => handleFieldChange(i, 'copyToCost', e.target.checked)} />
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}

                    {/* --- COST ROW --- */}
                    <tr style={{ cursor: 'pointer' }} onClick={() => togglePanel(i, 'cost')}>
                      <td className="row-label">Cost</td>
                      <td>{row.cost?.basis || 'Per S/B'}</td>
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
                              <span className="ep-label">Charge Description</span>
                              <input type="text" className="ep-desc-input" value={row.cost?.chargeDescription || ''} onChange={e => handleFieldChange(i, 'chargeDescription', e.target.value, 'cost')} />
                            </div>
                            <div className="ep-desc-row">
                                <span className="ep-label">Attachment</span>
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
                                                href={url && url.toString().startsWith('http') ? url : '#'}
                                                onClick={(e) => { if (!url || !url.toString().startsWith('http')) e.preventDefault(); }}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                clickable
                                                sx={{ maxWidth: "180px", fontSize: "10px", height: "22px", backgroundColor: "#e3f2fd", color: "#1565c0" }}
                                            />
                                        ))
                                    ) : (
                                        <span style={{ fontSize: '11px', color: '#8aA0b0', fontStyle: 'italic' }}>No files attached</span>
                                    )}
                                    <button type="button" className="upload-btn" style={{ padding: '2px 8px' }} onClick={() => { setUploadIndex(i); setUploadSection('cost'); }}>
                                        {Array.isArray(row.cost?.url) && row.cost.url.length > 0 ? 'Edit Files' : 'Upload Files'}
                                    </button>
                                </div>
                            </div>
                            <div className="ep-grid" style={{ marginRight: '30px' }}>
                              <div className="ep-row">
                                <span className="ep-label">Basis</span>
                                <select className="ep-select" value={row.cost?.basis || 'Per S/B'} onChange={e => handleFieldChange(i, 'basis', e.target.value, 'cost')}>
                                  <option>Per S/B</option>
                                  <option>Per Invoice</option>
                                  <option>Per Container</option>
                                </select>
                              </div>
                              <div className="ep-row">
                                <span className="ep-label">Override Auto Rate</span>
                                <input type="checkbox" checked={row.cost?.overrideAutoRate || false} onChange={e => handleFieldChange(i, 'overrideAutoRate', e.target.checked, 'cost')} />
                              </div>
                              <div className="ep-row">
                                <span className="ep-label">Qty/Unit</span>
                                <div className="ep-inline">
                                  <input type="number" step="0.01" value={row.cost?.qty ?? 1.00} onChange={e => handleFieldChange(i, 'qty', e.target.value, 'cost')} />
                                  <input type="text" value={row.cost?.unit || ''} onChange={e => handleFieldChange(i, 'unit', e.target.value, 'cost')} />
                                </div>
                              </div>
                              <div className="ep-row">
                                <span className="ep-label">Payable Type</span>
                                <select className="ep-select" value={row.cost?.partyType || ''} onChange={e => handleFieldChange(i, 'partyType', e.target.value, 'cost')}>
                                  <option>Vendor</option><option>Transporter</option><option>Importer</option><option>Others</option><option>Agent</option>
                                </select>
                              </div>
                              <div className="ep-row">
                                <span className="ep-label">Rate</span>
                                <div className="ep-inline">
                                  <input type="number" step="0.01" value={row.cost?.rate ?? 0.00} onChange={e => handleFieldChange(i, 'rate', e.target.value, 'cost')} />
                                  <select value={row.cost?.currency || 'INR'} onChange={e => handleFieldChange(i, 'currency', e.target.value, 'cost')}>
                                    <option>INR</option><option>USD</option><option>EUR</option>
                                  </select>
                                </div>
                              </div>
                              <div className="ep-row">
                                <span className="ep-label">Payable To</span>
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
                                  {activeDropdown.index === i && activeDropdown.section === 'cost' && (row.cost?.partyName?.length >= 2) && (
                                    <ul className="ep-dropdown-list" ref={dropdownRef}>
                                      {(row.cost?.partyType?.toUpperCase() === 'AGENT' || row.cost?.partyType?.toUpperCase() === 'OTHERS' ? shippingLines : 
                                        row.cost?.partyType?.toUpperCase() === 'VENDOR' || row.cost?.partyType?.toUpperCase() === 'TRANSPORTER' ? [...suppliers, ...shippingLines] :
                                        row.cost?.partyType?.toUpperCase() === 'IMPORTER' ? organizations : [])
                                        .filter(item => !row.cost?.partyName || (item.name && item.name.toLowerCase().includes(row.cost.partyName.toLowerCase())))
                                        .slice(0, 20)
                                        .map((item, idx) => (
                                          <li key={idx} className="ep-dropdown-item" onClick={() => handleSelectParty(i, 'cost', item)}>
                                            <span className="ep-item-name">{item.name}</span>
                                            <span className="ep-item-sub">{item.city || 'Master Directory'}</span>
                                          </li>
                                        ))}
                                      {((row.cost?.partyType === 'Agent' || row.cost?.partyType === 'Others' ? shippingLines : 
                                        row.cost?.partyType === 'Vendor' || row.cost?.partyType === 'Transporter' ? [...suppliers, ...shippingLines] :
                                        row.cost?.partyType === 'Importer' ? organizations : [])
                                        .filter(item => !row.cost?.partyName || (item.name && item.name.toLowerCase().includes(row.cost.partyName.toLowerCase())))
                                        .length === 0) && <li className="ep-dropdown-item"><span className="ep-item-sub">No results found</span></li>}
                                    </ul>
                                  )}
                                </div>
                              </div>
                              <div className="ep-row">
                                <span className="ep-label">Total Amount</span>
                                <div className="ep-inline">
                                  <input type="number" readOnly className="ep-read" style={{ background: '#f4f8fc' }} value={row.cost?.amountINR || 0} />
                                  <span style={{ fontSize: '11px', color: '#555', paddingLeft: '4px' }}>INR</span>
                                </div>
                              </div>
                              {(() => {
                                const party = [...shippingLines, ...suppliers].find(p => p.name && p.name.toUpperCase() === row.cost?.partyName?.toUpperCase());
                                if (party && party.branches?.length > 1) {
                                  return (
                                    <div className="ep-row">
                                      <span className="ep-label">Branch</span>
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
                                <span className="ep-label">Include GST?</span>
                                <div className="ep-inline">
                                  <input type="checkbox" checked={row.cost?.isGst || false} onChange={e => handleFieldChange(i, 'isGst', e.target.checked, 'cost')} />
                                  {row.cost?.isGst && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                      <input type="number" style={{ width: '50px' }} value={row.cost?.gstRate ?? 18} onChange={e => handleFieldChange(i, 'gstRate', e.target.value, 'cost')} />
                                      <span style={{ fontSize: '11px' }}>%</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="ep-row">
                                <span className="ep-label">Basic Amount</span>
                                <div className="ep-inline">
                                  <input type="number" readOnly className="ep-read" style={{ background: '#f4f8fc' }} value={formatNumber(row.cost?.basicAmount)} />
                                </div>
                              </div>
                              <div className="ep-row">
                                <span className="ep-label">GST Amount</span>
                                <div className="ep-inline">
                                  <input type="number" readOnly className="ep-read" style={{ background: '#f4f8fc' }} value={formatNumber(row.cost?.gstAmount)} />
                                </div>
                              </div>
                              <div className="ep-row">
                                <span className="ep-label">Apply TDS?</span>
                                <div className="ep-inline">
                                  <input type="checkbox" checked={row.cost?.isTds || false} onChange={e => handleFieldChange(i, 'isTds', e.target.checked, 'cost')} />
                                  {row.cost?.isTds && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                      <input type="number" style={{ width: '50px' }} value={row.cost?.tdsPercent ?? 0} onChange={e => handleFieldChange(i, 'tdsPercent', e.target.value, 'cost')} />
                                      <span style={{ fontSize: '11px' }}>%</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="ep-row">
                                <span className="ep-label">TDS Amount</span>
                                <div className="ep-inline">
                                  <input type="number" readOnly className="ep-read" style={{ background: '#f4f8fc' }} value={formatNumber(row.cost?.tdsAmount)} />
                                </div>
                              </div>
                              <div className="ep-row">
                                <span className="ep-label" style={{ fontWeight: 'bold', color: '#d32f2f' }}>Net Payable</span>
                                <div className="ep-inline">
                                  <input type="number" readOnly className="ep-read" style={{ background: '#fff9f9', fontWeight: 'bold', color: '#d32f2f', border: '1px solid #ffcdd2' }} value={formatNumber(row.cost?.netPayable)} />
                                  {!row.purchase_book_no && (
                                    <button 
                                      type="button" 
                                      className="upload-btn" 
                                      style={{ 
                                        marginRight: '10px', 
                                        backgroundColor: '#1976d2', 
                                        color: '#fff', 
                                        borderColor: '#1565c0' 
                                      }}
                                      onClick={() => {
                                        const partyName = row.cost?.partyName;
                                        const partyDetails = [...shippingLines, ...suppliers].find(p => p.name?.toUpperCase() === partyName?.toUpperCase());
                                        setPurchaseBookData(() => {
                                          const cost = row.cost || {};
                                          const rate = parseFloat(cost.gstRate) || 18;
                                          const amt = parseFloat(cost.amount) || 0;
                                          const includeGst = cost.isGst || false;
                                          
                                          let basic = amt;
                                          let totalGst = 0;
                                          
                                          if (includeGst) {
                                            basic = amt / (1 + (rate / 100));
                                            totalGst = amt - basic;
                                          } else {
                                            totalGst = amt * (rate / 100);
                                          }

                                          const branch = partyDetails?.branches?.[cost.branchIndex || 0] || {};
                                          const isGujarat = branch.gst?.startsWith('24');

                                          return {
                                            partyName,
                                            partyDetails,
                                            amount: amt,
                                            basicAmount: basic,
                                            gstAmount: totalGst,
                                            gstRate: rate,
                                            cgst: isGujarat ? totalGst / 2 : 0,
                                            sgst: isGujarat ? totalGst / 2 : 0,
                                            igst: !isGujarat ? totalGst : 0,
                                            tdsAmount: cost.tdsAmount,
                                            netPayable: cost.netPayable,
                                            totalAmount: cost.totalAmount,
                                            chargeHead: row.chargeHead,
                                            invoice_number: row.invoice_number,
                                            invoice_date: row.invoice_date,
                                            cthNo: jobCthNo,
                                            jobDisplayNumber,
                                            branchIndex: cost.branchIndex || 0,
                                            chargeId: row._id,
                                            jobId: parentId
                                          };
                                        });
                                      }}
                                    >
                                      Purchase book
                                    </button>
                                  )}
                                  {!row.payment_request_no && (
                                    <button 
                                      type="button" 
                                      className="upload-btn" 
                                      style={{ backgroundColor: '#d32f2f', color: '#fff', borderColor: '#b71c1c' }}
                                      onClick={() => {
                                        const partyName = row.cost?.partyName;
                                        const partyDetails = [...shippingLines, ...suppliers].find(p => p.name?.toUpperCase() === partyName?.toUpperCase());
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
        jobYear={jobYear}
        onSuccess={(requestNo) => {
          // Update the localized formData state with the new number
          const updated = [...formData];
          const activeIndex = formData.findIndex(c => c.chargeHead === paymentRequestData.chargeHead);
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
    </div>
  );
};

export default memo(EditChargeModal);
