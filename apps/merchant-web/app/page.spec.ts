import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync(new URL('./page.tsx', import.meta.url), 'utf8');
const language = readFileSync(new URL('./language-switcher.tsx', import.meta.url), 'utf8');
const reports = readFileSync(new URL('./merchant-reports.tsx', import.meta.url), 'utf8');
const sessionRefresh = readFileSync(new URL('./session-refresh.ts', import.meta.url), 'utf8');

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

  it('keeps the cash-register workflow out of the merchant interface', () => {
    expect(source).not.toContain('/cash/session/current');
    expect(source).not.toContain('/cash/session/open');
    expect(source).not.toMatch(/screen===['"]cash['"]|\[['"]cash['"]|function Cash\(/);
  });

  it('rotates sessions and forces temporary password replacement', () => {
    expect(source).toContain('refreshWebSession');
    expect(sessionRefresh).toContain('/auth/refresh');
    expect(source).toContain('/users/me/change-password');
    expect(source).toContain('forcePasswordChange');
  });

  it('shows live connectivity and disables online-only sale while offline', () => {
    expect(source).toContain("addEventListener('offline'");
    expect(source).toMatch(/disabled=\{!online(?:\|\|[^}]*)?\}/);
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

  it('keeps price and result-position choices inside the small automatic-game dialogs', () => {
    expect(source).not.toContain('sell-options');
    expect(source).not.toContain('stake-tools');
    expect(source).toContain("autoDialog==='loto'&&");
    expect(source).toContain("setAutoDialog('boulPe')");
  });

  it('refreshes remote configuration and live results', () => {
    expect(source).toContain('setInterval(()=>void load(),60000)');
    expect(source).toContain('setInterval(load,15000)');
  });
});

describe('merchant reports PDF export', () => {
  it('offers date-filtered PDF download only', () => {
    expect(reports).toContain("request('/reports/sales.pdf?' + query)");
    expect(reports).toContain("link.download = 'lottivexa-sales-' + from + '-' + to + '.pdf'");
    expect(reports).toContain("t('downloadPdf')");
    expect(language).toContain("downloadPdf:'Telechaje rapò an PDF'");
  });
});


describe('merchant branding and multi-draw sales', () => {
  it('shows the tenant logo from the dashboard branding data', () => {
    expect(source).toContain('className="merchant-brand"');
    expect(source).toContain('state.dashboard?.logoUrl');
  });

  it('keeps lines when changing the draw and stores the draw on each line', () => {
    expect(source).toContain('setDraw(e.target.value)} required');
    expect(source).not.toContain('setDraw(e.target.value);setLines([])');
    expect(source).toContain('drawId:draw');
  });
});
