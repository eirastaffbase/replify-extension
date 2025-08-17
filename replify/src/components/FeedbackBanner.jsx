import React, { useState, useEffect } from 'react';
import { MdOutlineFeedback } from "react-icons/md";
import { IoCloseCircle } from "react-icons/io5";
import { loadBannerState, saveBannerState } from '../utils/bannerStorage';

// --- Unified Color Palette ---
const colors = {
  background: '#F8F9FA',      // Lightest grey (almost white)
  buttonAndIcon: '#CFD3D7',   // Medium light grey
  buttonHover: '#F1F3F5',     // Lighter grey for hover
  text: '#495057',            // Darkest grey
  border: '#DEE2E6',          // A slightly darker grey for contrast
  retainedBlue: '#00A4FD',    // The blue for the minimized icon & version
};

// --- Base Styles ---
const bannerStyle = {
  position: 'relative', 
  backgroundColor: colors.background,
  border: `1px solid ${colors.border}`,
  color: colors.text,
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

const textStyle = {
  margin: 0,
  lineHeight: '1.5',
  padding: '0 24px', 
};

const buttonStyle = {
  backgroundColor: colors.buttonAndIcon,
  color: colors.text,
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
  color: colors.text,
  transition: 'text-decoration 0.2s ease-in-out',
};

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
          <MdOutlineFeedback size={20} color={colors.retainedBlue} />
        </button>
        <a 
          href={releaseNotesUrl}
          style={{
            ...releaseNotesStyle,
            color: colors.retainedBlue,
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
          style={minimizeButtonStyle}
          title="Close banner"
          onMouseEnter={() => setIsMinimizeBtnHover(true)}
          onMouseLeave={() => setIsMinimizeBtnHover(false)}
        >
          <IoCloseCircle size={20} color={isMinimizeBtnHover ? colors.buttonHover : colors.buttonAndIcon} />
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
            ...(isFeedbackBtnHover && { backgroundColor: colors.buttonHover })
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
      <span style={{ fontStyle: "oblique", fontSize: "10px", color: colors.text }}> {versionNumber}</span>
    </div>
  );
};

export default FeedbackBanner;