import React from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { all, createLowlight } from 'lowlight';
import { MermaidExtension } from '../extensions/MermaidExtension';
import { 
  Bold, 
  Italic, 
  List, 
  ListOrdered, 
  Quote, 
  Code, 
  Image as ImageIcon, 
  Link as LinkIcon, 
  Activity,
  Heading1,
  Heading2,
  Undo,
  Redo
} from 'lucide-react';

const lowlight = createLowlight(all);

const ToolbarButton = ({ onClick, isActive, children, title, className = '' }) => (
  <button
    onMouseDown={(e) => {
      e.preventDefault();
      onClick();
    }}
    className={`p-2 rounded-md transition-all duration-200 ${
      isActive 
        ? 'bg-blue-500/20 text-blue-400 shadow-sm' 
        : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
    } ${className}`}
    title={title}
    type="button"
  >
    {children}
  </button>
);

const NoteEditor = ({ initialContent, onChange, onSave, isSaving }) => {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: false,
      }),
      Image.configure({
        HTMLAttributes: {
          class: 'rounded-xl border border-zinc-800 max-w-full h-auto my-6 shadow-lg',
        },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-400 underline underline-offset-4 hover:text-blue-300 transition-colors cursor-pointer',
        },
      }),
      CodeBlockLowlight.configure({
        lowlight,
        HTMLAttributes: {
          class: 'rounded-xl bg-zinc-950 p-6 font-mono text-sm text-zinc-300 border border-zinc-800 my-6 shadow-inner overflow-x-auto',
        },
      }),
      MermaidExtension,
    ],
    content: initialContent,
    onUpdate: ({ editor }) => {
      onChange?.(editor.getJSON());
    },
    editorProps: {
      attributes: {
        class: 'prose prose-invert max-w-none focus:outline-none min-h-[600px] p-10 leading-relaxed selection:bg-blue-500/30',
      },
    },
  });

  if (!editor) {
    return (
      <div className="w-full h-full bg-zinc-900/20 rounded-2xl border border-zinc-800 animate-pulse flex items-center justify-center">
        <span className="text-zinc-500 text-sm font-medium">Initializing editor...</span>
      </div>
    );
  }

  const addImage = () => {
    const url = window.prompt('Enter image URL');
    if (url) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  };

  const setLink = () => {
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('Enter URL', previousUrl);
    if (url === null) return;
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  return (
    <div className="flex flex-col w-full h-full bg-zinc-900/40 rounded-2xl border border-zinc-800 shadow-2xl overflow-hidden backdrop-blur-sm">
      <div className="flex flex-wrap items-center justify-between gap-1 p-3 border-b border-zinc-800 bg-zinc-900/60 sticky top-0 z-20">
        <div className="flex flex-wrap items-center gap-1">
          <div className="flex items-center gap-1 pr-2 border-r border-zinc-800 mr-1">
            <ToolbarButton 
              onClick={() => editor.chain().focus().undo().run()} 
              title="Undo"
            >
              <Undo size={18} />
            </ToolbarButton>
            <ToolbarButton 
              onClick={() => editor.chain().focus().redo().run()} 
              title="Redo"
            >
              <Redo size={18} />
            </ToolbarButton>
          </div>

          <div className="flex items-center gap-1 pr-2 border-r border-zinc-800 mr-1">
            <ToolbarButton 
              onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
              isActive={editor.isActive('heading', { level: 1 })}
              title="Heading 1"
            >
              <Heading1 size={18} />
            </ToolbarButton>
            <ToolbarButton 
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
              isActive={editor.isActive('heading', { level: 2 })}
              title="Heading 2"
            >
              <Heading2 size={18} />
            </ToolbarButton>
          </div>

          <div className="flex items-center gap-1 pr-2 border-r border-zinc-800 mr-1">
            <ToolbarButton 
              onClick={() => editor.chain().focus().toggleBold().run()}
              isActive={editor.isActive('bold')}
              title="Bold"
            >
              <Bold size={18} />
            </ToolbarButton>
            <ToolbarButton 
              onClick={() => editor.chain().focus().toggleItalic().run()}
              isActive={editor.isActive('italic')}
              title="Italic"
            >
              <Italic size={18} />
            </ToolbarButton>
          </div>

          <div className="flex items-center gap-1 pr-2 border-r border-zinc-800 mr-1">
            <ToolbarButton 
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              isActive={editor.isActive('bulletList')}
              title="Bullet List"
            >
              <List size={18} />
            </ToolbarButton>
            <ToolbarButton 
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              isActive={editor.isActive('orderedList')}
              title="Ordered List"
            >
              <ListOrdered size={18} />
            </ToolbarButton>
          </div>

          <div className="flex items-center gap-1 pr-2 border-r border-zinc-800 mr-1">
            <ToolbarButton 
              onClick={() => editor.chain().focus().toggleBlockquote().run()}
              isActive={editor.isActive('blockquote')}
              title="Blockquote"
            >
              <Quote size={18} />
            </ToolbarButton>
            <ToolbarButton 
              onClick={() => editor.chain().focus().toggleCodeBlock().run()}
              isActive={editor.isActive('codeBlock')}
              title="Code Block"
            >
              <Code size={18} />
            </ToolbarButton>
          </div>

          <div className="flex items-center gap-1">
            <ToolbarButton onClick={addImage} title="Add Image">
              <ImageIcon size={18} />
            </ToolbarButton>
            <ToolbarButton 
              onClick={setLink} 
              isActive={editor.isActive('link')}
              title="Add Link"
            >
              <LinkIcon size={18} />
            </ToolbarButton>
            <ToolbarButton 
              onClick={() => editor.chain().focus().setMermaid().run()}
              title="Insert Mermaid Diagram"
            >
              <Activity size={18} />
            </ToolbarButton>
          </div>
        </div>

        <div className="flex items-center gap-3 ml-auto pl-4">
          <div className="flex items-center gap-2">
            {isSaving ? (
              <span className="text-[10px] font-medium text-zinc-500 flex items-center gap-1.5 uppercase tracking-wider">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                Saving...
              </span>
            ) : (
              <span className="text-[10px] font-medium text-green-500/60 flex items-center gap-1.5 uppercase tracking-wider">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500/40" />
                Saved
              </span>
            )}
          </div>
          <button
            onClick={onSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white text-xs font-semibold transition-all shadow-lg shadow-blue-900/20 active:scale-95"
          >
            Save Note
          </button>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto custom-scrollbar bg-zinc-900/20">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
};

export default NoteEditor;
