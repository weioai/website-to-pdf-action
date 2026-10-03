import dns from 'node:dns/promises';
import net from 'node:net';
import { chromium } from 'playwright';

const target = process.env.TARGET_URL;
if (!target) throw new Error('TARGET_URL is required');

function publicAddress(address) {
  if (net.isIP(address) === 4) {
    const [a, b] = address.split('.').map(Number);
    return !(a === 10 || a === 127 || a === 0 || a === 169 && b === 254 ||
      a === 172 && b >= 16 && b <= 31 || a === 192 && b === 168 ||
      a >= 224);
  }
  const value = address.toLowerCase();
  return value !== '::1' && !value.startsWith('fc') && !value.startsWith('fd') &&
    !value.startsWith('fe80:');
}

async function validate(raw) {
  const url = new URL(raw);
  if (!['http:', 'https:'].includes(url.protocol) || !url.hostname) {
    throw new Error('Only absolute http(s) URLs are allowed');
  }
  if (net.isIP(url.hostname)) {
    if (!publicAddress(url.hostname)) throw new Error('Private IP addresses are not allowed');
  } else {
    const records = await dns.lookup(url.hostname, { all: true });
    if (!records.length || records.some(({ address }) => !publicAddress(address))) {
      throw new Error('Host must resolve only to public addresses');
    }
  }
  return url.toString();
}

await validate(target);
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.route('**/*', async route => {
    try { await validate(route.request().url()); await route.continue(); }
    catch { await route.abort(); }
  });
  await page.goto(target, { waitUntil: 'networkidle', timeout: 45_000 });
  await page.emulateMedia({ media: 'screen' });
  await page.pdf({ path: 'website.pdf', format: 'A4', printBackground: true });
  console.log('Created website.pdf');
} finally {
  await browser.close();
}
