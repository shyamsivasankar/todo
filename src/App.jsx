import { DndContext, PointerSensor, closestCorners, useSensor, useSensors } from '@dnd-kit/core'
import { ChevronDown, Filter, Plus, Search, SortAsc } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import BoardCarousel from './features/boards/components/BoardCarousel'
import CreateBoardModal from './features/boards/components/CreateBoardModal'
import KanbanBoard from './features/boards/components/KanbanBoard'
import CalendarPage from './features/calendar/pages/CalendarPage'
import AppSidebar from './features/layout/components/AppSidebar'
import SettingsPage from './features/settings/pages/SettingsPage'
import CreateTaskModal from './features/tasks/components/CreateTaskModal'
import TaskDetailModal from './features/tasks/components/TaskDetailModal'
import TasksPage from './features/tasks/pages/TasksPage'
import { attachBoardPersistence, useStore } from './store/useStore'

function App() {
  const boards = useStore((state) => state.boards)
  const activeBoardId = useStore((state) => state.activeBoardId)
  const createBoard = useStore((state) => state.createBoard)
  const uiSettings = useStore((state) => state.uiSettings)
  const hydrateBoards = useStore((state) => state.hydrateBoards)
  const hydrateDeletedTasks = useStore((state) => state.hydrateDeletedTasks)
  const hydrateSettings = useStore((state) => state.hydrateSettings)
  const hydrationComplete = useStore((state) => state.hydrationComplete)
  const moveTask = useStore((state) => state.moveTask)
  const selectedTask = useStore((state) => state.selectedTask)

  const [activeView, setActiveView] = useState('boards')
  const [boardModalOpen, setBoardModalOpen] = useState(false)
  const [taskModalState, setTaskModalState] = useState({
    open: false,
    boardId: null,
    columnId: null,
  })
  const [boardTaskSearch, setBoardTaskSearch] = useState('')
  const [boardTaskFilter, setBoardTaskFilter] = useState({
    priority: null,
    dueDateOnly: false,
  })
  const [boardTaskSort, setBoardTaskSort] = useState({ by: 'none', dir: 'asc' })
  const [filterDropdownOpen, setFilterDropdownOpen] = useState(false)
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false)
  const filterDropdownRef = useRef(null)
  const sortDropdownRef = useRef(null)
  const hasLoadedRef = useRef(false)

  useEffect(() => {
    function handleClickOutside(event) {
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(event.target)) {
        setFilterDropdownOpen(false)
      }
      if (sortDropdownRef.current && !sortDropdownRef.current.contains(event.target)) {
        setSortDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const activeBoard = useMemo(
    () => boards.find((board) => board.id === activeBoardId) || null,
    [boards, activeBoardId],
  )

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
  )

  useEffect(() => {
    const hasElectronAPI = Boolean(window.electronAPI)

    if (!hasElectronAPI) {
      console.log('[App] Browser mode - using localStorage fallback')
    } else {
      console.log('[App] Electron mode - using SQLite persistence')
    }

    if (hasLoadedRef.current) {
      const currentState = useStore.getState()
      const needsReload = !currentState.hydrationComplete ||
        (currentState.boards.length === 0 && window.electronAPI)
      if (!needsReload) return
    }
    hasLoadedRef.current = true

    const loadBoards = async () => {
      const hydrationTimeout = setTimeout(() => {
        if (!useStore.getState().hydrationComplete) {
          hydrateBoards([], null, [])
          hydrateDeletedTasks([])
          hydrateSettings({})
        }
      }, 1000)

      try {
        let boardsData = { boards: [], activeBoardId: null }
        let diskDeletedTasks = []
        let diskSettings = {}

        if (window.electronAPI) {
          const electronBoards = await window.electronAPI.getBoards?.()
          boardsData = electronBoards || { boards: [], activeBoardId: null }
          diskDeletedTasks = (await window.electronAPI.getDeletedTasks?.()) || []
          diskSettings = (await window.electronAPI.getSettings?.()) || {}
        } else {
          try {
            const stored = localStorage.getItem('todo_boards')
            if (stored) boardsData = JSON.parse(stored)
          } catch { /* ignore */ }
          try {
            const stored = localStorage.getItem('todo_deletedTasks')
            if (stored) diskDeletedTasks = JSON.parse(stored)
          } catch { /* ignore */ }
          try {
            const stored = localStorage.getItem('todo_settings')
            if (stored) diskSettings = JSON.parse(stored)
          } catch { /* ignore */ }
        }

        const diskBoards = boardsData.boards || []
        const diskStandaloneTasks = boardsData.standaloneTasks || []
        const savedActiveBoardId = boardsData.activeBoardId || null

        const currentState = useStore.getState()
        const shouldHydrate = !currentState.hydrationComplete ||
          (currentState.boards.length === 0 && diskBoards.length > 0)

        if (shouldHydrate) {
          hydrateBoards(diskBoards, savedActiveBoardId || diskSettings?.activeBoardId, diskStandaloneTasks)
          hydrateDeletedTasks(diskDeletedTasks)
          hydrateSettings(diskSettings)
        }

        attachBoardPersistence()
        clearTimeout(hydrationTimeout)
      } catch (error) {
        console.error('[App] Error loading boards:', error)
        if (!useStore.getState().hydrationComplete) {
          hydrateBoards([], null, [])
          hydrateDeletedTasks([])
          hydrateSettings({})
        }
        attachBoardPersistence()
      }
    }

    loadBoards()

    const handleBeforeUnload = () => {
      const currentState = useStore.getState()
      if (!currentState.hydrationComplete) return
      try {
        if (window.electronAPI) {
          window.electronAPI.saveBoards(currentState.boards, currentState.activeBoardId, currentState.standaloneTasks)
          window.electronAPI.saveDeletedTasks(currentState.deletedTasks)
          window.electronAPI.saveSettings(currentState.uiSettings)
        } else {
          localStorage.setItem('todo_boards', JSON.stringify({
            boards: currentState.boards,
            standaloneTasks: currentState.standaloneTasks,
            activeBoardId: currentState.activeBoardId,
          }))
          localStorage.setItem('todo_deletedTasks', JSON.stringify(currentState.deletedTasks))
          localStorage.setItem('todo_settings', JSON.stringify(currentState.uiSettings))
        }
      } catch (error) {
        console.error('[App] Error saving data:', error)
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (uiSettings.startView && ['boards', 'tasks', 'calendar', 'settings'].includes(uiSettings.startView)) {
      setActiveView(uiSettings.startView)
    }
  }, [uiSettings.startView])

  const onDragEnd = ({ active, over }) => {
    if (!over) return
    const sourceData = active.data.current
    const targetData = over.data.current
    if (!sourceData || sourceData.type !== 'task') return
    if (!targetData || targetData.type !== 'column') return
    moveTask(sourceData.boardId, sourceData.taskId, sourceData.columnId, targetData.columnId, undefined)
  }

  const openTaskCreateModal = (boardId = null, columnId = null) => {
    setTaskModalState({ open: true, boardId, columnId })
  }

  const handleCreateBoard = (name) => {
    createBoard(name)
    // The store creates default columns, but we could extend this to accept custom columns
    // For now, the board is created with defaults
  }

  return (
    <div
      className="flex h-screen w-screen overflow-hidden text-text-primary font-display antialiased"
      style={{
        background: 'var(--color-bg-base) radial-gradient(ellipse 70% 60% at 100% 0%, rgba(19, 55, 236, 0.07) 0%, transparent 65%)',
      }}
    >
      <div className="flex flex-1 min-w-0 overflow-hidden">
        {/* Icon sidebar */}
        <AppSidebar activeView={activeView} onChangeView={setActiveView} />

        {/* Board View */}
        {activeView === 'boards' && (
          <main className="flex-1 flex flex-col h-full min-w-0 relative overflow-hidden">
            {/* Header */}
            <header className="pt-8 pb-4 px-8 flex flex-col gap-6 shrink-0 z-30 relative">
              {/* Title row */}
              <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-white">Personal Boards</h1>
              </div>

              {/* Board Carousel */}
              <BoardCarousel onCreateBoard={() => setBoardModalOpen(true)} />

              {/* Search + Filter bar */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-4">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted h-4 w-4" />
                    <input
                      type="text"
                      placeholder="Search my tasks..."
                      value={boardTaskSearch}
                      onChange={(e) => setBoardTaskSearch(e.target.value)}
                      className="pl-10 pr-4 py-2 bg-card border-none rounded-lg text-sm text-white placeholder-text-muted focus:ring-2 focus:ring-primary w-64 shadow-sm outline-none"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="relative" ref={filterDropdownRef}>
                    <button
                      type="button"
                      onClick={() => { setSortDropdownOpen(false); setFilterDropdownOpen((o) => !o) }}
                      className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                        (boardTaskFilter.priority != null || boardTaskFilter.dueDateOnly)
                          ? 'text-primary bg-primary/10'
                          : 'text-text-muted hover:bg-surface-light'
                      }`}
                    >
                      <Filter className="h-4 w-4" />
                      Filter
                      <ChevronDown className={`h-4 w-4 transition-transform ${filterDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {filterDropdownOpen && (
                      <div className="absolute left-0 top-full mt-1 w-56 rounded-lg border border-border bg-card shadow-xl py-2 z-50">
                        <div className="px-3 py-1.5 text-xs font-semibold text-text-muted uppercase tracking-wider">Priority</div>
                        {[null, 'high', 'medium', 'low'].map((p) => {
                          const isSelected = boardTaskFilter.priority === p
                          return (
                            <button
                              key={p ?? 'all'}
                              type="button"
                              onClick={() => setBoardTaskFilter((f) => ({ ...f, priority: p }))}
                              className={`w-full px-3 py-2 text-left text-sm rounded-md mx-1 transition-colors duration-150 text-white ${
                                isSelected
                                  ? 'bg-primary/20 text-primary'
                                  : 'hover:bg-white/10'
                              }`}
                            >
                              {p == null ? 'All' : p.charAt(0).toUpperCase() + p.slice(1)}
                            </button>
                          )
                        })}
                        <div className="border-t border-border my-2" />
                        <label className={`flex items-center gap-2 px-3 py-2 text-sm rounded-md mx-1 cursor-pointer transition-colors duration-150 text-white ${
                          boardTaskFilter.dueDateOnly ? 'bg-primary/20 text-primary' : 'hover:bg-white/10'
                        }`}>
                          <input
                            type="checkbox"
                            checked={boardTaskFilter.dueDateOnly}
                            onChange={(e) => setBoardTaskFilter((f) => ({ ...f, dueDateOnly: e.target.checked }))}
                            className="rounded border-border bg-surface text-primary focus:ring-primary"
                          />
                          With due date only
                        </label>
                      </div>
                    )}
                  </div>
                  <div className="relative" ref={sortDropdownRef}>
                    <button
                      type="button"
                      onClick={() => { setFilterDropdownOpen(false); setSortDropdownOpen((o) => !o) }}
                      className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                        boardTaskSort.by !== 'none'
                          ? 'text-primary bg-primary/10'
                          : 'text-text-muted hover:bg-surface-light'
                      }`}
                    >
                      <SortAsc className="h-4 w-4" />
                      Sort
                      <ChevronDown className={`h-4 w-4 transition-transform ${sortDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {sortDropdownOpen && (
                      <div className="absolute right-0 top-full mt-1 w-48 rounded-lg border border-border bg-card shadow-xl py-2 z-50">
                        {[
                          { by: 'none', label: 'Default order' },
                          { by: 'name', dir: 'asc', label: 'Name A–Z' },
                          { by: 'name', dir: 'desc', label: 'Name Z–A' },
                          { by: 'newest', label: 'Newest first' },
                          { by: 'oldest', label: 'Oldest first' },
                          { by: 'dueDate', label: 'Due date' },
                          { by: 'priority', label: 'Priority' },
                        ].map((opt) => {
                          const isSelected = boardTaskSort.by === opt.by && (boardTaskSort.dir || 'asc') === (opt.dir || 'asc')
                          return (
                            <button
                              key={opt.label}
                              type="button"
                              onClick={() => setBoardTaskSort({ by: opt.by, dir: opt.dir || 'asc' })}
                              className={`w-full px-3 py-2 text-left text-sm rounded-md mx-1 transition-colors duration-150 text-white ${
                                isSelected
                                  ? 'bg-primary/20 text-primary'
                                  : 'hover:bg-white/10'
                              }`}
                            >
                              {opt.label}
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => openTaskCreateModal(activeBoard?.id || null, activeBoard?.columns[0]?.id || null)}
                    disabled={!activeBoard}
                    className="bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 shadow-lg shadow-primary/30 transition-all hover:scale-105 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Plus className="h-4 w-4" />
                    New Task
                  </button>
                </div>
              </div>
            </header>

            {/* Kanban Board */}
            <div className="flex-1 overflow-x-auto px-8 pb-8 custom-scrollbar z-0 relative">
              {!hydrationComplete ? (
                <div className="flex h-full items-center justify-center rounded-xl border border-border bg-surface/40 text-text-muted">
                  <div className="flex items-center gap-3">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    Loading workspace...
                  </div>
                </div>
              ) : (
                <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={onDragEnd}>
                  <KanbanBoard
                    board={activeBoard}
                    onCreateTask={openTaskCreateModal}
                    searchQuery={boardTaskSearch}
                    filter={boardTaskFilter}
                    sort={boardTaskSort}
                  />
                </DndContext>
              )}
            </div>
          </main>
        )}

        {/* Tasks View */}
        {activeView === 'tasks' && (
          <div className="flex-1 overflow-hidden">
            <TasksPage onCreateTask={openTaskCreateModal} />
          </div>
        )}

        {/* Calendar / Timeline View */}
        {activeView === 'calendar' && (
          <div className="flex flex-1 flex-col min-h-0 overflow-hidden">
            <CalendarPage onCreateTask={openTaskCreateModal} />
          </div>
        )}

        {/* Settings View */}
        {activeView === 'settings' && (
          <main className="flex-1 overflow-y-auto p-8 custom-scrollbar">
            <SettingsPage />
          </main>
        )}

        {/* Task Detail Modal (for board view) */}
        {selectedTask ? <TaskDetailModal /> : null}

        {/* Create Board Modal */}
        <CreateBoardModal
          open={boardModalOpen}
          onClose={() => setBoardModalOpen(false)}
          onCreate={handleCreateBoard}
        />

        {/* Create Task Modal */}
        <CreateTaskModal
          open={taskModalState.open}
          defaultBoardId={taskModalState.boardId}
          defaultColumnId={taskModalState.columnId}
          onClose={() => setTaskModalState({ open: false, boardId: null, columnId: null })}
        />
      </div>
    </div>
  )
}

export default App
