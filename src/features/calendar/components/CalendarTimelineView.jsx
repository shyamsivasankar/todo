import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Folder,
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

const PRIORITY_COLORS = {
  high: 'bg-red-500',
  medium: 'bg-yellow-500',
  low: 'bg-blue-500',
}

const PRIORITY_LABELS = { high: 'HIGH', medium: 'MED', low: 'LOW' }

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
    return withDue.filter(
      (x) =>
        toDateKey(x.task.settings?.dueDate) >=
          `${grid.year}-${String(grid.month + 1).padStart(2, '0')}-01` &&
        toDateKey(x.task.settings?.dueDate) <=
          `${grid.year}-${String(grid.month + 1).padStart(2, '0')}-${String(grid.daysInMonth).padStart(2, '0')}`,
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
    <main className="flex h-full flex-1 flex-col overflow-hidden">
      <section className="flex h-full flex-1 min-w-0 overflow-hidden">
        {/* Left: Calendar */}
        <div className="flex flex-1 flex-col min-h-0 min-w-0 border-r border-border bg-surface/50">
          <div className="flex items-center justify-between p-6 pb-4">
            <div className="flex items-center gap-4">
              <h2 className="text-2xl font-bold text-white">{monthLabel}</h2>
              <div className="flex items-center rounded-lg border border-border bg-bg-base p-1">
                <button
                  type="button"
                  onClick={goPrevMonth}
                  className="rounded p-1 text-text-muted transition-colors hover:text-primary"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={goNextMonth}
                  className="rounded p-1 text-text-muted transition-colors hover:text-primary"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            </div>
            <button
              type="button"
              onClick={jumpToToday}
              className="text-sm font-medium text-primary hover:underline"
            >
              Jump to Today
            </button>
          </div>
          <div className="grid grid-cols-7 px-6 pb-2 text-center text-sm font-medium uppercase tracking-wider text-text-muted">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
              <div key={d}>{d}</div>
            ))}
          </div>
          <div className="flex flex-1 flex-col min-h-0 px-6 pb-6">
            <div
              className="calendar-grid h-full min-h-0 rounded-xl border border-border overflow-hidden"
              style={{
                gridTemplateColumns: 'repeat(7, 1fr)',
                gridAutoRows: 'minmax(0, 1fr)',
                backgroundColor: 'var(--color-border)',
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
                    className={`calendar-cell border border-transparent p-2 text-left transition-colors ${
                      !isCurrentMonth
                        ? 'bg-bg-base/30 opacity-50'
                        : isSelected
                          ? 'bg-primary/10 ring-2 ring-inset ring-primary'
                          : 'bg-surface hover:bg-card-hover'
                    }`}
                  >
                    <span
                      className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-sm font-medium ${
                        !isCurrentMonth
                          ? 'text-text-muted'
                          : isToday
                            ? 'bg-primary text-white shadow-md'
                            : 'text-text-secondary'
                      }`}
                    >
                      {day}
                    </span>
                    {isCurrentMonth && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {dayTasks.slice(0, 2).map(({ task }) => (
                          <div
                            key={task.id}
                            onClick={(e) => {
                              e.stopPropagation()
                              handleTaskClick(task.id)
                            }}
                            className={`w-full truncate rounded-r border-l-2 pl-2 py-0.5 text-[10px] cursor-pointer hover:brightness-125 transition-all ${
                              task.settings?.priority === 'high'
                                ? 'border-red-500 bg-red-500/10 text-red-400'
                                : task.settings?.priority === 'low'
                                  ? 'border-blue-500 bg-primary/10 text-primary'
                                  : 'border-yellow-500 bg-yellow-500/10 text-yellow-400'
                            }`}
                          >
                            {task.heading}
                          </div>
                        ))}
                        {dayTasks.length > 2 && (
                          <div className="flex gap-0.5">
                            {[...Array(Math.min(3, dayTasks.length - 2))].map(
                              (_, j) => (
                                <span
                                  key={j}
                                  className={`h-2 w-2 rounded-full ${
                                    PRIORITY_COLORS[
                                      dayTasks[j + 2]?.task.settings?.priority || 'medium'
                                    ]
                                  }`}
                                />
                              ),
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Right: Deadlines sidebar - full height */}
        <aside className="flex h-full w-[380px] shrink-0 flex-col border-l border-border bg-bg-base shadow-xl">
          <div className="flex items-center justify-between border-b border-border p-6">
            <h3 className="flex items-center gap-2 text-lg font-bold text-white">
              <Clock className="h-5 w-5 text-primary" />
              Deadlines
            </h3>
            <span className="rounded bg-surface px-2 py-1 text-xs font-medium text-text-muted">
              {upcomingList.length} Upcoming
            </span>
          </div>
          <div className="flex-1 space-y-6 overflow-y-auto p-4 min-h-0">
            {(() => {
              const grouped = new Map()
              for (const item of upcomingList) {
                const key = toDateKey(item.task.settings?.dueDate)
                if (!grouped.has(key))
                  grouped.set(key, [])
                grouped.get(key).push(item)
              }
              const todayKey = toDateKey(new Date())
              const entries = Array.from(grouped.entries()).sort((a, b) =>
                a[0].localeCompare(b[0]),
              )
              return entries.map(([dateKey, list]) => {
                const isToday = dateKey === todayKey
                const label = isToday
                  ? 'Today'
                  : parseDateKey(dateKey).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })
                return (
                  <div key={dateKey} className="relative">
                    <div className="mb-3 flex items-center gap-3">
                      <span
                        className={`text-xs font-bold uppercase tracking-wider ${
                          isToday ? 'text-primary' : 'text-text-muted'
                        }`}
                      >
                        {isToday ? `Today, ${label}` : label}
                      </span>
                      <div className="h-px flex-1 bg-border" />
                    </div>
                    {list.map(({ task, boardName }) => (
                      <button
                        key={task.id}
                        type="button"
                        onClick={() => handleTaskClick(task.id)}
                        className="group relative mb-3 w-full overflow-hidden rounded-lg border border-border bg-surface p-3 text-left shadow-sm transition-all hover:border-primary hover:shadow-md"
                      >
                        <div
                          className={`absolute left-0 top-0 h-full w-1 ${
                            task.settings?.priority === 'high'
                              ? 'bg-red-500'
                              : task.settings?.priority === 'low'
                                ? 'bg-blue-500'
                                : 'bg-yellow-500'
                          }`}
                        />
                        <div className="pl-2">
                          <div className="mb-1 flex items-start justify-between">
                            <h4 className="text-sm font-medium text-text-primary group-hover:text-primary">
                              {task.heading}
                            </h4>
                            <span
                              className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${
                                task.settings?.priority === 'high'
                                  ? 'border-red-500/20 bg-red-500/10 text-red-400'
                                  : task.settings?.priority === 'low'
                                    ? 'border-blue-500/20 bg-blue-500/10 text-blue-400'
                                    : 'border-yellow-500/20 bg-yellow-500/10 text-yellow-400'
                              }`}
                            >
                              {PRIORITY_LABELS[task.settings?.priority] || 'MED'}
                            </span>
                          </div>
                          {task.tldr && (
                            <p className="mb-2 line-clamp-1 text-xs text-text-muted">
                              {task.tldr}
                            </p>
                          )}
                          <div className="flex items-center justify-between text-[10px]">
                            <div className="flex items-center gap-1.5 text-text-muted">
                              <Folder className="h-3 w-3" />
                              <span>{boardName}</span>
                            </div>
                            {(() => {
                              const days = getDaysRemaining(dateKey)
                              if (days === null) return null
                              const urgent = days <= 1
                              return (
                                <span
                                  className={`font-mono ${
                                    urgent ? 'text-red-400' : 'text-text-muted'
                                  }`}
                                >
                                  {days < 0
                                    ? `${Math.abs(days)}d overdue`
                                    : days === 0
                                      ? 'Due today'
                                      : `${days}d left`}
                                </span>
                              )
                            })()}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )
              })
            })()}
            {upcomingList.length === 0 && (
              <div className="rounded-lg border border-dashed border-border bg-bg-base/50 p-6 text-center">
                <Clock className="mx-auto mb-2 h-10 w-10 text-text-muted" />
                <p className="text-xs text-text-muted">
                  No deadlines scheduled. Add a due date to tasks to see them here.
                </p>
                <button
                  type="button"
                  onClick={() => onCreateTask(activeBoardId, null)}
                  className="mt-2 text-xs font-medium text-primary hover:underline"
                >
                  Add task
                </button>
              </div>
            )}
          </div>
          <div className="border-t border-border bg-surface/50 p-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-semibold text-text-muted">
                {grid.monthLabel} tasks due
              </span>
              <span className="text-xs font-bold text-primary">
                {monthDueCount}
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-border">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${completionWidth}%` }}
              />
            </div>
          </div>
        </aside>
      </section>
    </main>
  )
}
