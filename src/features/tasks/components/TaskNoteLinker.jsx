import React, { useState } from 'react';
import { Search, Pin, PinOff, X, FileText } from 'lucide-react';
import { useStore } from '../../../store/useStore';

export default function TaskNoteLinker({ taskId, onClose }) {
  const notes = useStore((state) => state.notes);
  const linkNoteToTask = useStore((state) => state.linkNoteToTask);
  const unlinkNoteFromTask = useStore((state) => state.unlinkNoteFromTask);
  
  const [searchQuery, setSearchQuery] = useState('');

  const filteredNotes = notes.filter((note) =>
    note.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleTogglePin = (note) => {
    const isPinned = note.taskIds?.includes(taskId);
    if (isPinned) {
      unlinkNoteFromTask(note.id, taskId);
    } else {
      linkNoteToTask(note.id, taskId);
    }
  };

  return (
    <div className="flex flex-col h-[400px] w-full bg-surface-dark border border-border rounded-xl shadow-2xl overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-border bg-surface-light/30">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">Link Note</h3>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg hover:bg-white/10 text-text-muted hover:text-white transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="p-4 border-b border-border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
          <input
            type="text"
            placeholder="Search notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-surface border border-border rounded-lg py-2 pl-10 pr-4 text-sm text-white placeholder-text-muted outline-none focus:ring-2 focus:ring-primary/50 transition-all"
            autoFocus
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
        {filteredNotes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-text-muted text-center">
            <FileText className="h-8 w-8 mb-2 opacity-20" />
            <p className="text-sm">No notes found</p>
          </div>
        ) : (
          <div className="space-y-1">
            {filteredNotes.map((note) => {
              const isPinned = note.taskIds?.includes(taskId);
              return (
                <div
                  key={note.id}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-white/5 transition-colors group"
                >
                  <div className="flex flex-col min-w-0 mr-4">
                    <span className="text-sm font-medium text-white truncate">
                      {note.title || 'Untitled Note'}
                    </span>
                    <span className="text-[10px] text-text-muted uppercase tracking-tighter">
                      Updated {new Date(note.updatedAt).toLocaleDateString()}
                    </span>
                  </div>
                  <button
                    onClick={() => handleTogglePin(note)}
                    className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                      isPinned
                        ? 'bg-primary/20 text-primary ring-1 ring-primary/30 hover:bg-primary/30'
                        : 'bg-surface-light text-text-muted hover:text-white hover:bg-surface-lighter'
                    }`}
                  >
                    {isPinned ? (
                      <>
                        <PinOff className="h-3 w-3" />
                        Unpin
                      </>
                    ) : (
                      <>
                        <Pin className="h-3 w-3" />
                        Pin
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
