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

export function ProfileView() {
  const { userProfile, updateVerificationState, requests } = useKindLinkStore();

  const [activeTab, setActiveTab] = useState<'history' | 'my-requests' | 'badges'>('history');
  const [otpModalOpen, setOtpModalOpen] = useState(false);
  const [idModalOpen, setIdModalOpen] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [selectedFileName, setSelectedFileName] = useState('AEC_Student_ID_RahulSen.pdf');

  // Verify Phone OTP
  const handleVerifyOtp = () => {
    if (otpCode.length < 4) {
      toast.error('Please enter a valid OTP code (e.g. 1234)');
      return;
    }
    updateVerificationState('verified');
    setOtpModalOpen(false);
    toast.success('Phone Number Verified Successfully!');
  };

  // Upload ID
  const handleUploadId = () => {
    updateVerificationState('pending', selectedFileName);
    setIdModalOpen(false);
    toast.success('ID Uploaded for Verification!', {
      description: 'Community moderators at AEC will review within 2 hours.',
    });
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
              {userProfile.name.charAt(0)}
            </div>
            <div className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-xl bg-emerald-500 text-white shadow-xs">
              <ShieldCheck className="h-4 w-4 notranslate" />
            </div>
          </div>

          <div className="space-y-1.5 flex-1">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h1 className="text-2xl font-bold text-foreground">{userProfile.name}</h1>
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
              {userProfile.college} · Asansol, WB
            </p>
            <p className="text-xs text-muted-foreground font-mono">{userProfile.phone} · {userProfile.email}</p>

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
              Verified with +91 98320 12345 via instant OTP code.
            </p>
            <button
              onClick={() => setOtpModalOpen(true)}
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
              <span className="text-[10px] font-bold text-emerald-600 px-2 py-0.5 rounded-full bg-emerald-500/10">
                Active
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Asansol Engineering College Student ID uploaded.
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
              <CheckCircle2 className="h-4 w-4 text-emerald-500 notranslate" />
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Endorsed by 4 student volunteers at AEC Kalyanpur.
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
            My Help History ({myHelpHistory.length})
          </button>
          <button
            onClick={() => setActiveTab('my-requests')}
            className={`px-4 py-2 rounded-2xl text-xs font-bold transition touch-target ${
              activeTab === 'my-requests'
                ? 'bg-primary text-white shadow-soft'
                : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            My Active Requests (1)
          </button>
          <button
            onClick={() => setActiveTab('badges')}
            className={`px-4 py-2 rounded-2xl text-xs font-bold transition touch-target ${
              activeTab === 'badges'
                ? 'bg-primary text-white shadow-soft'
                : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            Badges & Impact (4)
          </button>
        </div>

        {/* Tab 1: Help History */}
        {activeTab === 'history' && (
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
        )}

        {/* Tab 2: My Active Requests */}
        {activeTab === 'my-requests' && (
          <div className="p-4 rounded-2xl border border-border bg-card shadow-soft space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-foreground text-sm">
                O+ Blood Urgently Needed (2 Units)
              </span>
              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-500/10 px-2.5 py-1 rounded-full">
                2 Responders Connected
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Asansol District Hospital, SB Gorai Road · Posted 14m ago
            </p>
          </div>
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

      {/* OTP MODAL */}
      {otpModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-3xl bg-card border border-border p-6 shadow-2xl text-center space-y-4">
            <h3 className="text-lg font-bold text-foreground">Verify Phone via OTP</h3>
            <p className="text-xs text-muted-foreground">
              Enter 6-digit verification code sent to +91 98320 12345
            </p>
            <input
              type="text"
              maxLength={6}
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value)}
              placeholder="123456"
              className="w-full text-center tracking-widest text-xl font-bold p-3 rounded-2xl border border-border bg-background focus:outline-none focus:border-primary"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setOtpModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl border border-border text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleVerifyOtp}
                className="flex-1 py-2.5 rounded-xl bg-primary text-white text-xs font-bold shadow-soft"
              >
                Verify Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ID UPLOAD MODAL */}
      {idModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-3xl bg-card border border-border p-6 shadow-2xl text-center space-y-4">
            <h3 className="text-lg font-bold text-foreground">Upload Student / Govt ID</h3>
            <p className="text-xs text-muted-foreground">
              Supported files: PDF, PNG, JPG (College ID or Aadhaar Card)
            </p>
            <div className="p-6 rounded-2xl border-2 border-dashed border-border bg-muted/40 text-xs text-muted-foreground flex flex-col items-center gap-2">
              <Upload className="h-8 w-8 text-primary notranslate" />
              <span>Selected: {selectedFileName}</span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setIdModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl border border-border text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleUploadId}
                className="flex-1 py-2.5 rounded-xl bg-primary text-white text-xs font-bold shadow-soft"
              >
                Submit ID
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
