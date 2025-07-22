// components/AutomationForm.jsx

import React, { useState } from "react";
import { brandingButtonStyle, psaStyle } from "../styles";
import ProgressBar from "./ProgressBar"; // 👈 Import the new component

// ... (styles remain the same) ...
const userListStyle = {
  maxHeight: "300px",
  overflowY: "auto",
  border: "1px solid #e0e0e0",
  borderRadius: "4px",
  padding: "10px",
  marginBottom: "15px",
};

const userItemStyle = {
  display: "flex",
  alignItems: "center",
  padding: "8px 5px",
  borderBottom: "1px solid #f0f0f0",
};

const labelStyle = {
  cursor: "pointer",
};


export default function AutomationForm({ 
  users, 
  isStaffbaseTab, 
  onRun, 
  automationRunning, 
  progress, 
  totalTasks 
}) {
  const [selectedUserIds, setSelectedUserIds] = useState([]);

  // ... (handleToggleUser and timeEstimate functions remain the same) ...
  const handleToggleUser = (userId) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const timeEstimate = () => {
    const count = selectedUserIds.length;
    if (count === 0) return "";
    const minSeconds = count * 30; // Updated time
    const maxMinutes = count * 1;
    const minDisplay =
      minSeconds < 60 ? `${minSeconds}s` : `${(minSeconds / 60).toFixed(1)}m`;
    return `Est. time: ${minDisplay} - ${maxMinutes}m`;
  };

  return (
    <div>
      <h2>Select Users for Automation</h2>
      <p>Select one or more users to include in the automation process.</p>

      {/* ... (user list JSX remains the same) ... */}
       <div style={userListStyle}>
        {users.map((user) => (
          <div key={user.id} style={userItemStyle}>
            <input
              type="checkbox"
              id={`user-${user.id}`}
              checked={selectedUserIds.includes(user.id)}
              onChange={() => handleToggleUser(user.id)}
              style={{ marginRight: "12px", cursor: "pointer" }}
            />
            <label htmlFor={`user-${user.id}`} style={labelStyle}>
              {`${user.firstName} ${user.lastName} ${
                user.username ? `(${user.username})` : ""
              }`.trim()}
            </label>
          </div>
        ))}
      </div>


      {/* ... (PSA note JSX remains the same) ... */}
      <div style={psaStyle}>
        <strong>Note:</strong> Each user added will add 30 seconds - 1 min to
        the total run time.
        {selectedUserIds.length > 0 && (
          <div style={{ marginTop: "5px" }}>
            <strong>{timeEstimate()}</strong>
          </div>
        )}
      </div>


      <button
        style={brandingButtonStyle}
        onClick={() => onRun(selectedUserIds)}
        // 👇 Disable button if automation is running
        disabled={selectedUserIds.length === 0 || !isStaffbaseTab || automationRunning}
      >
        {automationRunning ? 'Running...' : 'Run Automation'}
      </button>

      {/* 👇 Conditionally render the progress bar */}
      {automationRunning && (
        <ProgressBar current={progress} total={totalTasks} />
      )}

      {selectedUserIds.length > 0 && !isStaffbaseTab && !automationRunning && (
        <p style={{ color: "red", fontSize: "12px", marginTop: "5px" }}>
          ⚠️ You must be on an app.staffbase.com tab to run automation.
        </p>
      )}
    </div>
  );
}