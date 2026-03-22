import { DndContext, DragOverlay, PointerSensor, closestCorners, useSensor, useSensors } from '@dnd-kit/core'
import { ChevronDown, ChevronUp, Filter, Plus, Search, SortAsc, Zap, Activity } from 'lucide-react'
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import BoardCarousel from './features/boards/components/BoardCarousel'
import AppSidebar from './features/layout/components/AppSidebar'
import LoadingFallback from './components/shared/LoadingFallback'
import { attachBoardPersistence, useStore } from './store/useStore'
import TaskCard from './features/tasks/components/TaskCard'
import GlobalSearch from './features/search/components/GlobalSearch'
import CyberButton from './components/ui/CyberButton'
import CyberCard from './components/ui/CyberCard'
import CyberBadge from './components/ui/CyberBadge'
import CyberTooltip from './components/ui/CyberTooltip'
import CyberInput from './components/ui/CyberInput'

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
  const activeView = useStore((state) => state.activeView)
  const setActiveView = useStore((state) => state.setActiveView)

  const [boardModalOpen, setBoardModalOpen] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
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

  useEffect(() => {
    const handleKeyDown = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key === "k") {
        event.preventDefault()
        setIsSearchOpen((isOpen) => !isOpen)
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
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
    if (hasLoadedRef.current) {
      const currentState = useStore.getState()
      const needsReload = !currentState.hydrationComplete ||
        (currentState.boards.length === 0 && window.electronAPI)
      if (!needsReload) return
    }
    hasLoadedRef.current = true

    const loadBoards = async () => {
      try {
        let boardsData = { boards: [], activeBoardId: null, standaloneTasks: [], notes: [] }
        let diskDeletedTasks = []
        let diskSettings = {}

        if (window.electronAPI) {
          const electronBoards = await window.electronAPI.getBoards?.()
          boardsData = electronBoards || { boards: [], activeBoardId: null, standaloneTasks: [], notes: [] }
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
        const diskNotes = boardsData.notes || []
        const savedActiveBoardId = boardsData.activeBoardId || null

        const currentState = useStore.getState()
        const shouldHydrate = !currentState.hydrationComplete ||
          (currentState.boards.length === 0 && diskBoards.length > 0)

        if (shouldHydrate) {
          hydrateBoards(diskBoards, savedActiveBoardId || diskSettings?.activeBoardId, diskStandaloneTasks, diskNotes)
          hydrateDeletedTasks(diskDeletedTasks)
          hydrateSettings(diskSettings)
        }

        attachBoardPersistence()
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
  }, [hydrateBoards, hydrateDeletedTasks, hydrateSettings])

  useEffect(() => {
    if (uiSettings.startView && ['boards', 'tasks', 'calendar', 'settings'].includes(uiSettings.startView)) {
      setActiveView(uiSettings.startView)
    }
  }, [uiSettings.startView, setActiveView])

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
    <div className="flex h-screen w-screen overflow-hidden text-[#f9f5fd] font-mono antialiased bg-[#0a0a0f]">
      {/* Background Grid */}
      <div className="cyber-grid" />
      
      <div className="flex flex-1 min-w-0 overflow-hidden relative z-10">
        {/* Icon sidebar */}
        <AppSidebar activeView={activeView} onChangeView={setActiveView} onSearchClick={() => setIsSearchOpen(true)} />
        <GlobalSearch isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />

        <div className="flex-1 flex flex-col min-w-0 ml-24 mr-4 my-4">
          {/* Main Container */}
          <div className="flex-1 flex flex-col min-h-0 relative overflow-hidden">
            
            {/* Board View */}
            {activeView === 'boards' && (
              <main className="flex-1 flex flex-col h-full min-w-0">
                {/* Header */}
                <header className="pt-4 pb-4 px-4 flex flex-col gap-6 shrink-0 relative">
                  {/* Top Bar Stats */}
                  <div className="flex items-center gap-6 text-[10px] font-orbitron text-cyber-blue opacity-80 uppercase tracking-widest border-b border-cyber-blue/20 pb-3">
                    <div className="flex items-center gap-2"><Activity className="h-3 w-3" /> Core Status: <span className="text-cyber-lime">Optimal</span></div>
                    <div className="flex items-center gap-2"><Zap className="h-3 w-3" /> Neural Uplink: <span className="text-cyber-blue">Active</span></div>
                    <div className="ml-auto flex gap-4">
                      <CyberBadge variant="blue" size="xs">Sector: 0xMatrix</CyberBadge>
                      <span>Cycle: 2026.03.22</span>
                    </div>
                  </div>

                  {uiSettings.boardSwitcherExpanded !== false ? (
                    <>
                      <div className="flex items-center justify-between mt-2">
                        <h1 className="text-2xl font-orbitron font-black text-white uppercase tracking-tighter">
                          System <span className="text-cyber-blue animate-flicker">Matrix</span>
                        </h1>
                      </div>
                      <BoardCarousel
                        onCreateBoard={() => setBoardModalOpen(true)}
                        onEditBoard={(board) => setBoardToEdit(board)}
                      />
                      <div className="flex items-center w-full -mb-1">
                        <span className="flex-1 border-t border-cyber-blue/20" aria-hidden />
                        <CyberTooltip content="Minimize Matrix" variant="blue">
                          <button
                            type="button"
                            onClick={() => updateSettings({ boardSwitcherExpanded: false })}
                            className="shrink-0 p-1.5 text-cyber-blue/50 hover:text-cyber-blue transition-colors"
                          >
                            <ChevronUp className="h-4 w-4" />
                          </button>
                        </CyberTooltip>
                        <span className="flex-1 border-t border-cyber-blue/20" aria-hidden />
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center justify-between border-b border-cyber-blue/20 pb-4 mt-2">
                      <div className="flex items-center gap-2">
                        <CyberBadge variant="blue" size="sm">SYSTEM_NODES</CyberBadge>
                        <span className="text-xs font-orbitron uppercase tracking-widest min-w-0">
                          <span className="mx-2 text-cyber-blue opacity-50">/</span>
                          <span className="text-cyber-blue font-bold">{activeBoard?.name ?? 'Null Selection'}</span>
                        </span>
                      </div>
                      <CyberButton
                        variant="blue"
                        size="xs"
                        onClick={() => updateSettings({ boardSwitcherExpanded: true })}
                      >
                        Expand Matrix
                      </CyberButton>
                    </div>
                  )}

                  {/* Search + Filter bar */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-cyber-blue/10 pb-4">
                    <div className="flex items-center gap-3">
                      <CyberInput
                        placeholder="SCAN SYSTEM DATA..."
                        value={boardTaskSearch}
                        onChange={(e) => setBoardTaskSearch(e.target.value)}
                        icon={Search}
                        className="!w-64"
                      />
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="relative" ref={filterDropdownRef}>
                        <CyberButton
                          variant={(boardTaskFilter.priority != null || boardTaskFilter.dueDateOnly) ? 'pink' : 'blue'}
                          size="sm"
                          outline
                          icon={Filter}
                          onClick={() => { setSortDropdownOpen(false); setFilterDropdownOpen((o) => !o) }}
                        >
                          Filter
                          <ChevronDown className={`h-3 w-3 transition-transform ${filterDropdownOpen ? 'rotate-180' : ''}`} />
                        </CyberButton>
                        {filterDropdownOpen && (
                          <div className="absolute left-0 top-full mt-2 w-56 z-50">
                            <CyberCard variant="pink" padding="p-2" className="bg-surface-high shadow-2xl">
                              <div className="px-3 py-1.5 text-[10px] font-orbitron text-cyber-pink uppercase tracking-widest opacity-70">Priority Level</div>
                              {[null, 'high', 'medium', 'low'].map((p) => {
                                const isSelected = boardTaskFilter.priority === p
                                return (
                                  <button
                                    key={p ?? 'all'}
                                    type="button"
                                    onClick={() => setBoardTaskFilter((f) => ({ ...f, priority: p }))}
                                    className={`w-full px-3 py-2 text-left text-xs font-mono transition-colors duration-150 rounded-sm ${
                                      isSelected
                                        ? 'text-cyber-pink bg-cyber-pink/10'
                                        : 'text-white hover:bg-white/5'
                                    }`}
                                  >
                                    {p == null ? '> ALL_DATA' : `> ${p.toUpperCase()}`}
                                  </button>
                                )
                              })}
                            </CyberCard>
                          </div>
                        )}
                      </div>
                      <div className="relative" ref={sortDropdownRef}>
                        <CyberButton
                          variant={boardTaskSort.by !== 'none' ? 'cyan' : 'blue'}
                          size="sm"
                          outline
                          icon={SortAsc}
                          onClick={() => { setFilterDropdownOpen(false); setSortDropdownOpen((o) => !o) }}
                        >
                          Sort
                          <ChevronDown className={`h-3 w-3 transition-transform ${sortDropdownOpen ? 'rotate-180' : ''}`} />
                        </CyberButton>
                        {sortDropdownOpen && (
                          <div className="absolute right-0 top-full mt-2 w-48 z-50">
                            <CyberCard variant="cyan" padding="p-2" className="bg-surface-high shadow-2xl">
                              {[
                                { by: 'none', label: 'DEFAULT_FLOW' },
                                { by: 'name', dir: 'asc', label: 'ID_ALPHA_ASC' },
                                { by: 'name', dir: 'desc', label: 'ID_ALPHA_DESC' },
                                { by: 'newest', label: 'TIMESTAMP_NEW' },
                                { by: 'oldest', label: 'TIMESTAMP_OLD' },
                              ].map((opt) => {
                                const isSelected = boardTaskSort.by === opt.by && (boardTaskSort.dir || 'asc') === (opt.dir || 'asc')
                                return (
                                  <button
                                    key={opt.label}
                                    type="button"
                                    onClick={() => setBoardTaskSort({ by: opt.by, dir: opt.dir || 'asc' })}
                                    className={`w-full px-3 py-2 text-left text-xs font-mono transition-colors duration-150 rounded-sm ${
                                      isSelected
                                        ? 'text-cyber-cyan bg-cyber-cyan/10'
                                        : 'text-white hover:bg-white/5'
                                    }`}
                                  >
                                    {`> ${opt.label}`}
                                  </button>
                                )
                              })}
                            </CyberCard>
                          </div>
                        )}
                      </div>
                      <CyberButton
                        variant="lime"
                        size="sm"
                        icon={Plus}
                        onClick={() => openTaskCreateModal(activeBoard?.id || null, activeBoard?.columns[0]?.id || null)}
                        disabled={!activeBoard}
                      >
                        INIT_TASK
                      </CyberButton>
                    </div>
                  </div>
                </header>

                {/* Kanban Board */}
                <div className="flex-1 overflow-x-auto px-4 pb-4 custom-scrollbar relative">
                  {!hydrationComplete ? (
                    <LoadingFallback message="Initializing neural pathways..." />
                  ) : (
                    <DndContext 
                      sensors={sensors} 
                      collisionDetection={closestCorners} 
                      onDragStart={onDragStart}
                      onDragEnd={onDragEnd}
                    >
                      <Suspense fallback={<LoadingFallback message="Loading Matrix..." />}>
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
                          <div className="z-[100] w-[274px] pointer-events-none shadow-neon-blue ring-1 ring-cyber-blue rounded-sm overflow-hidden transition-none">
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
                <Suspense fallback={<LoadingFallback message="Accessing task sub-routines..." />}>
                  <TasksPage onCreateTask={openTaskCreateModal} />
                </Suspense>
              </div>
            )}

            {/* Calendar / Timeline View */}
            {activeView === 'calendar' && (
              <div className="flex flex-1 flex-col min-h-0 overflow-hidden">
                <Suspense fallback={<LoadingFallback message="Syncing timeline data..." />}>
                  <CalendarPage onCreateTask={openTaskCreateModal} />
                </Suspense>
              </div>
            )}

            {/* Settings View */}
            {activeView === 'settings' && (
              <main className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                <Suspense fallback={<LoadingFallback message="Decrypting system settings..." />}>
                  <SettingsPage />
                </Suspense>
              </main>
            )}
          </div>
        </div>

        {/* Modals & Overlays */}
        <Suspense fallback={null}>
          {selectedTask && (
            <TaskDetailModal key={`${selectedTask.boardId}-${selectedTask.columnId}-${selectedTask.taskId}`} />
          )}
          {boardModalOpen && (
            <CreateBoardModal
              open={boardModalOpen}
              onClose={() => setBoardModalOpen(false)}
              onCreate={handleCreateBoard}
            />
          )}
          {boardToEdit && (
            <EditBoardModal
              open={!!boardToEdit}
              board={boardToEdit}
              onClose={() => setBoardToEdit(null)}
              onSave={(boardId, name) => {
                renameBoard(boardId, name)
                setBoardToEdit(null)
              }}
            />
          )}
          {taskModalState.open && (
            <CreateTaskModal
              open={taskModalState.open}
              defaultBoardId={taskModalState.boardId}
              defaultColumnId={taskModalState.columnId}
              onClose={() => setTaskModalState({ open: false, boardId: null, columnId: null })}
            />
          )}
        </Suspense>
      </div>
    </div>
  )
}

export default App;
