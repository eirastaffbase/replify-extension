// components/EnvironmentSetupForm.jsx
// Appears when you click Set Up

import React from "react";
import {
  inputStyle,
  formGroupStyle,
  labelStyle,
  checkboxLabelStyle,
  checkboxStyle,
  brandingButtonStyle,
} from "../styles";
import LaunchpadSelect from "./LaunchpadSelect";
import MobileQuickLinks from "./MobileQuickLinks";

export default function EnvironmentSetupForm({
  /* toggles */
  chatEnabled,
  setChatEnabled,
  microsoftEnabled,
  setMicrosoftEnabled,
  campaignsEnabled,
  setCampaignsEnabled,

  /* launchpad */
  launchpadSel,
  items,
  openLaunchpad,
  onToggleLaunchpadOpen,
  onToggleLaunchpadItem,

  /* quick links */
  mobileQuickLinks,
  onUpdateQuickLink,
  onSwapQuickLink,

  /* widgets / merge */
  customWidgetsChecked,
  setCustomWidgetsChecked,
  mergeIntegrationsChecked,
  setMergeIntegrationsChecked,
  sbEmail,
  setSbEmail,
  sbPassword,
  setSbPassword,
  mergeField,
  setMergeField,

  /* submit */
  onSetup,
}) {
  return (
    <>
      <h3>Environment Setup</h3>

      {/* Chat / Microsoft / Campaigns */}
      {[
        ["Enable Chat", chatEnabled, setChatEnabled],
        ["Enable Microsoft Integration", microsoftEnabled, setMicrosoftEnabled],
        ["Enable Campaigns", campaignsEnabled, setCampaignsEnabled],
      ].map(([lbl, val, setter]) => (
        <div key={lbl} style={formGroupStyle}>
          <label style={checkboxLabelStyle}>
            <input
              type="checkbox"
              style={checkboxStyle}
              checked={val}
              onChange={(e) => setter(e.target.checked)}
            />
            {lbl}
          </label>
        </div>
      ))}

      {/* Launchpad */}
      <div style={formGroupStyle}>
        <label style={labelStyle}>Launchpad items:</label>
        <LaunchpadSelect
          items={items}
          selected={launchpadSel}
          open={openLaunchpad}
          onToggleOpen={onToggleLaunchpadOpen}
          onToggleItem={onToggleLaunchpadItem}
        />
      </div>

      {/* Mobile quick links */}
      <h4>Mobile Quick Links</h4>
      <MobileQuickLinks
        links={mobileQuickLinks}
        onChangeTitle={(k, t) =>
          onUpdateQuickLink(k, { ...mobileQuickLinks[k], title: t })
        }
        onSwap={onSwapQuickLink}
      />

      {/* Custom widgets / merge */}
      {[
        ["Custom Widgets?", customWidgetsChecked, setCustomWidgetsChecked],
        [
          "Merge Integrations?",
          mergeIntegrationsChecked,
          setMergeIntegrationsChecked,
        ],
      ].map(([lbl, val, setter]) => (
        <div key={lbl} style={formGroupStyle}>
          <label style={labelStyle}>
            {lbl}
            <input
              type="checkbox"
              checked={val}
              onChange={(e) => setter(e.target.checked)}
              style={{ marginLeft: 10 }}
            />
          </label>
        </div>
      ))}

      {customWidgetsChecked && (
        <div style={formGroupStyle}>
          <label style={labelStyle}>Email/Password for Custom Widgets:</label>
          <input
            style={inputStyle}
            placeholder="email"
            value={sbEmail}
            onChange={(e) => setSbEmail(e.target.value)}
          />
          <input
            type="password"
            style={inputStyle}
            placeholder="password"
            value={sbPassword}
            onChange={(e) => setSbPassword(e.target.value)}
          />
        </div>
      )}

      {mergeIntegrationsChecked && (
        <div style={formGroupStyle}>
          <label style={labelStyle}>Merge/HR Integrations:</label>
          <input
            style={inputStyle}
            placeholder="email"
            value={sbEmail}
            onChange={(e) => setSbEmail(e.target.value)}
          />
          <input
            type="password"
            style={inputStyle}
            placeholder="password"
            value={sbPassword}
            onChange={(e) => setSbPassword(e.target.value)}
          />
          <input
            style={inputStyle}
            placeholder="Merge Field"
            value={mergeField}
            onChange={(e) => setMergeField(e.target.value)}
          />
        </div>
      )}

      <div style={formGroupStyle}>
        <button style={brandingButtonStyle} onClick={onSetup}>
          Set Up Environment
        </button>
      </div>
    </>
  );
}
