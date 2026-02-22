import { describe, it, expect, beforeAll, beforeEach, afterAll, vi } from 'vitest'
import Database from 'better-sqlite3'

vi.mock('electron', () => ({
  app: {
    isReady: () => true,
    getPath: () => './db-test',
    on: vi.fn(),
    once: vi.fn(),
  },
}));

import { 
  taskOperations, 
  checklistOperations,
  attachmentOperations,
  _setDb, 
  initializeSchema 
} from './database.js'

describe('Database Operations', () => {
  let db;

  beforeAll(() => {
    db = new Database(':memory:');
    _setDb(db);
    initializeSchema();
  });

  beforeEach(() => {
    // Clear all tables before each test
    db.exec('DELETE FROM attachments');
    db.exec('DELETE FROM checklists');
    db.exec('DELETE FROM tasks');
    db.exec('DELETE FROM columns');
    db.exec('DELETE FROM boards');

    // Setup initial data
    db.exec(`
      INSERT INTO boards (id, name, created_at) VALUES 
        ('board-1', 'Board 1', '2024-01-01T00:00:00.000Z'),
        ('board-2', 'Board 2', '2024-01-01T00:00:00.000Z');
      INSERT INTO columns (id, board_id, title, position) VALUES 
        ('col-1', 'board-1', 'Column 1', 0),
        ('col-2', 'board-1', 'Column 2', 1),
        ('col-3', 'board-2', 'Column 3', 0);
      INSERT INTO tasks (id, board_id, column_id, heading, status, position, created_at) VALUES
        ('task-1', 'board-1', 'col-1', 'Task 1', 'To Do', 0, '2024-01-01T00:00:00.000Z'),
        ('task-2', 'board-1', 'col-1', 'Task 2', 'To Do', 1, '2024-01-01T00:00:00.000Z'),
        ('task-3', 'board-1', 'col-1', 'Task 3', 'To Do', 2, '2024-01-01T00:00:00.000Z');
    `);
  });

  afterAll(() => {
    db.close();
  });

  describe('taskOperations', () => {
    const getTasks = (columnId) => {
      return db.prepare('SELECT id, position FROM tasks WHERE column_id = ? ORDER BY position ASC').all(columnId);
    };

    it('should create a task with checklists and attachments', () => {
      const newTask = {
        id: 'task-4',
        board_id: 'board-1',
        column_id: 'col-1',
        heading: 'New Task',
        status: 'To Do',
        position: 1,
        created_at: new Date().toISOString(),
        extendedData: {
          checklists: [{ id: 'cl-1', title: 'My Checklist', items: [{ id: 'cli-1', text: 'Item 1', completed: false }] }],
          attachments: [{ id: 'att-1', url: 'http://example.com', title: 'Example', createdAt: new Date().toISOString() }]
        }
      };
      taskOperations.create(newTask);

      const tasks = getTasks('col-1');
      expect(tasks.map(t => t.id)).toEqual(['task-1', 'task-4', 'task-2', 'task-3']);
      expect(tasks.map(t => t.position)).toEqual([0, 1, 2, 3]);

      const checklist = db.prepare('SELECT * FROM checklists WHERE task_id = ?').get('task-4');
      expect(checklist.id).toBe('cl-1');
      expect(checklist.title).toBe('My Checklist');

      const attachment = db.prepare('SELECT * FROM attachments WHERE task_id = ?').get('task-4');
      expect(attachment.id).toBe('att-1');
      expect(attachment.url).toBe('http://example.com');
    });

    it('should update a task and its extendedData', () => {
      // First, create a task with some extended data
      taskOperations.create({
        id: 'task-5',
        board_id: 'board-1',
        column_id: 'col-1',
        heading: 'Task to Update',
        status: 'To Do',
        position: 3,
        created_at: new Date().toISOString(),
        extendedData: {
          checklists: [{ id: 'cl-2', title: 'Old Checklist', items: [] }],
          attachments: []
        }
      });

      const updates = {
        heading: 'Updated Task 5',
        priority: 'high',
        extendedData: {
          checklists: [{ id: 'cl-3', title: 'New Checklist', items: [] }],
          attachments: [{ id: 'att-2', url: 'http://new.com', title: 'New Attachment', createdAt: new Date().toISOString() }]
        }
      };
      taskOperations.update('task-5', updates);

      const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get('task-5');
      expect(task.heading).toBe('Updated Task 5');
      expect(task.priority).toBe('high');

      const oldChecklist = db.prepare('SELECT * FROM checklists WHERE id = ?').get('cl-2');
      expect(oldChecklist).toBeUndefined();

      const newChecklist = db.prepare('SELECT * FROM checklists WHERE task_id = ?').get('task-5');
      expect(newChecklist.id).toBe('cl-3');

      const newAttachment = db.prepare('SELECT * FROM attachments WHERE task_id = ?').get('task-5');
      expect(newAttachment.id).toBe('att-2');
    });

    it('should delete a task and its associated data via cascade', () => {
      taskOperations.create({
        id: 'task-6',
        board_id: 'board-1',
        column_id: 'col-1',
        heading: 'Task to Delete',
        status: 'To Do',
        position: 3,
        created_at: new Date().toISOString(),
        extendedData: {
          checklists: [{ id: 'cl-4', title: 'Checklist to delete', items: [] }],
        }
      });

      let checklist = db.prepare('SELECT * FROM checklists WHERE task_id = ?').get('task-6');
      expect(checklist).toBeDefined();

      taskOperations.delete('task-6');

      const tasks = getTasks('col-1');
      expect(tasks.map(t => t.id)).not.toContain('task-6');
      
      checklist = db.prepare('SELECT * FROM checklists WHERE task_id = ?').get('task-6');
      expect(checklist).toBeUndefined();
    });

    describe('move', () => {
      it('should move a task down in the same column', () => {
        taskOperations.move('task-1', 'board-1', 'col-1', 2);
        const tasks = getTasks('col-1');
        expect(tasks.map(t => t.id)).toEqual(['task-2', 'task-3', 'task-1']);
        expect(tasks.map(t => t.position)).toEqual([0, 1, 2]);
      });
    });
  });

  describe('checklistOperations', () => {
    it('should create a checklist', () => {
      const checklistData = { id: 'cl-1', title: 'Test Checklist', items: [{id: 'i1', text: 'item', completed: false}] };
      checklistOperations.create('task-1', checklistData);

      const checklist = db.prepare('SELECT * FROM checklists WHERE id = ?').get('cl-1');
      expect(checklist).toBeDefined();
      expect(checklist.task_id).toBe('task-1');
      expect(checklist.title).toBe('Test Checklist');
      expect(JSON.parse(checklist.items)).toEqual([{id: 'i1', text: 'item', completed: false}]);
    });

    it('should update a checklist', () => {
      const checklistData = { id: 'cl-1', title: 'Test Checklist', items: [] };
      checklistOperations.create('task-1', checklistData);

      checklistOperations.update('cl-1', { title: 'Updated Title', items: [{id: 'i2', text: 'new', completed: true}] });
      
      const checklist = db.prepare('SELECT * FROM checklists WHERE id = ?').get('cl-1');
      expect(checklist.title).toBe('Updated Title');
      expect(JSON.parse(checklist.items)).toEqual([{id: 'i2', text: 'new', completed: true}]);
    });

    it('should delete a checklist', () => {
      const checklistData = { id: 'cl-1', title: 'Test Checklist', items: [] };
      checklistOperations.create('task-1', checklistData);

      let checklist = db.prepare('SELECT * FROM checklists WHERE id = ?').get('cl-1');
      expect(checklist).toBeDefined();

      checklistOperations.delete('cl-1');

      checklist = db.prepare('SELECT * FROM checklists WHERE id = ?').get('cl-1');
      expect(checklist).toBeUndefined();
    });
  });

  describe('attachmentOperations', () => {
    it('should create an attachment', () => {
      const attachmentData = { id: 'att-1', url: 'http://a.com', title: 'Attachment', coverImage: 'http://a.com/img.png', createdAt: '2024-01-01T00:00:00.000Z' };
      attachmentOperations.create('task-1', attachmentData);

      const attachment = db.prepare('SELECT * FROM attachments WHERE id = ?').get('att-1');
      expect(attachment).toBeDefined();
      expect(attachment.task_id).toBe('task-1');
      expect(attachment.title).toBe('Attachment');
      expect(attachment.cover_image).toBe('http://a.com/img.png');
    });

    it('should delete an attachment', () => {
      const attachmentData = { id: 'att-1', url: 'http://a.com', title: 'Attachment', createdAt: '2024-01-01T00:00:00.000Z' };
      attachmentOperations.create('task-1', attachmentData);

      let attachment = db.prepare('SELECT * FROM attachments WHERE id = ?').get('att-1');
      expect(attachment).toBeDefined();

      attachmentOperations.delete('att-1');

      attachment = db.prepare('SELECT * FROM attachments WHERE id = ?').get('att-1');
      expect(attachment).toBeUndefined();
    });
  });
});
