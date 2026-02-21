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
  })
  console.log('[Preload] electronAPI exposed successfully')
} catch (error) {
  console.error('[Preload] Failed to expose electronAPI:', error)
}
