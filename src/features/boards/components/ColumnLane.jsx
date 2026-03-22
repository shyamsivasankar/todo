import { useDroppable } from '@dnd-kit/core'
import { MoreHorizontal, Plus, Terminal, Cpu } from 'lucide-react'
import TaskCard from '../../tasks/components/TaskCard'
import { useStore } from '../../../store/useStore'
import CyberBadge from '../../../components/ui/CyberBadge'
import CyberButton from '../../../components/ui/CyberButton'
import CyberCard from '../../../components/ui/CyberCard'

const columnVariants = ['blue', 'pink', 'violet', 'cyan', 'lime']

export default function ColumnLane({ boardId, column, columnIndex = 0, onCreateTask }) {
  const openTaskDetail = useStore((state) => state.openTaskDetail)
  const isDoneColumn = column.title.toLowerCase() === 'done' || column.title.toLowerCase() === 'synced'

  const { setNodeRef, isOver } = useDroppable({
    id: `column-${column.id}`,
    data: {
      type: 'column',
      boardId,
      columnId: column.id,
    },
  })

  const variant = columnVariants[columnIndex % columnVariants.length]

  return (
    <section
      ref={setNodeRef}
      className={`flex h-full min-w-[320px] max-w-[400px] flex-1 flex-col transition-all duration-200 relative group/lane ${
        isOver ? 'scale-[1.01] z-10' : ''
      }`}
    >
      <div className={`absolute inset-0 bg-gradient-to-b from-cyber-${variant}/5 to-transparent opacity-0 group-hover/lane:opacity-100 transition-opacity pointer-events-none duration-200`} />

      <CyberCard
        variant={variant}
        glow={isOver}
        padding="p-0"
        className={`flex flex-col h-full bg-surface-low/90 border-white/5 relative overflow-hidden ${isOver ? 'border-cyber-' + variant + '/50 shadow-[inset_0_0_30px_rgba(var(--color-cyber-' + variant + '),0.05)]' : ''}`}
      >
        {/* Column background accent */}
        <div className="absolute top-0 right-0 p-4 opacity-[0.02] pointer-events-none scale-150 translate-x-4 -translate-y-4">
          <Cpu className={`h-24 w-24 text-cyber-${variant}`} />
        </div>

        {/* Column header */}
        <div className="flex items-center justify-between p-4 bg-surface-high/40 border-b border-white/5 relative z-10">
          <div className="flex items-center gap-3">
            <div className={`p-1.5 bg-cyber-${variant}/10 border border-cyber-${variant}/30 rounded-sm`}>
              <Terminal className={`h-4 w-4 text-cyber-${variant} animate-pulse`} />
            </div>
            <div className="flex flex-col">
              <h2 className="font-orbitron text-xs font-black uppercase tracking-[0.2em] text-white">
                {column.title}
              </h2>
              <span className={`font-mono text-[8px] text-cyber-${variant}/70 uppercase tracking-widest leading-none mt-1`}>
                Sector_Node_0x{columnIndex}
              </span>
            </div>
            <CyberBadge variant={variant} size="xs" className="ml-2">
              {column.tasks.length}
            </CyberBadge>
          </div>
          <button type="button" className="text-surface-variant hover:text-white transition-colors p-1 bg-white/5 rounded-sm">
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </div>

        {/* Task cards */}
        <div className={`flex-1 overflow-y-auto p-4 custom-scrollbar space-y-4 relative z-10 ${isDoneColumn ? 'opacity-60 grayscale-[0.5] hover:opacity-100 hover:grayscale-0 transition-all duration-500' : ''}`}>
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

          <CyberButton
            variant={variant}
            size="sm"
            outline
            fullWidth
            icon={Plus}
            onClick={() => onCreateTask(boardId, column.id)}
            className="border-dashed py-4 bg-black/20 hover:bg-cyber-blue/5 border-white/10 hover:border-cyber-blue/50"
          >
            Deploy Node
          </CyberButton>
        </div>

        {/* Bottom accent line */}
        <div className="h-[2px] w-full bg-white/5 relative overflow-hidden">
          <div className={`absolute top-0 left-0 h-full w-1/3 bg-gradient-to-r from-transparent via-cyber-${variant} to-transparent animate-scanline opacity-50`} />
        </div>
      </CyberCard>
    </section>
  )
}
