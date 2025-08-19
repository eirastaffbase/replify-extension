// components/MultiBranding.jsx
import React, { useState, useMemo } from "react";
import { LuCirclePlus, LuTrash2, LuSearch } from "react-icons/lu";
import { formGroupStyle, inputStyle, labelStyle, brandingButtonStyle } from "../styles";
import { colors } from "../styles/colors";

// --- Sub-component for the Branding Form ---
const BrandingConfigForm = ({ group, onSave, onCancel, existingBrandings = [] }) => {
  const [primaryColor, setPrimaryColor] = useState(group.primaryColor || "#000000");
  const [textColor, setTextColor] = useState(group.textColor || "#ffffff");
  const [logoUrl, setLogoUrl] = useState(group.logoUrl || "");

  const handleSave = () => {
    onSave({
      groupId: group.groupId,
      groupName: group.groupName,
      primaryColor,
      textColor,
      logoUrl,
    });
  };

  return (
    <div style={{ border: `1px solid ${colors.border}`, padding: '15px', borderRadius: '4px', marginTop: '10px', background: '#fcfcfc' }}>
      <h4 style={{ margin: '0 0 15px 0' }}>{existingBrandings.some(b => b.groupId === group.groupId) ? 'Editing' : 'Adding'} Branding for: <strong>{group.groupName}</strong></h4>
      
      {[
        ["Primary Color", primaryColor, setPrimaryColor],
        ["Text Color", textColor, setTextColor],
      ].map(([lbl, val, setter]) => (
        <div key={lbl} style={{ ...formGroupStyle, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <label style={labelStyle}>{lbl}:</label>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input type="color" style={{ ...inputStyle, padding: 0, width: 40, height: 40, border: "none" }} value={val} onChange={(e) => setter(e.target.value)} />
            <input type="text" style={{ ...inputStyle, width: 100 }} value={val} onChange={(e) => setter(e.target.value)} placeholder="#RRGGBB" />
          </div>
        </div>
      ))}
      
      <div style={formGroupStyle}>
        <label style={labelStyle}>Logo URL (Optional):</label>
        <input type="text" style={inputStyle} value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="https://..." />
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '15px' }}>
        <button onClick={onCancel} style={{ ...brandingButtonStyle, background: colors.border }}>Cancel</button>
        <button onClick={handleSave} style={brandingButtonStyle}>Save</button>
      </div>
    </div>
  );
};

// --- Main MultiBranding Component ---
export default function MultiBranding({ allGroups, brandings, onAdd, onUpdate, onRemove }) {
  const [showForm, setShowForm] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);
  const [manualId, setManualId] = useState("");
  const [manualName, setManualName] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const handleSave = (config) => {
    const isEditing = brandings.some(b => b.groupId === config.groupId);
    if (isEditing) {
      onUpdate(config);
    } else {
      onAdd(config);
    }
    setShowForm(false);
    setEditingGroup(null);
  };
  
  const handleEdit = (branding) => {
    setEditingGroup(branding);
    setShowForm(true);
  };

  const handleAddNew = () => {
    setEditingGroup(null); // Clear any previous selection
    setShowForm(true);
    setManualId("");
    setManualName("");
    setSearchTerm("");
  };

  const handleManualAdd = () => {
    if (manualId.trim() && manualName.trim()) {
      setEditingGroup({ groupId: manualId.trim(), groupName: manualName.trim() });
    }
  };

  const filteredAndAvailableGroups = useMemo(() => {
    const brandedGroupIds = brandings.map(b => b.groupId);
    return allGroups
      .filter(g => !brandedGroupIds.includes(g.id))
      .filter(g => g.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [allGroups, brandings, searchTerm]);

  return (
    <div style={{ padding: "15px", border: `1px solid ${colors.border}`, borderRadius: "4px", marginTop: "20px", marginBottom: "10px" }}>
      <h3 style={{ marginTop: 0, borderBottom: `1px solid ${colors.border}`, paddingBottom: '10px' }}>Multi-Branding Configurations</h3>
      
      {brandings.length > 0 && (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {brandings.map(branding => (
            <li key={branding.groupId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: `1px solid ${colors.borderLight}` }}>
              <div>
                <strong style={{ color: colors.primary }}>{branding.groupName}</strong>
                <div style={{ fontSize: '12px', color: '#666', display: 'flex', alignItems: 'center', gap: '10px', marginTop: '5px' }}>
                  <span>Primary: <span style={{display: 'inline-block', width: '12px', height: '12px', borderRadius: '50%', background: branding.primaryColor, verticalAlign: 'middle', border: '1px solid #ccc' }}></span> {branding.primaryColor}</span>
                  {branding.logoUrl && <span>Has Logo ✅</span>}
                </div>
              </div>
              <div style={{display: 'flex', gap: '10px'}}>
                <button onClick={() => handleEdit(branding)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: colors.primary }}>Edit</button>
                <button onClick={() => onRemove(branding.groupId)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: colors.danger }}>
                  <LuTrash2 size={16} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {brandings.length === 0 && !showForm && <p style={{color: '#666', textAlign: 'center', margin: '20px 0'}}>No multi-branding configurations added yet.</p>}

      {showForm ? (
        editingGroup ? (
          <BrandingConfigForm group={editingGroup} onSave={handleSave} onCancel={() => { setShowForm(false); setEditingGroup(null); }} existingBrandings={brandings} />
        ) : (
          <div style={{ marginTop: '20px' }}>
            <div>
              <label style={labelStyle}>Select a Group to Brand:</label>
              <div style={{ position: 'relative', marginBottom: '10px' }}>
                <LuSearch size={18} style={{ position: 'absolute', top: '12px', left: '10px', color: '#999' }} />
                <input
                  type="text"
                  style={{...inputStyle, paddingLeft: '35px'}}
                  placeholder={`Search through ${filteredAndAvailableGroups.length} available groups...`}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <ul style={{ listStyle: 'none', margin: 0, padding: 0, border: `1px solid ${colors.border}`, borderRadius: '4px', maxHeight: '150px', overflowY: 'auto' }}>
                {filteredAndAvailableGroups.map((g, index) => (
                  <li
                    key={g.id}
                    style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: index === filteredAndAvailableGroups.length - 1 ? 'none' : `1px solid ${colors.borderLight}`}}
                    onClick={() => setEditingGroup({ groupId: g.id, groupName: g.name })}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = colors.primaryLight}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    {g.name}
                  </li>
                ))}
              </ul>
            </div>

            <div style={{textAlign: 'center', margin: '15px 0', color: '#888'}}>OR</div>

            <div>
              <label style={labelStyle}>Manually Enter Group Details:</label>
              <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                <input type="text" style={inputStyle} placeholder="Group ID" value={manualId} onChange={e => setManualId(e.target.value)} />
                <input type="text" style={inputStyle} placeholder="Group Name" value={manualName} onChange={e => setManualName(e.target.value)} />
              </div>
              <button onClick={handleManualAdd} style={{...brandingButtonStyle, width: '100%'}} disabled={!manualId.trim() || !manualName.trim()}>Add Manual Group</button>
            </div>
          </div>
        )
      ) : (
        <button onClick={handleAddNew} style={{...brandingButtonStyle, width: '100%', marginTop: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
          <LuCirclePlus size={18} /> Add New Group Branding
        </button>
      )}
    </div>
  );
}