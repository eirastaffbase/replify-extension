/* global chrome */

import React, { useState } from "react";
import {
  formGroupStyle,
  checkboxLabelStyle,
  checkboxStyle,
  dropdownHeaderStyle,
} from "../styles";

import { ANALYTICS_TYPES } from "../constants/appConstants";

// Styles can be moved to your styles.js file
const enableButtonStyle = {
  marginTop: '12px',
  padding: '8px 15px',
  backgroundColor: '#007bff',
  color: 'white',
  border: 'none',
  borderRadius: '4px',
  cursor: 'pointer',
  fontSize: '14px',
};

const enableButtonHoverStyle = {
  backgroundColor: '#0056b3',
};

const psaStyle = {
  marginTop: '15px',
  padding: '10px',
  backgroundColor: '#f0f0f0',
  borderRadius: '4px',
  fontSize: '12px',
  color: '#333',
  lineHeight: '1.4',
};

const selectAllLabelStyle = {
    ...checkboxLabelStyle,
    display: 'flex',
    alignItems: 'center',
};

const arrowStyle = {
    marginLeft: '8px',
    cursor: 'pointer',
    userSelect: 'none',
    transition: 'transform 0.2s ease-in-out',
    display: 'inline-block',
};

export default function RedirectAnalyticsForm({
  open,
  onToggleOpen,
  state, // e.g. { news:false, … }
  onToggleType,
}) {
  const [isButtonHovered, setIsButtonHovered] = useState(false);
  const [subAnalyticsVisible, setSubAnalyticsVisible] = useState(true);

  const allSelected = ANALYTICS_TYPES.every(({ id }) => !!state[id]);
  const isIndeterminate = !allSelected && ANALYTICS_TYPES.some(({ id }) => !!state[id]);

  const handleSelectAll = () => {
    const shouldSelectAll = !allSelected;
    ANALYTICS_TYPES.forEach(type => {
      onToggleType(type.id, shouldSelectAll);
    });
  };

  const handleToggleSubAnalytics = (e) => {
      e.stopPropagation(); // Prevents the onToggleOpen from firing
      setSubAnalyticsVisible(prev => !prev);
  };

  const handleEnableAndRefresh = () => {
    if (typeof onToggleOpen === 'function') {
        onToggleOpen(false);
    }
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]?.id) {
            chrome.tabs.reload(tabs[0].id);
        }
    });
  };

  return (
    <>
      {/* clickable header */}
      <div style={dropdownHeaderStyle} onClick={onToggleOpen}>
        ▸ Fake analytics
      </div>

      {open && (
        <div style={{ marginTop: 8, marginLeft: 12, paddingBottom: 10 }}>
          <div style={formGroupStyle}>
            <label style={selectAllLabelStyle}>
              <input
                style={checkboxStyle}
                type="checkbox"
                ref={el => el && (el.indeterminate = isIndeterminate)}
                checked={allSelected}
                onChange={handleSelectAll}
              />
              Select All
              <span
                onClick={handleToggleSubAnalytics}
                style={{...arrowStyle, transform: subAnalyticsVisible ? 'rotate(90deg)' : 'rotate(0deg)'}}
                title={subAnalyticsVisible ? "Hide sub-analytics" : "Show sub-analytics"}
              >
                ▸
              </span>
            </label>
          </div>

          {subAnalyticsVisible && (
            <div style={{ marginLeft: 20 }}>
              {ANALYTICS_TYPES.map(({ id, label }) => (
                <div key={id} style={formGroupStyle}>
                  <label style={checkboxLabelStyle}>
                    <input
                      style={checkboxStyle}
                      type="checkbox"
                      checked={!!state[id]}
                      onChange={() => onToggleType(id, !state[id])}
                    />
                    {label}
                  </label>
                </div>
              ))}
            </div>
          )}

          <button
            style={isButtonHovered ? {...enableButtonStyle, ...enableButtonHoverStyle} : enableButtonStyle}
            onClick={handleEnableAndRefresh}
            onMouseEnter={() => setIsButtonHovered(true)}
            onMouseLeave={() => setIsButtonHovered(false)}
            title="Saves current redirect choices and reloads the page to apply them."
          >
            Enable & Refresh
          </button>

          <div style={psaStyle}>
            <strong>Heads up:</strong> Your analytics choices are saved directly in your browser. They'll stick around even if you restart, so you shouldn't have to set them again.
          </div>
        </div>
      )}
    </>
  );
}