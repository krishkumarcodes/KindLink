import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(req: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (error || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    return NextResponse.json({ profile });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      displayName,
      username,
      phone,
      college,
      bio,
      homeNeighborhood,
      avatarUrl,
      languages,
    } = body;

    // Validate username if provided
    if (username) {
      const cleanUsername = username.trim().toLowerCase();
      if (!/^[a-z][a-z0-9_]{2,19}$/.test(cleanUsername)) {
        return NextResponse.json(
          { error: 'Username must be 3-20 characters long and start with a letter.' },
          { status: 400 }
        );
      }

      // Check if username is taken by someone else
      const admin = createAdminClient();
      const { data: existing } = await admin
        .from('profiles')
        .select('id')
        .ilike('username', cleanUsername)
        .neq('id', user.id)
        .maybeSingle();

      if (existing) {
        return NextResponse.json(
          { error: 'This username is already taken by another member.' },
          { status: 400 }
        );
      }
    }

    // Attempt update with rich fields
    const admin = createAdminClient();
    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (displayName !== undefined) updateData.display_name = displayName;
    if (username !== undefined) updateData.username = username.trim().toLowerCase();
    if (phone !== undefined) updateData.phone = phone;

    // Optional columns in schema
    if (college !== undefined) updateData.college = college;
    if (bio !== undefined) updateData.bio = bio;
    if (homeNeighborhood !== undefined) updateData.home_neighborhood = homeNeighborhood;
    if (avatarUrl !== undefined) updateData.avatar_url = avatarUrl;
    if (languages !== undefined) updateData.languages = languages;

    let updateRes = await admin
      .from('profiles')
      .update(updateData)
      .eq('id', user.id);

    if (updateRes.error) {
      // If failure due to non-existent optional columns, retry with base columns only
      const baseUpdate: Record<string, any> = {
        updated_at: new Date().toISOString(),
      };
      if (displayName !== undefined) baseUpdate.display_name = displayName;
      if (username !== undefined) baseUpdate.username = username.trim().toLowerCase();
      if (phone !== undefined) baseUpdate.phone = phone;

      const baseRes = await admin
        .from('profiles')
        .update(baseUpdate)
        .eq('id', user.id);

      if (baseRes.error) {
        return NextResponse.json(
          { error: baseRes.error.message || 'Failed to update profile in database' },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully',
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Internal server error updating profile' },
      { status: 500 }
    );
  }
}
