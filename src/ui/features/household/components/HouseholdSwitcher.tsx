import React, { useState } from 'react';
import { ChevronDown, Home, LogOut as LogOutIcon } from 'lucide-react';
import { Button } from '@/ui/components/ui/button';
import { useHouseholdSwitcher } from '@/ui/features/household/hooks/useHouseholdSwitcher';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/ui/components/ui/dropdown-menu';

interface HouseholdSwitcherProps {
  currentHouseholdId?: string;
  currentHouseholdName: string;
  compact?: boolean;
}

const HouseholdSwitcher: React.FC<HouseholdSwitcherProps> = ({
  currentHouseholdId,
  currentHouseholdName,
  compact = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const { households, loading, handleSwitchHousehold, handleLeaveHousehold } =
    useHouseholdSwitcher(currentHouseholdId, isOpen, setIsOpen);

  if (compact) {
    return (
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <button className="text-left flex items-center gap-1 hover:opacity-80 transition-opacity">
            <p className="text-xs text-gray-600 font-medium">{currentHouseholdName}</p>
            <ChevronDown size={12} className="text-gray-400" />
          </button>
        </DropdownMenuTrigger>
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
                  onClick={() => handleSwitchHousehold(household.id)}
                  className={household.id === currentHouseholdId ? 'bg-blue-50' : ''}
                >
                  <Home size={16} className="mr-2" />
                  {household.name}
                  {household.id === currentHouseholdId && (
                    <span className="ml-auto text-xs text-blue-600">Current</span>
                  )}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLeaveHousehold} className="text-red-600">
                <LogOutIcon size={16} className="mr-2" />
                Leave Household
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="w-full justify-between px-2 h-auto py-2">
          <span className="text-sm text-gray-600 font-medium truncate">{currentHouseholdName}</span>
          <ChevronDown size={16} className="text-gray-400 flex-shrink-0 ml-2" />
        </Button>
      </DropdownMenuTrigger>
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
                onClick={() => handleSwitchHousehold(household.id)}
                className={household.id === currentHouseholdId ? 'bg-blue-50' : ''}
              >
                <Home size={16} className="mr-2" />
                {household.name}
                {household.id === currentHouseholdId && (
                  <span className="ml-auto text-xs text-blue-600">Current</span>
                )}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLeaveHousehold} className="text-red-600">
              <LogOutIcon size={16} className="mr-2" />
              Leave Household
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default HouseholdSwitcher;
