import React from 'react';

const CyberInput = ({ 
  label, 
  id, 
  type = 'text', 
  placeholder, 
  value, 
  onChange, 
  className = '', 
  variant = 'blue',
  error,
  icon: Icon,
  ...props 
}) => {
  const focusColors = {
    blue: 'focus:border-cyber-blue focus:shadow-neon-blue/30',
    pink: 'focus:border-cyber-pink focus:shadow-neon-pink/30',
    violet: 'focus:border-cyber-violet focus:shadow-neon-violet/30',
    cyan: 'focus:border-cyber-cyan focus:shadow-neon-cyan/30',
    lime: 'focus:border-cyber-lime focus:shadow-neon-lime/30',
    amber: 'focus:border-cyber-amber focus:shadow-neon-amber/30',
  };

  const accentColors = {
    blue: 'bg-cyber-blue',
    pink: 'bg-cyber-pink',
    violet: 'bg-cyber-violet',
    cyan: 'bg-cyber-cyan',
    lime: 'bg-cyber-lime',
    amber: 'bg-cyber-amber',
  };

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && (
        <label htmlFor={id} className="text-[9px] font-orbitron font-bold text-surface-variant uppercase tracking-[0.2em] ml-1">
          {label}
        </label>
      )}
      <div className="relative group">
        {Icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-variant group-focus-within:text-white transition-colors">
            <Icon className="h-3.5 w-3.5" />
          </div>
        )}
        
        {type === 'select' ? (
          <select
            id={id}
            value={value}
            onChange={onChange}
            className={`
              w-full bg-surface-low/50 border ${error ? 'border-cyber-pink' : 'border-white/10'} 
              ${Icon ? 'pl-9' : 'pl-3'} pr-3 py-2 font-mono text-xs transition-all duration-300
              appearance-none cursor-pointer outline-none
              ${focusColors[variant]}
            `}
            {...props}
          >
            {props.children}
          </select>
        ) : (
          <input
            id={id}
            type={type}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            className={`
              w-full bg-surface-low/50 border ${error ? 'border-cyber-pink' : 'border-white/10'} 
              ${Icon ? 'pl-9' : 'pl-3'} pr-3 py-2 font-mono text-xs transition-all duration-300
              placeholder:text-surface-highest outline-none
              ${focusColors[variant]}
            `}
            {...props}
          />
        )}
        
        {/* Decorative corner */}
        {!error && (
          <div className={`absolute bottom-0 right-0 w-1.5 h-1.5 ${accentColors[variant]} opacity-30 group-focus-within:opacity-100 transition-opacity`} style={{ clipPath: 'polygon(100% 0, 0 100%, 100% 100%)' }} />
        )}
        
        {error && (
          <div className="absolute bottom-0 right-0 w-1.5 h-1.5 bg-cyber-pink" style={{ clipPath: 'polygon(100% 0, 0 100%, 100% 100%)' }} />
        )}
      </div>
      {error && (
        <span className="text-[8px] font-mono text-cyber-pink uppercase tracking-tighter ml-1">
          {error}
        </span>
      )}
    </div>
  );
};

export default CyberInput;
