import { useState } from 'react';
import { AppProvider } from './context/AppContext';
import { Sidebar } from './components/Sidebar';
import { LandingPage } from './pages/LandingPage';
import { Dashboard } from './pages/Dashboard';
import { Visualizer } from './pages/Visualizer';
import { Ledger } from './pages/Ledger';
import { Security } from './pages/Security';
import { Analytics } from './pages/Analytics';

function AppContent() {
  const [activePage, setActivePage] = useState<string>('landing');

  if (activePage === 'landing') {
    return <LandingPage onEnterApp={() => setActivePage('dashboard')} />;
  }

  return (
    <div className="flex h-screen bg-[#0a0a0c] text-slate-100 overflow-hidden font-sans">
      <Sidebar activePage={activePage} setActivePage={setActivePage} />
      <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {activePage === 'dashboard' && <Dashboard />}
        {activePage === 'visualizer' && <Visualizer />}
        {activePage === 'ledger' && <Ledger />}
        {activePage === 'security' && <Security />}
        {activePage === 'analytics' && <Analytics />}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
