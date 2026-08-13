import React, { useState } from 'react';
import TabBar from './TabBar';
import Toolbar from './Toolbar';
import ChargesTable from './ChargesTable';
import AddChargeModal from './AddChargeModal';
import EditChargeModal from './EditChargeModal';
import FileUploadModal from './FileUploadModal';
import ConfirmDialog from './ConfirmDialog';
import MultiPurchaseBookModal from './MultiPurchaseBookModal';
import { useCharges } from './useCharges';
import './charges.css';
import axios from 'axios';

import { buildCostSheetTemplate } from './buildCostSheetTemplate';
import DocumentEditorDialog from '../Export/Export-Dsr/StandardDocuments/DocumentEditorDialog';
import logo from '../../assets/images/surajCompanyLogo.jpeg';
import { imageToBase64 } from '../../utils/imageUtils';

const ChargesGrid = ({
  parentId,
  parentModule,
  readOnly = false,
  isEditable = true,
  initialTab = 'particulars',
  hideTabs = false,
  shippingLineAirline = '',
  exporterName = '',
  jobNumber = '',
  jobDisplayNumber = '',
  jobYear = '',
  jobDate = '',
  invoiceNumber = '',
  invoiceDate = '',
  invoiceValue = '',
  invoiceCount = 1,
  containerCount = 0,
  cthNo = '',
  onChargesCountChange = () => {},
  job = {}
}) => {
  const finalReadOnly = readOnly || !isEditable;
  const { charges, loading, error, addChargesBulk, updateCharge, deleteCharge } = useCharges(parentId, parentModule);

  React.useEffect(() => {
    if (charges) {
      onChargesCountChange(charges.length);
    }
  }, [charges, onChargesCountChange]);

  const [activeTab, setActiveTab] = useState(initialTab);
  const [selectedIds, setSelectedIds] = useState(new Set());

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingCharges, setEditingCharges] = useState([]);

  const [fileModalCharge, setFileModalCharge] = useState(null); // { charge: object, tab: 'revenue' | 'cost' | 'particulars' }
  const [confirmState, setConfirmState] = useState({ open: false, title: '', message: '', onConfirm: null });
  const [multiPbChargesData, setMultiPbChargesData] = useState(null);

  const [costSheetOpen, setCostSheetOpen] = useState(false);
  const [costSheetHtml, setCostSheetHtml] = useState("");

  const handleMultiPurchaseBook = async () => {
    const selectedCharges = charges.filter(c => selectedIds.has(c._id));
    if (selectedCharges.length < 2) {
      alert("Please select at least 2 charges to create a combined Purchase Book.");
      return;
    }

    // Check if any selected charge already has a PB
    const existingPb = selectedCharges.filter(c => c.purchase_book_no);
    if (existingPb.length > 0) {
      alert(`The following charge(s) already have a Purchase Book Entry:\n${existingPb.map(c => `• ${c.chargeHead} (${c.purchase_book_no})`).join('\n')}\n\nPlease unselect them before proceeding.`);
      return;
    }

    // Validate that all selected charges have cost partyName
    const missingParty = selectedCharges.filter(c => !c.cost?.partyName);
    if (missingParty.length > 0) {
      alert(`The following charge(s) are missing supplier/party name in Cost section:\n${missingParty.map(c => `• ${c.chargeHead}`).join('\n')}`);
      return;
    }

    // Validate that all selected charges belong to the same supplier/party
    const normalize = (str) => (str || '').toString().replace(/[^a-z0-9]/gi, '').toUpperCase();
    const firstPartyNorm = normalize(selectedCharges[0].cost.partyName);
    const mismatchedParty = selectedCharges.filter(c => normalize(c.cost.partyName) !== firstPartyNorm);
    if (mismatchedParty.length > 0) {
      alert(`All selected charges must belong to the SAME supplier/party.\n\nFirst supplier: "${selectedCharges[0].cost.partyName}"\nMismatched charges:\n${mismatchedParty.map(c => `• ${c.chargeHead}: "${c.cost.partyName}"`).join('\n')}`);
      return;
    }

    // Validate that all selected charges have the SAME Supplier Invoice Number (if filled)
    const setInvNumbers = [...new Set(selectedCharges.map(c => (c.invoice_number || c.cost?.invoiceNo || '').toString().trim()).filter(Boolean))];
    if (setInvNumbers.length > 1) {
      alert(`All selected charges must have the SAME Supplier Invoice Number.\n\nMismatched Supplier Invoice Numbers found:\n${setInvNumbers.map(n => `• "${n}"`).join('\n')}\n\nPlease ensure the supplier invoice number is common across selected charges before creating a combined Purchase Book.`);
      return;
    }

    // Validate that all selected charges have the SAME Supplier Invoice Date (if filled)
    const setInvDates = [...new Set(selectedCharges.map(c => (c.invoice_date || c.cost?.invoiceDate || '').toString().trim()).filter(Boolean))];
    if (setInvDates.length > 1) {
      alert(`All selected charges must have the SAME Supplier Invoice Date.\n\nMismatched Supplier Invoice Dates found:\n${setInvDates.map(d => `• "${d}"`).join('\n')}\n\nPlease ensure the supplier invoice date is common across selected charges before creating a combined Purchase Book.`);
      return;
    }

    // Fetch directory party details for the supplier
    let partyDetails = null;
    const targetPartyName = selectedCharges[0].cost.partyName;
    try {
      const [slRes, supRes, orgRes, cfsRes, transRes, termRes, fwdRes] = await Promise.all([
        axios.get(`${import.meta.env.VITE_API_STRING}/get-shipping-lines`),
        axios.get(`${import.meta.env.VITE_API_STRING}/get-suppliers`),
        axios.get(`${import.meta.env.VITE_API_STRING}/organization`),
        axios.get(`${import.meta.env.VITE_API_STRING}/get-cfs-list`),
        axios.get(`${import.meta.env.VITE_API_STRING}/get-transporters`),
        axios.get(`${import.meta.env.VITE_API_STRING}/get-terminal-codes`),
        axios.get(`${import.meta.env.VITE_API_STRING}/get-forwarders`)
      ]);
      const allParties = [
        ...(slRes.data || []),
        ...(supRes.data || []),
        ...(orgRes.data?.organizations || []),
        ...(cfsRes.data || []),
        ...(transRes.data || []),
        ...(termRes.data || []),
        ...(fwdRes.data || [])
      ];
      const allMatches = allParties.filter(p => normalize(p.name || p.organization) === firstPartyNorm);
      partyDetails = allMatches.find(p => (p.branches?.length > 0 && p.branches[0]?.gst) || (p.branchInfo?.length > 0 && p.branchInfo[0]?.gstNo)) || allMatches[0];
    } catch (err) {
      console.error("Failed to fetch party directory details:", err);
    }

    // Construct structured array for MultiPurchaseBookModal
    const formattedData = selectedCharges.map(c => {
      const cost = c.cost || {};
      const revenue = c.revenue || {};
      return {
        partyName: targetPartyName,
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
        amountINR: cost.amountINR,
        totalAmount: cost.amountINR,
        revenueAmount: revenue.amount,
        revenueBasicAmount: revenue.basicAmount,
        revenueGstAmount: revenue.gstAmount,
        revenueGstRate: revenue.gstRate,
        revenueCgst: revenue.cgst,
        revenueSgst: revenue.sgst,
        revenueIgst: revenue.igst,
        revenueTotal: revenue.amountINR || revenue.totalAmount || revenue.amount,
        revenuePartyName: revenue.partyName,
        chargeHead: c.name || c.chargeHead,
        chargeType: c.chargeType,
        category: c.category,
        tdsCategory: cost.tdsCategory,
        invoice_number: c.invoice_number,
        invoice_date: c.invoice_date,
        jobDisplayNumber: jobDisplayNumber,
        cthNo: c.hsnCode,
        chargeId: c._id,
        jobId: parentId,
        branchIndex: cost.branchIndex || 0,
        isClubJob: c.isClubJob || false,
        clubbedJobs: c.clubbedJobs || [],
        virtualBalanceTerminal: cost.virtualBalanceTerminal || ''
      };
    });

    setMultiPbChargesData(formattedData);
  };

  const handleCostSheetClick = async () => {
    let logoSrc = "";
    try {
      logoSrc = await imageToBase64(logo);
    } catch (err) {
      console.warn("Failed to convert logo to base64", err);
    }
    const html = buildCostSheetTemplate(job, charges, logoSrc);
    setCostSheetHtml(html);
    setCostSheetOpen(true);
  };

  const handleSelectCharge = (id) => {
    const newSel = new Set(selectedIds);
    if (newSel.has(id)) newSel.delete(id);
    else newSel.add(id);
    setSelectedIds(newSel);
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(new Set(charges.map(c => c._id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleAddSelected = async (selectedHeads) => {
    const newCharges = selectedHeads.map(head => {
      let finalName = head.name;
      const upperName = finalName.toUpperCase();

      if (upperName === 'SHIPPING LINE CHARGES' && shippingLineAirline) {
        finalName = shippingLineAirline;
      } else if ((upperName === 'DETENTION CHARGES' || upperName === 'DETENSION CHARGES') && shippingLineAirline) {
        finalName = `DETN.${shippingLineAirline}`;
      } else if (upperName === 'SECURITY DEPOSIT' && shippingLineAirline) {
        finalName = `SECU.DEPO.${shippingLineAirline}`;
      } else if (upperName === 'DAMAGE CHARGES' && shippingLineAirline) {
        finalName = `DAMAGE.${shippingLineAirline}`;
      }
      return {
        parentId,
        parentModule,
        chargeHead: finalName,
        category: head.category,
        chargeType: head.chargeType || 'Margin',
        isPbMandatory: head.isPbMandatory || false,
        hsnCode: head.hsnCode || '',
        tdsCategory: head.tdsCategory || '',
        revenue: {
          partyType: 'Customer',
          isGst: true,
          isTds: !!head.tdsCategory,
          tdsPercent: head.tdsCategory ? 2 : 0,
          tdsCategory: head.tdsCategory || ''
        },
        cost: {
          partyType: 'Others',
          isGst: true,
          isTds: !!head.tdsCategory,
          tdsPercent: head.tdsCategory ? 2 : 0,
          tdsCategory: head.tdsCategory || ''
        },
        copyToCost: true
      };
    });
    await addChargesBulk(newCharges);
    setIsAddOpen(false);
  };

  const handleSaveEdit = async (updatedCharges, shouldClose = true) => {
    for (const charge of updatedCharges) {
      await updateCharge(charge._id, charge);
    }
    if (shouldClose) {
      setEditingCharges([]);
      setSelectedIds(new Set());
    }
  };

  const handleDeleteSelected = async () => {
    // Check if any selected charges have approved payment requests
    const approvedCharges = charges.filter(c => selectedIds.has(c._id) && c.payment_request_is_approved);
    const deletableIds = [...selectedIds].filter(id => !approvedCharges.find(c => c._id === id));

    if (approvedCharges.length > 0 && deletableIds.length === 0) {
      alert(`Cannot delete: All selected charges have approved payment requests.\n\nProtected charges:\n${approvedCharges.map(c => `• ${c.chargeHead}`).join('\n')}`);
      return;
    }

    let message = `Are you sure you want to delete ${deletableIds.length} selected charge(s)? This action cannot be undone.`;
    if (approvedCharges.length > 0) {
      message += `\n\nNote: ${approvedCharges.length} charge(s) with approved payment requests will be skipped:\n${approvedCharges.map(c => `• ${c.chargeHead}`).join('\n')}`;
    }

    setConfirmState({
      open: true,
      title: 'Delete Charges',
      message,
      onConfirm: async () => {
        for (const id of deletableIds) {
          await deleteCharge(id);
        }
        setSelectedIds(new Set());
        setConfirmState(prev => ({ ...prev, open: false }));
      }
    });
  };

  const handleAttachFiles = async (urls) => {
    if (fileModalCharge) {
      const { charge, tab } = fileModalCharge;
      const updateData = {};

      if (tab === 'revenue' || tab === 'particulars') {
        updateData.revenue = { ...(charge.revenue || {}), url: urls };
      } else if (tab === 'cost') {
        updateData.cost = { ...(charge.cost || {}), url: urls };
      }

      await updateCharge(charge._id, updateData);
      setFileModalCharge(null);
    }
  };

  const handleRemoveAttachment = async (charge, tab, newUrls) => {
    const updateData = {};
    if (tab === 'revenue' || tab === 'particulars') {
      updateData.revenue = { ...(charge.revenue || {}), url: newUrls };
    } else if (tab === 'cost') {
      updateData.cost = { ...(charge.cost || {}), url: newUrls };
    }
    await updateCharge(charge._id, updateData);
  };

  const isDeleteDisabled = selectedIds.size === 0 || finalReadOnly;

  return (
    <div className="charges-comp-wrapper">
      {error && <div style={{ color: 'red', marginBottom: '10px' }}>{error}</div>}

      {!hideTabs && <TabBar activeTab={activeTab} onTabChange={setActiveTab} />}

      <Toolbar
        onAddCharge={() => setIsAddOpen(true)}
        onDeleteSelected={handleDeleteSelected}
        readOnly={finalReadOnly}
        isDeleteDisabled={isDeleteDisabled}
        onCostSheetClick={jobNumber && (jobNumber.startsWith('FF') || jobNumber.startsWith('FF-SUC')) ? handleCostSheetClick : null}
        onMultiPurchaseBook={selectedIds.size >= 2 ? handleMultiPurchaseBook : null}
      />

      <div style={{ position: 'relative' }}>
        {loading && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: '#5580a8', zIndex: 10 }} />}
        <ChargesTable
          charges={charges}
          activeTab={activeTab}
          selectedIds={selectedIds}
          onSelectCharge={handleSelectCharge}
          onSelectAll={handleSelectAll}
          onOpenFileModal={(charge) => setFileModalCharge({ charge, tab: activeTab })}
          onRemoveAttachment={handleRemoveAttachment}
          onEditCharge={(charge) => setEditingCharges([charge])}
          readOnly={finalReadOnly}
        />
      </div>

      <AddChargeModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onAddSelected={handleAddSelected}
      />

      <EditChargeModal
        isOpen={editingCharges.length > 0}
        onClose={() => setEditingCharges([])}
        selectedCharges={editingCharges}
        onSave={handleSaveEdit}
        updateCharge={updateCharge}
        parentId={parentId}
        shippingLineAirline={shippingLineAirline}
        exporterName={exporterName}
        jobNumber={jobNumber}
        jobDisplayNumber={jobDisplayNumber}
        jobYear={jobYear}
        jobDate={jobDate}
        jobInvoiceNumber={invoiceNumber}
        jobInvoiceDate={invoiceDate}
        jobInvoiceValue={invoiceValue}
        jobInvoiceCount={invoiceCount}
        jobContainerCount={containerCount}
        jobCthNo={cthNo}
        viewOnly={finalReadOnly}
      />

      <MultiPurchaseBookModal
        isOpen={multiPbChargesData !== null}
        onClose={() => setMultiPbChargesData(null)}
        chargesData={multiPbChargesData}
        jobNumber={jobNumber}
        jobDisplayNumber={jobDisplayNumber}
        jobYear={jobYear}
        onSuccess={async (entryNo) => {
          if (multiPbChargesData && multiPbChargesData.length > 0) {
            for (const c of multiPbChargesData) {
              if (c.chargeId) {
                await updateCharge(c.chargeId, {
                  purchase_book_no: entryNo,
                  purchase_book_status: 'Pending'
                });
              }
            }
          }
          setSelectedIds(new Set());
          setMultiPbChargesData(null);
        }}
      />

      {fileModalCharge && (
        <FileUploadModal
          isOpen={!!fileModalCharge}
          onClose={() => setFileModalCharge(null)}
          chargeLabel={`${fileModalCharge.charge.chargeHead} (${fileModalCharge.tab})`}
          initialUrls={
            fileModalCharge.tab === 'cost'
              ? fileModalCharge.charge.cost?.url || []
              : fileModalCharge.charge.revenue?.url || []
          }
          onAttach={handleAttachFiles}
        />
      )}

      <ConfirmDialog
        open={confirmState.open}
        title={confirmState.title}
        message={confirmState.message}
        onConfirm={confirmState.onConfirm}
        onCancel={() => setConfirmState(prev => ({ ...prev, open: false }))}
      />

      <DocumentEditorDialog
        open={costSheetOpen}
        onClose={() => setCostSheetOpen(false)}
        initialContent={costSheetHtml}
        title={`Freight Forwarding Cost Sheet - ${jobNumber}`}
        pdfOptions={{
          orientation: "landscape",
          format: "a4",
          width: 790,
          windowWidth: 1100,
          margin: [20, 20, 20, 20],
        }}
      />
    </div>
  );
};

export default ChargesGrid;
