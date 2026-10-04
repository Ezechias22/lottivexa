"use client";

import { FormEvent, useState } from "react";

type CountryOption = [string, string];

export default function MerchantActions({
  row: r,
  request,
  load,
  can,
  branches,
  countries,
}: {
  row: any;
  request: (path: string, init?: RequestInit) => Promise<any>;
  load: (tab: "merchants") => Promise<void>;
  can: (permission: string) => boolean;
  branches: any[];
  countries: CountryOption[];
}) {
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [branchId, setBranchId] = useState(String(r.branchId ?? ""));
  const selectedBranch = branches.find((branch) => branch.id === branchId);
  const country = countries.find(([code]) => code === selectedBranch?.countryCode)?.[1]?.split("·")[0].trim() ?? "—";

  const refresh = async (path: string, method: string, body?: Record<string, unknown>) => {
    await request(path, { method, body: body ? JSON.stringify(body) : undefined });
    await load("merchants");
  };

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget));
    setBusy(true);
    setMessage("");
    try {
      await request(`/merchants/${r.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          displayName: String(values.displayName ?? "").trim(),
          username: String(values.username ?? "").trim(),
          phone: String(values.phone ?? "").trim(),
          email: String(values.email ?? "").trim(),
          branchId: String(values.branchId ?? ""),
          commissionPercentage: String(values.commissionPercentage ?? "").trim(),
        }),
      });
      setEditing(false);
      await load("merchants");
    } catch (error) {
      const code = error instanceof Error ? error.message : String(error);
      setMessage(code.includes("MERCHANT_COUNTRY_MUST_MATCH_BRANCH")
        ? "Peyi machann nan dwe koresponn ak peyi biwo li. Chwazi biwo ki nan peyi ou vle a."
        : code.includes("INVALID_COMMISSION_PERCENTAGE")
          ? "Komisyon an dwe ant 0 ak 100%."
          : code);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {can("merchants.edit") && <button onClick={() => { setBranchId(String(r.branchId ?? "")); setMessage(""); setEditing(true); }}>Modifye</button>}
      {can("users.edit") && r.user?.id && (
        <button onClick={async () => {
          const temporaryPassword = prompt("Nouvo modpas tanporè (omwen 12 karaktè)");
          if (!temporaryPassword || temporaryPassword.length < 12) return alert("Modpas la dwe gen omwen 12 karaktè.");
          if (!confirm(`Retabli modpas ${r.user?.username}?`)) return;
          await refresh(`/users/${r.user.id}/reset-password`, "POST", { temporaryPassword });
          alert("Modpas tanporè a anrejistre. Machann nan dwe chanje li nan pwochen koneksyon.");
        }}>Reset password</button>
      )}
      {can("merchants.disable") && (r.status === "DISABLED" || r.user?.status === "DISABLED" ? (
        <button onClick={() => refresh(`/merchants/${r.id}/reactivate`, "PATCH")}>Reactivate</button>
      ) : (
        <button className="danger" onClick={() => refresh(`/merchants/${r.id}/disable`, "PATCH")}>Disable</button>
      ))}
      {editing && <div className="merchant-edit-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) setEditing(false); }}>
        <section className="merchant-edit-dialog" role="dialog" aria-modal="true" aria-labelledby={`merchant-edit-${r.id}`}>
          <header><div><span className="eyebrow">KONT MACHANN</span><h2 id={`merchant-edit-${r.id}`}>Modifye machann</h2><p>Modifye enfòmasyon, biwo ak pousantaj komisyon an.</p></div><button type="button" className="secondary" onClick={() => setEditing(false)} disabled={busy} aria-label="Fèmen">×</button></header>
          <form className="form" onSubmit={save}>
            <label>Non afiche<input name="displayName" defaultValue={r.displayName ?? ""} required /></label>
            <label>Non itilizatè<input name="username" defaultValue={r.user?.username ?? ""} required /></label>
            <label>Telefòn<input name="phone" defaultValue={r.user?.phone ?? ""} /></label>
            <label>Imèl<input name="email" type="email" defaultValue={r.user?.email ?? ""} /></label>
            <label>Komisyon (%)<input name="commissionPercentage" type="number" min="0" max="100" step="0.01" defaultValue={String(r.commissionRate ?? "0").replace("%", "")} required /></label>
            <label>Biwo / santral<select name="branchId" value={branchId} onChange={(event) => setBranchId(event.target.value)} required>{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.officeKind === "CENTRAL" ? "Santral" : "Biwo"} · {branch.name}</option>)}</select></label>
            <label>Peyi biwo machann nan<input value={country} readOnly aria-readonly="true" /></label>
            <label>Lajan antrepriz la (tikè ak rapò)<input value={r.currency ?? "—"} readOnly aria-readonly="true" /></label>
            <p className="form-help">Pou chanje peyi machann nan, chwazi yon biwo nan peyi sa a. Sa pa chanje lajan antrepriz la ni tikè ki deja egziste yo.</p>
            {message && <p className="merchant-edit-error" role="alert">{message}</p>}
            <div className="merchant-edit-actions"><button type="button" className="secondary" onClick={() => setEditing(false)} disabled={busy}>Anile</button><button disabled={busy}>{busy ? "Ap sove…" : "Sove chanjman yo"}</button></div>
          </form>
        </section>
      </div>}
    </>
  );
}
