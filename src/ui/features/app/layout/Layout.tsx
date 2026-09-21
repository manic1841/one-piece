import React, { useEffect, useState } from 'react';

import { LogOut, Search, Settings, UserRound } from 'lucide-react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';

import { useAuth } from '@/infra/contexts/useAuth';
import { useConfirm } from '@/ui/features/app/confirm/ConfirmDialog';
import { StatusGlyph } from '@/ui/components/StatusGlyph';
import { Button } from '@/ui/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/ui/components/ui/dropdown-menu';
import HouseholdSwitcher from '@/ui/features/household/components/HouseholdSwitcher';

import CommandPalette from './CommandPalette';
import PixelPet from './PixelPet';
import SiteFooter from './SiteFooter';
import { APP_BRAND } from './brand';
import { useHouseholdGuard } from './useHouseholdGuard';
import { usePetReaction } from './usePetReaction';

const Layout: React.FC = () => {
  const { userProfile, logout } = useAuth();
  const navigate = useNavigate();
  const { familyName, loadingHousehold } = useHouseholdGuard();
  const petReaction = usePetReaction(userProfile?.householdId);
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

  const { confirm } = useConfirm();

  const handleLogout = async () => {
    const confirmed = await confirm({
      title: 'Log out?',
      context: 'You will need to sign in again to continue tracking your finances.',
      consequence: 'Any unsaved local state will be lost.',
      confirmLabel: 'LOG OUT',
      cancelLabel: 'Cancel',
    });
    if (confirmed) {
      try {
        await logout();
        navigate('/login');
      } catch (error) {
        console.error('Failed to log out:', error);
      }
    }
  };

  const [paletteOpen, setPaletteOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === 'k' && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        setPaletteOpen((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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
            <h1 className="text-lg font-bold tracking-heading text-foreground">{APP_BRAND}</h1>
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
              onClick={() => setPaletteOpen(true)}
              className="text-muted-foreground"
            >
              <Search size={18} />
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
                  onClick={() => navigate('/settings')}
                  className="text-muted-foreground hover:bg-accent hover:text-foreground"
                >
                  <Settings size={16} />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                >
                  <LogOut size={16} />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <div className="max-w-7xl mx-auto p-4 md:p-8">
          <Outlet />
        </div>
      </main>

      <SiteFooter />

      <PixelPet reaction={petReaction} />
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </div>
  );
};

export default Layout;
