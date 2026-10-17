'use client';

import React from 'react';
import { Phone, CheckCircle2, AlertCircle } from 'lucide-react';

export interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  error?: string;
  id?: string;
  name?: string;
  className?: string;
  required?: boolean;
  autoFocus?: boolean;
  onBlur?: () => void;
}

/**
 * Validates whether string is a valid Indian mobile number:
 * 10 digits starting with 6, 7, 8, or 9.
 */
export function isValidIndianPhone(phone: string): boolean {
  if (!phone) return false;
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) {
    return /^[6-9]\d{9}$/.test(digits);
  }
  if (digits.length === 12 && digits.startsWith('91')) {
    return /^[6-9]\d{9}$/.test(digits.slice(2));
  }
  return false;
}

/**
 * Formats phone string into standard display: +91 XXXXX XXXXX
 */
export function formatIndianPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  let mobileDigits = digits;
  if (digits.length > 10 && digits.startsWith('91')) {
    mobileDigits = digits.slice(2);
  }
  // Max 10 mobile digits
  mobileDigits = mobileDigits.slice(0, 10);

  if (mobileDigits.length === 0) return '';
  if (mobileDigits.length <= 5) return `+91 ${mobileDigits}`;
  return `+91 ${mobileDigits.slice(0, 5)} ${mobileDigits.slice(5)}`;
}

export function PhoneInput({
  value,
  onChange,
  disabled = false,
  placeholder = '98320 12345',
  error,
  id = 'phone-input',
  name = 'phone',
  className = '',
  required = false,
  autoFocus = false,
  onBlur,
}: PhoneInputProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputVal = e.target.value;
    const formatted = formatIndianPhone(inputVal);
    onChange(formatted);
  };

  const isValid = isValidIndianPhone(value);
  const showValidation = value.trim().length > 0;

  return (
    <div className={`space-y-1.5 ${className}`}>
      <div className="relative flex items-center">
        {/* Country Prefix Pill */}
        <div className="absolute left-3 flex items-center gap-1.5 pointer-events-none select-none text-xs font-semibold text-foreground/80 border-r border-border pr-2.5">
          <span className="text-base leading-none" role="img" aria-label="India flag">
            🇮🇳
          </span>
          <span className="font-mono text-xs">+91</span>
        </div>

        {/* Number Input */}
        <input
          id={id}
          name={name}
          type="tel"
          inputMode="numeric"
          autoComplete="tel"
          disabled={disabled}
          autoFocus={autoFocus}
          required={required}
          value={value.replace(/^\+91\s?/, '')}
          onChange={handleChange}
          onBlur={onBlur}
          placeholder={placeholder}
          aria-invalid={error ? 'true' : 'false'}
          className={`w-full pl-[76px] pr-10 py-2.5 rounded-xl border bg-background text-foreground text-xs font-mono transition-colors focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed touch-target ${
            error
              ? 'border-rose-500 focus:ring-rose-500/20'
              : showValidation && isValid
              ? 'border-emerald-500/80 focus:ring-emerald-500/20'
              : showValidation && !isValid
              ? 'border-amber-500/80 focus:ring-amber-500/20'
              : 'border-border focus:ring-primary/20'
          }`}
        />

        {/* Right status icon */}
        <div className="absolute right-3 flex items-center pointer-events-none">
          {showValidation ? (
            isValid ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-500 notranslate animate-fade-in" />
            ) : (
              <AlertCircle className="h-4 w-4 text-amber-500 notranslate animate-fade-in" />
            )
          ) : (
            <Phone className="h-3.5 w-3.5 text-muted-foreground/50 notranslate" />
          )}
        </div>
      </div>

      {error ? (
        <p className="text-[11px] font-medium text-rose-500 flex items-center gap-1">
          <AlertCircle className="h-3 w-3 shrink-0" />
          <span>{error}</span>
        </p>
      ) : showValidation && !isValid ? (
        <p className="text-[11px] text-amber-600 dark:text-amber-400">
          Enter a valid 10-digit Indian phone number starting with 6, 7, 8, or 9
        </p>
      ) : null}
    </div>
  );
}

export default PhoneInput;
