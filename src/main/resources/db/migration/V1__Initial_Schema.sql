CREATE TABLE accounts (
    vpa VARCHAR(255) PRIMARY KEY,
    holder_name VARCHAR(255) NOT NULL,
    balance NUMERIC(19, 2) NOT NULL,
    version BIGINT NOT NULL DEFAULT 0
);

CREATE TABLE transactions (
    id BIGSERIAL PRIMARY KEY,
    packet_hash VARCHAR(64) UNIQUE NOT NULL,
    nonce VARCHAR(255) UNIQUE NOT NULL,
    sender_vpa VARCHAR(255) NOT NULL,
    receiver_vpa VARCHAR(255) NOT NULL,
    amount NUMERIC(19, 2) NOT NULL,
    signed_at TIMESTAMP WITH TIME ZONE NOT NULL,
    settled_at TIMESTAMP WITH TIME ZONE NOT NULL,
    bridge_node_id VARCHAR(255) NOT NULL,
    hop_count INTEGER NOT NULL,
    status VARCHAR(50) NOT NULL
);

CREATE TABLE packet_audit (
    id BIGSERIAL PRIMARY KEY,
    packet_id VARCHAR(255) NOT NULL,
    packet_hash VARCHAR(64) NOT NULL,
    bridge_node_id VARCHAR(255) NOT NULL,
    hop_count INTEGER NOT NULL,
    outcome VARCHAR(50) NOT NULL,
    reason VARCHAR(255),
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE TABLE mesh_nodes (
    node_id VARCHAR(255) PRIMARY KEY,
    is_bridge BOOLEAN NOT NULL,
    has_internet BOOLEAN NOT NULL,
    packet_count INTEGER NOT NULL,
    last_active TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE TABLE bridge_nodes (
    bridge_id VARCHAR(255) PRIMARY KEY,
    upload_count INTEGER NOT NULL,
    last_upload TIMESTAMP WITH TIME ZONE
);

CREATE TABLE device_registry (
    device_id VARCHAR(255) PRIMARY KEY,
    vpa VARCHAR(255),
    public_key TEXT NOT NULL,
    registered_at TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE TABLE security_events (
    id BIGSERIAL PRIMARY KEY,
    event_type VARCHAR(100) NOT NULL,
    packet_id VARCHAR(255),
    packet_hash VARCHAR(64),
    details TEXT,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE TABLE idempotency_records (
    packet_hash VARCHAR(64) PRIMARY KEY,
    claimed_at TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE TABLE system_metrics (
    id BIGSERIAL PRIMARY KEY,
    metric_name VARCHAR(255) NOT NULL,
    metric_value DOUBLE PRECISION NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Indexes
CREATE INDEX idx_transactions_settled_at ON transactions(settled_at);
CREATE INDEX idx_packet_audit_timestamp ON packet_audit(timestamp);
CREATE INDEX idx_security_events_timestamp ON security_events(timestamp);
CREATE INDEX idx_system_metrics_timestamp ON system_metrics(timestamp);
