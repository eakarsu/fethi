import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Browse from './pages/Browse';
import MyListings from './pages/MyListings';
import Bookings from './pages/Bookings';
import Messages from './pages/Messages';
import Profile from './pages/Profile';
import Notifications from './pages/Notifications';
import Navbar from './components/Navbar';
import ServiceDashboard from './pages/ServiceDashboard';
import CustomViewsPage from './pages/CustomViewsPage';
import DocumentGovernance from './pages/DocumentGovernance';

import CodexCustomVizFeature from './pages/CodexCustomVizFeature';
import CodexOperationsFeature from './pages/CodexOperationsFeature';

import TimelineView from './pages/TimelineView';

function Protected({ children }) {
  const { token } = useAuth();
  return token ? children : <Navigate to="/login" replace />;
}

function AppLayout({ children }) {
  return (
    <div className="app-layout">
      <Navbar />
      <main className="app-main">{children}</main>
    </div>
  );
}

export default function App() {
  const { token } = useAuth();
  return (
    <>
      <Toaster position="top-right" toastOptions={{ style: { background: '#1e293b', color: '#f1f5f9', border: '1px solid #334155' } }} />
      <Routes>
        <Route path="/insights/timeline" element={<TimelineView />} />
        <Route path="/codex/custom-viz" element={<CodexCustomVizFeature />} />
        <Route path="/codex/operations" element={<CodexOperationsFeature />} />

        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Protected><AppLayout><Dashboard /></AppLayout></Protected>} />
        <Route path="/browse" element={<Protected><AppLayout><Browse /></AppLayout></Protected>} />
        <Route path="/browse/:category" element={<Protected><AppLayout><Browse /></AppLayout></Protected>} />
        <Route path="/my-listings" element={<Protected><AppLayout><MyListings /></AppLayout></Protected>} />
        <Route path="/bookings" element={<Protected><AppLayout><Bookings /></AppLayout></Protected>} />
        <Route path="/messages" element={<Protected><AppLayout><Messages /></AppLayout></Protected>} />
        <Route path="/profile" element={<Protected><AppLayout><Profile /></AppLayout></Protected>} />
        <Route path="/notifications" element={<Protected><AppLayout><Notifications /></AppLayout></Protected>} />
        <Route path="/services" element={<Protected><AppLayout><ServiceDashboard /></AppLayout></Protected>} />
        <Route path="/custom-views" element={<Protected><AppLayout><CustomViewsPage /></AppLayout></Protected>} />
        <Route path="/documents" element={<Protected><AppLayout><DocumentGovernance /></AppLayout></Protected>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
