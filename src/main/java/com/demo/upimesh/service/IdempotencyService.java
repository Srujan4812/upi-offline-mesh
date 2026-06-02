package com.demo.upimesh.service;

import com.demo.upimesh.model.IdempotencyRecord;
import com.demo.upimesh.model.IdempotencyRecordRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.Set;

/**
 * Distributed idempotency cache using Redis with PostgreSQL fallback.
 *
 * The contract:
 *   - claim(hash) returns true on first call, false on every call after that (within TTL)
 *   - it is atomic and thread-safe.
 */
@Service
public class IdempotencyService {

    private static final Logger log = LoggerFactory.getLogger(IdempotencyService.class);
    private static final String REDIS_PREFIX = "upi:mesh:idempotency:";

    @Autowired(required = false)
    private StringRedisTemplate redisTemplate;

    @Autowired
    private IdempotencyRecordRepository dbRepository;

    @Value("${upi.mesh.idempotency-ttl-seconds:86400}")
    private long ttlSeconds;

    /**
     * Try to claim a packet hash.
     * Attempts Redis SETNX first. If Redis is unavailable, it falls back to DB idempotency_records.
     */
    public boolean claim(String packetHash) {
        String key = REDIS_PREFIX + packetHash;
        try {
            if (redisTemplate != null) {
                Boolean success = redisTemplate.opsForValue().setIfAbsent(
                        key,
                        Instant.now().toString(),
                        Duration.ofSeconds(ttlSeconds)
                );
                if (success != null) {
                    // Even if Redis claim succeeded, also log in DB asynchronously or synchronously
                    // for audit trail, but here Redis success determines the primary outcome
                    if (success) {
                        saveToDbFallbackQuietly(packetHash);
                    }
                    return success;
                }
            }
        } catch (Exception e) {
            log.warn("Redis connection failed, falling back to PostgreSQL for idempotency check: {}", e.getMessage());
        }

        // Fallback to PostgreSQL
        return claimInDb(packetHash);
    }

    private void saveToDbFallbackQuietly(String packetHash) {
        try {
            if (!dbRepository.existsById(packetHash)) {
                dbRepository.save(new IdempotencyRecord(packetHash));
            }
        } catch (Exception e) {
            // Log but don't fail, since Redis was successful
            log.debug("Failed to mirror idempotency record to DB: {}", e.getMessage());
        }
    }

    private synchronized boolean claimInDb(String packetHash) {
        try {
            if (dbRepository.existsById(packetHash)) {
                return false; // already claimed
            }
            dbRepository.save(new IdempotencyRecord(packetHash));
            return true; // successfully claimed
        } catch (Exception e) {
            log.error("Database idempotency check failed: {}", e.getMessage());
            // Safe side: if everything fails, reject the packet to prevent duplicate/invalid settlement
            return false;
        }
    }

    public int size() {
        try {
            if (redisTemplate != null) {
                Set<String> keys = redisTemplate.keys(REDIS_PREFIX + "*");
                if (keys != null) return keys.size();
            }
        } catch (Exception e) {
            log.warn("Redis count failed: {}", e.getMessage());
        }
        return (int) dbRepository.count();
    }

    /** Periodically evict expired entries from DB fallback. */
    @Scheduled(fixedDelay = 60_000)
    public void evictExpired() {
        try {
            Instant cutoff = Instant.now().minusSeconds(ttlSeconds);
            // JPA method or custom delete query. For simple demo, we can clear all or use a query.
            // Let's keep it simple: we can delete entries where claimedAt < cutoff.
            // In a production system, this would run via a database index.
            // Let's implement a query in repository or just a simple delete.
            // Since we want to keep schema simple, we can delete in database.
            dbRepository.findAll().stream()
                    .filter(record -> record.getClaimedAt().isBefore(cutoff))
                    .forEach(record -> dbRepository.delete(record));
        } catch (Exception e) {
            log.error("Failed to evict expired idempotency records from DB: {}", e.getMessage());
        }
    }

    /** Test/demo helper. */
    public void clear() {
        try {
            if (redisTemplate != null) {
                Set<String> keys = redisTemplate.keys(REDIS_PREFIX + "*");
                if (keys != null && !keys.isEmpty()) {
                    redisTemplate.delete(keys);
                }
            }
        } catch (Exception e) {
            log.warn("Failed to clear Redis keys: {}", e.getMessage());
        }
        dbRepository.deleteAll();
    }
}
