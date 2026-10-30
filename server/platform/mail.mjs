// Outgoing e-mail. With RESEND_API_KEY + EMAIL_FROM set, mails go through Resend.
// Without them the app runs in test mode: nothing is sent and the action link is returned
// to the screen (devLink) so live tests can continue. Set EMAIL_TEST_MODE=off to hide links.
export const mailConfigured = () => !!(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
export const testMode = () => !mailConfigured() && process.env.EMAIL_TEST_MODE !== 'off';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));

export async function sendMail({to, subject, title, text, link, button}) {
  const html = `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#1a2e1f">
  <h2 style="color:#1b5e20">${esc(title || subject)}</h2><p style="line-height:1.6">${esc(text)}</p>
  ${link ? `<p><a href="${esc(link)}" style="display:inline-block;background:#1b5e20;color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none">${esc(button || 'Devam et')}</a></p><p style="font-size:12px;color:#667">Buton çalışmazsa bu bağlantıyı tarayıcınıza yapıştırın:<br>${esc(link)}</p>` : ''}
  <p style="font-size:12px;color:#889">Brazil Migration</p></div>`;
  if (!mailConfigured()) {
    console.log('[mail:test-mode]', to, subject, link || '');
    return {sent: false, devLink: testMode() ? link : undefined};
  }
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {Authorization: 'Bearer ' + process.env.RESEND_API_KEY, 'Content-Type': 'application/json'},
      body: JSON.stringify({from: process.env.EMAIL_FROM, to: [to], subject, html, text: `${text}\n\n${link || ''}`}),
    });
    if (!r.ok) { console.error('[mail] resend', r.status, await r.text()); return {sent: false}; }
    return {sent: true};
  } catch (e) { console.error('[mail]', e.message); return {sent: false}; }
}
