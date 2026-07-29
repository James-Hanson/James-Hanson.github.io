# Higher-arity neostability collage

These raster assets are title-and-author crops from the cited PDFs. They are
grayscale inversions of the source pages so that the original typography appears
as white text on the talk's black canvas. The full PDFs are not stored in the
repository.

Run `../../scripts/build-neostability-collage.sh` from this directory, or run the
same script from anywhere, to download the sources into a temporary directory
and rebuild the crops.

## Source list

- `shelah-2-dependent.png`:
  <https://arxiv.org/pdf/math/0703045>
- `on-n-dependence.png`:
  <https://arxiv.org/pdf/1411.0120>
- `higher-vc.png`:
  <https://arxiv.org/pdf/2010.00726>
- `terry-wolf-arithmetic.png`:
  <https://arxiv.org/pdf/2111.01739>
- `fop-k.png`:
  <https://arxiv.org/pdf/2305.13111>
- `slice-wise.png`:
  <https://arxiv.org/pdf/2402.07870>
- `treeless.png`:
  <https://arxiv.org/pdf/2305.01296>
- `c-less.png`:
  <https://chernikov.umd.edu/papers/OberwolfachReport2023.pdf>
- `kaplan-shelah.png`:
  <https://arxiv.org/pdf/1010.0388>

The Kaplan–Shelah clip is used on `#nip-not-bounded-k-splitting/1`; the other
clips form the higher-arity-neostability collage.
`kaplan-shelah-black.png` is a black-backed derivative used by the Beamer
renderer because its PDF-to-SVG conversion drops this PNG's transparency mask.

The original Takeuchi talk slides were not publicly downloadable from the
sources located during this build. Takeuchi is represented by the title page of
the joint `On n-dependence` paper instead of by a reconstructed title card.
