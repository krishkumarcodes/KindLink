'use client';

import React, { useEffect, useState, useRef } from 'react';

interface AnimatedNumberProps {
  value: string | number;
  className?: string;
  duration?: number;
}

export function AnimatedNumber({ value, className = '', duration = 600 }: AnimatedNumberProps) {
  const strVal = String(value);
  // Match number with optional decimal, followed by optional non-digit suffix (e.g. "98%", "12 min")
  const match = strVal.match(/^(\d+(?:\.\d+)?)(.*)$/);
  const targetNumber = match ? parseFloat(match[1]) : null;
  const suffix = match ? match[2] : '';

  const [displayValue, setDisplayValue] = useState<number | null>(targetNumber);
  const prevTargetRef = useRef<number | null>(targetNumber);

  useEffect(() => {
    if (targetNumber === null) {
      setDisplayValue(null);
      prevTargetRef.current = null;
      return;
    }

    const startVal = prevTargetRef.current ?? targetNumber;
    const endVal = targetNumber;
    prevTargetRef.current = targetNumber;

    if (startVal === endVal) {
      setDisplayValue(endVal);
      return;
    }

    const startTime = performance.now();

    const update = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      // easeOutCubic
      const ease = 1 - Math.pow(1 - progress, 3);
      const current = startVal + (endVal - startVal) * ease;

      const isFloat = String(endVal).includes('.');
      setDisplayValue(isFloat ? parseFloat(current.toFixed(1)) : Math.round(current));

      if (progress < 1) {
        requestAnimationFrame(update);
      } else {
        setDisplayValue(endVal);
      }
    };

    const animId = requestAnimationFrame(update);
    return () => cancelAnimationFrame(animId);
  }, [targetNumber, duration]);

  if (targetNumber === null) {
    return <span className={className}>{value}</span>;
  }

  return (
    <span className={className}>
      {displayValue !== null ? displayValue : targetNumber}
      {suffix}
    </span>
  );
}
