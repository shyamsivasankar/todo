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
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { useStore } from '../../../store/useStore'
import MarkdownDescription from './MarkdownDescription'

const toLocalISOString = (date) => {
  if (!date) return ''
  const d = new Date(date)
  if (isNaN(d.getTime())) return ''
  const offset = d.getTimezoneOffset() * 60000
  const localISOTime = new Date(d.getTime() - offset).toISOString().slice(0, 16)
  return localISOTime
}

const priorityOptions = [
  { value: 'low', label: 'Low', className: 'bg-slate-700 text-slate-300 border-slate-600' },
  { value: 'medium', label: 'Medium', className: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30' },
  { value: 'high', label: 'High', className: 'bg-red-500/20 text-red-300 border-red-500/30' },
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
  const addTaskComment = useStore((state) => state.addTaskComment)
  const removeTaskComment = useStore((state) => state.removeTaskComment)

  const [board, setBoard] = useState(null)
  const [column, setColumn] = useState(null)
  const [task, setTask] = useState(null)
  const [isStandalone, setIsStandalone] = useState(false)

  const [heading, setHeading] = useState('')
  const [tldr, setTldr] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState('medium')
  const [tags, setTags] = useState([])
  const [dueDate, setDueDate] = useState('')
  const [completed, setCompleted] = useState(false)
  const [moveBoardId, setMoveBoardId] = useState(null)
  const [moveColumnId, setMoveColumnId] = useState(null)
  const [commentText, setCommentText] = useState('')

  useEffect(() => {
    if (!selectedTask) return

    if (!selectedTask.boardId || !selectedTask.columnId) {
      const t = standaloneTasks.find((item) => item.id === selectedTask.taskId)
      if (!t) return
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setBoard(null)
       
      setColumn(null)
       
      setTask(t)
       
      setIsStandalone(true)
       
      setMoveBoardId(null)
       
      setMoveColumnId(null)
    } else {
      const b = boards.find((item) => item.id === selectedTask.boardId)
      const c = b?.columns.find((item) => item.id === selectedTask.columnId)
      const t = c?.tasks.find((item) => item.id === selectedTask.taskId)
      if (!b || !c || !t) return
       
      setBoard(b)
       
      setColumn(c)
       
      setTask(t)
       
      setIsStandalone(false)
       
      setMoveBoardId(b.id)
       
      setMoveColumnId(c.id)
    }
  }, [boards, standaloneTasks, selectedTask])

  useEffect(() => {
    if (!task) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHeading(task.heading ?? '')
     
    setTldr(task.tldr ?? '')
     
    setDescription(task.description ?? '')
     
    setPriority(task.settings?.priority ?? 'medium')
     
    setTags(Array.isArray(task.settings?.tags) ? task.settings.tags : [])
     
    setDueDate(toLocalISOString(task.settings?.dueDate))
     
    setCompleted(!!task.settings?.completed)
  }, [task])

  if (!task || !selectedTask) return null

  const boardId = isStandalone ? null : board?.id
  const columnId = isStandalone ? null : column?.id
  const taskId = task.id
  const checklists = task.extendedData?.checklists ?? []
  const comments = task.extendedData?.comments ?? []

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

  const createdLabel = task.createdAt
    ? new Date(task.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
    : '—'
  const lastEntry = task.timeline?.[task.timeline.length - 1]
  const updatedLabel = lastEntry?.timestamp
    ? (() => {
        const d = new Date(lastEntry.timestamp)
        const now = new Date()
        const diffMs = now - d
        if (diffMs < 60 * 60 * 1000) return `${Math.floor(diffMs / 60000)} minutes ago`
        if (diffMs < 24 * 60 * 60 * 1000) return `${Math.floor(diffMs / (60 * 60 * 1000))} hours ago`
        return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
      })()
    : '—'

  const currentColumnTitle = selectedBoard && moveColumnId
    ? columnsInSelectedBoard.find((col) => col.id === moveColumnId)?.title ?? '—'
    : (column?.title ?? '—')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-bg-deep/80 backdrop-blur-sm">
      <div className="flex h-[85vh] w-full max-w-[1000px] flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-2xl">
        {/* Header */}
        <header className="flex shrink-0 items-start justify-between border-b border-border bg-surface/95 p-6 backdrop-blur-sm">
          <div className="flex w-full flex-col gap-2 pr-8">
            {/* Breadcrumbs */}
            <nav className="flex flex-wrap items-center gap-2 text-xs font-medium text-text-muted">
              {board ? (
                <>
                  <span className="flex cursor-pointer items-center gap-1 transition-colors hover:text-primary">
                    <Folder className="h-4 w-4" />
                    {board.name}
                  </span>
                  <ChevronRight className="h-3 w-3 text-slate-600" />
                  <span className="flex cursor-pointer items-center gap-1 transition-colors hover:text-primary">
                    {column?.title}
                  </span>
                  <ChevronRight className="h-3 w-3 text-slate-600" />
                  <span className="rounded bg-surface-light px-1.5 py-0.5 text-text-primary">
                    {currentColumnTitle}
                  </span>
                </>
              ) : (
                <span className="rounded bg-surface-light px-1.5 py-0.5 text-text-primary">
                  Standalone Task
                </span>
              )}
            </nav>
            {/* Title */}
            <input
              value={heading}
              onChange={(e) => setHeading(e.target.value)}
              onBlur={save}
              className="mt-1 w-full bg-transparent text-2xl font-bold tracking-tight text-white outline-none placeholder:text-text-muted md:text-3xl"
              placeholder="Task title"
            />
          </div>
          <button
            type="button"
            onClick={closeTaskDetail}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-text-muted transition-colors hover:bg-surface-light hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        {/* Two columns */}
        <div className="flex flex-1 flex-col overflow-hidden lg:flex-row">
          {/* Main content */}
          <div className="flex-1 space-y-8 overflow-y-auto p-6 lg:p-8 custom-scrollbar">
            {/* TL;DR */}
            <div className="flex gap-4 rounded-lg border border-primary/20 bg-primary/5 p-5 dark:bg-primary/10">
              <div className="shrink-0 pt-0.5 text-primary">
                <Lightbulb className="h-5 w-5" />
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="text-xs font-bold uppercase tracking-wider text-primary">TL;DR</span>
                <input
                  value={tldr}
                  onChange={(e) => setTldr(e.target.value)}
                  onBlur={save}
                  placeholder="Short summary..."
                  className="w-full bg-transparent text-sm text-text-secondary outline-none placeholder:text-text-muted md:text-base"
                />
              </div>
            </div>

            {/* Description */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">Description</h2>
              </div>
              <div className="prose prose-invert max-w-none text-sm text-text-secondary md:text-base leading-7">
                <MarkdownDescription
                  value={description}
                  onChange={(v) => setDescription(v)}
                />
              </div>
            </div>

            {/* Subtasks */}
            <div className="space-y-3">
              <h2 className="text-lg font-semibold text-white">Subtasks</h2>
              <div className="flex flex-col gap-2">
                {checklists.map((item) => (
                  <label
                    key={item.id}
                    className="group flex cursor-pointer items-start gap-3 rounded-lg border border-border bg-surface-light p-3 transition-colors hover:bg-card-hover"
                  >
                    <div className="relative flex items-center pt-0.5">
                      <input
                        type="checkbox"
                        checked={!!item.completed}
                        onChange={(e) =>
                          updateTaskChecklist(boardId, columnId, taskId, item.id, {
                            completed: e.target.checked,
                          })
                        }
                        className="peer h-5 w-5 cursor-pointer appearance-none rounded border border-border-light bg-transparent transition-all checked:border-primary checked:bg-primary"
                      />
                      <span className="pointer-events-none absolute left-0.5 top-1.5 hidden h-4 w-4 text-white peer-checked:block">
                        ✓
                      </span>
                    </div>
                    <input
                      value={item.text}
                      onChange={(e) =>
                        updateTaskChecklist(boardId, columnId, taskId, item.id, {
                          text: e.target.value,
                        })
                      }
                      className={`min-w-0 flex-1 bg-transparent text-sm outline-none ${
                        item.completed
                          ? 'text-text-muted line-through decoration-border'
                          : 'text-text-primary group-hover:text-primary'
                      }`}
                      placeholder="Subtask..."
                    />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault()
                        removeTaskChecklistItem(boardId, columnId, taskId, item.id)
                      }}
                      className="shrink-0 rounded p-1 text-text-muted opacity-0 transition-opacity hover:bg-surface hover:text-red-400 group-hover:opacity-100"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </label>
                ))}
              </div>
              <button
                type="button"
                onClick={() => addTaskChecklistItem(boardId, columnId, taskId)}
                className="flex items-center gap-1 pl-1 text-sm text-text-muted transition-colors hover:text-primary"
              >
                <Plus className="h-4 w-4" />
                Add subtask
              </button>
            </div>

            {/* Comments Section */}
            <div className="border-t border-border pt-6 space-y-4">
              <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wider">Activity</h3>
              
              <div className="space-y-4">
                {comments.map((comment) => (
                  <div key={comment.id} className="group flex gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 text-[10px] font-bold text-white ring-2 ring-surface">
                      U
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-text-primary">You</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-text-muted">
                            {new Date(comment.createdAt).toLocaleDateString()} {new Date(comment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <button
                            onClick={() => removeTaskComment(boardId, columnId, taskId, comment.id)}
                            className="text-text-muted opacity-0 hover:text-red-400 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                      <p className="text-sm text-text-secondary leading-relaxed">
                        {comment.text}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-start gap-3 pt-2">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 text-xs font-bold text-white ring-2 ring-surface">
                  U
                </div>
                <div className="flex-1 space-y-2">
                  <textarea
                    placeholder="Add a comment..."
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        if (commentText.trim()) {
                          addTaskComment(boardId, columnId, taskId, commentText)
                          setCommentText('')
                        }
                      }
                    }}
                    className="w-full min-h-[80px] rounded-lg border border-border bg-surface-light py-2 px-4 text-sm text-white outline-none placeholder:text-text-muted focus:ring-2 focus:ring-primary/50 resize-none"
                  />
                  <div className="flex justify-end">
                    <button
                      type="button"
                      disabled={!commentText.trim()}
                      onClick={() => {
                        if (commentText.trim()) {
                          addTaskComment(boardId, columnId, taskId, commentText)
                          setCommentText('')
                        }
                      }}
                      className="rounded-lg bg-primary/20 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Comment
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <aside className="w-full shrink-0 space-y-6 overflow-y-auto border-t border-border bg-bg-deep p-6 lg:w-[320px] lg:border-t-0 lg:border-l custom-scrollbar">
            {/* Status & actions */}
            <div className="space-y-4">
              <label className="flex items-center gap-3 rounded-lg border border-border bg-surface-light p-3 transition-colors hover:bg-card-hover cursor-pointer">
                <div className="relative flex items-center">
                  <input
                    type="checkbox"
                    checked={completed}
                    onChange={(e) => {
                      setCompleted(e.target.checked)
                      // We need to call save with the new value, but since setCompleted is async,
                      // we'll pass it directly to updateTask or use a temporary variable.
                      const nextCompleted = e.target.checked
                      updateTask(moveBoardId, moveColumnId, taskId, {
                        settings: {
                          priority,
                          tags,
                          dueDate: dueDate || undefined,
                          completed: nextCompleted,
                        },
                      })
                    }}
                    className="peer h-5 w-5 cursor-pointer appearance-none rounded border border-border-light bg-transparent transition-all checked:border-emerald-500 checked:bg-emerald-500"
                  />
                  <span className="pointer-events-none absolute left-0.5 top-0.5 hidden h-4 w-4 text-white peer-checked:block">
                    ✓
                  </span>
                </div>
                <span className={`text-sm font-semibold ${completed ? 'text-emerald-500' : 'text-text-primary'}`}>
                  {completed ? 'Completed' : 'Mark as Completed'}
                </span>
              </label>

              <div className="relative">
                <select
                  value={moveColumnId ?? ''}
                  onChange={(e) => {
                    const id = e.target.value || null
                    setMoveColumnId(id)
                    save()
                  }}
                  className="flex w-full cursor-pointer items-center justify-between rounded-lg border border-border bg-surface-light px-4 py-2.5 text-sm text-white shadow-sm outline-none transition-colors hover:border-primary focus:border-primary"
                >
                  {selectedBoard?.columns?.map((col) => (
                    <option key={col.id} value={col.id}>
                      {col.title}
                    </option>
                  ))}
                  {(!selectedBoard || !columnsInSelectedBoard.length) && (
                    <option value="">{selectedBoard ? 'No column' : 'Select a board'}</option>
                  )}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={save}
                  className="flex items-center justify-center gap-2 rounded-lg bg-primary py-2 text-sm font-medium text-white shadow-lg shadow-primary/20 transition-colors hover:bg-primary-dark"
                >
                  <Play className="h-4 w-4" />
                  Save
                </button>
                <button
                  type="button"
                  className="flex items-center justify-center gap-2 rounded-lg border border-border bg-surface-light py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-card-hover"
                >
                  <Share2 className="h-4 w-4" />
                  Share
                </button>
              </div>
            </div>

            {/* Board/Column if we have boards */}
            {boards.length > 0 && (
              <div className="space-y-2 pt-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                  Board
                </span>
                <select
                  value={moveBoardId ?? ''}
                  onChange={(e) => {
                    const id = e.target.value || null
                    setMoveBoardId(id)
                    if (id) {
                      const b = boards.find((x) => x.id === id)
                      setMoveColumnId(b?.columns?.[0]?.id ?? null)
                    } else setMoveColumnId(null)
                    save()
                  }}
                  className="w-full rounded-lg border border-border bg-surface-light px-3 py-2 text-sm text-white outline-none focus:border-primary"
                >
                  <option value="">Standalone</option>
                  {boards.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Priority */}
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                Priority
              </span>
              <div className="flex flex-wrap gap-2">
                {priorityOptions.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      setPriority(opt.value)
                      save()
                    }}
                    className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${opt.className} ${
                      priority === opt.value ? 'ring-1 ring-primary' : ''
                    }`}
                  >
                    <Flag className="h-4 w-4" />
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Due date */}
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                Due Date
              </span>
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-surface-light text-text-muted">
                  <Calendar className="h-4 w-4" />
                </div>
                <input
                  type="datetime-local"
                  value={dueDate}
                  onChange={(e) => {
                    setDueDate(e.target.value)
                    save()
                  }}
                  className="min-w-0 flex-1 rounded-lg border border-border bg-surface-light px-3 py-2 text-sm text-white outline-none focus:border-primary"
                />
              </div>
            </div>

            {/* Tags */}
            <div className="flex flex-col gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                Tags
              </span>
              <div className="flex flex-wrap gap-2">
                {tags.map((tag, i) => (
                  <span
                    key={`${tag}-${i}`}
                    className="group relative rounded border border-indigo-500/20 bg-indigo-500/10 px-2.5 py-1 text-xs font-medium text-indigo-300 transition-all hover:pr-7"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => {
                        const nextTags = tags.filter((_, idx) => idx !== i)
                        setTags(nextTags)
                        updateTask(boardId, columnId, taskId, {
                          settings: { ...task.settings, priority, dueDate, tags: nextTags },
                        })
                      }}
                      className="absolute right-1 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-indigo-300/50 opacity-0 transition-all hover:bg-indigo-500/30 hover:text-indigo-100 group-hover:opacity-100"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
                <input
                  type="text"
                  placeholder="+ Add tag"
                  className="rounded border border-dashed border-border px-2 py-1 text-xs text-text-muted outline-none placeholder:text-text-muted focus:border-primary"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ',') {
                      e.preventDefault()
                      const v = e.target.value.trim().replace(/,/g, '')
                      if (v) {
                        const nextTags = [...tags, v]
                        setTags(nextTags)
                        e.target.value = ''
                        updateTask(boardId, columnId, taskId, {
                          settings: { ...task.settings, priority, dueDate, tags: nextTags },
                        })
                      }
                    }
                  }}
                />
              </div>
            </div>

            {/* Meta */}
            <div className="flex flex-col gap-2 border-t border-border pt-6">
              <div className="flex justify-between text-xs">
                <span className="text-text-muted">Created</span>
                <span className="text-text-secondary">{createdLabel}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-text-muted">Updated</span>
                <span className="text-text-secondary">{updatedLabel}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-text-muted">Task ID</span>
                <span className="font-mono text-text-secondary">
                  {taskId.slice(0, 8)}
                </span>
              </div>
            </div>

            {/* Delete */}
            <div className="pt-4">
              <button
                type="button"
                onClick={handleDelete}
                className="flex w-full items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/10"
              >
                <Trash2 className="h-4 w-4" />
                Delete Task
              </button>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}
