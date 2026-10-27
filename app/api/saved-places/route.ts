import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isLegacyPlaceObject } from '@/lib/utils/storage-migration';

export const dynamic = 'force-dynamic';
const MAX_SAVED_PLACES = 10;


const VALID_TYPES = ['home', 'work', 'clinic', 'campus', 'custom'] as const;

function formatPlaceRecord(p: any) {
  const name = p.name || p.label || 'Saved Place';
  const label = p.address_text || (p.label && p.label !== name ? p.label : name);
  const lat = Number(p.lat ?? p.latitude);
  const lng = Number(p.lng ?? p.longitude);
  const type = p.type || 'custom';
  const createdAt = p.created_at ? new Date(p.created_at).getTime() : Date.now();

  return {
    id: String(p.id),
    name,
    label,
    lat,
    lng,
    type: VALID_TYPES.includes(type) ? type : 'custom',
    createdAt,
  };
}

export async function GET() {
  try {
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    const privateHeaders = {
      'Cache-Control': 'private, no-cache, no-store, max-age=0, must-revalidate',
    };

    if (authError || !user) {
      return NextResponse.json({ places: [], authenticated: false }, { status: 200, headers: privateHeaders });
    }

    const { data: places, error } = await supabase
      .from('saved_places')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      return NextResponse.json({ places: [], authenticated: true, error: error.message }, { status: 200, headers: privateHeaders });
    }

    const formatted = (places || [])
      .map(formatPlaceRecord)
      .filter((p) => !isLegacyPlaceObject(p));
    return NextResponse.json({ places: formatted, authenticated: true }, { headers: privateHeaders });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error fetching saved places';
    return NextResponse.json({ error: message, places: [] }, { status: 500, headers: { 'Cache-Control': 'no-store, max-age=0' } });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized: please sign in to save places' }, { status: 401 });
    }

    const body = await req.json();

    // 0. Dedicated legacy cleanup action
    if (body.action === 'cleanup_legacy') {
      const admin = createAdminClient();
      const { data: userPlaces } = await admin
        .from('saved_places')
        .select('id, name, label, address_text')
        .eq('user_id', user.id);

      const toDeleteIds: string[] = [];
      for (const p of userPlaces || []) {
        if (isLegacyPlaceObject(p)) {
          toDeleteIds.push(String(p.id));
        }
      }

      if (toDeleteIds.length > 0) {
        await admin.from('saved_places').delete().in('id', toDeleteIds);
      }

      return NextResponse.json({ success: true, deleted: toDeleteIds.length });
    }

    // 1. Bulk sync mode (merging offline localStorage places upon login)
    if (body.action === 'sync' && Array.isArray(body.places)) {
      const incoming: any[] = body.places.slice(0, 10);
      const admin = createAdminClient();

      // Fetch existing DB places
      const { data: existing } = await admin
        .from('saved_places')
        .select('*')
        .eq('user_id', user.id);

      const existingPlaces = (existing || []).map(formatPlaceRecord);
      const toInsert: any[] = [];

      for (const item of incoming) {
        if (!item || !item.name || typeof item.lat !== 'number' || typeof item.lng !== 'number' || isLegacyPlaceObject(item)) continue;
        const cleanName = String(item.name).trim();
        const duplicate = existingPlaces.some(
          (ex) =>
            ex.name.toLowerCase() === cleanName.toLowerCase() ||
            (Math.abs(ex.lat - item.lat) < 0.0005 && Math.abs(ex.lng - item.lng) < 0.0005)
        );

        if (!duplicate && existingPlaces.length + toInsert.length < 10) {
          toInsert.push({
            user_id: user.id,
            label: cleanName,
            address_text: item.label || cleanName,
            latitude: Number(item.lat),
            longitude: Number(item.lng),
            name: cleanName,
            type: VALID_TYPES.includes(item.type) ? item.type : 'custom',
          });
        }
      }

      if (toInsert.length > 0) {
        let insertRes = await admin.from('saved_places').insert(toInsert);
        if (insertRes.error) {
          // If custom columns failed, try fallback with standard schema
          const fallbackToInsert = toInsert.map((t) => ({
            user_id: t.user_id,
            label: t.label,
            address_text: t.address_text,
            latitude: t.latitude,
            longitude: t.longitude,
          }));
          await admin.from('saved_places').insert(fallbackToInsert);
        }
      }

      // Return refreshed list
      const { data: refreshed } = await admin
        .from('saved_places')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      const formatted = (refreshed || []).map(formatPlaceRecord);
      return NextResponse.json({ success: true, places: formatted });
    }

    // 2. Single place insertion
    const { name, label, lat, lng, type } = body;

    const cleanName = (name || '').trim();
    if (!cleanName || cleanName.length > 60) {
      return NextResponse.json(
        { error: 'Place name is required and cannot exceed 60 characters.' },
        { status: 400 }
      );
    }

    const cleanLabel = (label || cleanName).trim();
    if (isLegacyPlaceObject({ name: cleanName, label: cleanLabel })) {
      return NextResponse.json(
        { error: 'This place name is not permitted.' },
        { status: 400 }
      );
    }

    const nLat = Number(lat);
    const nLng = Number(lng);
    if (isNaN(nLat) || isNaN(nLng) || nLat < -90 || nLat > 90 || nLng < -180 || nLng > 180) {
      return NextResponse.json({ error: 'Valid latitude and longitude are required.' }, { status: 400 });
    }

    const cleanType = VALID_TYPES.includes(type) ? type : 'custom';

    const admin = createAdminClient();

    // Check count constraint (max 10)
    const { count, error: countErr } = await admin
      .from('saved_places')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    if (!countErr && typeof count === 'number' && count >= 10) {
      return NextResponse.json(
        { error: 'You have reached the maximum limit of 10 saved places. Remove one to add another.' },
        { status: 400 }
      );
    }

    const insertPayload: Record<string, any> = {
      user_id: user.id,
      label: cleanName,
      address_text: cleanLabel,
      latitude: nLat,
      longitude: nLng,
      name: cleanName,
      type: cleanType,
    };

    let { data: inserted, error: insertErr } = await admin
      .from('saved_places')
      .insert(insertPayload)
      .select('*')
      .single();

    if (insertErr || !inserted) {
      // Fallback with base columns only
      const basePayload = {
        user_id: user.id,
        label: cleanName,
        address_text: cleanLabel,
        latitude: nLat,
        longitude: nLng,
      };

      const fallbackRes = await admin
        .from('saved_places')
        .insert(basePayload)
        .select('*')
        .single();

      if (fallbackRes.error || !fallbackRes.data) {
        return NextResponse.json(
          { error: fallbackRes.error?.message || insertErr?.message || 'Failed to save place in database' },
          { status: 500 }
        );
      }
      inserted = fallbackRes.data;
    }

    return NextResponse.json({ success: true, place: formatPlaceRecord(inserted) }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error saving place';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { id, name, type } = body;

    if (!id) {
      return NextResponse.json({ error: 'Place ID is required.' }, { status: 400 });
    }

    const admin = createAdminClient();
    const updates: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (name) {
      updates.label = String(name).trim();
      updates.name = String(name).trim();
    }
    if (type && VALID_TYPES.includes(type)) {
      updates.type = type;
    }

    let { data: updated, error } = await admin
      .from('saved_places')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select('*')
      .single();

    if (error || !updated) {
      // Retry with label only
      const baseUpdates: Record<string, any> = {
        updated_at: new Date().toISOString(),
      };
      if (name) baseUpdates.label = String(name).trim();

      const baseRes = await admin
        .from('saved_places')
        .update(baseUpdates)
        .eq('id', id)
        .eq('user_id', user.id)
        .select('*')
        .single();

      if (baseRes.error || !baseRes.data) {
        return NextResponse.json({ error: error?.message || 'Place not found or update failed.' }, { status: 404 });
      }
      updated = baseRes.data;
    }

    return NextResponse.json({
      success: true,
      place: formatPlaceRecord(updated),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error updating place';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(req.url);
    const idFromQuery = url.searchParams.get('id');
    let idToDelete = idFromQuery;

    if (!idToDelete) {
      try {
        const body = await req.json();
        idToDelete = body.id;
      } catch {
        // ignore
      }
    }

    if (!idToDelete) {
      return NextResponse.json({ error: 'Place ID is required to delete.' }, { status: 400 });
    }

    const admin = createAdminClient();
    const { error } = await admin
      .from('saved_places')
      .delete()
      .eq('id', idToDelete)
      .eq('user_id', user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Saved place deleted successfully.' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error deleting place';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
