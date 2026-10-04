import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const manifest = JSON.parse(readFileSync(new URL('../public/manifest.webmanifest', import.meta.url), 'utf8'));
const worker = readFileSync(new URL('../public/sw.js', import.meta.url), 'utf8');
const button = readFileSync(new URL('./install-app-button.tsx', import.meta.url), 'utf8');
const page = readFileSync(new URL('./page.tsx', import.meta.url), 'utf8');

describe('merchant web app installation', () => {
  it('publishes standalone PWA metadata and install-size icons', () => {
    expect(manifest.display).toBe('standalone');
    expect(manifest.icons.some((icon: { sizes: string }) => icon.sizes === '192x192')).toBe(true);
    expect(manifest.icons.some((icon: { sizes: string }) => icon.sizes === '512x512')).toBe(true);
  });

  it('registers the install action and keeps authenticated API data out of the offline cache', () => {
    expect(page).toContain('<InstallAppButton/>');
    expect(button).toContain("beforeinstallprompt");
    expect(worker).toContain("url.pathname.startsWith('/api/')");
  });
});
