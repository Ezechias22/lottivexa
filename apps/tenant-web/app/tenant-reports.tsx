"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { drawSessionLabel } from "./draw-label";
import { useI18n } from "./i18n";

type Row = Record<string, any>;
type Request = (path: string, init?: RequestInit) => Promise<any>;
type Run = (action: () => Promise<any>, success?: string) => Promise<any>;

const BUSINESS_ZONE = "America/Port-au-Prince";

function localDate(date = new Date()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: BUSINESS_ZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
      .formatToParts(date)
      .map((part) => [part.type, part.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function shiftDate(date: string, days: number) {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + days))
    .toISOString()
    .slice(0, 10);
}

function currencyValue(value: unknown, currency: string, language: string) {
  const amount = Number(value ?? 0);
  const code = /^[A-Z]{3}$/.test(currency) ? currency : "USD";
  const safeAmount = Number.isFinite(amount) ? amount : 0;
  try {
    return new Intl.NumberFormat("fr-HT", {
      style: "currency",
      currency: code,
      currencyDisplay: "narrowSymbol",
    }).format(safeAmount);
  } catch {
    const formatted = new Intl.NumberFormat("fr-HT", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(safeAmount);
    return `${code} ${formatted}`;
  }
}

function drawScheduleLabel(draw: Row, language: string) {
  const scheduled = String(draw.drawNumber ?? "").match(/(?:^|[-_])(\d{8})[-_](\d{4})$/);
  const encodedDate = scheduled ? `${scheduled[1].slice(0, 4)}-${scheduled[1].slice(4, 6)}-${scheduled[1].slice(6, 8)}` : null;
  const source = encodedDate ? `${encodedDate}T12:00:00Z` : draw.drawDate ?? draw.drawTime;
  const date = source ? new Date(source) : null;
  const dateLabel = date && !Number.isNaN(date.getTime())
    ? new Intl.DateTimeFormat(language === "fr" ? "fr-FR" : "fr-HT", {
        timeZone: encodedDate || (draw.drawDate && source === draw.drawDate) ? "UTC" : BUSINESS_ZONE,
        day: "2-digit",
        month: "short",
        year: "numeric",
      }).format(date)
    : "";
  const encodedTime = scheduled?.[2];
  let timeLabel = "";
  if (encodedTime) {
    const hour = Number(encodedTime.slice(0, 2));
    const minute = Number(encodedTime.slice(2));
    if (hour < 24 && minute < 60) timeLabel = `${encodedTime.slice(0, 2)}:${encodedTime.slice(2)}`;
  }
  if (!timeLabel && draw.drawTime) {
    const time = new Date(draw.drawTime);
    if (!Number.isNaN(time.getTime())) {
      timeLabel = new Intl.DateTimeFormat("en-GB", {
        timeZone: BUSINESS_ZONE,
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
      }).format(time);
    }
  }
  return [dateLabel, timeLabel].filter(Boolean).join(" · ");
}

function dateLabel(value: string | Date, language: string) {
  const text = String(value).slice(0, 10);
  const safeDate = new Date(`${text}T12:00:00Z`);
  return new Intl.DateTimeFormat("fr-HT", {
    timeZone: BUSINESS_ZONE,
    day: "2-digit",
    month: "short",
  }).format(safeDate);
}

function fullDateLabel(value: string, language: string) {
  const safeDate = new Date(`${value.slice(0, 10)}T12:00:00Z`);
  return new Intl.DateTimeFormat("fr-HT", {
    timeZone: BUSINESS_ZONE,
    dateStyle: "medium",
  }).format(safeDate);
}

const statusText: Record<string, { ht: string; fr: string }> = {
  PENDING: { ht: "An atant", fr: "En attente" },
  WON: { ht: "Gayan", fr: "Gagnant" },
  LOST: { ht: "Pèdi", fr: "Perdu" },
  PAID: { ht: "Peye", fr: "Payé" },
  CANCELLED: { ht: "Anile", fr: "Annulé" },
  VOID: { ht: "Anile", fr: "Annulé" },
  RESULT_PENDING: { ht: "Rezilta an atant", fr: "Résultat en attente" },
};

function StatusLabel({ value, language }: { value: string; language: string }) {
  return (
    <span className={`tenant-report-status status-${value.toLowerCase()}`}>
      {statusText[value]?.[language === "fr" ? "fr" : "ht"] ?? value}
    </span>
  );
}

function TrendChart({ rows, currency, language }: { rows: Row[]; currency: string; language: string }) {
  const labels = language === "fr"
    ? { title: "Évolution des ventes", empty: "Aucune vente sur cette période.", first: "Début", middle: "Milieu", last: "Fin" }
    : { title: "Vant pa jou", empty: "Pa gen lavant nan peryòd sa a.", first: "Kòmansman", middle: "Mitan", last: "Fen" };
  const max = Math.max(1, ...rows.map((row) => Number(row.amount ?? 0)));
  const barWidth = rows.length ? 960 / rows.length : 0;

  return (
    <section className="tenant-report-card report-trend-card">
      <div className="tenant-report-card-heading">
        <div>
          <span className="tenant-report-kicker">{language === "fr" ? "ACTIVITÉ" : "AKTIVITE"}</span>
          <h3>{labels.title}</h3>
        </div>
        <span className="tenant-report-muted">{rows.length} {language === "fr" ? "jours" : "jou"}</span>
      </div>
      {rows.length ? (
        <>
          <div className="tenant-report-chart-scroll">
            <svg className="tenant-report-chart" viewBox="0 0 960 220" role="img" aria-label={labels.title}>
              {[40, 85, 130, 175].map((y) => (
                <line key={y} x1="0" x2="960" y1={y} y2={y} className="tenant-report-gridline" />
              ))}
              {rows.map((row, index) => {
                const value = Number(row.amount ?? 0);
                const height = Math.max(3, (value / max) * 142);
                const width = Math.max(2, barWidth - Math.min(8, barWidth * 0.24));
                const x = index * barWidth + (barWidth - width) / 2;
                return (
                  <rect
                    key={`${row.day}-${index}`}
                    x={x}
                    y={178 - height}
                    width={width}
                    height={height}
                    rx={Math.min(7, width / 2)}
                    className="tenant-report-bar"
                  >
                    <title>{`${fullDateLabel(String(row.day), language)} · ${currencyValue(value, currency, language)}`}</title>
                  </rect>
                );
              })}
            </svg>
          </div>
          <div className="tenant-report-chart-axis">
            <span>{rows[0] ? dateLabel(String(rows[0].day), language) : labels.first}</span>
            <span>{rows[Math.floor((rows.length - 1) / 2)] ? dateLabel(String(rows[Math.floor((rows.length - 1) / 2)].day), language) : labels.middle}</span>
            <span>{rows[rows.length - 1] ? dateLabel(String(rows[rows.length - 1].day), language) : labels.last}</span>
          </div>
        </>
      ) : (
        <div className="tenant-report-chart-empty">{labels.empty}</div>
      )}
    </section>
  );
}

function BreakdownCard({
  title,
  rows,
  nameKey,
  currency,
  language,
  empty,
}: {
  title: string;
  rows: Row[];
  nameKey: string;
  currency: string;
  language: string;
  empty: string;
}) {
  const highest = Math.max(1, ...rows.map((row) => Number(row.amount ?? 0)));
  return (
    <section className="tenant-report-card tenant-report-breakdown">
      <div className="tenant-report-card-heading">
        <div>
          <span className="tenant-report-kicker">{language === "fr" ? "PERFORMANCE" : "PÈFÒMANS"}</span>
          <h3>{title}</h3>
        </div>
      </div>
      {rows.length ? (
        <div className="tenant-report-ranking">
          {rows.slice(0, 6).map((row, index) => {
            const amount = Number(row.amount ?? 0);
            return (
              <div className="tenant-report-rank-row" key={row[nameKey] ?? index}>
                <span className="tenant-report-rank-number">{String(index + 1).padStart(2, "0")}</span>
                <div className="tenant-report-rank-main">
                  <div className="tenant-report-rank-label">
                    <strong>{row[nameKey] ?? "—"}</strong>
                    <span>{currencyValue(amount, currency, language)}</span>
                  </div>
                  <div className="tenant-report-meter"><span style={{ width: `${Math.max(3, (amount / highest) * 100)}%` }} /></div>
                  <small>{row.count ?? 0} {language === "fr" ? "tickets" : "tikè"}</small>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="tenant-report-card-empty">{empty}</div>
      )}
    </section>
  );
}

export default function TenantReports({
  data,
  request,
  run,
  downloadReport,
  canExport,
}: {
  data: any[];
  request: Request;
  run: Run;
  downloadReport: (from: string, to: string, merchantIds?: string[], branchId?: string) => Promise<void>;
  canExport: boolean;
}) {
  const { language } = useI18n();
  const french = language === "fr";
  const text = french
    ? {
        eyebrow: "ESPACE ANALYTIQUE",
        title: "Rapports de l’entreprise",
        subtitle: "Suivez les ventes, les paiements et l’activité de vos points de vente.",
        period: "Période analysée",
        scope: "Périmètre du rapport",
        allOffices: "Tous les bureaux / centrales",
        allMerchants: "Tous les vendeurs",
        selectMerchants: "Vendeurs à inclure",
        selectionHelp: "Laissez vide pour inclure tous les vendeurs du bureau choisi.",
        central: "Centrale",
        office: "Bureau",
        session: "Session / date",
        today: "Aujourd’hui",
        seven: "7 jours",
        thirty: "30 jours",
        from: "Du",
        to: "Au",
        apply: "Actualiser les chiffres",
        pdf: "Télécharger le PDF",
        sales: "Ventes nettes de tickets",
        tickets: "Tickets vendus",
        payouts: "Gains payés",
        commission: "Commissions",
        commissionRate: "Taux de commission",
        byMerchant: "Commissions par vendeur",
        net: "Résultat net",
        byStatus: "Répartition par statut",
        byGame: "Ventes par loterie",
        byBranch: "Ventes par bureau / centrale",
        byDraw: "Activité par tirage",
        winners: "Gains les plus élevés",
        noWinners: "Aucun gain enregistré sur cette période.",
        empty: "Aucune donnée pour cette période.",
        ticketsCount: "tickets",
        draw: "Tirage",
        lottery: "Loterie",
        merchant: "Vendeur",
        details: "Jeu et numéro gagnant",
        noPermission: "Vous n’avez pas accès à l’export PDF.",
        pdfError: "Le PDF du rapport n’a pas pu être téléchargé.",
        invalidRange: "La date de début doit précéder la date de fin.",
        canceled: "Tickets annulés",
      }
    : {
        eyebrow: "ESPAS ANALIZ",
        title: "Rapò biznis la",
        subtitle: "Swiv lavant, peman gayan ak aktivite biwo ou yo.",
        period: "Peryòd analiz la",
        scope: "Ki pati biznis la rapò a kouvri",
        allOffices: "Tout biwo ak santral yo",
        allMerchants: "Tout machann yo",
        selectMerchants: "Machann pou mete nan rapò a",
        selectionHelp: "Kite l vid pou mete tout machann biwo oswa santral ki chwazi a.",
        central: "Santral",
        office: "Biwo",
        session: "Sesyon / dat",
        today: "Jodi a",
        seven: "7 jou",
        thirty: "30 jou",
        from: "Soti",
        to: "Rive",
        apply: "Mete chif yo ajou",
        pdf: "Telechaje PDF",
        sales: "Lavant tikè",
        tickets: "Tikè vann",
        payouts: "Gany ki peye",
        commission: "Komisyon",
        commissionRate: "Pousantaj komisyon",
        byMerchant: "Komisyon pa machann",
        net: "Rezilta nèt",
        byStatus: "Tikè pa estati",
        byGame: "Lavant pa lotri",
        byBranch: "Lavant pa biwo",
        byDraw: "Aktivite pa tiraj",
        winners: "Pi gwo gany yo",
        noWinners: "Pa gen gany nan peryòd sa a.",
        empty: "Pa gen done nan peryòd sa a.",
        ticketsCount: "tikè",
        draw: "Tiraj",
        lottery: "Lotri",
        merchant: "Machann",
        details: "Jwèt ak nimewo gayan",
        noPermission: "Ou pa gen aksè pou telechaje rapò PDF la.",
        pdfError: "Nou pa t kapab telechaje rapò PDF la.",
        invalidRange: "Dat kòmansman an dwe anvan dat fen an.",
        canceled: "Tikè anile",
      };
  const [report, setReport] = useState(data[0] ?? {});
  const [drawReport, setDrawReport] = useState(data[1] ?? {});
  const [from, setFrom] = useState(() => shiftDate(localDate(), -29));
  const [to, setTo] = useState(() => localDate());
  const [filterError, setFilterError] = useState("");
  const [pdfBusy, setPdfBusy] = useState(false);
  const [merchantOptions, setMerchantOptions] = useState<Row[]>([]);
  const [branchOptions, setBranchOptions] = useState<Row[]>([]);
  const [selectedMerchantIds, setSelectedMerchantIds] = useState<string[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState("");
  const currency = String(report.currency ?? "USD");

  useEffect(() => {
    let active = true;
    void Promise.all([request("/merchants"), request("/branches")])
      .then(([merchants, branches]) => {
        if (!active) return;
        setMerchantOptions(Array.isArray(merchants) ? merchants : []);
        setBranchOptions(Array.isArray(branches) ? branches : []);
      })
      .catch(() => {
        if (active) setFilterError(french ? "Impossible de charger la liste des vendeurs et des bureaux." : "Nou pa t kapab chaje lis machann ak biwo yo.");
      });
    return () => { active = false; };
  }, [request, french]);

  useEffect(() => {
    setReport(data[0] ?? {});
    setDrawReport(data[1] ?? {});
  }, [data]);

  const byDay = useMemo(() => report.byDay ?? [], [report.byDay]);
  const statusRows = useMemo(() => report.byStatus ?? [], [report.byStatus]);
  const statusTotal = Math.max(1, statusRows.reduce((sum: number, row: Row) => sum + Number(row.count ?? 0), 0));
  const gameRows = useMemo(
    () => [...(report.byGame ?? [])].sort((a: Row, b: Row) => Number(b.amount ?? 0) - Number(a.amount ?? 0)),
    [report.byGame],
  );
  const branchRows = useMemo(
    () => [...(report.byBranch ?? [])].sort((a: Row, b: Row) => Number(b.amount ?? 0) - Number(a.amount ?? 0)),
    [report.byBranch],
  );
  const merchantRows = useMemo(
    () => [...(report.byMerchant ?? [])].sort((a: Row, b: Row) => Number(b.commission ?? 0) - Number(a.commission ?? 0)),
    [report.byMerchant],
  );
  const sessions = (drawReport.byDraw ?? []).map((draw: Row) => ({
    ...draw,
    sessionLabel: drawSessionLabel({ session: draw.session }, language),
    scheduleLabel: drawScheduleLabel(draw, language),
  }));

  async function loadRange(start: string, end: string, merchantIds = selectedMerchantIds, branchId = selectedBranchId) {
    setFilterError("");
    if (!start || !end || start > end) {
      setFilterError(text.invalidRange);
      return;
    }
    const query = new URLSearchParams({ from: start, to: end });
    if (merchantIds.length) query.set("merchantIds", merchantIds.join(","));
    if (branchId) query.set("branchId", branchId);
    const values = await run(() => Promise.all([
      request(`/reports/sales?${query}`),
      request(`/reports/draws?${query}`),
    ]));
    if (values) {
      setReport(values[0]);
      setDrawReport(values[1]);
    }
  }

  function choosePreset(days: number) {
    const end = localDate();
    const start = days === 0 ? end : shiftDate(end, -(days - 1));
    setFrom(start);
    setTo(end);
    void loadRange(start, end);
  }

  async function filter(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await loadRange(from, to);
  }

  async function downloadPdf() {
    setPdfBusy(true);
    setFilterError("");
    try {
      await downloadReport(from, to, selectedMerchantIds, selectedBranchId);
    } catch {
      setFilterError(text.pdfError);
    } finally {
      setPdfBusy(false);
    }
  }

  const ticketCount = Number(report.tickets?.count ?? 0);
  const netSales = Number(report.accounting?.netSales ?? (
    Number(report.tickets?.sales ?? 0) - Number(report.payouts?.amount ?? 0) - Number(report.commission ?? 0)
  ));
  const cancelledCount = Number(report.accounting?.cancelledCount ?? 0);
  const visibleMerchants = selectedBranchId
    ? merchantOptions.filter((merchant) => merchant.branchId === selectedBranchId)
    : merchantOptions;
  const selectedMerchantLabel = selectedMerchantIds.length
    ? `${selectedMerchantIds.length} ${french ? "vendeur(s) sélectionné(s)" : "machann chwazi"}`
    : (french ? "Tous les vendeurs" : "Tout machann yo");

  return (
    <div className="tenant-report-page">
      <section className="tenant-report-hero">
        <div className="tenant-report-hero-copy">
          <span className="tenant-report-hero-eyebrow"><span />{text.eyebrow}</span>
          <h2>{text.title}</h2>
          <p>{text.subtitle}</p>
        </div>
        <div className="tenant-report-hero-art" aria-hidden="true">
          <span className="hero-orbit orbit-one" />
          <span className="hero-orbit orbit-two" />
          <div className="hero-stat"><small>{text.tickets}</small><strong>{ticketCount.toLocaleString("fr-HT")}</strong><span>{fullDateLabel(from, language)} — {fullDateLabel(to, language)}</span></div>
          <div className="hero-bars"><i /><i /><i /><i /><i /><i /><i /></div>
        </div>
      </section>

      <section className="tenant-report-toolbar" aria-label={text.period}>
        <div className="tenant-report-period-copy">
          <span className="tenant-report-kicker">{text.period}</span>
          <strong>{fullDateLabel(from, language)} <span>→</span> {fullDateLabel(to, language)}</strong>
        </div>
        <div className="tenant-report-toolbar-actions">
          <div className="tenant-report-scope-filters">
            <label className="tenant-report-scope-select">{text.scope}
              <select value={selectedBranchId} onChange={(event) => {
                const nextBranch = event.target.value;
                setSelectedBranchId(nextBranch);
                if (nextBranch) setSelectedMerchantIds((current) => current.filter((id) => merchantOptions.some((merchant) => merchant.id === id && merchant.branchId === nextBranch)));
              }}>
                <option value="">{text.allOffices}</option>
                {branchOptions.map((branch) => <option key={branch.id} value={branch.id}>{branch.officeKind === "CENTRAL" ? text.central : text.office} · {branch.name}</option>)}
              </select>
            </label>
            <details className="tenant-report-merchant-picker">
              <summary>{selectedMerchantLabel}</summary>
              <div className="tenant-report-merchant-options" role="group" aria-label={text.selectMerchants}>
                <label><input type="checkbox" checked={selectedMerchantIds.length === 0} onChange={() => setSelectedMerchantIds([])} />{text.allMerchants}</label>
                {visibleMerchants.map((merchant) => <label key={merchant.id}>
                  <input type="checkbox" checked={selectedMerchantIds.includes(merchant.id)} onChange={(event) => setSelectedMerchantIds((current) => event.target.checked ? [...current, merchant.id] : current.filter((id) => id !== merchant.id))} />
                  {merchant.displayName} · {merchant.branch?.name ?? "—"}
                </label>)}
                {!visibleMerchants.length && <small>{text.empty}</small>}
                <small>{text.selectionHelp}</small>
              </div>
            </details>
          </div>
          <div className="tenant-report-presets">
            <button type="button" onClick={() => choosePreset(0)}>{text.today}</button>
            <button type="button" onClick={() => choosePreset(7)}>{text.seven}</button>
            <button type="button" onClick={() => choosePreset(30)}>{text.thirty}</button>
          </div>
          <form className="tenant-report-filter" onSubmit={filter}>
            <label>{text.from}<input type="date" value={from} onChange={(event) => setFrom(event.target.value)} required /></label>
            <label>{text.to}<input type="date" value={to} onChange={(event) => setTo(event.target.value)} required /></label>
            <button type="submit" className="tenant-report-apply">{text.apply}</button>
          </form>
          {canExport ? (
            <button type="button" className="tenant-report-pdf" onClick={() => void downloadPdf()} disabled={pdfBusy}>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v11m0 0 4-4m-4 4-4-4M5 17v3h14v-3" /></svg>
              {pdfBusy ? "…" : text.pdf}
            </button>
          ) : (
            <span className="tenant-report-export-note">{text.noPermission}</span>
          )}
        </div>
      </section>
      {filterError && <p className="tenant-report-error" role="alert">{filterError}</p>}

      <section className="tenant-report-kpis" aria-label={text.title}>
        <article className="tenant-report-kpi kpi-sales">
          <div className="tenant-report-kpi-icon"><span>↗</span></div>
          <span className="tenant-report-kpi-label">{text.sales}</span>
          <strong>{currencyValue(report.tickets?.sales, currency, language)}</strong>
          <small>{text.period}</small>
        </article>
        <article className="tenant-report-kpi">
          <div className="tenant-report-kpi-icon icon-violet"><span>▣</span></div>
          <span className="tenant-report-kpi-label">{text.tickets}</span>
          <strong>{ticketCount.toLocaleString("fr-HT")}</strong>
          <small>{cancelledCount} {text.canceled.toLowerCase()}</small>
        </article>
        <article className="tenant-report-kpi">
          <div className="tenant-report-kpi-icon icon-coral"><span>↙</span></div>
          <span className="tenant-report-kpi-label">{text.payouts}</span>
          <strong>{currencyValue(report.payouts?.amount, currency, language)}</strong>
          <small>{Number(report.payouts?.count ?? 0).toLocaleString(french ? "fr-FR" : "fr-HT")} {text.ticketsCount}</small>
        </article>
        <article className="tenant-report-kpi">
          <div className="tenant-report-kpi-icon icon-amber"><span>%</span></div>
          <span className="tenant-report-kpi-label">{text.commission}</span>
          <strong>{currencyValue(report.commission, currency, language)}</strong>
          <small>{text.period}</small>
        </article>
        <article className="tenant-report-kpi kpi-net">
          <div className="tenant-report-kpi-icon icon-green"><span>◎</span></div>
          <span className="tenant-report-kpi-label">{text.net}</span>
          <strong>{currencyValue(netSales, currency, language)}</strong>
          <small>{french ? "Après gains et commissions" : "Apre peman ak komisyon"}</small>
        </article>
      </section>

      <div className="tenant-report-main-grid">
        <TrendChart rows={byDay} currency={currency} language={language} />
        <section className="tenant-report-card tenant-report-status-card">
          <div className="tenant-report-card-heading">
            <div><span className="tenant-report-kicker">{language === "fr" ? "SUIVI" : "SWIVI"}</span><h3>{text.byStatus}</h3></div>
          </div>
          <div className="tenant-report-status-list">
            {statusRows.length ? statusRows.map((row: Row) => (
              <div className="tenant-report-status-row" key={row.status}>
                <div className="tenant-report-status-title"><StatusLabel value={row.status} language={language} /><strong>{Number(row.count ?? 0).toLocaleString("fr-HT")}</strong></div>
                <div className="tenant-report-meter"><span className={`meter-${String(row.status).toLowerCase()}`} style={{ width: `${Math.max(2, (Number(row.count ?? 0) / statusTotal) * 100)}%` }} /></div>
                <small>{currencyValue(row.amount, currency, language)}</small>
              </div>
            )) : <div className="tenant-report-card-empty">{text.empty}</div>}
          </div>
        </section>
      </div>

      <div className="tenant-report-breakdown-grid">
        <BreakdownCard title={text.byGame} rows={gameRows} nameKey="gameName" currency={currency} language={language} empty={text.empty} />
        <BreakdownCard title={text.byBranch} rows={branchRows} nameKey="branchName" currency={currency} language={language} empty={text.empty} />
      </div>

      <section className="tenant-report-card tenant-report-draw-card">
        <div className="tenant-report-card-heading">
          <div><span className="tenant-report-kicker">{language === "fr" ? "DÉTAIL DES VENTES" : "DETAY LAVANT"}</span><h3>{text.byDraw}</h3></div>
          <span className="tenant-report-muted">{sessions.length} {french ? "tirages" : "tiraj"}</span>
        </div>
        <div className="tenant-report-table-wrap">
          <table className="tenant-report-table">
            <thead><tr><th>{text.lottery}</th><th>{text.draw}</th><th>{text.session}</th><th>{text.tickets}</th><th>{text.sales}</th></tr></thead>
            <tbody>
              {sessions.length ? sessions.map((draw: Row) => (
                <tr key={draw.drawId}>
                  <td><strong>{draw.gameName || "—"}</strong></td>
                  <td><span className="draw-number-tag">{draw.drawNumber || "—"}</span></td>
                  <td><span>{draw.sessionLabel}</span><small className="tenant-report-subline">{draw.scheduleLabel || draw.drawNumber || "—"}</small></td>
                  <td>{Number(draw.count ?? 0).toLocaleString("fr-HT")}</td>
                  <td className="report-number-cell">{currencyValue(draw.amount, currency, language)}</td>
                </tr>
              )) : <tr><td colSpan={5} className="tenant-report-table-empty">{text.empty}</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      <section className="tenant-report-card tenant-report-draw-card">
        <div className="tenant-report-card-heading">
          <div><span className="tenant-report-kicker">{language === "fr" ? "DÉTAIL PAR VENDEUR" : "DETAY PA MACHANN"}</span><h3>{text.byMerchant}</h3></div>
          <span className="tenant-report-muted">{merchantRows.length} {french ? "vendeurs" : "machann"}</span>
        </div>
        <div className="tenant-report-table-wrap">
          <table className="tenant-report-table">
            <thead><tr><th>{text.merchant}</th><th>{text.commissionRate}</th><th>{text.tickets}</th><th>{text.sales}</th><th>{text.commission}</th></tr></thead>
            <tbody>
              {merchantRows.length ? merchantRows.map((merchant: Row) => (
                <tr key={merchant.merchantId}>
                  <td><strong>{merchant.merchantName}</strong><small className="tenant-report-subline">{merchant.merchantNumber || "—"}</small></td>
                  <td>{merchant.commissionRate || "—"}</td>
                  <td>{Number(merchant.count ?? 0).toLocaleString("fr-HT")}</td>
                  <td className="report-number-cell">{currencyValue(merchant.amount, currency, language)}</td>
                  <td className="report-number-cell">{currencyValue(merchant.commission, currency, language)}</td>
                </tr>
              )) : <tr><td colSpan={5} className="tenant-report-table-empty">{text.empty}</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      <section className="tenant-report-card tenant-report-winners-card">
        <div className="tenant-report-card-heading">
          <div><span className="tenant-report-kicker">{language === "fr" ? "PAIEMENTS" : "PEMAN"}</span><h3>{text.winners}</h3></div>
          <span className="winner-crown" aria-hidden="true">✦</span>
        </div>
        <div className="tenant-report-table-wrap">
          <table className="tenant-report-table">
            <thead><tr><th>{text.tickets}</th><th>{text.merchant}</th><th>{text.details}</th><th>{text.payouts}</th></tr></thead>
            <tbody>
              {(report.biggestWins ?? []).length ? report.biggestWins.map((winner: Row) => (
                <tr key={winner.ticketNumber}>
                  <td><span className="draw-number-tag">{winner.ticketNumber}</span></td>
                  <td>{winner.merchantName ?? "—"}</td>
                  <td><strong>{winner.gameName ?? "—"}</strong><small className="tenant-report-subline">{winner.drawNumber ? `${text.draw} ${winner.drawNumber}` : "—"} · {(winner.lines ?? []).map((line: Row) => line.selectionKey).join(", ") || "—"}</small></td>
                  <td className="report-number-cell winner-amount">{currencyValue(winner.amount, currency, language)}</td>
                </tr>
              )) : <tr><td colSpan={4} className="tenant-report-table-empty">{text.noWinners}</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
