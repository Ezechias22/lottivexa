"use client";

import { FormEvent, useEffect, useState } from "react";
import { useI18n } from "./i18n";

type Row = Record<string, any>;
type Request = (path: string, init?: RequestInit) => Promise<any>;

function currentOdds(game: Row, betTypeId: string) {
  const now = Date.now();
  return (game.odds ?? [])
    .filter((rule: Row) =>
      rule.betTypeId === betTypeId &&
      rule.active !== false &&
      new Date(rule.startsAt).getTime() <= now &&
      (!rule.endsAt || new Date(rule.endsAt).getTime() > now),
    )
    .sort((a: Row, b: Row) => new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime());
}

function multiplierFor(rules: Row[], position: number) {
  const specific = rules.find((rule) => Number(rule.resultPosition) === position);
  const general = rules.find((rule) => rule.resultPosition == null);
  return String(specific?.multiplier ?? general?.multiplier ?? "");
}

function PayoutCard({
  game,
  betType,
  request,
  reload,
  canEdit,
}: {
  game: Row;
  betType: Row;
  request: Request;
  reload: () => Promise<void>;
  canEdit: boolean;
}) {
  const { language } = useI18n();
  const french = language === "fr";
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const rules = currentOdds(game, betType.id);
  const initial = [1, 2, 3].map((position) => multiplierFor(rules, position));
  const identity = `${game.id}-${initial.join("-")}`;

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form).entries());
    setMessage("");
    setSaving(true);
    try {
      await request("/lottery/odds/bolet-payouts", {
        method: "POST",
        body: JSON.stringify({
          gameId: game.id,
          multipliers: [values.position1, values.position2, values.position3].map(String),
        }),
      });
      setMessage(french ? "Les trois paiements ont été enregistrés." : "Twa montan peman yo anrejistre.");
      await reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <article className="tenant-settings-payout-card" key={identity}>
      <div className="tenant-settings-game-heading">
        <div className="tenant-settings-game-mark">{game.name?.slice(0, 1) ?? "L"}</div>
        <div><strong>{game.name}</strong><small>{betType.name} · {french ? "Par résultat" : "Pa rezilta"}</small></div>
      </div>
      <form key={identity} className="tenant-settings-payout-form" onSubmit={save}>
        {[1, 2, 3].map((position, index) => (
          <label key={position}>
            <span>{french ? ["1er résultat", "2e résultat", "3e résultat"][index] : ["1ye rezilta", "2yèm rezilta", "3yèm rezilta"][index]}</span>
            <div className="tenant-settings-rate-input"><input name={`position${position}`} type="number" min="0.0001" step="0.0001" defaultValue={initial[index]} required disabled={!canEdit} /><b>x</b></div>
          </label>
        ))}
        {canEdit && <button type="submit" disabled={saving}>{saving ? "…" : french ? "Enregistrer les paiements" : "Sove peman yo"}</button>}
      </form>
      <p className="tenant-settings-help">{french ? "Ces valeurs s’appliquent aux nouveaux tickets ; les tickets déjà vendus gardent leur paiement d’origine." : "Valè sa yo aplike sou nouvo tikè; tikè ki deja vann yo kenbe ansyen peman yo."}</p>
      {message && <p className="message" role="status">{message}</p>}
    </article>
  );
}

function ScheduleCard({
  game,
  schedule,
  request,
  reload,
  canEdit,
}: {
  game: Row;
  schedule: Row;
  request: Request;
  reload: () => Promise<void>;
  canEdit: boolean;
}) {
  const { language } = useI18n();
  const french = language === "fr";
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const weekdays = french
    ? ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"]
    : ["Dimanch", "Lendi", "Madi", "Mèkredi", "Jedi", "Vandredi", "Samdi"];
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget).entries());
    setMessage("");
    setSaving(true);
    try {
      await request(`/lottery/schedules/${schedule.id}`, {
        method: "PATCH",
        body: JSON.stringify({ opensAt: values.opensAt, closesAt: values.closesAt, resultAt: values.resultAt }),
      });
      setMessage(french ? "L’horaire du tirage a été mis à jour." : "Orè tiraj la mete ajou.");
      await reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setSaving(false);
    }
  }
  const market = schedule.market?.name ? ` · ${schedule.market.name}` : "";

  return (
    <article className="tenant-settings-schedule-card">
      <div className="tenant-settings-schedule-title">
        <span className={`tenant-settings-schedule-dot ${schedule.active ? "is-active" : ""}`} />
        <div><strong>{game.name}{market}</strong><small>{weekdays[Number(schedule.weekday)] ?? `${schedule.weekday}`} · {schedule.timezone}</small></div>
      </div>
      <form key={`${schedule.id}-${schedule.opensAt}-${schedule.closesAt}-${schedule.resultAt}`} className="tenant-settings-schedule-form" onSubmit={save}>
        <label>{french ? "Ouverture" : "Ouvèti"}<input name="opensAt" type="time" defaultValue={String(schedule.opensAt ?? "").slice(0, 5)} required disabled={!canEdit} /></label>
        <label>{french ? "Fermeture" : "Fèmti"}<input name="closesAt" type="time" defaultValue={String(schedule.closesAt ?? "").slice(0, 5)} required disabled={!canEdit} /></label>
        <label>{french ? "Résultat" : "Rezilta"}<input name="resultAt" type="time" defaultValue={String(schedule.resultAt ?? "").slice(0, 5)} required disabled={!canEdit} /></label>
        {canEdit && <button type="submit" disabled={saving}>{saving ? "…" : french ? "Enregistrer" : "Sove orè"}</button>}
      </form>
      {message && <p className="message" role="status">{message}</p>}
    </article>
  );
}

export default function TenantLotterySettings({
  games,
  offices,
  request,
  reload,
  canEdit,
}: {
  games: Row[];
  offices: Row[];
  request: Request;
  reload: () => Promise<void>;
  canEdit: boolean;
}) {
  const { language } = useI18n();
  const french = language === "fr";
  const payouts = games.flatMap((game) =>
    (game.betTypes ?? [])
      .filter((entry: Row) => entry.active !== false && entry.betType?.code === "BOLET")
      .map((entry: Row) => ({ game, betType: entry.betType })),
  );
  const schedules = games.flatMap((game) =>
    (game.schedules ?? []).map((schedule: Row) => ({ game, schedule })),
  );
  const officeCountries = [...new Map((offices ?? []).filter((office: Row) => office.countryCode)
    .map((office: Row) => [String(office.countryCode).toUpperCase(), { code: String(office.countryCode).toUpperCase(), currency: String(office.currency ?? "USD"), officeName: office.name }])).values()];
  const [countryCode, setCountryCode] = useState(officeCountries[0]?.code ?? "HT");
  const [freePolicy, setFreePolicy] = useState<Row | null>(null);
  const [freePolicyMessage, setFreePolicyMessage] = useState("");
  const [loadingFreePolicy, setLoadingFreePolicy] = useState(false);

  useEffect(() => {
    if (!officeCountries.some((country) => country.code === countryCode) && officeCountries[0]) setCountryCode(officeCountries[0].code);
  }, [offices, countryCode]);

  useEffect(() => {
    let active = true;
    if (!countryCode) return;
    setLoadingFreePolicy(true);
    setFreePolicyMessage("");
    void request(`/lottery/free-maryaj-settings?countryCode=${encodeURIComponent(countryCode)}`)
      .then((value) => { if (active) setFreePolicy(value); })
      .catch((error) => { if (active) setFreePolicyMessage(error instanceof Error ? error.message : String(error)); })
      .finally(() => { if (active) setLoadingFreePolicy(false); });
    return () => { active = false; };
  }, [countryCode, request]);

  async function saveFreePolicy(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget).entries());
    setFreePolicyMessage("");
    setLoadingFreePolicy(true);
    try {
      const updated = await request("/lottery/free-maryaj-settings", {
        method: "PUT",
        body: JSON.stringify({
          countryCode,
          minimumAmount: String(values.minimumAmount ?? ""),
          freeTicketCount: Number(values.freeTicketCount),
          payoutAmount: String(values.payoutAmount ?? "").trim() || null,
        }),
      });
      setFreePolicy(updated);
      setFreePolicyMessage(french ? "La règle Maryaj gratuite a été enregistrée." : "Règ Maryaj gratis la anrejistre.");
      await reload();
    } catch (error) {
      setFreePolicyMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setLoadingFreePolicy(false);
    }
  }

  return (
    <div className="tenant-settings-lottery">
      <section className="tenant-settings-section">
        <div className="tenant-settings-section-heading">
          <div><span className="tenant-report-kicker">{french ? "PROMOTION PAR PAYS" : "KADO PA PEYI"}</span><h2>{french ? "Maryaj gratuits" : "Maryaj gratis"}</h2><p>{french ? "Les règles s’appliquent au pays du bureau. La devise suit le pays automatiquement." : "Règ yo aplike selon peyi biwo a. Lajan an swiv peyi a otomatikman."}</p></div>
          <span className="tenant-settings-section-icon">★</span>
        </div>
        <form className="tenant-settings-payout-form" onSubmit={(event) => void saveFreePolicy(event)}>
          <label><span>{french ? "Pays du bureau" : "Peyi biwo a"}<select value={countryCode} onChange={(event) => setCountryCode(event.target.value)} disabled={!canEdit || !officeCountries.length}>{officeCountries.map((country) => <option key={country.code} value={country.code}>{country.code} · {country.currency}</option>)}</select></span></label>
          <label><span>{french ? "Vente minimum pour recevoir les lignes gratuites" : "Kantite minimòm lavant pou jwenn liy gratis yo"} ({freePolicy?.currency ?? officeCountries.find((country) => country.code === countryCode)?.currency ?? "USD"})</span><input name="minimumAmount" type="number" min="0.01" step="0.01" value={freePolicy?.minimumAmount ?? ""} onChange={(event) => setFreePolicy((current) => ({ ...(current ?? {}), minimumAmount: event.target.value }))} required disabled={!canEdit || loadingFreePolicy || !freePolicy} /></label>
          <label><span>{french ? "Nombre de tickets Maryaj gratuits" : "Kantite tikè Maryaj gratis"}</span><input name="freeTicketCount" type="number" min="1" max="10" step="1" value={freePolicy?.freeTicketCount ?? ""} onChange={(event) => setFreePolicy((current) => ({ ...(current ?? {}), freeTicketCount: Number(event.target.value) }))} required disabled={!canEdit || loadingFreePolicy || !freePolicy} /></label>
          <label><span>{french ? "Paiement par ticket gagnant" : "Peman pou chak tikè ki genyen"} ({freePolicy?.currency ?? "USD"})</span><input name="payoutAmount" type="number" min="0.01" step="0.01" value={freePolicy?.payoutAmount ?? ""} onChange={(event) => setFreePolicy((current) => ({ ...(current ?? {}), payoutAmount: event.target.value }))} disabled={!canEdit || loadingFreePolicy || !freePolicy} placeholder={french ? "Paiement Maryaj configuré" : "Peman Maryaj nòmal"} /></label>
          {canEdit && <button type="submit" disabled={loadingFreePolicy || !freePolicy}>{loadingFreePolicy ? "…" : french ? "Enregistrer la règle" : "Sove règ la"}</button>}
        </form>
        <p className="tenant-settings-help">{french ? "Aux États-Unis, le réglage initial donne 2 tickets gratuits dès 20 $ et 50 $ par ticket gagnant. Laissez le paiement vide pour utiliser les cotes Maryaj configurées." : "Ozetazini, paramèt inisyal la bay 2 tikè gratis depi $20 epi $50 pou chak tikè ki genyen. Kite peman an vid pou itilize kòt Maryaj nòmal yo."}</p>
        {freePolicyMessage && <p className="message" role="status">{freePolicyMessage}</p>}
      </section>
      <section className="tenant-settings-section">
        <div className="tenant-settings-section-heading">
          <div><span className="tenant-report-kicker">{french ? "RÈGLES DE PAIEMENT" : "RÈG PEMAN"}</span><h2>{french ? "Paiement des boules Bolet" : "Peman boul Bolet"}</h2><p>{french ? "Définissez le multiplicateur payé pour le 1er, le 2e et le 3e résultat de chaque loterie." : "Chwazi miltiplikatè pou 1ye, 2yèm ak 3yèm rezilta pou chak lotri."}</p></div>
          <span className="tenant-settings-section-icon">×</span>
        </div>
        {payouts.length ? (
          <div className="tenant-settings-payout-grid">
            {payouts.map(({ game, betType }) => (
              <PayoutCard key={game.id + betType.id} game={game} betType={betType} request={request} reload={reload} canEdit={canEdit} />
            ))}
          </div>
        ) : <p className="tenant-report-card-empty">{french ? "Aucun jeu Bolet actif n’est configuré." : "Pa gen jwèt Bolet aktif ki konfigire."}</p>}
      </section>

      <section className="tenant-settings-section">
        <div className="tenant-settings-section-heading">
          <div><span className="tenant-report-kicker">{french ? "CALENDRIER DES TIRAGES" : "KALANDRIYE TIRAJ YO"}</span><h2>{french ? "Heures d’ouverture et de fermeture" : "Lè tiraj yo ouvri ak fèmen"}</h2><p>{french ? "Ajustez les heures par loterie et par jour. Les changements concernent les prochains tirages." : "Ajiste lè yo pou chak lotri ak chak jou. Chanjman yo konsène pwochen tiraj yo."}</p></div>
          <span className="tenant-settings-section-icon">◷</span>
        </div>
        {schedules.length ? (
          <div className="tenant-settings-schedule-list">
            {schedules.map(({ game, schedule }) => (
              <ScheduleCard key={schedule.id} game={game} schedule={schedule} request={request} reload={reload} canEdit={canEdit} />
            ))}
          </div>
        ) : <p className="tenant-report-card-empty">{french ? "Aucun horaire de tirage n’est configuré." : "Pa gen orè tiraj ki konfigire."}</p>}
      </section>
    </div>
  );
}
