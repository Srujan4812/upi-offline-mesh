package com.demo.upimesh.service;

import com.demo.upimesh.model.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import jakarta.annotation.PostConstruct;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Simulates the Bluetooth mesh.
 * Synchronizes node state with the database and broadcasts updates via WebSockets.
 */
@Service
public class MeshSimulatorService {

    private static final Logger log = LoggerFactory.getLogger(MeshSimulatorService.class);

    private final Map<String, VirtualDevice> devices = new ConcurrentHashMap<>();

    @Autowired
    private MeshNodeRepository meshNodeRepo;

    @Autowired
    private BridgeNodeRepository bridgeNodeRepo;

    @Autowired
    private MeshWebSocketHandler webSocketHandler;

    @PostConstruct
    public void init() {
        seedDefaultDevices();
    }

    private void seedDefaultDevices() {
        try {
            if (meshNodeRepo.count() == 0) {
                meshNodeRepo.save(new MeshNode("phone-alice", false, false, 0));
                meshNodeRepo.save(new MeshNode("phone-stranger1", false, false, 0));
                meshNodeRepo.save(new MeshNode("phone-stranger2", false, false, 0));
                meshNodeRepo.save(new MeshNode("phone-stranger3", false, false, 0));
                meshNodeRepo.save(new MeshNode("phone-bridge", true, true, 0));
                
                bridgeNodeRepo.save(new BridgeNode("phone-bridge", 0));
                log.info("Seeded default mesh devices into database");
            }
        } catch (Exception e) {
            log.warn("Database not ready for seeding during startup: {}", e.getMessage());
        }

        // Initialize in-memory cache
        devices.put("phone-alice",   new VirtualDevice("phone-alice",   false));
        devices.put("phone-stranger1", new VirtualDevice("phone-stranger1", false));
        devices.put("phone-stranger2", new VirtualDevice("phone-stranger2", false));
        devices.put("phone-stranger3", new VirtualDevice("phone-stranger3", false));
        devices.put("phone-bridge",  new VirtualDevice("phone-bridge",  true));
    }

    public Collection<VirtualDevice> getDevices() {
        return devices.values();
    }

    public VirtualDevice getDevice(String id) {
        return devices.get(id);
    }

    public synchronized void addDevice(String id, boolean isBridge, boolean hasInternet) {
        VirtualDevice dev = new VirtualDevice(id, hasInternet);
        devices.put(id, dev);

        MeshNode node = new MeshNode(id, isBridge, hasInternet, 0);
        meshNodeRepo.save(node);

        if (isBridge) {
            bridgeNodeRepo.save(new BridgeNode(id, 0));
        }

        webSocketHandler.broadcast("NODE_ADDED", Map.of(
                "deviceId", id,
                "isBridge", isBridge,
                "hasInternet", hasInternet,
                "packetCount", 0
        ));
        log.info("Device {} added to mesh", id);
    }

    public synchronized void removeDevice(String id) {
        devices.remove(id);
        meshNodeRepo.deleteById(id);
        bridgeNodeRepo.deleteById(id);

        webSocketHandler.broadcast("NODE_REMOVED", Map.of("deviceId", id));
        log.info("Device {} removed from mesh", id);
    }

    public synchronized void toggleInternet(String id, boolean hasInternet) {
        VirtualDevice dev = devices.get(id);
        if (dev != null) {
            // Update in-memory
            VirtualDevice updatedDev = new VirtualDevice(id, hasInternet);
            // Copy held packets
            dev.getHeldPackets().forEach(updatedDev::hold);
            devices.put(id, updatedDev);

            // Update database
            meshNodeRepo.findById(id).ifPresent(node -> {
                node.setHasInternet(hasInternet);
                node.setLastActive(Instant.now());
                meshNodeRepo.save(node);
            });

            webSocketHandler.broadcast("NODE_UPDATED", Map.of(
                    "deviceId", id,
                    "hasInternet", hasInternet,
                    "packetCount", updatedDev.packetCount()
            ));
            log.info("Device {} internet toggled to {}", id, hasInternet);
        }
    }

    /**
     * Sender drops a packet into the mesh by handing it to their own device.
     */
    public synchronized void inject(String senderDeviceId, MeshPacket packet) {
        VirtualDevice sender = devices.get(senderDeviceId);
        if (sender == null) throw new IllegalArgumentException("Unknown device: " + senderDeviceId);
        sender.hold(packet);

        // Update database
        meshNodeRepo.findById(senderDeviceId).ifPresent(node -> {
            node.setPacketCount(sender.packetCount());
            node.setLastActive(Instant.now());
            meshNodeRepo.save(node);
        });

        webSocketHandler.broadcast("PACKET_CREATED", Map.of(
                "packetId", packet.getPacketId(),
                "ttl", packet.getTtl(),
                "createdAt", packet.getCreatedAt(),
                "injectedAt", senderDeviceId
        ));

        webSocketHandler.broadcast("NODE_UPDATED", Map.of(
                "deviceId", senderDeviceId,
                "packetCount", sender.packetCount()
        ));

        log.info("Packet {} injected at {} (TTL={})",
                packet.getPacketId().substring(0, 8), senderDeviceId, packet.getTtl());
    }

    /**
     * One round of gossip. Every device shares everything it has with every
     * other device. TTL is decremented per hop.
     */
    public synchronized GossipResult gossipOnce() {
        int transfers = 0;
        List<VirtualDevice> deviceList = new ArrayList<>(devices.values());

        // Snapshot held packets at the start of this round
        Map<String, List<MeshPacket>> snapshot = new HashMap<>();
        for (VirtualDevice d : deviceList) {
            snapshot.put(d.getDeviceId(), new ArrayList<>(d.getHeldPackets()));
        }

        List<Map<String, Object>> forwardDetails = new ArrayList<>();

        for (VirtualDevice src : deviceList) {
            for (MeshPacket pkt : snapshot.get(src.getDeviceId())) {
                if (pkt.getTtl() <= 0) continue;
                for (VirtualDevice dst : deviceList) {
                    if (dst == src) continue;
                    if (dst.holds(pkt.getPacketId())) continue;
                    
                    MeshPacket copy = new MeshPacket();
                    copy.setPacketId(pkt.getPacketId());
                    copy.setTtl(pkt.getTtl() - 1);
                    copy.setCreatedAt(pkt.getCreatedAt());
                    copy.setCiphertext(pkt.getCiphertext());
                    dst.hold(copy);
                    
                    transfers++;
                    forwardDetails.add(Map.of(
                            "packetId", pkt.getPacketId(),
                            "from", src.getDeviceId(),
                            "to", dst.getDeviceId(),
                            "remainingTtl", copy.getTtl()
                    ));
                }
            }
        }

        // Sync packet counts to database and broadcast to frontend
        for (VirtualDevice d : devices.values()) {
            meshNodeRepo.findById(d.getDeviceId()).ifPresent(node -> {
                node.setPacketCount(d.packetCount());
                node.setLastActive(Instant.now());
                meshNodeRepo.save(node);
            });
            webSocketHandler.broadcast("NODE_UPDATED", Map.of(
                    "deviceId", d.getDeviceId(),
                    "packetCount", d.packetCount()
            ));
        }

        if (transfers > 0) {
            webSocketHandler.broadcast("PACKET_FORWARDED", Map.of(
                    "transfers", transfers,
                    "details", forwardDetails
            ));
        }

        log.info("Gossip round complete: {} packet transfers", transfers);
        return new GossipResult(transfers, snapshotMap());
    }

    public Map<String, Integer> snapshotMap() {
        Map<String, Integer> m = new LinkedHashMap<>();
        for (VirtualDevice d : devices.values()) {
            m.put(d.getDeviceId(), d.packetCount());
        }
        return m;
    }

    /**
     * Returns all packets held by devices with internet.
     */
    public List<BridgeUpload> collectBridgeUploads() {
        List<BridgeUpload> out = new ArrayList<>();
        for (VirtualDevice d : devices.values()) {
            if (!d.hasInternet()) continue;
            for (MeshPacket pkt : d.getHeldPackets()) {
                out.add(new BridgeUpload(d.getDeviceId(), pkt));
            }
        }
        return out;
    }

    public synchronized void resetMesh() {
        devices.clear();
        try {
            meshNodeRepo.deleteAll();
            bridgeNodeRepo.deleteAll();
        } catch (Exception e) {
            log.error("Failed to clear database tables on reset: {}", e.getMessage());
        }
        seedDefaultDevices();
        webSocketHandler.broadcast("MESH_RESET", Map.of());
        log.info("Mesh reset completed and re-seeded");
    }

    public record GossipResult(int transfers, Map<String, Integer> deviceCounts) {}
    public record BridgeUpload(String bridgeNodeId, MeshPacket packet) {}
}
