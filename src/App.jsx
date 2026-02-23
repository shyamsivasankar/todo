import { DndContext, DragOverlay, PointerSensor, closestCorners, useSensor, useSensors } from '@dnd-kit/core'
import { ChevronDown, ChevronUp, Filter, Plus, Search, SortAsc } from 'lucide-react'
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import BoardCarousel from './features/boards/components/BoardCarousel'
import AppSidebar from './features/layout/components/AppSidebar'
import LoadingFallback from './components/LoadingFallback'
import { attachBoardPersistence, useStore } from './store/useStore'
import TaskCard from './features/tasks/components/TaskCard'

// Lazy-loaded views
const KanbanBoard = lazy(() => import('./features/boards/components/KanbanBoard'))
const TasksPage = lazy(() => import('./features/tasks/pages/TasksPage'))
const CalendarPage = lazy(() => import('./features/calendar/pages/CalendarPage'))
const SettingsPage = lazy(() => import('./features/settings/pages/SettingsPage'))

// Lazy-loaded modals
const CreateBoardModal = lazy(() => import('./features/boards/components/CreateBoardModal'))
const EditBoardModal = lazy(() => import('./features/boards/components/EditBoardModal'))
const CreateTaskModal = lazy(() => import('./features/tasks/components/CreateTaskModal'))
const TaskDetailModal = lazy(() => import('./features/tasks/components/TaskDetailModal'))

function App() {
  const boards = useStore((state) => state.boards)
  const activeBoardId = useStore((state) => state.activeBoardId)
  const createBoard = useStore((state) => state.createBoard)
  const renameBoard = useStore((state) => state.renameBoard)
  const uiSettings = useStore((state) => state.uiSettings)
  const updateSettings = useStore((state) => state.updateSettings)
  const hydrateBoards = useStore((state) => state.hydrateBoards)
  const hydrateDeletedTasks = useStore((state) => state.hydrateDeletedTasks)
  const hydrateSettings = useStore((state) => state.hydrateSettings)
  const hydrationComplete = useStore((state) => state.hydrationComplete)
  const moveTask = useStore((state) => state.moveTask)
  const openTaskDetail = useStore((state) => state.openTaskDetail)
  const selectedTask = useStore((state) => state.selectedTask)
  const standaloneTasks = useStore((state) => state.standaloneTasks)

  const [activeView, setActiveView] = useState('boards')
  const [boardModalOpen, setBoardModalOpen] = useState(false)
  const [boardToEdit, setBoardToEdit] = useState(null)
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
  const [activeId, setActiveId] = useState(null)
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

  const activeTask = useMemo(() => {
    if (!activeId) return null
    for (const b of boards) {
      for (const col of b.columns) {
        const t = col.tasks.find((task) => task.id === activeId)
        if (t) return { task: t, boardId: b.id, columnId: col.id }
      }
    }
    const t = standaloneTasks.find((task) => task.id === activeId)
    if (t) return { task: t, boardId: null, columnId: null }
    return null
  }, [activeId, boards, standaloneTasks])

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

  const onDragStart = ({ active }) => {
    setActiveId(active.id)
  }

  const onDragEnd = ({ active, over }) => {
    setActiveId(null)
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

  const handleCreateBoard = (name, columnTitles) => {
    createBoard(name, columnTitles)
  }

  return (
    <div
      className="flex h-screen w-screen overflow-hidden text-text-primary font-display antialiased"
      style={{
        background: 'radial-gradient(circle at 0% 0%, #1a1b26 0%, transparent 50%), radial-gradient(circle at 100% 0%, rgba(88, 28, 135, 0.15) 0%, transparent 50%), radial-gradient(circle at 100% 100%, rgba(19, 55, 236, 0.15) 0%, transparent 50%), var(--color-bg-base)',
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
              {/* Board switcher: full carousel + handle, or single-line breadcrumb when collapsed */}
              {uiSettings.boardSwitcherExpanded !== false ? (
                <>
                  <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold text-white">Personal Boards</h1>
                  </div>
                  <BoardCarousel
                    onCreateBoard={() => setBoardModalOpen(true)}
                    onEditBoard={(board) => setBoardToEdit(board)}
                  />
                  <div className="flex items-center w-full -mb-1">
                    <span className="flex-1 border-t border-border" aria-hidden />
                    <button
                      type="button"
                      onClick={() => updateSettings({ boardSwitcherExpanded: false })}
                      className="shrink-0 p-1.5 rounded-lg text-text-muted hover:text-primary hover:bg-white/5 transition-colors"
                      title="Collapse board switcher"
                    >
                      <ChevronUp className="h-4 w-4" />
                    </button>
                    <span className="flex-1 border-t border-border" aria-hidden />
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-between border-b border-border pb-4">
                  <span className="text-sm text-text-muted truncate min-w-0">
                    <span className="text-text-muted">Personal Boards</span>
                    <span className="mx-1.5 text-border">›</span>
                    <span className="text-white font-medium">{activeBoard?.name ?? 'No board selected'}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => updateSettings({ boardSwitcherExpanded: true })}
                    className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg text-text-muted hover:bg-surface-light hover:text-primary transition-colors shrink-0"
                    title="Expand board switcher"
                  >
                    Boards
                    <ChevronDown className="h-4 w-4" />
                  </button>
                </div>
              )}

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
                <LoadingFallback message="Loading workspace..." />
              ) : (
                <DndContext 
                  sensors={sensors} 
                  collisionDetection={closestCorners} 
                  onDragStart={onDragStart}
                  onDragEnd={onDragEnd}
                >
                  <Suspense fallback={<LoadingFallback message="Loading board..." />}>
                    <KanbanBoard
                      board={activeBoard}
                      onCreateTask={openTaskCreateModal}
                      searchQuery={boardTaskSearch}
                      filter={boardTaskFilter}
                      sort={boardTaskSort}
                    />
                  </Suspense>
                  <DragOverlay adjustScale={false}>
                    {activeId && activeTask ? (
                      <div className="z-[100] w-[274px] pointer-events-none shadow-2xl ring-2 ring-primary/50 rounded-lg overflow-hidden transition-none">
                        <TaskCard
                          task={activeTask.task}
                          boardId={activeTask.boardId}
                          columnId={activeTask.columnId}
                          isOverlay={true}
                          onOpen={() => openTaskDetail(activeTask.boardId, activeTask.columnId, activeTask.task.id)}
                        />
                      </div>
                    ) : null}
                  </DragOverlay>
                </DndContext>
              )}
            </div>
          </main>
        )}

        {/* Tasks View */}
        {activeView === 'tasks' && (
          <div className="flex-1 overflow-hidden">
            <Suspense fallback={<LoadingFallback message="Loading tasks..." />}>
              <TasksPage onCreateTask={openTaskCreateModal} />
            </Suspense>
          </div>
        )}

        {/* Calendar / Timeline View */}
        {activeView === 'calendar' && (
          <div className="flex flex-1 flex-col min-h-0 overflow-hidden">
            <Suspense fallback={<LoadingFallback message="Loading calendar..." />}>
              <CalendarPage onCreateTask={openTaskCreateModal} />
            </Suspense>
          </div>
        )}

        {/* Settings View */}
        {activeView === 'settings' && (
          <main className="flex-1 overflow-y-auto p-8 custom-scrollbar">
            <Suspense fallback={<LoadingFallback message="Loading settings..." />}>
              <SettingsPage />
            </Suspense>
          </main>
        )}

        {/* Task Detail Modal (lazy loaded only when needed) */}
        {selectedTask && (
          <Suspense fallback={null}>
            <TaskDetailModal />
          </Suspense>
        )}

        {/* Create Board Modal */}
        {boardModalOpen && (
          <Suspense fallback={null}>
            <CreateBoardModal
              open={boardModalOpen}
              onClose={() => setBoardModalOpen(false)}
              onCreate={handleCreateBoard}
            />
          </Suspense>
        )}

        {/* Edit Board Modal */}
        {boardToEdit && (
          <Suspense fallback={null}>
            <EditBoardModal
              open={!!boardToEdit}
              board={boardToEdit}
              onClose={() => setBoardToEdit(null)}
              onSave={(boardId, name) => {
                renameBoard(boardId, name)
                setBoardToEdit(null)
              }}
            />
          </Suspense>
        )}

        {/* Create Task Modal */}
        {taskModalState.open && (
          <Suspense fallback={null}>
            <CreateTaskModal
              open={taskModalState.open}
              defaultBoardId={taskModalState.boardId}
              defaultColumnId={taskModalState.columnId}
              onClose={() => setTaskModalState({ open: false, boardId: null, columnId: null })}
            />
          </Suspense>
        )}
      </div>
    </div>
  )
}

export default App