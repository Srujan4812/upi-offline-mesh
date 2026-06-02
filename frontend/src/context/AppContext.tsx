import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export interface Device {
  deviceId: string;
  hasInternet: boolean;
  isBridge: boolean;
  packetCount: number;
  packetIds: string[];
}

export interface Transaction {
  id: number;
  packetHash: string;
  nonce: string;
  senderVpa: string;
  receiverVpa: string;
  amount: number;
  signedAt: string;
  settledAt: string;
  bridgeNodeId: string;
  hopCount: number;
  status: 'SETTLED' | 'REJECTED';
}

export interface SecurityEvent {
  id: number;
  eventType: 'TAMPERED_PACKET' | 'REPLAY_ATTACK' | 'DUPLICATE_PACKET' | 'INVALID_SIGNATURE' | 'EXPIRED_PACKET' | 'SETTLEMENT_FAILURE';
  packetId: string;
  packetHash: string;
  details: string;
  timestamp: string;
}

export interface Account {
  vpa: string;
  holderName: string;
  balance: number;
  version: number;
}

export interface Analytics {
  totalSettled: number;
  duplicateDrops: number;
  replayAttacks: number;
  tamperedPackets: number;
  invalidSignatures: number;
  expiredPackets: number;
  settlementFailures: number;
  successRate: number;
  activeDevicesCount: number;
  bridgeDevicesCount: number;
}

export interface ForwardTransfer {
  packetId: string;
  from: string;
  to: string;
  remainingTtl: number;
}

interface AppContextType {
  devices: Device[];
  transactions: Transaction[];
  securityEvents: SecurityEvent[];
  accounts: Account[];
  analytics: Analytics | null;
  wsConnected: boolean;
  lastForwardEvent: { transfers: number; details: ForwardTransfer[] } | null;
  loading: boolean;
  
  fetchState: () => void;
  injectPacket: (senderVpa: string, receiverVpa: string, amount: number, pin: string, ttl: number, startDevice: string) => Promise<any>;
  runGossip: () => Promise<any>;
  flushBridges: () => Promise<any>;
  resetNetwork: () => Promise<any>;
  addNode: (deviceId: string, isBridge: boolean, hasInternet: boolean) => Promise<any>;
  removeNode: (deviceId: string) => Promise<any>;
  toggleInternet: (deviceId: string, hasInternet: boolean) => Promise<any>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Automatically detect host and port for WebSocket connections
const getApiBaseUrl = () => {
  const { protocol, hostname, port } = window.location;
  // If running via Vite dev server (usually 5173), target the backend at 8080
  if (port === '5173') {
    return `${protocol}//${hostname}:8080`;
  }
  return `${protocol}//${hostname}${port ? `:${port}` : ''}`;
};

const getWsUrl = () => {
  const { protocol, hostname, port } = window.location;
  const wsProtocol = protocol === 'https:' ? 'wss:' : 'ws:';
  if (port === '5173') {
    return `${wsProtocol}//${hostname}:8080/ws/events`;
  }
  return `${wsProtocol}//${hostname}${port ? `:${port}` : ''}/ws/events`;
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [devices, setDevices] = useState<Device[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [wsConnected, setWsConnected] = useState(false);
  const [lastForwardEvent, setLastForwardEvent] = useState<{ transfers: number; details: ForwardTransfer[] } | null>(null);
  const [loading, setLoading] = useState(false);

  const API_BASE = getApiBaseUrl();

  const fetchState = useCallback(async () => {
    try {
      setLoading(true);
      const [devicesRes, accountsRes, txsRes, eventsRes, analyticsRes] = await Promise.all([
        fetch(`${API_BASE}/api/mesh/state`).then(r => r.json()),
        fetch(`${API_BASE}/api/accounts`).then(r => r.json()),
        fetch(`${API_BASE}/api/transactions`).then(r => r.json()),
        fetch(`${API_BASE}/api/security/events`).then(r => r.json()),
        fetch(`${API_BASE}/api/mesh/analytics`).then(r => r.json())
      ]);

      setDevices(devicesRes.devices || []);
      setAccounts(accountsRes || []);
      setTransactions(txsRes || []);
      setSecurityEvents(eventsRes || []);
      setAnalytics(analyticsRes || null);
    } catch (e) {
      console.error('Failed to fetch API state:', e);
    } finally {
      setLoading(false);
    }
  }, [API_BASE]);

  // Handle real-time WebSockets
  useEffect(() => {
    fetchState();
    
    let ws: WebSocket;
    let reconnectTimeout: any;

    const connectWs = () => {
      const wsUrl = getWsUrl();
      console.log('Connecting to WebSocket at:', wsUrl);
      ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('WebSocket connected');
        setWsConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('WebSocket Event received:', data);
          
          if (data.type === 'PACKET_FORWARDED') {
            setLastForwardEvent(data.payload);
            // Clear event after 2 seconds to avoid repeating animation triggers
            setTimeout(() => setLastForwardEvent(null), 2000);
          }

          // Trigger state refresh for major ledger or node updates
          fetchState();
        } catch (e) {
          console.error('Error handling WebSocket message:', e);
        }
      };

      ws.onclose = () => {
        console.log('WebSocket disconnected. Retrying in 3s...');
        setWsConnected(false);
        reconnectTimeout = setTimeout(connectWs, 3000);
      };

      ws.onerror = (err) => {
        console.error('WebSocket error:', err);
        ws.close();
      };
    };

    connectWs();

    return () => {
      if (ws) ws.close();
      clearTimeout(reconnectTimeout);
    };
  }, [fetchState]);

  const injectPacket = async (senderVpa: string, receiverVpa: string, amount: number, pin: string, ttl: number, startDevice: string) => {
    const res = await fetch(`${API_BASE}/api/demo/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ senderVpa, receiverVpa, amount, pin, ttl, startDevice })
    });
    const data = await res.json();
    fetchState();
    return data;
  };

  const runGossip = async () => {
    const res = await fetch(`${API_BASE}/api/mesh/gossip`, { method: 'POST' });
    const data = await res.json();
    fetchState();
    return data;
  };

  const flushBridges = async () => {
    const res = await fetch(`${API_BASE}/api/mesh/flush`, { method: 'POST' });
    const data = await res.json();
    fetchState();
    return data;
  };

  const resetNetwork = async () => {
    const res = await fetch(`${API_BASE}/api/mesh/reset`, { method: 'POST' });
    const data = await res.json();
    fetchState();
    return data;
  };

  const addNode = async (deviceId: string, isBridge: boolean, hasInternet: boolean) => {
    const res = await fetch(`${API_BASE}/api/mesh/node`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId, isBridge, hasInternet })
    });
    const data = await res.json();
    fetchState();
    return data;
  };

  const removeNode = async (deviceId: string) => {
    const res = await fetch(`${API_BASE}/api/mesh/node/${deviceId}`, {
      method: 'DELETE'
    });
    const data = await res.json();
    fetchState();
    return data;
  };

  const toggleInternet = async (deviceId: string, hasInternet: boolean) => {
    const res = await fetch(`${API_BASE}/api/mesh/node/${deviceId}/toggle-internet`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hasInternet })
    });
    const data = await res.json();
    fetchState();
    return data;
  };

  return (
    <AppContext.Provider value={{
      devices,
      transactions,
      securityEvents,
      accounts,
      analytics,
      wsConnected,
      lastForwardEvent,
      loading,
      fetchState,
      injectPacket,
      runGossip,
      flushBridges,
      resetNetwork,
      addNode,
      removeNode,
      toggleInternet
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppState = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppState must be used within an AppProvider');
  }
  return context;
};
