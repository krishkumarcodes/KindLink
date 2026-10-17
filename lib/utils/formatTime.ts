/**
 * Centralized Human-Friendly Time Formatter for KindLink
 *
 * Replaces awkward outputs like "168 min ago" with friendly, natural strings:
 * - < 1 min: "just now"
 * - < 60 min: "N min ago"
 * - < 24 h: "X h Y min ago" or "X h ago"
 * - 1 day: "Yesterday"
 * - 2-6 days: "N days ago"
 * - >= 7 days: formatted date (e.g. "12 Oct" or "12 Oct 2025")
 */

const MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

export interface FormatTimeOptions {
  /** Reference base date to calculate relative difference from (defaults to now) */
  baseDate?: Date;
  /** Capitalize output if appropriate */
  capitalize?: boolean;
}

/**
 * Format a Date object into a short date string e.g. "12 Oct" or "12 Oct 2025".
 */
export function formatShortDate(date: Date, baseDate = new Date()): string {
  const day = date.getDate();
  const month = MONTH_NAMES[date.getMonth()];
  const isSameYear = date.getFullYear() === baseDate.getFullYear();

  return isSameYear ? `${day} ${month}` : `${day} ${month} ${date.getFullYear()}`;
}

/**
 * Convert minutes elapsed into human-friendly relative time string.
 */
export function formatMinutesAgo(
  minutes: number,
  options?: FormatTimeOptions
): string {
  if (!Number.isFinite(minutes) || minutes < 1) {
    return 'just now';
  }

  const roundedMinutes = Math.floor(minutes);

  // < 60 min: "N min ago"
  if (roundedMinutes < 60) {
    return `${roundedMinutes} min ago`;
  }

  // < 24 h (1440 min): "X h Y min ago" or "X h ago"
  if (roundedMinutes < 1440) {
    const hours = Math.floor(roundedMinutes / 60);
    const remMinutes = roundedMinutes % 60;
    if (remMinutes === 0) {
      return `${hours} h ago`;
    }
    return `${hours} h ${remMinutes} min ago`;
  }

  const days = Math.floor(roundedMinutes / 1440);

  // 1 day (24h to < 48h): "Yesterday"
  if (days === 1) {
    return 'Yesterday';
  }

  // 2-6 days: "N days ago"
  if (days < 7) {
    return `${days} days ago`;
  }

  // >= 7 days: formatted date e.g. "12 Oct"
  const base = options?.baseDate ?? new Date();
  const targetDate = new Date(base.getTime() - roundedMinutes * 60 * 1000);
  return formatShortDate(targetDate, base);
}

/**
 * Parses any input (Date, ISO string, timestamp number, or relative string like "168 min ago")
 * and formats it into the human-friendly relative string.
 */
export function formatHumanTime(
  input: Date | string | number | null | undefined,
  options?: FormatTimeOptions
): string {
  if (input === null || input === undefined || input === '') {
    return 'just now';
  }

  const base = options?.baseDate ?? new Date();

  // Handle number input: could be milliseconds timestamp or elapsed minutes
  if (typeof input === 'number') {
    // If timestamp is reasonably in milliseconds (e.g. > 10,000,000,000 ~ April 1970)
    if (input > 10_000_000_000) {
      return formatDateRelative(new Date(input), base);
    }
    // Otherwise treat as minutes
    return formatMinutesAgo(input, options);
  }

  // Handle Date instance
  if (input instanceof Date) {
    if (isNaN(input.getTime())) return 'just now';
    return formatDateRelative(input, base);
  }

  // Handle string input
  if (typeof input === 'string') {
    const trimmed = input.trim();

    // Check if it's already an awkward "N min ago" or "N mins ago" string
    const minAgoMatch = trimmed.match(/^(\d+)\s*min(?:s)?\s*ago$/i);
    if (minAgoMatch) {
      const mins = parseInt(minAgoMatch[1], 10);
      return formatMinutesAgo(mins, options);
    }

    // Check for "N h ago" or "N hours ago"
    const hoursAgoMatch = trimmed.match(/^(\d+)\s*h(?:our)?s?\s*ago$/i);
    if (hoursAgoMatch) {
      const hours = parseInt(hoursAgoMatch[1], 10);
      return formatMinutesAgo(hours * 60, options);
    }

    // Check for "N d ago" or "N days ago"
    const daysAgoMatch = trimmed.match(/^(\d+)\s*d(?:ay)?s?\s*ago$/i);
    if (daysAgoMatch) {
      const days = parseInt(daysAgoMatch[1], 10);
      return formatMinutesAgo(days * 1440, options);
    }

    // If it's already "just now" or "yesterday"
    if (trimmed.toLowerCase() === 'just now') return 'just now';
    if (trimmed.toLowerCase() === 'yesterday') return 'Yesterday';

    // Try parsing as ISO date or standard date string
    const parsed = new Date(trimmed);
    if (!isNaN(parsed.getTime())) {
      return formatDateRelative(parsed, base);
    }

    // Fallback: return as-is
    return trimmed;
  }

  return 'just now';
}

/**
 * Format relative difference between two Dates.
 */
function formatDateRelative(date: Date, base: Date): string {
  const diffMs = base.getTime() - date.getTime();
  if (diffMs <= 0) {
    return 'just now';
  }

  const diffMinutes = Math.floor(diffMs / (60 * 1000));
  return formatMinutesAgo(diffMinutes, { baseDate: base });
}

/**
 * Alias for formatHumanTime to support standard naming conventions.
 */
export const formatTimeAgo = formatHumanTime;

/**
 * Formats request waiting time with "Posted" prefix e.g. "Posted 14 min ago", "Posted Yesterday".
 */
export function formatWaitingTime(
  minutes?: number | null,
  createdAt?: string | Date | null,
  options?: FormatTimeOptions
): string {
  // If minutes is provided and positive
  if (typeof minutes === 'number' && Number.isFinite(minutes) && minutes > 0) {
    const timeStr = formatMinutesAgo(minutes, options);
    return timeStr === 'just now' ? 'Posted just now' : `Posted ${timeStr}`;
  }

  // If createdAt is available
  if (createdAt) {
    const timeStr = formatHumanTime(createdAt, options);
    return timeStr === 'just now' ? 'Posted just now' : `Posted ${timeStr}`;
  }

  return 'Posted just now';
}

/**
 * Format live status for Community Pulse with narrow and wide screen variants.
 */
export function formatLivePulseStatus(secondsSinceUpdate: number): {
  long: string;
  short: string;
  relativeText: string;
} {
  const s = Math.max(0, Math.floor(secondsSinceUpdate));

  if (s < 5) {
    return {
      long: 'Live · updated just now',
      short: 'Live · just now',
      relativeText: 'just now',
    };
  }

  if (s < 60) {
    return {
      long: `Live · updated ${s}s ago`,
      short: `Live · ${s}s ago`,
      relativeText: `${s}s ago`,
    };
  }

  const mins = Math.floor(s / 60);
  return {
    long: `Live · updated ${mins}m ago`,
    short: `Live · ${mins}m ago`,
    relativeText: `${mins}m ago`,
  };
}
