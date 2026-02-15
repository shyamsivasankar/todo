import { Inbox, Plus, Search } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useStore } from '../../../store/useStore'
import TaskDetailPanel from '../components/TaskDetailPanel'
import TaskListItem from '../components/TaskListItem'

function groupTasksByDate(tasks) {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const tomorrow = new Date(today.getTime() + 86400000)
  const nextWeek = new Date(today.getTime() + 7 * 86400000)

  const groups = {
    overdue: { label: 'Overdue', items: [] },
    today: { label: 'Today', items: [] },
    tomorrow: { label: 'Tomorrow', items: [] },
    thisWeek: { label: 'This Week', items: [] },
    nextWeek: { label: 'Next Week', items: [] },
    later: { label: 'Later', items: [] },
    noDueDate: { label: 'No Due Date', items: [] },
  }

  for (const item of tasks) {
    const dueStr = item.task.settings?.dueDate
    if (!dueStr) {
      groups.noDueDate.items.push(item)
      continue
    }
    const due = new Date(dueStr)
    if (due < today) groups.overdue.items.push(item)
    else if (due < tomorrow) groups.today.items.push(item)
    else if (due < new Date(tomorrow.getTime() + 86400000)) groups.tomorrow.items.push(item)
    else if (due < nextWeek) groups.thisWeek.items.push(item)
    else if (due < new Date(nextWeek.getTime() + 7 * 86400000)) groups.nextWeek.items.push(item)
    else groups.later.items.push(item)
  }

  return Object.values(groups).filter((g) => g.items.length > 0)
}

export default function TasksPage({ onCreateTask }) {
  const boards = useStore((state) => state.boards)
  const standaloneTasks = useStore((state) => state.standaloneTasks)

  const [search, setSearch] = useState('')
  const [selectedTaskItem, setSelectedTaskItem] = useState(null)
  const [sortBy, setSortBy] = useState('newest')

  const allTasks = useMemo(() => {
    const boardTasks = (boards || []).flatMap((board) =>
      (board.columns || []).flatMap((column) =>
        (column.tasks || []).map((task) => ({
          task,
          boardId: board.id,
          boardName: board.name,
          columnId: column.id,
          status: column.title,
          isStandalone: false,
        })),
      ),
    )

    const standaloneTaskItems = (standaloneTasks || []).map((task) => ({
      task,
      boardId: null,
      boardName: 'No Board',
      columnId: null,
      status: task.settings?.status || 'To Do',
      isStandalone: true,
    }))

    return [...boardTasks, ...standaloneTaskItems]
  }, [boards, standaloneTasks])

  const filteredTasks = useMemo(() => {
    const query = search.trim().toLowerCase()
    let result = allTasks

    if (query) {
      result = result.filter((item) => {
        const haystack = `${item.task.heading} ${item.task.tldr} ${item.task.description}`.toLowerCase()
        return haystack.includes(query)
      })
    }

    // Sort
    const priorityRank = { high: 3, medium: 2, low: 1 }
    const copy = [...result]
    copy.sort((a, b) => {
      if (sortBy === 'priority') return (priorityRank[b.task.settings?.priority || 'medium'] || 0) - (priorityRank[a.task.settings?.priority || 'medium'] || 0)
      if (sortBy === 'dueDate') return (a.task.settings?.dueDate || '9999').localeCompare(b.task.settings?.dueDate || '9999')
      if (sortBy === 'oldest') return new Date(a.task.createdAt || 0) - new Date(b.task.createdAt || 0)
      return new Date(b.task.createdAt || 0) - new Date(a.task.createdAt || 0) // newest
    })

    return copy
  }, [allTasks, search, sortBy])

  const taskGroups = useMemo(() => groupTasksByDate(filteredTasks), [filteredTasks])

  // Keep selected task in sync with store
  useEffect(() => {
    if (selectedTaskItem) {
      // Verify the task still exists
      const exists = allTasks.find(
        (item) => item.task.id === selectedTaskItem.task.id
      )
      if (!exists) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setSelectedTaskItem(null)
      } else if (exists !== selectedTaskItem) {
        setSelectedTaskItem(exists)
      }
    }
  }, [allTasks, selectedTaskItem])

  return (
    <div className="flex h-full min-w-0">
      {/* Main task list */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-14 px-6 flex items-center justify-between border-b border-border bg-bg-base/95 backdrop-blur sticky top-0 z-10">
          <h1 className="text-lg font-bold flex items-center gap-2">
            <Inbox className="h-5 w-5 text-text-muted" />
            All Tasks
          </h1>
          <div className="flex items-center gap-2">
            {/* Search */}
            <div className="relative group">
              <Search className="absolute left-2.5 top-2 text-text-muted group-focus-within:text-primary transition-colors h-4 w-4" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search tasks..."
                className="bg-surface-light border border-transparent border-border rounded-lg pl-9 pr-3 py-1.5 w-48 focus:w-64 transition-all duration-300 focus:ring-1 focus:ring-primary focus:border-primary text-sm placeholder-text-muted text-text-primary outline-none"
              />
            </div>
            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-surface-light border border-border rounded-lg px-3 py-1.5 text-sm text-text-secondary outline-none hover:border-border-light transition-colors"
            >
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="priority">Priority</option>
              <option value="dueDate">Due Date</option>
            </select>
            {/* Create task */}
            <button
              type="button"
              onClick={() => onCreateTask(null, null)}
              className="flex items-center gap-1.5 bg-primary hover:bg-primary-dark text-white px-3 py-1.5 rounded-lg text-sm font-medium shadow-lg shadow-primary/20 transition-all"
            >
              <Plus className="h-4 w-4" />
              New Task
            </button>
          </div>
        </header>

        {/* Task list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2 scroll-smooth custom-scrollbar">
          {filteredTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-text-muted">
              <Inbox className="h-12 w-12 mb-3 opacity-30" />
              <p className="text-sm">No tasks found</p>
              <button
                type="button"
                onClick={() => onCreateTask(null, null)}
                className="mt-3 flex items-center gap-1.5 text-primary text-sm font-medium hover:text-primary-light transition-colors"
              >
                <Plus className="h-4 w-4" />
                Create your first task
              </button>
            </div>
          ) : (
            taskGroups.map((group) => (
              <div key={group.label}>
                <div className="flex items-center justify-between px-2 pt-4 pb-1 text-xs font-medium text-text-muted">
                  <span className="uppercase tracking-wider">{group.label}</span>
                  <span className="font-mono text-[10px] bg-surface-light px-1.5 py-0.5 rounded text-text-muted">
                    {group.items.length} {group.items.length === 1 ? 'task' : 'tasks'}
                  </span>
                </div>
                <div className="space-y-2">
                  {group.items.map((item) => (
                    <TaskListItem
                      key={item.task.id}
                      item={item}
                      isSelected={selectedTaskItem?.task.id === item.task.id}
                      onSelect={() => setSelectedTaskItem(item)}
                    />
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </main>

      {/* Detail panel */}
      {selectedTaskItem && (
        <TaskDetailPanel
          taskItem={selectedTaskItem}
          onClose={() => setSelectedTaskItem(null)}
        />
      )}
    </div>
  )
}
