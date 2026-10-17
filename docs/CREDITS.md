# KindLink Credits & Attributions

KindLink is built with open-source design assets, typography, iconography, and illustration systems. We gratefully acknowledge the creators and contributors of the following works.

---

## 1. Typography & Fonts

| Font Family | Author / Foundry | License | Usage in KindLink |
| :--- | :--- | :--- | :--- |
| **Inter** | Rasmus Andersson | [SIL Open Font License (OFL) 1.1](https://openfontlicense.org/) | Primary application body UI font, numerical readouts, and accessible typography. |
| **Plus Jakarta Sans** | Gumpita Rahayu, Tokotype | [SIL Open Font License (OFL) 1.1](https://openfontlicense.org/) | Heading and display typeface for prominent titles and brand banners. |
| **Noto Sans Devanagari** | Google Fonts | [SIL Open Font License (OFL) 1.1](https://openfontlicense.org/) | Regional script support for Hindi, Bhojpuri, Maithili, and Sanskrit. |
| **Noto Sans Bengali** | Google Fonts | [SIL Open Font License (OFL) 1.1](https://openfontlicense.org/) | Regional script support for Bengali and Assamese mutual aid requests. |
| **Noto Nastaliq Urdu** | Google Fonts | [SIL Open Font License (OFL) 1.1](https://openfontlicense.org/) | Regional script support for Urdu translations in Asansol and neighboring areas. |

---

## 2. Iconography & Symbol Sets

| Icon Set | Creators | License | Usage in KindLink |
| :--- | :--- | :--- | :--- |
| **Lucide Icons** | Lucide Contributors (derived from Feather Icons by Cole Bemis) | [ISC License](https://opensource.org/licenses/ISC) | Primary UI icons across all components, navigation items, stat metrics, emergency indicators, and action triggers. |
| **Phosphor Icons** | Tobias Fried & Helena Zhang | [MIT License](https://opensource.org/licenses/MIT) | Directional and sensory iconography references for transit kinematics and device orientation. |
| **Tabler Icons** | Paweł Kuna | [MIT License](https://opensource.org/licenses/MIT) | Secondary utility symbols and status badges. |

---

## 3. Brand Palette & Visual Tokens

The KindLink visual identity is designed with accessible contrast ratios (WCAG AAA for typography and interactive touch targets):

| Color Token | Hex Code | Purpose |
| :--- | :--- | :--- |
| **KindLink Teal** | `#0D9488` / `#0F766E` | Primary brand accent, mutual aid actions, and verified volunteer themes. |
| **KindLink Emerald** | `#10B981` / `#047857` | Success status, verified credentials, trust scores, and completed milestones. |
| **KindLink Crimson** | `#E5484D` / `#BE123C` | Urgent/critical SOS requests, blood donation calls, and emergency triggers. |
| **KindLink Amber** | `#F59E0B` / `#D97706` | Warning status, pending verifications, and medium-urgency tasks. |
| **KindLink Sky** | `#0284C7` / `#06B6D4` | Hyperlocal community orbital lines, distance beacons, and public transit. |

---

## 4. SVG Illustrations & Badges

All custom illustrations located in `public/illustrations/` were created for KindLink under the project's [MIT License](file:///data/data/com.termux/files/home/storage/downloads/KindLink/LICENSE):

| Asset Path | Description | Visual Motif |
| :--- | :--- | :--- |
| `public/illustrations/empty-requests.svg` | Zero active requests empty state | Community clipboard, orbital network circles, floating heart badge. |
| `public/illustrations/empty-history.svg` | Zero completed help history state | Honor shield, handshake glow, golden star, and verified tick. |
| `public/illustrations/empty-contacts.svg` | Zero emergency contacts empty state | SOS beacon, connected contact nodes, phone silhouette, quick-add glyph. |
| `public/illustrations/badge-blood-hero.svg` | Life Saver (Blood Donor) badge | Medical red squircle, golden stars, white blood droplet with first-aid cross. |
| `public/illustrations/badge-first-aid.svg` | Emergency First Responder badge | Amber squircle, star of life, lightning flash, orbital speed rings. |
| `public/illustrations/badge-student-verified.svg` | Verified College Student badge | Teal squircle, academic mortarboard, emerald checkmark seal. |
| `public/illustrations/badge-trusted-neighbor.svg` | Trusted Local Neighbor badge | Emerald squircle, home hearth with heart, trio of golden stars. |
| `public/illustrations/badge-community-pillar.svg` | Community Pillar badge | Sky/Teal squircle, classical architecture triumvirate pillars, laurel star. |
| `public/illustrations/badge-study-mentor.svg` | Study Mentor badge | Violet/Teal squircle, open textbook, glowing inspiration beacon. |

---

## 5. Custom SVG Badge Medal Artwork & Glyphs

All medal artwork and 18 distinct vector glyphs in `components/profile/BadgeMedalIcon.tsx` were designed specifically for KindLink under the project's [MIT License](file:///data/data/com.termux/files/home/storage/downloads/KindLink/LICENSE).

### Metallic Tier Gradients & Finishes
- **Bronze**: Rich copper/bronze metallic gradient (`#B45309` to `#78350F`) with soft warm shine and amber sheen.
- **Silver**: Crisp silver metallic gradient (`#94A3B8` to `#475569`) with cool chrome specular highlight.
- **Gold**: Radiant amber/gold metallic gradient (`#F59E0B` to `#B45309`) with luminous warm sheen.
- **Platinum**: High-end icy platinum gradient (`#38BDF8` to `#6366F1`) with violet/cyan shimmer.
- **Locked**: Flat, muted dark/light grey silhouette with semi-transparent glyph and security lock badge.

### 18 Distinct SVG Glyphs
| Badge Key | Badge Title | Distinct Glyph Artwork Motif |
| :--- | :--- | :--- |
| `life_saver` | Life Saver | Blood droplet with inner heart and specular shine arc. |
| `community_pillar` | Community Pillar | Classical triumvirate columns, pediment entablature, and stepped plinth. |
| `emergency_first_responder` | Emergency First Responder | Siren beacon with emergency Greek cross and radial flash rays. |
| `quick_responder` | Quick Responder | Circular stopwatch with top pusher stem and dynamic electric lightning bolt. |
| `trusted_neighbour` | Trusted Local Neighbour | Home roof gable with chimney, protective shield, and warm heart. |
| `study_mentor` | Study and Books Mentor | Open book pages with floating academic mortarboard cap and tassel. |
| `medical_gear_lender` | Medical Gear Lender | Wheelchair profile, spoked wheel, caster, and medical cross badge. |
| `elder_friend` | Elder Friend | Two caring hands lifting and protecting a radiant heart. |
| `safe_ride_hero` | Safe Ride Hero | Transport vehicle silhouette protected within an outer shield emblem. |
| `helper_streak` | Helper Streak | Blazing multi-tongue flame with hot inner fire core. |
| `first_help` | First Help | Radiant golden 5-point star with facet highlights and sparkle flares. |
| `verified_doctor` | Verified Doctor | Stethoscope binaural tubing looping into a resonator seal with verified checkmark. |
| `verified_student` | Verified Student Member | Academic graduation mortarboard with dangling tassel and verified checkmark seal. |
| `verified_nurse` | Verified Nurse / Paramedic | Emergency Greek cross with medical caduceus / heart emblem. |
| `verified_pharmacist` | Verified Pharmacist | Mortar bowl with angled pestle and verified checkmark seal. |
| `verified_teacher` | Verified Teacher or Mentor | Chalkboard slate frame and writing quill with verified checkmark. |
| `verified_ngo` | Verified Organisation / NGO | Institutional NGO portico building with classical pillars and verified shield. |
| `verified_member` | Verified Member | KindLink curved security shield with verified checkmark. |

---

## 6. Software Libraries & Platform Acknowledgements

- **Next.js & React**: Vercel Inc. (MIT License)
- **Tailwind CSS**: Tailwind Labs Inc. (MIT License)
- **Zustand**: Dai Shi and contributors (MIT License)
- **Leaflet & React-Leaflet**: Vladimir Agafonkin and contributors (BSD-2-Clause)
- **Sonner**: Emil Kowalski (MIT License)
- **Supabase Client**: Supabase Inc. (Apache-2.0)

