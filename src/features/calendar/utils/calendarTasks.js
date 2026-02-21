/**
 * Collect all tasks from boards and standalone, with board/column context.
 * Each item: { task, boardId, columnId, boardName, columnTitle }
 */
export function getAllTasksWithContext(boards, standaloneTasks) {
  const items = []
  for (const board of boards || []) {
    for (const column of board.columns || []) {
      for (const task of column.tasks || []) {
        items.push({
          task,
          boardId: board.id,
          columnId: column.id,
          boardName: board.name,
          columnTitle: column.title,
        })
      }
    }
  }
  for (const task of standaloneTasks || []) {
    items.push({
      task,
      boardId: null,
      columnId: null,
      boardName: 'No Board',
      columnTitle: 'Standalone',
    })
  }
  return items
}

/** Parse YYYY-MM-DD, ISO string, or Date object to local date-only string YYYY-MM-DD */
export function toDateKey(date) {
  if (!date) return null

  // If it's already a YYYY-MM-DD string, return it directly to avoid timezone shifts
  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return date
  }

  const d = date instanceof Date ? date : new Date(date)
  if (Number.isNaN(d.getTime())) return null
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/** Parse YYYY-MM-DD string to local Date object */
export function parseDateKey(key) {
  if (!key || typeof key !== 'string') return null
  const parts = key.split('-')
  if (parts.length !== 3) return null
  const year = parseInt(parts[0], 10)
  const month = parseInt(parts[1], 10) - 1
  const day = parseInt(parts[2], 10)
  return new Date(year, month, day)
}

/** Tasks that have a due date, for calendar and deadlines list */
export function getTasksWithDueDate(items, priorityFilter = null) {
  return items
    .filter(({ task }) => {
      const due = toDateKey(task.settings?.dueDate)
      if (!due) return false
      if (priorityFilter && task.settings?.priority !== priorityFilter) return false
      return true
    })
    .sort((a, b) => {
      const d1 = toDateKey(a.task.settings?.dueDate)
      const d2 = toDateKey(b.task.settings?.dueDate)
      return d1.localeCompare(d2)
    })
}

/** Group by date key (YYYY-MM-DD) */
export function groupByDueDate(items) {
  const map = new Map()
  for (const item of items) {
    const key = toDateKey(item.task.settings?.dueDate)
    if (!key) continue
    if (!map.has(key)) map.set(key, [])
    map.get(key).push(item)
  }
  return map
}

/** For Gantt: start = createdAt date, end = dueDate or start. Returns items with start/end date keys */
export function getTasksForGantt(items, priorityFilter = null) {
  return items
    .filter(({ task }) => {
      if (priorityFilter && task.settings?.priority !== priorityFilter) return false
      return true
    })
    .map((item) => {
      const created = toDateKey(item.task.createdAt)
      const due = toDateKey(item.task.settings?.dueDate)
      const start = created || due || toDateKey(new Date())
      const end = due || start
      return {
        ...item,
        startKey: start,
        endKey: end,
        startDate: parseDateKey(start),
        endDate: parseDateKey(end),
      }
    })
    .filter((item) => item.startKey && item.endKey)
}

/** Get calendar month grid: { cells: [{ dateKey, day, isCurrentMonth }], weeks rows } */
export function getMonthGrid(year, month) {
  const first = new Date(year, month, 1)
  const last = new Date(year, month + 1, 0)
  const startDow = first.getDay()
  const daysInMonth = last.getDate()
  const daysBefore = startDow
  const totalCells = Math.ceil((daysBefore + daysInMonth) / 7) * 7
  const monthLabels = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
  const cells = []
  for (let i = 0; i < totalCells; i++) {
    const dayIndex = i - daysBefore
    if (dayIndex < 0) {
      const prevMonth = month === 0 ? 11 : month - 1
      const prevYear = month === 0 ? year - 1 : year
      const prevLast = new Date(prevYear, prevMonth + 1, 0).getDate()
      const day = prevLast + dayIndex + 1
      const dateKey = `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      cells.push({ dateKey, day, isCurrentMonth: false })
    } else if (dayIndex >= daysInMonth) {
      const day = dayIndex - daysInMonth + 1
      const nextMonth = month === 11 ? 0 : month + 1
      const nextYear = month === 11 ? year + 1 : year
      const dateKey = `${nextYear}-${String(nextMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      cells.push({ dateKey, day, isCurrentMonth: false })
    } else {
      const day = dayIndex + 1
      const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      cells.push({ dateKey, day, isCurrentMonth: true })
    }
  }
  const weeks = []
  for (let w = 0; w < totalCells / 7; w++) {
    weeks.push(cells.slice(w * 7, (w + 1) * 7))
  }
  return {
    cells,
    weeks,
    year,
    month,
    monthLabel: monthLabels[month],
    daysInMonth,
  }
}

/** Get week ranges for Gantt (e.g. 4 weeks from a start date) */
export function getWeekRanges(fromDate, numWeeks = 4) {
  const start = new Date(fromDate)
  start.setHours(0, 0, 0, 0)
  const dayOfWeek = start.getDay()
  const monOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  const monday = new Date(start)
  monday.setDate(start.getDate() + monOffset)
  const ranges = []
  for (let w = 0; w < numWeeks; w++) {
    const weekStart = new Date(monday)
    weekStart.setDate(monday.getDate() + w * 7)
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekStart.getDate() + 6)
    const weekNum = getWeekNumber(weekStart)
    ranges.push({
      weekStart,
      weekEnd,
      weekNum,
      label: `Week ${weekNum} (${formatShort(weekStart)} - ${formatShort(weekEnd)})`,
      days: Array.from({ length: 7 }, (_, i) => {
        const d = new Date(weekStart)
        d.setDate(weekStart.getDate() + i)
        return d
      }),
    })
  }
  return ranges
}

function getWeekNumber(d) {
  const first = new Date(d.getFullYear(), 0, 1)
  const past = (d - first) / 86400000
  return Math.ceil((past + first.getDay() + 1) / 7)
}

function formatShort(d) {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${months[d.getMonth()]} ${d.getDate()}`
}

export function formatDayShort(d) {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  return `${days[d.getDay()]} ${d.getDate()}`
}

/** Check if date key is today */
export function isTodayKey(key) {
  return key === toDateKey(new Date())
}

/** Days remaining until due (or overdue) */
export function getDaysRemaining(dueDateKey) {
  const today = toDateKey(new Date())
  if (!dueDateKey) return null
  const a = parseDateKey(today)
  const b = parseDateKey(dueDateKey)
  const diff = Math.round((b - a) / 86400000)
  return diff
}

/**
 * Greedy packing algorithm for Gantt lanes.
 * 1. Sort tasks by startDate.
 * 2. Assign each task to the first available lane where task.startDate > lane[lastTask].endDate.
 * 3. Return { lanes, totalLanes, tasksWithLane }.
 */
export function calculateGanttLanes(tasks) {
  if (!tasks || tasks.length === 0) {
    return { lanes: [], totalLanes: 0, tasksWithLane: [] }
  }

  // Sort by startDate, then by endDate (shorter tasks first if same start)
  const sortedTasks = [...tasks].sort((a, b) => {
    const startDiff = a.startDate.getTime() - b.startDate.getTime()
    if (startDiff !== 0) return startDiff
    return a.endDate.getTime() - b.endDate.getTime()
  })

  const lanes = [] // Array of arrays, each sub-array is a lane containing tasks
  const tasksWithLane = []

  for (const task of sortedTasks) {
    let assignedLaneIndex = -1

    for (let i = 0; i < lanes.length; i++) {
      const lane = lanes[i]
      const lastTaskInLane = lane[lane.length - 1]

      // Check if task starts after the last task in this lane ends
      if (task.startDate.getTime() > lastTaskInLane.endDate.getTime()) {
        assignedLaneIndex = i
        break
      }
    }

    const taskWithLane = {
      ...task,
      laneIndex: assignedLaneIndex === -1 ? lanes.length : assignedLaneIndex,
    }

    if (assignedLaneIndex === -1) {
      // Create a new lane
      lanes.push([taskWithLane])
    } else {
      lanes[assignedLaneIndex].push(taskWithLane)
    }

    tasksWithLane.push(taskWithLane)
  }

  return {
    lanes,
    totalLanes: lanes.length,
    tasksWithLane,
  }
}
