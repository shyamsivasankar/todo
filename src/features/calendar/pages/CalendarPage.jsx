import { LayoutDashboard, Plus } from 'lucide-react'
import { useState } from 'react'
import { useStore } from '../../../store/useStore'
import CalendarTimelineView from '../components/CalendarTimelineView'
import GanttTimelineView from '../components/GanttTimelineView'

const TABS = [
  { id: 'calendar', label: 'Calendar' },
  { id: 'timeline', label: 'Timeline' },
]

const PRIORITY_OPTIONS = [
  { value: null, label: 'All' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Med' },
  { value: 'low', label: 'Low' },
]

export default function CalendarPage({ onCreateTask }) {
  const [activeTab, setActiveTab] = useState('calendar')
  const [priorityFilter, setPriorityFilter] = useState(null)
  const boards = useStore((state) => state.boards)
  const activeBoardId = useStore((state) => state.activeBoardId)

  return (
    <main className="flex flex-1 flex-col min-h-0 overflow-hidden">
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-surface px-6 z-10">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold tracking-tight text-white">
            Manager Overview
          </h1>
          <div className="h-6 w-px bg-border" />
          <nav className="flex items-center gap-1 text-sm font-medium">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1.5 transition-colors ${
                  activeTab === tab.id
                    ? 'border-b-2 border-primary text-white'
                    : 'text-text-muted hover:text-primary'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-lg border border-border bg-bg-base px-3 py-1.5 text-sm font-medium text-text-secondary">
            <LayoutDashboard className="h-4 w-4 text-text-muted" />
            <span>
              {boards.find((b) => b.id === activeBoardId)?.name ?? 'All Boards'}
            </span>
          </div>
          <div className="flex rounded-lg border border-border bg-bg-base p-1">
            {PRIORITY_OPTIONS.map((opt) => (
              <button
                key={opt.label}
                type="button"
                onClick={() => setPriorityFilter(opt.value)}
                className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
                  priorityFilter === opt.value
                    ? 'bg-primary text-white'
                    : 'text-text-muted hover:text-white'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => onCreateTask(activeBoardId ?? null, boards[0]?.columns?.[0]?.id ?? null)}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-1.5 text-sm font-medium text-white shadow-lg shadow-primary/20 transition-colors hover:bg-primary-dark"
          >
            <Plus className="h-4 w-4" />
            New Task
          </button>
        </div>
      </header>
      {activeTab === 'calendar' && (
        <CalendarTimelineView
          onCreateTask={onCreateTask}
          priorityFilter={priorityFilter}
        />
      )}
      {activeTab === 'timeline' && (
        <GanttTimelineView priorityFilter={priorityFilter} />
      )}
    </main>
  )
}
