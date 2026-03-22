import React from 'react';

const CyberScrollArea = ({ 
  children, 
  className = '', 
  variant = 'blue',
  maxHeight
}) => {
  const scrollbarColors = {
    blue: '[&::-webkit-scrollbar-thumb]:bg-cyber-blue shadow-neon-blue/20',
    pink: '[&::-webkit-scrollbar-thumb]:bg-cyber-pink shadow-neon-pink/20',
    violet: '[&::-webkit-scrollbar-thumb]:bg-cyber-violet shadow-neon-violet/20',
    cyan: '[&::-webkit-scrollbar-thumb]:bg-cyber-cyan shadow-neon-cyan/20',
    lime: '[&::-webkit-scrollbar-thumb]:bg-cyber-lime shadow-neon-lime/20',
    amber: '[&::-webkit-scrollbar-thumb]:bg-cyber-amber shadow-neon-amber/20',
  };

  return (
    <div 
      className={`
        custom-scrollbar overflow-auto
        ${scrollbarColors[variant]}
        ${className}
      `}
      style={{ maxHeight }}
    >
      {children}
    </div>
  );
};

export default CyberScrollArea;
