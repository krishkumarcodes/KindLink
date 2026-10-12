'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ShieldAlert,
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
} from 'lucide-react';

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<'verifications' | 'reports'>('verifications');
  const [verifications, setVerifications] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    setForbidden(false);
    try {
      const [vRes, rRes] = await Promise.all([
        fetch('/api/admin/verifications'),
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
      if (rRes.ok) {
        const rData = await rRes.json();
        setReports(rData.reports || []);
      }
    } catch {
      // Handled
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleVerificationAction = async (requestId: string, action: 'approve' | 'reject') => {
    setActionLoading(requestId);
    try {
      const res = await fetch('/api/admin/verifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, action }),
      });
      if (res.ok) {
        await fetchData();
      }
    } finally {
      setActionLoading(null);
    }
  };

  const handleReportAction = async (reportId: string, status: 'resolved' | 'dismissed') => {
    setActionLoading(reportId);
    try {
      const res = await fetch('/api/admin/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportId, status }),
      });
      if (res.ok) {
        await fetchData();
      }
    } finally {
      setActionLoading(null);
    }
  };

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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
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
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Identity verification audit & community trust moderation
              </p>
            </div>
          </div>

          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Navigation Tabs */}
        <div className="flex gap-2 border-b border-slate-200 dark:border-slate-800 mb-6">
          <button
            onClick={() => setActiveTab('verifications')}
            className={`pb-3 px-3 text-sm font-semibold flex items-center gap-2 transition-colors border-b-2 ${
              activeTab === 'verifications'
                ? 'border-teal-600 text-teal-600 dark:text-teal-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>Verification Requests ({verifications.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('reports')}
            className={`pb-3 px-3 text-sm font-semibold flex items-center gap-2 transition-colors border-b-2 ${
              activeTab === 'reports'
                ? 'border-teal-600 text-teal-600 dark:text-teal-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            <AlertTriangle className="w-4 h-4" />
            <span>Community Reports ({reports.length})</span>
          </button>
        </div>

        {/* Tab 1: Verifications */}
        {activeTab === 'verifications' && (
          <div className="space-y-4">
            {loading ? (
              <div className="py-12 flex justify-center items-center text-slate-400 gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Loading submissions...</span>
              </div>
            ) : verifications.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-center text-slate-500">
                No verification submissions pending review.
              </div>
            ) : (
              <div className="grid gap-4">
                {verifications.map((item) => (
                  <div
                    key={item.id}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-slate-900 dark:text-white">
                          @{item.profiles?.username || 'user'}
                        </span>
                        {item.profiles?.display_name && (
                          <span className="text-xs text-slate-500">({item.profiles.display_name})</span>
                        )}
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                            item.status === 'verified'
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                              : item.status === 'rejected'
                              ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400'
                              : 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400'
                          }`}
                        >
                          {item.status}
                        </span>
                      </div>

                      <div className="text-xs text-slate-500 space-y-1">
                        <div>
                          Phone: <span className="font-mono text-slate-700 dark:text-slate-300">{item.phone}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>Submitted: {new Date(item.created_at).toLocaleString()}</span>
                        </div>
                      </div>

                      {item.signedUrl ? (
                        <a
                          href={item.signedUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-teal-600 dark:text-teal-400 hover:underline"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>View Uploaded Government ID (Signed Link)</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        <span className="mt-3 block text-xs text-slate-400 italic">No document path available</span>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 shrink-0">
                      {item.status === 'pending' ? (
                        <>
                          <button
                            onClick={() => handleVerificationAction(item.id, 'approve')}
                            disabled={actionLoading === item.id}
                            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Approve</span>
                          </button>
                          <button
                            onClick={() => handleVerificationAction(item.id, 'reject')}
                            disabled={actionLoading === item.id}
                            className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Reject</span>
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

        {/* Tab 2: Reports */}
        {activeTab === 'reports' && (
          <div className="space-y-4">
            {loading ? (
              <div className="py-12 flex justify-center items-center text-slate-400 gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Loading reports...</span>
              </div>
            ) : reports.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-center text-slate-500">
                No safety reports registered. The community feed is clean.
              </div>
            ) : (
              <div className="grid gap-4">
                {reports.map((r) => (
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
                        <span className="text-xs text-slate-400 font-medium">Resolved</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
