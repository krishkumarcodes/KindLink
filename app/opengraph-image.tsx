import { ImageResponse } from 'next/og';

export const runtime = 'nodejs';
export const alt = 'KindLink - Help is just next door';
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
          backgroundColor: '#090d16',
          backgroundImage:
            'radial-gradient(circle at 25px 25px, #1e293b 2%, transparent 0%), radial-gradient(circle at 75px 75px, #0f172a 2%, transparent 0%)',
          backgroundSize: '100px 100px',
          padding: '60px 80px',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '16px',
              backgroundColor: '#0d9488',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg
              width="36"
              height="36"
              viewBox="0 0 24 24"
              fill="white"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
            </svg>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span
              style={{
                fontSize: '36px',
                fontWeight: 'bold',
                color: 'white',
                letterSpacing: '-0.02em',
              }}
            >
              Kind<span style={{ color: '#14b8a6' }}>Link</span>
            </span>
            <span
              style={{
                fontSize: '16px',
                color: '#94a3b8',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
              }}
            >
              Asansol & Neighboring Districts
            </span>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
            maxWidth: '1000px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignSelf: 'flex-start',
              alignItems: 'center',
              padding: '6px 16px',
              borderRadius: '9999px',
              backgroundColor: 'rgba(20, 184, 166, 0.15)',
              border: '1px solid rgba(20, 184, 166, 0.3)',
              color: '#2dd4bf',
              fontSize: '18px',
              fontWeight: 600,
            }}
          >
            Hyperlocal Verified Community Mutual Aid
          </div>
          <h1
            style={{
              fontSize: '64px',
              fontWeight: 800,
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
              fontSize: '26px',
              color: '#cbd5e1',
              lineHeight: 1.4,
              margin: 0,
            }}
          >
            Ranked by physics, driven by trust. Instant emergency blood alerts,
            mobility aid, and neighborly assistance.
          </p>
        </div>

        <div
          style={{
            display: 'flex',
            width: '100%',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderTop: '1px solid #1e293b',
            paddingTop: '24px',
          }}
        >
          <div style={{ display: 'flex', gap: '32px' }}>
            <span style={{ fontSize: '18px', color: '#94a3b8' }}>
              ⚡ Real-time SOS Dispatch
            </span>
            <span style={{ fontSize: '18px', color: '#94a3b8' }}>
              🛡️ Verified Volunteers
            </span>
            <span style={{ fontSize: '18px', color: '#94a3b8' }}>
              📍 1-15 km Radius
            </span>
          </div>
          <span
            style={{
              fontSize: '18px',
              fontWeight: 600,
              color: '#14b8a6',
            }}
          >
            kindlink.onrender.com
          </span>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
