import Database from 'better-sqlite3'
import { app } from 'electron'
import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import { v4 as uuidv4 } from 'uuid'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Initialize database - ensure app is ready first
let db = null
let notesDir = null

function initializeDatabase() {
  if (db) return db
  
  try {
    let userDataPath;
    try {
      userDataPath = app.getPath('userData')
    } catch (e) {
      // Fallback for tests if app.getPath fails
      userDataPath = './db-test'
    }
    
    const dbPath = path.join(userDataPath, 'kanban.db')
    const notesPath = path.join(userDataPath, 'notes')
    notesDir = notesPath

    // Skip actual file DB initialization if we are in a test environment and db is already set via _setDb
    // This is handled by the 'db' check at the top, but we also want to avoid fs ops if possible
    
    // Ensure the directory exists
    if (!fs.existsSync(userDataPath)) {
      try {
        fs.mkdirSync(userDataPath, { recursive: true })
      } catch (e) {
        console.warn('[DB] Could not create userData directory:', e.message)
      }
    }

    if (!fs.existsSync(notesPath)) {
      try {
        fs.mkdirSync(notesPath, { recursive: true })
        console.log('[DB] Created notes directory at:', notesPath)
      } catch (e) {
        console.warn('[DB] Could not create notes directory:', e.message)
      }
    }

    // Initialize database
    try {
      db = new Database(dbPath)
      // Enable foreign keys
      db.pragma('foreign_keys = ON')
      console.log('[DB] Database initialized successfully at:', dbPath)
    } catch (e) {
      console.error('[DB] Failed to initialize file-based database:', e.message)
      console.log('[DB] Falling back to in-memory database for this session')
      db = new Database(':memory:')
    }
    
    return db
  } catch (error) {
    console.error('[DB] Critical failure in database initialization:', error)
    // Absolute fallback
    db = new Database(':memory:')
    return db
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
export function getDb() {
  if (!db) {
    initializeDatabase()
  }
  return db
}

// For testing purposes
export function _setDb(newDb) {
  db = newDb
}

// Initialize schema
export function initializeSchema() {
  const db = getDb()
  
  try {
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
        due_date TEXT DEFAULT '',
        status TEXT DEFAULT 'To Do',
        completed INTEGER DEFAULT 0,
        created_at TEXT NOT NULL,
        position INTEGER DEFAULT 0,
        FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE,
        FOREIGN KEY (column_id) REFERENCES columns(id) ON DELETE CASCADE
      )
    `)

    // Task timeline table
    db.exec(`
      CREATE TABLE IF NOT EXISTS task_timeline (
        id TEXT PRIMARY KEY,
        task_id TEXT NOT NULL,
        action TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
      )
    `)

    // Checklists table
    db.exec(`
      CREATE TABLE IF NOT EXISTS checklists (
        id TEXT PRIMARY KEY,
        task_id TEXT NOT NULL,
        title TEXT NOT NULL,
        items TEXT NOT NULL,
        FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
      )
    `)

    // Attachments table
    db.exec(`
      CREATE TABLE IF NOT EXISTS attachments (
        id TEXT PRIMARY KEY,
        task_id TEXT NOT NULL,
        url TEXT NOT NULL,
        title TEXT NOT NULL,
        cover_image INTEGER DEFAULT 0,
        created_at TEXT NOT NULL,
        FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
      )
    `)

    // Task comments table
    db.exec(`
      CREATE TABLE IF NOT EXISTS task_comments (
        id TEXT PRIMARY KEY,
        task_id TEXT NOT NULL,
        text TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
      )
    `)

    // Notifications table
    db.exec(`
      CREATE TABLE IF NOT EXISTS notifications (
        id TEXT PRIMARY KEY,
        task_id TEXT NOT NULL,
        title TEXT NOT NULL,
        body TEXT NOT NULL,
        trigger_type TEXT NOT NULL,
        sent_at DATETIME NOT NULL,
        read_at DATETIME,
        FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
      )
    `)

    // Settings table
    db.exec(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      )
    `)

    // Notes table
    db.exec(`
      CREATE TABLE IF NOT EXISTS notes (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `)

    // Task notes table (junction table)
    db.exec(`
      CREATE TABLE IF NOT EXISTS task_notes (
        task_id TEXT NOT NULL,
        note_id TEXT NOT NULL,
        PRIMARY KEY (task_id, note_id),
        FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
        FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE
      )
    `)

    // Create indexes for better performance
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_columns_board_id ON columns(board_id);
      CREATE INDEX IF NOT EXISTS idx_tasks_board_id ON tasks(board_id);
      CREATE INDEX IF NOT EXISTS idx_tasks_column_id ON tasks(column_id);
      CREATE INDEX IF NOT EXISTS idx_task_timeline_task_id ON task_timeline(task_id);
      CREATE INDEX IF NOT EXISTS idx_checklists_task_id ON checklists(task_id);
      CREATE INDEX IF NOT EXISTS idx_attachments_task_id ON attachments(task_id);
      CREATE INDEX IF NOT EXISTS idx_task_comments_task_id ON task_comments(task_id);
      CREATE INDEX IF NOT EXISTS idx_notifications_task_id ON notifications(task_id);
      CREATE INDEX IF NOT EXISTS idx_task_notes_task_id ON task_notes(task_id);
      CREATE INDEX IF NOT EXISTS idx_task_notes_note_id ON task_notes(note_id);
    `)

    // Run migrations
    migrateDeadlines()
  } catch (error) {
    console.error('[DB] Failed to initialize schema:', error)
  }
}

/**
 * Migrates existing date-only deadlines to ISO 8601 format by appending T10:00:00Z.
 */
function migrateDeadlines() {
  const db = getDb()
  const tasks = db.prepare("SELECT id, due_date FROM tasks WHERE due_date IS NOT NULL AND due_date != '' AND due_date NOT LIKE '%T%'").all()
  
  if (tasks.length === 0) return

  const dateRegex = /^\d{4}-\d{2}-\d{2}$/
  let count = 0
  const updateStmt = db.prepare("UPDATE tasks SET due_date = ? WHERE id = ?")
  const transaction = db.transaction((tasksToUpdate) => {
    for (const task of tasksToUpdate) {
      if (dateRegex.test(task.due_date)) {
        updateStmt.run(`${task.due_date}T10:00:00Z`, task.id)
        count++
      }
    }
  })
  
  transaction(tasks)
  if (count > 0) {
    console.log(`[DB] Migrated ${count} deadlines to ISO 8601 format`)
  }
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
      const checklists = db.prepare('SELECT * FROM checklists').all()
      const attachments = db.prepare('SELECT * FROM attachments').all()
      const comments = db.prepare('SELECT * FROM task_comments ORDER BY created_at ASC').all()

      // Group checklists, attachments and comments by task_id for efficient lookup
      const checklistsByTask = checklists.reduce((acc, checklist) => {
        if (!acc[checklist.task_id]) acc[checklist.task_id] = []
        // Each entry in the store is expected to have { id, text, completed }
        // The checklists table in SQLite uses 'title' and 'items' (JSON)
        try {
          const items = JSON.parse(checklist.items)
          // Ensure it's an array for Zod validation
          acc[checklist.task_id] = Array.isArray(items) ? items : []
        } catch (e) {
          console.error(`[DB] Failed to parse checklists items for task ${checklist.task_id}:`, e)
          acc[checklist.task_id] = []
        }
        return acc
      }, {})

      const attachmentsByTask = attachments.reduce((acc, attachment) => {
        if (!acc[attachment.task_id]) acc[attachment.task_id] = []
        acc[attachment.task_id].push({
          id: attachment.id,
          url: attachment.url,
          title: attachment.title,
          coverImage: !!attachment.cover_image,
          createdAt: attachment.created_at
        })
        return acc
      }, {})

      const commentsByTask = comments.reduce((acc, comment) => {
        if (!acc[comment.task_id]) acc[comment.task_id] = []
        acc[comment.task_id].push({
          id: comment.id,
          text: comment.text,
          createdAt: comment.created_at
        })
        return acc
      }, {})

      const timelineByTask = timeline.reduce((acc, t) => {
        if (!acc[t.task_id]) acc[t.task_id] = []
        acc[t.task_id].push({
          timestamp: t.timestamp,
          action: t.action
        })
        return acc
      }, {})

      const tasksByColumn = tasks.reduce((acc, task) => {
        const key = task.column_id || 'standalone'
        if (!acc[key]) acc[key] = []
        acc[key].push({
          id: task.id,
          boardId: task.board_id,
          columnId: task.column_id,
          heading: task.heading,
          tldr: task.tldr,
          description: task.description,
          createdAt: task.created_at,
          settings: {
            priority: task.priority,
            tags: (() => {
              try {
                const parsed = JSON.parse(task.tags || '[]')
                return Array.isArray(parsed) ? parsed : []
              } catch {
                return []
              }
            })(),
            dueDate: task.due_date,
            status: task.status,
            completed: !!task.completed
          },
          extendedData: {
            checklists: checklistsByTask[task.id] || [],
            attachments: attachmentsByTask[task.id] || [],
            comments: commentsByTask[task.id] || []
          },
          timeline: timelineByTask[task.id] || []
        })
        return acc
      }, {})

      const columnsWithTasks = columns.map(col => ({
        id: col.id,
        boardId: col.board_id,
        title: col.title,
        position: col.position,
        tasks: tasksByColumn[col.id] || []
      }))

      const columnsByBoard = columnsWithTasks.reduce((acc, col) => {
        if (!acc[col.boardId]) acc[col.boardId] = []
        acc[col.boardId].push(col)
        return acc
      }, {})

      const boardsWithColumns = boards.map(board => ({
        id: board.id,
        name: board.name,
        createdAt: board.createdAt || board.created_at, // Handle both casing styles
        columns: columnsByBoard[board.id] || []
      }))

      // Get activeBoardId from settings
      let activeBoardId = null
      try {
        const row = db.prepare('SELECT value FROM settings WHERE key = ?').get('activeBoardId')
        if (row) {
          try {
            activeBoardId = JSON.parse(row.value)
          } catch {
            activeBoardId = row.value
          }
        }
      } catch (e) {
        console.warn('[DB] Could not fetch activeBoardId from settings:', e.message)
      }

      return {
        boards: boardsWithColumns,
        standaloneTasks: tasksByColumn['standalone'] || [],
        activeBoardId
      }
    } catch (error) {
      console.error('[DB] Error in boardOperations.getAll:', error)
      return { boards: [], standaloneTasks: [] }
    }
  },

  saveAll: (boards, activeBoardId, standaloneTasks) => {
    const db = getDb()
    const transaction = db.transaction(() => {
      // Clear existing data
      db.prepare('DELETE FROM boards').run()
      db.prepare('DELETE FROM columns').run()
      db.prepare('DELETE FROM tasks').run()
      db.prepare('DELETE FROM task_timeline').run()
      db.prepare('DELETE FROM checklists').run()
      db.prepare('DELETE FROM attachments').run()
      db.prepare('DELETE FROM task_comments').run()

      const insertBoard = db.prepare('INSERT INTO boards (id, name, created_at) VALUES (?, ?, ?)')
      const insertColumn = db.prepare('INSERT INTO columns (id, board_id, title, position) VALUES (?, ?, ?, ?)')
      
      boards.forEach(board => {
        insertBoard.run(board.id, board.name, board.createdAt || new Date().toISOString())
        if (board.columns) {
          board.columns.forEach((col, index) => {
            insertColumn.run(col.id, board.id, col.title, index)
            if (col.tasks) {
              col.tasks.forEach((task, taskIndex) => {
                taskOperations.create({
                  ...task,
                  board_id: board.id,
                  column_id: col.id,
                  position: taskIndex
                })
              })
            }
          })
        }
      })

      // Insert standalone tasks
      if (standaloneTasks) {
        standaloneTasks.forEach((task, index) => {
          taskOperations.create({
            ...task,
            board_id: null,
            column_id: null,
            position: index,
            isStandalone: true
          })
        })
      }

      // Save activeBoardId to settings
      if (activeBoardId) {
        db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run('activeBoardId', activeBoardId)
      }
    })
    transaction()
  }
}

// Task operations
export const taskOperations = {
  create: (task) => {
    const db = getDb()
    const { 
      id, board_id, column_id, heading, tldr, description, 
      created_at, position,
      extendedData, timeline, settings
    } = task

    const priority = settings?.priority || task.priority || 'medium'
    const tags = settings?.tags || task.tags || []
    const due_date = settings?.dueDate || task.due_date || ''
    const status = settings?.status || task.status || 'To Do'
    const completed = settings?.completed !== undefined ? settings.completed : (task.completed ? 1 : 0)

    const insertTask = db.prepare(`
      INSERT INTO tasks (
        id, board_id, column_id, heading, tldr, description, 
        priority, tags, due_date, status, completed, created_at, position
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    insertTask.run(
      id, board_id || null, column_id || null, heading, tldr || '', description || '',
      priority, JSON.stringify(tags), due_date, 
      status, completed ? 1 : 0, created_at || new Date().toISOString(), position || 0
    )

    // Insert timeline
    if (timeline) {
      const insertTimeline = db.prepare('INSERT INTO task_timeline (id, task_id, action, timestamp) VALUES (?, ?, ?, ?)')
      timeline.forEach(t => {
        insertTimeline.run(uuidv4(), id, t.action, t.timestamp)
      })
    }

    // Insert checklists
    if (extendedData?.checklists) {
      const insertChecklist = db.prepare('INSERT INTO checklists (id, task_id, title, items) VALUES (?, ?, ?, ?)')
      // Grouping all items into one checklist for now as the current UI shows one checklist
      insertChecklist.run(uuidv4(), id, 'Checklist', JSON.stringify(extendedData.checklists))
    }

    // Insert attachments
    if (extendedData?.attachments) {
      const insertAttachment = db.prepare('INSERT INTO attachments (id, task_id, url, title, cover_image, created_at) VALUES (?, ?, ?, ?, ?, ?)')
      extendedData.attachments.forEach(a => {
        insertAttachment.run(a.id || uuidv4(), id, a.url, a.title, a.coverImage ? 1 : 0, a.createdAt || new Date().toISOString())
      })
    }

    // Insert comments
    if (extendedData?.comments) {
      const insertComment = db.prepare('INSERT INTO task_comments (id, task_id, text, created_at) VALUES (?, ?, ?, ?)')
      extendedData.comments.forEach(c => {
        insertComment.run(c.id || uuidv4(), id, c.text, c.createdAt || new Date().toISOString())
      })
    }
  },

  update: (taskId, updates) => {
    const db = getDb()
    const transaction = db.transaction(() => {
      const fields = []
      const values = []

      if (updates.heading !== undefined) {
        fields.push('heading = ?')
        values.push(updates.heading)
      }
      if (updates.tldr !== undefined) {
        fields.push('tldr = ?')
        values.push(updates.tldr)
      }
      if (updates.description !== undefined) {
        fields.push('description = ?')
        values.push(updates.description)
      }
      if (updates.settings) {
        if (updates.settings.priority !== undefined) {
          fields.push('priority = ?')
          values.push(updates.settings.priority)
        }
        if (updates.settings.tags !== undefined) {
          fields.push('tags = ?')
          values.push(JSON.stringify(updates.settings.tags))
        }
        if (updates.settings.dueDate !== undefined) {
          fields.push('due_date = ?')
          values.push(updates.settings.dueDate)
        }
        if (updates.settings.status !== undefined) {
          fields.push('status = ?')
          values.push(updates.settings.status)
        }
        if (updates.settings.completed !== undefined) {
          fields.push('completed = ?')
          values.push(updates.settings.completed ? 1 : 0)
        }
      }

      if (fields.length > 0) {
        values.push(taskId)
        db.prepare(`UPDATE tasks SET ${fields.join(', ')} WHERE id = ?`).run(...values)
      }

      // Update timeline
      if (updates.timeline) {
        // We only add new timeline entries, don't replace
        const existingCount = db.prepare('SELECT COUNT(*) as count FROM task_timeline WHERE task_id = ?').get(taskId).count
        const newEntries = updates.timeline.slice(existingCount)
        const insertTimeline = db.prepare('INSERT INTO task_timeline (id, task_id, action, timestamp) VALUES (?, ?, ?, ?)')
        newEntries.forEach(t => {
          insertTimeline.run(uuidv4(), taskId, t.action, t.timestamp)
        })
      }

      // Update extended data
      if (updates.extendedData) {
        if (updates.extendedData.checklists) {
          db.prepare('DELETE FROM checklists WHERE task_id = ?').run(taskId)
          const insertChecklist = db.prepare('INSERT INTO checklists (id, task_id, title, items) VALUES (?, ?, ?, ?)')
          insertChecklist.run(uuidv4(), taskId, 'Checklist', JSON.stringify(updates.extendedData.checklists))
        }
        if (updates.extendedData.attachments) {
          db.prepare('DELETE FROM attachments WHERE task_id = ?').run(taskId)
          const insertAttachment = db.prepare('INSERT INTO attachments (id, task_id, url, title, cover_image, created_at) VALUES (?, ?, ?, ?, ?, ?)')
          updates.extendedData.attachments.forEach(a => {
            insertAttachment.run(a.id || uuidv4(), taskId, a.url, a.title, a.coverImage ? 1 : 0, a.createdAt || new Date().toISOString())
          })
        }
        if (updates.extendedData.comments) {
          db.prepare('DELETE FROM task_comments WHERE task_id = ?').run(taskId)
          const insertComment = db.prepare('INSERT INTO task_comments (id, task_id, text, created_at) VALUES (?, ?, ?, ?)')
          updates.extendedData.comments.forEach(c => {
            insertComment.run(c.id || uuidv4(), taskId, c.text, c.createdAt || new Date().toISOString())
          })
        }
      }
    })
    transaction()
  },

  delete: (taskId) => {
    const db = getDb()
    db.prepare('DELETE FROM tasks WHERE id = ?').run(taskId)
  },

  move: (taskId, boardId, columnId, position) => {
    const db = getDb()
    db.prepare('UPDATE tasks SET board_id = ?, column_id = ?, position = ? WHERE id = ?')
      .run(boardId || null, columnId || null, position, taskId)
  }
}

// Deleted tasks operations
export const deletedTasksOperations = {
  getAll: () => {
    const db = getDb()
    const rows = db.prepare('SELECT * FROM deleted_tasks ORDER BY deleted_at DESC').all()
    return rows.map(row => {
      let task = {}
      try {
        if (row.task_json && row.task_json !== 'undefined') {
          task = JSON.parse(row.task_json)
        }
      } catch (e) {
        console.error(`[DB] Failed to parse task_json for deleted task ${row.id}:`, e)
      }
      return {
        boardId: row.board_id,
        boardName: row.board_name,
        columnId: row.column_id,
        columnTitle: row.column_title,
        deletedAt: row.deleted_at,
        task: task
      }
    })
  },

  saveAll: (deletedTasks) => {
    const db = getDb()
    const transaction = db.transaction(() => {
      db.prepare('DELETE FROM deleted_tasks').run()
      const insert = db.prepare(`
        INSERT INTO deleted_tasks (id, board_id, board_name, column_id, column_title, task_json, deleted_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `)

      deletedTasks.forEach(dt => {
        insert.run(
          dt.task.id,
          dt.boardId || null,
          dt.boardName || '',
          dt.columnId || null,
          dt.columnTitle || '',
          JSON.stringify(dt.task),
          dt.deletedAt || new Date().toISOString()
        )
      })
    })
    transaction()
  }
}

// Notification operations
export const notificationOperations = {
  getAll: () => {
    const db = getDb()
    return db.prepare('SELECT * FROM notifications ORDER BY sent_at DESC').all()
  },

  create: (notification) => {
    const db = getDb()
    const insert = db.prepare(`
      INSERT INTO notifications (id, task_id, title, body, trigger_type, sent_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `)
    insert.run(
      uuidv4(),
      notification.taskId,
      notification.title,
      notification.body,
      notification.triggerType,
      new Date().toISOString()
    )
  },

  markAsRead: (id) => {
    const db = getDb()
    db.prepare('UPDATE notifications SET read_at = ? WHERE id = ?').run(new Date().toISOString(), id)
  },

  hasBeenSent: (taskId, triggerType) => {
    const db = getDb()
    const result = db.prepare('SELECT id FROM notifications WHERE task_id = ? AND trigger_type = ?')
      .get(taskId, triggerType)
    return !!result
  }
}

// Note operations
export const noteOperations = {
  getNotePath: (id) => {
    if (!notesDir) return null
    return path.join(notesDir, `${id}.json`)
  },

  getNoteContent: (id) => {
    const notePath = noteOperations.getNotePath(id)
    if (!notePath || !fs.existsSync(notePath)) return null
    try {
      const content = fs.readFileSync(notePath, 'utf8')
      return JSON.parse(content)
    } catch (e) {
      console.error(`[DB] Failed to read note content for note ${id}:`, e)
      return null
    }
  },

  getAll: () => {
    const db = getDb()
    const notes = db.prepare('SELECT id, title, content, created_at, updated_at FROM notes ORDER BY updated_at DESC').all()
    const taskNotes = db.prepare('SELECT * FROM task_notes').all()

    const taskNotesMap = taskNotes.reduce((acc, tn) => {
      if (!acc[tn.note_id]) acc[tn.note_id] = []
      acc[tn.note_id].push(tn.task_id)
      return acc
    }, {})

    return notes.map(note => {
      const notePath = noteOperations.getNotePath(note.id)
      const hasFile = notePath && fs.existsSync(notePath)
      
      // Migration check: if file doesn't exist but DB has content
      if (!hasFile && note.content) {
        try {
          const content = (typeof note.content === 'string' && (note.content.startsWith('{') || note.content.startsWith('['))) 
            ? JSON.parse(note.content) 
            : note.content
          
          if (content && notePath) {
            fs.writeFileSync(notePath, JSON.stringify(content), 'utf8')
            console.log(`[DB] Migrated note ${note.id} to filesystem`)
          }
        } catch (e) {
          console.warn(`[DB] Failed to migrate note content for note ${note.id}:`, e)
        }
      }

      return {
        id: note.id,
        title: note.title,
        content: null, // Don't load content here for efficiency
        createdAt: note.created_at,
        updatedAt: note.updated_at,
        taskIds: taskNotesMap[note.id] || []
      }
    })
  },

  saveAll: (notes) => {
    const db = getDb()
    const transaction = db.transaction(() => {
      // Clear existing links
      db.prepare('DELETE FROM task_notes').run()
      // We don't delete files here to avoid data loss on bulk sync
      // But we will delete and re-insert DB entries
      db.prepare('DELETE FROM notes').run()

      const insertNote = db.prepare(`
        INSERT INTO notes (id, title, content, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?)
      `)
      const insertTaskNote = db.prepare(`
        INSERT INTO task_notes (task_id, note_id)
        VALUES (?, ?)
      `)

      notes.forEach(note => {
        // Save content to file ONLY if it was loaded (not null)
        if (note.content !== null) {
          const notePath = noteOperations.getNotePath(note.id)
          if (notePath) {
            fs.writeFileSync(notePath, JSON.stringify(note.content || ''), 'utf8')
          }
        }

        // Save metadata to DB (content column will be empty)
        insertNote.run(note.id, note.title, '', note.createdAt, note.updatedAt)
        
        if (note.taskIds && Array.isArray(note.taskIds)) {
          note.taskIds.forEach(taskId => {
            insertTaskNote.run(taskId, note.id)
          })
        }
      })
    })
    transaction()
  },

  create: (note) => {
    const db = getDb()
    const transaction = db.transaction(() => {
      // Save content to file
      const notePath = noteOperations.getNotePath(note.id)
      if (notePath) {
        fs.writeFileSync(notePath, JSON.stringify(note.content || ''), 'utf8')
      }

      // Save metadata to DB
      db.prepare(`
        INSERT INTO notes (id, title, content, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(note.id, note.title, '', note.createdAt, note.updatedAt)

      if (note.taskIds && Array.isArray(note.taskIds)) {
        const insertTaskNote = db.prepare('INSERT INTO task_notes (task_id, note_id) VALUES (?, ?)')
        note.taskIds.forEach(taskId => {
          insertTaskNote.run(taskId, note.id)
        })
      }
    })
    transaction()
  },

  update: (id, updates) => {
    const db = getDb()
    const transaction = db.transaction(() => {
      const fields = []
      const values = []

      if (updates.title !== undefined) {
        fields.push('title = ?')
        values.push(updates.title)
      }
      
      if (updates.content !== undefined) {
        // Save content to file
        const notePath = noteOperations.getNotePath(id)
        if (notePath) {
          fs.writeFileSync(notePath, JSON.stringify(updates.content || ''), 'utf8')
        }
        // Metadata in DB doesn't store content anymore
      }

      if (updates.updatedAt !== undefined) {
        fields.push('updated_at = ?')
        values.push(updates.updatedAt)
      }

      if (fields.length > 0) {
        values.push(id)
        db.prepare(`UPDATE notes SET ${fields.join(', ')} WHERE id = ?`).run(...values)
      }

      if (updates.taskIds !== undefined) {
        db.prepare('DELETE FROM task_notes WHERE note_id = ?').run(id)
        const insertTaskNote = db.prepare('INSERT INTO task_notes (task_id, note_id) VALUES (?, ?)')
        updates.taskIds.forEach(taskId => {
          insertTaskNote.run(taskId, id)
        })
      }
    })
    transaction()
  },

  delete: (id) => {
    const db = getDb()
    const transaction = db.transaction(() => {
      // Delete from DB (links are deleted by CASCADE)
      db.prepare('DELETE FROM notes WHERE id = ?').run(id)
      
      // Delete from filesystem
      const notePath = noteOperations.getNotePath(id)
      if (notePath && fs.existsSync(notePath)) {
        try {
          fs.unlinkSync(notePath)
        } catch (e) {
          console.error(`[DB] Failed to delete note file for note ${id}:`, e)
        }
      }
    })
    transaction()
  },

  linkToTask: (noteId, taskId) => {
    const db = getDb()
    db.prepare('INSERT OR IGNORE INTO task_notes (task_id, note_id) VALUES (?, ?)').run(taskId, noteId)
  },

  unlinkFromTask: (noteId, taskId) => {
    const db = getDb()
    db.prepare('DELETE FROM task_notes WHERE task_id = ? AND note_id = ?').run(taskId, noteId)
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
