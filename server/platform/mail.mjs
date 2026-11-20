import {cfgEnv, currentTenant} from './tenant-context.mjs';
// Outgoing e-mail. Order: SMTP (admin → Ayarlar → E-posta Ayarları, or SMTP_* env) → Resend (RESEND_API_KEY) → test mode.
// In test mode nothing is sent and the action link is returned to the screen (devLink) so live tests can continue.
// Set EMAIL_TEST_MODE=off to hide links when nothing is configured.
import nodemailer from 'nodemailer';

// Firma adı: ana firmada Brazil Migration; diğer firmalarda kendi adı (e-posta metni, gönderen adı ve alt bilgi).
const firmName = () => { const t = currentTenant(); return t.isDefault ? 'Brazil Migration' : (t.name || 'Danışmanlık firması'); };
const smtpReady = () => !!(cfgEnv('SMTP_HOST') && cfgEnv('SMTP_USER') && cfgEnv('SMTP_PASS'));
const fromAddress = () => cfgEnv('EMAIL_FROM') || (cfgEnv('SMTP_USER') ? `${firmName()} <${cfgEnv('SMTP_USER')}>` : '');
export const mailConfigured = () => (smtpReady() && !!fromAddress()) || !!(cfgEnv('RESEND_API_KEY') && cfgEnv('EMAIL_FROM'));
export const testMode = () => !mailConfigured() && process.env.EMAIL_TEST_MODE !== 'off';
export const mailProvider = () => smtpReady() ? 'smtp' : cfgEnv('RESEND_API_KEY') && cfgEnv('EMAIL_FROM') ? 'resend' : 'test';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
let transport = null, transportKey = '';
function smtp() {
  const key = [cfgEnv('SMTP_HOST'), cfgEnv('SMTP_PORT'), cfgEnv('SMTP_SECURE'), cfgEnv('SMTP_USER'), cfgEnv('SMTP_PASS')].join('|');
  if (!transport || key !== transportKey) {
    const port = Number(cfgEnv('SMTP_PORT') || 465);
    transport = nodemailer.createTransport({host: cfgEnv('SMTP_HOST'), port, secure: cfgEnv('SMTP_SECURE') ? cfgEnv('SMTP_SECURE') !== 'false' : port === 465, auth: {user: cfgEnv('SMTP_USER'), pass: cfgEnv('SMTP_PASS')}, connectionTimeout: 15000, greetingTimeout: 15000, socketTimeout: 20000});
    transportKey = key;
  }
  return transport;
}

export async function sendMail(o) {
  if (!currentTenant().isDefault) { const nm = firmName(), r = s => (typeof s === 'string' ? s.split('Brazil Migration').join(nm) : s); o = {...o, subject: r(o.subject), title: r(o.title), text: r(o.text), button: r(o.button)}; }
  return sendMailRaw(o);
}
async function sendMailRaw({to, subject, title, text, link, button, throwOnError, from}) {
  const html = `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#1a2e1f">
  <h2 style="color:#1b5e20">${esc(title || subject)}</h2><p style="line-height:1.6">${esc(text)}</p>
  ${link ? `<p><a href="${esc(link)}" style="display:inline-block;background:#1b5e20;color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none">${esc(button || 'Devam et')}</a></p><p style="font-size:12px;color:#667">Buton çalışmazsa bu bağlantıyı tarayıcınıza yapıştırın:<br>${esc(link)}</p>` : ''}
  <p style="font-size:12px;color:#889">${esc(firmName())}</p></div>`;
  const plain = `${text}\n\n${link || ''}`;
  if (!mailConfigured()) {
    console.log('[mail:test-mode]', to, subject, link || '');
    return {sent: false, devLink: testMode() ? link : undefined};
  }
  try {
    if (smtpReady()) {
      const msg = {replyTo: cfgEnv('EMAIL_REPLY_TO') || undefined, to, subject, html, text: plain};
      // İstenen gönderen adresi (ör. bilgi@…); SMTP sunucusu reddederse varsayılan adresle tekrar dener.
      if (from) { try { await smtp().sendMail({...msg, from}); } catch (e) { console.error('[mail] gönderen reddedildi, varsayılanla deneniyor:', e.message); await smtp().sendMail({...msg, from: fromAddress()}); } }
      else await smtp().sendMail({...msg, from: fromAddress()});
      return {sent: true};
    }
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {Authorization: 'Bearer ' + cfgEnv('RESEND_API_KEY'), 'Content-Type': 'application/json'},
      body: JSON.stringify({from: cfgEnv('EMAIL_FROM'), to: [to], subject, html, text: plain}),
    });
    if (!r.ok) { const t = await r.text(); console.error('[mail] resend', r.status, t); if (throwOnError) throw new Error('Resend: ' + r.status); return {sent: false}; }
    return {sent: true};
  } catch (e) { console.error('[mail]', e.message); if (throwOnError) throw e; return {sent: false}; }
}
