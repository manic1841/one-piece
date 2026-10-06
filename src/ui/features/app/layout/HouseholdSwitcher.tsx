import React, { useState } from 'react';

import { ChevronDown, Home, LogOut as LogOutIcon } from 'lucide-react';

import { Button } from '@/ui/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/ui/components/ui/dropdown-menu';
import { useHouseholdSwitcher } from '@/ui/features/app/hooks/useHouseholdSwitcher';

interface HouseholdSwitcherProps {
  currentHouseholdId?: string;
  currentHouseholdName: string;
  compact?: boolean;
}

/** Derived from the controller's return shape so this Surface file never imports a domain type. */
type Households = ReturnType<typeof useHouseholdSwitcher>['households'];

interface HouseholdMenuContentProps {
  loading: boolean;
  households: Households;
  currentHouseholdId?: string;
  onSwitch: (householdId: string) => void;
  onLeave: () => void;
}

const HouseholdMenuContent: React.FC<HouseholdMenuContentProps> = ({
  loading,
  households,
  currentHouseholdId,
  onSwitch,
  onLeave,
}) => (
  <DropdownMenuContent align="start" className="w-56">
    <DropdownMenuLabel>Switch Household</DropdownMenuLabel>
    <DropdownMenuSeparator />
    {loading ? (
      <DropdownMenuItem disabled>Loading...</DropdownMenuItem>
    ) : (
      <>
        {households.map((household) => (
          <DropdownMenuItem
            key={household.id}
            onClick={() => onSwitch(household.id)}
            className={household.id === currentHouseholdId ? 'bg-primary/10' : ''}
          >
            <Home size={16} className="mr-2" />
            {household.name}
            {household.id === currentHouseholdId && (
              <span className="ml-auto text-xs text-primary">Current</span>
            )}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onLeave} className="text-destructive">
          <LogOutIcon size={16} className="mr-2" />
          Leave Household
        </DropdownMenuItem>
      </>
    )}
  </DropdownMenuContent>
);

const HouseholdSwitcher: React.FC<HouseholdSwitcherProps> = ({
  currentHouseholdId,
  currentHouseholdName,
  compact = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const { households, loading, handleSwitchHousehold, handleLeaveHousehold } = useHouseholdSwitcher(
    currentHouseholdId,
    isOpen,
    setIsOpen,
  );

  const menuContent = (
    <HouseholdMenuContent
      loading={loading}
      households={households}
      currentHouseholdId={currentHouseholdId}
      onSwitch={handleSwitchHousehold}
      onLeave={handleLeaveHousehold}
    />
  );

  if (compact) {
    return (
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="text"
            size="sm"
            className="h-auto gap-1 px-0 py-0 text-xs font-medium [&_svg]:size-3"
          >
            {currentHouseholdName}
            <ChevronDown />
          </Button>
        </DropdownMenuTrigger>
        {menuContent}
      </DropdownMenu>
    );
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="w-full justify-between px-2 h-auto py-2">
          <span className="text-sm text-muted-foreground font-medium truncate">
            {currentHouseholdName}
          </span>
          <ChevronDown size={16} className="text-muted-foreground flex-shrink-0 ml-2" />
        </Button>
      </DropdownMenuTrigger>
      {menuContent}
    </DropdownMenu>
  );
};

export default HouseholdSwitcher;
