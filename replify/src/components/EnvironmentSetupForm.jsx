// components/EnvironmentSetupForm.jsx
import React from "react";
import {
  inputStyle,
  formGroupStyle,
  labelStyle,
  checkboxLabelStyle,
  checkboxStyle,
  brandingButtonStyle,
  psaStyle,
} from "../styles";
import LaunchpadSelect from "./LaunchpadSelect";
import MobileQuickLinks from "./MobileQuickLinks";

/**
 * EnvironmentSetupForm Component
 * ... (JSDoc comments updated to include new props)
 */
export default function EnvironmentSetupForm({
  /* toggles */
  chatEnabled,
  setChatEnabled,
  microsoftEnabled,
  setMicrosoftEnabled,
  journeysEnabled,
  setJourneysEnabled,
  campaignsEnabled,
  setCampaignsEnabled,

  /* launchpad */
  launchpadSel,
  items,
  openLaunchpad,
  onToggleLaunchpadOpen,
  onToggleLaunchpadItem,

  /* quick links */
  quickLinksEnabled,
  setQuickLinksEnabled,
  mobileQuickLinks,
  onQuickLinkChange,
  onQuickLinkSwap,
  onQuickLinkDelete,
  onQuickLinkAdd,

  /* widgets / merge */
  customWidgetsChecked,
  setCustomWidgetsChecked,
  mergeIntegrationsChecked,
  setMergeIntegrationsChecked,
  setupEmailChecked,
  setSetupEmailChecked,
  sbEmail,
  setSbEmail,
  sbPassword,
  setSbPassword,
  mergeField,
  setMergeField,
  allProfileFields,

  /* submit */
  onSetup,
}) {
  return (
    <>
      <h3>Environment Setup</h3>

      {/* Main Feature Toggles */}
      {[
        ["Enable Chat", chatEnabled, setChatEnabled],
        ["Enable Microsoft Integration", microsoftEnabled, setMicrosoftEnabled],
        ["Add Journeys", journeysEnabled, setJourneysEnabled],
        ["Add Campaigns", campaignsEnabled, setCampaignsEnabled],
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

      {campaignsEnabled && (
        <p style={{ ...psaStyle, marginBottom: "15px" }}>
          For campaigns, you will need to add yourself as a manager to see the
          generated campaigns.
        </p>
      )}

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

      {/* Quick Links */}
      <div style={formGroupStyle}>
        <label style={checkboxLabelStyle}>
          <input
            type="checkbox"
            style={checkboxStyle}
            checked={quickLinksEnabled}
            onChange={(e) => setQuickLinksEnabled(e.target.checked)}
          />
          Quick Links
        </label>
      </div>

      {quickLinksEnabled && (
        <>
          <h4>Mobile Quick Links</h4>
          <MobileQuickLinks
            links={mobileQuickLinks}
            onChange={onQuickLinkChange}
            onSwap={onQuickLinkSwap}
            onDelete={onQuickLinkDelete}
            onAdd={onQuickLinkAdd}
          />
        </>
      )}

      {/* Additional Integrations */}
      {[
        ["Add Custom Widgets", customWidgetsChecked, setCustomWidgetsChecked],
        [
          "Add Merge Integrations",
          mergeIntegrationsChecked,
          setMergeIntegrationsChecked,
        ],
        ["Add Email Templates", setupEmailChecked, setSetupEmailChecked],
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

      {/* Conditional Inputs for Widgets/Merge */}
      {(customWidgetsChecked || mergeIntegrationsChecked) && (
        <>
          <div style={formGroupStyle}>
            <label style={labelStyle}>Admin Email</label>
            <input
              type="email"
              style={inputStyle}
              value={sbEmail}
              onChange={(e) => setSbEmail(e.target.value)}
              placeholder="e.g., admin+slug@staffbase.com"
            />
          </div>
          <div style={formGroupStyle}>
            <label style={labelStyle}>Admin Password</label>
            <input
              type="password"
              style={inputStyle}
              value={sbPassword}
              onChange={(e) => setSbPassword(e.target.value)}
              placeholder="Enter admin password"
            />
          </div>
        </>
      )}

      {mergeIntegrationsChecked && (
        <div style={formGroupStyle}>
          <label style={labelStyle}>Workday Mapping Field:</label>
          <select
            style={inputStyle}
            value={mergeField}
            onChange={(e) => setMergeField(e.target.value)}
          >
            {allProfileFields.length > 0 ? (
              allProfileFields.map((field) => (
                <option key={field.slug} value={field.slug}>
                  {field.title}
                </option>
              ))
            ) : (
              <option>Loading fields...</option>
            )}
          </select>
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