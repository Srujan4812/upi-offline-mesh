package com.demo.upimesh.service;

import com.demo.upimesh.crypto.HybridCryptoService;
import com.demo.upimesh.model.*;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.KeyFactory;
import java.security.PublicKey;
import java.security.Signature;
import java.security.spec.X509EncodedKeySpec;
import java.time.Instant;
import java.util.Base64;
import java.util.Map;

@Service
public class BridgeIngestionService {

    private static final Logger log = LoggerFactory.getLogger(BridgeIngestionService.class);

    @Autowired private HybridCryptoService crypto;
    @Autowired private IdempotencyService idempotency;
    @Autowired private SettlementService settlement;
    @Autowired private SecurityEventRepository securityEventRepo;
    @Autowired private PacketAuditRepository packetAuditRepo;
    @Autowired private TransactionRepository transactionRepo;
    @Autowired private MeshWebSocketHandler webSocketHandler;
    @Autowired private MeterRegistry meterRegistry;

    @Value("${upi.mesh.packet-max-age-seconds:86400}")
    private long maxAgeSeconds;

    public IngestResult ingest(MeshPacket packet, String bridgeNodeId, int hopCount) {
        String packetHash = "?";
        
        // Increment throughput metric
        meterRegistry.counter("upi.mesh.packet.throughput").increment();

        try {
            packetHash = crypto.hashCiphertext(packet.getCiphertext());

            // ---- Idempotency gate ----
            if (!idempotency.claim(packetHash)) {
                log.info("DUPLICATE packet {} from bridge {} — dropped",
                        packetHash.substring(0, 12) + "...", bridgeNodeId);
                
                // Track duplicate drop metric
                meterRegistry.counter("upi.mesh.duplicate.drops").increment();
                meterRegistry.counter("upi.mesh.security.violations", "type", "DUPLICATE_PACKET").increment();
                
                // Store in security events
                SecurityEvent secEvent = new SecurityEvent("DUPLICATE_PACKET", packet.getPacketId(), packetHash,
                        "Duplicate packet uploaded from bridge: " + bridgeNodeId);
                securityEventRepo.save(secEvent);
                webSocketHandler.broadcast("SECURITY_EVENT", secEvent);

                // Audit log
                packetAuditRepo.save(new PacketAudit(packet.getPacketId(), packetHash, bridgeNodeId, hopCount, "DUPLICATE_DROPPED", "duplicate_packet"));
                
                webSocketHandler.broadcast("DUPLICATE_REJECTED", Map.of("packetId", packet.getPacketId(), "packetHash", packetHash, "bridge", bridgeNodeId));
                return IngestResult.duplicate(packetHash);
            }

            // ---- Decrypt ----
            PaymentInstruction instruction;
            try {
                instruction = crypto.decrypt(packet.getCiphertext());
            } catch (Exception e) {
                log.warn("Decryption failed for packet {}: {}",
                        packetHash.substring(0, 12) + "...", e.getMessage());

                meterRegistry.counter("upi.mesh.security.violations", "type", "TAMPERED_PACKET").increment();

                SecurityEvent secEvent = new SecurityEvent("TAMPERED_PACKET", packet.getPacketId(), packetHash,
                        "Decryption failed: " + e.getMessage() + " (Bridge: " + bridgeNodeId + ")");
                securityEventRepo.save(secEvent);
                webSocketHandler.broadcast("SECURITY_EVENT", secEvent);

                packetAuditRepo.save(new PacketAudit(packet.getPacketId(), packetHash, bridgeNodeId, hopCount, "INVALID", "decryption_failed"));
                webSocketHandler.broadcast("TAMPERING_DETECTED", Map.of("packetId", packet.getPacketId(), "packetHash", packetHash, "bridge", bridgeNodeId, "reason", "decryption_failed"));
                return IngestResult.invalid(packetHash, "decryption_failed");
            }

            // ---- Digital Signature Verification (ECDSA) ----
            boolean sigVerified = false;
            try {
                sigVerified = verifySignature(instruction);
            } catch (Exception e) {
                log.warn("Signature verification error for packet {}: {}",
                        packetHash.substring(0, 12) + "...", e.getMessage());
            }

            if (!sigVerified) {
                log.warn("Invalid signature for packet {} from sender {}", packetHash.substring(0, 12) + "...", instruction.getSenderVpa());
                
                meterRegistry.counter("upi.mesh.security.violations", "type", "INVALID_SIGNATURE").increment();

                SecurityEvent secEvent = new SecurityEvent("INVALID_SIGNATURE", packet.getPacketId(), packetHash,
                        "ECDSA signature check failed for sender: " + instruction.getSenderVpa() + " (Bridge: " + bridgeNodeId + ")");
                securityEventRepo.save(secEvent);
                webSocketHandler.broadcast("SECURITY_EVENT", secEvent);

                packetAuditRepo.save(new PacketAudit(packet.getPacketId(), packetHash, bridgeNodeId, hopCount, "INVALID", "invalid_signature"));
                webSocketHandler.broadcast("TAMPERING_DETECTED", Map.of("packetId", packet.getPacketId(), "packetHash", packetHash, "bridge", bridgeNodeId, "reason", "invalid_signature"));
                return IngestResult.invalid(packetHash, "invalid_signature");
            }

            // ---- Freshness check (replay protection) ----
            long ageSeconds = (Instant.now().toEpochMilli() - instruction.getSignedAt()) / 1000;
            if (ageSeconds > maxAgeSeconds) {
                log.warn("Packet {} too old ({}s), rejected",
                        packetHash.substring(0, 12) + "...", ageSeconds);
                
                meterRegistry.counter("upi.mesh.security.violations", "type", "EXPIRED_PACKET").increment();

                SecurityEvent secEvent = new SecurityEvent("EXPIRED_PACKET", packet.getPacketId(), packetHash,
                        "Expired packet uploaded. Age: " + ageSeconds + "s (Bridge: " + bridgeNodeId + ")");
                securityEventRepo.save(secEvent);
                webSocketHandler.broadcast("SECURITY_EVENT", secEvent);

                packetAuditRepo.save(new PacketAudit(packet.getPacketId(), packetHash, bridgeNodeId, hopCount, "INVALID", "stale_packet"));
                return IngestResult.invalid(packetHash, "stale_packet");
            }
            if (ageSeconds < -300) { // small clock-skew tolerance
                meterRegistry.counter("upi.mesh.security.violations", "type", "EXPIRED_PACKET").increment();
                
                SecurityEvent secEvent = new SecurityEvent("EXPIRED_PACKET", packet.getPacketId(), packetHash,
                        "Future-dated packet uploaded. Age: " + ageSeconds + "s (Bridge: " + bridgeNodeId + ")");
                securityEventRepo.save(secEvent);
                webSocketHandler.broadcast("SECURITY_EVENT", secEvent);

                packetAuditRepo.save(new PacketAudit(packet.getPacketId(), packetHash, bridgeNodeId, hopCount, "INVALID", "future_dated"));
                return IngestResult.invalid(packetHash, "future_dated");
            }

            // ---- Replay protection (Nonce reuse checking) ----
            if (transactionRepo.existsByNonce(instruction.getNonce())) {
                log.warn("Replay attack detected: Nonce {} already processed", instruction.getNonce());

                meterRegistry.counter("upi.mesh.replay.attacks").increment();
                meterRegistry.counter("upi.mesh.security.violations", "type", "REPLAY_ATTACK").increment();

                SecurityEvent secEvent = new SecurityEvent("REPLAY_ATTACK", packet.getPacketId(), packetHash,
                        "Replay attack detected: Nonce " + instruction.getNonce() + " was already used in an earlier transaction.");
                securityEventRepo.save(secEvent);
                webSocketHandler.broadcast("SECURITY_EVENT", secEvent);

                packetAuditRepo.save(new PacketAudit(packet.getPacketId(), packetHash, bridgeNodeId, hopCount, "INVALID", "replay_attack"));
                webSocketHandler.broadcast("REPLAY_DETECTED", Map.of("packetId", packet.getPacketId(), "packetHash", packetHash, "bridge", bridgeNodeId, "nonce", instruction.getNonce()));
                return IngestResult.invalid(packetHash, "replay_attack");
            }

            // ---- Settle ----
            Timer.Sample sample = Timer.start(meterRegistry);
            Transaction tx = settlement.settle(instruction, packetHash, bridgeNodeId, hopCount);
            sample.stop(meterRegistry.timer("upi.mesh.settlement.latency"));

            if (tx.getStatus() == Transaction.Status.REJECTED) {
                meterRegistry.counter("upi.mesh.security.violations", "type", "SETTLEMENT_FAILURE").increment();

                SecurityEvent secEvent = new SecurityEvent("SETTLEMENT_FAILURE", packet.getPacketId(), packetHash,
                        "Settlement failed (insufficient balance) for: " + instruction.getSenderVpa());
                securityEventRepo.save(secEvent);
                webSocketHandler.broadcast("SECURITY_EVENT", secEvent);

                packetAuditRepo.save(new PacketAudit(packet.getPacketId(), packetHash, bridgeNodeId, hopCount, "REJECTED", "insufficient_balance"));
                return IngestResult.invalid(packetHash, "settlement_failed_insufficient_funds");
            }

            // Succeeded
            packetAuditRepo.save(new PacketAudit(packet.getPacketId(), packetHash, bridgeNodeId, hopCount, "SETTLED", null));
            webSocketHandler.broadcast("PACKET_SETTLED", tx);

            // Broadcast metrics
            webSocketHandler.broadcast("METRICS_UPDATED", Map.of(
                    "throughput", meterRegistry.counter("upi.mesh.packet.throughput").count(),
                    "duplicates", meterRegistry.counter("upi.mesh.duplicate.drops").count(),
                    "replays", meterRegistry.counter("upi.mesh.replay.attacks").count()
            ));

            return IngestResult.settled(packetHash, tx);

        } catch (Exception e) {
            log.error("Ingestion error: {}", e.getMessage(), e);
            packetAuditRepo.save(new PacketAudit(packet.getPacketId(), packetHash, bridgeNodeId, hopCount, "ERROR", e.getMessage()));
            return IngestResult.invalid("?", "internal_error: " + e.getMessage());
        }
    }

    private boolean verifySignature(PaymentInstruction instruction) throws Exception {
        if (instruction.getSignature() == null || instruction.getPublicKey() == null) {
            return false;
        }

        // Reconstruct signature input
        String data = instruction.getSenderVpa() + ":" +
                      instruction.getReceiverVpa() + ":" +
                      instruction.getAmount().toPlainString() + ":" +
                      instruction.getNonce() + ":" +
                      instruction.getSignedAt();

        byte[] keyBytes = Base64.getDecoder().decode(instruction.getPublicKey());
        X509EncodedKeySpec spec = new X509EncodedKeySpec(keyBytes);
        KeyFactory kf = KeyFactory.getInstance("EC");
        PublicKey pubKey = kf.generatePublic(spec);

        Signature ecdsa = Signature.getInstance("SHA256withECDSA");
        ecdsa.initVerify(pubKey);
        ecdsa.update(data.getBytes(StandardCharsets.UTF_8));

        byte[] sigBytes = Base64.getDecoder().decode(instruction.getSignature());
        return ecdsa.verify(sigBytes);
    }

    public record IngestResult(String outcome, String packetHash, String reason, Long transactionId) {
        public static IngestResult settled(String hash, Transaction tx) {
            return new IngestResult("SETTLED", hash, null, tx.getId());
        }
        public static IngestResult duplicate(String hash) {
            return new IngestResult("DUPLICATE_DROPPED", hash, null, null);
        }
        public static IngestResult invalid(String hash, String reason) {
            return new IngestResult("INVALID", hash, reason, null);
        }
    }
}
