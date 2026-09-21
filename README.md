# Becoming Bergkamp

Wedding website for **Laura Restum & William Bergkamp** — Saturday, 20 March 2027,
Wichita, Kansas.

A static, hand-built single-page site. No framework, no build step. The Bergkamp
Almanac (parents, wedding party, family, menagerie) lives as a section inside
`index.html` and is reached via `#wedding-party`.

## Structure

```
.
├── index.html                # the whole site — chapel + Almanac
├── 404.html
├── favicon.svg
├── robots.txt
├── sitemap.xml
├── vercel.json               # routing, headers, caching
├── .vercelignore             # excludes the source PNGs in _archive
├── _archive/                 # original ChatGPT source PNGs (not deployed)
└── images/                   # JPGs extracted from the original embedded HTML
    ├── main-1.jpg            # cover painting (chapel doors)
    ├── main-2.jpg            # hero / LCP image
    ├── main-3.jpg            # chapel exterior
    ├── main-4.jpg            # lattice detail
    └── party-1.jpg           # almanac paper texture
```

## Local preview

```sh
npm start          # serves the directory on http://localhost:3000
```

(uses `npx serve` — no install required if you already have node).

## Deploying to Vercel

1. Push this repo to GitHub.
2. In the Vercel dashboard, **Add New → Project**, import the repo.
3. Framework Preset: **Other** (static). Root directory: `./`. Build command:
   leave empty. Output directory: leave empty.
4. Deploy.

`vercel.json` handles clean URLs, long-cache headers for `/images/*`, and
strict-transport-security. The `og:url` and `canonical` URLs in the HTML
currently point at `https://becoming-bergkamp.vercel.app/` — update both files
after Vercel assigns the production domain.

### The RSVP

`/rsvp` is a real form (`rsvp.html`, `rsvp.css`, `rsvp.js`). Each reply posts to
`api/rsvp.js`, a Vercel serverless function, which relays it to a Google Apps
Script attached to a Google Sheet. The Sheet holds every reply and the script
emails Laura and William on each one, plus a confirmation to the guest.

What the form collects: a row per guest (name, ceremony and reception or only
one, eight or under, and a dietary restriction marked as an intolerance or an
allergy with what to avoid), song suggestions, an email for the confirmation, and an
optional note. The page is set on the course like The Day (grass art-bg, house
script, white type). Replies close at the end of 1 February 2027 (Central);
after that the page shows a closed notice and the function refuses submissions.
Add `?open=1` to the URL to preview the form past the deadline (the function
still enforces it).

Catering: the Sheet's **Summary** tab counts plates with guests eight and under
at one half. Only reception attendance counts toward plates.

Wiring it up (once):

1. Create a Google Sheet. Extensions → Apps Script. Paste in
   `apps-script/Code.gs`, set `SECRET` and `NOTIFY_TO`, run `setup` once.
2. Deploy → New deployment → Web app → Execute as **Me**, access **Anyone**.
   Copy the `/exec` URL.
3. In Vercel → Project → Settings → Environment Variables add
   `RSVP_WEBHOOK_URL` (that URL) and `RSVP_SECRET` (the same secret), then
   redeploy.
4. Run `testReply` in the Apps Script editor to check the Sheet and the emails,
   then `resetForLaunch` to wipe the test rows before invitations go out.

If a guest replies twice from the same email, the earlier rows are marked
`Current = No` and the Summary only counts the latest. Drafts are kept in the
guest's browser so a refresh does not lose their work, and a browser that has
already sent a reply shows the confirmation with an "Edit this reply" button.

### Connecting honeymoon contributions

The four amount buttons are non-transactional by design — they show a
confirmation message and assume you'll send each guest a private contribution
link with their invitation. Swap in a Stripe Payment Link or Venmo / Zelle
deep-link in the click handler at the bottom of `index.html` to make them live.

## Notes on optimisation

- Originally, both HTML files carried their imagery as base64 data URLs,
  which made `restum-bergkamp-v7-2.html` 1.7 MB. The images have been
  extracted to `/public/images/` so the HTML is now ~36 KB and the browser
  caches the JPGs independently.
- Fonts are loaded with `&display=swap` so text paints before they arrive.
- The LCP image (`main-2.jpg`) is `<link rel="preload">`-ed.
- `prefers-reduced-motion` is respected throughout.
- All images carry meaningful `alt` text and `loading="lazy"` (except the
  hero, which is loaded eagerly via CSS).
