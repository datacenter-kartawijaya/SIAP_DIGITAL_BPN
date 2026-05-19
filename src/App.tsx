/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { Shell } from './components/layout/Shell';
import { Dashboard } from './pages/Dashboard';
import { ArchiveList } from './pages/ArchiveList';
import { LoanList } from './pages/LoanList';
import { UserManagement } from './pages/UserManagement';
import { LocationManagement } from './pages/LocationManagement';
import { Login } from './components/auth/Login';
import { Toaster } from '@/components/ui/sonner';
import { useAuth } from './lib/auth';

export default function App() {
  const { currentUser: user, loading, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');

  if (loading) {
    return <div className="h-screen w-full flex items-center justify-center bg-slate-950 text-white font-mono text-xs uppercase tracking-widest">Inisialisasi Sistem...</div>;
  }

  if (!user) {
    return (
      <>
        <Login />
        <Toaster />
      </>
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard onNavigate={setActiveTab} />;
      case 'buku-tanah':
        return <ArchiveList type="BUKU_TANAH" />;
      case 'surat-ukur':
        return <ArchiveList type="SURAT_UKUR" />;
      case 'warkah':
        return <ArchiveList type="WARKAH" />;
      case 'loans':
        return <LoanList />;
      case 'users':
        return <UserManagement />;
      case 'locations':
        return <LocationManagement />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <>
      <Shell 
        activeId={activeTab} 
        onNavigate={setActiveTab} 
        user={user}
        onLogout={logout}
      >
        {renderContent()}
      </Shell>
      <Toaster />
    </>
  );
}

