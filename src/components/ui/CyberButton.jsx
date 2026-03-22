import React from 'react';

const CyberButton = ({ 
  children, 
  onClick, 
  variant = 'blue', 
  size = 'md',
  className = '', 
  type = 'button',
  disabled = false,
  fullWidth = false,
  icon: Icon,
  iconPosition = 'left',
  outline = false
}) => {
  const variants = {
    blue: outline 
      ? 'border-cyber-blue text-cyber-blue hover:bg-cyber-blue/10 shadow-neon-blue/20' 
      : 'bg-cyber-blue/10 border-cyber-blue text-cyber-blue hover:bg-cyber-blue hover:text-cyber-black shadow-neon-blue',
    pink: outline
      ? 'border-cyber-pink text-cyber-pink hover:bg-cyber-pink/10 shadow-neon-pink/20'
      : 'bg-cyber-pink/10 border-cyber-pink text-cyber-pink hover:bg-cyber-pink hover:text-cyber-black shadow-neon-pink',
    violet: outline
      ? 'border-cyber-violet text-cyber-violet hover:bg-cyber-violet/10 shadow-neon-violet/20'
      : 'bg-cyber-violet/10 border-cyber-violet text-cyber-violet hover:bg-cyber-violet hover:text-white',
    cyan: outline
      ? 'border-cyber-cyan text-cyber-cyan hover:bg-cyber-cyan/10 shadow-neon-cyan/20'
      : 'bg-cyber-cyan/10 border-cyber-cyan text-cyber-cyan hover:bg-cyber-cyan hover:text-cyber-black shadow-neon-cyan',
    lime: outline
      ? 'border-cyber-lime text-cyber-lime hover:bg-cyber-lime/10 shadow-neon-lime/20'
      : 'bg-cyber-lime/10 border-cyber-lime text-cyber-lime hover:bg-cyber-lime hover:text-cyber-black shadow-neon-lime',
    amber: outline
      ? 'border-cyber-amber text-cyber-amber hover:bg-cyber-amber/10 shadow-neon-amber/20'
      : 'bg-cyber-amber/10 border-cyber-amber text-cyber-amber hover:bg-cyber-amber hover:text-cyber-black shadow-neon-amber',
  };

  const sizes = {
    xs: 'px-2 py-1 text-[9px]',
    sm: 'px-3 py-1.5 text-[10px]',
    md: 'px-4 py-2 text-xs',
    lg: 'px-6 py-3 text-sm',
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`
        relative border font-orbitron uppercase tracking-widest
        transition-all duration-300 active:scale-95 disabled:opacity-50
        disabled:pointer-events-none glitch-hover inline-flex items-center justify-center gap-2
        ${variants[variant]}
        ${sizes[size]}
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `}
    >
      {/* Glitch-like side accents */}
      <span className="absolute top-0 left-0 w-[1px] h-full bg-current opacity-30" />
      <span className="absolute top-0 right-0 w-[1px] h-full bg-current opacity-30" />
      
      {Icon && iconPosition === 'left' && <Icon className={size === 'xs' ? 'h-3 w-3' : 'h-4 w-4'} />}
      {children}
      {Icon && iconPosition === 'right' && <Icon className={size === 'xs' ? 'h-3 w-3' : 'h-4 w-4'} />}
    </button>
  );
};

export default CyberButton;
