import { describe, expect, it } from 'vitest';
import { resendEmailPayload } from './resend-email';

describe('Resend email payload', () => {
  it('builds a password email with text and a safe link', () => {
    const payload = resendEmailPayload({
      from: 'LOTTIVEXA <onboarding@resend.dev>',
      to: ['owner@example.com'],
      title: 'Reset your Lottivexa password',
      body: 'Use this secure link within 30 minutes: https://example.com/reset?token=abc',
    });
    expect(payload.to).toEqual(['owner@example.com']);
    expect(payload.text).toContain('https://example.com/reset?token=abc');
    expect(payload.html).toContain('Chanje modpas la');
    expect(payload.html).toContain('https://example.com/reset?token=abc');
  });

  it('escapes unsafe markup', () => {
    const payload = resendEmailPayload({ from: 'x@example.com', to: ['y@example.com'], title: '<script>', body: '<b>unsafe</b>' });
    expect(payload.html).not.toContain('<script>');
    expect(payload.html).not.toContain('<b>unsafe</b>');
  });
});
