import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync(new URL('./page.tsx', import.meta.url), 'utf8');
const language = readFileSync(new URL('./language-switcher.tsx', import.meta.url), 'utf8');
const reports = readFileSync(new URL('./merchant-reports.tsx', import.meta.url), 'utf8');
const sessionRefresh = readFileSync(new URL('./session-refresh.ts', import.meta.url), 'utf8');
const styles = readFileSync(new URL('./styles.css', import.meta.url), 'utf8');
const ticketSale = readFileSync(new URL('./ticket-sale.ts', import.meta.url), 'utf8');
const replay = readFileSync(new URL('./replay-ticket.ts', import.meta.url), 'utf8');
const ticketDelete = readFileSync(new URL('./ticket-delete.ts', import.meta.url), 'utf8');
const webMenu = readFileSync(new URL('./web-menu.tsx', import.meta.url), 'utf8');

describe('merchant POS', () => {
  it('removes the extra More screen and excludes primary tabs from the hamburger', () => {
    expect(source).not.toContain("onNavigate('more')");
    expect(source).not.toContain("screen==='more'");
    expect(source).toContain('data-bottom-tab');
    expect(webMenu).toContain('button:not([data-bottom-tab=');
  });
  it('shows the winning ball and payout only on confirmed lines', () => {
    expect(source).toContain('line.matchedWinningKeys');
    expect(source).toContain('lineConfirmed=line.resultConfirmed===true');
    expect(source).toContain('lineWon=lineConfirmed&&line.isWinner===true');
    expect(source).toContain('linePayout=lineWon?Number(line.winningAmount??0):0');
  });
  it('has login only and no public account creation', () => {
    expect(source).toContain("t('login')");
    expect(source).toContain("t('intro')");
    expect(language).toContain("login:'Koneksyon machann'");
    expect(language).toContain("intro:'Administratè biznis la kreye kont ou.'");
    expect(source).not.toMatch(/Create account|Register account|Sign Up|Sign up/i);
  });

  it('connects the full sale and ticket lifecycle', () => {
    for (const path of ['/merchants/me/dashboard', '/lottery/draws', '/tickets', '/payouts', '/printing/jobs']) {
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

  it('orders Home first and refreshes merchant data without manual reloads', () => {
    expect(source).toContain("mobileNav:[Screen,string,string][]=[['dashboard'");
    expect(source).toContain("setInterval(refresh,15000)");
    expect(source).toContain("document.addEventListener('visibilitychange',refresh)");
  });

  it('allows merchants to remove their ticket only before every draw closes', () => {
    expect(source).toContain("method:'DELETE'");
    expect(source).toContain("can('tickets.cancel')&&canMerchantDeleteTicket(t)");
    expect(source).toContain('ticket-history-delete');
    expect(source).toContain('showDelete=!showWinners');
    expect(source).toContain('TICKET_DELETE_DRAW_CLOSED:');
    expect(source).toContain('TICKET_DELETE_FINALIZED:');
    expect(ticketDelete).toContain("draw.status === 'OPEN'");
    expect(ticketDelete).toContain('now < closesAt');
    expect(source).toContain('filter(ticketBelongsInWinnersList)');
    expect(source).toContain('closedDrawLines.length>0');
  });

  it('shows the five requested phone tabs above the safe area', () => {
    expect(source).toContain("mobileNav:[Screen,string,string][]=[['dashboard'");
    for (const value of ["['dashboard',language==='fr'?'Accueil':'Akèy'", "['sell',language==='fr'?'Vendre':'Vann'", "['history',t('history')", "['reports',t('reports')"] ) {
      expect(source).toContain(value);
    }
    expect(source).toContain('className="pos-tabs"');
    expect(styles).toContain('body.web-menu-enabled .pos>nav.pos-tabs{display:block!important;position:fixed!important');
    expect(styles).toContain('env(safe-area-inset-bottom)');
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
    expect(source).toContain('setInterval(refresh,15000)');
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

  it('lets the merchant select several draws and duplicates each added line per selected draw', () => {
    expect(source).toContain('className="draw-multi-selector"');
    expect(source).toContain('type="checkbox" checked={selectedDrawIds.includes(row.id)}');
    expect(source).toContain('assignUndrawnLinesToSelectedDraws(lines,selectedDrawIds)');
    expect(replay).toContain('drawIds.map((drawId)');
    expect(ticketSale).toContain('draws: groups');
    expect(source).toContain('name="drawId"');
  });

  it('keeps printer and template controls out of the sales form', () => {
    expect(source).not.toContain('name="printerId"');
    expect(source).not.toContain('name="templateId"');
    expect(source).not.toContain("t('autoPrint')");
  });

  it('pins the sale button above the mobile navigation while scrolling', () => {
    expect(styles).toContain('.sell form .ticket-actions {');
    expect(styles).toContain('position: fixed;');
    expect(styles).toContain('bottom: calc(64px + env(safe-area-inset-bottom));');
  });
});
