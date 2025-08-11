// UpdateUserForm.jsx

// Add useState to the import
import React, { useState } from "react";
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
  onLoginAsUser,
  onUpdateAvatar,
}) {
  // Add state to hold the selected file
  const [selectedFile, setSelectedFile] = useState(null);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    } else {
      setSelectedFile(null);
    }
  };

  // Trigger the upload process passed from App.js
  const handleAvatarUpdateClick = () => {
    if (selectedFile) {
      onUpdateAvatar(selectedFile);
      setSelectedFile(null); // Clear the file input after submission
      document.getElementById('avatar-file-input').value = ""; // Reset file input visually
    }
  };

  let currentValue = "";
  if (userProfile && fieldToUpdate) {
    currentValue =
      userProfile.profile?.[fieldToUpdate] ?? userProfile[fieldToUpdate];
  }

  const selectedUser = users.find((user) => user.id === selectedUserId);

  return (
    <div>
      <h2>Update User Profile</h2>
      <p>Select a user to view and modify their profile data or replace their avatar.</p>

      {/* ─── Step 1: Select User (No changes here) ─── */}
      <div style={formSectionStyle}>
        <label style={labelStyle} htmlFor="user-select">
          Select User
        </label>
        <select
          id="user-select"
          style={selectStyle} // This style already has width: 100%
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

        {selectedUser && (
          <div>
            <button
              style={{ ...brandingButtonStyle, width: "100%" }}
              onClick={onLoginAsUser}
              disabled={isLoading}
              title={`Login as ${selectedUser.firstName}`}
            >
              {`Login as ${selectedUser.firstName}`}
            </button>
          </div>
        )}
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
            <strong>Note:</strong> Standard profile fields can be updated here. For avatar changes, use the section below.
          </div>
        </div>
      )}

      {/* ─── NEW: Step 3: Replace Avatar ─── */}
      {selectedUserId && (
        <div style={formSectionStyle}>
          <label style={labelStyle}>Replace Avatar</label>
          <input
            id="avatar-file-input"
            type="file"
            accept="image/png, image/jpeg, image/gif"
            onChange={handleFileChange}
            disabled={isLoading}
            style={{ display: 'block', width: '100%', marginBottom: '10px' }}
          />
          <button
            style={{...brandingButtonStyle, marginTop: '5px' }}
            onClick={handleAvatarUpdateClick}
            disabled={isLoading || !selectedFile}
          >
            {isLoading ? 'Uploading...' : 'Upload & Replace Avatar'}
          </button>
        </div>
      )}

      <button
        style={brandingButtonStyle}
        onClick={onUpdate}
        disabled={isLoading || !fieldToUpdate || !newValue}
      >
        {isLoading ? "Updating..." : "Update Profile Field"}
      </button>
    </div>
  );
}