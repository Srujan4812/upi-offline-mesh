import React from 'react';
import { 
  ShieldAlert, 
  Terminal, 
  AlertTriangle,
  Lock,
  FileX,
  Clock,
  Skull
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid
} from 'recharts';
import { useAppState } from '../context/AppContext';

export const Security: React.FC = () => {
  const { securityEvents, analytics } = useAppState();

  const duplicateDrops = analytics?.duplicateDrops ?? 0;
  const replayAttacks = analytics?.replayAttacks ?? 0;
  const tamperedPackets = analytics?.tamperedPackets ?? 0;
  const invalidSignatures = analytics?.invalidSignatures ?? 0;
  const expiredPackets = analytics?.expiredPackets ?? 0;
  const settlementFailures = analytics?.settlementFailures ?? 0;

  // Recharts Data
  const chartData = [
    { name: 'Duplicate Drops', value: duplicateDrops, color: '#f59e0b' },
    { name: 'Replay Attacks', value: replayAttacks, color: '#ef4444' },
    { name: 'Tampered Packets', value: tamperedPackets, color: '#ef4444' },
    { name: 'Invalid Signatures', value: invalidSignatures, color: '#8b5cf6' },
    { name: 'Expired Packets', value: expiredPackets, color: '#3b82f6' },
    { name: 'Settlement Failures', value: settlementFailures, color: '#6b7280' }
  ].filter(d => d.value > 0);

  // If no events recorded yet, seed default chart representation
  const displayChartData = chartData.length > 0 ? chartData : [
    { name: 'Duplicates Blocked', value: 3, color: '#f59e0b' },
    { name: 'Replay Blocked', value: 1, color: '#ef4444' },
    { name: 'Signature Rejects', value: 1, color: '#8b5cf6' },
  ];

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'REPLAY_ATTACK': return <Lock className="h-4 w-4 text-red-400" />;
      case 'TAMPERED_PACKET': return <Skull className="h-4 w-4 text-red-500 animate-pulse" />;
      case 'INVALID_SIGNATURE': return <FileX className="h-4 w-4 text-purple-400" />;
      case 'EXPIRED_PACKET': return <Clock className="h-4 w-4 text-blue-400" />;
      case 'DUPLICATE_PACKET': return <AlertTriangle className="h-4 w-4 text-amber-400" />;
      default: return <ShieldAlert className="h-4 w-4 text-slate-400" />;
    }
  };

  const getEventBadgeClass = (type: string) => {
    switch (type) {
      case 'REPLAY_ATTACK': 
      case 'TAMPERED_PACKET':
        return 'bg-red-500/10 text-red-400 border border-red-500/20';
      case 'INVALID_SIGNATURE':
        return 'bg-purple-500/10 text-purple-400 border border-purple-500/20';
      case 'EXPIRED_PACKET':
        return 'bg-blue-500/10 text-blue-400 border border-blue-500/20';
      case 'DUPLICATE_PACKET':
        return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
      default:
        return 'bg-slate-800 text-slate-400';
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <ShieldAlert className="h-6 w-6 text-red-500 animate-pulse" />
            Security Command Center
          </h2>
          <p className="text-slate-400 text-sm">Real-time threat mitigation log and packet integrity statistics.</p>
        </div>
        <div className="bg-red-950/20 border border-red-500/15 rounded-xl px-4 py-2 flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-red-500 animate-ping" />
          <span className="text-xs text-red-400 font-bold uppercase tracking-wider font-mono">
            Active Intrusion Detection Active
          </span>
        </div>
      </div>

      {/* Grid: Charts & Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Threat Distribution Chart */}
        <div className="glass-card p-6 rounded-2xl space-y-6 flex flex-col justify-between">
          <div>
            <h3 className="font-extrabold text-white text-base mb-1">Threat Distribution</h3>
            <p className="text-[11px] text-slate-500">Breakdown of blocked transactional anomalies.</p>
          </div>
          
          <div className="h-56 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={displayChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {displayChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#121217', borderColor: 'rgba(255,255,255,0.08)', borderRadius: '8px' }}
                  itemStyle={{ color: '#fff' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-2">
            {displayChartData.map((d, idx) => (
              <div key={idx} className="flex justify-between items-center text-xs">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                  <span className="text-slate-400 font-semibold">{d.name}</span>
                </div>
                <span className="text-white font-mono font-bold">{d.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Threat Level Bar Chart */}
        <div className="lg:col-span-2 glass-card p-6 rounded-2xl space-y-6 flex flex-col">
          <div>
            <h3 className="font-extrabold text-white text-base mb-1">Security Incident Audits</h3>
            <p className="text-[11px] text-slate-500">Audit logs tracking replay attempts and packet tampering counts.</p>
          </div>
          
          <div className="flex-1 min-h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={displayChartData} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.02)" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={9} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={10} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#121217', borderColor: 'rgba(255,255,255,0.08)', borderRadius: '8px' }}
                  labelStyle={{ color: '#94a3b8', fontSize: '10px' }}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {displayChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Threat log feed */}
      <div className="glass-card p-6 rounded-2xl space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-white/5">
          <div className="flex items-center gap-2">
            <Terminal className="h-5 w-5 text-red-400" />
            <h3 className="font-extrabold text-white text-base">Intrusion Prevention Events Feed</h3>
          </div>
          <span className="text-xs font-mono font-semibold text-slate-500">Showing last 50 events</span>
        </div>

        <div className="space-y-3 max-h-96 overflow-y-auto pr-2 scrollbar-thin">
          {securityEvents.map((evt) => (
            <div 
              key={evt.id} 
              className="p-4 rounded-xl border border-white/5 bg-slate-950/40 hover:bg-slate-950/80 transition-all flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-xs"
            >
              <div className="flex items-start gap-3.5">
                <div className={`p-2 rounded-lg mt-0.5 shrink-0 ${getEventBadgeClass(evt.eventType)}`}>
                  {getEventIcon(evt.eventType)}
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-white">{evt.eventType}</span>
                    <span className="text-slate-500 font-mono text-[10px]">#{evt.id}</span>
                  </div>
                  <p className="text-slate-400 leading-relaxed font-mono text-[11px]">{evt.details}</p>
                  <div className="text-[10px] text-slate-500 font-mono">
                    Packet ID: {evt.packetId ? evt.packetId.substring(0, 16) + '...' : 'N/A'} | Hash: {evt.packetHash ? evt.packetHash.substring(0, 16) + '...' : 'N/A'}
                  </div>
                </div>
              </div>
              <span className="text-slate-500 font-mono text-[10px] shrink-0 font-medium">
                {new Date(evt.timestamp).toLocaleString()}
              </span>
            </div>
          ))}
          {securityEvents.length === 0 && (
            <div className="py-12 text-center text-slate-500 text-xs font-semibold">
              No security anomalies detected. System is running securely.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
