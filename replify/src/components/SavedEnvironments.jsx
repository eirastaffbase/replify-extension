// components/SavedEnvironments.jsx
// This component displays a list of saved tokens with options to use, delete, or toggle their visibility.


import React, { useState } from "react";
import { LuTrash } from "react-icons/lu";
import {
  buttonStyle,
  actionButtonStyle,
  dangerButtonStyle,
  apiKeyLabelStyle,
  savedTokenStyle,
  buttonsContainerStyle,
  buttonTinyStyle,
} from "../styles";
import { colors } from "../styles/colors";


/**
 * @param {Array}  savedTokens   [{ slug, truncatedToken, fullToken }]
 * @param {string} showFull      slug that’s currently “expanded”
 * @param {string|null} selectedSlug The slug of the currently selected environment
 * @param {Function} onUse       ({ slug, token, branchId }) => void
 * @param {Function} onCancel    () => void
 * @param {Function} onToggle    (slug)  → toggle full/short token
 * @param {Function} onDelete    (slug)  → remove token
 * @param {Function} onAdd      ()      → show form to add new token
 */
export default function SavedEnvironments({
  savedTokens,
  showFull,
  selectedSlug,
  onUse,
  onCancel,
  onToggle,
  onDelete,
  onAdd,
}) {
  const [hoveredButton, setHoveredButton] = useState(null);

  // If an environment is selected, show only that one. Otherwise, show all.
  const environmentsToShow = selectedSlug
    ? savedTokens.filter(({ slug }) => slug === selectedSlug)
    : savedTokens;

  const isAnEnvironmentSelected = !!selectedSlug;

  if (!savedTokens.length) {
    return (
      <div>
        <div style={{ marginBottom: "5px" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <h3 style={{ margin: 0 }}>Saved environments</h3>
            <button
              onClick={() => onAdd()}
              style={{
                borderRadius: "50%",
                width: 30,
                height: 30,
                fontSize: 20,
                fontWeight: "bold",
                backgroundColor: colors.primary,
                color: "white",
                border: "none",
                cursor: "pointer",
              }}
            >
              +
            </button>
          </div>
        </div>
        <p>You have not added any environments yet.</p>
      </div>
    );
  }
  return (
    <div>
      <div style={{ marginBottom: "5px" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <h3 style={{ margin: 0 }}>Saved environments</h3>
          {/* Hide the 'Add' button when an environment is selected */}
          {!isAnEnvironmentSelected && (
            <button
              onClick={() => onAdd()}
              style={{
                borderRadius: "50%",
                width: 30,
                height: 30,
                fontSize: 20,
                fontWeight: "bold",
                backgroundColor: hoveredButton === 'add' ? colors.primaryLight : colors.primary,
                color: colors.textOnPrimary,
                border: "none",
                cursor: "pointer",
                transition: "background-color 0.2s ease-in-out",
              }}
              onMouseEnter={() => setHoveredButton('add')}
              onMouseLeave={() => setHoveredButton(null)}
            >
              +
            </button>
          )}
        </div>
      </div>
      {environmentsToShow.map(({ slug, truncatedToken, fullToken, branchId }) => {
        // Create a copy of the base style
        const dynamicSavedTokenStyle = { ...savedTokenStyle };
        // If only one environment is being shown, remove its bottom border
        if (environmentsToShow.length === 1) {
          dynamicSavedTokenStyle.borderBottom = "none";
        }
        
        return (
          <div key={slug} style={dynamicSavedTokenStyle}>
            <div>
              <strong>{slug}</strong>
              <div style={apiKeyLabelStyle}>
                {showFull === slug ? fullToken : truncatedToken}
                <button
                  style={{
                    ...buttonTinyStyle,
                    marginLeft: 5,
                    color: hoveredButton === `toggle-${slug}` ? colors.primaryLight : colors.primary,
                    textDecoration: hoveredButton === `toggle-${slug}` ? 'underline' : 'none',
                  }}
                  onClick={() => onToggle(slug)}
                  onMouseEnter={() => setHoveredButton(`toggle-${slug}`)}
                  onMouseLeave={() => setHoveredButton(null)}
                >
                  {showFull === slug ? "Hide" : "Show Full"}
                </button>
              </div>
            </div>

            <div style={buttonsContainerStyle}>
              {isAnEnvironmentSelected ? (
                <button
                  style={{ 
                    ...buttonStyle, 
                    ...dangerButtonStyle, 
                    marginTop: 0,
                    backgroundColor: hoveredButton === 'cancel' ? colors.dangerLight : colors.danger,
                  }}
                  onClick={onCancel}
                  onMouseEnter={() => setHoveredButton('cancel')}
                  onMouseLeave={() => setHoveredButton(null)}
                >
                  Cancel
                </button>
              ) : (
                <button
                  style={{ 
                    ...buttonStyle, 
                    ...actionButtonStyle, 
                    marginTop: 0,
                    backgroundColor: hoveredButton === `use-${slug}` ? colors.primaryLight : colors.primary,
                  }}
                  onClick={() => onUse({ slug, token: fullToken, branchId })}
                  onMouseEnter={() => setHoveredButton(`use-${slug}`)}
                  onMouseLeave={() => setHoveredButton(null)}
                >
                  Use
                </button>
              )}

              {!isAnEnvironmentSelected && (
                <button
                  style={{
                    ...dangerButtonStyle,
                    ...actionButtonStyle,
                    marginTop: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: hoveredButton === `delete-${slug}` ? colors.dangerLight : colors.danger,
                  }}
                  onClick={() => onDelete(slug)}
                  title={`Delete ${slug}`}
                  onMouseEnter={() => setHoveredButton(`delete-${slug}`)}
                  onMouseLeave={() => setHoveredButton(null)}
                >
                  <LuTrash color={colors.textOnPrimary} />
                </button>
              )}
            </div>
          </div>
        )
      })}
    </div>
  );
}