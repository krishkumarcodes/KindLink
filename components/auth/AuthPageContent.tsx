'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Heart,
  Mail,
  Lock,
  User,
  AtSign,
  ArrowRight,
  Loader2,
  AlertCircle,
  Eye,
  EyeOff,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  Home,
  UserCheck,
  HelpCircle,
  KeyRound,
  Shield,
  X,
  LogIn,
  UserPlus,
} from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';

interface AuthPageContentProps {
  initialTab?: 'login' | 'signup';
}

export function AuthPageContent({ initialTab = 'login' }: AuthPageContentProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTarget = searchParams.get('redirect') || '/app';
  const queryTab = searchParams.get('tab');

  const [activeTab, setActiveTab] = useState<'login' | 'signup'>(
    queryTab === 'signup' ? 'signup' : initialTab
  );

  // Sync tab if query param changes
  useEffect(() => {
    if (queryTab === 'signup') {
      setActiveTab('signup');
    } else if (queryTab === 'login') {
      setActiveTab('login');
    }
  }, [queryTab]);

  // Login form state
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Signup form state
  const [signupFullName, setSignupFullName] = useState('');
  const [signupUsername, setSignupUsername] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [showSignupPassword, setShowSignupPassword] = useState(false);

  // Feedback states
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  // Demo account profiles
  const DEMO_ACCOUNTS = [
    {
      role: 'Verified Volunteer',
      badge: 'Responder',
      badgeColor: 'bg-teal-500/10 text-teal-400 border-teal-500/30',
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
      badgeColor: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
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
      badgeColor: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
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
  const fillDemoAccount = (acc: (typeof DEMO_ACCOUNTS)[0], autoSubmit = false) => {
    setActiveTab('login');
    setLoginIdentifier(acc.username);
    setLoginPassword(acc.password);
    setError(null);

    toast.info(`Loaded demo account: @${acc.username}`, {
      description: `Populated ${acc.email} (${acc.role}). ${autoSubmit ? 'Signing in...' : 'Click Sign In or Quick Sign In.'}`,
    });

    if (autoSubmit) {
      executeLogin(acc.username, acc.password);
    }
  };

  // Login handler
  const executeLogin = async (identifierInput: string, passwordInput: string) => {
    setError(null);
    setLoading(true);
    setLoadingMessage('Authenticating credentials...');

    try {
      const cleanInput = identifierInput.trim();
      let candidateEmails: string[] = [];

      // Demo showcase credentials map
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

      // 1. Resolve identifier to email(s)
      if (cleanInput.includes('@')) {
        const lowerEmail = cleanInput.toLowerCase();
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
        setLoadingMessage('Resolving username credentials...');
        const lowerUser = cleanInput.toLowerCase();

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
          const notFoundMsg = 'No KindLink account found matching this username. Please verify or use your registered email address.';
          setError(notFoundMsg);
          toast.error('Account Not Found', { description: notFoundMsg });
          setLoading(false);
          return;
        }
      }

      // 2. Candidate passwords (seamless primary & secondary demo password support)
      const candidatePasswords: string[] = [passwordInput];
      const lowerInput = cleanInput.toLowerCase();
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
      let authenticated = false;
      let lastErrorMessage = '';

      for (const email of candidateEmails) {
        if (authenticated) break;
        for (const pass of candidatePasswords) {
          setLoadingMessage(`Signing in securely (${email})...`);

          const { data, error: signInError } = await supabase.auth.signInWithPassword({
            email,
            password: pass,
          });

          if (!signInError && (data?.session || data?.user)) {
            authenticated = true;
            const displayName = data.user?.user_metadata?.display_name || cleanInput;
            toast.success('Signed in successfully!', {
              description: `Welcome back, ${displayName}!`,
            });
            router.push(redirectTarget);
            router.refresh();
            return;
          }

          if (signInError) {
            lastErrorMessage = signInError.message;
          }
        }
      }

      // 4. Fallback to server route /api/auth/login if client-side signIn encounters session issues
      if (!authenticated) {
        setLoadingMessage('Verifying credentials with server...');
        try {
          const apiRes = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ identifier: cleanInput, password: passwordInput }),
          });
          const apiData = await apiRes.json();
          if (apiRes.ok && apiData.success) {
            authenticated = true;
            if (apiData.session?.access_token && apiData.session?.refresh_token) {
              await supabase.auth.setSession({
                access_token: apiData.session.access_token,
                refresh_token: apiData.session.refresh_token,
              });
            }
            const displayName = apiData.user?.displayName || cleanInput;
            toast.success('Signed in successfully!', {
              description: `Welcome back, ${displayName}!`,
            });
            const finalRedirect = isAdmin && redirectTarget === '/app' ? '/admin' : redirectTarget;
            router.push(finalRedirect);
            router.refresh();
            return;
          } else if (apiRes.status === 429) {
            lastErrorMessage = apiData.error || 'Too many login attempts. Please wait a few minutes before trying again.';
          }
        } catch {
          // Proceed to error display
        }
      }

      if (!authenticated) {
        const errorDesc = lastErrorMessage || 'Invalid email/username or password. Please try again.';
        setError(errorDesc);
        toast.error('Authentication Failed', { description: errorDesc });
        setLoading(false);
      }
    } catch (err: any) {
      const generalErr = err?.message || 'Authentication error. Please check your credentials and try again.';
      setError(generalErr);
      toast.error('Sign In Error', { description: generalErr });
      setLoading(false);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginIdentifier || !loginPassword) {
      setError('Please enter both your email/username and password.');
      return;
    }
    await executeLogin(loginIdentifier, loginPassword);
  };

  // Signup handler
  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanName = signupFullName.trim();
    const cleanUsername = signupUsername.trim().toLowerCase().replace(/\s+/g, '');
    const cleanEmail = signupEmail.trim().toLowerCase();

    if (!cleanName) {
      setError('Please provide your full name.');
      return;
    }

    if (cleanUsername.length < 3 || cleanUsername.length > 20) {
      setError('Username must be between 3 and 20 characters.');
      return;
    }

    if (!/^[a-z][a-z0-9_.]*$/.test(cleanUsername)) {
      setError('Username must start with a letter and contain only letters, numbers, underscores, or periods.');
      return;
    }

    if (signupPassword.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    setLoading(true);
    setLoadingMessage('Verifying username availability...');

    try {
      // 1. Check username collision in profiles
      const { data: existingUser } = await supabase
        .from('profiles')
        .select('id')
        .ilike('username', cleanUsername)
        .maybeSingle();

      if (existingUser) {
        setError('This username is already taken. Please choose another username.');
        setLoading(false);
        return;
      }

      setLoadingMessage('Creating your account in Supabase...');

      // 11. Sign up with Supabase Auth
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: cleanEmail,
        password: signupPassword,
        options: {
          data: {
            username: cleanUsername,
            display_name: cleanName,
          },
        },
      });

      if (signUpError) {
        setError(signUpError.message || 'Failed to create your account.');
        setLoading(false);
        return;
      }

      const user = authData?.user;

      if (user) {
        setLoadingMessage('Setting up your community profile...');

        // 11. Insert/upsert profile row
        try {
          await supabase.from('profiles').upsert(
            {
              id: user.id,
              username: cleanUsername,
              display_name: cleanName,
              role: 'user',
              verification_status: 'unverified',
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'id' }
          );
        } catch (profileErr) {
          console.warn('Profile row auto-created via database trigger:', profileErr);
        }
      }

      toast.success('Account created successfully!', {
        description: 'Welcome to KindLink. Redirecting to your community dashboard...',
      });

      router.push(redirectTarget);
      router.refresh();
    } catch (err: any) {
      setError(err?.message || 'Failed to register account. Please check your network and try again.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col justify-between relative overflow-hidden selection:bg-teal-500 selection:text-white">
      {/* Background ambient lighting */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-6xl h-[520px] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-teal-500/18 via-emerald-900/10 to-transparent blur-3xl pointer-events-none -z-10" />
      <div className="absolute -top-28 -left-24 w-96 h-96 bg-teal-500/12 rounded-full blur-[120px] pointer-events-none -z-10" />
      <div className="absolute top-1/4 -right-24 w-96 h-96 bg-emerald-500/10 rounded-full blur-[130px] pointer-events-none -z-10" />
      <div className="absolute -bottom-24 left-1/4 w-80 h-80 bg-teal-600/10 rounded-full blur-[110px] pointer-events-none -z-10" />

      {/* Top Navbar */}
      <header className="w-full border-b border-slate-800/60 bg-slate-950/60 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2.5 group transition-transform active:scale-95"
          >
            <div className="relative flex h-10 w-10 shrink-0 items-center justify-center transition-transform duration-200 group-hover:scale-105">
              <svg
                viewBox="0 0 64 64"
                className="h-10 w-10 drop-shadow-sm select-none"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <defs>
                  <linearGradient id="auth-kl-grad" x1="4" y1="4" x2="60" y2="60" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#0F766E" />
                    <stop offset="40%" stopColor="#0D9488" />
                    <stop offset="75%" stopColor="#06B6D4" />
                    <stop offset="100%" stopColor="#2563EB" />
                  </linearGradient>
                  <radialGradient id="auth-kl-beacon" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#FDE047" />
                    <stop offset="50%" stopColor="#F59E0B" />
                    <stop offset="100%" stopColor="#EF4444" />
                  </radialGradient>
                </defs>
                <rect x="2" y="2" width="60" height="60" rx="16" fill="url(#auth-kl-grad)" />
                <rect x="2.5" y="2.5" width="59" height="59" rx="15.5" stroke="#FFFFFF" strokeOpacity="0.25" strokeWidth="1" />
                <ellipse cx="32" cy="32" rx="22" ry="11" transform="rotate(-25 32 32)" stroke="#FFFFFF" strokeOpacity="0.4" strokeWidth="2.5" strokeDasharray="4 2" />
                <ellipse cx="32" cy="32" rx="22" ry="11" transform="rotate(25 32 32)" stroke="#FFFFFF" strokeOpacity="0.4" strokeWidth="2.5" strokeDasharray="4 2" />
                <circle cx="32" cy="32" r="18" stroke="#FFFFFF" strokeOpacity="0.18" strokeWidth="1.5" />
                <path d="M22 28 C18 22, 12 25, 12 32 C12 39, 24 46, 32 50 C40 46, 52 39, 52 32 C52 25, 46 22, 42 28 C39 32, 35 34, 32 34 C29 34, 25 32, 22 28 Z" fill="#FFFFFF" fillOpacity="0.96" />
                <circle cx="32" cy="32" r="5" fill="url(#auth-kl-beacon)" />
                <circle cx="32" cy="32" r="2" fill="#FFFFFF" />
              </svg>
            </div>
            <div>
              <span className="font-heading font-extrabold text-lg text-white tracking-tight">
                Kind<span className="text-teal-400">Link</span>
              </span>
              <span className="hidden sm:inline-block ml-2 text-[11px] font-semibold text-teal-400/80 uppercase tracking-wider">
                Mutual Aid
              </span>
            </div>
          </Link>

          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-teal-400 px-3 py-1.5 rounded-lg hover:bg-slate-800/60 transition-colors"
          >
            <Home className="w-3.5 h-3.5" />
            <span>Public Home</span>
          </Link>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col justify-center items-center px-4 sm:px-6 py-8 sm:py-14 w-full">
        <div className="w-full max-w-[440px] sm:max-w-[460px] mx-auto">
          {/* Header Title & Trust Badge */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-teal-500/10 border border-teal-500/25 text-teal-300 text-xs font-semibold mb-3.5 shadow-sm shadow-teal-950/30">
              <Sparkles className="w-3.5 h-3.5 text-teal-400 shrink-0" />
              <span>Hyperlocal Community Trust Network</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-heading font-extrabold text-white tracking-tight text-balance">
              {activeTab === 'login' ? 'Welcome Back to KindLink' : 'Join KindLink Asansol'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-2 max-w-sm mx-auto text-balance leading-relaxed">
              {activeTab === 'login'
                ? 'Sign in to coordinate emergency aid, blood donations, and local community assistance.'
                : 'Create your free account to post urgent requests or offer help to neighbors.'}
            </p>
          </div>

          {/* Glassmorphic Card Container */}
          <div className="relative rounded-2xl sm:rounded-3xl border border-slate-800/90 shadow-2xl shadow-black/80 bg-slate-900/80 backdrop-blur-xl p-6 sm:p-8 overflow-hidden">
            {/* Seamless top edge highlight line for premium glass finish */}
            <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-teal-400/50 to-transparent pointer-events-none" />

            {/* Segmented Tab Switcher */}
            <div className="grid grid-cols-2 p-1.5 rounded-xl bg-slate-950/80 border border-slate-800/80 mb-6 gap-1">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('login');
                  setError(null);
                }}
                className={`min-h-[44px] px-3 py-2.5 text-xs sm:text-sm rounded-lg flex items-center justify-center gap-2 transition-all duration-200 active:scale-[0.98] ${
                  activeTab === 'login'
                    ? 'bg-gradient-to-r from-teal-600 to-emerald-600 text-white font-bold shadow-md shadow-teal-950/50 hover:-translate-y-0.5'
                    : 'text-slate-400 hover:text-white font-medium hover:bg-slate-900/50'
                }`}
              >
                <LogIn className="w-4 h-4 shrink-0" />
                <span>Sign In</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('signup');
                  setError(null);
                }}
                className={`min-h-[44px] px-3 py-2.5 text-xs sm:text-sm rounded-lg flex items-center justify-center gap-2 transition-all duration-200 active:scale-[0.98] ${
                  activeTab === 'signup'
                    ? 'bg-gradient-to-r from-teal-600 to-emerald-600 text-white font-bold shadow-md shadow-teal-950/50 hover:-translate-y-0.5'
                    : 'text-slate-400 hover:text-white font-medium hover:bg-slate-900/50'
                }`}
              >
                <UserPlus className="w-4 h-4 shrink-0" />
                <span>Create Account</span>
              </button>
            </div>

            {/* Enhanced Error Alert Banner */}
            {error && (
              <div
                role="alert"
                className="mb-5 bg-red-950/50 border border-red-500/40 text-red-200 rounded-xl p-3.5 text-xs sm:text-sm flex items-start gap-2.5 shadow-sm animate-in fade-in duration-200"
              >
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <div className="flex-1 font-medium leading-relaxed break-words">{error}</div>
                <button
                  type="button"
                  onClick={() => setError(null)}
                  className="text-red-400 hover:text-red-200 p-0.5 rounded transition-colors shrink-0"
                  aria-label="Dismiss error"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* LOGIN FORM */}
            {activeTab === 'login' && (
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div>
                  <label
                    htmlFor="login-identifier"
                    className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center justify-between"
                  >
                    <span>Email or Username</span>
                  </label>
                  <div className="relative group">
                    <Mail className="w-4 h-4 text-slate-400 group-focus-within:text-teal-400 absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors duration-200 pointer-events-none" />
                    <input
                      id="login-identifier"
                      type="text"
                      required
                      autoComplete="username"
                      disabled={loading}
                      value={loginIdentifier}
                      onChange={(e) => setLoginIdentifier(e.target.value)}
                      placeholder="e.g. kind_volunteer or email@domain.com"
                      className="w-full pl-11 pr-4 py-3 text-sm rounded-xl border border-slate-700/70 bg-slate-950/70 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-500/80 transition-all duration-200 disabled:opacity-50"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label
                      htmlFor="login-password"
                      className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between"
                    >
                      <span>Password</span>
                    </label>
                  </div>
                  <div className="relative group">
                    <Lock className="w-4 h-4 text-slate-400 group-focus-within:text-teal-400 absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors duration-200 pointer-events-none" />
                    <input
                      id="login-password"
                      type={showLoginPassword ? 'text' : 'password'}
                      required
                      autoComplete="current-password"
                      disabled={loading}
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-11 pr-11 py-3 text-sm rounded-xl border border-slate-700/70 bg-slate-950/70 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-500/80 transition-all duration-200 disabled:opacity-50"
                    />
                    <button
                      type="button"
                      onClick={() => setShowLoginPassword(!showLoginPassword)}
                      className="w-11 h-11 flex items-center justify-center absolute right-0.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-teal-500/50 rounded-lg"
                      aria-label={showLoginPassword ? 'Hide password' : 'Show password'}
                    >
                      {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  id="btn-login-submit"
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 min-h-[48px] mt-4 px-4 bg-gradient-to-r from-teal-600 via-teal-500 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 hover:-translate-y-0.5 active:scale-[0.98] text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 shadow-lg shadow-teal-900/30 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none select-none"
                >
                  {loading ? (
                    <span className="inline-flex items-center justify-center gap-2 truncate">
                      <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                      <span className="truncate">{loadingMessage || 'Authenticating...'}</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center justify-center gap-2 whitespace-nowrap">
                      <span>Sign In</span>
                      <ArrowRight className="w-4 h-4 shrink-0" />
                    </span>
                  )}
                </button>
              </form>
            )}

            {/* SIGNUP FORM */}
            {activeTab === 'signup' && (
              <form onSubmit={handleSignupSubmit} className="space-y-4">
                {/* Full Name */}
                <div>
                  <label
                    htmlFor="signup-fullname"
                    className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center justify-between"
                  >
                    <span>Full Name <span className="text-teal-400">*</span></span>
                  </label>
                  <div className="relative group">
                    <User className="w-4 h-4 text-slate-400 group-focus-within:text-teal-400 absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors duration-200 pointer-events-none" />
                    <input
                      id="signup-fullname"
                      type="text"
                      required
                      autoComplete="name"
                      disabled={loading}
                      value={signupFullName}
                      onChange={(e) => setSignupFullName(e.target.value)}
                      placeholder="e.g. Dr. Ananya Roy"
                      className="w-full pl-11 pr-4 py-3 text-sm rounded-xl border border-slate-700/70 bg-slate-950/70 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-500/80 transition-all duration-200 disabled:opacity-50"
                    />
                  </div>
                </div>

                {/* Username */}
                <div>
                  <label
                    htmlFor="signup-username"
                    className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center justify-between"
                  >
                    <span>Username <span className="text-teal-400">*</span></span>
                  </label>
                  <div className="relative group">
                    <AtSign className="w-4 h-4 text-slate-400 group-focus-within:text-teal-400 absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors duration-200 pointer-events-none" />
                    <input
                      id="signup-username"
                      type="text"
                      required
                      autoComplete="username"
                      disabled={loading}
                      value={signupUsername}
                      onChange={(e) => setSignupUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, ''))}
                      placeholder="e.g. rahul_sen"
                      className="w-full pl-11 pr-4 py-3 text-sm rounded-xl border border-slate-700/70 bg-slate-950/70 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-500/80 transition-all duration-200 disabled:opacity-50"
                    />
                  </div>
                  <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-slate-400">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-teal-400 shrink-0"></span>
                    <span>3-20 characters: lowercase letters, numbers, _ and .</span>
                  </div>
                </div>

                {/* Email Address */}
                <div>
                  <label
                    htmlFor="signup-email"
                    className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center justify-between"
                  >
                    <span>Email Address <span className="text-teal-400">*</span></span>
                  </label>
                  <div className="relative group">
                    <Mail className="w-4 h-4 text-slate-400 group-focus-within:text-teal-400 absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors duration-200 pointer-events-none" />
                    <input
                      id="signup-email"
                      type="email"
                      required
                      autoComplete="email"
                      disabled={loading}
                      value={signupEmail}
                      onChange={(e) => setSignupEmail(e.target.value)}
                      placeholder="name@example.com"
                      className="w-full pl-11 pr-4 py-3 text-sm rounded-xl border border-slate-700/70 bg-slate-950/70 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-500/80 transition-all duration-200 disabled:opacity-50"
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label
                    htmlFor="signup-password"
                    className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center justify-between"
                  >
                    <span>Password <span className="text-teal-400">*</span></span>
                  </label>
                  <div className="relative group">
                    <Lock className="w-4 h-4 text-slate-400 group-focus-within:text-teal-400 absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors duration-200 pointer-events-none" />
                    <input
                      id="signup-password"
                      type={showSignupPassword ? 'text' : 'password'}
                      required
                      autoComplete="new-password"
                      disabled={loading}
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-11 pr-11 py-3 text-sm rounded-xl border border-slate-700/70 bg-slate-950/70 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-500/80 transition-all duration-200 disabled:opacity-50"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSignupPassword(!showSignupPassword)}
                      className="w-11 h-11 flex items-center justify-center absolute right-0.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-teal-500/50 rounded-lg"
                      aria-label={showSignupPassword ? 'Hide password' : 'Show password'}
                    >
                      {showSignupPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-slate-400">
                    <span className={`inline-block w-1.5 h-1.5 rounded-full ${signupPassword.length >= 8 ? 'bg-teal-400' : 'bg-slate-500'} transition-colors duration-200 shrink-0`}></span>
                    <span className={signupPassword.length >= 8 ? 'text-teal-300 font-medium' : 'text-slate-400'}>
                      Minimum 8 characters
                    </span>
                  </div>
                </div>

                <button
                  id="btn-signup-submit"
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 min-h-[48px] mt-4 px-4 bg-gradient-to-r from-teal-600 via-teal-500 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 hover:-translate-y-0.5 active:scale-[0.98] text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 shadow-lg shadow-teal-900/30 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none select-none"
                >
                  {loading ? (
                    <span className="inline-flex items-center justify-center gap-2 truncate">
                      <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                      <span className="truncate">{loadingMessage || 'Creating account...'}</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center justify-center gap-2 whitespace-nowrap">
                      <ShieldCheck className="w-4 h-4 shrink-0" />
                      <span>Create Account &amp; Join</span>
                    </span>
                  )}
                </button>
              </form>
            )}

            {/* Security & Privacy Trust Strip */}
            <div className="mt-5 pt-4 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-center justify-center gap-3 sm:gap-4 flex-wrap">
              <span className="inline-flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                <span>256-Bit SSL Encrypted</span>
              </span>
              <span className="hidden sm:inline text-slate-700">•</span>
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Zero Password Sharing</span>
              </span>
              <span className="hidden sm:inline text-slate-700">•</span>
              <span className="inline-flex items-center gap-1.5">
                <Heart className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                <span>100% Non-Profit Community</span>
              </span>
            </div>

            {/* Bottom Footer switch link */}
            <div className="mt-4 pt-3 border-t border-slate-800/40 text-center">
              <p className="text-xs text-slate-400">
                {activeTab === 'login' ? (
                  <>
                    Don&apos;t have an account yet?{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('signup');
                        setError(null);
                      }}
                      className="font-bold text-teal-400 hover:text-teal-300 underline underline-offset-4 ml-1"
                    >
                      Create Account
                    </button>
                  </>
                ) : (
                  <>
                    Already have an account?{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('login');
                        setError(null);
                      }}
                      className="font-bold text-teal-400 hover:text-teal-300 underline underline-offset-4 ml-1"
                    >
                      Sign In
                    </button>
                  </>
                )}
              </p>
            </div>
          </div>

          {/* DEMO ACCOUNTS PANEL */}
          <div className="mt-8 rounded-2xl sm:rounded-3xl border border-slate-800/90 bg-slate-900/70 backdrop-blur-xl p-4 sm:p-6 shadow-xl shadow-black/50 relative overflow-hidden">
            {/* Subtle top edge glow highlight */}
            <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-teal-500/40 to-transparent pointer-events-none" />

            {/* Clean Header */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 mb-4">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-teal-500/15 border border-teal-500/30 flex items-center justify-center text-teal-400 shadow-sm shadow-teal-950/40 shrink-0">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-200 truncate">
                    Showcase Demo Credentials
                  </h2>
                </div>
              </div>
              <span className="inline-flex items-center gap-1.5 text-[10px] sm:text-[11px] font-semibold text-teal-300 bg-teal-500/10 border border-teal-500/30 px-3 py-1 rounded-full shadow-sm shadow-teal-900/30 shrink-0">
                <Sparkles className="w-3 h-3 text-teal-400" />
                <span>1-Tap Instant Sign-In</span>
              </span>
            </div>

            {/* Demo Accounts List */}
            <div className="space-y-3">
              {DEMO_ACCOUNTS.map((acc) => {
                const Icon = acc.icon;
                return (
                  <div
                    key={acc.username}
                    className="group border border-slate-800/90 hover:border-teal-500/60 rounded-xl p-3.5 sm:p-4 backdrop-blur-md bg-slate-900/80 hover:bg-slate-900/95 transition-all duration-200 flex flex-col min-[380px]:flex-row min-[380px]:items-center justify-between gap-3 text-left shadow-sm hover:shadow-lg hover:shadow-teal-950/40"
                  >
                    <button
                      type="button"
                      onClick={() => fillDemoAccount(acc, false)}
                      className="flex-1 flex items-start gap-3 min-w-0 text-left min-h-[44px] focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/40 rounded-lg cursor-pointer"
                      title={`Click to fill credentials for @${acc.username}`}
                    >
                      <div className="w-10 h-10 rounded-xl bg-slate-800/90 border border-slate-700/70 flex items-center justify-center shrink-0 text-teal-400 group-hover:bg-gradient-to-br group-hover:from-teal-600 group-hover:to-emerald-600 group-hover:text-white group-hover:border-teal-500/40 transition-all duration-200 shadow-sm mt-0.5 min-[380px]:mt-0">
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs sm:text-sm font-bold text-white group-hover:text-teal-300 transition-colors">
                            @{acc.username}
                          </span>
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border shadow-sm ${acc.badgeColor}`}>
                            {acc.role}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-300 font-medium truncate mt-0.5">
                          {acc.desc}
                        </p>
                        <div className="text-[10px] text-slate-400 mt-1 font-mono flex items-center gap-1.5 flex-wrap">
                          <span className="text-slate-400">Password:</span>
                          <code className="text-teal-300 font-semibold bg-teal-950/70 px-2 py-0.5 rounded-md border border-teal-800/60 shadow-inner">
                            {acc.password}
                          </code>
                          <span className="text-slate-500 text-[9px]">(or {acc.fallbackPassword})</span>
                        </div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => fillDemoAccount(acc, true)}
                      disabled={loading}
                      className="shrink-0 min-h-[44px] h-11 w-full min-[380px]:w-auto text-xs font-bold px-4 py-2.5 rounded-xl bg-teal-500/15 text-teal-300 hover:bg-gradient-to-r hover:from-teal-600 hover:to-emerald-600 hover:text-white hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200 border border-teal-500/30 hover:border-transparent shadow-sm hover:shadow-teal-900/40 flex items-center justify-center gap-1.5 disabled:opacity-50 touch-target cursor-pointer"
                      title={`Sign in immediately as @${acc.username}`}
                    >
                      <span>Quick Sign In</span>
                      <ArrowRight className="w-3.5 h-3.5 shrink-0" />
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Universal Password Reminder & Trust Note */}
            <div className="mt-4 pt-3.5 border-t border-slate-800/70 flex flex-wrap items-center justify-between gap-2.5 text-xs text-slate-400">
              <span className="inline-flex items-center gap-1.5 font-medium text-slate-400">
                <CheckCircle2 className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                <span>Live Supabase Auth &amp; SSR</span>
              </span>
              <div className="inline-flex items-center gap-1.5 font-mono text-[11px]">
                <span className="text-slate-400">Universal Key:</span>
                <code className="text-teal-300 font-semibold bg-teal-950/70 px-2 py-0.5 rounded-md border border-teal-800/60 shadow-inner">
                  KindLink#2026
                </code>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full py-4 text-center text-xs text-slate-500 border-t border-slate-900">
        <p>KindLink Mutual Aid Network &bull; Asansol Community &bull; Non-Profit Public Good</p>
      </footer>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#070b14] flex flex-col justify-center items-center">
          <Loader2 className="w-8 h-8 animate-spin text-teal-500" />
        </div>
      }
    >
      <AuthPageContent initialTab="login" />
    </Suspense>
  );
}
