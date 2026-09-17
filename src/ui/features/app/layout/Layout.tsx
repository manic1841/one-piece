import React, { useEffect, useState } from 'react';

import clsx from 'clsx';
import { MoreHorizontal, Search, Settings, UserRound } from 'lucide-react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';

import { useAuth } from '@/infra/contexts/useAuth';
import { StatusGlyph } from '@/ui/components/StatusGlyph';
import { Button } from '@/ui/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/ui/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/ui/components/ui/sheet';
import HouseholdSwitcher from '@/ui/features/household/components/HouseholdSwitcher';

import { getPrimaryNavItems, getSecondaryNavItems } from './navigation';
import PixelPet from './PixelPet';
import { useHouseholdGuard } from './useHouseholdGuard';

const Layout: React.FC = () => {
  const { userProfile, logout } = useAuth();
  const navigate = useNavigate();
  const { familyName, loadingHousehold } = useHouseholdGuard();
  const [today, setToday] = useState(() => new Date());

  useEffect(() => {
    const scheduleNextTick = () => {
      const now = new Date();
      const next = new Date(now);
      next.setHours(24, 0, 0, 0);
      return window.setTimeout(() => {
        setToday(new Date());
        timerId = scheduleNextTick();
      }, next.getTime() - now.getTime());
    };

    let timerId = scheduleNextTick();
    return () => window.clearTimeout(timerId);
  }, []);

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

  const todayText = new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(today);

  const switcherReady = !loadingHousehold && familyName && userProfile?.householdId;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="material-chrome sticky top-0 z-50 bg-background/75 backdrop-blur-xl backdrop-saturate-150 border-b border-border">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-3 flex items-center gap-3">
          <NavLink
            to="/"
            className="flex items-center gap-3 shrink-0 transition-opacity duration-fast ease-out-quint hover:opacity-80"
          >
            <h1 className="text-lg font-bold tracking-heading text-foreground">ONE PIECE</h1>
          </NavLink>
          <div className="hidden sm:flex items-center gap-3 shrink-0">
            <StatusGlyph type="active" label="SYSTEM ONLINE" />
            <span
              data-testid="header-today"
              className="font-mono text-xs text-muted-foreground tracking-heading"
            >
              {todayText}
            </span>
          </div>
          <div className="ml-auto flex items-center gap-1 sm:gap-2 shrink-0">
            {switcherReady && (
              <div className="hidden sm:block">
                <HouseholdSwitcher
                  currentHouseholdId={userProfile.householdId}
                  currentHouseholdName={familyName}
                  compact
                />
              </div>
            )}
            <Button
              variant="ghost"
              size="icon"
              aria-label="Search"
              disabled
              className="hidden sm:inline-flex text-muted-foreground"
            >
              <Search size={18} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Settings"
              onClick={() => navigate('/settings')}
              className="text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <Settings size={18} />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Avatar" className="shrink-0">
                  {userProfile?.photoURL ? (
                    <img
                      src={userProfile.photoURL}
                      alt=""
                      className="w-6 h-6 rounded-full object-cover"
                    />
                  ) : (
                    <UserRound size={18} className="text-muted-foreground" />
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                >
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <main className="flex-1 pb-20 md:pb-0">
        <div className="max-w-7xl mx-auto p-4 md:p-8">
          <Outlet />
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="material-chrome md:hidden fixed bottom-0 left-0 right-0 bg-background/75 backdrop-blur-xl backdrop-saturate-150 px-2 py-2 flex justify-around items-center z-50">
        {getPrimaryNavItems().map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              clsx(
                'flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-[color,background-color] duration-fast ease-out-quint active:scale-[0.95]',
                isActive
                  ? 'text-primary bg-primary/10'
                  : 'text-muted-foreground hover:text-foreground',
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
              className="flex flex-col items-center gap-1 px-3 py-2 rounded-lg text-muted-foreground hover:text-foreground transition-[color] duration-fast ease-out-quint active:scale-[0.95]"
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
                      'flex items-center gap-3 px-4 py-3 rounded-lg transition-[color,background-color] duration-fast ease-out-quint active:scale-[0.98]',
                      isActive
                        ? 'text-primary bg-primary/10'
                        : 'text-muted-foreground hover:bg-accent hover:text-foreground',
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

      <PixelPet />
    </div>
  );
};

export default Layout;
