'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

// Module-level prompt storage so prompt is preserved across renders and navigation
let cachedPromptEvent: any = null;
const subscribers = new Set<() => void>();

function notifySubscribers() {
  subscribers.forEach((cb) => {
    try {
      cb();
    } catch {}
  });
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e: Event) => {
    e.preventDefault();
    cachedPromptEvent = e;
    notifySubscribers();
  });

  window.addEventListener('appinstalled', () => {
    cachedPromptEvent = null;
    notifySubscribers();
  });
}

export function isStandaloneMode(): boolean {
  if (typeof window === 'undefined') return false;
  return Boolean(
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true ||
    (document.referrer && document.referrer.includes('android-app://')) ||
    window.matchMedia('(display-mode: fullscreen)').matches
  );
}

export function detectIsIOS(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}

export function detectIsAndroid(): boolean {
  if (typeof window === 'undefined') return false;
  return /Android/i.test(navigator.userAgent);
}

export function usePwaInstall() {
  const [isInstalled, setIsInstalled] = useState<boolean>(false);
  const [canPrompt, setCanPrompt] = useState<boolean>(Boolean(cachedPromptEvent));
  const [isIOS, setIsIOS] = useState<boolean>(false);
  const [isAndroid, setIsAndroid] = useState<boolean>(false);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  useEffect(() => {
    setIsInstalled(isStandaloneMode());
    setCanPrompt(Boolean(cachedPromptEvent));
    setIsIOS(detectIsIOS());
    setIsAndroid(detectIsAndroid());

    const updateState = () => {
      setIsInstalled(isStandaloneMode());
      setCanPrompt(Boolean(cachedPromptEvent));
    };

    subscribers.add(updateState);

    const handleOpenModal = () => setIsModalOpen(true);
    const handleCloseModal = () => setIsModalOpen(false);

    window.addEventListener('kindlink:open-install-modal', handleOpenModal);
    window.addEventListener('kindlink:close-install-modal', handleCloseModal);

    return () => {
      subscribers.delete(updateState);
      window.removeEventListener('kindlink:open-install-modal', handleOpenModal);
      window.removeEventListener('kindlink:close-install-modal', handleCloseModal);
    };
  }, []);

  const openInstallModal = useCallback(() => {
    setIsModalOpen(true);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('kindlink:open-install-modal'));
    }
  }, []);

  const closeInstallModal = useCallback(() => {
    setIsModalOpen(false);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('kindlink:close-install-modal'));
    }
  }, []);

  const triggerInstall = useCallback(async () => {
    if (isStandaloneMode()) {
      toast.info('KindLink is already installed on your device.');
      return;
    }

    if (cachedPromptEvent) {
      try {
        await cachedPromptEvent.prompt();
        const choice = await cachedPromptEvent.userChoice;
        if (choice?.outcome === 'accepted') {
          toast.success('KindLink installed successfully!');
          cachedPromptEvent = null;
          setCanPrompt(false);
          setIsInstalled(true);
          notifySubscribers();
          return;
        }
      } catch (err) {
        console.error('PWA install prompt error:', err);
      }
    }

    // If native prompt is not available or dismissed, open the step-by-step install modal
    openInstallModal();
  }, [openInstallModal]);

  return {
    isInstalled,
    canPrompt,
    isIOS,
    isAndroid,
    isDesktop: !isIOS && !isAndroid,
    isModalOpen,
    openInstallModal,
    closeInstallModal,
    triggerInstall,
  };
}
