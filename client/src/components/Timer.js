import React, { useState, useEffect } from 'react';

const Timer = ({ elapsedSeconds = 0 }) => {
  const hours = Math.floor(elapsedSeconds / 3600);
  const minutes = Math.floor((elapsedSeconds % 3600) / 60);
  const seconds = elapsedSeconds % 60;

  const formatTime = (unit) => String(unit).padStart(2, '0');

  const customStyle = {
    fontFamily: 'Cascadia Code',
    fontSize: '25px',
    backgroundColor: '#c5c5c5',
    padding: '10px',
    borderRadius: '10px',
    boxShadow: '0px 2px 1px rgba(0, 0, 0, 0.37)',
  };

  const center = {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    margin: '10px 0'
  };

  return (
    <div style={center}>
      <p style={customStyle}>
        {formatTime(hours)}:{formatTime(minutes)}:{formatTime(seconds)}
      </p>
    </div>
  );
};

export default Timer;