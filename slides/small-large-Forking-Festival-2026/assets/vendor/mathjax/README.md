# MathJax browser bundle

This directory contains the locally vendored MathJax 4 `tex-svg` combined
component used by `slides/k-ineffable-hierarchy.html`.

It is copied from the exact `mathjax` development dependency recorded in
`package-lock.json`. MathJax 4 also loads `sre/speech-worker.js` and its
base/English semantic maps during startup, even though speech, braille,
enrichment, and the explorer are disabled for this slide. Those minimal SRE
files are vendored with the main component. Refresh the bundle, SRE files,
`LICENSE`, and `VERSION` with:

```sh
npm install
npm run vendor:mathjax
```

The local copy keeps the conference deck independent of network and CDN
availability.
