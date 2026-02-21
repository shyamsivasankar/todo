import { describe, it, expect } from 'vitest'
import { calculateGanttLanes, toDateKey, parseDateKey } from './calendarTasks'

describe('toDateKey', () => {
  it('should return null for null/undefined', () => {
    expect(toDateKey(null)).toBe(null)
    expect(toDateKey(undefined)).toBe(null)
  })

  it('should return the same string if already in YYYY-MM-DD format', () => {
    const dateStr = '2026-02-21'
    expect(toDateKey(dateStr)).toBe(dateStr)
  })

  it('should format Date objects using local components', () => {
    const date = new Date(2026, 1, 21) // Feb 21, 2026 (local)
    expect(toDateKey(date)).toBe('2026-02-21')
  })

  it('should handle timestamps', () => {
    const date = new Date(2026, 1, 21)
    const timestamp = date.getTime()
    expect(toDateKey(timestamp)).toBe('2026-02-21')
  })

  it('should handle invalid dates', () => {
    expect(toDateKey('invalid')).toBe(null)
  })
})

describe('parseDateKey', () => {
  it('should return null for null/undefined', () => {
    expect(parseDateKey(null)).toBe(null)
    expect(parseDateKey(undefined)).toBe(null)
  })

  it('should parse YYYY-MM-DD to local Date', () => {
    const date = parseDateKey('2026-02-21')
    expect(date.getFullYear()).toBe(2026)
    expect(date.getMonth()).toBe(1) // Feb
    expect(date.getDate()).toBe(21)
  })

  it('should handle invalid formats', () => {
    expect(parseDateKey('2026/02/21')).toBe(null)
    expect(parseDateKey('2026-02')).toBe(null)
    expect(parseDateKey('invalid')).toBe(null)
  })
})

describe('calculateGanttLanes', () => {
  it('should return empty results for empty tasks', () => {
    const result = calculateGanttLanes([])
    expect(result.lanes).toEqual([])
    expect(result.totalLanes).toBe(0)
    expect(result.tasksWithLane).toEqual([])
  })

  it('should assign non-overlapping tasks to the same lane', () => {
    const tasks = [
      { id: 1, startDate: parseDateKey('2026-02-21'), endDate: parseDateKey('2026-02-21') },
      { id: 2, startDate: parseDateKey('2026-02-22'), endDate: parseDateKey('2026-02-22') },
    ]
    const result = calculateGanttLanes(tasks)
    expect(result.totalLanes).toBe(1)
    expect(result.tasksWithLane[0].laneIndex).toBe(0)
    expect(result.tasksWithLane[1].laneIndex).toBe(0)
  })

  it('should assign overlapping tasks to different lanes', () => {
    const tasks = [
      { id: 1, startDate: parseDateKey('2026-02-21'), endDate: parseDateKey('2026-02-21') },
      { id: 2, startDate: parseDateKey('2026-02-21'), endDate: parseDateKey('2026-02-21') },
    ]
    const result = calculateGanttLanes(tasks)
    expect(result.totalLanes).toBe(2)
    expect(result.tasksWithLane[0].laneIndex).toBe(0)
    expect(result.tasksWithLane[1].laneIndex).toBe(1)
  })

  it('should handle complex overlap scenarios', () => {
    const tasks = [
      { id: 1, startDate: parseDateKey('2026-02-21'), endDate: parseDateKey('2026-02-23') },
      { id: 2, startDate: parseDateKey('2026-02-22'), endDate: parseDateKey('2026-02-24') },
      { id: 3, startDate: parseDateKey('2026-02-24'), endDate: parseDateKey('2026-02-25') },
      { id: 4, startDate: parseDateKey('2026-02-25'), endDate: parseDateKey('2026-02-26') },
    ]
    // Task 1: 21-23 (Lane 0)
    // Task 2: 22-24 (Lane 1)
    // Task 3: 24-25 (Lane 0) - starts after Task 1 ends (24 > 23)
    // Task 4: 25-26 (Lane 1) - starts after Task 2 ends (25 > 24)
    
    const result = calculateGanttLanes(tasks)
    expect(result.totalLanes).toBe(2)
    
    const t1 = result.tasksWithLane.find(t => t.id === 1)
    const t2 = result.tasksWithLane.find(t => t.id === 2)
    const t3 = result.tasksWithLane.find(t => t.id === 3)
    const t4 = result.tasksWithLane.find(t => t.id === 4)
    
    expect(t1.laneIndex).toBe(0)
    expect(t2.laneIndex).toBe(1)
    expect(t3.laneIndex).toBe(0)
    expect(t4.laneIndex).toBe(1)
  })

  it('should sort tasks by startDate before processing', () => {
    const tasks = [
      { id: 2, startDate: parseDateKey('2026-02-22'), endDate: parseDateKey('2026-02-22') },
      { id: 1, startDate: parseDateKey('2026-02-21'), endDate: parseDateKey('2026-02-21') },
    ]
    const result = calculateGanttLanes(tasks)
    expect(result.tasksWithLane[0].id).toBe(1)
    expect(result.tasksWithLane[1].id).toBe(2)
    expect(result.tasksWithLane[0].laneIndex).toBe(0)
    expect(result.tasksWithLane[1].laneIndex).toBe(0)
  })
})
