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
      status TEXT NOT NULL,
      position INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE,
      FOREIGN KEY (column_id) REFERENCES columns(id) ON DELETE CASCADE
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
      cover_image TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
    )
  `)

  // Comments table
  db.exec(`
    CREATE TABLE IF NOT EXISTS task_comments (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL,
      text TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
    )
  `)

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
    CREATE INDEX IF NOT EXISTS idx_checklists_task_id ON checklists(task_id);
    CREATE INDEX IF NOT EXISTS idx_attachments_task_id ON attachments(task_id);
    CREATE INDEX IF NOT EXISTS idx_task_comments_task_id ON task_comments(task_id);
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
      const checklists = db.prepare('SELECT * FROM checklists').all()
      const attachments = db.prepare('SELECT * FROM attachments').all()
      const comments = db.prepare('SELECT * FROM task_comments ORDER BY created_at ASC').all()

      // Group checklists, attachments and comments by task_id for efficient lookup
      const checklistsByTask = checklists.reduce((acc, checklist) => {
        if (!acc[checklist.task_id]) acc[checklist.task_id] = []
        // Each entry in the store is expected to have { id, text, completed }
        // The checklists table in SQLite uses 'title' and 'items' (JSON)
        // We'll normalize this back to the store's format.
        try {
          const items = JSON.parse(checklist.items || '[]')
          if (Array.isArray(items) && items.length > 0) {
            // If items is an array of objects, use them directly (legacy/alternate format)
            items.forEach(item => acc[checklist.task_id].push({
              id: item.id || uuidv4(),
              text: item.text || '',
              completed: !!item.completed
            }))
          } else {
            // New format: checklist table title is the text
            acc[checklist.task_id].push({
              id: checklist.id,
              text: checklist.title || '',
              completed: !!(items.completed)
            })
          }
        } catch (e) {
          acc[checklist.task_id].push({
            id: checklist.id,
            text: checklist.title || '',
            completed: false
          })
        }
        return acc
      }, {})

      const attachmentsByTask = attachments.reduce((acc, attachment) => {
        if (!acc[attachment.task_id]) acc[attachment.task_id] = []
        acc[attachment.task_id].push({
          id: attachment.id,
          url: attachment.url,
          title: attachment.title,
          coverImage: attachment.cover_image,
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
          checklists: checklistsByTask[task.id] || [],
          attachments: attachmentsByTask[task.id] || [],
          comments: commentsByTask[task.id] || []
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
      return { boards: [], standaloneTasks: [], activeBoardId: null }
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
        db.prepare('DELETE FROM attachments').run()
        db.prepare('DELETE FROM checklists').run()
        db.prepare('DELETE FROM task_comments').run()
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
            priority, tags, due_date, status, position, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `)
        const insertTimeline = db.prepare('INSERT INTO task_timeline (task_id, timestamp, action) VALUES (?, ?, ?)')
        const insertChecklist = db.prepare('INSERT INTO checklists (id, task_id, title, items) VALUES (?, ?, ?, ?)')
        const insertAttachment = db.prepare('INSERT INTO attachments (id, task_id, url, title, cover_image, created_at) VALUES (?, ?, ?, ?, ?, ?)')
        const insertComment = db.prepare('INSERT INTO task_comments (id, task_id, text, created_at) VALUES (?, ?, ?, ?)')

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
                  insertTask.run(
                    task.id,
                    board.id,
                    column.id,
                    task.heading,
                    task.tldr || '',
                    task.description || '',
                    task.settings?.priority || 'medium',
                    tagsJson,
                    task.settings?.dueDate || '',
                    task.settings?.status || column.title,
                    taskIndex,
                    task.createdAt || new Date().toISOString()
                  )

                  // Insert checklists
                  if (task.extendedData?.checklists) {
                    task.extendedData.checklists.forEach(checklist => {
                      // Store 'text' as 'title' for backwards compatibility/simplicity
                      // Store 'completed' in 'items' as a JSON object
                      insertChecklist.run(
                        checklist.id, 
                        task.id, 
                        checklist.text || '', 
                        JSON.stringify({ completed: !!checklist.completed })
                      )
                    })
                  }

                  // Insert attachments
                  if (task.extendedData?.attachments) {
                    task.extendedData.attachments.forEach(attachment => {
                      insertAttachment.run(attachment.id, task.id, attachment.url, attachment.title, attachment.coverImage, attachment.createdAt)
                    })
                  }

                  // Insert comments
                  if (task.extendedData?.comments) {
                    task.extendedData.comments.forEach(comment => {
                      insertComment.run(comment.id, task.id, comment.text, comment.createdAt)
                    })
                  }

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
            insertTask.run(
              task.id,
              null, // board_id is NULL for standalone tasks
              null, // column_id is NULL for standalone tasks
              task.heading,
              task.tldr || '',
              task.description || '',
              task.settings?.priority || 'medium',
              tagsJson,
              task.settings?.dueDate || '',
              task.settings?.status || 'To Do',
              taskIndex,
              task.createdAt || new Date().toISOString()
            )

            // Insert checklists and attachments for standalone tasks
            if (task.extendedData?.checklists) {
              task.extendedData.checklists.forEach(checklist => {
                insertChecklist.run(checklist.id, task.id, checklist.title, JSON.stringify(checklist.items || []))
              })
            }
            if (task.extendedData?.attachments) {
              task.extendedData.attachments.forEach(attachment => {
                insertAttachment.run(attachment.id, task.id, attachment.url, attachment.title, attachment.coverImage, attachment.createdAt)
              })
            }

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

export const taskOperations = {
  create: (taskData) => {
    const db = getDb()
    const { id, board_id, column_id, heading, tldr, description, priority, tags, extendedData, due_date, status, position, created_at } = taskData;
    
    const transaction = db.transaction(() => {
      // Make space for the new task by incrementing positions of existing tasks
      const incrementPositionStmt = db.prepare(
        'UPDATE tasks SET position = position + 1 WHERE column_id = ? AND position >= ?'
      );
      incrementPositionStmt.run(column_id, position);

      const tagsJson = JSON.stringify(tags || [])
      
      const stmt = db.prepare(`
        INSERT INTO tasks (id, board_id, column_id, heading, tldr, description, priority, tags, due_date, status, position, created_at)
        VALUES (@id, @board_id, @column_id, @heading, @tldr, @description, @priority, @tags, @due_date, @status, @position, @created_at)
      `)
      
      stmt.run({
        id, board_id, column_id, heading, tldr, description, priority, 
        tags: tagsJson,
        due_date, status, position, created_at
      })

      // Create checklists and attachments
      if (extendedData?.checklists) {
        extendedData.checklists.forEach(c => checklistOperations.create(id, c))
      }
      if (extendedData?.attachments) {
        extendedData.attachments.forEach(a => attachmentOperations.create(id, a))
      }
      if (extendedData?.comments) {
        extendedData.comments.forEach(c => commentOperations.create(id, c))
      }
    });

    transaction();
    return { id };
  },

  update: (taskId, updates) => {
    const db = getDb()
    const transaction = db.transaction(() => {
      const fields = []
      const values = []
      
      // Do not allow updating primary key or foreign keys directly
      const forbiddenKeys = ['id', 'board_id', 'column_id', 'position', 'extendedData'];
      const filteredUpdates = Object.fromEntries(
        Object.entries(updates).filter(([key]) => !forbiddenKeys.includes(key))
      );

      for (const [key, value] of Object.entries(filteredUpdates)) {
        fields.push(`${key} = ?`)
        if (key === 'tags') {
          values.push(JSON.stringify(value || []))
        } else {
          values.push(value)
        }
      }

      if (fields.length > 0) {
        values.push(taskId)
        const stmt = db.prepare(`UPDATE tasks SET ${fields.join(', ')} WHERE id = ?`)
        stmt.run(...values)
      }

      // Handle extendedData separately
      if (updates.extendedData) {
        // Simple strategy: delete all and re-create
        db.prepare('DELETE FROM checklists WHERE task_id = ?').run(taskId)
        db.prepare('DELETE FROM attachments WHERE task_id = ?').run(taskId)
        db.prepare('DELETE FROM task_comments WHERE task_id = ?').run(taskId)

        if (updates.extendedData.checklists) {
          updates.extendedData.checklists.forEach(c => checklistOperations.create(taskId, c))
        }
        if (updates.extendedData.attachments) {
          updates.extendedData.attachments.forEach(a => attachmentOperations.create(taskId, a))
        }
        if (updates.extendedData.comments) {
          updates.extendedData.comments.forEach(c => commentOperations.create(taskId, c))
        }
      }
    })
    transaction()
  },

  delete: (taskId) => {
    const db = getDb()
    const transaction = db.transaction(() => {
      const task = db.prepare('SELECT column_id, position FROM tasks WHERE id = ?').get(taskId)
      if (!task) return;

      const { column_id, position } = task;

      // Delete the task (checklists and attachments are deleted by CASCADE)
      const deleteStmt = db.prepare('DELETE FROM tasks WHERE id = ?')
      deleteStmt.run(taskId)

      // Decrement positions of subsequent tasks in the same column
      const updateStmt = db.prepare(
        'UPDATE tasks SET position = position - 1 WHERE column_id = ? AND position > ?'
      )
      updateStmt.run(column_id, position)
    });
    transaction();
  },

  move: (taskId, newBoardId, newColumnId, newPosition) => {
    const db = getDb()
    const transaction = db.transaction(() => {
      const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId)
      if (!task) return;

      const oldColumnId = task.column_id
      const oldPosition = task.position

      // If moving within the same column
      if (oldColumnId === newColumnId) {
        if (oldPosition < newPosition) {
          // Moved down: decrement positions between old and new
          db.prepare(
            'UPDATE tasks SET position = position - 1 WHERE column_id = ? AND position > ? AND position <= ?'
          ).run(oldColumnId, oldPosition, newPosition)
        } else {
          // Moved up: increment positions between new and old
          db.prepare(
            'UPDATE tasks SET position = position + 1 WHERE column_id = ? AND position >= ? AND position < ?'
          ).run(oldColumnId, newPosition, oldPosition)
        }
      } else {
        // Moving to a different column
        // Decrement positions in the old column
        db.prepare(
          'UPDATE tasks SET position = position - 1 WHERE column_id = ? AND position > ?'
        ).run(oldColumnId, oldPosition)

        // Increment positions in the new column to make space
        db.prepare(
          'UPDATE tasks SET position = position + 1 WHERE column_id = ? AND position >= ?'
        ).run(newColumnId, newPosition)
      }

      // Finally, update the task's board, column, and position
      db.prepare(
        'UPDATE tasks SET board_id = ?, column_id = ?, position = ? WHERE id = ?'
      ).run(newBoardId, newColumnId, newPosition, taskId)
    })
    transaction()
  }
}

export const commentOperations = {
  create: (taskId, commentData) => {
    const db = getDb()
    const { id, text, createdAt } = commentData
    db.prepare('INSERT INTO task_comments (id, task_id, text, created_at) VALUES (?, ?, ?, ?)')
      .run(id, taskId, text, createdAt)
  },
  delete: (commentId) => {
    const db = getDb()
    db.prepare('DELETE FROM task_comments WHERE id = ?').run(commentId)
  }
}

export const checklistOperations = {
  create: (taskId, checklistData) => {
    const db = getDb()
    const { id, text, completed } = checklistData
    const itemsJson = JSON.stringify({ completed: !!completed })
    db.prepare('INSERT INTO checklists (id, task_id, title, items) VALUES (?, ?, ?, ?)')
      .run(id, taskId, text || '', itemsJson)
  },
  update: (checklistId, updates) => {
    const db = getDb()
    const fields = []
    const values = []
    for (const [key, value] of Object.entries(updates)) {
      fields.push(`${key} = ?`)
      if (key === 'items') {
        values.push(JSON.stringify(value || []))
      } else {
        values.push(value)
      }
    }
    if (fields.length === 0) return
    values.push(checklistId)
    db.prepare(`UPDATE checklists SET ${fields.join(', ')} WHERE id = ?`).run(...values)
  },
  delete: (checklistId) => {
    const db = getDb()
    db.prepare('DELETE FROM checklists WHERE id = ?').run(checklistId)
  }
}

export const attachmentOperations = {
  create: (taskId, attachmentData) => {
    const db = getDb()
    const { id, url, title, coverImage, createdAt } = attachmentData
    db.prepare('INSERT INTO attachments (id, task_id, url, title, cover_image, created_at) VALUES (?, ?, ?, ?, ?, ?)')
      .run(id, taskId, url, title, coverImage, createdAt)
  },
  delete: (attachmentId) => {
    const db = getDb()
    db.prepare('DELETE FROM attachments WHERE id = ?').run(attachmentId)
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
