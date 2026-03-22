import {
  Briefcase,
  Dumbbell,
  Palette,
  Pencil,
  Plus,
  Trash2,
  Terminal,
  Activity,
} from 'lucide-react'
import { useStore } from '../../../store/useStore'
import CyberCard from '../../../components/ui/CyberCard'
import CyberBadge from '../../../components/ui/CyberBadge'

const boardIcons = [Briefcase, Dumbbell, Palette, Briefcase, Palette]
const boardVariants = ['blue', 'cyan', 'amber', 'violet', 'pink']

function getTaskCount(board) {
  let count = 0
  for (const col of board.columns) {
    count += col.tasks.length
  }
  return count
}

export default function BoardCarousel({ onCreateBoard, onEditBoard }) {
  const boards = useStore((state) => state.boards)
  const activeBoardId = useStore((state) => state.activeBoardId)
  const setActiveBoardId = useStore((state) => state.setActiveBoardId)
  const removeBoard = useStore((state) => state.removeBoard)
  const uiSettings = useStore((state) => state.uiSettings)

  const handleDelete = (e, boardId) => {
    e.stopPropagation()
    if (uiSettings.confirmBeforeDelete && !window.confirm('Delete this sector? Task nodes will become standalone.')) return
    removeBoard(boardId)
  }

  return (
    <div className="flex items-center gap-4 overflow-x-auto pb-4 pt-2 custom-scrollbar">
      {boards.map((board, idx) => {
        const isActive = board.id === activeBoardId
        const Icon = boardIcons[idx % boardIcons.length]
        const variant = boardVariants[idx % boardVariants.length]
        const taskCount = getTaskCount(board)

        return (
          <CyberCard
            key={board.id}
            variant={variant}
            glow={isActive}
            interactive
            padding="p-4"
            className={`min-w-[200px] flex-col gap-3 group transition-all duration-500 ${
              isActive ? 'scale-105 z-10' : 'opacity-60 grayscale-[0.5] hover:opacity-100 hover:grayscale-0'
            }`}
            onClick={() => setActiveBoardId(board.id)}
          >
            <div className="flex items-start justify-between mb-2">
              <div className={`p-2 rounded-sm bg-cyber-${variant}/10 border border-cyber-${variant}/30 text-cyber-${variant} group-hover:animate-pulse`}>
                <Icon className="h-5 w-5" />
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => { e.stopPropagation(); onEditBoard(board); }}
                  className="p-1 text-surface-variant hover:text-white transition-colors"
                >
                  <Pencil className="h-3 w-3" />
                </button>
                <button
                  onClick={(e) => handleDelete(e, board.id)}
                  className="p-1 text-surface-variant hover:text-cyber-pink transition-colors"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <h3 className="font-orbitron text-xs font-black text-white uppercase tracking-wider truncate">
                {board.name}
              </h3>
              <div className="flex items-center gap-2">
                <CyberBadge variant={variant} size="xs">
                  {taskCount} TASK NODES
                </CyberBadge>
                {isActive && (
                  <span className={`text-[8px] font-mono text-cyber-${variant} animate-flicker`}>
                    ACTIVE
                  </span>
                )}
              </div>
            </div>

            {/* Selection indicator */}
            {isActive && (
              <div className={`absolute bottom-0 left-0 right-0 h-0.5 bg-cyber-${variant} shadow-neon-${variant}`} />
            )}
          </CyberCard>
        )
      })}

      <button
        onClick={onCreateBoard}
        className="min-w-[200px] h-[110px] flex flex-col items-center justify-center gap-2 rounded-sm border border-dashed border-white/10 hover:border-cyber-blue/50 hover:bg-cyber-blue/5 text-surface-variant hover:text-cyber-blue transition-all group"
      >
        <Plus className="h-6 w-6 group-hover:scale-125 transition-transform" />
        <span className="font-orbitron text-[9px] font-bold uppercase tracking-widest">Create New Sector</span>
      </button>
    </div>
  )
}
