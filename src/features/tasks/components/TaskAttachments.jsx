import { FileIcon, Folder, Paperclip, Trash2, ExternalLink, Plus, Terminal } from 'lucide-react'
import { useState } from 'react'
import { useStore } from '../../../store/useStore'
import CyberCard from '../../../components/ui/CyberCard'
import CyberButton from '../../../components/ui/CyberButton'

export default function TaskAttachments({ boardId, columnId, taskId, attachments }) {
  const addTaskAttachment = useStore((state) => state.addTaskAttachment)
  const removeTaskAttachment = useStore((state) => state.removeTaskAttachment)
  const [isDragging, setIsDragging] = useState(false)

  const handleBrowse = async () => {
    if (!window.electronAPI) {
      alert('File browsing is only available in the desktop application.')
      return
    }

    try {
      const result = await window.electronAPI.browseFiles({
        properties: ['openFile', 'openDirectory', 'multiSelections'],
      })

      if (result.success && result.filePaths) {
        result.filePaths.forEach(filePath => {
          const fileName = filePath.split(/[/\\]/).pop() || filePath
          addTaskAttachment(boardId, columnId, taskId, {
            name: fileName,
            path: filePath,
            type: filePath.includes('.') ? 'file' : 'folder'
          })
        })
      }
    } catch (err) {
      console.error('Error browsing for files:', err)
    }
  }

  const handleOpenFile = (path) => {
    if (window.electronAPI) {
      window.electronAPI.openFile(path)
    } else {
      alert('Opening local files is only supported in the desktop application.')
    }
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      Array.from(e.dataTransfer.files).forEach(file => {
        const filePath = file.path
        if (filePath) {
          addTaskAttachment(boardId, columnId, taskId, {
            name: file.name,
            path: filePath,
            type: 'file'
          })
        }
      })
    }
  }

  return (
    <div 
      className={`space-y-4 transition-all ${isDragging ? 'scale-[1.02]' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="flex items-center justify-between border-b border-white/5 pb-2">
        <label className="flex items-center gap-2 text-[10px] font-orbitron font-bold text-white uppercase tracking-widest">
          <Paperclip className="h-3.5 w-3.5 text-cyber-blue" />
          Data Uplinks
        </label>
        <CyberButton
          variant="blue"
          size="xs"
          outline
          icon={Plus}
          onClick={handleBrowse}
        >
          Add_Uplink
        </CyberButton>
      </div>

      <div className="space-y-2">
        {attachments?.length > 0 ? (
          attachments.map((file) => (
            <CyberCard 
              key={file.id} 
              variant="blue" 
              glow={false} 
              padding="p-3" 
              className="bg-surface-low border-white/5 hover:bg-white/5 group/item"
            >
              <div className="flex items-center gap-4">
                <div className="p-2 rounded-sm bg-white/5 border border-white/10 shrink-0">
                  {file.type === 'folder' ? (
                    <Folder className="h-4 w-4 text-cyber-amber" />
                  ) : (
                    <FileIcon className="h-4 w-4 text-cyber-blue" />
                  )}
                </div>
                
                <div 
                  className="flex-1 min-w-0 cursor-pointer"
                  onClick={() => handleOpenFile(file.path)}
                >
                  <div className="text-xs font-orbitron font-bold text-white truncate uppercase tracking-tight group-hover/item:text-cyber-blue transition-colors">
                    {file.name}
                  </div>
                  <div className="text-[9px] text-surface-variant truncate font-mono uppercase opacity-50">
                    PATH: {file.path}
                  </div>
                </div>

                <div className="flex items-center gap-1 opacity-0 group-hover/item:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleOpenFile(file.path)}
                    className="p-1.5 text-surface-variant hover:text-white"
                    title="Execute_Path"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => removeTaskAttachment(boardId, columnId, taskId, file.id)}
                    className="p-1.5 text-surface-variant hover:text-cyber-pink"
                    title="Sever_Uplink"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </CyberCard>
          ))
        ) : (
          <div className={`py-8 border border-dashed rounded-sm flex flex-col items-center justify-center gap-2 transition-all ${isDragging ? 'border-cyber-blue bg-cyber-blue/5 animate-pulse' : 'border-white/5'}`}>
            <Terminal className="h-8 w-8 text-surface-highest opacity-20" />
            <span className="text-[10px] font-mono text-surface-highest uppercase tracking-widest">[ DRAG_DATA_STREAM_OR_CLICK_TO_UPLINK ]</span>
          </div>
        )}
      </div>
    </div>
  )
}
