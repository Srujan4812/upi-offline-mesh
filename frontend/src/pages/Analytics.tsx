import React from 'react';
import { 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';
import { Activity, Clock, Zap, Cpu } from 'lucide-react';
import { useAppState } from '../context/AppContext';

export const Analytics: React.FC = () => {
  const { transactions, analytics } = useAppState();

  // Create simulated mock time-series data based on transactions
  const timeData = [
    { time: '00:00', throughput: 2, duplicates: 0, latency: 120 },
    { time: '04:00', throughput: 5, duplicates: 1, latency: 155 },
    { time: '08:00', throughput: 8, duplicates: 2, latency: 140 },
    { time: '12:00', throughput: 14, duplicates: 4, latency: 180 },
    { time: '16:00', throughput: 19, duplicates: 6, latency: 130 },
    { time: '20:00', throughput: 24, duplicates: 8, latency: 110 },
  ];

  // Adjust timeData using live analytics counts if present
  if (analytics) {
    timeData[timeData.length - 1].throughput = (analytics.totalSettled || 0) + (analytics.duplicateDrops || 0);
    timeData[timeData.length - 1].duplicates = analytics.duplicateDrops || 0;
  }

  const latencyData = transactions.filter(t => t.status === 'SETTLED').map((tx, idx) => ({
    txId: `#${tx.id}`,
    hops: tx.hopCount,
    latencyMs: 100 + tx.hopCount * 45 + (idx % 3) * 20 // Simulated processing latency scaling with hops
  })).reverse();

  // Seed default latencyData if empty
  const displayLatencyData = latencyData.length > 0 ? latencyData : [
    { txId: '#1', hops: 2, latencyMs: 170 },
    { txId: '#2', hops: 4, latencyMs: 250 },
    { txId: '#3', hops: 1, latencyMs: 140 },
  ];

  return (
    <div className="flex-1 overflow-y-auto p-8 space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-extrabold text-white tracking-tight">Network Analytics</h2>
        <p className="text-slate-400 text-sm">Fine-grained metrics profiling settlement delays and ad-hoc traffic throughput.</p>
      </div>

      {/* Grid: Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Packet Hops vs Latency (Bar Chart) */}
        <div className="glass-card p-6 rounded-2xl space-y-6 flex flex-col">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-purple-400" />
            <h3 className="font-extrabold text-white text-base">Settlement Latency (ms) vs Hops</h3>
          </div>
          <div className="flex-1 min-h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={displayLatencyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.02)" />
                <XAxis dataKey="txId" stroke="#64748b" fontSize={10} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={10} tickLine={false} label={{ value: 'Latency (ms)', angle: -90, position: 'insideLeft', fill: '#64748b', fontSize: '10px' }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#121217', borderColor: 'rgba(255,255,255,0.08)', borderRadius: '8px' }}
                  labelStyle={{ color: '#94a3b8', fontSize: '10px' }}
                />
                <Bar dataKey="latencyMs" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="Latency (ms)" />
                <Bar dataKey="hops" fill="#10b981" radius={[4, 4, 0, 0]} name="Hop Count" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Throughput Over Time (Area Chart) */}
        <div className="glass-card p-6 rounded-2xl space-y-6 flex flex-col">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-emerald-400" />
            <h3 className="font-extrabold text-white text-base">Network Packet Ingestion Load</h3>
          </div>
          <div className="flex-1 min-h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timeData}>
                <defs>
                  <linearGradient id="colorThroughput" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorDuplicates" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.02)" />
                <XAxis dataKey="time" stroke="#64748b" fontSize={10} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={10} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#121217', borderColor: 'rgba(255,255,255,0.08)', borderRadius: '8px' }}
                  labelStyle={{ color: '#94a3b8', fontSize: '10px' }}
                />
                <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '10px' }} />
                <Area type="monotone" dataKey="throughput" stroke="#10b981" fillOpacity={1} fill="url(#colorThroughput)" name="Ingested Packets" />
                <Area type="monotone" dataKey="duplicates" stroke="#f59e0b" fillOpacity={1} fill="url(#colorDuplicates)" name="Duplicates Rejected" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Observability Dials */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-card p-6 rounded-2xl flex items-center gap-4">
          <div className="h-10 w-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shrink-0">
            <Zap className="h-5 w-5" />
          </div>
          <div>
            <div className="text-[10px] text-slate-500 font-bold uppercase">Average Hop Efficiency</div>
            <div className="text-xl font-extrabold text-white font-mono mt-0.5">92.4%</div>
          </div>
        </div>
        <div className="glass-card p-6 rounded-2xl flex items-center gap-4">
          <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <div className="text-[10px] text-slate-500 font-bold uppercase">Simulated Node TPS</div>
            <div className="text-xl font-extrabold text-white font-mono mt-0.5">14.8 tps</div>
          </div>
        </div>
        <div className="glass-card p-6 rounded-2xl flex items-center gap-4">
          <div className="h-10 w-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
            <Cpu className="h-5 w-5" />
          </div>
          <div>
            <div className="text-[10px] text-slate-500 font-bold uppercase">Redis Lock Hit Rate</div>
            <div className="text-xl font-extrabold text-white font-mono mt-0.5">
              {analytics && (analytics.totalSettled + analytics.duplicateDrops) > 0 
                ? `${((analytics.totalSettled / (analytics.totalSettled + analytics.duplicateDrops)) * 100).toFixed(1)}%` 
                : '100%'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
