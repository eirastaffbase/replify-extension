import React from "react";
import { brandingButtonStyle, inputStyle } from "../styles";

// --- Styles (no major changes) ---
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
const radioContainerStyle = {
  display: 'flex',
  gap: '20px',
  marginBottom: '15px',
};
const selectStyle = {
  ...inputStyle,
  width: "100%",
  padding: "8px",
};

// --- Component Definition ---
export default function UpdateUserForm({
  // Props for displaying data
  users,
  selectedUserId,
  userProfile,
  allProfileFields,
  isLoading,
  
  // Props for state values
  fieldToUpdate,
  newValue,
  selectedFile,
  imageType,

  // Props for callback handlers
  onUserSelect,
  onLoginAsUser,
  onFieldChange,
  onNewValueChange,
  onFileChange,
  onImageTypeChange,
  onProfileUpdate,
}) {

  // Helper to determine the text for the single action button
  const getButtonText = () => {
    const hasTextUpdate = fieldToUpdate && newValue;
    const hasImageUpdate = selectedFile && imageType !== 'none';  

    if (hasTextUpdate && hasImageUpdate) {
      return "Update Field and Image";
    }
    
    if (hasTextUpdate) {
      return "Update Profile Field";
    }
    if (hasImageUpdate) {
      return `Upload ${imageType === 'avatar' ? 'Avatar' : 'Banner'}`;
    }
    return "Update Profile"; // Default text
  };

  const selectedUser = users.find((user) => user.id === selectedUserId);
  const currentValue = userProfile?.profile?.[fieldToUpdate] ?? userProfile?.[fieldToUpdate] ?? "";

  return (
    <div>
      <h2>Update User Profile</h2>
      <p>Modify profile data and images for the selected user.</p>

      {/* --- User Selection --- */}
      <div style={formSectionStyle}>
        <label style={labelStyle}>Select User</label>
        <select
          id="user-select"
          style={selectStyle}
          value={selectedUserId}
          onChange={(e) => onUserSelect(e.target.value)}
          disabled={isLoading || !users.length}
        >
          <option value="">-- Select a user --</option>
          {users.map((user) => (
            <option key={user.id} value={user.id}>
              {`${user.firstName} ${user.lastName} ${user.username ? `(${user.username})` : ""}`.trim()}
            </option>
          ))}
        </select>
        {selectedUser && (
          <div style={{ marginTop: '10px' }}>
            <button
              style={{ ...brandingButtonStyle, width: "100%" }}
              onClick={onLoginAsUser}
              disabled={isLoading}
            >
              {`Login as ${selectedUser.firstName}`}
            </button>
          </div>
        )}
      </div>

      {/* --- Fields for Profile Updates --- */}
      {selectedUserId && (
        <>
          {/* Text Field Update */}
          <div style={formSectionStyle}>
            <label style={labelStyle}>Update Text Field</label>
            <select
              style={selectStyle}
              value={fieldToUpdate}
              onChange={(e) => onFieldChange(e.target.value)}
              disabled={isLoading || allProfileFields.length === 0}
            >
              <option value="">-- Select a field --</option>
              {allProfileFields.map((field) => (
                <option key={field} value={field}>{field}</option>
              ))}
            </select>
            {fieldToUpdate && (
              <div style={{ marginTop: "15px" }}>
                <input
                  type="text"
                  style={inputStyle}
                  value={newValue}
                  onChange={(e) => onNewValueChange(e.target.value)}
                  placeholder={currentValue ? `Current: ${String(currentValue)}` : "Enter new value"}
                  disabled={isLoading}
                />
              </div>
            )}
          </div>
          
          {/* Image Update */}
          <div style={formSectionStyle}>
            <label style={labelStyle}>Update Image</label>
            <div style={radioContainerStyle}>
            <label>
                <input type="radio" name="imageType" value="none" checked={imageType === 'none'} onChange={(e) => onImageTypeChange(e.target.value)} disabled={isLoading}/>
                None
              </label>
              <label><input type="radio" name="imageType" value="avatar" checked={imageType === 'avatar'} onChange={(e) => onImageTypeChange(e.target.value)} disabled={isLoading}/> Avatar</label>
              <label><input type="radio" name="imageType" value="profileHeaderImage" checked={imageType === 'profileHeaderImage'} onChange={(e) => onImageTypeChange(e.target.value)} disabled={isLoading}/> Banner</label>
            </div>
            <input
              id="image-file-input"
              type="file"
              key={selectedFile ? 'file-selected' : 'no-file'} // Helps reset the input
              accept="image/png, image/jpeg, image/gif"
              onChange={(e) => onFileChange(e.target.files?.[0] || null)}
              disabled={isLoading}
              style={{ display: 'block', width: '100%' }}
            />
          </div>

          {/* Single Action Button */}
          <button
            style={{ ...brandingButtonStyle, width: '100%' }}
            onClick={onProfileUpdate}
            disabled={isLoading || (!fieldToUpdate && !selectedFile)}
          >
            {isLoading ? "Processing..." : getButtonText()}
          </button>
        </>
      )}
    </div>
  );
}