/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import NotesPage from './NotesPage';
import { useStore } from '../../../store/useStore';

vi.mock('../../../store/useStore', () => ({
  useStore: vi.fn(),
}));

vi.mock('../components/NoteEditor', () => ({
  default: vi.fn(({ initialContent, onChange }) => (
    <div data-testid="mock-note-editor">
      <textarea 
        data-testid="editor-textarea" 
        defaultValue={initialContent} 
        onChange={(e) => onChange(e.target.value)} 
      />
    </div>
  )),
}));

vi.mock('lucide-react', () => ({
  Plus: () => <div data-testid="icon-plus" />,
  Search: () => <div data-testid="icon-search" />,
  Trash2: () => <div data-testid="icon-trash" />,
  StickyNote: () => <div data-testid="icon-sticky-note" />,
  FileText: () => <div data-testid="icon-file-text" />,
}));

describe('NotesPage', () => {
  const mockNotes = [
    { id: 'n1', title: 'Note 1', content: 'Content 1', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: 'n2', title: 'Note 2', content: 'Content 2', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  ];

  const mockAddNote = vi.fn();
  const mockUpdateNote = vi.fn();
  const mockRemoveNote = vi.fn();
  const mockSetSelectedNoteId = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    useStore.mockReturnValue({
      notes: mockNotes,
      addNote: mockAddNote,
      updateNote: mockUpdateNote,
      removeNote: mockRemoveNote,
      selectedNoteId: 'n1',
      setSelectedNoteId: mockSetSelectedNoteId,
    });
    
    // Mock window.confirm
    window.confirm = vi.fn().mockReturnValue(true);
  });

  it('should render the notes list with titles', () => {
    render(<NotesPage />);
    expect(screen.getByText('Note 1')).toBeDefined();
    expect(screen.getByText('Note 2')).toBeDefined();
  });

  it('should select a note when clicked', () => {
    render(<NotesPage />);
    fireEvent.click(screen.getByText('Note 2'));
    expect(mockSetSelectedNoteId).toHaveBeenCalledWith('n2');
  });

  it('should filter notes based on search query', () => {
    render(<NotesPage />);
    const searchInput = screen.getByPlaceholderText('Search notes...');
    fireEvent.change(searchInput, { target: { value: 'Note 1' } });
    
    expect(screen.getByText('Note 1')).toBeDefined();
    expect(screen.queryByText('Note 2')).toBeNull();
  });

  it('should call addNote when create button is clicked', () => {
    render(<NotesPage />);
    const createButton = screen.getByTitle('New Note');
    fireEvent.click(createButton);
    expect(mockAddNote).toHaveBeenCalledWith({ title: 'Untitled Note', content: '' });
  });

  it('should call removeNote when delete button is clicked', () => {
    render(<NotesPage />);
    const deleteButtons = screen.getAllByTestId('icon-trash');
    fireEvent.click(deleteButtons[0].parentElement);
    expect(window.confirm).toHaveBeenCalled();
    expect(mockRemoveNote).toHaveBeenCalledWith('n1');
  });

  it('should call updateNote when title changes', () => {
    vi.useFakeTimers();
    render(<NotesPage />);
    
    // Advance timers to trigger the initial title sync (setTimeout 0)
    act(() => {
      vi.advanceTimersByTime(0);
    });

    const titleInput = screen.getByDisplayValue('Note 1');
    fireEvent.change(titleInput, { target: { value: 'Updated Title' } });
    
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    
    expect(mockUpdateNote).toHaveBeenCalledWith('n1', { title: 'Updated Title' });
    vi.useRealTimers();
  });

  it('should call updateNote when content changes', () => {
    vi.useFakeTimers();
    render(<NotesPage />);
    const editorTextarea = screen.getByTestId('editor-textarea');
    fireEvent.change(editorTextarea, { target: { value: 'Updated Content' } });
    
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    
    expect(mockUpdateNote).toHaveBeenCalledWith('n1', { content: 'Updated Content' });
    vi.useRealTimers();
  });
});
