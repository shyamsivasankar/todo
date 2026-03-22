import { useEffect, useRef, useState } from 'react'
import {
  Bell,
  CalendarDays,
  CheckCircle2,
  Cpu,
  LayoutDashboard,
  Settings,
  Search,
  User,
  X,
  Zap,
} from 'lucide-react'
import { useStore } from '../../../store/useStore'
import CyberTooltip from '../../../components/ui/CyberTooltip'

const navItems = [
  { id: 'boards', label: 'Sectors', icon: LayoutDashboard, color: 'blue' },
  { id: 'tasks', label: 'Task List', icon: CheckCircle2, color: 'pink' },
  { id: 'calendar', label: 'Temporal Grid', icon: CalendarDays, color: 'violet' },
]

export default function AppSidebar({ activeView, onChangeView, onSearchClick }) {
  const {
    notifications,
    unreadCount,
    fetchNotifications,
    markNotificationRead,
    dismissNotification,
    openTaskDetail,
    boards,
    standaloneTasks,
  } = useStore()
  const [showNotifications, setShowNotifications] = useState(false)
  const popoverRef = useRef(null)

  useEffect(() => {
    fetchNotifications()

    if (window.electronAPI?.onNotificationUpdate) {
      const removeListener = window.electronAPI.onNotificationUpdate(() => {
        fetchNotifications()
      })
      return () => {
        if (typeof removeListener === 'function') {
          removeListener()
        }
      }
    }
  }, [fetchNotifications])

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target)) {
        setShowNotifications(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleNotificationClick = (notification) => {
    if (!notification) return
    markNotificationRead(notification.id)

    let foundBoardId = null
    let foundColumnId = null

    const isStandalone = (standaloneTasks || []).some((t) => t.id === notification.task_id)

    if (!isStandalone) {
      for (const board of boards || []) {
        for (const column of board.columns || []) {
          if ((column.tasks || []).some((t) => t.id === notification.task_id)) {
            foundBoardId = board.id
            foundColumnId = column.id
            break
          }
        }
        if (foundBoardId) break
      }
    }

    openTaskDetail(foundBoardId, foundColumnId, notification.task_id)
    setShowNotifications(false)
  }

  return (
    <aside className="fixed left-4 top-4 bottom-4 w-16 flex flex-col items-center py-6 gap-8 z-30 cyber-glass rounded-sm border-cyber-blue/30 shadow-neon-blue/20">
      {/* App logo */}
      <div className="flex h-10 w-10 items-center justify-center rounded-sm bg-cyber-blue/20 text-cyber-blue border border-cyber-blue shadow-neon-blue animate-glow-pulse">
        <Cpu className="h-6 w-6" />
      </div>

      {/* Main navigation */}
      <nav className="flex flex-1 flex-col items-center gap-6 w-full px-2">
        <CyberTooltip content="Global Search" position="right" variant="cyan">
          <button
            type="button"
            onClick={onSearchClick}
            className="flex h-10 w-10 items-center justify-center transition-all text-surface-variant hover:text-cyber-cyan hover:scale-110"
          >
            <Search className="h-6 w-6" />
          </button>
        </CyberTooltip>

        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = item.id === activeView
          const colorClass = item.color === 'blue' ? 'text-cyber-blue' : item.color === 'pink' ? 'text-cyber-pink' : 'text-cyber-violet'
          const glowClass = item.color === 'blue' ? 'shadow-neon-blue' : item.color === 'pink' ? 'shadow-neon-pink' : ''

          return (
            <CyberTooltip key={item.id} content={item.label} position="right" variant={item.color}>
              <button
                type="button"
                onClick={() => onChangeView(item.id)}
                className={`relative flex h-10 w-10 items-center justify-center transition-all ${
                  isActive
                    ? `${colorClass} ${glowClass} scale-110`
                    : 'text-surface-variant hover:text-white hover:scale-105'
                }`}
              >
                <Icon className="h-6 w-6" />
                {isActive && (
                  <div className={`absolute -left-2 w-1 h-6 ${item.color === 'blue' ? 'bg-cyber-blue' : item.color === 'pink' ? 'bg-cyber-pink' : 'bg-cyber-violet'}`} />
                )}
              </button>
            </CyberTooltip>
          )
        })}
      </nav>

      {/* Bottom section */}
      <div className="flex flex-col items-center gap-6 w-full px-2">
        {/* Notifications */}
        <div className="relative">
          <CyberTooltip content="Notifications" position="right" variant="amber">
            <button
              type="button"
              onClick={() => setShowNotifications(!showNotifications)}
              className={`relative flex h-10 w-10 items-center justify-center transition-all ${
                showNotifications
                  ? 'text-cyber-amber shadow-neon-blue'
                  : 'text-surface-variant hover:text-cyber-amber'
              }`}
            >
              <Bell className="h-6 w-6" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-sm bg-cyber-pink text-[8px] font-bold text-cyber-black shadow-neon-pink">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
          </CyberTooltip>

          {showNotifications && (
            <div
              ref={popoverRef}
              className="absolute bottom-0 left-16 z-[100] w-80 cyber-glass border-cyber-amber/50 p-0 shadow-2xl animate-in fade-in slide-in-from-left-2 duration-200"
            >
              <div className="flex items-center justify-between border-b border-cyber-amber/20 p-4 bg-cyber-amber/5">
                <h3 className="font-orbitron text-xs text-cyber-amber uppercase tracking-widest">System Notifications</h3>
                {unreadCount > 0 && (
                  <span className="text-[10px] text-cyber-pink animate-flicker">{unreadCount} Pending</span>
                )}
              </div>
              <div className="max-h-[400px] overflow-y-auto p-2 custom-scrollbar">
                {notifications.length === 0 ? (
                  <div className="py-8 text-center font-mono text-xs text-surface-variant uppercase tracking-tighter">
                    - No active signals -
                  </div>
                ) : (
                  <div className="flex flex-col gap-1">
                    {notifications.map((n) => (
                      <div
                        key={n.id}
                        className={`group/item relative flex flex-col gap-1 rounded-sm p-3 text-left transition-colors hover:bg-white/5 border border-transparent hover:border-white/10 ${
                          !n.is_read ? 'bg-cyber-blue/5 border-l-cyber-blue' : ''
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => handleNotificationClick(n)}
                          className="flex flex-col gap-1 text-left w-full pr-6"
                        >
                          <span className={`text-xs font-mono truncate ${!n.is_read ? 'text-cyber-blue' : 'text-surface-variant'}`}>
                            [{n.task_title}]
                          </span>
                          <p className="text-[10px] text-surface-variant uppercase opacity-70">
                            {n.trigger_type} Signal Detected
                          </p>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            dismissNotification(n.id)
                          }}
                          className="absolute right-2 top-3 p-1 rounded-sm text-surface-variant opacity-0 group-hover/item:opacity-100 hover:text-cyber-pink transition-all"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <CyberTooltip content="Settings" position="right" variant="cyan">
          <button
            type="button"
            onClick={() => onChangeView('settings')}
            className={`relative flex h-10 w-10 items-center justify-center transition-all ${
              activeView === 'settings'
                ? 'text-cyber-cyan shadow-neon-cyan scale-110'
                : 'text-surface-variant hover:text-cyber-cyan'
            }`}
          >
            <Settings className="h-6 w-6" />
          </button>
        </CyberTooltip>

        <CyberTooltip content="User Profile" position="right" variant="blue">
          <div className="flex h-10 w-10 items-center justify-center rounded-sm bg-surface-low border border-surface-high text-surface-variant hover:text-cyber-blue hover:border-cyber-blue cursor-pointer transition-all">
            <User className="h-5 w-5" />
          </div>
        </CyberTooltip>
      </div>
    </aside>
  )
}
