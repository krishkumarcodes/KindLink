'use client';

import React, { useState } from 'react';
import {
  Heart,
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  ArrowRight,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  ShieldCheck,
  UserPlus,
  LogIn,
  Phone,
  KeyRound,
  UserCheck,
  HelpCircle,
  Shield,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useKindLinkStore } from '@/lib/store/useKindLinkStore';
import { UserProfile, VerificationState } from '@/lib/data/types';
import { toast } from 'sonner';

interface InlineAuthCardProps {
  onAuthSuccess?: () => void;
}

export function InlineAuthCard({ onAuthSuccess }: InlineAuthCardProps) {
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>('login');

  // Login form state
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Signup form state
  const [signupDisplayName, setSignupDisplayName] = useState('');
  const [signupUsername, setSignupUsername] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirmPassword, setSignupConfirmPassword] = useState('');
  const [signupPhone, setSignupPhone] = useState('');
  const [showSignupPassword, setShowSignupPassword] = useState(false);

  // Status state
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const supabase = createClient();

  // Helper to load profile from public.profiles table and update Zustand store
  const syncProfileToStore = async (userId: string, emailFallback?: string) => {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (profile) {
        const mappedProfile: UserProfile = {
          id: profile.id,
          name: profile.display_name || profile.username || 'Community Member',
          username: profile.username || '',
          displayName: profile.display_name || profile.username || 'Community Member',
          email: emailFallback || '',
          phone: profile.phone || '',
          college: 'Asansol Community Hub',
          avatarUrl: '',
          homeNeighborhood: 'Asansol',
          languages: ['Bengali', 'Hindi', 'English'],
          emergencyContacts: [],
          rating: Number(profile.rating_average) || 5.0,
          ratingCount: profile.rating_count || 0,
          helpsCount: profile.rating_count || 0,
          requestsCount: 0,
          hoursVolunteered: 0,
          kilometersTraveled: 0,
          verificationState: (profile.verification_status as VerificationState) || 'unverified',
          idDocumentName: '',
          idDocumentType: '',
          badges: profile.verification_status === 'verified' ? ['Verified', 'Community Member'] : ['Community Member'],
          emailVerified: true,
          phoneVerified: !!profile.phone,
          preferred_language: profile.preferred_language || 'en',
        };
        useKindLinkStore.setState({ userProfile: mappedProfile });
      }
    } catch (err) {
      console.warn('Failed to sync profile to store:', err);
    }
  };

  // Demo account profiles
  const DEMO_ACCOUNTS = [
    {
      role: 'Verified Volunteer',
      badge: 'Responder',
      badgeColor: 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/30',
      username: 'kind_volunteer',
      email: 'volunteer@kindlink.demo',
      fallbackEmail: 'kind_volunteer@kindlink.demo',
      password: 'KindLink#Volunteer2026',
      fallbackPassword: 'KindLink#2026',
      desc: 'Dr. Ananya Roy • Emergency medical aid responder',
      icon: UserCheck,
    },
    {
      role: 'Citizen Requester',
      badge: 'Need Aid',
      badgeColor: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30',
      username: 'need_aid',
      email: 'requester@kindlink.demo',
      fallbackEmail: 'need_aid@kindlink.demo',
      password: 'KindLink#Requester2026',
      fallbackPassword: 'KindLink#2026',
      desc: 'Sourav Mukherjee • Critical blood & medicine requests',
      icon: HelpCircle,
    },
    {
      role: 'Platform Admin',
      badge: 'Super Admin',
      badgeColor: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30',
      username: 'admin_kindlink',
      email: 'admin@kindlink.demo',
      fallbackEmail: 'admin_kindlink@kindlink.demo',
      password: 'KindLink#Admin2026',
      fallbackPassword: 'KindLink#2026',
      desc: 'Full administrative moderation & verification access',
      icon: Shield,
    },
  ];

  // Quick fill demo credentials
  const handleSelectDemo = (acc: (typeof DEMO_ACCOUNTS)[0], autoSubmit = false) => {
    setActiveTab('login');
    setLoginIdentifier(acc.username);
    setLoginPassword(acc.password);
    setErrorMsg(null);
    setSuccessMsg(null);

    toast.info(`Loaded demo account: @${acc.username}`, {
      description: `Populated credentials (${acc.role}). ${autoSubmit ? 'Signing in...' : 'Click Sign In or Quick Sign In.'}`,
    });

    if (autoSubmit) {
      executeLogin(acc.username, acc.password);
    }
  };

  // Harmonized login executor (supports username resolution and secondary password auto-try)
  const executeLogin = async (identifierInput: string, passwordInput: string) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);

    const cleanId = identifierInput.trim();
    if (!cleanId || !passwordInput) {
      setErrorMsg('Please enter your email or username and password');
      setLoading(false);
      return;
    }

    try {
      let candidateEmails: string[] = [];

      // Known showcase demo credentials quick map
      const showcaseMap: Record<string, { primary: string; aliases: string[] }> = {
        kind_volunteer: {
          primary: 'volunteer@kindlink.demo',
          aliases: ['volunteer@kindlink.demo', 'kind_volunteer@kindlink.demo'],
        },
        need_aid: {
          primary: 'requester@kindlink.demo',
          aliases: ['requester@kindlink.demo', 'need_aid@kindlink.demo', 'patient@kindlink.demo'],
        },
        admin_kindlink: {
          primary: 'admin@kindlink.demo',
          aliases: ['admin@kindlink.demo', 'admin_kindlink@kindlink.demo'],
        },
      };

      // 1. Resolve identifier to candidate email(s)
      if (cleanId.includes('@')) {
        const lowerEmail = cleanId.toLowerCase();
        candidateEmails.push(lowerEmail);

        // Check if entered email matches any known demo account aliases
        for (const info of Object.values(showcaseMap)) {
          if (info.aliases.includes(lowerEmail)) {
            for (const alias of info.aliases) {
              if (!candidateEmails.includes(alias)) candidateEmails.push(alias);
            }
          }
        }
      } else {
        const lowerUser = cleanId.toLowerCase();

        // Attempt 1: Query Supabase RPC get_email_by_username
        try {
          const { data: rpcEmail, error: rpcErr } = await supabase.rpc('get_email_by_username', {
            p_username: lowerUser,
          });
          if (!rpcErr && rpcEmail && typeof rpcEmail === 'string' && rpcEmail.trim()) {
            candidateEmails.push(rpcEmail.trim().toLowerCase());
          }
        } catch {
          // Handled
        }

        // Attempt 2: Direct public.profiles lookup
        if (candidateEmails.length === 0) {
          try {
            const { data: profile } = await supabase
              .from('profiles')
              .select('email')
              .ilike('username', lowerUser)
              .maybeSingle();

            if (profile && (profile as any).email) {
              candidateEmails.push((profile as any).email.toLowerCase());
            }
          } catch {
            // Handled
          }
        }

        // Attempt 3: Backend identifier resolver endpoint
        if (candidateEmails.length === 0) {
          try {
            const res = await fetch(`/api/auth/resolve-identifier?username=${encodeURIComponent(lowerUser)}`);
            if (res.ok) {
              const data = await res.json();
              if (data.email && !candidateEmails.includes(data.email.toLowerCase())) {
                candidateEmails.push(data.email.toLowerCase());
              }
              if (data.fallbackEmail && !candidateEmails.includes(data.fallbackEmail.toLowerCase())) {
                candidateEmails.push(data.fallbackEmail.toLowerCase());
              }
            }
          } catch {
            // Handled
          }
        }

        // Attempt 4: Static showcase demo credentials map
        if (showcaseMap[lowerUser]) {
          const { primary, aliases } = showcaseMap[lowerUser];
          if (!candidateEmails.includes(primary)) candidateEmails.push(primary);
          for (const alias of aliases) {
            if (!candidateEmails.includes(alias)) candidateEmails.push(alias);
          }
        }

        if (candidateEmails.length === 0) {
          const err = 'No KindLink account found matching this username. Please verify or use your registered email address.';
          setErrorMsg(err);
          toast.error('Account Not Found', { description: err });
          setLoading(false);
          return;
        }
      }

      // 2. Candidate passwords (seamless primary & secondary demo password support)
      const candidatePasswords: string[] = [passwordInput];
      const lowerInput = cleanId.toLowerCase();
      const isVolunteer = lowerInput === 'kind_volunteer' || candidateEmails.some((e) => e.includes('volunteer'));
      const isRequester = lowerInput === 'need_aid' || candidateEmails.some((e) => e.includes('requester') || e.includes('need_aid'));
      const isAdmin = lowerInput === 'admin_kindlink' || candidateEmails.some((e) => e.includes('admin'));

      if (isVolunteer) {
        if (!candidatePasswords.includes('KindLink#Volunteer2026')) candidatePasswords.push('KindLink#Volunteer2026');
        if (!candidatePasswords.includes('KindLink#2026')) candidatePasswords.push('KindLink#2026');
      } else if (isRequester) {
        if (!candidatePasswords.includes('KindLink#Requester2026')) candidatePasswords.push('KindLink#Requester2026');
        if (!candidatePasswords.includes('KindLink#2026')) candidatePasswords.push('KindLink#2026');
      } else if (isAdmin) {
        if (!candidatePasswords.includes('KindLink#Admin2026')) candidatePasswords.push('KindLink#Admin2026');
        if (!candidatePasswords.includes('KindLink#2026')) candidatePasswords.push('KindLink#2026');
      } else if (passwordInput === 'KindLink#2026' || passwordInput.startsWith('KindLink#')) {
        if (!candidatePasswords.includes('KindLink#2026')) candidatePasswords.push('KindLink#2026');
      }

      // 3. Attempt authentication across candidate email & password pairs
      let authenticatedUser: any = null;
      let authenticatedEmail = '';
      let lastErrorMessage = '';

      for (const email of candidateEmails) {
        if (authenticatedUser) break;
        for (const pass of candidatePasswords) {
          const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email,
            password: pass,
          });

          if (!signInError && signInData?.user) {
            authenticatedUser = signInData.user;
            authenticatedEmail = email;
            break;
          }

          if (signInError) {
            lastErrorMessage = signInError.message;
          }
        }
      }

      // 4. Fallback to server route /api/auth/login if client-side signIn encountered issues
      if (!authenticatedUser) {
        try {
          const apiRes = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ identifier: cleanId, password: passwordInput }),
          });
          const apiData = await apiRes.json();
          if (apiRes.ok && apiData.success && apiData.user) {
            authenticatedUser = apiData.user;
            authenticatedEmail = candidateEmails[0] || '';
            if (apiData.session?.access_token && apiData.session?.refresh_token) {
              await supabase.auth.setSession({
                access_token: apiData.session.access_token,
                refresh_token: apiData.session.refresh_token,
              });
            }
          } else if (apiRes.status === 429) {
            lastErrorMessage = apiData.error || 'Too many login attempts. Please wait a few minutes before trying again.';
          }
        } catch {
          // Handled
        }
      }

      if (authenticatedUser) {
        await syncProfileToStore(authenticatedUser.id, authenticatedEmail);
        setSuccessMsg('Signed in successfully!');
        toast.success('Signed in successfully!', {
          description: 'Welcome to KindLink Mutual Aid Network.',
        });
        onAuthSuccess?.();
      } else {
        const errorDesc = lastErrorMessage || 'Incorrect email/username or password. Please try again.';
        setErrorMsg(errorDesc);
        toast.error('Authentication Failed', { description: errorDesc });
      }
    } catch (err: any) {
      const generalErr = err?.message || 'Authentication failed. Please try again.';
      setErrorMsg(generalErr);
      toast.error('Authentication Error', { description: generalErr });
    } finally {
      setLoading(false);
    }
  };

  // Handle Sign In form submit
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await executeLogin(loginIdentifier, loginPassword);
  };

  // Handle Sign Up
  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);

    const cleanUsername = signupUsername.trim().toLowerCase();
    const cleanEmail = signupEmail.trim().toLowerCase();
    const cleanDisplayName = signupDisplayName.trim() || cleanUsername;
    const cleanPhone = signupPhone.trim();

    if (!cleanEmail || !cleanUsername || !signupPassword) {
      setErrorMsg('Please fill in all required fields');
      setLoading(false);
      return;
    }

    if (signupPassword !== signupConfirmPassword) {
      setErrorMsg('Passwords do not match');
      setLoading(false);
      return;
    }

    if (signupPassword.length < 8) {
      setErrorMsg('Password must be at least 8 characters long');
      setLoading(false);
      return;
    }

    if (!/^[a-z][a-z0-9_]{2,19}$/.test(cleanUsername)) {
      setErrorMsg(
        'Username must start with a letter, contain 3-20 characters (letters, numbers, underscores)'
      );
      setLoading(false);
      return;
    }

    try {
      // 1. Create account via supabase.auth.signUp
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: cleanEmail,
        password: signupPassword,
        options: {
          data: {
            username: cleanUsername,
            display_name: cleanDisplayName,
          },
        },
      });

      if (signUpError) {
        // Fallback to server route /api/auth/signup if client signup encounters issues
        const apiRes = await fetch('/api/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: cleanEmail,
            username: cleanUsername,
            password: signupPassword,
            confirmPassword: signupConfirmPassword,
            displayName: cleanDisplayName,
          }),
        });

        const apiData = await apiRes.json();
        if (!apiRes.ok || !apiData.success) {
          setErrorMsg(apiData.error || signUpError.message || 'Failed to create account');
          setLoading(false);
          return;
        }

        if (apiData.user?.id) {
          await syncProfileToStore(apiData.user.id, cleanEmail);
          onAuthSuccess?.();
          return;
        }
      }

      // 2. Insert/Upsert into public.profiles
      if (signUpData?.user) {
        const { error: profileError } = await supabase.from('profiles').upsert(
          {
            id: signUpData.user.id,
            username: cleanUsername,
            display_name: cleanDisplayName,
            phone: cleanPhone || null,
            role: 'user',
            verification_status: 'unverified',
          },
          { onConflict: 'id' }
        );

        if (profileError) {
          console.warn('Profile upsert warning:', profileError);
        }

        // 3. If session established immediately (auto-confirm enabled)
        if (signUpData.session) {
          await syncProfileToStore(signUpData.user.id, cleanEmail);
          onAuthSuccess?.();
          return;
        } else {
          // If email confirmation is required by Supabase settings
          setSuccessMsg(
            'Account created successfully! Please check your email or sign in below.'
          );
          setActiveTab('login');
          setLoginIdentifier(cleanUsername);
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An unexpected error occurred during signup');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-lg mx-auto">
      {/* Brand Header */}
      <div className="text-center mb-6 space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-600 dark:text-teal-400 text-xs font-semibold mb-1 shadow-sm">
          <Sparkles className="h-3.5 w-3.5" />
          <span>Realtime Community Trust Network</span>
        </div>
        <div className="flex items-center justify-center gap-2.5">
          <div className="inline-flex items-center justify-center h-12 w-12 rounded-2xl bg-gradient-to-br from-teal-600 to-emerald-600 text-white shadow-lg shadow-teal-900/30">
            <Heart className="h-6 w-6 fill-white" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
            Kind<span className="text-teal-500 dark:text-teal-400">Link</span>
          </h2>
        </div>
        <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto">
          Community-powered mutual aid & emergency response. Free, peer-to-peer, verified.
        </p>
      </div>

      {/* Main Auth Container Card */}
      <div className="rounded-3xl border border-border/80 dark:border-slate-800 bg-card dark:bg-slate-900/90 p-6 sm:p-8 shadow-soft space-y-6 relative overflow-hidden backdrop-blur-xl">
        {/* Subtle top edge glow highlight */}
        <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-teal-500/40 to-transparent pointer-events-none" />

        {/* Tab Switcher */}
        <div className="grid grid-cols-2 p-1.5 rounded-2xl bg-muted/60 dark:bg-slate-950/80 border border-border/80 dark:border-slate-800/80 gap-1">
          <button
            type="button"
            onClick={() => {
              setActiveTab('login');
              setErrorMsg(null);
            }}
            className={`min-h-[44px] flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 active:scale-[0.98] ${
              activeTab === 'login'
                ? 'bg-gradient-to-r from-teal-600 to-emerald-600 text-white shadow-lg shadow-teal-900/30 hover:-translate-y-0.5'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
            }`}
          >
            <LogIn className="h-4 w-4 shrink-0" />
            <span>Sign In</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('signup');
              setErrorMsg(null);
            }}
            className={`min-h-[44px] flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 active:scale-[0.98] ${
              activeTab === 'signup'
                ? 'bg-gradient-to-r from-teal-600 to-emerald-600 text-white shadow-lg shadow-teal-900/30 hover:-translate-y-0.5'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
            }`}
          >
            <UserPlus className="h-4 w-4 shrink-0" />
            <span>Create Account</span>
          </button>
        </div>

        {/* Feedback Alerts */}
        {errorMsg && (
          <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs sm:text-sm flex items-start gap-2.5 animate-in fade-in duration-150 shadow-sm">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span className="flex-1 font-medium">{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs sm:text-sm flex items-start gap-2.5 animate-in fade-in duration-150 shadow-sm">
            <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
            <span className="flex-1 font-medium">{successMsg}</span>
          </div>
        )}

        {/* 1. LOGIN TAB */}
        {activeTab === 'login' && (
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-foreground mb-1.5 uppercase tracking-wider">
                Email or Username
              </label>
              <div className="relative group">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-teal-500 transition-colors duration-200 pointer-events-none" />
                <input
                  type="text"
                  required
                  autoComplete="username"
                  value={loginIdentifier}
                  onChange={(e) => setLoginIdentifier(e.target.value)}
                  placeholder="name@example.com or username"
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-border/80 dark:border-slate-800 bg-background dark:bg-slate-950/70 text-foreground placeholder-muted-foreground/60 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-500/80 transition-all duration-200 min-h-[44px]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-foreground mb-1.5 uppercase tracking-wider">
                Password
              </label>
              <div className="relative group">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-teal-500 transition-colors duration-200 pointer-events-none" />
                <input
                  type={showLoginPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-11 py-3 rounded-xl border border-border/80 dark:border-slate-800 bg-background dark:bg-slate-950/70 text-foreground placeholder-muted-foreground/60 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-500/80 transition-all duration-200 min-h-[44px]"
                />
                <button
                  type="button"
                  onClick={() => setShowLoginPassword(!showLoginPassword)}
                  className="absolute right-1 top-1/2 -translate-y-1/2 min-h-[44px] min-w-[44px] flex items-center justify-center text-muted-foreground hover:text-foreground focus:outline-none focus:ring-2 focus:ring-teal-500/40 rounded-lg transition-colors"
                  aria-label={showLoginPassword ? 'Hide password' : 'Show password'}
                >
                  {showLoginPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full min-h-[48px] h-12 py-3.5 px-4 rounded-xl bg-gradient-to-r from-teal-600 via-teal-500 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 hover:-translate-y-0.5 active:scale-[0.98] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-teal-900/30 transition-all duration-200 disabled:opacity-50 touch-target cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <span>Sign In to KindLink</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>
        )}

        {/* 2. SIGNUP TAB */}
        {activeTab === 'signup' && (
          <form onSubmit={handleSignupSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-foreground mb-1.5 uppercase tracking-wider">
                  Full Name
                </label>
                <div className="relative group">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-teal-500 transition-colors duration-200 pointer-events-none" />
                  <input
                    type="text"
                    required
                    value={signupDisplayName}
                    onChange={(e) => setSignupDisplayName(e.target.value)}
                    placeholder="e.g. Ananya Roy"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border/80 dark:border-slate-800 bg-background dark:bg-slate-950/70 text-foreground placeholder-muted-foreground/60 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-500/80 transition-all duration-200 min-h-[44px]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground mb-1.5 uppercase tracking-wider">
                  Username
                </label>
                <input
                  type="text"
                  required
                  value={signupUsername}
                  onChange={(e) => setSignupUsername(e.target.value)}
                  placeholder="ananya_roy"
                  className="w-full px-4 py-2.5 rounded-xl border border-border/80 dark:border-slate-800 bg-background dark:bg-slate-950/70 text-foreground placeholder-muted-foreground/60 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-500/80 transition-all duration-200 min-h-[44px]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-foreground mb-1.5 uppercase tracking-wider">
                Email Address
              </label>
              <div className="relative group">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-teal-500 transition-colors duration-200 pointer-events-none" />
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={signupEmail}
                  onChange={(e) => setSignupEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border/80 dark:border-slate-800 bg-background dark:bg-slate-950/70 text-foreground placeholder-muted-foreground/60 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-500/80 transition-all duration-200 min-h-[44px]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-foreground mb-1.5 uppercase tracking-wider">
                  Password (min 8)
                </label>
                <div className="relative group">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-teal-500 transition-colors duration-200 pointer-events-none" />
                  <input
                    type={showSignupPassword ? 'text' : 'password'}
                    required
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-11 py-2.5 rounded-xl border border-border/80 dark:border-slate-800 bg-background dark:bg-slate-950/70 text-foreground placeholder-muted-foreground/60 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-500/80 transition-all duration-200 min-h-[44px]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSignupPassword(!showSignupPassword)}
                    className="absolute right-1 top-1/2 -translate-y-1/2 min-h-[44px] min-w-[44px] flex items-center justify-center text-muted-foreground hover:text-foreground focus:outline-none focus:ring-2 focus:ring-teal-500/40 rounded-lg transition-colors"
                    aria-label="Toggle password view"
                  >
                    {showSignupPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground mb-1.5 uppercase tracking-wider">
                  Confirm Password
                </label>
                <input
                  type={showSignupPassword ? 'text' : 'password'}
                  required
                  value={signupConfirmPassword}
                  onChange={(e) => setSignupConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 rounded-xl border border-border/80 dark:border-slate-800 bg-background dark:bg-slate-950/70 text-foreground placeholder-muted-foreground/60 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-500/80 transition-all duration-200 min-h-[44px]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-foreground mb-1.5 uppercase tracking-wider">
                Phone Number (Optional)
              </label>
              <div className="relative group">
                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-teal-500 transition-colors duration-200 pointer-events-none" />
                <input
                  type="tel"
                  value={signupPhone}
                  onChange={(e) => setSignupPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border/80 dark:border-slate-800 bg-background dark:bg-slate-950/70 text-foreground placeholder-muted-foreground/60 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-500/80 transition-all duration-200 min-h-[44px]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full min-h-[48px] h-12 py-3.5 px-4 rounded-xl bg-gradient-to-r from-teal-600 via-teal-500 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 hover:-translate-y-0.5 active:scale-[0.98] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-teal-900/30 transition-all duration-200 disabled:opacity-50 touch-target cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Creating account...</span>
                </>
              ) : (
                <>
                  <span>Create KindLink Account</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>
        )}

        {/* Showcase Demo Credentials Quick Access */}
        <div className="pt-6 border-t border-border/80 dark:border-slate-800 space-y-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-teal-500/15 border border-teal-500/30 flex items-center justify-center text-teal-600 dark:text-teal-400 shadow-sm shrink-0">
                <KeyRound className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-foreground truncate">
                  Showcase Demo Credentials
                </h3>
              </div>
            </div>
            <span className="inline-flex items-center gap-1.5 text-[10px] sm:text-[11px] font-semibold text-teal-600 dark:text-teal-300 bg-teal-500/10 border border-teal-500/30 px-3 py-1 rounded-full shadow-sm shrink-0">
              <Sparkles className="w-3 h-3 text-teal-500 dark:text-teal-400" />
              <span>1-Tap Instant Sign-In</span>
            </span>
          </div>

          <div className="space-y-3">
            {DEMO_ACCOUNTS.map((acc) => {
              const Icon = acc.icon;
              return (
                <div
                  key={acc.username}
                  className="group rounded-2xl border border-border/80 dark:border-slate-800/90 hover:border-teal-500/60 dark:hover:border-teal-500/60 bg-muted/30 dark:bg-slate-900/80 hover:bg-muted/60 dark:hover:bg-slate-900/95 p-3.5 sm:p-4 backdrop-blur-md transition-all duration-200 flex flex-col min-[380px]:flex-row min-[380px]:items-center justify-between gap-3 text-left shadow-sm hover:shadow-lg hover:shadow-teal-950/30"
                >
                  <button
                    type="button"
                    onClick={() => handleSelectDemo(acc, false)}
                    className="flex-1 flex items-start gap-3 min-w-0 text-left min-h-[44px] focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/40 rounded-lg cursor-pointer"
                    title={`Click to fill credentials for @${acc.username}`}
                  >
                    <div className="w-10 h-10 rounded-xl bg-muted/80 dark:bg-slate-800/90 border border-border/90 dark:border-slate-700/70 flex items-center justify-center shrink-0 text-teal-600 dark:text-teal-400 group-hover:bg-gradient-to-br group-hover:from-teal-600 group-hover:to-emerald-600 group-hover:text-white group-hover:border-teal-500/40 transition-all duration-200 shadow-sm mt-0.5 min-[380px]:mt-0">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs sm:text-sm font-bold text-foreground group-hover:text-teal-600 dark:group-hover:text-teal-300 transition-colors">
                          @{acc.username}
                        </span>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border shadow-sm ${acc.badgeColor}`}>
                          {acc.role}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground font-medium truncate mt-0.5">
                        {acc.desc}
                      </p>
                      <div className="text-[10px] text-muted-foreground mt-1 font-mono flex items-center gap-1.5 flex-wrap">
                        <span>Password:</span>
                        <code className="text-teal-600 dark:text-teal-300 font-semibold bg-teal-500/10 dark:bg-teal-950/70 px-2 py-0.5 rounded-md border border-teal-500/30 dark:border-teal-800/60 shadow-inner">
                          {acc.password}
                        </code>
                        <span className="text-muted-foreground/80 text-[9px]">(or {acc.fallbackPassword})</span>
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSelectDemo(acc, true)}
                    disabled={loading}
                    className="shrink-0 min-h-[44px] h-11 w-full min-[380px]:w-auto text-xs font-bold px-4 py-2.5 rounded-xl bg-teal-500/15 text-teal-600 dark:text-teal-300 hover:bg-gradient-to-r hover:from-teal-600 hover:to-emerald-600 hover:text-white hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200 border border-teal-500/30 hover:border-transparent shadow-sm hover:shadow-teal-900/40 flex items-center justify-center gap-1.5 disabled:opacity-50 touch-target cursor-pointer"
                    title={`Sign in immediately as @${acc.username}`}
                  >
                    <span>Quick Sign In</span>
                    <ArrowRight className="w-3.5 h-3.5 shrink-0" />
                  </button>
                </div>
              );
            })}
          </div>

          {/* Universal Demo Password Reminder */}
          <div className="pt-3.5 border-t border-border/80 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2.5 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5 text-teal-500 shrink-0" />
              <span>Live Supabase Auth &amp; SSR</span>
            </span>
            <div className="inline-flex items-center gap-1.5 font-mono text-[11px]">
              <span>Universal Key:</span>
              <code className="text-teal-600 dark:text-teal-300 font-semibold bg-teal-500/10 dark:bg-teal-950/70 px-2 py-0.5 rounded-md border border-teal-500/30 dark:border-teal-800/60 shadow-inner">
                KindLink#2026
              </code>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
