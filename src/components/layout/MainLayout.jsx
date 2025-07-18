import React from 'react';
import { useMediaQuery } from '@mui/material';
import { Outlet } from 'react-router-dom';
import { cn } from '@/lib/utils';
import SporteaSidebar from './SporteaSidebar';
import BottomNavigation from './BottomNavigation';
import NotificationList from '../notifications/NotificationList';
import ConnectionStatus from '../ConnectionStatus';
import NotificationPanel from '../NotificationPanel';
import { ReportButton } from '../reporting';
import { useAuth } from '../../hooks/useAuth';

const MainLayout = () => {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const { user } = useAuth();

  
  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Desktop Sidebar */}
      {!isMobile && (
        <SporteaSidebar className="sticky top-0 h-screen" />
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Top Bar - Mobile Only */}
        {isMobile && (
          <div className="sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-brand-primary rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">S</span>
              </div>
              <span className="font-bold text-lg text-gray-900">Sportea</span>
            </div>
            <div className="flex items-center gap-2">
              <ConnectionStatus />
              <ReportButton />
              <NotificationPanel />
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <main className="flex-1 p-4 md:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      {isMobile && <BottomNavigation />}
    </div>
  );
};

export default MainLayout;
