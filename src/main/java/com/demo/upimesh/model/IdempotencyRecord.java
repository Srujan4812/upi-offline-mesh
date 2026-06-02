package com.demo.upimesh.model;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "idempotency_records")
public class IdempotencyRecord {

    @Id
    @Column(name = "packet_hash", length = 64)
    private String packetHash;

    @Column(name = "claimed_at", nullable = false)
    private Instant claimedAt;

    public IdempotencyRecord() {}

    public IdempotencyRecord(String packetHash) {
        this.packetHash = packetHash;
        this.claimedAt = Instant.now();
    }

    public String getPacketHash() { return packetHash; }
    public void setPacketHash(String packetHash) { this.packetHash = packetHash; }

    public Instant getClaimedAt() { return claimedAt; }
    public void setClaimedAt(Instant claimedAt) { this.claimedAt = claimedAt; }
}
