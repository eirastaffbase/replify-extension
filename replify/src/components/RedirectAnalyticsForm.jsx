// components/RedirectAnalyticsForm.jsx
/* global chrome */

import React from "react";
import {
  formGroupStyle,
  checkboxLabelStyle,
  checkboxStyle,
  dropdownHeaderStyle,
  // Assuming you might add a buttonStyle to your styles.js or define one here
} from "../styles";

import { ANALYTICS_TYPES } from "../constants/appConstants";

// A simple button style, you can move this to your styles.js
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

export default function RedirectAnalyticsForm({
  open,
  onToggleOpen,
  state, // e.g. { news:false, … }
  onToggleType,
}) {
  const [isButtonHovered, setIsButtonHovered] = React.useState(false);

const handleEnableAndRefresh = () => {
    // Optionally save state or perform other actions before reloading
    if (typeof onToggleOpen === 'function') {
        onToggleOpen(false); // Close the dropdown if needed
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
        ▸ Redirect analytics
      </div>

      {open && (
        <div style={{ marginTop: 8, marginLeft: 12, paddingBottom: 10 }}> {/* Added paddingBottom */}
          {ANALYTICS_TYPES.map(({ id, label }) => (
            <div key={id} style={formGroupStyle}>
              <label style={checkboxLabelStyle}>
                <input
                  style={checkboxStyle}
                  type="checkbox"
                  checked={!!state[id]}
                  onChange={() => onToggleType(id, !state[id])} // This now correctly updates localStorage via App.js
                />
                {label}
              </label>
            </div>
          ))}
          <button
            style={isButtonHovered ? {...enableButtonStyle, ...enableButtonHoverStyle} : enableButtonStyle}
            onClick={handleEnableAndRefresh}
            onMouseEnter={() => setIsButtonHovered(true)}
            onMouseLeave={() => setIsButtonHovered(false)}
            title="Saves current redirect choices and reloads the page to apply them."
          >
            Enable & Refresh
          </button>
        </div>
      )}
    </>
  );
}