'use client';

import React from 'react';

export interface SwitchProps {
  id?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  name?: string;
  className?: string;
  'aria-label'?: string;
  'aria-labelledby'?: string;
  'aria-describedby'?: string;
}

/**
 * KindLink Accessible Toggle Switch
 * Exactly 52x32px with smooth sliding knob, primary teal ON, muted gray OFF.
 * Conforms to WAI-ARIA switch pattern with keyboard (Space / Enter) support.
 */
export function Switch({
  id,
  checked,
  onCheckedChange,
  disabled = false,
  name,
  className = '',
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledby,
  'aria-describedby': ariaDescribedby,
}: SwitchProps) {
  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!disabled) {
      onCheckedChange(!checked);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return;
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      onCheckedChange(!checked);
    }
  };

  return (
    <button
      type="button"
      id={id}
      name={name}
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledby}
      aria-describedby={ariaDescribedby}
      disabled={disabled}
      tabIndex={disabled ? -1 : 0}
      onClick={handleToggle}
      onKeyDown={handleKeyDown}
      className={`
        relative inline-flex items-center shrink-0
        w-[52px] h-[32px] min-w-[52px] min-h-[32px] max-w-[52px] max-h-[32px]
        p-[4px] rounded-full cursor-pointer select-none
        transition-colors duration-200 ease-in-out
        focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        ${checked ? 'bg-primary' : 'bg-zinc-300 dark:bg-zinc-700'}
        ${className}
      `}
    >
      <span
        className={`
          pointer-events-none inline-block h-6 w-6 rounded-full bg-white shadow-md
          transform transition-transform duration-200 ease-in-out
          ${checked ? 'translate-x-5' : 'translate-x-0'}
        `}
      />
    </button>
  );
}

export interface SwitchRowProps {
  id?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  label: React.ReactNode;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
  badge?: React.ReactNode;
  children?: React.ReactNode;
}

/**
 * Full tappable row layout containing an icon, title, description, and Switch.
 * Ensures the whole row is clickable, accessible, and vertically centred.
 */
export function SwitchRow({
  id,
  checked,
  onCheckedChange,
  disabled = false,
  label,
  description,
  icon,
  className = '',
  badge,
  children,
}: SwitchRowProps) {
  const autoId = React.useId();
  const switchId = id || autoId;
  const labelId = `${switchId}-label`;
  const descId = description ? `${switchId}-desc` : undefined;

  const handleRowClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (
      target.closest('a') ||
      (target.closest('button') && !target.closest(`[role="switch"]`)) ||
      target.closest('select') ||
      target.closest('input')
    ) {
      return;
    }
    if (!disabled) {
      onCheckedChange(!checked);
    }
  };

  return (
    <div
      onClick={handleRowClick}
      role="group"
      aria-labelledby={labelId}
      className={`
        flex items-center justify-between gap-4 p-3.5 rounded-2xl
        border border-border bg-background transition-colors
        cursor-pointer select-none hover:bg-muted/40
        ${disabled ? 'opacity-60 cursor-not-allowed' : ''}
        ${className}
      `}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {icon && (
          <div className="shrink-0 p-2.5 rounded-xl bg-primary/10 text-primary notranslate flex items-center justify-center">
            {icon}
          </div>
        )}
        <div className="space-y-0.5 min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span id={labelId} className="text-xs sm:text-sm font-bold text-foreground block">
              {label}
            </span>
            {badge}
          </div>
          {description && (
            <p id={descId} className="text-[11px] sm:text-xs text-muted-foreground leading-snug">
              {description}
            </p>
          )}
          {children}
        </div>
      </div>

      <div className="shrink-0 flex items-center pl-2">
        <Switch
          id={switchId}
          checked={checked}
          onCheckedChange={onCheckedChange}
          disabled={disabled}
          aria-labelledby={labelId}
          aria-describedby={descId}
        />
      </div>
    </div>
  );
}

export default Switch;
