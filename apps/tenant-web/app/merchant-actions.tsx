"use client";
export default function MerchantActions({
  row: r,
  request,
  load,
  can,
}: {
  row: any;
  request: (path: string, init?: RequestInit) => Promise<any>;
  load: (tab: "merchants") => Promise<void>;
  can: (permission: string) => boolean;
}) {
  const refresh = async (
    path: string,
    method: string,
    body?: Record<string, unknown>,
  ) => {
    await request(path, {
      method,
      body: body ? JSON.stringify(body) : undefined,
    });
    await load("merchants");
  };
  return (
    <>
      {can("merchants.edit") && (
        <button
          onClick={async () => {
            const displayName = prompt("Display name", r.displayName);
            if (displayName === null) return;
            const username = prompt("Username", r.user?.username ?? "");
            if (username === null) return;
            const phone = prompt(
              "Phone (blank clears it)",
              r.user?.phone ?? "",
            );
            if (phone === null) return;
            const email = prompt(
              "Email (blank clears it)",
              r.user?.email ?? "",
            );
            if (email === null) return;
            const branchId = prompt("Branch ID", r.branchId);
            if (!branchId) return;
            await refresh(`/merchants/${r.id}`, "PATCH", {
              displayName,
              username,
              phone,
              email,
              branchId,
            });
          }}
        >
          Edit
        </button>
      )}
      {can("users.edit") && r.user?.id && (
        <button
          onClick={async () => {
            const temporaryPassword = prompt(
              "Nouvo modpas tanporè (omwen 12 karaktè)",
            );
            if (!temporaryPassword || temporaryPassword.length < 12)
              return alert("Modpas la dwe gen omwen 12 karaktè.");
            if (!confirm(`Retabli modpas ${r.user?.username}?`)) return;
            await refresh(`/users/${r.user.id}/reset-password`, "POST", {
              temporaryPassword,
            });
            alert(
              "Modpas tanporè a anrejistre. Machann nan dwe chanje li nan pwochen koneksyon.",
            );
          }}
        >
          Reset password
        </button>
      )}
      {can("merchants.disable") &&
        (r.status === "DISABLED" || r.user?.status === "DISABLED" ? (
          <button onClick={() => refresh(`/merchants/${r.id}/reactivate`, "PATCH")}>
            Reactivate
          </button>
        ) : (
          <button
            className="danger"
            onClick={() => refresh(`/merchants/${r.id}/disable`, "PATCH")}
          >
            Disable
          </button>
        ))}
    </>
  );
}
