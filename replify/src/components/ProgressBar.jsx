// src/components/ProgressBar.jsx

import React from 'react';

const progressContainerStyle = {
    width: '100%',
    backgroundColor: '#e0e0e0',
    borderRadius: '4px',
    marginTop: '15px',
    overflow: 'hidden',
    border: '1px solid #ccc',
};

const fillerStyle = {
    height: '24px',
    backgroundColor: '#007bff', // Using the primary button color
    textAlign: 'right',
    transition: 'width 0.4s ease-in-out',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
};

const labelStyle = {
    padding: '5px',
    color: 'white',
    fontWeight: 'bold',
    fontSize: '12px',
    textShadow: '1px 1px 1px rgba(0,0,0,0.3)',
};

export default function ProgressBar({ current, total }) {
    if (total === 0) return null;
    const percentage = Math.min((current / total) * 100, 100);

    return (
        <div>
            <div style={progressContainerStyle}>
                <div style={{...fillerStyle, width: `${percentage}%`}}>
                    <span style={labelStyle}>{`${Math.round(percentage)}%`}</span>
                </div>
            </div>
            <p style={{ textAlign: 'center', fontSize: '13px', marginTop: '5px', color: '#333' }}>
                {current} / {total} tasks completed
            </p>
        </div>
    );
}