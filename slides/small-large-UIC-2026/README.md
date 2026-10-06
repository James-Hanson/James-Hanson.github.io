# UIC Logic Seminar, October 6, 2026

A copy of the most recent New Forking Festival presentation, with a UIC title
page. Open `index.html` to present; the keyboard controls are unchanged.

`generated/manifest.js` is this deck's independent slide order and overlay
configuration. Edit it to adjust this presentation. The title page is
`slides/title.html`.

The pigeon, k-ineffable hierarchy, and neostability panorama scenes use local
HTML copies and a
corrected scene controller so the animation timing fix is specific to UIC.
Their image assets remain shared.
Run `node scripts/test-scene-controller.mjs` to check animation startup,
re-entry, reset, acceleration, rewind, and endpoint navigation.

Images, videos, fonts, existing HTML slides, countdown footers, and the viewer
CSS/JavaScript are referenced from `../small-large-Forking-Festival-2026/`
(and its shared assets) rather than copied. Keep those files available.

For a UIC-specific slide edit, copy only that slide into this directory,
update its relative asset links to the existing files, and point the matching
manifest step at the local copy. Shared slides keep their original document
URLs so their own relative asset paths continue to work. If changing the
number of numbered slides, update each numbered slide's footer reference to
preserve the countdown.

The manifest is a hand-maintained snapshot; do not run the Forking Festival
build in this directory. See the original deck's README for its source build
workflow if new TeX renders are needed.

The Ramsey-cardinal entry on `what-can-you-do/3` and subsequent steps uses
`generated/what-can-you-do-ramsey-overlay.svg`, rendered from
`slides/what-can-you-do-ramsey-overlay.tex`. One transparent vector overlay is
shared across steps 3–9, with the original slide bodies still referenced.
Step 3 reveals the Erdős relation, step 4 the Ramsey label, and step 5 its
partition relation, then step 6 reveals “etc.”; clipped views of the same overlay reveal one line at a time.

The stability conclusion on steps 2–4 uses
`generated/stability-stationary-overlay.svg`, rendered from
`slides/stability-stationary-overlay.tex`, to add “(stationary)” while keeping
the existing slide bodies and pigeon artwork shared.

The hierarchy zoom projects the reused pigeon sprites and glow into a
separate viewport layer, with native image dimensions. The zoom world has
explicit 1200×900 bounds for reliable Chrome painting. Its initial image is
the exact step-3 SVG, preserving the text and line breaks through step 4.

`bounded-k-splitting/3` adds the Watson annotations using
`generated/bounded-k-splitting-watson-overlay.svg` (source:
`slides/bounded-k-splitting-watson-overlay.tex`). The mirrored wow overlay
reuses the exact face and lettering paths extracted from the existing step-2
SVG, without copying the full slide.

The central theorem text is raised one line using clipped, translated copies
of the shared artwork in `index.html` and the manifest. Step 4 reveals the
Erdős–Rado sentence, and step 5 reveals the mirrored wow graphic. The sentence
SVG is rendered from `slides/bounded-k-splitting-zfc-overlay.tex`, then uses a
white text mask over a magenta-to-cyan gradient. Its final transform enlarges
the text by 15% and moves its baseline from 172 to 185 PDF points; preserve
this SVG postprocessing when rebuilding it.

The application slide uses the small native vector overlay
`generated/application-crossout.svg`. `scribble-variants.html` is a separate
comparison page; variant 13 is used in the presentation.

The hierarchy's embedded footer matches the viewer's clamped footer size and
offsets on entry, including small viewports.
