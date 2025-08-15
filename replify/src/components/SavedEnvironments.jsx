// components/SavedEnvironments.jsx
// This component displays a list of saved tokens with options to use, delete, or toggle their visibility.


import React from "react";
import { FaTrash } from "react-icons/fa6"; // Imported the trash icon
import {
  buttonStyle,
  actionButtonStyle,
  dangerButtonStyle,
  apiKeyLabelStyle,
  savedTokenStyle,
  buttonsContainerStyle,
} from "../styles";

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
                backgroundColor: "#00A4FD",
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
                backgroundColor: "#00A4FD",
                color: "white",
                border: "none",
                cursor: "pointer",
              }}
            >
              +
            </button>
          )}
        </div>
      </div>
      {environmentsToShow.map(({ slug, truncatedToken, fullToken, branchId }) => (
        <div key={slug} style={savedTokenStyle}>
          <div>
            <strong>{slug}</strong>
            <div style={apiKeyLabelStyle}>
              {showFull === slug ? fullToken : truncatedToken}
              <button
                style={{
                  ...actionButtonStyle,
                  border: "none",
                  background: "none",
                  cursor: "pointer",
                  padding: 0,
                  marginLeft: 5,
                }}
                onClick={() => onToggle(slug)}
              >
                {showFull === slug ? "Hide" : "Show Full"}
              </button>
            </div>
          </div>

          <div style={buttonsContainerStyle}>
            {isAnEnvironmentSelected ? (
              <button
                style={{ ...buttonStyle, ...dangerButtonStyle, marginTop: 0 }}
                onClick={onCancel}
              >
                Cancel
              </button>
            ) : (
              <button
                style={{ ...buttonStyle, ...actionButtonStyle, marginTop: 0 }}
                onClick={() => onUse({ slug, token: fullToken, branchId })}
              >
                Use
              </button>
            )}
            
            {/* Hide the 'Delete' button when an environment is selected */}
            {!isAnEnvironmentSelected && (
              <button
                style={{
                  ...dangerButtonStyle,
                  ...actionButtonStyle,
                  marginTop: 0,
                  display: 'flex', // Helps center the icon
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                onClick={() => onDelete(slug)}
                title={`Delete ${slug}`} // Added for accessibility
              >
                <FaTrash color="white" />
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}