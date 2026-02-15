import { Clock3, Save, Trash2, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useStore } from '../../../store/useStore'

const priorityOptions = ['low', 'medium', 'high']

export default function TaskDetailModal() {
  const boards = useStore((state) => state.boards)
  const standaloneTasks = useStore((state) => state.standaloneTasks)
  const selectedTask = useStore((state) => state.selectedTask)
  const closeTaskDetail = useStore((state) => state.closeTaskDetail)
  const removeTask = useStore((state) => state.removeTask)
  const uiSettings = useStore((state) => state.uiSettings)
  const updateTask = useStore((state) => state.updateTask)
  const moveTaskToBoard = useStore((state) => state.moveTaskToBoard)

  const taskContext = useMemo(() => {
    if (!selectedTask) return null

    if (!selectedTask.boardId || !selectedTask.columnId) {
      const task = standaloneTasks.find((item) => item.id === selectedTask.taskId)
      if (!task) return null
      return { board: null, column: null, task, isStandalone: true }
    }

    const board = boards.find((item) => item.id === selectedTask.boardId)
    const column = board?.columns.find((item) => item.id === selectedTask.columnId)
    const task = column?.tasks.find((item) => item.id === selectedTask.taskId)

    if (!board || !column || !task) return null
    return { board, column, task, isStandalone: false }
  }, [boards, standaloneTasks, selectedTask])

  const [formState, setFormState] = useState({
    heading: '',
    tldr: '',
    description: '',
    priority: 'medium',
    tags: '',
    dueDate: '',
  })

  const [moveBoardId, setMoveBoardId] = useState(null)
  const [moveColumnId, setMoveColumnId] = useState(null)

  useEffect(() => {
    if (!taskContext) return

    setFormState({
      heading: taskContext.task.heading,
      tldr: taskContext.task.tldr,
      description: taskContext.task.description,
      priority: taskContext.task.settings?.priority || 'medium',
      tags: (taskContext.task.settings?.tags || []).join(', '),
      dueDate: taskContext.task.settings?.dueDate || '',
    })

    if (taskContext.isStandalone) {
      setMoveBoardId(null)
      setMoveColumnId(null)
    } else {
      setMoveBoardId(taskContext.board.id)
      setMoveColumnId(taskContext.column.id)
    }
  }, [taskContext])

  if (!taskContext) return null

  const selectedBoard = moveBoardId ? boards.find((b) => b.id === moveBoardId) : null
  const columnsInSelectedBoard = selectedBoard?.columns ?? []

  const onSave = () => {
    const sourceBoardId = taskContext.isStandalone ? null : taskContext.board.id
    const sourceColumnId = taskContext.isStandalone ? null : taskContext.column.id
    const targetBoardId = moveBoardId || null
    const targetColumnId = moveColumnId || null
    const taskId = taskContext.task.id

    const locationChanged = sourceBoardId !== targetBoardId || sourceColumnId !== targetColumnId

    if (locationChanged) {
      moveTaskToBoard(sourceBoardId, sourceColumnId, taskId, targetBoardId, targetColumnId)
    }

    updateTask(targetBoardId, targetColumnId, taskId, {
      heading: formState.heading.trim(),
      tldr: formState.tldr.trim(),
      description: formState.description.trim(),
      settings: {
        priority: formState.priority,
        tags: formState.tags.split(',').map((tag) => tag.trim()).filter(Boolean),
        dueDate: formState.dueDate,
      },
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg-deep/80 backdrop-blur-sm">
      <div className="flex h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-2xl">
        <header className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-white">Task Details</h2>
            <p className="text-xs text-text-muted">
              {taskContext.isStandalone ? 'Standalone Task' : `${taskContext.board.name} / ${taskContext.column.title}`}
            </p>
          </div>
          <button
            type="button"
            onClick={closeTaskDetail}
            className="rounded-lg p-2 text-text-muted hover:text-white hover:bg-surface-light transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="grid flex-1 grid-cols-1 gap-4 overflow-y-auto p-6 lg:grid-cols-[2fr_1fr] custom-scrollbar">
          <div className="space-y-4">
            <input
              value={formState.heading}
              onChange={(e) => setFormState((prev) => ({ ...prev, heading: e.target.value }))}
              className="w-full rounded-lg border border-border bg-surface-light px-3 py-2.5 text-sm text-white focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <input
              value={formState.tldr}
              onChange={(e) => setFormState((prev) => ({ ...prev, tldr: e.target.value }))}
              placeholder="TL;DR summary"
              className="w-full rounded-lg border border-border bg-surface-light px-3 py-2.5 text-sm text-white placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <textarea
              value={formState.description}
              onChange={(e) => setFormState((prev) => ({ ...prev, description: e.target.value }))}
              rows={10}
              placeholder="Detailed description..."
              className="w-full resize-none rounded-lg border border-border bg-surface-light px-3 py-2.5 text-sm text-white placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="space-y-4 rounded-xl border border-border bg-bg-deep p-5">
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1.5">Board</label>
              <select
                value={moveBoardId ?? ''}
                onChange={(e) => {
                  const id = e.target.value || null
                  setMoveBoardId(id)
                  if (!id) {
                    setMoveColumnId(null)
                  } else {
                    const board = boards.find((b) => b.id === id)
                    setMoveColumnId(board?.columns?.[0]?.id ?? null)
                  }
                }}
                className="w-full rounded-lg border border-border bg-surface-light px-3 py-2 text-sm text-white outline-none focus:border-primary"
              >
                <option value="">No Board (standalone)</option>
                {boards.map((board) => (
                  <option key={board.id} value={board.id}>{board.name}</option>
                ))}
              </select>
            </div>

            {selectedBoard && (
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1.5">Column</label>
                <select
                  value={moveColumnId ?? ''}
                  onChange={(e) => setMoveColumnId(e.target.value || null)}
                  className="w-full rounded-lg border border-border bg-surface-light px-3 py-2 text-sm text-white outline-none focus:border-primary"
                >
                  {columnsInSelectedBoard.map((col) => (
                    <option key={col.id} value={col.id}>{col.title}</option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-text-muted mb-1.5">Priority</label>
              <select
                value={formState.priority}
                onChange={(e) => setFormState((prev) => ({ ...prev, priority: e.target.value }))}
                className="w-full rounded-lg border border-border bg-surface-light px-3 py-2 text-sm text-white outline-none focus:border-primary"
              >
                {priorityOptions.map((p) => (
                  <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-text-muted mb-1.5">Tags</label>
              <input
                value={formState.tags}
                onChange={(e) => setFormState((prev) => ({ ...prev, tags: e.target.value }))}
                placeholder="tag1, tag2"
                className="w-full rounded-lg border border-border bg-surface-light px-3 py-2 text-sm text-white placeholder:text-text-muted outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-text-muted mb-1.5">Due date</label>
              <input
                type="date"
                value={formState.dueDate}
                onChange={(e) => setFormState((prev) => ({ ...prev, dueDate: e.target.value }))}
                className="w-full rounded-lg border border-border bg-surface-light px-3 py-2 text-sm text-white outline-none focus:border-primary"
              />
            </div>

            <button
              type="button"
              onClick={onSave}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2.5 text-sm font-medium text-white shadow-lg shadow-primary/30 hover:bg-primary-dark transition-all"
            >
              <Save className="h-4 w-4" />
              Save updates
            </button>
            <button
              type="button"
              onClick={() => {
                if (uiSettings.confirmBeforeDelete && !window.confirm('Delete this task?')) return
                const boardId = taskContext.isStandalone ? null : taskContext.board.id
                const columnId = taskContext.isStandalone ? null : taskContext.column.id
                removeTask(boardId, columnId, taskContext.task.id)
                closeTaskDetail()
              }}
              className="w-full flex items-center justify-center gap-2 rounded-lg border border-rose-500/40 px-3 py-2 text-sm font-medium text-rose-300 hover:border-rose-400/70 hover:bg-rose-500/10 transition-colors"
            >
              <Trash2 className="h-4 w-4" />
              Delete task
            </button>
          </div>
        </div>

        <footer className="border-t border-border bg-bg-deep px-6 py-4">
          <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-wide text-text-muted">
            <Clock3 className="h-3.5 w-3.5" />
            Timeline
          </div>
          <div className="max-h-32 space-y-1 overflow-y-auto pr-1 custom-scrollbar">
            {[...taskContext.task.timeline].reverse().map((entry) => (
              <div
                key={`${entry.timestamp}-${entry.action}`}
                className="rounded-lg border border-border bg-surface px-3 py-2 text-xs text-text-secondary"
              >
                <span className="mr-2 text-text-muted font-mono">
                  {new Date(entry.timestamp).toLocaleString()}
                </span>
                {entry.action}
              </div>
            ))}
          </div>
        </footer>
      </div>
    </div>
  )
}
