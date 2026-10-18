/**
 * KindLink Content & Abuse Filter
 * Sanitizes and validates user-submitted custom category labels and tags.
 */

// Common profanity and abusive tokens across English and Indian slang
const BANNED_PATTERNS: RegExp[] = [
  /\b\w*(?:fuck|shit|bitch|bastard|asshole|cunt|dick|pussy|whore|slut|fag|nigger|chutiya|bhenchod|madarchod|gandu|harami|bhosdi|gaand|randi|suar|kamina)\w*\b/i,
  /\b(?:nazi|hitler|terrorist|isis|kill|murder|bomb|rape|attack|scam|fraud|crypto|casino|betting|porn|xxx)\b/i,
];

export interface ValidationResult {
  valid: boolean;
  error?: string;
  sanitized?: string;
}

/**
 * Validates a custom category label (3 to 40 characters, abuse-filtered)
 */
export function validateCustomCategoryLabel(rawLabel: string): ValidationResult {
  if (!rawLabel || typeof rawLabel !== 'string') {
    return { valid: false, error: 'Category label is required.' };
  }

  // Normalize whitespace: trim and collapse multiple spaces into one
  const sanitized = rawLabel.trim().replace(/\s+/g, ' ');

  if (sanitized.length < 3) {
    return { valid: false, error: 'Category label must be at least 3 characters long.' };
  }

  if (sanitized.length > 40) {
    return { valid: false, error: 'Category label cannot exceed 40 characters.' };
  }

  // Check against banned abuse/profanity patterns
  for (const pattern of BANNED_PATTERNS) {
    if (pattern.test(sanitized)) {
      return { valid: false, error: 'Please choose an appropriate, respectful category name.' };
    }
  }

  // Prevent suspicious script/html injections or symbols-only
  if (!/[a-zA-Z\u0900-\u097F\u0980-\u09FF0-9]/.test(sanitized)) {
    return { valid: false, error: 'Category label must contain alphanumeric characters.' };
  }

  return { valid: true, sanitized };
}

/**
 * Validates and normalizes a single tag (2 to 24 chars, lowercase, no spaces issues, abuse-filtered)
 */
export function validateTag(rawTag: string): ValidationResult {
  if (!rawTag || typeof rawTag !== 'string') {
    return { valid: false, error: 'Tag cannot be empty.' };
  }

  // Clean, trim, lowercase, replace inner spaces or special chars with hyphens/single spaces
  let sanitized = rawTag.trim().toLowerCase().replace(/[\s_-]+/g, '-');
  // Strip leading/trailing non-alphanumeric
  sanitized = sanitized.replace(/^[^a-z0-9\u0900-\u097F\u0980-\u09FF]+|[^a-z0-9\u0900-\u097F\u0980-\u09FF]+$/g, '');

  if (sanitized.length < 2) {
    return { valid: false, error: 'Tags must be at least 2 characters.' };
  }

  if (sanitized.length > 24) {
    return { valid: false, error: 'Tags cannot exceed 24 characters.' };
  }

  for (const pattern of BANNED_PATTERNS) {
    if (pattern.test(sanitized)) {
      return { valid: false, error: 'Inappropriate tag rejected.' };
    }
  }

  return { valid: true, sanitized };
}

/**
 * Validates a list of tags (up to 5 tags, each validated and deduplicated)
 */
export function validateTagsList(tags: string[]): { valid: boolean; tags: string[]; error?: string } {
  if (!Array.isArray(tags)) {
    return { valid: true, tags: [] };
  }

  const unique = new Set<string>();
  const sanitizedList: string[] = [];

  for (const raw of tags) {
    const res = validateTag(raw);
    if (res.valid && res.sanitized && !unique.has(res.sanitized)) {
      unique.add(res.sanitized);
      sanitizedList.push(res.sanitized);
    }
  }

  if (sanitizedList.length > 5) {
    return {
      valid: false,
      tags: sanitizedList.slice(0, 5),
      error: 'A maximum of 5 tags is allowed per request.',
    };
  }

  return { valid: true, tags: sanitizedList };
}

/**
 * Formats a category name for display. If category is 'other', formats as "Other: <label>"
 */
export function formatCategoryDisplay(category: string, customLabel?: string | null): string {
  if (!category) return 'Community Aid';
  const norm = category.toLowerCase().trim();
  if (norm === 'other') {
    const cleanCustom = (customLabel || '').trim();
    return cleanCustom ? `Other: ${cleanCustom}` : 'Other';
  }
  return category;
}
