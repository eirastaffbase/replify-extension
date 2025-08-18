// components/EnvironmentSetupForm.jsx
import React from "react";
import {
  inputStyle,
  formGroupStyle,
  labelStyle,
  checkboxLabelStyle,
  checkboxStyle,
  brandingButtonStyle,
  psaStyle
} from "../styles";
import LaunchpadSelect from "./LaunchpadSelect";
import MobileQuickLinks from "./MobileQuickLinks";

/**
 * EnvironmentSetupForm Component
 * * This component provides a form for configuring various environment settings, including toggles for enabling features,
 * managing launchpad items, quick links, custom widgets, merge integrations, and email templates. It also includes a 
 * submit button to finalize the setup.
 * * @param {Object} props - The props object.
 * @param {boolean} props.chatEnabled - Indicates if chat is enabled.
 * @param {Function} props.setChatEnabled - Function to toggle chat enabled state.
 * @param {boolean} props.microsoftEnabled - Indicates if Microsoft integration is enabled.
 * @param {Function} props.setMicrosoftEnabled - Function to toggle Microsoft integration enabled state.
 * @param {boolean} props.journeysEnabled - Indicates if Journeys are enabled.
 * @param {Function} props.setJourneysEnabled - Function to toggle Journeys enabled state.
 * @param {boolean} props.campaignsEnabled - Indicates if campaigns are enabled. (Note: Endpoint for campaigns is broken.)
 * @param {Function} props.setCampaignsEnabled - Function to toggle campaigns enabled state.
 * @param {Array} props.launchpadSel - Selected launchpad items.
 * @param {Array} props.items - List of launchpad items.
 * @param {boolean} props.openLaunchpad - Indicates if the launchpad is open.
 * @param {Function} props.onToggleLaunchpadOpen - Function to toggle the launchpad open state.
 * @param {Function} props.onToggleLaunchpadItem - Function to toggle individual launchpad items.
 * @param {boolean} props.quickLinksEnabled - Indicates if quick links are enabled.
 * @param {Function} props.setQuickLinksEnabled - Function to toggle quick links enabled state.
 * @param {Array} props.mobileQuickLinks - List of mobile quick links.
 * @param {Function} props.onQuickLinkChange - Function to handle changes to quick links.
 * @param {Function} props.onQuickLinkSwap - Function to swap quick links.
 * @param {Function} props.onQuickLinkDelete - Function to delete quick links.
 * @param {Function} props.onQuickLinkAdd - Function to add new quick links.
 * @param {boolean} props.customWidgetsChecked - Indicates if custom widgets are enabled.
 * @param {Function} props.setCustomWidgetsChecked - Function to toggle custom widgets enabled state.
 * @param {boolean} props.mergeIntegrationsChecked - Indicates if merge integrations are enabled.
 * @param {Function} props.setMergeIntegrationsChecked - Function to toggle merge integrations enabled state.
 * @param {boolean} props.setupEmailChecked - Indicates if email templates are enabled.
 * @param {Function} props.setSetupEmailChecked - Function to toggle email templates enabled state.
 * @param {string} props.sbEmail - Email for custom widgets or merge integrations.
 * @param {Function} props.setSbEmail - Function to set the email for custom widgets or merge integrations.
 * @param {string} props.sbPassword - Password for custom widgets or merge integrations.
 * @param {Function} props.setSbPassword - Function to set the password for custom widgets or merge integrations.
 * @param {string} props.mergeField - Merge field for integrations.
 * @param {Function} props.setMergeField - Function to set the merge field for integrations.
 * @param {Function} props.onSetup - Function to handle the setup process.
 * * @returns {JSX.Element} The rendered EnvironmentSetupForm component.
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

  /* quick links  */
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
  mergeField,
  setMergeField,
  allProfileFields, // New prop for the dropdown

  /* submit */
  onSetup,
}) {
  return (
    <>
      <h3>Environment Setup</h3>

      {/* Chat / Microsoft / Journeys / Campaigns */}
      {[
        ["Enable Chat", chatEnabled, setChatEnabled],
        ["Enable Microsoft Integration", microsoftEnabled, setMicrosoftEnabled],
        ["Add Journeys", journeysEnabled, setJourneysEnabled],
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

      {/* Quick‑links master checkbox */}
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

      {/* Custom widgets / merge / email */}
      {[
        ["Custom Widgets?", customWidgetsChecked, setCustomWidgetsChecked],
        [
          "Merge Integrations?",
          mergeIntegrationsChecked,
          setMergeIntegrationsChecked,
        ],
        ["Email Templates?", setupEmailChecked, setSetupEmailChecked],
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

{mergeIntegrationsChecked && (
        <div style={psaStyle}>
          <strong>Heads up:</strong> This will open a new tab to automate the Workday integration setup. Please do not close it until it's finished.
        </div>
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
                <option key={field} value={field}>
                  {field}
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