import { useMemo, useRef, useEffect, useState } from 'react'
import { useStore } from '../../../store/useStore'
import {
  getAllTasksWithContext,
  getTasksForGantt,
  getWeekRanges,
  formatDayShort,
  toDateKey,
  calculateGanttLanes,
} from '../utils/calendarTasks'
import { Activity, Terminal, Zap, Clock, ChevronRight, Cpu, Layers, Share2, Info, Layout } from 'lucide-react'
import CyberBadge from '../../../components/ui/CyberBadge'

const MIN_ROW_HEIGHT = 120
const LANE_HEIGHT = 52
const ROW_PADDING = 32
const DAY_WIDTH = 72
const SIDEBAR_WIDTH = 320

const PRIORITY_BAR_COLORS = {
  high: 'bg-cyber-amber/10 border-cyber-amber/30 text-cyber-amber shadow-[0_0_15px_rgba(255,191,0,0.1)] hover:border-cyber-amber hover:bg-cyber-amber/20',
  medium: 'bg-cyber-blue/10 border-cyber-blue/30 text-cyber-blue shadow-[0_0_15px_rgba(0,240,255,0.1)] hover:border-cyber-blue hover:bg-cyber-blue/20',
  low: 'bg-cyber-lime/10 border-cyber-lime/30 text-cyber-lime shadow-[0_0_15px_rgba(57,255,20,0.1)] hover:border-cyber-lime hover:bg-cyber-lime/20',
}

export default function GanttTimelineView({ priorityFilter = null }) {
  const { boards, standaloneTasks, openTaskDetail } = useStore()

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

  const [rangeStart] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() - 7)
    return d
  })
  const [zoom] = useState('week')
  const headerScrollRef = useRef(null)
  const contentScrollRef = useRef(null)

  useEffect(() => {
    const content = contentScrollRef.current
    const header = headerScrollRef.current
    if (!content || !header) return
    const sync = () => {
      header.scrollLeft = content.scrollLeft
    }
    content.addEventListener('scroll', sync)
    return () => content.removeEventListener('scroll', sync)
  }, [])

  const items = useMemo(
    () => getAllTasksWithContext(boards, standaloneTasks),
    [boards, standaloneTasks],
  )
  const ganttTasks = useMemo(
    () => getTasksForGantt(items, priorityFilter),
    [items, priorityFilter],
  )

  const numWeeks = zoom === 'month' ? 6 : zoom === 'week' ? 4 : 2
  const weekRanges = useMemo(
    () => getWeekRanges(rangeStart, numWeeks),
    [rangeStart, numWeeks],
  )

  const todayKey = useMemo(() => toDateKey(new Date()), [])
  const allDays = useMemo(
    () => weekRanges.flatMap((r) => r.days),
    [weekRanges],
  )
  const totalWidth = allDays.length * DAY_WIDTH

  const dayOffsets = useMemo(() => {
    const map = new Map()
    allDays.forEach((d, idx) => {
      map.set(toDateKey(d), idx * DAY_WIDTH)
    })
    return map
  }, [allDays])

  const boardsWithTasks = useMemo(() => {
    if (!weekRanges.length) return []
    const rangeStartTime = weekRanges[0].weekStart.getTime()
    const rangeEndDate = new Date(weekRanges[weekRanges.length - 1].weekEnd)
    rangeEndDate.setHours(23, 59, 59, 999)
    const rangeEndTime = rangeEndDate.getTime()
    const inRange = (item) =>
      item.endDate.getTime() >= rangeStartTime && item.startDate.getTime() <= rangeEndTime

    const byBoard = new Map()
    for (const board of boards || []) {
      const boardTasks = ganttTasks.filter(
        (item) => item.boardId === board.id && inRange(item),
      )
      const { tasksWithLane, totalLanes } = calculateGanttLanes(boardTasks)
      byBoard.set(board.id, { board, tasks: tasksWithLane, totalLanes })
    }
    const standalones = ganttTasks.filter(
      (item) => item.boardId === null && inRange(item),
    )
    const { tasksWithLane: standaloneTasksWithLane, totalLanes: standaloneTotalLanes } =
      calculateGanttLanes(standalones)
    byBoard.set('standalone', {
      board: { id: 'standalone', name: 'Standalone_Buffer', columns: [] },
      tasks: standaloneTasksWithLane, totalLanes: standaloneTotalLanes 
    })
    return Array.from(byBoard.values())
  }, [boards, ganttTasks, weekRanges])

  const getRowHeight = (totalLanes) =>
    Math.max(MIN_ROW_HEIGHT, totalLanes * LANE_HEIGHT + ROW_PADDING)

  const getDayLeft = (d) => {
    const key = toDateKey(d)
    return dayOffsets.get(key) ?? 0
  }

  return (
    <main className="flex flex-1 flex-col overflow-hidden relative">
      <div className="flex flex-1 flex-col overflow-hidden relative z-10">
        {/* Timeline header */}
        <div className="flex w-full shrink-0 border-b border-cyber-blue/20 bg-surface-high z-30">
          <div
            className="shrink-0 border-r border-white/5 p-6 flex items-center justify-between"
            style={{ width: SIDEBAR_WIDTH }}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-cyber-blue/10 border border-cyber-blue/30 rounded-sm">
                <Layout className="h-4 w-4 text-cyber-blue" />
              </div>
              <div className="flex flex-col">
                <span className="font-orbitron text-[10px] font-black uppercase tracking-[0.2em] text-white">
                  Flow_Sequencer
                </span>
                <span className="font-mono text-[8px] text-cyber-blue/50 uppercase tracking-widest leading-tight">
                  Ver: 0x88.FF
                </span>
              </div>
            </div>
            <div className="h-full w-[1px] bg-white/5 mx-2" />
          </div>
          
          <div
            ref={headerScrollRef}
            className="flex-1 overflow-x-auto overflow-y-hidden scrollbar-hide"
            style={{ width: totalWidth, minWidth: 0 }}
          >
            <div className="flex" style={{ width: totalWidth }}>
              {weekRanges.map((range) => (
                <div
                  key={range.weekNum}
                  className="shrink-0 border-r border-white/10"
                  style={{ width: range.days.length * DAY_WIDTH }}
                >
                  <div className="px-4 py-2 font-orbitron text-[10px] font-black text-cyber-blue uppercase tracking-[0.3em] bg-cyber-blue/5 flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-cyber-blue shadow-neon-blue animate-pulse" />
                    {range.label.toUpperCase()}
                  </div>
                  <div className="flex border-t border-white/5 bg-black/20">
                    {range.days.map((d) => {
                      const key = toDateKey(d)
                      const isToday = key === todayKey
                      return (
                        <div
                          key={key}
                          className={`flex h-12 shrink-0 flex-col items-center justify-center border-r border-white/5 font-mono text-[9px] transition-colors gap-0.5 ${
                            isToday ? 'bg-cyber-blue/10 text-cyber-blue font-black' : 'text-surface-variant'
                          }`}
                          style={{ width: DAY_WIDTH }}
                        >
                          <span className="opacity-50 tracking-tighter">{formatDayShort(d).split(' ')[0].toUpperCase()}</span>
                          <span className="text-xs">{formatDayShort(d).split(' ')[1]}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Scrollable content area */}
        <div
          ref={contentScrollRef}
          className="flex flex-1 overflow-auto custom-scrollbar relative"
        >
          {/* Sidebar labels - sticky */}
          <div
            className="shrink-0 border-r border-white/10 bg-surface sticky left-0 z-30 shadow-2xl min-h-full"
            style={{ width: SIDEBAR_WIDTH }}
          >
            {boardsWithTasks.length === 0 ? (
              <div
                className="flex items-center justify-center border-b border-white/5 font-orbitron text-[10px] text-surface-highest uppercase tracking-widest"
                style={{ height: MIN_ROW_HEIGHT }}
              >
                - NO_SEQUENCER_DATA -
              </div>
            ) : (
              boardsWithTasks.map(({ board, tasks, totalLanes }) => (
                <div
                  key={board.id}
                  className="relative flex flex-col justify-center border-b border-white/5 px-8 transition-all hover:bg-white/[0.03] group overflow-hidden"
                  style={{
                    height: getRowHeight(totalLanes),
                    minHeight: getRowHeight(totalLanes),
                  }}
                >
                  {/* Decorative background accent */}
                  <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity -rotate-12 translate-x-4">
                    <Cpu className="h-20 w-20 text-white" />
                  </div>

                  <div className="relative z-10 space-y-2">
                    <div className="flex items-center gap-3">
                      <div className="w-1.5 h-6 bg-cyber-blue shadow-neon-blue animate-glow-pulse" />
                      <h3 className="font-orbitron text-sm font-black text-white group-hover:text-cyber-blue transition-colors uppercase tracking-tight">
                        {board.name}
                      </h3>
                    </div>
                    <div className="flex items-center gap-4 pl-[1.125rem]">
                      <div className="flex items-center gap-1.5 font-mono text-[9px] text-surface-variant uppercase tracking-widest">
                        <Activity className="h-3 w-3" />
                        {tasks.length} Nodes
                      </div>
                      <div className="w-[1px] h-3 bg-white/10" />
                      <div className="flex items-center gap-1.5 font-mono text-[9px] text-cyber-blue uppercase tracking-widest">
                        <Zap className="h-3 w-3" />
                        Active
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Main timeline grid */}
          <div
            className="relative flex-1 min-w-0 bg-transparent min-h-full"
            style={{ width: totalWidth }}
          >
            {/* Grid lines background */}
            <div className="absolute inset-0 pointer-events-none">
              {allDays.map((d) => {
                const key = toDateKey(d)
                const isToday = key === todayKey
                const left = getDayLeft(d)
                return (
                  <div
                    key={key}
                    className={`absolute top-0 bottom-0 w-px ${
                      isToday ? 'bg-cyber-blue/10 z-10' : 'bg-white/5'
                    }`}
                    style={{ left }}
                  >
                    {isToday && <div className="absolute inset-0 border-l border-cyber-blue/20" />}
                  </div>
                )
              })}
            </div>

            {/* Current Time Marker */}
            {(() => {
              const left = getDayLeft(new Date())
              if (left <= 0 || left >= totalWidth) return null
              return (
                <div
                  className="absolute top-0 bottom-0 w-[2px] bg-cyber-pink z-40 shadow-neon-pink flex flex-col items-center"
                  style={{ left }}
                >
                  <div className="absolute -top-1 w-3 h-3 bg-cyber-pink rounded-sm rotate-45 animate-pulse" />
                  <div className="absolute -top-6 bg-cyber-pink px-2 py-0.5 rounded-sm font-mono text-[8px] font-bold text-black uppercase tracking-widest whitespace-nowrap">
                    CURRENT_CYCLE
                  </div>
                </div>
              )
            })()}

            {/* Task render matrix */}
            {boardsWithTasks.map(({ board, tasks, totalLanes }) => (
              <div
                key={board.id}
                className="relative border-b border-white/5 hover:bg-white/[0.01] transition-colors"
                style={{
                  height: getRowHeight(totalLanes),
                  minHeight: getRowHeight(totalLanes),
                }}
              >
                {tasks.map((item) => {
                  const startLeft = getDayLeft(item.startDate)
                  const endLeft = getDayLeft(item.endDate) + DAY_WIDTH
                  const width = Math.max(DAY_WIDTH * 0.8, endLeft - startLeft)
                  const top = ROW_PADDING / 2 + item.laneIndex * LANE_HEIGHT
                  const priority = item.task.settings?.priority || 'medium'
                  
                  return (
                    <div
                      key={item.task.id}
                      className={`group absolute z-20 hover:z-50 flex cursor-pointer items-center rounded-sm border px-4 transition-all duration-150 focus:outline-none focus:ring-1 focus:ring-cyber-blue/50 ${PRIORITY_BAR_COLORS[priority]}`}
                      style={{
                        left: startLeft + 8,
                        top,
                        width: width - 16,
                        minWidth: 140,
                        height: 36,
                      }}
                      tabIndex={0}
                      onClick={() => handleTaskClick(item.task.id)}
                    >
                      {/* Internal bar detail */}
                      <div className="absolute inset-0 bg-gradient-to-r from-white/[0.05] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      
                      <div className="relative flex items-center w-full gap-2 overflow-hidden">
                        <Activity className={`h-3 w-3 shrink-0 ${
                          priority === 'high' ? 'text-cyber-amber animate-pulse' : 
                          priority === 'low' ? 'text-cyber-lime' : 'text-cyber-blue'
                        }`} />
                        <span className="truncate font-orbitron text-[10px] font-black text-white uppercase tracking-widest [text-shadow:_0_0_8px_rgba(0,0,0,0.8)]">
                          {item.task.heading}
                        </span>
                      </div>

                      {/* Holographic Sequencer Tooltip */}
                      <div className="absolute left-1/2 bottom-full z-[100] mb-4 w-[320px] -translate-x-1/2 opacity-0 pointer-events-none transition-all duration-200 group-hover:opacity-100 group-hover:-translate-y-2">
                        <div className="cyber-glass-bright border-cyber-blue/40 p-5 shadow-[0_0_50px_rgba(0,240,255,0.2)] relative before:absolute before:inset-0 before:bg-cyber-blue/[0.02] before:pointer-events-none">
                          <div className="mb-4 flex items-start justify-between relative z-10">
                            <div className="flex flex-col gap-1">
                              <h4 className="font-orbitron text-sm font-black text-white uppercase tracking-tight">
                                {item.task.heading}
                              </h4>
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-[8px] text-surface-variant uppercase tracking-widest">Sector: {item.boardName}</span>
                              </div>
                            </div>
                            <CyberBadge variant={priority === 'high' ? 'amber' : priority === 'low' ? 'lime' : 'blue'} size="xs">
                              {priority.toUpperCase()}
                            </CyberBadge>
                          </div>
                          
                          {item.task.tldr && (
                            <div className="mb-4 relative z-10 border-l-2 border-white/10 bg-white/[0.03] p-3">
                              <p className="font-mono text-[10px] leading-relaxed text-surface-variant uppercase tracking-tighter line-clamp-3">
                                {item.task.tldr}
                              </p>
                            </div>
                          )}

                          <div className="grid grid-cols-2 gap-4 relative z-10 pt-4 border-t border-white/10">
                            <div className="flex flex-col gap-1">
                              <span className="font-mono text-[8px] text-surface-highest uppercase tracking-widest">Initiated</span>
                              <span className="font-mono text-[9px] text-white">
                                {item.startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase()}
                              </span>
                            </div>
                            <div className="flex flex-col gap-1 items-end">
                              <span className="font-mono text-[8px] text-surface-highest uppercase tracking-widest">Deadline</span>
                              <span className="font-mono text-[9px] text-cyber-pink font-bold">
                                {item.endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase()}
                              </span>
                            </div>
                          </div>

                          {/* Decorative technical line */}
                          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-cyber-blue/50 to-transparent" />
                          
                          {/* Triangle arrow */}
                          <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[8px] border-t-cyber-blue/40 shadow-neon-blue" />
                        </div>
                      </div>
                    </div>
                  )
                })}

                {/* Empty lane indicator */}
                {tasks.length === 0 && (
                  <div
                    className="flex items-center justify-center font-mono text-[10px] text-surface-highest opacity-10 uppercase tracking-[0.5em]"
                    style={{ height: getRowHeight(totalLanes) }}
                  >
                    - NO_NODES_IN_SECTOR -
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  )
}
