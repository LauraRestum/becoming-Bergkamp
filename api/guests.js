/* ============================================================
   /api/guests · Vercel serverless function
   ------------------------------------------------------------
   Powers "Find your invitation" on /rsvp. A guest types part of
   their name; this returns the matching households from the
   Wedding Invites sheet (by way of the same Apps Script web app
   the RSVP uses), so the form can fill in everyone on the card.

   Only names, households and an eight-or-under flag are returned,
   only for a query of at least two letters, and never more than a
   handful at a time. The full list is never sent to the browser.

   Uses the same environment variables as /api/rsvp:
     RSVP_WEBHOOK_URL   the Apps Script web app URL (ends in /exec)
     RSVP_SECRET        the shared secret
   ============================================================ */

const CACHE_MS = 5 * 60 * 1000;   // the list is re-read from the sheet at most every five minutes
const MAX_RESULTS = 6;

let cache = { at: 0, households: null };

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ ok: false, error: 'method-not-allowed' });
  }
  res.setHeader('Cache-Control', 'no-store');

  const q = norm(String((req.query && req.query.q) || '')).slice(0, 60);
  if (q.replace(/\s/g, '').length < 2) return res.status(200).json({ ok: true, results: [] });

  let households;
  try {
    households = await loadHouseholds();
  } catch (err) {
    console.error('Guest list unavailable', err && err.message);
    return res.status(503).json({ ok: false, error: 'unavailable' });
  }

  const words = q.split(' ').filter(Boolean);
  const scored = [];
  for (const h of households) {
    let best = 0;
    let hit = null;
    for (const m of h.members) {
      if (!m.name) continue;                       // blank +1s and unnamed kids are never searchable
      const s = score(norm(m.name), words);
      if (s > best) { best = s; hit = m.name; }
    }
    if (best > 0) scored.push({ h, best, hit });
  }
  scored.sort((a, b) => b.best - a.best || a.hit.localeCompare(b.hit));

  const results = scored.slice(0, MAX_RESULTS).map(({ h, hit }) => ({
    match: hit,
    label: h.label,
    members: h.members.map(m => ({
      listName: m.listName,
      name: m.name,
      open: !!m.open,
      child: !!m.child
    }))
  }));

  return res.status(200).json({ ok: true, results });
};

async function loadHouseholds() {
  if (cache.households && Date.now() - cache.at < CACHE_MS) return cache.households;

  const webhook = process.env.RSVP_WEBHOOK_URL;
  const secret = process.env.RSVP_SECRET;
  if (!webhook || !secret) throw new Error('not-configured');

  const url = webhook + (webhook.includes('?') ? '&' : '?')
    + 'action=guests&secret=' + encodeURIComponent(secret);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  const r = await fetch(url, { redirect: 'follow', signal: controller.signal });
  clearTimeout(timer);
  const text = await r.text();
  let body = null;
  try { body = JSON.parse(text); } catch (e) { /* Apps Script sometimes answers in HTML */ }
  if (!r.ok || !body || body.ok !== true || !Array.isArray(body.households)) {
    // Serve the last good copy rather than nothing.
    if (cache.households) return cache.households;
    throw new Error('bad-upstream ' + r.status + ' ' + text.slice(0, 120));
  }
  cache = { at: Date.now(), households: body.households };
  return body.households;
}

// Lowercase, strip accents and punctuation, collapse spaces.
function norm(s) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/'/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
}

// Every typed word must start one of the name's words. Earlier and fuller hits rank higher.
function score(name, words) {
  const parts = name.split(' ');
  let total = 0;
  for (const w of words) {
    let found = 0;
    for (let i = 0; i < parts.length; i++) {
      if (parts[i] === w) { found = Math.max(found, 3 - Math.min(i, 1)); }
      else if (parts[i].startsWith(w)) { found = Math.max(found, 2 - Math.min(i, 1) * 0.5); }
    }
    if (!found) return 0;
    total += found;
  }
  return total;
}
