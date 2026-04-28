import React, { useState, useEffect, useContext } from 'react';
import { useChargeHeads } from './useChargeHeads';
import { UserContext } from '../../contexts/UserContext';

const AddChargeModal = ({ isOpen, onClose, onAddSelected }) => {
  const { user } = useContext(UserContext);
  const isAdmin = user?.role === 'Admin';
  const { chargeHeads, fetchChargeHeads, addChargeHead, updateChargeHead, deleteChargeHead } = useChargeHeads();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedNames, setSelectedNames] = useState(new Set());
  const [customName, setCustomName] = useState('');
  const [customCategory, setCustomCategory] = useState('');
  const [customHsnCode, setCustomHsnCode] = useState('');
  const [customChargeType, setCustomChargeType] = useState('Margin');
  const [customIsPbMandatory, setCustomIsPbMandatory] = useState(false);
  const [customTdsCategory, setCustomTdsCategory] = useState('');

  const [editingChargeId, setEditingChargeId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editHsnCode, setEditHsnCode] = useState('');
  const [editChargeType, setEditChargeType] = useState('Margin');
  const [editIsPbMandatory, setEditIsPbMandatory] = useState(false);
  const [editTdsCategory, setEditTdsCategory] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchChargeHeads();
      setSearchTerm('');
      setCustomName('');
      setCustomCategory('');
      setCustomHsnCode('');
      setCustomChargeType('Margin');
      setCustomIsPbMandatory(false);
      setCustomTdsCategory('');
      setSelectedNames(new Set());
    }
  }, [isOpen, fetchChargeHeads]);

  if (!isOpen) return null;

  const filteredHeads = chargeHeads.filter(h => h.name.toLowerCase().includes(searchTerm.toLowerCase()));

  const handleToggle = (name) => {
    const newSelected = new Set(selectedNames);
    if (newSelected.has(name)) {
      newSelected.delete(name);
    } else {
      newSelected.add(name);
    }
    setSelectedNames(newSelected);
  };

  const handleAddCustom = async () => {
    const name = customName.trim();
    const cat = customCategory || 'Miscellaneous';
    if (!name) { alert('Please enter a charge name.'); return; }
    if (chargeHeads.find(p => p.name.toLowerCase() === name.toLowerCase())) {
      alert('A charge with this name already exists.');
      return;
    }
    const res = await addChargeHead(name, cat, customHsnCode.trim(), customChargeType, customIsPbMandatory, customTdsCategory);
    if (res.success) {
      setCustomName('');
      setCustomCategory('');
      setCustomHsnCode('');
      setCustomChargeType('Margin');
      setCustomIsPbMandatory(false);
      setCustomTdsCategory('');
      const newSelected = new Set(selectedNames);
      newSelected.add(name);
      setSelectedNames(newSelected);
    } else {
      alert(res.error || 'Error adding custom charge');
    }
  };

  const handleAddSelected = () => {
    const selectedCharges = chargeHeads.filter(ch => selectedNames.has(ch.name));
    onAddSelected(selectedCharges);
  };

  const handleEditClick = (ch, e) => {
    e.preventDefault();
    e.stopPropagation();
    setEditingChargeId(ch._id);
    setEditName(ch.name);
    setEditCategory(ch.category || '');
    setEditHsnCode(ch.hsnCode || '');
    setEditChargeType(ch.chargeType || 'Margin');
    setEditIsPbMandatory(ch.isPbMandatory || false);
    setEditTdsCategory(ch.tdsCategory || '');
  };

  const handleSaveEdit = async (ch, e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!editName.trim()) return alert('Name is required');
    const res = await updateChargeHead(ch._id, editName.trim(), editCategory, editHsnCode.trim(), editChargeType, editIsPbMandatory, editTdsCategory);
    if (res.success) {
      setEditingChargeId(null);
    } else {
      alert(res.error || 'Error updating charge');
    }
  };

  const handleCancelEdit = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setEditingChargeId(null);
  };

  const handleDelete = async (ch, e) => {
    e.preventDefault();
    e.stopPropagation();
    if (window.confirm(`Are you sure you want to delete "${ch.name}"?`)) {
      const res = await deleteChargeHead(ch._id);
      if (!res.success) {
        alert(res.error || 'Error deleting charge');
      } else {
        const newSelected = new Set(selectedNames);
        if (newSelected.has(ch.name)) {
          newSelected.delete(ch.name);
          setSelectedNames(newSelected);
        }
      }
    }
  };

  return (
    <div className="add-modal-overlay active">
      <div className="add-modal" style={{ width: '800px' }}>
        <div className="add-modal-title">➕ Manage Charges Master</div>
        <div className="add-modal-body">
          <div className="section-label">Search or select predefined charges</div>
          <div className="add-search-wrap">
            <span>🔍</span>
            <input
              type="text"
              placeholder="Type to filter charges..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="predefined-list">
            {filteredHeads.length === 0 ? (
              <div className="no-results">No matching charges found</div>
            ) : (
              filteredHeads.map(ch => {
                const isChecked = selectedNames.has(ch.name);
                const isEditing = editingChargeId === ch._id;

                if (isEditing) {
                  return (
                    <div key={ch._id || ch.name} className="predefined-item-edit" style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px', borderBottom: '1px solid #dee2e6', background: '#f8f9fa' }}>
                       <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <input
                            type="text"
                            value={editName}
                            onChange={e => setEditName(e.target.value)}
                            style={{ flex: 2, padding: '6px', border: '1px solid #ccc', borderRadius: '4px' }}
                            placeholder="Charge Name"
                        />
                        <select
                            value={editCategory}
                            onChange={e => setEditCategory(e.target.value)}
                            style={{ flex: 1, padding: '6px', border: '1px solid #ccc', borderRadius: '4px' }}
                        >
                            <option value="">-- Type --</option>
                            <option>Reimbursement</option>
                            <option>Margin</option>
                        </select>
                        <input
                            type="text"
                            value={editHsnCode}
                            onChange={e => setEditHsnCode(e.target.value)}
                            placeholder="HSN Code"
                            style={{ width: '100px', padding: '6px', border: '1px solid #ccc', borderRadius: '4px' }}
                        />
                       </div>
                       <div style={{ display: 'flex', gap: '15px', alignItems: 'center', fontSize: '11px' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <input type="checkbox" checked={editIsPbMandatory} onChange={e => setEditIsPbMandatory(e.target.checked)} /> PB Mandatory
                            </label>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <span>Default:</span>
                                <select value={editChargeType} onChange={e => setEditChargeType(e.target.value)} style={{ padding: '2px 4px' }}>
                                    <option value="Margin">Margin</option>
                                    <option value="Reimbursement">Reimbursement</option>
                                </select>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <span>TDS:</span>
                                <select value={editTdsCategory} onChange={e => setEditTdsCategory(e.target.value)} style={{ padding: '2px 4px' }}>
                                    <option value="">None</option>
                                    <option value="94C">94C</option>
                                    <option value="94J">94J</option>
                                    <option value="94I">94I</option>
                                    <option value="94H">94H</option>
                                </select>
                            </div>
                            <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
                                <button type="button" onClick={(e) => handleSaveEdit(ch, e)} style={{ background: '#2563eb', color: '#fff', border: 'none', borderRadius: '4px', padding: '4px 12px', cursor: 'pointer', fontWeight: 700 }}>Save</button>
                                <button type="button" onClick={handleCancelEdit} style={{ background: '#6c757d', color: '#fff', border: 'none', borderRadius: '4px', padding: '4px 12px', cursor: 'pointer', fontWeight: 700 }}>Cancel</button>
                            </div>
                       </div>
                    </div>
                  );
                }

                return (
                  <div key={ch._id || ch.name} style={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid #f1f5f9' }}>
                    <label className={`predefined-item ${isChecked ? 'checked' : ''}`} style={{ flex: 1, borderBottom: 'none', margin: 0, padding: '8px 12px' }}>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggle(ch.name)}
                        style={{ marginRight: '10px' }}
                      />
                      <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span className="predefined-item-name" style={{ fontWeight: 600 }}>{ch.name}</span>
                            {ch.isPbMandatory && <span style={{ fontSize: '9px', background: '#ffebee', color: '#d32f2f', padding: '1px 5px', borderRadius: '4px', border: '1px solid #ffcdd2', fontWeight: 700 }}>PB REQ</span>}
                        </div>
                        <div style={{ display: 'flex', gap: '10px', fontSize: '10px', color: '#64748b', marginTop: '2px' }}>
                            <span>Type: {ch.category} ({ch.chargeType || 'Margin'})</span>
                            {ch.hsnCode && <span>HSN: {ch.hsnCode}</span>}
                            {ch.tdsCategory && <span>TDS: {ch.tdsCategory}</span>}
                        </div>
                      </div>
                    </label>
                    {isAdmin && (
                      <div style={{ display: 'flex', gap: '12px', paddingRight: '20px' }}>
                        <button type="button" title="Edit Master" onClick={(e) => handleEditClick(ch, e)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#2563eb', fontSize: '14px' }}>✎</button>
                        <button type="button" title="Delete from Master" onClick={(e) => handleDelete(ch, e)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: '14px' }}>🗑</button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          <div className="custom-charge-box" style={{ background: '#f8fafc', padding: '15px', borderRadius: '8px', border: '1px solid #e2e8f0', marginTop: '15px' }}>
            <div className="section-label" style={{ marginBottom: '10px', display: 'block' }}>➕ Add New Master Charge</div>
            <div className="custom-row" style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
              <input
                type="text"
                placeholder="Charge Name..."
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                style={{ flex: 2 }}
              />
              <select
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                style={{ flex: 1 }}
              >
                <option value="">-- Select Type --</option>
                <option>Reimbursement</option>
                <option>Margin</option>
                <option>Freight</option>
                <option>Transport</option>
              </select>
              <input
                type="text"
                placeholder="HSN Code"
                value={customHsnCode}
                onChange={(e) => setCustomHsnCode(e.target.value)}
                style={{ width: '100px' }}
              />
            </div>
            <div style={{ display: 'flex', gap: '20px', alignItems: 'center', fontSize: '12px', background: '#fff', padding: '8px 12px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
               <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={customIsPbMandatory} onChange={e => setCustomIsPbMandatory(e.target.checked)} /> 
                  <span style={{ fontWeight: 600 }}>PB Mandatory?</span>
               </label>
               <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>Default Category:</span>
                  <select value={customChargeType} onChange={e => setCustomChargeType(e.target.value)} style={{ padding: '2px 4px' }}>
                    <option value="Margin">Margin</option>
                    <option value="Reimbursement">Reimbursement</option>
                  </select>
               </div>
               <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>Default TDS:</span>
                  <select value={customTdsCategory} onChange={e => setCustomTdsCategory(e.target.value)} style={{ padding: '2px 4px' }}>
                    <option value="">None</option>
                    <option value="94C">94C</option>
                    <option value="94J">94J</option>
                    <option value="94I">94I</option>
                    <option value="94H">94H</option>
                  </select>
               </div>
               <button type="button" className="add-custom-btn" onClick={handleAddCustom} style={{ marginLeft: 'auto', background: '#16a34a', color: '#fff', border: 'none' }}>Add to Master</button>
            </div>
          </div>
        </div>
        <div className="add-modal-footer">
          <span className="sel-count" style={{ color: '#64748b' }}>{selectedNames.size ? `${selectedNames.size} charge${selectedNames.size > 1 ? 's' : ''} selected for this job` : ''}</span>
          <button type="button" className="btn" onClick={handleAddSelected} disabled={selectedNames.size === 0} style={{ padding: '0 24px' }}>Add to Job</button>
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
};

export default AddChargeModal;
