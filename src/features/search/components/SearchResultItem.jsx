import React from 'react';

const SearchResultItem = ({ result, onSelect }) => {
  const { item, matches } = result;

  // A simple highlighting function. For a more robust solution, a library could be used.
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
        <span key={start} className="bg-primary/30">
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
    const match = matches.find(m => m.key === 'description' || m.key === 'extendedData.comments.text');
    if (match) {
      return highlight(match.value, match.indices);
    }
    return item.description?.substring(0, 100) || 'No description';
  };

  return (
    <div
      className="p-4 mb-2 last:mb-0 rounded-lg cursor-pointer hover:bg-surface-light"
      onClick={() => onSelect(item)}
    >
      <div className="font-bold text-white">{highlight(item.heading, matches.find(m => m.key === 'heading')?.indices)}</div>
      <div className="text-sm text-text-muted">
        {item.boardName} {item.columnName && `> ${item.columnName}`}
      </div>
      <div className="text-sm text-text-secondary mt-1">{getSnippet()}</div>
    </div>
  );
};

export default SearchResultItem;
