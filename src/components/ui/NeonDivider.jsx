import React from 'react';

const NeonDivider = ({ variant = 'blue', className = '' }) => {
  const colors = {
    blue: '#00f0ff',
    pink: '#ff00ff',
    violet: '#7b2cbf',
    cyan: '#00ffff',
    lime: '#39ff14',
  };

  const color = colors[variant] || colors.blue;
  const shadow = variant === 'blue' || variant === 'cyan' || variant === 'lime'
    ? `0 0 10px ${color}, 0 0 20px ${color}33`
    : `0 0 10px ${color}`;

  return (
    <div className={`relative h-[1px] w-full my-4 ${className}`}>
      <div
        className="absolute inset-0 opacity-20"
        style={{ backgroundColor: color, boxShadow: shadow }}
      />
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-1/3 h-full"
        style={{ backgroundColor: color, boxShadow: shadow }}
      />
    </div>
  );
};

export default NeonDivider;
