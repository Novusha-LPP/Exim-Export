import React, { useState } from 'react';
import TabBar from './TabBar';
import Toolbar from './Toolbar';
import ChargesTable from './ChargesTable';
import AddChargeModal from './AddChargeModal';
import EditChargeModal from './EditChargeModal';
import FileUploadModal from './FileUploadModal';
import ConfirmDialog from './ConfirmDialog';
import { useCharges } from './useCharges';
import './charges.css';

const ChargesGrid = ({
  parentId,
  parentModule,
  readOnly = false,
  initialTab = 'particulars',
  hideTabs = false,
  shippingLineAirline = '',
  exporterName = '',
  jobNumber = '',
  jobDisplayNumber = '',
  jobYear = '',
  invoiceNumber = '',
  invoiceDate = '',
  invoiceValue = '',
  invoiceCount = 1,
  containerCount = 0,
  cthNo = '',
  onChargesCountChange = () => {}
}) => {
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
        revenue: {},
        cost: {},
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
    setConfirmState({
      open: true,
      title: 'Delete Charges',
      message: `Are you sure you want to delete ${selectedIds.size} selected charges? This action cannot be undone.`,
      onConfirm: async () => {
        for (const id of selectedIds) {
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

  const isDeleteDisabled = selectedIds.size === 0 || readOnly;

  return (
    <div className="charges-comp-wrapper">
      {error && <div style={{ color: 'red', marginBottom: '10px' }}>{error}</div>}

      {!hideTabs && <TabBar activeTab={activeTab} onTabChange={setActiveTab} />}

      <Toolbar
        onAddCharge={() => setIsAddOpen(true)}
        onDeleteSelected={handleDeleteSelected}
        readOnly={readOnly}
        isDeleteDisabled={isDeleteDisabled}
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
          readOnly={readOnly}
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
        jobInvoiceNumber={invoiceNumber}
        jobInvoiceDate={invoiceDate}
        jobInvoiceValue={invoiceValue}
        jobInvoiceCount={invoiceCount}
        jobContainerCount={containerCount}
        jobCthNo={cthNo}
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
    </div>
  );
};

export default ChargesGrid;
