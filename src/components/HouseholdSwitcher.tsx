import { ChevronDown, Home, LogOut as LogOutIcon } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import { useAuth } from '../contexts/useAuth';
import type { Household } from '../schemas';
import { householdService } from '../services/householdService';

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
    const { currentUser, refreshProfile } = useAuth();
    const navigate = useNavigate();
    const [households, setHouseholds] = useState<Household[]>([]);
    const [loading, setLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        const fetchHouseholds = async () => {
            if (!currentUser || !isOpen) return;

            setLoading(true);
            try {
                const userHouseholds = await householdService.getUserHouseholds(currentUser.uid);
                setHouseholds(userHouseholds);
            } catch (error) {
                console.error('Error fetching households:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchHouseholds();
    }, [currentUser, isOpen]);

    const handleSwitchHousehold = async (householdId: string) => {
        if (!currentUser || householdId === currentHouseholdId) return;

        try {
            await householdService.switchHousehold(currentUser.uid, householdId);
            await refreshProfile();
            navigate('/');
            setIsOpen(false);
        } catch (error) {
            console.error('Error switching household:', error);
            alert('Failed to switch household. Please try again.');
        }
    };

    const handleLeaveHousehold = async () => {
        if (!currentUser) return;

        if (window.confirm('Are you sure you want to leave this household?')) {
            try {
                await householdService.leaveCurrentHousehold(currentUser.uid);
                await refreshProfile();
                navigate('/onboarding');
                setIsOpen(false);
            } catch (error) {
                console.error('Error leaving household:', error);
                alert('Failed to leave household. Please try again.');
            }
        }
    };

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
