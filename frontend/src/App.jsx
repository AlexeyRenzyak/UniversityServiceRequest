import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth';
import AppShell from './components/AppShell';
import { LoadingPage } from './components/UI';
import AuthPage from './pages/AuthPage';
import RequesterDashboard from './pages/RequesterDashboard';
import NewRequestPage from './pages/NewRequestPage';
import TechnicianDashboard from './pages/TechnicianDashboard';

function Private({ children, requesterOnly = false }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (requesterOnly && user.role === 'technician') return <Navigate to="/" replace />;
  return <AppShell>{children}</AppShell>;
}

function Home() {
  const { user } = useAuth();
  return user?.role === 'technician' ? <TechnicianDashboard /> : <RequesterDashboard />;
}

export default function App() {
  const { loading, user } = useAuth();
  if (loading) return <LoadingPage />;
  return <Routes>
    <Route path="/login" element={user ? <Navigate replace to="/" /> : <AuthPage mode="login" />} />
    <Route path="/register" element={user ? <Navigate replace to="/" /> : <AuthPage mode="register" />} />
    <Route path="/" element={<Private><Home /></Private>} />
    <Route path="/requests/new" element={<Private requesterOnly><NewRequestPage /></Private>} />
    <Route path="*" element={<Navigate replace to={user ? '/' : '/login'} />} />
  </Routes>;
}
