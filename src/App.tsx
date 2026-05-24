import { Route, Routes } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Dashboard } from '@/pages/Dashboard';
import { Agents } from '@/pages/Agents';
import { Machines } from '@/pages/Machines';
import { Coliver } from '@/pages/Coliver';
import { LiensSEO } from '@/pages/LiensSEO';
import { Analytics } from '@/pages/Analytics';
import { Settings } from '@/pages/Settings';

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/agents" element={<Agents />} />
        <Route path="/machines" element={<Machines />} />
        <Route path="/coliver" element={<Coliver />} />
        <Route path="/seo" element={<LiensSEO />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </Layout>
  );
}
