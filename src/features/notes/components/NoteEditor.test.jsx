/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import NoteEditor from './NoteEditor';
import { useEditor } from '@tiptap/react';

vi.mock('@tiptap/react', () => ({
  useEditor: vi.fn(),
  EditorContent: vi.fn(() => <div data-testid="editor-content" />),
}));

vi.mock('@tiptap/starter-kit', () => ({
  default: {
    configure: vi.fn().mockReturnThis(),
  },
}));

vi.mock('@tiptap/extension-image', () => ({
  default: {
    configure: vi.fn().mockReturnThis(),
  },
}));

vi.mock('@tiptap/extension-link', () => ({
  default: {
    configure: vi.fn().mockReturnThis(),
  },
}));

vi.mock('@tiptap/extension-code-block-lowlight', () => ({
  default: {
    configure: vi.fn().mockReturnThis(),
  },
}));

vi.mock('lowlight', () => ({
  all: {},
  createLowlight: vi.fn(),
}));

vi.mock('../extensions/MermaidExtension', () => ({
  MermaidExtension: {},
}));

describe('NoteEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render the initializing state when editor is null', () => {
    useEditor.mockReturnValue(null);
    render(<NoteEditor initialContent="" onChange={() => {}} />);
    expect(screen.getByText('Initializing editor...')).toBeDefined();
  });

  it('should render the toolbar and editor content when editor is initialized', () => {
    const mockEditor = {
      chain: vi.fn().mockReturnThis(),
      focus: vi.fn().mockReturnThis(),
      run: vi.fn(),
      isActive: vi.fn().mockReturnValue(false),
      getAttributes: vi.fn().mockReturnValue({}),
    };
    useEditor.mockReturnValue(mockEditor);

    render(<NoteEditor initialContent="" onChange={() => {}} onSave={() => {}} isSaving={false} />);
    
    expect(screen.getByTestId('editor-content')).toBeDefined();
    expect(screen.getByTitle('Bold')).toBeDefined();
    expect(screen.getByTitle('Italic')).toBeDefined();
    expect(screen.getByTitle('Heading 1')).toBeDefined();
    expect(screen.getByTitle('Heading 2')).toBeDefined();
    expect(screen.getByTitle('Bullet List')).toBeDefined();
    expect(screen.getByTitle('Ordered List')).toBeDefined();
    expect(screen.getByTitle('Blockquote')).toBeDefined();
    expect(screen.getByTitle('Code Block')).toBeDefined();
    expect(screen.getByTitle('Add Image')).toBeDefined();
    expect(screen.getByTitle('Add Link')).toBeDefined();
    expect(screen.getByTitle('Insert Mermaid Diagram')).toBeDefined();
    expect(screen.getByText('Save Note')).toBeDefined();
    expect(screen.getByText('Saved')).toBeDefined();
  });

  it('should call onSave when the Save Note button is clicked', () => {
    const mockEditor = {
      chain: vi.fn().mockReturnThis(),
      focus: vi.fn().mockReturnThis(),
      run: vi.fn(),
      isActive: vi.fn().mockReturnValue(false),
      getAttributes: vi.fn().mockReturnValue({}),
    };
    useEditor.mockReturnValue(mockEditor);
    const onSave = vi.fn();

    render(<NoteEditor initialContent="" onChange={() => {}} onSave={onSave} isSaving={false} />);
    
    const saveButton = screen.getByText('Save Note');
    saveButton.click();
    expect(onSave).toHaveBeenCalled();
  });

  it('should show Saving... state when isSaving is true', () => {
    const mockEditor = {
      chain: vi.fn().mockReturnThis(),
      focus: vi.fn().mockReturnThis(),
      run: vi.fn(),
      isActive: vi.fn().mockReturnValue(false),
      getAttributes: vi.fn().mockReturnValue({}),
    };
    useEditor.mockReturnValue(mockEditor);

    render(<NoteEditor initialContent="" onChange={() => {}} onSave={() => {}} isSaving={true} />);
    
    expect(screen.getByText('Saving...')).toBeDefined();
  });

  it('should call onChange when editor content is updated', () => {
    let onUpdateCallback;
    const mockEditor = {
      chain: vi.fn().mockReturnThis(),
      focus: vi.fn().mockReturnThis(),
      run: vi.fn(),
      isActive: vi.fn().mockReturnValue(false),
      getAttributes: vi.fn().mockReturnValue({}),
      getJSON: vi.fn().mockReturnValue({ type: 'doc', content: [{ type: 'paragraph', text: 'Hello' }] }),
    };

    useEditor.mockImplementation((options) => {
      onUpdateCallback = options.onUpdate;
      return mockEditor;
    });

    const onChange = vi.fn();
    render(<NoteEditor initialContent="" onChange={onChange} />);
    
    onUpdateCallback({ editor: mockEditor });
    expect(onChange).toHaveBeenCalledWith({ type: 'doc', content: [{ type: 'paragraph', text: 'Hello' }] });
  });
});
