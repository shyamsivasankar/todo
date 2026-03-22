import { useDraggable } from '@dnd-kit/core'
import { Calendar, CheckCircle2, Clock, Pencil, X, Hash, AlertTriangle, Cpu } from 'lucide-react'
import { useStore } from '../../../store/useStore'

const priorityStyles = {
  high: {
    label: 'CRITICAL',
    color: 'text-cyber-amber',
    bg: 'bg-cyber-amber',
    borderColor: 'border-cyber-amber/50',
    glow: 'shadow-neon-amber',
    icon: <AlertTriangle className="h-3 w-3 animate-pulse" />,
  },
  medium: {
    label: 'ACTIVE',
    color: 'text-cyber-blue',
    bg: 'bg-cyber-blue',
    borderColor: 'border-cyber-blue/50',
    glow: 'shadow-neon-blue',
    icon: <Clock className="h-3 w-3" />,
  },
  low: {
    label: 'STABLE',
    color: 'text-cyber-lime',
    bg: 'bg-cyber-lime',
    borderColor: 'border-cyber-lime/50',
    glow: 'shadow-neon-lime',
    icon: <CheckCircle2 className="h-3 w-3" />,
  },
}

function formatDueDate(dateStr, isCompleted = false) {
  if (!dateStr) return null
  const due = new Date(dateStr)
  const now = new Date()
  const diffMs = due - now
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

  if (!isCompleted && diffDays < 0) return { text: 'OVERDUE_SIGNAL', urgent: true }
  if (diffDays === 0) return { text: 'DUE_CYCLE_0', urgent: !isCompleted }
  if (diffDays === 1) return { text: 'NEXT_CYCLE', urgent: false }
  
  return {
    text: `T-${diffDays}D`,
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
        className="h-[140px] w-full rounded-sm bg-cyber-blue/5 border border-dashed border-cyber-blue/30 animate-pulse relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyber-blue/10 to-transparent animate-scanline" />
      </div>
    )
  }

  const style = !isOverlay && transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined

  const priority = task.settings?.priority || 'medium'
  const pStyle = priorityStyles[priority] || priorityStyles.medium
  const isCompleted = !!task.settings?.completed || isDone
  const dueInfo = formatDueDate(task.settings?.dueDate, isCompleted)
  const tagList = task.settings?.tags || []

  return (
    <article
      ref={isOverlay ? null : setNodeRef}
      className={`
        relative group rounded-sm p-4 transition-all duration-150 border bg-surface-low overflow-hidden
        ${isOverlay ? `cursor-grabbing border-cyber-blue shadow-neon-blue scale-105 z-50` : 'cursor-grab border-white/5 hover:border-white/20 hover:bg-surface-high'}
        ${isCompleted ? 'opacity-40 grayscale' : ''}
      `}
      style={style}
      {...(!isOverlay ? attributes : {})}
      {...(!isOverlay ? listeners : {})}
    >
      {/* Background visual accents */}
      <div className="absolute top-0 right-0 p-2 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none scale-125 -translate-y-2">
        <Cpu className={`h-16 w-16 ${pStyle.color}`} />
      </div>

      {/* Decorative side accent */}
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${isCompleted ? 'bg-surface-variant' : pStyle.bg} opacity-50 group-hover:opacity-100 transition-opacity ${isOverlay ? pStyle.glow : ''}`} />

      {/* Header: Priority + ID */}
      <div className="flex justify-between items-start mb-3 relative z-10">
        <div className="flex items-center gap-2">
          <div className={`flex items-center gap-1.5 font-orbitron text-[9px] font-black uppercase tracking-[0.2em] ${pStyle.color}`}>
            {pStyle.icon}
            {pStyle.label}
          </div>
          <div className="w-[1px] h-3 bg-white/10" />
          <span className="font-mono text-[8px] text-surface-variant uppercase tracking-widest">
            {task.id.toString().slice(-4)}
          </span>
        </div>
        {!isCompleted && (
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation()
              onOpen()
            }}
            className="opacity-0 group-hover:opacity-100 text-surface-variant hover:text-cyber-blue transition-all bg-black/40 p-1 rounded-sm border border-white/5"
          >
            <Pencil className="h-3 w-3" />
          </button>
        )}
      </div>

      {/* Task Content */}
      <button
        type="button"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation()
          onOpen()
        }}
        className="w-full text-left mb-4 relative z-10"
      >
        <h3 className={`font-orbitron text-xs font-black leading-tight mb-2 uppercase tracking-tight ${isCompleted ? 'text-surface-variant line-through' : 'text-white group-hover:text-cyber-blue transition-colors'}`}>
          {task.heading}
        </h3>
        {task.tldr && (
          <p className="font-mono text-[9px] leading-relaxed line-clamp-2 text-surface-variant border-l border-white/10 pl-2 py-0.5">
            {task.tldr}
          </p>
        )}
      </button>

      {/* Footer: Tags & Due Date */}
      <div className="flex items-center justify-between mt-auto pt-3 border-t border-white/5 relative z-10">
        <div className="flex flex-wrap gap-1.5 max-w-[65%]">
          {tagList.map((tag) => (
            <span key={tag} className="flex items-center gap-1 text-[8px] font-mono text-surface-variant uppercase tracking-widest bg-black/40 px-1.5 py-0.5 rounded-sm border border-white/5">
              <Hash className="h-2 w-2 text-cyber-violet" />
              {tag}
            </span>
          ))}
        </div>

        {dueInfo ? (
          <div className={`font-mono text-[9px] font-bold tracking-widest ${dueInfo.urgent ? 'text-cyber-pink animate-pulse' : 'text-surface-variant'}`}>
            [{dueInfo.text}]
          </div>
        ) : (
          <div className="font-mono text-[8px] text-surface-highest uppercase tracking-widest">NO_DEADLINE</div>
        )}
      </div>

      {/* Checkbox Overlay (only on hover) */}
      <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity z-20">
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
          className="h-4 w-4 appearance-none rounded-sm border-2 border-white/20 bg-black/40 checked:bg-cyber-lime checked:border-cyber-lime transition-all cursor-pointer relative before:content-['✓'] before:absolute before:inset-0 before:text-black before:text-[10px] before:font-black before:flex before:items-center before:justify-center before:opacity-0 checked:before:opacity-100"
        />
      </div>

      {/* Decorative corners for overlay */}
      {isOverlay && (
        <>
          <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-cyber-blue opacity-50" />
          <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-cyber-blue opacity-50" />
        </>
      )}
    </article>
  )
}
