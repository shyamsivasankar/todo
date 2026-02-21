import Database from 'better-sqlite3'
import { app } from 'electron'
import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Initialize database - ensure app is ready first
let db = null

function initializeDatabase() {
  if (db) return db
  
  try {
    // Get the user data directory for the app
    const userDataPath = app.getPath('userData')
    const dbPath = path.join(userDataPath, 'kanban.db')

    console.log('[DB] Initializing database at:', dbPath)

    // Ensure the directory exists
    if (!fs.existsSync(userDataPath)) {
      fs.mkdirSync(userDataPath, { recursive: true })
    }

    // Initialize database
    db = new Database(dbPath)

    // Enable foreign keys
    db.pragma('foreign_keys = ON')
    
    console.log('[DB] Database initialized successfully')
    return db
  } catch (error) {
    console.error('[DB] Failed to initialize database:', error)
    throw error
  }
}

// Initialize when app is ready, or immediately if already ready
if (app.isReady()) {
  initializeDatabase()
} else {
  app.once('ready', () => {
    initializeDatabase()
  })
}

// Get database instance (will initialize if needed)
function getDb() {
  if (!db) {
    initializeDatabase()
  }
  return db
}

// Initialize schema
function initializeSchema() {
  const db = getDb()
  
  // Boards table
  db.exec(`
    CREATE TABLE IF NOT EXISTS boards (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL
    )
  `)

  // Columns table
  db.exec(`
    CREATE TABLE IF NOT EXISTS columns (
      id TEXT PRIMARY KEY,
      board_id TEXT NOT NULL,
      title TEXT NOT NULL,
      position INTEGER NOT NULL,
      FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE
    )
  `)

  // Tasks table - board_id and column_id can be NULL for standalone tasks
  db.exec(`
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      board_id TEXT,
      column_id TEXT,
      heading TEXT NOT NULL,
      tldr TEXT DEFAULT '',
      description TEXT DEFAULT '',
      priority TEXT DEFAULT 'medium',
      tags TEXT DEFAULT '[]',
      extended_data TEXT DEFAULT '{}',
      due_date TEXT DEFAULT '',
      status TEXT NOT NULL,
      position INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE,
      FOREIGN KEY (column_id) REFERENCES columns(id) ON DELETE CASCADE
    )
  `)

  // Migration: Add extended_data to tasks if missing
  try {
    const tableInfo = db.prepare("PRAGMA table_info(tasks)").all()
    const hasExtendedData = tableInfo.some(col => col.name === 'extended_data')
    if (!hasExtendedData) {
      db.prepare("ALTER TABLE tasks ADD COLUMN extended_data TEXT DEFAULT '{}'").run()
      console.log('[DB] Migration: Added extended_data column to tasks table')
    }
  } catch (error) {
    console.error('[DB] Migration failed:', error)
  }

  // Task timeline table
  db.exec(`
    CREATE TABLE IF NOT EXISTS task_timeline (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      action TEXT NOT NULL,
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
    )
  `)

  // Deleted tasks table
  db.exec(`
    CREATE TABLE IF NOT EXISTS deleted_tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      board_id TEXT NOT NULL,
      board_name TEXT NOT NULL,
      column_id TEXT NOT NULL,
      column_title TEXT NOT NULL,
      task_id TEXT NOT NULL,
      task_data TEXT NOT NULL,
      deleted_at TEXT NOT NULL
    )
  `)

  // Settings table
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `)

  // Create indexes for better performance
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_columns_board_id ON columns(board_id);
    CREATE INDEX IF NOT EXISTS idx_tasks_board_id ON tasks(board_id);
    CREATE INDEX IF NOT EXISTS idx_tasks_column_id ON tasks(column_id);
    CREATE INDEX IF NOT EXISTS idx_task_timeline_task_id ON task_timeline(task_id);
  `)
}

// Initialize the schema when database is ready
if (app.isReady()) {
  initializeSchema()
} else {
  app.once('ready', () => {
    initializeSchema()
  })
}

// Board operations
export const boardOperations = {
  getAll: () => {
    try {
      const db = getDb()
      const boards = db.prepare('SELECT * FROM boards ORDER BY created_at').all()
      const columns = db.prepare('SELECT * FROM columns ORDER BY board_id, position').all()
      const tasks = db.prepare('SELECT * FROM tasks ORDER BY board_id, column_id, position').all()
      const timeline = db.prepare('SELECT * FROM task_timeline ORDER BY task_id, timestamp').all()

      // Get active board ID from settings
      const activeBoardIdRow = db.prepare("SELECT value FROM settings WHERE key = 'activeBoardId'").get()
      const activeBoardId = activeBoardIdRow ? activeBoardIdRow.value : null

    // Reconstruct boards structure
    const boardsMap = new Map()
    
    boards.forEach(board => {
      boardsMap.set(board.id, {
        id: board.id,
        name: board.name,
        createdAt: board.created_at,
        columns: []
      })
    })

    // Add columns
    const columnsMap = new Map()
    columns.forEach(column => {
      columnsMap.set(column.id, {
        id: column.id,
        title: column.title,
        tasks: []
      })
      const board = boardsMap.get(column.board_id)
      if (board) {
        board.columns.push(columnsMap.get(column.id))
      }
    })

    // Add tasks to columns (only tasks with board_id and column_id)
    const standaloneTasks = []
    tasks.forEach(task => {
      const taskTimeline = timeline
        .filter(t => t.task_id === task.id)
        .map(t => ({
          timestamp: t.timestamp,
          action: t.action
        }))

      const tags = JSON.parse(task.tags || '[]')
      const extendedData = JSON.parse(task.extended_data || '{}')
      
      const taskData = {
        id: task.id,
        heading: task.heading,
        tldr: task.tldr || '',
        description: task.description || '',
        createdAt: task.created_at,
        settings: {
          priority: task.priority,
          tags: tags,
          dueDate: task.due_date || '',
          status: task.status
        },
        extendedData: {
          checklists: extendedData.checklists || [],
          attachments: extendedData.attachments || []
        },
        timeline: taskTimeline
      }

      // If task has no board_id, it's a standalone task
      if (!task.board_id || !task.column_id) {
        standaloneTasks.push(taskData)
      } else {
        // Otherwise, add it to the column
        const column = columnsMap.get(task.column_id)
        if (column) {
          column.tasks.push(taskData)
        }
      }
    })

      const result = {
        boards: Array.from(boardsMap.values()),
        standaloneTasks,
        activeBoardId
      }
      
      return result
    } catch (error) {
      console.error('[DB] Error loading boards:', error)
      return { boards: [], activeBoardId: null }
    }
  },

  saveAll: (boards, activeBoardId, standaloneTasks = []) => {
    try {
      const db = getDb()
      
      if (!Array.isArray(boards)) {
        console.error('[DB] saveAll: boards is not an array:', boards)
        return
      }
      
      console.log('[DB] Saving boards to database:', { 
        boardsCount: boards.length, 
        standaloneTasksCount: standaloneTasks?.length || 0,
        activeBoardId 
      })
      
      const transaction = db.transaction(() => {
        // Clear existing data
        db.prepare('DELETE FROM task_timeline').run()
        db.prepare('DELETE FROM tasks').run()
        db.prepare('DELETE FROM columns').run()
        db.prepare('DELETE FROM boards').run()

        // Insert boards
        const insertBoard = db.prepare('INSERT INTO boards (id, name, created_at) VALUES (?, ?, ?)')
        const insertColumn = db.prepare('INSERT INTO columns (id, board_id, title, position) VALUES (?, ?, ?, ?)')
        const insertTask = db.prepare(`
          INSERT INTO tasks (
            id, board_id, column_id, heading, tldr, description, 
            priority, tags, extended_data, due_date, status, position, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `)
        const insertTimeline = db.prepare('INSERT INTO task_timeline (task_id, timestamp, action) VALUES (?, ?, ?)')

        boards.forEach((board) => {
          if (!board.id || !board.name) {
            console.error('Invalid board:', board)
            return
          }
          
          insertBoard.run(board.id, board.name, board.createdAt || new Date().toISOString())

          if (board.columns && Array.isArray(board.columns)) {
            board.columns.forEach((column, columnIndex) => {
              if (!column.id || !column.title) {
                console.error('Invalid column:', column)
                return
              }
              
              insertColumn.run(column.id, board.id, column.title, columnIndex)

              if (column.tasks && Array.isArray(column.tasks)) {
                column.tasks.forEach((task, taskIndex) => {
                  if (!task.id) {
                    console.error('Invalid task:', task)
                    return
                  }
                  
                  const tagsJson = JSON.stringify(task.settings?.tags || [])
                  const extendedDataJson = JSON.stringify(task.extendedData || {})
                  insertTask.run(
                    task.id,
                    board.id,
                    column.id,
                    task.heading,
                    task.tldr || '',
                    task.description || '',
                    task.settings?.priority || 'medium',
                    tagsJson,
                    extendedDataJson,
                    task.settings?.dueDate || '',
                    task.settings?.status || column.title,
                    taskIndex,
                    task.createdAt || new Date().toISOString()
                  )

                  // Insert timeline entries
                  if (task.timeline && Array.isArray(task.timeline)) {
                    task.timeline.forEach(timelineEntry => {
                      insertTimeline.run(task.id, timelineEntry.timestamp, timelineEntry.action)
                    })
                  }
                })
              }
            })
          }
        })

        // Save standalone tasks (tasks without board_id)
        if (standaloneTasks && Array.isArray(standaloneTasks)) {
          standaloneTasks.forEach((task, taskIndex) => {
            if (!task.id) {
              console.error('Invalid standalone task:', task)
              return
            }
            
            const tagsJson = JSON.stringify(task.settings?.tags || [])
            const extendedDataJson = JSON.stringify(task.extendedData || {})
            insertTask.run(
              task.id,
              null, // board_id is NULL for standalone tasks
              null, // column_id is NULL for standalone tasks
              task.heading,
              task.tldr || '',
              task.description || '',
              task.settings?.priority || 'medium',
              tagsJson,
              extendedDataJson,
              task.settings?.dueDate || '',
              task.settings?.status || 'To Do',
              taskIndex,
              task.createdAt || new Date().toISOString()
            )

            // Insert timeline entries
            if (task.timeline && Array.isArray(task.timeline)) {
              task.timeline.forEach(timelineEntry => {
                insertTimeline.run(task.id, timelineEntry.timestamp, timelineEntry.action)
              })
            }
          })
        }

        // Save active board ID
        if (activeBoardId) {
          db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run('activeBoardId', activeBoardId)
        }
      })

      transaction()
      console.log('[DB] Boards saved to database successfully')
    } catch (error) {
      console.error('[DB] Error saving boards:', error)
      throw error
    }
  }
}

// Deleted tasks operations
export const deletedTasksOperations = {
  getAll: () => {
    const db = getDb()
    const rows = db.prepare('SELECT * FROM deleted_tasks ORDER BY deleted_at DESC').all()
    return rows.map(row => ({
      boardId: row.board_id,
      boardName: row.board_name,
      columnId: row.column_id,
      columnTitle: row.column_title,
      task: JSON.parse(row.task_data),
      deletedAt: row.deleted_at
    }))
  },

  saveAll: (deletedTasks) => {
    const db = getDb()
    const transaction = db.transaction(() => {
      db.prepare('DELETE FROM deleted_tasks').run()

      const insert = db.prepare(`
        INSERT INTO deleted_tasks (
          board_id, board_name, column_id, column_title, 
          task_id, task_data, deleted_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `)

      deletedTasks.forEach(deletedTask => {
        insert.run(
          deletedTask.boardId,
          deletedTask.boardName,
          deletedTask.columnId,
          deletedTask.columnTitle,
          deletedTask.task.id,
          JSON.stringify(deletedTask.task),
          deletedTask.deletedAt
        )
      })
    })

    transaction()
  }
}

// Settings operations
export const settingsOperations = {
  getAll: () => {
    const db = getDb()
    const rows = db.prepare('SELECT * FROM settings').all()
    const settings = {}
    
    rows.forEach(row => {
      try {
        settings[row.key] = JSON.parse(row.value)
      } catch {
        settings[row.key] = row.value
      }
    })

    // Set defaults
    return {
      startView: settings.startView || 'boards',
      tasksPageSize: settings.tasksPageSize || 6,
      defaultTaskPriority: settings.defaultTaskPriority || 'medium',
      confirmBeforeDelete: settings.confirmBeforeDelete !== undefined ? settings.confirmBeforeDelete : true,
      activeBoardId: settings.activeBoardId || null
    }
  },

  saveAll: (settings) => {
    const db = getDb()
    const transaction = db.transaction(() => {
      const insert = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)')

      Object.entries(settings).forEach(([key, value]) => {
        const valueStr = typeof value === 'string' ? value : JSON.stringify(value)
        insert.run(key, valueStr)
      })
    })

    transaction()
  }
}

// Close database connection when app quits
app.on('before-quit', () => {
  if (db) {
    db.close()
  }
})
