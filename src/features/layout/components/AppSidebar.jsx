import {
  CalendarDays,
  CheckCircle2,
  HardDrive,
  LayoutDashboard,
  Settings,
  User,
} from 'lucide-react'

const navItems = [
  { id: 'boards', label: 'Boards', icon: LayoutDashboard },
  { id: 'tasks', label: 'My Tasks', icon: CheckCircle2 },
  { id: 'calendar', label: 'Calendar', icon: CalendarDays },
]

export default function AppSidebar({ activeView, onChangeView }) {
  return (
    <aside className="flex w-[70px] shrink-0 flex-col items-center border-r border-border bg-surface py-6 gap-8 z-20 shadow-lg">
      {/* App logo */}
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-white shadow-glow">
        <HardDrive className="h-5 w-5" />
      </div>

      {/* Main navigation */}
      <nav className="flex flex-1 flex-col items-center gap-3 w-full px-2">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = item.id === activeView
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => !item.disabled && onChangeView(item.id)}
              disabled={item.disabled}
              className={`group relative flex h-12 w-12 items-center justify-center rounded-lg transition-all ${
                isActive
                  ? 'bg-primary/10 text-primary'
                  : item.disabled
                    ? 'text-text-muted/40 cursor-not-allowed'
                    : 'text-text-muted hover:bg-surface-light hover:text-primary'
              }`}
              title={item.label}
            >
              <Icon className="h-6 w-6" />
              {/* Tooltip */}
              <div className="absolute left-14 z-50 whitespace-nowrap rounded bg-surface-light px-2 py-1 text-xs text-white opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity shadow-lg border border-border">
                {item.label}
              </div>
            </button>
          )
        })}
      </nav>

      {/* Bottom section */}
      <div className="flex flex-col items-center gap-4 w-full px-2">
        <button
          type="button"
          onClick={() => onChangeView('settings')}
          className={`group relative flex h-12 w-12 items-center justify-center rounded-lg transition-all ${
            activeView === 'settings'
              ? 'bg-primary/10 text-primary'
              : 'text-text-muted hover:bg-surface-light hover:text-primary'
          }`}
          title="Settings"
        >
          <Settings className="h-6 w-6" />
          <div className="absolute left-14 z-50 whitespace-nowrap rounded bg-surface-light px-2 py-1 text-xs text-white opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity shadow-lg border border-border">
            Settings
          </div>
        </button>
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-light text-text-muted hover:text-text-secondary cursor-pointer transition-colors">
          <User className="h-5 w-5" />
        </div>
      </div>
    </aside>
  )
}
