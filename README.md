# Website to PDF GitHub Action

Save one public web page as a PDF from a manual GitHub Actions run. The workflow downloads Chromium in its own GitHub-hosted runner, renders the page at a desktop width, and uploads `website.pdf` as the run artifact.

## Use it

1. Click **Use this template** to make a copy in your account.
2. Open **Actions** → **Save a public website as PDF** → **Run workflow**.
3. Enter one public `https://` (or `http://`) URL.
4. Download the `website-pdf` artifact when the run finishes.

The renderer refuses loopback, private-network, link-local, multicast, and non-HTTP(S) addresses. It is for pages you are authorized to access; do not use it to evade a site's access controls or capture private material.

## Limits

This is intentionally a small, manual workflow: one page per run, A4 output, and GitHub's own Actions limits and retention rules apply. Cookie banners, login walls, and age gates are not clicked or bypassed. Dynamic pages may render differently over time.

Need up to ten public pages delivered together instead of configuring Actions? [Weio's Website PDF Pack](https://weio.ai/services/website-pdf-pack.html?utm_source=github&utm_medium=readme&utm_campaign=website-pdf-action) provides private, automated delivery for a fixed $19 price.

## Development

```sh
npm install
npx playwright install chromium
TARGET_URL=https://example.com node render.mjs
```

MIT licensed. Maintained by [Weio, Inc.](https://weio.ai/?utm_source=github&utm_medium=readme&utm_campaign=website-pdf-action).
