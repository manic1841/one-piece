import React, { useEffect, useState } from 'react';

import clsx from 'clsx';
import { LogOut, MoreHorizontal } from 'lucide-react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';

import { getHouseholdUseCase } from '@/application/household/use_cases/getHouseholdUseCase';
import { useAuth } from '@/infra/contexts/useAuth';
import { Button } from '@/ui/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/ui/components/ui/sheet';
import HouseholdSwitcher from '@/ui/features/household/components/HouseholdSwitcher';

import { getPrimaryNavItems, getSecondaryNavItems, NAV_ITEMS } from './navigation';

const Layout: React.FC = () => {
  const { userProfile, logout } = useAuth();
  const navigate = useNavigate();
  const [familyName, setFamilyName] = useState<string>('');
  const [loadingHousehold, setLoadingHousehold] = useState(true);

  useEffect(() => {
    const fetchHousehold = async () => {
      if (!userProfile) {
        setLoadingHousehold(false);
        return;
      }

      if (!userProfile.householdId) {
        setLoadingHousehold(false);
        navigate('/onboarding', { replace: true });
        return;
      }

      try {
        const household = await getHouseholdUseCase.execute({
          householdId: userProfile.householdId,
        });

        if (household) {
          setFamilyName(household.name);
        } else {
          navigate('/onboarding', { replace: true });
        }
      } catch (error) {
        console.error('Error fetching household:', error);
        navigate('/onboarding', { replace: true });
      } finally {
        setLoadingHousehold(false);
      }
    };

    fetchHousehold();
  }, [navigate, userProfile]);

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

  const [moreOpen, setMoreOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <main className="flex-1 pb-20 pt-16 md:pt-0 md:pb-0 md:pl-56 lg:pl-64">
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
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-2 py-2 flex justify-around items-center z-50">
        {getPrimaryNavItems().map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              clsx(
                'flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors',
                isActive ? 'text-blue-600 bg-blue-50' : 'text-gray-500 hover:text-gray-900',
              )
            }
          >
            <Icon size={24} />
            <span className="text-xs font-medium">{label}</span>
          </NavLink>
        ))}
        <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
          <SheetTrigger asChild>
            <button
              type="button"
              className="flex flex-col items-center gap-1 px-3 py-2 rounded-lg text-gray-500 hover:text-gray-900 transition-colors"
            >
              <MoreHorizontal size={24} />
              <span className="text-xs font-medium">More</span>
            </button>
          </SheetTrigger>
          <SheetContent side="bottom">
            <SheetHeader>
              <SheetTitle>More</SheetTitle>
            </SheetHeader>
            <div className="flex flex-col gap-1 pb-4">
              {getSecondaryNavItems().map(({ to, icon: Icon, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  onClick={() => setMoreOpen(false)}
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
            </div>
          </SheetContent>
        </Sheet>
      </nav>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex fixed top-0 left-0 bottom-0 md:w-56 lg:w-64 bg-white border-r border-gray-200 flex-col">
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
          {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
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
