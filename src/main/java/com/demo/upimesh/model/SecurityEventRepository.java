package com.demo.upimesh.model;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface SecurityEventRepository extends JpaRepository<SecurityEvent, Long> {
    List<SecurityEvent> findTop50ByOrderByTimestampDesc();
    long countByEventType(String eventType);
}
