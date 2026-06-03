# Frames & sconces

Transparent-background PNG decorations used on the Wedding Party page
(`/wedding-party`). All were cut out from the originals (now kept in
`/_archive`), trimmed to the artwork, and sized down for the web.

## Picture frames (transparent window — drop a photo behind them)

| File                        | Style                         |
| --------------------------- | ----------------------------- |
| `frame-gold-portrait.png`   | Gilt rectangle (portrait) — used for the bio-card photos |
| `frame-gold-square.png`     | Gilt ornate square            |
| `frame-gold-oval.png`       | Gilt oval                     |
| `frame-gold-oval-ornate.png`| Gilt oval, heavier carving    |
| `frame-gold-cartouche.png`  | Gilt elongated cartouche      |
| `frame-black-landscape.png` | Black ornate rectangle (landscape) |
| `frame-black-oval.png`      | Black oval                    |
| `frame-black-arch.png`      | Black cathedral / arch top    |
| `frame-black-cartouche.png` | Black elongated cartouche     |

The gold frames read best against the dark almanac background; the black
frames are kept here for future use on lighter surfaces.

## Sconces (decorative wall lights)

| File                  | Style                                   |
| --------------------- | --------------------------------------- |
| `sconce-monogram.png` | Gilt "B" sconce with crystals — crowns the frontispiece |
| `sconce-brass.png`    | Brass twin-candle sconce — flanks the frontispiece |

## How a frame is applied

Each **bio card** is a framed nameplate hung on the wall. The frame PNG is laid
over a matte that is **clipped to the frame's window shape** (`clip-path`), so
oval / arch / cartouche frames show no white bleed past the moulding. A cast
shadow (which follows the PNG's alpha, so shaped frames cast shaped shadows) and
a small brass nail make it look hung. Collapsed, the frame shows the person's
**name + title**; clicking opens a separate, unframed panel below with their
bio and a photo placeholder.

Every card gets a distinct frame via `:nth-of-type` on `.almanac .bio-summary`,
each setting `--frame` (the PNG), `--ar` (its width / height, so it isn't
stretched) and `--clip` (the matte shape: `none` for rectangles,
`ellipse(...)` for ovals, a rounded `inset(...)` for arches, a `polygon(...)`
for cartouches). See `.almanac .bio-summary` in `/styles.css`.
