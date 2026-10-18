import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { checkRateLimit } from '@/lib/auth/rate-limit';
import { MemberProfileView, PublicMemberProfile } from '@/components/profile/MemberProfileView';
import { UserX, ShieldAlert, ArrowLeft } from 'lucide-react';

interface MemberPageProps {
  params: {
    username: string;
  };
}

/**
 * Member Profile Page Metadata:
 * Strictly noindex, nofollow to keep community members' profiles private from search engine crawlers.
 */
export const metadata: Metadata = {
  title: 'Member Profile | KindLink',
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

export default async function MemberPage({ params }: MemberPageProps) {
  const username = decodeURIComponent(params.username || '').trim().replace(/^@/, '');

  // 1. Enforce authentication requirement
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?redirect=${encodeURIComponent(`/u/${username}`)}`);
    return null;
  }

  // 2. Rate-limiting to prevent scraping member data
  const reqHeaders = headers();
  const forwardedFor = reqHeaders.get('x-forwarded-for');
  const clientIp = forwardedFor ? forwardedFor.split(',')[0].trim() : reqHeaders.get('x-real-ip') || user.id;

  const rateLimit = checkRateLimit(`profile_view:${clientIp}`, 60, 60 * 1000);
  if (!rateLimit.allowed) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4 bg-background text-foreground">
        <div className="max-w-md w-full p-8 rounded-3xl border border-rose-500/30 bg-card shadow-2xl text-center space-y-4">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-600 flex items-center justify-center">
            <ShieldAlert className="h-6 w-6 notranslate" />
          </div>
          <h1 className="text-xl font-extrabold text-foreground">Rate Limit Reached</h1>
          <p className="text-xs text-muted-foreground leading-relaxed">
            To prevent automatic scraping and safeguard volunteer safety, profile browsing is temporarily throttled. Please wait a moment and try again.
          </p>
          <Link
            href="/"
            className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-primary text-white text-xs font-bold shadow-soft transition"
          >
            Return to Feed
          </Link>
        </div>
      </main>
    );
  }

  // 3. Query member profile from database
  const admin = createAdminClient();
  const { data: profile, error } = await admin
    .from('profiles')
    .select('*')
    .ilike('username', username.toLowerCase())
    .maybeSingle();

  if (error || !profile) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4 bg-background text-foreground">
        <div className="max-w-md w-full p-8 rounded-3xl border border-border bg-card shadow-soft text-center space-y-4">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-muted text-muted-foreground flex items-center justify-center">
            <UserX className="h-6 w-6 notranslate" />
          </div>
          <h1 className="text-xl font-extrabold text-foreground">Member Not Found</h1>
          <p className="text-xs text-muted-foreground leading-relaxed">
            The member profile <span className="font-mono text-primary font-bold">@{username}</span> does not exist or may have been deleted.
          </p>
          <div className="pt-2">
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold shadow-soft transition"
            >
              <ArrowLeft className="h-4 w-4 notranslate" />
              <span>Back to KindLink</span>
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // 4. Enforce database visibility rules
  const isSelf = user.id === profile.id;

  // Check viewer admin role
  const { data: viewerProfile } = await admin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();
  const isAdmin = viewerProfile?.role === 'admin';

  // Check if matched via active/completed request or offer exchange
  let isMatched = false;
  if (!isSelf && user) {
    try {
      const { data: matchedReq } = await admin
        .from('requests')
        .select('id')
        .or(
          `and(requester_id.eq.${profile.id},accepted_helper_id.eq.${user.id}),and(requester_id.eq.${user.id},accepted_helper_id.eq.${profile.id})`
        )
        .in('status', ['accepted', 'completed'])
        .limit(1);

      if (matchedReq && matchedReq.length > 0) {
        isMatched = true;
      }
    } catch {
      // Fallback
    }
  }

  // 4 Contact Fields: Phone, Email, Organisation, Area
  // 3 Visibility Levels:
  // - 'members': Visible to any logged-in KindLink member
  // - 'matched': Visible ONLY to users who have an active or completed request/offer with this user
  // - 'private': Visible ONLY to the user themselves and platform admins
  const visPhone = profile.visibility_phone || 'members';
  const visEmail = profile.visibility_email || 'members';
  const visOrg = profile.visibility_organisation || 'members';
  const visArea = profile.visibility_area || 'members';

  const phoneVisible =
    isSelf || isAdmin || (visPhone === 'members' && Boolean(user)) || (visPhone === 'matched' && isMatched);
  const emailVisible =
    isSelf || isAdmin || (visEmail === 'members' && Boolean(user)) || (visEmail === 'matched' && isMatched);
  const orgVisible =
    isSelf || isAdmin || (visOrg === 'members' && Boolean(user)) || (visOrg === 'matched' && isMatched);
  const areaVisible =
    isSelf || isAdmin || (visArea === 'members' && Boolean(user)) || (visArea === 'matched' && isMatched);

  // Area rule: NEVER reveal exact coordinates or street addresses to other members—only area_name
  const safeAreaName = profile.area_name || profile.home_neighborhood || null;
  const safeOrgName = profile.organisation || profile.college || null;

  const memberData: PublicMemberProfile = {
    id: profile.id,
    username: profile.username,
    displayName: profile.display_name || profile.username,
    avatarUrl: profile.avatar_url,
    verificationStatus: profile.verification_status || 'unverified',
    role: profile.role || 'user',
    ratingAverage: Number(profile.rating_average) || 5.0,
    ratingCount: profile.rating_count || 0,
    createdAt: profile.created_at || new Date().toISOString(),
    bio: profile.bio,
    college: safeOrgName,
    organisation: safeOrgName,
    homeNeighborhood: safeAreaName,
    area_name: safeAreaName,
    languages: Array.isArray(profile.languages) ? profile.languages : ['Bengali', 'Hindi', 'English'],
    badges: Array.isArray(profile.badges) ? profile.badges : [],
    phone: phoneVisible ? (profile.phone_e164 || profile.phone) : null,
    email: emailVisible ? profile.email : null,
    phoneVisible,
    emailVisible,
    orgVisible,
    areaVisible,
    visibility_phone: visPhone,
    visibility_email: visEmail,
    visibility_organisation: visOrg,
    visibility_area: visArea,
    isSelf,
    isOrganization: Boolean(profile.is_organization),
    organizationName: profile.organization_name || null,
    organizationType: profile.organization_type || null,
    organizationVerified: Boolean(profile.organization_verified),
    organizationRegistrationNumber: profile.organization_registration_number || null,
  };

  return (
    <main className="min-h-screen bg-background text-foreground">
      <MemberProfileView member={memberData} />
    </main>
  );
}
