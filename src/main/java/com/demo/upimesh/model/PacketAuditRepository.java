package com.demo.upimesh.model;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface PacketAuditRepository extends JpaRepository<PacketAudit, Long> {
    List<PacketAudit> findTop50ByOrderByTimestampDesc();
}
