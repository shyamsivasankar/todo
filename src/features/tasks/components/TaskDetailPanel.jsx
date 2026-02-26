import {
  AlertTriangle,
  Calendar,
  Clock,
  FileText,
  Link,
  Plus,
  Save,
  StickyNote,
  Timer,
  Trash2,
  X,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { useStore } from '../../../store/useStore'
import MarkdownDescription from './MarkdownDescription'
import TaskChecklist from './TaskChecklist'
import TaskAttachments from './TaskAttachments'
import TaskNoteLinker from './TaskNoteLinker'

const priorityOptions = ['low', 'medium', 'high']
const priorityDisplay = {
  high: { text: 'text-orange-400', label: 'High', icon: AlertTriangle },
  medium: { text: 'text-yellow-400', label: 'Medium', icon: null },
  low: { text: 'text-blue-400', label: 'Low', icon: null },
}

function formatTimeElapsed(dateStr) {
  if (!dateStr) return '--'
  const now = new Date()
  const date = new Date(dateStr)
  const diffMs = now - date
  const hours = Math.floor(diffMs / 3600000)
  const minutes = Math.floor((diffMs % 3600000) / 60000)
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m`
}

const toLocalISOString = (date) => {
  if (!date) return ''
  const d = new Date(date)
  if (isNaN(d.getTime())) return ''
  const offset = d.getTimezoneOffset() * 60000
  const localISOTime = new Date(d.getTime() - offset).toISOString().slice(0, 16)
  return localISOTime
}

const formatCreatedDate = (dateStr) => {
  if (!dateStr) return '--'
  return new Date(dateStr).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export default function TaskDetailPanel({ taskItem, onClose }) {
  const updateTask = useStore((state) => state.updateTask)
  const removeTask = useStore((state) => state.removeTask)
  const uiSettings = useStore((state) => state.uiSettings)
  const notes = useStore((state) => state.notes)
  const unlinkNoteFromTask = useStore((state) => state.unlinkNoteFromTask)
  const setActiveView = useStore((state) => state.setActiveView)
  const setSelectedNoteId = useStore((state) => state.setSelectedNoteId)

  const { task, boardId, boardName, columnId, status, isStandalone } = taskItem

  const [formState, setFormState] = useState({
    heading: '',
    tldr: '',
    description: '',
    priority: 'medium',
    tags: '',
    dueDate: '',
    completed: false,
  })
  const [dirty, setDirty] = useState(false)
  const [isLinkerOpen, setIsLinkerOpen] = useState(false)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFormState({
      heading: task.heading || '',
      tldr: task.tldr || '',
      description: task.description || '',
      priority: task.settings?.priority || 'medium',
      tags: (task.settings?.tags || []).join(', '),
      dueDate: toLocalISOString(task.settings?.dueDate),
      completed: !!task.settings?.completed,
    })
    setDirty(false)
  }, [task])

  const pDisplay = priorityDisplay[formState.priority] || priorityDisplay.medium
  const PriorityIcon = pDisplay.icon

  const handleFieldChange = (field, value) => {
    setFormState((prev) => ({ ...prev, [field]: value }))
    setDirty(true)
  }

  const handleSave = () => {
    updateTask(boardId, columnId, task.id, {
      heading: formState.heading.trim(),
      tldr: formState.tldr.trim(),
      description: formState.description.trim(),
      settings: {
        priority: formState.priority,
        tags: formState.tags.split(',').map((t) => t.trim()).filter(Boolean),
        dueDate: formState.dueDate ? new Date(formState.dueDate).toISOString() : undefined,
        completed: formState.completed,
      },
    })
    setDirty(false)
  }

  const handleDelete = () => {
    if (uiSettings.confirmBeforeDelete && !window.confirm('Delete this task? This action cannot be undone.')) {
      return
    }
    removeTask(boardId, columnId, task.id)
    onClose()
  }

  const handleViewNote = (noteId) => {
    setSelectedNoteId(noteId)
    setActiveView('notes')
    onClose()
  }

  const pinnedNotes = notes.filter((note) => note.taskIds?.includes(task.id))

  const tagList = formState.tags.split(',').map((t) => t.trim()).filter(Boolean)

  return (
    <aside className="w-[450px] shrink-0 bg-[#13151c] border-l border-border flex flex-col h-full shadow-2xl z-20">
      {/* Header */}
      <div className="h-14 px-6 flex items-center justify-between border-b border-border shrink-0">
        <div className="flex items-center gap-2 text-sm text-text-muted overflow-hidden">
          <span className="truncate hover:text-primary cursor-pointer transition-colors">
            {isStandalone ? 'Standalone' : boardName}
          </span>
          {!isStandalone && (
            <>
              <span className="text-text-muted/50">/</span>
              <span className="text-text-primary font-mono text-xs truncate">{status}</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleDelete}
            className="p-1.5 rounded hover:bg-surface-light text-text-muted hover:text-red-400 transition-colors"
            title="Delete"
          >
            <Trash2 className="h-4 w-4" />
          </button>
          <div className="w-px h-4 bg-border mx-1" />
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded hover:bg-surface-light text-text-muted hover:text-white transition-colors"
            title="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 custom-scrollbar scroll-smooth">
        {/* Status + checkbox */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <input
              type="checkbox"
              checked={formState.completed}
              onChange={(e) => handleFieldChange('completed', e.target.checked)}
              className="h-5 w-5 rounded border-border-light bg-transparent text-primary focus:ring-primary focus:ring-offset-0 cursor-pointer"
            />
            <span className={`text-xs font-mono uppercase ${formState.completed ? 'text-emerald-500' : 'text-text-muted'}`}>
              {formState.completed ? 'COMPLETED' : `STATUS: ${status}`}
            </span>
          </div>

          {/* Title (editable) */}
          <input
            value={formState.heading}
            onChange={(e) => handleFieldChange('heading', e.target.value)}
            className={`w-full text-2xl font-bold leading-tight tracking-tight mb-4 bg-transparent border-none outline-none focus:ring-0 p-0 ${formState.completed ? 'text-text-muted line-through' : 'text-white'}`}
          />

          {/* Tags */}
          {tagList.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {tagList.map((tag) => (
                <span
                  key={tag}
                  className="group relative px-2 py-0.5 rounded bg-[#1e212b] text-text-muted text-xs font-medium border border-border transition-all hover:pr-7"
                >
                  #{tag}
                  <button
                    type="button"
                    onClick={() => {
                      const nextTags = tagList.filter((t) => t !== tag)
                      handleFieldChange('tags', nextTags.join(', '))
                    }}
                    className="absolute right-1 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-text-muted/50 opacity-0 transition-all hover:bg-surface-light hover:text-white group-hover:opacity-100"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Metadata grid */}
        <div className="grid grid-cols-2 gap-4 mb-8 bg-[#1e212b]/50 p-4 rounded-lg border border-border">
          <div>
            <label className="block text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1">
              Created
            </label>
            <div className="text-sm text-text-secondary font-mono">
              {formatCreatedDate(task.createdAt)}
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1">
              Time Elapsed
            </label>
            <div className="flex items-center gap-1 text-sm text-text-secondary font-mono">
              <Timer className="h-3 w-3 text-text-muted" />
              {formatTimeElapsed(task.createdAt)}
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1">
              Priority
            </label>
            <select
              value={formState.priority}
              onChange={(e) => handleFieldChange('priority', e.target.value)}
              className={`flex items-center gap-1.5 text-sm bg-transparent border-none outline-none p-0 cursor-pointer ${pDisplay.text}`}
            >
              {priorityOptions.map((p) => (
                <option key={p} value={p} className="bg-surface text-white">
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1">
              Due Date
            </label>
            <input
              type="datetime-local"
              value={formState.dueDate}
              onChange={(e) => handleFieldChange('dueDate', e.target.value)}
              className="text-sm bg-transparent border-none outline-none p-0 text-text-secondary cursor-pointer"
            />
          </div>
        </div>

        {/* Notes / Description */}
        <div className="mb-8">
          <MarkdownDescription
            value={formState.description}
            onChange={(val) => handleFieldChange('description', val)}
          />
        </div>

        {/* Checklist */}
        <div className="mb-8">
          <TaskChecklist
            boardId={boardId}
            columnId={columnId}
            taskId={task.id}
            checklists={task.extendedData?.checklists || []}
          />
        </div>

        {/* TL;DR */}
        <div className="mb-8">
          <label className="block text-xs font-bold text-text-muted uppercase tracking-widest mb-3">
            Summary
          </label>
          <input
            value={formState.tldr}
            onChange={(e) => handleFieldChange('tldr', e.target.value)}
            placeholder="Brief summary..."
            className="w-full text-sm text-text-secondary bg-transparent border-none outline-none p-0 placeholder:text-text-muted/50"
          />
        </div>

        {/* Pinned Notes */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <StickyNote className="h-4 w-4 text-text-muted" />
              <label className="block text-xs font-bold text-text-muted uppercase tracking-widest">
                Pinned Notes
              </label>
            </div>
            <button
              type="button"
              onClick={() => setIsLinkerOpen(true)}
              className="flex items-center gap-1 text-[10px] font-bold text-primary uppercase tracking-wider hover:text-primary-light transition-colors"
            >
              <Plus className="h-3 w-3" />
              Link Note
            </button>
          </div>

          {isLinkerOpen && (
            <div className="mb-4">
              <TaskNoteLinker
                taskId={task.id}
                onClose={() => setIsLinkerOpen(false)}
              />
            </div>
          )}

          <div className="space-y-2">
            {pinnedNotes.length === 0 ? (
              <div className="text-xs text-text-muted italic bg-surface-light/20 rounded-lg p-3 border border-dashed border-border">
                No notes pinned to this task.
              </div>
            ) : (
              pinnedNotes.map((note) => (
                <div
                  key={note.id}
                  className="group flex items-center justify-between p-3 rounded-lg bg-surface-light/30 border border-border hover:border-primary/30 transition-all"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <FileText className="h-4 w-4 text-text-muted shrink-0" />
                    <span className="text-sm text-text-secondary truncate font-medium">
                      {note.title || 'Untitled Note'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={() => handleViewNote(note.id)}
                      className="p-1.5 rounded hover:bg-primary/10 text-text-muted hover:text-primary transition-colors"
                      title="View Note"
                    >
                      <Link className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => unlinkNoteFromTask(note.id, task.id)}
                      className="p-1.5 rounded hover:bg-red-400/10 text-text-muted hover:text-red-400 transition-colors"
                      title="Remove Link"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Tags editor */}
        <div className="mb-8">
          <label className="block text-xs font-bold text-text-muted uppercase tracking-widest mb-3">
            Tags
          </label>
          <input
            value={formState.tags}
            onChange={(e) => handleFieldChange('tags', e.target.value)}
            placeholder="tag1, tag2, tag3"
            className="w-full text-sm text-text-secondary bg-transparent border border-border rounded-lg px-3 py-2 outline-none focus:border-primary placeholder:text-text-muted/50"
          />
        </div>

        {/* Attachments */}
        <div className="mb-8">
          <TaskAttachments
            boardId={boardId}
            columnId={columnId}
            taskId={task.id}
            attachments={task.extendedData?.attachments || []}
          />
        </div>

        {/* Save button */}
        {dirty && (
          <button
            type="button"
            onClick={handleSave}
            className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-primary/30 hover:bg-primary-dark transition-all mb-4"
          >
            <Save className="h-4 w-4" />
            Save Changes
          </button>
        )}

        {/* Timeline */}
        {task.timeline && task.timeline.length > 0 && (
          <div className="mt-8 pt-6 border-t border-border">
            <h3 className="text-xs font-bold text-text-muted uppercase tracking-widest mb-3">
              Activity
            </h3>
            <div className="space-y-2">
              {[...task.timeline].reverse().slice(0, 5).map((entry, i) => (
                <div key={`${entry.timestamp}-${i}`} className="text-xs text-text-muted">
                  <span className="font-mono text-text-muted/60">
                    {new Date(entry.timestamp).toLocaleString()}
                  </span>
                  {' — '}
                  <span className="text-text-secondary">{entry.action}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer metadata */}
        <div className="mt-12 pt-6 border-t border-border text-[10px] text-text-muted/60 font-mono flex justify-between">
          <span>Last updated: {formatTimeElapsed(task.createdAt)} ago</span>
          <span>ID: {task.id?.slice(0, 6).toUpperCase()}</span>
        </div>
      </div>
    </aside>
  )
}

