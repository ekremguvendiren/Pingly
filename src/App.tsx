import { useState, useEffect } from 'react';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import GamerZone from './components/GamerZone';
import History from './components/History';
import DnsTools from './components/DnsTools';
import Settings from './components/Settings';
import { FaTools } from 'react-icons/fa';

function App() {
  const [activeTab, setActiveTab] = useState('Dashboard');

  // Lifted Streamer Mode State
  const [streamerMode, setStreamerMode] = useState(() => {
    const stored = localStorage.getItem('pingly_streamer_mode');
    return stored === 'true';
  });

  useEffect(() => {
    localStorage.setItem('pingly_streamer_mode', String(streamerMode));
  }, [streamerMode]);

  return (
    <Layout activeTab={activeTab} onTabChange={setActiveTab}>
      {activeTab === 'Dashboard' && <Dashboard streamerMode={streamerMode} />}
      {activeTab === 'Gamer Zone' && <GamerZone />}
      {activeTab === 'History' && <History />}
      {activeTab === 'DNS Tools' && <DnsTools />}
      {activeTab === 'Settings' && <Settings streamerMode={streamerMode} setStreamerMode={setStreamerMode} />}

      {activeTab !== 'Dashboard' && activeTab !== 'Gamer Zone' && activeTab !== 'History' && activeTab !== 'DNS Tools' && activeTab !== 'Settings' && (
        <div className="flex flex-col items-center justify-center h-full text-zinc-500">
          <FaTools className="text-4xl mb-4 opacity-20" />
          <div>Not Implemented Yet</div>
        </div>
      )}
    </Layout>
  );
}

export default App;
