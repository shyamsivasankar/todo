import { Plus, X, Terminal, Activity, Flag, Folder, Calendar } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useStore } from '../../../store/useStore'
import CyberModal from '../../../components/ui/CyberModal'
import CyberInput from '../../../components/ui/CyberInput'
import CyberButton from '../../../components/ui/CyberButton'
import MarkdownEditor from '../../../components/ui/MarkdownEditor'

const priorityOptions = [
  { value: 'low', label: 'STABLE' },
  { value: 'medium', label: 'ACTIVE' },
  { value: 'high', label: 'CRITICAL' },
]

export default function CreateTaskModal({
  open,
  onClose,
  defaultBoardId = null,
  defaultColumnId = null,
}) {
  const boards = useStore((state) => state.boards)
  const defaultTaskPriority = useStore((state) => state.uiSettings.defaultTaskPriority)
  const createTask = useStore((state) => state.createTask)

  const [heading, setHeading] = useState('')
  const [tldr, setTldr] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState(defaultTaskPriority || 'medium')
  const [boardId, setBoardId] = useState(defaultBoardId || '')
  const [columnId, setColumnId] = useState(defaultColumnId || '')
  const [dueDate, setDueDate] = useState('')

  const availableColumns = useMemo(() => {
    if (!boardId) return []
    const board = boards.find((b) => b.id === boardId)
    return board?.columns || []
  }, [boardId, boards])

  const handleBoardChange = (e) => {
    const newBoardId = e.target.value
    setBoardId(newBoardId)
    
    if (newBoardId) {
      const board = boards.find((b) => b.id === newBoardId)
      if (board && board.columns.length > 0) {
        setColumnId(board.columns[0].id)
      }
    } else {
      setColumnId('')
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!heading.trim()) return

    createTask(
      boardId || null,
      columnId || null,
      heading.trim(),
      tldr.trim(),
      description.trim(),
      {
        priority,
        dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
      },
    )
    onClose()
  }

  return (
    <CyberModal
      isOpen={open}
      onClose={onClose}
      title="Initialize New Node"
      variant="blue"
      maxWidth="max-w-3xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <CyberInput
          label="Task Heading"
          placeholder="ENTER_TASK_HEADING..."
          value={heading}
          onChange={(e) => setHeading(e.target.value)}
          autoFocus
          required
          icon={Terminal}
        />

        <CyberInput
          label="Short Summary"
          placeholder="SHORT_DATA_SUMMARY..."
          value={tldr}
          onChange={(e) => setTldr(e.target.value)}
          variant="cyan"
          icon={Activity}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <CyberInput
            label="Priority Level"
            type="select"
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            variant={priority === 'high' ? 'amber' : priority === 'low' ? 'lime' : 'blue'}
            icon={Flag}
          >
            {priorityOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </CyberInput>

          <CyberInput
            label="Due Date"
            type="datetime-local"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            icon={Calendar}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <CyberInput
            label="Target Sector"
            type="select"
            value={boardId}
            onChange={handleBoardChange}
            icon={Folder}
          >
            <option value="">STANDALONE_BUFFER</option>
            {boards.map((b) => (
              <option key={b.id} value={b.id}>{b.name.toUpperCase()}</option>
            ))}
          </CyberInput>

          {boardId && (
            <CyberInput
              label="Process Stage"
              type="select"
              value={columnId}
              onChange={(e) => setColumnId(e.target.value)}
              icon={Terminal}
            >
              {availableColumns.map((c) => (
                <option key={c.id} value={c.id}>{c.title.toUpperCase()}</option>
              ))}
            </CyberInput>
          )}
        </div>

        <MarkdownEditor
          label="Task Description"
          value={description}
          onChange={setDescription}
          placeholder="DOCUMENT_PROCEDURES..."
        />

        <div className="flex justify-end gap-4 pt-4 border-t border-white/5">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 font-orbitron text-[10px] font-bold uppercase tracking-widest text-surface-variant hover:text-white transition-colors"
          >
            Cancel
          </button>
          <CyberButton type="submit" variant="blue" icon={Plus}>
            Create Task
          </CyberButton>
        </div>
      </form>
    </CyberModal>
  )
}
