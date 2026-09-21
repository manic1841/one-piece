import React, { useEffect, useRef, useState } from 'react';

import { Check, Pencil, X } from 'lucide-react';

import { Button } from '@/ui/components/ui/button';
import { Input } from '@/ui/components/ui/input';
import { cn } from '@/ui/utils/cn';

interface InlineEditableTitleProps {
  value: string;
  onSave: (value: string) => Promise<void> | void;
  disabled?: boolean;
  className?: string;
}

export const InlineEditableTitle: React.FC<InlineEditableTitleProps> = ({
  value,
  onSave,
  disabled = false,
  className,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isEditing) {
      setDraft(value);
    }
  }, [value, isEditing]);

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing]);

  const startEditing = () => {
    if (disabled || isSaving) return;
    setDraft(value);
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setDraft(value);
    setIsEditing(false);
  };

  const saveEditing = async () => {
    const next = draft.trim();
    if (!next || next === value) {
      cancelEditing();
      return;
    }
    setIsSaving(true);
    try {
      await onSave(next);
      setIsEditing(false);
    } catch {
      setDraft(value);
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  };

  if (isEditing) {
    return (
      <span className={cn('inline-flex items-center gap-1 min-w-0', className)}>
        <Input
          ref={inputRef}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') void saveEditing();
            if (event.key === 'Escape') cancelEditing();
          }}
          disabled={isSaving}
          aria-label="Rename"
          className="h-8 max-w-56"
        />
        <Button
          variant="ghost"
          size="icon"
          onClick={() => void saveEditing()}
          disabled={isSaving || !draft.trim()}
          aria-label="Save name"
          className="h-7 w-7 shrink-0"
        >
          <Check className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={cancelEditing}
          disabled={isSaving}
          aria-label="Cancel rename"
          className="h-7 w-7 shrink-0"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </span>
    );
  }

  return (
    <span className={cn('inline-flex items-center gap-1 min-w-0', className)}>
      <span className="truncate">{value}</span>
      <Button
        variant="ghost"
        size="icon"
        onClick={startEditing}
        disabled={disabled || isSaving}
        aria-label="Edit name"
        className="h-7 w-7 shrink-0 text-muted-foreground/50 hover:text-foreground"
      >
        <Pencil className="h-3.5 w-3.5" />
      </Button>
    </span>
  );
};
