import React from 'react';
import { Chip } from '@mui/material';
import DescriptionIcon from '@mui/icons-material/Description';
import './charges.css';

const extractFileName = (url) => {
  try {
      if (!url) return "File";
      const parts = url.split("/");
      return decodeURIComponent(parts[parts.length - 1]);
  } catch (error) {
      return "File";
  }
};

const ChargesTable = ({ 
  charges, 
  activeTab, 
  selectedIds, 
  onSelectCharge, 
  onSelectAll, 
  onOpenFileModal,
  onRemoveAttachment,
  onEditCharge,
  readOnly 
}) => {
  const formatNumber = (num) => {
    if (num === null || num === undefined) return '0.00';
    return Number(num).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const renderParticularsHeaders = () => (
    <>
      <th>Category</th>
      <th>Charge Description</th>
      <th>Remarks</th>
      <th style={{ width: '100px' }}>Attach</th>
    </>
  );

  const renderRevenueHeaders = () => (
    <>
      <th style={{ width: '120px' }}>Receivable Party</th>
      <th style={{ width: '80px' }}>Basis</th>
      <th style={{ width: '40px' }}>Curr.</th>
      <th style={{ width: '60px' }}>Ex. Rate</th>
      <th style={{ width: '50px' }}>Qty</th>
      <th style={{ width: '80px' }}>Rate</th>
      <th style={{ width: '95px' }}>Total Amount</th>
      <th style={{ width: '95px' }}>Total Amt (INR)</th>
      <th style={{ width: '180px' }}>Attach</th>
    </>
  );

  const renderCostHeaders = () => (
    <>
      <th style={{ width: '120px' }}>Payable Party</th>
      <th style={{ width: '80px' }}>Basis</th>
      <th style={{ width: '40px' }}>Curr.</th>
      <th style={{ width: '60px' }}>Ex. Rate</th>
      <th style={{ width: '50px' }}>Qty</th>
      <th style={{ width: '80px' }}>Rate</th>
      <th style={{ width: '95px' }}>Total Amount</th>
      <th style={{ width: '95px' }}>Total Amt (INR)</th>
      <th style={{ width: '95px' }}>Net Payable</th>
      <th style={{ width: '180px' }}>Attach</th>
    </>
  );

  const renderAttachmentCell = (ch, urls) => (
    <td className="upload-cell" onClick={(e) => e.stopPropagation()}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", alignItems: "center", justifyContent: "center" }}>
        {Array.isArray(urls) && urls.map((url, urlIdx) => (
          <Chip
              key={urlIdx}
              icon={<DescriptionIcon style={{ fontSize: "12px" }} />}
              label={
                <a 
                  href={url} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  onClick={(e) => e.stopPropagation()} 
                  style={{ color: 'inherit', textDecoration: 'none' }}
                >
                  {extractFileName(url)}
                </a>
              }
              size="small"
              onDelete={readOnly ? undefined : (e) => {
                e.stopPropagation();
                e.preventDefault();
                const newUrls = urls.filter((_, i) => i !== urlIdx);
                onRemoveAttachment(ch, activeTab, newUrls);
              }}
              clickable
              sx={{
                  maxWidth: "130px",
                  fontSize: "9px",
                  height: "18px",
                  backgroundColor: "#e3f2fd",
                  color: "#1565c0",
                  "& .MuiChip-label": { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", padding: "0 4px" },
                  "& .MuiChip-deleteIcon": { 
                    fontSize: "14px", 
                    margin: "0 2px 0 -4px",
                    color: "#d32f2f !important",
                    opacity: 0.8,
                    "&:hover": { opacity: 1 }
                  }
              }}
          />
        ))}
        <button 
           type="button"
           className="upload-btn" 
           onClick={() => onOpenFileModal(ch)}
           disabled={readOnly}
           style={{ padding: "1px 4px", fontSize: "9px" }}
        >
          {Array.isArray(urls) && urls.length > 0 ? '+' : '⇧'}
        </button>
      </div>
    </td>
  );

  return (
    <div className="grid-wrapper" style={{ marginTop: '0' }}>
      <table className="main-grid">
        <thead>
          <tr className="header">
            <th style={{ width: '30px', textAlign: 'center' }}>
              <input type="checkbox" onChange={onSelectAll} disabled={readOnly} />
            </th>
            <th style={{ width: '30px', textAlign: 'center' }}>No.</th>
            <th style={{ width: '180px', textAlign: 'left' }}>Charge Item</th>
            {activeTab === 'particulars' && renderParticularsHeaders()}
            {activeTab === 'revenue' && renderRevenueHeaders()}
            {activeTab === 'cost' && renderCostHeaders()}
          </tr>
        </thead>
        <tbody>
          {charges.length === 0 ? (
            <tr>
              <td colSpan="20" style={{ textAlign: 'center', padding: '20px', color: '#8aA0b0' }}>
                No charges found. Add a charge to get started.
              </td>
            </tr>
          ) : charges.map((ch, idx) => {
            const isSelected = selectedIds.has(ch._id);
            
            return (
              <tr 
                key={ch._id || idx} 
                className={isSelected ? 'selected' : ''} 
                onClick={() => !readOnly && onSelectCharge(ch._id)}
                onDoubleClick={() => !readOnly && onEditCharge(ch)}
              >
                <td style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                  <input type="checkbox" checked={isSelected} onChange={() => onSelectCharge(ch._id)} disabled={readOnly} />
                </td>
                <td style={{ textAlign: 'center' }}>{idx + 1}</td>
                <td style={{ fontWeight: 'bold', color: '#1a3a5c', textAlign: 'left' }}>{ch.chargeHead}</td>
                
                {activeTab === 'particulars' && (
                  <>
                    <td>{ch.category}</td>
                    <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={ch.cost?.chargeDescription || ch.revenue?.chargeDescription || ''}>
                      {ch.cost?.chargeDescription || ch.revenue?.chargeDescription || ''}
                    </td>
                    <td style={{ maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={ch.remark || ''}>
                      {ch.remark || ''}
                    </td>
                    {renderAttachmentCell(ch, ch.revenue?.url)}
                  </>
                )}

                {activeTab === 'revenue' && (
                  <>
                    <td style={{ maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ch.revenue?.partyName || '-'}</td>
                    <td>{ch.revenue?.basis || '-'}</td>
                    <td>{ch.revenue?.currency || 'INR'}</td>
                    <td className="number">{formatNumber(ch.revenue?.exchangeRate)}</td>
                    <td className="number">{ch.revenue?.qty || 0}</td>
                    <td className="number">{formatNumber(ch.revenue?.rate)}</td>
                    <td className="number" style={{ fontWeight: 'bold' }}>{formatNumber(ch.revenue?.amount)}</td>
                    <td className="number" style={{ fontWeight: 'bold', color: '#0a5080' }}>{formatNumber(ch.revenue?.amountINR)}</td>
                    {renderAttachmentCell(ch, ch.revenue?.url)}
                  </>
                )}

                {activeTab === 'cost' && (
                  <>
                    <td style={{ maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ch.cost?.partyName || '-'}</td>
                    <td>{ch.cost?.basis || '-'}</td>
                    <td>{ch.cost?.currency || 'INR'}</td>
                    <td className="number">{formatNumber(ch.cost?.exchangeRate)}</td>
                    <td className="number">{ch.cost?.qty || 0}</td>
                    <td className="number">{formatNumber(ch.cost?.rate)}</td>
                    <td className="number" style={{ fontWeight: 'bold' }}>{formatNumber(ch.cost?.amount)}</td>
                    <td className="number" style={{ fontWeight: 'bold', color: '#6c4a30' }}>{formatNumber(ch.cost?.amountINR)}</td>
                    <td className="number" style={{ fontWeight: 'bold', color: '#d32f2f' }}>{formatNumber(ch.cost?.netPayable)}</td>
                    {renderAttachmentCell(ch, ch.cost?.url)}
                  </>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default ChargesTable;
