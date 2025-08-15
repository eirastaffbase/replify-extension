/* global chrome */

import React, { useState } from "react";
import {
  formGroupStyle,
  checkboxLabelStyle,
  checkboxStyle,
  dropdownHeaderStyle,
  psaStyle
} from "../styles";

import { ANALYTICS_TYPES } from "../constants/appConstants";

// Styles can be moved to your styles.js file
const enableButtonStyle = {
  marginTop: '12px',
  padding: '8px 15px',
  backgroundColor: '#00A4FD',
  color: 'white',
  border: 'none',
  borderRadius: '4px',
  cursor: 'pointer',
  fontSize: '14px',
};

const enableButtonHoverStyle = {
  backgroundColor: '#0056b3',
};


const selectAllLabelStyle = {
    ...checkboxLabelStyle,
    display: 'flex',
    alignItems: 'center',
};

const arrowStyle = {
    marginLeft: '8px',
    userSelect: 'none',
    transition: 'transform 0.2s ease-in-out',
    display: 'inline-block',
};

// New style for the clickable area
const clickableAreaStyle = {
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    userSelect: 'none',
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
      // Ensure the state change is respected by passing the new value
      if (state[type.id] !== shouldSelectAll) {
          onToggleType(type.id, shouldSelectAll);
      }
    });
  };

  const handleToggleSubAnalytics = (e) => {
      e.preventDefault(); // Prevents the label from toggling the checkbox
      e.stopPropagation(); // Prevents any other parent click handlers from firing
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
                ref={el => {
                  if (el) el.indeterminate = isIndeterminate;
                }}
                checked={allSelected}
                onChange={handleSelectAll}
              />
              {/* This new span makes the text and arrow a single clickable area */}
              <span onClick={handleToggleSubAnalytics} style={clickableAreaStyle}>
                Select All
                <span
                  style={{...arrowStyle, transform: subAnalyticsVisible ? 'rotate(90deg)' : 'rotate(0deg)'}}
                  title={subAnalyticsVisible ? "Hide sub-analytics" : "Show sub-analytics"}
                >
                  ▸
                </span>
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