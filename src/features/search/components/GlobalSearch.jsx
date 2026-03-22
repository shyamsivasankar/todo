import React, { useState } from 'react';
import useSearch from '../hooks/useSearch';
import SearchResultItem from './SearchResultItem';
import { useStore } from '../../../store/useStore';
import { Search, Terminal, Zap, Activity } from 'lucide-react';
import CyberCard from '../../../components/ui/CyberCard';
import CyberBadge from '../../../components/ui/CyberBadge';

const GlobalSearch = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const { search } = useSearch();
  const results = search(query);
  const openTaskDetail = useStore((state) => state.openTaskDetail);

  if (!isOpen) {
    return null;
  }

  const handleSelect = (task) => {
    openTaskDetail(task.boardId, task.columnId, task.id);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-cyber-black/90 backdrop-blur-xl z-[100] flex items-start justify-center pt-32"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl px-4 animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative group">
          {/* Animated pulsing ring */}
          <div className="absolute -inset-1 bg-gradient-to-r from-cyber-blue via-cyber-cyan to-cyber-blue rounded-sm opacity-50 group-focus-within:opacity-100 group-focus-within:animate-glow-pulse transition-opacity blur" />
          
          <div className="relative flex items-center bg-surface-high border border-cyber-blue/50 p-4 shadow-neon-blue/20">
            <Search className="h-6 w-6 text-cyber-blue mr-4 animate-pulse" />
            <input
              type="text"
              placeholder="NEURAL_SEARCH_INIT..."
              className="w-full bg-transparent font-orbitron text-xl uppercase tracking-widest text-white placeholder-cyber-blue/30 outline-none"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
            />
            <div className="ml-4 flex items-center gap-2 font-mono text-[10px] text-cyber-blue opacity-50">
              <Terminal className="h-3 w-3" />
              [ CTRL+K ]
            </div>
          </div>
        </div>

        {query && (
          <div className="mt-6 space-y-2 max-h-[60vh] overflow-y-auto custom-scrollbar pr-2">
            <div className="flex items-center gap-2 font-orbitron text-[10px] text-surface-variant uppercase tracking-[0.3em] mb-4">
              <Activity className="h-3.5 w-3.5 text-cyber-pink" />
              Scan_Results: {results.length} Nodes Found
            </div>
            
            {results.map((result) => (
              <div 
                key={result.item.id} 
                onClick={() => handleSelect(result.item)}
              >
                <CyberCard 
                  variant={result.item.settings?.priority === 'high' ? 'pink' : 'blue'} 
                  padding="p-3"
                  interactive
                  glow={false}
                  className="border-white/5"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-1 h-8 ${result.item.settings?.priority === 'high' ? 'bg-cyber-pink shadow-neon-pink' : 'bg-cyber-blue shadow-neon-blue'}`} />
                      <div>
                        <h4 className="font-orbitron text-xs font-black text-white uppercase tracking-tight">
                          {result.item.heading}
                        </h4>
                        <p className="font-mono text-[9px] text-surface-variant line-clamp-1 mt-1 uppercase">
                          {result.item.tldr || 'NO_TLDR_DATA'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-mono text-[8px] text-surface-highest block">
                        ZONE: {result.item.boardName?.toUpperCase() || 'STANDALONE'}
                      </span>
                      <CyberBadge variant="violet" size="xs" className="mt-1">
                        {result.item.columnTitle || 'UNSECTORED'}
                      </CyberBadge>
                    </div>
                  </div>
                </CyberCard>
              </div>
            ))}

            {results.length === 0 && (
              <div className="py-12 text-center cyber-glass border-white/5">
                <p className="font-orbitron text-xs text-surface-variant uppercase tracking-widest animate-flicker">
                  - No matches detected in local matrix -
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default GlobalSearch;
