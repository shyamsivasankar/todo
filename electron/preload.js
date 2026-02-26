const { contextBridge, ipcRenderer } = require('electron')

try {
  contextBridge.exposeInMainWorld('electronAPI', {
    getBoards: () => ipcRenderer.invoke('boards:get'),
    saveBoards: (boards, activeBoardId, standaloneTasks) => ipcRenderer.send('boards:set', { boards, activeBoardId, standaloneTasks }),
    getDeletedTasks: () => ipcRenderer.invoke('deletedTasks:get'),
    saveDeletedTasks: (deletedTasks) => ipcRenderer.send('deletedTasks:set', deletedTasks),
    getSettings: () => ipcRenderer.invoke('settings:get'),
    saveSettings: (settings) => ipcRenderer.send('settings:set', settings),
    openFile: (filePath) => ipcRenderer.invoke('file:open', filePath),
    browseFiles: (options) => ipcRenderer.invoke('file:browse', options),
    createTask: (taskData) => ipcRenderer.invoke('task:create', taskData),
    updateTask: (taskId, updates) => ipcRenderer.send('task:update', { taskId, updates }),
    deleteTask: (taskId) => ipcRenderer.send('task:delete', taskId),
    moveTask: (taskId, newBoardId, newColumnId, newPosition) => ipcRenderer.send('task:move', { taskId, newBoardId, newColumnId, newPosition }),
    getNotifications: () => ipcRenderer.invoke('notifications:get'),
    markNotificationAsRead: (notificationId) => ipcRenderer.send('notifications:markAsRead', notificationId),
    getNotes: () => ipcRenderer.invoke('notes:get'),
    saveNotes: (notes) => ipcRenderer.send('notes:set', notes),
    createNote: (note) => ipcRenderer.invoke('notes:create', note),
    updateNote: (id, updates) => ipcRenderer.send('notes:update', { id, updates }),
    deleteNote: (id) => ipcRenderer.send('notes:delete', id),
    linkNoteToTask: (noteId, taskId) => ipcRenderer.send('notes:linkToTask', { noteId, taskId }),
    unlinkNoteFromTask: (noteId, taskId) => ipcRenderer.send('notes:unlinkFromTask', { noteId, taskId }),
    onNotificationUpdate: (callback) => {
      const subscription = () => callback()
      ipcRenderer.on('notify:update', subscription)
      return () => ipcRenderer.removeListener('notify:update', subscription)
    },
  })
  console.log('[Preload] electronAPI exposed successfully')
} catch (error) {
  console.error('[Preload] Failed to expose electronAPI:', error)
}
