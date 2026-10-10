"use client";

import { FormEvent, useState } from "react";
import { drawSessionLabel } from "./draw-label";
import { useI18n } from "./i18n";
import { groupSchedulesBySession, isScheduleSessionOpen, scheduleSlotUpdatePayload, type ScheduleSession } from "./schedule-sessions";

type Row = Record<string, any>;
type Request = (path: string, init?: RequestInit) => Promise<any>;

function SessionCard({
  session,
  request,
  reload,
  canEdit,
}: {
  session: ScheduleSession;
  request: Request;
  reload: () => Promise<void>;
  canEdit: boolean;
}) {
  const { language, t } = useI18n();
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const reference = session.schedules[0] ?? {};
  const open = isScheduleSessionOpen(session);
  const identity = `${session.gameId}|${session.resultAt}`;
  const label = drawSessionLabel({ drawNumber: `SLOT-20261006-${session.resultAt.replace(":", "")}` }, language);

  async function saveTimes(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget).entries());
    setSaving(true);
    setMessage("");
    try {
      await request("/lottery/schedules/slot", {
        method: "PATCH",
        body: JSON.stringify(scheduleSlotUpdatePayload(session, {
          opensAt: String(values.opensAt ?? ""),
          closesAt: String(values.closesAt ?? ""),
          resultAt: String(values.resultAt ?? ""),
        })),
      });
      setMessage(t("lottery.scheduleUpdated"));
      await reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setSaving(false);
    }
  }

  async function toggleSession() {
    setSaving(true);
    setMessage("");
    try {
      await request("/lottery/schedules/slot", {
        method: "PATCH",
        body: JSON.stringify({ gameId: session.gameId, resultAt: session.resultAt, enabled: !open }),
      });
      setMessage(t("lottery.scheduleUpdated"));
      await reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <article className="tenant-session-card">
      <div className="tenant-session-heading">
        <div>
          <strong>{session.gameName} · {label}</strong>
        </div>
        <span className={`tenant-session-status ${open ? "is-open" : "is-closed"}`}>
          {open ? t("lottery.sessionOpen") : t("lottery.sessionClosed")}
        </span>
      </div>
      <form
        key={`${identity}|${reference.opensAt}|${reference.closesAt}`}
        className="tenant-session-form"
        onSubmit={(event) => void saveTimes(event)}
      >
        <label>{t("lottery.opensAt")}<input name="opensAt" type="time" defaultValue={String(reference.opensAt ?? "").slice(0, 5)} required disabled={!canEdit || saving} /></label>
        <label>{t("lottery.closesAt")}<input name="closesAt" type="time" defaultValue={String(reference.closesAt ?? "").slice(0, 5)} required disabled={!canEdit || saving} /></label>
        <label>{t("lottery.resultTime")}<input name="resultAt" type="time" defaultValue={session.resultAt} required disabled={!canEdit || saving} /></label>
        {canEdit && <button className="tenant-session-save" type="submit" disabled={saving}>{saving ? "…" : t("lottery.saveSchedule")}</button>}
      </form>
      {canEdit && <button className={`tenant-session-toggle ${open ? "is-close-action" : ""}`} disabled={saving} onClick={() => void toggleSession()}>
        {saving ? "…" : open ? t("lottery.closeSession") : t("lottery.openSession")}
      </button>}
      {message && <p className="message" role="status">{message}</p>}
    </article>
  );
}

export default function TenantScheduleSessions({
  games,
  request,
  reload,
  canEdit,
}: {
  games: Row[];
  request: Request;
  reload: () => Promise<void>;
  canEdit: boolean;
}) {
  const { t } = useI18n();
  const sessions = groupSchedulesBySession(games);

  return (
    <div className="tenant-session-grid">
      {sessions.map((session) => (
        <SessionCard key={`${session.gameId}|${session.resultAt}`} session={session} request={request} reload={reload} canEdit={canEdit} />
      ))}
      {!sessions.length && <p className="tenant-report-card-empty">{t("table.empty")}</p>}
    </div>
  );
}
