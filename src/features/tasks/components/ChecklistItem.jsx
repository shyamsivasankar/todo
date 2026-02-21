import { Trash2 } from 'lucide-react'
import { useState } from 'react'

/**
 * ChecklistItem Component
 *
 * Handles an individual checklist item's state and UI.
 */
export default function ChecklistItem({ item, onUpdate, onRemove }) {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <div 
      className="flex items-start gap-3 group py-1"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <input
        type="checkbox"
        checked={item.completed}
        onChange={(e) => onUpdate({ completed: e.target.checked })}
        className="mt-1 h-4 w-4 rounded border-border-light bg-transparent text-primary focus:ring-primary focus:ring-offset-0 cursor-pointer"
      />
      <input
        value={item.text}
        onChange={(e) => onUpdate({ text: e.target.value })}
        placeholder="New checklist item..."
        className={`flex-1 bg-transparent border-none outline-none p-0 text-sm transition-all ${
          item.completed ? 'text-text-muted line-through' : 'text-text-secondary'
        }`}
      />
      <button
        type="button"
        onClick={onRemove}
        className={`p-1 rounded hover:bg-surface-light text-text-muted hover:text-red-400 transition-opacity ${
          isHovered ? 'opacity-100' : 'opacity-0'
        }`}
        title="Remove Item"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
