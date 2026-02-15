import { ArrowRight, Plus, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useStore } from '../../../store/useStore'

const priorityOptions = ['low', 'medium', 'high']

export default function CreateTaskModal({
  open,
  onClose,
  defaultBoardId = null,
  defaultColumnId = null,
}) {
  const boards = useStore((state) => state.boards)
  const defaultTaskPriority = useStore((state) => state.uiSettings.defaultTaskPriority)
  const addTask = useStore((state) => state.addTask)

  const [formState, setFormState] = useState({
    boardId: '',
    columnId: '',
    heading: '',
    tldr: '',
    description: '',
    priority: 'medium',
    tags: '',
    dueDate: '',
  })

  useEffect(() => {
    if (!open) return

    const fallbackBoardId = defaultBoardId || boards[0]?.id || ''
    const board = boards.find((item) => item.id === fallbackBoardId) || boards[0] || null
    const fallbackColumnId =
      defaultColumnId && board?.columns.find((col) => col.id === defaultColumnId)
        ? defaultColumnId
        : board?.columns[0]?.id || ''

    setFormState({
      boardId: board?.id || '',
      columnId: fallbackColumnId,
      heading: '',
      tldr: '',
      description: '',
      priority: defaultTaskPriority || 'medium',
      tags: '',
      dueDate: '',
    })
  }, [open, defaultBoardId, defaultColumnId, boards, defaultTaskPriority])

  const selectedBoard = useMemo(
    () => boards.find((board) => board.id === formState.boardId) || null,
    [boards, formState.boardId],
  )

  const onSubmit = () => {
    if (!formState.heading?.trim()) return

    addTask(formState.boardId || null, formState.columnId || null, {
      heading: formState.heading,
      tldr: formState.tldr,
      description: formState.description,
      settings: {
        priority: formState.priority,
        tags: formState.tags
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean),
        dueDate: formState.dueDate,
        status: formState.boardId ? undefined : 'To Do',
      },
    })

    onClose()
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg-deep/80 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-xl border border-border bg-surface shadow-2xl">
        {/* Header */}
        <header className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Plus className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Create Task</h2>
              <p className="text-xs text-text-muted">Add a new task to your workspace</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-text-muted hover:text-white hover:bg-surface-light transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        {/* Body */}
        <div className="grid grid-cols-1 gap-4 p-6 md:grid-cols-2">
          {/* Board selector */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-text-secondary">Board (Optional)</label>
            <select
              value={formState.boardId}
              onChange={(event) => {
                const boardId = event.target.value || ''
                const board = boardId ? boards.find((item) => item.id === boardId) : null
                setFormState((prev) => ({
                  ...prev,
                  boardId,
                  columnId: board?.columns[0]?.id || '',
                }))
              }}
              className="w-full rounded-lg border border-border bg-surface-light px-3 py-2.5 text-sm text-white outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            >
              <option value="">No Board (Standalone Task)</option>
              {boards.map((board) => (
                <option key={board.id} value={board.id}>{board.name}</option>
              ))}
            </select>
          </div>

          {/* Status/Column selector */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-text-secondary">Status</label>
            {formState.boardId ? (
              <select
                value={formState.columnId}
                onChange={(e) => setFormState((prev) => ({ ...prev, columnId: e.target.value }))}
                className="w-full rounded-lg border border-border bg-surface-light px-3 py-2.5 text-sm text-white outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              >
                {(selectedBoard?.columns || []).map((col) => (
                  <option key={col.id} value={col.id}>{col.title}</option>
                ))}
              </select>
            ) : (
              <input
                value="To Do"
                disabled
                className="w-full rounded-lg border border-border bg-surface-light/50 px-3 py-2.5 text-sm text-text-muted outline-none"
              />
            )}
          </div>

          {/* Heading */}
          <div className="md:col-span-2">
            <label className="mb-1.5 block text-xs font-medium text-text-secondary">Heading *</label>
            <input
              value={formState.heading}
              onChange={(e) => setFormState((prev) => ({ ...prev, heading: e.target.value }))}
              placeholder="Task heading (required)"
              className="w-full rounded-lg border border-border bg-surface-light px-3 py-2.5 text-sm text-white placeholder:text-text-muted outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* TL;DR */}
          <div className="md:col-span-2">
            <label className="mb-1.5 block text-xs font-medium text-text-secondary">TL;DR</label>
            <input
              value={formState.tldr}
              onChange={(e) => setFormState((prev) => ({ ...prev, tldr: e.target.value }))}
              placeholder="Brief summary"
              className="w-full rounded-lg border border-border bg-surface-light px-3 py-2.5 text-sm text-white placeholder:text-text-muted outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Description */}
          <div className="md:col-span-2">
            <label className="mb-1.5 block text-xs font-medium text-text-secondary">Description</label>
            <textarea
              rows={4}
              value={formState.description}
              onChange={(e) => setFormState((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="Detailed description..."
              className="w-full resize-none rounded-lg border border-border bg-surface-light px-3 py-2.5 text-sm text-white placeholder:text-text-muted outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Priority */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-text-secondary">Priority</label>
            <select
              value={formState.priority}
              onChange={(e) => setFormState((prev) => ({ ...prev, priority: e.target.value }))}
              className="w-full rounded-lg border border-border bg-surface-light px-3 py-2.5 text-sm text-white outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            >
              {priorityOptions.map((p) => (
                <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
              ))}
            </select>
          </div>

          {/* Due Date */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-text-secondary">Due Date</label>
            <input
              type="date"
              value={formState.dueDate}
              onChange={(e) => setFormState((prev) => ({ ...prev, dueDate: e.target.value }))}
              className="w-full rounded-lg border border-border bg-surface-light px-3 py-2.5 text-sm text-white outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Tags */}
          <div className="md:col-span-2">
            <label className="mb-1.5 block text-xs font-medium text-text-secondary">Tags (comma separated)</label>
            <input
              value={formState.tags}
              onChange={(e) => setFormState((prev) => ({ ...prev, tags: e.target.value }))}
              placeholder="frontend, bug, blocker"
              className="w-full rounded-lg border border-border bg-surface-light px-3 py-2.5 text-sm text-white placeholder:text-text-muted outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="bg-black/20 px-6 py-4 flex items-center justify-end gap-3 border-t border-border">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm font-medium text-text-secondary hover:bg-white/5 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={!formState.heading?.trim()}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-2 text-sm font-medium text-white shadow-lg shadow-primary/30 hover:bg-primary-dark transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <span>Create Task</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
