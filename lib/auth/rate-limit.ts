interface RateLimitRecord {
  count: number;
  resetAt: number;
}

const memoryStore = new Map<string, RateLimitRecord>();

/**
 * Basic in-memory rate limiter for login and sign-up attempts
 * @param key unique identifier (e.g. IP + endpoint)
 * @param limit maximum allowed attempts in window
 * @param windowMs time window in milliseconds (default 15 minutes)
 */
export function checkRateLimit(key: string, limit = 10, windowMs = 15 * 60 * 1000): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const record = memoryStore.get(key);

  if (!record || now > record.resetAt) {
    memoryStore.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1 };
  }

  if (record.count >= limit) {
    return { allowed: false, remaining: 0 };
  }

  record.count += 1;
  return { allowed: true, remaining: limit - record.count };
}

export const RESERVED_USERNAMES = new Set([
  'admin',
  'administrator',
  'root',
  'support',
  'kindlink',
  'moderator',
  'system',
  'staff',
  'help',
  'official',
  'security',
  'api',
  'superuser',
]);

export function validateUsername(username: string): { valid: boolean; reason?: string } {
  const sanitized = username.trim().toLowerCase();

  if (sanitized.length < 3 || sanitized.length > 20) {
    return { valid: false, reason: 'Username must be between 3 and 20 characters.' };
  }

  if (!/^[a-z][a-z0-9_.]*$/.test(sanitized)) {
    return { valid: false, reason: 'Must start with a letter and contain only lowercase letters, numbers, _, or .' };
  }

  if (RESERVED_USERNAMES.has(sanitized)) {
    return { valid: false, reason: 'This username is reserved and cannot be registered.' };
  }

  return { valid: true };
}
