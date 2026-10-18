import { HelpRequest, UserProfile } from './types';

/**
 * Robustly determines if the active viewer is the author/owner of a help request.
 * Checks primary database UUIDs, snake_case aliases, username, and contact name fallbacks.
 */
export function isRequestOwner(
  request: HelpRequest | null | undefined,
  userProfile: UserProfile | null | undefined
): boolean {
  if (!request || !userProfile) return false;

  // 1. Primary check: matching database UUID
  if (request.requesterId && userProfile.id && request.requesterId === userProfile.id) {
    return true;
  }

  // 2. Database snake_case field check
  if ((request as any).requester_id && userProfile.id && (request as any).requester_id === userProfile.id) {
    return true;
  }

  // 3. Username matching
  if (
    userProfile.username &&
    (request as any).requester_username &&
    (request as any).requester_username.toLowerCase() === userProfile.username.toLowerCase()
  ) {
    return true;
  }

  // 4. Contact name fallback for mock accounts
  if (
    request.contactName &&
    userProfile.name &&
    request.contactName.trim().toLowerCase() === userProfile.name.trim().toLowerCase()
  ) {
    return true;
  }

  return false;
}
