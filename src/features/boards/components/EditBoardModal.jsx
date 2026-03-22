import { Save, Terminal } from 'lucide-react'
import { useState } from 'react'
import CyberModal from '../../../components/ui/CyberModal'
import CyberInput from '../../../components/ui/CyberInput'
import CyberButton from '../../../components/ui/CyberButton'

export default function EditBoardModal({ open, board, onClose, onSave }) {
  const [name, setName] = useState(board?.name || '')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!name.trim()) return
    onSave(board.id, name.trim())
    onClose()
  }

  return (
    <CyberModal
      isOpen={open}
      onClose={onClose}
      title="Edit Sector"
      variant="blue"
      maxWidth="max-w-md"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <CyberInput
          label="Sector Name"
          placeholder="ENTER_NEW_NAME..."
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
          required
          icon={Terminal}
        />

        <div className="flex justify-end gap-4 pt-4 border-t border-white/5">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 font-orbitron text-[10px] font-bold uppercase tracking-widest text-surface-variant hover:text-white transition-colors"
          >
            Cancel
          </button>
          <CyberButton type="submit" variant="blue" icon={Save}>
            Save Changes
          </CyberButton>
        </div>
      </form>
    </CyberModal>
  )
}
