package com.demo.upimesh.service;

import com.demo.upimesh.crypto.HybridCryptoService;
import com.demo.upimesh.crypto.ServerKeyHolder;
import com.demo.upimesh.model.*;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.security.*;
import java.security.spec.ECGenParameterSpec;
import java.time.Instant;
import java.util.Base64;
import java.util.UUID;

/**
 * Helper service that:
 *   - seeds demo accounts on startup
 *   - simulates "sender phone creates an ECDSA keypair, signs a payment instruction, and encrypts it"
 */
@Service
public class DemoService {

    private static final Logger log = LoggerFactory.getLogger(DemoService.class);

    @Autowired private AccountRepository accounts;
    @Autowired private DeviceRegistryRepository deviceRegistryRepo;
    @Autowired private HybridCryptoService crypto;
    @Autowired private ServerKeyHolder serverKey;

    @PostConstruct
    public void seedAccounts() {
        if (accounts.count() == 0) {
            accounts.save(new Account("alice@demo", "Alice",   new BigDecimal("5000.00")));
            accounts.save(new Account("bob@demo",   "Bob",     new BigDecimal("1000.00")));
            accounts.save(new Account("carol@demo", "Carol",   new BigDecimal("2500.00")));
            accounts.save(new Account("dave@demo",  "Dave",    new BigDecimal("500.00")));
            log.info("Seeded 4 demo accounts");
        }
    }

    /**
     * Simulates the sender's phone:
     *   1. Generate an ECDSA key pair (simulated device setup).
     *   2. Build a PaymentInstruction, sign the fields with the private key.
     *   3. Encrypt the PaymentInstruction with the server's RSA public key (hybrid RSA+AES).
     *   4. Wrap in a MeshPacket with TTL.
     *   5. Register the device public key in device_registry.
     */
    public MeshPacket createPacket(String senderVpa, String receiverVpa,
                                   BigDecimal amount, String pin, int ttl) throws Exception {
        
        // 1. Generate ECDSA KeyPair for digital signature
        KeyPairGenerator kpg = KeyPairGenerator.getInstance("EC");
        kpg.initialize(new ECGenParameterSpec("secp256r1"));
        KeyPair kp = kpg.generateKeyPair();
        PublicKey senderPubKey = kp.getPublic();
        PrivateKey senderPrivKey = kp.getPrivate();

        String pubKeyBase64 = Base64.getEncoder().encodeToString(senderPubKey.getEncoded());
        String nonce = UUID.randomUUID().toString();
        long signedAt = Instant.now().toEpochMilli();

        // 2. Create the data string to sign
        String payloadToSign = senderVpa + ":" + receiverVpa + ":" + amount.toPlainString() + ":" + nonce + ":" + signedAt;

        // 3. Generate signature
        Signature ecdsa = Signature.getInstance("SHA256withECDSA");
        ecdsa.initSign(senderPrivKey);
        ecdsa.update(payloadToSign.getBytes(StandardCharsets.UTF_8));
        byte[] signatureBytes = ecdsa.sign();
        String sigBase64 = Base64.getEncoder().encodeToString(signatureBytes);

        // 4. Build PaymentInstruction with signature and public key
        PaymentInstruction instruction = new PaymentInstruction(
                senderVpa,
                receiverVpa,
                amount,
                sha256Hex(pin),
                nonce,
                signedAt,
                sigBase64,
                pubKeyBase64
        );

        // 5. Register device in registry
        String deviceId = "device-" + senderVpa.replace("@", "-");
        if (!deviceRegistryRepo.existsById(deviceId)) {
            deviceRegistryRepo.save(new DeviceRegistry(deviceId, senderVpa, pubKeyBase64));
        }

        // 6. Encrypt with server public key
        String ciphertext = crypto.encrypt(instruction, serverKey.getPublicKey());

        MeshPacket packet = new MeshPacket();
        packet.setPacketId(UUID.randomUUID().toString());
        packet.setTtl(ttl);
        packet.setCreatedAt(Instant.now().toEpochMilli());
        packet.setCiphertext(ciphertext);
        return packet;
    }

    private String sha256Hex(String input) throws Exception {
        MessageDigest md = MessageDigest.getInstance("SHA-256");
        byte[] hash = md.digest(input.getBytes());
        StringBuilder hex = new StringBuilder();
        for (byte b : hash) hex.append(String.format("%02x", b));
        return hex.toString();
    }
}
