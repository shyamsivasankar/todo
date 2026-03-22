import {
  Calendar,
  ChevronDown,
  ChevronRight,
  Flag,
  Folder,
  Lightbulb,
  Play,
  Plus,
  Share2,
  Trash2,
  X,
  Zap,
  Activity,
  Terminal,
  Link as LinkIcon,
  FileText,
} from 'lucide-react'
import { useState, useMemo } from 'react'
import { useStore } from '../../../store/useStore'
import MarkdownEditor from '../../../components/ui/MarkdownEditor'
import CyberButton from '../../../components/ui/CyberButton'
import CyberCard from '../../../components/ui/CyberCard'
import CyberInput from '../../../components/ui/CyberInput'
import CyberBadge from '../../../components/ui/CyberBadge'
import CyberModal from '../../../components/ui/CyberModal'
import TaskNoteLinker from '../../../components/shared/TaskNoteLinker'

const toLocalISOString = (date) => {
  if (!date) return ''
  const d = new Date(date)
  if (isNaN(d.getTime())) return ''
  const offset = d.getTimezoneOffset() * 60000
  const localISOTime = new Date(d.getTime() - offset).toISOString().slice(0, 16)
  return localISOTime
}

const priorityOptions = [
  { value: 'low', label: 'STABLE', variant: 'lime' },
  { value: 'medium', label: 'ACTIVE', variant: 'blue' },
  { value: 'high', label: 'CRITICAL', variant: 'amber' },
]

export default function TaskDetailModal() {
  const boards = useStore((state) => state.boards)
  const standaloneTasks = useStore((state) => state.standaloneTasks)
  const selectedTask = useStore((state) => state.selectedTask)
  const closeTaskDetail = useStore((state) => state.closeTaskDetail)
  const removeTask = useStore((state) => state.removeTask)
  const uiSettings = useStore((state) => state.uiSettings)
  const updateTask = useStore((state) => state.updateTask)
  const moveTaskToBoard = useStore((state) => state.moveTaskToBoard)
  const addTaskChecklistItem = useStore((state) => state.addTaskChecklistItem)
  const updateTaskChecklist = useStore((state) => state.updateTaskChecklist)
  const removeTaskChecklistItem = useStore((state) => state.removeTaskChecklistItem)
  const notes = useStore((state) => state.notes)
  const unlinkNoteFromTask = useStore((state) => state.unlinkNoteFromTask)
  const setActiveView = useStore((state) => state.setActiveView)

  // Derive task data directly on mount
  const taskData = useMemo(() => {
    if (!selectedTask) return null
    if (!selectedTask.boardId || !selectedTask.columnId) {
      const t = standaloneTasks.find((item) => item.id === selectedTask.taskId)
      if (!t) return null
      return { board: null, column: null, task: t, isStandalone: true }
    } else {
      const b = boards.find((item) => item.id === selectedTask.boardId)
      const c = b?.columns.find((item) => item.id === selectedTask.columnId)
      const t = c?.tasks.find((item) => item.id === selectedTask.taskId)
      if (!b || !c || !t) return null
      return { board: b, column: c, task: t, isStandalone: false }
    }
  }, [boards, standaloneTasks, selectedTask])

  const [heading, setHeading] = useState(taskData?.task.heading ?? '')
  const [tldr, setTldr] = useState(taskData?.task.tldr ?? '')
  const [description, setDescription] = useState(taskData?.task.description ?? '')
  const [priority, setPriority] = useState(taskData?.task.settings?.priority ?? 'medium')
  const [tags, setTags] = useState(Array.isArray(taskData?.task.settings?.tags) ? taskData.task.settings.tags : [])
  const [dueDate, setDueDate] = useState(toLocalISOString(taskData?.task.settings?.dueDate))
  const [completed, setCompleted] = useState(!!taskData?.task.settings?.completed)
  const [moveBoardId, setMoveBoardId] = useState(taskData?.board?.id || null)
  const [moveColumnId, setMoveColumnId] = useState(taskData?.column?.id || null)
  const [isLinkerOpen, setIsLinkerOpen] = useState(false)

  if (!taskData || !selectedTask) return null
  const { board, column, task, isStandalone } = taskData

  const boardId = isStandalone ? null : board?.id
  const columnId = isStandalone ? null : column?.id
  const taskId = task.id
  const checklists = task.extendedData?.checklists ?? []
  const pinnedNotes = notes.filter((note) => note.taskIds?.includes(taskId))

  const selectedBoard = moveBoardId ? boards.find((b) => b.id === moveBoardId) : null
  const columnsInSelectedBoard = selectedBoard?.columns ?? []

  const save = () => {
    const sourceBoardId = isStandalone ? null : board?.id
    const sourceColumnId = isStandalone ? null : column?.id
    const targetBoardId = moveBoardId || null
    const targetColumnId = moveColumnId || null

    const targetColumn = targetBoardId 
      ? boards.find(b => b.id === targetBoardId)?.columns.find(c => c.id === targetColumnId)
      : null
    const isDoneColumn = targetColumn?.title.toLowerCase() === 'done'
    const finalCompleted = isDoneColumn ? true : completed

    const locationChanged = sourceBoardId !== targetBoardId || sourceColumnId !== targetColumnId
    if (locationChanged) {
      moveTaskToBoard(sourceBoardId, sourceColumnId, taskId, targetBoardId, targetColumnId)
    }

    updateTask(targetBoardId, targetColumnId, taskId, {
      heading: heading.trim(),
      tldr: tldr.trim(),
      description: description.trim(),
      settings: {
        priority,
        tags,
        dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
        completed: finalCompleted,
      },
    })

    if (isDoneColumn && !completed) {
      setCompleted(true)
    }
  }

  const handleDelete = () => {
    if (uiSettings.confirmBeforeDelete && !window.confirm('Delete this task?')) return
    removeTask(boardId, columnId, taskId)
    closeTaskDetail()
  }

  const currentColumnTitle = selectedBoard && moveColumnId
    ? columnsInSelectedBoard.find((col) => col.id === moveColumnId)?.title ?? '—'
    : (column?.title ?? '—')

  return (
    <CyberModal
      isOpen={!!selectedTask}
      onClose={closeTaskDetail}
      title={
        <div className="flex flex-col gap-1">
          <nav className="flex items-center gap-2 font-orbitron text-[10px] uppercase tracking-[0.2em] text-surface-variant">
            {board ? (
              <>
                <span className="flex items-center gap-1">{board.name}</span>
                <ChevronRight className="h-2 w-2 opacity-30" />
                <span>{column?.title}</span>
                <ChevronRight className="h-2 w-2 opacity-30" />
                <span className="text-cyber-blue font-bold">{currentColumnTitle}</span>
              </>
            ) : (
              <span className="text-cyber-pink font-bold">Standalone Sub-Routine</span>
            )}
          </nav>
          <input
            value={heading}
            onChange={(e) => setHeading(e.target.value)}
            onBlur={save}
            className="w-full bg-transparent font-orbitron text-xl font-black uppercase tracking-tighter text-white outline-none placeholder:text-surface-highest focus:text-cyber-blue transition-colors"
            placeholder="TASK_HEADING_INIT..."
          />
        </div>
      }
      variant={completed ? 'lime' : priority === 'high' ? 'amber' : 'blue'}
      maxWidth="max-w-5xl"
    >
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Main Content Area */}
        <div className="flex-1 space-y-8">
          {/* Synopsis */}
          <CyberCard variant="blue" glow={false} padding="p-5" className="border-cyber-blue/20 bg-cyber-blue/5">
            <div className="flex gap-4">
              <Activity className="h-5 w-5 text-cyber-blue animate-pulse shrink-0 mt-1" />
              <div className="flex-1 min-w-0">
                <span className="font-orbitron text-[10px] font-bold uppercase tracking-widest text-cyber-blue block mb-1">Synopsis</span>
                <input
                  value={tldr}
                  onChange={(e) => setTldr(e.target.value)}
                  onBlur={save}
                  placeholder="SHORT_DATA_SUMMARY..."
                  className="w-full bg-transparent font-mono text-sm text-white/80 outline-none uppercase"
                />
              </div>
            </div>
          </CyberCard>

          {/* Protocols (Markdown) */}
          <MarkdownEditor
            label="Detailed Protocols"
            value={description}
            onChange={(v) => { setDescription(v); save(); }}
            variant={priority === 'high' ? 'amber' : 'blue'}
          />

          {/* Checklists */}
          <div className="space-y-4">
            <h2 className="font-orbitron text-xs font-bold uppercase tracking-[0.2em] text-cyber-blue flex items-center gap-2">
              <Terminal className="h-4 w-4" />
              Checklists
            </h2>
            <div className="grid gap-3">
              {checklists.map((item) => (
                <CyberCard key={item.id} variant="blue" glow={false} padding="p-3" className="border-white/5 bg-surface-low hover:bg-white/5 transition-colors group/item">
                  <div className="flex items-center gap-4">
                    <input
                      type="checkbox"
                      checked={!!item.completed}
                      onChange={(e) => updateTaskChecklist(boardId, columnId, taskId, item.id, { completed: e.target.checked })}
                      className="peer h-4 w-4 cursor-pointer appearance-none rounded-sm border border-cyber-blue/30 bg-transparent transition-all checked:bg-cyber-blue"
                    />
                    <input
                      value={item.text}
                      onChange={(e) => updateTaskChecklist(boardId, columnId, taskId, item.id, { text: e.target.value })}
                      className={`flex-1 bg-transparent font-mono text-xs outline-none uppercase ${item.completed ? 'text-surface-variant line-through opacity-50' : 'text-white'}`}
                    />
                    <button
                      onClick={() => removeTaskChecklistItem(boardId, columnId, taskId, item.id)}
                      className="opacity-0 group-hover/item:opacity-100 text-surface-variant hover:text-cyber-pink transition-all"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </CyberCard>
              ))}
              <CyberButton variant="blue" size="xs" outline icon={Plus} onClick={() => addTaskChecklistItem(boardId, columnId, taskId)}>
                Add Checklist Item
              </CyberButton>
            </div>
          </div>

          {/* Connected Notes */}
          <div className="space-y-4 pt-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-2">
              <h2 className="font-orbitron text-xs font-bold uppercase tracking-[0.2em] text-cyber-violet flex items-center gap-2">
                <LinkIcon className="h-4 w-4" />
                Connected Notes
              </h2>
              <CyberButton variant="violet" size="xs" outline icon={Plus} onClick={() => setIsLinkerOpen(!isLinkerOpen)}>
                Link Note
              </CyberButton>
            </div>

            {isLinkerOpen && (
              <TaskNoteLinker taskId={taskId} onClose={() => setIsLinkerOpen(false)} />
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {pinnedNotes.map((note) => (
                <CyberCard key={note.id} variant="violet" glow={false} padding="p-3" className="bg-surface-low border-white/5 group/note">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <FileText className="h-4 w-4 text-cyber-violet/60 shrink-0" />
                      <span className="font-mono text-[11px] text-white truncate uppercase">{note.title}</span>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover/note:opacity-100 transition-opacity">
                      <button onClick={() => { setActiveView('notes'); closeTaskDetail(); }} className="p-1 text-surface-variant hover:text-cyber-blue"><Terminal className="h-3.5 w-3.5" /></button>
                      <button onClick={() => unlinkNoteFromTask(note.id, taskId)} className="p-1 text-surface-variant hover:text-cyber-pink"><X className="h-3.5 w-3.5" /></button>
                    </div>
                  </div>
                </CyberCard>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar Controls */}
        <aside className="w-full lg:w-80 space-y-8">
          {/* Task Status */}
          <section className="space-y-3">
            <span className="font-orbitron text-[10px] font-bold uppercase tracking-widest text-surface-variant">Task Status</span>
            <CyberCard 
              variant={completed ? 'lime' : 'blue'} 
              interactive 
              className={completed ? 'bg-cyber-lime/5 border-cyber-lime/30' : 'bg-surface-low border-white/10'}
              onClick={() => {
                const next = !completed;
                setCompleted(next);
                updateTask(moveBoardId, moveColumnId, taskId, { settings: { priority, tags, dueDate, completed: next } });
              }}
            >
              <div className="flex items-center gap-4">
                <div className={`h-5 w-5 rounded-sm border ${completed ? 'bg-cyber-lime border-cyber-lime shadow-neon-lime' : 'border-white/20'} flex items-center justify-center transition-all`}>
                  {completed && <span className="text-cyber-black font-bold">✓</span>}
                </div>
                <span className={`font-orbitron text-xs font-black uppercase tracking-widest ${completed ? 'text-cyber-lime animate-flicker' : 'text-white'}`}>
                  {completed ? 'Task Completed' : 'Mark as Completed'}
                </span>
              </div>
            </CyberCard>
          </section>

          {/* Configuration Grid */}
          <div className="grid gap-6">
            <CyberInput 
              label="Priority Level"
              type="select"
              variant={priority === 'high' ? 'amber' : priority === 'low' ? 'lime' : 'blue'}
              value={priority}
              onChange={(e) => { setPriority(e.target.value); save(); }}
              icon={Flag}
            >
              {priorityOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </CyberInput>

            <div className="grid grid-cols-2 gap-3">
              <CyberInput 
                label="Target Sector" 
                type="select" 
                value={moveBoardId ?? ''} 
                onChange={(e) => {
                  const newBoardId = e.target.value || null
                  setMoveBoardId(newBoardId)
                  if (newBoardId) {
                    const b = boards.find(item => item.id === newBoardId)
                    if (b && b.columns.length > 0) {
                      setMoveColumnId(b.columns[0].id)
                    }
                  } else {
                    setMoveColumnId(null)
                  }
                  save()
                }} 
                icon={Folder}
              >
                <option value="">STANDALONE</option>
                {boards.map(b => <option key={b.id} value={b.id}>{b.name.toUpperCase()}</option>)}
              </CyberInput>
              <CyberInput 
                label="Process Stage" 
                type="select" 
                value={moveColumnId ?? ''} 
                onChange={(e) => {
                  setMoveColumnId(e.target.value)
                  save()
                }} 
                icon={Terminal}
              >
                {columnsInSelectedBoard.map(c => <option key={c.id} value={c.id}>{c.title.toUpperCase()}</option>)}
              </CyberInput>
            </div>

            <CyberInput 
              label="Due Date" 
              type="datetime-local" 
              value={dueDate} 
              onChange={(e) => { setDueDate(e.target.value); save(); }} 
              icon={Calendar} 
            />

            <div className="space-y-2">
              <label className="font-orbitron text-[9px] font-bold text-surface-variant uppercase tracking-widest block ml-1">Tags</label>
              <div className="flex flex-wrap gap-2">
                {tags.map((tag, i) => (
                  <CyberBadge key={i} variant="violet" size="sm" onRemove={() => { const next = tags.filter((_, idx) => idx !== i); setTags(next); save(); }}>
                    {tag}
                  </CyberBadge>
                ))}
                <input
                  placeholder="+ New Tag"
                  className="bg-transparent border-b border-dashed border-white/10 px-1 py-0.5 font-mono text-[10px] outline-none text-surface-variant focus:text-white w-20"
                  onKeyDown={(e) => { if (e.key === 'Enter') { const v = e.target.value.trim(); if (v) { setTags([...tags, v]); e.target.value = ''; save(); } } }}
                />
              </div>
            </div>
          </div>

          <div className="pt-8 border-t border-white/5 space-y-4">
            <CyberButton variant="pink" fullWidth outline icon={Trash2} onClick={handleDelete}>
              Delete Task
            </CyberButton>
            <div className="text-[8px] font-mono text-surface-highest flex flex-col gap-1 uppercase tracking-tighter text-center">
              <span>HEX_ID: {taskId.toUpperCase()}</span>
              <span>SYNC_VERIFIED: {new Date(task.createdAt).toLocaleTimeString()}</span>
            </div>
          </div>
        </aside>
      </div>
    </CyberModal>
  )
}
