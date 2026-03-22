import { Inbox, Plus, Search, Terminal, Activity, Zap, Filter, Cpu, Layers } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useStore } from '../../../store/useStore'
import TaskDetailPanel from '../components/TaskDetailPanel'
import TaskListItem from '../components/TaskListItem'
import CyberButton from '../../../components/ui/CyberButton'
import CyberInput from '../../../components/ui/CyberInput'
import CyberBadge from '../../../components/ui/CyberBadge'

function groupTasksByDate(tasks) {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const tomorrow = new Date(today.getTime() + 86400000)
  const nextWeek = new Date(today.getTime() + 7 * 86400000)

  const groups = {
    overdue: { label: 'CRITICAL_DELAY', items: [], variant: 'pink' },
    today: { label: 'CYCLE_CURRENT', items: [], variant: 'blue' },
    tomorrow: { label: 'CYCLE_NEXT', items: [], variant: 'cyan' },
    thisWeek: { label: 'WINDOW_SHORT', items: [], variant: 'violet' },
    nextWeek: { label: 'WINDOW_MEDIUM', items: [], variant: 'violet' },
    later: { label: 'WINDOW_LONG', items: [], variant: 'violet' },
    noDueDate: { label: 'UNSCHEDULED_DATA', items: [], variant: 'lime' },
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
  const [selectedTaskId, setSelectedTaskId] = useState(null)
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

    const priorityRank = { high: 3, medium: 2, low: 1 }
    const copy = [...result]
    copy.sort((a, b) => {
      if (sortBy === 'priority') return (priorityRank[b.task.settings?.priority || 'medium'] || 0) - (priorityRank[a.task.settings?.priority || 'medium'] || 0)
      if (sortBy === 'dueDate') return (a.task.settings?.dueDate || '9999').localeCompare(b.task.settings?.dueDate || '9999')
      if (sortBy === 'oldest') return new Date(a.task.createdAt || 0) - new Date(b.task.createdAt || 0)
      return new Date(b.task.createdAt || 0) - new Date(a.task.createdAt || 0)
    })

    return copy
  }, [allTasks, search, sortBy])

  const taskGroups = useMemo(() => groupTasksByDate(filteredTasks), [filteredTasks])

  const selectedTaskItem = useMemo(() => {
    if (!selectedTaskId) return null
    return allTasks.find((item) => item.task.id === selectedTaskId) || null
  }, [allTasks, selectedTaskId])

  return (
    <div className="flex h-full min-w-0 relative overflow-hidden">
      {/* Main task list */}
      <main className="flex-1 flex flex-col min-w-0 z-10 relative">
        {/* Header */}
        <header className="h-[88px] px-8 flex items-center justify-between border-b border-cyber-blue/20 bg-surface-high/40 backdrop-blur-2xl sticky top-0 z-20">
          <div className="flex items-center gap-6">
            <div className="relative group">
              <div className="absolute -inset-1 bg-cyber-blue/20 blur opacity-0 group-hover:opacity-100 transition duration-1000"></div>
              <div className="flex items-center gap-4 relative">
                <div className="p-2 bg-cyber-blue/10 border border-cyber-blue/30 rounded-sm">
                  <Terminal className="h-6 w-6 text-cyber-blue animate-pulse" />
                </div>
                <div className="flex flex-col">
                  <h1 className="font-orbitron text-lg font-black uppercase tracking-[0.3em] text-white">
                    Task_Subsystem
                  </h1>
                  <span className="font-mono text-[9px] text-cyber-blue/60 uppercase tracking-widest leading-none">
                    Stream_Active // {allTasks.length} Nodes
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-5">
            {/* Search */}
            <CyberInput
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="SCAN_DATA_STREAM..."
              variant="blue"
              icon={Search}
              className="!w-64"
            />

            {/* Sort */}
            <div className="flex items-center gap-2 bg-surface-low/50 border border-white/10 p-1 rounded-sm">
              <Filter className="h-3.5 w-3.5 text-surface-variant ml-2" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-transparent text-white font-mono text-[10px] uppercase tracking-widest outline-none cursor-pointer p-1"
              >
                <option value="newest">TS_NEW</option>
                <option value="oldest">TS_OLD</option>
                <option value="priority">PRIORITY</option>
                <option value="dueDate">CHRONO</option>
              </select>
            </div>

            <div className="w-[1px] h-8 bg-white/10 mx-2" />

            <CyberButton
              variant="blue"
              size="md"
              icon={Plus}
              onClick={() => onCreateTask(null, null)}
              className="px-6"
            >
              INIT_NODE
            </CyberButton>
          </div>
        </header>

        {/* Task list content */}
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          {filteredTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full max-w-md mx-auto text-center space-y-6">
              <div className="relative inline-block">
                <div className="absolute inset-0 bg-cyber-blue blur-xl opacity-20 animate-pulse" />
                <Inbox className="relative h-20 w-20 text-surface-highest mx-auto opacity-30" />
              </div>
              <div className="space-y-2">
                <p className="font-orbitron text-xs font-bold text-white uppercase tracking-[0.3em]">
                  Data Stream Empty
                </p>
                <p className="font-mono text-[10px] text-surface-variant uppercase tracking-widest">
                  No active nodes detected in the current filter context. Waiting for operator input.
                </p>
              </div>
              <CyberButton
                variant="blue"
                className="mt-4"
                onClick={() => onCreateTask(null, null)}
                icon={Zap}
              >
                Deploy First Node
              </CyberButton>
            </div>
          ) : (
            <div className="max-w-7xl mx-auto space-y-12 pb-12">
              {taskGroups.map((group) => (
                <div key={group.label} className="space-y-6 relative">
                  {/* Group Header */}
                  <div className="flex items-center gap-4 sticky top-0 bg-[#0a0a0f]/90 backdrop-blur-md py-3 z-10 border-y border-white/5 shadow-2xl -mx-4 px-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full bg-cyber-${group.variant} shadow-neon-${group.variant} animate-pulse`} />
                      <span className={`font-orbitron text-xs font-black text-white uppercase tracking-[0.3em]`}>
                        {group.label}
                      </span>
                      <CyberBadge variant={group.variant} size="xs" className="ml-2">
                        {group.items.length} ACTIVE
                      </CyberBadge>
                    </div>
                    <div className={`h-[1px] flex-1 bg-gradient-to-r from-cyber-${group.variant}/30 to-transparent`} />
                  </div>
                  
                  {/* Grid of tasks */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                    {group.items.map((item) => (
                      <div 
                        key={item.task.id}
                        className={`transition-all duration-300 ${selectedTaskId === item.task.id ? 'scale-[1.02] z-20 relative' : 'hover:scale-[1.01] hover:z-10'}`}
                      >
                        <TaskListItem
                          item={item}
                          isSelected={selectedTaskId === item.task.id}
                          onSelect={() => setSelectedTaskId(item.task.id)}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Detail panel overlay */}
      {selectedTaskItem && (
        <TaskDetailPanel
          key={selectedTaskItem.task.id}
          taskItem={selectedTaskItem}
          onClose={() => setSelectedTaskId(null)}
        />
      )}
    </div>
  )
}
