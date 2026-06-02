import React, { useEffect, useRef } from 'react';
import { ArrowRight, Shield, Share2, Zap, Database, Terminal, Cpu } from 'lucide-react';

interface LandingPageProps {
  onEnterApp: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onEnterApp }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Constellation particles background animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const particles: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      radius: number;
    }> = [];

    const particleCount = Math.min(80, Math.floor((width * height) / 15000));

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        radius: Math.random() * 2 + 1,
      });
    }

    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      // Draw background glow
      ctx.fillStyle = '#0a0a0c';
      ctx.fillRect(0, 0, width, height);

      // Update and draw particles
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;

        // Bounce walls
        if (p.x < 0 || p.x > width) p.vx *= -1;
        if (p.y < 0 || p.y > height) p.vy *= -1;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(139, 92, 246, 0.45)';
        ctx.fill();
      });

      // Draw connections
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 120) {
            const alpha = (1 - dist / 120) * 0.12;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(16, 185, 129, ${alpha})`;
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }
      }

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <div className="relative min-h-screen text-slate-100 selection:bg-emerald-500/30 overflow-x-hidden">
      {/* Animated network mesh background */}
      <canvas ref={canvasRef} className="absolute inset-0 z-0 pointer-events-none" />

      {/* Grid overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:4rem_4rem] z-0 pointer-events-none" />

      {/* Radial glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-500/10 rounded-full blur-[120px] pointer-events-none z-0" />
      <div className="absolute bottom-1/4 left-1/4 w-[400px] h-[400px] bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none z-0" />

      {/* Header */}
      <header className="relative z-10 max-w-7xl mx-auto px-6 h-20 flex items-center justify-between border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-purple-600 to-emerald-500 flex items-center justify-center shadow-lg shadow-purple-500/20">
            <Share2 className="h-5 w-5 text-white" />
          </div>
          <div>
            <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
              UPI OFFLINE MESH
            </span>
            <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
              v2.0
            </span>
          </div>
        </div>
        <button
          onClick={onEnterApp}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all font-medium text-sm"
        >
          Explore Console <ArrowRight className="h-4 w-4" />
        </button>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 max-w-5xl mx-auto px-6 pt-24 pb-16 text-center">
        <h2 className="text-sm font-semibold tracking-wider text-emerald-400 uppercase mb-4">
          Mesh-Routed Deferred Settlement Payment Network
        </h2>
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-white mb-6 leading-tight">
          Offline Payments.<br />
          Online Settlement.<br />
          <span className="bg-gradient-to-r from-purple-400 via-violet-300 to-emerald-400 bg-clip-text text-transparent">
            Zero Connectivity Required.
          </span>
        </h1>
        <p className="max-w-2xl mx-auto text-lg text-slate-400 mb-10 leading-relaxed">
          Transact securely in zero-connectivity environments. Payments are cryptographically sealed,
          propagated device-to-device through an ad-hoc local mesh network, and settled automatically
          the moment any single node connects to the internet.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={onEnterApp}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-purple-600 to-emerald-500 text-white font-semibold hover:shadow-lg hover:shadow-purple-500/25 transition-all"
          >
            Launch Fintech Console <ArrowRight className="h-5 w-5" />
          </button>
          <a
            href="#architecture"
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 transition-all font-medium"
          >
            Learn How It Works
          </a>
        </div>
      </section>

      {/* Features Grid */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 py-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Card 1 */}
          <div className="glass-card p-8 rounded-2xl flex flex-col gap-4">
            <div className="h-12 w-12 rounded-xl bg-purple-500/10 flex items-center justify-center border border-purple-500/20 text-purple-400">
              <Shield className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-bold text-white">Hybrid Cryptography</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Combines RSA-OAEP 2048-bit key wrap with high-speed authenticated AES-256-GCM. Intermediary nodes route packets, but can neither read payment details nor alter transactional fields.
            </p>
          </div>

          {/* Card 2 */}
          <div className="glass-card p-8 rounded-2xl flex flex-col gap-4">
            <div className="h-12 w-12 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 text-emerald-400">
              <Share2 className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-bold text-white">Ad-hoc Mesh Routing</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Gossip protocols allow packets to hop device-to-device via Bluetooth BLE or Wi-Fi Direct. Packets carry a TTL parameter to prevent infinite loop congestion in dense environments.
            </p>
          </div>

          {/* Card 3 */}
          <div className="glass-card p-8 rounded-2xl flex flex-col gap-4">
            <div className="h-12 w-12 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20 text-blue-400">
              <Zap className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-bold text-white">Redis-backed SETNX Idempotency</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Protects against duplicate packet storms when multiple bridge nodes simultaneously acquire internet access. Redis locks the packet's ciphertext hash to settle transactions exactly once.
            </p>
          </div>
        </div>
      </section>

      {/* Architecture Detail */}
      <section id="architecture" className="relative z-10 max-w-7xl mx-auto px-6 py-20 border-t border-white/5">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-sm font-semibold tracking-wider text-purple-400 uppercase mb-2">Technical Deep Dive</h2>
            <h3 className="text-3xl md:text-4xl font-extrabold text-white mb-6">
              Three Hard Problems, Solved.
            </h3>
            <div className="space-y-6">
              <div className="flex gap-4">
                <div className="h-8 w-8 shrink-0 rounded-full bg-purple-500/10 border border-purple-500/25 flex items-center justify-center text-xs font-bold text-purple-400">1</div>
                <div>
                  <h4 className="font-bold text-white mb-1">Untrusted Intermediaries</h4>
                  <p className="text-sm text-slate-400 leading-relaxed">
                    By encrypting the payload with the server's public key, third-party nodes carry opaque binary blobs. AES-GCM authentication tags guarantee that any single-bit modification causes the server to immediately reject the packet on arrival.
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="h-8 w-8 shrink-0 rounded-full bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-xs font-bold text-emerald-400">2</div>
                <div>
                  <h4 className="font-bold text-white mb-1">ECDSA Payload Signatures</h4>
                  <p className="text-sm text-slate-400 leading-relaxed">
                    To guarantee authentic payment generation, each sender generates an Elliptic Curve key pair. Senders sign the critical payload fields with their private key, which the backend verifies on decryption.
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="h-8 w-8 shrink-0 rounded-full bg-blue-500/10 border border-blue-500/25 flex items-center justify-center text-xs font-bold text-blue-400">3</div>
                <div>
                  <h4 className="font-bold text-white mb-1">Replay Attack Immunity</h4>
                  <p className="text-sm text-slate-400 leading-relaxed">
                    Replay protection functions on two layers: inside the encrypted envelope, the sender signs a timestamp (expired after 24h) and a unique UUID nonce. The backend enforces unique constraints on the nonce, preventing captured payments from being re-submitted.
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div className="glass-panel p-6 rounded-2xl border border-white/5 font-mono text-xs text-slate-300">
            <div className="flex items-center justify-between pb-4 border-b border-white/5 mb-4">
              <span className="flex items-center gap-2 text-slate-400"><Terminal className="h-4 w-4 text-emerald-400" /> packet_structure.json</span>
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            </div>
            <pre className="overflow-x-auto text-emerald-300/90 leading-relaxed">
{`{
  "packetId": "550e8400-e29b-41d4-a716-446655440000",
  "ttl": 4,
  "createdAt": 1730000000000,
  "ciphertext": "b64[RSA-OAEP(AES-Key) + AES-GCM-256(Payload)]"
}

/* Decrypted Payload (PaymentInstruction) */
{
  "senderVpa": "alice@demo",
  "receiverVpa": "bob@demo",
  "amount": 500.00,
  "pinHash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  "nonce": "a24b105a-526e-44cb-bcfa-f4d1e2cb03fe",
  "signedAt": 1730000000000,
  "signature": "MEQCIF98...[ECDSA Signature]",
  "publicKey": "MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE..."
}`}
            </pre>
          </div>
        </div>
      </section>

      {/* Tech Stack */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 py-20 border-t border-white/5">
        <h3 className="text-center text-sm font-semibold tracking-wider text-emerald-400 uppercase mb-8">
          Enterprise Security & Observability Architecture
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-6 text-center">
          <div className="glass-panel p-4 rounded-xl flex flex-col items-center justify-center gap-2">
            <Cpu className="h-6 w-6 text-emerald-400" />
            <span className="text-xs font-bold text-white">Java 21</span>
          </div>
          <div className="glass-panel p-4 rounded-xl flex flex-col items-center justify-center gap-2">
            <Shield className="h-6 w-6 text-purple-400" />
            <span className="text-xs font-bold text-white">Spring Boot 3</span>
          </div>
          <div className="glass-panel p-4 rounded-xl flex flex-col items-center justify-center gap-2">
            <Database className="h-6 w-6 text-blue-400" />
            <span className="text-xs font-bold text-white">PostgreSQL</span>
          </div>
          <div className="glass-panel p-4 rounded-xl flex flex-col items-center justify-center gap-2">
            <Zap className="h-6 w-6 text-red-400" />
            <span className="text-xs font-bold text-white">Redis Cache</span>
          </div>
          <div className="glass-panel p-4 rounded-xl flex flex-col items-center justify-center gap-2">
            <Share2 className="h-6 w-6 text-violet-400" />
            <span className="text-xs font-bold text-white">WebSockets</span>
          </div>
          <div className="glass-panel p-4 rounded-xl flex flex-col items-center justify-center gap-2">
            <Terminal className="h-6 w-6 text-amber-400" />
            <span className="text-xs font-bold text-white">Prometheus</span>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 max-w-7xl mx-auto px-6 py-12 border-t border-white/5 text-center text-slate-500 text-xs">
        <p>© 2026 UPI Offline Mesh 2.0. Distributed Systems & Cryptographic Payment Ledger Demo.</p>
      </footer>
    </div>
  );
};
