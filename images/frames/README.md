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

Each **bio card** is a framed picture hung on the wall. The ornate frame is
drawn with `border-image` around the card (so it wraps any height of content
without distorting the corners), over a warm matte, with a cast shadow and a
small brass bolt at the top. Collapsed, the frame shows the person's name and a
short bio; opened, the same frame reveals their photos as clean prints inside.

The card frames alternate **colour and size** on a three-card cycle
(gold portrait → black landscape → gold square). Each `.bio-card` sets three
knobs — `--frame` (the PNG), `--bw` (border width) and `--slice` (the
border-image slice, as % insets of that PNG). See `.almanac .bio-card` in
`/styles.css`. Only the rectangular frames border-image cleanly; the oval and
arch frames remain in the library for photo overlays elsewhere.
