import React from 'react';

const progressContainerStyle = { width: '100%', backgroundColor: '#e0e0e0', borderRadius: '4px', marginTop: '15px', overflow: 'hidden', border: '1px solid #ccc' };
const fillerStyle = { height: '24px', backgroundColor: '#00A4FD', textAlign: 'right', transition: 'width 0.4s ease-in-out', display: 'flex', alignItems: 'center', justifyContent: 'center' };
const labelStyle = { padding: '5px', color: 'white', fontWeight: 'bold', fontSize: '12px', textShadow: '1px 1px 1px rgba(0,0,0,0.3)' };
const statusTextStyle = { textAlign: 'center', fontSize: '13px', marginTop: '8px', color: '#333', fontStyle: 'italic' };

export default function ProgressBar({ progressData, totalTimeEstimate }) {
    const { tasksCompleted, totalTasks, currentUser, currentStatus } = progressData;
    if (totalTasks === 0) return null;
    
    const percentage = Math.min((tasksCompleted / totalTasks) * 100, 100);

    const timeRemaining = () => {
      const secondsElapsed = (tasksCompleted / totalTasks) * totalTimeEstimate;
      const secondsLeft = Math.max(0, totalTimeEstimate - secondsElapsed);
      const minutes = Math.floor(secondsLeft / 60);
      const seconds = Math.floor(secondsLeft % 60);
      return `${minutes}m ${seconds}s`;
    };

    return (
        <div>
            <div style={progressContainerStyle}>
                <div style={{...fillerStyle, width: `${percentage}%`}}>
                    <span style={labelStyle}>{`${Math.round(percentage)}%`}</span>
                </div>
            </div>
            <p style={statusTextStyle}>
                {currentUser && <strong>{`Processing: ${currentUser}... `}</strong>}
                {currentStatus && <span>{currentStatus}</span>}
            </p>
             <p style={{ textAlign: 'center', fontSize: '12px', marginTop: '5px', color: '#666' }}>
                {`(${tasksCompleted} / ${totalTasks}) tasks completed. Est. time remaining: ${timeRemaining()}`}
            </p>
        </div>
    );
}