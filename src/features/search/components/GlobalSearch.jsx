import React, { useState } from 'react';
import useSearch from '../hooks/useSearch';
import SearchResultItem from './SearchResultItem';
import { useStore } from '../../../store/useStore';

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
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-start justify-center pt-20"
      onClick={onClose}
    >
      <div
        className="bg-card rounded-lg shadow-xl p-4 w-full max-w-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <input
          type="text"
          placeholder="Search for tasks..."
          className="w-full pl-4 pr-4 py-3 bg-surface-light border border-border rounded-lg text-white placeholder-text-muted focus:ring-2 focus:ring-primary outline-none"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
        />
        <div className="mt-4 max-h-96 overflow-y-auto">
          {results.map((result) => (
            <SearchResultItem
              key={result.item.id}
              result={result}
              onSelect={handleSelect}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default GlobalSearch;
