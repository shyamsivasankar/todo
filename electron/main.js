import { app, BrowserWindow, ipcMain, Menu } from 'electron'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { boardOperations, deletedTasksOperations, settingsOperations } from './database.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const isDev = !app.isPackaged

const createWindow = () => {
  const preloadPath = path.join(__dirname, 'preload.js')
  console.log('[Main] Preload path:', preloadPath)
  
  const win = new BrowserWindow({
    width: 1480,
    height: 920,
    minWidth: 1080,
    minHeight: 700,
    backgroundColor: '#09090b',
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true,
      devTools: true, // Explicitly enable DevTools
    },
  })

  // Open DevTools automatically in development mode
  if (isDev) {
    // win.webContents.openDevTools()
  }

  if (isDev) {
    const loadDevUrl = () => {
      win
        .loadURL('http://127.0.0.1:5173')
        .catch(() => setTimeout(loadDevUrl, 500))
    }

    loadDevUrl()
    return
  }

  win.loadFile(path.join(__dirname, '../dist/index.html'))
  
  return win
}

// Create application menu with DevTools option
const createMenu = () => {
  const template = [
    {
      label: app.getName(),
      submenu: [
        { role: 'about', label: 'About' },
        { type: 'separator' },
        { role: 'services', label: 'Services' },
        { type: 'separator' },
        { role: 'hide', label: 'Hide ' + app.getName() },
        { role: 'hideOthers', label: 'Hide Others' },
        { role: 'unhide', label: 'Show All' },
        { type: 'separator' },
        { role: 'quit', label: 'Quit ' + app.getName() },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo', label: 'Undo' },
        { role: 'redo', label: 'Redo' },
        { type: 'separator' },
        { role: 'cut', label: 'Cut' },
        { role: 'copy', label: 'Copy' },
        { role: 'paste', label: 'Paste' },
        { role: 'pasteAndMatchStyle', label: 'Paste and Match Style' },
        { role: 'delete', label: 'Delete' },
        { role: 'selectAll', label: 'Select All' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload', label: 'Reload' },
        { role: 'forceReload', label: 'Force Reload' },
        { role: 'toggleDevTools', label: 'Toggle Developer Tools' },
        { type: 'separator' },
        { role: 'resetZoom', label: 'Actual Size' },
        { role: 'zoomIn', label: 'Zoom In' },
        { role: 'zoomOut', label: 'Zoom Out' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: 'Toggle Full Screen' },
      ],
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize', label: 'Minimize' },
        { role: 'close', label: 'Close' },
      ],
    },
  ]

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}

app.whenReady().then(() => {
  // Create application menu
  createMenu()

  // Get boards and active board ID
  ipcMain.handle('boards:get', () => {
    console.log('[IPC] Getting boards from database...')
    const result = boardOperations.getAll()
    console.log('[IPC] Loaded boards:', { 
      boardsCount: result.boards.length, 
      standaloneTasksCount: result.standaloneTasks?.length || 0,
      activeBoardId: result.activeBoardId 
    })
    return { 
      boards: result.boards, 
      standaloneTasks: result.standaloneTasks || [],
      activeBoardId: result.activeBoardId 
    }
  })

  // Save boards and active board ID
  ipcMain.on('boards:set', (_event, data) => {
    try {
      // Handle both object format { boards, activeBoardId, standaloneTasks } and array format
      const boards = Array.isArray(data) ? data : (data?.boards || [])
      const activeBoardId = Array.isArray(data) ? null : (data?.activeBoardId || null)
      const standaloneTasks = Array.isArray(data) ? [] : (data?.standaloneTasks || [])
      
      console.log('[IPC] Saving boards:', { 
        boardsCount: boards.length, 
        standaloneTasksCount: standaloneTasks.length,
        activeBoardId 
      })
      boardOperations.saveAll(boards, activeBoardId, standaloneTasks)
      console.log('[IPC] Boards saved successfully')
    } catch (error) {
      console.error('[IPC] Error in boards:set:', error)
    }
  })

  // Get deleted tasks
  ipcMain.handle('deletedTasks:get', () => {
    return deletedTasksOperations.getAll()
  })

  // Save deleted tasks
  ipcMain.on('deletedTasks:set', (_event, deletedTasks) => {
    deletedTasksOperations.saveAll(deletedTasks)
  })

  // Get settings
  ipcMain.handle('settings:get', () => {
    return settingsOperations.getAll()
  })

  // Save settings
  ipcMain.on('settings:set', (_event, settings) => {
    settingsOperations.saveAll(settings)
  })

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
