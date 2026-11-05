// Outgoing e-mail. Order: SMTP (admin → Ayarlar → E-posta Ayarları, or SMTP_* env) → Resend (RESEND_API_KEY) → test mode.
// In test mode nothing is sent and the action link is returned to the screen (devLink) so live tests can continue.
// Set EMAIL_TEST_MODE=off to hide links when nothing is configured.
import nodemailer from 'nodemailer';

const smtpReady = () => !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
const fromAddress = () => process.env.EMAIL_FROM || (process.env.SMTP_USER ? `Brazil Migration <${process.env.SMTP_USER}>` : '');
export const mailConfigured = () => (smtpReady() && !!fromAddress()) || !!(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
export const testMode = () => !mailConfigured() && process.env.EMAIL_TEST_MODE !== 'off';
export const mailProvider = () => smtpReady() ? 'smtp' : process.env.RESEND_API_KEY && process.env.EMAIL_FROM ? 'resend' : 'test';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
let transport = null, transportKey = '';
function smtp() {
  const key = [process.env.SMTP_HOST, process.env.SMTP_PORT, process.env.SMTP_SECURE, process.env.SMTP_USER, process.env.SMTP_PASS].join('|');
  if (!transport || key !== transportKey) {
    const port = Number(process.env.SMTP_PORT || 465);
    transport = nodemailer.createTransport({host: process.env.SMTP_HOST, port, secure: process.env.SMTP_SECURE ? process.env.SMTP_SECURE !== 'false' : port === 465, auth: {user: process.env.SMTP_USER, pass: process.env.SMTP_PASS}, connectionTimeout: 15000, greetingTimeout: 15000, socketTimeout: 20000});
    transportKey = key;
  }
  return transport;
}

export async function sendMail({to, subject, title, text, link, button, throwOnError, from}) {
  const html = `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#1a2e1f">
  <h2 style="color:#1b5e20">${esc(title || subject)}</h2><p style="line-height:1.6">${esc(text)}</p>
  ${link ? `<p><a href="${esc(link)}" style="display:inline-block;background:#1b5e20;color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none">${esc(button || 'Devam et')}</a></p><p style="font-size:12px;color:#667">Buton çalışmazsa bu bağlantıyı tarayıcınıza yapıştırın:<br>${esc(link)}</p>` : ''}
  <p style="font-size:12px;color:#889">Brazil Migration</p></div>`;
  const plain = `${text}\n\n${link || ''}`;
  if (!mailConfigured()) {
    console.log('[mail:test-mode]', to, subject, link || '');
    return {sent: false, devLink: testMode() ? link : undefined};
  }
  try {
    if (smtpReady()) {
      const msg = {replyTo: process.env.EMAIL_REPLY_TO || undefined, to, subject, html, text: plain};
      // İstenen gönderen adresi (ör. bilgi@…); SMTP sunucusu reddederse varsayılan adresle tekrar dener.
      if (from) { try { await smtp().sendMail({...msg, from}); } catch (e) { console.error('[mail] gönderen reddedildi, varsayılanla deneniyor:', e.message); await smtp().sendMail({...msg, from: fromAddress()}); } }
      else await smtp().sendMail({...msg, from: fromAddress()});
      return {sent: true};
    }
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {Authorization: 'Bearer ' + process.env.RESEND_API_KEY, 'Content-Type': 'application/json'},
      body: JSON.stringify({from: process.env.EMAIL_FROM, to: [to], subject, html, text: plain}),
    });
    if (!r.ok) { const t = await r.text(); console.error('[mail] resend', r.status, t); if (throwOnError) throw new Error('Resend: ' + r.status); return {sent: false}; }
    return {sent: true};
  } catch (e) { console.error('[mail]', e.message); if (throwOnError) throw e; return {sent: false}; }
}
