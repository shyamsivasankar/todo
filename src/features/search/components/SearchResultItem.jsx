import React from 'react';
import CyberCard from '../../../components/ui/CyberCard';
import CyberBadge from '../../../components/ui/CyberBadge';

const SearchResultItem = ({ result, onSelect }) => {
  const { item, matches } = result;

  const highlight = (text, indices) => {
    if (!indices || indices.length === 0) {
      return text;
    }
    const highlighted = [];
    let lastIndex = 0;
    indices.forEach(([start, end]) => {
      if (lastIndex < start) {
        highlighted.push(text.substring(lastIndex, start));
      }
      highlighted.push(
        <span key={start} className="bg-cyber-blue/30 text-cyber-blue px-0.5 rounded-sm shadow-neon-blue/20">
          {text.substring(start, end + 1)}
        </span>
      );
      lastIndex = end + 1;
    });
    if (lastIndex < text.length) {
      highlighted.push(text.substring(lastIndex));
    }
    return highlighted;
  };

  const getSnippet = () => {
    const match = matches.find(m => m.key === 'description' || m.key === 'extendedData.comments.text' || m.key === 'tldr');
    if (match) {
      return highlight(match.value, match.indices);
    }
    return item.tldr || item.description?.substring(0, 100) || 'NO_PROTOCOLS_DEFINED';
  };

  const priority = item.settings?.priority || 'medium';
  const variant = priority === 'high' ? 'amber' : priority === 'low' ? 'lime' : 'blue';

  return (
    <CyberCard
      variant={variant}
      padding="p-4"
      interactive
      glow={false}
      className="mb-2 last:mb-0 border-white/5"
      onClick={() => onSelect(item)}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="font-orbitron text-xs font-black text-white uppercase tracking-wider mb-1">
            {highlight(item.heading, matches.find(m => m.key === 'heading')?.indices)}
          </div>
          <div className="flex items-center gap-3 mb-2">
            <span className="font-mono text-[9px] text-surface-variant uppercase tracking-widest">
              MATRIX: {item.boardName?.toUpperCase() || 'STANDALONE'}
            </span>
            {item.columnTitle && (
              <CyberBadge variant={variant} size="xs">
                {item.columnTitle.toUpperCase()}
              </CyberBadge>
            )}
          </div>
          <div className="font-mono text-[10px] text-white/60 uppercase tracking-tighter line-clamp-2">
            {getSnippet()}
          </div>
        </div>
        <div className="text-right">
          <CyberBadge variant={variant} size="xs">
            {priority.toUpperCase()}
          </CyberBadge>
        </div>
      </div>
    </CyberCard>
  );
};

export default SearchResultItem;
