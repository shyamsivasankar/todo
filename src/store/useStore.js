import { v4 as uuidv4 } from 'uuid'
import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'

const createTimelineEntry = (action) => ({
  timestamp: new Date().toISOString(),
  action,
})

const createDefaultColumns = () => [
  { id: uuidv4(), title: 'To Do', tasks: [] },
  { id: uuidv4(), title: 'In Progress', tasks: [] },
  { id: uuidv4(), title: 'Done', tasks: [] },
]

/** Build columns from an array of stage titles (e.g. from Create Board modal). */
const createColumnsFromTitles = (titles) => {
  if (!Array.isArray(titles) || titles.length === 0) return createDefaultColumns()
  return titles.filter(Boolean).map((title) => ({
    id: uuidv4(),
    title: String(title).trim() || 'Untitled',
    tasks: [],
  }))
}

const defaultTaskSettings = {
  priority: 'medium',
  tags: [],
  dueDate: '',
  status: 'To Do',
  completed: false,
}

const defaultExtendedData = {
  checklists: [],
  attachments: [],
  comments: [],
}

const defaultUiSettings = {
  startView: 'boards',
  tasksPageSize: 6,
  defaultTaskPriority: 'medium',
  confirmBeforeDelete: true,
  boardSwitcherExpanded: true,
}

const describeTaskUpdate = (previousTask, updates) => {
  const changed = []

  if (typeof updates.heading === 'string' && updates.heading !== previousTask.heading) {
    changed.push('heading')
  }
  if (typeof updates.tldr === 'string' && updates.tldr !== previousTask.tldr) {
    changed.push('summary')
  }
  if (
    typeof updates.description === 'string' &&
    updates.description !== previousTask.description
  ) {
    changed.push('description')
  }

  if (updates.settings) {
    const previousSettings = previousTask.settings || {}
    const nextSettings = updates.settings

    if (nextSettings.priority && nextSettings.priority !== previousSettings.priority) {
      changed.push('priority')
    }
    if (nextSettings.dueDate !== undefined && nextSettings.dueDate !== previousSettings.dueDate) {
      changed.push('due date')
    }
    if (nextSettings.completed !== undefined && nextSettings.completed !== previousSettings.completed) {
      changed.push(nextSettings.completed ? 'completed' : 'reopened')
    }
    if (Array.isArray(nextSettings.tags)) {
      const previousTags = (previousSettings.tags || []).join(',')
      const nextTags = nextSettings.tags.join(',')
      if (previousTags !== nextTags) {
        changed.push('tags')
      }
    }
  }

  if (!changed.length) {
    return 'Updated task details'
  }

  return `Updated ${changed.join(', ')}`
}

let persistenceAttached = false
let boardsFirstEmit = true
let deletedTasksFirstEmit = true
let settingsFirstEmit = true
let activeBoardIdFirstEmit = true


export const useStore = create(
  subscribeWithSelector((set) => ({
    boards: [],
    standaloneTasks: [],
    activeBoardId: null,
    selectedTask: null,
    deletedTasks: [],
    uiSettings: defaultUiSettings,
    hydrationComplete: false,
    activeView: 'boards',

    hydrateBoards: (boards, savedActiveBoardId = null, standaloneTasks = []) =>
      set((state) => {
        const ensureTaskExtendedData = (task) => ({
          ...task,
          extendedData: {
            ...defaultExtendedData,
            ...(task.extendedData || {}),
          },
        })

        const safeBoards = (Array.isArray(boards) ? boards : []).map((board) => ({
          ...board,
          columns: (board.columns || []).map((column) => ({
            ...column,
            tasks: (column.tasks || []).map(ensureTaskExtendedData),
          })),
        }))

        const safeStandaloneTasks = (Array.isArray(standaloneTasks) ? standaloneTasks : []).map(
          ensureTaskExtendedData,
        )

        // Use saved activeBoardId if available and valid, otherwise default to first board
        const activeBoardId =
          savedActiveBoardId && safeBoards.some((b) => b.id === savedActiveBoardId)
            ? savedActiveBoardId
            : safeBoards[0]?.id ?? null
        const newState = {
          boards: safeBoards,
          standaloneTasks: safeStandaloneTasks,
          activeBoardId,
          uiSettings: {
            ...state.uiSettings,
            activeBoardId,
          },
          hydrationComplete: true,
        }
        return newState
      }),

    hydrateDeletedTasks: (deletedTasks) =>
      set(() => ({
        deletedTasks: Array.isArray(deletedTasks) ? deletedTasks : [],
      })),

    hydrateSettings: (settings) =>
      set((state) => {
        const newSettings = {
          ...defaultUiSettings,
          ...settings,
          activeBoardId: state.activeBoardId ?? (settings || {}).activeBoardId ?? null,
        }
        return {
          uiSettings: newSettings,
        }
      }),

    updateSettings: (partialSettings) =>
      set((state) => ({
        uiSettings: {
          ...state.uiSettings,
          ...partialSettings,
        },
      })),

    setActiveBoardId: (boardId) =>
      set((state) => {
        return {
          activeBoardId: boardId,
          uiSettings: {
            ...state.uiSettings,
            activeBoardId: boardId,
          },
        }
      }),

    setActiveView: (view) => set({ activeView: view }),

    createBoard: (boardName, columnTitles) => {
      const result = set((state) => {
        const name = boardName?.trim() || `Board ${state.boards.length + 1}`
        const nextBoard = {
          id: uuidv4(),
          name,
          columns: createColumnsFromTitles(columnTitles),
          createdAt: new Date().toISOString(),
        }

        const newActiveBoardId = nextBoard.id
        return {
          boards: [...state.boards, nextBoard],
          activeBoardId: newActiveBoardId,
          uiSettings: {
            ...state.uiSettings,
            activeBoardId: newActiveBoardId,
          },
          hydrationComplete: state.hydrationComplete,
        }
      })
      setTimeout(() => {
        const currentState = useStore.getState()
        if (!currentState.hydrationComplete) return
        try {
          if (window.electronAPI?.saveBoards) {
            window.electronAPI.saveBoards(
              currentState.boards,
              currentState.activeBoardId,
              currentState.standaloneTasks,
            )
          } else {
            localStorage.setItem(
              'todo_boards',
              JSON.stringify({
                boards: currentState.boards,
                standaloneTasks: currentState.standaloneTasks,
                activeBoardId: currentState.activeBoardId,
              }),
            )
          }
        } catch (error) {
          console.error('[Store] Error in direct save after createBoard:', error)
        }
      }, 100)
      return result
    },

    removeBoard: (boardId) => {
      const result = set((state) => {
        const board = state.boards.find((b) => b.id === boardId)
        if (!board) return state

        const tasksToStandalone = []
        for (const column of board.columns || []) {
          for (const task of column.tasks || []) {
            tasksToStandalone.push({
              ...task,
              timeline: [
                ...(task.timeline || []),
                createTimelineEntry(`Board ${board.name} was removed. Task moved to standalone.`),
              ],
            })
          }
        }

        const nextBoards = state.boards.filter((b) => b.id !== boardId)
        const nextActiveBoardId =
          state.activeBoardId === boardId ? nextBoards[0]?.id ?? null : state.activeBoardId

        return {
          boards: nextBoards,
          standaloneTasks: [...state.standaloneTasks, ...tasksToStandalone],
          activeBoardId: nextActiveBoardId,
          uiSettings: {
            ...state.uiSettings,
            activeBoardId: nextActiveBoardId,
          },
        }
      })
      return result
    },

    renameBoard: (boardId, newName) => {
      const result = set((state) => ({
        boards: state.boards.map((b) => (b.id === boardId ? { ...b, name: newName } : b)),
      }))
      return result
    },

    createTask: (boardId, columnId, taskHeading, taskTldr, taskDescription, taskSettings) => {
      const result = set((state) => {
        const newTask = {
          id: uuidv4(),
          heading: taskHeading,
          tldr: taskTldr,
          description: taskDescription,
          settings: { ...defaultTaskSettings, ...(taskSettings || {}) },
          extendedData: { ...defaultExtendedData },
          timeline: [createTimelineEntry('Task created')],
          createdAt: new Date().toISOString(),
        }

        if (!boardId || !columnId) {
          return { standaloneTasks: [newTask, ...state.standaloneTasks] }
        }

        return {
          boards: state.boards.map((board) => {
            if (board.id !== boardId) return board
            return {
              ...board,
              columns: board.columns.map((column) => {
                if (column.id !== columnId) return column
                return {
                  ...column,
                  tasks: [newTask, ...column.tasks],
                }
              }),
            }
          }),
        }
      })
      return result
    },

    removeTask: (boardId, columnId, taskId) => {
      const result = set((state) => {
        if (!boardId || !columnId) {
          let removedSnapshot = null
          const targetTask = state.standaloneTasks.find((task) => task.id === taskId)
          if (targetTask) {
            removedSnapshot = {
              boardId: null,
              boardName: 'Standalone',
              columnId: null,
              columnTitle: null,
              task: {
                ...targetTask,
                timeline: [
                  ...targetTask.timeline,
                  createTimelineEntry('Deleted from Standalone'),
                ],
              },
              deletedAt: new Date().toISOString(),
            }
          }
          return {
            standaloneTasks: state.standaloneTasks.filter((task) => task.id !== taskId),
            deletedTasks: removedSnapshot
              ? [removedSnapshot, ...state.deletedTasks]
              : state.deletedTasks,
          }
        }

        let removedSnapshot = null
        const nextBoards = state.boards.map((board) => {
          if (board.id !== boardId) return board
          return {
            ...board,
            columns: board.columns.map((column) => {
              if (column.id !== columnId) return column
              const targetTask = column.tasks.find((task) => task.id === taskId)
              if (targetTask) {
                removedSnapshot = {
                  boardId: board.id,
                  boardName: board.name,
                  columnId: column.id,
                  columnTitle: column.title,
                  task: {
                    ...targetTask,
                    timeline: [
                      ...targetTask.timeline,
                      createTimelineEntry(`Deleted from ${column.title}`),
                    ],
                  },
                  deletedAt: new Date().toISOString(),
                }
              }
              return {
                ...column,
                tasks: column.tasks.filter((task) => task.id !== taskId),
              }
            }),
          }
        })

        return {
          boards: nextBoards,
          deletedTasks: removedSnapshot
            ? [removedSnapshot, ...state.deletedTasks]
            : state.deletedTasks,
          selectedTask:
            state.selectedTask &&
            state.selectedTask.boardId === boardId &&
            state.selectedTask.columnId === columnId &&
            state.selectedTask.taskId === taskId
              ? null
              : state.selectedTask,
        }
      })
      return result
    },

    updateTask: (boardId, columnId, taskId, updates) => {
      const result = set((state) => {
        if (!boardId || !columnId) {
          return {
            standaloneTasks: state.standaloneTasks.map((task) => {
              if (task.id !== taskId) return task
              const action = describeTaskUpdate(task, updates)
              return {
                ...task,
                ...updates,
                settings: { ...task.settings, ...(updates.settings || {}) },
                extendedData: { ...task.extendedData, ...(updates.extendedData || {}) },
                timeline: [...task.timeline, createTimelineEntry(action)],
              }
            }),
          }
        }

        return {
          boards: state.boards.map((board) => {
            if (board.id !== boardId) return board
            return {
              ...board,
              columns: board.columns.map((column) => {
                if (column.id !== columnId) return column
                return {
                  ...column,
                  tasks: column.tasks.map((task) => {
                    if (task.id !== taskId) return task
                    const action = describeTaskUpdate(task, updates)
                    return {
                      ...task,
                      ...updates,
                      settings: { ...task.settings, ...(updates.settings || {}) },
                      extendedData: { ...task.extendedData, ...(updates.extendedData || {}) },
                      timeline: [...task.timeline, createTimelineEntry(action)],
                    }
                  }),
                }
              }),
            }
          }),
        }
      })
      return result
    },

    moveTask: (boardId, taskId, sourceColumnId, targetColumnId, targetIndex) => {
      const result = set((state) => {
        if (!boardId) {
          const taskToMove = state.standaloneTasks.find((t) => t.id === taskId)
          if (!taskToMove) return state
          const nextStandalone = state.standaloneTasks.filter((t) => t.id !== taskId)
          const insertAt = typeof targetIndex === 'number'
            ? Math.max(0, Math.min(targetIndex, nextStandalone.length))
            : nextStandalone.length
          nextStandalone.splice(insertAt, 0, taskToMove)
          return { standaloneTasks: nextStandalone }
        }

        return {
          boards: state.boards.map((board) => {
            if (board.id !== boardId) return board
            const sourceColumn = board.columns.find((c) => c.id === sourceColumnId)
            const targetColumn = board.columns.find((c) => c.id === targetColumnId)
            if (!sourceColumn || !targetColumn) return board
            const taskToMove = sourceColumn.tasks.find((t) => t.id === taskId)
            if (!taskToMove) return board
            const isDoneColumn = targetColumn.title.toLowerCase() === 'done'
            const taskWithTimeline = {
              ...taskToMove,
              settings: {
                ...taskToMove.settings,
                status: targetColumn.title,
                completed: isDoneColumn ? true : taskToMove.settings.completed,
              },
              timeline: [
                ...taskToMove.timeline,
                createTimelineEntry(`Moved from ${sourceColumn.title} to ${targetColumn.title}`),
              ],
            }
            return {
              ...board,
              columns: board.columns.map((column) => {
                if (column.id === sourceColumnId) {
                  return { ...column, tasks: column.tasks.filter((t) => t.id !== taskId) }
                }
                if (column.id === targetColumnId) {
                  const copy = [...column.tasks]
                  const insertAt = typeof targetIndex === 'number'
                    ? Math.max(0, Math.min(targetIndex, copy.length))
                    : copy.length
                  copy.splice(insertAt, 0, taskWithTimeline)
                  return { ...column, tasks: copy }
                }
                return column
              }),
            }
          }),
        }
      })
      return result
    },

    openTaskDetail: (boardId, columnId, taskId) =>
      set({ selectedTask: { boardId, columnId, taskId } }),

    closeTaskDetail: () => set({ selectedTask: null }),

    notifications: [],
    unreadCount: 0,

    fetchNotifications: async () => {
      if (window.electronAPI?.getNotifications) {
        try {
          const notifications = await window.electronAPI.getNotifications()
          const mappedNotifications = notifications.map((n) => ({
            ...n,
            is_read: !!n.read_at,
          }))
          const unreadCount = mappedNotifications.filter((n) => !n.is_read).length
          set({ notifications: mappedNotifications, unreadCount })
        } catch (error) {
          console.error('[Store] Error fetching notifications:', error)
        }
      }
    },

    markNotificationRead: async (id) => {
      if (window.electronAPI?.markNotificationAsRead) {
        try {
          await window.electronAPI.markNotificationAsRead(id)
          set((state) => {
            const nextNotifications = state.notifications.map((n) =>
              n.id === id ? { ...n, is_read: true } : n,
            )
            const unreadCount = nextNotifications.filter((n) => !n.is_read).length
            return { notifications: nextNotifications, unreadCount }
          })
        } catch (error) {
          console.error('[Store] Error marking notification as read:', error)
        }
      }
    },

    dismissNotification: (id) => {
      set((state) => {
        const nextNotifications = state.notifications.filter((n) => n.id !== id)
        const unreadCount = nextNotifications.filter((n) => !n.is_read).length
        return { notifications: nextNotifications, unreadCount }
      })
    },
  })),
)

export const attachBoardPersistence = () => {
  if (persistenceAttached) return
  persistenceAttached = true

  const saveBoardsToDisk = () => {
    try {
      const state = useStore.getState()
      if (!state.hydrationComplete) return false
      const activeBoardId = state.activeBoardId
      if (window.electronAPI?.saveBoards) {
        window.electronAPI.saveBoards(state.boards, activeBoardId, state.standaloneTasks)
      } else {
        localStorage.setItem(
          'todo_boards',
          JSON.stringify({
            boards: state.boards,
            standaloneTasks: state.standaloneTasks,
            activeBoardId,
          }),
        )
      }
      return true
    } catch (error) {
      console.error('[Store] Failed to save boards:', error)
      return false
    }
  }

  useStore.subscribe(
    (state) => state.activeBoardId,
    (activeBoardId) => {
      if (activeBoardIdFirstEmit) {
        activeBoardIdFirstEmit = false
        return
      }
      if (!useStore.getState().hydrationComplete) return
      const currentSettings = useStore.getState().uiSettings
      if (currentSettings.activeBoardId !== activeBoardId) {
        useStore.setState({ uiSettings: { ...currentSettings, activeBoardId } })
      }
      saveBoardsToDisk()
    },
  )

  useStore.subscribe(
    (state) => state.boards,
    () => {
      if (boardsFirstEmit) {
        boardsFirstEmit = false
        return
      }
      if (!useStore.getState().hydrationComplete) return
      saveBoardsToDisk()
    },
  )

  let standaloneTasksFirstEmit = true
  useStore.subscribe(
    (state) => state.standaloneTasks,
    () => {
      if (standaloneTasksFirstEmit) {
        standaloneTasksFirstEmit = false
        return
      }
      if (!useStore.getState().hydrationComplete) return
      saveBoardsToDisk()
    },
  )

  useStore.subscribe(
    (state) => state.deletedTasks,
    (deletedTasks) => {
      if (deletedTasksFirstEmit) {
        deletedTasksFirstEmit = false
        return
      }
      if (!useStore.getState().hydrationComplete) return
      try {
        if (window.electronAPI?.saveDeletedTasks) {
          window.electronAPI.saveDeletedTasks(deletedTasks)
        } else {
          localStorage.setItem('todo_deletedTasks', JSON.stringify(deletedTasks))
        }
      } catch (error) {
        console.error('Failed to save deleted tasks:', error)
      }
    },
  )

  useStore.subscribe(
    (state) => state.uiSettings,
    (uiSettings) => {
      if (settingsFirstEmit) {
        settingsFirstEmit = false
        return
      }
      if (!useStore.getState().hydrationComplete) return
      try {
        if (window.electronAPI?.saveSettings) {
          window.electronAPI.saveSettings(uiSettings)
        } else {
          localStorage.setItem('todo_settings', JSON.stringify(uiSettings))
        }
      } catch (error) {
        console.error('Failed to save settings:', error)
      }
    },
  )
}
