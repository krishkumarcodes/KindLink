'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Clock,
  UserCheck,
  FileText,
  AlertTriangle,
  Loader2,
  ArrowLeft,
  RefreshCw,
  MapPin,
  Briefcase,
  UserX,
  Mail,
  Phone,
  Building2,
  Calendar,
  Search,
  Filter,
  MessageSquare,
  X,
  AlertCircle,
  Check,
  Lock,
} from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import {
  VerificationRequestItem,
  ProfessionalProofItem,
  DeletionRequestItem,
} from '@/lib/data/types';

type AdminTab = 'verifications' | 'professional-proofs' | 'deletion-requests' | 'reports';
type StatusFilter = 'all' | 'pending' | 'resolved';

interface ModalState {
  open: boolean;
  type: 'needs_info' | 'reject';
  targetType: 'verification' | 'professional-proof' | 'deletion';
  targetId: string;
  targetUserName: string;
}

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<AdminTab>('verifications');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('pending');
  const [searchQuery, setSearchQuery] = useState('');

  // Queue Data
  const [verifications, setVerifications] = useState<any[]>([]);
  const [professionalProofs, setProfessionalProofs] = useState<any[]>([]);
  const [deletionRequests, setDeletionRequests] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);

  // Current Admin State
  const [currentAdminId, setCurrentAdminId] = useState<string | null>(null);
  const [currentAdminRole, setCurrentAdminRole] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);

  // Note / Reason Modal State
  const [actionModal, setActionModal] = useState<ModalState | null>(null);
  const [modalReason, setModalReason] = useState('');
  const [submittingModal, setSubmittingModal] = useState(false);

  // Fetch Current Admin ID & Profile
  useEffect(() => {
    const fetchAdminProfile = async () => {
      try {
        const res = await fetch('/api/auth/profile');
        if (res.ok) {
          const data = await res.json();
          setCurrentAdminId(data.profile?.id || null);
          setCurrentAdminRole(data.profile?.role || null);
        }
      } catch (err) {
        console.warn('[Admin Portal] Error fetching profile:', err);
      }
    };
    fetchAdminProfile();
  }, []);

  // Fetch Queue Data
  const fetchData = async () => {
    setLoading(true);
    setForbidden(false);
    try {
      const [vRes, pRes, dRes, rRes] = await Promise.all([
        fetch('/api/admin/verification'),
        fetch('/api/admin/professional-proofs'),
        fetch('/api/admin/deletion-requests'),
        fetch('/api/admin/reports'),
      ]);

      if (vRes.status === 403 || rRes.status === 403) {
        setForbidden(true);
        setLoading(false);
        return;
      }

      if (vRes.ok) {
        const vData = await vRes.json();
        setVerifications(vData.requests || []);
      }
      if (pRes.ok) {
        const pData = await pRes.json();
        setProfessionalProofs(pData.proofs || []);
      }
      if (dRes.ok) {
        const dData = await dRes.json();
        setDeletionRequests(dData.requests || []);
      }
      if (rRes.ok) {
        const rData = await rRes.json();
        setReports(rData.reports || []);
      }
    } catch (err) {
      console.warn('[Admin Portal] Error fetching queues:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Setup Real-time updates & background sync
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel('admin-queue-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'verification_requests' },
        () => fetchData()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'professional_proofs' },
        () => fetchData()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'deletion_requests' },
        () => fetchData()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'reports' },
        () => fetchData()
      )
      .subscribe();

    // 15-second background polling fallback
    const interval = setInterval(() => {
      fetchData();
    }, 15000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, []);

  // Live counts for queue tabs
  const pendingVerificationsCount = useMemo(
    () => verifications.filter((v) => v.status === 'pending' || v.status === 'needs_info').length,
    [verifications]
  );
  const pendingProofsCount = useMemo(
    () => professionalProofs.filter((p) => p.status === 'pending' || p.status === 'needs_info').length,
    [professionalProofs]
  );
  const pendingDeletionsCount = useMemo(
    () => deletionRequests.filter((d) => d.status === 'pending' || d.status === 'needs_info').length,
    [deletionRequests]
  );
  const pendingReportsCount = useMemo(
    () => reports.filter((r) => r.status === 'pending').length,
    [reports]
  );

  // Verification Actions
  const handleVerificationAction = async (
    requestId: string,
    action: 'approve' | 'needs_info' | 'reject',
    note?: string
  ) => {
    setActionLoading(requestId);
    try {
      const res = await fetch('/api/admin/verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, action, adminNote: note }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Action failed');
      }

      toast.success(
        action === 'approve'
          ? 'Verification approved!'
          : action === 'needs_info'
          ? 'Information requested from user'
          : 'Verification request rejected'
      );
      await fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Operation failed');
    } finally {
      setActionLoading(null);
    }
  };

  // Professional Proof Actions
  const handleProofAction = async (
    proofId: string,
    action: 'approve' | 'needs_info' | 'reject',
    note?: string
  ) => {
    setActionLoading(proofId);
    try {
      const res = await fetch('/api/admin/professional-proofs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ proofId, action, adminNote: note }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Action failed');
      }

      toast.success(
        action === 'approve'
          ? 'Professional proof approved!'
          : action === 'needs_info'
          ? 'Information requested from user'
          : 'Proof rejected'
      );
      await fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Operation failed');
    } finally {
      setActionLoading(null);
    }
  };

  // Deletion Request Actions
  const handleDeletionAction = async (
    requestId: string,
    action: 'approve' | 'needs_info' | 'reject',
    note?: string
  ) => {
    if (action === 'approve' && !confirm('Are you certain? Approving will permanently delete this user account and its data.')) {
      return;
    }

    setActionLoading(requestId);
    try {
      const res = await fetch('/api/admin/deletion-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, action, adminNote: note }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Action failed');
      }

      toast.success(
        action === 'approve'
          ? 'Account deletion approved and purged.'
          : action === 'needs_info'
          ? 'Requested clarification from user.'
          : 'Deletion request rejected.'
      );
      await fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Operation failed');
    } finally {
      setActionLoading(null);
    }
  };

  // Report Actions
  const handleReportAction = async (reportId: string, status: 'resolved' | 'dismissed') => {
    setActionLoading(reportId);
    try {
      const res = await fetch('/api/admin/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportId, status }),
      });
      if (res.ok) {
        toast.success(`Report marked ${status}`);
        await fetchData();
      }
    } finally {
      setActionLoading(null);
    }
  };

  // Submit Modal Action (needs_info / reject)
  const handleModalSubmit = async () => {
    if (!actionModal) return;
    if (!modalReason.trim()) {
      toast.error('A note or reason is required.');
      return;
    }

    setSubmittingModal(true);
    try {
      if (actionModal.targetType === 'verification') {
        await handleVerificationAction(actionModal.targetId, actionModal.type, modalReason.trim());
      } else if (actionModal.targetType === 'professional-proof') {
        await handleProofAction(actionModal.targetId, actionModal.type, modalReason.trim());
      } else if (actionModal.targetType === 'deletion') {
        await handleDeletionAction(actionModal.targetId, actionModal.type, modalReason.trim());
      }
      setActionModal(null);
      setModalReason('');
    } finally {
      setSubmittingModal(false);
    }
  };

  // Filter items
  const filterItems = (list: any[]) => {
    return list.filter((item) => {
      // Status Filter
      if (statusFilter === 'pending') {
        if (item.status !== 'pending' && item.status !== 'needs_info') return false;
      } else if (statusFilter === 'resolved') {
        if (item.status === 'pending' || item.status === 'needs_info') return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const username = item.profiles?.username?.toLowerCase() || '';
        const displayName = item.profiles?.display_name?.toLowerCase() || '';
        const email = item.profiles?.email?.toLowerCase() || '';
        const phone = item.phone?.toLowerCase() || item.profiles?.phone?.toLowerCase() || '';
        const profession = item.profession_type?.toLowerCase() || '';
        const regNo = item.registration_number?.toLowerCase() || '';

        return (
          username.includes(query) ||
          displayName.includes(query) ||
          email.includes(query) ||
          phone.includes(query) ||
          profession.includes(query) ||
          regNo.includes(query)
        );
      }

      return true;
    });
  };

  const filteredVerifications = useMemo(() => filterItems(verifications), [verifications, statusFilter, searchQuery]);
  const filteredProofs = useMemo(() => filterItems(professionalProofs), [professionalProofs, statusFilter, searchQuery]);
  const filteredDeletions = useMemo(() => filterItems(deletionRequests), [deletionRequests, statusFilter, searchQuery]);
  const filteredReports = useMemo(() => {
    return reports.filter((r) => {
      if (statusFilter === 'pending') return r.status === 'pending';
      if (statusFilter === 'resolved') return r.status !== 'pending';
      return true;
    });
  }, [reports, statusFilter]);

  if (forbidden) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-center shadow-sm">
          <div className="w-12 h-12 bg-rose-100 dark:bg-rose-950/60 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h1 className="text-lg font-bold text-slate-900 dark:text-white">Admin Privileges Required</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
            Your user account is not currently registered as an administrator in the database.
          </p>
          <div className="mt-4 p-3 bg-slate-100 dark:bg-slate-800 rounded-xl text-left text-xs font-mono text-slate-600 dark:text-slate-300">
            Run 10_make_me_admin.sql in your Supabase SQL Editor with your username to activate admin access.
          </div>
          <Link
            href="/"
            className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-teal-600 hover:text-teal-700"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 pb-16">
      {/* Top Header */}
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-base">KindLink Admin Portal</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-teal-100 dark:bg-teal-950/70 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                  Staff Only
                </span>
                <span className="hidden sm:inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                  <Lock className="w-3 h-3 text-amber-500" />
                  Self-approval protected
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Identity verification audit, professional proofs & community trust moderation
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchData}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Navigation Tabs with Live Counts */}
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 dark:border-slate-800">
          {/* Tab 1: Verification Requests */}
          <button
            onClick={() => setActiveTab('verifications')}
            className={`pb-3 px-3 text-sm font-semibold flex items-center gap-2 transition-colors border-b-2 ${
              activeTab === 'verifications'
                ? 'border-teal-600 text-teal-600 dark:text-teal-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>Verification Requests</span>
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                pendingVerificationsCount > 0
                  ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/70 dark:text-amber-300'
                  : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
              }`}
            >
              {pendingVerificationsCount}
            </span>
          </button>

          {/* Tab 2: Professional Proofs */}
          <button
            onClick={() => setActiveTab('professional-proofs')}
            className={`pb-3 px-3 text-sm font-semibold flex items-center gap-2 transition-colors border-b-2 ${
              activeTab === 'professional-proofs'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            <Briefcase className="w-4 h-4" />
            <span>Professional Proofs</span>
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                pendingProofsCount > 0
                  ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-300'
                  : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
              }`}
            >
              {pendingProofsCount}
            </span>
          </button>

          {/* Tab 3: Account Deletion Requests */}
          <button
            onClick={() => setActiveTab('deletion-requests')}
            className={`pb-3 px-3 text-sm font-semibold flex items-center gap-2 transition-colors border-b-2 ${
              activeTab === 'deletion-requests'
                ? 'border-rose-600 text-rose-600 dark:text-rose-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            <UserX className="w-4 h-4" />
            <span>Account Deletions</span>
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                pendingDeletionsCount > 0
                  ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/70 dark:text-rose-300'
                  : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
              }`}
            >
              {pendingDeletionsCount}
            </span>
          </button>

          {/* Tab 4: Community Reports */}
          <button
            onClick={() => setActiveTab('reports')}
            className={`pb-3 px-3 text-sm font-semibold flex items-center gap-2 transition-colors border-b-2 ${
              activeTab === 'reports'
                ? 'border-teal-600 text-teal-600 dark:text-teal-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            <AlertTriangle className="w-4 h-4" />
            <span>Reports ({pendingReportsCount})</span>
          </button>

          <Link
            href="/admin/maps"
            className="pb-3 px-3 text-sm font-semibold flex items-center gap-2 transition-colors border-b-2 border-transparent text-slate-500 hover:text-teal-600 dark:hover:text-teal-400 ml-auto"
          >
            <MapPin className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            <span>Maps Quotas</span>
          </Link>
        </div>

        {/* Filter Toolbar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 shadow-sm">
          {/* Status Pills */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl">
            <button
              onClick={() => setStatusFilter('pending')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                statusFilter === 'pending'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Action Required
            </button>
            <button
              onClick={() => setStatusFilter('resolved')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                statusFilter === 'resolved'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Resolved History
            </button>
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                statusFilter === 'all'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              All Items
            </button>
          </div>

          {/* Search box */}
          <div className="relative flex-1 max-w-xs">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search user, email, phone..."
              className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500/20"
            />
          </div>
        </div>

        {/* =========================================================================
            TAB 1: VERIFICATION REQUESTS
           ========================================================================= */}
        {activeTab === 'verifications' && (
          <div className="space-y-4">
            {loading ? (
              <div className="py-16 flex justify-center items-center text-slate-400 gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Loading verification submissions...</span>
              </div>
            ) : filteredVerifications.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-10 text-center text-slate-500 space-y-1">
                <ShieldCheck className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                <p className="font-semibold text-slate-700 dark:text-slate-300">No verification requests found</p>
                <p className="text-xs text-slate-400">All submissions have been audited or filter criteria matched no items.</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {filteredVerifications.map((item) => {
                  const isOwnRequest = currentAdminId && currentAdminId === item.user_id;
                  const profile = item.profiles || {};

                  return (
                    <div
                      key={item.id}
                      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4 hover:border-slate-300 dark:hover:border-slate-700 transition"
                    >
                      {/* Item Header */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 dark:text-white text-base">
                            {profile.display_name || profile.username || 'Community Member'}
                          </span>
                          <span className="text-xs text-slate-500 font-mono">@{profile.username || 'user'}</span>
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wide ${
                              item.status === 'verified'
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                                : item.status === 'needs_info'
                                ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400'
                                : item.status === 'rejected'
                                ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400'
                                : 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400'
                            }`}
                          >
                            {item.status === 'needs_info' ? 'Needs Info' : item.status}
                          </span>

                          {isOwnRequest && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 flex items-center gap-1">
                              <Lock className="w-2.5 h-2.5" />
                              Your Request
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-xs text-slate-400">
                          <Clock className="w-3.5 h-3.5" />
                          <span>Submitted {new Date(item.created_at).toLocaleString()}</span>
                        </div>
                      </div>

                      {/* User's Details Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 text-xs">
                        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                          <span className="text-[10px] text-slate-400 uppercase font-semibold block mb-0.5">Phone Number</span>
                          <span className="font-mono font-medium text-slate-800 dark:text-slate-200 block truncate">
                            {item.phone || profile.phone || '—'}
                          </span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                          <span className="text-[10px] text-slate-400 uppercase font-semibold block mb-0.5">Email</span>
                          <span className="font-mono font-medium text-slate-800 dark:text-slate-200 block truncate">
                            {profile.email || '—'}
                          </span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                          <span className="text-[10px] text-slate-400 uppercase font-semibold block mb-0.5">Organisation</span>
                          <span className="font-medium text-slate-800 dark:text-slate-200 block truncate">
                            {profile.college || '—'}
                          </span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                          <span className="text-[10px] text-slate-400 uppercase font-semibold block mb-0.5">Area</span>
                          <span className="font-medium text-slate-800 dark:text-slate-200 block truncate">
                            {profile.homeNeighborhood || 'Asansol'}
                          </span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                          <span className="text-[10px] text-slate-400 uppercase font-semibold block mb-0.5">Member Since</span>
                          <span className="font-medium text-slate-800 dark:text-slate-200 block truncate">
                            {profile.created_at ? new Date(profile.created_at).toLocaleDateString() : 'Active Member'}
                          </span>
                        </div>
                      </div>

                      {/* Document via Short-Lived Signed URL */}
                      <div className="p-3 rounded-xl bg-slate-100/70 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
                          <div className="text-xs">
                            <span className="font-semibold text-slate-800 dark:text-slate-200">
                              {item.document_type || 'ID Document'}:
                            </span>{' '}
                            {item.signedUrl ? (
                              <a
                                href={item.signedUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="font-semibold text-teal-600 dark:text-teal-400 hover:underline inline-flex items-center gap-1"
                              >
                                <span>Inspect Uploaded ID Document (Signed Link)</span>
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            ) : (
                              <span className="text-slate-400 italic">No document attached (optional submission)</span>
                            )}
                          </div>
                        </div>

                        <span className="text-[10px] font-medium text-slate-400 bg-white dark:bg-slate-900 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700 shrink-0">
                          30-day auto-purge retention
                        </span>
                      </div>

                      {/* History & Notes */}
                      {item.admin_note && (
                        <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2">
                          <MessageSquare className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold">Admin Note:</span> {item.admin_note}
                          </div>
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="flex items-center justify-between pt-1">
                        <div className="text-xs text-slate-400">
                          {item.reviewed_at && (
                            <span>Audited on {new Date(item.reviewed_at).toLocaleDateString()}</span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          {isOwnRequest ? (
                            <span
                              title="Admins cannot approve their own requests!"
                              className="text-xs font-semibold text-slate-400 italic px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center gap-1"
                            >
                              <Lock className="w-3 h-3 text-amber-500" />
                              Self-approval prohibited
                            </span>
                          ) : (
                            <>
                              <button
                                onClick={() => handleVerificationAction(item.id, 'approve')}
                                disabled={actionLoading === item.id || item.status === 'verified'}
                                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-50"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Approve</span>
                              </button>

                              <button
                                onClick={() =>
                                  setActionModal({
                                    open: true,
                                    type: 'needs_info',
                                    targetType: 'verification',
                                    targetId: item.id,
                                    targetUserName: profile.display_name || profile.username || 'user',
                                  })
                                }
                                disabled={actionLoading === item.id}
                                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-50"
                              >
                                <AlertCircle className="w-3.5 h-3.5" />
                                <span>Ask for info</span>
                              </button>

                              <button
                                onClick={() =>
                                  setActionModal({
                                    open: true,
                                    type: 'reject',
                                    targetType: 'verification',
                                    targetId: item.id,
                                    targetUserName: profile.display_name || profile.username || 'user',
                                  })
                                }
                                disabled={actionLoading === item.id}
                                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-50"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                <span>Reject</span>
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* =========================================================================
            TAB 2: PROFESSIONAL PROOFS
           ========================================================================= */}
        {activeTab === 'professional-proofs' && (
          <div className="space-y-4">
            {loading ? (
              <div className="py-16 flex justify-center items-center text-slate-400 gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Loading professional proofs...</span>
              </div>
            ) : filteredProofs.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-10 text-center text-slate-500 space-y-1">
                <Briefcase className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                <p className="font-semibold text-slate-700 dark:text-slate-300">No professional proofs pending</p>
                <p className="text-xs text-slate-400">All submitted doctor, nurse, teacher, or student credentials are verified.</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {filteredProofs.map((item) => {
                  const isOwnRequest = currentAdminId && currentAdminId === item.user_id;
                  const profile = item.profiles || {};

                  return (
                    <div
                      key={item.id}
                      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4 hover:border-slate-300 dark:hover:border-slate-700 transition"
                    >
                      {/* Item Header */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 dark:text-white text-base">
                            {profile.display_name || profile.username || 'Professional'}
                          </span>
                          <span className="text-xs text-slate-500 font-mono">@{profile.username || 'user'}</span>
                          <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                            {item.profession_type}
                          </span>
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wide ${
                              item.status === 'verified'
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                                : item.status === 'needs_info'
                                ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400'
                                : item.status === 'rejected'
                                ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400'
                                : 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400'
                            }`}
                          >
                            {item.status === 'needs_info' ? 'Needs Info' : item.status}
                          </span>

                          {isOwnRequest && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 flex items-center gap-1">
                              <Lock className="w-2.5 h-2.5" />
                              Your Request
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-xs text-slate-400">
                          <Clock className="w-3.5 h-3.5" />
                          <span>Submitted {new Date(item.created_at).toLocaleString()}</span>
                        </div>
                      </div>

                      {/* Details Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 text-xs">
                        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                          <span className="text-[10px] text-slate-400 uppercase font-semibold block mb-0.5">Reg. / ID Number</span>
                          <span className="font-mono font-bold text-slate-800 dark:text-slate-200 block truncate">
                            {item.registration_number}
                          </span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                          <span className="text-[10px] text-slate-400 uppercase font-semibold block mb-0.5">Email</span>
                          <span className="font-mono font-medium text-slate-800 dark:text-slate-200 block truncate">
                            {profile.email || '—'}
                          </span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                          <span className="text-[10px] text-slate-400 uppercase font-semibold block mb-0.5">Phone</span>
                          <span className="font-mono font-medium text-slate-800 dark:text-slate-200 block truncate">
                            {profile.phone || '—'}
                          </span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                          <span className="text-[10px] text-slate-400 uppercase font-semibold block mb-0.5">Organisation</span>
                          <span className="font-medium text-slate-800 dark:text-slate-200 block truncate">
                            {profile.college || '—'}
                          </span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                          <span className="text-[10px] text-slate-400 uppercase font-semibold block mb-0.5">Member Since</span>
                          <span className="font-medium text-slate-800 dark:text-slate-200 block truncate">
                            {profile.created_at ? new Date(profile.created_at).toLocaleDateString() : '—'}
                          </span>
                        </div>
                      </div>

                      {/* Document via Signed URL */}
                      <div className="p-3 rounded-xl bg-slate-100/70 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                          <div className="text-xs">
                            <span className="font-semibold text-slate-800 dark:text-slate-200">
                              Credential Document ({item.document_name || 'Proof file'}):
                            </span>{' '}
                            {item.signedUrl ? (
                              <a
                                href={item.signedUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1"
                              >
                                <span>Inspect Proof Document (Signed Link)</span>
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            ) : (
                              <span className="text-slate-400 italic">No document file found</span>
                            )}
                          </div>
                        </div>

                        <span className="text-[10px] font-medium text-slate-400 bg-white dark:bg-slate-900 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700 shrink-0">
                          30-day auto-purge retention
                        </span>
                      </div>

                      {/* History & Notes */}
                      {item.admin_note && (
                        <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2">
                          <MessageSquare className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold">Admin Note:</span> {item.admin_note}
                          </div>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex items-center justify-between pt-1">
                        <div className="text-xs text-slate-400">
                          {item.reviewed_at && (
                            <span>Audited on {new Date(item.reviewed_at).toLocaleDateString()}</span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          {isOwnRequest ? (
                            <span
                              title="Admins cannot approve their own requests!"
                              className="text-xs font-semibold text-slate-400 italic px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center gap-1"
                            >
                              <Lock className="w-3 h-3 text-amber-500" />
                              Self-approval prohibited
                            </span>
                          ) : (
                            <>
                              <button
                                onClick={() => handleProofAction(item.id, 'approve')}
                                disabled={actionLoading === item.id || item.status === 'verified'}
                                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-50"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Approve</span>
                              </button>

                              <button
                                onClick={() =>
                                  setActionModal({
                                    open: true,
                                    type: 'needs_info',
                                    targetType: 'professional-proof',
                                    targetId: item.id,
                                    targetUserName: profile.display_name || profile.username || 'user',
                                  })
                                }
                                disabled={actionLoading === item.id}
                                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-50"
                              >
                                <AlertCircle className="w-3.5 h-3.5" />
                                <span>Ask for info</span>
                              </button>

                              <button
                                onClick={() =>
                                  setActionModal({
                                    open: true,
                                    type: 'reject',
                                    targetType: 'professional-proof',
                                    targetId: item.id,
                                    targetUserName: profile.display_name || profile.username || 'user',
                                  })
                                }
                                disabled={actionLoading === item.id}
                                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-50"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                <span>Reject</span>
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* =========================================================================
            TAB 3: ACCOUNT DELETION REQUESTS
           ========================================================================= */}
        {activeTab === 'deletion-requests' && (
          <div className="space-y-4">
            {loading ? (
              <div className="py-16 flex justify-center items-center text-slate-400 gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Loading deletion requests...</span>
              </div>
            ) : filteredDeletions.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-10 text-center text-slate-500 space-y-1">
                <UserCheck className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                <p className="font-semibold text-slate-700 dark:text-slate-300">No account deletions pending</p>
                <p className="text-xs text-slate-400">All privacy closure requests are up to date.</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {filteredDeletions.map((item) => {
                  const isOwnRequest = currentAdminId && currentAdminId === item.user_id;
                  const profile = item.profiles || {};

                  return (
                    <div
                      key={item.id}
                      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4 hover:border-slate-300 dark:hover:border-slate-700 transition"
                    >
                      {/* Item Header */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 dark:text-white text-base">
                            {profile.display_name || profile.username || 'User Account'}
                          </span>
                          <span className="text-xs text-slate-500 font-mono">@{profile.username || 'user'}</span>
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wide ${
                              item.status === 'approved'
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                                : item.status === 'needs_info'
                                ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400'
                                : item.status === 'rejected'
                                ? 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
                                : 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400'
                            }`}
                          >
                            {item.status}
                          </span>

                          {isOwnRequest && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 flex items-center gap-1">
                              <Lock className="w-2.5 h-2.5" />
                              Your Request
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-xs text-slate-400">
                          <Clock className="w-3.5 h-3.5" />
                          <span>Submitted {new Date(item.created_at).toLocaleString()}</span>
                        </div>
                      </div>

                      {/* Details Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                          <span className="text-[10px] text-slate-400 uppercase font-semibold block mb-0.5">Email</span>
                          <span className="font-mono font-medium text-slate-800 dark:text-slate-200 block truncate">
                            {profile.email || '—'}
                          </span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                          <span className="text-[10px] text-slate-400 uppercase font-semibold block mb-0.5">Phone</span>
                          <span className="font-mono font-medium text-slate-800 dark:text-slate-200 block truncate">
                            {profile.phone || '—'}
                          </span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                          <span className="text-[10px] text-slate-400 uppercase font-semibold block mb-0.5">Organisation</span>
                          <span className="font-medium text-slate-800 dark:text-slate-200 block truncate">
                            {profile.college || '—'}
                          </span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                          <span className="text-[10px] text-slate-400 uppercase font-semibold block mb-0.5">Join Date</span>
                          <span className="font-medium text-slate-800 dark:text-slate-200 block truncate">
                            {profile.created_at ? new Date(profile.created_at).toLocaleDateString() : '—'}
                          </span>
                        </div>
                      </div>

                      {/* Reason text */}
                      <div className="p-3 rounded-xl bg-slate-100/70 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 text-xs">
                        <span className="font-semibold text-slate-700 dark:text-slate-300">Stated Deletion Reason:</span>{' '}
                        <span className="italic text-slate-600 dark:text-slate-400">
                          &quot;{item.reason || 'User requested account deletion.'}&quot;
                        </span>
                      </div>

                      {/* History & Notes */}
                      {item.admin_note && (
                        <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2">
                          <MessageSquare className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold">Admin Note:</span> {item.admin_note}
                          </div>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex items-center justify-between pt-1">
                        <div className="text-xs text-slate-400">
                          {item.reviewed_at && (
                            <span>Audited on {new Date(item.reviewed_at).toLocaleDateString()}</span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          {isOwnRequest ? (
                            <span
                              title="Admins cannot approve their own requests!"
                              className="text-xs font-semibold text-slate-400 italic px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center gap-1"
                            >
                              <Lock className="w-3 h-3 text-amber-500" />
                              Self-approval prohibited
                            </span>
                          ) : (
                            <>
                              <button
                                onClick={() => handleDeletionAction(item.id, 'approve')}
                                disabled={actionLoading === item.id || item.status === 'approved'}
                                className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-50"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Approve Deletion</span>
                              </button>

                              <button
                                onClick={() =>
                                  setActionModal({
                                    open: true,
                                    type: 'needs_info',
                                    targetType: 'deletion',
                                    targetId: item.id,
                                    targetUserName: profile.display_name || profile.username || 'user',
                                  })
                                }
                                disabled={actionLoading === item.id}
                                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-50"
                              >
                                <AlertCircle className="w-3.5 h-3.5" />
                                <span>Ask for info</span>
                              </button>

                              <button
                                onClick={() =>
                                  setActionModal({
                                    open: true,
                                    type: 'reject',
                                    targetType: 'deletion',
                                    targetId: item.id,
                                    targetUserName: profile.display_name || profile.username || 'user',
                                  })
                                }
                                disabled={actionLoading === item.id}
                                className="px-3 py-1.5 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-50"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                <span>Deny</span>
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* =========================================================================
            TAB 4: COMMUNITY REPORTS
           ========================================================================= */}
        {activeTab === 'reports' && (
          <div className="space-y-4">
            {loading ? (
              <div className="py-16 flex justify-center items-center text-slate-400 gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Loading reports...</span>
              </div>
            ) : filteredReports.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-10 text-center text-slate-500 space-y-1">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                <p className="font-semibold text-slate-700 dark:text-slate-300">Community feed is clean</p>
                <p className="text-xs text-slate-400">No safety reports pending moderator review.</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {filteredReports.map((r) => (
                  <div
                    key={r.id}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-sm text-slate-900 dark:text-white">
                          Reason: {r.reason}
                        </span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                            r.status === 'resolved'
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-amber-100 text-amber-700'
                          }`}
                        >
                          {r.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">
                        Reported by: @{r.profiles?.username || 'user'} on{' '}
                        {new Date(r.created_at).toLocaleDateString()}
                      </p>
                      {r.requests && (
                        <p className="text-xs text-teal-600 dark:text-teal-400 mt-1">
                          Related Request: &quot;{r.requests.title}&quot; ({r.requests.category})
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {r.status === 'pending' ? (
                        <>
                          <button
                            onClick={() => handleReportAction(r.id, 'resolved')}
                            disabled={actionLoading === r.id}
                            className="px-3 py-1.5 bg-teal-600 text-white rounded-xl text-xs font-semibold hover:bg-teal-700"
                          >
                            Mark Resolved
                          </button>
                          <button
                            onClick={() => handleReportAction(r.id, 'dismissed')}
                            disabled={actionLoading === r.id}
                            className="px-3 py-1.5 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold hover:bg-slate-300"
                          >
                            Dismiss
                          </button>
                        </>
                      ) : (
                        <span className="text-xs text-slate-400 font-medium">Audited</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* =========================================================================
          REASON / NOTE MODAL (For "Ask for More Information" & "Reject")
         ========================================================================= */}
      {actionModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
        >
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl text-left space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div
                  className={`p-2 rounded-xl ${
                    actionModal.type === 'needs_info'
                      ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-600'
                      : 'bg-rose-100 dark:bg-rose-950/60 text-rose-600'
                  }`}
                >
                  {actionModal.type === 'needs_info' ? (
                    <AlertCircle className="w-5 h-5" />
                  ) : (
                    <XCircle className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {actionModal.type === 'needs_info'
                      ? 'Request More Information'
                      : 'Reject Submission'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Target: @{actionModal.targetUserName}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setActionModal(null);
                  setModalReason('');
                }}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              {actionModal.type === 'needs_info'
                ? 'Specify what information or documents the volunteer needs to provide. This note will be sent as an in-app notification.'
                : 'State the clear reason for rejecting this submission. This note will be recorded in audit logs and sent to the volunteer.'}
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                {actionModal.type === 'needs_info' ? 'Required Note / Instructions' : 'Rejection Reason'}{' '}
                <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={3}
                value={modalReason}
                onChange={(e) => setModalReason(e.target.value)}
                placeholder={
                  actionModal.type === 'needs_info'
                    ? 'e.g. Please provide a clear, uncropped photo of your student ID card showing current year validity.'
                    : 'e.g. Provided ID card is expired or registration number could not be authenticated.'
                }
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                autoFocus
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setActionModal(null);
                  setModalReason('');
                }}
                disabled={submittingModal}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleModalSubmit}
                disabled={submittingModal || !modalReason.trim()}
                className={`flex-1 py-2.5 rounded-xl text-white text-xs font-bold shadow-soft transition disabled:opacity-50 ${
                  actionModal.type === 'needs_info'
                    ? 'bg-amber-600 hover:bg-amber-700'
                    : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                {submittingModal
                  ? 'Submitting...'
                  : actionModal.type === 'needs_info'
                  ? 'Send Request'
                  : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
