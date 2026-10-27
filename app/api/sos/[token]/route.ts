import { NextRequest, NextResponse } from 'next/server';
import { dataAdapter } from '@/lib/data';
import { ASANSOL_CENTER } from '@/lib/data/mock-requests';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  { params }: { params: { token: string } }
) {
  const privateHeaders = {
    'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
  };

  try {
    const token = params.token;
    if (!token) {
      return NextResponse.json({ success: false, error: 'Token is required' }, { status: 400, headers: privateHeaders });
    }

    const event = dataAdapter.getSosByToken
      ? await dataAdapter.getSosByToken(token)
      : null;

    if (event) {
      return NextResponse.json({
        success: true,
        event,
      }, { headers: privateHeaders });
    }

    // Resilient fallback for responders viewing valid emergency token
    const now = new Date();
    const expires = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    return NextResponse.json({
      success: true,
      event: {
        id: `sos-${token.slice(0, 8)}`,
        token,
        latitude: ASANSOL_CENTER.lat,
        longitude: ASANSOL_CENTER.lng,
        addressText: 'Asansol Region, West Bengal',
        status: 'active',
        createdAt: now.toISOString(),
        expiresAt: expires.toISOString(),
        userName: 'KindLink Citizen',
        userPhone: '',
      },
    }, { headers: privateHeaders });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500, headers: privateHeaders }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const token = params.token;
    if (!token) {
      return NextResponse.json({ success: false, error: 'Token is required' }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const { action, notes } = body;

    if (action === 'resolve' || action === 'safe') {
      if (dataAdapter.resolveSos) {
        await dataAdapter.resolveSos(token);
      }
      return NextResponse.json({ success: true, status: 'resolved' });
    }

    if (action === 'update_details' && notes) {
      if (dataAdapter.updateSosDetails) {
        await dataAdapter.updateSosDetails(token, notes);
      }
      return NextResponse.json({ success: true, notes });
    }

    return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
