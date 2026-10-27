'use client';

/**
 * Optimized motion entry points using LazyMotion to eliminate the heavy
 * full Framer Motion bundle (~35KB gzipped -> ~15KB gzipped).
 */
export { LazyMotion, domAnimation, domMax, m, AnimatePresence } from 'framer-motion';
