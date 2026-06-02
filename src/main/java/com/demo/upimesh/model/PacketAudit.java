package com.demo.upimesh.model;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "packet_audit")
public class PacketAudit {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, name = "packet_id")
    private String packetId;

    @Column(nullable = false, name = "packet_hash")
    private String packetHash;

    @Column(nullable = false, name = "bridge_node_id")
    private String bridgeNodeId;

    @Column(nullable = false, name = "hop_count")
    private int hopCount;

    @Column(nullable = false)
    private String outcome;

    @Column
    private String reason;

    @Column(nullable = false)
    private Instant timestamp;

    public PacketAudit() {}

    public PacketAudit(String packetId, String packetHash, String bridgeNodeId, int hopCount, String outcome, String reason) {
        this.packetId = packetId;
        this.packetHash = packetHash;
        this.bridgeNodeId = bridgeNodeId;
        this.hopCount = hopCount;
        this.outcome = outcome;
        this.reason = reason;
        this.timestamp = Instant.now();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getPacketId() { return packetId; }
    public void setPacketId(String packetId) { this.packetId = packetId; }

    public String getPacketHash() { return packetHash; }
    public void setPacketHash(String packetHash) { this.packetHash = packetHash; }

    public String getBridgeNodeId() { return bridgeNodeId; }
    public void setBridgeNodeId(String bridgeNodeId) { this.bridgeNodeId = bridgeNodeId; }

    public int getHopCount() { return hopCount; }
    public void setHopCount(int hopCount) { this.hopCount = hopCount; }

    public String getOutcome() { return outcome; }
    public void setOutcome(String outcome) { this.outcome = outcome; }

    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }

    public Instant getTimestamp() { return timestamp; }
    public void setTimestamp(Instant timestamp) { this.timestamp = timestamp; }
}
