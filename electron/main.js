import { app, BrowserWindow, ipcMain, Menu, shell, dialog } from 'electron'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { z } from 'zod'
import { boardOperations, deletedTasksOperations, settingsOperations, taskOperations } from './database.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const isDev = !app.isPackaged

// IPC Validation Schemas
const TaskSchema = z.object({
  id: z.string(),
  heading: z.string(),
  tldr: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  createdAt: z.string().optional().nullable(),
  settings: z.object({
    priority: z.string().optional().nullable(),
    tags: z.array(z.string()).optional().nullable(),
    dueDate: z.string().optional().nullable(),
    status: z.string().optional().nullable(),
  }).optional().nullable(),
  extendedData: z.object({
    checklists: z.array(z.any()).optional().nullable(),
    attachments: z.array(z.any()).optional().nullable(),
  }).optional().nullable(),
  timeline: z.array(z.object({
    timestamp: z.string(),
    action: z.string(),
  })).optional().nullable(),
})

const ColumnSchema = z.object({
  id: z.string(),
  title: z.string(),
  tasks: z.array(TaskSchema),
})

const BoardSchema = z.object({
  id: z.string(),
  name: z.string(),
  createdAt: z.string().optional().nullable(),
  columns: z.array(ColumnSchema),
})

const BoardsDataSchema = z.union([
  z.array(BoardSchema),
  z.object({
    boards: z.array(BoardSchema),
    activeBoardId: z.string().nullable().optional(),
    standaloneTasks: z.array(TaskSchema).optional().nullable(),
  })
])

const DeletedTaskSchema = z.object({
  boardId: z.string(),
  boardName: z.string(),
  columnId: z.string(),
  columnTitle: z.string(),
  task: TaskSchema,
  deletedAt: z.string(),
})

const SettingsSchema = z.record(z.any())

const FileOpenSchema = z.string()

const FileBrowseSchema = z.object({
  properties: z.array(z.string()).optional(),
  title: z.string().optional(),
  buttonLabel: z.string().optional(),
})

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
      devTools: isDev, // Only enable DevTools in development
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
      // Validate data with Zod
      const validatedData = BoardsDataSchema.parse(data)
      
      // Handle both object format { boards, activeBoardId, standaloneTasks } and array format
      const boards = Array.isArray(validatedData) ? validatedData : (validatedData?.boards || [])
      const activeBoardId = Array.isArray(validatedData) ? null : (validatedData?.activeBoardId || null)
      const standaloneTasks = Array.isArray(validatedData) ? [] : (validatedData?.standaloneTasks || [])
      
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
  // Save deleted tasks
  ipcMain.on("deletedTasks:set", (_event, deletedTasks) => {
    try {
      const validatedDeletedTasks = z.array(DeletedTaskSchema).parse(deletedTasks)
      deletedTasksOperations.saveAll(validatedDeletedTasks)
    } catch (error) {
      console.error("[IPC] Error in deletedTasks:set:", error)
    }
  })

  // Get settings
  ipcMain.handle('settings:get', () => {
    console.log('[IPC] Getting settings from database...')
    return settingsOperations.getAll()
  })

  // Save settings
  ipcMain.on('settings:set', (_event, settings) => {
    try {
      const validatedSettings = SettingsSchema.parse(settings)
      console.log('[IPC] Saving settings to database:', validatedSettings)
      settingsOperations.saveAll(validatedSettings)
      console.log('[IPC] Settings saved successfully')
    } catch (error) {
      console.error('[IPC] Error in settings:set:', error)
    }
  })

  // Task operations
  const CreateTaskSchema = z.object({
    board_id: z.string().nullable().optional(),
    column_id: z.string().nullable().optional(),
    isStandalone: z.boolean().optional(),
    heading: z.string(),
    tldr: z.string().optional(),
    description: z.string().optional(),
    priority: z.string().optional(),
    tags: z.array(z.string()).optional(),
    extended_data: z.object({}).passthrough().optional(),
    due_date: z.string().optional(),
    status: z.string(),
    position: z.number(),
    created_at: z.string(),
    id: z.string(),
  })
  ipcMain.handle('task:create', (_event, taskData) => {
    try {
      const validatedTask = CreateTaskSchema.parse(taskData)
      if (validatedTask.isStandalone) {
        validatedTask.board_id = null
        validatedTask.column_id = null
      }
      return taskOperations.create(validatedTask)
    } catch (error) {
      console.error('[IPC] Error in task:create:', error)
    }
  })

  const UpdateTaskSchema = z.object({}).passthrough()
  ipcMain.on('task:update', (_event, { taskId, updates }) => {
    try {
      const validatedUpdates = UpdateTaskSchema.parse(updates)
      taskOperations.update(taskId, validatedUpdates)
    } catch (error) {
      console.error('[IPC] Error in task:update:', error)
    }
  })

  ipcMain.on('task:delete', (_event, taskId) => {
    try {
      taskOperations.delete(taskId)
    } catch (error) {
      console.error('[IPC] Error in task:delete:', error)
    }
  })

  const MoveTaskSchema = z.object({
    taskId: z.string(),
    newBoardId: z.string().nullable().optional(),
    newColumnId: z.string().nullable().optional(),
    newPosition: z.number(),
    isStandalone: z.boolean().optional(),
  })
  ipcMain.on('task:move', (_event, args) => {
    try {
      const validatedArgs = MoveTaskSchema.parse(args)
      const { taskId, newBoardId, newColumnId, newPosition, isStandalone } = validatedArgs
      const boardId = isStandalone ? null : newBoardId
      const columnId = isStandalone ? null : newColumnId
      taskOperations.move(taskId, boardId, columnId, newPosition)
    } catch (error) {
      console.error('[IPC] Error in task:move:', error)
    }
  })

  /**
   * Validates if a path is within a set of whitelisted directories.
   */
  const isPathWhitelisted = (filePath) => {
    try {
      const normalizedPath = path.normalize(filePath)
      const whitelistedDirectories = [
        app.getPath("home"),
        app.getPath("desktop"),
        app.getPath("documents"),
        app.getPath("downloads"),
        app.getPath("pictures"),
        app.getPath("music"),
        app.getPath("videos"),
        app.getPath("userData"),
        app.getPath("temp"),
      ].filter(Boolean)

      return whitelistedDirectories.some(allowedPath => {
        const normalizedAllowedPath = path.normalize(allowedPath)
        const relative = path.relative(normalizedAllowedPath, normalizedPath)
        return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative))
      })
    } catch (error) {
      console.error("[Security] Error validating path whitelist:", error)
      return false
    }
  }

  // Open a local file or folder
  ipcMain.handle("file:open", async (event, filePath) => {
    try {
      const validatedPath = FileOpenSchema.parse(filePath)
      console.log("[IPC] Opening file/path:", validatedPath)
      
      if (!validatedPath) return { success: false, error: "No path provided" }
      
      // Security check: only allow absolute paths
      if (!path.isAbsolute(validatedPath)) {
        return { success: false, error: "Only absolute paths are allowed" }
      }

      // Whitelist validation
      if (!isPathWhitelisted(validatedPath)) {
        console.warn("[Security] Blocked attempt to open non-whitelisted path:", validatedPath)
        return { success: false, error: "Access denied: Path is not in a whitelisted directory" }
      }

      // User consent
      const win = BrowserWindow.fromWebContents(event.sender)
      const { response } = await dialog.showMessageBox(win, {
        type: "question",
        buttons: ["Cancel", "Open"],
        defaultId: 1,
        cancelId: 0,
        title: "Security Confirmation",
        message: "Do you want to open this file?",
        detail: `Path: ${validatedPath}\n\nOnly open files from sources you trust.`,
        noLink: true
      })

      if (response !== 1) {
        return { success: false, error: "User cancelled" }
      }

      const error = await shell.openPath(validatedPath)
      if (error) {
        console.error("[IPC] Error opening path:", error)
        return { success: false, error }
      }
      return { success: true }
    } catch (err) {
      console.error("[IPC] Exception opening path:", err)
      return { success: false, error: err.message }
    }
  })
  // Browse for a file or folder
  ipcMain.handle('file:browse', async (_event, options = {}) => {
    try {
      const validatedOptions = FileBrowseSchema.parse(options)
      console.log('[IPC] Browsing for file/folder with options:', validatedOptions)
      
      // Whitelist properties for security
      const allowedProperties = ['openFile', 'openDirectory', 'multiSelections', 'showHiddenFiles']
      const safeProperties = (validatedOptions.properties || []).filter(p => allowedProperties.includes(p))
      
      const result = await dialog.showOpenDialog({
        properties: safeProperties.length > 0 ? safeProperties : ['openFile', 'openDirectory'],
        title: validatedOptions.title || 'Select File or Folder',
        buttonLabel: validatedOptions.buttonLabel || 'Select',
      })
      
      if (result.canceled || result.filePaths.length === 0) {
        return { success: false, canceled: true }
      }
      
      return { success: true, filePaths: result.filePaths }
    } catch (err) {
      console.error('[IPC] Exception browsing for file:', err)
      return { success: false, error: err.message }
    }
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
