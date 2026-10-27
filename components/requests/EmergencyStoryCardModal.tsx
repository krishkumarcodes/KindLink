'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X,
  Share2,
  Download,
  Copy,
  Check,
  Smartphone,
  Square,
  MessageCircle,
  Loader2,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';
import { HelpRequest } from '@/lib/data/types';
import { getCategoryToken } from '@/lib/data/categoryColors';
import { ModalOverlay } from '@/components/ui/OverlayPortal';
import type { StoryCardFormat } from '@/lib/utils/generateStoryCard';

export interface EmergencyStoryCardModalProps {
  request: HelpRequest | null;
  open: boolean;
  onClose: () => void;
  defaultFormat?: StoryCardFormat;
}

export function EmergencyStoryCardModal({
  request,
  open,
  onClose,
  defaultFormat = 'story',
}: EmergencyStoryCardModalProps) {
  const [format, setFormat] = useState<StoryCardFormat>(defaultFormat);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [canShareFile, setCanShareFile] = useState(false);

  // Read site URL from env
  const siteUrl = (
    process.env.NEXT_PUBLIC_SITE_URL || 'https://kindlink-gd8e.onrender.com'
  ).replace(/\/$/, '');

  const requestUrl = request
    ? `${siteUrl}/requests?id=${encodeURIComponent(request.id)}`
    : siteUrl;

  const categoryToken = getCategoryToken(request?.category);

  // Check Web Share File Support
  useEffect(() => {
    if (typeof navigator !== 'undefined' && typeof window !== 'undefined') {
      try {
        const dummyFile = new File(['test'], 'test.png', { type: 'image/png' });
        if (navigator.canShare && navigator.canShare({ files: [dummyFile] })) {
          setCanShareFile(true);
        }
      } catch {
        setCanShareFile(false);
      }
    }
  }, []);

  // Generate Card Image when open or format changes
  const renderCard = useCallback(async () => {
    if (!request || !open) return;
    setGenerating(true);

    try {
      const { generateStoryCardBlob } = await import('@/lib/utils/generateStoryCard');
      const generatedBlob = await generateStoryCardBlob({
        format,
        request,
        siteUrl,
      });

      if (!generatedBlob) {
        throw new Error('Failed to render canvas image');
      }

      setBlob(generatedBlob);

      // Create new Object URL and cleanup previous
      const url = URL.createObjectURL(generatedBlob);
      setPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return url;
      });
    } catch (err: any) {
      console.error('Failed to generate story card:', err);
      toast.error('Could not render preview card');
    } finally {
      setGenerating(false);
    }
  }, [request, open, format, siteUrl]);

  useEffect(() => {
    if (open && request) {
      renderCard();
    }
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [open, format, request]);

  if (!request) return null;

  // File naming
  const fileName = `kindlink-${request.category}-${request.id.slice(0, 8)}-${format}.png`;

  // Pre-filled WhatsApp and Social Share Text
  const shareTitle = `KindLink Emergency: ${request.title}`;
  const shareText = `🚨 *KINDLINK EMERGENCY AID ALERT*\n\n*${request.title}*\n📍 *Location:* ${
    request.hospitalName || request.locationName
  }\n⚡ *Urgency:* ${request.urgency.toUpperCase()}\n\nPlease help or share with nearby volunteers:\n🔗 ${requestUrl}`;

  // 1. Native Web Share (Files / Status)
  const handleNativeShare = async () => {
    if (!blob) {
      toast.error('Image is still generating...');
      return;
    }

    const file = new File([blob], fileName, { type: 'image/png' });

    try {
      if (navigator.share && canShareFile) {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          files: [file],
        });
        toast.success('Shared successfully!');
      } else if (navigator.share) {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: requestUrl,
        });
        toast.success('Link shared!');
      } else {
        // Fallback to image download
        handleDownload();
      }
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        toast.error('Sharing failed, downloading image instead');
        handleDownload();
      }
    }
  };

  // 2. Direct WhatsApp Share
  const handleWhatsAppShare = () => {
    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;
    window.open(waUrl, '_blank', 'noopener,noreferrer');
    toast.success('Opening WhatsApp with emergency alert text');
  };

  // 3. Download High-Res PNG
  const handleDownload = () => {
    if (!blob) {
      toast.error('Image is still generating...');
      return;
    }

    try {
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success('High-resolution story card downloaded!');
    } catch {
      toast.error('Download failed');
    }
  };

  // 4. Copy Request Link
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(requestUrl);
      setCopied(true);
      toast.success('Request link copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy link');
    }
  };

  return (
    <ModalOverlay
      open={open}
      onClose={onClose}
      title="Share Emergency Story Card"
      maxWidthClass="max-w-lg"
      className="p-0 overflow-hidden"
    >
      {/* =========================================================
          1. STICKY HEADER
         ========================================================= */}
      <div className="sticky top-0 z-20 shrink-0 bg-card border-b border-border/80 px-4 sm:px-6 py-3.5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-xl shrink-0 shadow-xs text-white"
            style={{ backgroundColor: categoryToken.primary }}
          >
            <Sparkles className="h-5 w-5 notranslate" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-bold text-foreground truncate">
              Share Emergency Story Card
            </h2>
            <p className="text-xs text-muted-foreground truncate">
              1-Tap WhatsApp Status & Instagram Story Card
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="min-w-[44px] min-h-[44px] w-11 h-11 flex items-center justify-center rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground transition-all active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary shrink-0"
          aria-label="Close story card dialog"
        >
          <X className="h-5 w-5 notranslate" />
        </button>
      </div>

      {/* =========================================================
          2. SCROLLABLE BODY
         ========================================================= */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-4">
        {/* FORMAT SELECTOR TABS (Story 9:16 vs Square 1:1) */}
        <div className="p-1 rounded-2xl bg-muted/70 border border-border/80 flex items-center gap-1">
          <button
            type="button"
            onClick={() => setFormat('story')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 touch-target ${
              format === 'story'
                ? 'bg-card text-foreground shadow-sm border border-border/60'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Smartphone className="h-4 w-4 notranslate text-primary" />
            <span>Story (9:16)</span>
            <span className="hidden min-[380px]:inline text-[10px] text-muted-foreground font-normal">
              Status & Stories
            </span>
          </button>

          <button
            type="button"
            onClick={() => setFormat('square')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 touch-target ${
              format === 'square'
                ? 'bg-card text-foreground shadow-sm border border-border/60'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Square className="h-4 w-4 notranslate text-primary" />
            <span>Square (1:1)</span>
            <span className="hidden min-[380px]:inline text-[10px] text-muted-foreground font-normal">
              Feed & Chat
            </span>
          </button>
        </div>

        {/* INTERACTIVE LIVE PREVIEW CONTAINER */}
        <div className="relative rounded-2xl bg-slate-950/90 border border-border/80 p-3 sm:p-4 flex items-center justify-center min-h-[300px] overflow-hidden">
          {generating && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-xs gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-primary notranslate" />
              <span className="text-xs font-semibold text-slate-300">
                Rendering crisp card with live QR code...
              </span>
            </div>
          )}

          {previewUrl ? (
            <div
              className={`relative mx-auto overflow-hidden rounded-xl shadow-2xl border border-white/10 ${
                format === 'story'
                  ? 'w-[210px] sm:w-[230px] aspect-[9/16]'
                  : 'w-[260px] sm:w-[290px] aspect-square'
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewUrl}
                alt="KindLink Emergency Story Card Preview"
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-muted-foreground gap-2 py-12">
              <Loader2 className="h-6 w-6 animate-spin notranslate" />
              <span className="text-xs">Preparing preview...</span>
            </div>
          )}
        </div>

        {/* HELPFUL TIPS PILL */}
        <div className="p-3 rounded-xl bg-primary/5 border border-primary/20 text-xs text-muted-foreground flex items-center gap-2">
          <span className="text-primary font-bold">💡 Pro-tip:</span>
          <span>
            {format === 'story'
              ? 'Fits perfectly on WhatsApp Status, Instagram Stories, and Telegram.'
              : 'Ideal for WhatsApp group chats, Twitter / X posts, and community forums.'}
          </span>
        </div>

        {/* =========================================================
            3. ACTIONS GRID
           ========================================================= */}
        <div className="space-y-2.5 pt-1">
          {/* Main Action: Native Share Sheet */}
          <button
            type="button"
            onClick={handleNativeShare}
            disabled={generating}
            style={{ backgroundColor: categoryToken.primary }}
            className="w-full h-[50px] rounded-[16px] text-white font-bold text-sm shadow-md hover:brightness-105 active:scale-[0.98] transition-all touch-target flex items-center justify-center gap-2 disabled:opacity-60"
          >
            <Share2 className="h-5 w-5 notranslate shrink-0" />
            <span>Share Image (Native Share Sheet)</span>
          </button>

          {/* Secondary Actions: WhatsApp & Download */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {/* Share to WhatsApp */}
            <button
              type="button"
              onClick={handleWhatsAppShare}
              className="h-[48px] rounded-[16px] border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-all touch-target shadow-xs"
            >
              <MessageCircle className="h-4 w-4 notranslate shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span>Share to WhatsApp</span>
            </button>

            {/* Download PNG */}
            <button
              type="button"
              onClick={handleDownload}
              disabled={generating}
              className="h-[48px] rounded-[16px] border border-border/80 bg-background/80 hover:bg-muted text-foreground font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-all touch-target shadow-xs disabled:opacity-60"
            >
              <Download className="h-4 w-4 notranslate shrink-0" />
              <span>Download PNG ({format === 'story' ? '9:16' : '1:1'})</span>
            </button>
          </div>

          {/* Copy Direct Link */}
          <button
            type="button"
            onClick={handleCopyLink}
            className="w-full h-[44px] rounded-[14px] border border-border/60 hover:border-border hover:bg-muted/50 text-muted-foreground hover:text-foreground font-medium text-xs flex items-center justify-center gap-2 active:scale-[0.98] transition-all touch-target"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4 notranslate text-emerald-500 shrink-0" />
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                  Copied link to clipboard!
                </span>
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 notranslate shrink-0" />
                <span>Copy live request link ({requestUrl})</span>
              </>
            )}
          </button>
        </div>
      </div>
    </ModalOverlay>
  );
}
