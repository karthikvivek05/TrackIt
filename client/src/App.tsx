import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { initReminders } from './lib/reminders';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NetworkProvider } from './context/NetworkContext';
import { FullScreenSpinner } from './components/ui';
import Layout from './components/Layout';
import AuthPage from './pages/Auth';
import Dashboard from './pages/Dashboard';
import DSATracker from './pages/DSATracker';
import RevisionQueue from './pages/RevisionQueue';
import Today from './pages/Today';
import TrackerDetail from './pages/TrackerDetail';
import Settings from './pages/Settings';

function Protected() {
  const { token, loading } = useAuth();
  if (loading) return <FullScreenSpinner />;
  if (!token) return <Navigate to="/auth" replace />;
  return <Layout />;
}

export default function App() {
  useEffect(() => {
    initReminders();
  }, []);

  return (
    <AuthProvider>
      <NetworkProvider>
        <Routes>
          <Route path="/auth" element={<AuthPage />} />
          <Route element={<Protected />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/dsa" element={<DSATracker />} />
            <Route path="/revision" element={<RevisionQueue />} />
            <Route path="/today" element={<Today />} />
            <Route path="/trackers/:id" element={<TrackerDetail />} />
            <Route path="/settings" element={<Settings />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </NetworkProvider>
    </AuthProvider>
  );
}
