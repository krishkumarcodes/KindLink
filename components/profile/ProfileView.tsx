'use client';

import React, { useState } from 'react';
import {
  User,
  ShieldCheck,
  Star,
  HeartHandshake,
  FileCheck,
  Phone,
  Upload,
  CheckCircle2,
  Clock,
  Sparkles,
  Award,
  LogOut,
  ChevronRight,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { useKindLinkStore } from '@/lib/store/useKindLinkStore';
import { VerificationState } from '@/lib/data/types';
import { dataAdapter } from '@/lib/data';

export function ProfileView() {
  const { userProfile, updateVerificationState, requests } = useKindLinkStore();

  const [activeTab, setActiveTab] = useState<'history' | 'my-requests' | 'badges'>('history');
  const [idModalOpen, setIdModalOpen] = useState(false);
  const [phoneInput, setPhoneInput] = useState(userProfile.phone || '');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const myActiveRequests = (requests || []).filter(
    (r) =>
      (userProfile.name && r.contactName === userProfile.name) ||
      (userProfile.phone && r.phone === userProfile.phone)
  );

  // Upload ID to private storage
  const handleUploadId = async () => {
    if (!phoneInput || phoneInput.trim().length < 10) {
      toast.error('Please enter a valid 10-digit phone number');
      return;
    }
    if (!selectedFile) {
      toast.error('Please choose a valid ID document (JPG, PNG, or PDF)');
      return;
    }

    setUploading(true);
    try {
      const res = await dataAdapter.uploadVerificationDoc(phoneInput.trim(), selectedFile);
      if (!res.success) {
        toast.error(res.error || 'Failed to submit verification document');
        setUploading(false);
        return;
      }

      updateVerificationState('pending', selectedFile.name);
      setIdModalOpen(false);
      toast.success('Document Submitted for Verification!', {
        description: 'Uploaded to private storage. Admin will review and verify your account.',
      });
    } catch (err: any) {
      toast.error(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };


  const myHelpHistory = [
    {
      id: 'hist-1',
      title: 'Delivered Emergency Blood Unit to District Hospital',
      category: 'Blood Donation',
      date: 'Yesterday at 4:30 PM',
      rating: 5.0,
      beneficiary: 'Pritam K.',
    },
    {
      id: 'hist-2',
      title: 'Provided Foldable Wheelchair to Senior Citizen',
      category: 'Medical Equipment',
      date: '3 days ago',
      rating: 5.0,
      beneficiary: 'Ananya B.',
    },
    {
      id: 'hist-3',
      title: 'Assisted High School Student with Madhyamik Books',
      category: 'Books & Study',
      date: 'Last week',
      rating: 4.8,
      beneficiary: 'Bikash D.',
    },
  ];

  return (
    <div className="flex-1 space-y-6 p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto w-full pb-24 sm:pb-8">
      {/* Profile Header Card */}
      <div className="rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-soft">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 text-center sm:text-left">
          <div className="relative">
            <div className="flex h-20 w-20 sm:h-24 sm:w-24 items-center justify-center rounded-3xl bg-primary text-white text-3xl font-extrabold shadow-soft">
              {(userProfile.name || 'Community Member').charAt(0).toUpperCase()}
            </div>
            <div className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-xl bg-emerald-500 text-white shadow-xs">
              <ShieldCheck className="h-4 w-4 notranslate" />
            </div>
          </div>

          <div className="space-y-1.5 flex-1">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h1 className="text-2xl font-bold text-foreground">{userProfile.name || 'Community Member'}</h1>
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider self-center sm:self-auto ${
                  userProfile.verificationState === 'verified'
                    ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                    : userProfile.verificationState === 'pending'
                    ? 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
                    : 'bg-muted text-muted-foreground border border-border'
                }`}
              >
                <ShieldCheck className="h-3.5 w-3.5 notranslate" />
                <span>Status: {userProfile.verificationState}</span>
              </span>
            </div>

            <p className="text-xs sm:text-sm text-muted-foreground font-medium">
              {userProfile.college || 'KindLink Community'} · Asansol, WB
            </p>
            {(userProfile.phone || userProfile.email) && (
              <p className="text-xs text-muted-foreground font-mono">
                {[userProfile.phone, userProfile.email].filter(Boolean).join(' · ')}
              </p>
            )}

            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 pt-3 text-xs">
              <div className="flex items-center gap-1 text-amber-500 font-bold">
                <Star className="h-4 w-4 fill-amber-400 notranslate" />
                <span>{userProfile.rating} Trust Score</span>
              </div>
              <div className="flex items-center gap-1 text-primary font-bold">
                <HeartHandshake className="h-4 w-4 notranslate" />
                <span>{userProfile.helpsCount} Helps Provided</span>
              </div>
              <div className="text-muted-foreground">
                <span>{userProfile.requestsCount} Requests Posted</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Verification Stepper Card */}
      <div className="rounded-3xl border border-border bg-card p-6 shadow-soft space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <FileCheck className="h-5 w-5 notranslate" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">Volunteer Trust & Verification</h2>
              <p className="text-xs text-muted-foreground">Three-tier verification for emergency responses</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
          {/* Step 1: Phone */}
          <div className="p-4 rounded-2xl bg-background border border-border space-y-2">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                <Phone className="h-4 w-4 text-primary notranslate" />
                <span>1. Phone OTP</span>
              </span>
              <CheckCircle2 className="h-4 w-4 text-emerald-500 notranslate" />
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              {userProfile.phone ? `Verified with ${userProfile.phone} via SMS/OTP.` : 'Add your phone number to enable SMS alerts.'}
            </p>
            <button
              onClick={() => setIdModalOpen(true)}
              className="text-xs font-bold text-primary hover:underline"
            >
              Update Phone →
            </button>
          </div>

          {/* Step 2: College / Govt ID */}
          <div className="p-4 rounded-2xl bg-background border border-border space-y-2">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                <Upload className="h-4 w-4 text-primary notranslate" />
                <span>2. Student / Govt ID</span>
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${userProfile.verificationState === 'verified' ? 'text-emerald-600 bg-emerald-500/10' : 'text-muted-foreground bg-muted'}`}>
                {userProfile.verificationState === 'verified' ? 'Active' : 'Pending'}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              {userProfile.idDocumentName ? `${userProfile.idDocumentName} uploaded.` : 'Upload a student or citizen ID card for verification.'}
            </p>
            <button
              onClick={() => setIdModalOpen(true)}
              className="text-xs font-bold text-primary hover:underline"
            >
              Upload / Replace ID →
            </button>
          </div>

          {/* Step 3: Community Peer Trust */}
          <div className="p-4 rounded-2xl bg-background border border-border space-y-2">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                <Award className="h-4 w-4 text-primary notranslate" />
                <span>3. Community Peer Trust</span>
              </span>
              <CheckCircle2 className={`h-4 w-4 notranslate ${userProfile.verificationState === 'verified' ? 'text-emerald-500' : 'text-muted-foreground/40'}`} />
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              {userProfile.verificationState === 'verified'
                ? 'Community verified member with peer endorsements.'
                : 'Earn peer endorsements through verified emergency responses.'}
            </p>
            <span className="text-xs font-bold text-emerald-600 block">Verified Badge Unlocked</span>
          </div>
        </div>
      </div>

      {/* Tabs Row */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 border-b border-border pb-2">
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 rounded-2xl text-xs font-bold transition touch-target ${
              activeTab === 'history'
                ? 'bg-primary text-white shadow-soft'
                : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            My Help History ({userProfile.helpsCount})
          </button>
          <button
            onClick={() => setActiveTab('my-requests')}
            className={`px-4 py-2 rounded-2xl text-xs font-bold transition touch-target ${
              activeTab === 'my-requests'
                ? 'bg-primary text-white shadow-soft'
                : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            My Active Requests ({myActiveRequests.length})
          </button>
          <button
            onClick={() => setActiveTab('badges')}
            className={`px-4 py-2 rounded-2xl text-xs font-bold transition touch-target ${
              activeTab === 'badges'
                ? 'bg-primary text-white shadow-soft'
                : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            Badges & Impact ({userProfile.badges?.length || 0})
          </button>
        </div>

        {/* Tab 1: Help History */}
        {activeTab === 'history' && (
          userProfile.helpsCount === 0 || myHelpHistory.length === 0 ? (
            <div className="p-8 rounded-2xl border border-dashed border-border bg-muted/20 text-center text-xs text-muted-foreground">
              No completed help acts recorded yet. Offer help on requests nearby to build your verified impact record!
            </div>
          ) : (
            <div className="space-y-3">
              {myHelpHistory.map((item) => (
                <div
                  key={item.id}
                  className="p-4 rounded-2xl border border-border bg-card shadow-soft flex items-center justify-between text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-foreground text-sm">{item.title}</span>
                      <span className="text-[10px] font-bold text-primary px-2 py-0.5 rounded-full bg-primary/10">
                        {item.category}
                      </span>
                    </div>
                    <p className="text-muted-foreground">
                      Assisted {item.beneficiary} • {item.date}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 font-bold text-amber-500 bg-amber-500/10 px-2.5 py-1 rounded-xl">
                    <Star className="h-3.5 w-3.5 fill-amber-400 notranslate" />
                    <span>{item.rating}</span>
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {/* Tab 2: My Active Requests */}
        {activeTab === 'my-requests' && (
          myActiveRequests.length === 0 ? (
            <div className="p-8 rounded-2xl border border-dashed border-border bg-muted/20 text-center text-xs text-muted-foreground">
              No active aid requests posted yet. You can submit an emergency or aid request from the home screen anytime.
            </div>
          ) : (
            <div className="space-y-3">
              {myActiveRequests.map((req) => (
                <div
                  key={req.id}
                  className="p-4 rounded-2xl border border-border bg-card shadow-soft space-y-2"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-foreground text-sm">{req.title}</span>
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-500/10 px-2.5 py-1 rounded-full uppercase">
                      {req.status} ({req.helpersOffered || 0} offers)
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {req.locationName} · {req.createdAt}
                  </p>
                </div>
              ))}
            </div>
          )
        )}

        {/* Tab 3: Badges */}
        {activeTab === 'badges' && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {userProfile.badges.map((badge, idx) => (
              <div
                key={idx}
                className="p-4 rounded-2xl border border-border bg-card text-center space-y-2 shadow-soft"
              >
                <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
                  <Award className="h-5 w-5 notranslate" />
                </div>
                <h4 className="text-xs font-bold text-foreground">{badge}</h4>
                <p className="text-[10px] text-muted-foreground">Asansol Community Verified</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ID UPLOAD MODAL */}
      {idModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-3xl bg-card border border-border p-6 shadow-2xl text-left space-y-4">
            <div>
              <h3 className="text-lg font-bold text-foreground">Apply for Volunteer Verification</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Verified helpers can respond to community aid requests. Upload your student or government ID.
              </p>
            </div>

            {/* Phone number */}
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">
                Phone Number (Private, shared only upon accepted match)
              </label>
              <input
                type="tel"
                value={phoneInput}
                onChange={(e) => setPhoneInput(e.target.value)}
                placeholder="+91 98765 43210"
                className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            {/* File picker */}
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">
                Select ID Document (PDF, JPG, PNG - Max 5 MB)
              </label>
              <label className="p-5 rounded-2xl border-2 border-dashed border-border bg-muted/40 text-xs text-muted-foreground flex flex-col items-center gap-2 cursor-pointer hover:bg-muted/70 transition">
                <Upload className="h-6 w-6 text-primary notranslate" />
                <span className="font-medium text-foreground text-center">
                  {selectedFile ? selectedFile.name : 'Click to select ID document'}
                </span>
                <span className="text-[11px] text-muted-foreground">Stored securely in private storage</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      if (file.size > 5 * 1024 * 1024) {
                        toast.error('File size exceeds 5 MB limit');
                        return;
                      }
                      setSelectedFile(file);
                    }
                  }}
                />
              </label>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setIdModalOpen(false)}
                disabled={uploading}
                className="flex-1 py-2.5 rounded-xl border border-border text-xs font-semibold hover:bg-muted transition"
              >
                Cancel
              </button>
              <button
                onClick={handleUploadId}
                disabled={uploading}
                className="flex-1 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-white text-xs font-bold shadow-soft transition disabled:opacity-50"
              >
                {uploading ? 'Uploading...' : 'Submit Verification'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
