# New Forking Festival HTML deck

This is the active, reorderable presentation. It does not modify the archival
HTML deck at the repository root.

For implementation history, archival boundaries, reference behavior, and a
handoff checklist, see [`HANDOFF.md`](HANDOFF.md).

## Build

From this directory:

```bash
npm run build
```

The build:

1. compiles each `tex` entry in `deck.json` as its own footerless Beamer
   document;
2. converts every Beamer overlay page to a standalone SVG;
3. renders countdown footer numbers as separate transparent SVG overlays;
4. links shared images, fonts, and existing WebM animations without copying
   them;
5. generates `generated/manifest.js` for the browser viewer.

Unchanged TeX slides are cached. Reordering `deck.json` therefore regenerates
the inexpensive footer/manifest layer without recompiling slide bodies.
Use `npm run build:force` to invalidate the cache.

To verify that every generated page, footer, HTML slide, and linked animation
exists:

```bash
npm test
```

You can open `index.html` directly. For a local HTTP URL, run:

```bash
npm run serve
```

and open:

```text
http://127.0.0.1:8765/new-forking-festival-2026/html/
```

## Reorder or add slides

`deck.json` is the only ordering authority. Move its slide objects to reorder
the talk.

### TeX slide

Create a source containing one Beamer `frame`, then add:

```json
{
  "id": "new-tex-slide",
  "title": "New theorem",
  "type": "tex",
  "source": "slides/new-tex-slide.tex",
  "numbered": true
}
```

All overlay pages produced by that frame remain one conceptual slide and share
one footer number.

### HTML5 slide

Create a standalone 4:3 HTML document under `html/slides/`, then add:

```json
{
  "id": "new-html-slide",
  "title": "Interactive example",
  "type": "html",
  "source": "slides/new-html-slide.html",
  "numbered": true
}
```

An embedded HTML slide can listen for `deck-enter`, `deck-leave`, and
`deck-reset` messages. It can forward keyboard navigation to the parent with:

```js
parent.postMessage({ type: "deck-command", command: "advance" }, "*");
```

Set `"captureAdvance": true` on a slide whose own animation should consume the
Right/Space control. The parent then sends `deck-control` messages with
`advance-start` and `advance-end` actions rather than immediately leaving the
slide. `slides/scene-controller.js` implements the reference deck's
press-and-hold acceleration.

The title is also a standalone HTML slide. Its main title and author are
separate linked images, while the New Forking Festival text is its own
responsive layer; it is not a flattened screenshot. Only the main-title image
receives a single-axis rotational sway built from genuine
LibreOffice-rendered frames, together with a very subtle vertical bob. The
event and author remain fixed.

## Controls

- Right, Page Down, or Space: next overlay/slide
- Left, Page Up, or Shift+Space: previous overlay/slide
- On `#higher-arity-neostability/1`, hold Left to rewind; a fresh Left press
  from its beginning goes to the previous slide
- On the pigeon and neostability scenes, hold Right/Space to accelerate the
  animation and release to return to its idle drift
- `#k-ineffable/4` is the static pre-zoom hierarchy frame.
- `#k-ineffable/5` starts the complete fast zoom as soon as it is entered;
  press Right/Space from the endpoint to advance
- Home/End: beginning/end
- `F`: fullscreen
- `C`: diagnostic counter
- `R`: restart the current video or HTML animation
- `?`: controls

The visible footer is calculated from conceptual numbered slides using
`current - total`, matching the existing Beamer countdown. Title and thank-you
cards are unnumbered.
