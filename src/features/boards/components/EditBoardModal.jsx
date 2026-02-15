import { Settings, X } from 'lucide-react'
import { useEffect, useState } from 'react'

export default function EditBoardModal({ open, board, onClose, onSave }) {
  const [name, setName] = useState(board?.name ?? '')

  useEffect(() => {
    if (open && board) {
      setName(board.name ?? '')
    }
  }, [open, board?.name])

  if (!open) return null

  const handleSubmit = (e) => {
    e.preventDefault()
    const trimmed = name.trim()
    if (board && trimmed) {
      onSave(board.id, trimmed)
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg-deep/80 backdrop-blur-sm transition-opacity">
      <div className="w-full max-w-md transform overflow-hidden rounded-xl bg-surface shadow-2xl transition-all border border-border relative">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-text-muted hover:text-white transition-colors z-10"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="px-8 pt-8 pb-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Settings className="h-6 w-6" />
            </div>
            <h2 className="text-2xl font-bold text-white">Board settings</h2>
          </div>
          <p className="text-text-muted text-sm ml-[3.25rem]">
            Edit your board name. Stage columns cannot be changed here.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="px-8 py-4 space-y-6">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-text-secondary" htmlFor="edit-board-name">
              Board name
            </label>
            <input
              id="edit-board-name"
              type="text"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Q4 Marketing Campaign"
              className="block w-full rounded-lg border border-border bg-surface-light text-white placeholder-text-muted text-sm py-2.5 px-3 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-shadow"
            />
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-border pt-5 -mx-8 px-8">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm font-medium text-text-secondary hover:bg-white/5 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className="rounded-lg bg-primary px-6 py-2 text-sm font-medium text-white shadow-lg shadow-primary/30 hover:bg-primary-dark transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
