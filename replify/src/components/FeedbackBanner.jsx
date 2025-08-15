import React, { useState, useEffect } from 'react';
import { MdOutlineFeedback } from "react-icons/md";
import { IoCloseCircle } from "react-icons/io5"; // New close icon
import { loadBannerState, saveBannerState } from '../utils/bannerStorage';

// --- Base Styles ---

const bannerStyle = {
  position: 'relative', 
  backgroundColor: '#EBF5FF',
  border: '1px solid #5DADE2',
  color: '#1A5276',
  padding: '12px 16px',
  borderRadius: '4px',
  fontSize: '14px',
  textAlign: 'center',
  display: 'flex',
  flexDirection: 'column',
  marginBottom: '5px',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '8px',
};

// Added more horizontal padding to prevent text from overlapping the close icon
const textStyle = {
  margin: 0,
  lineHeight: '1.5',
  padding: '0 24px', 
};

const buttonStyle = {
  backgroundColor: '#AED6F1',
  color: '#154360',
  border: 'none',
  borderRadius: '4px',
  padding: '6px 12px',
  cursor: 'pointer',
  fontWeight: 'bold',
  textDecoration: 'none',
  fontSize: '13px',
  boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  transition: 'background-color 0.2s ease-in-out',
};

const releaseNotesStyle = {
  fontSize: '10px',
  textDecoration: 'none',
  color: '#154360',
  transition: 'text-decoration 0.2s ease-in-out',
};

// Reverted to a simple transparent button for the icon
const minimizeButtonStyle = {
  position: 'absolute',
  top: '5px',
  left: '5px',
  background: 'transparent',
  border: 'none',
  cursor: 'pointer',
  padding: '0',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'opacity 0.2s ease-in-out',
};

const minimizedContainerStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  marginTop: '-5px',
};

const iconButtonStyle = {
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  padding: '4px',
  display: 'flex',
  transition: 'opacity 0.2s ease-in-out',
};

const FeedbackBanner = () => {
  const [isMinimized, setIsMinimized] = useState(false);
  const [isFeedbackBtnHover, setIsFeedbackBtnHover] = useState(false);
  const [isMinimizeBtnHover, setIsMinimizeBtnHover] = useState(false);
  const [isExpandBtnHover, setIsExpandBtnHover] = useState(false);
  const [isNotesLinkHover, setIsNotesLinkHover] = useState(false);

  useEffect(() => {
    loadBannerState(setIsMinimized);
  }, []);

  const handleToggleMinimize = () => {
    const newState = !isMinimized;
    setIsMinimized(newState);
    saveBannerState(newState);
  };

  const versionNumber = "2.2.0";
  const darkBlueColor = '#154360';
  const brightBlueColor = '#00A4FD'; // Color from the "Share Feedback" button background
  const closeIconColor = '#AED6F1'; // Color from the "Share Feedback" button background
  const releaseNotesUrl = 'https://docs.google.com/document/d/14iV4lUkYHuHv5VY3MPiIXDdRx_8SOY5Ml1M-gSPqvRY/edit?usp=sharing';

  // --- MINIMIZED VIEW ---
  if (isMinimized) {
    return (
      <div style={minimizedContainerStyle}>
        <button 
          onClick={handleToggleMinimize} 
          style={{
            ...iconButtonStyle, 
            ...(isExpandBtnHover && { opacity: 0.7 })
          }} 
          title="Show banner"
          onMouseEnter={() => setIsExpandBtnHover(true)}
          onMouseLeave={() => setIsExpandBtnHover(false)}
        >
          <MdOutlineFeedback size={20} color={brightBlueColor} />
        </button>
        <a 
          href={releaseNotesUrl}
          style={{
            ...releaseNotesStyle,
            color: brightBlueColor,
            ...(isNotesLinkHover && { textDecoration: 'underline' })
          }}
          target="_blank"  
          rel="noopener noreferrer" 
          onMouseEnter={() => setIsNotesLinkHover(true)}
          onMouseLeave={() => setIsNotesLinkHover(false)}
        >
          v{versionNumber}
        </a>
      </div>
    );
  }

  // --- EXPANDED VIEW ---
  return (
    <div style={{ marginBottom: '10px' }}>
      <div style={bannerStyle}>
        <button 
          onClick={handleToggleMinimize} 
          style={{
            ...minimizeButtonStyle,
            ...(isMinimizeBtnHover && { opacity: 0.7 }) // Simple opacity hover
          }} 
          title="Close banner"
          onMouseEnter={() => setIsMinimizeBtnHover(true)}
          onMouseLeave={() => setIsMinimizeBtnHover(false)}
        >
          <IoCloseCircle size={25} color={closeIconColor} />
        </button>
        <p style={textStyle}>
          We've streamlined the feedback form to make it easy! Please give us your thoughts anonymously 💙
        </p>
        <a
          href="https://forms.gle/Qy6Ei8KF8bmwCKNK6"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            ...buttonStyle,
            ...(isFeedbackBtnHover && { backgroundColor: '#9CBED9' })
          }}
          onMouseEnter={() => setIsFeedbackBtnHover(true)}
          onMouseLeave={() => setIsFeedbackBtnHover(false)}
        >
          Share Feedback
        </a>
      </div>
      <a
        href={releaseNotesUrl}
        style={{
          ...releaseNotesStyle,
          ...(isNotesLinkHover && { textDecoration: 'underline'}),
        }}
        target="_blank"
        rel="noopener noreferrer"
        onMouseEnter={() => setIsNotesLinkHover(true)}
        onMouseLeave={() => setIsNotesLinkHover(false)}
      >
        Version Release Notes
      </a>
      <span style={{ fontStyle: "oblique", fontSize: "10px", color: darkBlueColor }}> {versionNumber}</span>
    </div>
  );
};

export default FeedbackBanner;