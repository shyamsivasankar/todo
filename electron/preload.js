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
  })
  console.log('[Preload] electronAPI exposed successfully')
} catch (error) {
  console.error('[Preload] Failed to expose electronAPI:', error)
}
