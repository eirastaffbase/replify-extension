// components/MultiBranding.jsx

import React, { useState, useMemo } from "react";
import { LuCirclePlus, LuTrash2, LuSearch } from "react-icons/lu";
import { formGroupStyle, inputStyle, labelStyle, brandingButtonStyle } from "../styles";
import { colors } from "../styles/colors";

// --- Sub-component for the full Branding Form ---
const BrandingConfigForm = ({ group, onSave, onCancel, existingBrandings = [] }) => {
  // State for all branding options
  const [primaryColor, setPrimaryColor] = useState(group.primaryColor || "#000000");
  const [textColor, setTextColor] = useState(group.textColor || "#ffffff");
  const [backgroundColor, setBackgroundColor] = useState(group.backgroundColor || "#F3F3F3");
  const [floatingNavBgColor, setFloatingNavBgColor] = useState(group.floatingNavBgColor || "#FFFFFF");
  const [floatingNavTextColor, setFloatingNavTextColor] = useState(group.floatingNavTextColor || "#000000");
  const [logoUrl, setLogoUrl] = useState(group.logoUrl || "");
  const [bgUrl, setBgUrl] = useState(group.bgUrl || "");
  const [logoPadWidth, setLogoPadWidth] = useState(group.logoPadWidth || 0);
  const [logoPadHeight, setLogoPadHeight] = useState(group.logoPadHeight || 0);
  const [bgVertical, setBgVertical] = useState(group.bgVertical || 0);

  const handleSave = () => {
    onSave({
      groupId: group.groupId,
      groupName: group.groupName, // Keep name for display purposes
      primaryColor,
      textColor,
      backgroundColor,
      floatingNavBgColor,
      floatingNavTextColor,
      logoUrl,
      bgUrl,
      logoPadWidth,
      logoPadHeight,
      bgVertical,
    });
  };

  // Helper component for a compact color input row
  const ColorInput = ({ label, color, setColor }) => (
    <div style={{ flex: '1 1 45%', minWidth: '200px' }}>
      <label style={labelStyle}>{label}:</label>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <input type="color" style={{ ...inputStyle, padding: 0, width: 30, height: 30, flexShrink: 0 }} value={color} onChange={(e) => setColor(e.target.value)} />
        <input type="text" style={{ ...inputStyle, width: '100%' }} value={color} onChange={(e) => setColor(e.target.value)} />
      </div>
    </div>
  );

  return (
    <div style={{ border: `1px solid ${colors.border}`, padding: '15px', borderRadius: '4px', marginTop: '10px', background: '#fcfcfc' }}>
      <h4 style={{ margin: '0 0 15px 0' }}>{existingBrandings.some(b => b.groupId === group.groupId) ? 'Editing' : 'Adding'} Branding for: <strong>{group.groupName || group.groupId}</strong></h4>
      
      {/* Compact Color Pickers */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px' }}>
        <ColorInput label="Primary" color={primaryColor} setColor={setPrimaryColor} />
        <ColorInput label="Text" color={textColor} setColor={setTextColor} />
        <ColorInput label="Background" color={backgroundColor} setColor={setBackgroundColor} />
        <ColorInput label="Floating Nav BG" color={floatingNavBgColor} setColor={setFloatingNavBgColor} />
        <ColorInput label="Floating Nav Text" color={floatingNavTextColor} setColor={setFloatingNavTextColor} />
      </div>

      {/* URL Inputs */}
      <div style={{...formGroupStyle, marginTop: '15px'}}>
        <label style={labelStyle}>Logo URL (Optional):</label>
        <input type="text" style={inputStyle} value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="https://..." />
      </div>
      <div style={formGroupStyle}>
        <label style={labelStyle}>Background Image URL (Optional):</label>
        <input type="text" style={inputStyle} value={bgUrl} onChange={(e) => setBgUrl(e.target.value)} placeholder="https://..." />
      </div>

      {/* Padding and Position Inputs */}
      <div style={{ display: 'flex', gap: '15px', marginTop: '15px' }}>
        <div style={{flex: 1}}>
          <label style={labelStyle}>Logo Padding (W x H)</label>
          <div style={{ display: 'flex', gap: 6 }}>
            <input type="number" style={{ ...inputStyle, width: '100%' }} value={logoPadWidth} onChange={(e) => setLogoPadWidth(Number(e.target.value))} />
            <input type="number" style={{ ...inputStyle, width: '100%' }} value={logoPadHeight} onChange={(e) => setLogoPadHeight(Number(e.target.value))} />
          </div>
        </div>
        <div style={{flex: 1}}>
          <label style={labelStyle}>BG Vertical %</label>
          <input type="number" min="-50" max="50" style={{ ...inputStyle, width: '100%' }} value={bgVertical} onChange={(e) => setBgVertical(Number(e.target.value))} />
        </div>
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
        <button onClick={onCancel} style={{ ...brandingButtonStyle, background: colors.border }}>Cancel</button>
        <button onClick={handleSave} style={brandingButtonStyle}>Save Branding</button>
      </div>
    </div>
  );
};

// --- Main MultiBranding Component ---
export default function MultiBranding({ allGroups, brandings, onAdd, onUpdate, onRemove }) {
  const [showForm, setShowForm] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);
  const [manualId, setManualId] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const handleSave = (config) => {
    // Ensure groupName is set, defaulting to groupId if not present
    const configToSave = {
      ...config,
      groupName: config.groupName || config.groupId,
    };

    const isEditing = brandings.some(b => b.groupId === configToSave.groupId);
    if (isEditing) {
      onUpdate(configToSave);
    } else {
      onAdd(configToSave);
    }
    setShowForm(false);
    setEditingGroup(null);
  };
  
  const handleEdit = (branding) => {
    setEditingGroup(branding);
    setShowForm(true);
  };

  const handleAddNew = () => {
    setEditingGroup(null);
    setShowForm(true);
    setManualId("");
    setSearchTerm("");
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
                {/* ✅ Display groupName, which defaults to groupId if not available */}
                <strong style={{ color: colors.primary }}>{branding.groupName}</strong>
                <div style={{ fontSize: '12px', color: '#666', display: 'flex', alignItems: 'center', gap: '10px', marginTop: '5px' }}>
                  <span>Primary: <span style={{display: 'inline-block', width: '12px', height: '12px', borderRadius: '50%', background: branding.primaryColor || 'transparent', verticalAlign: 'middle', border: '1px solid #ccc' }}></span> {branding.primaryColor}</span>
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