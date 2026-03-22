import React, { useState } from 'react';

const CyberTooltip = ({ 
  children, 
  content, 
  position = 'top',
  variant = 'blue',
  delay = 200
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [timeoutId, setTimeoutId] = useState(null);

  const show = () => {
    const id = setTimeout(() => setIsVisible(true), delay);
    setTimeoutId(id);
  };

  const hide = () => {
    if (timeoutId) clearTimeout(timeoutId);
    setIsVisible(false);
  };

  const positions = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  const arrows = {
    top: 'top-full left-1/2 -translate-x-1/2 border-t-cyber-blue/30',
    bottom: 'bottom-full left-1/2 -translate-x-1/2 border-b-cyber-blue/30',
    left: 'left-full top-1/2 -translate-y-1/2 border-l-cyber-blue/30',
    right: 'right-full top-1/2 -translate-y-1/2 border-r-cyber-blue/30',
  };

  return (
    <div className="relative inline-block" onMouseEnter={show} onMouseLeave={hide}>
      {children}
      {isVisible && (
        <div className={`absolute z-[150] ${positions[position]} pointer-events-none animate-in fade-in zoom-in-95 duration-200`}>
          <div className={`cyber-glass-bright border-cyber-${variant}/30 p-2 shadow-2xl relative whitespace-nowrap`}>
            <span className="font-orbitron text-[9px] font-bold text-white uppercase tracking-widest">
              {content}
            </span>
            {/* Arrow */}
            <div className={`absolute w-0 h-0 border-[4px] border-transparent ${arrows[position]}`} />
          </div>
        </div>
      )}
    </div>
  );
};

export default CyberTooltip;
