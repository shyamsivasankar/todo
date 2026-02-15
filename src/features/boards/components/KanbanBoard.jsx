import { useMemo } from 'react'
import ColumnLane from './ColumnLane'

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
  }, [board?.columns, searchQuery, filter?.priority, filter?.dueDateOnly, sort?.by, sort?.dir])

  if (!board) {
    return (
      <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-border bg-surface/40 text-sm text-text-muted">
        Create or select a board to start planning work.
      </div>
    )
  }

  return (
    <div className="flex h-full gap-6 overflow-x-auto pb-2 custom-scrollbar">
      {columnsWithFilteredTasks.map((column) => (
        <ColumnLane
          key={column.id}
          boardId={board.id}
          column={column}
          onCreateTask={onCreateTask}
        />
      ))}
    </div>
  )
}
