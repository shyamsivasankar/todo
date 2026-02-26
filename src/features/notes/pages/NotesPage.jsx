import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, Search, Trash2, StickyNote, FileText } from 'lucide-react';
import { useStore } from '../../../store/useStore';
import NoteEditor from '../components/NoteEditor';

const formatRelativeTime = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);

  if (diffInSeconds < 60) return 'just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
  return date.toLocaleDateString();
};

export default function NotesPage() {
  const { notes, addNote, updateNote, removeNote, selectedNoteId, setSelectedNoteId } = useStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [localTitle, setLocalTitle] = useState('');
  
  const selectedNote = notes.find(n => n.id === selectedNoteId);
  
  // Sync local title when selected note changes
  useEffect(() => {
    const title = selectedNote ? selectedNote.title : '';
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLocalTitle(title);
  }, [selectedNoteId, selectedNote]);

  // Auto-save logic for title and content
  const saveTimeoutRef = useRef(null);
  
  const debouncedUpdate = useCallback((id, updates) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    saveTimeoutRef.current = setTimeout(() => {
      updateNote(id, updates);
    }, 1000);
  }, [updateNote]);

  const handleTitleChange = (e) => {
    const newTitle = e.target.value;
    setLocalTitle(newTitle);
    if (selectedNoteId) {
      debouncedUpdate(selectedNoteId, { title: newTitle });
    }
  };

  const handleContentChange = (content) => {
    if (selectedNoteId) {
      debouncedUpdate(selectedNoteId, { content });
    }
  };

  const handleCreateNote = () => {
    addNote({ title: 'Untitled Note', content: '' });
  };

  // Auto-select the newest note when one is added
  const prevNotesLength = useRef(notes.length);
  useEffect(() => {
    if (notes.length > prevNotesLength.current) {
      const firstNoteId = notes[0]?.id;
      if (firstNoteId) {
        setSelectedNoteId(firstNoteId);
      }
    }
    prevNotesLength.current = notes.length;
  }, [notes, setSelectedNoteId]);

  // Initial selection
  useEffect(() => {
    if (!selectedNoteId && notes.length > 0) {
      const firstNoteId = notes[0].id;
      setSelectedNoteId(firstNoteId);
    }
  }, [notes, selectedNoteId, setSelectedNoteId]);

  const filteredNotes = notes.filter(n => 
    n.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex h-full w-full overflow-hidden bg-surface">
      {/* Left Sidebar: Notes List */}
      <div className="flex w-80 flex-col border-r border-border bg-surface-dark/50">
        <div className="flex items-center justify-between p-6 pb-4">
          <h1 className="text-xl font-bold text-white">Notes</h1>
          <button
            onClick={handleCreateNote}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white hover:bg-primary-dark transition-all hover:scale-105 active:scale-95 shadow-lg shadow-primary/20"
            title="New Note"
          >
            <Plus className="h-5 w-5" />
          </button>
        </div>
        
        <div className="px-4 pb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              placeholder="Search notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg bg-surface-light/50 border border-border/50 py-2 pl-10 pr-4 text-sm text-white placeholder-text-muted outline-none focus:ring-2 focus:ring-primary/50 transition-all"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar px-2 pb-4">
          {filteredNotes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-text-muted px-4 text-center">
              <FileText className="h-8 w-8 mb-2 opacity-20" />
              <p className="text-sm">No notes found</p>
            </div>
          ) : (
            filteredNotes.map((note) => (
              <div
                key={note.id}
                onClick={() => setSelectedNoteId(note.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && setSelectedNoteId(note.id)}
                className={`group relative mb-1 flex w-full cursor-pointer flex-col gap-1 rounded-xl p-4 text-left transition-all outline-none ${
                  selectedNoteId === note.id
                    ? 'bg-primary/10 text-primary ring-1 ring-primary/30'
                    : 'text-text-muted hover:bg-surface-light hover:text-text-secondary'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className={`truncate font-medium ${selectedNoteId === note.id ? 'text-white' : ''}`}>
                    {note.title || 'Untitled Note'}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (window.confirm('Are you sure you want to delete this note?')) {
                        removeNote(note.id);
                        if (selectedNoteId === note.id) setSelectedNoteId(null);
                      }
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 transition-all"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-wider opacity-50">
                    {formatRelativeTime(note.updatedAt)}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main Area: Editor */}
      <div className="flex flex-1 flex-col overflow-hidden bg-surface/30">
        {selectedNote ? (
          <div className="flex h-full flex-col">
            <div className="px-10 pt-10 pb-6">
              <input
                type="text"
                value={localTitle}
                onChange={handleTitleChange}
                placeholder="Note Title"
                className="w-full bg-transparent text-4xl font-bold text-white outline-none placeholder:text-text-muted/20"
              />
              <div className="mt-2 flex items-center gap-4 text-xs text-text-muted">
                <span>Created {new Date(selectedNote.createdAt).toLocaleDateString()}</span>
                <span className="h-1 w-1 rounded-full bg-border" />
                <span>Last updated {formatRelativeTime(selectedNote.updatedAt)}</span>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-10 pb-10 custom-scrollbar">
              <NoteEditor
                key={selectedNote.id}
                initialContent={selectedNote.content}
                onChange={handleContentChange}
              />
            </div>
          </div>
        ) : (
          <div className="flex h-full flex-col items-center justify-center text-text-muted">
            <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-3xl bg-surface-light/50 shadow-inner">
              <StickyNote className="h-12 w-12 opacity-10" />
            </div>
            <h2 className="text-xl font-semibold text-white/80">Your Knowledge Base</h2>
            <p className="mt-2 text-sm max-w-xs text-center opacity-60">
              Capture ideas, document processes, or just keep track of your thoughts.
            </p>
            <button
              onClick={handleCreateNote}
              className="mt-8 flex items-center gap-2 rounded-full bg-primary/10 px-6 py-2.5 text-sm font-medium text-primary hover:bg-primary/20 transition-all"
            >
              <Plus className="h-4 w-4" />
              Create your first note
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
