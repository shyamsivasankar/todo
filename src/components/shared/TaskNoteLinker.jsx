import React, { useState } from 'react';
import { X, Search, Plus, Link as LinkIcon, FileText, Terminal, Activity } from 'lucide-react';
import { useStore } from '../../store/useStore';
import CyberButton from '../ui/CyberButton';

const TaskNoteLinker = ({ taskId, onClose }) => {
  const notes = useStore((state) => state.notes);
  const linkNoteToTask = useStore((state) => state.linkNoteToTask);
  const createNote = useStore((state) => state.createNote);
  
  const [search, setSearch] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [newNoteTitle, setNewNoteTitle] = useState('');

  const filteredNotes = notes.filter(note => 
    !note.taskIds?.includes(taskId) && 
    (note.title.toLowerCase().includes(search.toLowerCase()) || 
     note.content.toLowerCase().includes(search.toLowerCase()))
  );

  const handleLink = (noteId) => {
    linkNoteToTask(noteId, taskId);
    // We don't necessarily close here to allow multiple linking, 
    // but the linked note will disappear from filteredNotes
  };

  const handleCreateAndLink = () => {
    if (!newNoteTitle.trim()) return;
    
    const noteId = createNote(newNoteTitle, '');
    linkNoteToTask(noteId, taskId);
    setNewNoteTitle('');
    setIsCreating(false);
  };

  return (
    <div className="cyber-glass rounded-sm border border-cyber-blue/30 p-4 shadow-neon-blue/10 animate-in fade-in zoom-in-95 duration-200">
      <div className="flex items-center justify-between mb-4 border-b border-cyber-blue/20 pb-2">
        <div className="flex items-center gap-2">
          <Terminal className="h-3 w-3 text-cyber-blue" />
          <h4 className="font-orbitron text-[10px] font-bold text-cyber-blue uppercase tracking-widest">
            Neural_Link_Protocol
          </h4>
        </div>
        <button
          onClick={onClose}
          className="text-surface-variant hover:text-cyber-pink transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {!isCreating ? (
        <div className="space-y-4">
          <div className="relative group">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-cyber-blue/40 h-3 w-3 group-focus-within:text-cyber-blue" />
            <input
              type="text"
              placeholder="SCAN_NEURAL_NODES..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-surface-low border border-white/5 rounded-sm pl-7 pr-3 py-1.5 text-[10px] font-mono text-white placeholder-surface-variant focus:border-cyber-blue/50 outline-none transition-all uppercase"
            />
          </div>

          <div className="max-h-40 overflow-y-auto custom-scrollbar space-y-1">
            {filteredNotes.length === 0 ? (
              <div className="py-4 text-center border border-dashed border-white/5 rounded-sm">
                <p className="font-mono text-[9px] text-surface-variant uppercase tracking-tighter">
                  - No unlinked nodes detected -
                </p>
              </div>
            ) : (
              filteredNotes.map(note => (
                <button
                  key={note.id}
                  onClick={() => handleLink(note.id)}
                  className="w-full flex items-center justify-between p-2 rounded-sm bg-white/5 border border-transparent hover:border-cyber-blue/30 hover:bg-cyber-blue/5 transition-all group"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="h-3 w-3 text-surface-variant group-hover:text-cyber-blue" />
                    <span className="font-mono text-[10px] text-white truncate uppercase">{note.title}</span>
                  </div>
                  <LinkIcon className="h-3 w-3 text-cyber-blue opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              ))
            )}
          </div>

          <button
            onClick={() => setIsCreating(true)}
            className="w-full flex items-center justify-center gap-2 py-2 border border-dashed border-cyber-pink/30 text-cyber-pink/60 hover:text-cyber-pink hover:border-cyber-pink hover:bg-cyber-pink/5 transition-all rounded-sm font-orbitron text-[9px] uppercase tracking-widest"
          >
            <Plus className="h-3 w-3" />
            Initialize_New_Node
          </button>
        </div>
      ) : (
        <div className="space-y-4 animate-in slide-in-from-right-2 duration-200">
          <div className="space-y-2">
            <label className="font-orbitron text-[9px] text-surface-variant uppercase tracking-widest">Node_Identifier</label>
            <input
              type="text"
              autoFocus
              value={newNoteTitle}
              onChange={(e) => setNewNoteTitle(e.target.value)}
              placeholder="ENTER_TITLE..."
              className="w-full bg-surface-low border border-cyber-pink/30 rounded-sm px-3 py-2 text-[10px] font-mono text-white outline-none focus:border-cyber-pink shadow-neon-pink/10 uppercase"
              onKeyDown={(e) => e.key === 'Enter' && handleCreateAndLink()}
            />
          </div>
          <div className="flex gap-2">
            <CyberButton 
              variant="pink" 
              fullWidth 
              className="!text-[9px] !py-1.5"
              onClick={handleCreateAndLink}
            >
              Initialize
            </CyberButton>
            <button 
              onClick={() => setIsCreating(false)}
              className="flex-1 font-orbitron text-[9px] uppercase tracking-widest text-surface-variant hover:text-white transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="mt-4 pt-2 border-t border-white/5 flex items-center gap-2">
        <Activity className="h-2.5 w-2.5 text-cyber-blue opacity-30" />
        <span className="font-mono text-[8px] text-surface-highest uppercase tracking-tighter">
          Protocol: NEURAL_LINK_V2.0
        </span>
      </div>
    </div>
  );
};

export default TaskNoteLinker;
