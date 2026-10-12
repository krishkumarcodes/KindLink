'use client';

import React, { useState } from 'react';
import {
  X,
  MapPin,
  Clock,
  ShieldCheck,
  AlertTriangle,
  Atom,
  Phone,
  Share2,
  Flag,
  HeartHandshake,
  CheckCircle2,
  Navigation,
  Car,
  Bike,
  Footprints,
} from 'lucide-react';
import { toast } from 'sonner';
import { HelpRequest, TravelMode } from '@/lib/data/types';
import { useKindLinkStore } from '@/lib/store/useKindLinkStore';
import { calculateETA, formatETA } from '@/lib/data/physics';
import { WhyThisRankModal } from './WhyThisRankModal';
import { dataAdapter } from '@/lib/data';

interface RequestDetailModalProps {
  request: HelpRequest | null;
  open: boolean;
  onClose: () => void;
}

export function RequestDetailModal({ request, open, onClose }: RequestDetailModalProps) {
  const { offerHelp, travelMode, setTravelMode, userProfile } = useKindLinkStore();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [whyRankOpen, setWhyRankOpen] = useState(false);
  const [isHelped, setIsHelped] = useState(false);
  const [contactInfo, setContactInfo] = useState<{ name: string; phone: string; relationship: string } | null>(null);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [ratingModalOpen, setRatingModalOpen] = useState(false);
  const [stars, setStars] = useState(5);
  const [ratingComment, setRatingComment] = useState('');

  React.useEffect(() => {
    if (open && request) {
      dataAdapter.getContact(request.id).then((c) => setContactInfo(c)).catch(() => setContactInfo(null));
    }
  }, [open, request]);

  if (!open || !request) return null;

  const etaMinutes = calculateETA(request.distanceKm, travelMode);

  const handleConfirmHelp = async () => {
    if (userProfile.verificationState !== 'verified') {
      toast.error('Identity Verification Required', {
        description: 'Only verified helpers can offer aid. Please upload your student/government ID under Profile.',
      });
      setConfirmOpen(false);
      return;
    }

    try {
      await offerHelp(request.id);
      setIsHelped(true);
      setConfirmOpen(false);
      toast.success('Thank you for stepping up!', {
        description: `Offer submitted to ${request.contactName}. You will receive a notification when accepted.`,
      });
      const c = await dataAdapter.getContact(request.id);
      if (c) setContactInfo(c);
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit offer');
    }
  };

  const handleShare = async () => {
    const shareData = {
      title: `KindLink Alert: ${request.title}`,
      text: `${request.title} at ${request.locationName}. Urgency: ${request.urgency}. Can you help?`,
      url: window.location.href,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {}
    } else {
      await navigator.clipboard.writeText(`${shareData.text} ${shareData.url}`);
      toast.success('Link copied to clipboard!');
    }
  };

  const handleReport = async () => {
    if (!reportReason.trim()) {
      toast.error('Please enter a reason for the report');
      return;
    }
    await dataAdapter.submitReport(request.id, reportReason);
    setReportModalOpen(false);
    setReportReason('');
    toast.info('Report submitted to Asansol moderators', {
      description: 'Our team will review this request within 15 minutes.',
    });
  };

  const handleRate = async () => {
    await dataAdapter.submitRating(request.id, request.id, stars, ratingComment);
    setRatingModalOpen(false);
    toast.success('Thank you for rating your volunteer match!');
  };


  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="w-full max-w-xl rounded-3xl bg-card border border-border p-6 shadow-2xl text-card-foreground max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-start justify-between pb-4 border-b border-border">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider ${
                    request.urgency === 'critical'
                      ? 'bg-urgency-critical/10 text-urgency-critical border border-urgency-critical/20'
                      : request.urgency === 'high'
                      ? 'bg-urgency-high/10 text-urgency-high border border-urgency-high/20'
                      : 'bg-urgency-medium/10 text-urgency-medium border border-urgency-medium/20'
                  }`}
                >
                  <AlertTriangle className="h-3 w-3 notranslate" />
                  {request.urgency}
                </span>

                <button
                  onClick={() => setWhyRankOpen(true)}
                  className="flex items-center gap-1 text-xs font-bold text-primary bg-primary/10 hover:bg-primary/20 px-2.5 py-0.5 rounded-full transition touch-target"
                >
                  <Atom className="h-3.5 w-3.5 notranslate" />
                  <span>Gravity Score: {request.helpGravityScore}</span>
                </button>
              </div>

              <h2 className="text-xl font-bold text-foreground mt-2">{request.title}</h2>
            </div>

            <button
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted touch-target"
              aria-label="Close details"
            >
              <X className="h-5 w-5 notranslate" />
            </button>
          </div>

          {/* Description & Requirements */}
          <div className="mt-4 space-y-4">
            <p className="text-sm text-foreground leading-relaxed bg-muted/40 p-4 rounded-2xl border border-border/80">
              {request.description}
            </p>

            {/* Category-specific specs */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              {request.bloodGroup && (
                <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-300">
                  <span className="block font-medium">Blood Group Needed</span>
                  <span className="text-base font-extrabold">{request.bloodGroup}</span>
                  <span className="block text-[11px] mt-0.5">{request.unitsNeeded || 1} Units</span>
                </div>
              )}
              {request.itemType && (
                <div className="p-3 rounded-2xl bg-teal-500/10 border border-teal-500/20 text-teal-700 dark:text-teal-300">
                  <span className="block font-medium">Medical Equipment</span>
                  <span className="text-base font-extrabold">{request.itemType}</span>
                  {request.itemDuration && (
                    <span className="block text-[11px] mt-0.5">{request.itemDuration}</span>
                  )}
                </div>
              )}
              {request.patientAge && (
                <div className="p-3 rounded-2xl bg-background border border-border">
                  <span className="block text-muted-foreground font-medium">Patient Age</span>
                  <span className="text-base font-extrabold text-foreground">{request.patientAge} Years</span>
                </div>
              )}
              <div className="p-3 rounded-2xl bg-background border border-border">
                <span className="block text-muted-foreground font-medium">Waiting Time</span>
                <span className="text-base font-extrabold text-foreground">{request.waitingMinutes} Minutes</span>
                <span className="block text-[11px] text-muted-foreground mt-0.5">{request.createdAt}</span>
              </div>
            </div>

            {/* Travel Mode & ETA Selector */}
            <div className="p-4 rounded-2xl bg-card border border-border space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-foreground flex items-center gap-1.5">
                  <Navigation className="h-4 w-4 text-primary notranslate" />
                  <span>Proximity & ETA ({request.distanceKm} km away)</span>
                </span>
                <span className="font-black text-primary text-sm">{formatETA(etaMinutes)}</span>
              </div>

              <div className="flex gap-2 pt-1">
                {(['bike', 'walking', 'car'] as TravelMode[]).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setTravelMode(mode)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold border transition touch-target ${
                      travelMode === mode
                        ? 'border-primary bg-primary text-white shadow-xs'
                        : 'border-border bg-background text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    {mode === 'bike' && <Bike className="h-3.5 w-3.5 notranslate" />}
                    {mode === 'walking' && <Footprints className="h-3.5 w-3.5 notranslate" />}
                    {mode === 'car' && <Car className="h-3.5 w-3.5 notranslate" />}
                    <span className="capitalize">{mode}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Location & Requester Card */}
            <div className="p-4 rounded-2xl bg-muted/60 border border-border space-y-3">
              <div className="flex items-start gap-2.5">
                <MapPin className="h-4 w-4 text-primary shrink-0 mt-0.5 notranslate" />
                <div>
                  <h4 className="text-xs font-bold text-foreground">Location</h4>
                  <p className="text-xs text-muted-foreground">{request.locationName}</p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-border/80">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-500 notranslate" />
                  <div>
                    <p className="text-xs font-bold text-foreground">{request.contactName}</p>
                    <p className="text-[11px] text-muted-foreground">{request.contactRole} · {request.verificationBadge}</p>
                  </div>
                </div>

                {contactInfo ? (
                  <a
                    href={`tel:${contactInfo.phone}`}
                    className="flex items-center gap-1.5 rounded-xl bg-emerald-600 text-white px-3 py-1.5 text-xs font-bold hover:bg-emerald-700 transition touch-target"
                  >
                    <Phone className="h-3.5 w-3.5 notranslate" />
                    <span>Call {contactInfo.phone}</span>
                  </a>
                ) : (
                  <span className="text-[11px] text-muted-foreground bg-muted px-2.5 py-1 rounded-xl">
                    Phone revealed upon match
                  </span>
                )}
              </div>
            </div>

            {/* Action buttons */}
            <div className="pt-2 flex flex-col sm:flex-row gap-3">
              {isHelped ? (
                <div className="flex-1 flex flex-col gap-2">
                  <div className="flex items-center justify-center gap-2 py-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-bold text-xs">
                    <CheckCircle2 className="h-4 w-4 notranslate" />
                    <span>Help Offered! You are connected.</span>
                  </div>
                  <button
                    onClick={async () => {
                      try {
                        await dataAdapter.completeRequest(request.id);
                        toast.success('Aid request marked completed!');
                        setRatingModalOpen(true);
                      } catch (err: any) {
                        toast.error(err.message || 'Failed to complete request');
                      }
                    }}
                    className="py-2.5 px-3 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Mark Task Completed & Leave Rating</span>
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmOpen(true)}
                  className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-primary py-3.5 px-4 text-sm font-bold text-white shadow-soft hover:bg-primary/90 transition active:scale-98 touch-target"
                >
                  <HeartHandshake className="h-5 w-5 notranslate" />
                  <span>Offer Help Now</span>
                </button>
              )}

              <div className="flex gap-2">
                <button
                  onClick={handleShare}
                  className="flex items-center justify-center gap-1.5 rounded-2xl border border-border bg-card px-4 py-3.5 text-xs font-bold text-foreground hover:bg-muted transition touch-target"
                  title="Share request"
                >
                  <Share2 className="h-4 w-4 notranslate" />
                  <span className="hidden sm:inline">Share</span>
                </button>
                <button
                  onClick={() => setReportModalOpen(true)}
                  className="flex items-center justify-center gap-1.5 rounded-2xl border border-border bg-card px-4 py-3.5 text-xs font-bold text-muted-foreground hover:text-urgency-critical hover:bg-muted transition touch-target"
                  title="Report request"
                >
                  <Flag className="h-4 w-4 notranslate" />
                  <span className="hidden sm:inline">Report</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Report Modal */}
      {reportModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in zoom-in-95 duration-150">
          <div className="w-full max-w-sm rounded-3xl bg-card border border-border p-6 shadow-2xl text-left space-y-4">
            <h3 className="text-base font-bold text-foreground">Report Inappropriate Request</h3>
            <p className="text-xs text-muted-foreground">
              Please specify reason (e.g. spam, commercial service, incorrect urgency):
            </p>
            <textarea
              rows={3}
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              placeholder="Explain the issue..."
              className="w-full p-3 rounded-xl border border-border bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setReportModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl border border-border text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleReport}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700"
              >
                Submit Report
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rating Modal */}
      {ratingModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in zoom-in-95 duration-150">
          <div className="w-full max-w-sm rounded-3xl bg-card border border-border p-6 shadow-2xl text-center space-y-4">
            <h3 className="text-base font-bold text-foreground">Rate Your Experience</h3>
            <p className="text-xs text-muted-foreground">
              Mutual ratings build community trust in Asansol and Dhanbad.
            </p>
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((s) => (
                <button
                  key={s}
                  onClick={() => setStars(s)}
                  className={`text-2xl transition ${s <= stars ? 'text-amber-500 scale-110' : 'text-slate-300'}`}
                >
                  ★
                </button>
              ))}
            </div>
            <textarea
              rows={2}
              value={ratingComment}
              onChange={(e) => setRatingComment(e.target.value)}
              placeholder="Kind, prompt, and helpful..."
              className="w-full p-2.5 rounded-xl border border-border bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <button
              onClick={handleRate}
              className="w-full py-2.5 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary/90"
            >
              Submit Rating
            </button>
          </div>
        </div>
      )}


      {/* Confirmation Dialog */}
      {confirmOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in zoom-in-95 duration-150">
          <div className="w-full max-w-sm rounded-3xl bg-card border border-border p-6 shadow-2xl text-card-foreground text-center">
            <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-3">
              <HeartHandshake className="h-6 w-6 notranslate" />
            </div>
            <h3 className="text-lg font-bold text-foreground">Confirm Offer of Help?</h3>
            <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
              You are offering aid for &quot;{request.title}&quot;. Your contact number will be safely shared with {request.contactName}.
            </p>
            <div className="mt-6 flex gap-2">
              <button
                onClick={() => setConfirmOpen(false)}
                className="flex-1 py-3 rounded-xl border border-border bg-background text-xs font-semibold hover:bg-muted transition touch-target"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmHelp}
                className="flex-1 py-3 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary/90 transition shadow-soft touch-target"
              >
                Yes, I Will Help
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Why This Rank Modal */}
      <WhyThisRankModal
        request={request}
        open={whyRankOpen}
        onClose={() => setWhyRankOpen(false)}
      />
    </>
  );
}
