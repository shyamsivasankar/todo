import { AlertTriangle, Clock } from 'lucide-react'
import { useStore } from '../../../store/useStore'

const priorityStyles = {
  high: { text: 'text-orange-400', label: 'High', icon: true },
  medium: { text: 'text-yellow-400 opacity-80', label: 'Medium', icon: false },
  low: { text: 'text-blue-400 opacity-60', label: 'Low', icon: false },
}

function formatTimeAgo(dateStr) {
  if (!dateStr) return ''
  const now = new Date()
  const date = new Date(dateStr)
  const diffMs = now - date
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function formatDueDateShort(dateStr, isCompleted = false) {
  if (!dateStr) return null
  const due = new Date(dateStr)
  const now = new Date()
  const diffMs = due - now
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

  if (!isCompleted && diffDays < 0) return { text: 'Overdue', urgent: true }
  if (diffDays === 0) return { text: 'Due Today', urgent: !isCompleted }
  if (diffDays === 1) return { text: 'Tomorrow', urgent: false }
  return {
    text: due.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    urgent: false,
  }
}

export default function TaskListItem({ item, isSelected, onSelect }) {
  const updateTask = useStore((state) => state.updateTask)
  const { task, status, isStandalone, boardId, columnId } = item
  const priority = task.settings?.priority || 'medium'
  const pStyle = priorityStyles[priority] || priorityStyles.medium
  const isCompleted = !!task.settings?.completed
  const dueInfo = formatDueDateShort(task.settings?.dueDate, isCompleted)
  const timeAgo = formatTimeAgo(task.createdAt)

  // Determine the category tag
  const tagList = task.settings?.tags || []
  const categoryTag = tagList[0] || (isStandalone ? 'Inbox' : status)

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => e.key === 'Enter' && onSelect()}
      className={`group relative p-3 rounded-lg border cursor-pointer transition-all ${
        isSelected
          ? 'bg-[#1e212b] border-primary/50 shadow-md shadow-black/20'
          : 'bg-[#161821] border-border hover:bg-[#1e212b] hover:border-border-light'
      } ${isCompleted ? 'opacity-70' : ''}`}
    >
      {/* Active indicator bar */}
      {isSelected && (
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-l-lg" />
      )}

      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          {/* Checkbox */}
          <div className="mt-0.5">
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
              className="h-4 w-4 rounded border-border-light bg-transparent text-primary focus:ring-primary focus:ring-offset-0 cursor-pointer"
            />
          </div>

          <div className="flex-1 min-w-0">
            {/* Task heading */}
            <h3 className={`font-medium truncate text-[15px] mb-1 ${
              isCompleted ? 'text-text-muted line-through' : 
              isSelected ? 'text-text-primary' : 'text-text-secondary group-hover:text-white'
            } transition-colors`}>
              {task.heading}
            </h3>

            {/* Meta row */}
            <div className="flex items-center gap-3 text-sm text-text-muted">
              <span className="flex items-center gap-1 text-xs px-1.5 py-0.5 rounded bg-surface-light border border-border">
                {categoryTag}
              </span>
              <span className="text-xs text-text-muted font-mono">
                created {timeAgo}
              </span>
            </div>
          </div>
        </div>

        {/* Right side: due date + priority */}
        <div className="flex flex-col items-end gap-2 shrink-0">
          {dueInfo ? (
            <span className={`text-xs font-mono ${
              dueInfo.urgent
                ? 'px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 text-[10px] font-medium uppercase tracking-wide'
                : 'text-text-muted'
            }`}>
              {dueInfo.text}
            </span>
          ) : (
            <span className="text-xs text-text-muted font-mono">No date</span>
          )}
          <span className={`font-medium text-xs flex items-center gap-1 ${pStyle.text}`}>
            {pStyle.icon && <AlertTriangle className="h-3 w-3" />}
            {pStyle.label}
          </span>
        </div>
      </div>
    </div>
  )
}
