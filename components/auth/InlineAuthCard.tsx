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

  // Demo showcase accounts quick fill
  const handleSelectDemo = (username: string, pass: string, autoSubmit = false) => {
    setActiveTab('login');
    setLoginIdentifier(username);
    setLoginPassword(pass);
    setErrorMsg(null);
    setSuccessMsg(null);

    toast.info(`Loaded demo account: @${username}`, {
      description: `Populated credentials (${pass}). ${autoSubmit ? 'Signing in...' : 'Click Sign In or Quick Sign In.'}`,
    });

    if (autoSubmit) {
      executeLogin(username, pass);
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
        <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-primary text-white shadow-lg shadow-primary/20 mb-1">
          <Heart className="h-7 w-7 fill-white" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
          Kind<span className="text-primary">Link</span>
        </h2>
        <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto">
          Community-powered mutual aid & emergency response. Free, peer-to-peer, verified.
        </p>
      </div>

      {/* Main Auth Container Card */}
      <div className="rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-soft space-y-6">
        {/* Tab Switcher */}
        <div className="grid grid-cols-2 p-1.5 rounded-2xl bg-muted/60 border border-border/80">
          <button
            type="button"
            onClick={() => {
              setActiveTab('login');
              setErrorMsg(null);
            }}
            className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 ${
              activeTab === 'login'
                ? 'bg-gradient-to-r from-teal-600 to-emerald-600 text-white shadow-lg shadow-teal-900/30 hover:-translate-y-0.5 active:scale-[0.98]'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <LogIn className="h-4 w-4" />
            <span>Sign In</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('signup');
              setErrorMsg(null);
            }}
            className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 ${
              activeTab === 'signup'
                ? 'bg-gradient-to-r from-teal-600 to-emerald-600 text-white shadow-lg shadow-teal-900/30 hover:-translate-y-0.5 active:scale-[0.98]'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <UserPlus className="h-4 w-4" />
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
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-teal-500 transition-colors duration-200" />
                <input
                  type="text"
                  required
                  autoComplete="username"
                  value={loginIdentifier}
                  onChange={(e) => setLoginIdentifier(e.target.value)}
                  placeholder="name@example.com or username"
                  className="w-full pl-10 pr-4 py-3 rounded-2xl border border-border bg-background text-foreground placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-500/80 transition-all duration-200"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-foreground mb-1.5 uppercase tracking-wider">
                Password
              </label>
              <div className="relative group">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-teal-500 transition-colors duration-200" />
                <input
                  type={showLoginPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-3 rounded-2xl border border-border bg-background text-foreground placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-500/80 transition-all duration-200"
                />
                <button
                  type="button"
                  onClick={() => setShowLoginPassword(!showLoginPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1 transition-colors"
                  aria-label={showLoginPassword ? 'Hide password' : 'Show password'}
                >
                  {showLoginPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 hover:-translate-y-0.5 active:scale-[0.98] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-teal-900/30 transition-all duration-200 disabled:opacity-50 touch-target"
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
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-teal-500 transition-colors duration-200" />
                  <input
                    type="text"
                    required
                    value={signupDisplayName}
                    onChange={(e) => setSignupDisplayName(e.target.value)}
                    placeholder="e.g. Ananya Roy"
                    className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-border bg-background text-foreground placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-500/80 transition-all duration-200"
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
                  className="w-full px-4 py-2.5 rounded-2xl border border-border bg-background text-foreground placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-500/80 transition-all duration-200"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-foreground mb-1.5 uppercase tracking-wider">
                Email Address
              </label>
              <div className="relative group">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-teal-500 transition-colors duration-200" />
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={signupEmail}
                  onChange={(e) => setSignupEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-border bg-background text-foreground placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-500/80 transition-all duration-200"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-foreground mb-1.5 uppercase tracking-wider">
                  Password (min 8)
                </label>
                <div className="relative group">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-teal-500 transition-colors duration-200" />
                  <input
                    type={showSignupPassword ? 'text' : 'password'}
                    required
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-8 py-2.5 rounded-2xl border border-border bg-background text-foreground placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-500/80 transition-all duration-200"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSignupPassword(!showSignupPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    aria-label="Toggle password view"
                  >
                    {showSignupPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
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
                  className="w-full px-4 py-2.5 rounded-2xl border border-border bg-background text-foreground placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-500/80 transition-all duration-200"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-foreground mb-1.5 uppercase tracking-wider">
                Phone Number (Optional)
              </label>
              <div className="relative group">
                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-teal-500 transition-colors duration-200" />
                <input
                  type="tel"
                  value={signupPhone}
                  onChange={(e) => setSignupPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-border bg-background text-foreground placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-500/80 transition-all duration-200"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 hover:-translate-y-0.5 active:scale-[0.98] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-teal-900/30 transition-all duration-200 disabled:opacity-50 touch-target"
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

        {/* Demo Showcase Accounts Quick Access */}
        <div className="pt-5 border-t border-border space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">
              <Sparkles className="h-3.5 w-3.5 text-teal-500" />
              <span>Showcase Demo Accounts</span>
            </div>
            <span className="text-[10px] font-semibold text-teal-400 bg-teal-500/10 border border-teal-500/20 px-2 py-0.5 rounded-full">
              1-Click Quick Sign In
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {/* Volunteer */}
            <div className="p-3.5 rounded-2xl backdrop-blur-md bg-slate-900/80 border border-slate-800 hover:border-teal-500/50 hover:bg-slate-900/95 transition-all duration-200 text-left text-xs group flex flex-col justify-between shadow-sm hover:shadow-md hover:shadow-teal-950/40">
              <button
                type="button"
                onClick={() => handleSelectDemo('kind_volunteer', 'KindLink#Volunteer2026')}
                className="text-left w-full"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-bold text-white group-hover:text-teal-300 transition truncate">
                    Volunteer
                  </span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-400 border border-teal-500/30">
                    Responder
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 font-mono">@kind_volunteer</p>
                <p className="text-[10px] text-slate-400 mt-1 font-mono">
                  Pass: <span className="text-teal-300 font-semibold bg-teal-950/60 px-1 py-0.5 rounded border border-teal-800/40">Volunteer2026</span>
                </p>
              </button>
              <button
                type="button"
                onClick={() => handleSelectDemo('kind_volunteer', 'KindLink#Volunteer2026', true)}
                className="mt-2.5 w-full py-1.5 text-[11px] font-bold rounded-xl bg-teal-500/15 text-teal-300 hover:bg-gradient-to-r hover:from-teal-600 hover:to-emerald-600 hover:text-white hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200 border border-teal-500/30 hover:border-transparent flex items-center justify-center gap-1 shadow-sm"
              >
                <span>Quick Sign In</span>
                <ArrowRight className="h-3 w-3" />
              </button>
            </div>

            {/* Aid Requester */}
            <div className="p-3.5 rounded-2xl backdrop-blur-md bg-slate-900/80 border border-slate-800 hover:border-teal-500/50 hover:bg-slate-900/95 transition-all duration-200 text-left text-xs group flex flex-col justify-between shadow-sm hover:shadow-md hover:shadow-teal-950/40">
              <button
                type="button"
                onClick={() => handleSelectDemo('need_aid', 'KindLink#Requester2026')}
                className="text-left w-full"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-bold text-white group-hover:text-teal-300 transition truncate">
                    Aid Requester
                  </span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30">
                    Need Aid
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 font-mono">@need_aid</p>
                <p className="text-[10px] text-slate-400 mt-1 font-mono">
                  Pass: <span className="text-amber-300 font-semibold bg-amber-950/60 px-1 py-0.5 rounded border border-amber-800/40">Requester2026</span>
                </p>
              </button>
              <button
                type="button"
                onClick={() => handleSelectDemo('need_aid', 'KindLink#Requester2026', true)}
                className="mt-2.5 w-full py-1.5 text-[11px] font-bold rounded-xl bg-amber-500/15 text-amber-300 hover:bg-gradient-to-r hover:from-teal-600 hover:to-emerald-600 hover:text-white hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200 border border-amber-500/30 hover:border-transparent flex items-center justify-center gap-1 shadow-sm"
              >
                <span>Quick Sign In</span>
                <ArrowRight className="h-3 w-3" />
              </button>
            </div>

            {/* Admin */}
            <div className="p-3.5 rounded-2xl backdrop-blur-md bg-slate-900/80 border border-slate-800 hover:border-teal-500/50 hover:bg-slate-900/95 transition-all duration-200 text-left text-xs group flex flex-col justify-between shadow-sm hover:shadow-md hover:shadow-teal-950/40">
              <button
                type="button"
                onClick={() => handleSelectDemo('admin_kindlink', 'KindLink#Admin2026')}
                className="text-left w-full"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-bold text-white group-hover:text-teal-300 transition truncate">
                    Platform Admin
                  </span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/30">
                    Super Admin
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 font-mono">@admin_kindlink</p>
                <p className="text-[10px] text-slate-400 mt-1 font-mono">
                  Pass: <span className="text-purple-300 font-semibold bg-purple-950/60 px-1 py-0.5 rounded border border-purple-800/40">Admin2026</span>
                </p>
              </button>
              <button
                type="button"
                onClick={() => handleSelectDemo('admin_kindlink', 'KindLink#Admin2026', true)}
                className="mt-2.5 w-full py-1.5 text-[11px] font-bold rounded-xl bg-purple-500/15 text-purple-300 hover:bg-gradient-to-r hover:from-teal-600 hover:to-emerald-600 hover:text-white hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200 border border-purple-500/30 hover:border-transparent flex items-center justify-center gap-1 shadow-sm"
              >
                <span>Quick Sign In</span>
                <ArrowRight className="h-3 w-3" />
              </button>
            </div>
          </div>
          <div className="pt-1 text-[11px] text-muted-foreground text-center">
            Secondary universal password: <span className="font-mono text-foreground font-semibold">KindLink#2026</span>
          </div>
        </div>
      </div>
    </div>
  );
}
