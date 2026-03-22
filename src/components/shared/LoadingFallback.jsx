import { Terminal, Activity } from 'lucide-react'

export default function LoadingFallback({ message = 'INITIALIZING_SYSTEM...' }) {
  return (
    <div className="flex h-full w-full items-center justify-center bg-cyber-black/20 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-6">
        <div className="relative">
          <div className="h-12 w-12 border-2 border-cyber-blue rounded-sm animate-spin-slow opacity-20" />
          <div className="absolute inset-0 flex items-center justify-center">
            <Activity className="h-6 w-6 text-cyber-blue animate-pulse" />
          </div>
          {/* Decorative corner highlights */}
          <div className="absolute -top-1 -left-1 w-2 h-2 border-t border-l border-cyber-blue shadow-neon-blue" />
          <div className="absolute -bottom-1 -right-1 w-2 h-2 border-b border-r border-cyber-blue shadow-neon-blue" />
        </div>
        
        <div className="flex flex-col items-center gap-2">
          <div className="flex items-center gap-2">
            <Terminal className="h-4 w-4 text-cyber-blue opacity-50" />
            <span className="font-orbitron text-[10px] font-bold uppercase tracking-[0.4em] text-cyber-blue animate-flicker">
              {message}
            </span>
          </div>
          {/* Progress bar simulation */}
          <div className="w-48 h-[2px] bg-white/5 relative overflow-hidden">
            <div className="absolute inset-0 bg-cyber-blue shadow-neon-blue animate-scanline" style={{ width: '30%', animationDuration: '2s' }} />
          </div>
        </div>
      </div>
    </div>
  )
}
