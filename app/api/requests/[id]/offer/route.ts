import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const requestId = params.id;
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Please sign in to offer help.' },
        { status: 401 }
      );
    }

    // Check request existence and requester_id
    const { data: request, error: reqError } = await supabase
      .from('requests')
      .select('id, requester_id, status')
      .eq('id', requestId)
      .single();

    if (reqError || !request) {
      return NextResponse.json(
        { success: false, error: 'Request not found.' },
        { status: 404 }
      );
    }

    // Own-request rule: viewer === requester cannot offer in UI, API, or DB; receives 'own_request' code
    if (request.requester_id === user.id) {
      return NextResponse.json(
        {
          success: false,
          error: 'You cannot offer help on your own request.',
          code: 'own_request',
        },
        { status: 403 }
      );
    }

    if (request.status !== 'open' && request.status !== 'offered') {
      return NextResponse.json(
        {
          success: false,
          error: 'This request is no longer accepting offers.',
          code: 'request_closed',
        },
        { status: 400 }
      );
    }

    // Check helper verification status
    const { data: profile } = await supabase
      .from('profiles')
      .select('verification_status')
      .eq('id', user.id)
      .single();

    if (!profile || profile.verification_status !== 'verified') {
      return NextResponse.json(
        {
          success: false,
          error: 'Only verified volunteers can submit offers to assist.',
          code: 'not_verified',
        },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const message = body?.message || 'I am ready to help with this request!';

    const { data: offer, error: insertError } = await supabase
      .from('offers')
      .insert({
        request_id: requestId,
        helper_id: user.id,
        message,
        status: 'pending',
      })
      .select()
      .single();

    if (insertError) {
      const isOwn = insertError.message?.toLowerCase().includes('own') || insertError.code === '42501';
      return NextResponse.json(
        {
          success: false,
          error: insertError.message,
          code: isOwn ? 'own_request' : 'insert_failed',
        },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, offer }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
