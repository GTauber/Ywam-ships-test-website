# YWAM Ships Kona: "Fire on the water"

The design system for the new ywamshipskona.org. Read this before adding a page.

## The idea

Kona sits on the slopes of a volcano. On Hawaiʻi Island, new land forms where lava meets the sea. YWAM Ships Kona does the same thing in another way: it carries fire (the Holy Spirit, a trained and sent generation) across water to islands that only a ship can reach. Everything on the site follows from that pairing.

- **The sea is the stage.** The homepage opens on a live WebGL ocean at dusk. The m/v YWAM Liberty, modelled from her photographs, steams west into the afterglow. Embers rise through the frame, and the water glows cyan where the visitor stirs it.
- **The fire carries you across.** As you scroll, the camera lifts off the water and the scene burns away from the bottom up into a living chart of the Pacific. The route draws itself from Kona to Majuro to Madang.
- **Then the page goes quiet.** After the voyage, sections use flat brand surfaces, real photography and plain words. One loud moment, not twenty.

## Colour

Every colour is from the brand. Night is brand navy taken to midnight.

| Token | Hex | Role |
|---|---|---|
| `--night` | `#071222` | 3D surround, footer, dark sections |
| `--ocean` | `#213854` | Brand navy. Primary dark surface, links on light |
| `--lagoon` | `#50c2db` | Water light: links and focus on dark, reef shallows, bioluminescence |
| `--ember` | `#df6441` | Action and fire: Donate, Apply, the route, embers. Never decoration |
| `--flare` | `#b8162d` | The hottest ember, used sparingly |
| `--basalt` | `#363837` | Body text on light (11.8:1 on white) |
| `--salt` / `--foam` | `#ffffff` / `#edf3f4` | Light surfaces |

Contrast rules: ember buttons carry `--night` text (5.4:1). Ember text on white uses `--ember-deep` `#c2461f` (5.0:1). Lagoon is never text on white.

## Type

- **Archivo Variable** (wdth 62–125). Headlines are set wide and heavy (`font-stretch: 112–118%`, weight 780–820), like the name painted on a ship's bow. Body text is 100% width, 17px/1.6.
- **Newsreader Variable italic** is used for place names and human voices (testimonials, quotes). It mirrors the italic labels for water on a nautical chart. A whole element is set in it, never a single accented word.
- Sentence case everywhere. No all-caps eyebrows, no monospace labels, no arrows appended to button text.

## Layout

12-column, max 1440px, gutter `clamp(16px, 4vw, 56px)`. Text is left-aligned and kept under 66ch. Radius has a hierarchy: buttons are pills (life rings), photos get 6px, full-bleed sections get 0.

```
HOME
┌──────────────────────────────────────────────────────────────────┐
│ logo   Train  Volunteer  Give  Stories  About     [Apply][Donate]│
│                                                                  │
│      WebGL: dusk sea, Liberty crossing the glitter path, embers  │
│                                                                  │
│ Some islands only                                                │
│ a ship can reach.                          19.64° N 155.99° W    │
│ [Find your school] [Give]                  Kona, Hawaiʻi         │
└──────────────────────────────────────────────────────────────────┘
  scroll: camera lifts, manifesto lines light up word by word
  scroll: the sea burns away into the chart; route draws Kona → Madang
┌──────────────────────────────────────────────────────────────────┐
│ chart (sticky, full-bleed)        │ Port of call card            │
│   Kona ●━━━━━━━━━● Majuro ━━━━━━━━━━━━━━━● Madang               │
└──────────────────────────────────────────────────────────────────┘
Three ways aboard: Train / Volunteer / Give (big type rows, photo follows cursor)
Departures board: upcoming schools as a ship's departure schedule
The Liberty, deck by deck: line drawing, tap a deck to see who works there
Ship's log: impact numbers with their dates and sources
Stories from the field: one lead story + three
Voices: testimonials in Newsreader italic
Final call: "Be the difference" over embers, then the footer
```

## Motion

- Motion is either ambient in the 3D scene or answers the visitor: stirring the water, scrubbing the route, dragging the departures board, opening a deck.
- Content is visible by default. Nothing waits at opacity 0 for a scroll trigger.
- `prefers-reduced-motion`: the scene renders one still frame per scroll change, embers stop, and Lenis smooth scrolling is off.
- No WebGL: the hero falls back to the aerial photograph of the Liberty.

## Pages

| Page | File | Job |
|---|---|---|
| Home | `index.html` | Inspire, then route people to Train, Volunteer or Give |
| Train | `train.html` | Every school, filterable, with dates and a clear next step |
| Volunteer | `volunteer.html` | Roles by department, what to expect, how to apply |
| Give | `give.html` | Why gifts go further (self-funded staff), ways to give, trust seals |
| About | `about.html` | Story, the Liberty, where we serve, what we believe |
| Stories | `stories.html` | Field stories from the blog |

Shared header and footer live in `partials/` and are pulled in with `<!-- @include partials/header.html page="train" -->` (see `vite.config.js`).
