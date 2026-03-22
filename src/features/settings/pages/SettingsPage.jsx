import { HardDrive, Monitor, Settings, Zap, Activity, Cpu, Shield, Globe, Terminal } from 'lucide-react'
import { useStore } from '../../../store/useStore'
import CyberCard from '../../../components/ui/CyberCard'
import CyberInput from '../../../components/ui/CyberInput'
import CyberButton from '../../../components/ui/CyberButton'
import NeonDivider from '../../../components/ui/NeonDivider'
import CyberBadge from '../../../components/ui/CyberBadge'

export default function SettingsPage() {
  const uiSettings = useStore((state) => state.uiSettings)
  const updateSettings = useStore((state) => state.updateSettings)

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar relative">
      <div className="max-w-5xl mx-auto px-8 py-12 space-y-10 relative z-10">
        {/* Header Section */}
        <header className="relative group p-8 rounded-sm border border-white/5 bg-surface-high/30 backdrop-blur-md overflow-hidden">
          <div className="absolute top-0 right-0 opacity-5 group-hover:opacity-10 transition-opacity scale-150 -translate-y-1/4">
            <Settings className="h-48 w-48 text-cyber-blue animate-spin-slow" />
          </div>
          
          <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="flex items-center gap-6">
              <div className="p-4 bg-cyber-blue/10 border border-cyber-blue/30 rounded-sm shadow-neon-blue/20">
                <Terminal className="h-8 w-8 text-cyber-blue" />
              </div>
              <div className="flex flex-col gap-1">
                <h1 className="text-3xl font-orbitron font-black text-white uppercase tracking-tighter flex items-center gap-4">
                  Core <span className="text-cyber-blue animate-flicker">Config</span>
                </h1>
                <span className="font-mono text-[10px] text-surface-variant uppercase tracking-[0.3em]">
                  Root Access Granted // System Override Enabled
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <CyberBadge variant="blue" size="sm" className="shadow-neon-blue/10">NODE_ID: 0x7F42</CyberBadge>
              <CyberBadge variant="lime" size="sm" className="shadow-neon-lime/10">STATUS: STABLE</CyberBadge>
            </div>
          </div>
        </header>

        {/* Configuration Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column: Diagnostics & Security */}
          <div className="space-y-8">
            <CyberCard variant="cyan" padding="p-6" className="!bg-black/40 backdrop-blur-md border-cyber-cyan/20">
              <h3 className="font-orbitron text-xs font-black text-cyber-cyan uppercase tracking-[0.2em] mb-6 flex items-center gap-3 border-b border-white/5 pb-4">
                <Activity className="h-4 w-4" /> System_Diagnostics
              </h3>
              <div className="space-y-4 font-mono text-[10px] uppercase">
                <div className="flex justify-between items-center group">
                  <span className="text-surface-variant group-hover:text-white transition-colors">Uplink Status</span>
                  <span className="text-cyber-lime animate-pulse flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-cyber-lime rounded-full" />
                    Encrypted
                  </span>
                </div>
                <div className="flex justify-between items-center group">
                  <span className="text-surface-variant group-hover:text-white transition-colors">Storage Engine</span>
                  <span className="text-cyber-cyan font-bold">{window.electronAPI ? 'SQLite_3' : 'LocalStorage'}</span>
                </div>
                <div className="flex justify-between items-center group">
                  <span className="text-surface-variant group-hover:text-white transition-colors">Neural Load</span>
                  <span className="text-cyber-pink font-bold">12.4% [STABLE]</span>
                </div>
              </div>
            </CyberCard>

            <CyberCard variant="pink" padding="p-6" className="!bg-black/40 backdrop-blur-md border-cyber-pink/20">
              <h3 className="font-orbitron text-xs font-black text-cyber-pink uppercase tracking-[0.2em] mb-6 flex items-center gap-3 border-b border-white/5 pb-4">
                <Shield className="h-4 w-4" /> Security_Overrides
              </h3>
              <div className="space-y-6">
                <label className="flex items-start gap-4 cursor-pointer group">
                  <div className={`mt-0.5 h-5 w-5 rounded-sm border-2 ${uiSettings.confirmBeforeDelete ? 'bg-cyber-pink/20 border-cyber-pink shadow-neon-pink' : 'border-white/20'} flex items-center justify-center transition-all`}>
                    {uiSettings.confirmBeforeDelete && <span className="text-cyber-pink text-xs font-black">✓</span>}
                    <input
                      type="checkbox"
                      checked={!!uiSettings.confirmBeforeDelete}
                      onChange={(e) => updateSettings({ confirmBeforeDelete: e.target.checked })}
                      className="hidden"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="font-orbitron text-[10px] font-bold text-white group-hover:text-cyber-pink uppercase tracking-widest transition-colors">Safeguard Deletion</span>
                    <span className="font-mono text-[8px] text-surface-variant uppercase">Require authorization before purging memory nodes.</span>
                  </div>
                </label>
                
                <div className="pt-2">
                  <CyberButton variant="pink" size="sm" fullWidth icon={Zap} outline className="border-cyber-pink/50">
                    FLUSH_MEMORY_CACHE
                  </CyberButton>
                </div>
              </div>
            </CyberCard>
          </div>

          {/* Right Columns: Core Settings */}
          <div className="lg:col-span-2 space-y-8">
            {/* Interface & Rendering */}
            <CyberCard variant="blue" padding="p-8" className="!bg-surface-low/30 backdrop-blur-xl border-white/10 relative overflow-hidden">
              {/* Card background accent */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-cyber-blue/5 rounded-full blur-3xl pointer-events-none" />

              <h2 className="relative font-orbitron text-sm font-black text-white uppercase tracking-[0.3em] flex items-center gap-3 border-b border-white/10 pb-6 mb-8">
                <Monitor className="h-5 w-5 text-cyber-blue" />
                Interface_Parameters
              </h2>
              
              <div className="relative grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <p className="font-mono text-[9px] text-surface-variant uppercase tracking-widest border-l-2 border-cyber-blue/30 pl-3">
                    Define the initial visual rendering vector upon system boot.
                  </p>
                  <CyberInput
                    label="Boot_Sequence_Vector"
                    type="select"
                    value={uiSettings.startView}
                    variant="blue"
                    onChange={(e) => updateSettings({ startView: e.target.value })}
                    icon={Terminal}
                  >
                    <option value="boards">SYSTEM_MATRIX</option>
                    <option value="tasks">TASK_SUBSYSTEM</option>
                    <option value="calendar">TEMPORAL_GRID</option>
                    <option value="settings">CORE_CONFIG</option>
                  </CyberInput>
                </div>

                <div className="space-y-4">
                  <p className="font-mono text-[9px] text-surface-variant uppercase tracking-widest border-l-2 border-cyber-cyan/30 pl-3">
                    Set the maximum data density for stream rendering.
                  </p>
                  <CyberInput
                    label="Data_Density_Limit"
                    type="select"
                    value={String(uiSettings.tasksPageSize)}
                    variant="cyan"
                    onChange={(e) => updateSettings({ tasksPageSize: Number(e.target.value) })}
                    icon={HardDrive}
                  >
                    <option value="6">0x06_PACKETS [LOW]</option>
                    <option value="12">0x0C_PACKETS [BALANCED]</option>
                    <option value="24">0x18_PACKETS [HIGH]</option>
                  </CyberInput>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-white/5 space-y-3 relative z-10">
                <label className="font-orbitron text-[10px] font-bold text-surface-variant uppercase tracking-widest block ml-1">Visual_Engine_Status</label>
                <div className="flex items-center gap-4 bg-black/40 border border-cyber-amber/20 p-4 rounded-sm shadow-[inset_0_0_20px_rgba(255,191,0,0.05)]">
                  <div className="p-2 bg-cyber-amber/10 rounded-sm">
                    <Zap className="h-4 w-4 text-cyber-amber animate-pulse" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="font-orbitron text-xs font-black text-white uppercase tracking-widest">Dark_Mode_Locked</span>
                    <span className="font-mono text-[9px] text-surface-variant uppercase">High Contrast Optical Rendering Enabled</span>
                  </div>
                </div>
              </div>
            </CyberCard>

            {/* Neural Matrix Settings */}
            <CyberCard variant="violet" padding="p-8" className="!bg-surface-low/30 backdrop-blur-xl border-white/10 relative overflow-hidden">
               {/* Card background accent */}
               <div className="absolute bottom-0 right-0 w-64 h-64 bg-cyber-violet/5 rounded-full blur-3xl pointer-events-none" />

              <h2 className="relative font-orbitron text-sm font-black text-white uppercase tracking-[0.3em] flex items-center gap-3 border-b border-white/10 pb-6 mb-8">
                <Cpu className="h-5 w-5 text-cyber-violet" />
                Neural_Network_Calibration
              </h2>
              
              <div className="relative grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <p className="font-mono text-[9px] text-surface-variant uppercase tracking-widest border-l-2 border-cyber-violet/30 pl-3">
                    Establish baseline criticality for new data nodes.
                  </p>
                  <CyberInput
                    label="Default_Signal_Priority"
                    type="select"
                    value={uiSettings.defaultTaskPriority}
                    variant="violet"
                    onChange={(e) => updateSettings({ defaultTaskPriority: e.target.value })}
                    icon={Activity}
                  >
                    <option value="low">LOW [STABLE_STATE]</option>
                    <option value="medium">MEDIUM [ACTIVE_MONITORING]</option>
                    <option value="high">HIGH [CRITICAL_RESPONSE]</option>
                  </CyberInput>
                </div>

                <div className="space-y-4">
                  <p className="font-mono text-[9px] text-surface-variant uppercase tracking-widest border-l-2 border-cyber-blue/30 pl-3">
                    Execute manual synchronization protocols.
                  </p>
                  <div className="flex flex-col gap-3 pt-1">
                    <CyberButton variant="violet" size="sm" icon={Globe} outline fullWidth className="justify-start">
                      INITIATE_HIVE_CONNECT
                    </CyberButton>
                    <CyberButton variant="blue" size="sm" icon={Zap} outline fullWidth className="justify-start">
                      FORCE_NODE_RESYNC
                    </CyberButton>
                  </div>
                </div>
              </div>
            </CyberCard>
          </div>
        </div>
        
        {/* Footer */}
        <div className="pt-12 pb-6">
          <NeonDivider variant="blue" className="opacity-20 mb-8" />
          <div className="flex flex-col items-center justify-center gap-2">
            <p className="font-orbitron text-[10px] font-black text-cyber-blue uppercase tracking-[0.5em] animate-pulse">
              System Matrix Authorized
            </p>
            <p className="font-mono text-[8px] text-surface-variant uppercase tracking-widest">
              FocusFlow OS Build v4.20.69 // Redesign Complete
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
