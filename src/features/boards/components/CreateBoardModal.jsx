import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCenter,
  defaultDropAnimation,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
} from '@dnd-kit/core'
import { ArrowRight, GripVertical, Plus, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

function arrayMove(array, fromIndex, toIndex) {
  const copy = array.slice()
  const [removed] = copy.splice(fromIndex, 1)
  copy.splice(toIndex, 0, removed)
  return copy
}

function startViewTransitionIfSupported(callback) {
  if (typeof document !== 'undefined' && 'startViewTransition' in document) {
    document.startViewTransition(callback)
  } else {
    callback()
  }
}

const DROP_ANIMATION = {
  ...defaultDropAnimation,
  duration: 250,
  easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
}

function ColumnRowContent({ value, dotColorClass, showInput = true }) {
  return (
    <>
      <div className="cursor-grab active:cursor-grabbing touch-none p-0.5 -m-0.5 rounded shrink-0">
        <GripVertical className="h-4 w-4 text-text-muted/40 hover:text-text-muted" />
      </div>
      <div className="relative flex-1 min-w-0">
        <span className={`absolute left-3 top-1/2 -translate-y-1/2 h-2 w-2 rounded-full ${dotColorClass}`} />
        {showInput ? (
          <input
            type="text"
            value={value}
            readOnly
            tabIndex={-1}
            className="block w-full rounded-lg border border-border bg-surface-light/50 text-white text-sm py-2 pl-7 pr-3 cursor-grab pointer-events-none"
          />
        ) : (
          <div className="block w-full rounded-lg border border-border bg-surface-light/50 text-white text-sm py-2 pl-7 pr-3">
            {value || 'New stage'}
          </div>
        )}
      </div>
      <div className="w-8 h-8 shrink-0" aria-hidden />
    </>
  )
}

function SortableColumnRow({ id, index, value, dotColorClass, onChange, onRemove }) {
  const rowRef = useRef(null)
  const {
    attributes,
    listeners,
    setNodeRef: setDraggableRef,
    setActivatorNodeRef,
    isDragging,
  } = useDraggable({
    id,
    data: { type: 'board-column', index },
  })
  const { setNodeRef: setDroppableRef, isOver } = useDroppable({
    id,
    data: { type: 'board-column', index },
  })

  const setNodeRef = (node) => {
    rowRef.current = node
    setDraggableRef(node)
    setDroppableRef(node)
  }

  const viewTransitionName = `column-row-${id}`

  return (
    <div
      ref={setNodeRef}
      style={{ viewTransitionName }}
      className={`group flex items-center gap-2 rounded-lg transition-[box-shadow,background-color] duration-150 ease-out ${
        isOver ? 'ring-2 ring-primary/40 ring-inset bg-primary/5' : ''
      } ${isDragging ? 'min-h-[42px]' : ''}`}
    >
      {isDragging ? (
        <div
          className="w-full min-h-[42px] rounded-lg border-2 border-dashed border-border/50 bg-surface-light/10 transition-colors duration-200 ease-out"
          aria-hidden
        />
      ) : (
        <>
          <div
            ref={setActivatorNodeRef}
            className="cursor-grab active:cursor-grabbing touch-none p-0.5 -m-0.5 rounded shrink-0"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-4 w-4 text-text-muted/40 hover:text-text-muted" />
          </div>
          <div className="relative flex-1 min-w-0">
            <span className={`absolute left-3 top-1/2 -translate-y-1/2 h-2 w-2 rounded-full ${dotColorClass}`} />
            <input
              type="text"
              value={value}
              onChange={(e) => onChange(index, e.target.value)}
              className="block w-full rounded-lg border border-border bg-surface-light/50 text-white text-sm py-2 pl-7 pr-3 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors duration-150"
            />
          </div>
          <button
            type="button"
            onClick={() => onRemove(index)}
            className="text-text-muted hover:text-red-500 transition-colors duration-150 p-1 rounded hover:bg-red-500/10 shrink-0"
            title="Remove column"
          >
            <X className="h-4 w-4" />
          </button>
        </>
      )}
    </div>
  )
}

const themeColors = [
  { id: 'blue', color: '#1337ec', className: 'bg-[#1337ec]' },
  { id: 'emerald', color: '#10b981', className: 'bg-emerald-500' },
  { id: 'purple', color: '#8b5cf6', className: 'bg-purple-500' },
  { id: 'amber', color: '#f59e0b', className: 'bg-amber-500' },
  { id: 'rose', color: '#f43f5e', className: 'bg-rose-500' },
]

const defaultColumns = ['To Do', 'In Progress', 'Review', 'Done']

const columnDotColors = [
  'bg-slate-400',
  'bg-primary/60',
  'bg-purple-500/60',
  'bg-emerald-500/60',
  'bg-amber-500/60',
  'bg-rose-500/60',
  'bg-cyan-500/60',
]

export default function CreateBoardModal({ open, onClose, onCreate }) {
  const [boardName, setBoardName] = useState('')
  const [selectedTheme, setSelectedTheme] = useState('blue')
  const [columns, setColumns] = useState([...defaultColumns])
  const [displayOrder, setDisplayOrder] = useState(() => columns.map((_, i) => i))
  const [activeId, setActiveId] = useState(null)
  const lastOverIdRef = useRef(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
  )

  // Keep displayOrder in sync when columns are added/removed/reset
  useEffect(() => {
    setDisplayOrder(columns.map((_, i) => i))
  }, [columns.length])

  const handleDragStart = ({ active }) => {
    setActiveId(active.id)
    lastOverIdRef.current = null
  }

  const handleDragOver = ({ over }) => {
    if (activeId == null || over == null || over.id === activeId) return
    const overId = over.id
    if (lastOverIdRef.current === overId) return
    lastOverIdRef.current = overId

    setDisplayOrder((prev) => {
      const fromPos = prev.indexOf(activeId)
      const toPos = prev.indexOf(overId)
      if (fromPos === -1 || toPos === -1 || fromPos === toPos) return prev
      const next = arrayMove(prev, fromPos, toPos)
      if (next.every((v, i) => v === prev[i])) return prev
      queueMicrotask(() => {
        startViewTransitionIfSupported(() => setDisplayOrder(next))
      })
      return prev
    })
  }

  const handleDragEnd = ({ active, over }) => {
    lastOverIdRef.current = null
    setActiveId(null)
    if (!over || active.id === over.id) {
      setDisplayOrder(columns.map((_, i) => i))
      return
    }
    startViewTransitionIfSupported(() => {
      setColumns((prev) => displayOrder.map((i) => prev[i]))
      setDisplayOrder((prev) => prev.map((_, i) => i))
    })
  }

  const activeIndex = activeId != null && activeId >= 0 && activeId < columns.length ? activeId : null

  if (!open) return null

  const handleCreate = () => {
    const name = boardName.trim() || 'New Board'
    onCreate(name, columns.filter(Boolean))
    setBoardName('')
    setColumns([...defaultColumns])
    setSelectedTheme('blue')
    onClose()
  }

  const handleResetColumns = () => {
    const next = [...defaultColumns]
    setColumns(next)
    setDisplayOrder(next.map((_, i) => i))
  }

  const handleAddColumn = () => {
    setColumns((prev) => [...prev, ''])
  }

  const handleRemoveColumn = (index) => {
    setColumns((prev) => prev.filter((_, i) => i !== index))
  }

  const handleColumnChange = (index, value) => {
    setColumns((prev) => prev.map((col, i) => (i === index ? value : col)))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg-deep/80 backdrop-blur-sm transition-opacity">
      <div className="w-full max-w-lg transform overflow-hidden rounded-xl bg-surface shadow-2xl transition-all border border-border relative">
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-text-muted hover:text-white transition-colors z-10"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header */}
        <div className="px-8 pt-8 pb-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <LayoutDashboardIcon className="h-6 w-6" />
            </div>
            <h2 className="text-2xl font-bold text-white">Create New Board</h2>
          </div>
          <p className="text-text-muted text-sm ml-[3.25rem]">
            Set up your board structure and get ready to manage your tasks efficiently.
          </p>
        </div>

        {/* Body */}
        <div className="px-8 py-4 space-y-6">
          {/* Board Name */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-text-secondary" htmlFor="boardName">
              Board Name
            </label>
            <div className="relative">
              <input
                id="boardName"
                type="text"
                autoFocus
                value={boardName}
                onChange={(e) => setBoardName(e.target.value)}
                placeholder="e.g. Q4 Marketing Campaign"
                className="block w-full rounded-lg border border-border bg-surface-light text-white placeholder-text-muted text-sm py-2.5 px-3 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-shadow"
              />
            </div>
          </div>

          {/* Board Theme */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-text-secondary">
              Board Theme
            </label>
            <div className="flex gap-3">
              {themeColors.map((theme) => (
                <button
                  key={theme.id}
                  type="button"
                  onClick={() => setSelectedTheme(theme.id)}
                  className={`h-8 w-8 rounded-full ${theme.className} cursor-pointer transition-all ${
                    selectedTheme === theme.id
                      ? 'ring-2 ring-offset-2 ring-offset-surface ring-current scale-110'
                      : 'hover:ring-2 hover:ring-offset-2 hover:ring-offset-surface hover:ring-current hover:scale-105'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Columns */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-text-secondary">
                Columns <span className="text-xs font-normal text-text-muted ml-1">(Workflow Stages)</span>
              </label>
              <button
                type="button"
                onClick={handleResetColumns}
                className="text-xs text-primary hover:text-primary-light font-medium transition-colors"
              >
                Reset to Default
              </button>
            </div>

            <div className="custom-scrollbar max-h-48 overflow-y-auto pr-1 space-y-2.5">
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDragEnd={handleDragEnd}
              >
                {displayOrder.map((origIndex) => (
                  <SortableColumnRow
                    key={origIndex}
                    id={origIndex}
                    index={origIndex}
                    value={columns[origIndex]}
                    dotColorClass={columnDotColors[origIndex % columnDotColors.length]}
                    onChange={handleColumnChange}
                    onRemove={handleRemoveColumn}
                  />
                ))}
                <DragOverlay dropAnimation={DROP_ANIMATION}>
                  {activeIndex !== null ? (
                    <div className="flex items-center gap-2 rounded-lg border border-border bg-surface shadow-xl shadow-black/25 scale-[1.02] cursor-grabbing ring-1 ring-white/10">
                      <ColumnRowContent
                        value={columns[activeIndex]}
                        dotColorClass={columnDotColors[activeIndex % columnDotColors.length]}
                        showInput={false}
                      />
                    </div>
                  ) : null}
                </DragOverlay>
              </DndContext>
            </div>

            <button
              type="button"
              onClick={handleAddColumn}
              className="mt-2 w-full flex items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-surface-light/20 p-2 text-sm font-medium text-text-muted hover:bg-surface-light/40 hover:text-primary transition-all group"
            >
              <Plus className="h-4 w-4 group-hover:text-primary transition-colors" />
              Add New Column
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-black/20 px-8 py-5 flex items-center justify-end gap-3 border-t border-border mt-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm font-medium text-text-secondary hover:bg-white/5 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleCreate}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-6 py-2 text-sm font-medium text-white shadow-lg shadow-primary/30 hover:bg-primary-dark transition-all"
          >
            <span>Create Board</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

// Inline LayoutDashboard icon component (matching Material Icons style)
function LayoutDashboardIcon({ className }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="7" height="9" x="3" y="3" rx="1" />
      <rect width="7" height="5" x="14" y="3" rx="1" />
      <rect width="7" height="9" x="14" y="12" rx="1" />
      <rect width="7" height="5" x="3" y="16" rx="1" />
    </svg>
  )
}
