import { useDroppable } from '@dnd-kit/core'
import { MoreHorizontal, Plus } from 'lucide-react'
import TaskCard from '../../tasks/components/TaskCard'
import { useStore } from '../../../store/useStore'

/** One colour per stage index so each column has a distinct dot. */
const columnDotColors = [
  'bg-slate-400',
  'bg-primary',
  'bg-emerald-500',
  'bg-purple-500',
  'bg-amber-500',
  'bg-rose-500',
  'bg-cyan-500',
  'bg-violet-500',
  'bg-orange-500',
  'bg-teal-500',
]

export default function ColumnLane({ boardId, column, columnIndex = 0, onCreateTask }) {
  const openTaskDetail = useStore((state) => state.openTaskDetail)
  const isDoneColumn = column.title.toLowerCase() === 'done'

  const { setNodeRef, isOver } = useDroppable({
    id: `column-${column.id}`,
    data: {
      type: 'column',
      boardId,
      columnId: column.id,
    },
  })

  const statusDot = columnDotColors[columnIndex % columnDotColors.length]

  return (
    <section
      ref={setNodeRef}
      className={`flex h-full min-w-[300px] flex-1 flex-col rounded-xl border transition-colors glass-panel ${isOver
          ? 'border-primary/60 bg-primary/10'
          : 'border-white/5 bg-white/5 backdrop-blur-md shadow-xl ring-1 ring-white/5'
        }`}
    >
      {/* Column header */}
      <div className="flex items-center justify-between p-4 sticky top-0 bg-inherit rounded-t-xl z-10 border-b border-border">
        <div className="flex items-center gap-2">
          <div className={`h-3 w-3 rounded-full ${statusDot}`} />
          <h2 className="font-semibold text-text-secondary">{column.title}</h2>
          <span className="rounded-md bg-surface-light px-2 py-0.5 text-xs font-bold text-text-muted">
            {column.tasks.length}
          </span>
        </div>
        <button
          type="button"
          className="text-text-muted hover:text-text-secondary transition-colors"
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </div>

      {/* Task cards */}
      <div className={`flex-1 overflow-y-auto p-3 custom-scrollbar space-y-3 ${isDoneColumn ? 'opacity-75 hover:opacity-100 transition-opacity' : ''}`}>
        {column.tasks.map((task) => (
          <TaskCard
            key={task.id}
            boardId={boardId}
            columnId={column.id}
            task={task}
            isDone={isDoneColumn}
            onOpen={() => openTaskDetail(boardId, column.id, task.id)}
          />
        ))}

        {/* Add task button */}
        <button
          type="button"
          onClick={() => onCreateTask(boardId, column.id)}
          className="flex w-full items-center justify-center gap-1 rounded-lg border border-dashed border-border py-2 text-sm text-text-muted hover:bg-surface-light hover:text-primary transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Task
        </button>
      </div>
    </section>
  )
}
