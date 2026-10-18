/**
 * KindLink Offline SOS & Emergency SMS Payload Generator
 *
 * Implements standardized emergency SMS payloads and cross-platform (iOS / Android)
 * SMS URI formatting for offline and low-signal emergency fallbacks.
 */

export interface EmergencySmsPayloadOptions {
  userName?: string | null;
  areaName?: string | null;
  lat: number;
  lng: number;
  siteUrl?: string | null;
  token?: string | null;
  bloodGroup?: string | null;
}

/**
 * Constructs a clear, standardized emergency SMS body adhering strictly to:
 * "EMERGENCY SOS: {userName || 'KindLink User'} needs urgent help!
 * Location: {areaName || 'GPS Location'} (Lat: {lat.toFixed(5)}, Lng: {lng.toFixed(5)})
 * Google Maps: https://www.google.com/maps/search/?api=1&query={lat},{lng}
 * Live Tracking: {siteUrl}/sos/{token || 'active'}
 * {bloodGroup ? 'Blood Group: ' + bloodGroup : ''}
 * Sent via KindLink Offline SOS."
 */
export function generateEmergencySmsBody({
  userName,
  areaName,
  lat,
  lng,
  siteUrl,
  token,
  bloodGroup,
}: EmergencySmsPayloadOptions): string {
  const name = userName && userName.trim().length > 0 ? userName.trim() : 'KindLink User';
  const area = areaName && areaName.trim().length > 0 ? areaName.trim() : 'GPS Location';

  let baseUrl = siteUrl?.trim() || '';
  if (!baseUrl && typeof window !== 'undefined' && window.location?.origin) {
    baseUrl = window.location.origin;
  }
  if (!baseUrl) {
    baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://kindlink.org';
  }
  // Remove trailing slashes
  baseUrl = baseUrl.replace(/\/+$/, '');

  const liveToken = token && token.trim().length > 0 ? token.trim() : 'active';
  const latStr = lat.toFixed(5);
  const lngStr = lng.toFixed(5);

  const lines: string[] = [
    `EMERGENCY SOS: ${name} needs urgent help!`,
    `Location: ${area} (Lat: ${latStr}, Lng: ${lngStr})`,
    `Google Maps: https://www.google.com/maps/search/?api=1&query=${latStr},${lngStr}`,
    `Live Tracking: ${baseUrl}/sos/${liveToken}`,
  ];

  if (bloodGroup && bloodGroup.trim().length > 0) {
    lines.push(`Blood Group: ${bloodGroup.trim()}`);
  }

  lines.push('Sent via KindLink Offline SOS.');

  return lines.join('\n');
}

/**
 * Detects whether the current environment is iOS (iPhone/iPad/iPod).
 */
export function isIosDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  const isAppleMobile = /iPad|iPhone|iPod/.test(ua);
  const isAppleTouchMac = navigator.platform === 'MacIntel' && (navigator.maxTouchPoints || 0) > 1;
  return isAppleMobile || isAppleTouchMac;
}

/**
 * Builds a cross-platform SMS URI with recipient(s) and pre-filled emergency body.
 *
 * Handles:
 * - Empty contacts -> opens generic composer (`sms:?body=` on Android, `sms:&body=` on iOS)
 * - Single contact -> `sms:+919832012345?body=...` (Android) or `sms:+919832012345&body=...` (iOS)
 * - Multiple contacts -> Comma-separated phone numbers with appropriate delimiter.
 */
export function buildEmergencySmsUri(
  phoneNumbers: string | string[] | null | undefined,
  body: string,
  forceIos?: boolean
): string {
  const isIOS = forceIos !== undefined ? forceIos : isIosDevice();

  const rawList = Array.isArray(phoneNumbers)
    ? phoneNumbers
    : phoneNumbers
    ? [phoneNumbers]
    : [];

  // Sanitize phone numbers: keep leading +, digits only
  const cleanList = rawList
    .map((p) => (p ? p.replace(/[^\d+]/g, '') : ''))
    .filter((p) => p.length > 0);

  const encodedBody = encodeURIComponent(body);

  if (cleanList.length === 0) {
    // Fallback if no contacts are saved: opens sms:?body=... allowing user to select any contact
    return isIOS ? `sms:&body=${encodedBody}` : `sms:?body=${encodedBody}`;
  }

  // Comma-separated recipient list
  const recipients = cleanList.join(',');

  // iOS Safari requires '&body=' when recipients are provided; Android uses standard '?body='
  const delimiter = isIOS ? '&body=' : '?body=';

  return `sms:${recipients}${delimiter}${encodedBody}`;
}
