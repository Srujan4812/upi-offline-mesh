INSERT INTO accounts (vpa, holder_name, balance, version) VALUES
('alice@demo', 'Alice', 5000.00, 0),
('bob@demo', 'Bob', 1000.00, 0),
('carol@demo', 'Carol', 2500.00, 0),
('dave@demo', 'Dave', 500.00, 0);

INSERT INTO mesh_nodes (node_id, is_bridge, has_internet, packet_count, last_active) VALUES
('phone-alice', false, false, 0, NOW()),
('phone-stranger1', false, false, 0, NOW()),
('phone-stranger2', false, false, 0, NOW()),
('phone-stranger3', false, false, 0, NOW()),
('phone-bridge', true, true, 0, NOW());

INSERT INTO bridge_nodes (bridge_id, upload_count, last_upload) VALUES
('phone-bridge', 0, NULL);
