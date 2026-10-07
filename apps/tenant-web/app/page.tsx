"use client";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import "./styles.css";
import DeviceActions from "./device-actions";
import MerchantActions from "./merchant-actions";
import UserActions from "./user-actions";
import ManualResults from "./manual-results";
import { LotteryCompact, LotterySchedules, ManualResultsPage, PublishedResults } from "./lottery-pages";
import { localizedColumn, useI18n } from "./i18n";
import { describeDraw } from "./draw-label";
import {
  formatTenantApiError,
  normalizeMerchantCreateForm,
} from "./tenant-api-feedback";
import { tenantMobileTabs, tenantTabFromSearch, tenantTabHref } from "./tenant-navigation";
import TenantReports from "./tenant-reports";
import TenantLotterySettings from "./tenant-lottery-settings";
import { refreshWebSession } from "./session-refresh";
import { brandingImageIssue, prepareBrandingImage, type BrandingImageIssue, type BrandingImageKind } from "./branding-image";
const COUNTRIES: [string, string][] = [
  ["HT", "Haiti · HTG"],
  ["US", "United States · USD"],
  ["CA", "Canada · CAD"],
  ["DO", "Dominican Republic · DOP"],
  ["JM", "Jamaica · JMD"],
  ["BS", "Bahamas · BSD"],
  ["BB", "Barbados · BBD"],
  ["BZ", "Belize · BZD"],
  ["TT", "Trinidad and Tobago · TTD"],
  ["GY", "Guyana · GYD"],
  ["SR", "Suriname · SRD"],
  ["MX", "Mexico · MXN"],
  ["BR", "Brazil · BRL"],
  ["AR", "Argentina · ARS"],
  ["BO", "Bolivia · BOB"],
  ["CL", "Chile · CLP"],
  ["CO", "Colombia · COP"],
  ["CR", "Costa Rica · CRC"],
  ["CU", "Cuba · CUP"],
  ["EC", "Ecuador · USD"],
  ["SV", "El Salvador · USD"],
  ["GT", "Guatemala · GTQ"],
  ["HN", "Honduras · HNL"],
  ["NI", "Nicaragua · NIO"],
  ["PA", "Panama · USD"],
  ["PY", "Paraguay · PYG"],
  ["PE", "Peru · PEN"],
  ["UY", "Uruguay · UYU"],
  ["VE", "Venezuela · VES"],
  ["PR", "Puerto Rico · USD"],
  ["GB", "United Kingdom · GBP"],
  ["FR", "France · EUR"],
  ["ES", "Spain · EUR"],
  ["DE", "Germany · EUR"],
  ["PT", "Portugal · EUR"],
  ["IT", "Italy · EUR"],
  ["NL", "Netherlands · EUR"],
  ["BE", "Belgium · EUR"],
  ["CH", "Switzerland · CHF"],
  ["IE", "Ireland · EUR"],
  ["AU", "Australia · AUD"],
  ["NZ", "New Zealand · NZD"],
  ["JP", "Japan · JPY"],
  ["CN", "China · CNY"],
  ["IN", "India · INR"],
  ["PH", "Philippines · PHP"],
  ["NG", "Nigeria · NGN"],
  ["GH", "Ghana · GHS"],
  ["ZA", "South Africa · ZAR"],
];
const COUNTRY_NAMES: Record<string, { ht: string; fr: string }> = {
  HT:{ht:"Ayiti",fr:"Haïti"},US:{ht:"Etazini",fr:"États-Unis"},CA:{ht:"Kanada",fr:"Canada"},DO:{ht:"Repiblik Dominikèn",fr:"République dominicaine"},JM:{ht:"Jamayik",fr:"Jamaïque"},BS:{ht:"Bahamas",fr:"Bahamas"},BB:{ht:"Babados",fr:"Barbade"},BZ:{ht:"Beliz",fr:"Belize"},TT:{ht:"Trinidad ak Tobago",fr:"Trinité-et-Tobago"},GY:{ht:"Giyàn",fr:"Guyana"},SR:{ht:"Sirinam",fr:"Suriname"},MX:{ht:"Meksik",fr:"Mexique"},BR:{ht:"Brezil",fr:"Brésil"},AR:{ht:"Ajantin",fr:"Argentine"},BO:{ht:"Bolivi",fr:"Bolivie"},CL:{ht:"Chili",fr:"Chili"},CO:{ht:"Kolonbi",fr:"Colombie"},CR:{ht:"Kosta Rika",fr:"Costa Rica"},CU:{ht:"Kiba",fr:"Cuba"},EC:{ht:"Ekwatè",fr:"Équateur"},SV:{ht:"Salvadò",fr:"Salvador"},GT:{ht:"Gwatemala",fr:"Guatemala"},HN:{ht:"Ondiras",fr:"Honduras"},NI:{ht:"Nikaragwa",fr:"Nicaragua"},PA:{ht:"Panama",fr:"Panama"},PY:{ht:"Paragwe",fr:"Paraguay"},PE:{ht:"Pewou",fr:"Pérou"},UY:{ht:"Irigwe",fr:"Uruguay"},VE:{ht:"Venezyela",fr:"Venezuela"},PR:{ht:"Pòtoriko",fr:"Porto Rico"},GB:{ht:"Wayòm Ini",fr:"Royaume-Uni"},FR:{ht:"Lafrans",fr:"France"},ES:{ht:"Espay",fr:"Espagne"},DE:{ht:"Almay",fr:"Allemagne"},PT:{ht:"Pòtigal",fr:"Portugal"},IT:{ht:"Itali",fr:"Italie"},NL:{ht:"Peyiba",fr:"Pays-Bas"},BE:{ht:"Bèljik",fr:"Belgique"},CH:{ht:"Swis",fr:"Suisse"},IE:{ht:"Iland",fr:"Irlande"},AU:{ht:"Ostrali",fr:"Australie"},NZ:{ht:"Nouvèl Zelann",fr:"Nouvelle-Zélande"},JP:{ht:"Japon",fr:"Japon"},CN:{ht:"Lachin",fr:"Chine"},IN:{ht:"End",fr:"Inde"},PH:{ht:"Filipin",fr:"Philippines"},NG:{ht:"Nijerya",fr:"Nigéria"},GH:{ht:"Gana",fr:"Ghana"},ZA:{ht:"Afrik di Sid",fr:"Afrique du Sud"},
};
function countryLabel(code: string, label: string, language: "ht" | "fr") {
  const currency = label.split(" · ").slice(1).join(" · ");
  const name = COUNTRY_NAMES[code]?.[language] ?? label.split(" · ")[0];
  return currency ? `${name} · ${currency}` : name;
}
const RAW_API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const API = RAW_API.replace(/\/$/, "").endsWith("/api/v1")
  ? RAW_API.replace(/\/$/, "")
  : RAW_API.replace(/\/$/, "") + "/api/v1";
const RESET_URL =
  process.env.NEXT_PUBLIC_PASSWORD_RESET_URL ??
  "https://lottivexa-public-site.onrender.com/reset-password";
type Row = Record<string, any>;
type Tab =
  | "dashboard"
  | "branches"
  | "merchants"
  | "users"
  | "lottery"
  | "lotterySchedules"
  | "manualResults"
  | "results"
  | "tickets"
  | "finance"
  | "devices"
  | "printers"
  | "reports"
  | "branding"
  | "audit";
const NAV: { id: Tab; label: string; permission?: string; feature?: string }[] =
  [
    { id: "dashboard", label: "Dashboard" },
    {
      id: "branding",
      label: "Settings & Domains",
      permission: "settings.view",
    },
    { id: "tickets", label: "Tickets", permission: "tickets.view" },
    { id: "lottery", label: "Loteries", permission: "tickets.view" },
    { id: "lotterySchedules", label: "Horaires des tirages", permission: "settings.view" },
    { id: "manualResults", label: "Saisir un résultat", permission: "settings.edit" },
    { id: "results", label: "Résultats", permission: "tickets.view" },
    { id: "merchants", label: "Merchants", permission: "merchants.view" },
    { id: "branches", label: "Biwo / Santral", permission: "branches.view" },
    { id: "users", label: "Users & Roles", permission: "users.view" },
    {
      id: "finance",
      label: "Finance",
      permission: "finance.view",
      feature: "finance",
    },
    {
      id: "devices",
      label: "Devices",
      permission: "devices.view",
      feature: "device_management",
    },
    { id: "printers", label: "Printers", permission: "printers.view" },
    { id: "reports", label: "Reports", permission: "reports.view" },
    {
      id: "audit",
      label: "Audit Logs",
      permission: "audit.view",
      feature: "audit_logs",
    },
  ];
function claims(token: string) {
  try {
    return JSON.parse(
      atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")),
    );
  } catch {
    return { permissions: [] };
  }
}
function money(v: any, currency = "USD") {
  const code = /^[A-Z]{3}$/.test(currency) ? currency : "USD";
  const amount = Number(v ?? 0);
  const safeAmount = Number.isFinite(amount) ? amount : 0;
  try {
    const digits = new Intl.NumberFormat("en-US", { style: "currency", currency: code }).resolvedOptions().maximumFractionDigits;
    return "$" + new Intl.NumberFormat("fr-HT", { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(safeAmount);
  } catch {
    return `$${new Intl.NumberFormat("fr-HT", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(safeAmount)}`;
  }
}

function currencySymbol(value: unknown) {
  return typeof value === "string" && /^[A-Z]{3}$/.test(value) ? "$" : "$";
}
function haitiToday(value = new Date()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Port-au-Prince",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
      .formatToParts(value)
      .map((x) => [x.type, x.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}`;
}
function shiftDate(date: string, days: number) {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}
function val(form: HTMLFormElement) {
  return Object.fromEntries(new FormData(form)) as Row;
}
function uuid() {
  return crypto.randomUUID();
}
function Table({
  rows,
  columns,
  actions,
}: {
  rows: Row[];
  columns: [string, string][];
  actions?: (r: Row) => React.ReactNode;
}) {
  const { language, t } = useI18n();
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c[0]}>{localizedColumn(c[1], language)}</th>
            ))}
            {actions && <th>{t("table.actions")}</th>}
          </tr>
        </thead>
        <tbody>
          {rows.length ? (
            rows.map((r, i) => (
              <tr key={r.id ?? i}>
                {columns.map((c) => {
                  const raw = c[0].split(".").reduce((x: any, k) => x?.[k], r);
                  const value =
                    c[0].toLowerCase() === "currency"
                      ? currencySymbol(raw)
                      : c[0].toLowerCase() === "officekind"
                        ? raw === "CENTRAL" ? "Santral" : "Biwo"
                        : c[0].toLowerCase() === "countrycode"
                          ? COUNTRIES.find(([code]) => code === raw)?.[1]?.split("·")[0].trim() ?? String(raw ?? "—")
                      : /(amount|balance|sales|commission|payout|cash|price)/i.test(
                            c[0],
                          ) &&
                          raw != null &&
                          Number.isFinite(Number(raw))
                        ? money(raw, String(r.currency ?? "USD"))
                        : String(raw ?? "—");
                  return <td key={c[0]}>{value}</td>;
                })}
                {actions && <td className="actions">{actions(r)}</td>}
              </tr>
            ))
          ) : (
            <tr>
              <td
                colSpan={columns.length + (actions ? 1 : 0)}
                className="empty"
              >
                {t("table.empty")}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
export default function TenantConsole() {
  const { language, t } = useI18n();
  const [token, setToken] = useState(""),
    [refresh, setRefresh] = useState(""),
    [force, setForce] = useState(false),
    [tab, setTab] = useState<Tab>("dashboard"),
    [tabReady, setTabReady] = useState(false),
    [data, setData] = useState<Record<string, any>>({}),
    [features, setFeatures] = useState<string[]>([]),
    [ticketDetails, setTicketDetails] = useState<Row | null>(null),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  const permissions = useMemo<string[]>(
    () => claims(token).permissions ?? [],
    [token],
  );
  const can = (p: string) => permissions.includes(p),
    has = (f: string) => features.includes(f);
  const availableTabs = useMemo(
    () => NAV.filter((n) => (!n.permission || can(n.permission)) && (!n.feature || has(n.feature))).map((n) => n.id),
    [permissions, features],
  );
  useEffect(() => {
    setToken(localStorage.getItem("tenant_access") ?? "");
    setRefresh(localStorage.getItem("tenant_refresh") ?? "");
    setForce(localStorage.getItem("tenant_force_password") === "true");
  }, []);
  useEffect(() => {
    const syncTab = () => setTab(tenantTabFromSearch(window.location.search, availableTabs) as Tab);
    syncTab();
    setTabReady(true);
    window.addEventListener("popstate", syncTab);
    return () => window.removeEventListener("popstate", syncTab);
  }, [availableTabs]);
  const navigateTab = useCallback((next: Tab) => {
    window.history.pushState({ tenantTab: next }, "", tenantTabHref(window.location.href, next));
    setTab(next);
  }, []);
  const logout = useCallback(() => {
    localStorage.removeItem("tenant_access");
    localStorage.removeItem("tenant_refresh");
    localStorage.removeItem("tenant_force_password");
    setToken("");
    setRefresh("");
    setData({});
    setFeatures([]);
  }, []);
  const request = useCallback(
    async (path: string, init: RequestInit = {}) => {
      let access = localStorage.getItem("tenant_access") ?? token;
      const send = () =>
        fetch(`${API}${path}`, {
          ...init,
          headers: {
            ...(!(init.body instanceof FormData)
              ? { "content-type": "application/json" }
              : {}),
            authorization: `Bearer ${access}`,
            "x-lottivexa-client-app": "tenant-web",
            ...init.headers,
          },
        });
      let response = await send();
      if (response.status === 401) {
        const renewed = await refreshWebSession(API, "tenant", access, refresh);
        if (renewed) {
          access = renewed.accessToken;
          setToken(renewed.accessToken);
          setRefresh(renewed.refreshToken);
          response = await send();
        } else logout();
      }
      const body = await response.json().catch(() => ({}));
      if (!response.ok)
        throw new Error(formatTenantApiError(body, response.status, language));
      return body;
    },
    [token, refresh, logout, language],
  );
  const downloadSalesReport = useCallback(
    async (from: string, to: string, merchantIds: string[] = [], branchId = "") => {
      const query = new URLSearchParams({ from, to });
      if (merchantIds.length) query.set("merchantIds", merchantIds.join(","));
      if (branchId) query.set("branchId", branchId);
      const access = localStorage.getItem("tenant_access") ?? token;
      const response = await fetch(`${API}/reports/sales.pdf?${query}`, {
        headers: { authorization: `Bearer ${access}` },
      });
      if (!response.ok) throw new Error("Report PDF download failed.");
      const url = URL.createObjectURL(await response.blob());
      const a = document.createElement("a");
      a.href = url;
      a.download = `lottivexa-sales-${from}-${to}.pdf`;
      a.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    },
    [token],
  );
  const run = useCallback(
    async (action: () => Promise<any>, success?: string) => {
      setBusy(true);
      setMessage("");
      try {
        const result = await action();
        if (success) setMessage(success);
        return result;
      } catch (e) {
        const code = e instanceof Error ? e.message : String(e);
        const appMessages: Record<string, { ht: string; fr: string }> = {
          NUMBER_BLOCKED: { ht: "Boul sa a bloke. Li entèdi pou jwe li.", fr: "Ce numéro est bloqué. Il est interdit de le jouer." },
          MERCHANT_ACCOUNT_CANNOT_LOGIN_TENANT_APP: { ht: "Kont machann sa a dwe itilize aplikasyon Machann nan.", fr: "Ce compte vendeur doit utiliser l’application Marchand." },
          TENANT_ACCOUNT_CANNOT_LOGIN_MERCHANT_APP: { ht: "Kont tenant sa a dwe itilize aplikasyon Tenant lan.", fr: "Ce compte administrateur doit utiliser l’application Tenant." },
          MERCHANT_ACCOUNT_INACTIVE: { ht: "Kont machann sa a pa aktif. Kontakte administratè Tenant lan.", fr: "Ce compte vendeur est inactif. Contactez l’administrateur Tenant." },
        };
        if (appMessages[code]) { setMessage(appMessages[code][language]); return; }
        setMessage(code === "TENANT_COUNTRY_LOCKED_AFTER_FIRST_TICKET"
          ? language === "fr"
            ? "Le pays et la devise ne peuvent plus changer après la première vente, car cela modifierait l’historique financier."
            : "Peyi ak lajan an pa ka chanje apre premye tikè a, paske sa ta chanje valè tranzaksyon ki deja anrejistre yo."
          : code === "UNSUPPORTED_COUNTRY"
            ? language === "fr" ? "Ce pays n’est pas encore pris en charge. Choisissez un pays dans la liste." : "Peyi sa a poko sipòte. Chwazi yon peyi nan lis la."
            : code);
      } finally {
        setBusy(false);
      }
    },
    [language],
  );
  const load = useCallback(
    async (current: Tab = tab) => {
      const endpoints: Record<Tab, string[]> = {
        dashboard: [
          `/reports/sales?from=${haitiToday()}&to=${haitiToday()}`,
          "/reports/sales?from=" + shiftDate(haitiToday(), -6) + "&to=" + haitiToday(),
          "/tickets",
          "/branches",
          "/merchants",
          "/notifications?unread=true",
        ],
        branches: ["/branches", "/settings"],
        merchants: ["/merchants", "/branches", "/settings"],
        users: ["/users", "/roles", "/permissions"],
        lottery: ["/lottery/games"],
        lotterySchedules: ["/lottery/games"],
        manualResults: ["/lottery/draws"],
        results: ["/lottery/draws"],
        tickets: ["/tickets", "/lottery/draws"],
        finance: [
          "/finance/accounts",
          "/finance/ledger",
          "/finance/trial-balance",
          "/cash/sessions",
        ],
        devices: ["/devices", "/branches", "/merchants"],
        printers: [
          "/printing/printers",
          "/branches",
          "/printing/templates",
          "/printing/receipt-branding",
        ],
        reports: [
          `/reports/sales?from=${shiftDate(haitiToday(), -29)}&to=${haitiToday()}`,
          `/reports/draws?from=${shiftDate(haitiToday(), -29)}&to=${haitiToday()}`,
        ],
        branding: ["/settings", "/domains", "/lottery/settings", "/branches"],
        audit: ["/audit?limit=100"],
      };
      const values = await run(() =>
        Promise.all(endpoints[current].map((x) => request(x))),
      );
      if (values) setData((old) => ({ ...old, [current]: values }));
    },
    [tab, request, run],
  );
  useEffect(() => {
    if (token && !force)
      void request("/settings")
        .then((s) =>
          setFeatures(
            (s.subscription?.plan?.features ?? [])
              .filter((x: Row) => x.enabled)
              .map((x: Row) => x.key),
          ),
        )
        .catch(() => setFeatures([]));
  }, [token, force, request]);
  useEffect(() => {
    if (tabReady && token && !force) void load(tab);
  }, [tab, tabReady, token, force, load]);
  const tenantBranding = data.branding?.[0]?.branding ?? {};
  useEffect(() => {
    if (!tenantBranding.faviconUrl) return;
    let icon = document.querySelector<HTMLLinkElement>('link[data-tenant-favicon]');
    if (!icon) { icon = document.createElement('link'); icon.rel = 'icon'; icon.dataset.tenantFavicon = 'true'; document.head.appendChild(icon); }
    icon.href = tenantBranding.faviconUrl;
  }, [tenantBranding.faviconUrl]);
  async function login(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const body = { ...val(e.currentTarget), clientApp: "tenant-web" };
    const result = await run(async () => {
      const response = await fetch(`${API}/auth/login`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        }),
        payload = await response.json();
      if (!response.ok) {
        const code =
          payload?.error?.code ??
          payload?.code ??
          payload?.message ??
          "INVALID_CREDENTIALS";
        throw new Error(
          code === "ACCOUNT_DISABLED_CONTACT_ADMIN"
            ? "Kont sa a dezaktive. Kontakte administratè ki sou tèt ou."
            : code === "MERCHANT_ACCOUNT_CANNOT_LOGIN_TENANT_APP" || code === "TENANT_ACCOUNT_CANNOT_LOGIN_MERCHANT_APP"
              ? formatTenantApiError(payload, 401, language)
            : code,
        );
      }
      return payload;
    }, "Koneksyon reyisi.");
    if (result) {
      localStorage.setItem("tenant_access", result.accessToken);
      localStorage.setItem("tenant_refresh", result.refreshToken);
      localStorage.setItem(
        "tenant_force_password",
        String(result.forcePasswordChange),
      );
      setToken(result.accessToken);
      setRefresh(result.refreshToken);
      setForce(result.forcePasswordChange);
    }
  }
  async function submit(
    e: FormEvent<HTMLFormElement>,
    path: string,
    transform: (x: Row) => any = (x) => x,
    method = "POST",
    success = "Operasyon an reyisi.",
  ) {
    e.preventDefault();
    const form = e.currentTarget,
      result = await run(
        () =>
          request(path, { method, body: JSON.stringify(transform(val(form))) }),
        success,
      );
    if (result) {
      form.reset();
      await load(tab);
    }
  }
  async function openTicket(ticket: Row) {
    const detail = await run(() => request(`/tickets/${encodeURIComponent(ticket.ticketNumber)}`));
    if (detail) setTicketDetails(detail);
  }
  async function cancelTicket(ticket: Row, reason: string) {
    if (
      !window.confirm(
        `Anile definitivman tikè ${ticket.ticketNumber}? Li pap efase nan audit finansye a.`,
      )
    )
      return;
    const result = await run(
      () =>
        request(`/tickets/${encodeURIComponent(ticket.ticketNumber)}/cancel`, {
          method: "POST",
          body: JSON.stringify({ reason }),
        }),
      "Tikè a anile definitivement; dosye audit la rete.",
    );
    if (result) {
      setTicketDetails(result);
      await load("tickets");
      setMessage("Tikè a anile definitivement; dosye audit la rete.");
    }
  }
  if (!token)
    return (
      <main className="login">
        <div className="logo login-logo-wrap"><img className="lottivexa-full-logo" src="/lottivexa-logo.png" alt="LOTTIVEXA" /></div>
        <h1>Tenant Admin</h1>
        <p className="muted">
          Antre nan espas biznis ou. Pa gen enskripsyon merchant.
        </p>
        <form onSubmit={login}>
          <label>
            Tenant / subdomain
            <input name="tenant" required />
          </label>
          <label>
            Username / phone
            <input name="username" required />
          </label>
          <label>
            Password
            <input name="password" type="password" minLength={8} required />
          </label>
          <button disabled={busy}>Login</button>
        </form>
        <a href={RESET_URL}>Forgot password?</a>
        {message && <p className="message">{message}</p>}
      </main>
    );
  if (force)
    return (
      <main className="login">
        <div className="logo login-logo-wrap"><img className="lottivexa-full-logo" src="/lottivexa-logo.png" alt="LOTTIVEXA" /></div>
        <h1>Chanje modpas tanporè</h1>
        <p>Ou dwe mete yon nouvo modpas avan ou antre nan sistèm nan.</p>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const form = e.currentTarget,
              result = await run(
                () =>
                  request("/users/me/change-password", {
                    method: "POST",
                    body: JSON.stringify(val(form)),
                  }),
                "Modpas chanje. Konekte ankò.",
              );
            if (result) setTimeout(logout, 800);
          }}
        >
          <label>
            Modpas aktyèl
            <input name="currentPassword" type="password" required />
          </label>
          <label>
            Nouvo modpas
            <input name="newPassword" type="password" minLength={12} required />
          </label>
          <button>Chanje modpas</button>
        </form>
        <button className="secondary" onClick={logout}>
          Retounen login
        </button>
        {message && <p className="message">{message}</p>}
      </main>
    );
  const current = data[tab] ?? [];
  return (
    <div className="shell" style={{ "--tenant-primary": tenantBranding.primaryColor ?? "#172554", "--tenant-secondary": tenantBranding.secondaryColor ?? "#f59e0b" } as any}>
      <aside>
        <div className="logo">{tenantBranding.logoUrl ? <img src={tenantBranding.logoUrl} alt={tenantBranding.businessName ?? "Logo"} /> : <span className="lottivexa-brand"><img src="/lottivexa-brand-mark-192.png" alt="" /><span>LOTTIVEXA</span></span>}</div>
        {NAV.filter(
          (n) =>
            (!n.permission || can(n.permission)) &&
            (!n.feature || has(n.feature)),
        ).map((n) => (
          <button
            key={n.id}
            className={tab === n.id ? "active" : ""}
            onClick={() => navigateTab(n.id)}
          >
            {n.label}
          </button>
        ))}
      </aside>
      <main className="content">
        <header>
          <div>
            <small>TENANT CONSOLE</small>
            <h1>{NAV.find((n) => n.id === tab)?.label}</h1>
          </div>
          <button
            className="secondary"
            onClick={() => load(tab)}
            disabled={busy}
          >
            ↻ Reload
          </button>
          <button className="secondary logout-button" onClick={logout}>Logout</button>
        </header>
        {message && <p className="message">{message}</p>}
        {tab === "dashboard" && (
          <Dashboard data={current} onViewReports={() => navigateTab("reports")} />
        )}{" "}
        {tab === "branches" && (
          <Branches data={current} submit={submit} can={can} />
        )}{" "}
        {tab === "merchants" && (
          <Merchants
            data={current}
            submit={submit}
            request={request}
            load={load}
            can={can}
          />
        )}{" "}
        {tab === "users" && (
          <Users
            data={current}
            submit={submit}
            request={request}
            load={load}
            can={can}
            has={has}
          />
        )}{" "}
        {tab === "lottery" && (
          <Lottery
            data={current}
            submit={submit}
            request={request}
            load={load}
            can={can}
          />
        )}{" "}
        {tab === "lotterySchedules" && <LotterySchedules games={current[0] ?? []} request={request} reload={() => load("lotterySchedules")} can={can} />}{" "}
        {tab === "manualResults" && <ManualResultsPage draws={current[0] ?? []} request={request} reload={() => load("manualResults")} />}{" "}
        {tab === "results" && <PublishedResults draws={current[0] ?? []} />}{" "}
        {tab === "tickets" && (
          <Tickets data={current} request={request} can={can} currency={data.dashboard?.[0]?.currency ?? "USD"} onOpen={openTicket} onCancel={cancelTicket} />
        )}{" "}
        {tab === "finance" && <Finance data={current} submit={submit} />}{" "}
        {tab === "devices" && (
          <Devices
            data={current}
            submit={submit}
            request={request}
            load={load}
            can={can}
          />
        )}{" "}
        {tab === "printers" && (
          <Printers data={current} submit={submit} has={has} />
        )}{" "}
        {tab === "reports" && (
          <TenantReports data={current} request={request} run={run} downloadReport={downloadSalesReport} canExport={can("reports.export")} />
        )}{" "}
        {tab === "branding" && (
          <Branding
            data={current}
            submit={submit}
            request={request}
            load={load}
            has={has}
            can={can}
          />
        )}{" "}
        {tab === "audit" && <Audit data={current} />}
      </main>
      <nav className="tenant-bottom-nav" aria-label={language === "fr" ? "Navigation principale" : "Navigasyon prensipal"}>
        {tenantMobileTabs(availableTabs).map((id) => <button key={id} type="button" className={tab === id ? "active" : ""} aria-current={tab === id ? "page" : undefined} onClick={() => navigateTab(id as Tab)}><span className={`tenant-tab-icon icon-${id}`} aria-hidden="true">{id === "dashboard" ? "⌂" : id === "results" ? "●" : id === "reports" ? "▤" : "▣"}</span><span>{t(`nav.${id}` as any)}</span></button>)}
      </nav>
      {ticketDetails && (
        <TicketDetailsDialog
          ticket={ticketDetails}
          currency={data.dashboard?.[0]?.currency ?? "USD"}
          canCancel={can("tickets.cancel")}
          onClose={() => setTicketDetails(null)}
          onCancel={cancelTicket}
        />
      )}
    </div>
  );
}
function Dashboard({
  data: d,
  onViewReports,
}: {
  data: any[];
  onViewReports: () => void;
}) {
  const { t, language } = useI18n();
  const [r = {}, trend = {}, tickets = [], branches = [], merchants = [], notes = []] = d;
  const french = language === "fr";
  const copy = french
    ? {
        eyebrow: "VUE D’ENSEMBLE",
        title: "Tableau de bord",
        subtitle: "Suivez les ventes, les paiements et l’activité de votre réseau.",
        period: "Aujourd’hui en Haïti",
        weekly: "Activité des 7 derniers jours",
        weeklyHint: "Ventes quotidiennes de tickets",
        report: "Voir les rapports",
        operations: "Votre réseau",
        recent: "Tickets récents",
        ticket: "Ticket",
        status: "Statut",
        amount: "Montant",
        date: "Date",
        empty: "Aucun ticket récent.",
        weekTotal: "Ventes sur 7 jours",
        active: "actifs",
      }
    : {
        eyebrow: "REZIME JENERAL",
        title: "Tablo de bò",
        subtitle: "Swiv lavant, peman ak aktivite tout rezo biznis ou a.",
        period: "Jodi a ann Ayiti",
        weekly: "Aktivite 7 dènye jou yo",
        weeklyHint: "Lavant tikè chak jou",
        report: "Gade rapò detaye",
        operations: "Rezo biznis la",
        recent: "Dènye tikè yo",
        ticket: "Tikè",
        status: "Estati",
        amount: "Montan",
        date: "Dat",
        empty: "Pa gen nouvo tikè.",
        weekTotal: "Vant nan 7 jou",
        active: "aktif",
      };
  const today = new Intl.DateTimeFormat(french ? "fr-FR" : "fr-HT", {
    timeZone: "America/Port-au-Prince",
    dateStyle: "full",
  }).format(new Date());
  const currency = String(r.currency ?? trend.currency ?? "USD");
  const currencyTotals: Row[] = r.currencyTotals ?? [];
  const multiCurrency = currencyTotals.length > 1;
  const formatAmount = (value: unknown, code = currency) => money(value, code);
  const formatMetric = (field: string, fallback: unknown) => multiCurrency
    ? currencyTotals.map((row) => `${formatAmount(row[field], row.currencyCode)} ${row.currencyCode}`).join(" · ")
    : formatAmount(currencyTotals[0]?.[field] ?? fallback, currencyTotals[0]?.currencyCode ?? currency);
  const days = (trend.byDay ?? []) as Array<{ day: string; currencyCode?: string; count: number; amount: string }>;
  const chartGroups = multiCurrency
    ? currencyTotals.map((row) => ({ currencyCode: String(row.currencyCode), rows: days.filter((day) => day.currencyCode === row.currencyCode) }))
    : [{ currencyCode: String(currencyTotals[0]?.currencyCode ?? currency), rows: days }];
  const weeklyTotals = chartGroups.map((group) => ({
    currencyCode: group.currencyCode,
    amount: group.rows.reduce((sum, row) => sum + Number(row.amount ?? 0), 0),
  }));
  const weeklyTotal = multiCurrency
    ? weeklyTotals.map((row) => `${formatAmount(row.amount, row.currencyCode)} ${row.currencyCode}`).join(" · ")
    : formatAmount(weeklyTotals[0]?.amount ?? 0, weeklyTotals[0]?.currencyCode ?? currency);
  const sales = Number(r.tickets?.sales ?? 0);
  const net = Number(r.accounting?.netSales ?? (
    sales - Number(r.payouts?.amount ?? 0) - Number(r.commission ?? 0)
  ));
  const activeMerchants = merchants.filter((merchant: Row) => merchant.status === "ACTIVE").length;
  const statusLabel = (value: string) => {
    const labels: Record<string, { ht: string; fr: string }> = {
      VALID: { ht: "Valab", fr: "Valide" },
      WINNER: { ht: "Gayan", fr: "Gagnant" },
      WON: { ht: "Gayan", fr: "Gagnant" },
      PAID: { ht: "Peye", fr: "Payé" },
      LOST: { ht: "Pedi", fr: "Perdu" },
      PENDING: { ht: "An atant", fr: "En attente" },
      CANCELLED: { ht: "Anile", fr: "Annulé" },
      VOID: { ht: "Anile", fr: "Annulé" },
    };
    return labels[value.toUpperCase()]?.[french ? "fr" : "ht"] ?? value.replace(/_/g, " ");
  };
  const formatTicketDate = (value: string) => {
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? "—"
      : new Intl.DateTimeFormat(french ? "fr-FR" : "fr-HT", {
          timeZone: "America/Port-au-Prince",
          day: "2-digit",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
          hourCycle: "h23",
        }).format(date);
  };

  return (
    <div className="tenant-dashboard">
      <section className="dashboard-hero">
        <div className="dashboard-hero-copy">
          <span className="dashboard-eyebrow"><i />{copy.eyebrow}</span>
          <h2>{copy.title}</h2>
          <p>{copy.subtitle}</p>
          <div className="dashboard-hero-meta">
            <span className="dashboard-date-mark"><b />{copy.period}</span>
            <span>{today}</span>
          </div>
        </div>
        <div className="dashboard-hero-side">
          <div className="dashboard-hero-total">
            <span>{t("dashboard.today")}</span>
            <strong>{formatMetric("sales", sales)}</strong>
            <small>{r.tickets?.count ?? tickets.length} {t("dashboard.tickets").toLowerCase()}</small>
          </div>
          <button type="button" className="dashboard-report-link" onClick={onViewReports}>
            {copy.report}<span aria-hidden="true">→</span>
          </button>
        </div>
        <div className="dashboard-hero-glow" aria-hidden="true" />
      </section>

      <section className="dashboard-metrics" aria-label={copy.title}>
        <article className="dashboard-metric metric-blue">
          <span className="dashboard-metric-icon">↗</span>
          <span className="dashboard-metric-label">{t("dashboard.today")}</span>
          <strong>{formatMetric("sales", sales)}</strong>
          <small>{r.tickets?.count ?? tickets.length} {t("dashboard.tickets").toLowerCase()}</small>
        </article>
        <article className="dashboard-metric metric-green">
          <span className="dashboard-metric-icon">◎</span>
          <span className="dashboard-metric-label">{t("dashboard.net")}</span>
          <strong>{formatMetric("netSales", net)}</strong>
          <small>{french ? "Après les paiements et commissions" : "Apre peman ak komisyon"}</small>
        </article>
        <article className="dashboard-metric metric-amber">
          <span className="dashboard-metric-icon">↙</span>
          <span className="dashboard-metric-label">{t("dashboard.payouts")}</span>
          <strong>{formatMetric("payouts", r.payouts?.amount)}</strong>
          <small>{r.payouts?.count ?? 0} {french ? "paiement(s)" : "peman"}</small>
        </article>
        <article className="dashboard-metric metric-violet">
          <span className="dashboard-metric-icon">▦</span>
          <span className="dashboard-metric-label">{t("dashboard.tickets")}</span>
          <strong>{Number(r.tickets?.count ?? tickets.length).toLocaleString(french ? "fr-FR" : "fr-HT")}</strong>
          <small>{french ? "Tickets enregistrés aujourd’hui" : "Tikè anrejistre jodi a"}</small>
        </article>
      </section>

      <section className="dashboard-network-strip">
        <div className="dashboard-network-heading">
          <span className="dashboard-eyebrow">{copy.operations}</span>
          <p>{french ? "État actuel de vos points de vente" : "Eta aktyèl pwen lavant ou yo"}</p>
        </div>
        <div className="dashboard-network-item"><span className="network-icon network-blue">⌂</span><div><strong>{branches.length}</strong><small>{t("dashboard.branches")}</small></div></div>
        <div className="dashboard-network-item"><span className="network-icon network-green">◉</span><div><strong>{activeMerchants} <i>{copy.active}</i></strong><small>{t("dashboard.merchants")}</small></div></div>
        <div className="dashboard-network-item"><span className="network-icon network-amber">!</span><div><strong>{notes.length}</strong><small>{t("dashboard.alerts")}</small></div></div>
      </section>

      <div className="dashboard-content-grid">
        <section className="dashboard-card dashboard-sales-card">
          <div className="dashboard-card-heading">
            <div><span className="dashboard-eyebrow">{copy.weekly}</span><h3>{copy.weeklyHint}</h3></div>
            <div className="dashboard-week-total"><small>{copy.weekTotal}</small><strong>{weeklyTotal}</strong></div>
          </div>
          {chartGroups.some((group) => group.rows.length) ? chartGroups.map((group) => {
            const maximum = Math.max(1, ...group.rows.map((row) => Number(row.amount ?? 0)));
            return <div className="dashboard-currency-trend" key={group.currencyCode}>
              {multiCurrency && <span className="dashboard-currency-code">{group.currencyCode}</span>}
              {group.rows.length ? <div className="dashboard-chart" role="img" aria-label={`${copy.weekly} ${group.currencyCode}`}>
                {group.rows.map((row) => {
                  const value = Number(row.amount ?? 0);
                  const height = Math.max(5, Math.round((value / maximum) * 100));
                  const day = new Date(row.day + "T12:00:00.000Z");
                  const label = new Intl.DateTimeFormat(french ? "fr-FR" : "fr-HT", {
                    timeZone: "America/Port-au-Prince",
                    weekday: "short",
                  }).format(day).replace(".", "");
                  return <div className="dashboard-chart-column" key={`${group.currencyCode}-${row.day}`} title={formatAmount(value, group.currencyCode)}>
                    <strong>{formatAmount(value, group.currencyCode)}</strong>
                    <div className="dashboard-chart-track"><span style={{ height: height + "%" }} /></div>
                    <small>{label}</small>
                  </div>;
                })}
              </div> : <div className="dashboard-chart-empty">{t("table.empty")}</div>}
            </div>;
          }) : <div className="dashboard-chart-empty">{t("table.empty")}</div>}
        </section>

        <section className="dashboard-card dashboard-highlights">
          <div className="dashboard-card-heading">
            <div><span className="dashboard-eyebrow">{french ? "EN UN COUP D’ŒIL" : "YON GAD"}</span><h3>{french ? "Indicateurs du jour" : "Chif kle jodi a"}</h3></div>
          </div>
          <div className="dashboard-highlight-row"><span>{french ? "Tickets émis" : "Tikè ki sòti"}</span><strong>{Number(r.tickets?.count ?? tickets.length).toLocaleString(french ? "fr-FR" : "fr-HT")}</strong></div>
          <div className="dashboard-highlight-row"><span>{french ? "Tickets annulés" : "Tikè anile"}</span><strong>{Number(r.accounting?.cancelledCount ?? 0).toLocaleString(french ? "fr-FR" : "fr-HT")}</strong></div>
          <div className="dashboard-highlight-row"><span>{french ? "Commissions" : "Komisyon"}</span><strong>{formatMetric("commission", r.commission)}</strong></div>
          <div className="dashboard-highlight-note"><span />{t("report.fromToday")}</div>
        </section>
      </div>

      <section className="dashboard-card dashboard-recent-card">
        <div className="dashboard-card-heading">
          <div><span className="dashboard-eyebrow">{copy.recent}</span><h3>{french ? "Dernière activité des tickets" : "Dènye aktivite sou tikè yo"}</h3></div>
          <span className="dashboard-recent-count">{tickets.length} {french ? "tickets" : "tikè"}</span>
        </div>
        <div className="dashboard-table-scroll">
          <table className="dashboard-table">
            <thead><tr><th>{copy.ticket}</th><th>{copy.status}</th><th>{copy.amount}</th><th>{copy.date}</th></tr></thead>
            <tbody>
              {tickets.length ? tickets.slice(0, 8).map((ticket: Row, index: number) => (
                <tr key={ticket.id ?? ticket.ticketNumber ?? index}>
                  <td><strong>{ticket.ticketNumber ?? "—"}</strong><small>{ticket.merchant?.displayName ?? ticket.branch?.name ?? ""}</small></td>
                  <td><span className={"dashboard-ticket-status status-" + String(ticket.status ?? "pending").toLowerCase()}>{statusLabel(String(ticket.status ?? "PENDING"))}</span></td>
                  <td className="dashboard-table-amount">{formatAmount(ticket.amount, ticket.currency ?? ticket.currencyCode ?? currency)}</td>
                  <td>{formatTicketDate(ticket.createdAt)}</td>
                </tr>
              )) : <tr><td colSpan={4} className="dashboard-table-empty">{copy.empty}</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
function Branches({ data: d, submit, can }: any) {
  const [rows = [], settings = {}] = d;
  return (
    <>
      <section className="panel">
        <h2>Kreye biwo oswa santral</h2>
        <p className="muted">Chwazi peyi kote biwo oswa santral la ye. Sa pa chanje peyi ni lajan antrepriz la.</p>
        {can("branches.create") && (
          <form className="form" onSubmit={(e) => submit(e, "/branches", (x: Row) => ({
            ...x,
            openingHours: { note: x.openingHours },
            countryCode: String(x.countryCode ?? "").trim().toUpperCase(),
          }))}>
            {[ ["code", "Kòd"], ["name", "Non biwo oswa santral"], ["address", "Adrès"], ["phone", "Telefòn"], ["openingHours", "Orè ouvèti"] ].map((x) => (
              <label key={x[0]}>{x[1]}<input name={x[0]} required={x[0] === "code" || x[0] === "name"} /></label>
            ))}
            <label>Kalite kote<select name="officeKind" defaultValue="OFFICE" required><option value="OFFICE">Biwo</option><option value="CENTRAL">Santral</option></select></label>
            <label>Peyi biwo a<select name="countryCode" defaultValue={settings.countryCode ?? ""} required><option value="" disabled>Chwazi peyi</option>{COUNTRIES.map(([code, label]) => <option value={code} key={code}>{label}</option>)}</select></label>
            <small className="form-help">Peyi biwo a rete apa. Tikè ak rapò yo kontinye sèvi ak lajan antrepriz la ki deja fikse.</small>
            <button>Kreye biwo oswa santral</button>
          </form>
        )}
      </section>
      <section className="panel"><Table rows={rows} columns={[["code", "Code"], ["name", "Name"], ["officeKind", "Type"], ["countryCode", "Country"], ["currency", "Business currency"], ["address", "Address"], ["phone", "Phone"], ["_count.merchants", "Merchants"], ["status", "Status"]]} /></section>
    </>
  );
}
function Merchants({ data: d, submit, request, load, can }: any) {
  const [rows = [], branches = [], settings = {}] = d;
  return (
    <>
      <section className="panel">
        <h2>Kreye kont machann</h2>
        <p className="muted">Machann nan pa ka enskri tèt li; administratè a kreye kont lan. Peyi li soti nan biwo oswa santral ou chwazi a.</p>
        {can("merchants.create") && (
          <form className="form" onSubmit={(e) => submit(e, "/merchants", normalizeMerchantCreateForm)}>
            <label>Display name<input name="displayName" required /></label>
            <label>Merchant number<input name="merchantNumber" required /></label>
            <label>Username<input name="username" required /></label>
            <label>Phone<input name="phone" /></label>
            <label>Email<input name="email" type="email" /></label>
            <label>Pousantaj komisyon machann nan (%)<input name="commissionPercentage" type="number" min="0" max="100" step="0.01" placeholder="Pa egzanp: 10" required /></label>
            <label>Modpas tanporè<input name="temporaryPassword" type="password" minLength={12} required /></label>
            <label>Biwo / santral<select name="branchId" required><option value="">Chwazi</option>{branches.map((b: Row) => <option key={b.id} value={b.id}>{b.officeKind === "CENTRAL" ? "Santral" : "Biwo"} · {b.name} · {COUNTRIES.find(([code]) => code === b.countryCode)?.[1]?.split("·")[0].trim() ?? b.countryCode}</option>)}</select></label>
            <small className="form-help">Peyi machann nan swiv biwo li. Tikè ak rapò yo rete nan lajan antrepriz la.</small>
            <button>Kreye machann</button>
          </form>
        )}
      </section>
      <section className="panel"><Table rows={rows} columns={[["merchantNumber", "Number"], ["displayName", "Name"], ["user.username", "Login"], ["branch.name", "Branch"], ["commissionRate", "Commission"], ["countryCode", "Country"], ["currency", "Business currency"], ["status", "Status"]]} actions={(r) => <MerchantActions row={r} request={request} load={load} can={can} branches={branches} countries={COUNTRIES} />} /></section>
    </>
  );
}
function Users({ data: d, submit, request, load, can, has }: any) {
  const [rows = [], roles = [], permissions = []] = d;
  return (
    <>
      <div className="split">
        <section className="panel">
          <h2>Create user</h2>
          {can("users.create") && (
            <form
              className="form one"
              onSubmit={(e) =>
                submit(e, "/users", (x: Row) => ({ ...x, roleIds: [x.roleId] }))
              }
            >
              <label>
                Username
                <input name="username" required />
              </label>
              <label>
                Email
                <input name="email" type="email" />
              </label>
              <label>
                Phone
                <input name="phone" />
              </label>
              <label>
                Temporary password
                <input
                  name="temporaryPassword"
                  type="password"
                  minLength={12}
                  required
                />
              </label>
              <label>
                Role
                <select name="roleId" required>
                  {roles.map((r: Row) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </label>
              <button>Create user</button>
            </form>
          )}
        </section>
        <section className="panel">
          <h2>Create granular role</h2>
          {can("users.create") && has("advanced_permissions") && (
            <form
              className="form one"
              onSubmit={(e) =>
                submit(e, "/roles", (x: Row) => ({
                  code: x.code,
                  name: x.name,
                  permissions: String(x.permissions)
                    .split(",")
                    .map((v) => v.trim())
                    .filter(Boolean),
                }))
              }
            >
              <label>
                Role code
                <input
                  name="code"
                  placeholder="PRINT_WORKER"
                  pattern="[A-Z][A-Z0-9_]{2,79}"
                  required
                />
              </label>
              <label>
                Name
                <input name="name" placeholder="Printing Worker" required />
              </label>
              <label>
                Permission codes (comma separated)
                <textarea
                  name="permissions"
                  defaultValue="printers.view, printers.configure"
                  required
                />
              </label>
              <button>Create role</button>
            </form>
          )}
          <details>
            <summary>Available permission codes</summary>
            <code className="permission-list">
              {permissions.map((p: Row) => p.code).join(", ")}
            </code>
          </details>
        </section>
      </div>
      <section className="panel">
        <h2>Users</h2>
        <Table
          rows={rows}
          columns={[
            ["username", "Username"],
            ["email", "Email"],
            ["phone", "Phone"],
            ["status", "Status"],
            ["forcePasswordChange", "Password change"],
          ]}
          actions={(r) => (
            <UserActions
              row={r}
              roles={roles}
              request={request}
              load={load}
              can={can}
            />
          )}
        />
      </section>
      <section className="panel">
        <h2>Roles</h2>
        <Table
          rows={roles.map((r: Row) => ({
            ...r,
            permissionCount: r.permissions?.length ?? 0,
          }))}
          columns={[
            ["code", "Code"],
            ["name", "Name"],
            ["permissionCount", "Permissions"],
            ["isSystem", "System"],
          ]}
        />
      </section>
    </>
  );
}
function Lottery({ data: d, request, load, can }: any) {
  const [games = []] = d;
  return <LotteryCompact games={games} request={request} reload={() => load("lottery")} can={can} />;
}
function LegacyLottery({ data: d, submit, request, load, can }: any) {
  const { language, t } = useI18n();
  const [games = [], draws = []] = d;
  const labeledDraws = draws.map((draw: Row) => ({
    ...draw,
    sessionLabel: describeDraw(draw, language),
  }));
  return (
    <>
      <LotterySetup
        games={games}
        draws={draws}
        request={request}
        load={load}
        can={can}
      />
      <div className="split">
        <section className="panel">
          <h2>{t("lottery.createGame")}</h2>
          {can("settings.edit") && (
            <form
              className="form one"
              onSubmit={(e) =>
                submit(e, "/lottery/games", (x: Row) => ({
                  ...x,
                  cutoffSeconds: Number(x.cutoffSeconds),
                  resultDigits: Number(x.resultDigits),
                }))
              }
            >
              <label>
                {t("lottery.betCode")}
                <input name="code" required />
              </label>
              <label>
                {t("lottery.game")}
                <input name="name" required />
              </label>
              <label>
                {t("lottery.description")}
                <input name="description" />
              </label>
              <label>
                {t("lottery.cutoffSeconds")}
                <input name="cutoffSeconds" type="number" min="0" required />
              </label>
              <label>
                {t("lottery.resultDigits")}
                <input
                  name="resultDigits"
                  type="number"
                  min="1"
                  max="20"
                  required
                />
              </label>
              <button>{t("lottery.createGame")}</button>
            </form>
          )}
        </section>
        <section className="panel">
          <h2>{t("lottery.createDraw")}</h2>
          {can("settings.edit") && (
            <form
              className="form one"
              onSubmit={(e) =>
                submit(e, "/lottery/draws", (x: Row) => ({
                  ...x,
                  drawDate: new Date(x.drawDate).toISOString(),
                  opensAt: new Date(x.opensAt).toISOString(),
                  closesAt: new Date(x.closesAt).toISOString(),
                  resultAt: new Date(x.resultAt).toISOString(),
                }))
              }
            >
              <label>
                {t("lottery.game")}
                <select name="gameId" required>
                  {games.map((g: Row) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                {t("lottery.drawNumber")}
                <input name="drawNumber" required />
              </label>
              <label>
                {t("lottery.drawDate")}
                <input name="drawDate" type="date" required />
              </label>
              <label>
                {t("lottery.opensAt")}
                <input name="opensAt" type="datetime-local" required />
              </label>
              <label>
                {t("lottery.closesAt")}
                <input name="closesAt" type="datetime-local" required />
              </label>
              <label>
                {t("lottery.resultAt")}
                <input name="resultAt" type="datetime-local" required />
              </label>
              <button>{t("lottery.createDraw")}</button>
            </form>
          )}
        </section>
      </div>
      <section className="panel">
        <h2>{t("lottery.games")}</h2>
        <Table
          rows={games}
          columns={[
            ["code", t("lottery.betCode")],
            ["name", t("lottery.game")],
            ["status", t("report.status")],
            ["cutoffSeconds", t("lottery.cutoffSeconds")],
            ["resultDigits", t("lottery.resultDigits")],
          ]}
        />
      </section>
      <section className="panel">
        <h2>{t("lottery.draws")}</h2>
        <Table
          rows={labeledDraws}
          columns={[
            ["sessionLabel", `${t("lottery.game")} / ${t("report.session")}`],
            ["status", t("report.status")],
            ["opensAt", t("lottery.opensAt")],
            ["closesAt", t("lottery.closesAt")],
          ]}
          actions={
            can("settings.edit")
              ? (r) => (
                  <>
                    {r.status === "SCHEDULED" && (
                      <button
                        onClick={async () => {
                          await request(`/lottery/draws/${r.id}/transition`, {
                            method: "POST",
                            body: JSON.stringify({ status: "OPEN" }),
                          });
                          await load("lottery");
                        }}
                      >
                        {t("lottery.activateDraw")}
                      </button>
                    )}
                    {r.status === "OPEN" && (
                      <button
                        onClick={async () => {
                          await request(`/lottery/draws/${r.id}/transition`, {
                            method: "POST",
                            body: JSON.stringify({ status: "CLOSED" }),
                          });
                          await load("lottery");
                        }}
                      >
                        {t("lottery.closeDraw")}
                      </button>
                    )}
                  </>
                )
              : undefined
          }
        />
      </section>
    </>
  );
}
function Tickets({
  data: d,
  request,
  can,
  currency,
  onOpen,
  onCancel,
}: {
  data: any[];
  request: (path: string, init?: RequestInit) => Promise<any>;
  can: (permission: string) => boolean;
  currency: string;
  onOpen: (ticket: Row) => void;
  onCancel: (ticket: Row, reason: string) => void;
}) {
  const { language } = useI18n();
  const [tickets = [], draws = []] = d;
  const [winners, setWinners] = useState<Row[]>([]), [winnersPage, setWinnersPage] = useState(1), [winnersTotal, setWinnersTotal] = useState(0), [showWinners, setShowWinners] = useState(false), [winnersBusy, setWinnersBusy] = useState(false);
  async function loadWinners(page = 1) { setWinnersBusy(true); try { const result = await request(`/tickets/winners?page=${page}`); setWinners(result.items ?? []); setWinnersTotal(result.total ?? 0); setWinnersPage(result.page ?? page); setShowWinners(true); } finally { setWinnersBusy(false); } }
  const sourceRows = showWinners ? winners : tickets;
  const rows = sourceRows.map((ticket: Row) => ({ ...ticket, currency: ticket.currency ?? ticket.currencyCode ?? currency }));
  const labels = language === "fr"
        ? { total: "Tickets chargés", draws: "Tirages ouverts", winners: "Gagnants", paid: "Payés", heading: showWinners ? "Tous les tickets gagnants" : "Tickets de l’entreprise", open: "Ouvrir", all: "Tous les tickets", next: "Suivant", previous: "Précédent" }
    : { total: "Tikè chaje", draws: "Tiraj ouvè", winners: "Gayan", paid: "Peye", heading: showWinners ? "Tout tikè ki genyen yo" : "Tikè biznis la", open: "Ouvri", all: "Tout tikè", next: "Pwochen", previous: "Anvan" };
  return (
    <>
      <div className="tenant-ticket-summary">
        <article><span>{labels.total}</span><strong>{tickets.length}</strong></article>
        <article>
          <span>{labels.draws}</span>
          <strong>
            {draws.filter((x: Row) => x.status === "OPEN").length}
          </strong>
        </article>
        <article><span>{labels.winners}</span><strong>{tickets.filter((x: Row) => x.status === "WINNER").length}</strong></article>
        <article><span>{labels.paid}</span><strong>{tickets.filter((x: Row) => x.status === "PAID").length}</strong></article>
      </div>
      <section className="panel tenant-ticket-list-panel">
        <div className="tenant-ticket-list-heading"><h2>{labels.heading}</h2><div className="tenant-ticket-filters"><button type="button" className={!showWinners ? "active" : "secondary"} onClick={() => setShowWinners(false)}>{labels.all}</button><button type="button" className={showWinners ? "active" : "secondary"} onClick={() => void loadWinners(1)}>{labels.winners}</button><span>{showWinners ? `${winners.length} / ${winnersTotal}` : `${tickets.length} / 100`}</span></div></div>
        <Table
          rows={rows}
          columns={[
            ["ticketNumber", "Ticket"],
            ["status", "Status"],
            ["amount", "Amount"],
            ["createdAt", "Date"],
          ]}
          actions={(ticket) => (
            <button className="tenant-ticket-open-button" onClick={() => onOpen(ticket)}>
              {labels.open}
            </button>
          )}
        />
        {showWinners && <div className="tenant-ticket-pagination"><button className="secondary" disabled={winnersBusy || winnersPage <= 1} onClick={() => void loadWinners(winnersPage - 1)}>{labels.previous}</button><span>{winnersPage}</span><button className="secondary" disabled={winnersBusy || winnersPage * 50 >= winnersTotal} onClick={() => void loadWinners(winnersPage + 1)}>{labels.next}</button></div>}
      </section>
    </>
  );
}

function TicketDetailsDialog({
  ticket,
  currency,
  canCancel,
  onClose,
  onCancel,
}: {
  ticket: Row;
  currency: string;
  canCancel: boolean;
  onClose: () => void;
  onCancel: (ticket: Row, reason: string) => void;
}) {
  const { language } = useI18n();
  const [reason, setReason] = useState("");
  const french = language === "fr";
  const draws = (ticket.ticketDraws ?? []).map((item: Row) => item.draw).filter(Boolean);
  const ticketDraws = draws.length ? draws : ticket.draw ? [ticket.draw] : [];
  const eligible = ticket.status === "VALID" && !ticket.payout && !ticket.winning;
  const statusNames: Record<string, { ht: string; fr: string }> = {
    VALID: { ht: "Valab", fr: "Valide" },
    WINNER: { ht: "Gayan", fr: "Gagnant" },
    LOSER: { ht: "Pèdi", fr: "Perdu" },
    PAID: { ht: "Peye", fr: "Payé" },
    CANCELLED: { ht: "Anile", fr: "Annulé" },
    VOID: { ht: "Anile", fr: "Annulé" },
    PENDING: { ht: "An atant", fr: "En attente" },
  };
  return (
    <div className="ticket-detail-overlay" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="ticket-detail-dialog" role="dialog" aria-modal="true" aria-labelledby="tenant-ticket-dialog-title">
        <header className="ticket-detail-heading">
          <div><span className="tenant-report-kicker">{french ? "DOSSIER DU TICKET" : "DOSYE TIKÈ A"}</span><h2 id="tenant-ticket-dialog-title">{ticket.ticketNumber}</h2></div>
          <button className="secondary" onClick={onClose}>{french ? "Fermer" : "Fèmen"}</button>
        </header>
        <div className="ticket-detail-summary">
          <article><small>{french ? "Statut" : "Estati"}</small><strong>{statusNames[ticket.status]?.[french ? "fr" : "ht"] ?? ticket.status}</strong></article>
          <article><small>{french ? "Montant" : "Montan"}</small><strong>{money(ticket.amount, ticket.currency ?? ticket.currencyCode ?? currency)}</strong></article>
          {Number(ticket.winning?.winningAmount ?? 0) > 0 && <article><small>{french ? "Gain confirmé" : "Gany konfime"}</small><strong>{money(ticket.winning.winningAmount, ticket.currency ?? ticket.currencyCode ?? currency)}</strong></article>}
          <article><small>{french ? "Créé le" : "Kreye le"}</small><strong>{ticket.createdAt ? new Intl.DateTimeFormat(french ? "fr-FR" : "fr-HT", { timeZone: "America/Port-au-Prince", dateStyle: "medium", timeStyle: "short" }).format(new Date(ticket.createdAt)) : "—"}</strong></article>
        </div>
        <section className="ticket-detail-section">
          <h3>{french ? "Lotteries et tirages" : "Lotri ak tiraj"}</h3>
          {ticketDraws.length ? <div className="ticket-detail-draws">{ticketDraws.map((draw: Row) => <span key={draw.id ?? draw.drawNumber}>{describeDraw(draw, language)}{draw.drawNumber ? ` · ${draw.drawNumber}` : ""}</span>)}</div> : <p>—</p>}
          <p className="ticket-detail-byline">{ticket.merchant?.displayName ?? "—"}{ticket.merchant?.branch?.name ? ` · ${ticket.merchant.branch.name}` : ""}</p>
        </section>
        <section className="ticket-detail-section">
          <h3>{french ? "Lignes du ticket" : "Liy tikè a"}</h3>
          <div className="table-wrap"><table><thead><tr><th>{french ? "Type" : "Kalite"}</th><th>{french ? "Sélection" : "Chwa"}</th><th>{french ? "Mise" : "Miz"}</th><th>{french ? "Résultat" : "Rezilta"}</th></tr></thead><tbody>
            {(ticket.lines ?? []).map((line: Row) => <tr key={line.id}><td>{line.betType?.name ?? "Bolet"}</td><td><strong>{String(line.selectionKey ?? line.selection ?? "—").replace(/@/g, " · OP ").replace(/-/g, " × ")}</strong></td><td>{line.isPromotional ? (french ? "Gratuit" : "Gratis") : money(line.stake, ticket.currency ?? ticket.currencyCode ?? currency)}</td><td>{line.isWinner ? <>{french ? "Gagnant" : "Gayan"}{Number(line.winningAmount ?? 0) > 0 ? ` · ${money(line.winningAmount, ticket.currency ?? ticket.currencyCode ?? currency)}` : ""}</> : (french ? "En attente" : "An atant")}</td></tr>)}
            {!(ticket.lines ?? []).length && <tr><td colSpan={4}>—</td></tr>}
          </tbody></table></div>
        </section>
        {canCancel && <section className="ticket-cancel-panel">
          <div><h3>{french ? "Annulation définitive" : "Anilasyon definitif"}</h3><p>{french ? "Le ticket ne pourra plus être utilisé. Son historique financier et d’audit restera conservé." : "Yo pap ka itilize tikè a ankò. Dosye finansye ak audit li ap rete konsève."}</p></div>
          {eligible ? <><label>{french ? "Motif obligatoire" : "Rezon obligatwa"}<textarea value={reason} onChange={(event) => setReason(event.target.value)} minLength={5} maxLength={240} placeholder={french ? "Expliquez pourquoi vous annulez ce ticket" : "Eksplike poukisa w ap anile tikè sa a"} /></label><button className="danger" disabled={reason.trim().length < 5} onClick={() => onCancel(ticket, reason.trim())}>{french ? "Annuler définitivement" : "Anile definitivement"}</button></> : <p className="ticket-cancel-locked">{french ? "Seuls les tickets valides non payés et sans gain enregistré peuvent être annulés." : "Se tikè ki valab, ki poko peye e ki pa gen gany anrejistre ki ka anile."}</p>}
        </section>}
      </section>
    </div>
  );
}
function Finance({ data: d, submit }: any) {
  const [accounts = [], ledger = [], balance = [], sessions = []] = d;
  return (
    <>
      <div className="cards">
        {balance.slice(0, 6).map((x: Row) => (
          <article key={x.accountId}>
            <span>{x.code ?? x.accountId}</span>
            <strong>{money(x.balance)}</strong>
          </article>
        ))}
      </div>
      <section className="panel">
        <h2>Accounts</h2>
        <Table
          rows={accounts}
          columns={[
            ["code", "Code"],
            ["name", "Account"],
            ["type", "Type"],
            ["currency", "Currency"],
          ]}
        />
      </section>
      <section className="panel">
        <h2>Cash sessions</h2>
        <Table
          rows={sessions}
          columns={[
            ["status", "Status"],
            ["merchant.displayName", "Merchant"],
            ["branch.name", "Branch"],
            ["openingCash", "Opening"],
            ["expectedCash", "Expected"],
            ["actualCash", "Actual"],
            ["differenceStatus", "Difference"],
            ["openedAt", "Opened"],
          ]}
        />
      </section>
      <section className="panel">
        <h2>Ledger</h2>
        <Table
          rows={ledger}
          columns={[
            ["reference", "Reference"],
            ["type", "Type"],
            ["description", "Description"],
            ["createdAt", "Date"],
          ]}
        />
      </section>
    </>
  );
}
function Devices({ data: d, submit, request, load, can }: any) {
  const [rows = [], branches = [], merchants = []] = d;
  return (
    <>
      <section className="panel">
        <h2>Register device</h2>
        <form
          className="form"
          onSubmit={(e) =>
            submit(e, "/devices", (x: Row) => ({
              ...x,
              merchantId: x.merchantId || undefined,
            }))
          }
        >
          <label>
            Name
            <input name="name" required />
          </label>
          <label>
            Branch
            <select name="branchId" required>
              {branches.map((b: Row) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Merchant
            <select name="merchantId">
              <option value="">Unassigned</option>
              {merchants.map((m: Row) => (
                <option key={m.id} value={m.id}>
                  {m.displayName}
                </option>
              ))}
            </select>
          </label>
          <label>
            Type
            <input
              name="deviceType"
              placeholder="PHONE / TABLET / POS"
              required
            />
          </label>
          <label>
            Platform
            <input name="platform" placeholder="ANDROID / IOS / WEB" required />
          </label>
          <label>
            OS version
            <input name="osVersion" />
          </label>
          <label>
            App version
            <input name="appVersion" />
          </label>
          <button>Register</button>
        </form>
      </section>
      <section className="panel">
        <Table
          rows={rows}
          columns={[
            ["name", "Name"],
            ["platform", "Platform"],
            ["deviceType", "Type"],
            ["status", "Status"],
            ["lastSeenAt", "Last seen"],
          ]}
          actions={(r) => (
            <DeviceActions row={r} request={request} load={load} can={can} />
          )}
        />
      </section>
    </>
  );
}
function Printers({ data: d, submit, has }: any) {
  const [rows = [], branches = [], templates = [], branding = {}] = d,
    [kind, setKind] = useState("LOTTERY_MACHINE"),
    [preview, setPreview] = useState<Row>({
      name: "Default Ticket",
      templateKind: "TICKET",
      width: "58",
      header: "",
      footer: "",
      showBarcode: "true",
      showQr: "true",
    });
  const configuration = (x: Row) =>
    x.connectionType === "NETWORK"
      ? { host: x.host, port: Number(x.port || 9100) }
      : x.connectionType === "USB"
        ? {
            devicePath: x.devicePath,
            vendorId: Number(x.vendorId || 0),
            productId: Number(x.productId || 0),
          }
        : x.connectionType === "BLUETOOTH"
          ? { devicePath: x.devicePath, deviceAddress: x.deviceAddress }
          : {
              driver: x.driver,
              host: x.host || undefined,
              port: x.host ? Number(x.port || 9100) : undefined,
              devicePath: x.devicePath || undefined,
            };
  return (
    <>
      <div className="split">
        <section className="panel">
          <h2>Add printer</h2>
          <form
            className="form one"
            onSubmit={(e) =>
              submit(e, "/printing/printers", (x: Row) => ({
                branchId: x.branchId,
                name: x.name,
                connectionType: x.connectionType,
                protocol: x.protocol,
                isDefault: x.isDefault === "true",
                configuration: configuration(x),
              }))
            }
          >
            <label>
              Name
              <input name="name" required />
            </label>
            <label>
              Branch
              <select name="branchId" required>
                {branches.map((b: Row) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Connection
              <select
                name="connectionType"
                value={kind}
                onChange={(e) => setKind(e.target.value)}
              >
                <option disabled={!has("bluetooth_printing")}>BLUETOOTH</option>
                <option disabled={!has("usb_printing")}>USB</option>
                <option disabled={!has("network_printing")}>NETWORK</option>
                <option>LOTTERY_MACHINE</option>
              </select>
            </label>
            <label>
              Protocol
              <input name="protocol" defaultValue="ESC_POS" required />
            </label>
            {kind === "NETWORK" && (
              <>
                <label>
                  Host / IP
                  <input name="host" required />
                </label>
                <label>
                  Port
                  <input
                    name="port"
                    type="number"
                    defaultValue="9100"
                    required
                  />
                </label>
              </>
            )}
            {kind === "USB" && (
              <>
                <label>
                  Linux device path
                  <input
                    name="devicePath"
                    defaultValue="/dev/usb/lp0"
                    required
                  />
                </label>
                <label>
                  Vendor ID
                  <input name="vendorId" type="number" defaultValue="0" />
                </label>
                <label>
                  Product ID
                  <input name="productId" type="number" defaultValue="0" />
                </label>
              </>
            )}
            {kind === "BLUETOOTH" && (
              <>
                <label>
                  RFCOMM device path
                  <input
                    name="devicePath"
                    defaultValue="/dev/rfcomm0"
                    required
                  />
                </label>
                <label>
                  Bluetooth address
                  <input
                    name="deviceAddress"
                    placeholder="AA:BB:CC:DD:EE:FF"
                    required
                  />
                </label>
              </>
            )}
            {kind === "LOTTERY_MACHINE" && (
              <>
                <label>
                  Adapter / driver
                  <input name="driver" required />
                </label>
                <label>
                  Host (optional)
                  <input name="host" />
                </label>
                <label>
                  Port
                  <input name="port" type="number" defaultValue="9100" />
                </label>
                <label>
                  Device path (optional)
                  <input name="devicePath" />
                </label>
              </>
            )}
            <label>
              Default
              <select name="isDefault">
                <option value="false">No</option>
                <option value="true">Yes</option>
              </select>
            </label>
            <button>Add printer</button>
          </form>
        </section>
        <section className="panel">
          <h2>Ticket / receipt designer</h2>
          <form
            className="form one"
            onChange={(e) => setPreview(val(e.currentTarget))}
            onSubmit={(e) =>
              submit(e, "/printing/templates", (x: Row) => ({
                name: x.name,
                kind: x.templateKind,
                definition: {
                  paperWidth: Number(x.width),
                  header: x.header,
                  footer: x.footer,
                  showBarcode: x.showBarcode === "true",
                  showQr: x.showQr === "true",
                },
              }))
            }
          >
            <label>
              Template name
              <input name="name" defaultValue={preview.name} required />
            </label>
            <label>
              Kind
              <select name="templateKind" defaultValue="TICKET">
                <option>TICKET</option>
                <option>RECEIPT</option>
              </select>
            </label>
            <label>
              Paper width
              <select name="width" defaultValue="58">
                <option value="58">58 mm</option>
                <option value="80">80 mm</option>
              </select>
            </label>
            <label>
              Header
              <input name="header" />
            </label>
            <label>
              Footer
              <input name="footer" />
            </label>
            <label>
              Barcode
              <select name="showBarcode" defaultValue="true">
                <option value="true">Show</option>
                <option value="false">Hide</option>
              </select>
            </label>
            <label>
              QR
              <select name="showQr" defaultValue="true">
                <option value="true">Show</option>
                <option value="false">Hide</option>
              </select>
            </label>
            <button>Save new version</button>
          </form>
          <div className={preview.width === "80" ? "thermal wide" : "thermal"}>
            <b>{branding.businessName || "NON BIZNIS LA"}</b>
            {preview.header && !/lottivexa/i.test(preview.header) && (
              <span>{preview.header}</span>
            )}
            <span>TIKE LV-EXAMPLE</span>
            <span>GAME / DRAW</span>
            <span>12-34 ........ 10.00</span>
            <hr />
            <span>TOTAL ......... 10.00</span>
            {preview.showBarcode !== "false" && <span>|||| BARCODE ||||</span>}
            {preview.showQr !== "false" && <span>[ QR CODE ]</span>}
            <small>{preview.footer || "Thank you"}</small>
          </div>
        </section>
      </div>
      <section className="panel">
        <h2>Printers</h2>
        <Table
          rows={rows}
          columns={[
            ["name", "Name"],
            ["connectionType", "Connection"],
            ["protocol", "Protocol"],
            ["status", "Status"],
            ["lastSeenAt", "Last seen"],
            ["isDefault", "Default"],
          ]}
        />
      </section>
      <section className="panel">
        <h2>Active templates</h2>
        <Table
          rows={templates}
          columns={[
            ["name", "Name"],
            ["kind", "Kind"],
            ["version", "Version"],
            ["active", "Active"],
            ["updatedAt", "Updated"],
          ]}
        />
      </section>
    </>
  );
}
function Branding({ data: d, submit, request, load, has, can }: any) {
  const [s = {}, domains = [], lotterySettings = [], offices = []] = d;
  const { t, language } = useI18n();
  const [logo, setLogo] = useState(String(s.branding?.logoUrl ?? ""));
  const [favicon, setFavicon] = useState(String(s.branding?.faviconUrl ?? ""));
  const [primaryColor, setPrimaryColor] = useState(String(s.branding?.primaryColor ?? "#172554"));
  const [secondaryColor, setSecondaryColor] = useState(String(s.branding?.secondaryColor ?? "#f59e0b"));
  const [brandingMessage, setBrandingMessage] = useState("");
  const [brandingBusy, setBrandingBusy] = useState(false);
  useEffect(() => { setLogo(String(s.branding?.logoUrl ?? "")); setFavicon(String(s.branding?.faviconUrl ?? "")); setPrimaryColor(String(s.branding?.primaryColor ?? "#172554")); setSecondaryColor(String(s.branding?.secondaryColor ?? "#f59e0b")); }, [s.branding?.logoUrl, s.branding?.faviconUrl, s.branding?.primaryColor, s.branding?.secondaryColor]);
  function imageIssueMessage(issue: BrandingImageIssue) {
    if (issue === "type") return t("branding.invalidType");
    if (issue === "size") return t("branding.invalidSize");
    if (issue === "decode") return t("branding.decodeError");
    return t("branding.saveImageError");
  }
  async function readImage(file: File, setValue: (value: string) => void, kind: BrandingImageKind) {
    const issue = brandingImageIssue(file.type, file.size);
    if (issue) { setBrandingMessage(imageIssueMessage(issue)); return; }
    setBrandingMessage("");
    setBrandingBusy(true);
    try {
      setValue(await prepareBrandingImage(file, kind));
    } catch (error) {
      const code = error instanceof Error ? error.message : "encode";
      const knownIssue: BrandingImageIssue = code === "decode" ? "decode" : "encode";
      setBrandingMessage(imageIssueMessage(knownIssue));
    } finally {
      setBrandingBusy(false);
    }
  }
  async function saveBranding(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBrandingMessage("");
    try { const values = Object.fromEntries(new FormData(event.currentTarget).entries()); await request("/settings/branding", { method: "PUT", body: JSON.stringify({ businessName: String(values.businessName ?? ""), logoUrl: logo || undefined, faviconUrl: favicon || undefined, primaryColor, secondaryColor }) }); setBrandingMessage(t("branding.saved")); await load("branding"); }
    catch (error) { setBrandingMessage(error instanceof Error ? error.message : String(error)); }
  }
  return (
    <>
      <div className="tenant-settings-page">
        <section className="panel tenant-settings-account">
          <h2>{t("branding.businessSettings")}</h2>
          <form
            className="form one"
            onSubmit={(e) =>
              submit(
                e,
                "/settings",
                (x: Row) => ({ ...x, countryCode: String(x.countryCode ?? "").trim().toUpperCase() }),
                "PUT",
                t("branding.settingsSaved"),
              )
            }
          >
            <label>
              {t("branding.country")}
              <select name="countryCode" defaultValue={s.countryCode ?? ""} required>
                <option value="" disabled>{t("branding.countryChoice")}</option>
                {COUNTRIES.map(([code, label]) => <option value={code} key={code}>{countryLabel(code, label, language)}</option>)}
              </select>
              <small>{t("branding.countryHelp")}</small>
            </label>
            <label>
              {t("branding.timezone")}
              <input
                name="timezone"
                defaultValue={s.settings?.timezone ?? "America/Port-au-Prince"}
                required
              />
            </label>
            <label>
              {t("branding.locale")}
              <input
                name="locale"
                defaultValue={s.settings?.locale ?? "ht-HT"}
                required
              />
            </label>
            <label>
              {t("branding.dateFormat")}
              <input
                name="dateFormat"
                defaultValue={s.settings?.dateFormat ?? "DD/MM/YYYY"}
                required
              />
            </label>
            <button>{t("branding.saveSettings")}</button>
          </form>
        </section>
        <TenantLotterySettings
          games={lotterySettings}
          offices={offices}
          countries={COUNTRIES}
          request={request}
          reload={() => load("branding")}
          canEdit={can("settings.edit")}
        />
        <section className="panel tenant-branding-settings">
          <h2>{t("branding.title")}</h2>
          <form className="form one" onSubmit={saveBranding}>
            <label>
              {t("branding.businessName")}
              <input
                name="businessName"
                defaultValue={s.branding?.businessName}
                required
              />
            </label>
            <label>
              {t("branding.logo")}
              <input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={(event) => { const input = event.currentTarget; const file = input.files?.[0]; input.value = ""; if (file) void readImage(file, setLogo, "logo"); }} />
            </label>
            {logo && <div className="tenant-branding-image-preview tenant-branding-logo-preview"><img src={logo} alt={t("branding.logoAlt")} /></div>}
            <label>
              {t("branding.favicon")}
              <input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={(event) => { const input = event.currentTarget; const file = input.files?.[0]; input.value = ""; if (file) void readImage(file, setFavicon, "favicon"); }} />
            </label>
            {favicon && <div className="tenant-branding-image-preview tenant-branding-favicon-preview"><img src={favicon} alt={t("branding.faviconAlt")} /></div>}
            <small className="tenant-branding-upload-hint">{t("branding.uploadHint")}</small>
            {brandingBusy && <p className="tenant-branding-uploading" role="status" aria-live="polite">{t("branding.uploading")}</p>}
            <label>
              {t("branding.primaryColor")}
              <input
                name="primaryColor"
                type="color"
                value={primaryColor}
                onChange={(event) => setPrimaryColor(event.target.value)}
              />
            </label>
            <label>
              {t("branding.secondaryColor")}
              <input
                name="secondaryColor"
                type="color"
                value={secondaryColor}
                onChange={(event) => setSecondaryColor(event.target.value)}
              />
            </label>
            <button disabled={!has("custom_branding") || brandingBusy}>{t("branding.save")}</button>
          </form>
          {brandingMessage && <p className="message">{brandingMessage}</p>}
        </section>
        <section className="panel tenant-domain-settings">
        <h2>Custom domains</h2>
        <form className="inline" onSubmit={(e) => submit(e, "/domains")}>
          <input name="domain" placeholder="portal.customer.com" required />
          <button disabled={!has("custom_domain")}>Add domain</button>
        </form>
        {domains.map((x: Row) => (
          <article className="domain" key={x.id}>
            <div>
              <b>{x.domain}</b>
              <small>
                {x.verificationStatus} · SSL {x.sslStatus}
                {x.isPrimary ? " · PRIMARY" : ""}
              </small>
              <code>
                TXT _lottivexa.{x.domain} = {x.verificationToken}
              </code>
            </div>
            <div className="actions">
              <button
                onClick={async () => {
                  await request(`/domains/${x.id}/verify`, { method: "POST" });
                  await load("branding");
                }}
              >
                Verify
              </button>
              {x.verificationStatus === "VERIFIED" && !x.isPrimary && (
                <button
                  onClick={async () => {
                    await request(`/domains/${x.id}/primary`, {
                      method: "PATCH",
                    });
                    await load("branding");
                  }}
                >
                  Primary
                </button>
              )}
            </div>
          </article>
        ))}
        </section>
      </div>
    </>
  );
}
function Audit({ data: d }: { data: any[] }) {
  const result = d[0] ?? {};
  return (
    <section className="panel">
      <Table
        rows={result.items ?? result}
        columns={[
          ["timestamp", "Time"],
          ["action", "Action"],
          ["entityType", "Entity"],
          ["entityId", "Entity ID"],
          ["ipAddress", "IP"],
        ]}
      />
    </section>
  );
}

function LotterySetup({
  games,
  draws,
  request,
  load,
  can,
}: {
  games: Row[];
  draws: Row[];
  request: (path: string, init?: RequestInit) => Promise<any>;
  load: (tab?: Tab) => Promise<void>;
  can: (permission: string) => boolean;
}) {
  const { t } = useI18n();
  const [message, setMessage] = useState("");
  const [blocked,setBlocked] = useState<Row[]>([]);
  useEffect(()=>{void request("/lottery/limits").then(value=>setBlocked(Array.isArray(value)?value:[])).catch(()=>{});},[]);
  if (!can("settings.edit")) return null;
  async function execute(work: () => Promise<void>, success: string) {
    setMessage("");
    try {
      await work();
      setMessage(success);
      await load("lottery");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    }
  }
  async function createBetType(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const target = e.currentTarget,
      x = val(target);
    await execute(async () => {
      const bet = await request("/lottery/bet-types", {
        method: "POST",
        body: JSON.stringify({
          code: String(x.code).toUpperCase(),
          name: x.name,
          selectionCount: Number(x.selectionCount),
          numberMin: Number(x.numberMin),
          numberMax: Number(x.numberMax),
          allowRepeats: x.allowRepeats === "true",
        }),
      });
      await request(`/lottery/games/${x.gameId}/bet-types/${bet.id}`, {
        method: "POST",
        body: "{}",
      });
      target.reset();
    }, t("lottery.betCreated"));
  }
  async function createOdds(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const target = e.currentTarget,
      x = val(target),
      [gameId, betTypeId] = String(x.pair).split("|");
    await execute(async () => {
      await request("/lottery/odds", {
        method: "POST",
        body: JSON.stringify({
          gameId,
          betTypeId,
          multiplier: String(x.multiplier),
          ...(x.resultPosition
            ? { resultPosition: Number(x.resultPosition) }
            : {}),
          startsAt: new Date(String(x.startsAt)).toISOString(),
        }),
      });
      target.reset();
    }, "Odds yo aktive.");
  }
  async function blockNumber(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const target=e.currentTarget,x=val(target);
    await execute(async()=>{await request("/lottery/blocked-numbers",{method:"POST",body:JSON.stringify({gameId:x.gameId,betTypeId:x.betTypeId||undefined,numberKey:String(x.numberKey).trim()})});target.reset();},t("lottery.numberBlocked"));
  }
  async function unblockNumber(id:string){await execute(()=>request(`/lottery/limits/${id}`,{method:"PATCH",body:JSON.stringify({enabled:false})}),t("lottery.numberUnblocked"));}
  async function installCatalog() {
    await execute(
      () => request("/lottery/catalog/install", { method: "POST", body: "{}" }),
      "Katalòg bolet Ayiti a enstale san doublon.",
    );
  }
  async function toggleCatalog(game: Row) {
    await execute(
      () =>
        request(`/lottery/catalog/${encodeURIComponent(game.catalogCode)}`, {
          method: "PATCH",
          body: JSON.stringify({ enabled: game.status !== "ACTIVE" }),
        }),
      game.status === "ACTIVE"
        ? t("lottery.gameClosed")
        : t("lottery.gameActivated"),
    );
  }
  const catalog = games.filter((game) => game.catalogCode);
  const attached = games.flatMap((game) =>
    (game.betTypes ?? []).map((entry: Row) => ({ game, bet: entry.betType })),
  );
  return (
    <>
      <section className="panel">
        <div className="title">
          <div>
            <h2>{t("lottery.catalog")}</h2>
            <p className="muted">{t("lottery.catalogHelp")}</p>
          </div>
          <button onClick={installCatalog}>{t("lottery.install")}</button>
        </div>
        <div className="cards">
          {catalog.map((game) => (
            <article key={game.id}>
              <span>{game.catalogCode}</span>
              <strong>{game.name}</strong>
              <small>
                {game.schedules?.length ?? 0} orè · {game.status} ·{" "}
                {game.sourceVerifiedAt
                  ? t("lottery.sourceVerified")
                  : t("lottery.sourceManual")}
              </small>
              <button
                className={game.status === "ACTIVE" ? "danger" : ""}
                onClick={() => toggleCatalog(game)}
              >
                {game.status === "ACTIVE"
                  ? t("lottery.close")
                  : t("lottery.activate")}
              </button>
              <form
                className="inline"
                onSubmit={(e) => {
                  e.preventDefault();
                  const logoUrl = String(
                    new FormData(e.currentTarget).get("logoUrl") ?? "",
                  );
                  void execute(
                    () =>
                      request(`/lottery/games/${game.id}`, {
                        method: "PATCH",
                        body: JSON.stringify({ logoUrl }),
                      }),
                    t("lottery.logoSaved"),
                  );
                }}
              >
                <input
                  name="logoUrl"
                  type="url"
                  defaultValue={game.logoUrl}
                  placeholder={t("lottery.logoPlaceholder")}
                  required
                />
                <button>{t("lottery.saveLogo")}</button>
              </form>
            </article>
          ))}
        </div>
        {!catalog.length && <p className="empty">{t("lottery.noCatalog")}</p>}
        <h3>{t("lottery.schedules")}</h3>
        {catalog
          .flatMap((game) =>
            (game.schedules ?? []).map((schedule: Row) => ({
              ...schedule,
              gameName: game.name,
            })),
          )
          .map((schedule: Row) => (
            <article className="domain" key={schedule.id}>
              <div>
                <b>{schedule.gameName}</b>
                <small>
                  {t("lottery.dayPrefix")} {schedule.weekday} ·{" "}
                  {t("lottery.scheduleClose")} {schedule.closesAt} ·{" "}
                  {t("lottery.scheduleResult")} {schedule.resultAt} ·{" "}
                  {t(schedule.active ? "lottery.active" : "lottery.inactive")}
                </small>
              </div>
              <button
                className={schedule.active ? "danger" : ""}
                onClick={() =>
                  execute(
                    () =>
                      request(`/lottery/schedules/${schedule.id}`, {
                        method: "PATCH",
                        body: JSON.stringify({ enabled: !schedule.active }),
                      }),
                    schedule.active
                      ? t("lottery.drawClosed")
                      : t("lottery.drawActivated"),
                  )
                }
              >
                {t(
                  schedule.active
                    ? "lottery.closeDraw"
                    : "lottery.activateDraw",
                )}
              </button>
            </article>
          ))}
      </section>
      <ManualResults
        draws={draws as any}
        request={request}
        reload={() => load("lottery")}
      />
      <div className="split">
        <section className="panel">
          <h2>{t("lottery.makeBet")}</h2>
          <form className="form one" onSubmit={createBetType}>
            <label>
              {t("lottery.game")}
              <select name="gameId" required>
                <option value="">{t("lottery.chooseGame")}</option>
                {games.map((game) => (
                  <option key={game.id} value={game.id}>
                    {game.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {t("lottery.betCode")}
              <input
                name="code"
                placeholder="STRAIGHT"
                pattern="[A-Za-z0-9_-]{2,40}"
                required
              />
            </label>
            <label>
              {t("lottery.betType")}
              <input name="name" placeholder="Straight number" required />
            </label>
            <label>
              {t("lottery.count")}
              <input
                name="selectionCount"
                type="number"
                min="1"
                defaultValue="1"
                required
              />
            </label>
            <label>
              {t("lottery.minimum")}
              <input
                name="numberMin"
                type="number"
                min="0"
                defaultValue="0"
                required
              />
            </label>
            <label>
              {t("lottery.maximum")}
              <input
                name="numberMax"
                type="number"
                min="0"
                defaultValue="99"
                required
              />
            </label>
            <label>
              {t("lottery.repeats")}
              <select name="allowRepeats" defaultValue="false">
                <option value="false">No</option>
                <option value="true">Yes</option>
              </select>
            </label>
            <button disabled={!games.length}>
              {t("lottery.createAttach")}
            </button>
          </form>
        </section>
        <section className="panel">
          <h2>{t("lottery.odds")}</h2>
          <p className="muted">{t("lottery.oddsHelp")}</p>
          <form className="form one" onSubmit={createOdds}>
            <label>
              {t("lottery.game")} / {t("lottery.betType")}
              <select name="pair" required>
                <option value="">{t("lottery.chooseGame")}</option>
                {attached.map((x) => (
                  <option
                    key={`${x.game.id}|${x.bet.id}`}
                    value={`${x.game.id}|${x.bet.id}`}
                  >
                    {x.game.name} — {x.bet.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {t("lottery.resultPosition")}
              <select name="resultPosition" defaultValue="">
                <option value="">{t("lottery.generalRule")}</option>
                <option value="1">{t("lottery.position1")}</option>
                <option value="2">{t("lottery.position2")}</option>
                <option value="3">{t("lottery.position3")}</option>
              </select>
            </label>
            <label>
              {t("lottery.multiplier")}
              <input
                name="multiplier"
                type="number"
                min="0.0001"
                step="0.0001"
                placeholder="50"
                required
              />
            </label>
            <label>
              {t("lottery.startDate")}
              <input name="startsAt" type="datetime-local" required />
            </label>
            <button disabled={!attached.length}>
              {t("lottery.activateOdds")}
            </button>
          </form>
        </section>
      </div>
      <section className="panel">
        <h2>{t("lottery.blockNumbers")}</h2>
        <p className="muted">{t("lottery.blockNumbersHelp")}</p>
        <form className="form one" onSubmit={blockNumber}>
          <label>{t("lottery.game")}<select name="gameId" required><option value="">{t("lottery.chooseGame")}</option>{games.map((game:Row)=><option key={game.id} value={game.id}>{game.name}</option>)}</select></label>
          <label>{t("lottery.betType")}<select name="betTypeId"><option value="">{t("lottery.allBetTypes")}</option>{games.flatMap((game:Row)=>(game.betTypes??[]).map((entry:Row)=><option key={`${game.id}|${entry.betType.id}`} value={entry.betType.id}>{game.name} — {entry.betType.name}</option>))}</select></label>
          <label>{t("lottery.blockedNumber")}<input name="numberKey" placeholder="45, 12-34 or 45@1" required /></label>
          <button>{t("lottery.blockNumber")}</button>
        </form>
        <div className="domain-list">{blocked.filter((item:Row)=>item.active).map((item:Row)=><article className="domain" key={item.id}><div><b>{item.numberKey}</b><small>{item.game?.name??""}{item.betType?` · ${item.betType.name}`:""}</small></div><button className="danger" onClick={()=>void unblockNumber(item.id)}>{t("lottery.unblockNumber")}</button></article>)}</div>
      </section>
      {message && <p className="message">{message}</p>}
    </>
  );
}
