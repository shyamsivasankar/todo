import React, { useEffect } from 'react';
import { X, Terminal } from 'lucide-react';
import CyberCard from './CyberCard';

const CyberModal = ({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  variant = 'blue', 
  maxWidth = 'max-w-2xl',
  showClose = true
}) => {
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-cyber-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="absolute inset-0" onClick={onClose} />
      
      <div className={`w-full ${maxWidth} relative z-10 animate-in zoom-in-95 duration-200`}>
        <CyberCard variant={variant} glow className="!p-0 border-cyber-blue/30 bg-surface shadow-2xl">
          {/* Modal Header */}
          {(title || showClose) && (
            <div className="flex items-center justify-between p-6 border-b border-white/5 bg-surface-high/50">
              <div className="flex items-center gap-3">
                <Terminal className={`h-5 w-5 text-cyber-${variant} animate-pulse`} />
                <h3 className="font-orbitron text-sm font-black uppercase tracking-[0.2em] text-white">
                  {title}
                </h3>
              </div>
              {showClose && (
                <button
                  onClick={onClose}
                  className="p-2 rounded-sm text-surface-variant hover:text-cyber-pink hover:bg-cyber-pink/5 transition-all group"
                >
                  <X className="h-5 w-5 group-hover:rotate-90 transition-transform" />
                </button>
              )}
            </div>
          )}
          
          {/* Modal Body */}
          <div className="p-6 max-h-[80vh] overflow-y-auto custom-scrollbar">
            {children}
          </div>
        </CyberCard>
      </div>
    </div>
  );
};

export default CyberModal;
