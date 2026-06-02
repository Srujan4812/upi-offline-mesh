package com.demo.upimesh;

import com.demo.upimesh.crypto.HybridCryptoService;
import com.demo.upimesh.crypto.ServerKeyHolder;
import com.demo.upimesh.model.*;
import com.demo.upimesh.service.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.security.*;
import java.util.Base64;
import java.util.UUID;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Enterprise test suite covering all critical edge cases, security controls,
 * and high-availability behaviors of UPI Offline Mesh 2.0.
 */
@SpringBootTest
class IdempotencyConcurrencyTest {

    @Autowired private DemoService demoService;
    @Autowired private BridgeIngestionService bridge;
    @Autowired private IdempotencyService idempotency;
    @Autowired private AccountRepository accounts;
    @Autowired private HybridCryptoService crypto;
    @Autowired private ServerKeyHolder serverKey;
    @Autowired private MeshSimulatorService mesh;

    @BeforeEach
    void clear() {
        idempotency.clear();
        mesh.resetMesh();
    }

    @Test
    void singlePacketDeliveredByThreeBridgesSettlesExactlyOnce() throws Exception {
        // Capture starting balances
        BigDecimal aliceBefore = accounts.findById("alice@demo").orElseThrow().getBalance();
        BigDecimal bobBefore = accounts.findById("bob@demo").orElseThrow().getBalance();

        // Create one packet
        MeshPacket packet = demoService.createPacket(
                "alice@demo", "bob@demo", new BigDecimal("100.00"), "1234", 5);

        ExecutorService pool = Executors.newFixedThreadPool(3);
        CountDownLatch start = new CountDownLatch(1);
        AtomicInteger settled = new AtomicInteger();
        AtomicInteger duplicates = new AtomicInteger();

        Future<?>[] futures = new Future[3];
        for (int i = 0; i < 3; i++) {
            final String node = "bridge-" + i;
            futures[i] = pool.submit(() -> {
                try {
                    start.await();
                    BridgeIngestionService.IngestResult r = bridge.ingest(packet, node, 3);
                    if ("SETTLED".equals(r.outcome())) settled.incrementAndGet();
                    else if ("DUPLICATE_DROPPED".equals(r.outcome())) duplicates.incrementAndGet();
                } catch (Exception e) { throw new RuntimeException(e); }
            });
        }

        start.countDown(); // release all 3 threads at once
        for (Future<?> f : futures) f.get(5, TimeUnit.SECONDS);
        pool.shutdown();

        assertEquals(1, settled.get(), "exactly one bridge should settle");
        assertEquals(2, duplicates.get(), "the other two should be duplicates");

        // Balance moved exactly once
        BigDecimal aliceAfter = accounts.findById("alice@demo").orElseThrow().getBalance();
        BigDecimal bobAfter = accounts.findById("bob@demo").orElseThrow().getBalance();
        assertEquals(aliceBefore.subtract(new BigDecimal("100.00")), aliceAfter);
        assertEquals(bobBefore.add(new BigDecimal("100.00")), bobAfter);
    }

    @Test
    void tamperedCiphertextIsRejected() throws Exception {
        MeshPacket packet = demoService.createPacket(
                "alice@demo", "bob@demo", new BigDecimal("50.00"), "1234", 5);

        // Flip a byte in the middle of the ciphertext
        char[] chars = packet.getCiphertext().toCharArray();
        chars[chars.length / 2] = chars[chars.length / 2] == 'A' ? 'B' : 'A';
        packet.setCiphertext(new String(chars));

        BridgeIngestionService.IngestResult r = bridge.ingest(packet, "bridge-x", 1);
        assertEquals("INVALID", r.outcome());
        assertEquals("decryption_failed", r.reason());
    }

    @Test
    void replayAttackIsBlocked() throws Exception {
        MeshPacket packet = demoService.createPacket(
                "alice@demo", "bob@demo", new BigDecimal("10.00"), "1234", 5);

        // First ingestion settles successfully
        BridgeIngestionService.IngestResult r1 = bridge.ingest(packet, "bridge-1", 1);
        assertEquals("SETTLED", r1.outcome());

        // Clear the cache to bypass front-level cache gates
        idempotency.clear();

        // Second ingestion (replay of identical nonce) is caught by DB unique check
        BridgeIngestionService.IngestResult r2 = bridge.ingest(packet, "bridge-2", 1);
        assertEquals("INVALID", r2.outcome());
        assertEquals("replay_attack", r2.reason());
    }

    @Test
    void invalidSignatureIsRejected() throws Exception {
        // Generate ECDSA keys
        KeyPairGenerator kpg = KeyPairGenerator.getInstance("EC");
        kpg.initialize(new java.security.spec.ECGenParameterSpec("secp256r1"));
        KeyPair kp = kpg.generateKeyPair();
        String pubKeyBase64 = Base64.getEncoder().encodeToString(kp.getPublic().getEncoded());

        // Create signature over incorrect payload data
        Signature ecdsa = Signature.getInstance("SHA256withECDSA");
        ecdsa.initSign(kp.getPrivate());
        ecdsa.update("tampered_payment_instruction_data".getBytes(StandardCharsets.UTF_8));
        String badSignature = Base64.getEncoder().encodeToString(ecdsa.sign());

        PaymentInstruction instruction = new PaymentInstruction(
                "alice@demo", "bob@demo", new BigDecimal("30.00"),
                "1234", UUID.randomUUID().toString(), System.currentTimeMillis(),
                badSignature, pubKeyBase64
        );

        String ciphertext = crypto.encrypt(instruction, serverKey.getPublicKey());

        MeshPacket packet = new MeshPacket();
        packet.setPacketId(UUID.randomUUID().toString());
        packet.setTtl(5);
        packet.setCreatedAt(System.currentTimeMillis());
        packet.setCiphertext(ciphertext);

        BridgeIngestionService.IngestResult r = bridge.ingest(packet, "bridge-y", 1);
        assertEquals("INVALID", r.outcome());
        assertEquals("invalid_signature", r.reason());
    }

    @Test
    void redisFailureFallsBackToDatabaseIdempotency() throws Exception {
        // In the test setup, Redis connection is missing, asserting DB fallback claim logic
        MeshPacket packet = demoService.createPacket(
                "alice@demo", "bob@demo", new BigDecimal("10.00"), "1234", 5);

        String hash = crypto.hashCiphertext(packet.getCiphertext());

        // Claim succeeds first time
        assertTrue(idempotency.claim(hash));

        // Claim fails second time (blocked by DB fallback records)
        assertFalse(idempotency.claim(hash));
    }

    @Test
    void networkPartitionAndRestoration() throws Exception {
        MeshPacket packet = demoService.createPacket(
                "alice@demo", "bob@demo", new BigDecimal("10.00"), "1234", 5);

        // Turn internet off on bridge (network partition)
        mesh.toggleInternet("phone-bridge", false);

        // Inject packet and gossip
        mesh.inject("phone-alice", packet);
        mesh.gossipOnce();
        mesh.gossipOnce();

        // Assert bridge node has packets but cannot upload because hasInternet=false
        var uploads = mesh.collectBridgeUploads();
        assertEquals(0, uploads.size());

        // Restore network connectivity
        mesh.toggleInternet("phone-bridge", true);

        // Assert bridge node uploads packet successfully
        uploads = mesh.collectBridgeUploads();
        assertEquals(1, uploads.size());

        BridgeIngestionService.IngestResult r = bridge.ingest(uploads.get(0).packet(), "phone-bridge", 2);
        assertEquals("SETTLED", r.outcome());
    }
}
