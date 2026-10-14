'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Camera,
  CheckCircle2,
  AlertCircle,
  Loader2,
  User,
  MapPin,
  GraduationCap,
  Phone,
  Globe,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { useKindLinkStore } from '@/lib/store/useKindLinkStore';

interface EditProfileModalProps {
  open: boolean;
  onClose: () => void;
}

const POPULAR_LANGUAGES = [
  'Bengali',
  'Hindi',
  'English',
  'Santhali',
  'Urdu',
  'Bhojpuri',
  'Maithili',
];

export function EditProfileModal({ open, onClose }: EditProfileModalProps) {
  const { userProfile, updateUserProfile } = useKindLinkStore();

  // Form states
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [college, setCollege] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [phone, setPhone] = useState('');
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
  const [customLanguage, setCustomLanguage] = useState('');

  // Username validation state
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [usernameReason, setUsernameReason] = useState<string | null>(null);

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Synchronize initial data when modal opens
  useEffect(() => {
    if (open) {
      setDisplayName(userProfile.displayName || userProfile.name || '');
      setUsername(userProfile.username || '');
      setBio(userProfile.bio || '');
      setCollege(userProfile.college || '');
      setNeighborhood(userProfile.homeNeighborhood || '');
      setPhone(userProfile.phone || '');
      setAvatarPreview(userProfile.avatarUrl || null);
      setSelectedLanguages(
        userProfile.languages && userProfile.languages.length > 0
          ? [...userProfile.languages]
          : ['Bengali', 'Hindi', 'English']
      );
      setUsernameAvailable(true);
      setUsernameReason(null);
    }
  }, [open, userProfile]);

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
      setUsernameReason('3-20 chars: must start with letter, lowercase letters, numbers, underscores');
      setIsCheckingUsername(false);
      return;
    }

    setIsCheckingUsername(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/auth/check-username?username=${encodeURIComponent(cleanUser)}`);
        const data = await res.json();
        setUsernameAvailable(data.available);
        setUsernameReason(data.available ? 'Username is available' : data.reason || 'Username is taken');
      } catch {
        setUsernameAvailable(true);
        setUsernameReason('Available');
      } finally {
        setIsCheckingUsername(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [username, userProfile.username]);

  // Indian phone number validation
  const validateIndianPhone = (num: string): boolean => {
    if (!num) return true; // Optional field or checked on submit
    const cleaned = num.replace(/[\s\-\(\)]/g, '');
    // Standard Indian phone: +91XXXXXXXXXX or 10 digits starting with 6-9
    return /^(?:\+91)?[6-9]\d{9}$/.test(cleaned);
  };

  const isPhoneValid = !phone || validateIndianPhone(phone);

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

  // Toggle languages
  const toggleLanguage = (lang: string) => {
    if (selectedLanguages.includes(lang)) {
      setSelectedLanguages(selectedLanguages.filter((l) => l !== lang));
    } else {
      setSelectedLanguages([...selectedLanguages, lang]);
    }
  };

  const handleAddCustomLanguage = (e: React.KeyboardEvent | React.MouseEvent) => {
    if ('key' in e && e.key !== 'Enter') return;
    e.preventDefault();
    const trimmed = customLanguage.trim();
    if (trimmed && !selectedLanguages.includes(trimmed)) {
      setSelectedLanguages([...selectedLanguages, trimmed]);
      setCustomLanguage('');
    }
  };

  // Save profile changes
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!displayName.trim()) {
      toast.error('Please enter your display name');
      return;
    }

    if (username.trim() && usernameAvailable === false) {
      toast.error(usernameReason || 'Please choose a valid available username');
      return;
    }

    if (phone.trim() && !validateIndianPhone(phone)) {
      toast.error('Please enter a valid 10-digit Indian phone number (starting with 6, 7, 8, or 9)');
      return;
    }

    // Normalize phone number to +91 XXXXX XXXXX if 10 digits
    let formattedPhone = phone.trim();
    const cleanDigits = formattedPhone.replace(/\D/g, '');
    if (cleanDigits.length === 10) {
      formattedPhone = `+91 ${cleanDigits.slice(0, 5)} ${cleanDigits.slice(5)}`;
    } else if (cleanDigits.length === 12 && cleanDigits.startsWith('91')) {
      formattedPhone = `+91 ${cleanDigits.slice(2, 7)} ${cleanDigits.slice(7)}`;
    }

    setIsSubmitting(true);

    const patch = {
      name: displayName.trim(),
      displayName: displayName.trim(),
      username: username.trim().toLowerCase(),
      bio: bio.trim(),
      college: college.trim(),
      homeNeighborhood: neighborhood.trim(),
      phone: formattedPhone,
      avatarUrl: avatarPreview || '',
      languages: selectedLanguages,
    };

    // 1. Update live Zustand store immediately
    updateUserProfile(patch);

    // 2. Persist to server in background if authenticated
    try {
      await fetch('/api/auth/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
    } catch {
      // Optimistic local store already updated
    }

    setIsSubmitting(false);
    toast.success('Profile updated successfully!', {
      description: 'Your changes are now live across KindLink.',
    });
    onClose();
  };

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-profile-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in overflow-y-auto"
    >
      <div className="relative w-full max-w-lg rounded-3xl bg-card border border-border p-5 sm:p-7 shadow-2xl text-left my-auto max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <User className="h-5 w-5 notranslate" />
            </div>
            <div>
              <h2 id="edit-profile-title" className="text-lg font-bold text-foreground">
                Edit Profile
              </h2>
              <p className="text-xs text-muted-foreground">
                Update your verified identity and community presence
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition touch-target"
            aria-label="Close modal"
          >
            <X className="h-5 w-5 notranslate" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto space-y-4 py-4 pr-1 flex-1">
          {/* Avatar Upload Card */}
          <div className="p-4 rounded-2xl bg-muted/40 border border-border flex flex-col sm:flex-row items-center gap-4">
            <div className="relative shrink-0">
              {avatarPreview ? (
                <img
                  src={avatarPreview}
                  alt="Profile Avatar Preview"
                  className="h-20 w-20 rounded-2xl object-cover border-2 border-primary/30 shadow-xs"
                />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-600 to-emerald-600 text-white text-2xl font-black shadow-xs">
                  {displayName.charAt(0).toUpperCase() || 'K'}
                </div>
              )}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute -bottom-1.5 -right-1.5 p-2 rounded-xl bg-primary text-white shadow-md hover:bg-primary-hover transition"
                title="Upload Photo"
                aria-label="Upload profile photo"
              >
                <Camera className="h-3.5 w-3.5 notranslate" />
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
              <h4 className="text-xs font-bold text-foreground">Profile Avatar</h4>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Upload a real photo (JPG, PNG, WebP up to 5 MB) so neighbors can recognize you during in-person handoffs.
              </p>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1 rounded-lg border border-border bg-background text-[11px] font-bold text-foreground hover:bg-muted transition"
                >
                  Choose Photo
                </button>
                {avatarPreview && (
                  <button
                    type="button"
                    onClick={handleRemoveAvatar}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold text-rose-600 hover:bg-rose-500/10 transition"
                  >
                    <Trash2 className="h-3 w-3 notranslate" />
                    <span>Remove</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Full Display Name */}
          <div>
            <label className="block text-xs font-bold text-foreground mb-1">
              Full Display Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g. Rahul Sen"
              className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 touch-target"
            />
            <p className="text-[10px] text-muted-foreground mt-1">
              Your real name shown on mutual aid requests and to matched responders.
            </p>
          </div>

          {/* Username (@handle) with Live Availability Check */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-foreground">
                Username (@handle) <span className="text-rose-500">*</span>
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

            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground text-xs font-bold notranslate">
                @
              </span>
              <input
                type="text"
                required
                value={username}
                onChange={(e) =>
                  setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))
                }
                placeholder="username"
                className={`w-full pl-8 pr-3.5 py-2.5 rounded-xl border bg-background text-foreground text-xs focus:outline-none focus:ring-2 touch-target ${
                  usernameAvailable === false
                    ? 'border-rose-400 focus:ring-rose-500/20'
                    : usernameAvailable === true
                    ? 'border-emerald-500/50 focus:ring-emerald-500/20'
                    : 'border-border focus:ring-primary/20'
                }`}
              />
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">
              3-20 characters: lowercase letters, numbers, and underscores. Unique identity on KindLink.
            </p>
          </div>

          {/* Bio */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-foreground">Community Bio</label>
              <span className="text-[10px] text-muted-foreground font-mono">
                {bio.length} / 280
              </span>
            </div>
            <textarea
              rows={3}
              maxLength={280}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell neighbors how you can help (e.g. available for blood donation, wheelchair loan, student tutoring)..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none leading-relaxed"
            />
          </div>

          {/* College / Organization (Optional) */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <GraduationCap className="h-3.5 w-3.5 text-primary notranslate" />
                <span>College / Organization</span>
                <span className="text-[10px] font-normal text-muted-foreground">(Optional)</span>
              </label>
              <span className="text-[10px] text-muted-foreground font-semibold px-2 py-0.5 rounded-md bg-muted">
                Self-reported
              </span>
            </div>
            <input
              type="text"
              value={college}
              onChange={(e) => setCollege(e.target.value)}
              placeholder="e.g. Asansol Engineering College, MAKAUT"
              className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 touch-target"
            />
          </div>

          {/* City / Area / Neighborhood */}
          <div>
            <label className="block text-xs font-bold text-foreground mb-1 flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-rose-500 notranslate" />
              <span>City / Home Neighborhood</span>
            </label>
            <input
              type="text"
              value={neighborhood}
              onChange={(e) => setNeighborhood(e.target.value)}
              placeholder="e.g. Kalyanpur, Asansol"
              className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 touch-target"
            />
            <p className="text-[10px] text-muted-foreground mt-1">
              Helps match requests within 2 to 5 km of your primary location.
            </p>
          </div>

          {/* Phone Number with Indian Format Validation */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5 text-emerald-500 notranslate" />
                <span>Phone Number</span>
              </label>
              {phone && (
                <span
                  className={`text-[10px] font-semibold ${
                    isPhoneValid ? 'text-emerald-600' : 'text-rose-600'
                  }`}
                >
                  {isPhoneValid ? '✓ Valid Indian format' : '✗ Invalid number'}
                </span>
              )}
            </div>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+91 98320 12345"
              className={`w-full px-3.5 py-2.5 rounded-xl border bg-background text-foreground text-xs font-mono focus:outline-none focus:ring-2 touch-target ${
                phone && !isPhoneValid
                  ? 'border-rose-400 focus:ring-rose-500/20'
                  : 'border-border focus:ring-primary/20'
              }`}
            />
            <p className="text-[10px] text-muted-foreground mt-1">
              Indian format (+91 XXXXX XXXXX). Required for OTP verification and emergency calls.
            </p>
          </div>

          {/* Spoken Languages */}
          <div>
            <label className="block text-xs font-bold text-foreground mb-1.5 flex items-center gap-1.5">
              <Globe className="h-3.5 w-3.5 text-primary notranslate" />
              <span>Spoken Languages</span>
            </label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {POPULAR_LANGUAGES.map((lang) => {
                const selected = selectedLanguages.includes(lang);
                return (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => toggleLanguage(lang)}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition touch-target ${
                      selected
                        ? 'bg-primary text-white shadow-xs'
                        : 'bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80 border border-border/80'
                    }`}
                  >
                    {selected ? `✓ ${lang}` : `+ ${lang}`}
                  </button>
                );
              })}
            </div>

            {/* Add custom language input */}
            <div className="flex gap-2">
              <input
                type="text"
                value={customLanguage}
                onChange={(e) => setCustomLanguage(e.target.value)}
                onKeyDown={handleAddCustomLanguage}
                placeholder="Add other language (e.g. Nepali)..."
                className="flex-1 px-3 py-1.5 rounded-xl border border-border bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              <button
                type="button"
                onClick={handleAddCustomLanguage}
                className="px-3 py-1.5 rounded-xl bg-background border border-border hover:bg-muted text-xs font-bold text-primary transition"
              >
                Add
              </button>
            </div>
          </div>
        </form>

        {/* Modal Actions Footer */}
        <div className="pt-4 border-t border-border flex items-center justify-end gap-3 shrink-0">
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
            disabled={isSubmitting || (username.trim() !== '' && usernameAvailable === false) || !isPhoneValid}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold shadow-soft transition touch-target disabled:opacity-50"
          >
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin notranslate" />}
            <span>{isSubmitting ? 'Saving Changes...' : 'Save Profile'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
