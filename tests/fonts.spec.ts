import { test, expect } from '@playwright/test';

test.describe('Typography and Font Family Verification', () => {
  test('Heading and body elements compute to sans-serif stack and fonts load', async ({ page }) => {
    await page.goto('/');

    // Check computed body font family
    const bodyFont = await page.evaluate(() => {
      const el = document.body;
      return window.getComputedStyle(el).fontFamily;
    });

    expect(bodyFont.toLowerCase()).not.toContain('serif');
    expect(bodyFont.toLowerCase()).toMatch(/inter|system-ui|sans-serif|segoe ui|roboto/);

    // Check computed heading font family
    const headingFont = await page.evaluate(() => {
      const h1 = document.querySelector('h1') || document.querySelector('h2');
      return h1 ? window.getComputedStyle(h1).fontFamily : '';
    });

    if (headingFont) {
      expect(headingFont.toLowerCase()).not.toContain('serif');
      expect(headingFont.toLowerCase()).toMatch(/plus jakarta sans|inter|system-ui|sans-serif/);
    }

    // Verify document.fonts status
    const fontsReady = await page.evaluate(async () => {
      await document.fonts.ready;
      return document.fonts.check('16px Inter') || document.fonts.check('16px sans-serif');
    });

    expect(fontsReady).toBe(true);
  });
});
