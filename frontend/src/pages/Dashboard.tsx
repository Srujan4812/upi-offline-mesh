import React from 'react';
import { 
  Users, 
  Share2, 
  Layers, 
  CheckCircle2, 
  Copy, 
  AlertTriangle,
  Wallet,
  TrendingUp
} from 'lucide-react';
import { useAppState } from '../context/AppContext';

export const Dashboard: React.FC = () => {
  const { devices, transactions, accounts, analytics, wsConnected } = useAppState();

  // Compute local values if analytics is not loaded yet
  const totalSettled = analytics?.totalSettled ?? transactions.filter(t => t.status === 'SETTLED').length;
  const duplicateDrops = analytics?.duplicateDrops ?? 0;
  const replayAttacks = analytics?.replayAttacks ?? 0;
  const securityViolations = (analytics?.tamperedPackets ?? 0) + 
                             (analytics?.invalidSignatures ?? 0) + 
                             (analytics?.expiredPackets ?? 0) + 
                             replayAttacks;
  
  const successRate = analytics?.successRate ?? 100;
  const bridgeNodes = devices.filter(d => d.hasInternet).length;
  const packetsInTransit = devices.reduce((sum, d) => sum + (d.hasInternet ? 0 : d.packetCount), 0);

  const kpis = [
    {
      label: 'Active Devices',
      value: devices.length,
      icon: Users,
      color: 'text-blue-400 border-blue-500/10 bg-blue-500/5',
      desc: 'Simulated phones in range'
    },
    {
      label: 'Bridge Nodes',
      value: bridgeNodes,
      icon: Share2,
      color: 'text-violet-400 border-violet-500/10 bg-violet-500/5',
      desc: 'Internet-connected egress points'
    },
    {
      label: 'Packets in Transit',
      value: packetsInTransit,
      icon: Layers,
      color: 'text-amber-400 border-amber-500/10 bg-amber-500/5',
      desc: 'Buffered encrypted payloads'
    },
    {
      label: 'Successful Settlements',
      value: totalSettled,
      icon: CheckCircle2,
      color: 'text-emerald-400 border-emerald-500/10 bg-emerald-500/5',
      desc: 'Settled ledger records'
    },
    {
      label: 'Duplicates Blocked',
      value: duplicateDrops,
      icon: Copy,
      color: 'text-orange-400 border-orange-500/10 bg-orange-500/5',
      desc: 'Prevented double-spends'
    },
    {
      label: 'Security Violations',
      value: securityViolations,
      icon: AlertTriangle,
      color: 'text-red-400 border-red-500/10 bg-red-500/5',
      desc: 'Tampered/Replayed alerts'
    }
  ];

  return (
    <div className="flex-1 overflow-y-auto p-8 space-y-8">
      {/* Top Banner / Welcome */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-white tracking-tight">Fintech Network Operations</h2>
          <p className="text-slate-400 text-sm">Real-time telemetry and ledger auditing dashboard.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="glass-panel px-4 py-2 rounded-xl flex items-center gap-2">
            <span className={`h-2.5 w-2.5 rounded-full ${wsConnected ? 'bg-emerald-400 shadow-glow-green' : 'bg-red-400'} animate-pulse`} />
            <span className="text-xs font-mono font-bold text-slate-300">
              {wsConnected ? 'Telemetry Feed Connected' : 'Telemetry Reconnecting...'}
            </span>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {kpis.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <div key={idx} className="glass-card p-6 rounded-2xl flex items-start gap-4 hover:border-white/10 transition-all">
              <div className={`h-12 w-12 rounded-xl border flex items-center justify-center shrink-0 ${kpi.color}`}>
                <Icon className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">{kpi.label}</span>
                <div className="text-2xl font-extrabold text-white font-mono">{kpi.value}</div>
                <p className="text-slate-500 text-[11px] leading-relaxed">{kpi.desc}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Grid: Accounts & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Accounts Balances Panel */}
        <div className="lg:col-span-2 glass-card p-6 rounded-2xl space-y-6">
          <div className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-emerald-400" />
            <h3 className="font-extrabold text-white text-base">Account Balances</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5 text-slate-400 text-xs uppercase font-semibold">
                  <th className="py-3 px-4">Holder Name</th>
                  <th className="py-3 px-4">VPA Address</th>
                  <th className="py-3 px-4 text-right">Settled Balance</th>
                  <th className="py-3 px-4 text-center">Version</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-sm">
                {accounts.map((acc) => (
                  <tr key={acc.vpa} className="hover:bg-white/5 transition-all">
                    <td className="py-3.5 px-4 font-bold text-white">{acc.holderName}</td>
                    <td className="py-3.5 px-4 text-slate-400 font-mono text-xs">{acc.vpa}</td>
                    <td className="py-3.5 px-4 text-right font-mono font-extrabold text-emerald-400">
                      ₹{acc.balance.toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4 text-center text-slate-500 font-mono text-xs">{acc.version}</td>
                  </tr>
                ))}
                {accounts.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-slate-500 text-xs font-medium">
                      No accounts found. Seeding database...
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Network Metrics Sidebar Panel */}
        <div className="glass-card p-6 rounded-2xl flex flex-col justify-between space-y-6">
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-purple-400" />
              <h3 className="font-extrabold text-white text-base">Performance Analytics</h3>
            </div>
            
            <div className="space-y-4">
              {/* Success Rate */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-slate-400">Settlement Success Rate</span>
                  <span className="text-emerald-400 font-mono font-extrabold">{successRate.toFixed(1)}%</span>
                </div>
                <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-purple-500 to-emerald-500 transition-all duration-500" 
                    style={{ width: `${successRate}%` }}
                  />
                </div>
              </div>

              {/* Security violations count */}
              <div className="flex justify-between items-center py-2.5 border-b border-white/5 text-xs">
                <span className="text-slate-400">Replay Attempts</span>
                <span className={`font-mono font-extrabold ${replayAttacks > 0 ? 'text-red-400' : 'text-slate-300'}`}>
                  {replayAttacks}
                </span>
              </div>
              
              <div className="flex justify-between items-center py-2.5 border-b border-white/5 text-xs">
                <span className="text-slate-400">Tampered Packets</span>
                <span className={`font-mono font-extrabold ${analytics?.tamperedPackets ? 'text-red-400' : 'text-slate-300'}`}>
                  {analytics?.tamperedPackets ?? 0}
                </span>
              </div>

              <div className="flex justify-between items-center py-2.5 border-b border-white/5 text-xs">
                <span className="text-slate-400">Invalid Signatures</span>
                <span className={`font-mono font-extrabold ${analytics?.invalidSignatures ? 'text-red-400' : 'text-slate-300'}`}>
                  {analytics?.invalidSignatures ?? 0}
                </span>
              </div>

              <div className="flex justify-between items-center py-2.5 text-xs">
                <span className="text-slate-400">Redis Idempotency Locks</span>
                <span className="text-blue-400 font-mono font-extrabold">
                  {analytics?.totalSettled ?? 0}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-purple-950/20 border border-purple-500/10 rounded-xl p-4 text-xs text-purple-300 leading-relaxed">
            <strong>System telemetry status:</strong> Real-time mesh data is received dynamically through WebSockets. When a device drops a packet, it will instantly move in the Visualizer page.
          </div>
        </div>
      </div>
    </div>
  );
};
