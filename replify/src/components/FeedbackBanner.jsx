import React from 'react';

const bannerStyle = {
  backgroundColor: '#FFFBEA', // Light yellow background
  border: '1px solid #FDE68A',    // Yellow border
  color: '#92400E',               // Dark yellow/brown text for contrast
  padding: '12px 16px',
  margin: '0 0 16px 0', // Margin at the bottom to separate from content below
  borderRadius: '4px',
  fontSize: '14px',
  textAlign: 'center',
  display: 'flex',
  flexDirection: 'column', // Stack text and button vertically on small screens
  alignItems: 'center',
  justifyContent: 'center',
  gap: '8px', // Space between text and button
};

const textStyle = {
  margin: 0,
  lineHeight: '1.5',
};

const buttonStyle = {
  backgroundColor: '#FDBA74', // Orange-yellow button
  color: '#7C2D12',           // Darker text for button
  border: 'none',
  borderRadius: '4px',
  padding: '6px 12px',
  cursor: 'pointer',
  fontWeight: 'bold',
  textDecoration: 'none', // For anchor tag behavior
  fontSize: '13px',
  boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
};

const FeedbackBanner = () => {
  return (
    <div style={bannerStyle}>
      <p style={textStyle}>
        Enjoying Replify? Think it’s useful but buggy? Hate it? Have ideas for V2? We won't know unless you tell us! Let us know anonymously!
      </p>
      <a
        href="https://forms.gle/Qy6Ei8KF8bmwCKNK6"
        target="_blank"
        rel="noopener noreferrer"
        style={buttonStyle}
      >
        Share Feedback
      </a>
    </div>
  );
};

export default FeedbackBanner;