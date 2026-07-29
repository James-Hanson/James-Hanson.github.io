# New Forking Festival color palette

## Canonical colors

New slides and diagrams should use this narrow palette:

| Role | Name | Hex |
| --- | --- | --- |
| Canvas and masks | Black | `#000000` |
| Primary text and lines | White | `#ffffff` |
| Purple glow and secondary depth | Grape | `#711c91` |
| Primary warm accent | Magenta | `#ea00d9` |
| Primary cool accent | Cyan | `#0abdc6` |
| Secondary blue and shallow depth | Light blue | `#133e7c` |
| Deep shadows and extrusion | Dark blue | `#091833` |

The five named chromatic colors are defined in
`../slides/colors.tex`. Black and white come from the deck's Beamer and HTML
canvas defaults.

Gradients should interpolate between palette colors. Transparency may vary,
but adding a new hue should be an explicit design decision rather than an
incidental one.

## Existing near-palette variants

Some established animated or raster-derived art predates this document and
uses close variants:

| Existing use | Hex |
| --- | --- |
| HTML title event text | `#e000d5` |
| Pigeon-scene sun | `#ed00c8` |
| Pigeon-scene grid | `#00d6ef` |
| Pigeon-scene upper field | `#1b477f` |
| Pigeon-scene lower field | `#15335f` |

These are retained for visual continuity with the already-authored scenes.
They are not additional canonical swatches for new work.

The ODP-derived section artwork uses magenta-to-cyan face gradients with
purple and dark-blue depth. Intermediate shades produced by gradients,
lighting, antialiasing, image resampling, or opacity are render products, not
new palette entries.

## Implementation guidance

- In TeX, use the names from `../slides/colors.tex`.
- In new HTML/SVG, use the exact canonical hex values above.
- Prefer black backgrounds, white structural text, and magenta/cyan for the
  principal semantic contrast.
- Use grape and the two blues for glow, depth, shadow, and supporting layers.
