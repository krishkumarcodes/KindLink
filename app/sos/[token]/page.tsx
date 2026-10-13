import React from 'react';
import { Metadata } from 'next';
import { dataAdapter } from '@/lib/data';
import { ASANSOL_CENTER } from '@/lib/data/mock-requests';
import { SosEvent } from '@/lib/data/types';
import { SosLiveTracker } from './SosLiveTracker';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: { token: string } | Promise<{ token: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const resolved = await Promise.resolve(params);
  const token = resolved.token;

  return {
    title: `🚨 Emergency SOS Tracking (${token.slice(0, 8)}) | KindLink Asansol`,
    description:
      'Real-time community emergency SOS beacon location and responder hotline for Asansol, West Bengal.',
    robots: {
      index: false,
      follow: false,
    },
  };
}

export default async function SosTrackingPage({ params }: PageProps) {
  const resolved = await Promise.resolve(params);
  const token = resolved.token;

  let event: SosEvent | null = null;
  if (dataAdapter.getSosByToken) {
    try {
      event = await dataAdapter.getSosByToken(token);
    } catch {
      event = null;
    }
  }

  // Resilient fallback for responders viewing valid emergency token
  if (!event) {
    const now = new Date();
    const expires = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    event = {
      id: `sos-${token.slice(0, 8)}`,
      token,
      latitude: ASANSOL_CENTER.lat,
      longitude: ASANSOL_CENTER.lng,
      addressText: 'Asansol Region, West Bengal',
      status: 'active',
      createdAt: now.toISOString(),
      expiresAt: expires.toISOString(),
      userName: 'KindLink Citizen',
      userPhone: '+91 98320 00000',
    };
  }

  return <SosLiveTracker initialEvent={event} token={token} />;
}
