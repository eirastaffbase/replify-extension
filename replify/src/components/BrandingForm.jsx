// components/BrandingForm.jsx
// Handles all branding inputs + live preview

import React from "react";
import {
  formGroupStyle,
  inputStyle,
  checkboxLabelStyle,
  checkboxStyle,
  brandingButtonStyle,
  labelStyle,
} from "../styles";

export default function BrandingForm({
  /* flags & handlers */
  isStaffbaseTab,
  includeBranding,
  setIncludeBranding,
  includeArticles,
  setIncludeArticles,
  brandingExists,

  /* live preview */
  previewActive,
  onPreview,
  onCancelPreview,

  /* helper */
  getCreateLabel,

  /* delete */
  onDeleteBranding,

  /* pull */
  onPullBranding,

  /* state + setters (prospect / colours / padding / bg) */
  prospectName, setProspectName,
  logoUrl, setLogoUrl,
  bgUrl, setBgURL,
  primaryColor, setPrimaryColor,
  textColor, setTextColor,
  backgroundColor, setBackgroundColor,
  logoPadWidth, setLogoPadWidth,
  logoPadHeight, setLogoPadHeight,
  bgVertical, setBgVertical,
  prospectLinkedInUrl, setProspectLinkedInUrl,

  /* submit */
  onCreateDemo,
}) {
  /* helper so we don’t repeat the preview-kick logic everywhere */
  const withPreview = (setter) => (value) => {
    setter(value);
    if (isStaffbaseTab && previewActive) onPreview();
  };

  return (
    <>
      {/* ───────── existing-branding notice ───────── */}
      {brandingExists && (
        <div
          style={{
            marginTop: 10,
            padding: 16,
            background: "#C4E2ED",
            borderRadius: 4,
            marginBottom: 10,
          }}
        >
          This environment is already branded with Replify.
          <br />
          <strong>Adding branding will replace the existing branding.</strong>
          <div style={{ margin: "10px 0", display: "flex", gap: 12 }}> {/* Adjusted gap for spacing */}
            <button
              style={{
                ...brandingButtonStyle,
                background: "crimson",
                color: "white",
                fontSize: "12px",
                display: "flex",        // Enable flex layout for icon and text
                alignItems: "center",   // Vertically align items
                justifyContent: "center" // Center content horizontally
              }}
              onClick={onDeleteBranding}
            >
              <span style={{ fontSize: "24px", marginRight: 6 }}>✖︎</span> {/* Bigger icon with some spacing */}
              Delete branding
            </button>
            <button
              onClick={onPullBranding}
              style={{
                ...brandingButtonStyle,
                fontSize: "12px",
                display: "flex",        // Enable flex layout for icon and text
                alignItems: "center",   // Vertically align items
                justifyContent: "center" // Center content horizontally
              }}
            >
              <span style={{ fontSize: "24px", marginRight: 6 }}>⟳</span> {/* Bigger icon with some spacing */}
              Pull current
            </button>
          </div>
        </div>
      )}


      {/* ───────── Add-branding toggle ───────── */}
      <div style={formGroupStyle}>
        <label style={checkboxLabelStyle}>
          <input
            type="checkbox"
            style={checkboxStyle}
            checked={includeBranding}
            onChange={(e) => setIncludeBranding(e.target.checked)}
          />
          Add branding
        </label>
      </div>

      {/* ───────── Branding details ───────── */}
      {includeBranding && (
        <>
          {/*  name / logo / bg URLs  */}
          {[
            ["Prospect Name", prospectName, withPreview(setProspectName), "Vandelay Industries"],
            ["Logo URL", logoUrl, withPreview(setLogoUrl), ""],
            ["Background Image URL", bgUrl, withPreview(setBgURL), ""],
          ].map(([lbl, val, onChange, ph]) => (
            <div key={lbl} style={formGroupStyle}>
              <label style={labelStyle}>{lbl}:</label>
              <input
                type="text"
                style={inputStyle}
                value={val}
                onChange={(e) => onChange(e.target.value)}
                placeholder={ph}
              />
            </div>
          ))}

          {/* colour pickers  */}
          {[
            ["Primary Branding Color", primaryColor, withPreview(setPrimaryColor)],
            ["Text Branding Color", textColor, withPreview(setTextColor)],
            ["Background Color (Neutral)", backgroundColor, withPreview(setBackgroundColor)],
          ].map(([lbl, val, onChange]) => (
            <div key={lbl} style={formGroupStyle}>
              <label style={labelStyle}>{lbl}:</label>
              {/* Flex container to hold both inputs side-by-side */}
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input
                  type="color"
                  style={{ ...inputStyle, padding: 0, width: 50, height: 50, border: 'none' }}
                  value={val}
                  onChange={(e) => onChange(e.target.value)}
                />
                <input
                  type="text"
                  style={{ ...inputStyle, width: 100 }}
                  value={val}
                  onChange={(e) => onChange(e.target.value)}
                  placeholder="#RRGGBB"
                />
              </div>
            </div>
          ))}

          {/*  logo padding  */}
          <div style={formGroupStyle}>
            <label style={labelStyle}>Logo padding (width × height px)</label>
            <div style={{ display: "flex", gap: 6 }}>
              {[
                [logoPadWidth, withPreview(setLogoPadWidth)],
                [logoPadHeight, withPreview(setLogoPadHeight)],
              ].map(([val, onChange], i) => (
                <input
                  key={i}
                  type="number"
                  style={{ ...inputStyle, width: 80 }}
                  value={val}
                  onChange={(e) => onChange(Number(e.target.value))}
                  onBlur={
                    isStaffbaseTab && previewActive ? onPreview : undefined
                  }
                />
              ))}
            </div>
          </div>

          {/*  background vertical offset  */}
          <div style={formGroupStyle}>
            <label style={labelStyle}>Background image vertical %</label>
            <input
              type="number"
              min="-50"
              max="50"
              style={{ ...inputStyle, width: 80 }}
              value={bgVertical}
              onChange={(e) => withPreview(setBgVertical)(Number(e.target.value))}
              onBlur={
                isStaffbaseTab && previewActive ? onPreview : undefined
              }
            />
          </div>
        </>
      )}

      {/* ───────── Articles toggle ───────── */}
      <div style={formGroupStyle}>
        <label style={checkboxLabelStyle}>
          <input
            type="checkbox"
            style={checkboxStyle}
            checked={includeArticles}
            onChange={(e) => setIncludeArticles(e.target.checked)}
          />
          Add articles
        </label>
      </div>

      {/*  LinkedIn URL  */}
      {includeArticles && (
        <div style={formGroupStyle}>
          <label style={labelStyle}>LinkedIn Page URL:</label>
          <input
            type="text"
            style={inputStyle}
            value={prospectLinkedInUrl}
            onChange={(e) => setProspectLinkedInUrl(e.target.value)}
            placeholder="https://linkedin.com/company/company-inc"
          />
        </div>
      )}

      {/* ───────── Action buttons ───────── */}
      <div style={formGroupStyle}>
        {isStaffbaseTab && includeBranding && (
          <button
            style={{
              ...brandingButtonStyle,
              backgroundColor: isStaffbaseTab ? "#007bff" : "grey",
              cursor: isStaffbaseTab ? "pointer" : "not-allowed",
            }}
            onClick={previewActive ? onCancelPreview : onPreview}
            disabled={!isStaffbaseTab}
          >
            {previewActive ? "✖︎ Cancel Preview" : "Preview Branding"}
          </button>
        )}

        <button
          style={brandingButtonStyle}
          disabled={!includeBranding && !includeArticles}
          onClick={onCreateDemo}
        >
          {getCreateLabel()}
        </button>
      </div>
    </>
  );
}