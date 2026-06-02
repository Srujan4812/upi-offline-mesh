package com.demo.upimesh.model;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "mesh_nodes")
public class MeshNode {

    @Id
    @Column(name = "node_id")
    private String nodeId;

    @Column(name = "is_bridge", nullable = false)
    private boolean isBridge;

    @Column(name = "has_internet", nullable = false)
    private boolean hasInternet;

    @Column(name = "packet_count", nullable = false)
    private int packetCount;

    @Column(name = "last_active", nullable = false)
    private Instant lastActive;

    public MeshNode() {}

    public MeshNode(String nodeId, boolean isBridge, boolean hasInternet, int packetCount) {
        this.nodeId = nodeId;
        this.isBridge = isBridge;
        this.hasInternet = hasInternet;
        this.packetCount = packetCount;
        this.lastActive = Instant.now();
    }

    public String getNodeId() { return nodeId; }
    public void setNodeId(String nodeId) { this.nodeId = nodeId; }

    public boolean isBridge() { return isBridge; }
    public void setBridge(boolean bridge) { isBridge = bridge; }

    public boolean isHasInternet() { return hasInternet; }
    public void setHasInternet(boolean hasInternet) { this.hasInternet = hasInternet; }

    public int getPacketCount() { return packetCount; }
    public void setPacketCount(int packetCount) { this.packetCount = packetCount; }

    public Instant getLastActive() { return lastActive; }
    public void setLastActive(Instant lastActive) { this.lastActive = lastActive; }
}
