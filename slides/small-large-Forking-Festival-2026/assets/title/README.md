# Title animation assets

`title-sway-yaw.odp` and `sway-yaw/` are the active New Forking Festival
assets derived from the immutable archival source
`shared-assets/cover-slides/SLCaNT-title-elements-separated.odp`.

Regenerate the active title's subtle single-axis rotation frames with:

```sh
npm run render:title-sway
```

This produces `title-sway-yaw.odp` and the 18 SVG states in `sway-yaw/`. They
span one degree to either side of the base yaw angle.

The extra `reduced-motion.svg` is the exact unrotated baseline. The widened
black render canvas retains the part of the original title object that extends
beyond the standard slide boundary.

The earlier two-axis experiment remains reproducible as `title-sway-grid.odp`
and `sway-grid/`, but none of those grid SVGs are loaded by the active slide.
To regenerate that experiment, run `--prepare`, then `--batch 0` through
`--batch 8`, then `--finish`.
