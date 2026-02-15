import { HardDrive, Monitor, Settings } from 'lucide-react'
import { useStore } from '../../../store/useStore'

export default function SettingsPage() {
  const uiSettings = useStore((state) => state.uiSettings)
  const updateSettings = useStore((state) => state.updateSettings)

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            <Settings className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold text-white">Settings</h1>
        </div>
        <p className="text-text-muted text-sm ml-[3.25rem]">
          Configure your local workspace preferences. All settings are stored on-device.
        </p>
      </div>

      {/* Local Storage Info */}
      <div className="flex items-start gap-3 bg-blue-900/20 p-4 rounded-xl border border-blue-800/30 mb-8">
        <HardDrive className="h-5 w-5 text-blue-400 mt-0.5 shrink-0" />
        <div>
          <h4 className="text-sm font-medium text-text-primary">Local Storage Mode</h4>
          <p className="text-xs text-text-muted mt-1">
            All data is stored locally in a SQLite database on your device. Nothing is sent to the cloud.
          </p>
        </div>
      </div>

      {/* Settings Grid */}
      <div className="space-y-6">
        {/* General section */}
        <div className="rounded-xl border border-border bg-surface/50 p-6">
          <h2 className="text-sm font-semibold text-text-primary mb-4 uppercase tracking-wider">
            General
          </h2>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-text-secondary">
                Default start page
              </label>
              <select
                value={uiSettings.startView}
                onChange={(e) => updateSettings({ startView: e.target.value })}
                className="w-full rounded-lg border border-border bg-surface-light px-3 py-2.5 text-sm text-white outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              >
                <option value="boards">Boards</option>
                <option value="tasks">Tasks</option>
                <option value="settings">Settings</option>
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-text-secondary">
                Tasks per page
              </label>
              <select
                value={String(uiSettings.tasksPageSize)}
                onChange={(e) => updateSettings({ tasksPageSize: Number(e.target.value) })}
                className="w-full rounded-lg border border-border bg-surface-light px-3 py-2.5 text-sm text-white outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              >
                <option value="6">6</option>
                <option value="12">12</option>
                <option value="24">24</option>
              </select>
            </div>
          </div>
        </div>

        {/* Tasks section */}
        <div className="rounded-xl border border-border bg-surface/50 p-6">
          <h2 className="text-sm font-semibold text-text-primary mb-4 uppercase tracking-wider">
            Tasks
          </h2>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-text-secondary">
                Default task priority
              </label>
              <select
                value={uiSettings.defaultTaskPriority}
                onChange={(e) => updateSettings({ defaultTaskPriority: e.target.value })}
                className="w-full rounded-lg border border-border bg-surface-light px-3 py-2.5 text-sm text-white outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>

            <div className="flex items-end">
              <label className="flex items-center gap-3 rounded-lg border border-border bg-surface-light px-4 py-2.5 text-sm text-text-secondary cursor-pointer hover:border-border-light transition-colors w-full">
                <input
                  type="checkbox"
                  checked={!!uiSettings.confirmBeforeDelete}
                  onChange={(e) => updateSettings({ confirmBeforeDelete: e.target.checked })}
                  className="h-4 w-4 rounded border-border-light bg-transparent text-primary focus:ring-primary focus:ring-offset-0"
                />
                Confirm before deleting tasks
              </label>
            </div>
          </div>
        </div>

        {/* System info */}
        <div className="rounded-xl border border-border bg-surface/50 p-6">
          <h2 className="text-sm font-semibold text-text-primary mb-4 uppercase tracking-wider">
            System
          </h2>
          <div className="flex items-center gap-3 text-sm text-text-muted">
            <Monitor className="h-4 w-4" />
            <span>Dark mode is always enabled</span>
          </div>
          <div className="flex items-center gap-3 text-sm text-text-muted mt-2">
            <HardDrive className="h-4 w-4" />
            <span>Data location: {window.electronAPI ? 'SQLite (Electron)' : 'localStorage (Browser)'}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
