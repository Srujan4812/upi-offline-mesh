package com.demo.upimesh.model;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "bridge_nodes")
public class BridgeNode {

    @Id
    @Column(name = "bridge_id")
    private String bridgeId;

    @Column(name = "upload_count", nullable = false)
    private int uploadCount;

    @Column(name = "last_upload")
    private Instant lastUpload;

    public BridgeNode() {}

    public BridgeNode(String bridgeId, int uploadCount) {
        this.bridgeId = bridgeId;
        this.uploadCount = uploadCount;
    }

    public String getBridgeId() { return bridgeId; }
    public void setBridgeId(String bridgeId) { this.bridgeId = bridgeId; }

    public int getUploadCount() { return uploadCount; }
    public void setUploadCount(int uploadCount) { this.uploadCount = uploadCount; }

    public Instant getLastUpload() { return lastUpload; }
    public void setLastUpload(Instant lastUpload) { this.lastUpload = lastUpload; }
}
