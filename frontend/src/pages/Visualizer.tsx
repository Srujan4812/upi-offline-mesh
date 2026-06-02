import React, { useState, useEffect, useCallback, useRef } from 'react';
import ReactFlow, {
  Background,
  Controls,
  Handle,
  Position
} from 'reactflow';
import type { Node, Edge } from 'reactflow';
import 'reactflow/dist/style.css';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, 
  RotateCcw, 
  Wifi, 
  WifiOff, 
  Sparkles,
  Server,
  Smartphone,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Volume2,
  VolumeX
} from 'lucide-react';
import { useAppState } from '../context/AppContext';

// Synthetic sound triggers via Web Audio API (No asset downloads required)
const playChime = (soundEnabled: boolean, type: 'success' | 'failure' | 'click' | 'step') => {
  if (!soundEnabled) return;
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'success') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      osc.start();
      osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1); // E5
      osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.2); // G5
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      osc.stop(ctx.currentTime + 0.45);
    } else if (type === 'failure') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(160, ctx.currentTime); // Low buzz
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      osc.start();
      osc.frequency.setValueAtTime(110, ctx.currentTime + 0.15);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      osc.stop(ctx.currentTime + 0.45);
    } else if (type === 'step') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, ctx.currentTime); // A4
      gain.gain.setValueAtTime(0.05, ctx.currentTime);
      osc.start();
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
      osc.stop(ctx.currentTime + 0.12);
    } else {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, ctx.currentTime);
      gain.gain.setValueAtTime(0.03, ctx.currentTime);
      osc.start();
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
      osc.stop(ctx.currentTime + 0.1);
    }
  } catch (e) {
    console.warn('Web Audio playback blocked or failed:', e);
  }
};

// Premium custom node component for React Flow
const CustomNodeComponent = ({ data }: any) => {
  const { label, isBridge, isBackend, isAttacker, packetCount, hasInternet, glowColor, pulse, statusLabel } = data;
  
  return (
    <div className={`relative px-4 py-3 rounded-xl border glass-panel transition-all duration-300 w-44 text-left ${
      glowColor === 'green' ? 'border-emerald-500/40 shadow-[0_0_20px_rgba(16,185,129,0.25)] bg-emerald-950/20' :
      glowColor === 'blue' ? 'border-sky-500/40 shadow-[0_0_20px_rgba(56,189,248,0.25)] bg-sky-950/20' :
      glowColor === 'purple' ? 'border-purple-500/40 shadow-[0_0_20px_rgba(139,92,246,0.25)] bg-purple-950/20' :
      glowColor === 'red' ? 'border-red-500/40 shadow-[0_0_20px_rgba(239,68,68,0.25)] bg-red-950/20' :
      'border-white/5 bg-[#121217]/90'
    }`}>
      <Handle type="target" position={Position.Left} className="opacity-0" />
      
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          {isBackend ? (
            <Server className={`h-4 w-4 ${glowColor ? 'text-sky-400' : 'text-slate-400'}`} />
          ) : isAttacker ? (
            <ShieldAlert className="h-4 w-4 text-red-400" />
          ) : (
            <Smartphone className={`h-4 w-4 ${isBridge ? 'text-purple-400' : 'text-slate-400'}`} />
          )}
          <span className="font-extrabold text-xs text-white tracking-tight">{label}</span>
        </div>
        
        {hasInternet !== undefined && (
          <div className="flex items-center gap-1">
            <span className={`w-1.5 h-1.5 rounded-full ${hasInternet ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`} />
            <span className="text-[7px] text-slate-500 uppercase font-mono">{hasInternet ? '4G' : 'OFF'}</span>
          </div>
        )}
      </div>
      
      <div className="flex items-center justify-between text-[9px] mt-2">
        <span className="text-slate-500 font-bold uppercase tracking-wider">
          {isBridge ? 'Bridge Node' : isBackend ? 'Central Gateway' : isAttacker ? 'Attacker' : 'Mesh Node'}
        </span>
        {packetCount !== undefined && packetCount > 0 ? (
          <span className="bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded font-mono font-bold">
            {packetCount} PKT
          </span>
        ) : statusLabel ? (
          <span className={`px-1.5 py-0.5 rounded font-mono font-bold ${
            glowColor === 'green' ? 'bg-emerald-500/20 text-emerald-400' :
            glowColor === 'red' ? 'bg-rose-500/20 text-rose-400' : 'text-slate-500'
          }`}>
            {statusLabel}
          </span>
        ) : null}
      </div>

      {pulse && (
        <span className="absolute -inset-px rounded-xl border border-current animate-ping opacity-25 pointer-events-none text-current" />
      )}

      <Handle type="source" position={Position.Right} className="opacity-0" />
    </div>
  );
};

const nodeTypes = {
  custom: CustomNodeComponent
};

export const Visualizer: React.FC = () => {
  const { transactions } = useAppState();

  // Control Form States
  const [sender, setSender] = useState('Phone A');
  const [receiver, setReceiver] = useState('Phone B');
  const [amount, setAmount] = useState('500');
  const [pin, setPin] = useState('1234');
  const [speed, setSpeed] = useState<number>(1); // 1x, 2x, 5x, 10x
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Simulation Timeline & Engine States
  const [isSimulating, setIsSimulating] = useState(false);
  const [activeScenario, setActiveScenario] = useState<string | null>(null);
  const [simStep, setSimStep] = useState<number>(0);
  const [timeline, setTimeline] = useState<Array<{ time: string; msg: string; status: 'info' | 'success' | 'warn' | 'error' }>>([]);
  
  // Custom states for nodes and edges
  const [nodeGlows, setNodeGlows] = useState<Record<string, string>>({});
  const [nodePulses, setNodePulses] = useState<Record<string, boolean>>({});
  const [nodePackets, setNodePackets] = useState<Record<string, number>>({});
  const [nodeStatusLabels, setNodeStatusLabels] = useState<Record<string, string>>({});
  const [activeEdges, setActiveEdges] = useState<string[]>([]);
  const [activeEdgeColors, setActiveEdgeColors] = useState<Record<string, string>>({});
  
  // Encryption Pipeline Stepper
  const [encStep, setEncStep] = useState<number>(0); // 1: Nonce, 2: AES, 3: ECDSA, 4: Ready
  
  // Central Gateway Stepper
  const [gateStep, setGateStep] = useState<number>(0); // 1: Recv, 2: Hash, 3: Redis, 4: ECDSA, 5: Replay, 6: Decrypt, 7: Settle, 8: Success
  const [gatewayError, setGatewayError] = useState<string | null>(null);

  // Bottom Tracker Highlights
  const [trackerIndex, setTrackerIndex] = useState<number>(-1);

  // Stats Counters
  const [packetsInTransit, setPacketsInTransit] = useState(0);
  const [duplicatesCount, setDuplicatesCount] = useState(12);
  const [threatsCount, setThreatsCount] = useState(3);

  // Refs for auto scrolling log panel
  const logContainerRef = useRef<HTMLDivElement>(null);

  const speedMultiplier = 1 / speed;

  const addTimelineEvent = useCallback((msg: string, status: 'info' | 'success' | 'warn' | 'error' = 'info') => {
    const time = new Date().toLocaleTimeString();
    setTimeline(prev => [...prev, { time, msg, status }]);
    playChime(soundEnabled, status === 'success' ? 'success' : status === 'error' ? 'failure' : 'step');
  }, [soundEnabled]);

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [timeline]);

  // Reset visual state of visualizer
  const resetVisualizer = useCallback(() => {
    setNodeGlows({});
    setNodePulses({});
    setNodePackets({});
    setNodeStatusLabels({});
    setActiveEdges([]);
    setActiveEdgeColors({});
    setEncStep(0);
    setGateStep(0);
    setGatewayError(null);
    setTrackerIndex(-1);
    setPacketsInTransit(0);
    setTimeline([]);
    setIsSimulating(false);
    setActiveScenario(null);
    setSimStep(0);
  }, []);

  // AUTOMATED JOURNEY TIMERS & PIPELINES
  const runSuccessfulPayment = async () => {
    resetVisualizer();
    setIsSimulating(true);
    setActiveScenario('successful');
    const delay = (ms: number) => new Promise(res => setTimeout(res, ms * speedMultiplier));

    // STEP 1 - Creation
    setSimStep(1);
    setTrackerIndex(0);
    setNodeGlows(prev => ({ ...prev, 'Phone A': 'green' }));
    setNodePulses(prev => ({ ...prev, 'Phone A': true }));
    addTimelineEvent('Payment created at Phone A (Sender node).', 'info');
    await delay(1500);

    // STEP 2 - Local Encryption Steps
    setEncStep(1); playChime(soundEnabled, 'step'); await delay(500);
    setEncStep(2); playChime(soundEnabled, 'step'); await delay(500);
    setEncStep(3); playChime(soundEnabled, 'step'); await delay(500);
    setEncStep(4); playChime(soundEnabled, 'step');
    addTimelineEvent('Payload secured: AES-256-GCM encrypted and ECDSA signed locally.', 'success');
    setTrackerIndex(2);
    setNodePulses(prev => ({ ...prev, 'Phone A': false }));
    await delay(1200);

    // STEP 3 - Broadcast
    setTrackerIndex(3);
    setPacketsInTransit(3);
    addTimelineEvent('Initiating ad-hoc BLE broadcast to nearest neighbors.', 'info');
    setActiveEdges(['Phone A-Phone C', 'Phone A-Phone F', 'Phone A-Phone I']);
    setActiveEdgeColors({
      'Phone A-Phone C': '#10b981',
      'Phone A-Phone F': '#10b981',
      'Phone A-Phone I': '#10b981'
    });
    setNodeGlows(prev => ({ ...prev, 'Phone C': 'green', 'Phone F': 'green', 'Phone I': 'green' }));
    setNodePackets({ 'Phone C': 1, 'Phone F': 1, 'Phone I': 1 });
    await delay(1500);

    // STEP 4 - Propagation
    setTrackerIndex(4);
    addTimelineEvent('Gossip hop 2: Packets routed dynamically through transit nodes.', 'info');
    setActiveEdges([
      'Phone C-Phone D', 'Phone C-Phone H', 
      'Phone F-Phone G', 'Phone F-Phone J', 
      'Phone I-Bridge 1'
    ]);
    setActiveEdgeColors({
      'Phone C-Phone D': '#8b5cf6',
      'Phone C-Phone H': '#8b5cf6',
      'Phone F-Phone G': '#8b5cf6',
      'Phone F-Phone J': '#8b5cf6',
      'Phone I-Bridge 1': '#8b5cf6'
    });
    setNodePackets({ 
      'Phone C': 0, 'Phone F': 0, 'Phone I': 0,
      'Phone D': 1, 'Phone G': 1, 'Bridge 1': 1 
    });
    setNodeGlows(prev => ({ ...prev, 'Phone D': 'green', 'Phone G': 'green', 'Bridge 1': 'purple' }));
    await delay(1500);

    // STEP 5 - Bridge Landing
    setTrackerIndex(5);
    setPacketsInTransit(0);
    addTimelineEvent('Packet reached Bridge 1 egress point. Launching backhaul upload.', 'info');
    setActiveEdges(['Bridge 1-Central Gateway']);
    setActiveEdgeColors({ 'Bridge 1-Central Gateway': '#8b5cf6' });
    setNodeGlows(prev => ({ ...prev, 'Central Gateway': 'blue' }));
    setNodePulses(prev => ({ ...prev, 'Central Gateway': true }));
    await delay(1500);

    // STEP 6 - Central Gateway Verification steps
    setGateStep(1); playChime(soundEnabled, 'step'); await delay(400);
    setGateStep(2); playChime(soundEnabled, 'step'); await delay(400);
    setGateStep(3); playChime(soundEnabled, 'step'); await delay(400);
    setGateStep(4); playChime(soundEnabled, 'step'); await delay(400);
    setGateStep(5); playChime(soundEnabled, 'step'); await delay(400);
    setGateStep(6); playChime(soundEnabled, 'step'); await delay(400);
    setGateStep(7); playChime(soundEnabled, 'step'); await delay(400);
    setGateStep(8);
    setTrackerIndex(8);
    addTimelineEvent('Central Gateway confirmed valid cryptographic signatures & settled funds!', 'success');
    await delay(1500);

    // STEP 7 - Receiver Delivery
    setTrackerIndex(9);
    addTimelineEvent('Push notification dispatched to receiver (Phone B).', 'info');
    setActiveEdges(['Phone E-Phone B', 'Phone H-Phone B', 'Phone J-Phone B']);
    setActiveEdgeColors({
      'Phone E-Phone B': '#3b82f6',
      'Phone H-Phone B': '#3b82f6',
      'Phone J-Phone B': '#3b82f6'
    });
    setNodeGlows(prev => ({ ...prev, 'Phone B': 'blue' }));
    setNodePulses(prev => ({ ...prev, 'Phone B': true }));
    setNodeStatusLabels({ 'Phone B': '₹500 RCVD' });
    await delay(2000);
    
    addTimelineEvent('Payment simulation successfully finished.', 'success');
    setIsSimulating(false);
    setActiveScenario(null);
  };

  const runDuplicateStorm = async () => {
    resetVisualizer();
    setIsSimulating(true);
    setActiveScenario('duplicate');
    const delay = (ms: number) => new Promise(res => setTimeout(res, ms * speedMultiplier));

    setNodeGlows(prev => ({ ...prev, 'Phone A': 'green' }));
    addTimelineEvent('Scenario: Duplicate Packet Storm. Alice broadcasts payment.', 'info');
    await delay(1200);

    // Encrypt & Sign
    setEncStep(4);
    addTimelineEvent('Local signature & packaging ready.', 'success');
    await delay(1000);

    // Send Alice -> C, F, I
    setPacketsInTransit(3);
    setActiveEdges(['Phone A-Phone C', 'Phone A-Phone F', 'Phone A-Phone I']);
    setActiveEdgeColors({
      'Phone A-Phone C': '#10b981',
      'Phone A-Phone F': '#10b981',
      'Phone A-Phone I': '#10b981'
    });
    setNodeGlows(prev => ({ ...prev, 'Phone C': 'green', 'Phone F': 'green', 'Phone I': 'green' }));
    await delay(1500);

    // Double propagate: packet reaches multiple egress points (Phone D as temporary bridge, and Bridge 1)
    addTimelineEvent('Packets reaching two internet bridges concurrently.', 'info');
    setNodeGlows(prev => ({ ...prev, 'Phone D': 'purple', 'Bridge 1': 'purple' }));
    setNodeStatusLabels({ 'Phone D': 'BRIDGE', 'Bridge 1': 'BRIDGE' });
    setActiveEdges(['Phone C-Phone D', 'Phone I-Bridge 1']);
    setActiveEdgeColors({
      'Phone C-Phone D': '#8b5cf6',
      'Phone I-Bridge 1': '#8b5cf6'
    });
    await delay(1500);

    // Concurrent upload to Gateway
    addTimelineEvent('Bridges uploading identical packet hashes in parallel.', 'info');
    setActiveEdges(['Phone D-Central Gateway', 'Bridge 1-Central Gateway']);
    setActiveEdgeColors({
      'Phone D-Central Gateway': '#f59e0b',
      'Bridge 1-Central Gateway': '#f59e0b'
    });
    setNodeGlows(prev => ({ ...prev, 'Central Gateway': 'blue' }));
    await delay(1500);

    // Gateway processing showing first settled, second rejected as duplicate
    setGateStep(3); // Redis lock
    addTimelineEvent('Central Gateway processes Bridge 1 upload: Claimed lock successfully. Settled.', 'success');
    setNodeStatusLabels({ 'Bridge 1': 'SETTLED' });
    setDuplicatesCount(prev => prev + 1);
    await delay(1500);

    setGateStep(3);
    setGatewayError('Redis lock already acquired by Bridge 1.');
    addTimelineEvent('Central Gateway processes Phone D upload: Lock denied! Dropped duplicate.', 'error');
    setNodeGlows(prev => ({ ...prev, 'Phone D': 'red' }));
    setNodeStatusLabels({ 'Phone D': 'DUPLICATE' });
    await delay(2000);

    setIsSimulating(false);
    setActiveScenario(null);
  };

  const runReplayAttack = async () => {
    resetVisualizer();
    setIsSimulating(true);
    setActiveScenario('replay');
    const delay = (ms: number) => new Promise(res => setTimeout(res, ms * speedMultiplier));

    // Show Attacker Node
    addTimelineEvent('Scenario: Replay Attack. Attacker injects intercepted packet.', 'info');
    setNodeGlows(prev => ({ ...prev, 'Attacker Node': 'red' }));
    setNodePulses(prev => ({ ...prev, 'Attacker Node': true }));
    await delay(1500);

    // Broadcast from Attacker Node to stranger node I
    setActiveEdges(['Attacker Node-Phone I']);
    setActiveEdgeColors({ 'Attacker Node-Phone I': '#ef4444' });
    setNodeGlows(prev => ({ ...prev, 'Phone I': 'red' }));
    setNodePackets({ 'Phone I': 1 });
    await delay(1500);

    // Hop to Bridge 1
    setActiveEdges(['Phone I-Bridge 1']);
    setActiveEdgeColors({ 'Phone I-Bridge 1': '#ef4444' });
    setNodeGlows(prev => ({ ...prev, 'Bridge 1': 'purple' }));
    setNodePackets({ 'Phone I': 0, 'Bridge 1': 1 });
    await delay(1500);

    // Upload to central gateway
    addTimelineEvent('Bridge 1 uploads replayed packet details to central gateway.', 'info');
    setActiveEdges(['Bridge 1-Central Gateway']);
    setActiveEdgeColors({ 'Bridge 1-Central Gateway': '#ef4444' });
    setNodeGlows(prev => ({ ...prev, 'Central Gateway': 'red' }));
    await delay(1500);

    // Gateway processing fails at Nonce/Replay step
    setGateStep(1); await delay(400);
    setGateStep(2); await delay(400);
    setGateStep(3); await delay(400);
    setGateStep(4); await delay(400);
    setGateStep(5); // Replay step
    setGatewayError('REPLAY BLOCKED: Nonce [e5d735] already processed in ledger.');
    addTimelineEvent('CRITICAL: Replay attack intercepted. Nonce validation failed!', 'error');
    setThreatsCount(prev => prev + 1);
    await delay(2500);

    setIsSimulating(false);
    setActiveScenario(null);
  };

  const runTamperedPacket = async () => {
    resetVisualizer();
    setIsSimulating(true);
    setActiveScenario('tamper');
    const delay = (ms: number) => new Promise(res => setTimeout(res, ms * speedMultiplier));

    // Start propagation
    setNodeGlows(prev => ({ ...prev, 'Phone A': 'green' }));
    addTimelineEvent('Scenario: Tampered Packet. Alice creates standard ₹500 payment.', 'info');
    setEncStep(4);
    await delay(1500);

    // Broadcast green packet to Phone C
    setActiveEdges(['Phone A-Phone C']);
    setActiveEdgeColors({ 'Phone A-Phone C': '#10b981' });
    setNodeGlows(prev => ({ ...prev, 'Phone C': 'green' }));
    await delay(1200);

    // Rogue intermediary C modifies packet (turns red)
    addTimelineEvent('Phone C (Rogue Transit Node) modifies transaction value inside ciphertext.', 'warn');
    setNodeGlows(prev => ({ ...prev, 'Phone C': 'red' }));
    setNodeStatusLabels({ 'Phone C': 'TAMPERED' });
    await delay(1500);

    // Broadcast red packet to stranger D
    setActiveEdges(['Phone C-Phone D']);
    setActiveEdgeColors({ 'Phone C-Phone D': '#ef4444' });
    setNodeGlows(prev => ({ ...prev, 'Phone D': 'red' }));
    await delay(1200);

    // Forward to Bridge 1
    setActiveEdges(['Phone D-Bridge 1']);
    setActiveEdgeColors({ 'Phone D-Bridge 1': '#ef4444' });
    setNodeGlows(prev => ({ ...prev, 'Bridge 1': 'purple' }));
    await delay(1200);

    // Upload to Gateway
    setActiveEdges(['Bridge 1-Central Gateway']);
    setActiveEdgeColors({ 'Bridge 1-Central Gateway': '#ef4444' });
    setNodeGlows(prev => ({ ...prev, 'Central Gateway': 'red' }));
    await delay(1500);

    // Gateway GCM decryption tag mismatch block
    setGateStep(1); await delay(400);
    setGateStep(2); await delay(400);
    setGateStep(3); await delay(400);
    setGateStep(4); await delay(400);
    setGateStep(5); await delay(400);
    setGateStep(6); // Decrypt
    setGatewayError('DECRYPTION FAILED: AES-GCM tag validation failed (ciphertext altered).');
    addTimelineEvent('CRITICAL: GCM Decryption tag mismatch! Packet rejected.', 'error');
    setThreatsCount(prev => prev + 1);
    await delay(2500);

    setIsSimulating(false);
    setActiveScenario(null);
  };

  const runInvalidSignature = async () => {
    resetVisualizer();
    setIsSimulating(true);
    setActiveScenario('signature');
    const delay = (ms: number) => new Promise(res => setTimeout(res, ms * speedMultiplier));

    setNodeGlows(prev => ({ ...prev, 'Phone A': 'green' }));
    addTimelineEvent('Scenario: Invalid Signature. Injecting packet with forged/modified payload.', 'info');
    await delay(1500);

    // Broadcast to Phone I
    setActiveEdges(['Phone A-Phone I']);
    setActiveEdgeColors({ 'Phone A-Phone I': '#10b981' });
    setNodeGlows(prev => ({ ...prev, 'Phone I': 'green' }));
    await delay(1200);

    // Forward to Bridge 1
    setActiveEdges(['Phone I-Bridge 1']);
    setActiveEdgeColors({ 'Phone I-Bridge 1': '#10b981' });
    setNodeGlows(prev => ({ ...prev, 'Bridge 1': 'purple' }));
    await delay(1200);

    // Upload to Gateway
    setActiveEdges(['Bridge 1-Central Gateway']);
    setActiveEdgeColors({ 'Bridge 1-Central Gateway': '#10b981' });
    setNodeGlows(prev => ({ ...prev, 'Central Gateway': 'red' }));
    await delay(1500);

    // Gateway signature fails
    setGateStep(1); await delay(400);
    setGateStep(2); await delay(400);
    setGateStep(3); await delay(400);
    setGateStep(4); // ECDSA verification
    setGatewayError('SIGNATURE REJECTED: ECDSA Verification failed (keys modified).');
    addTimelineEvent('CRITICAL: Forged ECDSA signature detected. Ingest rejected!', 'error');
    setThreatsCount(prev => prev + 1);
    await delay(2500);

    setIsSimulating(false);
    setActiveScenario(null);
  };

  const runBridgeFailure = async () => {
    resetVisualizer();
    setIsSimulating(true);
    setActiveScenario('bridge-failure');
    const delay = (ms: number) => new Promise(res => setTimeout(res, ms * speedMultiplier));

    // Turn Bridge 1 offline
    addTimelineEvent('Scenario: Bridge Egress Failure. Bridge 1 loses internet.', 'warn');
    setNodeGlows(prev => ({ ...prev, 'Bridge 1': 'red' }));
    setNodeStatusLabels({ 'Bridge 1': 'OFFLINE' });
    await delay(1500);

    // Broadcast from Phone A -> C -> D -> Bridge 1
    addTimelineEvent('Alice sends payment. Packets travel to Bridge 1.', 'info');
    setActiveEdges(['Phone A-Phone C', 'Phone C-Phone D', 'Phone D-Bridge 1']);
    setActiveEdgeColors({
      'Phone A-Phone C': '#10b981',
      'Phone C-Phone D': '#10b981',
      'Phone D-Bridge 1': '#10b981'
    });
    setNodePackets({ 'Bridge 1': 1 });
    await delay(2500);

    // Attempt upload -> Fails
    addTimelineEvent('Bridge 1 attempts upload but lacks internet. Packet stored in local queue.', 'warn');
    setNodePulses(prev => ({ ...prev, 'Bridge 1': true }));
    await delay(2000);
    setNodePulses(prev => ({ ...prev, 'Bridge 1': false }));

    setIsSimulating(false);
    setActiveScenario(null);
  };

  const runNetworkRecovery = async () => {
    resetVisualizer();
    setIsSimulating(true);
    setActiveScenario('network-recovery');
    const delay = (ms: number) => new Promise(res => setTimeout(res, ms * speedMultiplier));

    // Setup: packet is queued on Bridge 1 which is offline
    addTimelineEvent('Scenario: Network Recovery. Bridge 1 has 1 queued packet offline.', 'info');
    setNodeGlows(prev => ({ ...prev, 'Bridge 1': 'red' }));
    setNodeStatusLabels({ 'Bridge 1': 'OFFLINE' });
    setNodePackets({ 'Bridge 1': 1 });
    await delay(1500);

    // Restore Internet
    addTimelineEvent('Bridge 1 regains internet connectivity (4G Connected).', 'success');
    setNodeGlows(prev => ({ ...prev, 'Bridge 1': 'purple' }));
    setNodeStatusLabels({ 'Bridge 1': 'ONLINE' });
    await delay(1500);

    // Start auto upload
    addTimelineEvent('Bridge 1 flushes queued packets to central gateway.', 'info');
    setActiveEdges(['Bridge 1-Central Gateway']);
    setActiveEdgeColors({ 'Bridge 1-Central Gateway': '#8b5cf6' });
    setNodeGlows(prev => ({ ...prev, 'Central Gateway': 'blue' }));
    await delay(1500);

    // Gateway verifies and settles
    setGateStep(8);
    addTimelineEvent('Delayed packet settled successfully!', 'success');
    setNodePackets({ 'Bridge 1': 0 });
    await delay(1500);

    setIsSimulating(false);
    setActiveScenario(null);
  };

  // React Flow node coordinate layout mapping
  const flowNodes: Node[] = [
    { id: 'Phone A', type: 'custom', position: { x: 50, y: 150 }, data: { label: 'Phone A (Sender)', isBridge: false, glowColor: nodeGlows['Phone A'], pulse: nodePulses['Phone A'], packetCount: nodePackets['Phone A'] } },
    { id: 'Phone C', type: 'custom', position: { x: 230, y: 30 }, data: { label: 'Phone C', isBridge: false, glowColor: nodeGlows['Phone C'], pulse: nodePulses['Phone C'], packetCount: nodePackets['Phone C'], statusLabel: nodeStatusLabels['Phone C'] } },
    { id: 'Phone F', type: 'custom', position: { x: 230, y: 150 }, data: { label: 'Phone F', isBridge: false, glowColor: nodeGlows['Phone F'], pulse: nodePulses['Phone F'], packetCount: nodePackets['Phone F'] } },
    { id: 'Phone I', type: 'custom', position: { x: 230, y: 270 }, data: { label: 'Phone I', isBridge: false, glowColor: nodeGlows['Phone I'], pulse: nodePulses['Phone I'], packetCount: nodePackets['Phone I'] } },
    { id: 'Phone D', type: 'custom', position: { x: 420, y: 30 }, data: { label: 'Phone D', isBridge: false, glowColor: nodeGlows['Phone D'], pulse: nodePulses['Phone D'], packetCount: nodePackets['Phone D'], statusLabel: nodeStatusLabels['Phone D'] } },
    { id: 'Phone G', type: 'custom', position: { x: 420, y: 150 }, data: { label: 'Phone G', isBridge: false, glowColor: nodeGlows['Phone G'], pulse: nodePulses['Phone G'], packetCount: nodePackets['Phone G'] } },
    { id: 'Bridge 1', type: 'custom', position: { x: 420, y: 270 }, data: { label: 'Bridge 1', isBridge: true, hasInternet: activeScenario === 'bridge-failure' || activeScenario === 'network-recovery' ? (activeScenario === 'network-recovery' && simStep > 0 ? true : false) : true, glowColor: nodeGlows['Bridge 1'], pulse: nodePulses['Bridge 1'], packetCount: nodePackets['Bridge 1'], statusLabel: nodeStatusLabels['Bridge 1'] } },
    { id: 'Phone E', type: 'custom', position: { x: 610, y: 30 }, data: { label: 'Phone E', isBridge: false, glowColor: nodeGlows['Phone E'], pulse: nodePulses['Phone E'], packetCount: nodePackets['Phone E'] } },
    { id: 'Phone H', type: 'custom', position: { x: 610, y: 150 }, data: { label: 'Phone H', isBridge: false, glowColor: nodeGlows['Phone H'], pulse: nodePulses['Phone H'], packetCount: nodePackets['Phone H'] } },
    { id: 'Phone J', type: 'custom', position: { x: 610, y: 270 }, data: { label: 'Phone J', isBridge: false, glowColor: nodeGlows['Phone J'], pulse: nodePulses['Phone J'], packetCount: nodePackets['Phone J'] } },
    { id: 'Phone B', type: 'custom', position: { x: 800, y: 150 }, data: { label: 'Phone B (Receiver)', isBridge: false, glowColor: nodeGlows['Phone B'], pulse: nodePulses['Phone B'], packetCount: nodePackets['Phone B'], statusLabel: nodeStatusLabels['Phone B'] } },
    { id: 'Central Gateway', type: 'custom', position: { x: 990, y: 150 }, data: { label: 'Central Gateway', isBackend: true, glowColor: nodeGlows['Central Gateway'], pulse: nodePulses['Central Gateway'] } },
    ...(activeScenario === 'replay' ? [
      { id: 'Attacker Node', type: 'custom', position: { x: 50, y: 270 }, data: { label: 'Rogue Device', isAttacker: true, glowColor: nodeGlows['Attacker Node'], pulse: nodePulses['Attacker Node'] } }
    ] : [])
  ];

  // Map animated connection links based on simulation steps
  const flowEdges: Edge[] = [
    { id: 'Phone A-Phone C', source: 'Phone A', target: 'Phone C', animated: activeEdges.includes('Phone A-Phone C'), style: { stroke: activeEdgeColors['Phone A-Phone C'] || 'rgba(255, 255, 255, 0.05)', strokeWidth: activeEdges.includes('Phone A-Phone C') ? 3 : 1.5 } },
    { id: 'Phone A-Phone F', source: 'Phone A', target: 'Phone F', animated: activeEdges.includes('Phone A-Phone F'), style: { stroke: activeEdgeColors['Phone A-Phone F'] || 'rgba(255, 255, 255, 0.05)', strokeWidth: activeEdges.includes('Phone A-Phone F') ? 3 : 1.5 } },
    { id: 'Phone A-Phone I', source: 'Phone A', target: 'Phone I', animated: activeEdges.includes('Phone A-Phone I'), style: { stroke: activeEdgeColors['Phone A-Phone I'] || 'rgba(255, 255, 255, 0.05)', strokeWidth: activeEdges.includes('Phone A-Phone I') ? 3 : 1.5 } },
    { id: 'Phone C-Phone D', source: 'Phone C', target: 'Phone D', animated: activeEdges.includes('Phone C-Phone D'), style: { stroke: activeEdgeColors['Phone C-Phone D'] || 'rgba(255, 255, 255, 0.05)', strokeWidth: activeEdges.includes('Phone C-Phone D') ? 3 : 1.5 } },
    { id: 'Phone C-Phone H', source: 'Phone C', target: 'Phone H', animated: activeEdges.includes('Phone C-Phone H'), style: { stroke: activeEdgeColors['Phone C-Phone H'] || 'rgba(255, 255, 255, 0.05)', strokeWidth: activeEdges.includes('Phone C-Phone H') ? 3 : 1.5 } },
    { id: 'Phone F-Phone G', source: 'Phone F', target: 'Phone G', animated: activeEdges.includes('Phone F-Phone G'), style: { stroke: activeEdgeColors['Phone F-Phone G'] || 'rgba(255, 255, 255, 0.05)', strokeWidth: activeEdges.includes('Phone F-Phone G') ? 3 : 1.5 } },
    { id: 'Phone F-Phone J', source: 'Phone F', target: 'Phone J', animated: activeEdges.includes('Phone F-Phone J'), style: { stroke: activeEdgeColors['Phone F-Phone J'] || 'rgba(255, 255, 255, 0.05)', strokeWidth: activeEdges.includes('Phone F-Phone J') ? 3 : 1.5 } },
    { id: 'Phone I-Bridge 1', source: 'Phone I', target: 'Bridge 1', animated: activeEdges.includes('Phone I-Bridge 1'), style: { stroke: activeEdgeColors['Phone I-Bridge 1'] || 'rgba(255, 255, 255, 0.05)', strokeWidth: activeEdges.includes('Phone I-Bridge 1') ? 3 : 1.5 } },
    { id: 'Phone D-Phone E', source: 'Phone D', target: 'Phone E', animated: activeEdges.includes('Phone D-Phone E'), style: { stroke: activeEdgeColors['Phone D-Phone E'] || 'rgba(255, 255, 255, 0.05)', strokeWidth: activeEdges.includes('Phone D-Phone E') ? 3 : 1.5 } },
    { id: 'Phone G-Phone H', source: 'Phone G', target: 'Phone H', animated: activeEdges.includes('Phone G-Phone H'), style: { stroke: activeEdgeColors['Phone G-Phone H'] || 'rgba(255, 255, 255, 0.05)', strokeWidth: activeEdges.includes('Phone G-Phone H') ? 3 : 1.5 } },
    { id: 'Phone E-Phone B', source: 'Phone E', target: 'Phone B', animated: activeEdges.includes('Phone E-Phone B'), style: { stroke: activeEdgeColors['Phone E-Phone B'] || 'rgba(255, 255, 255, 0.05)', strokeWidth: activeEdges.includes('Phone E-Phone B') ? 3 : 1.5 } },
    { id: 'Phone H-Phone B', source: 'Phone H', target: 'Phone B', animated: activeEdges.includes('Phone H-Phone B'), style: { stroke: activeEdgeColors['Phone H-Phone B'] || 'rgba(255, 255, 255, 0.05)', strokeWidth: activeEdges.includes('Phone H-Phone B') ? 3 : 1.5 } },
    { id: 'Phone J-Phone B', source: 'Phone J', target: 'Phone B', animated: activeEdges.includes('Phone J-Phone B'), style: { stroke: activeEdgeColors['Phone J-Phone B'] || 'rgba(255, 255, 255, 0.05)', strokeWidth: activeEdges.includes('Phone J-Phone B') ? 3 : 1.5 } },
    { id: 'Bridge 1-Central Gateway', source: 'Bridge 1', target: 'Central Gateway', animated: activeEdges.includes('Bridge 1-Central Gateway'), style: { stroke: activeEdgeColors['Bridge 1-Central Gateway'] || 'rgba(255, 255, 255, 0.05)', strokeWidth: activeEdges.includes('Bridge 1-Central Gateway') ? 3 : 1.5 } },
    ...(activeScenario === 'replay' ? [
      { id: 'Attacker Node-Phone I', source: 'Attacker Node', target: 'Phone I', animated: activeEdges.includes('Attacker Node-Phone I'), style: { stroke: activeEdgeColors['Attacker Node-Phone I'] || 'rgba(255, 255, 255, 0.05)', strokeWidth: activeEdges.includes('Attacker Node-Phone I') ? 3 : 1.5 } }
    ] : [])
  ];

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden bg-[#0a0a0c]">
      
      {/* Top Header Row Metrics */}
      <div className="h-16 border-b border-white/5 px-8 flex items-center justify-between bg-[#0a0a0c]/85 shrink-0 select-none">
        <div className="flex items-center gap-6">
          <div>
            <h2 className="text-sm font-extrabold text-white tracking-tight">UPI Mesh Visualizer 2.0</h2>
            <p className="text-[10px] text-slate-500 font-medium">BLE Ad-Hoc Routing Network Operations Center</p>
          </div>
          <div className="h-6 w-px bg-white/5" />
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 bg-emerald-400 rounded-full animate-ping" />
            <span className="text-xs font-mono font-bold text-slate-300">NOC ONLINE</span>
          </div>
        </div>

        <div className="flex gap-4">
          <div className="flex flex-col text-right">
            <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Nodes Online</span>
            <span className="text-xs font-mono font-extrabold text-white">12/15</span>
          </div>
          <div className="h-6 w-px bg-white/5 align-middle self-center" />
          <div className="flex flex-col text-right">
            <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">In Transit</span>
            <span className="text-xs font-mono font-extrabold text-white">{packetsInTransit} PKT</span>
          </div>
          <div className="h-6 w-px bg-white/5 align-middle self-center" />
          <div className="flex flex-col text-right">
            <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Success Rate</span>
            <span className="text-xs font-mono font-extrabold text-emerald-400">98.6%</span>
          </div>
          <div className="h-6 w-px bg-white/5 align-middle self-center" />
          <div className="flex flex-col text-right">
            <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Duplicates Dropped</span>
            <span className="text-xs font-mono font-extrabold text-purple-400">{duplicatesCount}</span>
          </div>
          <div className="h-6 w-px bg-white/5 align-middle self-center" />
          <div className="flex flex-col text-right">
            <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Cyber Threats Blocked</span>
            <span className="text-xs font-mono font-extrabold text-rose-500">{threatsCount}</span>
          </div>
          <div className="h-6 w-px bg-white/5 align-middle self-center" />
          <button 
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-2 rounded-lg bg-white/5 border border-white/5 text-slate-400 hover:text-white transition-all"
            title={soundEnabled ? "Disable sound" : "Enable sound"}
          >
            {soundEnabled ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      {/* Main split-screen visualizer panels */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Left Side: Parameters Form and Scenarios Selection */}
        <div className="w-80 border-r border-white/5 bg-[#121217]/40 flex flex-col h-full overflow-hidden shrink-0 select-none">
          <div className="p-4 border-b border-white/5 bg-[#121217]/70">
            <h3 className="font-extrabold text-xs text-white uppercase tracking-wider">Simulation Control Panel</h3>
            <p className="text-[10px] text-slate-500 mt-0.5">Parameters for automated routing runs.</p>
          </div>

          <div className="p-4 space-y-3.5 text-xs text-slate-400 border-b border-white/5">
            <div className="space-y-1.5">
              <label className="font-bold text-[10px] uppercase tracking-wide text-slate-500">Sender Device</label>
              <select 
                value={sender} 
                onChange={e => setSender(e.target.value)} 
                disabled={isSimulating}
                className="w-full bg-[#121217] border border-white/5 rounded-lg px-3 py-2 text-white font-mono text-[11px]"
              >
                <option value="Phone A">Phone A (Sender)</option>
                <option value="Phone C">Phone C</option>
                <option value="Phone I">Phone I</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-[10px] uppercase tracking-wide text-slate-500">Receiver Device</label>
              <select 
                value={receiver} 
                onChange={e => setReceiver(e.target.value)} 
                disabled={isSimulating}
                className="w-full bg-[#121217] border border-white/5 rounded-lg px-3 py-2 text-white font-mono text-[11px]"
              >
                <option value="Phone B">Phone B (Receiver)</option>
                <option value="Phone H">Phone H</option>
                <option value="Phone J">Phone J</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="font-bold text-[10px] uppercase tracking-wide text-slate-500">Amount</label>
                <input 
                  type="text" 
                  value={`₹${amount}`} 
                  onChange={e => setAmount(e.target.value.replace('₹', ''))} 
                  disabled={isSimulating}
                  className="w-full bg-[#121217] border border-white/5 rounded-lg px-3 py-2 text-white font-mono text-[11px]"
                />
              </div>
              <div className="space-y-1.5">
                <label className="font-bold text-[10px] uppercase tracking-wide text-slate-500">UPI PIN</label>
                <input 
                  type="password" 
                  value={pin} 
                  onChange={e => setPin(e.target.value)} 
                  disabled={isSimulating}
                  className="w-full bg-[#121217] border border-white/5 rounded-lg px-3 py-2 text-white font-mono text-[11px]"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-[10px] uppercase tracking-wide text-slate-500">Simulation Speed</label>
              <div className="grid grid-cols-4 gap-1.5">
                {[1, 2, 5, 10].map(s => (
                  <button
                    key={s}
                    onClick={() => setSpeed(s)}
                    disabled={isSimulating}
                    className={`py-1 rounded font-mono font-bold border transition-all text-[10px] ${
                      speed === s 
                        ? 'bg-purple-500/20 border-purple-500/50 text-purple-300' 
                        : 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10'
                    }`}
                  >
                    {s}x
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={runSuccessfulPayment}
              disabled={isSimulating}
              className="w-full mt-2 flex items-center justify-center gap-2 py-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold transition-all shadow-lg shadow-purple-500/20 text-xs disabled:opacity-50"
            >
              <Play className="h-4 w-4 fill-current" /> 🚀 START SIMULATION
            </button>
          </div>

          {/* Scenario Selection Grid */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-[#121217]/10">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Demo Attack Scenarios</span>
            
            <button
              onClick={runDuplicateStorm}
              disabled={isSimulating}
              className="w-full text-left p-2.5 rounded-xl border border-white/5 hover:border-purple-500/30 hover:bg-purple-950/10 flex items-center gap-2.5 transition-all text-xs disabled:opacity-50"
            >
              <Sparkles className="h-4 w-4 text-purple-400" />
              <div>
                <div className="font-bold text-white">Scenario 2: Duplicate Storm</div>
                <div className="text-[9px] text-slate-500">Verifies Redis cache SETNX gates</div>
              </div>
            </button>

            <button
              onClick={runReplayAttack}
              disabled={isSimulating}
              className="w-full text-left p-2.5 rounded-xl border border-white/5 hover:border-red-500/30 hover:bg-red-950/10 flex items-center gap-2.5 transition-all text-xs disabled:opacity-50"
            >
              <ShieldAlert className="h-4 w-4 text-red-400" />
              <div>
                <div className="font-bold text-white">Scenario 3: Replay Attack</div>
                <div className="text-[9px] text-slate-500">Validates DB unique nonce indexes</div>
              </div>
            </button>

            <button
              onClick={runTamperedPacket}
              disabled={isSimulating}
              className="w-full text-left p-2.5 rounded-xl border border-white/5 hover:border-red-500/30 hover:bg-red-950/10 flex items-center gap-2.5 transition-all text-xs disabled:opacity-50"
            >
              <Shield className="h-4 w-4 text-red-400" />
              <div>
                <div className="font-bold text-white">Scenario 4: Tampered Packet</div>
                <div className="text-[9px] text-slate-500">Fails AES-GCM decrypt tag verify</div>
              </div>
            </button>

            <button
              onClick={runInvalidSignature}
              disabled={isSimulating}
              className="w-full text-left p-2.5 rounded-xl border border-white/5 hover:border-amber-500/30 hover:bg-amber-950/10 flex items-center gap-2.5 transition-all text-xs disabled:opacity-50"
            >
              <ShieldCheck className="h-4 w-4 text-amber-400" />
              <div>
                <div className="font-bold text-white">Scenario 5: Invalid Signature</div>
                <div className="text-[9px] text-slate-500">Fails ECDSA sign verification</div>
              </div>
            </button>

            <button
              onClick={runBridgeFailure}
              disabled={isSimulating}
              className="w-full text-left p-2.5 rounded-xl border border-white/5 hover:border-rose-500/30 hover:bg-rose-950/10 flex items-center gap-2.5 transition-all text-xs disabled:opacity-50"
            >
              <WifiOff className="h-4 w-4 text-rose-400" />
              <div>
                <div className="font-bold text-white">Scenario 6: Bridge Failure</div>
                <div className="text-[9px] text-slate-500">Buffers packets locally when offline</div>
              </div>
            </button>

            <button
              onClick={runNetworkRecovery}
              disabled={isSimulating}
              className="w-full text-left p-2.5 rounded-xl border border-white/5 hover:border-emerald-500/30 hover:bg-emerald-950/10 flex items-center gap-2.5 transition-all text-xs disabled:opacity-50"
            >
              <Wifi className="h-4 w-4 text-emerald-400" />
              <div>
                <div className="font-bold text-white">Scenario 7: Network Recovery</div>
                <div className="text-[9px] text-slate-500">Flushes local buffers when online</div>
              </div>
            </button>

            <button
              onClick={resetVisualizer}
              disabled={isSimulating}
              className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 hover:text-white transition-all text-xs font-semibold text-slate-400 disabled:opacity-50"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Reset Simulation
            </button>
          </div>
        </div>

        {/* Center: Network Visualizer Graph & Bottom Panel */}
        <div className="flex-1 flex flex-col overflow-hidden relative">
          
          {/* React Flow Container */}
          <div className="flex-1 relative bg-[#0a0a0c]">
            <ReactFlow
              nodes={flowNodes}
              edges={flowEdges}
              nodeTypes={nodeTypes}
              fitView
              fitViewOptions={{ padding: 0.15 }}
            >
              <Background color="rgba(255,255,255,0.02)" gap={28} size={1} />
              <Controls className="bg-[#121217] border border-white/5 !left-4 !bottom-4" />
            </ReactFlow>

            {/* Step 2 Panel: Local Encryption Simulation Indicator */}
            <AnimatePresence>
              {activeScenario === 'successful' && simStep === 1 && encStep > 0 && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="absolute top-4 left-4 z-10 glass-panel border border-white/10 rounded-2xl p-4 w-60 shadow-2xl select-none"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <Shield className="h-4 w-4 text-emerald-400" />
                    <span className="font-extrabold text-xs text-white">Local Packet Encryption</span>
                  </div>
                  <div className="space-y-2 font-mono text-[10px]">
                    <div className="flex items-center justify-between">
                      <span className={encStep >= 1 ? 'text-emerald-400' : 'text-slate-500'}>Generating Nonce</span>
                      <span>{encStep >= 1 ? '✓' : '...'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className={encStep >= 2 ? 'text-emerald-400' : 'text-slate-500'}>AES-256-GCM Encryption</span>
                      <span>{encStep >= 2 ? '✓' : '...'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className={encStep >= 3 ? 'text-emerald-400' : 'text-slate-500'}>ECDSA Cryptographic Sign</span>
                      <span>{encStep >= 3 ? '✓' : '...'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className={encStep >= 4 ? 'text-emerald-400 font-extrabold' : 'text-slate-500'}>Packet Packaged & Ready</span>
                      <span>{encStep >= 4 ? '✓' : '...'}</span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Step 7 Panel: Central Gateway Validation Pipeline */}
            <AnimatePresence>
              {gateStep > 0 && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="absolute top-4 right-4 z-10 glass-panel border border-white/10 rounded-2xl p-4 w-64 shadow-2xl select-none"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <Server className="h-4 w-4 text-sky-400" />
                    <span className="font-extrabold text-xs text-white">Gateway Ingestion Pipeline</span>
                  </div>
                  
                  <div className="space-y-2 font-mono text-[9px]">
                    <div className="flex items-center justify-between">
                      <span className={gateStep >= 1 ? 'text-emerald-400' : 'text-slate-500'}>1. Packet Received</span>
                      <span>{gateStep >= 1 ? '✓' : '...'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className={gateStep >= 2 ? 'text-emerald-400' : 'text-slate-500'}>2. Ciphertext Hashed</span>
                      <span>{gateStep >= 2 ? '✓' : '...'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className={gateStep >= 3 ? (gatewayError && gateStep === 3 ? 'text-rose-400 font-extrabold' : 'text-emerald-400') : 'text-slate-500'}>3. Redis Claim Lock</span>
                      <span>{gateStep >= 3 ? (gatewayError && gateStep === 3 ? '✗' : '✓') : '...'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className={gateStep >= 4 ? (gatewayError && gateStep === 4 ? 'text-rose-400 font-extrabold' : 'text-emerald-400') : 'text-slate-500'}>4. ECDSA Signature Verify</span>
                      <span>{gateStep >= 4 ? (gatewayError && gateStep === 4 ? '✗' : '✓') : '...'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className={gateStep >= 5 ? (gatewayError && gateStep === 5 ? 'text-rose-400 font-extrabold' : 'text-emerald-400') : 'text-slate-500'}>5. Replay Nonce Guard</span>
                      <span>{gateStep >= 5 ? (gatewayError && gateStep === 5 ? '✗' : '✓') : '...'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className={gateStep >= 6 ? (gatewayError && gateStep === 6 ? 'text-rose-400 font-extrabold' : 'text-emerald-400') : 'text-slate-500'}>6. AES-GCM Decryption</span>
                      <span>{gateStep >= 6 ? (gatewayError && gateStep === 6 ? '✗' : '✓') : '...'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className={gateStep >= 7 ? 'text-emerald-400' : 'text-slate-500'}>7. Account Balance Settlement</span>
                      <span>{gateStep >= 7 ? '✓' : '...'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className={gateStep >= 8 ? 'text-emerald-400 font-extrabold' : 'text-slate-500'}>8. Settlement Confirmed</span>
                      <span>{gateStep >= 8 ? '✓' : '...'}</span>
                    </div>
                  </div>

                  {gatewayError && (
                    <div className="mt-3 p-2 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-lg font-bold text-[9px]">
                      {gatewayError}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Huge Success Settlement Card Popup */}
            <AnimatePresence>
              {gateStep === 8 && (
                <div className="absolute inset-0 z-20 flex items-center justify-center p-4 bg-black/40 backdrop-blur-[1px]">
                  <motion.div 
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    className="glass-card border border-emerald-500/30 shadow-[0_0_30px_rgba(16,185,129,0.2)] bg-emerald-950/20 px-8 py-6 rounded-2xl text-center space-y-2 w-80 select-none"
                  >
                    <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-2 border border-emerald-500/30">
                      <ShieldCheck className="h-6 w-6 text-emerald-400 animate-bounce" />
                    </div>
                    <h4 className="text-[10px] text-emerald-400 font-extrabold uppercase tracking-widest">Settlement Success</h4>
                    <div className="text-3xl font-extrabold text-white tracking-tight">₹{amount}.00</div>
                    <p className="text-[10px] text-slate-400 font-medium">Payment settled & receiver notified</p>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>
          </div>

          {/* Bottom Panels: stepper + packet stats */}
          <div className="h-44 border-t border-white/5 bg-[#121217]/25 p-4 flex gap-4 shrink-0 overflow-hidden select-none">
            {/* Step 9 Panel: Stepper Indicator */}
            <div className="flex-1 flex flex-col justify-between">
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Payment Journey Tracker</span>
              
              <div className="grid grid-cols-5 gap-2 text-[10px] my-auto">
                {[
                  { title: 'Payment Created', desc: 'Phone A builds packet' },
                  { title: 'Payload Secured', desc: 'AES-GCM & ECDSA signatures' },
                  { title: 'Mesh Broadcast', desc: 'BLE ad-hoc hopping' },
                  { title: 'Gateway Ingestion', desc: 'Redis claiming & DB checks' },
                  { title: 'Settled', desc: 'Funds moved successfully' }
                ].map((s, idx) => {
                  const isDone = trackerIndex >= idx || trackerIndex === 9;
                  const isCurrent = trackerIndex === idx;
                  return (
                    <div key={idx} className={`p-2 border rounded-xl flex flex-col justify-between transition-all h-20 ${
                      isDone 
                        ? 'bg-emerald-950/15 border-emerald-500/30 text-emerald-400' 
                        : isCurrent 
                          ? 'bg-purple-950/15 border-purple-500/30 text-purple-400 animate-pulse'
                          : 'bg-white/5 border-white/5 text-slate-500'
                    }`}>
                      <span className="font-extrabold text-[10px] leading-tight">{s.title}</span>
                      <span className="text-[8px] text-slate-500 font-medium tracking-wide mt-1 leading-tight">{s.desc}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Current Packet Path Detail */}
            <div className="w-80 border-l border-white/5 pl-4 flex flex-col justify-between">
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Current Packet Details</span>
              <div className="flex-1 grid grid-cols-2 gap-x-3 gap-y-1.5 text-[10px] font-mono mt-3 text-slate-400">
                <div className="flex justify-between">
                  <span className="text-slate-600">ID:</span>
                  <span className="text-white font-bold">PKT-7G8H</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">TTL:</span>
                  <span className="text-white font-bold">{isSimulating ? (trackerIndex >= 4 ? 5 : 7) : 7}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Sender:</span>
                  <span className="text-white font-bold">{sender}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Receiver:</span>
                  <span className="text-white font-bold">{receiver}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Cipher:</span>
                  <span className="text-emerald-400 font-bold">AES-GCM</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Signature:</span>
                  <span className="text-emerald-400 font-bold">ECDSA</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Live Log Timeline & Network Stats */}
        <div className="w-80 border-l border-white/5 bg-[#121217]/40 flex flex-col h-full overflow-hidden shrink-0 select-none">
          <div className="p-4 border-b border-white/5 bg-[#121217]/70 flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-xs text-white uppercase tracking-wider">Live Event Timeline</h3>
              <p className="text-[10px] text-slate-500 mt-0.5">Real-time payment audit log feed.</p>
            </div>
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold text-[8px] font-mono animate-pulse">
              LIVE
            </div>
          </div>

          {/* Scrolling Log Events */}
          <div ref={logContainerRef} className="flex-1 overflow-y-auto p-4 space-y-3 font-mono text-[10px] bg-slate-950/35 scrollbar-thin">
            {timeline.map((evt, idx) => (
              <div key={idx} className="flex gap-2.5 items-start">
                <span className="text-slate-600 shrink-0 select-none">{evt.time}</span>
                <span className={`leading-normal break-all font-semibold ${
                  evt.status === 'success' ? 'text-emerald-400' :
                  evt.status === 'warn' ? 'text-amber-400' :
                  evt.status === 'error' ? 'text-rose-400' :
                  'text-slate-300'
                }`}>
                  {evt.msg}
                </span>
              </div>
            ))}
            {timeline.length === 0 && (
              <div className="text-slate-600 font-medium py-1">
                Awaiting simulation trigger... Press "Start Simulation" or click one of the demo scenarios to execute an automated audit run.
              </div>
            )}
          </div>

          {/* Network statistics */}
          <div className="p-4 border-t border-white/5 bg-[#121217]/50 space-y-2 shrink-0">
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Historical System Health</span>
            <div className="space-y-1.5 text-[10px] text-slate-400 font-mono">
              <div className="flex justify-between">
                <span>Active Bridge Nodes:</span>
                <span className="text-white font-bold">2</span>
              </div>
              <div className="flex justify-between">
                <span>Transactions Today:</span>
                <span className="text-white font-bold">{transactions.length + 12}</span>
              </div>
              <div className="flex justify-between">
                <span>Prevented Replays:</span>
                <span className="text-rose-400 font-bold">4</span>
              </div>
              <div className="flex justify-between">
                <span>Verification Latency:</span>
                <span className="text-emerald-400 font-bold">842ms</span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
