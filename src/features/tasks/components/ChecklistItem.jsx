import { Trash2 } from 'lucide-react'
import CyberCard from '../../../components/ui/CyberCard'

export default function ChecklistItem({ item, onUpdate, onRemove }) {
  return (
    <CyberCard 
      variant={item.completed ? 'blue' : 'cyan'} 
      glow={false} 
      padding="p-3" 
      className={`border-white/5 bg-surface-low hover:bg-white/5 transition-colors group ${item.completed ? 'opacity-50' : ''}`}
    >
      <div className="flex items-center gap-4">
        <div 
          className={`h-4 w-4 rounded-sm border cursor-pointer flex items-center justify-center transition-all ${item.completed ? 'bg-cyber-blue border-cyber-blue shadow-neon-blue' : 'border-white/20 hover:border-cyber-blue/50'}`}
          onClick={() => onUpdate({ completed: !item.completed })}
        >
          {item.completed && <span className="text-cyber-black text-[10px] font-bold">✓</span>}
        </div>
        <input
          value={item.text}
          onChange={(e) => onUpdate({ text: e.target.value })}
          placeholder="SUB_PROCESS_ID..."
          className={`flex-1 bg-transparent border-none outline-none p-0 font-mono text-xs transition-all uppercase ${
            item.completed ? 'text-surface-variant line-through' : 'text-white'
          }`}
        />
        <button
          type="button"
          onClick={onRemove}
          className="opacity-0 group-hover:opacity-100 text-surface-variant hover:text-cyber-pink transition-all"
          title="Purge_Sub_Node"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </CyberCard>
  )
}
