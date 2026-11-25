# YWAM Ships Kona — website redesign

A new version of ywamshipskona.org. The homepage opens on a live 3D sea at dusk off Kona: the m/v YWAM Liberty steams west, embers rise, dolphins ride along, and the water glows where you move the pointer. Scrolling lifts the camera, burns the sea away into a chart of the Pacific, and draws the voyage from Kona to the Marshall Islands to Madang.

The design system ("Fire on the water") is documented in [DESIGN.md](DESIGN.md).

## Run it

```bash
npm install
npm run dev
```

Open http://localhost:5173. To build static files into `dist/`:

```bash
npm run build
```

`dist/` can be hosted on any static host (Netlify, Vercel, Cloudflare Pages, S3, or WordPress as a static front end).

## Structure

| Path | What it is |
|---|---|
| `index.html`, `train.html`, `volunteer.html`, `give.html`, `about.html`, `stories.html` | The pages |
| `partials/` | Shared header and footer, included at build time (`<!-- @include partials/header.html page="train" -->`) |
| `src/main.js` | Shared behaviour: smooth scroll (Lenis + GSAP ScrollTrigger), header, mobile menu, newsletter form |
| `src/home.js` | Homepage: voyage scroll choreography, departures board, deck explorer, stories, voices |
| `src/pages/*.js` | One script per inner page |
| `src/three/` | The 3D voyage: `sea.js` (sky, ocean shader, embers, Hawaiʻi silhouette), `ship.js` (the Liberty, modelled in code from her photos), `chart.js` (Pacific chart, route), `dolphins.js`, `voyage.js` (renderer, fire transition, camera) |
| `src/data/` | Schools, stories and voyage geography as plain data, easy to update |
| `src/styles/` | `base.css` (tokens, type, header, footer), `components.css` (shared blocks), one file per page |
| `public/assets/` | Photos (from the current site's media library), brand files, the dolphin model, the dusk sky, Pacific coastline data |
| `design-assets/` | Other free 3D models and skies found during research, not used on the site (see `design-assets/3d/CREDITS.txt` before using any) |

## Updating content

- **Upcoming schools**: edit `src/data/schools.js`. Past start dates drop off the board automatically, and the countdowns are computed in Hawaiʻi time.
- **Stories**: add an entry to `src/data/stories.js` and put its photo in `public/assets/img/stories/`.
- **Impact numbers**: in `index.html`, section "From the ship's log". Each figure shows its year; keep it that way.

## Credits and licences

- Photos: YWAM Ships Kona's own media library.
- Dolphin model: "Dolphin" by Quaternius, CC0 (poly.pizza).
- Dusk sky: "Qwantani Dusk 2 (Pure Sky)" from Poly Haven, CC0.
- Coastlines: Natural Earth 10m land, public domain.
- Fonts: Archivo and Newsreader, SIL Open Font License, self-hosted via Fontsource.
- Libraries: three.js (MIT), GSAP (free licence), Lenis (MIT), Vite (MIT).
