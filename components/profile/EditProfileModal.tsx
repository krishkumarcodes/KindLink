'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  X,
  Camera,
  CheckCircle2,
  AlertCircle,
  Loader2,
  User,
  MapPin,
  Building2,
  Phone,
  Mail,
  Globe,
  Trash2,
  Eye,
  EyeOff,
  Quote,
  Navigation,
  Compass,
  Search,
  Lock,
  Users,
  ShieldCheck,
  Check,
  ChevronDown,
  Plus,
} from 'lucide-react';
import { toast } from 'sonner';
import { useKindLinkStore } from '@/lib/store/useKindLinkStore';
import { FieldVisibility, ProfileVisibilitySettings } from '@/lib/data/types';
import dynamic from 'next/dynamic';

const PhoneInput = dynamic(
  () => import('./PhoneInput').then((mod) => mod.PhoneInput),
  {
    ssr: false,
    loading: () => <div className="h-12 w-full animate-pulse bg-muted rounded-xl" />,
  }
);
import {
  INDIAN_LANGUAGES,
  INTERNATIONAL_LANGUAGES,
  SUPPORTED_LANGUAGES,
  getLanguageDisplay,
  LanguageOption,
} from '@/lib/translate/googleTranslate';

interface EditProfileModalProps {
  open: boolean;
  onClose: () => void;
}


interface GeocodeItem {
  id: string;
  name: string;
  displayName: string;
  suburb?: string;
  city?: string;
  state?: string;
}

export function EditProfileModal({ open, onClose }: EditProfileModalProps) {
  const { userProfile, updateUserProfile, setUserCoords } = useKindLinkStore();

  // Form states
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [organization, setOrganization] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [phone, setPhone] = useState('');
  const [isPhoneValid, setIsPhoneValid] = useState(true);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
  const [isLanguagePickerOpen, setIsLanguagePickerOpen] = useState(false);
  const [pickerSearch, setPickerSearch] = useState('');
  const [customLanguage, setCustomLanguage] = useState('');

  // Visibility settings
  const [visibility, setVisibility] = useState<ProfileVisibilitySettings>({
    phone: 'helpers',
    email: 'private',
    organisation: 'public',
    area: 'public',
  });

  // UI state toggles
  const [showBioPreview, setShowBioPreview] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [addressSuggestions, setAddressSuggestions] = useState<GeocodeItem[]>([]);
  const [isSearchingAddress, setIsSearchingAddress] = useState(false);
  const [showAddressDropdown, setShowAddressDropdown] = useState(false);

  // Username validation state
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [usernameReason, setUsernameReason] = useState<string | null>(null);

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const addressContainerRef = useRef<HTMLDivElement>(null);

  // Synchronize initial data when modal opens
  useEffect(() => {
    if (open) {
      setDisplayName(userProfile.displayName || userProfile.name || '');
      setUsername(userProfile.username || '');
      setBio(userProfile.bio || '');
      setOrganization(userProfile.college || '');
      setNeighborhood(userProfile.homeNeighborhood || '');
      setPhone(userProfile.phone || '');
      setAvatarPreview(userProfile.avatarUrl || null);
      const rawLangs =
        userProfile.languages && userProfile.languages.length > 0
          ? userProfile.languages
          : ['Bengali', 'Hindi', 'English'];
      const normalized = rawLangs.map((item) => {
        const match = SUPPORTED_LANGUAGES.find(
          (l) =>
            l.name.toLowerCase() === item.toLowerCase() ||
            l.code.toLowerCase() === item.toLowerCase()
        );
        return match ? match.code : item;
      });
      setSelectedLanguages(normalized);
      setVisibility({
        phone: userProfile.visibility?.phone || 'helpers',
        email: userProfile.visibility?.email || 'private',
        organisation: userProfile.visibility?.organisation || 'public',
        area: userProfile.visibility?.area || 'public',
      });
      setUsernameAvailable(true);
      setUsernameReason(null);
      setShowBioPreview(false);
      setShowAddressDropdown(false);
      setAddressSuggestions([]);
    }
  }, [open, userProfile]);


  // Preserve window.scrollY across modal open and close
  useEffect(() => {
    if (!open) return;
    const savedScrollY = typeof window !== 'undefined' ? window.scrollY : 0;
    return () => {
      if (typeof window !== 'undefined' && window.scrollY !== savedScrollY) {
        window.scrollTo({ top: savedScrollY, behavior: 'instant' as ScrollBehavior });
      }
    };
  }, [open]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  // Click outside address suggestions dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        addressContainerRef.current &&
        !addressContainerRef.current.contains(e.target as Node)
      ) {
        setShowAddressDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced username availability check
  useEffect(() => {
    const cleanUser = username.trim().toLowerCase();
    if (!cleanUser) {
      setUsernameAvailable(null);
      setUsernameReason(null);
      setIsCheckingUsername(false);
      return;
    }

    // If matches user's current username, it's valid
    if (userProfile.username && cleanUser === userProfile.username.toLowerCase()) {
      setUsernameAvailable(true);
      setUsernameReason('Your current username');
      setIsCheckingUsername(false);
      return;
    }

    // Format regex check: lowercase letter start, 3-20 chars alphanumeric + underscore
    if (!/^[a-z][a-z0-9_]{2,19}$/.test(cleanUser)) {
      setUsernameAvailable(false);
      setUsernameReason('3-20 chars: start with letter, lowercase letters, numbers, underscores');
      setIsCheckingUsername(false);
      return;
    }

    setIsCheckingUsername(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/auth/check-username?username=${encodeURIComponent(cleanUser)}`
        );
        const data = await res.json();
        setUsernameAvailable(data.available);
        setUsernameReason(
          data.available ? 'Username is available' : data.reason || 'Username is taken'
        );
      } catch {
        setUsernameAvailable(true);
        setUsernameReason('Available');
      } finally {
        setIsCheckingUsername(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [username, userProfile.username]);

  // Address search autocomplete debounced
  const handleNeighborhoodChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setNeighborhood(val);

    if (!val.trim() || val.trim().length < 2) {
      setAddressSuggestions([]);
      setShowAddressDropdown(false);
      return;
    }

    setShowAddressDropdown(true);
  };

  useEffect(() => {
    if (!showAddressDropdown || !neighborhood.trim() || neighborhood.trim().length < 2) {
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingAddress(true);
      try {
        const res = await fetch(
          `/api/maps/geocode?query=${encodeURIComponent(neighborhood.trim())}&type=autocomplete&limit=5`
        );
        if (res.ok) {
          const data = await res.json();
          setAddressSuggestions(data.results || []);
        }
      } catch {
        // geocode search fallback
      } finally {
        setIsSearchingAddress(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [neighborhood, showAddressDropdown]);

  // Live GPS geolocation handler
  const handleUseLiveLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const res = await fetch(`/api/maps/reverse?lat=${latitude}&lng=${longitude}`);
          if (res.ok) {
            const data = await res.json();
            const place = data.result || (data.results && data.results[0]);
            if (place) {
              const locName = place.suburb
                ? `${place.suburb}, ${place.city || place.state || ''}`
                : place.displayName || place.name;
              const cleanLoc = locName.replace(/,\s*$/, '').trim();
              setNeighborhood(cleanLoc);
              setUserCoords({ lat: latitude, lng: longitude, isLive: true }, cleanLoc);
              toast.success('Live location updated successfully');
            } else {
              toast.success('Location coordinates retrieved');
              setUserCoords({ lat: latitude, lng: longitude, isLive: true });
            }
          }
        } catch {
          toast.error('Could not reverse-geocode your GPS position');
        } finally {
          setIsLocating(false);
        }
      },
      (err) => {
        setIsLocating(false);
        toast.error(
          err.code === 1
            ? 'Location permission denied. Please allow location access.'
            : 'Could not fetch current GPS location.'
        );
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Avatar file handling
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file (PNG, JPG, or WEBP)');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Avatar file size must be under 5 MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const result = uploadEvent.target?.result as string;
      setAvatarPreview(result);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveAvatar = () => {
    setAvatarPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Toggle languages (normalizes to language code when supported)
  const toggleLanguage = (codeOrName: string) => {
    const match = SUPPORTED_LANGUAGES.find(
      (l) =>
        l.code.toLowerCase() === codeOrName.toLowerCase() ||
        l.name.toLowerCase() === codeOrName.toLowerCase()
    );
    const code = match ? match.code : codeOrName;

    if (
      selectedLanguages.some(
        (l) =>
          l.toLowerCase() === code.toLowerCase() ||
          (match && l.toLowerCase() === match.name.toLowerCase())
      )
    ) {
      setSelectedLanguages(
        selectedLanguages.filter(
          (l) =>
            l.toLowerCase() !== code.toLowerCase() &&
            (!match || l.toLowerCase() !== match.name.toLowerCase())
        )
      );
    } else {
      setSelectedLanguages([...selectedLanguages, code]);
    }
  };

  const handleAddCustomLanguage = (e: React.KeyboardEvent | React.MouseEvent) => {
    if ('key' in e && e.key !== 'Enter') return;
    e.preventDefault();
    const trimmed = customLanguage.trim();
    if (!trimmed) return;
    const match = SUPPORTED_LANGUAGES.find(
      (l) =>
        l.name.toLowerCase() === trimmed.toLowerCase() ||
        l.code.toLowerCase() === trimmed.toLowerCase()
    );
    const codeToSave = match ? match.code : trimmed;
    if (
      !selectedLanguages.some(
        (l) =>
          l.toLowerCase() === codeToSave.toLowerCase() ||
          (match && l.toLowerCase() === match.name.toLowerCase())
      )
    ) {
      setSelectedLanguages([...selectedLanguages, codeToSave]);
    }
    setCustomLanguage('');
  };

  // Filter languages for the searchable picker sheet
  const pickerFilteredIndian = useMemo(() => {
    const q = pickerSearch.trim().toLowerCase();
    if (!q) return INDIAN_LANGUAGES;
    return INDIAN_LANGUAGES.filter(
      (l) =>
        l.name.toLowerCase().includes(q) ||
        l.nativeName.toLowerCase().includes(q) ||
        l.code.toLowerCase().includes(q)
    );
  }, [pickerSearch]);

  const pickerFilteredIntl = useMemo(() => {
    const q = pickerSearch.trim().toLowerCase();
    if (!q) return INTERNATIONAL_LANGUAGES;
    return INTERNATIONAL_LANGUAGES.filter(
      (l) =>
        l.name.toLowerCase().includes(q) ||
        l.nativeName.toLowerCase().includes(q) ||
        l.code.toLowerCase().includes(q)
    );
  }, [pickerSearch]);


  // Save profile changes
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const cleanName = displayName.trim();
    if (!cleanName || cleanName.length < 2) {
      toast.error('Display name must be at least 2 characters');
      return;
    }

    if (cleanName.length > 60) {
      toast.error('Display name cannot exceed 60 characters');
      return;
    }

    if (username.trim() && usernameAvailable === false) {
      toast.error(usernameReason || 'Please choose a valid available username');
      return;
    }

    if (phone.trim() && !isPhoneValid) {
      toast.error('Please enter a valid complete phone number or leave it blank');
      return;
    }

    if (bio.length > 500) {
      toast.error('Bio cannot exceed 500 characters');
      return;
    }

    setIsSubmitting(true);

    const patch = {
      name: cleanName,
      displayName: cleanName,
      username: username.trim().toLowerCase(),
      bio: bio.trim(),
      college: organization.trim(),
      homeNeighborhood: neighborhood.trim(),
      phone: phone.trim(),
      avatarUrl: avatarPreview || '',
      languages: selectedLanguages,
      visibility,
    };

    // 1. Optimistic local store update
    updateUserProfile(patch);

    // 2. Persist to server API
    try {
      await fetch('/api/auth/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
    } catch {
      // Local optimistic store already updated
    }

    setIsSubmitting(false);
    toast.success('Profile updated successfully!', {
      description: 'Your changes are now live across KindLink.',
    });
    onClose();
  };

  const isFormValid =
    displayName.trim().length >= 2 &&
    displayName.trim().length <= 60 &&
    (username.trim() === '' || usernameAvailable !== false) &&
    (!phone.trim() || isPhoneValid) &&
    bio.length <= 500;

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-profile-title"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
    >
      <div className="relative w-full sm:max-w-2xl bg-card border-t sm:border border-border rounded-t-3xl sm:rounded-3xl shadow-2xl text-left max-h-[92vh] sm:max-h-[88vh] flex flex-col overflow-hidden">
        {/* Mobile drag pill indicator */}
        <div className="sm:hidden mx-auto my-2 w-12 h-1.5 rounded-full bg-muted-foreground/30 shrink-0" />

        {/* STICKY HEADER */}
        <div className="shrink-0 px-5 sm:px-6 py-4 border-b border-border bg-card flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary shrink-0">
              <User className="h-5 w-5 notranslate" />
            </div>
            <div>
              <h2 id="edit-profile-title" className="text-base sm:text-lg font-bold text-foreground">
                Edit Profile
              </h2>
              <p className="text-xs text-muted-foreground">
                Update your verified identity, bio, and community presence
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition touch-target"
            aria-label="Close modal"
          >
            <X className="h-5 w-5 notranslate" />
          </button>
        </div>

        {/* INNER SCROLLING FORM CONTENT */}
        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 px-5 sm:px-6 py-5 space-y-6">
          {/* =========================================================================
              SECTION 1: PHOTO
             ========================================================================= */}
          <div className="space-y-2">
            <h3 className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
              Profile Photo
            </h3>
            <div className="p-4 rounded-2xl bg-muted/30 border border-border flex flex-col sm:flex-row items-center gap-4">
              {/* Square Preview */}
              <div className="relative shrink-0">
                {avatarPreview ? (
                  <img
                    src={avatarPreview}
                    alt="Profile Avatar Preview"
                    className="w-24 h-24 rounded-2xl object-cover border-2 border-primary/30 shadow-md"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-teal-600 to-emerald-600 text-white text-3xl font-black shadow-md flex items-center justify-center select-none">
                    {displayName.charAt(0).toUpperCase() || 'K'}
                  </div>
                )}
                {/* Perfect circle camera badge (40px with 3px ring-background, 44px tap target area, centered on corner) */}
                <button
                  type="button"
                  role="button"
                  tabIndex={0}
                  onClick={() => fileInputRef.current?.click()}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      fileInputRef.current?.click();
                    }
                  }}
                  className="absolute bottom-0 right-0 translate-x-1/4 translate-y-1/4 min-w-[44px] min-h-[44px] p-0.5 flex items-center justify-center rounded-full group focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 z-10"
                  title="Upload Photo"
                  aria-label="Upload profile photo"
                >
                  <div className="w-10 h-10 rounded-full bg-primary hover:bg-primary-hover text-white shadow-md ring-[3px] ring-background flex items-center justify-center transition-transform active:scale-95 group-hover:scale-105">
                    <Camera className="w-[18px] h-[18px] notranslate" />
                  </div>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
              </div>

              <div className="space-y-1.5 text-center sm:text-left flex-1">
                <h4 className="text-xs font-bold text-foreground">Square Photo Preview</h4>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Upload a clear photo (JPG, PNG, WebP under 5 MB) so community members can
                  recognize you during handoffs and volunteer matches.
                </p>
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 rounded-xl border border-border bg-background text-xs font-bold text-foreground hover:bg-muted transition touch-target"
                  >
                    Choose Photo
                  </button>
                  {avatarPreview && (
                    <button
                      type="button"
                      onClick={handleRemoveAvatar}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 transition touch-target"
                    >
                      <Trash2 className="h-3.5 w-3.5 notranslate" />
                      <span>Remove Photo</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* =========================================================================
              SECTION 2: BASICS
             ========================================================================= */}
          <div className="space-y-4">
            <h3 className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
              Basics
            </h3>

            {/* Full Display Name */}
            <div>
              <div className="flex items-baseline justify-between mb-1.5">
                <label htmlFor="profile-display-name" className="text-xs font-bold text-foreground">
                  Full Display Name <span className="text-rose-500 font-bold">*</span>
                </label>
                <span className="text-[10px] text-muted-foreground font-mono">
                  {displayName.length} / 60
                </span>
              </div>
              <input
                id="profile-display-name"
                type="text"
                required
                maxLength={60}
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g. Rahul Sen"
                className={`w-full px-3.5 py-2.5 rounded-xl border bg-background text-foreground text-xs focus:outline-none focus:ring-2 touch-target ${
                  displayName.trim().length > 0 && displayName.trim().length < 2
                    ? 'border-rose-400 focus:ring-rose-500/20'
                    : 'border-border focus:ring-primary/20'
                }`}
              />
              {displayName.trim().length > 0 && displayName.trim().length < 2 && (
                <p className="text-[10px] text-rose-500 font-semibold mt-1.5 px-0.5">
                  Display name must be between 2 and 60 characters.
                </p>
              )}
              <p className="text-[10px] text-muted-foreground mt-1.5 px-0.5">
                Your real name displayed to neighbors and matched emergency responders.
              </p>
            </div>

            {/* Username (@handle) with perfectly centered '@' input addon */}
            <div>
              <div className="flex items-baseline justify-between mb-1.5">
                <label htmlFor="profile-username" className="text-xs font-bold text-foreground">
                  Username (@handle) <span className="text-rose-500 font-bold">*</span>
                </label>
                {isCheckingUsername && (
                  <span className="flex items-center gap-1 text-[10px] text-muted-foreground font-semibold">
                    <Loader2 className="h-3 w-3 animate-spin notranslate" />
                    <span>Checking availability...</span>
                  </span>
                )}
                {!isCheckingUsername && username && usernameAvailable === true && (
                  <span className="flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                    <CheckCircle2 className="h-3 w-3 notranslate" />
                    <span>{usernameReason || 'Available'}</span>
                  </span>
                )}
                {!isCheckingUsername && username && usernameAvailable === false && (
                  <span className="flex items-center gap-1 text-[10px] text-rose-600 dark:text-rose-400 font-semibold">
                    <AlertCircle className="h-3 w-3 notranslate" />
                    <span>{usernameReason || 'Unavailable'}</span>
                  </span>
                )}
              </div>

              {/* Flex input addon with 0px baseline misalignment */}
              <div
                className={`flex items-center w-full h-11 rounded-xl border bg-background overflow-hidden transition ${
                  usernameAvailable === false
                    ? 'border-rose-400 focus-within:ring-2 focus-within:ring-rose-500/20'
                    : usernameAvailable === true
                    ? 'border-emerald-500/50 focus-within:ring-2 focus-within:ring-emerald-500/20'
                    : 'border-border focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20'
                }`}
              >
                <span className="flex items-center leading-none text-muted-foreground select-none pl-3 pr-1.5 font-mono text-xs font-semibold shrink-0 h-full">
                  @
                </span>
                <input
                  id="profile-username"
                  type="text"
                  required
                  maxLength={20}
                  value={username}
                  onChange={(e) =>
                    setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))
                  }
                  placeholder="username"
                  className="w-full h-full py-0 pr-3.5 bg-transparent text-foreground text-xs font-mono focus:outline-none leading-none touch-target"
                />
              </div>
              <p className="text-[10px] text-muted-foreground mt-1.5 px-0.5">
                3-20 characters: lowercase letters, numbers, and underscores. Your unique handle on
                KindLink.
              </p>
            </div>
          </div>

          {/* =========================================================================
              SECTION 3: ABOUT
             ========================================================================= */}
          <div className="space-y-3">
            <h3 className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
              About
            </h3>

            {/* Label, Character Counter, and Preview Toggle aligned on same baseline */}
            <div>
              <div className="flex items-baseline justify-between mb-1.5">
                <label htmlFor="profile-bio" className="text-xs font-bold text-foreground">
                  Community Bio
                </label>
                <div className="flex items-baseline gap-3 text-xs">
                  <span className="text-[10px] text-muted-foreground font-mono">
                    {bio.length} / 500
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowBioPreview(!showBioPreview)}
                    className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline touch-target"
                  >
                    {showBioPreview ? (
                      <>
                        <EyeOff className="h-3.5 w-3.5 notranslate self-center" />
                        <span>Edit Bio</span>
                      </>
                    ) : (
                      <>
                        <Eye className="h-3.5 w-3.5 notranslate self-center" />
                        <span>Preview Bio</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {showBioPreview ? (
                <div className="p-4 rounded-2xl bg-muted/40 border border-border space-y-2 animate-fade-in">
                  <div className="flex items-center justify-between text-xs font-bold text-foreground">
                    <span className="flex items-center gap-1.5">
                      <Quote className="h-4 w-4 text-primary notranslate shrink-0" />
                      <span>Profile Bio Preview</span>
                    </span>
                    <span className="text-[10px] text-muted-foreground font-normal">
                      How neighbors see you
                    </span>
                  </div>
                  <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap">
                    {bio.trim() || (
                      <span className="italic text-muted-foreground">
                        No bio written yet. Share what community skills, equipment loans, or assistance
                        you can offer!
                      </span>
                    )}
                  </p>
                </div>
              ) : (
                <>
                  <textarea
                    id="profile-bio"
                    rows={3}
                    maxLength={500}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Tell neighbors how you can help (e.g. available for blood donation, wheelchair loan, student tutoring, emergency rides)..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none leading-relaxed touch-target"
                  />
                  <p className="text-[10px] text-muted-foreground mt-1.5 px-0.5">
                    Max 500 characters. Toggle Preview anytime to check how it looks on your public card.
                  </p>
                </>
              )}
            </div>
          </div>

          {/* =========================================================================
              SECTION 4: CONTACT & VISIBILITY
             ========================================================================= */}
          <div className="space-y-4">
            <h3 className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
              Contact &amp; Privacy
            </h3>

            {/* Phone with international PhoneInput component */}
            <div className="space-y-2">
              <PhoneInput
                id="profile-phone"
                label="Phone Number"
                value={phone}
                onChange={(val, valid) => {
                  setPhone(val);
                  setIsPhoneValid(valid);
                }}
                helperText="International format with country code picker. Used for OTP verification, emergency SOS, and responder calls."
              />

              {/* Visibility Selector for Phone */}
              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                  <Lock className="h-3 w-3 notranslate" />
                  <span>Phone Visibility:</span>
                </span>
                <div className="relative inline-flex items-center">
                  <select
                    aria-label="Phone number visibility"
                    value={visibility.phone || 'helpers'}
                    onChange={(e) =>
                      setVisibility({ ...visibility, phone: e.target.value as FieldVisibility })
                    }
                    className="appearance-none pl-3 pr-7 py-1 rounded-full border border-border bg-muted/50 hover:bg-muted text-foreground text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer transition text-left"
                  >
                    <option value="public">Public (Everyone)</option>
                    <option value="helpers">Helpers &amp; Matches only</option>
                    <option value="private">Private (Only Me &amp; SOS)</option>
                  </select>
                  <ChevronDown className="absolute right-2 h-3.5 w-3.5 text-muted-foreground pointer-events-none shrink-0 notranslate" />
                </div>
              </div>
            </div>

            {/* Email (Read-Only) */}
            <div className="space-y-2">
              <div>
                <label className="block text-xs font-bold text-foreground mb-1 flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-primary notranslate" />
                  <span>Email Address</span>
                </label>
                <input
                  type="email"
                  readOnly
                  disabled
                  value={userProfile.email || 'user@example.com'}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-muted/40 text-muted-foreground text-xs cursor-not-allowed select-none"
                />
                <p className="text-[10px] text-muted-foreground mt-1">
                  Email address is linked to your authentication provider and cannot be edited
                  directly.
                </p>
              </div>

              {/* Visibility Selector for Email */}
              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                  <Lock className="h-3 w-3 notranslate" />
                  <span>Email Visibility:</span>
                </span>
                <div className="relative inline-flex items-center">
                  <select
                    aria-label="Email address visibility"
                    value={visibility.email || 'private'}
                    onChange={(e) =>
                      setVisibility({ ...visibility, email: e.target.value as FieldVisibility })
                    }
                    className="appearance-none pl-3 pr-7 py-1 rounded-full border border-border bg-muted/50 hover:bg-muted text-foreground text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer transition text-left"
                  >
                    <option value="public">Public (Everyone)</option>
                    <option value="helpers">Helpers &amp; Matches only</option>
                    <option value="private">Private (Only Me)</option>
                  </select>
                  <ChevronDown className="absolute right-2 h-3.5 w-3.5 text-muted-foreground pointer-events-none shrink-0 notranslate" />
                </div>
              </div>
            </div>

            {/* Organisation (Optional) */}
            <div className="space-y-2">
              <div>
                <label
                  htmlFor="profile-organization"
                  className="block text-xs font-bold text-foreground mb-1 flex items-center gap-1.5"
                >
                  <Building2 className="h-3.5 w-3.5 text-primary notranslate" />
                  <span>Organisation / Affiliation</span>
                  <span className="text-[10px] font-normal text-muted-foreground">(Optional)</span>
                </label>
                <input
                  id="profile-organization"
                  type="text"
                  maxLength={100}
                  value={organization}
                  onChange={(e) => setOrganization(e.target.value)}
                  placeholder="e.g. Rotary Club, District Hospital, Community Welfare Society"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 touch-target"
                />
              </div>

              {/* Visibility Selector for Organisation */}
              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                  <Lock className="h-3 w-3 notranslate" />
                  <span>Organisation Visibility:</span>
                </span>
                <div className="relative inline-flex items-center">
                  <select
                    aria-label="Organisation visibility"
                    value={visibility.organisation || 'public'}
                    onChange={(e) =>
                      setVisibility({
                        ...visibility,
                        organisation: e.target.value as FieldVisibility,
                      })
                    }
                    className="appearance-none pl-3 pr-7 py-1 rounded-full border border-border bg-muted/50 hover:bg-muted text-foreground text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer transition text-left"
                  >
                    <option value="public">Public (Everyone)</option>
                    <option value="helpers">Helpers only</option>
                    <option value="private">Private (Only Me)</option>
                  </select>
                  <ChevronDown className="absolute right-2 h-3.5 w-3.5 text-muted-foreground pointer-events-none shrink-0 notranslate" />
                </div>
              </div>
            </div>

            {/* Area / Neighbourhood with Live Location & Geocoding Autocomplete */}
            <div className="space-y-2" ref={addressContainerRef}>
              <div className="flex items-center justify-between mb-1">
                <label
                  htmlFor="profile-neighborhood"
                  className="text-xs font-bold text-foreground flex items-center gap-1.5"
                >
                  <MapPin className="h-3.5 w-3.5 text-rose-500 notranslate" />
                  <span>Area / Home Neighbourhood</span>
                </label>
                <button
                  type="button"
                  onClick={handleUseLiveLocation}
                  disabled={isLocating}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary/10 text-primary text-[11px] font-bold hover:bg-primary/20 transition touch-target disabled:opacity-50"
                >
                  {isLocating ? (
                    <Loader2 className="h-3 w-3 animate-spin notranslate" />
                  ) : (
                    <Compass className="h-3 w-3 notranslate" />
                  )}
                  <span>{isLocating ? 'Locating...' : 'Use my live location'}</span>
                </button>
              </div>

              <div className="relative">
                <input
                  id="profile-neighborhood"
                  type="text"
                  maxLength={120}
                  value={neighborhood}
                  onChange={handleNeighborhoodChange}
                  onFocus={() => {
                    if (addressSuggestions.length > 0) setShowAddressDropdown(true);
                  }}
                  placeholder="e.g. Kalyanpur, Asansol or search neighborhood..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 touch-target"
                />

                {isSearchingAddress && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground notranslate" />
                  </div>
                )}

                {/* Suggestions dropdown from /api/maps/geocode */}
                {showAddressDropdown && addressSuggestions.length > 0 && (
                  <div className="absolute z-20 top-full left-0 right-0 mt-1 rounded-2xl bg-card border border-border shadow-xl overflow-hidden py-1 divide-y divide-border/40">
                    {addressSuggestions.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setNeighborhood(item.displayName || item.name);
                          setShowAddressDropdown(false);
                        }}
                        className="w-full text-left px-3.5 py-2 hover:bg-muted text-xs text-foreground flex items-center gap-2 transition"
                      >
                        <MapPin className="h-3.5 w-3.5 text-primary shrink-0 notranslate" />
                        <span className="truncate">{item.displayName || item.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <p className="text-[10px] text-muted-foreground">
                Matches community help requests within 2 to 5 km of your primary neighborhood.
              </p>

              {/* Visibility Selector for Area (Label and arrow centered in a compact pill) */}
              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                  <Lock className="h-3 w-3 notranslate" />
                  <span>Area Visibility:</span>
                </span>
                <div className="relative inline-flex items-center">
                  <select
                    aria-label="Area visibility"
                    value={visibility.area || 'public'}
                    onChange={(e) =>
                      setVisibility({ ...visibility, area: e.target.value as FieldVisibility })
                    }
                    className="appearance-none pl-3 pr-7 py-1 rounded-full border border-border bg-muted/50 hover:bg-muted text-foreground text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer transition text-left"
                  >
                    <option value="public">Public (Everyone)</option>
                    <option value="helpers">Helpers &amp; Matches only</option>
                    <option value="private">Private (Only Me)</option>
                  </select>
                  <ChevronDown className="absolute right-2 h-3.5 w-3.5 text-muted-foreground pointer-events-none shrink-0 notranslate" />
                </div>
              </div>
            </div>
          </div>

          {/* =========================================================================
              SECTION 5: LANGUAGES SPOKEN
             ========================================================================= */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Globe className="h-3.5 w-3.5 text-primary notranslate" />
                <span>Languages Spoken ({selectedLanguages.length})</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsLanguagePickerOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 text-xs font-bold transition touch-target"
              >
                <Plus className="h-3.5 w-3.5 notranslate" />
                <span>Add language</span>
              </button>
            </div>

            {/* Active selected languages chips (Full names and native script) */}
            {selectedLanguages.length > 0 ? (
              <div className="flex flex-wrap gap-2 p-3 rounded-2xl bg-muted/30 border border-border">
                {selectedLanguages.map((codeOrName) => {
                  const info = getLanguageDisplay(codeOrName);
                  return (
                    <span
                      key={`sel-${info.code}`}
                      className="inline-flex items-center gap-2 pl-3 pr-2 py-1.5 rounded-xl bg-card border border-border/80 text-foreground text-xs font-semibold shadow-2xs group hover:border-primary/40 transition"
                    >
                      <span className="flex flex-col min-w-0">
                        <strong className="font-bold text-foreground leading-tight">{info.name}</strong>
                        {info.nativeName !== info.name && (
                          <span className="text-[10px] text-muted-foreground leading-tight font-normal" translate="no">
                            {info.nativeName}
                          </span>
                        )}
                      </span>
                      <button
                        type="button"
                        onClick={() => toggleLanguage(codeOrName)}
                        className="p-1 rounded-lg text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 transition"
                        aria-label={`Remove ${info.name}`}
                      >
                        <X className="h-3.5 w-3.5 notranslate" />
                      </button>
                    </span>
                  );
                })}
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-muted/20 border border-dashed border-border text-center space-y-2">
                <p className="text-xs text-muted-foreground">No languages selected yet.</p>
                <button
                  type="button"
                  onClick={() => setIsLanguagePickerOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-hover transition shadow-xs"
                >
                  <Plus className="h-3.5 w-3.5 notranslate" />
                  <span>Add language</span>
                </button>
              </div>
            )}
          </div>
        </form>

        {/* STICKY FOOTER (Solid bg-card) */}
        <div className="shrink-0 px-5 sm:px-6 py-4 border-t border-border bg-card flex items-center justify-end gap-3 z-10">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2.5 rounded-xl border border-border text-xs font-bold hover:bg-muted transition touch-target disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || !isFormValid}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold shadow-soft transition touch-target disabled:opacity-50"
          >
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin notranslate" />}
            <span>{isSubmitting ? 'Saving Profile...' : 'Save Profile'}</span>
          </button>
        </div>

        {/* SEARCHABLE LANGUAGE PICKER SHEET */}
        {isLanguagePickerOpen && (
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Add Languages"
            className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
            onClick={() => setIsLanguagePickerOpen(false)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="relative w-full sm:max-w-md max-h-[85vh] sm:max-h-[80vh] rounded-t-3xl sm:rounded-3xl bg-card border border-border shadow-2xl flex flex-col overflow-hidden text-card-foreground"
            >
              {/* Picker Header */}
              <div className="p-4 border-b border-border bg-card flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-primary/10 text-primary">
                    <Globe className="h-4 w-4 notranslate" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-foreground">Add Languages Spoken</h3>
                    <p className="text-[11px] text-muted-foreground">
                      Select languages or add custom dialects
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsLanguagePickerOpen(false)}
                  className="p-1.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition"
                  aria-label="Close language picker"
                >
                  <X className="h-4 w-4 notranslate" />
                </button>
              </div>

              {/* Search Bar */}
              <div className="p-3 border-b border-border bg-muted/20 shrink-0">
                <div className="flex items-center h-11 w-full px-3 rounded-xl bg-background border border-border focus-within:ring-2 focus-within:ring-primary/20 gap-2">
                  <Search className="h-4 w-4 text-muted-foreground shrink-0 notranslate" />
                  <input
                    type="text"
                    value={pickerSearch}
                    onChange={(e) => setPickerSearch(e.target.value)}
                    placeholder="Search languages (Hindi, Santali, Spanish)..."
                    className="flex-1 h-full bg-transparent text-xs text-foreground placeholder:text-muted-foreground focus:outline-none"
                  />
                  {pickerSearch && (
                    <button
                      type="button"
                      onClick={() => setPickerSearch('')}
                      className="p-1 text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-3 w-3 notranslate" />
                    </button>
                  )}
                </div>
              </div>

              {/* Grouped Languages List */}
              <div className="overflow-y-auto flex-1 p-3 space-y-4 overscroll-contain">
                {/* Indian Languages */}
                {pickerFilteredIndian.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="px-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      Indian Languages ({pickerFilteredIndian.length})
                    </div>
                    <div className="grid grid-cols-1 gap-1">
                      {pickerFilteredIndian.map((l) => {
                        const isSelected =
                          selectedLanguages.some(
                            (item) =>
                              item.toLowerCase() === l.code.toLowerCase() ||
                              item.toLowerCase() === l.name.toLowerCase()
                          );
                        return (
                          <button
                            key={`pick-${l.code}`}
                            type="button"
                            onClick={() => toggleLanguage(l.code)}
                            className={`flex items-center justify-between p-2.5 rounded-xl text-left transition text-xs font-semibold ${
                              isSelected
                                ? 'bg-primary/10 text-primary border border-primary/25'
                                : 'hover:bg-muted text-foreground border border-transparent'
                            }`}
                          >
                            <div className="min-w-0 flex flex-col">
                              <span className="font-bold leading-tight">{l.name}</span>
                              {l.nativeName !== l.name && (
                                <span className="text-[10px] text-muted-foreground font-normal" translate="no">
                                  {l.nativeName}
                                </span>
                              )}
                            </div>
                            {isSelected ? (
                              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-white">
                                <Check className="h-3 w-3 stroke-[3] notranslate" />
                              </div>
                            ) : (
                              <div className="h-5 w-5 rounded-full border border-border" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* International Languages */}
                {pickerFilteredIntl.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="px-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      International Languages ({pickerFilteredIntl.length})
                    </div>
                    <div className="grid grid-cols-1 gap-1">
                      {pickerFilteredIntl.map((l) => {
                        const isSelected =
                          selectedLanguages.some(
                            (item) =>
                              item.toLowerCase() === l.code.toLowerCase() ||
                              item.toLowerCase() === l.name.toLowerCase()
                          );
                        return (
                          <button
                            key={`pick-${l.code}`}
                            type="button"
                            onClick={() => toggleLanguage(l.code)}
                            className={`flex items-center justify-between p-2.5 rounded-xl text-left transition text-xs font-semibold ${
                              isSelected
                                ? 'bg-primary/10 text-primary border border-primary/25'
                                : 'hover:bg-muted text-foreground border border-transparent'
                            }`}
                          >
                            <div className="min-w-0 flex flex-col">
                              <span className="font-bold leading-tight">{l.name}</span>
                              {l.nativeName !== l.name && (
                                <span className="text-[10px] text-muted-foreground font-normal" translate="no">
                                  {l.nativeName}
                                </span>
                              )}
                            </div>
                            {isSelected ? (
                              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-white">
                                <Check className="h-3 w-3 stroke-[3] notranslate" />
                              </div>
                            ) : (
                              <div className="h-5 w-5 rounded-full border border-border" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Add custom dialect / other language input */}
                <div className="pt-2 border-t border-border/60 space-y-1.5">
                  <label className="text-[11px] font-bold text-muted-foreground px-1 block">
                    Add Other Language / Dialect
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={customLanguage}
                      onChange={(e) => setCustomLanguage(e.target.value)}
                      onKeyDown={handleAddCustomLanguage}
                      placeholder="e.g. Marwari, Bhojpuri, Angika..."
                      className="flex-1 px-3 py-2 rounded-xl border border-border bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                    <button
                      type="button"
                      onClick={handleAddCustomLanguage}
                      disabled={!customLanguage.trim()}
                      className="px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-hover transition disabled:opacity-40"
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>

              {/* Picker Footer */}
              <div className="p-3 border-t border-border bg-card flex items-center justify-between shrink-0">
                <span className="text-xs text-muted-foreground font-semibold px-1">
                  {selectedLanguages.length} selected
                </span>
                <button
                  type="button"
                  onClick={() => setIsLanguagePickerOpen(false)}
                  className="px-5 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold transition shadow-xs"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

export default EditProfileModal;
