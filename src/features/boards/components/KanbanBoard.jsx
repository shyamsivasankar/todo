import { useMemo } from 'react'
import ColumnLane from './ColumnLane'
import CyberCard from '../../../components/ui/CyberCard'
import { Terminal } from 'lucide-react'

const priorityRank = { high: 3, medium: 2, low: 1 }

function filterAndSortTasks(tasks, searchQuery, filter, sort) {
  const query = (searchQuery || '').trim().toLowerCase()
  let result = [...tasks]

  if (query) {
    result = result.filter((task) => {
      const haystack = `${task.heading || ''} ${task.tldr || ''} ${task.description || ''}`.toLowerCase()
      return haystack.includes(query)
    })
  }

  if (filter?.priority != null) {
    result = result.filter((task) => (task.settings?.priority || 'medium') === filter.priority)
  }
  if (filter?.dueDateOnly) {
    result = result.filter((task) => !!(task.settings?.dueDate && task.settings.dueDate.trim()))
  }

  const by = sort?.by || 'none'
  const dir = sort?.dir || 'asc'
  if (by !== 'none') {
    result.sort((a, b) => {
      let cmp = 0
      if (by === 'name') {
        cmp = (a.heading || '').localeCompare(b.heading || '')
      } else if (by === 'newest' || by === 'oldest') {
        const tA = new Date(a.createdAt || 0).getTime()
        const tB = new Date(b.createdAt || 0).getTime()
        cmp = by === 'newest' ? tB - tA : tA - tB
      } else if (by === 'dueDate') {
        const dA = a.settings?.dueDate || '9999'
        const dB = b.settings?.dueDate || '9999'
        cmp = dA.localeCompare(dB)
      } else if (by === 'priority') {
        const pA = priorityRank[a.settings?.priority || 'medium'] || 0
        const pB = priorityRank[b.settings?.priority || 'medium'] || 0
        cmp = pB - pA
      }
      return dir === 'desc' ? -cmp : cmp
    })
  }

  return result
}

export default function KanbanBoard({ board, onCreateTask, searchQuery = '', filter = {}, sort = {} }) {
  const columnsWithFilteredTasks = useMemo(() => {
    if (!board?.columns) return []
    return board.columns.map((column) => ({
      ...column,
      tasks: filterAndSortTasks(column.tasks || [], searchQuery, filter, sort),
    }))
  }, [board, searchQuery, filter, sort])

  if (!board) {
    return (
      <div className="flex h-full items-center justify-center p-12">
        <CyberCard variant="blue" glow={false} padding="p-12" className="bg-surface-low border-dashed border-white/10 opacity-50">
          <div className="flex flex-col items-center gap-4">
            <Terminal className="h-12 w-12 text-cyber-blue animate-pulse" />
            <span className="font-orbitron text-xs font-bold text-surface-variant uppercase tracking-[0.3em] text-center">
              [ SELECT_MATRIX_FOR_DATA_VISUALIZATION ]
            </span>
          </div>
        </CyberCard>
      </div>
    )
  }

  return (
    <div className="flex h-full gap-4 overflow-x-auto pb-4 custom-scrollbar">
      {columnsWithFilteredTasks.map((column, index) => (
        <ColumnLane
          key={column.id}
          boardId={board.id}
          column={column}
          columnIndex={index}
          onCreateTask={onCreateTask}
        />
      ))}
    </div>
  )
}
