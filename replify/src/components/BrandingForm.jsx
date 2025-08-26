// components/BrandingForm.jsx

import React, { useState } from "react";
import { BsSave2 } from "react-icons/bs";
import { AiOutlineFormatPainter } from "react-icons/ai";
import {
  formGroupStyle,
  inputStyle,
  checkboxLabelStyle,
  checkboxStyle,
  brandingButtonStyle,
  labelStyle,
} from "../styles";
import { colors } from "../styles/colors";
import SavedProspects from "./SavedProspects";
import MultiBranding from "./MultiBranding";

export default function BrandingForm({
  apiToken,
  branchId,

  /* Prospect saving */
  savedProspects,
  onSaveProspect,
  onLoadProspect,
  onDeleteProspect,

  /* Multi-branding */
  multiBrandingEnabled,
  setMultiBrandingEnabled,
  multiBrandings,
  onAddMultiBranding,
  onUpdateMultiBranding,
  onRemoveMultiBranding,
  allGroups,

  /* flags & handlers */
  isStaffbaseTab,
  includeBranding,
  setIncludeBranding,
  updateThemeColors,
  setUpdateThemeColors,
  includeArticles,
  setIncludeArticles,
  brandingExists,
  resetThemeOnDelete,
  setResetThemeOnDelete,


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
  prospectName,
  setProspectName,
  logoUrl,
  setLogoUrl,
  bgUrl,
  setBgURL,
  primaryColor,
  setPrimaryColor,
  textColor,
  setTextColor,
  backgroundColor,
  setBackgroundColor,
  floatingNavBgColor,
  setFloatingNavBgColor,
  floatingNavTextColor,
  setFloatingNavTextColor,
  logoPadWidth,
  setLogoPadWidth,
  logoPadHeight,
  setLogoPadHeight,
  bgVertical,
  setBgVertical,
  changeLogoSize,
  setChangeLogoSize,
  logoHeight,
  setLogoHeight,
  logoMarginTop,
  setLogoMarginTop,
  prospectLinkedInUrl,
  setProspectLinkedInUrl,

  /* submit */
  onCreateDemo,
}) {
  const [hoveredButton, setHoveredButton] = useState(null);

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
            background: colors.backgroundInfo,
            borderRadius: 4,
            marginBottom: 10,
          }}
        >
          This environment is already branded with Replify.
          <br />
          <strong>Adding branding will replace the existing branding.</strong>
          <p style={{fontSize: '12px', fontStyle: 'italic', margin: '8px 0 0 0', opacity: 0.8}}>
            Please note: multi-branding configurations cannot be pulled at this time.
          </p>
          <div style={{ margin: "10px 0", display: "flex", gap: 12 }}>
            <button
              style={{
                ...brandingButtonStyle,
                background:
                  hoveredButton === "delete"
                    ? colors.dangerLight
                    : colors.danger,
                color: colors.textOnPrimary,
                fontSize: "12px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
              onClick={onDeleteBranding}
              onMouseEnter={() => setHoveredButton("delete")}
              onMouseLeave={() => setHoveredButton(null)}
            >
              <span style={{ fontSize: "24px", marginRight: 6 }}>✖︎</span>
              Delete branding
            </button>
            <button
              onClick={onPullBranding}
              style={{
                ...brandingButtonStyle,
                fontSize: "12px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor:
                  hoveredButton === "pull"
                    ? colors.primaryLight
                    : colors.primary,
              }}
              onMouseEnter={() => setHoveredButton("pull")}
              onMouseLeave={() => setHoveredButton(null)}
            >
              <span style={{ fontSize: "24px", marginRight: 6 }}>⟳</span>
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
          {/* ... existing JSX for saved prospects, color pickers, etc. ... */}
          
          <SavedProspects
            prospects={savedProspects}
            onSelect={onLoadProspect}
            onDelete={onDeleteProspect}
          />
          {/* CHECKBOX FOR THEME COLORS */}
          <div style={{ ...formGroupStyle, paddingLeft: "20px" }}>
            <label style={checkboxLabelStyle}>
              <input
                type="checkbox"
                style={checkboxStyle}
                checked={updateThemeColors}
                onChange={(e) => setUpdateThemeColors(e.target.checked)}
              />
              Update colors in App/Intranet branding page
            </label>
          </div>

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
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input
                  type="color"
                  style={{ ...inputStyle, padding: 0, width: 50, height: 50, border: "none" }}
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

          {/* floating nav colours */}
          <div style={{ ...formGroupStyle, display: "flex", alignItems: "flex-end", gap: "16px" }}>
            <div>
              <label style={labelStyle}>Floating Nav BG:</label>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input
                  type="color"
                  style={{ ...inputStyle, padding: 0, width: 50, height: 50, border: "none" }}
                  value={floatingNavBgColor}
                  onChange={(e) => withPreview(setFloatingNavBgColor)(e.target.value)}
                />
                <input
                  type="text"
                  style={{ ...inputStyle, width: 100 }}
                  value={floatingNavBgColor}
                  onChange={(e) => withPreview(setFloatingNavBgColor)(e.target.value)}
                  placeholder="#FFFFFF"
                />
              </div>
            </div>
            <div>
              <label style={labelStyle}>Floating Nav Text:</label>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input
                  type="color"
                  style={{ ...inputStyle, padding: 0, width: 50, height: 50, border: "none" }}
                  value={floatingNavTextColor}
                  onChange={(e) => withPreview(setFloatingNavTextColor)(e.target.value)}
                />
                <input
                  type="text"
                  style={{ ...inputStyle, width: 100 }}
                  value={floatingNavTextColor}
                  onChange={(e) => withPreview(setFloatingNavTextColor)(e.target.value)}
                  placeholder="#000000"
                />
              </div>
            </div>
          </div>

          {/* logo padding  */}
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
          {/*  logo sizing checkbox */}
          <div style={formGroupStyle}>
            <label style={checkboxLabelStyle}>
              <input
                type="checkbox"
                style={checkboxStyle}
                checked={changeLogoSize}
                onChange={(e) => setChangeLogoSize(e.target.checked)}
              />
              Customize logo size/position
            </label>
          </div>

          {/* logo sizing inputs (conditional) */}
          {changeLogoSize && (
            <div style={{...formGroupStyle, paddingLeft: '20px'}}>
              <label style={labelStyle}>Logo height & margin-top (px)</label>
              <div style={{ display: "flex", gap: 6 }}>
                <input
                  type="number"
                  style={{ ...inputStyle, width: 80 }}
                  value={logoHeight}
                  onChange={(e) => withPreview(setLogoHeight)(Number(e.target.value))}
                  onBlur={ isStaffbaseTab && previewActive ? onPreview : undefined }
                  placeholder="Height"
                />
                <input
                  type="number"
                  style={{ ...inputStyle, width: 80 }}
                  value={logoMarginTop}
                  onChange={(e) => withPreview(setLogoMarginTop)(Number(e.target.value))}
                  onBlur={ isStaffbaseTab && previewActive ? onPreview : undefined }
                  placeholder="Margin Top"
                />
              </div>
            </div>
          )}
          {/* background vertical offset  */}
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

          {/* --- Action Buttons within Branding --- */}
          <div style={{ ...formGroupStyle, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            {/* Save Prospect Button */}
            {prospectName && (
              <button
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: colors.primary,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "5px",
                }}
                onClick={onSaveProspect}
              >
                <BsSave2 size={18} />
                Save this prospect
              </button>
            )}
            
            {/* Multi-Branding Toggle Button */}
            <button
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: colors.primary,
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "5px",
                marginLeft: 'auto',
              }}
              onClick={() => setMultiBrandingEnabled((prev) => !prev)}
            >
              <AiOutlineFormatPainter size={18} />
              {multiBrandingEnabled
                ? "Hide multi branding"
                : "Add multi branding"}
            </button>
          </div>
          
          {/* Conditionally render MultiBranding component */}
          {multiBrandingEnabled && (
            <MultiBranding
              apiToken={apiToken}
              branchId={branchId}
              brandings={multiBrandings}
              onAdd={onAddMultiBranding}
              onUpdate={onUpdateMultiBranding}
              onRemove={onRemoveMultiBranding}
              allGroups={allGroups}
              savedProspects={savedProspects}
            />
          )}
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

      {/* LinkedIn URL  */}
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
              backgroundColor: isStaffbaseTab
                ? hoveredButton === "preview"
                  ? colors.primaryLight
                  : colors.primary
                : "grey",
              cursor: isStaffbaseTab ? "pointer" : "not-allowed",
            }}
            onClick={previewActive ? onCancelPreview : onPreview}
            disabled={!isStaffbaseTab}
            onMouseEnter={() => setHoveredButton("preview")}
            onMouseLeave={() => setHoveredButton(null)}
          >
            {previewActive ? "✖︎ Cancel Preview" : "Preview Branding"}
          </button>
        )}

        <button
          style={{
            ...brandingButtonStyle,
            backgroundColor:
              hoveredButton === "create" ? colors.primaryLight : colors.primary,
          }}
          disabled={!includeBranding && !includeArticles}
          onClick={onCreateDemo}
          onMouseEnter={() => setHoveredButton("create")}
          onMouseLeave={() => setHoveredButton(null)}
        >
          {getCreateLabel()}
        </button>
      </div>
    </>
  );
}