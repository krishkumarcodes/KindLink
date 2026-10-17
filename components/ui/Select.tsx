'use client';

import React, { useState, useRef, useEffect, useId, useCallback } from 'react';
import { ChevronDown, Check, Globe, Users, Lock, LucideIcon } from 'lucide-react';

export interface SelectOption<T extends string = string> {
  value: T;
  label: string;
  icon?: LucideIcon | React.ComponentType<{ className?: string }> | React.ReactNode;
  description?: string;
  disabled?: boolean;
}

export interface SelectProps<T extends string = string> {
  value: T;
  onChange: (value: T) => void;
  options: SelectOption<T>[];
  placeholder?: string;
  className?: string;
  menuClassName?: string;
  disabled?: boolean;
  'aria-label'?: string;
  id?: string;
  variant?: 'pill' | 'form';
  size?: 'sm' | 'md';
}

export function Select<T extends string = string>({
  value,
  onChange,
  options,
  placeholder = 'Select option',
  className = '',
  menuClassName = '',
  disabled = false,
  'aria-label': ariaLabel,
  id,
  variant = 'pill',
  size = 'md',
}: SelectProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listboxRef = useRef<HTMLUListElement>(null);
  const autoId = useId();
  const selectId = id || autoId;
  const listboxId = `${selectId}-listbox`;

  const selectedOption = options.find((opt) => opt.value === value);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (disabled) return;

      if (!isOpen) {
        if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown' || e.key === 'ArrowUp') {
          e.preventDefault();
          setIsOpen(true);
          const currentIndex = options.findIndex((opt) => opt.value === value);
          setFocusedIndex(currentIndex >= 0 ? currentIndex : 0);
        }
        return;
      }

      switch (e.key) {
        case 'Escape':
          e.preventDefault();
          setIsOpen(false);
          buttonRef.current?.focus();
          break;
        case 'ArrowDown': {
          e.preventDefault();
          setFocusedIndex((prev) => {
            const next = prev < options.length - 1 ? prev + 1 : 0;
            return options[next]?.disabled ? (next + 1) % options.length : next;
          });
          break;
        }
        case 'ArrowUp': {
          e.preventDefault();
          setFocusedIndex((prev) => {
            const next = prev > 0 ? prev - 1 : options.length - 1;
            return options[next]?.disabled ? (next - 1 + options.length) % options.length : next;
          });
          break;
        }
        case 'Enter':
        case ' ': {
          e.preventDefault();
          if (focusedIndex >= 0 && focusedIndex < options.length) {
            const opt = options[focusedIndex];
            if (opt && !opt.disabled) {
              onChange(opt.value);
              setIsOpen(false);
              buttonRef.current?.focus();
            }
          }
          break;
        }
        case 'Tab':
          setIsOpen(false);
          break;
      }
    },
    [disabled, isOpen, options, value, focusedIndex, onChange]
  );

  const renderIcon = (
    icon: LucideIcon | React.ComponentType<{ className?: string }> | React.ReactNode,
    iconClass = 'h-3.5 w-3.5 shrink-0'
  ) => {
    if (!icon) return null;
    if (React.isValidElement(icon)) {
      return icon;
    }
    const IconComponent = icon as React.ComponentType<{ className?: string }>;
    return <IconComponent className={`${iconClass} notranslate`} />;
  };

  const isPill = variant === 'pill';

  return (
    <div
      ref={containerRef}
      className={`relative inline-block ${!isPill ? 'w-full' : ''}`}
      onKeyDown={handleKeyDown}
    >
      {/* 
        Standardized Select Pill:
        - Height 36px (h-[36px])
        - Min 44px tap area (relative flex with before pseudo or tap padding)
        - 12px padding left and right (px-3)
        - Icon on left, text label centered, chevron exactly 8px after label
        - All elements share the exact vertical center line
      */}
      <button
        ref={buttonRef}
        id={selectId}
        type="button"
        disabled={disabled}
        onClick={() => {
          if (!disabled) {
            setIsOpen(!isOpen);
            if (!isOpen) {
              const idx = options.findIndex((opt) => opt.value === value);
              setFocusedIndex(idx >= 0 ? idx : 0);
            }
          }
        }}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={listboxId}
        aria-label={ariaLabel || (selectedOption ? selectedOption.label : placeholder)}
        className={`group relative select-none transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed ${
          isPill
            ? 'h-[36px] min-w-fit px-3 rounded-full border border-border bg-card hover:bg-muted/60 text-foreground inline-flex items-center justify-between shadow-2xs before:content-[\'\'] before:absolute before:-inset-1 before:min-h-[44px] before:min-w-[44px]'
            : 'h-[40px] w-full px-3.5 rounded-xl border border-border bg-background hover:bg-muted/30 text-foreground flex items-center justify-between shadow-2xs'
        } ${className}`}
      >
        {/* Left Side: Icon + Label vertically centered */}
        <div className="flex items-center gap-1.5 min-w-0 pr-0 leading-none">
          {selectedOption?.icon && (
            <span className="text-muted-foreground flex items-center justify-center shrink-0">
              {renderIcon(selectedOption.icon, 'h-3.5 w-3.5')}
            </span>
          )}
          <span className="text-xs font-semibold text-foreground truncate leading-none">
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </div>

        {/* Dropdown chevron placed exactly 8px (ml-2) after label */}
        <ChevronDown
          className={`h-3.5 w-3.5 text-muted-foreground shrink-0 ml-2 transition-transform duration-200 notranslate ${
            isOpen ? 'rotate-180' : ''
          }`}
          aria-hidden="true"
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <ul
          ref={listboxRef}
          id={listboxId}
          role="listbox"
          aria-label={ariaLabel || placeholder}
          tabIndex={-1}
          className={`absolute left-0 mt-1.5 z-50 min-w-[210px] max-h-[300px] overflow-y-auto rounded-2xl border border-border bg-popover/95 backdrop-blur-md p-1.5 shadow-xl animate-in fade-in zoom-in-95 duration-100 focus:outline-none ${
            isPill ? 'w-max max-w-[calc(100vw-32px)] sm:max-w-[320px]' : 'w-full'
          } ${menuClassName}`}
        >
          {options.map((option, index) => {
            const isSelected = option.value === value;
            const isFocused = index === focusedIndex;

            return (
              <li
                key={option.value}
                role="option"
                aria-selected={isSelected}
                aria-disabled={option.disabled}
                onClick={() => {
                  if (!option.disabled) {
                    onChange(option.value);
                    setIsOpen(false);
                    buttonRef.current?.focus();
                  }
                }}
                onMouseEnter={() => setFocusedIndex(index)}
                className={`relative flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer select-none transition-colors ${
                  option.disabled
                    ? 'opacity-40 cursor-not-allowed text-muted-foreground'
                    : isSelected
                    ? 'bg-primary/10 text-primary font-bold'
                    : isFocused
                    ? 'bg-muted/80 text-foreground'
                    : 'text-foreground hover:bg-muted/60'
                }`}
              >
                {/* Option Icon */}
                {option.icon && (
                  <span
                    className={`flex items-center justify-center shrink-0 ${
                      isSelected ? 'text-primary' : 'text-muted-foreground'
                    }`}
                  >
                    {renderIcon(option.icon, 'h-4 w-4')}
                  </span>
                )}

                {/* Option Content: Label + optional description */}
                <div className="flex-1 min-w-0 pr-1">
                  <div className="truncate leading-tight">{option.label}</div>
                  {option.description && (
                    <div className="text-[10px] font-normal text-muted-foreground truncate mt-0.5">
                      {option.description}
                    </div>
                  )}
                </div>

                {/* Selected Checkmark */}
                {isSelected && (
                  <Check
                    className="h-3.5 w-3.5 text-primary shrink-0 ml-auto notranslate"
                    aria-hidden="true"
                  />
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

// ============================================================================
// Specialized VisibilitySelect Component for Contact Privacy Fields
// Pre-configured with KindLink standard 3 visibility levels:
// 1. 'members': Globe icon, "KindLink members"
// 2. 'matched': Users icon, "Matched helpers only"
// 3. 'private': Lock icon, "Only me"
// ============================================================================

export type VisibilityLevel = 'members' | 'matched' | 'private';

export const VISIBILITY_OPTIONS: SelectOption<VisibilityLevel>[] = [
  {
    value: 'members',
    label: 'KindLink members',
    icon: Globe,
    description: 'Visible to all registered KindLink members',
  },
  {
    value: 'matched',
    label: 'Matched helpers only',
    icon: Users,
    description: 'Visible only when mutual request or offer is active',
  },
  {
    value: 'private',
    label: 'Only me',
    icon: Lock,
    description: 'Private to you and platform safety admins',
  },
];

export interface VisibilitySelectProps {
  value: VisibilityLevel | string;
  onChange: (val: VisibilityLevel) => void;
  'aria-label'?: string;
  id?: string;
  className?: string;
  disabled?: boolean;
}

export function VisibilitySelect({
  value,
  onChange,
  'aria-label': ariaLabel = 'Field visibility',
  id,
  className = '',
  disabled = false,
}: VisibilitySelectProps) {
  // Normalize legacy values ('public', 'all' -> 'members', 'helpers' -> 'matched')
  const normalizedValue: VisibilityLevel =
    value === 'public' || value === 'all'
      ? 'members'
      : value === 'helpers'
      ? 'matched'
      : value === 'private'
      ? 'private'
      : (value as VisibilityLevel) || 'members';

  return (
    <Select<VisibilityLevel>
      id={id}
      value={normalizedValue}
      onChange={onChange}
      options={VISIBILITY_OPTIONS}
      variant="pill"
      aria-label={ariaLabel}
      className={className}
      disabled={disabled}
    />
  );
}
