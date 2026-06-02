import React from 'react';
import { 
  LayoutDashboard, 
  Share2, 
  Receipt, 
  ShieldAlert, 
  LineChart, 
  Home
} from 'lucide-react';
import { useAppState } from '../context/AppContext';

interface SidebarProps {
  activePage: string;
  setActivePage: (page: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activePage, setActivePage }) => {
  const { wsConnected } = useAppState();

  const menuItems = [
    { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
    { id: 'visualizer', label: 'Mesh Visualizer', icon: Share2, highlight: true },
    { id: 'ledger', label: 'Transaction Ledger', icon: Receipt },
    { id: 'security', label: 'Security Center', icon: ShieldAlert },
    { id: 'analytics', label: 'Network Analytics', icon: LineChart },
  ];

  return (
    <aside className="w-64 border-r border-white/5 bg-background flex flex-col h-screen shrink-0">
      {/* Brand Header */}
      <div className="h-20 flex items-center px-6 border-b border-white/5 gap-3 shrink-0">
        <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-purple-600 to-emerald-500 flex items-center justify-center shadow-lg">
          <Share2 className="h-4 w-4 text-white" />
        </div>
        <div>
          <h1 className="font-bold text-sm leading-tight text-white tracking-wider">
            UPI MESH 2.0
          </h1>
          <span className="text-[10px] text-slate-500 font-mono">
            DEFERRED SETTLEMENT
          </span>
        </div>
      </div>

      {/* Nav Menu */}
      <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activePage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActivePage(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm font-medium ${
                isActive
                  ? 'bg-purple-600/10 border border-purple-500/20 text-purple-400'
                  : 'text-slate-400 hover:bg-white/5 hover:text-white border border-transparent'
              }`}
            >
              <Icon className={`h-4 w-4 ${isActive ? 'text-purple-400' : 'text-slate-400'}`} />
              <span className="flex-1 text-left">{item.label}</span>
              {item.highlight && !isActive && (
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse shadow-glow-green" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer / Connection State */}
      <div className="p-4 border-t border-white/5 space-y-4 shrink-0 bg-surface/20">
        <div className="flex items-center justify-between text-xs px-2">
          <span className="text-slate-500 font-medium">WS Server Status</span>
          <div className="flex items-center gap-1.5">
            {wsConnected ? (
              <>
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                <span className="text-emerald-400 font-mono font-semibold">ONLINE</span>
              </>
            ) : (
              <>
                <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-ping" />
                <span className="text-red-500 font-mono font-semibold">OFFLINE</span>
              </>
            )}
          </div>
        </div>

        <button
          onClick={() => setActivePage('landing')}
          className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg border border-white/5 bg-white/5 hover:bg-white/10 text-xs font-semibold text-slate-300 transition-all"
        >
          <Home className="h-3.5 w-3.5" /> Back to Landing
        </button>
      </div>
    </aside>
  );
};
