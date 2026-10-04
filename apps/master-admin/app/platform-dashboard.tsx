'use client';

import styles from './platform-dashboard.module.css';

type CurrencyTotal = { currency: string; amount: string | number; tickets: number };
type DashboardData = {
  tenants?: number;
  activeTenants?: number;
  activeSubscriptions?: number;
  merchants?: number;
  branches?: number;
  tickets?: number;
  failedPayments?: number;
  salesByCurrency?: CurrencyTotal[];
};

const integer = (value: unknown) => {
  const amount = Number(value ?? 0);
  return new Intl.NumberFormat('fr-HT', { maximumFractionDigits: 0 }).format(Number.isFinite(amount) ? amount : 0);
};

function money(value: unknown, currency: string) {
  const code = /^[A-Z]{3}$/.test(currency) ? currency : 'USD';
  const amount = Number(value ?? 0);
  try {
    return new Intl.NumberFormat('fr-HT', { style: 'currency', currency: code, currencyDisplay: 'narrowSymbol' }).format(Number.isFinite(amount) ? amount : 0);
  } catch {
    return code + ' ' + new Intl.NumberFormat('fr-HT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number.isFinite(amount) ? amount : 0);
  }
}

export default function PlatformDashboard({ data }: { data: DashboardData }) {
  const cards = [
    { label: 'Tenant sou platfòm', value: integer(data.tenants), accent: 'blue', icon: 'TN' },
    { label: 'Tenant aktif', value: integer(data.activeTenants), accent: 'green', icon: 'OK' },
    { label: 'Abònman aktif', value: integer(data.activeSubscriptions), accent: 'violet', icon: 'AB' },
    { label: 'Machann aktif', value: integer(data.merchants), accent: 'gold', icon: 'MA' },
    { label: 'Branch aktif', value: integer(data.branches), accent: 'cyan', icon: 'BR' },
    { label: 'Tikè vann', value: integer(data.tickets), accent: 'navy', icon: 'TK' },
  ];
  const sales = data.salesByCurrency ?? [];

  return <div className={styles.dashboard}>
    <section className={styles.hero}>
      <div>
        <span className={styles.eyebrow}>SANT KONTWÒL · LOTTIVEXA</span>
        <h2>Apèsi jeneral</h2>
        <p>Swiv aktivite tenant yo, rezo machann yo ak lavant platfòm nan.</p>
      </div>
      <div className={styles.live}><i /> DONE AN TAN REYÈL</div>
    </section>

    <section className={styles.metrics} aria-label="Endikatè platfòm">
      {cards.map((card) => <article className={`${styles.metric} ${styles[card.accent]}`} key={card.label}>
        <div className={styles.metricTop}><span>{card.label}</span><i>{card.icon}</i></div>
        <strong>{card.value}</strong>
      </article>)}
    </section>

    <section className={styles.bottomGrid}>
      <article className={styles.salesPanel}>
        <div className={styles.panelHeading}>
          <div><span className={styles.eyebrow}>PERFÒMANS</span><h3>Volim lavant</h3></div>
          <span className={styles.panelIcon}>$</span>
        </div>
        {sales.length ? <div className={styles.currencyList}>{sales.map((row) => <div className={styles.currencyRow} key={row.currency}>
          <span className={styles.currencyCode}>{row.currency}</span>
          <div><strong>{money(row.amount, row.currency)}</strong><small>{integer(row.tickets)} tikè</small></div>
        </div>)}</div> : <p className={styles.empty}>Pa gen lavant ki disponib pou kounye a.</p>}
        <p className={styles.note}>Chak montan parèt separeman selon lajan tenant lan itilize.</p>
      </article>

      <article className={`${styles.alertPanel} ${Number(data.failedPayments ?? 0) > 0 ? styles.hasAlerts : ''}`}>
        <div className={styles.panelHeading}>
          <div><span className={styles.eyebrow}>SIVEYANS</span><h3>Peman ki echwe</h3></div>
          <span className={styles.alertIcon}>!</span>
        </div>
        <strong className={styles.alertCount}>{integer(data.failedPayments)}</strong>
        <p>{Number(data.failedPayments ?? 0) > 0 ? 'Gen peman ki bezwen verifikasyon.' : 'Pa gen peman echwe pou kounye a.'}</p>
      </article>
    </section>
  </div>;
}
