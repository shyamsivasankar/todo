import { useEffect, useRef, useState } from 'react'
import {
  Bell,
  CalendarDays,
  CheckCircle2,
  HardDrive,
  LayoutDashboard,
  Settings,
  StickyNote,
  User,
  X,
} from 'lucide-react'
import { useStore } from '../../../store/useStore'

const navItems = [
  { id: 'boards', label: 'Boards', icon: LayoutDashboard },
  { id: 'tasks', label: 'My Tasks', icon: CheckCircle2 },
  { id: 'calendar', label: 'Calendar', icon: CalendarDays },
  { id: 'notes', label: 'Notes', icon: StickyNote },
]

export default function AppSidebar({ activeView, onChangeView }) {
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

    // Find task location to open detail
    let foundBoardId = null
    let foundColumnId = null

    // Check standalone tasks
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

  const formatTriggerType = (type) => {
    switch (type) {
      case '15m':
        return 'Due in 15 minutes'
      case '1h':
        return 'Due in 1 hour'
      case '24h':
        return 'Due in 24 hours'
      default:
        return 'Task Reminder'
    }
  }

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
      <div className="flex flex-col items-center gap-4 w-full px-2 relative">
        {/* Notifications */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowNotifications(!showNotifications)}
            className={`group relative flex h-12 w-12 items-center justify-center rounded-lg transition-all ${
              showNotifications
                ? 'bg-primary/10 text-primary'
                : 'text-text-muted hover:bg-surface-light hover:text-primary'
            }`}
            title="Notifications"
          >
            <Bell className="h-6 w-6" />
            {unreadCount > 0 && (
              <span className="absolute top-2 right-2 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-surface">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
            <div className="absolute left-14 z-50 whitespace-nowrap rounded bg-surface-light px-2 py-1 text-xs text-white opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity shadow-lg border border-border">
              Notifications
            </div>
          </button>

          {showNotifications && (
            <div
              ref={popoverRef}
              className="absolute bottom-0 left-16 z-[100] w-80 rounded-xl border border-border bg-surface shadow-2xl animate-in fade-in slide-in-from-left-2 duration-200"
            >
              <div className="flex items-center justify-between border-b border-border p-4">
                <h3 className="font-semibold text-text-primary">Notifications</h3>
                {unreadCount > 0 && (
                  <span className="text-xs text-text-muted">{unreadCount} unread</span>
                )}
              </div>
              <div className="max-h-[400px] overflow-y-auto p-2 custom-scrollbar">
                {notifications.length === 0 ? (
                  <div className="py-8 text-center text-sm text-text-muted">
                    No notifications yet
                  </div>
                ) : (
                  <div className="flex flex-col gap-1">
                    {notifications.map((n) => (
                      <div
                        key={n.id}
                        className={`group/item relative flex flex-col gap-1 rounded-lg p-3 text-left transition-colors hover:bg-surface-light ${
                          !n.is_read ? 'bg-primary/5' : ''
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => handleNotificationClick(n)}
                          className="flex flex-col gap-1 text-left w-full pr-6"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span
                              className={`text-sm font-medium truncate ${!n.is_read ? 'text-text-primary' : 'text-text-secondary'}`}
                            >
                              {n.task_title}
                            </span>
                            {!n.is_read && (
                              <div className="h-2 w-2 shrink-0 rounded-full bg-primary" />
                            )}
                          </div>
                          <p className="text-xs text-text-muted">
                            {formatTriggerType(n.trigger_type)}
                          </p>
                          <span className="text-[10px] text-text-muted/60">
                            {new Date(n.sent_at).toLocaleString()}
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            dismissNotification(n.id)
                          }}
                          className="absolute right-2 top-3 p-1 rounded-md text-text-muted opacity-0 group-hover/item:opacity-100 hover:bg-surface hover:text-white transition-all"
                          title="Dismiss"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

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
