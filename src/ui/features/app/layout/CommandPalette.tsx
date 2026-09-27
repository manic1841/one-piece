import React from 'react';

import * as DialogPrimitive from '@radix-ui/react-dialog';
import { useNavigate } from 'react-router-dom';

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/ui/components/ui/command';
import {
  QUICK_ACCESS_HINT,
  QUICK_ACCESS_LABEL,
  QUICK_ACCESS_NO_RESULT,
  QUICK_ACCESS_PLACEHOLDER,
} from '@/ui/constants/app/appLabels';

import { commands } from './commands';

type CommandPaletteProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const CommandPalette: React.FC<CommandPaletteProps> = ({ open, onOpenChange }) => {
  const navigate = useNavigate();

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Title className="text-sm font-semibold tracking-heading text-foreground">
        {QUICK_ACCESS_LABEL}
      </DialogPrimitive.Title>
      <DialogPrimitive.Description className="sr-only">
        {QUICK_ACCESS_HINT}
      </DialogPrimitive.Description>
      <CommandInput placeholder={QUICK_ACCESS_PLACEHOLDER} />
      <CommandList>
        <CommandEmpty>{QUICK_ACCESS_NO_RESULT}</CommandEmpty>
        <CommandGroup>
          {commands.map((command) => (
            <CommandItem
              key={command.to}
              value={command.label}
              onSelect={() => {
                onOpenChange(false);
                navigate(command.to);
              }}
            >
              {command.label}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
};

export default CommandPalette;
