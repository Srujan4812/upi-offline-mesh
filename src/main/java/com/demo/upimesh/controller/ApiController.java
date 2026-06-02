package com.demo.upimesh.controller;

import com.demo.upimesh.crypto.ServerKeyHolder;
import com.demo.upimesh.model.*;
import com.demo.upimesh.service.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.*;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
public class ApiController {

    @Autowired private ServerKeyHolder serverKey;
    @Autowired private DemoService demo;
    @Autowired private MeshSimulatorService mesh;
    @Autowired private BridgeIngestionService bridge;
    @Autowired private AccountRepository accountRepo;
    @Autowired private TransactionRepository txRepo;
    @Autowired private IdempotencyService idempotency;
    @Autowired private SecurityEventRepository securityEventRepo;
    @Autowired private PacketAuditRepository packetAuditRepo;
    @Autowired private MeshNodeRepository meshNodeRepo;

    // ------------------------------------------------------------------ key

    @GetMapping("/server-key")
    public Map<String, String> getServerPublicKey() {
        return Map.of(
                "publicKey", serverKey.getPublicKeyBase64(),
                "algorithm", "RSA-2048 / OAEP-SHA256",
                "hybridScheme", "RSA-OAEP encrypts an AES-256-GCM session key"
        );
    }

    // ---------------------------------------------------------------- demo

    @PostMapping("/demo/send")
    public ResponseEntity<?> demoSend(@RequestBody DemoSendRequest req) throws Exception {
        MeshPacket packet = demo.createPacket(
                req.senderVpa, req.receiverVpa, req.amount, req.pin,
                req.ttl == null ? 5 : req.ttl);

        String startDevice = req.startDevice == null ? "phone-alice" : req.startDevice;
        mesh.inject(startDevice, packet);

        return ResponseEntity.ok(Map.of(
                "packetId", packet.getPacketId(),
                "ciphertextPreview", packet.getCiphertext().substring(0, 64) + "...",
                "ttl", packet.getTtl(),
                "injectedAt", startDevice
        ));
    }

    public static class DemoSendRequest {
        public String senderVpa;
        public String receiverVpa;
        public BigDecimal amount;
        public String pin;
        public Integer ttl;
        public String startDevice;
    }

    // -------------------------------------------------------------- mesh sim

    @GetMapping("/mesh/state")
    public Map<String, Object> meshState() {
        List<Map<String, Object>> deviceData = new ArrayList<>();
        for (VirtualDevice d : mesh.getDevices()) {
            boolean isBridge = false;
            Optional<MeshNode> dbNode = meshNodeRepo.findById(d.getDeviceId());
            if (dbNode.isPresent()) {
                isBridge = dbNode.get().isBridge();
            }
            deviceData.add(Map.of(
                    "deviceId", d.getDeviceId(),
                    "hasInternet", d.hasInternet(),
                    "isBridge", isBridge,
                    "packetCount", d.packetCount(),
                    "packetIds", d.getHeldPackets().stream()
                            .map(p -> p.getPacketId().substring(0, 8))
                            .toList()
            ));
        }
        return Map.of(
                "devices", deviceData,
                "idempotencyCacheSize", idempotency.size()
        );
    }

    @PostMapping("/mesh/gossip")
    public Map<String, Object> meshGossip() {
        MeshSimulatorService.GossipResult r = mesh.gossipOnce();
        return Map.of(
                "transfers", r.transfers(),
                "deviceCounts", r.deviceCounts()
        );
    }

    @PostMapping("/mesh/flush")
    public Map<String, Object> meshFlush() {
        List<MeshSimulatorService.BridgeUpload> uploads = mesh.collectBridgeUploads();

        List<Map<String, Object>> results = new ArrayList<>();
        uploads.parallelStream().forEach(up -> {
            BridgeIngestionService.IngestResult r =
                    bridge.ingest(up.packet(), up.bridgeNodeId(), 5 - up.packet().getTtl());
            synchronized (results) {
                results.add(Map.of(
                        "bridgeNode", up.bridgeNodeId(),
                        "packetId", up.packet().getPacketId().substring(0, 8),
                        "outcome", r.outcome(),
                        "reason", r.reason() == null ? "" : r.reason(),
                        "transactionId", r.transactionId() == null ? -1 : r.transactionId()
                ));
            }
        });

        // Flush in-memory node packets that have been uploaded/processed
        mesh.resetMesh();

        return Map.of(
                "uploadsAttempted", uploads.size(),
                "results", results
        );
    }

    @PostMapping("/mesh/reset")
    public Map<String, Object> meshReset() {
        mesh.resetMesh();
        idempotency.clear();
        return Map.of("status", "mesh and idempotency cache cleared");
    }

    // ----------------------------------------------------------- node management

    @PostMapping("/mesh/node")
    public ResponseEntity<?> addNode(@RequestBody Map<String, Object> body) {
        String deviceId = (String) body.get("deviceId");
        boolean isBridge = Boolean.TRUE.equals(body.get("isBridge"));
        boolean hasInternet = Boolean.TRUE.equals(body.get("hasInternet"));

        if (deviceId == null || deviceId.trim().isEmpty()) {
            return ResponseEntity.badRequest().body("Device ID is required");
        }

        mesh.addDevice(deviceId, isBridge, hasInternet);
        return ResponseEntity.ok(Map.of("status", "Device added", "deviceId", deviceId));
    }

    @DeleteMapping("/mesh/node/{id}")
    public ResponseEntity<?> removeNode(@PathVariable String id) {
        mesh.removeDevice(id);
        return ResponseEntity.ok(Map.of("status", "Device removed", "deviceId", id));
    }

    @PostMapping("/mesh/node/{id}/toggle-internet")
    public ResponseEntity<?> toggleNodeInternet(@PathVariable String id, @RequestBody Map<String, Boolean> body) {
        boolean hasInternet = body.getOrDefault("hasInternet", false);
        mesh.toggleInternet(id, hasInternet);
        return ResponseEntity.ok(Map.of("status", "Internet status updated", "deviceId", id, "hasInternet", hasInternet));
    }

    // -------------------------------------------------------------- bridge

    @PostMapping("/bridge/ingest")
    public ResponseEntity<?> ingest(
            @RequestBody MeshPacket packet,
            @RequestHeader(value = "X-Bridge-Node-Id", defaultValue = "unknown") String bridgeNodeId,
            @RequestHeader(value = "X-Hop-Count", defaultValue = "0") int hopCount) {

        BridgeIngestionService.IngestResult r = bridge.ingest(packet, bridgeNodeId, hopCount);
        return ResponseEntity.ok(r);
    }

    // ------------------------------------------------------------- accounts

    @GetMapping("/accounts")
    public List<Account> listAccounts() {
        return accountRepo.findAll();
    }

    @GetMapping("/transactions")
    public List<Transaction> listTransactions() {
        return txRepo.findTop20ByOrderByIdDesc();
    }

    // ------------------------------------------------------------- security & events

    @GetMapping("/security/events")
    public List<SecurityEvent> listSecurityEvents() {
        return securityEventRepo.findTop50ByOrderByTimestampDesc();
    }

    // ------------------------------------------------------------- analytics

    @GetMapping("/mesh/analytics")
    public Map<String, Object> getAnalytics() {
        long duplicateDrops = securityEventRepo.countByEventType("DUPLICATE_PACKET");
        long replayAttacks = securityEventRepo.countByEventType("REPLAY_ATTACK");
        long tamperedPackets = securityEventRepo.countByEventType("TAMPERED_PACKET");
        long invalidSignatures = securityEventRepo.countByEventType("INVALID_SIGNATURE");
        long expiredPackets = securityEventRepo.countByEventType("EXPIRED_PACKET");
        long settlementFailures = securityEventRepo.countByEventType("SETTLEMENT_FAILURE");

        long totalSettled = txRepo.count();

        // Calculate success rate
        double successRate = 100.0;
        long totalAttempts = totalSettled + duplicateDrops + replayAttacks + tamperedPackets + invalidSignatures + expiredPackets + settlementFailures;
        if (totalAttempts > 0) {
            successRate = (double) totalSettled / totalAttempts * 100.0;
        }

        return Map.of(
                "totalSettled", totalSettled,
                "duplicateDrops", duplicateDrops,
                "replayAttacks", replayAttacks,
                "tamperedPackets", tamperedPackets,
                "invalidSignatures", invalidSignatures,
                "expiredPackets", expiredPackets,
                "settlementFailures", settlementFailures,
                "successRate", successRate,
                "activeDevicesCount", mesh.getDevices().size(),
                "bridgeDevicesCount", mesh.getDevices().stream().filter(VirtualDevice::hasInternet).count()
        );
    }
}
