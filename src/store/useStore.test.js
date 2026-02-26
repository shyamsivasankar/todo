/* global global */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useStore } from './useStore.js'

// Mock electronAPI
global.window = {
  electronAPI: {
    saveBoards: vi.fn(),
    createTask: vi.fn().mockResolvedValue({ id: 't1' }),
    updateTask: vi.fn(),
    moveTask: vi.fn(),
    getNotifications: vi.fn().mockResolvedValue([]),
    markNotificationAsRead: vi.fn().mockResolvedValue(),
    createNote: vi.fn(),
    updateNote: vi.fn(),
    deleteNote: vi.fn(),
    linkNoteToTask: vi.fn(),
    unlinkNoteFromTask: vi.fn(),
  },
}

describe('useStore Integration Verification', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useStore.setState({
      boards: [
        {
          id: 'b1',
          name: 'Board 1',
          columns: [
            { id: 'c1', title: 'To Do', tasks: [] },
            { id: 'c2', title: 'Done', tasks: [] },
          ],
        },
      ],
      activeBoardId: 'b1',
      standaloneTasks: [],
      notifications: [],
      unreadCount: 0,
      notes: [],
      selectedNoteId: null,
      hydrationComplete: true,
    })
  })

  it('Verification 3: Auto-Sync: Move a task from "To Do" to "Done" and verify it is automatically marked as completed', () => {
    // Add a task to "To Do"
    useStore.getState().addTask('b1', 'c1', { heading: 'Task to complete' })
    
    const state = useStore.getState()
    const task = state.boards[0].columns[0].tasks[0]
    expect(task.heading).toBe('Task to complete')
    expect(task.settings.completed).toBe(false)

    // Move to "Done"
    useStore.getState().moveTask('b1', task.id, 'c1', 'c2', 0)

    const updatedState = useStore.getState()
    const movedTask = updatedState.boards[0].columns[1].tasks[0]
    expect(movedTask.settings.status).toBe('Done')
    expect(movedTask.settings.completed).toBe(true)
    expect(movedTask.timeline.some(e => e.action.includes('marked as completed'))).toBe(true)
  })

  it('Verification 4: Notifications: Verify unread counts and marking as read', async () => {
    // Mock notifications
    window.electronAPI.getNotifications.mockResolvedValueOnce([
      { id: 1, task_id: 't1', trigger_type: '1h', sent_at: new Date().toISOString(), read_at: null, task_title: 'Task 1' },
      { id: 2, task_id: 't2', trigger_type: '15m', sent_at: new Date().toISOString(), read_at: null, task_title: 'Task 2' },
    ])

    await useStore.getState().fetchNotifications()

    let state = useStore.getState()
    expect(state.notifications.length).toBe(2)
    expect(state.unreadCount).toBe(2)

    // Mark one as read
    await useStore.getState().markNotificationRead(1)

    state = useStore.getState()
    expect(state.notifications.find(n => n.id === 1).is_read).toBe(true)
    expect(state.unreadCount).toBe(1)
    expect(window.electronAPI.markNotificationAsRead).toHaveBeenCalledWith(1)
  })

  describe('Notes Actions', () => {
    it('should add a note and call electronAPI.createNote', () => {
      const payload = { title: 'Test Note', content: 'Test Content' }
      useStore.getState().addNote(payload)

      const state = useStore.getState()
      expect(state.notes.length).toBe(1)
      expect(state.notes[0].title).toBe('Test Note')
      expect(state.notes[0].content).toBe('Test Content')
      expect(state.notes[0].id).toBeDefined()
      expect(state.notes[0].createdAt).toBeDefined()
      expect(state.notes[0].updatedAt).toBeDefined()
      expect(window.electronAPI.createNote).toHaveBeenCalledWith(state.notes[0])
    })

    it('should update a note and refresh updatedAt', () => {
      vi.useFakeTimers()
      // First add a note
      useStore.getState().addNote({ title: 'Old Title', content: 'Old Content' })
      const noteId = useStore.getState().notes[0].id
      const oldUpdatedAt = useStore.getState().notes[0].updatedAt

      // Wait a bit to ensure timestamp changes
      vi.advanceTimersByTime(1000)

      useStore.getState().updateNote(noteId, { title: 'New Title' })

      const state = useStore.getState()
      const updatedNote = state.notes.find(n => n.id === noteId)
      expect(updatedNote.title).toBe('New Title')
      expect(updatedNote.content).toBe('Old Content')
      expect(updatedNote.updatedAt).not.toBe(oldUpdatedAt)
      expect(window.electronAPI.updateNote).toHaveBeenCalledWith(noteId, {
        title: 'New Title',
        updatedAt: updatedNote.updatedAt
      })

      vi.useRealTimers()
    })

    it('should remove a note and call electronAPI.deleteNote', () => {
      useStore.getState().addNote({ title: 'To Delete' })
      const noteId = useStore.getState().notes[0].id

      useStore.getState().removeNote(noteId)

      const state = useStore.getState()
      expect(state.notes.length).toBe(0)
      expect(window.electronAPI.deleteNote).toHaveBeenCalledWith(noteId)
    })

    it('should link a note to a task', () => {
      useStore.getState().addNote({ title: 'Note' })
      const noteId = useStore.getState().notes[0].id
      const taskId = 'task-123'

      useStore.getState().linkNoteToTask(noteId, taskId)

      const state = useStore.getState()
      const note = state.notes.find(n => n.id === noteId)
      expect(note.taskIds).toContain(taskId)
      expect(window.electronAPI.linkNoteToTask).toHaveBeenCalledWith(noteId, taskId)
    })

    it('should unlink a note from a task', () => {
      useStore.getState().addNote({ title: 'Note' })
      const noteId = useStore.getState().notes[0].id
      const taskId = 'task-123'

      useStore.getState().linkNoteToTask(noteId, taskId)
      useStore.getState().unlinkNoteFromTask(noteId, taskId)

      const state = useStore.getState()
      const note = state.notes.find(n => n.id === noteId)
      expect(note.taskIds).not.toContain(taskId)
      expect(window.electronAPI.unlinkNoteFromTask).toHaveBeenCalledWith(noteId, taskId)
    })
  })
})
