'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';

// -------------------------------------------------------------
// 1. Zero-Shift Body Scroll Lock
// -------------------------------------------------------------
let lockCount = 0;
let originalOverflow = '';
let originalPaddingRight = '';

export function useBodyScrollLock(locked: boolean) {
  useEffect(() => {
    if (!locked || typeof document === 'undefined') return;

    lockCount++;
    if (lockCount === 1) {
      originalOverflow = document.body.style.overflow;
      originalPaddingRight = document.body.style.paddingRight;

      const scrollBarWidth = window.innerWidth - document.documentElement.clientWidth;
      document.body.style.overflow = 'hidden';
      if (scrollBarWidth > 0) {
        document.body.style.paddingRight = `${scrollBarWidth}px`;
      }
    }

    return () => {
      lockCount = Math.max(0, lockCount - 1);
      if (lockCount === 0) {
        document.body.style.overflow = originalOverflow;
        document.body.style.paddingRight = originalPaddingRight;
      }
    };
  }, [locked]);
}

// -------------------------------------------------------------
// 2. Focus Trap with Focus Restore & Escape Handler
// -------------------------------------------------------------
export function useFocusTrap(
  containerRef: React.RefObject<HTMLElement>,
  isOpen: boolean,
  onEscape?: () => void,
  restoreElementRef?: React.RefObject<HTMLElement>
) {
  useEffect(() => {
    if (!isOpen || typeof document === 'undefined') return;

    const previousActive = (restoreElementRef?.current || document.activeElement) as HTMLElement | null;

    // Focus first interactive element or container
    const timer = setTimeout(() => {
      if (!containerRef.current) return;
      const focusable = containerRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length > 0) {
        focusable[0].focus();
      } else {
        containerRef.current.focus();
      }
    }, 40);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onEscape) {
        e.preventDefault();
        e.stopPropagation();
        onEscape();
        return;
      }

      if (e.key === 'Tab' && containerRef.current) {
        const focusables = Array.from(
          containerRef.current.querySelectorAll<HTMLElement>(
            'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
          )
        ).filter((el) => el.offsetParent !== null);

        if (focusables.length === 0) {
          e.preventDefault();
          return;
        }

        const first = focusables[0];
        const last = focusables[focusables.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first || !containerRef.current.contains(document.activeElement)) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last || !containerRef.current.contains(document.activeElement)) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('keydown', handleKeyDown);
      if (previousActive && typeof previousActive.focus === 'function') {
        previousActive.focus({ preventScroll: true });
      }
    };
  }, [isOpen, onEscape, containerRef, restoreElementRef]);
}

// -------------------------------------------------------------
// 3. Click / Tap Outside Handler
// -------------------------------------------------------------
export function useClickOutside(
  ref: React.RefObject<HTMLElement>,
  onClickOutside: () => void,
  active = true,
  ignoreRef?: React.RefObject<HTMLElement>
) {
  useEffect(() => {
    if (!active || typeof document === 'undefined') return;

    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node | null;
      if (!target || !ref.current) return;
      if (ref.current.contains(target)) return;
      if (ignoreRef?.current && ignoreRef.current.contains(target)) return;
      onClickOutside();
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
    };
  }, [ref, onClickOutside, active, ignoreRef]);
}

// -------------------------------------------------------------
// 4. Anchored Popover Positioning with Collision Flipping
// -------------------------------------------------------------
export interface AnchorPositionOptions {
  align?: 'left' | 'right' | 'center';
  offset?: number;
  margin?: number;
}

export interface ComputedPosition {
  top?: number;
  bottom?: number;
  left?: number;
  right?: number;
  maxHeight: number;
  placement: 'top' | 'bottom';
}

export function useAnchorPosition(
  anchorRef: React.RefObject<HTMLElement>,
  popoverRef: React.RefObject<HTMLElement>,
  isOpen: boolean,
  options: AnchorPositionOptions = {}
) {
  const [position, setPosition] = useState<ComputedPosition>({
    maxHeight: 500,
    placement: 'bottom',
  });

  const updatePosition = useCallback(() => {
    if (!isOpen || !anchorRef.current || typeof window === 'undefined') return;

    const rect = anchorRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const margin = options.margin ?? 12;
    const offset = options.offset ?? 8;

    const popoverEl = popoverRef.current;
    const popoverWidth = popoverEl ? popoverEl.offsetWidth : 320;
    const popoverHeight = popoverEl ? popoverEl.offsetHeight : 320;

    const spaceBelow = vh - rect.bottom - offset - margin;
    const spaceAbove = rect.top - offset - margin;

    // Flip to top if not enough room below and more room above
    const shouldFlip = spaceBelow < Math.min(popoverHeight, 280) && spaceAbove > spaceBelow;

    let top: number | undefined;
    let bottom: number | undefined;
    if (shouldFlip) {
      bottom = vh - rect.top + offset;
    } else {
      top = rect.bottom + offset;
    }

    let left: number | undefined;
    let right: number | undefined;

    if (options.align === 'left') {
      left = Math.max(margin, Math.min(rect.left, vw - popoverWidth - margin));
    } else if (options.align === 'center') {
      const center = rect.left + rect.width / 2;
      left = Math.max(margin, Math.min(center - popoverWidth / 2, vw - popoverWidth - margin));
    } else {
      // 'right' alignment: right edge of popover aligns with right edge of anchor
      const rightDistance = vw - rect.right;
      right = Math.max(margin, Math.min(rightDistance, vw - popoverWidth - margin));
    }

    setPosition({
      top,
      bottom,
      left,
      right,
      maxHeight: Math.max(200, Math.min(580, (shouldFlip ? spaceAbove : spaceBelow) - 8)),
      placement: shouldFlip ? 'top' : 'bottom',
    });
  }, [isOpen, anchorRef, popoverRef, options.align, options.offset, options.margin]);

  useEffect(() => {
    if (!isOpen) return;
    updatePosition();

    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [isOpen, updatePosition]);

  return position;
}

// -------------------------------------------------------------
// 5. OverlayPortal Base Component
// -------------------------------------------------------------
export interface OverlayPortalProps {
  children: React.ReactNode;
}

export function OverlayPortal({ children }: OverlayPortalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || typeof document === 'undefined') return null;

  return createPortal(children, document.body);
}

// -------------------------------------------------------------
// 6. Modal / Sheet Overlay (Frosted Glass, Accessible, AA Contrast)
// -------------------------------------------------------------
export interface ModalOverlayProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  ariaLabel?: string;
  mobileVariant?: 'sheet' | 'center';
  maxWidthClass?: string;
  className?: string;
}

export function ModalOverlay({
  open,
  onClose,
  children,
  title,
  ariaLabel,
  mobileVariant = 'sheet',
  maxWidthClass = 'max-w-lg',
  className = '',
}: ModalOverlayProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useBodyScrollLock(open);
  useFocusTrap(containerRef, open, onClose);

  if (!open) return null;

  return (
    <OverlayPortal>
      <div
        className={`fixed inset-0 z-50 flex bg-slate-950/70 supports-[backdrop-filter]:backdrop-blur-sm transition-opacity duration-200 motion-reduce:transition-none ${
          mobileVariant === 'sheet'
            ? 'items-end sm:items-center justify-center p-0 sm:p-4'
            : 'items-center justify-center p-3 sm:p-4'
        }`}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel || title}
      >
        {/* Backdrop click to close */}
        <div
          className="fixed inset-0 -z-10"
          onClick={onClose}
          aria-hidden="true"
        />

        {/* Modal / Sheet Surface with Frosted Glass Styling */}
        <div
          ref={containerRef}
          tabIndex={-1}
          className={`relative w-full ${maxWidthClass} max-h-[85dvh] flex flex-col overflow-hidden outline-none bg-card supports-[backdrop-filter]:bg-card/90 dark:supports-[backdrop-filter]:bg-slate-950/90 supports-[backdrop-filter]:backdrop-blur-[16px] border border-border/80 shadow-2xl text-card-foreground ${
            mobileVariant === 'sheet'
              ? 'rounded-t-3xl sm:rounded-3xl pb-[env(safe-area-inset-bottom,0px)] animate-in slide-in-from-bottom duration-200 sm:slide-in-from-bottom-0 sm:zoom-in-95'
              : 'rounded-3xl animate-in zoom-in-95 duration-200'
          } ${className}`}
        >
          {children}
        </div>
      </div>
    </OverlayPortal>
  );
}

// -------------------------------------------------------------
// 7. Anchored Popover Component (Never Clipped, Collision-Flipped)
// -------------------------------------------------------------
export interface AnchoredPopoverProps {
  open: boolean;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLElement>;
  children: React.ReactNode;
  align?: 'left' | 'right' | 'center';
  offset?: number;
  margin?: number;
  className?: string;
  style?: React.CSSProperties;
  ariaLabel?: string;
  role?: string;
}

export function AnchoredPopover({
  open,
  onClose,
  anchorRef,
  children,
  align = 'right',
  offset = 8,
  margin = 12,
  className = '',
  style = {},
  ariaLabel,
  role = 'region',
}: AnchoredPopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null);
  const position = useAnchorPosition(anchorRef, popoverRef, open, { align, offset, margin });

  useFocusTrap(popoverRef, open, onClose, anchorRef);
  useClickOutside(popoverRef, onClose, open, anchorRef);

  if (!open) return null;

  return (
    <OverlayPortal>
      {/* Invisible backdrop to capture outside clicks safely on touch devices */}
      <div
        className="fixed inset-0 z-40 bg-transparent"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Popover container with Frosted Glass & collision detection */}
      <div
        ref={popoverRef}
        role={role}
        aria-label={ariaLabel}
        tabIndex={-1}
        style={{
          position: 'fixed',
          top: position.top !== undefined ? `${position.top}px` : undefined,
          bottom: position.bottom !== undefined ? `${position.bottom}px` : undefined,
          left: position.left !== undefined ? `${position.left}px` : undefined,
          right: position.right !== undefined ? `${position.right}px` : undefined,
          maxHeight: `${position.maxHeight}px`,
          ...style,
        }}
        className={`z-50 overflow-y-auto outline-none rounded-3xl border border-border/80 bg-card supports-[backdrop-filter]:bg-card/90 dark:supports-[backdrop-filter]:bg-slate-950/90 supports-[backdrop-filter]:backdrop-blur-[16px] shadow-2xl text-card-foreground animate-in fade-in zoom-in-95 duration-150 motion-reduce:transition-none motion-reduce:animate-none ${className}`}
      >
        {children}
      </div>
    </OverlayPortal>
  );
}
