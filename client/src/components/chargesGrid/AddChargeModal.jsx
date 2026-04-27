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

  const [editingChargeId, setEditingChargeId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editHsnCode, setEditHsnCode] = useState('');


  useEffect(() => {
    if (isOpen) {
      fetchChargeHeads();
      setSearchTerm('');
      setCustomName('');
      setCustomCategory('');
      setCustomHsnCode('');
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
    const res = await addChargeHead(name, cat, customHsnCode.trim() || undefined);
    if (res.success) {
      setCustomName('');
      setCustomCategory('');
      setCustomHsnCode('');
      const newSelected = new Set(selectedNames);
      newSelected.add(name);
      setSelectedNames(newSelected);
    } else {
      alert(res.error || 'Error adding custom charge');
    }
  };

  const handleAddSelected = () => {
    // Collect the selected charge head objects and pass to parent
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
  };

  const handleSaveEdit = async (ch, e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!editName.trim()) return alert('Name is required');
    const res = await updateChargeHead(ch._id, editName.trim(), editCategory, editHsnCode.trim() || undefined);
    if (res.success) {
      setEditingChargeId(null);
      // optionally update selectedNames if name changed, kept simple
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
      <div className="add-modal">
        <div className="add-modal-title">➕ Add Charge</div>
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
                    <div key={ch._id || ch.name} className="predefined-item-edit" style={{ display: 'flex', gap: '8px', alignItems: 'center', padding: '8px 12px', borderBottom: '1px solid #dee2e6' }}>
                      <input
                        type="text"
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        style={{ flex: 1, padding: '4px' }}
                      />
                      <select
                        value={editCategory}
                        onChange={e => setEditCategory(e.target.value)}
                        style={{ padding: '4px' }}
                      >
                        <option value="">-- Category --</option>
                        <option>Reimbursement</option>
                        <option>Margin</option>
                      </select>
                      <input
                        type="text"
                        value={editHsnCode}
                        onChange={e => setEditHsnCode(e.target.value)}
                        placeholder="HSN Code"
                        style={{ width: '100px', padding: '4px' }}
                      />
                      <button type="button" onClick={(e) => handleSaveEdit(ch, e)} style={{ background: '#2563eb', color: '#fff', border: 'none', borderRadius: '4px', padding: '4px 8px', cursor: 'pointer', fontWeight: 700 }}>Save</button>
                      <button type="button" onClick={handleCancelEdit} style={{ background: '#ef4444', color: '#fff', border: 'none', borderRadius: '4px', padding: '4px 8px', cursor: 'pointer', fontWeight: 700 }}>Cancel</button>
                    </div>
                  );
                }

                return (
                  <div key={ch._id || ch.name} style={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid #f1f5f9' }}>
                    <label className={`predefined-item ${isChecked ? 'checked' : ''}`} style={{ flex: 1, borderBottom: 'none', margin: 0 }}>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggle(ch.name)}
                      />
                      <span className="predefined-item-name">{ch.name}</span>
                      <span className="predefined-item-cat">{ch.category}</span>
                      {ch.hsnCode && <span style={{ fontSize: '10px', color: '#666', marginLeft: '4px', background: '#f0f4f8', padding: '1px 6px', borderRadius: '8px' }}>HSN: {ch.hsnCode}</span>}
                    </label>
                    {isAdmin && (
                      <div style={{ display: 'flex', gap: '8px', paddingRight: '12px' }}>
                        <button type="button" title="Edit" onClick={(e) => handleEditClick(ch, e)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>✎</button>
                        <button type="button" title="Delete" onClick={(e) => handleDelete(ch, e)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }}>🗑</button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          <div className="custom-charge-box">
            <div className="section-label">➕ Add Custom Charge</div>
            <div className="custom-row">
              <input
                type="text"
                placeholder="Enter charge name..."
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
              />
              <select
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
              >
                <option value="">-- Category --</option>
                <option>Reimbursement</option>
                <option>Margin</option>
              </select>
              <input
                type="text"
                placeholder="HSN Code"
                value={customHsnCode}
                onChange={(e) => setCustomHsnCode(e.target.value)}
                style={{ width: '120px' }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button type="button" className="add-custom-btn" onClick={handleAddCustom}>Add to List</button>
            </div>
          </div>
        </div>
        <div className="add-modal-footer">
          <span className="sel-count">{selectedNames.size ? `${selectedNames.size} charge${selectedNames.size > 1 ? 's' : ''} selected` : ''}</span>
          <button type="button" className="btn" onClick={handleAddSelected} disabled={selectedNames.size === 0}>Add Selected</button>
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
};

export default AddChargeModal;
