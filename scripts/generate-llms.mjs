import fs from 'fs';
import path from 'path';

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://kindlink.onrender.com').replace(/\/$/, '');

const pages = [
  {
    title: 'Home',
    url: `${SITE_URL}/`,
    desc: 'Public landing page with live urgency ticker, impact metrics, categories, and direct aid access.',
    content: `
# KindLink - Hyperlocal Mutual Aid & Community Support
**Tagline:** Help is just next door.
**Coverage Area:** Asansol, Raniganj, Kulti, Durgapur, and neighboring districts in West Bengal, India.
**Core Mission:** Bridge critical emergency needs (blood, medical transport, mobility gear) and neighborly assistance using verified community members and a transparent physics-inspired urgency algorithm.
**Free to Use:** 100% free community platform with zero commercial monetization, ads, or hidden charges.
**Key Features:**
- Real-time SOS alerts with browser & mobile audio notifications.
- Physics-based Help Gravity ranking prioritizing life-critical requests.
- Privacy-first location fuzzing (exact addresses never exposed publicly).
- One-tap volunteer response with two-way verification OTP handshake.
`
  },
  {
    title: 'Emergency Blood Donation',
    url: `${SITE_URL}/help/blood-donation`,
    desc: 'Critical blood donor matching with hospital dispatch across Asansol, Durgapur, and Raniganj.',
    content: `
# Emergency Blood Donation Support
Connects patients and family members at hospitals such as Asansol Sub-Divisional Hospital, Burnpur Hospital, and Health World Durgapur directly with verified local donors.
- **Priority:** Critical (Gravity boost: 4.0x - 5.0x).
- **Compatible Groups:** O-, O+, A-, A+, B-, B+, AB-, AB+.
- **Safety Standard:** Voluntary non-remunerated donation following NACO (National AIDS Control Organisation) guidelines. Donors must be aged 18-65, weight > 45 kg, with minimum 90-day rest between donations.
`
  },
  {
    title: 'Emergency Transport',
    url: `${SITE_URL}/help/emergency-transport`,
    desc: 'Urgent volunteer transit for clinics, oxygen refills, and disaster evacuations.',
    content: `
# Urgent Community Transport
Volunteers with two-wheelers, four-wheelers, or autorickshaws providing rapid transit for non-ambulance medical emergencies, diagnostic tests, and senior citizen hospital visits.
- **Priority:** High / Critical.
- **Response Radius:** Usually 2 to 8 km.
- **Security Check:** Vehicle numbers verified with in-app volunteer badges.
`
  },
  {
    title: 'Wheelchair & Medical Equipment',
    url: `${SITE_URL}/help/wheelchair-and-equipment`,
    desc: 'Free community loan of walkers, oxygen concentrators, hospital beds, and crutches.',
    content: `
# Medical Equipment Sharing & Community Lending
Neighbors share idle durable medical equipment (wheelchairs, nebulizers, walker frames, crutches, pulse oximeters) with families in temporary need.
- **Cost:** Free of charge community lending.
- **Condition Tagging:** Sanitized, inspected, and verified before handover.
- **Return Assurance:** Borrowers agree to safe return protocols upon recovery.
`
  },
  {
    title: 'Elderly Assistance',
    url: `${SITE_URL}/help/elderly-assistance`,
    desc: 'Grocery runs, pension line support, tech guidance, and daily well-being visits for seniors.',
    content: `
# Senior Citizen & Elderly Support
Provides compassionate aid to elderly residents living alone in Asansol and coalfield colonies.
- **Services:** Prescription collection, pension slip verification, digital banking literacy, heavy grocery carrying, and regular friendly check-ins.
- **Volunteer Verification:** Enhanced background check and community endorsement required.
`
  },
  {
    title: 'Books & Study Materials',
    url: `${SITE_URL}/help/books-and-study-material`,
    desc: 'Peer textbook exchanges, competitive exam resources, and school supply distribution.',
    content: `
# Educational Support & Book Lending
Empowers underprivileged students in Asansol, Kalla, and Burnpur by sharing high school textbooks, engineering/medical entrance prep guides (JEE, NEET, WBJEE), and stationery.
- **Philosophy:** Knowledge belongs to everyone; no child drops out for lack of books.
`
  },
  {
    title: 'How KindLink Works',
    url: `${SITE_URL}/how-it-works`,
    desc: '3-step guide to requesting help, matching volunteers, and completing verified tasks safely.',
    content: `
# How KindLink Works: 3 Simple Steps
1. **Request Help:** Submit an urgent or community task with category, description, and approximate locality. No intrusive permissions required.
2. **Physics-Ranked Notification:** The platform calculates the request's Help Gravity score and notifies nearby verified helpers within optimal radius.
3. **Verified Handshake:** When a helper accepts, an in-app secure coordination channel and OTP code activate. Upon completion, both parties rate and vouch for each other.
`
  },
  {
    title: 'Physics Ranking Engine',
    url: `${SITE_URL}/physics`,
    desc: 'Mathematical breakdown of Help Gravity G = (U * S * T) / (D^1.5 * tau^0.5).',
    content: `
# The Physics of KindLink: Help Gravity Engine
Rather than relying on ad spend or chronological feeds, KindLink uses a deterministic physics model:
\`\`\`
Help Gravity (G) = (UrgencyScore * Severity * TrustFactor) / (Distance^1.5 * DecayTime^0.5)
\`\`\`
- **UrgencyScore (U):** 1.0 (Standard) to 5.0 (Life-threatening emergency).
- **Severity (S):** Impact assessment based on request category and vulnerability.
- **TrustFactor (T):** Helper reliability multiplier based on completed verified tasks.
- **Distance (D):** Geodesic distance in kilometers with super-linear damping (1.5 exponent).
- **DecayTime (tau):** Elapsed time since posting; older unresolved requests gain boost.
`
  },
  {
    title: 'Safety & Verification',
    url: `${SITE_URL}/safety-and-verification`,
    desc: '4-tier trust framework, government ID badges, OTP handshakes, and SOS reporting.',
    content: `
# Safety & Verification Framework
1. **Tier 1 - Community Member:** Phone/email authenticated with verified device fingerprint.
2. **Tier 2 - Verified Neighbor:** Community vouching by at least 2 existing verified helpers.
3. **Tier 3 - Certified Hero:** Government identity verification (Aadhaar/Voter ID masked) reviewed by moderation.
4. **Tier 4 - Partner Organization:** Registered NGOs, hospitals, and disaster management volunteers.
- **Panic Protocol:** One-tap SOS trigger instantly alerts regional administrators and local emergency contacts.
`
  },
  {
    title: 'About KindLink',
    url: `${SITE_URL}/about`,
    desc: 'Mission, ethos, community-first values, and why hyperlocal aid saves lives.',
    content: `
# About KindLink
Born out of the industrial and community heart of Asansol, KindLink turns everyday empathy into systematic, responsive action. When emergencies happen, distance is the greatest adversary. By organizing neighbors within 1 to 5 kilometers, KindLink ensures no one suffers alone while waiting for distant assistance.
`
  },
  {
    title: 'Frequently Asked Questions',
    url: `${SITE_URL}/faq`,
    desc: 'Answers to common questions regarding privacy, response time, volunteer screening, and costs.',
    content: `
# Frequently Asked Questions (FAQ)
- **Q: Is KindLink free?**
  A: Yes, 100% free for both requesters and volunteers.
- **Q: How are my personal details protected?**
  A: Exact addresses and phone numbers are never made public. Only approximate neighborhood distance is shown.
- **Q: Who can register as a volunteer?**
  A: Anyone aged 18+ residing in the service region with a valid email or phone number.
- **Q: What happens if someone submits a fake request?**
  A: Strict zero-tolerance policy. Reported accounts are permanently suspended and IP-blocked.
`
  },
  {
    title: 'Contact Support',
    url: `${SITE_URL}/contact`,
    desc: 'Reach community moderators, emergency escalation desks, and campus outreach leads.',
    content: `
# Contact KindLink
- **Community Desk:** help@kindlink.org
- **Emergency Escalation Desk:** emergency@kindlink.org
- **Location:** Asansol, Paschim Bardhaman, West Bengal - 713301, India.
`
  },
  {
    title: 'Privacy Policy',
    url: `${SITE_URL}/privacy`,
    desc: 'Data protection practices, location fuzzing, and zero-monetization user guarantees.',
    content: `
# Privacy Policy
KindLink complies with Indian Digital Personal Data Protection Act (DPDPA). We never sell data, never serve behavioral ads, and encrypt all user communications in transit and at rest.
`
  },
  {
    title: 'Terms of Service',
    url: `${SITE_URL}/terms`,
    desc: 'Community conduct guidelines, good samaritan protections, and acceptable use.',
    content: `
# Terms of Service
KindLink is a peer-to-peer mutual aid coordinator. Volunteers act in good faith under Indian Good Samaritan guidelines. Harassment, commercial solicitation, and fraud result in immediate termination.
`
  }
];

export function generateLlmsFiles() {
  const publicDir = path.resolve('public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  // 1. Generate /public/llms.txt
  let llmsTxt = `# KindLink

> KindLink is a verified, physics-inspired community mutual aid platform operating in Asansol, West Bengal and neighboring districts. It provides instant emergency blood alerts, mobility equipment sharing, elderly companionship, and hyperlocal disaster support. Help requests are ranked mathematically by a "Help Gravity" scoring engine and protected by multi-tier trust verifications.

## Core Platform & Navigation
`;

  pages.filter(p => !p.url.includes('/help/')).forEach(p => {
    llmsTxt += `- [${p.title}](${p.url}): ${p.desc}\n`;
  });

  llmsTxt += `\n## Help Categories\n`;
  pages.filter(p => p.url.includes('/help/')).forEach(p => {
    llmsTxt += `- [${p.title}](${p.url}): ${p.desc}\n`;
  });

  llmsTxt += `\n## Technical & AI Endpoints
- [Sitemap](${SITE_URL}/sitemap.xml): Machine-readable XML sitemap indexing all public URLs.
- [Robots Policy](${SITE_URL}/robots.txt): Crawler rules permitting search engines and modern AI crawlers.
- [Full LLM Knowledge Base](${SITE_URL}/llms-full.txt): Comprehensive plain markdown knowledge base of all public pages for LLM ingestion.
`;

  const llmsTxtPath = path.join(publicDir, 'llms.txt');
  fs.writeFileSync(llmsTxtPath, llmsTxt.trim() + '\n', 'utf8');
  console.log(`Generated ${llmsTxtPath} (${Buffer.byteLength(llmsTxt)} bytes)`);

  // 2. Generate /public/llms-full.txt
  let llmsFullTxt = `# KindLink — Full Knowledge Base & Public Documentation
**Canonical Base URL:** ${SITE_URL}
**Platform:** KindLink Hyperlocal Mutual Aid Network
**Region:** Asansol, Durgapur, Raniganj, Paschim Bardhaman, West Bengal, India
**Last Updated:** ${new Date().toISOString()}

---

`;

  pages.forEach(p => {
    llmsFullTxt += `\n---\n\n## Page: ${p.title}\n**URL:** ${p.url}\n**Summary:** ${p.desc}\n\n${p.content.trim()}\n`;
  });

  const llmsFullTxtPath = path.join(publicDir, 'llms-full.txt');
  fs.writeFileSync(llmsFullTxtPath, llmsFullTxt.trim() + '\n', 'utf8');
  console.log(`Generated ${llmsFullTxtPath} (${Buffer.byteLength(llmsFullTxt)} bytes)`);
}

generateLlmsFiles();
