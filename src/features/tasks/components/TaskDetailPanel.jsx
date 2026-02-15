import {
  AlertTriangle,
  Calendar,
  Clock,
  Plus,
  Save,
  Timer,
  Trash2,
  X,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { useStore } from '../../../store/useStore'

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

function formatCreatedDate(dateStr) {
  if (!dateStr) return '--'
  const date = new Date(dateStr)
  const now = new Date()
  const isToday = date.toDateString() === now.toDateString()
  const time = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
  return isToday ? `Today, ${time}` : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + `, ${time}`
}

export default function TaskDetailPanel({ taskItem, onClose }) {
  const updateTask = useStore((state) => state.updateTask)
  const removeTask = useStore((state) => state.removeTask)
  const uiSettings = useStore((state) => state.uiSettings)

  const { task, boardId, boardName, columnId, status, isStandalone } = taskItem

  const [formState, setFormState] = useState({
    heading: '',
    tldr: '',
    description: '',
    priority: 'medium',
    tags: '',
    dueDate: '',
  })
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFormState({
      heading: task.heading || '',
      tldr: task.tldr || '',
      description: task.description || '',
      priority: task.settings?.priority || 'medium',
      tags: (task.settings?.tags || []).join(', '),
      dueDate: task.settings?.dueDate || '',
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
        dueDate: formState.dueDate,
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
              className="h-5 w-5 rounded border-border-light bg-transparent text-primary focus:ring-primary focus:ring-offset-0"
            />
            <span className="text-xs font-mono text-text-muted uppercase">
              STATUS: {status}
            </span>
          </div>

          {/* Title (editable) */}
          <input
            value={formState.heading}
            onChange={(e) => handleFieldChange('heading', e.target.value)}
            className="w-full text-2xl font-bold text-white leading-tight tracking-tight mb-4 bg-transparent border-none outline-none focus:ring-0 p-0"
          />

          {/* Tags */}
          {tagList.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {tagList.map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-0.5 rounded bg-[#1e212b] text-text-muted text-xs font-medium border border-border"
                >
                  #{tag}
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
              type="date"
              value={formState.dueDate}
              onChange={(e) => handleFieldChange('dueDate', e.target.value)}
              className="text-sm bg-transparent border-none outline-none p-0 text-text-secondary cursor-pointer"
            />
          </div>
        </div>

        {/* Notes / Description */}
        <div className="mb-8">
          <label className="block text-xs font-bold text-text-muted uppercase tracking-widest mb-3">
            Notes
          </label>
          <textarea
            value={formState.description}
            onChange={(e) => handleFieldChange('description', e.target.value)}
            rows={8}
            placeholder="Add notes here..."
            className="w-full resize-none text-sm text-text-secondary leading-relaxed font-light bg-transparent border-none outline-none p-0 placeholder:text-text-muted/50"
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
