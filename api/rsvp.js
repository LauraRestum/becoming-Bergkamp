/* ============================================================
   /api/rsvp · Vercel serverless function
   ------------------------------------------------------------
   Receives a reply from rsvp.js, checks it, and relays it to the
   Google Apps Script web app that writes the Sheet and sends the
   emails. Nothing is stored on Vercel.

   Environment variables (Vercel · Project · Settings · Environment Variables):
     RSVP_WEBHOOK_URL   the Apps Script web app URL (ends in /exec)
     RSVP_SECRET        any long random string; the same value goes in Code.gs
     RSVP_CLOSE_AT      optional · ISO time replies close · default 2027-02-02T06:00:00Z
                        (that is the end of 1 February 2027, Central time)
   ============================================================ */

const ATTEND = new Set(['both', 'ceremony', 'reception', 'none']);
const DIET = new Set(['intolerance', 'allergy']);
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const LIMITS = { guests: 12, name: 80, songs: 6, song: 120, note: 600, email: 254, diet: 120 };

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'method-not-allowed' });
  }

  // Closed after the deadline (the page also checks, but never trust the page).
  const closeAt = Date.parse(process.env.RSVP_CLOSE_AT || '2027-02-02T06:00:00Z');
  if (Number.isFinite(closeAt) && Date.now() >= closeAt) {
    return res.status(410).json({ ok: false, error: 'closed' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch (e) { body = null; }
  }
  if (!body || typeof body !== 'object') {
    return res.status(400).json({ ok: false, error: 'bad-json' });
  }

  // Honeypot: real people never see the "website" field. Bots fill it. Pretend it worked.
  if (typeof body.website === 'string' && body.website.trim() !== '') {
    return res.status(200).json({ ok: true, id: 'ok' });
  }

  const reply = clean(body);
  if (reply.error) {
    return res.status(422).json({ ok: false, error: reply.error });
  }

  const webhook = process.env.RSVP_WEBHOOK_URL;
  const secret = process.env.RSVP_SECRET;
  if (!webhook || !secret) {
    console.error('RSVP relay is not configured: set RSVP_WEBHOOK_URL and RSVP_SECRET');
    return res.status(500).json({ ok: false, error: 'not-configured' });
  }

  const record = {
    secret,
    id: makeId(),
    receivedAt: new Date().toISOString(),
    ...reply.value
  };

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    const upstream = await fetch(webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(record),
      redirect: 'follow',            // Apps Script answers with a 302 to the result
      signal: controller.signal
    });
    clearTimeout(timer);

    const text = await upstream.text();
    let result = null;
    try { result = JSON.parse(text); } catch (e) { /* Apps Script sometimes wraps errors in HTML */ }

    if (!upstream.ok || !result || result.ok !== true) {
      console.error('Apps Script rejected the reply', upstream.status, text.slice(0, 300));
      return res.status(502).json({ ok: false, error: 'relay-failed' });
    }
    return res.status(200).json({ ok: true, id: record.id });
  } catch (err) {
    console.error('Relay error', err && err.message);
    return res.status(502).json({ ok: false, error: 'relay-failed' });
  }
};

/* ---------- helpers ---------- */

function clean(body) {
  const email = str(body.email, LIMITS.email);
  if (!EMAIL_RE.test(email)) return { error: 'bad-email' };

  if (!Array.isArray(body.guests) || body.guests.length === 0) return { error: 'no-guests' };
  if (body.guests.length > LIMITS.guests) return { error: 'too-many-guests' };

  const guests = [];
  for (const g of body.guests) {
    if (!g || typeof g !== 'object') return { error: 'bad-guest' };
    const name = str(g.name, LIMITS.name);
    const attend = str(g.attend, 20);
    if (!name) return { error: 'bad-guest-name' };
    if (!ATTEND.has(attend)) return { error: 'bad-guest-attend' };
    let diet = null;
    if (g.diet && typeof g.diet === 'object' && attend !== 'none') {
      const kind = str(g.diet.kind, 20);
      const detail = str(g.diet.detail, LIMITS.diet);
      if (kind && !DIET.has(kind)) return { error: 'bad-diet' };
      if (kind || detail) diet = { kind: kind || 'intolerance', detail };
    }
    guests.push({ name, attend, child: attend !== 'none' && g.child === true, diet });
  }

  // Transportation is not offered; the field is accepted for compatibility and always stored blank.
  const transport = '';

  const songs = Array.isArray(body.songs)
    ? body.songs.map(s => str(s, LIMITS.song)).filter(Boolean).slice(0, LIMITS.songs)
    : [];

  const note = str(body.note, LIMITS.note);
  const sentAt = str(body.sentAt, 40);

  return { value: { email: email.toLowerCase(), guests, transport, songs, note, sentAt } };
}

function str(v, max) {
  if (typeof v !== 'string') return '';
  return v.replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max);
}

function makeId() {
  const t = Date.now().toString(36).toUpperCase();
  const r = Math.random().toString(36).slice(2, 6).toUpperCase();
  return 'R-' + t.slice(-5) + r;
}
