import { useMemo, useRef, useEffect, useState } from 'react'
import { useStore } from '../../../store/useStore'
import {
  getAllTasksWithContext,
  getTasksForGantt,
  getWeekRanges,
  formatDayShort,
  toDateKey,
} from '../utils/calendarTasks'

const ROW_HEIGHT = 80
const DAY_WIDTH = 56
const SIDEBAR_WIDTH = 260

const PRIORITY_BAR_COLORS = {
  high: 'bg-red-500/80 border-red-500/50',
  medium: 'bg-emerald-600/80 border-emerald-500/50',
  low: 'bg-primary border-primary/50',
}

export default function GanttTimelineView({ priorityFilter = null }) {
  const boards = useStore((state) => state.boards)
  const standaloneTasks = useStore((state) => state.standaloneTasks)
  const openTaskDetail = useStore((state) => state.openTaskDetail)

  const [rangeStart] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() - 7)
    return d
  })
  const [zoom] = useState('week') // 'day' | 'week' | 'month'
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

  const todayKey = toDateKey(new Date().toISOString())
  const allDays = useMemo(
    () => weekRanges.flatMap((r) => r.days),
    [weekRanges],
  )
  const totalWidth = allDays.length * DAY_WIDTH

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
      byBoard.set(board.id, { board, tasks: boardTasks })
    }
    const standalones = ganttTasks.filter(
      (item) => item.boardId === null && inRange(item),
    )
    byBoard.set('standalone', {
      board: { id: 'standalone', name: 'No Board', columns: [] },
      tasks: standalones,
    })
    return Array.from(byBoard.values())
  }, [boards, ganttTasks, weekRanges])

  const getDayLeft = (d) => {
    const key = toDateKey(d.toISOString())
    const idx = allDays.findIndex((day) => toDateKey(day.toISOString()) === key)
    return idx >= 0 ? idx * DAY_WIDTH : 0
  }

  return (
    <main className="flex flex-1 flex-col overflow-hidden">
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Timeline header */}
        <div className="flex w-full shrink-0 border-b border-border bg-bg-base">
          <div
            className="shrink-0 border-r border-border p-4 pb-2"
            style={{ width: SIDEBAR_WIDTH }}
          >
            <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">
              Boards
            </span>
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
                  className="shrink-0 border-r border-border"
                  style={{ width: range.days.length * DAY_WIDTH }}
                >
                  <div className="px-2 py-2 text-xs font-semibold text-text-muted">
                    {range.label}
                  </div>
                  <div className="flex border-t border-border">
                    {range.days.map((d) => {
                      const key = toDateKey(d.toISOString())
                      const isToday = key === todayKey
                      return (
                        <div
                          key={key}
                          className="flex h-8 shrink-0 items-center justify-center border-r border-border/50 text-[10px] text-text-muted"
                          style={{
                            width: DAY_WIDTH,
                            ...(isToday && {
                              backgroundColor: 'rgba(19, 55, 236, 0.1)',
                              color: 'var(--color-primary)',
                              fontWeight: 700,
                            }),
                          }}
                        >
                          {formatDayShort(d).replace(/^(\w{3}) (\d+)$/, '$1 $2')}
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Scrollable content */}
        <div
          ref={contentScrollRef}
          className="flex flex-1 overflow-auto custom-scrollbar"
        >
          <div
            className="shrink-0 border-r border-border bg-surface sticky left-0 z-10 shadow-[4px_0_24px_rgba(0,0,0,0.2)]"
            style={{ width: SIDEBAR_WIDTH }}
          >
            {boardsWithTasks.length === 0 ? (
              <div
                className="flex items-center justify-center border-b border-border text-sm italic text-text-muted"
                style={{ height: ROW_HEIGHT }}
              >
                No boards with tasks
              </div>
            ) : (
              boardsWithTasks.map(({ board, tasks }) => (
                <div
                  key={board.id}
                  className="flex flex-col justify-center border-b border-border p-4 transition-colors hover:bg-card-hover"
                  style={{ height: ROW_HEIGHT, minHeight: ROW_HEIGHT }}
                >
                  <h3 className="text-sm font-semibold text-white">
                    {board.name}
                  </h3>
                  <p className="text-[10px] text-text-muted">
                    {tasks.length} task{tasks.length !== 1 ? 's' : ''} in range
                  </p>
                </div>
              ))
            )}
          </div>

          <div
            className="relative flex-1 min-w-0 bg-bg-base"
            style={{ width: totalWidth }}
          >
            {/* Grid lines */}
            <div className="absolute inset-0 flex pointer-events-none">
              {weekRanges.flatMap((range) =>
                range.days.map((d) => {
                  const key = toDateKey(d.toISOString())
                  const isToday = key === todayKey
                  const left = getDayLeft(d)
                  return (
                    <div
                      key={key}
                      className="absolute top-0 bottom-0 w-px border-l border-border/30"
                      style={{
                        left,
                        ...(isToday && {
                          backgroundColor: 'rgba(19, 55, 236, 0.08)',
                        }),
                      }}
                    />
                  )
                }),
              )}
            </div>
            {/* Today vertical line */}
            {(() => {
              const left = getDayLeft(new Date())
              if (left <= 0 || left >= totalWidth) return null
              return (
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-primary z-20 shadow-[0_0_10px_rgba(19,55,236,0.5)]"
                  style={{ left }}
                >
                  <div className="absolute -top-1 -left-1.5 h-3 w-3 rounded-full bg-primary ring-2 ring-bg-base" />
                </div>
              )
            })()}

            {/* Task bars */}
            {boardsWithTasks.map(({ board, tasks }) => (
              <div
                key={board.id}
                className="relative border-b border-border"
                style={{ height: ROW_HEIGHT, minHeight: ROW_HEIGHT }}
              >
                {tasks.map((item, taskIndex) => {
                  const startLeft = getDayLeft(item.startDate)
                  const endLeft = getDayLeft(item.endDate) + DAY_WIDTH
                  const width = Math.max(DAY_WIDTH * 0.6, endLeft - startLeft)
                  const top = 12 + (taskIndex % 2) * 36
                  const priority = item.task.settings?.priority || 'medium'
                  return (
                    <div
                      key={item.task.id}
                      className={`group absolute z-10 flex cursor-pointer items-center rounded-md border px-2 shadow-sm transition-all hover:ring-2 hover:ring-primary/50 ${PRIORITY_BAR_COLORS[priority] || PRIORITY_BAR_COLORS.medium}`}
                      style={{
                        left: startLeft + 4,
                        top,
                        width: width - 8,
                        minWidth: 80,
                        height: 32,
                      }}
                      onClick={() =>
                        openTaskDetail(item.boardId, item.columnId, item.task.id)
                      }
                      title={item.task.heading}
                    >
                      <div
                        className={`mr-2 h-4 w-1.5 shrink-0 rounded-full ${
                          priority === 'high'
                            ? 'bg-red-500'
                            : priority === 'low'
                              ? 'bg-primary'
                              : 'bg-emerald-500'
                        }`}
                      />
                      <span className="truncate text-xs font-semibold text-white">
                        {item.task.heading}
                      </span>
                      {/* Tooltip on hover */}
                      <div className="absolute left-1/2 top-full z-50 mt-2 w-64 -translate-x-1/2 rounded-lg border border-border bg-surface p-3 shadow-xl opacity-0 pointer-events-none transition-opacity duration-200 group-hover:opacity-100">
                        <div className="mb-2 flex items-start justify-between">
                          <h4 className="text-sm font-bold leading-tight text-white">
                            {item.task.heading}
                          </h4>
                          <span
                            className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                              priority === 'high'
                                ? 'bg-red-500/20 text-red-400'
                                : priority === 'low'
                                  ? 'bg-primary/20 text-primary'
                                  : 'bg-emerald-500/20 text-emerald-400'
                            }`}
                          >
                            {(priority || 'medium').toUpperCase()}
                          </span>
                        </div>
                        {item.task.tldr && (
                          <p className="mb-2 text-xs leading-relaxed text-text-muted line-clamp-2">
                            {item.task.tldr}
                          </p>
                        )}
                        <div className="flex items-center justify-between border-t border-border pt-2 text-[10px] text-text-muted">
                          <span>{item.boardName}</span>
                          <span>
                            Due{' '}
                            {item.endDate.toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </span>
                        </div>
                        <div className="absolute -top-1.5 left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 border-l border-t border-border bg-surface" />
                      </div>
                    </div>
                  )
                })}
                {tasks.length === 0 && (
                  <div
                    className="flex items-center justify-center text-sm italic text-text-muted/50"
                    style={{ height: ROW_HEIGHT }}
                  >
                    No tasks in range
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

