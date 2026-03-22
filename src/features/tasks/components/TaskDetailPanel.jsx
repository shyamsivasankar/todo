import {
  AlertTriangle,
  Calendar,
  Clock,
  FileText,
  Link as LinkIcon,
  Plus,
  Save,
  StickyNote,
  Timer,
  Trash2,
  X,
  Zap,
  Activity,
  Terminal,
} from 'lucide-react'
import { useState } from 'react'
import { useStore } from '../../../store/useStore'
import MarkdownEditor from '../../../components/ui/MarkdownEditor'
import TaskChecklist from './TaskChecklist'
import TaskAttachments from './TaskAttachments'
import TaskNoteLinker from '../../../components/shared/TaskNoteLinker'
import CyberButton from '../../../components/ui/CyberButton'
import CyberInput from '../../../components/ui/CyberInput'
import CyberBadge from '../../../components/ui/CyberBadge'
import CyberTooltip from '../../../components/ui/CyberTooltip'
import CyberCard from '../../../components/ui/CyberCard'

const priorityOptions = ['low', 'medium', 'high']
const priorityDisplay = {
  high: { variant: 'amber', label: 'CRITICAL', icon: AlertTriangle },
  medium: { variant: 'blue', label: 'ACTIVE', icon: Activity },
  low: { variant: 'lime', label: 'STABLE', icon: Zap },
}

function formatTimeElapsed(dateStr) {
  if (!dateStr) return '--'
  const now = new Date()
  const date = new Date(dateStr)
  const diffMs = now - date
  const hours = Math.floor(diffMs / 3600000)
  const minutes = Math.floor((diffMs % 3600000) / 60000)
  if (hours > 0) return `${hours}H ${minutes}M`
  return `${minutes}M`
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
  }).toUpperCase()
}

export default function TaskDetailPanel({ taskItem, onClose }) {
  const updateTask = useStore((state) => state.updateTask)
  const removeTask = useStore((state) => state.removeTask)
  const uiSettings = useStore((state) => state.uiSettings)
  const notes = useStore((state) => state.notes)
  const unlinkNoteFromTask = useStore((state) => state.unlinkNoteFromTask)
  const setActiveView = useStore((state) => state.setActiveView)

  const { task, boardId, boardName, columnId, status, isStandalone } = taskItem

  const [formState, setFormState] = useState({
    heading: task.heading || '',
    tldr: task.tldr || '',
    description: task.description || '',
    priority: task.settings?.priority || 'medium',
    tags: (task.settings?.tags || []).join(', '),
    dueDate: toLocalISOString(task.settings?.dueDate),
    completed: !!task.settings?.completed,
  })
  const [dirty, setDirty] = useState(false)
  const [isLinkerOpen, setIsLinkerOpen] = useState(false)

  const pDisplay = priorityDisplay[formState.priority] || priorityDisplay.medium

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
    if (uiSettings.confirmBeforeDelete && !window.confirm('Delete this task?')) return
    removeTask(boardId, columnId, task.id)
    onClose()
  }

  const pinnedNotes = notes?.filter((note) => note.taskIds?.includes(task.id)) || []
  const tagList = formState.tags.split(',').map((t) => t.trim()).filter(Boolean)

  return (
    <aside className="w-[450px] shrink-0 bg-surface border-l border-cyber-blue/20 flex flex-col h-full shadow-2xl z-20 relative">
      <div className="absolute inset-0 pointer-events-none opacity-[0.03]">
        <div className="cyber-grid" />
      </div>

      {/* Header */}
      <div className="h-16 px-6 flex items-center justify-between border-b border-white/5 bg-surface-high/50 backdrop-blur-xl shrink-0 relative z-10">
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-2 text-[9px] font-orbitron uppercase tracking-widest text-surface-variant">
            <span className="truncate">{isStandalone ? 'STANDALONE' : boardName}</span>
            {!isStandalone && <><span className="opacity-30">/</span><span className="text-cyber-blue font-bold">{status}</span></>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <CyberTooltip content="Delete Task" variant="pink">
            <button onClick={handleDelete} className="p-2 text-surface-variant hover:text-cyber-pink transition-all"><Trash2 className="h-4 w-4" /></button>
          </CyberTooltip>
          <div className="w-px h-4 bg-white/10 mx-1" />
          <button onClick={onClose} className="p-2 text-surface-variant hover:text-white transition-all"><X className="h-4 w-4" /></button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 custom-scrollbar relative z-10 space-y-8">
        {/* Status + Heading */}
        <section>
          <div className="flex items-center gap-3 mb-4">
            <div 
              className={`h-5 w-5 rounded-sm border cursor-pointer flex items-center justify-center transition-all ${formState.completed ? 'bg-cyber-lime border-cyber-lime shadow-neon-lime' : 'border-white/20 hover:border-cyber-lime/50'}`}
              onClick={() => handleFieldChange('completed', !formState.completed)}
            >
              {formState.completed && <span className="text-cyber-black text-[10px] font-bold">✓</span>}
            </div>
            <span className={`font-orbitron text-[10px] font-bold tracking-widest ${formState.completed ? 'text-cyber-lime animate-flicker' : 'text-surface-variant'}`}>
              {formState.completed ? 'TASK_COMPLETED' : 'IN_PROGRESS'}
            </span>
          </div>

          <textarea
            value={formState.heading}
            onChange={(e) => handleFieldChange('heading', e.target.value)}
            className={`w-full text-xl font-orbitron font-black uppercase tracking-tight bg-transparent border-none outline-none focus:ring-0 p-0 resize-none ${formState.completed ? 'text-surface-variant line-through' : 'text-white group-focus-within:text-cyber-blue'}`}
            rows={2}
            placeholder="TASK_HEADING_INIT..."
          />

          <div className="flex flex-wrap gap-2 mt-4">
            {tagList.map((tag, i) => (
              <CyberBadge key={i} variant="violet" size="xs" onRemove={() => { const next = tagList.filter((_, idx) => idx !== i); handleFieldChange('tags', next.join(', ')); }}>
                {tag}
              </CyberBadge>
            ))}
            <input
              placeholder="+ New Tag"
              className="bg-transparent border-b border-dashed border-white/10 px-1 py-0.5 font-mono text-[9px] outline-none text-surface-variant focus:text-white w-20"
              onKeyDown={(e) => { if (e.key === 'Enter') { const v = e.target.value.trim(); if (v) { const next = [...tagList, v]; handleFieldChange('tags', next.join(', ')); e.target.value = ''; } } }}
            />
          </div>
        </section>

        {/* Metadata Grid */}
        <CyberCard variant="blue" glow={false} padding="p-4" className="bg-surface-low border-white/5 grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <span className="block text-[8px] font-orbitron font-bold text-surface-variant uppercase tracking-widest">Timestamp</span>
            <div className="text-[10px] text-white/80 font-mono">{formatCreatedDate(task.createdAt)}</div>
          </div>
          <div className="space-y-1">
            <span className="block text-[8px] font-orbitron font-bold text-surface-variant uppercase tracking-widest">Uptime</span>
            <div className="flex items-center gap-1.5 text-[10px] text-white/80 font-mono"><Timer className="h-3 w-3 text-cyber-blue" />{formatTimeElapsed(task.createdAt)}</div>
          </div>
          <CyberInput 
            label="Priority Level" 
            type="select" 
            variant={pDisplay.variant} 
            value={formState.priority} 
            onChange={(e) => handleFieldChange('priority', e.target.value)}
            className="col-span-1"
          >
            {priorityOptions.map(p => <option key={p} value={p}>{p.toUpperCase()}</option>)}
          </CyberInput>
          <CyberInput 
            label="Due Date" 
            type="datetime-local" 
            value={formState.dueDate} 
            onChange={(e) => handleFieldChange('dueDate', e.target.value)}
            className="col-span-1"
          />
        </CyberCard>

        {/* Protocols */}
        <MarkdownEditor
          label="Task Description"
          value={formState.description}
          onChange={(v) => handleFieldChange('description', v)}
          variant={pDisplay.variant}
        />

        {/* Sub-Sequences */}
        <TaskChecklist
          boardId={boardId}
          columnId={columnId}
          taskId={task.id}
          checklists={task.extendedData?.checklists || []}
        />

        {/* Synopsis */}
        <CyberInput
          label="Synopsis"
          value={formState.tldr}
          onChange={(e) => handleFieldChange('tldr', e.target.value)}
          placeholder="SHORT_DATA_SUMMARY..."
          variant="cyan"
          icon={Activity}
        />

        {/* Neural Links */}
        <section>
          <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-2">
            <div className="flex items-center gap-2">
              <LinkIcon className="h-3.5 w-3.5 text-cyber-violet" />
              <label className="font-orbitron text-[10px] font-bold text-white uppercase tracking-widest">Connected Notes</label>
            </div>
            <CyberButton variant="violet" size="xs" outline icon={Plus} onClick={() => setIsLinkerOpen(!isLinkerOpen)}>Link Note</CyberButton>
          </div>

          {isLinkerOpen && (
            <div className="mb-6 animate-in slide-in-from-top-2 duration-200">
              <TaskNoteLinker taskId={task.id} onClose={() => setIsLinkerOpen(false)} />
            </div>
          )}

          <div className="space-y-2">
            {pinnedNotes.length === 0 ? (
              <div className="text-[9px] font-mono text-surface-highest uppercase text-center py-6 border border-dashed border-white/5 bg-white/[0.02] tracking-widest">- NO_NEURAL_NODES -</div>
            ) : (
              pinnedNotes.map((note) => (
                <CyberCard key={note.id} variant="violet" glow={false} padding="p-3" className="bg-surface-low border-white/5 group/note">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <FileText className="h-4 w-4 text-cyber-violet/60 shrink-0" />
                      <span className="text-[11px] font-mono text-white truncate uppercase">{note.title || 'UNTITLED'}</span>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover/note:opacity-100 transition-opacity">
                      <button onClick={() => { setActiveView('notes'); onClose(); }} className="p-1 text-surface-variant hover:text-cyber-blue"><Terminal className="h-3.5 w-3.5" /></button>
                      <button onClick={() => unlinkNoteFromTask(note.id, task.id)} className="p-1 text-surface-variant hover:text-cyber-pink"><X className="h-3.5 w-3.5" /></button>
                    </div>
                  </div>
                </CyberCard>
              ))
            )}
          </div>
        </section>

        {/* Attachments */}
        <TaskAttachments
          boardId={boardId}
          columnId={columnId}
          taskId={task.id}
          attachments={task.extendedData?.attachments || []}
        />

        {/* Actions */}
        {dirty && (
          <div className="sticky bottom-0 pt-4 bg-surface/80 backdrop-blur-md pb-4">
            <CyberButton variant="blue" fullWidth icon={Save} onClick={handleSave}>
              Save Changes
            </CyberButton>
          </div>
        )}
      </div>
    </aside>
  )
}
