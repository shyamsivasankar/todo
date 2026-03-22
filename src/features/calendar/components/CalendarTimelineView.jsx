import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Folder,
  Calendar as CalendarIcon,
  Activity,
  Zap,
  Terminal,
  Cpu,
  Layers,
  Filter,
  Plus
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { useStore } from '../../../store/useStore'
import {
  getAllTasksWithContext,
  getTasksWithDueDate,
  groupByDueDate,
  getMonthGrid,
  toDateKey,
  parseDateKey,
  isTodayKey,
  getDaysRemaining,
} from '../utils/calendarTasks'
import CyberButton from '../../../components/ui/CyberButton'
import CyberBadge from '../../../components/ui/CyberBadge'
import CyberCard from '../../../components/ui/CyberCard'
import CyberTooltip from '../../../components/ui/CyberTooltip'

const PRIORITY_COLORS = {
  high: 'bg-cyber-amber shadow-neon-blue/20',
  medium: 'bg-cyber-blue shadow-neon-blue/20',
  low: 'bg-cyber-lime shadow-neon-lime/20',
}

const PRIORITY_VARIANTS = { high: 'amber', medium: 'blue', low: 'lime' }

export default function CalendarTimelineView({ onCreateTask, priorityFilter = null }) {
  const { boards, standaloneTasks, openTaskDetail, activeBoardId } = useStore()

  const handleTaskClick = (taskId) => {
    let foundBoardId = null
    let foundColumnId = null

    const isStandalone = (standaloneTasks || []).some((t) => t.id === taskId)

    if (!isStandalone) {
      for (const board of boards || []) {
        for (const column of board.columns || []) {
          if ((column.tasks || []).some((t) => t.id === taskId)) {
            foundBoardId = board.id
            foundColumnId = column.id
            break
          }
        }
        if (foundBoardId) break
      }
    }

    openTaskDetail(foundBoardId, foundColumnId, taskId)
  }

  const [calendarDate, setCalendarDate] = useState(() => new Date())
  const [selectedDateKey, setSelectedDateKey] = useState(() =>
    toDateKey(new Date()),
  )

  const items = useMemo(
    () => getAllTasksWithContext(boards, standaloneTasks),
    [boards, standaloneTasks],
  )
  const withDue = useMemo(
    () => getTasksWithDueDate(items, priorityFilter),
    [items, priorityFilter],
  )
  const byDate = useMemo(() => groupByDueDate(withDue), [withDue])

  const grid = useMemo(
    () =>
      getMonthGrid(calendarDate.getFullYear(), calendarDate.getMonth()),
    [calendarDate],
  )

  const upcomingList = useMemo(() => {
    const todayKey = toDateKey(new Date())
    return withDue.filter((item) => item.task.settings?.dueDate >= todayKey).slice(0, 20)
  }, [withDue])

  const monthLabel = `${grid.monthLabel} ${grid.year}`

  const monthDueCount = useMemo(() => {
    const firstDay = `${grid.year}-${String(grid.month + 1).padStart(2, '0')}-01`
    const lastDay = `${grid.year}-${String(grid.month + 1).padStart(2, '0')}-${String(grid.daysInMonth).padStart(2, '0')}`
    return withDue.filter(
      (x) => {
        const d = toDateKey(x.task.settings?.dueDate)
        return d >= firstDay && d <= lastDay
      },
    ).length
  }, [withDue, grid.year, grid.month, grid.daysInMonth])

  const completionWidth = Math.min(
    100,
    (monthDueCount / Math.max(1, grid.daysInMonth)) * 100,
  )

  const goPrevMonth = () => {
    setCalendarDate((d) => new Date(d.getFullYear(), d.getMonth() - 1))
  }
  const goNextMonth = () => {
    setCalendarDate((d) => new Date(d.getFullYear(), d.getMonth() + 1))
  }
  const jumpToToday = () => {
    const now = new Date()
    setCalendarDate(now)
    setSelectedDateKey(toDateKey(now))
  }

  return (
    <main className="flex h-full flex-1 flex-col overflow-hidden relative">
      <section className="flex h-full flex-1 min-w-0 overflow-hidden relative">
        {/* Left: Calendar Matrix */}
        <div className="flex flex-1 flex-col min-h-0 min-w-0 border-r border-cyber-blue/10 relative z-10">
          
          {/* Calendar Header Control Bar */}
          <div className="flex items-center justify-between p-6 bg-surface-high/20 backdrop-blur-md border-b border-white/5">
            <div className="flex items-center gap-6">
              <div className="relative group">
                <div className="absolute -inset-1 bg-cyber-blue/20 blur opacity-0 group-hover:opacity-100 transition duration-1000"></div>
                <h2 className="relative font-orbitron text-2xl font-black text-white uppercase tracking-tighter flex items-center gap-3">
                  <div className="w-2 h-8 bg-cyber-blue animate-glow-pulse" />
                  {monthLabel}
                  <span className="text-cyber-blue/30 text-xs font-mono ml-2 mt-2">[ VERSION_4.2.0 ]</span>
                </h2>
              </div>

              <div className="flex items-center gap-2 bg-black/40 p-1 border border-white/10 rounded-sm">
                <CyberTooltip content="Previous Cycle">
                  <button
                    type="button"
                    onClick={goPrevMonth}
                    className="p-1.5 text-surface-variant hover:text-cyber-blue hover:bg-white/5 rounded-sm transition-all"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                </CyberTooltip>
                <div className="h-4 w-[1px] bg-white/10" />
                <CyberTooltip content="Next Cycle">
                  <button
                    type="button"
                    onClick={goNextMonth}
                    className="p-1.5 text-surface-variant hover:text-cyber-blue hover:bg-white/5 rounded-sm transition-all"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </CyberTooltip>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="hidden md:flex flex-col items-end mr-4">
                <span className="text-[8px] font-mono text-surface-variant uppercase tracking-widest leading-none">Global_Time</span>
                <span className="text-[10px] font-mono text-cyber-blue font-bold uppercase tracking-tighter">
                  {new Date().toLocaleTimeString()}
                </span>
              </div>
              <CyberButton
                variant="blue"
                size="sm"
                onClick={jumpToToday}
                icon={Zap}
                outline
              >
                Reset_Sync
              </CyberButton>
            </div>
          </div>

          {/* Days of Week Row */}
          <div className="grid grid-cols-7 px-8 py-3 bg-black/40 border-b border-white/5">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
              <div key={d} className="flex items-center justify-center gap-2 font-orbitron text-[10px] font-black uppercase tracking-[0.3em] text-surface-variant">
                <div className="w-1 h-1 bg-surface-variant rounded-full opacity-50" />
                {d}
              </div>
            ))}
          </div>

          {/* Calendar Grid Body */}
          <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
            <div
              className="grid h-full min-h-[600px] gap-px bg-white/5 border border-white/5 shadow-2xl overflow-hidden rounded-sm"
              style={{
                gridTemplateColumns: 'repeat(7, 1fr)',
                gridAutoRows: 'minmax(120px, 1fr)',
              }}
            >
              {grid.cells.map((cell, i) => {
                const { dateKey, day, isCurrentMonth } = cell
                const isSelected = dateKey === selectedDateKey
                const isToday = dateKey && isTodayKey(dateKey)
                const dayTasks = dateKey ? byDate.get(dateKey) || [] : []

                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setSelectedDateKey(dateKey)}
                    className={`relative group flex flex-col p-3 transition-all duration-200 text-left outline-none ${
                      !isCurrentMonth
                        ? 'bg-transparent opacity-10'
                        : isSelected
                          ? 'bg-cyber-blue/[0.08] ring-1 ring-inset ring-cyber-blue/30'
                          : 'bg-surface-low/30 hover:bg-surface-high/50'
                    }`}
                  >
                    {/* Active day indicator */}
                    {isToday && (
                      <div className="absolute top-0 left-0 right-0 h-0.5 bg-cyber-pink shadow-neon-pink z-20" />
                    )}
                    
                    {/* Cell Decorative Accents */}
                    <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-10 transition-opacity">
                      <Cpu className="h-8 w-8 text-white" />
                    </div>

                    <div className="flex items-center justify-between mb-3 relative z-10">
                      <span
                        className={`font-mono text-xs font-bold ${
                          !isCurrentMonth
                            ? 'text-surface-highest'
                            : isToday
                              ? 'text-cyber-pink'
                              : isSelected ? 'text-cyber-blue' : 'text-surface-variant'
                        }`}
                      >
                        {day < 10 ? `0${day}` : day}
                      </span>
                      {dayTasks.length > 0 && isCurrentMonth && (
                        <div className="flex gap-1">
                          <div className={`w-1 h-1 rounded-full animate-flicker bg-cyber-blue`} />
                          {dayTasks.length > 3 && <div className="w-1 h-1 rounded-full animate-flicker bg-cyber-pink" />}
                        </div>
                      )}
                    </div>

                    {isCurrentMonth && (
                      <div className="flex-1 space-y-1.5 overflow-hidden relative z-10">
                        {dayTasks.slice(0, 3).map(({ task }) => (
                          <div
                            key={task.id}
                            onClick={(e) => {
                              e.stopPropagation()
                              handleTaskClick(task.id)
                            }}
                            className={`w-full group/task relative truncate rounded-sm px-2 py-1 font-mono text-[9px] uppercase tracking-tighter cursor-pointer hover:translate-x-1 transition-all border border-transparent hover:border-white/20 ${
                              task.settings?.priority === 'high'
                                ? 'bg-cyber-amber/5 text-cyber-amber border-l-2 border-l-cyber-amber'
                                : task.settings?.priority === 'low'
                                  ? 'bg-cyber-lime/5 text-cyber-lime border-l-2 border-l-cyber-lime'
                                  : 'bg-cyber-blue/5 text-cyber-blue border-l-2 border-l-cyber-blue'
                            }`}
                          >
                            <div className="flex items-center gap-1.5">
                              <div className={`w-1 h-1 rounded-full ${
                                task.settings?.priority === 'high' ? 'bg-cyber-amber' : 
                                task.settings?.priority === 'low' ? 'bg-cyber-lime' : 'bg-cyber-blue'
                              }`} />
                              {task.heading}
                            </div>
                          </div>
                        ))}
                        {dayTasks.length > 3 && (
                          <div className="px-2 font-mono text-[8px] text-surface-variant uppercase tracking-widest pt-1 border-t border-white/5">
                            + {dayTasks.length - 3} MORE_NODES
                          </div>
                        )}
                      </div>
                    )}

                    {/* Corner accent (only visible on hover or select) */}
                    <div className={`absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 transition-all duration-300 ${
                      isSelected ? 'border-cyber-blue opacity-100' : 'border-white/10 opacity-0 group-hover:opacity-40'
                    }`} />
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Right: Temporal Load & Deadlines Sidebar */}
        <aside className="flex h-full w-[420px] shrink-0 flex-col bg-surface-high border-l border-white/5 relative z-20">
          
          {/* Sidebar Header */}
          <div className="p-8 border-b border-white/5 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity rotate-12">
              <Layers className="h-16 w-16 text-cyber-blue" />
            </div>
            
            <div className="relative z-10 flex items-center justify-between mb-6">
              <h3 className="flex items-center gap-3 font-orbitron text-sm font-black text-white uppercase tracking-[0.4em]">
                <Clock className="h-4 w-4 text-cyber-blue animate-pulse" />
                Temporal_Grid
              </h3>
              <CyberBadge variant="blue" size="xs">SEC_42</CyberBadge>
            </div>

            <div className="relative z-10 space-y-4">
              <div className="flex items-center justify-between font-mono text-[9px] uppercase tracking-widest">
                <span className="text-surface-variant">System_Cycle: {grid.monthLabel}</span>
                <span className="text-cyber-blue font-black">{monthDueCount} ACTIVE_NODES</span>
              </div>
              <div className="h-2 w-full bg-black/40 relative overflow-hidden rounded-full border border-white/5">
                <div
                  className="h-full bg-cyber-blue shadow-neon-blue transition-all duration-1000 ease-out relative"
                  style={{ width: `${completionWidth}%` }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-scanline" />
                </div>
              </div>
              <p className="font-mono text-[8px] text-surface-highest uppercase tracking-[0.2em] text-center">
                Sync_Verification: {completionWidth.toFixed(1)}% Complete
              </p>
            </div>
          </div>

          {/* Deadline List Container */}
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <div className="p-8 space-y-8">
              {(() => {
                const grouped = new Map()
                for (const item of upcomingList) {
                  const key = toDateKey(item.task.settings?.dueDate)
                  if (!grouped.has(key)) grouped.set(key, [])
                  grouped.get(key).push(item)
                }
                const todayKey = toDateKey(new Date())
                const entries = Array.from(grouped.entries()).sort((a, b) =>
                  a[0].localeCompare(b[0]),
                )
                
                return entries.map(([dateKey, list]) => {
                  const isToday = dateKey === todayKey
                  const label = isToday
                    ? 'CRITICAL_NOW'
                    : parseDateKey(dateKey).toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                      }).toUpperCase()
                  
                  return (
                    <div key={dateKey} className="relative">
                      <div className="flex items-center gap-4 mb-5">
                        <div className={`w-1.5 h-1.5 rounded-full ${isToday ? 'bg-cyber-pink shadow-neon-pink animate-flicker' : 'bg-white/20'}`} />
                        <span
                          className={`font-orbitron text-[10px] font-black uppercase tracking-[0.2em] ${
                            isToday ? 'text-cyber-pink' : 'text-white'
                          }`}
                        >
                          {label}
                        </span>
                        <div className="flex-1 h-px bg-gradient-to-r from-white/10 to-transparent" />
                      </div>

                      <div className="space-y-4">
                        {list.map(({ task, boardName }) => (
                          <CyberCard
                            key={task.id}
                            variant={PRIORITY_VARIANTS[task.settings?.priority] || 'blue'}
                            interactive
                            padding="p-4"
                            onClick={() => handleTaskClick(task.id)}
                            className="group/item relative overflow-hidden"
                          >
                            <div className="absolute top-0 right-0 p-2 opacity-5 group-hover/item:opacity-20 transition-all scale-75">
                              <Cpu className="h-10 w-10" />
                            </div>

                            <div className="mb-2 flex items-start justify-between">
                              <h4 className="font-orbitron text-xs font-black text-white group-hover/item:text-cyber-blue transition-colors uppercase tracking-tight">
                                {task.heading}
                              </h4>
                              <CyberBadge variant={PRIORITY_VARIANTS[task.settings?.priority] || 'blue'} size="xs">
                                P_{task.settings?.priority?.toUpperCase().charAt(0) || 'M'}
                              </CyberBadge>
                            </div>

                            {task.tldr && (
                              <p className="mb-4 font-mono text-[9px] text-surface-variant uppercase tracking-tighter line-clamp-2 leading-relaxed opacity-80 border-l border-white/10 pl-3 py-1">
                                {task.tldr}
                              </p>
                            )}

                            <div className="flex items-center justify-between font-mono text-[9px] uppercase tracking-widest pt-3 border-t border-white/5">
                              <div className="flex items-center gap-2 text-surface-highest">
                                <Terminal className="h-3 w-3 text-cyber-blue" />
                                <span>{boardName}</span>
                              </div>
                              {(() => {
                                const days = getDaysRemaining(dateKey)
                                if (days === null) return null
                                const urgent = days <= 1
                                return (
                                  <span
                                    className={`flex items-center gap-2 ${
                                      urgent ? 'text-cyber-pink animate-pulse' : 'text-surface-variant'
                                    }`}
                                  >
                                    <Activity className="h-2.5 w-2.5" />
                                    {days < 0
                                      ? `[ ${Math.abs(days)}D_DELAY ]`
                                      : days === 0
                                        ? '[ CYCLE_0 ]'
                                        : `[ T-${days}D ]`}
                                  </span>
                                )
                              })()}
                            </div>
                          </CyberCard>
                        ))}
                      </div>
                    </div>
                  )
                })
              })()}

              {upcomingList.length === 0 && (
                <div className="py-20 text-center space-y-6">
                  <div className="relative inline-block">
                    <div className="absolute inset-0 bg-cyber-blue blur-xl opacity-20 animate-pulse" />
                    <Cpu className="relative h-16 w-16 text-surface-highest mx-auto opacity-30" />
                  </div>
                  <div className="space-y-2">
                    <p className="font-orbitron text-[10px] text-white uppercase tracking-[0.3em]">
                      No Temporal Signals Detected
                    </p>
                    <p className="font-mono text-[8px] text-surface-variant uppercase tracking-widest">
                      Standing by for operator initialization...
                    </p>
                  </div>
                  <CyberButton
                    variant="blue"
                    size="sm"
                    icon={Plus}
                    onClick={() => onCreateTask(activeBoardId, null)}
                  >
                    Deploy_Task
                  </CyberButton>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar Footer Info */}
          <div className="p-6 bg-black/40 border-t border-white/10 flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-[8px] font-mono text-surface-variant uppercase tracking-[0.3em]">Neural_Status</span>
              <span className="text-[10px] font-orbitron text-cyber-lime font-bold uppercase tracking-widest animate-pulse">Synchronized</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-1.5 h-1.5 bg-cyber-blue rounded-full shadow-neon-blue" />
              <div className="w-1.5 h-1.5 bg-cyber-pink rounded-full shadow-neon-pink" />
              <div className="w-1.5 h-1.5 bg-cyber-lime rounded-full shadow-neon-lime" />
            </div>
          </div>
        </aside>
      </section>
    </main>
  )
}
