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
      <th style={{ width: '120px', textAlign: 'left' }}>Category</th>
      <th style={{ textAlign: 'left' }}>Charge Description</th>
      <th style={{ width: '200px', textAlign: 'left' }}>Remarks</th>
      <th style={{ width: '100px', textAlign: 'center' }}>Attach</th>
    </>
  );

  const renderRevenueHeaders = () => (
    <>
      <th style={{ width: '150px', textAlign: 'left' }}>Receivable Party</th>
      <th style={{ width: '80px', textAlign: 'center' }}>Basis</th>
      <th style={{ width: '50px', textAlign: 'center' }}>Curr.</th>
      <th style={{ width: '70px', textAlign: 'right' }}>Ex. Rate</th>
      <th style={{ width: '50px', textAlign: 'center' }}>Qty</th>
      <th style={{ width: '80px', textAlign: 'right' }}>Rate</th>
      <th style={{ width: '100px', textAlign: 'right' }}>Total Amount</th>
      <th style={{ width: '100px', textAlign: 'right' }}>Total Amt (INR)</th>
      <th style={{ width: '150px', textAlign: 'center' }}>Attach</th>
    </>
  );

  const renderCostHeaders = () => (
    <>
      <th style={{ width: '150px', textAlign: 'left' }}>Payable Party</th>
      <th style={{ width: '80px', textAlign: 'center' }}>Basis</th>
      <th style={{ width: '50px', textAlign: 'center' }}>Curr.</th>
      <th style={{ width: '70px', textAlign: 'right' }}>Ex. Rate</th>
      <th style={{ width: '50px', textAlign: 'center' }}>Qty</th>
      <th style={{ width: '80px', textAlign: 'right' }}>Rate</th>
      <th style={{ width: '100px', textAlign: 'right' }}>Total Amount</th>
      <th style={{ width: '100px', textAlign: 'right' }}>Total Amt (INR)</th>
      <th style={{ width: '100px', textAlign: 'right' }}>Net Payable</th>
      <th style={{ width: '150px', textAlign: 'center' }}>Attach</th>
    </>
  );

  const renderAttachmentCell = (ch, urls) => (
    <td className="upload-cell align-center" onClick={(e) => e.stopPropagation()}>
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
            <th style={{ width: '35px', textAlign: 'center' }}>
              <input type="checkbox" onChange={onSelectAll} disabled={readOnly} />
            </th>
            <th style={{ width: '35px', textAlign: 'center' }}>No.</th>
            <th style={{ width: '220px', textAlign: 'left' }}>Charge Item</th>
            {activeTab === 'particulars' && renderParticularsHeaders()}
            {activeTab === 'revenue' && renderRevenueHeaders()}
            {activeTab === 'cost' && renderCostHeaders()}
          </tr>
        </thead>
        <tbody>
          {charges.length === 0 ? (
            <tr>
              <td colSpan="20" style={{ textAlign: 'center', padding: '40px', color: '#64748b', fontSize: '13px' }}>
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
                <td className="align-center" onClick={(e) => e.stopPropagation()}>
                  <input type="checkbox" checked={isSelected} onChange={() => onSelectCharge(ch._id)} disabled={readOnly} />
                </td>
                <td className="align-center">{idx + 1}</td>
                <td className="align-left">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <span style={{ fontWeight: 800, color: '#1e293b' }}>{ch.chargeHead}</span>
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                      {ch.chargeType && (
                        <span style={{ fontSize: '9px', padding: '1px 6px', borderRadius: '4px', background: ch.chargeType === 'Margin' ? '#e0f2fe' : '#fef3c7', color: ch.chargeType === 'Margin' ? '#0369a1' : '#b45309', fontWeight: 'bold' }}>
                          {ch.chargeType}
                        </span>
                      )}
                      {ch.isPbMandatory && <span style={{ fontSize: '8px', color: '#d32f2f', fontWeight: 'bold', border: '1px solid #d32f2f', padding: '0 4px', borderRadius: '2px' }}>MANDATORY</span>}
                      {ch.purchase_book_no && (
                        <span style={{ fontSize: '9px', padding: '1px 6px', borderRadius: '4px', background: '#e3f2fd', color: '#1565c0', border: '1px solid #bbdefb' }}>
                          PB: {ch.purchase_book_no}
                        </span>
                      )}
                      {ch.payment_request_no && (
                        <span style={{ fontSize: '9px', padding: '1px 6px', borderRadius: '4px', background: '#ffebee', color: '#c62828', border: '1px solid #ffcdd2' }}>
                          PR: {ch.payment_request_no}
                        </span>
                      )}
                    </div>
                  </div>
                </td>

                {activeTab === 'particulars' && (
                  <>
                    <td className="align-left" style={{ fontSize: '11px', fontWeight: 'bold', color: ch.chargeType === 'Margin' ? '#0369a1' : '#b45309' }}>
                      {ch.chargeType || ch.category || '-'}
                    </td>
                    <td className="align-left" style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={ch.cost?.chargeDescription || ch.revenue?.chargeDescription || ''}>
                      {ch.cost?.chargeDescription || ch.revenue?.chargeDescription || ''}
                    </td>
                    <td className="align-left" style={{ maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={ch.remark || ''}>
                      {ch.remark || ''}
                    </td>
                    {renderAttachmentCell(ch, ch.revenue?.url)}
                  </>
                )}

                {activeTab === 'revenue' && (
                  <>
                    <td className="align-left" style={{ maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ch.revenue?.partyName || '-'}</td>
                    <td className="align-center">{ch.revenue?.basis || '-'}</td>
                    <td className="align-center">{ch.revenue?.currency || 'INR'}</td>
                    <td className="number">{formatNumber(ch.revenue?.exchangeRate)}</td>
                    <td className="align-center">{ch.revenue?.qty || 0}</td>
                    <td className="number">{formatNumber(ch.revenue?.rate)}</td>
                    <td className="number" style={{ fontWeight: 'bold' }}>{formatNumber(ch.revenue?.amount)}</td>
                    <td className="number" style={{ fontWeight: 'bold', color: '#059669' }}>{formatNumber(ch.revenue?.amountINR)}</td>
                    {renderAttachmentCell(ch, ch.revenue?.url)}
                  </>
                )}

                {activeTab === 'cost' && (
                  <>
                    <td className="align-left" style={{ maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ch.cost?.partyName || '-'}</td>
                    <td className="align-center">{ch.cost?.basis || '-'}</td>
                    <td className="align-center">{ch.cost?.currency || 'INR'}</td>
                    <td className="number">{formatNumber(ch.cost?.exchangeRate)}</td>
                    <td className="align-center">{ch.cost?.qty || 0}</td>
                    <td className="number">{formatNumber(ch.cost?.rate)}</td>
                    <td className="number" style={{ fontWeight: 'bold' }}>{formatNumber(ch.cost?.amount)}</td>
                    <td className="number" style={{ fontWeight: 'bold', color: '#ea580c' }}>{formatNumber(ch.cost?.amountINR)}</td>
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
