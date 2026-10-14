import fs from 'fs';
import path from 'path';

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://kindlink.onrender.com').replace(/\/$/, '');
const host = new URL(SITE_URL).hostname;

const urlList = [
  `${SITE_URL}/`,
  `${SITE_URL}/help/blood-donation`,
  `${SITE_URL}/help/emergency-transport`,
  `${SITE_URL}/help/wheelchair-and-equipment`,
  `${SITE_URL}/help/elderly-assistance`,
  `${SITE_URL}/help/books-and-study-material`,
  `${SITE_URL}/how-it-works`,
  `${SITE_URL}/safety-and-verification`,
  `${SITE_URL}/about`,
  `${SITE_URL}/faq`,
  `${SITE_URL}/contact`,
  `${SITE_URL}/privacy`,
  `${SITE_URL}/terms`,
];

async function submitIndexNow() {
  const indexNowKey = process.env.INDEXNOW_KEY;

  console.log('==============================================');
  console.log('   KindLink IndexNow URL Submission Engine    ');
  console.log('==============================================');
  console.log(`Target Host: ${host}`);
  console.log(`Base URL:    ${SITE_URL}`);
  console.log(`URLs Count:  ${urlList.length}`);

  if (!indexNowKey) {
    console.warn('\n⚠️  NOTICE: INDEXNOW_KEY environment variable is not defined.');
    console.log('To activate automatic submission to Bing, Yandex, and Naver:');
    console.log('1. Generate a 32-character hexadecimal key (e.g. 5e91e6b8a8b14a938c645b2061432f41)');
    console.log('2. Add INDEXNOW_KEY=your_key_here to your .env or Render dashboard');
    console.log('3. Re-run: npm run indexnow\n');
    console.log('--- Dry Run Submission Payload ---');
    console.log(JSON.stringify({
      host,
      key: '<INDEXNOW_KEY>',
      keyLocation: `${SITE_URL}/<INDEXNOW_KEY>.txt`,
      urlList,
    }, null, 2));
    console.log('----------------------------------\n');
    return;
  }

  // Ensure key verification file exists in public/
  const keyFilePath = path.resolve('public', `${indexNowKey}.txt`);
  if (!fs.existsSync(keyFilePath)) {
    fs.writeFileSync(keyFilePath, indexNowKey, 'utf8');
    console.log(`Created key verification file: public/${indexNowKey}.txt`);
  }

  const payload = {
    host,
    key: indexNowKey,
    keyLocation: `${SITE_URL}/${indexNowKey}.txt`,
    urlList,
  };

  const endpoints = [
    'https://api.indexnow.org/indexnow',
    'https://www.bing.com/indexnow',
  ];

  for (const endpoint of endpoints) {
    console.log(`\nSubmitting ${urlList.length} URLs to ${endpoint}...`);
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
        },
        body: JSON.stringify(payload),
      });

      if (response.status === 200 || response.status === 202) {
        console.log(`✅ Success (${response.status} ${response.statusText}) from ${endpoint}`);
      } else {
        const text = await response.text();
        console.warn(`⚠️ HTTP ${response.status} from ${endpoint}: ${text}`);
      }
    } catch (err) {
      console.error(`❌ Network error submitting to ${endpoint}:`, err.message);
    }
  }

  console.log('\nIndexNow submission routine completed.\n');
}

submitIndexNow().catch((err) => {
  console.error('Fatal IndexNow error:', err);
  process.exit(1);
});
