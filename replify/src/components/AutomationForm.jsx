import React, { useState } from "react";
import { brandingButtonStyle, psaStyle } from "../styles";
import ProgressBar from "./ProgressBar";

// --- Styles ---
const userListStyle = { maxHeight: "250px", overflowY: "auto", border: "1px solid #e0e0e0", borderRadius: "4px", padding: "10px", marginBottom: "15px" };
const userItemStyle = { display: "flex", alignItems: "center", padding: "8px 5px", borderBottom: "1px solid #f0f0f0" };
const labelStyle = { cursor: "pointer" };
const checkboxContainerStyle = { display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px', border: '1px solid #ddd', padding: '15px', borderRadius: '4px' };

// --- Constants ---
const AUTOMATION_OPTIONS = [
  { id: 'surveys', label: 'Fill Surveys', timePerUser: 10 },
  { id: 'reactions', label: 'Add Reactions (10x)', timePerUser: 15 },
  { id: 'comments', label: 'Post and Reply to Comments (2-4x)', timePerUser: 25 },
  { id: 'chats', label: 'Reply to Chats', timePerUser: 5 },
];

export default function AutomationForm({ users, isStaffbaseTab, onRun, automationRunning, progressData }) {
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [options, setOptions] = useState({
    surveys: true,
    reactions: true,
    comments: true,
    chats: true,
  });

  const handleToggleUser = (userId) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleOptionChange = (optionId) => {
    setOptions(prev => ({ ...prev, [optionId]: !prev[optionId] }));
  };

  const timeEstimate = () => {
    const userCount = selectedUserIds.length;
    if (userCount === 0) return "";

    const totalSecondsPerUser = AUTOMATION_OPTIONS.reduce((acc, option) => {
      if (options[option.id]) return acc + option.timePerUser;
      return acc;
    }, 0);

    const totalSeconds = totalSecondsPerUser * userCount;
    if (totalSeconds === 0) return "No tasks selected.";

    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    
    return `Est. time: ${minutes > 0 ? `${minutes}m ` : ''}${seconds > 0 ? `${seconds}s` : ''}`.trim();
  };

  return (
    <div>
      <h2>Select Users for Automation</h2>
      <p>Select users to include in the automation process.</p>
      <div style={userListStyle}>
        {users.map((user) => (
          <div key={user.id} style={userItemStyle}>
            <input type="checkbox" id={`user-${user.id}`} checked={selectedUserIds.includes(user.id)} onChange={() => handleToggleUser(user.id)} style={{ marginRight: "12px", cursor: "pointer" }} />
            <label htmlFor={`user-${user.id}`} style={labelStyle}>{`${user.firstName} ${user.lastName} ${user.username ? `(${user.username})` : ""}`.trim()}</label>
          </div>
        ))}
      </div>

      <h2>Select Tasks to Run</h2>
      <div style={checkboxContainerStyle}>
        {AUTOMATION_OPTIONS.map(option => (
          <div key={option.id}>
            <input type="checkbox" id={`option-${option.id}`} checked={options[option.id]} onChange={() => handleOptionChange(option.id)} style={{ marginRight: "12px", cursor: "pointer" }} />
            <label htmlFor={`option-${option.id}`} style={labelStyle}>{option.label}</label>
          </div>
        ))}
      </div>

      <div style={psaStyle}>
        <strong>Heads up!</strong> This process will open and control a new tab. Please leave the new tab open and stay on this page. You can open another Chrome window to continue working while the automation runs.
        {selectedUserIds.length > 0 && (<div style={{ marginTop: "5px" }}><strong>{timeEstimate()}</strong></div>)}
      </div>

      <button
        style={brandingButtonStyle}
        onClick={() => onRun(selectedUserIds, options)}
        disabled={selectedUserIds.length === 0 || !isStaffbaseTab || automationRunning}
      >
        {automationRunning ? 'Running...' : `Run Automation for ${selectedUserIds.length} Users`}
      </button>

      {automationRunning && (
        <ProgressBar
          progressData={progressData}
          totalTimeEstimate={AUTOMATION_OPTIONS.reduce((acc, opt) => (options[opt.id] ? acc + opt.timePerUser : acc), 0) * selectedUserIds.length}
        />
      )}

      {selectedUserIds.length > 0 && !isStaffbaseTab && !automationRunning && (
        <p style={{ color: "red", fontSize: "12px", marginTop: "5px" }}>⚠️ You must be on an app.staffbase.com tab to run automation.</p>
      )}
    </div>
  );
}