const escapeHtml = (value: string) => value
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

const linkify = (body: string) => {
  const escaped = escapeHtml(body);
  return escaped.replace(
    /(https:\/\/[^\s]+)/g,
    '<a href="$1" style="display:inline-block;margin-top:18px;padding:12px 20px;border-radius:10px;background:#e49a08;color:#081a35;text-decoration:none;font-weight:700">Chanje modpas la</a>',
  );
};

export function resendEmailPayload(input: { from: string; to: string[]; title: string; body: string }) {
  return {
    from: input.from,
    to: input.to,
    subject: input.title,
    text: input.body,
    html: `<div style="margin:0;background:#f1f5f9;padding:32px 16px;font-family:Arial,sans-serif;color:#0f1f3a"><div style="max-width:560px;margin:auto;background:#fff;border:1px solid #dce5f0;border-radius:16px;padding:28px"><div style="font-size:22px;font-weight:800;color:#0b2a58">LOTTIVEXA</div><h1 style="font-size:22px;margin:24px 0 12px">${escapeHtml(input.title)}</h1><p style="font-size:15px;line-height:1.65;color:#475569">${linkify(input.body)}</p><p style="margin-top:26px;padding-top:18px;border-top:1px solid #e2e8f0;color:#64748b;font-size:12px">Si ou pa t mande chanjman sa a, ou ka inyore mesaj sa a.</p></div></div>`,
  };
}

export async function sendWithResend(input: { id: string; to: string[]; title: string; body: string }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey) throw new Error('RESEND_API_KEY_NOT_CONFIGURED');
  if (!from) throw new Error('EMAIL_FROM_NOT_CONFIGURED');
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${apiKey}`,
      'content-type': 'application/json',
      'idempotency-key': input.id,
    },
    body: JSON.stringify(resendEmailPayload({ from, to: input.to, title: input.title, body: input.body })),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`RESEND_${response.status}:${detail.slice(0, 300)}`);
  }
}
