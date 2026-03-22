import { Plus, X, Terminal, Trash2 } from 'lucide-react'
import { useState } from 'react'
import CyberModal from '../../../components/ui/CyberModal'
import CyberInput from '../../../components/ui/CyberInput'
import CyberButton from '../../../components/ui/CyberButton'

export default function CreateBoardModal({ open, onClose, onCreate }) {
  const [name, setName] = useState('')
  const [columns, setColumns] = useState(['To Do', 'In Progress', 'Done'])

  const handleAddColumn = () => {
    setColumns([...columns, ''])
  }

  const handleRemoveColumn = (index) => {
    setColumns(columns.filter((_, i) => i !== index))
  }

  const handleColumnChange = (index, value) => {
    const newColumns = [...columns]
    newColumns[index] = value
    setColumns(newColumns)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!name.trim()) return
    onCreate(name.trim(), columns.filter(c => c.trim()))
    onClose()
  }

  return (
    <CyberModal
      isOpen={open}
      onClose={onClose}
      title="New Sector"
      variant="blue"
      maxWidth="max-w-xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <CyberInput
          label="Sector Name"
          placeholder="Enter Sector Name..."
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
          required
          icon={Terminal}
        />

        <div className="space-y-4">
          <label className="text-[9px] font-orbitron font-bold text-surface-variant uppercase tracking-[0.2em] ml-1 block">
            Process Stages (Columns)
          </label>
          <div className="space-y-3">
            {columns.map((col, idx) => (
              <div key={idx} className="flex gap-2 animate-in slide-in-from-left-2 duration-200" style={{ animationDelay: `${idx * 50}ms` }}>
                <CyberInput
                  placeholder={`Stage ${idx + 1}...`}
                  value={col}
                  onChange={(e) => handleColumnChange(idx, e.target.value)}
                  className="flex-1"
                  variant="cyan"
                />
                {columns.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveColumn(idx)}
                    className="p-2 text-surface-variant hover:text-cyber-pink transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
          <CyberButton variant="blue" size="xs" outline icon={Plus} onClick={handleAddColumn} fullWidth>
            Add Process Stage
          </CyberButton>
        </div>

        <div className="flex justify-end gap-4 pt-4 border-t border-white/5">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 font-orbitron text-[10px] font-bold uppercase tracking-widest text-surface-variant hover:text-white transition-colors"
          >
            Cancel
          </button>
          <CyberButton type="submit" variant="blue" icon={Plus}>
            Create Sector
          </CyberButton>
        </div>
      </form>
    </CyberModal>
  )
}
