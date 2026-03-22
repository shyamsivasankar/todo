import { Activity, Terminal, Hash, Cpu } from 'lucide-react'
import { useStore } from '../../../store/useStore'
import CyberBadge from '../../../components/ui/CyberBadge'

const priorityStyles = {
  high: { text: 'text-cyber-amber', label: 'CRITICAL', icon: true, variant: 'amber' },
  medium: { text: 'text-cyber-blue', label: 'ACTIVE', icon: false, variant: 'blue' },
  low: { text: 'text-cyber-lime', label: 'STABLE', icon: false, variant: 'lime' },
}

function formatTimeAgo(dateStr) {
  if (!dateStr) return ''
  const now = new Date()
  const date = new Date(dateStr)
  const diffMs = now - date
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'JUST_NOW'
  if (diffMins < 60) return `${diffMins}M_AGO`
  if (diffHours < 24) return `${diffHours}H_AGO`
  if (diffDays < 7) return `${diffDays}D_AGO`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase()
}

function formatDueDateShort(dateStr, isCompleted = false) {
  if (!dateStr) return null
  const due = new Date(dateStr)
  const now = new Date()
  const diffMs = due - now
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

  if (!isCompleted && diffDays < 0) return { text: 'OVERDUE_SIGNAL', urgent: true }
  if (diffDays === 0) return { text: 'DUE_CYCLE_0', urgent: !isCompleted }
  if (diffDays === 1) return { text: 'NEXT_CYCLE', urgent: false }
  return {
    text: due.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase(),
    urgent: false,
  }
}

export default function TaskListItem({ item, isSelected, onSelect }) {
  const updateTask = useStore((state) => state.updateTask)
  const { task, status, isStandalone, boardId, columnId, boardName } = item
  const priority = task.settings?.priority || 'medium'
  const pStyle = priorityStyles[priority] || priorityStyles.medium
  const isCompleted = !!task.settings?.completed
  const dueInfo = formatDueDateShort(task.settings?.dueDate, isCompleted)
  const timeAgo = formatTimeAgo(task.createdAt)

  const tagList = task.settings?.tags || []
  const categoryTag = (tagList[0] || (isStandalone ? 'INBOX' : status)).toUpperCase()

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => e.key === 'Enter' && onSelect()}
      className={`group relative p-5 rounded-sm border transition-all duration-200 cursor-pointer overflow-hidden ${
        isSelected
          ? `bg-cyber-${pStyle.variant}/10 border-cyber-${pStyle.variant} shadow-[0_0_30px_rgba(0,0,0,0.5)] z-20`
          : 'bg-surface-low border-white/10 hover:border-white/30 hover:bg-white/[0.02]'
      } ${isCompleted ? 'opacity-40 grayscale' : ''}`}
    >
      {/* Selection / Priority Glow */}
      <div className={`absolute left-0 top-0 bottom-0 w-1 transition-all duration-300 ${isSelected ? `bg-cyber-${pStyle.variant} shadow-neon-${pStyle.variant}` : `bg-cyber-${pStyle.variant}/50 group-hover:bg-cyber-${pStyle.variant}`}`} />

      {/* Decorative Background Icon */}
      <div className="absolute top-1/2 right-4 -translate-y-1/2 opacity-[0.02] group-hover:opacity-[0.05] transition-opacity pointer-events-none scale-150 rotate-12">
        <Cpu className={`w-32 h-32 text-cyber-${pStyle.variant}`} />
      </div>

      <div className="flex items-start gap-4 relative z-10">
        {/* Checkbox */}
        <div className="mt-0.5 relative flex items-center shrink-0">
          <input
            type="checkbox"
            checked={isCompleted}
            onChange={(e) => {
              e.stopPropagation()
              updateTask(boardId, columnId, task.id, {
                settings: { ...task.settings, completed: e.target.checked },
              })
            }}
            onClick={(e) => e.stopPropagation()}
            className={`peer h-5 w-5 appearance-none rounded-sm border-2 transition-all cursor-pointer ${
              isSelected ? `border-cyber-${pStyle.variant}/50` : 'border-white/20 hover:border-white/50'
            } checked:bg-cyber-lime checked:border-cyber-lime shadow-neon-lime/20`}
          />
          <span className="pointer-events-none absolute left-[3px] top-[3px] hidden h-3.5 w-3.5 text-cyber-black peer-checked:block font-black">
            ✓
          </span>
        </div>

        <div className="flex-1 min-w-0 flex flex-col gap-3">
          {/* Top Row: Title & Priority */}
          <div className="flex items-start justify-between gap-4">
            <h3 className={`font-orbitron text-sm font-black truncate uppercase tracking-widest ${
              isCompleted ? 'text-surface-variant line-through' : 
              isSelected ? 'text-white' : 'text-white/90 group-hover:text-white'
            } transition-colors`}>
              {task.heading}
            </h3>
            
            <CyberBadge variant={pStyle.variant} size="xs" className="shrink-0">
              {pStyle.label}
            </CyberBadge>
          </div>

          {/* Middle Row: TLDR (if exists) */}
          {task.tldr && (
            <p className="font-mono text-[10px] text-surface-variant uppercase tracking-tighter line-clamp-1 border-l-2 border-white/10 pl-2">
              {task.tldr}
            </p>
          )}

          {/* Bottom Row: Metadata */}
          <div className="flex items-center justify-between mt-auto pt-2 border-t border-white/5">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5 font-mono text-[9px] px-2 py-0.5 rounded-sm bg-black/40 border border-white/5 text-surface-variant">
                <Hash className="h-2.5 w-2.5" />
                {categoryTag}
              </span>
              <span className="flex items-center gap-1.5 font-mono text-[9px] px-2 py-0.5 rounded-sm bg-black/40 border border-white/5 text-surface-variant">
                <Terminal className="h-2.5 w-2.5 text-cyber-blue/70" />
                {boardName || 'STANDALONE'}
              </span>
            </div>

            <div className="flex items-center gap-4">
              <span className="font-mono text-[8px] text-surface-highest uppercase tracking-tighter">
                INIT: {timeAgo}
              </span>
              {dueInfo ? (
                <span className={`font-mono text-[9px] font-bold ${
                  dueInfo.urgent
                    ? 'text-cyber-pink animate-pulse'
                    : 'text-surface-variant'
                }`}>
                  {dueInfo.text}
                </span>
              ) : (
                <span className="font-mono text-[8px] text-surface-highest uppercase">NO_DEADLINE</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Decorative corner markers */}
      {isSelected && (
        <>
          <div className={`absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-cyber-${pStyle.variant} opacity-50`} />
          <div className={`absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-cyber-${pStyle.variant} opacity-50`} />
        </>
      )}
    </div>
  )
}
