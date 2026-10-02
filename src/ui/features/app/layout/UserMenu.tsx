import { LogOut, Settings } from 'lucide-react';

import { Avatar } from '@/ui/components/Avatar';
import { Button } from '@/ui/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/ui/components/ui/dropdown-menu';

type UserMenuProps = {
  /** Display name; the avatar falls back to its initials when no photo is set. */
  name: string;
  photoURL?: string;
  onSettings: () => void;
  onLogout: () => void;
};

const initialsFrom = (name: string): string =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

/** App-chrome identity menu: avatar trigger + the two identity actions. */
export const UserMenu: React.FC<UserMenuProps> = ({ name, photoURL, onSettings, onLogout }) => (
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button variant="ghost" size="icon" aria-label="Avatar" className="shrink-0">
        <Avatar size="sm" initials={initialsFrom(name)} src={photoURL} alt="" />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end">
      <DropdownMenuItem
        onClick={onSettings}
        className="text-muted-foreground hover:bg-accent hover:text-foreground"
      >
        <Settings size={16} />
        Settings
      </DropdownMenuItem>
      <DropdownMenuItem
        onClick={onLogout}
        className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
      >
        <LogOut size={16} />
        Logout
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
);
