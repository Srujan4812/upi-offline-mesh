package com.demo.upimesh.model;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "device_registry")
public class DeviceRegistry {

    @Id
    @Column(name = "device_id")
    private String deviceId;

    @Column
    private String vpa;

    @Column(name = "public_key", nullable = false, columnDefinition = "TEXT")
    private String publicKey;

    @Column(name = "registered_at", nullable = false)
    private Instant registeredAt;

    public DeviceRegistry() {}

    public DeviceRegistry(String deviceId, String vpa, String publicKey) {
        this.deviceId = deviceId;
        this.vpa = vpa;
        this.publicKey = publicKey;
        this.registeredAt = Instant.now();
    }

    public String getDeviceId() { return deviceId; }
    public void setDeviceId(String deviceId) { this.deviceId = deviceId; }

    public String getVpa() { return vpa; }
    public void setVpa(String vpa) { this.vpa = vpa; }

    public String getPublicKey() { return publicKey; }
    public void setPublicKey(String publicKey) { this.publicKey = publicKey; }

    public Instant getRegisteredAt() { return registeredAt; }
    public void setRegisteredAt(Instant registeredAt) { this.registeredAt = registeredAt; }
}
