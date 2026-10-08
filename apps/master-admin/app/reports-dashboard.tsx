'use client';

import styles from './reports-dashboard.module.css';

type StatusRow = { status?: string; count?: number | string };
type PlanRow = { planId?: string; count?: number | string };
type Plan = { id?: string; name?: string; code?: string };
type TenantSales = { tenantId: string; tenantName: string; tenantSlug: string; currency: string; tickets: number; amount: string | number };

type ReportData = {
  tenantStatus?: StatusRow[];
  subscriptionStatus?: StatusRow[];
  planDistribution?: PlanRow[];
  subscriptionRevenue?: number | string;
  subscriptionRevenueByCurrency?: Array<{ currency: string; amount: unknown; payments?: number }>;
  platformSales?: { tickets?: number | string; amount?: number | string; byCurrency?: Array<{ currency: string; amount: unknown; tickets?: number }>; byTenant?: TenantSales[] };
};

const numberValue = (value: unknown) => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

const sumRows = (rows: StatusRow[] = []) =>
  rows.reduce((total, row) => total + numberValue(row.count), 0);

const activeRows = (rows: StatusRow[] = []) =>
  rows
    .filter((row) => row.status?.toUpperCase() === 'ACTIVE')
    .reduce((total, row) => total + numberValue(row.count), 0);

const integer = (value: unknown) =>
  new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(numberValue(value));

const money = (value: unknown, currency = 'USD') => {
  const code = /^[A-Z]{3}$/.test(currency) ? currency : 'USD';
  try {
    return new Intl.NumberFormat('fr-HT', { style: 'currency', currency: code, currencyDisplay: 'narrowSymbol' }).format(numberValue(value));
  } catch {
    return code + ' ' + new Intl.NumberFormat('fr-HT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(numberValue(value));
  }
};

function currencyTotals(rows: Array<{ currency: string; amount: unknown; tickets?: number; payments?: number }> = []) {
  return rows.length ? <div className={styles.currencyTotals}>{rows.map((row) => <span key={row.currency}><b>{money(row.amount, row.currency)}</b><small>{row.currency}</small></span>)}</div> : null;
}

const statusLabel = (status = '') => {
  const labels: Record<string, string> = {
    ACTIVE: 'Aktif',
    TRIAL: 'Esè',
    PAST_DUE: 'Anreta',
    SUSPENDED: 'Sispann',
    CANCELLED: 'Anile',
    ARCHIVED: 'Achive',
  };
  return labels[status.toUpperCase()] ?? status;
};

function StatusPanel({ title, rows }: { title: string; rows: StatusRow[] }) {
  const total = sumRows(rows);
  return (
    <article className={styles.panel}>
      <div className={styles.panelHeading}>
        <div>
          <p className={styles.eyebrow}>Distribisyon</p>
          <h2>{title}</h2>
        </div>
        <strong>{integer(total)}</strong>
      </div>
      {rows.length ? (
        <div className={styles.statusList}>
          {rows.map((row) => {
            const count = numberValue(row.count);
            const width = total ? Math.max((count / total) * 100, 4) : 0;
            const status = row.status ?? 'UNKNOWN';
            return (
              <div className={styles.statusRow} key={status}>
                <div className={styles.statusMeta}>
                  <span className={`${styles.dot} ${styles[status.toLowerCase()] ?? ''}`} />
                  <span>{statusLabel(status)}</span>
                  <strong>{integer(count)}</strong>
                </div>
                <div className={styles.track} aria-label={`${statusLabel(status)}: ${count}`}>
                  <span style={{ width: `${width}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className={styles.empty}>Pa gen done disponib.</p>
      )}
    </article>
  );
}

export default function ReportsDashboard({ data, plans = [] }: { data: ReportData; plans?: Plan[] }) {
  const tenants = data.tenantStatus ?? [];
  const subscriptions = data.subscriptionStatus ?? [];
  const planRows = data.planDistribution ?? [];
  const tenantSales = data.platformSales?.byTenant ?? [];
  const planNames = new Map(plans.map((plan) => [plan.id, plan.name ?? plan.code ?? plan.id]));
  const maxPlanCount = Math.max(1, ...planRows.map((row) => numberValue(row.count)));

  const cards = [
    { label: 'Kliyan aktif', value: integer(activeRows(tenants)), tone: 'blue' },
    { label: 'Abonnman aktif', value: integer(activeRows(subscriptions)), tone: 'green' },
    { label: 'Revni abonnman', value: currencyTotals(data.subscriptionRevenueByCurrency) ?? money(data.subscriptionRevenue), tone: 'gold' },
    { label: 'Tikè vann', value: integer(data.platformSales?.tickets), tone: 'violet' },
    { label: 'Volim vant', value: currencyTotals(data.platformSales?.byCurrency) ?? money(data.platformSales?.amount), tone: 'navy' },
  ];

  return (
    <div className={styles.dashboard}>
      <section className={styles.intro}>
        <div>
          <p className={styles.eyebrow}>Apèsi platfòm</p>
          <h2>Rapò operasyon yo</h2>
          <p>Chif aktyèl sou kliyan, abonnman, plan ak vant sou platfòm nan.</p>
        </div>
        <span className={styles.live}><i /> Done aktyèl</span>
      </section>

      <section className={styles.kpis}>
        {cards.map((card) => (
          <article className={`${styles.kpi} ${styles[card.tone]}`} key={card.label}>
            <span>{card.label}</span>
            <strong>{card.value}</strong>
          </article>
        ))}
      </section>

      <section className={styles.twoColumns}>
        <StatusPanel title="Estati kliyan" rows={tenants} />
        <StatusPanel title="Estati abonnman" rows={subscriptions} />
      </section>

      <section className={styles.panel}>
        <div className={styles.panelHeading}>
          <div>
            <p className={styles.eyebrow}>Abonnman pa plan</p>
            <h2>Distribisyon plan</h2>
          </div>
          <strong>{integer(planRows.reduce((total, row) => total + numberValue(row.count), 0))}</strong>
        </div>
        {planRows.length ? (
          <div className={styles.planList}>
            {planRows.map((row) => {
              const count = numberValue(row.count);
              const name = planNames.get(row.planId) ?? `Plan ${row.planId?.slice(0, 8) ?? ''}`;
              return (
                <div className={styles.planRow} key={row.planId}>
                  <div className={styles.planName}><strong>{name}</strong><span>{integer(count)} abonnman</span></div>
                  <div className={styles.planTrack}><span style={{ width: `${(count / maxPlanCount) * 100}%` }} /></div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className={styles.empty}>Pa gen abonnman ki lye ak yon plan pou kounye a.</p>
        )}
      </section>

      <section className={styles.panel} aria-label="Lavant separe pa tenant">
        <div className={styles.panelHeading}>
          <div><p className={styles.eyebrow}>DETAY PA TENANT</p><h2>Vant ak tikè chak tenant</h2></div>
          <strong>{integer(tenantSales.length)}</strong>
        </div>
        {tenantSales.length ? <div className={styles.tenantTableWrap}>
          <table className={styles.tenantTable}><thead><tr><th>Tenant</th><th>Tikè vann</th><th>Vant</th><th>Lajan</th></tr></thead>
            <tbody>{tenantSales.map((row) => <tr key={row.tenantId}>
              <td><strong>{row.tenantName}</strong><small>{row.tenantSlug}</small></td>
              <td>{integer(row.tickets)}</td><td><strong>{money(row.amount, row.currency)}</strong></td><td>{row.currency}</td>
            </tr>)}</tbody>
          </table>
        </div> : <p className={styles.empty}>Pa gen done tenant disponib.</p>}
      </section>
    </div>
  );
}
