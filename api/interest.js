/* ═══════════════════════════════════════════════════════════
   POST /api/interest  —  Bold FC lead capture
   Vercel Node serverless function. No dependencies.

   Configure ONE OR BOTH of these in Vercel → Project → Settings
   → Environment Variables:

     LEAD_WEBHOOK_URL   Any webhook that accepts JSON — n8n,
                        Zapier, Make, Airtable, a Google Sheet
                        relay, or your CRM. Gets the full lead.

     RESEND_API_KEY     Sends an email notification per lead.
                        Requires LEAD_TO_EMAIL, and a verified
                        LEAD_FROM_EMAIL on your Resend domain.
     LEAD_TO_EMAIL      e.g. andy@boldfctaylor.com (comma-separated ok)
     LEAD_FROM_EMAIL    e.g. leads@boldfctaylor.com

   ⚠ If NEITHER is set the lead is only written to the Vercel
   runtime log. Recoverable, but not a system. Wire one up
   before you drive real traffic here.
   ═══════════════════════════════════════════════════════════ */

const FIELDS = [
  ['parentName',  'Parent name',    120,  true],
  ['playerName',  'Player name',    120,  true],
  ['age',         'Age',              8,  true],
  ['birthYear',   'Birth year',       8,  true],
  ['currentClub', 'Current club',   160, false],
  ['position',    'Position',        60,  true],
  ['email',       'Email',          160,  true],
  ['phone',       'Phone',           40,  true],
  ['looking',     'Looking for',   4000,  true],
];

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { return res.status(400).json({ error: 'Invalid JSON' }); }
  }
  if (!body || typeof body !== 'object') {
    return res.status(400).json({ error: 'Missing body' });
  }

  // Honeypot — a bot filled the hidden field. Look successful, drop it.
  if (String(body.company || '').trim() !== '') {
    return res.status(200).json({ ok: true, delivered: [] });
  }

  // Normalise + validate
  const lead = {};
  const missing = [];
  for (const [key, label, max, required] of FIELDS) {
    const value = String(body[key] ?? '').trim().slice(0, max);
    if (required && !value) missing.push(label);
    lead[key] = value;
  }
  if (missing.length) {
    return res.status(400).json({ error: `Missing required field(s): ${missing.join(', ')}` });
  }
  if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(lead.email)) {
    return res.status(400).json({ error: 'Invalid email address' });
  }

  lead.submittedAt = new Date().toISOString();
  lead.source = String(body.source || 'boldfc-landing').slice(0, 60);
  lead.pageUrl = String(body.pageUrl || '').slice(0, 300);
  lead.userAgent = String(req.headers['user-agent'] || '').slice(0, 300);
  lead.ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();

  // Always log — this is the last-resort record.
  console.log('[bold-fc:lead]', JSON.stringify(lead));

  const delivered = [];
  const failures = [];

  // ── Sink 1: generic webhook ──────────────────────────────
  if (process.env.LEAD_WEBHOOK_URL) {
    try {
      const headers = { 'Content-Type': 'application/json' };
      if (process.env.LEAD_WEBHOOK_KEY) headers['X-Api-Key'] = process.env.LEAD_WEBHOOK_KEY;

      const r = await fetch(process.env.LEAD_WEBHOOK_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify(lead),
      });
      if (!r.ok) throw new Error(`webhook responded ${r.status}`);
      delivered.push('webhook');
    } catch (err) {
      console.error('[bold-fc:webhook-failed]', err.message);
      failures.push('webhook');
    }
  }

  // ── Sink 2: email via Resend ─────────────────────────────
  if (process.env.RESEND_API_KEY && process.env.LEAD_TO_EMAIL) {
    try {
      const r = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: process.env.LEAD_FROM_EMAIL || 'Bold FC <onboarding@resend.dev>',
          to: process.env.LEAD_TO_EMAIL.split(',').map((s) => s.trim()).filter(Boolean),
          reply_to: lead.email,
          subject: `Bold FC interest — ${lead.playerName} (${lead.birthYear}, ${lead.position})`,
          text: asText(lead),
          html: asHtml(lead),
        }),
      });
      if (!r.ok) throw new Error(`resend responded ${r.status}: ${await r.text()}`);
      delivered.push('email');
    } catch (err) {
      console.error('[bold-fc:email-failed]', err.message);
      failures.push('email');
    }
  }

  // Every configured sink failed → tell the browser so the parent retries.
  if (failures.length && !delivered.length) {
    return res.status(502).json({ error: 'Could not record your submission. Please try again.' });
  }

  if (!delivered.length) {
    console.warn('[bold-fc:NO-SINK] No LEAD_WEBHOOK_URL or RESEND_API_KEY set — lead exists only in this log.');
  }

  return res.status(200).json({ ok: true, delivered });
}

/* ── formatting helpers ─────────────────────────────────── */
const ROWS = [
  ['Parent name',   'parentName'],
  ['Email',         'email'],
  ['Phone',         'phone'],
  ['Player name',   'playerName'],
  ['Age',           'age'],
  ['Birth year',    'birthYear'],
  ['Position',      'position'],
  ['Current club',  'currentClub'],
];

function asText(lead) {
  const lines = ROWS.map(([label, key]) => `${label.padEnd(14)} ${lead[key] || '—'}`);
  return [
    'NEW BOLD FC INTEREST',
    '====================',
    ...lines,
    '',
    'What are you looking for in a soccer club?',
    lead.looking,
    '',
    `Submitted ${lead.submittedAt}`,
  ].join('\n');
}

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function asHtml(lead) {
  const rows = ROWS.map(([label, key]) =>
    `<tr>` +
      `<td style="padding:9px 16px 9px 0;border-bottom:1px solid #dfe4dd;font:600 11px/1.4 Arial,sans-serif;letter-spacing:.12em;text-transform:uppercase;color:#808b84;white-space:nowrap;vertical-align:top">${esc(label)}</td>` +
      `<td style="padding:9px 0;border-bottom:1px solid #dfe4dd;font:400 15px/1.5 Arial,sans-serif;color:#0f1a20">${esc(lead[key] || '—')}</td>` +
    `</tr>`).join('');

  return '<div style="background:#f3f5f1;padding:28px;font-family:Arial,sans-serif">' +
    '<div style="max-width:600px;margin:0 auto;background:#fff;border:2px solid #0f1a20">' +
      '<div style="background:#0f1a20;padding:20px 24px">' +
        '<div style="font:700 20px/1 Arial Black,Arial,sans-serif;color:#f3f5f1;letter-spacing:-.5px">BOLD <span style="color:#b5dc10">FC</span></div>' +
        '<div style="font:600 10px/1.4 Arial,sans-serif;letter-spacing:.18em;text-transform:uppercase;color:#808b84;margin-top:6px">New Player Interest</div>' +
      '</div>' +
      '<div style="padding:24px">' +
        `<table style="width:100%;border-collapse:collapse">${rows}</table>` +
        '<div style="margin-top:24px;padding:18px;background:#f3f5f1;border-left:4px solid #b5dc10">' +
          '<div style="font:600 11px/1.4 Arial,sans-serif;letter-spacing:.12em;text-transform:uppercase;color:#808b84;margin-bottom:10px">What are you looking for in a soccer club?</div>' +
          `<div style="font:400 15px/1.6 Arial,sans-serif;color:#0f1a20;white-space:pre-wrap">${esc(lead.looking)}</div>` +
        '</div>' +
        `<div style="margin-top:22px;font:400 12px/1.5 Arial,sans-serif;color:#808b84">Submitted ${esc(lead.submittedAt)}${lead.source ? ' · ' + esc(lead.source) : ''}</div>` +
      '</div>' +
    '</div>' +
  '</div>';
}
