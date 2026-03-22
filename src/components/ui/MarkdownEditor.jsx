import { Edit2, Eye, Terminal } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

const MarkdownEditor = ({ 
  value, 
  onChange, 
  placeholder = "Add protocols using Markdown...", 
  label = "Protocols",
  variant = "blue",
  minHeight = "min-h-[200px]"
}) => {
  const [isEditing, setIsEditing] = useState(false)
  const textareaRef = useRef(null)

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus()
      const length = textareaRef.current.value.length
      textareaRef.current.setSelectionRange(length, length)
    }
  }, [isEditing])

  return (
    <div className="group relative w-full">
      <div className="flex items-center justify-between mb-3">
        <label className="flex items-center gap-2 text-[10px] font-orbitron font-bold text-surface-variant uppercase tracking-widest">
          <Terminal className={`h-3 w-3 text-cyber-${variant}`} />
          {label}
        </label>
        <button
          type="button"
          onClick={() => setIsEditing(!isEditing)}
          className={`px-2 py-1 rounded-sm border border-white/5 bg-white/5 text-surface-variant hover:text-cyber-${variant} hover:border-cyber-${variant}/30 transition-all flex items-center gap-1.5 text-[9px] font-orbitron font-bold uppercase tracking-wider`}
        >
          {isEditing ? (
            <>
              <Eye className="h-2.5 w-2.5" />
              Preview
            </>
          ) : (
            <>
              <Edit2 className="h-2.5 w-2.5" />
              Edit
            </>
          )}
        </button>
      </div>

      <div className={`${minHeight} w-full transition-all`}>
        {isEditing ? (
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="w-full h-full min-h-[inherit] resize-none font-mono text-xs text-white/80 leading-relaxed bg-transparent border-none outline-none p-0 placeholder:text-surface-highest focus:ring-0 uppercase tracking-tight"
          />
        ) : (
          <div 
            className="prose prose-invert prose-sm max-w-none text-white/70 leading-relaxed font-mono cursor-pointer min-h-[150px] uppercase tracking-tighter"
            onClick={() => setIsEditing(true)}
          >
            {value.trim() ? (
              <ReactMarkdown 
                remarkPlugins={[remarkGfm]}
                components={{
                  h1: ({...props}) => <h1 className={`text-lg font-orbitron font-black mb-4 text-cyber-${variant}`} {...props} />,
                  h2: ({...props}) => <h2 className={`text-md font-orbitron font-bold mb-3 text-cyber-${variant}`} {...props} />,
                  h3: ({...props}) => <h3 className="text-sm font-orbitron font-bold mb-2 text-white" {...props} />,
                  ul: ({...props}) => <ul className="list-disc ml-4 mb-4 space-y-1 text-[11px]" {...props} />,
                  ol: ({...props}) => <ol className="list-decimal ml-4 mb-4 space-y-1 text-[11px]" {...props} />,
                  code: ({inline, ...props}) => (
                    <code className={`${inline ? 'bg-white/10 px-1 rounded-sm' : 'block bg-cyber-black/40 p-3 rounded-sm border border-white/5 my-4 overflow-x-auto'} font-mono text-[10px] text-cyber-violet`} {...props} />
                  ),
                  blockquote: ({...props}) => <blockquote className={`border-l-2 border-cyber-${variant} pl-4 italic my-4 text-surface-variant bg-white/5 p-2`} {...props} />,
                  a: ({...props}) => <a className={`text-cyber-${variant} hover:underline`} {...props} target="_blank" rel="noopener noreferrer" />,
                }}
              >
                {value}
              </ReactMarkdown>
            ) : (
              <span className="text-surface-highest italic text-xs tracking-widest">[ NULL_DATA_STREAM: CLICK_TO_INITIALIZE ]</span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default MarkdownEditor;
