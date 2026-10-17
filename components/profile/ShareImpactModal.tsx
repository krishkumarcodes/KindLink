'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Share2,
  Download,
  Copy,
  Check,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import { ImpactStats } from './tabs/ImpactTab';
import { BadgeTier } from '@/lib/data/badges';
import { BadgeMedalIcon } from './BadgeMedalIcon';

export interface TopBadgeSummary {
  id: string;
  name: string;
  tier: BadgeTier;
  icon?: string;
}

interface ShareImpactModalProps {
  open: boolean;
  onClose: () => void;
  stats: ImpactStats;
  userName?: string;
  userHandle?: string;
  topBadges?: TopBadgeSummary[];
}

export function ShareImpactModal({
  open,
  onClose,
  stats,
  userName = 'Community Member',
  userHandle = 'user',
  topBadges = [],
}: ShareImpactModalProps) {
  const [copied, setCopied] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [canWebShareFile, setCanWebShareFile] = useState(false);

  // Read site URL strictly from NEXT_PUBLIC_SITE_URL
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://kindlink-gd8e.onrender.com';
  const profileUrl = `${siteUrl.replace(/\/$/, '')}/u/${userHandle}`;

  // Extract first name (or Title + First Name, e.g. "Dr. Ananya")
  const displayFirstName = React.useMemo(() => {
    const parts = (userName || 'Member').trim().split(/\s+/);
    if (parts.length > 1 && (parts[0].toLowerCase().startsWith('dr') || parts[0].toLowerCase().startsWith('prof'))) {
      return `${parts[0]} ${parts[1]}`;
    }
    return parts[0] || 'Member';
  }, [userName]);

  useEffect(() => {
    if (typeof navigator !== 'undefined' && typeof window !== 'undefined') {
      try {
        const dummyFile = new File(['test'], 'test.png', { type: 'image/png' });
        if (navigator.canShare && navigator.canShare({ files: [dummyFile] })) {
          setCanWebShareFile(true);
        }
      } catch {
        setCanWebShareFile(false);
      }
    }
  }, []);

  // Fallback default badges if none provided
  const displayBadges: TopBadgeSummary[] = React.useMemo(() => {
    if (topBadges && topBadges.length > 0) {
      return topBadges.slice(0, 3);
    }
    return [
      { id: 'first_help', name: 'First Help', tier: 'bronze' as BadgeTier },
      { id: 'trusted_neighbour', name: 'Trusted Neighbour', tier: 'silver' as BadgeTier },
      { id: 'community_pillar', name: 'Community Pillar', tier: 'gold' as BadgeTier },
    ];
  }, [topBadges]);

  /**
   * Generates a 1200x630 PNG blob on HTML5 Canvas
   */
  const generateCanvasImage = async (): Promise<Blob | null> => {
    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 630;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Background Gradient: Rich dark teal to deep emerald
    const bgGradient = ctx.createLinearGradient(0, 0, 1200, 630);
    bgGradient.addColorStop(0, '#0F172A'); // Slate 900
    bgGradient.addColorStop(0.5, '#0B2528'); // Deep Teal-Green
    bgGradient.addColorStop(1, '#064E3B'); // Emerald 900
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, 1200, 630);

    // Subtle radial glow highlights
    const glow1 = ctx.createRadialGradient(200, 150, 10, 200, 150, 450);
    glow1.addColorStop(0, 'rgba(13, 148, 136, 0.25)'); // Teal 600
    glow1.addColorStop(1, 'rgba(13, 148, 136, 0)');
    ctx.fillStyle = glow1;
    ctx.fillRect(0, 0, 1200, 630);

    const glow2 = ctx.createRadialGradient(1000, 500, 10, 1000, 500, 400);
    glow2.addColorStop(0, 'rgba(16, 185, 129, 0.2)'); // Emerald 500
    glow2.addColorStop(1, 'rgba(16, 185, 129, 0)');
    ctx.fillStyle = glow2;
    ctx.fillRect(0, 0, 1200, 630);

    // Inner Glass Card
    const cardX = 60;
    const cardY = 50;
    const cardW = 1080;
    const cardH = 530;
    const radius = 32;

    ctx.save();
    ctx.beginPath();
    ctx.roundRect(cardX, cardY, cardW, cardH, radius);
    ctx.fillStyle = 'rgba(15, 23, 42, 0.65)';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(20, 184, 166, 0.3)';
    ctx.stroke();
    ctx.restore();

    // KindLink Logo Pill (Top Left)
    ctx.save();
    ctx.fillStyle = '#0D9488';
    ctx.beginPath();
    ctx.roundRect(cardX + 44, cardY + 40, 50, 50, 14);
    ctx.fill();

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 22px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('KL', cardX + 69, cardY + 65);

    ctx.textAlign = 'left';
    ctx.font = 'bold 32px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#F8FAFC';
    ctx.fillText('KindLink', cardX + 108, cardY + 65);

    ctx.font = '16px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#94A3B8';
    ctx.fillText('Community Aid Network', cardX + 248, cardY + 65);
    ctx.restore();

    // Top Right: Verified Badge & Site Domain
    ctx.save();
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.font = '600 18px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#2DD4BF';
    ctx.fillText(siteUrl.replace(/^https?:\/\//, ''), cardX + cardW - 44, cardY + 65);
    ctx.restore();

    // Divider Line
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cardX + 44, cardY + 115);
    ctx.lineTo(cardX + cardW - 44, cardY + 115);
    ctx.stroke();

    // Member Identity
    ctx.save();
    ctx.font = 'bold 36px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'left';
    ctx.fillText(`${displayFirstName}'s Community Impact`, cardX + 44, cardY + 165);

    ctx.font = '500 20px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#14B8A6';
    ctx.fillText(`@${userHandle} • Verified KindLink Member`, cardX + 44, cardY + 200);
    ctx.restore();

    // 4 Stats Tiles
    const statsList = [
      { label: 'HELPS DELIVERED', value: `${stats.helpsGiven || 0}` },
      { label: 'HOURS VOLUNTEERED', value: `${stats.hoursActive || 0}h` },
      { label: 'NEIGHBOURS SUPPORTED', value: `${stats.neighboursSupported || 0}` },
      { label: 'DISTANCE LOGGED', value: `${stats.distanceCovered || 0} km` },
    ];

    const tileW = 230;
    const tileH = 110;
    const tileGap = 20;
    const startTileX = cardX + 44;
    const startTileY = cardY + 235;

    statsList.forEach((st, i) => {
      const tx = startTileX + i * (tileW + tileGap);
      const ty = startTileY;

      // Card Box
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(tx, ty, tileW, tileH, 18);
      ctx.fillStyle = 'rgba(30, 41, 59, 0.7)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Label
      ctx.font = 'bold 12px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = '#94A3B8';
      ctx.textAlign = 'center';
      ctx.fillText(st.label, tx + tileW / 2, ty + 38);

      // Value
      ctx.font = '900 34px ui-monospace, monospace';
      ctx.fillStyle = '#2DD4BF';
      ctx.fillText(st.value, tx + tileW / 2, ty + 78);
      ctx.restore();
    });

    // Bottom Shelf: Top Badges & Streak Note
    ctx.save();
    ctx.font = 'bold 14px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#CBD5E1';
    ctx.textAlign = 'left';
    ctx.fillText('TOP RECOGNITIONS', cardX + 44, cardY + 395);

    // Badges Pills
    let badgeX = cardX + 44;
    displayBadges.forEach((badge) => {
      ctx.save();
      const badgePillW = 220;
      const badgePillH = 46;
      ctx.beginPath();
      ctx.roundRect(badgeX, cardY + 415, badgePillW, badgePillH, 23);
      ctx.fillStyle = 'rgba(13, 148, 136, 0.15)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(45, 212, 191, 0.3)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Medal Tier Circle
      ctx.beginPath();
      ctx.arc(badgeX + 24, cardY + 415 + 23, 12, 0, Math.PI * 2);
      ctx.fillStyle =
        badge.tier === 'platinum'
          ? '#60A5FA'
          : badge.tier === 'gold'
          ? '#F59E0B'
          : badge.tier === 'silver'
          ? '#CBD5E1'
          : '#D97706';
      ctx.fill();

      // Badge Name
      ctx.font = '600 13px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = '#F8FAFC';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(badge.name, badgeX + 46, cardY + 415 + 23);
      ctx.restore();

      badgeX += badgePillW + 16;
    });

    // Right Side: Streak Note
    if (stats.currentStreak > 0) {
      ctx.save();
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.font = 'bold 16px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = '#F59E0B';
      ctx.fillText(`🔥 ${stats.currentStreak}-Day Active Helping Streak`, cardX + cardW - 44, cardY + 438);
      ctx.restore();
    }

    // Footer Tagline
    ctx.save();
    ctx.textAlign = 'center';
    ctx.font = '500 13px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#64748B';
    ctx.fillText('Verified Local Community Help Network • Privacy-First Community Action', cardX + cardW / 2, cardY + cardH - 24);
    ctx.restore();

    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        resolve(blob);
      }, 'image/png');
    });
  };

  /**
   * Share Image via Web Share API or download fallback
   */
  const handleShare = async () => {
    setGenerating(true);
    try {
      const blob = await generateCanvasImage();
      if (!blob) {
        throw new Error('Could not create share card');
      }

      const file = new File([blob], `kindlink-impact-${userHandle}.png`, { type: 'image/png' });

      if (navigator.share && canWebShareFile) {
        await navigator.share({
          title: `${displayFirstName}'s Community Impact on KindLink`,
          text: `Check out my verified community aid record on KindLink: ${stats.helpsGiven} helps delivered!`,
          files: [file],
          url: profileUrl,
        });
        toast.success('Shared successfully!');
      } else if (navigator.share) {
        // Fallback to text & link share
        await navigator.share({
          title: `${displayFirstName}'s Community Impact on KindLink`,
          text: `Check out my verified community aid record on KindLink: ${stats.helpsGiven} helps delivered! ${profileUrl}`,
          url: profileUrl,
        });
        toast.success('Shared link!');
      } else {
        // Fallback to direct download
        handleDownload();
      }
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        toast.error('Sharing failed, downloading image instead');
        handleDownload();
      }
    } finally {
      setGenerating(false);
    }
  };

  /**
   * Download high-res 1200x630 PNG directly
   */
  const handleDownload = async () => {
    setGenerating(true);
    try {
      const blob = await generateCanvasImage();
      if (!blob) {
        toast.error('Could not generate image');
        return;
      }

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `kindlink-impact-${userHandle}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success('Impact card downloaded!');
    } catch {
      toast.error('Download failed');
    } finally {
      setGenerating(false);
    }
  };

  /**
   * Copy profile link to clipboard
   */
  const handleCopyLink = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(profileUrl);
      setCopied(true);
      toast.success('Profile link copied to clipboard!');
      setTimeout(() => setCopied(false), 2500);
    }
  };
  const handleCopyShare = handleCopyLink;

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-impact-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-background/80 backdrop-blur-xs animate-in fade-in"
    >
      <div className="relative w-full max-w-lg rounded-3xl border border-border bg-card p-5 sm:p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400">
              <Sparkles className="h-5 w-5 notranslate" />
            </div>
            <div>
              <h3 id="share-impact-title" className="text-base font-bold text-foreground">
                Share Your Impact
              </h3>
              <p className="text-xs text-muted-foreground">
                Share your verified community record with neighbors
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-muted-foreground hover:bg-muted transition touch-target"
            aria-label="Close share card dialog"
          >
            <X className="h-5 w-5 notranslate" />
          </button>
        </div>

        {/* Visual Card Preview */}
        <div className="relative rounded-2xl border border-teal-500/30 bg-gradient-to-br from-slate-900 via-teal-950 to-emerald-950 p-4 sm:p-5 text-white shadow-lg space-y-4 overflow-hidden">
          {/* Subtle Background Glow */}
          <div className="absolute -top-12 -right-12 h-36 w-36 rounded-full bg-teal-500/20 blur-2xl pointer-events-none" />
          <div className="absolute -bottom-12 -left-12 h-36 w-36 rounded-full bg-emerald-500/20 blur-2xl pointer-events-none" />

          {/* Top Bar: Brand & Verified */}
          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-teal-500 text-white flex items-center justify-center font-black text-xs shadow-xs">
                KL
              </div>
              <span className="font-bold text-sm tracking-tight text-white">KindLink</span>
            </div>
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 text-[11px] font-semibold border border-teal-500/30">
              <ShieldCheck className="h-3 w-3 notranslate" />
              <span>Verified Aid</span>
            </div>
          </div>

          {/* User Name & Handle */}
          <div className="space-y-0.5 relative z-10 pt-1">
            <h4 className="text-lg font-black tracking-tight text-white">
              {displayFirstName}&apos;s Impact
            </h4>
            <p className="text-xs font-mono text-teal-400">@{userHandle}</p>
          </div>

          {/* 4 Stat Tiles */}
          <div className="grid grid-cols-2 gap-2 relative z-10 pt-1">
            <div className="p-2.5 rounded-xl bg-slate-900/60 border border-white/10 text-center">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Helps Delivered
              </span>
              <span className="text-xl font-black font-mono text-teal-300 block mt-0.5">
                {stats.helpsGiven || 0}
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-900/60 border border-white/10 text-center">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Hours Volunteered
              </span>
              <span className="text-xl font-black font-mono text-teal-300 block mt-0.5">
                {stats.hoursActive || 0}h
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-900/60 border border-white/10 text-center">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Neighbours
              </span>
              <span className="text-xl font-black font-mono text-teal-300 block mt-0.5">
                {stats.neighboursSupported || 0}
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-900/60 border border-white/10 text-center">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Distance Logged
              </span>
              <span className="text-xl font-black font-mono text-teal-300 block mt-0.5">
                {stats.distanceCovered || 0} km
              </span>
            </div>
          </div>

          {/* Top Badges Shelf */}
          <div className="pt-1 border-t border-white/10 relative z-10">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
              Top Recognitions
            </span>
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {displayBadges.map((b) => (
                <div
                  key={b.id}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-teal-900/40 border border-teal-500/30 text-xs font-semibold whitespace-nowrap"
                >
                  <BadgeMedalIcon
                    badgeId={b.id}
                    tier={b.tier}
                    size="sm"
                    isEarned={true}
                    className="shrink-0"
                  />
                  <span className="text-[11px] text-slate-200">{b.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Privacy Guarantee Note */}
          <div className="text-center pt-1 text-[10px] text-slate-400 border-t border-white/10">
            <span>KindLink • {siteUrl.replace(/^https?:\/\//, '')}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2 pt-1">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleShare}
              disabled={generating}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-primary text-white text-xs font-bold hover:bg-primary-hover shadow-soft transition touch-target disabled:opacity-60"
            >
              <Share2 className="h-4 w-4 notranslate" />
              <span>{generating ? 'Preparing...' : 'Share Image'}</span>
            </button>

            <button
              onClick={handleDownload}
              disabled={generating}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl border border-border bg-card text-foreground text-xs font-bold hover:bg-muted transition touch-target disabled:opacity-60"
            >
              <Download className="h-4 w-4 notranslate" />
              <span>Save PNG</span>
            </button>
          </div>

          <button
            onClick={handleCopyLink}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-2xl bg-muted/60 text-muted-foreground hover:text-foreground text-xs font-medium hover:bg-muted transition touch-target"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-primary notranslate" /> : <Copy className="h-3.5 w-3.5 notranslate" />}
            <span>{copied ? 'Link Copied!' : 'Copy Profile Link'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
