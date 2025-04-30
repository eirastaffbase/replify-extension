// components/ApiKeyForm.jsx
// API key input form for Staffbase authentication.

import React from "react";
import { formGroupStyle, apiKeyLabelStyle, apiKeyInputStyle, buttonStyle } from "../styles";

/**
 * @param {string}   value          current token text
 * @param {Function} onChange       (e) => void
 * @param {Function} onAuth         () => void
 */
export default function ApiKeyForm({ value, onChange, onAuth }) {
  return (
    <>
      <div style={formGroupStyle}>
        <label style={apiKeyLabelStyle}>Enter your API Key:</label>
        <input
          type="text"
          style={apiKeyInputStyle}
          value={value}
          onChange={onChange}
          placeholder="Paste your Administrative API Key"
        />
      </div>
      <button
        style={buttonStyle}
        onClick={onAuth}
        disabled={!value.trim()}
      >
        Authenticate & Save
      </button>
    </>
  );
}
