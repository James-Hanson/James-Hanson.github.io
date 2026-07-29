# New Forking Festival HTML deck: agent handoff

Both removed versions of `#what-can-you-do-again/1` are archived under
`../archive/removed-slides/what-can-you-do-again-step-1/`. The conceptual
slide is no longer part of the live deck.

## Scope and archival boundary

Work on the current talk belongs under:

```text
new-forking-festival-2026/
```

Read the repository-level `AGENTS.md` before making changes. The BLAST 2026
and Logic Colloquium 2026 sources and their generated slide directories are
archival. Do not edit them. Existing files under `shared-assets/` are also
immutable; add a newly named file if the current talk needs a variant.

The active deck may read or symlink an archival asset. The build does this for
unchanged title art, animation cutouts, and WebM files so they are not copied.
It does not modify the source asset.

The published reference implementation is read-only and lives at:

```text
/home/exo/website/James-Hanson.github.io/slides/
```

Its Philadelphia and Swansea editions establish the intended title
composition, animated scenes, media loading, and press-and-hold navigation
behavior.

## Build and run

From `new-forking-festival-2026/html/`:

```bash
npm run build
npm test
npm run serve
```

Open:

```text
http://127.0.0.1:8765/new-forking-festival-2026/html/
```

The HTML deck is the sole presentation target for current reordering and new
material. Do not synchronize those changes into
`new-forking-festival-2026.tex` or regenerate
`new-forking-festival-2026.pdf` unless the user explicitly requests a PDF
edition. TeX modules referenced by `html/deck.json` are inputs used to produce
SVG steps for the HTML viewer; compiling those modules during `npm run build`
does not imply maintenance of the separate PDF deck.

When a TeX-authored visual needs to diverge from the PDF talk, keep an
HTML-only module under `html/slides/` and point `deck.json` to it. For example,
`#k-ineffable` now uses `html/slides/k-ineffable.tex`; the original
`slides/k-ineffable.tex` remains unchanged.

`#k-ineffable/4` displays the module's fourth SVG step without animation.
`#k-ineffable/5` appends `slides/k-ineffable-hierarchy.html` as a separate
navigation step and starts zooming immediately when entered; no second advance
keypress is required. The custom scene begins with that same generated
fourth-step SVG filling the frame, then zooms the complete frame out to expose
a branching hierarchy that continues far above and below it. The camera keeps
the bottom of the original frame fixed throughout the zoom. The replacement
hierarchy is anchored on the original magenta `k`-ineffable entry, descends
along the linear inaccessible–Mahlo–weakly compact–ineffable spine, and
branches through the
Jónsson/Rowbottom, Ramsey/measurable, compactness, and hugeness regions before
ending at `0=1`. The upper end deliberately uses the schematic family label
`n-huge`; it does not also enumerate `2-huge` and `3-huge`. A dashed connector
between extendible and almost huge keeps the visual hierarchy continuous while
marking that part of the diagram as schematic. Vopěnka's Principle is
deliberately omitted.

Both font sizes and inter-rung gaps grow geometrically with the zoom. Labels
use Latin Modern Sans and transparent backgrounds; several dark text shadows
preserve readability over the single palette-magenta pigeon-head bloom. Two
large, aspect-ratio-preserving mirrored pigeon cutouts flank the final view.
The generated fourth-step SVG remains unaltered and shrinks as a whole, so its
Beamer-rendered `k`-ineffability definition persists through the animation.

The upper partition relation and the enlarged `0=1` label are TeX expressions
pre-rendered as static SVGs in
`assets/k-ineffable-hierarchy/`. Regenerate them with
`npm run render:hierarchy-formulas`. The combined rank-into-rank label is HTML
text reading `I0-I3 rank-into-rank`, as requested. The slide does not load
MathJax or wait for browser typesetting at runtime.

`#section-stability/2` reuses the crossed-out animated section heading and adds
a static bottom caption reading “(i.e. old forking).” The caption source is
`slides/section-stability-old-forking-overlay.tex`; regenerate its transparent
SVG with `npm run render:section-stability-caption`. The caption sits outside
the swaying scene container, so it does not bob or rotate with the title.
Both subslides have the same iframe source; `deck.js` reuses that iframe and
sends an `oldForking` HTML state update, so revealing or hiding the caption
does not restart the sway animation.
Exact preview mode is enabled only when the `preview` query parameter is
actually present, preventing ordinary deck playback from being frozen at its
initial position.

At progress zero, the colon and magenta `k-ineffable` anchor are not HTML
reconstructions. Split black masks cover only the old hierarchy above and
below them, leaving those exact pixels from the generated third TeX frame
visible. Since the same TeX node is present in the preceding frame, neither
the colon nor the anchor changes typeface, size, or position at the transition.

The scene is idle at its original view on entry. One Right/Space press triggers
the complete 2.2-second zoom without requiring the key to remain held, and it
hangs at the fully zoomed-out endpoint; the next fresh press advances. Left
rewinds to the original view before a subsequent Left leaves the slide. This
uses the shared controller's `triggerOnAdvance` mode rather than its ordinary
press-and-hold drift. The override receives its current generated footer URL
from the build and embeds that footer inside the shrinking frame; `deck.js`
suppresses the normal fixed footer for steps marked `embeddedFooter` so two
numbers are never shown. The `preview` query parameter on the standalone scene
fixes a camera position from 0 to 1 for visual testing.

The parent treats the iframe's full `load` event—not the controller's earlier
`deck-ready` message—as authoritative. Captured key actions received while the
hierarchy images or fonts are still loading are queued and replayed after the
single `deck-enter`. This prevents a late load event from resetting a zoom
that the first arrow press already started.

The zoom step sets both `fullBleed` and `borderless`, matching the
full-viewport treatment of the pigeon scene. The extra horizontal viewport
space keeps wide hierarchy labels from being clipped while the original 4:3
frame remains centered inside the world. `#thank-you/1` remains borderless but
4:3. A 2 px black overlay masks the outermost edge of those frames, including
page-edge artifacts inside generated SVGs. The zoom scene also tracks the
shrinking original frame with a separate 1 px screen-space black mask. Because
that mask is outside the transformed world, it stays one physical CSS pixel
wide at every point in the zoom.

The zoom reveals a symmetric pair of giant pigeons at world x-coordinates
`-52000` and `52000`; the left pigeon is mirrored. Both retain the source
image's natural aspect ratio at width `85000` and vertical center `15479`.
Their heads align with the `0=1` rung, while their portrait-scale bodies
extend far beyond the bottom and outside edges of the fully zoomed-out
viewport. A single broad magenta radial bloom at world coordinate
`(0, -17000)` spans both inward-facing heads, making the black beaks visible
without the overlap seam produced by separate glow fields.

The temporary section headings are based on the New Forking Festival ODP.
`#section-neostability/1`, immediately after the title, uses
`slides/section-higher-arity-neostability-sway.html`. Its 18 source SVG
frames in `assets/section-headings/sway-18/` are genuine LibreOffice renders
at evenly spaced vertical 3D rotation angles from -2 through 2 degrees. The
active HTML uses the 1440×1080 indexed-PNG derivatives in
`assets/section-headings/sway-18-png/`, avoiding the cost of parsing the
Fontwork paths on slide entry. It swaps directly between adjacent renders
every 255 ms; its full cycle is about 8.7 seconds. There is no
opacity crossfade and it does not synthesize the 3D lettering in CSS.

The HTML adds a separate exact sinusoidal vertical translation with a 6.15
second period and 0.6vh amplitude. The bob remains faster than the rotational
cycle, and the different periods keep the two motions out of phase.
Reduced-motion clients use `sway-18-png/reduced-motion.png` and receive
neither motion. After PDF-to-SVG conversion, remove the exporter-generated
white full-page path from each frame; the larger black background rectangle
remains, and removing the white path prevents a faint antialiased box at the
page edge.

`#section-stability/1` appears immediately before `#splitting/1` and reuses
the same 18 rendered frames and shared `slides/section-heading-sway.js`
controller. Its HTML adds two white, dark-blue-shadowed SVG strike marks: the
long mark crosses all of “higher-arity,” while the short mark crosses only
“neo.” The strikes live inside the bobbing scene wrapper, so they share the
vertical motion but intentionally remain fixed while the rendered lettering
sways underneath them. This avoids a second copy of the large frame tree.

The former `#splitting/2` overlay remains preserved under
`../archive/removed-slides/`; see that directory's `README.md`. The active
module again has two navigation steps, but with new content: `/1` raises the
splitting definition on the left without moving the diagram, and `/2` adds
the local-character characterization of stability beneath it.

`#stability` now has three overlays under the title “Indiscernibles from
stability (Shelah).” The end-homogeneity plus no-splitting implication stays
fixed at the top throughout. `/2` adds only the Stable-plus-Fodor implication,
and `/3` retains both lines, adds the pigeon, and places the full regressive-map
form of Fodor's lemma in a small two-line block along the bottom. The displaced
explanatory prose is no longer present on this slide.

The editable zero-degree source is
`assets/section-headings/higher-arity-neostability.odp`, a newly named
derivative whose third page says “higher-arity” and “neostability” on separate
lines. The adjacent one-page PDF is its static rendered fallback. The heading
uses LibreOffice's genuine `fontwork-slant-up` preset with a gentle incline,
Source Serif Pro Black face, palette gradient, and real Fontwork 3D extrusion.
The earlier bowed `fontwork-arch-up-pour` version is set aside as
`higher-arity-neostability-bowed.odp` and
`higher-arity-neostability-bowed.pdf` for possible use by a later section.
LibreOffice was also tested with `style:text-line-through-style="solid"` and
`style:text-line-through-type="single"` on the Fontwork text style. The ODP
accepts those properties, but the 3D Fontwork renderer omits the strike line
from its exported glyph paths. A crossed-out 3D heading therefore needs a
separately positioned OpenOffice line or thin shape; ordinary character
strikethrough is not sufficient.

`#section-k-splitting/1` uses the bowed Fontwork derivative
`assets/section-headings/k-splitting-bowed.odp`. Its HTML applies a slow,
subtle 2D sway of ±0.95 degrees to the already rendered 3D page. The transform
origin is 51.575% across and 60.500% down: this is the exact center of the
ODP's 22.874 cm by 11.439 cm circular custom shape at (1.663 cm, 5.806 cm) on
the 25.4 cm by 19.05 cm page. Reduced-motion clients keep the neutral render.
`#section-combinatorics/1` uses
`slides/section-combinatorics-sway.html`, immediately before
`#canonical-partition-tree/1`. Its 18 PNG frames in
`assets/section-headings/combinatorics-sway-18/` are genuine 2880×2160
LibreOffice renders at the same evenly spaced -2 through 2 degree vertical 3D
rotation angles as the neostability heading. The active HTML uses the
1440×1080 indexed-PNG derivatives in
`assets/section-headings/combinatorics-sway-18-low/`. It reuses the same frame
sequence, 255 ms cadence, vertical bob, preload gate, and reduced-motion
behavior via `slides/section-heading-sway.js`. Raster frames prevent the
title's many Fontwork paths from painting visibly in pieces.

Run `npm run render:combinatorics-sway` to regenerate the frames and the
reproducible active-talk derivative
`assets/section-headings/combinatorics-sway.odp`. The script reads page 2 of
the shared cover ODP without modifying it. The shared ODP/PDF remains
unchanged; never write active-talk edits back into those shared originals.
All three section-title slides set `numbered: false`, so none displays a
footer number or changes the numbering assigned to substantive slides.

The deck's canonical and inherited colors are documented in `PALETTE.md`.
New work should use the canonical palette there; existing near-palette scene
colors are recorded separately rather than silently treated as new swatches.

`npm run build:force` recompiles every TeX module. Normal builds cache
unchanged modules and discard successful LaTeX intermediates.

## Architecture

`deck.json` is the ordering authority. Each object is one conceptual slide.
Its generated Beamer overlays become navigation steps within that slide.
An `additionalSteps` list may append HTML-authored navigation steps without
changing the TeX source. `#what-can-you-do/6` uses this to reuse the generated
fifth SVG as a background and add the Jokerman “both?” layer.

The white `#k-splitting-intuition/1` and `#indiscernible-lemma/1` frames are
deliberately obvious HTML dummy slides.
Their dynamically calculated footer SVGs are rendered black by the
`footerColor: "black"` manifest property so the talk-length countdown remains
visible on white. Replace or remove the dummies when their material is written.
`#application/1` is a live Beamer-rendered theorem slide based on Proposition
4.1 of the paper: bounded \(k\)-splitting plus a sufficiently large
\(k\)-ineffable cardinal produces a total bu-Morley sequence through any given
tuple.
`#nip-not-bounded-k-splitting/1`, immediately after `#application/1`, is a
Beamer-rendered frame titled “Separating NIP and bounded k-splitting” and
displays an authentic title-and-author crop from Kaplan–Shelah's *A dependent
theory with few indiscernibles*. Its asset and source are recorded with the
early paper collage under `html/assets/neostability-collage/`.
The former `#stability-definition/1` dummy is no longer referenced because its
content now lives on `#splitting/2`; its standalone HTML source remains
available for recovery.

The build pipeline in `scripts/build.mjs`:

1. wraps each `tex` source in its own footerless Beamer document;
2. runs LaTeX twice so Beamer does not leave a temporary page;
3. converts every overlay page to SVG;
4. renders countdown values as separate transparent TeX/SVG documents;
5. applies optional image, video, or HTML step overrides;
6. links shared media and art rather than copying them;
7. writes `generated/manifest.js`.

The final frame of `#canonical-partition-tree/20` has an independent
Beamer-rendered text overlay on the right. Its editable source is
`../slides/canonical-partition-tree-cut-overlay.tex`; the `tex-overlay` asset
entry in `deck.json` compiles that one-page document separately from the slide
videos. The underlying archival `cpt-morph-v4.webm` is unchanged.
`overlayAtEnd` marks only that text overlay as deferred until the non-looping
video emits `ended`; restarting the video hides the text again without hiding
other overlays. A second, persistent overlay clips the title directly from
`#canonical-partition-tree/19`, covering the smaller title baked into the
video with a pixel-exact copy for the full duration of `/20`. The same text
asset is an immediately visible image overlay on
`#canonical-partition-tree/21`. The next subslide, `/22`, holds the same
underlying image but swaps in a second Beamer-rendered overlay from
`../slides/canonical-partition-tree-two-types-overlay.tex`, stating the
binary-type limitation. `/23` has no overlay, so the text disappears there.
The image-override branch supports `overlaySource` and `overlayClip` for this
purpose. Nearby-step prefetching includes overlay images as well as their base
slides, so the text swap is ready before the presenter advances to it.

The existing `#canonical-partition-tree/25` remains the unmodified Quinary
frame (`slide-30.png`). Two additive arity-continuation test steps follow it.
`/26` uses that exact frame as its base and adds a larger Senary chain on the
right, partly beyond the original 4:3 slide boundary. `/27` preserves the same
base and the complete `/26` overlay pixel-for-pixel, then adds a somewhat
larger Septenary chain in the upper-left central pocket. Both steps are
`fullBleed` and `borderless`; their transparent overlays use a 16:9 canvas so
the right-hand overflow remains visible while the original 4:3 frame stays
centered. The cumulative transparent overlays are
`assets/canonical-partition-tree-additions/step-26.png` and
`step-27.png`; their isolated source crops are stored beside them. Do not
reflow or rerender existing material when extending this joke: duplicate the
prior base and cumulative overlay, then place only the new item in unused
space, shrinking the new item as necessary.

The isolated Septenary crop includes explicit transparent padding on the
right, preventing the final `y` from being clipped when it is rescaled.

The rejected earlier implementation of the arity continuation is still not
referenced by the live talk. Its TeX snapshot, generated SVGs, build wrappers,
and pixel-exact `/24` title patch remain preserved under
`../archive/removed-slides/canonical-partition-tree-arity-extension/`.

`deck.js` displays image, video, and standalone HTML steps on one 4:3 stage.
It owns the independent footer overlay, media lifecycle, URL hash, keyboard
navigation, and prefetching. Its loading overlay is delayed by 600 ms so normal
slide changes retain the previous frame and do not flash a transient
“Loading…” message; the message remains available for genuinely slow media.

Countdown footers are tightly cropped transparent SVGs, not full-slide SVG
canvases. `#footer-layer` remains a centered virtual 4:3 frame even when a
custom scene is full bleed; the cropped glyph is positioned at its lower-right
corner. Its height is bounded with `clamp()` so unusual viewport dimensions do
not make the number unexpectedly tiny or large. Footer URLs carry content
fingerprints so a browser cannot reuse one of the former full-slide SVGs under
the new cropped-image layout. The standalone TeX crop includes a small
asymmetric border above each glyph so ascenders are not clipped; keep that
headroom when changing the footer generator.

## Custom HTML slides

- `slides/title.html` is not a flattened screenshot. The main title and author
  are separate linked images; the New Forking Festival text is a responsive
  HTML layer using the shared Jokerman font. Only the main-title image moves.
  Its animation is derived from the genuine LibreOffice renders in
  `assets/title/sway-yaw/`: 36 yaw positions span a subtle two-degree range
  and cycle over 8.67 seconds. The active HTML selects the 1080×722 indexed
  PNG derivatives in `assets/title/sway-yaw-png/`, which avoid parsing all of
  the SVG Fontwork paths on page load. The frames remain decoded in stacked
  image layers, with no vertical bob, crossfade, or per-frame HTML
  translation. The
  OpenOffice custom shape has an explicit rotation center at
  `(0.001 -0.120 -529.167)`: the x/y values come from a neutral front-face
  saturated-pixel centroid measurement, and the z value is the midpoint of the
  10.583 mm extrusion in hundredths of a millimeter. Thus the sway is a rigid
  object-space rotation about the title's central local vertical, not a
  screen-space recentering effect. A two-pixel inward clip removes the faint
  exported page edge without overlaying a rectangular mask. The event and
  author layers stay fixed above the title canvas, and reduced-motion clients
  use the exact baseline render.
  `scripts/render-title-sway.mjs` and
  `assets/title/title-sway-yaw.odp` preserve the active generation path without
  changing the archival source ODP.
- `slides/infinitely-many-pigeons.html` is the reference perspective pigeon
  dolly.
- `slides/higher-arity.html` is the reference wide neostability panorama. Its
  image is linked from
  `diagrams/higher-arity-stability-diagram-nop2.svg`, the active variant whose
  bounded 2-splitting arrow ends at NOP2.
- `slides/scene-controller.js` provides the shared idle-drift and
  press-and-hold acceleration state machine.

Slides with `"captureAdvance": true` consume Right/Space:

- holding accelerates the scene;
- releasing returns to idle drift;
- the pigeon scene hangs at its endpoint and advances on the next fresh press;
- the neostability panorama advances when it reaches its endpoint;
- Left retreats immediately.

`#higher-arity-neostability/1` is the sole exception. It also sets
`"captureRetreat": true` and enables `rewindOnLeft` in its scene controller.
Holding Left runs that panorama backward; releasing Left resumes its idle
forward drift. Reaching the beginning hangs there, and a fresh Left press then
retreats to the preceding slide. Page Up, Shift+Space, pointer navigation, and
all other animated slides keep their previous immediate-retreat behavior.

Interactive HTML scenes announce `deck-ready` after their shared controller
has installed its message listeners. The parent answers with `deck-enter`,
which avoids losing the initial autoplay signal during iframe startup.
`#higher-arity-neostability/1` additionally starts its controller on the next
animation frame when embedded. That slide-local fallback is intentional: the
iframe is created only while the slide is active, and `deck-leave` still stops
the controller normally. It makes the panorama autoplay reliable on both a
fresh hash load and navigation back into the slide without changing the other
animated slides' playback behavior.

The parent viewer latches a held advance key during an automatic transition so
keyboard repeat cannot skip subsequent slides.

## Indiscernibles transition

The preserved `0-indisc-seq-anim.webm` was authored to follow the reference
deck's `slide-05.png`. A fresh static export from the current TeX/`animate`
source resolves to a different internal animation frame, causing a large jump
between `indiscernibles/4` and `indiscernibles/5`.

For this reason, `deck.json` overrides `indiscernibles/1` through `/4` with
linked reference snapshots `slide-02.png` through `slide-05.png`, then
overrides `/5` with the WebM. Those PNGs and the WebM contain archival footer
numbers, so the viewer masks the lower-right corner and draws the current
separate TeX footer above it.

`indiscernibles/6` keeps that same WebM running and adds the LaTeX-rendered
line “sometimes we want more control” near the bottom edge. The line is part
of overlay 6 in `slides/0-indisc-seq-anim.tex`; overlay 5 contains the same
line under a page-relative black cover. In `deck.json`, step 6 reuses the
step-6 SVG only as a tightly clipped bottom overlay, while retaining the
existing clipped title overlay from `slide-05.png`.

`deck.js` recognizes adjacent video steps with the same fingerprinted source
and retains the current video DOM element instead of pausing, replacing,
seeking, or replaying it. The build accepts multiple clipped overlays for a
video step through `overlaySteps`. This is what makes `/5` → `/6` a reveal
over a continuously running animation rather than a video restart.
Because the title overlay reuses the cached `/4` image element, the viewer
explicitly clears that element's overlay-only `clip-path` whenever it returns
to the main image layer. Without that reset, navigating backward from `/5` to
`/4` leaves the fourth step almost entirely clipped to black.

Do not replace only `/4`: keeping all four reference snapshots together avoids
moving the mismatch to the `/3` → `/4` transition.

## 3-splitting animation source and timing

The active HTML build renders the four animation states directly from:

```text
new-forking-festival-2026/slides/k-splitting.tex
```

The `tex-frame-sequence-images` asset recipe extracts the `multiframe` body,
compiles it once with each value `\nt=0,1,2,3`, rasterizes those pages, and
writes four lossless 2016×1512 PNGs. This makes edits to the active LaTeX
source propagate to both its static fallback SVG and its HTML animation. It
does not modify or read frames from the archival
`html/slides/k-splitting.webm`.

The source currently continues its title with `if...`, begins the explanatory
definition with the matching ellipsis, and colors that definition's symbols
to match the diagram. The definition and animation occupy columns totaling
`0.96\paperwidth`; the complete animated diagram is uniformly scaled in the
right column. Its outer TikZ scale is `0.80`, enlarged from `0.68` so that the
diagram fills the available right column instead of leaving unnecessary empty
space. Keep that scale on the outermost picture so all four states and their
labels move together.

The entire two-column layout now lives inside the four-frame animation. This
lets the left column highlight the matching base for each faded `a_i`, followed
by the full base on the `Different!` frame. Only the math is highlighted: a
zero-layout TikZ overlay draws a large oval radial magenta fade that extends
beyond the expression's bounds. The text
uses explicit line breaks, and the overlay has no padding or bounding-box
effect, so it cannot reflow as the animation loops.

Each generated frame URL receives a short content fingerprint. Browsers
therefore reload changed PNGs after a normal refresh instead of retaining an
older decoded frame at the same path.

The build generates:

```text
generated/media/k-splitting-frames/frame-01.png
generated/media/k-splitting-frames/frame-02.png
generated/media/k-splitting-frames/frame-03.png
generated/media/k-splitting-frames/frame-04.png
```

The sequence remains the intended forward progression `1, 2, 3, 4`. The first
three states are held for 0.8 seconds and the concluding fourth state is held
for 1.6 seconds before the HTML timer loops to frame 1. This halves the original
pace and fixes the real problem: the last frame previously disappeared too
quickly. All four images are decoded before the sequence begins, then
`deck.js` toggles their visibility with `requestAnimationFrame`; no lossy video
encoding or mid-loop image load is involved. The recipe and timings live in
`deck.json`, and `scripts/build.mjs` regenerates the PNGs when the source
changes.

The leftmost oval glow is intentionally allowed to cross the 4:3 slide edge
into the HTML viewer's black letterbox. The PNG cannot draw outside its own
media box, so `index.html` contains a synchronized
`#k-splitting-overflow-glow` behind the image sequence. `deck.js` shows that
duplicate tail only during the second animation state (0.8–1.6 seconds) and
gives the stage visible overflow only while this slide is active. The PNGs'
opaque black background covers the duplicate inside the slide, avoiding a
second layer of brightness there; only the otherwise-clipped tail is exposed
outside the stage. The overlay box itself is deliberately much larger than the
oval, whose explicit radii make it reach full transparency well before the
box boundary; shrinking or merely moving that box produces a visible vertical
cutoff. `stopMediaEffects()` removes the class and animation callback on
navigation or restart. The text and animation coordinates remain unchanged.

## Canonical partition tree performance

Fresh `pdftocairo` SVGs for this 24-step module total about 43 MB because each
overlay repeats thousands of nearly identical vector paths; the largest frame
contains more than 24,000 paths. The reference PNG sequence `slide-07.png`
through `slide-30.png` totals about 11 MB and is visually authoritative.

The module is therefore an `images` entry in `deck.json`. Its PNGs are linked
into `media/`, not copied, and the stale generated SVG directory is removed by
the build. Step 20 remains the existing WebM override. All reference images
have their baked archival footer masked before the current independent TeX
footer is drawn.

The viewer also keeps decoded image elements in an 18-entry LRU-style cache
and preloads six steps ahead plus two behind. This makes rapid overlay
navigation reuse already parsed and decoded images instead of creating a new
SVG/image element for every keypress.

## Adding and reordering

Reorder whole objects in `deck.json`; countdown footers are regenerated from
the new conceptual order.

For a TeX slide:

```json
{
  "id": "new-theorem",
  "title": "New theorem",
  "type": "tex",
  "source": "slides/new-theorem.tex",
  "numbered": true
}
```

For a standalone HTML slide:

```json
{
  "id": "interactive-example",
  "title": "Interactive example",
  "type": "html",
  "source": "slides/interactive-example.html",
  "captureAdvance": false,
  "numbered": true
}
```

HTML slides receive `deck-enter`, `deck-leave`, and `deck-reset` messages.
They can navigate by posting:

```js
parent.postMessage({ type: "deck-command", command: "advance" }, "*");
```

## Validation checklist

After a change:

```bash
npm run build
npm test
node --check deck.js
node --check scripts/build.mjs
node --check scripts/validate.mjs
node --check slides/scene-controller.js
git diff --check -- .
```

Then inspect at least:

```text
#title/1
#indiscernibles/4
#indiscernibles/5
#infinitely-many-pigeons/1
#higher-arity-neostability/1
```

Confirm the visible number comes from the independent footer overlay, the
custom scenes respond to a held Right/Space key, and no asset request other
than an optional favicon returns 404.

The `infinitely-many-pigeons` and `higher-arity-neostability` entries set
`fullBleed: true` in `deck.json`. The build copies that flag onto their HTML
steps, and `deck.js` expands `#stage` from its normal 4:3 bounds to the full
viewport while either scene is active. Keep this explicit rather than making
all HTML slides full bleed: the title page intentionally retains the normal
4:3 slide frame.

`#indiscernibles/5` switches from the high-resolution fourth-step PNG to the
lower-resolution animation. To prevent the baked-in title from visibly
changing at that boundary, its video override declares `overlaySource` as the
fourth-step image and clips that reused image to the title band with
`overlayClip`. `#step-overlay` draws it above the video. The image cache moves
the already-decoded step-four image into the overlay, so this adds neither a
copied asset nor another decode during normal forward navigation.
