import React from 'react';

const CyberBadge = ({ 
  children, 
  variant = 'blue', 
  size = 'md', 
  className = '',
  icon: Icon,
  onRemove
}) => {
  const variants = {
    blue: 'text-cyber-blue bg-cyber-blue/10 border-cyber-blue/30',
    pink: 'text-cyber-pink bg-cyber-pink/10 border-cyber-pink/30',
    violet: 'text-cyber-violet bg-cyber-violet/10 border-cyber-violet/30',
    cyan: 'text-cyber-cyan bg-cyber-cyan/10 border-cyber-cyan/30',
    lime: 'text-cyber-lime bg-cyber-lime/10 border-cyber-lime/30',
    amber: 'text-cyber-amber bg-cyber-amber/10 border-cyber-amber/30',
  };

  const sizes = {
    xs: 'text-[8px] px-1 py-0.5',
    sm: 'text-[9px] px-1.5 py-0.5',
    md: 'text-[10px] px-2 py-1',
    lg: 'text-xs px-3 py-1.5',
  };

  return (
    <span className={`
      inline-flex items-center gap-1.5 font-mono font-bold uppercase tracking-widest rounded-sm border
      ${variants[variant]}
      ${sizes[size]}
      ${className}
    `}>
      {Icon && <Icon className="h-2.5 w-2.5" />}
      {children}
      {onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="ml-1 hover:text-white transition-colors"
        >
          ×
        </button>
      )}
    </span>
  );
};

export default CyberBadge;
