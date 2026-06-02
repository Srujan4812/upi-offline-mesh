package com.demo.upimesh.model;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface DeviceRegistryRepository extends JpaRepository<DeviceRegistry, String> {
    Optional<DeviceRegistry> findByVpa(String vpa);
}
