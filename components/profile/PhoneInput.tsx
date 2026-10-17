'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  CountryCode,
  getCountries,
  getCountryCallingCode,
  parsePhoneNumberFromString,
  AsYouType,
  isSupportedCountry,
} from 'libphonenumber-js';
import { ChevronDown, Search, X, Check, Globe } from 'lucide-react';

export interface PhoneInputMeta {
  country: CountryCode;
  countryCallingCode: string;
  nationalNumber: string;
  internationalNumber: string;
  e164: string;
  isValid: boolean;
}

export interface PhoneInputProps {
  value: string;
  onChange: (value: string, isValid: boolean, meta?: PhoneInputMeta) => void;
  defaultCountry?: CountryCode;
  id?: string;
  name?: string;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  error?: string | null;
  label?: string;
  autoFocus?: boolean;
  showValidationStatus?: boolean;
  helperText?: string;
}

interface CountryItem {
  code: CountryCode;
  name: string;
  dialCode: string;
  flag: string;
}

// Convert 2-letter ISO country code to emoji flag
function getCountryFlag(countryCode: string): string {
  return countryCode
    .toUpperCase()
    .replace(/./g, (char) => String.fromCodePoint(127397 + char.charCodeAt(0)));
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
  mobileDigits = mobileDigits.slice(0, 10);
  if (mobileDigits.length === 0) return '';
  if (mobileDigits.length <= 5) return `+91 ${mobileDigits}`;
  return `+91 ${mobileDigits.slice(0, 5)} ${mobileDigits.slice(5)}`;
}

// Popular / frequent countries for quick access
const POPULAR_COUNTRY_CODES: CountryCode[] = [
  'IN', // India
  'BD', // Bangladesh
  'NP', // Nepal
  'US', // United States
  'GB', // United Kingdom
  'AE', // UAE
  'CA', // Canada
  'AU', // Australia
  'SG', // Singapore
  'DE', // Germany
  'SA', // Saudi Arabia
  'QA', // Qatar
  'LK', // Sri Lanka
  'PK', // Pakistan
  'MY', // Malaysia
  'FR', // France
];

// Auto-detect user country from locale / timeZone, default to 'IN'
export function detectUserCountry(fallback: CountryCode = 'IN'): CountryCode {
  if (typeof window === 'undefined') return fallback;
  try {
    const navLangs = navigator.languages || [navigator.language];
    for (const lang of navLangs) {
      if (!lang) continue;
      const parts = lang.split(/[-_]/);
      if (parts.length > 1) {
        const candidate = parts[parts.length - 1].toUpperCase();
        if (candidate.length === 2 && isSupportedCountry(candidate)) {
          return candidate as CountryCode;
        }
      }
    }

    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz) {
      if (tz.includes('Kolkata') || tz.includes('Calcutta') || tz === 'Asia/Kolkata') return 'IN';
      if (tz.includes('New_York') || tz.includes('Los_Angeles') || tz.includes('Chicago')) return 'US';
      if (tz.includes('London')) return 'GB';
      if (tz.includes('Dhaka')) return 'BD';
      if (tz.includes('Kathmandu')) return 'NP';
      if (tz.includes('Dubai')) return 'AE';
      if (tz.includes('Toronto') || tz.includes('Vancouver')) return 'CA';
      if (tz.includes('Sydney') || tz.includes('Melbourne')) return 'AU';
      if (tz.includes('Singapore')) return 'SG';
    }
  } catch {
    // Fallback on error
  }
  return fallback;
}

export function PhoneInput({
  value,
  onChange,
  defaultCountry,
  id,
  name,
  placeholder,
  disabled = false,
  required = false,
  className = '',
  error,
  label,
  autoFocus = false,
  showValidationStatus = true,
  helperText,
}: PhoneInputProps) {
  // 1. Compile full list of countries once
  const allCountries: CountryItem[] = useMemo(() => {
    let regionNames: Intl.DisplayNames | null = null;
    try {
      regionNames = new Intl.DisplayNames(['en'], { type: 'region' });
    } catch {
      // Intl.DisplayNames fallback
    }

    const rawList = getCountries();
    return rawList
      .map((code) => {
        let countryName: string = code;
        try {
          if (regionNames) {
            countryName = regionNames.of(code) || code;
          }
        } catch {
          countryName = code;
        }
        let dial = '';
        try {
          dial = getCountryCallingCode(code);
        } catch {
          dial = '';
        }
        return {
          code,
          name: countryName,
          dialCode: dial,
          flag: getCountryFlag(code),
        };
      })
      .filter((c) => Boolean(c.dialCode))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, []);

  const popularCountries: CountryItem[] = useMemo(() => {
    const map = new Map<CountryCode, CountryItem>();
    allCountries.forEach((c) => map.set(c.code, c));
    return POPULAR_COUNTRY_CODES.map((code) => map.get(code)).filter(Boolean) as CountryItem[];
  }, [allCountries]);

  // 2. Active country state
  const [selectedCountry, setSelectedCountry] = useState<CountryCode>(() => {
    return defaultCountry && isSupportedCountry(defaultCountry)
      ? defaultCountry
      : 'IN';
  });

  // Client-side auto-detection if not specified
  useEffect(() => {
    if (!defaultCountry) {
      const detected = detectUserCountry('IN');
      if (detected !== selectedCountry && !value) {
        setSelectedCountry(detected);
      }
    }
  }, [defaultCountry]);

  // 3. National number string displayed inside the input box
  const [nationalInput, setNationalInput] = useState<string>('');
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const phoneInputRef = useRef<HTMLInputElement>(null);

  // Sync internal display with incoming `value` prop
  useEffect(() => {
    if (!value) {
      setNationalInput('');
      return;
    }

    const trimmed = value.trim();
    // Try to parse full number
    const parsed = parsePhoneNumberFromString(trimmed, selectedCountry);
    if (parsed) {
      if (parsed.country && parsed.country !== selectedCountry) {
        setSelectedCountry(parsed.country);
      }
      // Format national number nicely
      const formatted = new AsYouType(parsed.country || selectedCountry).input(parsed.nationalNumber);
      setNationalInput(formatted);
    } else {
      // Incomplete or raw
      // Strip out the dial code if it matches current country
      const callingCode = getCountryCallingCode(selectedCountry);
      const prefix = `+${callingCode}`;
      if (trimmed.startsWith(prefix)) {
        const remainder = trimmed.slice(prefix.length).trim();
        const formatted = new AsYouType(selectedCountry).input(remainder);
        setNationalInput(formatted);
      } else {
        const formatted = new AsYouType(selectedCountry).input(trimmed);
        setNationalInput(formatted);
      }
    }
  }, [value, selectedCountry]);

  // Active country details
  const activeCountryItem = useMemo(() => {
    return (
      allCountries.find((c) => c.code === selectedCountry) || {
        code: 'IN' as CountryCode,
        name: 'India',
        dialCode: '91',
        flag: '🇮🇳',
      }
    );
  }, [allCountries, selectedCountry]);

  // Validation status
  const validationResult = useMemo(() => {
    if (!nationalInput.trim()) {
      return { isValid: false, isEmpty: true, formatted: '', e164: '' };
    }
    const cleanDigits = nationalInput.replace(/\D/g, '');
    const fullTest = `+${activeCountryItem.dialCode}${cleanDigits}`;
    const parsed = parsePhoneNumberFromString(fullTest, selectedCountry);
    if (parsed && parsed.isValid()) {
      return {
        isValid: true,
        isEmpty: false,
        formatted: parsed.formatInternational(),
        e164: parsed.format('E.164'),
        national: parsed.nationalNumber,
      };
    }
    return {
      isValid: false,
      isEmpty: false,
      formatted: fullTest,
      e164: fullTest,
      national: cleanDigits,
    };
  }, [nationalInput, activeCountryItem.dialCode, selectedCountry]);

  // Handle typing inside national input
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;

    // If user pasted a number with '+', try parsing country from it
    if (rawVal.trim().startsWith('+')) {
      const parsed = parsePhoneNumberFromString(rawVal.trim());
      if (parsed && parsed.country) {
        setSelectedCountry(parsed.country);
        const ayt = new AsYouType(parsed.country);
        const formattedNat = ayt.input(parsed.nationalNumber);
        setNationalInput(formattedNat);

        const isValid = parsed.isValid();
        const intl = parsed.formatInternational();
        const e164 = parsed.format('E.164');

        onChange(intl, isValid, {
          country: parsed.country,
          countryCallingCode: getCountryCallingCode(parsed.country),
          nationalNumber: parsed.nationalNumber,
          internationalNumber: intl,
          e164,
          isValid,
        });
        return;
      }
    }

    // Standard national digits input
    const cleanDigits = rawVal.replace(/[^\d\s\-()]/g, '');
    const ayt = new AsYouType(selectedCountry);
    const formatted = ayt.input(cleanDigits);
    setNationalInput(formatted);

    const digitsOnly = cleanDigits.replace(/\D/g, '');
    if (!digitsOnly) {
      onChange('', false, {
        country: selectedCountry,
        countryCallingCode: activeCountryItem.dialCode,
        nationalNumber: '',
        internationalNumber: '',
        e164: '',
        isValid: false,
      });
      return;
    }

    const fullStr = `+${activeCountryItem.dialCode}${digitsOnly}`;
    const parsed = parsePhoneNumberFromString(fullStr, selectedCountry);
    const isValid = Boolean(parsed && parsed.isValid());
    const intlFormat = parsed?.isValid()
      ? parsed.formatInternational()
      : `+${activeCountryItem.dialCode} ${formatted}`;
    const e164 = parsed?.isValid() ? parsed.format('E.164') : fullStr;

    onChange(intlFormat, isValid, {
      country: selectedCountry,
      countryCallingCode: activeCountryItem.dialCode,
      nationalNumber: digitsOnly,
      internationalNumber: intlFormat,
      e164,
      isValid,
    });
  };

  // Handle selecting a country from picker
  const handleSelectCountry = useCallback(
    (country: CountryItem) => {
      setSelectedCountry(country.code);
      setIsPickerOpen(false);
      setSearchQuery('');

      // Re-evaluate with new country calling code
      const digitsOnly = nationalInput.replace(/\D/g, '');
      if (digitsOnly) {
        const ayt = new AsYouType(country.code);
        const newFormatted = ayt.input(digitsOnly);
        setNationalInput(newFormatted);

        const fullStr = `+${country.dialCode}${digitsOnly}`;
        const parsed = parsePhoneNumberFromString(fullStr, country.code);
        const isValid = Boolean(parsed && parsed.isValid());
        const intlFormat = parsed?.isValid()
          ? parsed.formatInternational()
          : `+${country.dialCode} ${newFormatted}`;
        const e164 = parsed?.isValid() ? parsed.format('E.164') : fullStr;

        onChange(intlFormat, isValid, {
          country: country.code,
          countryCallingCode: country.dialCode,
          nationalNumber: digitsOnly,
          internationalNumber: intlFormat,
          e164,
          isValid,
        });
      }

      // Re-focus phone input
      setTimeout(() => {
        phoneInputRef.current?.focus();
      }, 50);
    },
    [nationalInput, onChange]
  );

  // Focus search box when picker modal opens
  useEffect(() => {
    if (isPickerOpen) {
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isPickerOpen]);

  // Filter countries for picker search
  const filteredCountries = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return allCountries;
    return allCountries.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        c.dialCode.includes(q.replace(/^\+/, ''))
    );
  }, [allCountries, searchQuery]);

  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <label htmlFor={id} className="block text-xs font-bold text-foreground">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
      )}

      {/* Input Group */}
      <div
        className={`flex items-center rounded-xl border bg-background transition overflow-hidden shadow-2xs ${
          error
            ? 'border-rose-400 focus-within:ring-2 focus-within:ring-rose-500/20'
            : validationResult.isValid
            ? 'border-emerald-500/60 focus-within:ring-2 focus-within:ring-emerald-500/20'
            : 'border-border focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20'
        } ${disabled ? 'opacity-60 cursor-not-allowed bg-muted/30' : ''}`}
      >
        {/* Country Code Trigger Button */}
        <button
          type="button"
          disabled={disabled}
          onClick={() => setIsPickerOpen(true)}
          className="flex items-center gap-1.5 px-3 py-2.5 bg-muted/30 hover:bg-muted/70 border-r border-border text-foreground text-xs font-semibold transition shrink-0 select-none touch-target"
          aria-label={`Selected country: ${activeCountryItem.name} (+${activeCountryItem.dialCode}). Click to change.`}
          aria-haspopup="dialog"
          aria-expanded={isPickerOpen}
        >
          <span className="text-base leading-none select-none" role="img" aria-hidden="true">
            {activeCountryItem.flag}
          </span>
          <span className="font-mono text-xs font-bold text-foreground">
            +{activeCountryItem.dialCode}
          </span>
          <ChevronDown className="h-3 w-3 text-muted-foreground notranslate shrink-0" />
        </button>

        {/* National Number Input */}
        <div className="relative flex-1 flex items-center">
          <input
            ref={phoneInputRef}
            id={id}
            name={name}
            type="tel"
            inputMode="tel"
            autoComplete="tel-national"
            disabled={disabled}
            required={required}
            autoFocus={autoFocus}
            value={nationalInput}
            onChange={handleInputChange}
            placeholder={
              placeholder ||
              (selectedCountry === 'IN'
                ? '98320 12345'
                : selectedCountry === 'US'
                ? '(415) 555-2671'
                : 'Phone number')
            }
            className="w-full px-3 py-2.5 bg-transparent text-foreground text-xs font-mono placeholder:text-muted-foreground placeholder:font-sans focus:outline-none touch-target"
          />

          {/* Validation badge inside right edge */}
          {showValidationStatus && nationalInput.trim() && (
            <div className="pr-3 flex items-center pointer-events-none shrink-0">
              {validationResult.isValid ? (
                <span
                  title="Valid international phone number"
                  className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400"
                >
                  <Check className="h-3.5 w-3.5 notranslate stroke-[3]" />
                </span>
              ) : (
                <span
                  title="Incomplete or invalid phone number"
                  className="text-[10px] font-semibold text-muted-foreground font-sans"
                >
                  Incomplete
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Helper text or Error message */}
      {error ? (
        <p className="text-[11px] text-rose-500 font-semibold">{error}</p>
      ) : helperText ? (
        <p className="text-[10px] text-muted-foreground">{helperText}</p>
      ) : null}

      {/* SEARCHABLE COUNTRY PICKER MODAL */}
      {isPickerOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Select Country"
          className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-fade-in"
          onClick={() => setIsPickerOpen(false)}
        >
          <div
            className="relative w-full max-w-sm rounded-3xl bg-card border border-border shadow-2xl text-left overflow-hidden flex flex-col max-h-[82vh] animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-4 border-b border-border bg-card/95 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-xl bg-primary/10 text-primary">
                  <Globe className="h-4 w-4 notranslate" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">Select Country</h3>
                  <p className="text-[11px] text-muted-foreground">
                    Search by country name, code, or dial code
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPickerOpen(false)}
                className="p-1.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition"
                aria-label="Close country selector"
              >
                <X className="h-4 w-4 notranslate" />
              </button>
            </div>

            {/* Search Input */}
            <div className="p-3 border-b border-border bg-muted/20 shrink-0">
              <div className="relative flex items-center">
                <Search className="absolute left-3 h-3.5 w-3.5 text-muted-foreground notranslate" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search countries (e.g. India, +91, US)..."
                  className="w-full pl-8 pr-8 py-2 rounded-xl border border-border bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition"
                  >
                    <X className="h-3 w-3 notranslate" />
                  </button>
                )}
              </div>
            </div>

            {/* Scrollable Country List */}
            <div className="overflow-y-auto flex-1 divide-y divide-border/40 p-1">
              {/* Popular countries section if no search query */}
              {!searchQuery && (
                <div className="p-2 pb-3">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground px-2 pb-1.5 block">
                    Suggested &amp; Popular
                  </span>
                  <div className="grid grid-cols-1 gap-1">
                    {popularCountries.map((c) => {
                      const isSelected = c.code === selectedCountry;
                      return (
                        <button
                          key={`pop-${c.code}`}
                          type="button"
                          onClick={() => handleSelectCountry(c)}
                          className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition touch-target ${
                            isSelected
                              ? 'bg-primary/10 text-primary border border-primary/25'
                              : 'hover:bg-muted text-foreground'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 truncate">
                            <span className="text-lg leading-none" role="img" aria-hidden="true">
                              {c.flag}
                            </span>
                            <span className="truncate">{c.name}</span>
                          </div>
                          <div className="flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground">
                            <span>+{c.dialCode}</span>
                            {isSelected && <Check className="h-3.5 w-3.5 text-primary notranslate stroke-[3]" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* All countries section */}
              <div className="p-2 pt-2">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground px-2 pb-1.5 block">
                  {searchQuery ? `Search Results (${filteredCountries.length})` : 'All Countries'}
                </span>

                {filteredCountries.length === 0 ? (
                  <div className="py-8 text-center text-xs text-muted-foreground">
                    No countries matching &ldquo;{searchQuery}&rdquo;
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-1">
                    {filteredCountries.map((c) => {
                      const isSelected = c.code === selectedCountry;
                      return (
                        <button
                          key={`all-${c.code}`}
                          type="button"
                          onClick={() => handleSelectCountry(c)}
                          className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition touch-target ${
                            isSelected
                              ? 'bg-primary/10 text-primary border border-primary/25'
                              : 'hover:bg-muted text-foreground'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 truncate">
                            <span className="text-lg leading-none" role="img" aria-hidden="true">
                              {c.flag}
                            </span>
                            <span className="truncate">{c.name}</span>
                          </div>
                          <div className="flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground">
                            <span>+{c.dialCode}</span>
                            {isSelected && <Check className="h-3.5 w-3.5 text-primary notranslate stroke-[3]" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
export default PhoneInput;
