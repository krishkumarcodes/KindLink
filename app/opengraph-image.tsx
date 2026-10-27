import { ImageResponse } from 'next/og';

export const runtime = 'nodejs';
export const alt = 'KindLink - Hyperlocal Mutual Aid & Crisis Network';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          backgroundColor: '#080d1a',
          backgroundImage:
            'radial-gradient(circle at 100px 100px, rgba(13, 148, 136, 0.18) 0%, transparent 60%), radial-gradient(circle at 1100px 500px, rgba(37, 99, 235, 0.16) 0%, transparent 55%)',
          padding: '52px 64px',
          fontFamily: 'sans-serif',
          position: 'relative',
        }}
      >
        {/* Top Glowing Brand Bar */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '6px',
            backgroundImage:
              'linear-gradient(to right, #0D9488, #06B6D4, #3B82F6, #6366F1)',
          }}
        />

        {/* Brand Header */}
        <div
          style={{
            display: 'flex',
            width: '100%',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            {/* KindLink Official Rebranded Emblem */}
            <div
              style={{
                width: '68px',
                height: '68px',
                borderRadius: '20px',
                backgroundImage:
                  'linear-gradient(135deg, #0F766E 0%, #0D9488 30%, #06B6D4 65%, #2563EB 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 8px 24px rgba(13, 148, 136, 0.35)',
                border: '1px solid rgba(255, 255, 255, 0.3)',
              }}
            >
              <svg
                width="44"
                height="44"
                viewBox="0 0 48 48"
                fill="none"
              >
                <circle
                  cx="24"
                  cy="24"
                  r="18"
                  stroke="white"
                  strokeOpacity="0.2"
                  strokeWidth="1.5"
                  strokeDasharray="4 3"
                />
                {/* Mobius Interlocking Heart-Link */}
                <path
                  d="M 16.5 18.5 C 11 13 6.5 19.5 6.5 25.5 C 6.5 31.5 14 37 24 41 C 34 37 41.5 31.5 41.5 25.5 C 41.5 19.5 37 13 31.5 18.5 C 28 22 24 26.5 24 26.5 C 24 26.5 20 22 16.5 18.5 Z"
                  fill="white"
                  fillOpacity="0.96"
                />
                <path
                  d="M 18.5 20.5 C 21.5 24.5 24 27.5 24 27.5 C 24 27.5 26.5 24.5 29.5 20.5"
                  stroke="#0D9488"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                {/* Emergency Central Beacon */}
                <circle cx="24" cy="23.5" r="4.5" fill="#EF4444" />
                <circle cx="24" cy="23.5" r="2" fill="white" />
              </svg>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span
                style={{
                  fontSize: '40px',
                  fontWeight: 900,
                  color: 'white',
                  letterSpacing: '-0.03em',
                  lineHeight: 1,
                }}
              >
                Kind<span style={{ color: '#14b8a6' }}>Link</span>
              </span>
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 700,
                  color: '#94a3b8',
                  textTransform: 'uppercase',
                  letterSpacing: '0.18em',
                  marginTop: '4px',
                }}
              >
                MUTUAL AID · CRISIS RADAR
              </span>
            </div>
          </div>

          {/* Status Indicator Pill */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '8px 20px',
              borderRadius: '9999px',
              backgroundColor: 'rgba(19, 78, 74, 0.45)',
              border: '1px solid rgba(13, 148, 136, 0.4)',
            }}
          >
            <div
              style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                backgroundColor: '#14b8a6',
                boxShadow: '0 0 10px #14b8a6',
              }}
            />
            <span
              style={{
                fontSize: '13px',
                fontWeight: 700,
                color: '#2dd4bf',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
              }}
            >
              LIVE ASANSOL NETWORK
            </span>
          </div>
        </div>

        {/* Hero Section */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            maxWidth: '1050px',
            marginTop: '8px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignSelf: 'flex-start',
              alignItems: 'center',
              padding: '5px 16px',
              borderRadius: '9999px',
              backgroundColor: 'rgba(13, 148, 136, 0.15)',
              border: '1px solid rgba(20, 184, 166, 0.35)',
              color: '#2dd4bf',
              fontSize: '14px',
              fontWeight: 700,
              letterSpacing: '0.04em',
            }}
          >
            ⚡ HYPERLOCAL CRISIS RESPONSE
          </div>

          <h1
            style={{
              fontSize: '54px',
              fontWeight: 900,
              color: 'white',
              lineHeight: 1.1,
              letterSpacing: '-0.03em',
              margin: 0,
            }}
          >
            Help is just next door.
          </h1>

          <p
            style={{
              fontSize: '21px',
              color: '#cbd5e1',
              lineHeight: 1.45,
              margin: 0,
              maxWidth: '980px',
            }}
          >
            Verified community mutual aid &amp; emergency response network for urgent local tasks in Asansol and neighboring areas. Connect with trusted neighbours for blood donation, medical help, and urgent local support.
          </p>
        </div>

        {/* 4 Feature Overview Cards */}
        <div
          style={{
            display: 'flex',
            width: '100%',
            gap: '16px',
            marginTop: '8px',
          }}
        >
          {/* Card 1 */}
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              backgroundColor: 'rgba(17, 24, 39, 0.85)',
              borderRadius: '16px',
              border: '1px solid #1e293b',
              padding: '16px',
              borderTop: '3px solid #0d9488',
            }}
          >
            <span style={{ fontSize: '15px', fontWeight: 700, color: 'white' }}>
              🛡️ Verified Aid
            </span>
            <span style={{ fontSize: '13px', color: '#94a3b8', marginTop: '4px' }}>
              Identity-checked community volunteers
            </span>
          </div>

          {/* Card 2 */}
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              backgroundColor: 'rgba(17, 24, 39, 0.85)',
              borderRadius: '16px',
              border: '1px solid #1e293b',
              padding: '16px',
              borderTop: '3px solid #ef4444',
            }}
          >
            <span style={{ fontSize: '15px', fontWeight: 700, color: 'white' }}>
              🚨 Emergency SOS
            </span>
            <span style={{ fontSize: '13px', color: '#94a3b8', marginTop: '4px' }}>
              Rapid blood &amp; critical medical dispatch
            </span>
          </div>

          {/* Card 3 */}
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              backgroundColor: 'rgba(17, 24, 39, 0.85)',
              borderRadius: '16px',
              border: '1px solid #1e293b',
              padding: '16px',
              borderTop: '3px solid #06b6d4',
            }}
          >
            <span style={{ fontSize: '15px', fontWeight: 700, color: 'white' }}>
              ⚡ Fast Dispatch
            </span>
            <span style={{ fontSize: '13px', color: '#94a3b8', marginTop: '4px' }}>
              Urgency-driven local response routing
            </span>
          </div>

          {/* Card 4 */}
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              backgroundColor: 'rgba(17, 24, 39, 0.85)',
              borderRadius: '16px',
              border: '1px solid #1e293b',
              padding: '16px',
              borderTop: '3px solid #3b82f6',
            }}
          >
            <span style={{ fontSize: '15px', fontWeight: 700, color: 'white' }}>
              📍 1–15 km Radius
            </span>
            <span style={{ fontSize: '13px', color: '#94a3b8', marginTop: '4px' }}>
              Neighbourhood-first local proximity
            </span>
          </div>
        </div>

        {/* Footer Bar */}
        <div
          style={{
            display: 'flex',
            width: '100%',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderTop: '1px solid #1e293b',
            paddingTop: '16px',
          }}
        >
          <span style={{ fontSize: '15px', color: '#64748b', fontWeight: 600 }}>
            🛡️ 100% Free · Community-driven Mutual Aid &amp; Crisis Response
          </span>
          <span
            style={{
              fontSize: '16px',
              fontWeight: 700,
              color: '#14b8a6',
            }}
          >
            kindlink-gd8e.onrender.com
          </span>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
