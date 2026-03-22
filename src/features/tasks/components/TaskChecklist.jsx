import { Plus, Terminal, Activity } from 'lucide-react'
import { useStore } from '../../../store/useStore'
import ChecklistItem from './ChecklistItem'
import CyberBadge from '../../../components/ui/CyberBadge'
import CyberButton from '../../../components/ui/CyberButton'

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

  const totalItems = checklists?.length || 0
  const completedItems = checklists?.filter(i => i.completed).length || 0
  const progressPercent = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-white/5 pb-2">
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-[10px] font-orbitron font-bold text-white uppercase tracking-widest">
            <Terminal className="h-3.5 w-3.5 text-cyber-blue" />
            Sub-Sequences
          </label>
          {totalItems > 0 && (
            <CyberBadge variant={progressPercent === 100 ? 'lime' : 'blue'} size="xs">
              {completedItems}/{totalItems} ({progressPercent}%)
            </CyberBadge>
          )}
        </div>
        <CyberButton
          variant="blue"
          size="xs"
          outline
          icon={Plus}
          onClick={handleAddItem}
        >
          Add_Node
        </CyberButton>
      </div>

      {/* Progress Bar */}
      {totalItems > 0 && (
        <div className="h-1 w-full bg-white/5 relative overflow-hidden">
          <div 
            className={`h-full transition-all duration-1000 ease-out shadow-neon-${progressPercent === 100 ? 'lime' : 'blue'} ${progressPercent === 100 ? 'bg-cyber-lime' : 'bg-cyber-blue'}`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      )}

      {/* Items List */}
      <div className="space-y-2">
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
            className="w-full py-4 border border-dashed border-white/5 text-[10px] font-mono text-surface-highest uppercase tracking-widest hover:bg-white/5 hover:text-cyber-blue transition-all"
          >
            [ NULL_SUB_SEQUENCES: CLICK_TO_INITIALIZE ]
          </button>
        )}
      </div>
    </div>
  )
}
