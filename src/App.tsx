import { Route, Routes } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Layout } from '@/components/layout/Layout';
import { Dashboard } from '@/pages/Dashboard';
import { Agents } from '@/pages/Agents';
import { Machines } from '@/pages/Machines';
import { Coliver } from '@/pages/Coliver';
import { LiensSEO } from '@/pages/LiensSEO';
import { Analytics } from '@/pages/Analytics';
import { Settings } from '@/pages/Settings';
import { Admin } from '@/pages/Admin';
import { Login } from '@/pages/Login';
import { ChangePin } from '@/pages/ChangePin';

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/change-pin" element={<ChangePin />} />
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <Layout>
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/agents" element={<Agents />} />
                  <Route path="/machines" element={<Machines />} />
                  <Route path="/coliver" element={<Coliver />} />
                  <Route path="/seo" element={<LiensSEO />} />
                  <Route path="/analytics" element={<Analytics />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route
                    path="/admin"
                    element={
                      <ProtectedRoute requireRole={['superadmin']}>
                        <Admin />
                      </ProtectedRoute>
                    }
                  />
                </Routes>
              </Layout>
            </ProtectedRoute>
          }
        />
      </Routes>
    </AuthProvider>
  );
}
