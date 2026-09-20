import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync(new URL('./page.tsx', import.meta.url), 'utf8');
const language = readFileSync(new URL('./language-switcher.tsx', import.meta.url), 'utf8');

describe('merchant POS', () => {
  it('has login only and no public account creation', () => {
    expect(source).toContain("t('login')");
    expect(source).toContain("t('intro')");
    expect(language).toContain("login:'Koneksyon machann'");
    expect(language).toContain("intro:'Administratè biznis la kreye kont ou.'");
    expect(source).not.toMatch(/Create account|Register account|Sign Up|Sign up/i);
  });

  it('connects the full sale and ticket lifecycle', () => {
    for (const path of ['/merchants/me/dashboard', '/lottery/draws', '/tickets', '/payouts', '/cancel', '/printing/jobs']) {
      expect(source).toContain(path);
    }
  });

  it('connects cash shift operations', () => {
    expect(source).toContain('/cash/session/open');
    expect(source).toContain('/movements');
    expect(source).toContain('/close');
  });

  it('rotates sessions and forces temporary password replacement', () => {
    expect(source).toContain('/auth/refresh');
    expect(source).toContain('/users/me/change-password');
    expect(source).toContain('forcePasswordChange');
  });

  it('shows live connectivity and disables online-only sale while offline', () => {
    expect(source).toContain("addEventListener('offline'");
    expect(source).toContain('disabled={!online}');
  });
});

describe('Haitian selling desk', () => {
  it('detects 2 through 5 digit games and supports the three result positions', () => {
    for (const value of ["2:'BOLET'", "3:'LOTO3'", "4:'LOTO4'", "5:'LOTO5'", "t('allOptions')", 'resultPosition']) {
      expect(source).toContain(value);
    }
    expect(language).toContain("allOptions:'Tout opsyon'");
  });

  it('includes automatic Maryaj, Loto 4 and Boul Pe tools', () => {
    for (const value of ['addMaryaj', 'addAutoLoto4', 'addBoulPe', "'00','11','22','33','44','55','66','77','88','99'"]) {
      expect(source).toContain(value);
    }
  });

  it('refreshes remote configuration and live results', () => {
    expect(source).toContain('setInterval(()=>void load(),60000)');
    expect(source).toContain('setInterval(load,15000)');
  });
});
