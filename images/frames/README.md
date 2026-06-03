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

A frame sits on top of its photo via a CSS overlay: the photo fills the
whole box and the frame's solid border laps over the edges, cropping it to
the window. See `.almanac .bio-photo` in `/styles.css`. To match a
different frame, set the box's `aspect-ratio` to that PNG's width / height.
