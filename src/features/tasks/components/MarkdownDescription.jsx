import { Edit2, Eye } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

/**
 * MarkdownDescription Component
 *
 * Provides a toggleable Markdown editor and preview.
 * Uses react-markdown for rendering.
 * Supports GitHub Flavored Markdown (GFM).
 *
 * @param {string} value - The current markdown description
 * @param {function} onChange - Callback when the value changes
 */
export default function MarkdownDescription({ value, onChange }) {
  const [isEditing, setIsEditing] = useState(false)
  const textareaRef = useRef(null)

  // Auto-focus the textarea when entering edit mode
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus()
      // Move cursor to the end
      const length = textareaRef.current.value.length
      textareaRef.current.setSelectionRange(length, length)
    }
  }, [isEditing])

  return (
    <div className="group relative">
      <div className="flex items-center justify-between mb-2">
        <label className="block text-xs font-bold text-text-muted uppercase tracking-widest">
          Notes
        </label>
        <button
          type="button"
          onClick={() => setIsEditing(!isEditing)}
          className="p-1 rounded hover:bg-surface-light text-text-muted hover:text-primary transition-all flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider"
          title={isEditing ? 'Show Preview' : 'Edit Markdown'}
        >
          {isEditing ? (
            <>
              <Eye className="h-3 w-3" />
              Preview
            </>
          ) : (
            <>
              <Edit2 className="h-3 w-3" />
              Edit
            </>
          )}
        </button>
      </div>

      <div className="min-h-[200px] w-full rounded-lg border border-transparent group-hover:border-border/30 transition-all">
        {isEditing ? (
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            rows={10}
            placeholder="Add notes using Markdown (e.g., # Header, - List, **Bold**)..."
            className="w-full resize-none text-sm text-text-secondary leading-relaxed font-light bg-transparent border-none outline-none p-0 placeholder:text-text-muted/50 focus:ring-0"
          />
        ) : (
          <div 
            className="prose prose-invert prose-sm max-w-none text-text-secondary leading-relaxed font-light cursor-pointer min-h-[150px]"
            onClick={() => setIsEditing(true)}
          >
            {value.trim() ? (
              <ReactMarkdown 
                remarkPlugins={[remarkGfm]}
                components={{
                  // eslint-disable-next-line no-unused-vars
                  h1: ({node, ...props}) => <h1 className="text-xl font-bold mb-4 text-white" {...props} />,
                  // eslint-disable-next-line no-unused-vars
                  h2: ({node, ...props}) => <h2 className="text-lg font-bold mb-3 text-white" {...props} />,
                  // eslint-disable-next-line no-unused-vars
                  h3: ({node, ...props}) => <h3 className="text-md font-bold mb-2 text-white" {...props} />,
                  // eslint-disable-next-line no-unused-vars
                  ul: ({node, ...props}) => <ul className="list-disc ml-4 mb-4 space-y-1" {...props} />,
                  // eslint-disable-next-line no-unused-vars
                  ol: ({node, ...props}) => <ol className="list-decimal ml-4 mb-4 space-y-1" {...props} />,
                  // eslint-disable-next-line no-unused-vars
                  code: ({node, inline, ...props}) => (
                    <code className={`${inline ? 'bg-surface px-1 rounded' : 'block bg-surface p-3 rounded-lg border border-border my-4 overflow-x-auto'} font-mono text-xs`} {...props} />
                  ),
                  // eslint-disable-next-line no-unused-vars
                  blockquote: ({node, ...props}) => <blockquote className="border-l-2 border-primary pl-4 italic my-4 text-text-muted" {...props} />,
                  // eslint-disable-next-line no-unused-vars
                  a: ({node, ...props}) => <a className="text-primary hover:underline" {...props} target="_blank" rel="noopener noreferrer" />,
                }}
              >
                {value}
              </ReactMarkdown>
            ) : (
              <span className="text-text-muted/50 italic text-sm">No notes added. Click to add markdown...</span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
