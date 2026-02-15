import {
  Briefcase,
  Dumbbell,
  Palette,
  Plus,
  Trash2,
} from 'lucide-react'
import { useStore } from '../../../store/useStore'

const boardIcons = [Briefcase, Dumbbell, Palette, Briefcase, Palette]
const boardColors = [
  { bg: 'bg-primary/20', text: 'text-primary' },
  { bg: 'bg-teal-500/20', text: 'text-teal-500' },
  { bg: 'bg-orange-500/20', text: 'text-orange-500' },
  { bg: 'bg-purple-500/20', text: 'text-purple-500' },
  { bg: 'bg-rose-500/20', text: 'text-rose-500' },
]

function getTaskCount(board) {
  if (!board?.columns) return 0
  return board.columns.reduce((sum, col) => sum + (col.tasks?.length || 0), 0)
}

export default function BoardCarousel({ onCreateBoard }) {
  const boards = useStore((state) => state.boards)
  const activeBoardId = useStore((state) => state.activeBoardId)
  const setActiveBoardId = useStore((state) => state.setActiveBoardId)
  const removeBoard = useStore((state) => state.removeBoard)
  const uiSettings = useStore((state) => state.uiSettings)

  const handleDeleteBoard = (e, board) => {
    e.stopPropagation()
    if (uiSettings.confirmBeforeDelete && !window.confirm(`Delete board "${board.name}"? Its tasks will be moved to My Tasks.`)) {
      return
    }
    removeBoard(board.id)
  }

  return (
    <div className="relative w-full group">
      <div className="flex overflow-x-auto gap-4 pb-4 scrollbar-hide snap-x px-1">
        {boards.map((board, index) => {
          const isActive = board.id === activeBoardId
          const colorIndex = index % boardColors.length
          const color = boardColors[colorIndex]
          const Icon = boardIcons[colorIndex]
          const taskCount = getTaskCount(board)

          return (
            <div
              key={board.id}
              className="snap-start shrink-0 w-48 relative group/card"
            >
              <button
                type="button"
                onClick={() => setActiveBoardId(board.id)}
                className={`w-full p-4 rounded-xl text-left transition-lift cursor-pointer relative overflow-hidden border border-border hover:border-border-light border-l-2 ${
                  isActive
                    ? 'bg-surface border-l-primary hover:border-l-primary'
                    : 'bg-card border-l-transparent hover:border-l-emerald-500'
                }`}
              >
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${color.bg} ${color.text} mb-3`}>
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className={`font-bold truncate ${isActive ? 'text-white' : 'text-text-secondary'}`}>
                  {board.name}
                </h3>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-text-muted font-medium">
                    {taskCount} {taskCount === 1 ? 'Task' : 'Tasks'}
                  </span>
                  {isActive && (
                    <div className="text-[10px] text-primary font-bold bg-primary/10 px-2 py-0.5 rounded">
                      ACTIVE
                    </div>
                  )}
                </div>
              </button>
              <button
                type="button"
                onClick={(e) => handleDeleteBoard(e, board)}
                className="absolute top-1.5 right-1.5 p-1.5 rounded-lg bg-surface/90 text-text-muted hover:text-rose-400 hover:bg-rose-500/10 border border-border opacity-0 group-hover/card:opacity-100 transition-opacity z-10"
                title={`Delete board "${board.name}"`}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          )
        })}

        {/* New Board card */}
        <button
          type="button"
          onClick={onCreateBoard}
          className="snap-start shrink-0 w-48 p-4 rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center cursor-pointer hover:bg-surface-light/50 transition-colors group/new"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-light text-text-muted group-hover/new:text-primary group-hover/new:bg-primary/10 mb-2 transition-colors">
            <Plus className="h-5 w-5" />
          </div>
          <span className="text-sm font-medium text-text-muted group-hover/new:text-primary transition-colors">
            New Board
          </span>
        </button>
      </div>

      {/* Right fade */}
      <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-bg-base to-transparent z-10 pointer-events-none" />
    </div>
  )
}
