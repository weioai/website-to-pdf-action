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
  // Reject mapped IPv4 too: Chromium would otherwise treat ::ffff:127.0.0.1
  // as loopback even though it is written as an IPv6 literal.
  return value !== '::' && value !== '::1' && !value.startsWith('::ffff:') &&
    !value.startsWith('fc') && !value.startsWith('fd') && !/^fe[89ab]/.test(value) &&
    !value.startsWith('ff') && !value.startsWith('2001:db8:');
}

async function validate(raw) {
  const url = new URL(raw);
  // WHATWG retains brackets around IPv6 literals in hostname; remove them
  // before classifying or pinning the address.
  const hostname = url.hostname.replace(/^\[|\]$/g, '');
  if (!['http:', 'https:'].includes(url.protocol) || !hostname ||
      (url.port && !['80', '443'].includes(url.port))) {
    throw new Error('Only absolute http(s) URLs are allowed');
  }
  if (net.isIP(hostname)) {
    if (!publicAddress(hostname)) throw new Error('Private IP addresses are not allowed');
    return { url: url.toString(), hostname, address: hostname };
  } else {
    const records = await dns.lookup(hostname, { all: true });
    if (!records.length || records.some(({ address }) => !publicAddress(address))) {
      throw new Error('Host must resolve only to public addresses');
    }
    // Pin Chromium to the address we just checked.  Re-resolving the hostname
    // later would make this public-action runner vulnerable to DNS rebinding.
    const preferred = records.find(({ address }) => net.isIP(address) === 4) ?? records[0];
    return { url: url.toString(), hostname, address: preferred.address };
  }
}

const approved = await validate(target);
const browser = await chromium.launch({
  headless: true,
  args: [`--host-resolver-rules=MAP ${approved.hostname} ${approved.address}, EXCLUDE localhost`],
});
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.route('**/*', async route => {
    try {
      const request = new URL(route.request().url());
      if (!['http:', 'https:'].includes(request.protocol) || request.hostname !== approved.hostname ||
          (request.port && !['80', '443'].includes(request.port))) throw new Error('off-host request');
      await route.continue();
    }
    catch { await route.abort(); }
  });
  await page.goto(approved.url, { waitUntil: 'networkidle', timeout: 45_000 });
  await page.emulateMedia({ media: 'screen' });
  await page.pdf({ path: 'website.pdf', format: 'A4', printBackground: true });
  console.log('Created website.pdf');
} finally {
  await browser.close();
}
