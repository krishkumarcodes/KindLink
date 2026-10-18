import { HelpRequest, HelpCategory } from '@/lib/data/types';
import { getCategoryToken } from '@/lib/data/categoryColors';
import { formatWaitingDuration } from '@/lib/utils/formatTime';
import { generateQrMatrix } from '@/lib/utils/qrcode';

export type StoryCardFormat = 'story' | 'square';

export interface StoryCardOptions {
  format: StoryCardFormat; // 'story' (1080x1920) or 'square' (1080x1080)
  request: HelpRequest;
  siteUrl?: string;
}

/**
 * Helper to wrap text into multiple lines on HTML5 Canvas
 */
function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number = 3
): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let currentLine = '';

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const testWidth = ctx.measureText(testLine).width;

    if (testWidth <= maxWidth) {
      currentLine = testLine;
    } else {
      if (lines.length + 1 >= maxLines) {
        // Last line: truncate with ellipsis
        let truncated = currentLine ? `${currentLine} ${word}` : word;
        while (truncated.length > 0 && ctx.measureText(`${truncated}…`).width > maxWidth) {
          truncated = truncated.slice(0, -1);
        }
        lines.push(`${truncated}…`);
        currentLine = '';
        break;
      }
      lines.push(currentLine);
      currentLine = word;
    }
  }

  if (currentLine && lines.length < maxLines) {
    lines.push(currentLine);
  }

  return lines;
}

/**
 * Draws a scannable QR Code on the canvas with optional quiet zone and rounded container
 */
function drawQrCode(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  size: number
) {
  const qr = generateQrMatrix(text, 'M');
  const matrixSize = qr.size;

  // Background white box with rounded corners
  const padding = 14;
  ctx.save();
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.roundRect(x, y, size, size, 20);
  ctx.fill();

  // Draw modules inside padding
  const innerSize = size - padding * 2;
  const moduleSize = innerSize / matrixSize;

  ctx.fillStyle = '#0F172A'; // Deep Slate for max contrast

  for (let r = 0; r < matrixSize; r++) {
    for (let c = 0; c < matrixSize; c++) {
      if (qr.modules[r][c]) {
        const mx = x + padding + c * moduleSize;
        const my = y + padding + r * moduleSize;
        // Use crisp integer or sub-pixel rendering with tiny overlap to eliminate gaps
        ctx.fillRect(mx, my, moduleSize + 0.35, moduleSize + 0.35);
      }
    }
  }
  ctx.restore();
}

/**
 * Generates an HTML5 Canvas image blob for a request story card.
 * Supports:
 *  - 'story': 1080 x 1920 (9:16 vertical for Instagram Stories / WhatsApp Status)
 *  - 'square': 1080 x 1080 (1:1 for WhatsApp chat / Instagram feed / Twitter)
 */
export async function generateStoryCardBlob(options: StoryCardOptions): Promise<Blob | null> {
  const { format, request } = options;
  const isStory = format === 'story';
  const width = 1080;
  const height = isStory ? 1920 : 1080;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // Read site URL with fallbacks
  const siteUrl = (
    options.siteUrl ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    'https://kindlink-gd8e.onrender.com'
  ).replace(/\/$/, '');

  const requestUrl = `${siteUrl}/requests?id=${encodeURIComponent(request.id)}`;

  // Category and Urgency Colors
  const categoryToken = getCategoryToken(request.category);
  const primaryColor = categoryToken.primary; // e.g. #C62828 for blood, #0F766E for medical
  const isCritical = request.urgency === 'critical';
  const urgencyLabel = isCritical
    ? 'CRITICAL EMERGENCY'
    : request.urgency === 'high'
    ? 'URGENT NEED'
    : 'COMMUNITY REQUEST';

  // 1. Deep Midnight Background
  const bgGrad = ctx.createLinearGradient(0, 0, width, height);
  bgGrad.addColorStop(0, '#090D16'); // Midnight slate
  bgGrad.addColorStop(0.5, '#0B132B'); // Deep twilight
  bgGrad.addColorStop(1, '#050811'); // Pitch dark
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // 2. High-contrast ambient glow based on category theme
  ctx.save();
  const glowTop = ctx.createRadialGradient(width / 2, 0, 50, width / 2, 0, width * 0.9);
  glowTop.addColorStop(0, primaryColor + '55'); // 33% opacity
  glowTop.addColorStop(0.6, primaryColor + '15');
  glowTop.addColorStop(1, 'transparent');
  ctx.fillStyle = glowTop;
  ctx.fillRect(0, 0, width, height);

  const glowBottom = ctx.createRadialGradient(width - 100, height - 100, 30, width - 100, height - 100, 600);
  glowBottom.addColorStop(0, primaryColor + '30');
  glowBottom.addColorStop(1, 'transparent');
  ctx.fillStyle = glowBottom;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();

  // 3. Top Accent Beacon Bar (Animated pulse aesthetic)
  ctx.save();
  const accentGrad = ctx.createLinearGradient(0, 0, width, 0);
  accentGrad.addColorStop(0, '#FFFFFF');
  accentGrad.addColorStop(0.2, primaryColor);
  accentGrad.addColorStop(0.8, primaryColor);
  accentGrad.addColorStop(1, '#2DD4BF');
  ctx.fillStyle = accentGrad;
  ctx.fillRect(0, 0, width, 14);
  ctx.restore();

  // Layout Boundaries
  const marginX = 64;
  const contentWidth = width - marginX * 2;

  // 4. Header Bar: KindLink Logo Pill + Live Broadcast Tag
  const headerY = isStory ? 84 : 56;

  // Logo Pill
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(marginX, headerY, 60, 60, 18);
  ctx.fillStyle = primaryColor;
  ctx.fill();
  ctx.shadowColor = primaryColor;
  ctx.shadowBlur = 20;

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 28px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('KL', marginX + 30, headerY + 31);
  ctx.restore();

  // Logo Text
  ctx.save();
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 36px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText('KindLink', marginX + 80, headerY + 20);

  ctx.font = '600 18px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = '#94A3B8';
  ctx.fillText('Hyperlocal Mutual Aid Network', marginX + 80, headerY + 48);
  ctx.restore();

  // Live Emergency Pill on Right
  ctx.save();
  const liveTagW = 210;
  const liveTagH = 46;
  const liveTagX = width - marginX - liveTagW;
  const liveTagY = headerY + 8;

  ctx.beginPath();
  ctx.roundRect(liveTagX, liveTagY, liveTagW, liveTagH, 23);
  ctx.fillStyle = 'rgba(239, 68, 68, 0.15)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(239, 68, 68, 0.4)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Pulsing Dot
  ctx.beginPath();
  ctx.arc(liveTagX + 24, liveTagY + 23, 7, 0, Math.PI * 2);
  ctx.fillStyle = '#EF4444';
  ctx.fill();

  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 15px ui-monospace, SFMono-Regular, Menlo, monospace';
  ctx.fillStyle = '#FCA5A5';
  ctx.fillText('LIVE EMERGENCY', liveTagX + 42, liveTagY + 23);
  ctx.restore();

  // 5. Category & Urgency Badges Row
  const badgesY = isStory ? headerY + 110 : headerY + 95;

  ctx.save();
  // Urgency Badge
  const urgencyText = urgencyLabel;
  ctx.font = '900 16px -apple-system, BlinkMacSystemFont, sans-serif';
  const urgencyTextW = ctx.measureText(urgencyText).width;
  const urgencyPillW = urgencyTextW + 36;
  const urgencyPillH = 44;

  ctx.beginPath();
  ctx.roundRect(marginX, badgesY, urgencyPillW, urgencyPillH, 22);
  ctx.fillStyle = isCritical ? 'rgba(220, 38, 38, 0.95)' : 'rgba(245, 158, 11, 0.95)';
  ctx.fill();

  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(urgencyText, marginX + urgencyPillW / 2, badgesY + urgencyPillH / 2);

  // Category Badge
  const catText = categoryToken.name.toUpperCase();
  const catTextW = ctx.measureText(catText).width;
  const catPillW = catTextW + 36;
  const catPillX = marginX + urgencyPillW + 16;

  ctx.beginPath();
  ctx.roundRect(catPillX, badgesY, catPillW, urgencyPillH, 22);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = '#F8FAFC';
  ctx.fillText(catText, catPillX + catPillW / 2, badgesY + urgencyPillH / 2);
  ctx.restore();

  // 6. Request Title (Big, bold, high-contrast)
  const titleY = badgesY + 80;
  ctx.save();
  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.font = isStory
    ? 'bold 54px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    : 'bold 44px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

  const titleLines = wrapText(ctx, request.title, contentWidth, isStory ? 3 : 2);
  const titleLineHeight = isStory ? 66 : 54;
  titleLines.forEach((line, idx) => {
    ctx.fillText(line, marginX, titleY + idx * titleLineHeight);
  });
  ctx.restore();

  const titleBottomY = titleY + titleLines.length * titleLineHeight;

  // 7. Request Description (Story has room for description excerpt)
  let nextSectionY = titleBottomY + 24;
  if (isStory && request.description) {
    ctx.save();
    ctx.font = '400 24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#CBD5E1';
    const descLines = wrapText(ctx, request.description, contentWidth, 2);
    descLines.forEach((dLine, idx) => {
      ctx.fillText(dLine, marginX, nextSectionY + idx * 34);
    });
    nextSectionY += descLines.length * 34 + 32;
    ctx.restore();
  } else {
    nextSectionY += 16;
  }

  // 8. Three Clean Fact Cards
  // Format specific layout:
  // - Story (9:16): 3 stacked large cards
  // - Square (1:1): 3 side-by-side or 3 compact cards
  const waitingText = formatWaitingDuration(request.waitingMinutes, request.createdAt);

  // Derive Fact Values based on Category
  let fact1Label = 'LOCATION / HOSPITAL';
  let fact1Value = request.hospitalName || request.locationName || 'Local Community Center';
  let fact1Sub = `${request.distanceKm ? request.distanceKm + ' km away' : 'Near you'} • Asansol Zone`;

  let fact2Label = 'REQUIREMENT';
  let fact2Value = 'Urgent Aid Needed';
  let fact2Sub = request.neededByTime || 'Immediate response needed';

  if (request.category === 'blood') {
    fact1Label = 'HOSPITAL / BLOOD BANK';
    fact1Value = request.hospitalName || request.locationName;
    fact2Label = 'BLOOD GROUP & UNITS';
    fact2Value = `${request.bloodGroup || 'Any'} (${request.unitsNeeded || 1} Units Needed)`;
    fact2Sub = request.neededByTime ? `Needed by: ${request.neededByTime}` : 'Urgent Donor Required';
  } else if (request.category === 'equipment') {
    fact2Label = 'MEDICAL GEAR';
    fact2Value = request.itemType || 'Medical Equipment';
    fact2Sub = request.itemDuration ? `Duration: ${request.itemDuration}` : 'Temporary Loan or Donation';
  } else if (request.category === 'elderly') {
    fact2Label = 'ELDERLY SUPPORT';
    fact2Value = request.elderlyAidType || 'Companion Aid';
    fact2Sub = request.scheduledTime ? `Time: ${request.scheduledTime}` : 'Volunteer Support Needed';
  } else if (request.category === 'books') {
    fact2Label = 'STUDY MATERIALS';
    fact2Value = request.bookTitle || request.booksClassSubject || 'Books & Notes';
    fact2Sub = request.bookCondition || 'Educational Resource Sharing';
  } else if (request.category === 'transport') {
    fact2Label = 'EMERGENCY TRANSIT';
    fact2Value = `${request.passengerCount || 1} Passenger(s)${request.wheelchairAccessible ? ' • Wheelchair' : ''}`;
    fact2Sub = request.pickupAddress ? `From: ${request.pickupAddress}` : 'Medical Route';
  }

  const fact3Label = 'PATIENT & TIMING';
  const fact3Value = request.patientAge ? `Patient: ${request.patientAge} Years Old` : 'Verified Need';
  const fact3Sub = `Waiting time: ${waitingText} • ${request.verificationBadge || 'Community Verified'}`;

  const facts = [
    { label: fact1Label, value: fact1Value, sub: fact1Sub, icon: '📍' },
    { label: fact2Label, value: fact2Value, sub: fact2Sub, icon: '⚡' },
    { label: fact3Label, value: fact3Value, sub: fact3Sub, icon: '⏱️' },
  ];

  if (isStory) {
    // 3 Stacked Cards for 9:16 vertical
    const cardH = 150;
    const cardGap = 20;

    facts.forEach((fact, i) => {
      const cy = nextSectionY + i * (cardH + cardGap);

      ctx.save();
      ctx.beginPath();
      ctx.roundRect(marginX, cy, contentWidth, cardH, 24);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Left Accent Pillar
      ctx.beginPath();
      ctx.roundRect(marginX + 8, cy + 16, 6, cardH - 32, 3);
      ctx.fillStyle = primaryColor;
      ctx.fill();

      // Icon & Label
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.font = 'bold 16px ui-monospace, SFMono-Regular, Menlo, monospace';
      ctx.fillStyle = '#94A3B8';
      ctx.fillText(`${fact.icon}  ${fact.label}`, marginX + 32, cy + 22);

      // Main Fact Value (Truncate if too long)
      ctx.font = 'bold 28px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillStyle = '#FFFFFF';
      let valText = fact.value;
      while (valText.length > 0 && ctx.measureText(valText).width > contentWidth - 64) {
        valText = valText.slice(0, -1);
      }
      if (valText !== fact.value) valText += '…';
      ctx.fillText(valText, marginX + 32, cy + 56);

      // Subtitle
      ctx.font = '500 18px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillStyle = '#38BDF8';
      ctx.fillText(fact.sub, marginX + 32, cy + 102);

      ctx.restore();
    });

    nextSectionY += 3 * (cardH + cardGap) + 30;
  } else {
    // Square 1:1 Layout: 3 Side-by-Side Compact Cards
    const cardW = Math.floor((contentWidth - 2 * 16) / 3);
    const cardH = 145;

    facts.forEach((fact, i) => {
      const cx = marginX + i * (cardW + 16);
      const cy = nextSectionY;

      ctx.save();
      ctx.beginPath();
      ctx.roundRect(cx, cy, cardW, cardH, 20);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Top colored bar
      ctx.beginPath();
      ctx.roundRect(cx + 14, cy + 12, cardW - 28, 4, 2);
      ctx.fillStyle = i === 1 ? primaryColor : 'rgba(255, 255, 255, 0.2)';
      ctx.fill();

      // Label
      ctx.font = 'bold 12px ui-monospace, SFMono-Regular, Menlo, monospace';
      ctx.fillStyle = '#94A3B8';
      ctx.textAlign = 'left';
      ctx.fillText(fact.label, cx + 16, cy + 30);

      // Value
      ctx.font = 'bold 18px -apple-system, BlinkMacSystemFont, sans-serif';
      ctx.fillStyle = '#FFFFFF';
      let valText = fact.value;
      while (valText.length > 0 && ctx.measureText(valText).width > cardW - 32) {
        valText = valText.slice(0, -1);
      }
      if (valText !== fact.value) valText += '…';
      ctx.fillText(valText, cx + 16, cy + 64);

      // Sub
      ctx.font = '500 13px -apple-system, BlinkMacSystemFont, sans-serif';
      ctx.fillStyle = '#38BDF8';
      let subText = fact.sub;
      while (subText.length > 0 && ctx.measureText(subText).width > cardW - 32) {
        subText = subText.slice(0, -1);
      }
      if (subText !== fact.sub) subText += '…';
      ctx.fillText(subText, cx + 16, cy + 104);

      ctx.restore();
    });

    nextSectionY += cardH + 24;
  }

  // 9. QR Code & Call To Action Banner
  if (isStory) {
    // Story QR Section at bottom
    const qrBoxH = 260;
    const qrBoxY = height - 280;

    ctx.save();
    ctx.beginPath();
    ctx.roundRect(marginX, qrBoxY, contentWidth, qrBoxH, 28);
    ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Draw QR Code
    const qrSize = 200;
    const qrX = marginX + 30;
    const qrY = qrBoxY + 30;
    drawQrCode(ctx, requestUrl, qrX, qrY, qrSize);

    // Call to Action Text beside QR Code
    const ctaX = qrX + qrSize + 36;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    ctx.font = '900 32px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText('SCAN TO HELP NOW', ctaX, qrBoxY + 44);

    ctx.font = '500 20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#CBD5E1';
    ctx.fillText('Point your phone camera to open', ctaX, qrBoxY + 92);
    ctx.fillText('live request & volunteer directly.', ctaX, qrBoxY + 122);

    ctx.font = '700 18px ui-monospace, monospace';
    ctx.fillStyle = '#2DD4BF';
    ctx.fillText(siteUrl.replace(/^https?:\/\//, ''), ctaX, qrBoxY + 172);

    ctx.restore();

    // Friendly Bottom Footer
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '600 17px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#64748B';
    ctx.fillText(
      'Scan QR code to help or visit kindlink.app • Hyperlocal Mutual Aid',
      width / 2,
      height - 40
    );
    ctx.restore();
  } else {
    // Square QR Section
    const qrBoxH = 175;
    const qrBoxY = height - 200;

    ctx.save();
    ctx.beginPath();
    ctx.roundRect(marginX, qrBoxY, contentWidth, qrBoxH, 24);
    ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Draw QR Code
    const qrSize = 135;
    const qrX = marginX + 20;
    const qrY = qrBoxY + 20;
    drawQrCode(ctx, requestUrl, qrX, qrY, qrSize);

    // Call to Action
    const ctaX = qrX + qrSize + 28;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    ctx.font = '900 24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText('SCAN QR CODE TO OFFER AID', ctaX, qrBoxY + 28);

    ctx.font = '500 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#94A3B8';
    ctx.fillText('Instant volunteer coordination • 100% Free Mutual Aid', ctaX, qrBoxY + 68);

    ctx.font = '700 16px ui-monospace, monospace';
    ctx.fillStyle = '#2DD4BF';
    ctx.fillText(siteUrl.replace(/^https?:\/\//, ''), ctaX, qrBoxY + 104);

    ctx.restore();

    // Footer
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '600 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#64748B';
    ctx.fillText(
      'Scan QR code to help or visit kindlink.app • Hyperlocal Mutual Aid',
      width / 2,
      height - 30
    );
    ctx.restore();
  }

  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      resolve(blob);
    }, 'image/png');
  });
}
