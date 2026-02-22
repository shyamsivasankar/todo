import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

// --- Configuration ---
// In a real app, this would come from a config file or environment variables.
// For this project, we assume the development DB is in the `db-test` directory.
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.join(__dirname, '../../db-test/kanban.db');
let db;

// --- Utility Functions ---

/**
 * Checks if a table exists in the database.
 * @param {string} tableName - The name of the table to check.
 * @returns {boolean} - True if the table exists, false otherwise.
 */
function tableExists(tableName) {
  const stmt = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name = ?");
  const result = stmt.get(tableName);
  return !!result;
}

/**
 * Checks if a column exists in a given table.
 * @param {string} tableName - The name of the table.
 * @param {string} columnName - The name of the column to check.
 * @returns {boolean} - True if the column exists, false otherwise.
 */
function columnExists(tableName, columnName) {
  const results = db.prepare(`PRAGMA table_info(${tableName})`).all();
  return results.some(col => col.name === columnName);
}

// --- Migration Logic ---

/**
 * Applies the database migration (UP).
 * Creates relational tables for checklists and attachments, migrates data
 * from the old JSON column, and then removes the old column.
 */
function up() {
  console.log('Starting "up" migration...');

  // Step 1: Create new tables if they don't exist.
  // This makes the script idempotent.
  console.log('Creating tables: checklists, attachments...');
  db.exec(`
    CREATE TABLE IF NOT EXISTS checklists (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL,
      text TEXT,
      completed INTEGER NOT NULL DEFAULT 0,
      position INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (task_id) REFERENCES tasks (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS attachments (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL,
      name TEXT,
      url TEXT,
      type TEXT,
      created_at TEXT,
      FOREIGN KEY (task_id) REFERENCES tasks (id) ON DELETE CASCADE
    );
  `);
  console.log('Tables created successfully (if they did not exist).');

  // Step 2: Check if the migration has already been run by seeing if the source column exists.
  if (!columnExists('tasks', 'extended_data')) {
    console.log('Column "extended_data" not found in "tasks" table. Migration has likely already been run. Skipping data migration.');
    return;
  }

  // Step 3: Read all tasks with the old JSON data.
  console.log('Reading tasks from the "tasks" table...');
  const tasks = db.prepare('SELECT id, extended_data FROM tasks WHERE extended_data IS NOT NULL').all();
  console.log(`Found ${tasks.length} tasks with extended_data.`);

  if (tasks.length === 0) {
      console.log('No tasks with extended_data to migrate.');
  } else {
      // Step 4: Prepare insertion statements.
      const insertChecklist = db.prepare('INSERT INTO checklists (id, task_id, text, completed, position) VALUES (?, ?, ?, ?, ?)');
      const insertAttachment = db.prepare('INSERT INTO attachments (id, task_id, name, url, type, created_at) VALUES (?, ?, ?, ?, ?, ?)');

      // Step 5: Migrate data in a single transaction for atomicity.
      console.log('Starting data migration transaction...');
      const migrateData = db.transaction((tasksToMigrate) => {
        for (const task of tasksToMigrate) {
          try {
            const extendedData = JSON.parse(task.extended_data);

            if (extendedData.checklist && Array.isArray(extendedData.checklist)) {
              extendedData.checklist.forEach((item, index) => {
                insertChecklist.run(item.id, task.id, item.text, item.completed ? 1 : 0, item.position ?? index);
              });
            }

            if (extendedData.attachments && Array.isArray(extendedData.attachments)) {
              extendedData.attachments.forEach(item => {
                insertAttachment.run(item.id, task.id, item.name, item.url, item.type, item.created_at);
              });
            }
          } catch (e) {
            console.error(`Skipping task ${task.id} due to invalid JSON in extended_data:`, e.message);
          }
        }
      });

      migrateData(tasks);
      console.log('Data migration transaction completed.');
  }


  // Step 6: Verification
  console.log('Verifying migration...');
  const checklistCount = db.prepare('SELECT COUNT(*) as count FROM checklists').get().count;
  const attachmentCount = db.prepare('SELECT COUNT(*) as count FROM attachments').get().count;
  console.log(`Verification: ${checklistCount} rows in checklists, ${attachmentCount} rows in attachments.`);
  if (checklistCount > 0 || attachmentCount > 0) {
      console.log('Verification successful: Data appears to be migrated.');
  } else if (tasks.length > 0) {
      console.warn('Verification warning: No data was migrated into new tables, but source tasks existed.');
  } else {
      console.log('Verification complete: No source data to migrate.');
  }


  // Step 7: Remove the old column after successful migration.
  // We use the legacy `db.exec` for ALTER TABLE.
  console.log('Dropping "extended_data" column from "tasks" table...');
  // SQLite doesn't support DROP COLUMN in older versions, so this is the modern way.
  // It's wrapped in a check for safety.
  db.exec('ALTER TABLE tasks DROP COLUMN extended_data');
  console.log('Column "extended_data" dropped.');

  console.log('"up" migration completed successfully.');
}

/**
 * Reverts the database migration (DOWN).
 * This is for development and testing, allowing for a clean reversal.
 * It reconstructs the JSON data and drops the new tables.
 */
function down() {
  console.log('Starting "down" migration...');

  // Step 1: Add the extended_data column back if it doesn't exist.
  if (!columnExists('tasks', 'extended_data')) {
    console.log('Adding "extended_data" column back to "tasks" table...');
    db.exec('ALTER TABLE tasks ADD COLUMN extended_data TEXT');
    console.log('Column "extended_data" added.');
  } else {
    console.log('Column "extended_data" already exists. Skipping add.');
  }

  // Step 2: Check if new tables exist to migrate from.
  const checklistsTableExists = tableExists('checklists');
  const attachmentsTableExists = tableExists('attachments');

  if (!checklistsTableExists && !attachmentsTableExists) {
      console.log('No "checklists" or "attachments" table found. Skipping data rollback.');
  } else {
      // Step 3: Reconstruct JSON data in a transaction.
      console.log('Reconstructing JSON data from tables...');
      const updateTask = db.prepare('UPDATE tasks SET extended_data = ? WHERE id = ?');
      const tasksToUpdate = db.prepare('SELECT id FROM tasks').all();

      const rollbackData = db.transaction(() => {
        for (const task of tasksToUpdate) {
          const extendedData = {};
          if (checklistsTableExists) {
              const checklistItems = db.prepare('SELECT id, text, completed, position FROM checklists WHERE task_id = ? ORDER BY position').all(task.id);
              if (checklistItems.length > 0) {
                  extendedData.checklist = checklistItems.map(item => ({...item, completed: !!item.completed}));
              }
          }
          if (attachmentsTableExists) {
              const attachmentItems = db.prepare('SELECT id, name, url, type, created_at FROM attachments WHERE task_id = ?').all(task.id);
              if (attachmentItems.length > 0) {
                  extendedData.attachments = attachmentItems;
              }
          }

          if (Object.keys(extendedData).length > 0) {
            updateTask.run(JSON.stringify(extendedData), task.id);
          }
        }
      });

      rollbackData();
      console.log('JSON data reconstruction complete.');
  }


  // Step 4: Drop the tables.
  console.log('Dropping tables: checklists, attachments...');
  db.exec(`
    DROP TABLE IF EXISTS checklists;
    DROP TABLE IF EXISTS attachments;
  `);
  console.log('Tables dropped successfully.');

  console.log('"down" migration completed successfully.');
}

// --- Script Execution ---

/**
 * Main function to run the migration.
 * Pass 'up' or 'down' as a command-line argument.
 */
function main() {
  const arg = process.argv[2];

  try {
    // Open the database connection.
    db = new Database(dbPath, { verbose: console.log });

    // Ensure foreign key support is enabled.
    db.exec('PRAGMA foreign_keys = ON;');

    if (arg === 'down') {
      down();
    } else if (arg === 'up' || !arg) {
      // Default to 'up' if no argument is provided.
      up();
    } else {
      console.error(`Invalid argument: ${arg}. Use 'up' or 'down'.`);
      process.exit(1);
    }

  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exit(1);
  } finally {
    if (db) {
      db.close();
      console.log('Database connection closed.');
    }
  }
}

// Execute the main function if the script is run directly.
main();
