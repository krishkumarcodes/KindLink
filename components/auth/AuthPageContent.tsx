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
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[450px] bg-gradient-to-b from-teal-500/15 via-teal-900/5 to-transparent blur-3xl pointer-events-none -z-10" />
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-teal-600/10 rounded-full blur-[100px] pointer-events-none -z-10" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-emerald-600/10 rounded-full blur-[100px] pointer-events-none -z-10" />

      {/* Top Navbar */}
      <header className="w-full border-b border-slate-800/80 bg-slate-950/40 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2.5 group transition-transform active:scale-95"
          >
            <div className="w-9 h-9 rounded-xl bg-teal-600 flex items-center justify-center text-white shadow-lg shadow-teal-600/25 group-hover:scale-105 transition-transform">
              <Heart className="w-5 h-5 fill-white" />
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
      <main className="flex-1 flex flex-col justify-center items-center px-4 py-10 sm:py-16">
        <div className="w-full max-w-md">
          {/* Header Title */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-400 text-xs font-medium mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Realtime Community Trust Network</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-heading font-extrabold text-white tracking-tight">
              {activeTab === 'login' ? 'Welcome Back to KindLink' : 'Join KindLink Asansol'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1.5 max-w-sm mx-auto">
              {activeTab === 'login'
                ? 'Sign in to coordinate emergency aid, blood donations, and local community assistance.'
                : 'Create your free account to post urgent requests or offer help to neighbors.'}
            </p>
          </div>

          {/* Card Container */}
          <div className="rounded-2xl border border-slate-800/90 bg-slate-900/80 backdrop-blur-xl p-6 sm:p-8 shadow-2xl shadow-black/60 relative">
            {/* Tabs Switcher */}
            <div className="grid grid-cols-2 p-1 bg-slate-950/80 rounded-xl border border-slate-800/80 mb-6">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('login');
                  setError(null);
                }}
                className={`py-2 text-xs sm:text-sm font-bold rounded-lg transition-all ${
                  activeTab === 'login'
                    ? 'bg-teal-600 text-white shadow-md shadow-teal-600/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('signup');
                  setError(null);
                }}
                className={`py-2 text-xs sm:text-sm font-bold rounded-lg transition-all ${
                  activeTab === 'signup'
                    ? 'bg-teal-600 text-white shadow-md shadow-teal-600/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Create Account
              </button>
            </div>

            {/* Error Message Box */}
            {error && (
              <div
                role="alert"
                className="mb-5 p-3.5 rounded-xl bg-red-950/60 border border-red-500/40 text-red-200 text-xs sm:text-sm flex items-start gap-3 animate-in fade-in duration-200"
              >
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <div className="flex-1 font-medium leading-relaxed">{error}</div>
              </div>
            )}

            {/* LOGIN FORM */}
            {activeTab === 'login' && (
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div>
                  <label
                    htmlFor="login-identifier"
                    className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5"
                  >
                    Email or Username
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      id="login-identifier"
                      type="text"
                      required
                      autoComplete="username"
                      disabled={loading}
                      value={loginIdentifier}
                      onChange={(e) => setLoginIdentifier(e.target.value)}
                      placeholder="e.g. kind_volunteer or email@domain.com"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-700/80 bg-slate-950/60 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-500 transition-colors disabled:opacity-50"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label
                      htmlFor="login-password"
                      className="block text-xs font-semibold text-slate-300 uppercase tracking-wider"
                    >
                      Password
                    </label>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      id="login-password"
                      type={showLoginPassword ? 'text' : 'password'}
                      required
                      autoComplete="current-password"
                      disabled={loading}
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-700/80 bg-slate-950/60 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-500 transition-colors disabled:opacity-50"
                    />
                    <button
                      type="button"
                      onClick={() => setShowLoginPassword(!showLoginPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1"
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
                  className="w-full mt-2 py-3 px-4 bg-teal-600 hover:bg-teal-500 active:scale-[0.99] text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 shadow-lg shadow-teal-600/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{loadingMessage || 'Authenticating...'}</span>
                    </>
                  ) : (
                    <>
                      <span>Sign In</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
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
                    className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5"
                  >
                    Full Name <span className="text-teal-400">*</span>
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      id="signup-fullname"
                      type="text"
                      required
                      autoComplete="name"
                      disabled={loading}
                      value={signupFullName}
                      onChange={(e) => setSignupFullName(e.target.value)}
                      placeholder="e.g. Community Member"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-700/80 bg-slate-950/60 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-500 transition-colors disabled:opacity-50"
                    />
                  </div>
                </div>

                {/* Username */}
                <div>
                  <label
                    htmlFor="signup-username"
                    className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5"
                  >
                    Username <span className="text-teal-400">*</span>
                  </label>
                  <div className="relative">
                    <AtSign className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      id="signup-username"
                      type="text"
                      required
                      autoComplete="username"
                      disabled={loading}
                      value={signupUsername}
                      onChange={(e) => setSignupUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, ''))}
                      placeholder="e.g. rahul_sen"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-700/80 bg-slate-950/60 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-500 transition-colors disabled:opacity-50"
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    3-20 characters: letters, numbers, _ and .
                  </p>
                </div>

                {/* Email Address */}
                <div>
                  <label
                    htmlFor="signup-email"
                    className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5"
                  >
                    Email Address <span className="text-teal-400">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      id="signup-email"
                      type="email"
                      required
                      autoComplete="email"
                      disabled={loading}
                      value={signupEmail}
                      onChange={(e) => setSignupEmail(e.target.value)}
                      placeholder="name@example.com"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-700/80 bg-slate-950/60 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-500 transition-colors disabled:opacity-50"
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label
                    htmlFor="signup-password"
                    className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5"
                  >
                    Password <span className="text-teal-400">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      id="signup-password"
                      type={showSignupPassword ? 'text' : 'password'}
                      required
                      autoComplete="new-password"
                      disabled={loading}
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      placeholder="At least 8 characters"
                      className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-700/80 bg-slate-950/60 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-500 transition-colors disabled:opacity-50"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSignupPassword(!showSignupPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1"
                      aria-label={showSignupPassword ? 'Hide password' : 'Show password'}
                    >
                      {showSignupPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  id="btn-signup-submit"
                  type="submit"
                  disabled={loading}
                  className="w-full mt-2 py-3 px-4 bg-teal-600 hover:bg-teal-500 active:scale-[0.99] text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 shadow-lg shadow-teal-600/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{loadingMessage || 'Creating account...'}</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      <span>Create Account & Join</span>
                    </>
                  )}
                </button>
              </form>
            )}

            {/* Bottom Footer switch link */}
            <div className="mt-6 pt-5 border-t border-slate-800 text-center">
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
          <div className="mt-8 rounded-2xl border border-slate-800/80 bg-slate-900/50 backdrop-blur-md p-5">
            <div className="flex items-center justify-between mb-3.5">
              <div className="flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-teal-400" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Showcase Demo Accounts
                </h2>
              </div>
              <span className="text-[10px] font-semibold text-teal-400 bg-teal-500/10 border border-teal-500/20 px-2 py-0.5 rounded-full">
                Tap card to populate
              </span>
            </div>

            <div className="space-y-2.5">
              {DEMO_ACCOUNTS.map((acc) => {
                const Icon = acc.icon;
                return (
                  <div
                    key={acc.username}
                    className="group border border-slate-800/70 hover:border-teal-500/50 rounded-xl p-3 bg-slate-950/50 hover:bg-slate-950/90 transition-all flex items-center justify-between gap-3 text-left"
                  >
                    <button
                      type="button"
                      onClick={() => fillDemoAccount(acc, false)}
                      className="flex-1 flex items-start gap-3 min-w-0"
                    >
                      <div className="w-8 h-8 rounded-lg bg-slate-800/80 flex items-center justify-center shrink-0 text-teal-400 group-hover:bg-teal-600 group-hover:text-white transition-colors">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-white group-hover:text-teal-300 transition-colors">
                            @{acc.username}
                          </span>
                          <span className={`text-[10px] font-semibold px-2 py-0.2 rounded-full border ${acc.badgeColor}`}>
                            {acc.badge}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 truncate mt-0.5">{acc.desc}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5 font-mono">
                          Password: <span className="text-teal-300 font-semibold">{acc.password}</span>{' '}
                          <span className="text-slate-500">(or {acc.fallbackPassword})</span>
                        </p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => fillDemoAccount(acc, true)}
                      disabled={loading}
                      className="shrink-0 text-[11px] font-bold px-2.5 py-1.5 rounded-lg bg-teal-600/20 text-teal-300 hover:bg-teal-600 hover:text-white transition-colors border border-teal-500/30"
                      title={`Sign in immediately as @${acc.username}`}
                    >
                      Quick Sign In
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="mt-3.5 pt-3 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400">
              <span className="flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-teal-400" />
                Live Supabase Auth &amp; SSR
              </span>
              <span>Showcase passwords: Role-specific or KindLink#2026</span>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full py-4 text-center text-xs text-slate-500 border-t border-slate-900">
        <p>KindLink Mutual Aid Network &bull; Asansol Engineering College &bull; Non-Profit Public Good</p>
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
