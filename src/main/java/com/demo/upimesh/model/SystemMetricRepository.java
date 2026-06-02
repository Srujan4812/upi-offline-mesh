package com.demo.upimesh.model;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface SystemMetricRepository extends JpaRepository<SystemMetric, Long> {
    List<SystemMetric> findTop50ByOrderByTimestampDesc();
}
