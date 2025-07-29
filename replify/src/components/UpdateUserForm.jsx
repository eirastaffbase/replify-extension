// components/UpdateUserForm.jsx

import React from "react";
import { brandingButtonStyle, inputStyle, psaStyle } from "../styles";

const formSectionStyle = {
  marginBottom: "15px",
  padding: "15px",
  border: "1px solid #e0e0e0",
  borderRadius: "4px",
};

const labelStyle = {
  display: "block",
  fontWeight: "bold",
  marginBottom: "5px",
};

const selectStyle = {
  ...inputStyle,
  width: "100%",
  padding: "8px",
};

export default function UpdateUserForm({
  users,
  selectedUserId,
  onUserSelect,
  userProfile,
  fieldToUpdate,
  onFieldChange,
  newValue,
  onNewValueChange,
  allProfileFields,
  onUpdate,
  isLoading,
  onLoginAsUser, // New prop for the login handler
}) {
  let currentValue = "";
  if (userProfile && fieldToUpdate) {
    currentValue =
      userProfile.profile?.[fieldToUpdate] ?? userProfile[fieldToUpdate];
  }

  return (
    <div>
      <h2>Update User Profile</h2>
      <p>Select a single user to view and modify their profile fields.</p>
      {/* ─── Step 1: Select User ─── */}
      <div style={formSectionStyle}>
        <label style={labelStyle} htmlFor="user-select">
          Select User
        </label>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <select
            id="user-select"
            style={{ ...selectStyle, flexGrow: 1 }} // Make select take up available space
            value={selectedUserId}
            onChange={(e) => {
              onFieldChange("");
              onNewValueChange("");
              onUserSelect(e.target.value);
            }}
            disabled={isLoading || !users.length}
          >
            <option value="">-- Select a user --</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {`${user.firstName} ${user.lastName} ${
                  user.username ? `(${user.username})` : ""
                }`.trim()}
              </option>
            ))}
          </select>
          {/* ─── NEW: Login as User Button ─── */}
          <button
            style={{ ...brandingButtonStyle, flexShrink: 0, whiteSpace: 'nowrap' }} // Prevent button from shrinking
            onClick={onLoginAsUser}
            disabled={!selectedUserId || isLoading}
            title={!selectedUserId ? "Select a user first" : "Login as selected user"}
          >
            Login as User
          </button>
        </div>
      </div>

      {/* ─── Step 2: Update Fields (shows after user is selected) ─── */}
      {selectedUserId && (
        <div style={formSectionStyle}>
          <label style={labelStyle} htmlFor="field-select">
            Select Field to Update
          </label>
          <select
            id="field-select"
            style={selectStyle}
            value={fieldToUpdate}
            onChange={(e) => onFieldChange(e.target.value)}
            disabled={isLoading || allProfileFields.length === 0}
          >
            <option value="">-- Select a field --</option>
            {allProfileFields.map((field) => (
              <option key={field} value={field}>
                {field}
              </option>
            ))}
          </select>

          {fieldToUpdate && (
            <div style={{ marginTop: "15px" }}>
              <label style={labelStyle} htmlFor="new-value-input">
                New Value for "{fieldToUpdate}"
              </label>
              <input
                id="new-value-input"
                type="text"
                style={inputStyle}
                value={newValue}
                onChange={(e) => onNewValueChange(e.target.value)}
                placeholder={
                  currentValue ? `Current: ${currentValue}` : "Enter new value"
                }
                disabled={isLoading}
              />
            </div>
          )}

          <div style={psaStyle}>
            <strong>Note:</strong> Image fields (avatar, profile header) are
            excluded. Image updating is coming soon!
          </div>
        </div>
      )}

      <button
        style={brandingButtonStyle}
        onClick={onUpdate}
        disabled={isLoading || !fieldToUpdate || !newValue}
      >
        {isLoading ? "Updating..." : "Update User Profile"}
      </button>
    </div>
  );
}