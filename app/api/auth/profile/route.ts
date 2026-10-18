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

    const visibility = {
      phone: profile.visibility_phone || 'members',
      email: profile.visibility_email || 'members',
      organisation: profile.visibility_organisation || 'members',
      area: profile.visibility_area || 'members',
    };

    return NextResponse.json({
      profile: {
        ...profile,
        organisation: profile.organisation || profile.college,
        area_name: profile.area_name || profile.home_neighborhood,
        visibility_phone: visibility.phone,
        visibility_email: visibility.email,
        visibility_organisation: visibility.organisation,
        visibility_area: visibility.area,
        visibility,
        isOrganization: Boolean(profile.is_organization),
        organizationName: profile.organization_name || '',
        organizationType: profile.organization_type || null,
        organizationVerified: Boolean(profile.organization_verified),
        organizationRegistrationNumber: profile.organization_registration_number || '',
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

function normalizeVisibility(val: any): 'members' | 'matched' | 'private' | undefined {
  if (!val) return undefined;
  if (val === 'public' || val === 'all' || val === 'members') return 'members';
  if (val === 'helpers' || val === 'matched') return 'matched';
  if (val === 'private') return 'private';
  return undefined;
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
      organisation,
      bio,
      homeNeighborhood,
      area_name,
      avatarUrl,
      languages,
      preferredLanguage,
      preferred_language,
      visibility,
      visibility_phone,
      visibility_email,
      visibility_organisation,
      visibility_area,
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
    const orgValue = organisation !== undefined ? organisation : college;
    if (orgValue !== undefined) {
      updateData.organisation = orgValue;
      updateData.college = orgValue;
    }
    if (bio !== undefined) updateData.bio = bio;
    const areaValue = area_name !== undefined ? area_name : homeNeighborhood;
    if (areaValue !== undefined) {
      updateData.area_name = areaValue;
      updateData.home_neighborhood = areaValue;
    }
    if (avatarUrl !== undefined) updateData.avatar_url = avatarUrl;
    if (languages !== undefined) updateData.languages = languages;
    const targetLang = preferredLanguage || preferred_language;
    if (targetLang !== undefined) updateData.preferred_language = targetLang;

    // Granular visibility controls
    const vPhone = normalizeVisibility(visibility_phone ?? visibility?.phone);
    if (vPhone) updateData.visibility_phone = vPhone;

    const vEmail = normalizeVisibility(visibility_email ?? visibility?.email);
    if (vEmail) updateData.visibility_email = vEmail;

    const vOrg = normalizeVisibility(visibility_organisation ?? visibility?.organisation);
    if (vOrg) updateData.visibility_organisation = vOrg;

    const vArea = normalizeVisibility(visibility_area ?? visibility?.area);
    if (vArea) updateData.visibility_area = vArea;

    // Organization fields
    const {
      isOrganization,
      organizationName,
      organizationType,
      organizationVerified,
      organizationRegistrationNumber,
    } = body;
    if (isOrganization !== undefined) updateData.is_organization = Boolean(isOrganization);
    if (organizationName !== undefined) updateData.organization_name = organizationName;
    if (organizationType !== undefined) updateData.organization_type = organizationType;
    if (organizationVerified !== undefined) updateData.organization_verified = Boolean(organizationVerified);
    if (organizationRegistrationNumber !== undefined) updateData.organization_registration_number = organizationRegistrationNumber;

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
      if (targetLang !== undefined) baseUpdate.preferred_language = targetLang;

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
