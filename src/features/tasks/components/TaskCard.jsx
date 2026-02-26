import { useDraggable } from '@dnd-kit/core'
import { Calendar, CheckCircle2, Clock, Pencil, X } from 'lucide-react'
import { useStore } from '../../../store/useStore'

const priorityBadges = {
  high: {
    label: 'High',
    className: 'bg-red-500/20 text-red-300',
  },
  medium: {
    label: 'Medium',
    className: 'bg-yellow-500/20 text-yellow-300',
  },
  low: {
    label: 'Low',
    className: 'bg-slate-700 text-slate-300',
  },
}

function formatDueDate(dateStr, isCompleted = false) {
  if (!dateStr) return null
  const due = new Date(dateStr)
  const now = new Date()
  const diffMs = due - now
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

  if (!isCompleted && diffDays < 0) return { text: 'Overdue', urgent: true }
  if (diffDays === 0) return { text: 'Due Today', urgent: !isCompleted }
  if (diffDays === 1) return { text: 'Tomorrow', urgent: false }
  if (diffDays <= 7) return { text: `${diffDays} days`, urgent: false }

  return {
    text: due.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    urgent: false,
  }
}

export default function TaskCard({ boardId, columnId, task, isDone = false, onOpen, isOverlay = false }) {
  const updateTask = useStore((state) => state.updateTask)
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
    disabled: isOverlay,
    data: {
      type: 'task',
      boardId,
      columnId,
      taskId: task.id,
    },
  })

  if (!isOverlay && isDragging) {
    return (
      <div
        ref={setNodeRef}
        className="h-[162px] w-full rounded-lg bg-primary/5 border border-dashed border-primary/20"
      />
    )
  }

  const style = !isOverlay && transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined

  const priority = task.settings?.priority || 'medium'
  const badge = priorityBadges[priority] || priorityBadges.medium
  const isCompleted = !!task.settings?.completed || isDone
  const dueInfo = formatDueDate(task.settings?.dueDate, isCompleted)
  const tagList = task.settings?.tags || []

  return (
    <article
      ref={isOverlay ? null : setNodeRef}
      style={style}
      className={`rounded-lg p-4 transition-lift group backdrop-blur-sm border shadow-sm ${
        !isOverlay && isDragging
          ? 'cursor-grabbing opacity-70 bg-surface/80 border-primary/50'
          : 'cursor-grab bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/10 glass-card'
        } ${isCompleted ? 'opacity-75' : ''}`}
      {...(!isOverlay ? attributes : {})}
      {...(!isOverlay ? listeners : {})}
    >
      {/* Priority badge + edit button */}
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={isCompleted}
            onChange={(e) => {
              e.stopPropagation()
              updateTask(boardId, columnId, task.id, {
                settings: { ...task.settings, completed: e.target.checked },
              })
            }}
            onPointerDown={(e) => e.stopPropagation()}
            className="h-4 w-4 rounded border-white/20 bg-transparent text-emerald-500 focus:ring-emerald-500 focus:ring-offset-0 cursor-pointer"
          />
          <span className={`inline-block rounded px-2 py-1 text-[10px] font-bold tracking-wide uppercase ${badge.className}`}>
            {badge.label}
          </span>
        </div>
        {isCompleted && (
          <CheckCircle2 className="h-5 w-5 text-emerald-500" />
        )}
        {!isCompleted && (
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation()
              onOpen()
            }}
            className="opacity-0 group-hover:opacity-100 text-text-muted hover:text-white transition-opacity"
          >
            <Pencil className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Task heading */}
      <button
        type="button"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation()
          onOpen()
        }}
        className="w-full text-left"
      >
        <h3 className={`font-semibold mb-1 ${isCompleted ? 'text-text-muted line-through' : 'text-text-primary'}`}>
          {task.heading}
        </h3>
        {task.tldr && (
          <p className={`text-xs mb-4 line-clamp-2 ${isCompleted ? 'text-text-muted/60' : 'text-text-muted'}`}>
            {task.tldr}
          </p>
        )}
      </button>

      {/* Tags */}
      {tagList.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {tagList.map((tag) => (
            <span
              key={tag}
              className="group relative rounded bg-surface-light px-2 py-0.5 text-[10px] text-text-muted transition-all hover:pr-5"
            >
              #{tag}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  const nextTags = tagList.filter((t) => t !== tag)
                  updateTask(boardId, columnId, task.id, {
                    settings: { ...task.settings, tags: nextTags },
                  })
                }}
                className="absolute right-0.5 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-text-muted/50 opacity-0 transition-all hover:bg-white/10 hover:text-white group-hover:opacity-100"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Footer with due date */}
      <div className="flex items-center justify-between pt-3 border-t border-border/50">
        {dueInfo ? (
          <div className={`flex items-center gap-1 text-xs ${dueInfo.urgent ? 'text-red-400 font-medium' : 'text-text-muted'}`}>
            {dueInfo.urgent ? (
              <Clock className="h-3.5 w-3.5" />
            ) : (
              <Calendar className="h-3.5 w-3.5" />
            )}
            <span>{dueInfo.text}</span>
          </div>
        ) : (
          <span className="text-xs text-text-muted/50">No due date</span>
        )}
      </div>
    </article>
  )
}
