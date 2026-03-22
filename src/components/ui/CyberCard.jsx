import React from 'react';

const CyberCard = ({ 
  children, 
  className = '', 
  variant = 'blue', 
  glow = true,
  interactive = false,
  padding = 'p-4',
  onClick,
  ...props
}) => {
  const borderColors = {
    blue: 'border-cyber-blue shadow-neon-blue/30',
    pink: 'border-cyber-pink shadow-neon-pink/30',
    violet: 'border-cyber-violet shadow-neon-violet/30',
    cyan: 'border-cyber-cyan shadow-neon-cyan/30',
    lime: 'border-cyber-lime shadow-neon-lime/30',
    amber: 'border-cyber-amber shadow-neon-amber/30',
  };

  const accentColors = {
    blue: 'border-cyber-blue',
    pink: 'border-cyber-pink',
    violet: 'border-cyber-violet',
    cyan: 'border-cyber-cyan',
    lime: 'border-cyber-lime',
    amber: 'border-cyber-amber',
  };

  return (
    <div 
      className={`
        cyber-glass rounded-sm relative overflow-hidden transition-all duration-300
        ${padding}
        ${glow ? borderColors[variant] : 'border-white/5'}
        ${interactive ? 'hover:border-cyber-' + variant + '/50 hover:bg-white/5 cursor-pointer' : ''}
        ${className}
      `}
      onClick={onClick}
      {...props}
    >
      {/* Corner accents */}
      <div className={`absolute top-0 left-0 w-2 h-2 border-t border-l ${accentColors[variant]} opacity-50`} />
      <div className={`absolute top-0 right-0 w-2 h-2 border-t border-r ${accentColors[variant]} opacity-50`} />
      <div className={`absolute bottom-0 left-0 w-2 h-2 border-b border-l ${accentColors[variant]} opacity-50`} />
      <div className={`absolute bottom-0 right-0 w-2 h-2 border-b border-r ${accentColors[variant]} opacity-50`} />
      
      {children}
    </div>
  );
};

export default CyberCard;
