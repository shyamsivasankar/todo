import { FileIcon, Folder, Paperclip, Trash2, ExternalLink, Plus } from 'lucide-react'
import { useState } from 'react'
import { useStore } from '../../../store/useStore'

/**
 * TaskAttachments Component
 *
 * Handles local file/folder links and drag-and-drop path capture.
 */
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
          // Fix: Proper regex for splitting paths on both Unix and Windows
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
        // file.path is available in Electron
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
      className={`group relative p-4 rounded-xl border-2 border-dashed transition-all ${
        isDragging 
          ? 'border-primary bg-primary/5' 
          : 'border-transparent group-hover:border-border/30'
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="flex items-center justify-between mb-4">
        <label className="block text-xs font-bold text-text-muted uppercase tracking-widest">
          Attachments
        </label>
        <button
          type="button"
          onClick={handleBrowse}
          className="p-1 rounded hover:bg-surface-light text-text-muted hover:text-primary transition-all flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider"
          title="Add File"
        >
          <Plus className="h-3 w-3" />
          Add File
        </button>
      </div>

      <div className="space-y-2">
        {attachments?.length > 0 ? (
          attachments.map((file) => (
            <div 
              key={file.id} 
              className="flex items-center gap-3 p-2 rounded-lg bg-surface/50 border border-border/50 hover:bg-surface transition-colors group/item"
            >
              <div className="p-1.5 rounded bg-surface border border-border shrink-0">
                {file.type === 'folder' ? (
                  <Folder className="h-4 w-4 text-yellow-500" />
                ) : (
                  <FileIcon className="h-4 w-4 text-blue-400" />
                )}
              </div>
              
              <div 
                className="flex-1 min-w-0 cursor-pointer"
                onClick={() => handleOpenFile(file.path)}
              >
                <div className="text-sm text-text-secondary truncate font-medium group-hover/item:text-primary transition-colors">
                  {file.name}
                </div>
                <div className="text-[10px] text-text-muted truncate font-mono">
                  {file.path}
                </div>
              </div>

              <div className="flex items-center gap-1 opacity-0 group-hover/item:opacity-100 transition-opacity">
                <button
                  type="button"
                  onClick={() => handleOpenFile(file.path)}
                  className="p-1.5 rounded hover:bg-surface-light text-text-muted hover:text-white"
                  title="Open"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => removeTaskAttachment(boardId, columnId, taskId, file.id)}
                  className="p-1.5 rounded hover:bg-surface-light text-text-muted hover:text-red-400"
                  title="Remove"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-6 text-text-muted/40">
            <Paperclip className="h-8 w-8 mb-2 opacity-20" />
            <span className="text-xs font-light">Drag files here or click to browse</span>
          </div>
        )}
      </div>
    </div>
  )
}
