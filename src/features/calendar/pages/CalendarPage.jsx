import { LayoutDashboard, Plus, Calendar, Activity, Zap } from 'lucide-react'
import { useState } from 'react'
import { useStore } from '../../../store/useStore'
import CalendarTimelineView from '../components/CalendarTimelineView'
import GanttTimelineView from '../components/GanttTimelineView'
import CyberButton from '../../../components/ui/CyberButton'
import CyberBadge from '../../../components/ui/CyberBadge'

const TABS = [
  { id: 'calendar', label: 'Temporal_Grid' },
  { id: 'timeline', label: 'Flow_Sequencer' },
]

const PRIORITY_OPTIONS = [
  { value: null, label: 'ALL_NODES' },
  { value: 'high', label: 'CRITICAL' },
  { value: 'medium', label: 'ACTIVE' },
  { value: 'low', label: 'STABLE' },
]

export default function CalendarPage({ onCreateTask }) {
  const [activeTab, setActiveTab] = useState('calendar')
  const [priorityFilter, setPriorityFilter] = useState(null)
  const boards = useStore((state) => state.boards)
  const activeBoardId = useStore((state) => state.activeBoardId)

  return (
    <main className="flex flex-1 flex-col min-h-0 overflow-hidden">
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-cyber-blue/20 bg-surface-high/50 px-6 z-10 backdrop-blur-md">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <Calendar className="h-5 w-5 text-cyber-blue animate-pulse" />
            <h1 className="font-orbitron text-sm font-black uppercase tracking-[0.3em] text-white text-nowrap">
              Chrono <span className="text-cyber-blue">Overview</span>
            </h1>
          </div>
          
          <nav className="flex items-center gap-4 border-l border-white/10 pl-6">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`font-orbitron text-[10px] uppercase tracking-widest transition-all ${
                  activeTab === tab.id
                    ? 'text-cyber-blue shadow-neon-blue/20 border-b-2 border-cyber-blue pb-1'
                    : 'text-surface-variant hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <CyberBadge variant="blue" size="sm" icon={Activity}>
            {boards.find((b) => b.id === activeBoardId)?.name.toUpperCase() ?? 'ALL_MATRIX_ZONES'}
          </CyberBadge>

          <div className="flex border border-white/5 bg-surface-low p-1 rounded-sm">
            {PRIORITY_OPTIONS.map((opt) => (
              <button
                key={opt.label}
                type="button"
                onClick={() => setPriorityFilter(opt.value)}
                className={`px-3 py-1 font-orbitron text-[9px] uppercase tracking-tighter transition-all rounded-sm ${
                  priorityFilter === opt.value
                    ? 'bg-cyber-blue text-cyber-black font-bold shadow-neon-blue'
                    : 'text-surface-variant hover:text-white'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <CyberButton
            variant="lime"
            size="sm"
            icon={Plus}
            onClick={() => onCreateTask(activeBoardId ?? null, boards[0]?.columns?.[0]?.id ?? null)}
          >
            INIT_SEQUENCE
          </CyberButton>
        </div>
      </header>
      
      <div className="flex-1 overflow-hidden relative">
        <div className="absolute inset-0 pointer-events-none opacity-5">
          <div className="cyber-grid" />
        </div>
        
        {activeTab === 'calendar' && (
          <CalendarTimelineView
            onCreateTask={onCreateTask}
            priorityFilter={priorityFilter}
          />
        )}
        {activeTab === 'timeline' && (
          <GanttTimelineView priorityFilter={priorityFilter} />
        )}
      </div>
    </main>
  )
}
