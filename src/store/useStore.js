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
let notesFirstEmit = true

export const useStore = create(
  subscribeWithSelector((set) => ({
    boards: [],
    standaloneTasks: [],
    activeBoardId: null,
    selectedTask: null,
    deletedTasks: [],
    notes: [],
    uiSettings: defaultUiSettings,
    hydrationComplete: false,
    activeView: 'boards',
    selectedNoteId: null,

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

    hydrateNotes: (notes) =>
      set(() => ({
        notes: Array.isArray(notes) ? notes : [],
      })),

    hydrateSettings: (settings) =>
      set((state) => {
        const newSettings = {
          ...defaultUiSettings,
          ...state.uiSettings, // Preserve existing uiSettings first
          ...(settings || {}), // Then apply new settings
          // Always preserve activeBoardId from state if it exists
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
    setSelectedNoteId: (id) => set({ selectedNoteId: id }),

    fetchNoteContent: async (id) => {
      const { notes } = useStore.getState()
      const note = notes.find((n) => n.id === id)
      if (!note || note.content !== null) return

      if (window.electronAPI?.getNoteContent) {
        try {
          const content = await window.electronAPI.getNoteContent(id)
          set((state) => ({
            notes: state.notes.map((n) => (n.id === id ? { ...n, content } : n)),
          }))
        } catch (error) {
          console.error('[Store] Error fetching note content:', error)
        }
      }
    },

    addNote: (payload) => {
      const id = uuidv4()
      const now = new Date().toISOString()
      const note = {
        id,
        title: payload.title || 'Untitled Note',
        content: payload.content || '',
        taskIds: [],
        createdAt: now,
        updatedAt: now,
      }

      set((state) => ({
        notes: [note, ...state.notes],
      }))

      if (window.electronAPI?.createNote) {
        window.electronAPI.createNote(note)
      }
    },

    updateNote: (id, updates) => {
      const now = new Date().toISOString()
      set((state) => ({
        notes: state.notes.map((note) =>
          note.id === id ? { ...note, ...updates, updatedAt: now } : note,
        ),
      }))

      if (window.electronAPI?.updateNote) {
        window.electronAPI.updateNote(id, { ...updates, updatedAt: now })
      }
    },

    removeNote: (id) => {
      set((state) => ({
        notes: state.notes.filter((note) => note.id !== id),
      }))

      if (window.electronAPI?.deleteNote) {
        window.electronAPI.deleteNote(id)
      }
    },

    linkNoteToTask: (noteId, taskId) => {
      set((state) => ({
        notes: state.notes.map((note) =>
          note.id === noteId
            ? { ...note, taskIds: [...new Set([...(note.taskIds || []), taskId])] }
            : note,
        ),
      }))

      if (window.electronAPI?.linkNoteToTask) {
        window.electronAPI.linkNoteToTask(noteId, taskId)
      }
    },

    unlinkNoteFromTask: (noteId, taskId) => {
      set((state) => ({
        notes: state.notes.map((note) =>
          note.id === noteId
            ? { ...note, taskIds: (note.taskIds || []).filter((id) => id !== taskId) }
            : note,
        ),
      }))

      if (window.electronAPI?.unlinkNoteFromTask) {
        window.electronAPI.unlinkNoteFromTask(noteId, taskId)
      }
    },

    createBoard: (boardName, columnTitles) => {
      const result = set((state) => {
        const name = boardName?.trim() || `Board ${state.boards.length + 1}`
        const nextBoard = {
          id: uuidv4(),
          name,
          columns: createColumnsFromTitles(columnTitles),
          createdAt: new Date().toISOString(),
        }

        // Always switch to the newly created board
        const newActiveBoardId = nextBoard.id
        return {
          boards: [...state.boards, nextBoard],
          activeBoardId: newActiveBoardId,
          uiSettings: {
            ...state.uiSettings,
            activeBoardId: newActiveBoardId,
          },
          // Preserve hydrationComplete to prevent showing loading state
          hydrationComplete: state.hydrationComplete,
        }
      })
      // Direct save call after state update
      setTimeout(() => {
        const currentState = useStore.getState()
        if (!currentState.hydrationComplete) {
          return
        }
        try {
          // Use same save logic as saveBoardsToDisk - includes localStorage fallback
          if (window.electronAPI?.saveBoards) {
            console.log('[Store] Saving boards via Electron API:', {
              boardsCount: currentState.boards.length,
              activeBoardId: currentState.activeBoardId,
            })
            window.electronAPI.saveBoards(
              currentState.boards,
              currentState.activeBoardId,
              currentState.standaloneTasks,
            )
          } else {
            // Fallback to localStorage when Electron is not available
            console.log('[Store] Saving boards to localStorage:', {
              boardsCount: currentState.boards.length,
              standaloneTasksCount: currentState.standaloneTasks.length,
              activeBoardId: currentState.activeBoardId,
            })
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

        // Move all tasks from this board into standaloneTasks (boardless, not deleted)
        const tasksToStandalone = []
        for (const column of board.columns || []) {
          for (const task of column.tasks || []) {
            tasksToStandalone.push({
              ...task,
              timeline: [
                ...(task.timeline || []),
                createTimelineEntry(`Moved to My Tasks (board "${board.name}" removed)`),
              ],
            })
          }
        }
        const newStandaloneTasks = [...state.standaloneTasks, ...tasksToStandalone]

        const updatedBoards = state.boards.filter((b) => b.id !== boardId)
        let newActiveBoardId = state.activeBoardId
        if (state.activeBoardId === boardId) {
          newActiveBoardId = updatedBoards.length > 0 ? updatedBoards[0].id : null
        }

        return {
          boards: updatedBoards,
          standaloneTasks: newStandaloneTasks,
          activeBoardId: newActiveBoardId,
          uiSettings: {
            ...state.uiSettings,
            activeBoardId: newActiveBoardId,
          },
          selectedTask:
            state.selectedTask && state.selectedTask.boardId === boardId
              ? null
              : state.selectedTask,
        }
      })
      // Direct save call after state update
      setTimeout(() => {
        const currentState = useStore.getState()
        if (!currentState.hydrationComplete) {
          return
        }
        try {
          // Use same save logic as saveBoardsToDisk - includes localStorage fallback
          if (window.electronAPI?.saveBoards) {
            console.log('[Store] Saving boards via Electron API after removeBoard:', {
              boardsCount: currentState.boards.length,
              activeBoardId: currentState.activeBoardId,
            })
            window.electronAPI.saveBoards(currentState.boards, currentState.activeBoardId)
          } else {
            // Fallback to localStorage when Electron is not available
            console.log('[Store] Saving boards to localStorage after removeBoard:', {
              boardsCount: currentState.boards.length,
              activeBoardId: currentState.activeBoardId,
            })
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
          console.error('[Store] Error in direct save after removeBoard:', error)
        }
      }, 100)
      return result
    },

    renameBoard: (boardId, name) => {
      const result = set((state) => ({
        boards: state.boards.map((board) =>
          board.id === boardId ? { ...board, name: name.trim() || board.name } : board,
        ),
      }))
      // Direct save call after state update
      setTimeout(() => {
        const currentState = useStore.getState()
        if (!currentState.hydrationComplete) {
          return
        }
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
          console.error('[Store] Error in direct save after renameBoard:', error)
        }
      }, 100)
      return result
    },

    addColumn: (boardId, title) => {
      const result = set((state) => ({
        boards: state.boards.map((board) => {
          if (board.id !== boardId) {
            return board
          }

          return {
            ...board,
            columns: [
              ...board.columns,
              {
                id: uuidv4(),
                title: title?.trim() || 'New Status',
                tasks: [],
              },
            ],
          }
        }),
      }))
      // Direct save call after state update
      setTimeout(() => {
        const currentState = useStore.getState()
        if (!currentState.hydrationComplete) {
          return
        }
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
          console.error('[Store] Error in direct save after addColumn:', error)
        }
      }, 100)
      return result
    },

    renameColumn: (boardId, columnId, nextTitle) => {
      const result = set((state) => ({
        boards: state.boards.map((board) => {
          if (board.id !== boardId) {
            return board
          }

          return {
            ...board,
            columns: board.columns.map((column) =>
              column.id === columnId
                ? {
                    ...column,
                    title: nextTitle?.trim() || column.title,
                    tasks: column.tasks.map((task) => ({
                      ...task,
                      settings: { ...task.settings, status: nextTitle?.trim() || column.title },
                    })),
                  }
                : column,
            ),
          }
        }),
      }))
      // Direct save call after state update
      setTimeout(() => {
        const currentState = useStore.getState()
        if (!currentState.hydrationComplete) {
          return
        }
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
          console.error('[Store] Error in direct save after renameColumn:', error)
        }
      }, 100)
      return result
    },

    addTask: (boardId, columnId, payload) => {
      const taskId = uuidv4()
      const createdAt = new Date().toISOString()
      let taskForApi = null
      let position = 0

      const result = set((state) => {
        // If boardId and columnId are null, create a standalone task
        if (!boardId || !columnId) {
          position = state.standaloneTasks.length
          const task = {
            id: taskId,
            heading: payload.heading?.trim() || 'Untitled Task',
            tldr: payload.tldr?.trim() || '',
            description: payload.description?.trim() || '',
            createdAt,
            settings: {
              ...defaultTaskSettings,
              ...payload.settings,
              status: payload.settings?.status || 'To Do',
            },
            extendedData: { ...defaultExtendedData, ...(payload.extendedData || {}) },
            timeline: [createTimelineEntry('Created as standalone task')],
          }

          taskForApi = {
            id: task.id,
            board_id: null,
            column_id: null,
            isStandalone: true,
            heading: task.heading,
            tldr: task.tldr,
            description: task.description,
            created_at: task.createdAt,
            priority: task.settings.priority,
            tags: task.settings.tags,
            due_date: task.settings.dueDate,
            status: task.settings.status,
            completed: task.settings.completed,
            extendedData: task.extendedData,
            position,
          }

          return {
            standaloneTasks: [...state.standaloneTasks, task],
          }
        }

        // Otherwise, add task to board/column as before
        return {
          boards: state.boards.map((board) => {
            if (board.id !== boardId) {
              return board
            }

            return {
              ...board,
              columns: board.columns.map((column) => {
                if (column.id !== columnId) {
                  return column
                }

                position = column.tasks.length

                const isDoneColumn = column.title.toLowerCase() === 'done'
                const task = {
                  id: taskId,
                  heading: payload.heading?.trim() || 'Untitled Task',
                  tldr: payload.tldr?.trim() || '',
                  description: payload.description?.trim() || '',
                  createdAt,
                  settings: {
                    ...defaultTaskSettings,
                    ...payload.settings,
                    status: column.title,
                    completed: isDoneColumn ? true : (payload.settings?.completed ?? defaultTaskSettings.completed),
                  },
                  extendedData: { ...defaultExtendedData, ...(payload.extendedData || {}) },
                  timeline: [createTimelineEntry(`Created in ${column.title}${isDoneColumn ? ' (marked as completed)' : ''}`)],
                }

                taskForApi = {
                  id: task.id,
                  board_id: boardId,
                  column_id: columnId,
                  heading: task.heading,
                  tldr: task.tldr,
                  description: task.description,
                  created_at: task.createdAt,
                  priority: task.settings.priority,
                  tags: task.settings.tags,
                  due_date: task.settings.dueDate,
                  status: task.settings.status,
                  completed: task.settings.completed,
                  extendedData: task.extendedData,
                  position,
                }

                return {
                  ...column,
                  tasks: [...column.tasks, task],
                }
              }),
            }
          }),
        }
      })

      if (taskForApi && window.electronAPI?.createTask) {
        window.electronAPI.createTask(taskForApi).catch(err => {
          console.error('[Store] Error calling task:create', err)
          // Here we could implement a rollback logic if needed
        })
      }

      return result
    },

    removeTask: (boardId, columnId, taskId) => {
      const result = set((state) => {
        // Handle standalone tasks (no boardId or columnId)
        if (!boardId || !columnId) {
          const targetTask = state.standaloneTasks.find((task) => task.id === taskId)
          if (targetTask) {
            const removedSnapshot = {
              boardId: null,
              boardName: 'No Board',
              columnId: null,
              columnTitle: 'Standalone',
              task: {
                ...targetTask,
                timeline: [
                  ...targetTask.timeline,
                  createTimelineEntry('Deleted standalone task'),
                ],
              },
              deletedAt: new Date().toISOString(),
            }
            return {
              standaloneTasks: state.standaloneTasks.filter((task) => task.id !== taskId),
              deletedTasks: [removedSnapshot, ...state.deletedTasks],
              selectedTask:
                state.selectedTask &&
                state.selectedTask.taskId === taskId &&
                !state.selectedTask.boardId
                  ? null
                  : state.selectedTask,
            }
          }
          return state
        }

        // Handle board tasks
        return {
          ...(() => {
            let removedSnapshot = null

            const nextBoards = state.boards.map((board) => {
              if (board.id !== boardId) {
                return board
              }

              return {
                ...board,
                columns: board.columns.map((column) => {
                  if (column.id !== columnId) {
                    return column
                  }

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

            const nextDeletedTasks = removedSnapshot
              ? [removedSnapshot, ...state.deletedTasks]
              : state.deletedTasks

            return {
              boards: nextBoards,
              deletedTasks: nextDeletedTasks,
            }
          })(),
          selectedTask:
            state.selectedTask &&
            state.selectedTask.boardId === boardId &&
            state.selectedTask.columnId === columnId &&
            state.selectedTask.taskId === taskId
              ? null
              : state.selectedTask,
        }
      })

      if (window.electronAPI?.deleteTask) {
        window.electronAPI.deleteTask(taskId)
      }

      return result
    },

    updateTask: (boardId, columnId, taskId, updates) => {
      const result = set((state) => {
        // Handle standalone tasks (no boardId or columnId)
        if (!boardId || !columnId) {
          return {
            standaloneTasks: state.standaloneTasks.map((task) => {
              if (task.id !== taskId) {
                return task
              }

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

        // Handle board tasks
        return {
          boards: state.boards.map((board) => {
            if (board.id !== boardId) {
              return board
            }

            return {
              ...board,
              columns: board.columns.map((column) => {
                if (column.id !== columnId) {
                  return column
                }

                return {
                  ...column,
                  tasks: column.tasks.map((task) => {
                    if (task.id !== taskId) {
                      return task
                    }

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

      if (window.electronAPI?.updateTask) {
        const apiUpdates = { ...updates }
        if (!boardId || !columnId) {
          apiUpdates.isStandalone = true
        }
        window.electronAPI.updateTask(taskId, apiUpdates)
      }

      return result
    },

    moveTask: (boardId, taskId, sourceColumnId, targetColumnId, targetIndex) => {
      const result = set((state) => {
        if (!boardId) {
          const taskToMove = state.standaloneTasks.find((t) => t.id === taskId)
          if (!taskToMove) return state

          const nextStandalone = state.standaloneTasks.filter((t) => t.id !== taskId)
          const insertAt =
            typeof targetIndex === 'number'
              ? Math.max(0, Math.min(targetIndex, nextStandalone.length))
              : nextStandalone.length

          nextStandalone.splice(insertAt, 0, taskToMove)
          return { standaloneTasks: nextStandalone }
        }

        return {
          boards: state.boards.map((board) => {
            if (board.id !== boardId) {
              return board
            }

            const sourceColumn = board.columns.find((column) => column.id === sourceColumnId)
            const targetColumn = board.columns.find((column) => column.id === targetColumnId)

            if (!sourceColumn || !targetColumn) {
              return board
            }

            const taskToMove = sourceColumn.tasks.find((task) => task.id === taskId)
            if (!taskToMove) {
              return board
            }

            if (sourceColumnId === targetColumnId) {
              // This implementation doesn't handle reordering within the same column,
              // as the backend `move` is also for changing columns.
              // For now, we just return the board as is.
              return board
            }

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
                createTimelineEntry(
                  `Moved from ${sourceColumn.title} to ${targetColumn.title}${
                    isDoneColumn ? ' (marked as completed)' : ''
                  }`,
                ),
              ],
            }

            return {
              ...board,
              columns: board.columns.map((column) => {
                if (column.id === sourceColumnId) {
                  return {
                    ...column,
                    tasks: column.tasks.filter((task) => task.id !== taskId),
                  }
                }

                if (column.id === targetColumnId) {
                  const copy = [...column.tasks]
                  const insertAt =
                    typeof targetIndex === 'number'
                      ? Math.max(0, Math.min(targetIndex, copy.length))
                      : copy.length

                  copy.splice(insertAt, 0, taskWithTimeline)
                  
                  // Sync with native backend if available
                  if (window.electronAPI?.moveTask) {
                    window.electronAPI.moveTask(taskId, boardId, targetColumnId, insertAt)
                  }

                  return {
                    ...column,
                    tasks: copy,
                  }
                }

                return column
              }),
            }
          }),
        }
      })

      return result
    },

    // Move a task from any source (standalone or board/column) to any target (standalone or board/column).
    moveTaskToBoard: (sourceBoardId, sourceColumnId, taskId, targetBoardId, targetColumnId) => {
      const result = set((state) => {
        // Resolve source task (from standalone or from board)
        let taskToMove = null
        if (!sourceBoardId || !sourceColumnId) {
          taskToMove = state.standaloneTasks.find((t) => t.id === taskId) ?? null
        } else {
          const board = state.boards.find((b) => b.id === sourceBoardId)
          const column = board?.columns.find((c) => c.id === sourceColumnId)
          taskToMove = column?.tasks.find((t) => t.id === taskId) ?? null
        }
        if (!taskToMove) {
          return state
        }

        const targetBoard = state.boards.find((b) => b.id === targetBoardId)
        const targetCol = targetBoard?.columns.find((c) => c.id === targetColumnId)
        const isTargetStandalone = !targetBoardId || !targetColumnId
        const isDoneColumn = targetCol?.title.toLowerCase() === 'done'
        const moveEntry = isTargetStandalone
          ? createTimelineEntry('Moved to standalone')
          : (() => {
              const colTitle = targetCol?.title ?? 'Unknown'
              const boardName = targetBoard?.name ?? 'Unknown'
              return createTimelineEntry(
                `Moved to ${boardName} / ${colTitle}${
                  isDoneColumn ? ' (marked as completed)' : ''
                }`,
              )
            })()

        const taskWithTimeline = {
          ...taskToMove,
          settings: {
            ...taskToMove.settings,
            ...(isTargetStandalone
              ? {}
              : {
                  status: targetCol?.title ?? 'To Do',
                  completed: isDoneColumn ? true : taskToMove.settings.completed,
                }),
          },
          timeline: [...taskToMove.timeline, moveEntry],
        }

        // Remove from source
        let nextStandalone = state.standaloneTasks
        let nextBoards = state.boards

        if (!sourceBoardId || !sourceColumnId) {
          nextStandalone = state.standaloneTasks.filter((t) => t.id !== taskId)
        } else {
          nextBoards = state.boards.map((board) => {
            if (board.id !== sourceBoardId) return board
            return {
              ...board,
              columns: board.columns.map((col) =>
                col.id !== sourceColumnId
                  ? col
                  : { ...col, tasks: col.tasks.filter((t) => t.id !== taskId) },
              ),
            }
          })
        }

        // Add to target
        if (isTargetStandalone) {
          nextStandalone = [...nextStandalone, taskWithTimeline]
        } else {
          nextBoards = nextBoards.map((board) => {
            if (board.id !== targetBoardId) return board
            return {
              ...board,
              columns: board.columns.map((column) => {
                if (column.id !== targetColumnId) return column
                return {
                  ...column,
                  tasks: [...column.tasks, taskWithTimeline],
                }
              }),
            }
          })
        }

        return {
          boards: nextBoards,
          standaloneTasks: nextStandalone,
          selectedTask:
            state.selectedTask &&
            state.selectedTask.taskId === taskId &&
            state.selectedTask.boardId === sourceBoardId &&
            state.selectedTask.columnId === sourceColumnId
              ? { boardId: targetBoardId, columnId: targetColumnId, taskId }
              : state.selectedTask,
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
          console.error('[Store] Error in direct save after moveTaskToBoard:', error)
        }
      }, 100)
      return result
    },

    updateTaskChecklist: (boardId, columnId, taskId, checklistId, updates) => {
      const result = set((state) => {
        const updateTaskFn = (task) => {
          if (task.id !== taskId) return task
          return {
            ...task,
            extendedData: {
              ...task.extendedData,
              checklists: task.extendedData.checklists.map((item) =>
                item.id === checklistId ? { ...item, ...updates } : item,
              ),
            },
          }
        }

        if (!boardId || !columnId) {
          return { standaloneTasks: state.standaloneTasks.map(updateTaskFn) }
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
                  tasks: column.tasks.map(updateTaskFn),
                }
              }),
            }
          }),
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
          console.error('[Store] Error in direct save after updateTaskChecklist:', error)
        }
      }, 100)
      return result
    },

    addTaskChecklistItem: (boardId, columnId, taskId) => {
      const result = set((state) => {
        const updateTaskFn = (task) => {
          if (task.id !== taskId) return task
          return {
            ...task,
            extendedData: {
              ...task.extendedData,
              checklists: [
                ...task.extendedData.checklists,
                { id: uuidv4(), text: '', completed: false },
              ],
            },
          }
        }

        if (!boardId || !columnId) {
          return { standaloneTasks: state.standaloneTasks.map(updateTaskFn) }
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
                  tasks: column.tasks.map(updateTaskFn),
                }
              }),
            }
          }),
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
          console.error('[Store] Error in direct save after addTaskChecklistItem:', error)
        }
      }, 100)
      return result
    },

    removeTaskChecklistItem: (boardId, columnId, taskId, checklistId) => {
      const result = set((state) => {
        const updateTaskFn = (task) => {
          if (task.id !== taskId) return task
          return {
            ...task,
            extendedData: {
              ...task.extendedData,
              checklists: task.extendedData.checklists.filter((item) => item.id !== checklistId),
            },
          }
        }

        if (!boardId || !columnId) {
          return { standaloneTasks: state.standaloneTasks.map(updateTaskFn) }
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
                  tasks: column.tasks.map(updateTaskFn),
                }
              }),
            }
          }),
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
          console.error('[Store] Error in direct save after removeTaskChecklistItem:', error)
        }
      }, 100)
      return result
    },

    addTaskAttachment: (boardId, columnId, taskId, attachment) => {
      const result = set((state) => {
        const updateTaskFn = (task) => {
          if (task.id !== taskId) return task
          return {
            ...task,
            extendedData: {
              ...task.extendedData,
              attachments: [
                ...task.extendedData.attachments,
                {
                  id: uuidv4(),
                  createdAt: new Date().toISOString(),
                  ...attachment,
                },
              ],
            },
          }
        }

        if (!boardId || !columnId) {
          return { standaloneTasks: state.standaloneTasks.map(updateTaskFn) }
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
                  tasks: column.tasks.map(updateTaskFn),
                }
              }),
            }
          }),
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
          console.error('[Store] Error in direct save after addTaskAttachment:', error)
        }
      }, 100)
      return result
    },

    removeTaskAttachment: (boardId, columnId, taskId, attachmentId) => {
      const result = set((state) => {
        const updateTaskFn = (task) => {
          if (task.id !== taskId) return task
          return {
            ...task,
            extendedData: {
              ...task.extendedData,
              attachments: task.extendedData.attachments.filter((a) => a.id !== attachmentId),
            },
          }
        }

        if (!boardId || !columnId) {
          return { standaloneTasks: state.standaloneTasks.map(updateTaskFn) }
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
                  tasks: column.tasks.map(updateTaskFn),
                }
              }),
            }
          }),
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
          console.error('[Store] Error in direct save after removeTaskAttachment:', error)
        }
      }, 100)
      return result
    },

    addTaskComment: (boardId, columnId, taskId, text) => {
      if (!text?.trim()) return

      const result = set((state) => {
        const updateTaskFn = (task) => {
          if (task.id !== taskId) return task
          return {
            ...task,
            extendedData: {
              ...task.extendedData,
              comments: [
                ...(task.extendedData.comments || []),
                {
                  id: uuidv4(),
                  text: text.trim(),
                  createdAt: new Date().toISOString(),
                },
              ],
            },
          }
        }

        if (!boardId || !columnId) {
          return { standaloneTasks: state.standaloneTasks.map(updateTaskFn) }
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
                  tasks: column.tasks.map(updateTaskFn),
                }
              }),
            }
          }),
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
          console.error('[Store] Error in direct save after addTaskComment:', error)
        }
      }, 100)
      return result
    },

    removeTaskComment: (boardId, columnId, taskId, commentId) => {
      const result = set((state) => {
        const updateTaskFn = (task) => {
          if (task.id !== taskId) return task
          return {
            ...task,
            extendedData: {
              ...task.extendedData,
              comments: (task.extendedData.comments || []).filter((c) => c.id !== commentId),
            },
          }
        }

        if (!boardId || !columnId) {
          return { standaloneTasks: state.standaloneTasks.map(updateTaskFn) }
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
                  tasks: column.tasks.map(updateTaskFn),
                }
              }),
            }
          }),
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
          console.error('[Store] Error in direct save after removeTaskComment:', error)
        }
      }, 100)
      return result
    },

    openTaskDetail: (boardId, columnId, taskId) =>
      set({
        selectedTask: { boardId, columnId, taskId },
      }),

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
  if (persistenceAttached) {
    return
  }

  persistenceAttached = true

  // Helper function to save boards (Electron SQLite or localStorage fallback)
  const saveBoardsToDisk = () => {
    try {
      const state = useStore.getState()
      if (!state.hydrationComplete) {
        console.log('[Store] Skipping save - hydration not complete')
        return false
      }
      const activeBoardId = state.activeBoardId
      if (window.electronAPI?.saveBoards) {
        console.log('[Store] saveBoardsToDisk: Saving via Electron API:', {
          boardsCount: state.boards.length,
          standaloneTasksCount: state.standaloneTasks.length,
          activeBoardId,
        })
        window.electronAPI.saveBoards(state.boards, activeBoardId, state.standaloneTasks)
      } else {
        try {
          console.log('[Store] saveBoardsToDisk: Saving to localStorage:', {
            boardsCount: state.boards.length,
            standaloneTasksCount: state.standaloneTasks.length,
            activeBoardId,
          })
          localStorage.setItem(
            'todo_boards',
            JSON.stringify({
              boards: state.boards,
              standaloneTasks: state.standaloneTasks,
              activeBoardId,
            }),
          )
        } catch (e) {
          console.error('[Store] localStorage save failed:', e)
          return false
        }
      }
      return true
    } catch (error) {
      console.error('[Store] Failed to save boards:', error)
      return false
    }
  }

  // Sync activeBoardId to uiSettings.activeBoardId and save whenever it changes
  useStore.subscribe(
    (state) => state.activeBoardId,
    (activeBoardId) => {
      if (activeBoardIdFirstEmit) {
        activeBoardIdFirstEmit = false
        return
      }
      if (!useStore.getState().hydrationComplete) {
        return
      }
      const currentSettings = useStore.getState().uiSettings
      if (currentSettings.activeBoardId !== activeBoardId) {
        useStore.setState({
          uiSettings: {
            ...currentSettings,
            activeBoardId,
          },
        })
      }
      // Also save boards with the new activeBoardId
      saveBoardsToDisk()
    },
  )

  // Only persist after hydration is complete to avoid overwriting loaded data
  // Skip the first emission which happens when subscription is attached (during hydration)
  useStore.subscribe(
    (state) => state.boards,
    () => {
      // Skip the first emission and only persist after hydration is complete
      if (boardsFirstEmit) {
        boardsFirstEmit = false
        return
      }
      if (!useStore.getState().hydrationComplete) {
        return
      }
      saveBoardsToDisk()
    },
  )

  // Also persist when standaloneTasks change
  let standaloneTasksFirstEmit = true
  useStore.subscribe(
    (state) => state.standaloneTasks,
    () => {
      if (standaloneTasksFirstEmit) {
        standaloneTasksFirstEmit = false
        return
      }
      if (!useStore.getState().hydrationComplete) {
        return
      }
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
      if (!useStore.getState().hydrationComplete) {
        return
      }
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
      if (!useStore.getState().hydrationComplete) {
        return
      }
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

  useStore.subscribe(
    (state) => state.notes,
    (notes) => {
      if (notesFirstEmit) {
        notesFirstEmit = false
        return
      }
      if (!useStore.getState().hydrationComplete) {
        return
      }
      try {
        if (window.electronAPI?.saveNotes) {
          window.electronAPI.saveNotes(notes)
        } else {
          localStorage.setItem('todo_notes', JSON.stringify(notes))
        }
      } catch (error) {
        console.error('Failed to save notes:', error)
      }
    },
  )
}
