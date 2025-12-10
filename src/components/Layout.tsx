import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/useAuth';
import { householdService } from '@/services/householdService';
import clsx from 'clsx';
import {
  Briefcase,
  FileText,
  Folder,
  LayoutDashboard,
  LogOut,
  Receipt,
  Settings,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';

import HouseholdSwitcher from './HouseholdSwitcher';

const Layout: React.FC = () => {
  const { userProfile, logout } = useAuth();
  const navigate = useNavigate();
  const [familyName, setFamilyName] = useState<string>('');
  const [loadingHousehold, setLoadingHousehold] = useState(true);

  useEffect(() => {
    const fetchHousehold = async () => {
      if (userProfile?.householdId) {
        try {
          const household = await householdService.getHousehold(userProfile.householdId);
          if (household) {
            setFamilyName(household.name);
          }
        } catch (error) {
          console.error('Error fetching household:', error);
        } finally {
          setLoadingHousehold(false);
        }
      } else {
        setLoadingHousehold(false);
      }
    };

    fetchHousehold();
  }, [userProfile?.householdId]);

  const handleLogout = async () => {
    if (window.confirm('Are you sure you want to logout?')) {
      try {
        await logout();
        navigate('/login');
      } catch (error) {
        console.error('Failed to log out:', error);
      }
    }
  };

  const navItems = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/records', icon: Receipt, label: 'Records' },
    { to: '/projects', icon: Folder, label: 'Projects' },
    { to: '/accounts', icon: Wallet, label: 'Accounts' },
    { to: '/reports', icon: FileText, label: 'Reports' },
    { to: '/portfolios', icon: Briefcase, label: 'Portfolios' },
    { to: '/retirement', icon: TrendingUp, label: 'Retirement' },
    { to: '/settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <main className="flex-1 pb-20 pt-16 md:pt-0 md:pb-0 md:pl-64">
        <div className="max-w-7xl mx-auto p-4 md:p-8">
          <Outlet />
        </div>
      </main>

      {/* Mobile Top Bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 bg-white border-b border-gray-200 px-4 py-3 flex justify-between items-center z-50">
        <div className="flex-1">
          <h1 className="text-lg font-bold text-gray-900">One Piece</h1>
          {!loadingHousehold && familyName && userProfile?.householdId && (
            <HouseholdSwitcher
              currentHouseholdId={userProfile.householdId}
              currentHouseholdName={familyName}
              compact
            />
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleLogout}
          className="text-gray-600 hover:bg-red-50 hover:text-red-600"
        >
          <LogOut size={20} />
        </Button>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2 flex justify-around items-center z-50">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              clsx(
                'flex flex-col items-center gap-1 p-2 rounded-lg transition-colors',
                isActive ? 'text-blue-600 bg-blue-50' : 'text-gray-500 hover:text-gray-900',
              )
            }
          >
            <Icon size={24} />
            <span className="text-xs font-medium">{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex fixed top-0 left-0 bottom-0 w-64 bg-white border-r border-gray-200 flex-col">
        <div className="p-6 border-b border-gray-200">
          <h1 className="text-2xl font-bold text-gray-900">One Piece</h1>
          {!loadingHousehold && familyName && userProfile?.householdId && (
            <div className="mt-2">
              <HouseholdSwitcher
                currentHouseholdId={userProfile.householdId}
                currentHouseholdName={familyName}
              />
            </div>
          )}
        </div>
        <nav className="flex-1 p-4 space-y-2">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3 px-4 py-3 rounded-lg transition-colors',
                  isActive
                    ? 'text-blue-600 bg-blue-50'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                )
              }
            >
              <Icon size={20} />
              <span className="font-medium">{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Logout Button */}
        <div className="p-4 border-t border-gray-200">
          <Button
            variant="ghost"
            onClick={handleLogout}
            className="w-full justify-start gap-3 text-gray-600 hover:bg-red-50 hover:text-red-600"
          >
            <LogOut size={20} />
            <span className="font-medium">Logout</span>
          </Button>
        </div>
      </aside>
    </div>
  );
};

export default Layout;
