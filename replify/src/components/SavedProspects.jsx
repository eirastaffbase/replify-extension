// components/SavedProspects.jsx
import React, { useState } from "react";
import { LuChevronDown, LuChevronUp, LuTrash, LuArrowRight } from "react-icons/lu";
import { colors } from "../styles/colors";

const dropdownHeaderStyle = {
  padding: "10px 12px",
  border: `1px solid ${colors.border}`,
  borderRadius: "4px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  cursor: "pointer",
  backgroundColor: colors.background,
};

const dropdownListStyle = {
  listStyle: "none",
  margin: "4px 0 0 0",
  padding: 0,
  border: `1px solid ${colors.border}`,
  borderRadius: "4px",
  backgroundColor: colors.background,
  maxHeight: "250px",
  overflowY: "auto",
};

const prospectItemStyle = {
  display: "flex",
  alignItems: "center",
  padding: "8px",
  gap: "10px",
  borderBottom: `1px solid ${colors.border}`,
};

const logoStyle = {
  width: "32px",
  height: "32px",
  objectFit: "contain",
  borderRadius: "4px",
  backgroundColor: "#f0f0f0",
};

const colorSwatchStyle = {
  width: "16px",
  height: "16px",
  borderRadius: "3px",
  border: `1px solid ${colors.border}`,
};

export default function SavedProspects({ prospects, onSelect, onDelete }) {
  const [isOpen, setIsOpen] = useState(false);

  const handleSelect = (prospect) => {
    onSelect(prospect);
    setIsOpen(false);
  };
  
  return (
    <div style={{ marginBottom: "15px" }}>
      <div style={dropdownHeaderStyle} onClick={() => setIsOpen(!isOpen)}>
        <span>Use a saved prospect</span>
        {isOpen ? <LuChevronUp /> : <LuChevronDown />}
      </div>

      {isOpen && (
        <ul style={dropdownListStyle}>
          {prospects.length === 0 ? (
            <li style={{ padding: "10px", color: "#888" }}>
              You have not saved any prospects yet!
            </li>
          ) : (
            prospects.map((prospect) => (
              <li key={prospect.id} style={prospectItemStyle}>
                <img src={prospect.logoUrl} alt="" style={logoStyle} />
                <span style={{ flex: 1, fontWeight: "bold" }}>
                  {prospect.prospectName}
                </span>
                <div style={{ display: "flex", gap: "4px" }}>
                  <div style={{...colorSwatchStyle, backgroundColor: prospect.primaryColor}} />
                  <div style={{...colorSwatchStyle, backgroundColor: prospect.textColor}} />
                  <div style={{...colorSwatchStyle, backgroundColor: prospect.backgroundColor}} />
                </div>
                <button
                  onClick={() => handleSelect(prospect)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '5px' }}
                  title="Use this prospect"
                >
                  <LuArrowRight size={18} color={colors.primary} />
                </button>
                {onDelete && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onDelete(prospect.id); }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '5px' }}
                    title="Delete this prospect"
                  >
                    <LuTrash size={16} color={colors.danger} />
                  </button>
                )}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}