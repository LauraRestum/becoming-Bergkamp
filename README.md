# Becoming Bergkamp

Wedding website for **Laura Restum & William Bergkamp** — Saturday, 13 March 2027,
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

### Connecting the RSVP form

The RSVP form posts to a Formspree placeholder. To wire it up:

1. Create a form at <https://formspree.io>.
2. Replace `action="https://formspree.io/f/your-id"` in `index.html` with the
   form endpoint Formspree gives you.

Without that change, the form degrades gracefully: it acknowledges the guest
locally and prompts for a real connection.

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
