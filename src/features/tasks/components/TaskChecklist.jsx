import { Plus } from 'lucide-react'
import { useStore } from '../../../store/useStore'
import ChecklistItem from './ChecklistItem'

/**
 * TaskChecklist Component
 *
 * Orchestrates the full checklist section within the task detail panel.
 */
export default function TaskChecklist({ boardId, columnId, taskId, checklists }) {
  const addTaskChecklistItem = useStore((state) => state.addTaskChecklistItem)
  const updateTaskChecklist = useStore((state) => state.updateTaskChecklist)
  const removeTaskChecklistItem = useStore((state) => state.removeTaskChecklistItem)

  const handleAddItem = () => {
    addTaskChecklistItem(boardId, columnId, taskId)
  }

  const handleUpdateItem = (itemId, updates) => {
    updateTaskChecklist(boardId, columnId, taskId, itemId, updates)
  }

  const handleRemoveItem = (itemId) => {
    removeTaskChecklistItem(boardId, columnId, taskId, itemId)
  }

  // Calculate progress
  const totalItems = checklists?.length || 0
  const completedItems = checklists?.filter(i => i.completed).length || 0
  const progressPercent = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0

  return (
    <div className="group relative">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <label className="block text-xs font-bold text-text-muted uppercase tracking-widest">
            Checklist
          </label>
          {totalItems > 0 && (
            <span className="text-[10px] font-mono text-text-muted/70 bg-surface px-1.5 py-0.5 rounded border border-border">
              {completedItems}/{totalItems} ({progressPercent}%)
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={handleAddItem}
          className="p-1 rounded hover:bg-surface-light text-text-muted hover:text-primary transition-all flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider"
          title="Add Item"
        >
          <Plus className="h-3 w-3" />
          Add Item
        </button>
      </div>

      {/* Progress Bar */}
      {totalItems > 0 && (
        <div className="h-1 w-full bg-surface-dark rounded-full mb-4 overflow-hidden">
          <div 
            className="h-full bg-primary transition-all duration-300 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      )}

      {/* Items List */}
      <div className="space-y-1">
        {checklists?.length > 0 ? (
          checklists.map((item) => (
            <ChecklistItem 
              key={item.id}
              item={item}
              onUpdate={(updates) => handleUpdateItem(item.id, updates)}
              onRemove={() => handleRemoveItem(item.id)}
            />
          ))
        ) : (
          <button 
            type="button"
            onClick={handleAddItem}
            className="text-xs text-text-muted/50 italic hover:text-primary transition-colors py-2"
          >
            No checklist items. Click to add subtasks...
          </button>
        )}
      </div>
    </div>
  )
}
