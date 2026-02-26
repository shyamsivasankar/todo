import React, { useEffect, useState } from 'react';
import mermaid from 'mermaid';

mermaid.initialize({
  startOnLoad: false,
  theme: 'dark',
  securityLevel: 'loose',
  fontFamily: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif',
});

const MermaidBlock = ({ node, updateAttributes, selected }) => {
  const { code } = node.attrs;
  const [svg, setSvg] = useState('');
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    const renderDiagram = async () => {
      if (!code) {
        setSvg('');
        return;
      }
      try {
        const id = `mermaid-${Math.random().toString(36).substring(2, 11)}`;
        const { svg } = await mermaid.render(id, code);
        setSvg(svg);
        setError(null);
      } catch (err) {
        console.error('Mermaid render error:', err);
        setError(err.message || 'Failed to render diagram');
        // Clear SVG on error to avoid showing stale diagram
        setSvg('');
      }
    };

    const timeoutId = setTimeout(renderDiagram, 100);
    return () => clearTimeout(timeoutId);
  }, [code]);

  const handleCodeChange = (e) => {
    updateAttributes({ code: e.target.value });
  };

  return (
    <div 
      className={`my-6 rounded-xl border transition-all duration-200 overflow-hidden ${
        selected 
          ? 'border-blue-500 ring-4 ring-blue-500/10 shadow-lg' 
          : 'border-zinc-800 bg-zinc-900/40 hover:border-zinc-700'
      }`}
      contentEditable={false}
    >
      <div className="flex items-center justify-between px-4 py-2 bg-zinc-900/80 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-blue-500" />
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Mermaid Diagram</span>
        </div>
        <button
          onClick={() => setIsEditing(!isEditing)}
          className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
            isEditing 
              ? 'bg-blue-500/10 text-blue-400 hover:bg-blue-500/20' 
              : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200'
          }`}
        >
          {isEditing ? 'View Diagram' : 'Edit Code'}
        </button>
      </div>

      <div className="p-4">
        {isEditing ? (
          <textarea
            value={code}
            onChange={handleCodeChange}
            className="w-full min-h-[160px] rounded-lg border border-zinc-800 bg-zinc-950 p-4 font-mono text-sm text-zinc-300 focus:border-blue-500/50 focus:outline-none focus:ring-1 focus:ring-blue-500/50 transition-all resize-y"
            placeholder="graph TD; A-->B;"
            spellCheck={false}
          />
        ) : (
          <div className="flex flex-col items-center justify-center min-h-[100px]">
            {error ? (
              <div className="w-full rounded-lg bg-red-500/5 p-4 border border-red-500/20">
                <div className="flex items-center gap-2 text-red-400 mb-2">
                  <span className="text-xs font-bold uppercase tracking-tight">Syntax Error</span>
                </div>
                <pre className="whitespace-pre-wrap font-mono text-xs text-red-400/80 leading-relaxed">
                  {error}
                </pre>
              </div>
            ) : svg ? (
              <div
                className="mermaid-svg w-full flex justify-center overflow-x-auto py-2"
                dangerouslySetInnerHTML={{ __html: svg }}
              />
            ) : (
              <div className="py-12 flex flex-col items-center gap-2 text-zinc-500">
                <p className="text-sm italic">No diagram content</p>
                <button 
                  onClick={() => setIsEditing(true)}
                  className="text-xs text-blue-400 hover:underline"
                >
                  Add Mermaid code
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MermaidBlock;
