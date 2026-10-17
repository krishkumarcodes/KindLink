'use client';

import React, { useId } from 'react';
import { Lock } from 'lucide-react';
import { BadgeTier } from '@/lib/data/badges';

export interface BadgeMedalIconProps {
  iconName?: string;
  badgeId?: string;
  tier: BadgeTier | 'locked';
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'detail' | 'shelf';
  isEarned?: boolean;
  className?: string;
  showLevelRing?: boolean;
  isRecent?: boolean;
}

/**
 * Normalizes badge ID or icon name to one of 18 distinct KindLink badge glyph keys
 */
export function resolveBadgeGlyphKey(badgeId?: string, iconName?: string): string {
  const raw = `${badgeId || ''} ${iconName || ''}`.toLowerCase().replace(/[-_]/g, ' ');

  if (raw.includes('blood') || raw.includes('life saver') || raw.includes('heartpulse')) return 'life_saver';
  if (raw.includes('pillar') || raw.includes('community pillar') || (raw.includes('award') && !raw.includes('star'))) return 'community_pillar';
  if (raw.includes('first responder') || raw.includes('emergency first') || raw.includes('zap')) return 'emergency_first_responder';
  if (raw.includes('quick responder') || raw.includes('quick') || raw.includes('timer')) return 'quick_responder';
  if (raw.includes('trusted') || raw.includes('neighbour') || raw.includes('neighbor')) return 'trusted_neighbour';
  if (raw.includes('study') || raw.includes('books') || (raw.includes('mentor') && !raw.includes('teacher'))) return 'study_mentor';
  if (raw.includes('gear') || raw.includes('lender') || raw.includes('equipment') || raw.includes('wheelchair')) return 'medical_gear_lender';
  if (raw.includes('elder') || raw.includes('hearthandshake')) return 'elder_friend';
  if (raw.includes('ride') || raw.includes('transport') || raw.includes('car')) return 'safe_ride_hero';
  if (raw.includes('streak') || raw.includes('flame')) return 'helper_streak';
  if (raw.includes('first help') || raw.includes('sparkles') || raw.includes('star')) return 'first_help';
  if (raw.includes('doctor') || raw.includes('mbbs')) return 'verified_doctor';
  if (raw.includes('student')) return 'verified_student';
  if (raw.includes('nurse') || raw.includes('paramedic') || raw.includes('cross')) return 'verified_nurse';
  if (raw.includes('pharmacist') || raw.includes('pill')) return 'verified_pharmacist';
  if (raw.includes('teacher') || raw.includes('professor') || raw.includes('educator')) return 'verified_teacher';
  if (raw.includes('ngo') || raw.includes('organisation') || raw.includes('organization') || raw.includes('building2')) return 'verified_ngo';
  if (raw.includes('member') || raw.includes('shieldcheck') || raw.includes('verified')) return 'verified_member';

  return 'first_help';
}

/**
 * 18 Distinct SVG Glyphs tailored for KindLink's verified achievements
 */
function RenderBadgeGlyph({
  glyphKey,
  isEarned,
  tier,
  gradientPrefix,
}: {
  glyphKey: string;
  isEarned: boolean;
  tier: BadgeTier | 'locked';
  gradientPrefix: string;
}) {
  const glyphFill = isEarned ? `url(#${gradientPrefix}-glyph)` : '#94A3B8';
  const strokeColor = isEarned ? `url(#${gradientPrefix}-stroke)` : '#64748B';
  const highlightColor = isEarned ? '#FFFFFF' : '#94A3B8';

  switch (glyphKey) {
    case 'life_saver':
      // Blood droplet with inner heart
      return (
        <g opacity={isEarned ? 1 : 0.4}>
          <path
            d="M 50 24 C 50 24 68 46 68 59 C 68 69 59.9 77 50 77 C 40.1 77 32 69 32 59 C 32 46 50 24 50 24 Z"
            fill={glyphFill}
            stroke={strokeColor}
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
          {/* Subtle droplet sheen highlight */}
          <path
            d="M 40 46 C 36 52 36 58 38 64"
            fill="none"
            stroke={highlightColor}
            strokeWidth="2"
            strokeLinecap="round"
            opacity={isEarned ? 0.6 : 0.2}
          />
          {/* Inner Heart */}
          <path
            d="M 50 51 C 48 47.5 43 47 40 50.5 C 37 54 38 58 42 62 L 50 69 L 58 62 C 62 58 63 54 60 50.5 C 57 47 52 47.5 50 51 Z"
            fill={isEarned ? '#EF4444' : '#64748B'}
            stroke={isEarned ? '#FFFFFF' : '#475569'}
            strokeWidth="1.2"
          />
        </g>
      );

    case 'community_pillar':
      // Classical pillars / triumvirate columns
      return (
        <g opacity={isEarned ? 1 : 0.4}>
          {/* Triangular Pediment / Entablature */}
          <path
            d="M 50 24 L 26 33 H 74 Z"
            fill={glyphFill}
            stroke={strokeColor}
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <path d="M 28 34 H 72 V 37 H 28 Z" fill={glyphFill} />
          {/* 3 Classical Columns */}
          <rect x="31" y="38" width="8" height="25" rx="1.5" fill={glyphFill} stroke={strokeColor} strokeWidth="1.5" />
          <rect x="46" y="38" width="8" height="25" rx="1.5" fill={glyphFill} stroke={strokeColor} strokeWidth="1.5" />
          <rect x="61" y="38" width="8" height="25" rx="1.5" fill={glyphFill} stroke={strokeColor} strokeWidth="1.5" />
          {/* Flute accents on columns */}
          <line x1="35" y1="41" x2="35" y2="60" stroke={strokeColor} strokeWidth="1" opacity="0.6" />
          <line x1="50" y1="41" x2="50" y2="60" stroke={strokeColor} strokeWidth="1" opacity="0.6" />
          <line x1="65" y1="41" x2="65" y2="60" stroke={strokeColor} strokeWidth="1" opacity="0.6" />
          {/* Stepped Plinth Foundation */}
          <path d="M 27 63 H 73 V 67 H 27 Z" fill={glyphFill} stroke={strokeColor} strokeWidth="1.5" />
          <path d="M 23 67 H 77 V 72 H 23 Z" fill={glyphFill} stroke={strokeColor} strokeWidth="1.5" />
        </g>
      );

    case 'emergency_first_responder':
      // Emergency beacon with rotating cross & radiation beams
      return (
        <g opacity={isEarned ? 1 : 0.4}>
          {/* Rotating Beacon Beams */}
          <path
            d="M 22 36 L 29 41 M 78 36 L 71 41 M 30 24 L 36 30 M 70 24 L 64 30 M 50 18 V 26"
            stroke={isEarned ? '#F59E0B' : '#64748B'}
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          {/* Siren Dome */}
          <path
            d="M 33 62 C 33 42 40 31 50 31 C 60 31 67 42 67 62 Z"
            fill={glyphFill}
            stroke={strokeColor}
            strokeWidth="2.5"
          />
          {/* Emergency Cross on Dome */}
          <path
            d="M 47 41 H 53 V 53 H 47 Z"
            fill={isEarned ? '#EF4444' : '#475569'}
          />
          <path
            d="M 41 44 H 59 V 50 H 41 Z"
            fill={isEarned ? '#EF4444' : '#475569'}
          />
          {/* Beacon Base Plinth */}
          <path
            d="M 30 62 H 70 L 72 70 H 28 Z"
            fill={isEarned ? '#1E293B' : '#334155'}
            stroke={strokeColor}
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <line x1="34" y1="66" x2="66" y2="66" stroke={isEarned ? '#F59E0B' : '#64748B'} strokeWidth="1.5" />
        </g>
      );

    case 'quick_responder':
      // Stopwatch with lightning bolt slicing through
      return (
        <g opacity={isEarned ? 1 : 0.4}>
          {/* Stopwatch Ring */}
          <circle
            cx="50"
            cy="53"
            r="20"
            fill="none"
            stroke={strokeColor}
            strokeWidth="3"
          />
          {/* Top Pusher / Stem */}
          <path d="M 47 28 H 53 V 33 H 47 Z" fill={glyphFill} stroke={strokeColor} strokeWidth="1.5" />
          <path d="M 45 27 C 45 24 47 22 50 22 C 53 22 55 24 55 27" fill="none" stroke={strokeColor} strokeWidth="2" />
          <path d="M 64 36 L 68 32" stroke={strokeColor} strokeWidth="2.5" strokeLinecap="round" />
          {/* Dial Tick Marks */}
          <line x1="50" y1="36" x2="50" y2="39" stroke={strokeColor} strokeWidth="2" />
          <line x1="67" y1="53" x2="64" y2="53" stroke={strokeColor} strokeWidth="2" />
          <line x1="50" y1="70" x2="50" y2="67" stroke={strokeColor} strokeWidth="2" />
          <line x1="33" y1="53" x2="36" y2="53" stroke={strokeColor} strokeWidth="2" />
          {/* Electric Lightning Bolt */}
          <path
            d="M 52 38 L 41 52 H 49 L 46 68 L 60 50 H 51 Z"
            fill={isEarned ? '#F59E0B' : '#64748B'}
            stroke={isEarned ? '#FEF08A' : '#475569'}
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
        </g>
      );

    case 'trusted_neighbour':
      // Home with protective shield and heart
      return (
        <g opacity={isEarned ? 1 : 0.4}>
          {/* Roof Gable */}
          <path
            d="M 27 44 L 50 26 L 73 44"
            fill="none"
            stroke={strokeColor}
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Chimney */}
          <path d="M 61 31 V 26 H 65 V 34" fill={glyphFill} stroke={strokeColor} strokeWidth="1.5" />
          {/* Shield Foundation */}
          <path
            d="M 34 42 H 66 V 54 C 66 65 50 73 50 73 C 50 73 34 65 34 54 Z"
            fill={glyphFill}
            stroke={strokeColor}
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
          {/* Warm Heart inside */}
          <path
            d="M 50 50 C 48 46.5 43 46.5 40 50 C 37 53.5 38 57.5 42 61 L 50 67 L 58 61 C 62 57.5 63 53.5 60 50 C 57 46.5 52 46.5 50 50 Z"
            fill={isEarned ? '#EF4444' : '#64748B'}
            stroke={isEarned ? '#FFFFFF' : '#475569'}
            strokeWidth="1.2"
          />
        </g>
      );

    case 'study_mentor':
      // Open book with academic graduation cap above
      return (
        <g opacity={isEarned ? 1 : 0.4}>
          {/* Mortarboard Cap */}
          <path
            d="M 50 23 L 69 31 L 50 39 L 31 31 Z"
            fill={glyphFill}
            stroke={strokeColor}
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <path
            d="M 40 35 V 40 C 40 43 50 45 50 45 C 50 45 60 43 60 40 V 35"
            fill="none"
            stroke={strokeColor}
            strokeWidth="2"
          />
          <path d="M 64 33 V 43 L 66 45" stroke={isEarned ? '#F59E0B' : '#64748B'} strokeWidth="1.8" />
          {/* Open Book */}
          <path
            d="M 50 53 C 42 49 33 50 27 53 V 70 C 33 67 42 66 50 70 C 58 66 67 67 73 70 V 53 C 67 50 58 49 50 53 Z"
            fill={glyphFill}
            stroke={strokeColor}
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
          <line x1="50" y1="53" x2="50" y2="70" stroke={strokeColor} strokeWidth="2" />
          {/* Page Lines */}
          <line x1="32" y1="58" x2="44" y2="56" stroke={strokeColor} strokeWidth="1.5" opacity="0.6" />
          <line x1="32" y1="63" x2="44" y2="61" stroke={strokeColor} strokeWidth="1.5" opacity="0.6" />
          <line x1="56" y1="56" x2="68" y2="58" stroke={strokeColor} strokeWidth="1.5" opacity="0.6" />
          <line x1="56" y1="61" x2="68" y2="63" stroke={strokeColor} strokeWidth="1.5" opacity="0.6" />
        </g>
      );

    case 'medical_gear_lender':
      // Wheelchair & medical assistive equipment
      return (
        <g opacity={isEarned ? 1 : 0.4}>
          {/* Large Wheel */}
          <circle cx="45" cy="58" r="13" fill="none" stroke={strokeColor} strokeWidth="2.8" />
          <circle cx="45" cy="58" r="2.5" fill={strokeColor} />
          <line x1="45" y1="45" x2="45" y2="71" stroke={strokeColor} strokeWidth="1.5" opacity="0.6" />
          <line x1="32" y1="58" x2="58" y2="58" stroke={strokeColor} strokeWidth="1.5" opacity="0.6" />
          {/* Small Caster */}
          <circle cx="65" cy="68" r="3" fill={glyphFill} stroke={strokeColor} strokeWidth="1.5" />
          {/* User & Frame */}
          <circle cx="44" cy="30" r="4" fill={glyphFill} stroke={strokeColor} strokeWidth="1.5" />
          <path
            d="M 40 37 L 38 49 L 55 49 L 61 58 L 65 65"
            fill="none"
            stroke={strokeColor}
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Footrest & Handle */}
          <path d="M 63 65 H 68" stroke={strokeColor} strokeWidth="2.5" strokeLinecap="round" />
          <path d="M 33 41 H 38" stroke={strokeColor} strokeWidth="2.5" strokeLinecap="round" />
          {/* Medical Cross Accent in Upper Corner */}
          <g transform="translate(63, 27)">
            <rect x="3" y="0" width="3" height="9" rx="1" fill={isEarned ? '#10B981' : '#64748B'} />
            <rect x="0" y="3" width="9" height="3" rx="1" fill={isEarned ? '#10B981' : '#64748B'} />
          </g>
        </g>
      );

    case 'elder_friend':
      // Two caring hands lifting and protecting a heart
      return (
        <g opacity={isEarned ? 1 : 0.4}>
          {/* Radiant Heart */}
          <path
            d="M 50 31 C 46 26 39 26 35 31 C 31 36 32 43 38 49 L 50 58 L 62 49 C 68 43 69 36 65 31 C 61 26 54 26 50 31 Z"
            fill={isEarned ? '#EF4444' : '#64748B'}
            stroke={isEarned ? '#FFFFFF' : '#475569'}
            strokeWidth="2"
            strokeLinejoin="round"
          />
          {/* Left Caring Hand */}
          <path
            d="M 23 60 C 27 52 34 52 42 56 L 47 59 C 48 60 46 62 44 62 L 36 60 C 33 62 37 67 42 67 L 48 67 C 50 67 48 71 44 71 H 34 C 27 71 22 65 23 60 Z"
            fill={glyphFill}
            stroke={strokeColor}
            strokeWidth="2"
            strokeLinejoin="round"
          />
          {/* Right Caring Hand */}
          <path
            d="M 77 60 C 73 52 66 52 58 56 L 53 59 C 52 60 54 62 56 62 L 64 60 C 67 62 63 67 58 67 L 52 67 C 50 67 52 71 56 71 H 66 C 73 71 78 65 77 60 Z"
            fill={glyphFill}
            stroke={strokeColor}
            strokeWidth="2"
            strokeLinejoin="round"
          />
        </g>
      );

    case 'safe_ride_hero':
      // Car / transport shielded for safe transit
      return (
        <g opacity={isEarned ? 1 : 0.4}>
          {/* Outer Protective Shield Emblem */}
          <path
            d="M 30 25 H 70 V 46 C 70 61 50 73 50 73 C 50 73 30 61 30 46 Z"
            fill={glyphFill}
            stroke={strokeColor}
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
          {/* Transit Vehicle Silhouette */}
          <path
            d="M 37 53 L 41 43 H 59 L 63 53 H 66 C 68 53 69 54.5 69 56.5 V 62 H 31 V 56.5 C 31 54.5 32 53 34 53 Z"
            fill={isEarned ? '#0284C7' : '#334155'}
            stroke={strokeColor}
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          {/* Windshield */}
          <path d="M 42 45 H 58 L 61 51 H 39 Z" fill={isEarned ? '#BAE6FD' : '#64748B'} />
          {/* Headlights */}
          <circle cx="36" cy="57" r="2" fill={isEarned ? '#FDE047' : '#94A3B8'} />
          <circle cx="64" cy="57" r="2" fill={isEarned ? '#FDE047' : '#94A3B8'} />
          {/* Wheels */}
          <rect x="34" y="62" width="6" height="3" rx="1" fill={strokeColor} />
          <rect x="60" y="62" width="6" height="3" rx="1" fill={strokeColor} />
        </g>
      );

    case 'helper_streak':
      // Blazing flame with energetic tongues
      return (
        <g opacity={isEarned ? 1 : 0.4}>
          {/* Outer Flame */}
          <path
            d="M 50 22 C 54 29 53 36 58 41 C 64 47 71 48 71 59 C 71 70 61.5 77 50 77 C 38.5 77 29 70 29 59 C 29 48 37 42 41 36 C 45 31 44 26 50 22 Z"
            fill={glyphFill}
            stroke={strokeColor}
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
          {/* Secondary Flame Curve */}
          <path
            d="M 50 35 C 55 40 56 46 62 50 C 65 53 66 57 65 62 C 60 62 56 59 54 55 C 52 50 49 45 50 35 Z"
            fill={isEarned ? '#F59E0B' : '#64748B'}
            opacity={0.8}
          />
          {/* Hot Inner Flame Core */}
          <path
            d="M 50 47 C 53 51 55 54 55 60 C 55 66 52.5 69 50 69 C 47.5 69 45 66 45 60 C 45 54 47 51 50 47 Z"
            fill={isEarned ? '#FEF08A' : '#CBD5E1'}
          />
        </g>
      );

    case 'first_help':
      // Golden star milestone with sparkle flares
      return (
        <g opacity={isEarned ? 1 : 0.4}>
          {/* Radiant 5-Point Star */}
          <path
            d="M 50 23 L 56.5 37 L 72 38 L 60.5 49 L 64 64 L 50 56 L 36 64 L 39.5 49 L 28 38 L 43.5 37 Z"
            fill={glyphFill}
            stroke={strokeColor}
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
          {/* Star facets/sheen */}
          <path
            d="M 50 23 L 50 56 L 64 64 Z"
            fill={isEarned ? '#FFFFFF' : '#64748B'}
            opacity={isEarned ? 0.25 : 0.1}
          />
          {/* Sparkle Diamond 1 */}
          <path
            d="M 72 24 L 74 28 L 78 30 L 74 32 L 72 36 L 70 32 L 66 30 L 70 28 Z"
            fill={isEarned ? '#FDE047' : '#94A3B8'}
          />
          {/* Sparkle Diamond 2 */}
          <path
            d="M 28 58 L 29 61 L 32 62 L 29 63 L 28 66 L 27 63 L 24 62 L 27 61 Z"
            fill={isEarned ? '#FDE047' : '#94A3B8'}
          />
        </g>
      );

    case 'verified_doctor':
      // Stethoscope with verified checkmark
      return (
        <g opacity={isEarned ? 1 : 0.4}>
          {/* Stethoscope Binaural Earpieces */}
          <path
            d="M 37 25 C 37 23 39 23 39 25 V 33 C 39 41 45 46 50 46 C 55 46 61 41 61 33 V 25 C 61 23 63 23 63 25"
            fill="none"
            stroke={strokeColor}
            strokeWidth="2.8"
            strokeLinecap="round"
          />
          {/* Tubing loop down */}
          <path
            d="M 50 46 V 54 C 50 63 41 66 37 60 C 33 54 41 48 45 51"
            fill="none"
            stroke={strokeColor}
            strokeWidth="2.8"
            strokeLinecap="round"
          />
          {/* Resonator Disc with Verified Seal */}
          <circle cx="61" cy="60" r="12" fill={glyphFill} stroke={strokeColor} strokeWidth="2.5" />
          <circle cx="61" cy="60" r="9" fill={isEarned ? '#10B981' : '#475569'} />
          {/* Verified Checkmark */}
          <path
            d="M 56 60 L 59.5 63.5 L 66 56.5"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
      );

    case 'verified_student':
      // Graduation cap with verified checkmark badge
      return (
        <g opacity={isEarned ? 1 : 0.4}>
          {/* Mortarboard Diamond Board */}
          <path
            d="M 50 25 L 74 35 L 50 45 L 26 35 Z"
            fill={glyphFill}
            stroke={strokeColor}
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
          {/* Skullcap Band */}
          <path
            d="M 36 40 V 46 C 36 51 50 54 50 54 C 50 54 64 51 64 46 V 40"
            fill="none"
            stroke={strokeColor}
            strokeWidth="2.2"
          />
          {/* Tassel */}
          <path d="M 68 37 V 48 L 70 50" stroke={isEarned ? '#F59E0B' : '#64748B'} strokeWidth="2" strokeLinecap="round" />
          {/* Verified Checkmark Seal */}
          <circle cx="50" cy="64" r="10" fill={isEarned ? '#10B981' : '#475569'} stroke={strokeColor} strokeWidth="2" />
          <path
            d="M 45 64 L 48.5 67.5 L 55 60.5"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
      );

    case 'verified_nurse':
      // Cross with medical caduceus / heart
      return (
        <g opacity={isEarned ? 1 : 0.4}>
          {/* Emergency Cross Outline */}
          <path
            d="M 42 26 H 58 V 38 H 70 V 54 H 58 V 66 H 42 V 54 H 30 V 38 H 42 Z"
            fill={glyphFill}
            stroke={strokeColor}
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
          {/* Central Caduceus Staff & Wings or Heart */}
          <path
            d="M 50 42 C 48 39 44 39 42 42 C 39 45 40 48.5 44 52 L 50 57 L 56 52 C 60 48.5 61 45 58 42 C 56 39 52 39 50 42 Z"
            fill={isEarned ? '#EF4444' : '#475569'}
            stroke={isEarned ? '#FFFFFF' : '#334155'}
            strokeWidth="1.2"
          />
          {/* Caduceus Wings top accents */}
          <path
            d="M 43 33 C 47 30 50 33 50 33 C 50 33 53 30 57 33"
            fill="none"
            stroke={isEarned ? '#FFFFFF' : '#94A3B8'}
            strokeWidth="2"
            strokeLinecap="round"
          />
        </g>
      );

    case 'verified_pharmacist':
      // Pill / mortar with verified checkmark
      return (
        <g opacity={isEarned ? 1 : 0.4}>
          {/* Pestle */}
          <path
            d="M 58 26 L 65 30 L 52 54 L 45 50 Z"
            fill={isEarned ? '#E2E8F0' : '#475569'}
            stroke={strokeColor}
            strokeWidth="2"
            strokeLinejoin="round"
          />
          {/* Mortar Bowl */}
          <path
            d="M 29 45 H 71 L 65 67 C 65 70 60 72 50 72 C 40 72 35 70 35 67 Z"
            fill={glyphFill}
            stroke={strokeColor}
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
          <path d="M 27 43 H 73 V 47 H 27 Z" fill={glyphFill} stroke={strokeColor} strokeWidth="1.8" />
          {/* Verified Checkmark Seal */}
          <circle cx="50" cy="58" r="9" fill={isEarned ? '#10B981' : '#475569'} stroke={strokeColor} strokeWidth="1.8" />
          <path
            d="M 46 58 L 49 61 L 54.5 55"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
      );

    case 'verified_teacher':
      // Chalkboard & quill with verified seal
      return (
        <g opacity={isEarned ? 1 : 0.4}>
          {/* Chalkboard Slate */}
          <rect x="25" y="29" width="50" height="32" rx="3" fill={isEarned ? '#0F766E' : '#334155'} stroke={strokeColor} strokeWidth="2.5" />
          <path d="M 23 61 H 77 V 64 H 23 Z" fill={glyphFill} stroke={strokeColor} strokeWidth="1.8" />
          {/* Writing Quill */}
          <path
            d="M 69 24 C 69 24 63 34 58 43 L 55 44 L 57 41 C 58 38 64 30 69 24 Z"
            fill={isEarned ? '#FDE047' : '#94A3B8'}
            stroke={strokeColor}
            strokeWidth="1.2"
          />
          {/* Verified Checkmark on Board */}
          <path
            d="M 37 45 L 43 51 L 54 39"
            fill="none"
            stroke={isEarned ? '#FFFFFF' : '#94A3B8'}
            strokeWidth="3.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
      );

    case 'verified_ngo':
      // Classical institution building with verified seal
      return (
        <g opacity={isEarned ? 1 : 0.4}>
          {/* Triangular Pediment Roof */}
          <path
            d="M 50 24 L 26 36 H 74 Z"
            fill={glyphFill}
            stroke={strokeColor}
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <path d="M 27 37 H 73 V 40 H 27 Z" fill={glyphFill} />
          {/* Left and Right Columns */}
          <rect x="31" y="41" width="7" height="17" fill={glyphFill} stroke={strokeColor} strokeWidth="1.5" />
          <rect x="62" y="41" width="7" height="17" fill={glyphFill} stroke={strokeColor} strokeWidth="1.5" />
          {/* Center Verified Shield */}
          <path
            d="M 43 41 H 57 V 51 C 57 57 50 61 50 61 C 50 61 43 57 43 51 Z"
            fill={isEarned ? '#10B981' : '#475569'}
            stroke={strokeColor}
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          <path
            d="M 46 51 L 49 54 L 54 48"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Base Steps */}
          <path d="M 26 58 H 74 V 62 H 26 Z" fill={glyphFill} stroke={strokeColor} strokeWidth="1.5" />
          <path d="M 23 62 H 77 V 66 H 23 Z" fill={glyphFill} stroke={strokeColor} strokeWidth="1.5" />
        </g>
      );

    case 'verified_member':
    default:
      // KindLink Security Shield with checkmark
      return (
        <g opacity={isEarned ? 1 : 0.4}>
          {/* Outer Shield */}
          <path
            d="M 50 23 L 73 32 V 48 C 73 63 50 75 50 75 C 50 75 27 63 27 48 V 32 Z"
            fill={glyphFill}
            stroke={strokeColor}
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
          {/* Inner Shield Bevel */}
          <path
            d="M 50 28 L 68 35 V 47 C 68 59 50 69 50 69 C 50 69 32 59 32 47 V 35 Z"
            fill={isEarned ? '#0D9488' : '#334155'}
            stroke={strokeColor}
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          {/* Bold Verified Checkmark */}
          <path
            d="M 41 49 L 47 55 L 59 42"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
      );
  }
}

export function BadgeMedalIcon({
  iconName,
  badgeId,
  tier,
  size = 'md',
  isEarned = true,
  className = '',
  showLevelRing = true,
  isRecent = false,
}: BadgeMedalIconProps) {
  const uid = useId().replace(/:/g, '');
  const glyphKey = resolveBadgeGlyphKey(badgeId, iconName);
  const activeTier: BadgeTier | 'locked' = !isEarned ? 'locked' : tier;

  // Size styling configuration
  const sizeConfig = {
    sm: {
      container: 'h-10 w-10 min-w-10 min-h-10',
      lockSize: 'h-3.5 w-3.5',
      lockIconSize: 'h-2 w-2',
    },
    md: {
      container: 'h-16 w-16 min-w-16 min-h-16',
      lockSize: 'h-5 w-5',
      lockIconSize: 'h-2.5 w-2.5',
    },
    lg: {
      // Exactly 80px preview for detail sheets and large cards
      container: 'h-20 w-20 min-w-20 min-h-20',
      lockSize: 'h-6 w-6',
      lockIconSize: 'h-3 w-3',
    },
    xl: {
      container: 'h-24 w-24 min-w-24 min-h-24',
      lockSize: 'h-7 w-7',
      lockIconSize: 'h-3.5 w-3.5',
    },
    detail: {
      container: 'h-20 w-20 min-w-20 min-h-20',
      lockSize: 'h-6 w-6',
      lockIconSize: 'h-3 w-3',
    },
    shelf: {
      // 48px round medal for ProfileHeader pinned badge shelf
      container: 'h-12 w-12 min-w-12 min-h-12',
      lockSize: 'h-4 w-4',
      lockIconSize: 'h-2 w-2',
    },
  }[size] || {
    container: 'h-16 w-16 min-w-16 min-h-16',
    lockSize: 'h-5 w-5',
    lockIconSize: 'h-2.5 w-2.5',
  };

  // Tier gradient definitions matching prompt specifications:
  // Bronze: Rich copper/bronze metallic gradient (#B45309 to #78350F) with soft warm shine
  // Silver: Crisp silver metallic gradient (#94A3B8 to #475569) with cool chrome highlight
  // Gold: Radiant amber/gold metallic gradient (#F59E0B to #B45309) with luminous warm sheen
  // Platinum: High-end icy platinum gradient (#38BDF8 to #6366F1) with violet/cyan shimmer
  // Locked: Flat, muted dark/light grey silhouette
  const tierGradients = {
    bronze: {
      ringStop1: '#D97706',
      ringStop2: '#B45309',
      ringStop3: '#78350F',
      discBg1: '#451A03',
      discBg2: '#1C0D02',
      glyphStop1: '#FDE68A',
      glyphStop2: '#B45309',
      stroke: '#78350F',
      glowRgba: 'rgba(180, 83, 9, 0.4)',
      ambientGlow: 'shadow-[0_0_20px_rgba(180,83,9,0.35)]',
    },
    silver: {
      ringStop1: '#F8FAFC',
      ringStop2: '#94A3B8',
      ringStop3: '#475569',
      discBg1: '#1E293B',
      discBg2: '#0F172A',
      glyphStop1: '#FFFFFF',
      glyphStop2: '#CBD5E1',
      stroke: '#475569',
      glowRgba: 'rgba(148, 163, 184, 0.4)',
      ambientGlow: 'shadow-[0_0_20px_rgba(148,163,184,0.35)]',
    },
    gold: {
      ringStop1: '#FEF08A',
      ringStop2: '#F59E0B',
      ringStop3: '#B45309',
      discBg1: '#451A03',
      discBg2: '#1F0B00',
      glyphStop1: '#FEF9C3',
      glyphStop2: '#F59E0B',
      stroke: '#92400E',
      glowRgba: 'rgba(245, 158, 11, 0.45)',
      ambientGlow: 'shadow-[0_0_24px_rgba(245,158,11,0.45)]',
    },
    platinum: {
      ringStop1: '#A5F3FC',
      ringStop2: '#38BDF8',
      ringStop3: '#6366F1',
      discBg1: '#1E1B4B',
      discBg2: '#0C0A26',
      glyphStop1: '#E0F2FE',
      glyphStop2: '#818CF8',
      stroke: '#4338CA',
      glowRgba: 'rgba(56, 189, 248, 0.5)',
      ambientGlow: 'shadow-[0_0_28px_rgba(56,189,248,0.45)]',
    },
    locked: {
      ringStop1: '#64748B',
      ringStop2: '#475569',
      ringStop3: '#334155',
      discBg1: '#1E293B',
      discBg2: '#0F172A',
      glyphStop1: '#94A3B8',
      glyphStop2: '#64748B',
      stroke: '#475569',
      glowRgba: 'transparent',
      ambientGlow: '',
    },
  }[activeTier];

  const gradPrefix = `medal-${activeTier}-${uid}`;

  return (
    <div
      className={`relative inline-flex items-center justify-center select-none ${
        sizeConfig.container
      } ${isEarned ? tierGradients.ambientGlow : 'opacity-70'} ${className}`}
    >
      <svg
        viewBox="0 0 100 100"
        className="h-full w-full overflow-visible transition-transform duration-300 group-hover:scale-105"
        aria-hidden="true"
      >
        <defs>
          {/* Outer Metallic Ring Gradient */}
          <linearGradient id={`${gradPrefix}-ring`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={tierGradients.ringStop1} />
            <stop offset="45%" stopColor={tierGradients.ringStop2} />
            <stop offset="100%" stopColor={tierGradients.ringStop3} />
          </linearGradient>

          {/* Inner Medallion Disc Radial Background */}
          <radialGradient id={`${gradPrefix}-disc`} cx="40%" cy="35%" r="65%">
            <stop offset="0%" stopColor={tierGradients.discBg1} />
            <stop offset="100%" stopColor={tierGradients.discBg2} />
          </radialGradient>

          {/* Glyph Metallic Fill Gradient */}
          <linearGradient id={`${gradPrefix}-glyph`} x1="20%" y1="0%" x2="80%" y2="100%">
            <stop offset="0%" stopColor={tierGradients.glyphStop1} />
            <stop offset="100%" stopColor={tierGradients.glyphStop2} />
          </linearGradient>

          {/* Stroke Gradient */}
          <linearGradient id={`${gradPrefix}-stroke`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={tierGradients.ringStop1} />
            <stop offset="100%" stopColor={tierGradients.stroke} />
          </linearGradient>

          {/* Glow filter for earned / recent badges */}
          <filter id={`${gradPrefix}-glow`} x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow
              dx="0"
              dy="0"
              stdDeviation={isRecent ? '4' : '2'}
              floodColor={tierGradients.glowRgba}
            />
          </filter>
        </defs>

        {/* Outer Ring & Specular Metallic Bezel */}
        {showLevelRing && (
          <>
            {/* Outer Drop Shadow Bezel */}
            <circle
              cx="50"
              cy="50"
              r="46"
              fill="none"
              stroke={isEarned ? `url(#${gradPrefix}-ring)` : '#64748B'}
              strokeWidth="4.5"
              strokeDasharray={isEarned ? undefined : '5 3'}
              filter={isEarned ? `url(#${gradPrefix}-glow)` : undefined}
            />

            {/* Micro Beaded / Concentric Accent Ring */}
            <circle
              cx="50"
              cy="50"
              r="42"
              fill="none"
              stroke={isEarned ? tierGradients.ringStop1 : '#475569'}
              strokeWidth="1"
              strokeDasharray={isEarned ? '1 3' : '3 3'}
              opacity={isEarned ? 0.6 : 0.3}
            />
          </>
        )}

        {/* Inner Coin Medallion Disc */}
        <circle
          cx="50"
          cy="50"
          r="41"
          fill={`url(#${gradPrefix}-disc)`}
        />

        {/* Specular Chrome / Light Reflection Rim Arc */}
        {isEarned && (
          <path
            d="M 23 37 A 40 40 0 0 1 65 13"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="2"
            strokeLinecap="round"
            opacity={activeTier === 'silver' || activeTier === 'platinum' ? 0.6 : 0.45}
          />
        )}

        {/* Distinct SVG Glyph */}
        <RenderBadgeGlyph
          glyphKey={glyphKey}
          isEarned={isEarned}
          tier={activeTier}
          gradientPrefix={gradPrefix}
        />
      </svg>

      {/* Locked Overlay Pill Indicator */}
      {!isEarned && (
        <div
          className={`absolute -bottom-1 -right-1 ${sizeConfig.lockSize} rounded-full bg-card border border-border flex items-center justify-center text-muted-foreground shadow-xs`}
          title="Locked badge"
        >
          <Lock className={`${sizeConfig.lockIconSize} notranslate`} />
        </div>
      )}
    </div>
  );
}
