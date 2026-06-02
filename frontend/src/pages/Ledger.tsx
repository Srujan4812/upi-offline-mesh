import React, { useState } from 'react';
import { 
  Search, 
  Info, 
  X, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  ShieldCheck, 
  Key
} from 'lucide-react';
import { useAppState } from '../context/AppContext';
import type { Transaction } from '../context/AppContext';

export const Ledger: React.FC = () => {
  const { transactions } = useAppState();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'SETTLED' | 'REJECTED'>('ALL');
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);

  // Search & Filter
  const filteredTxs = transactions.filter(tx => {
    const matchesSearch = 
      tx.senderVpa.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.receiverVpa.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.packetHash.toLowerCase().includes(searchTerm.toLowerCase());
      
    const matchesStatus = 
      statusFilter === 'ALL' || 
      tx.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="flex-1 flex overflow-hidden h-full">
      {/* Table Side */}
      <div className="flex-1 flex flex-col p-8 overflow-hidden min-w-0">
        <div>
          <h2 className="text-2xl font-extrabold text-white tracking-tight">Live Transaction Ledger</h2>
          <p className="text-slate-400 text-sm">Real-time ledger audit log of mesh settled payments.</p>
        </div>

        {/* Filters Panel */}
        <div className="flex flex-col sm:flex-row gap-4 my-6 items-center justify-between shrink-0">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search VPA or packet hash..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-slate-900 border border-white/5 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500/50"
            />
          </div>

          <div className="flex gap-2 w-full sm:w-auto">
            {(['ALL', 'SETTLED', 'REJECTED'] as const).map(filter => (
              <button
                key={filter}
                onClick={() => setStatusFilter(filter)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-all ${
                  statusFilter === filter
                    ? 'bg-purple-600/10 border-purple-500/30 text-purple-400'
                    : 'bg-white/5 border-white/5 text-slate-400 hover:text-white'
                }`}
              >
                {filter === 'ALL' ? 'All Transactions' : filter}
              </button>
            ))}
          </div>
        </div>

        {/* Ledger Table */}
        <div className="flex-1 overflow-y-auto glass-card rounded-2xl border border-white/5 scrollbar-thin">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 text-slate-400 text-xs uppercase font-semibold sticky top-0 bg-background/95 backdrop-blur-md z-10">
                <th className="py-4 px-6">Transaction ID</th>
                <th className="py-4 px-6">Sender VPA</th>
                <th className="py-4 px-6">Receiver VPA</th>
                <th className="py-4 px-6 text-right">Amount</th>
                <th className="py-4 px-6 text-center">Hops</th>
                <th className="py-4 px-6">Settled At</th>
                <th className="py-4 px-6 text-center">Status</th>
                <th className="py-4 px-6 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-sm">
              {filteredTxs.map((tx) => (
                <tr 
                  key={tx.id} 
                  onClick={() => setSelectedTx(tx)}
                  className="hover:bg-white/5 cursor-pointer transition-all"
                >
                  <td className="py-4 px-6 font-mono text-xs text-slate-500 font-bold">#{tx.id}</td>
                  <td className="py-4 px-6 text-white font-semibold">{tx.senderVpa}</td>
                  <td className="py-4 px-6 text-white font-semibold">{tx.receiverVpa}</td>
                  <td className="py-4 px-6 text-right font-mono font-extrabold text-white">₹{tx.amount.toFixed(2)}</td>
                  <td className="py-4 px-6 text-center font-mono text-xs text-slate-400">{tx.hopCount} hops</td>
                  <td className="py-4 px-6 text-slate-400 font-mono text-xs">
                    {new Date(tx.settledAt).toLocaleTimeString()}
                  </td>
                  <td className="py-4 px-6 text-center">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      tx.status === 'SETTLED' 
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                        : 'bg-red-500/10 text-red-400 border border-red-500/20'
                    }`}>
                      {tx.status === 'SETTLED' ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                      {tx.status}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-center">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedTx(tx);
                      }}
                      className="p-1.5 rounded-lg bg-white/5 border border-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition-all"
                    >
                      <Info className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredTxs.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500 text-xs font-semibold">
                    No matching ledger entries found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Details Side Drawer */}
      {selectedTx && (
        <div className="w-96 border-l border-white/5 bg-background flex flex-col h-full overflow-hidden shrink-0 shadow-2xl animate-in slide-in-from-right duration-200">
          <div className="p-6 border-b border-white/5 flex justify-between items-center shrink-0">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-purple-400" />
              <h3 className="font-extrabold text-white text-base">Security Audit Details</h3>
            </div>
            <button 
              onClick={() => setSelectedTx(null)}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin text-xs">
            {/* Status Summary */}
            <div className={`p-4 rounded-xl border flex items-center justify-between ${
              selectedTx.status === 'SETTLED'
                ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400'
                : 'bg-red-500/5 border-red-500/20 text-red-400'
            }`}>
              <div>
                <div className="font-bold text-sm">Outcome: {selectedTx.status}</div>
                <div className="text-[10px] text-slate-400 mt-1">Processed successfully at gateway</div>
              </div>
              {selectedTx.status === 'SETTLED' ? <CheckCircle2 className="h-6 w-6" /> : <XCircle className="h-6 w-6" />}
            </div>

            {/* Cryptographic Hash */}
            <div className="space-y-2">
              <span className="text-slate-500 font-bold uppercase tracking-wider text-[10px]">Ciphertext Hash (SHA-256)</span>
              <div className="p-3 rounded-xl bg-slate-900 border border-white/5 font-mono text-[10px] text-slate-300 break-all select-all">
                {selectedTx.packetHash}
              </div>
            </div>

            {/* Nonce */}
            <div className="space-y-2">
              <span className="text-slate-500 font-bold uppercase tracking-wider text-[10px]">Unique Nonce (UUID)</span>
              <div className="p-3 rounded-xl bg-slate-900 border border-white/5 font-mono text-[10px] text-slate-300 select-all">
                {selectedTx.nonce}
              </div>
            </div>

            {/* Transaction specs */}
            <div className="space-y-3">
              <span className="text-slate-500 font-bold uppercase tracking-wider text-[10px]">Transaction Parameters</span>
              <div className="space-y-2 bg-surface/40 p-4 rounded-xl border border-white/5">
                <div className="flex justify-between">
                  <span className="text-slate-400">Sender VPA:</span>
                  <span className="text-white font-mono font-semibold">{selectedTx.senderVpa}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Receiver VPA:</span>
                  <span className="text-white font-mono font-semibold">{selectedTx.receiverVpa}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Amount:</span>
                  <span className="text-emerald-400 font-mono font-extrabold">₹{selectedTx.amount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Bridge Delivery Node:</span>
                  <span className="text-white font-mono font-semibold">{selectedTx.bridgeNodeId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Hops Logged:</span>
                  <span className="text-white font-mono font-semibold">{selectedTx.hopCount} hops</span>
                </div>
              </div>
            </div>

            {/* Timestamps */}
            <div className="space-y-3">
              <span className="text-slate-500 font-bold uppercase tracking-wider text-[10px]">Timing Metrics</span>
              <div className="space-y-2.5 bg-surface/40 p-4 rounded-xl border border-white/5">
                <div className="flex gap-2.5 items-start">
                  <Clock className="h-4 w-4 text-purple-400 mt-0.5 shrink-0" />
                  <div>
                    <div className="font-semibold text-white">Signed Offline</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      {new Date(selectedTx.signedAt).toLocaleString()}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2.5 items-start">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
                  <div>
                    <div className="font-semibold text-white">Settled Online</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      {new Date(selectedTx.settledAt).toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ECDSA signatures info */}
            <div className="space-y-3">
              <span className="text-slate-500 font-bold uppercase tracking-wider text-[10px]">Cryptographic Integrity</span>
              <div className="space-y-2 bg-purple-950/10 border border-purple-500/10 p-4 rounded-xl text-purple-300 leading-relaxed">
                <div className="flex items-center gap-1.5 font-bold mb-1">
                  <Key className="h-4 w-4 text-purple-400 animate-pulse" />
                  ECDSA Signature Verified
                </div>
                The payment signature was validated on the backend. This guarantees that the instruction originated directly from the owner's device and was not re-packaged or altered during mesh transit hops.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
