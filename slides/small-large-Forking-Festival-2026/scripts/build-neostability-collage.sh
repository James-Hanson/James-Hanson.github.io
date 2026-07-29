#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
html_dir="$(cd -- "$script_dir/.." && pwd)"
output_dir="$html_dir/assets/neostability-collage"
work_dir="$(mktemp -d /tmp/nff-neostability-collage.XXXXXX)"

cleanup() {
  rm -rf -- "$work_dir"
}
trap cleanup EXIT

mkdir -p -- "$output_dir" "$work_dir/pdfs" "$work_dir/pages"

download() {
  local name="$1"
  local url="$2"
  curl -L --fail --silent --show-error "$url" -o "$work_dir/pdfs/$name.pdf"
}

clip() {
  local name="$1"
  local crop="$2"
  pdftocairo \
    -png \
    -singlefile \
    -f 1 \
    -l 1 \
    -r 150 \
    "$work_dir/pdfs/$name.pdf" \
    "$work_dir/pages/$name"
  convert \
    "$work_dir/pages/$name.png" \
    -crop "$crop" \
    +repage \
    -colorspace Gray \
    -negate \
    -contrast-stretch 1%x1% \
    -trim \
    +repage \
    -alpha copy \
    -channel RGB \
    -fill white \
    -colorize 100 \
    +channel \
    -bordercolor none \
    -border 18x14 \
    -strip \
    "$output_dir/$name.png"
}

download shelah-2-dependent "https://arxiv.org/pdf/math/0703045"
download on-n-dependence "https://arxiv.org/pdf/1411.0120"
download higher-vc "https://arxiv.org/pdf/2010.00726"
download terry-wolf-arithmetic "https://arxiv.org/pdf/2111.01739"
download fop-k "https://arxiv.org/pdf/2305.13111"
download slice-wise "https://arxiv.org/pdf/2402.07870"
download treeless "https://arxiv.org/pdf/2305.01296"
download c-less "https://chernikov.umd.edu/papers/OberwolfachReport2023.pdf"
download kaplan-shelah "https://arxiv.org/pdf/1010.0388"

clip shelah-2-dependent "1060x245+110+230"
clip on-n-dependence "980x270+145+185"
clip higher-vc "1030x230+130+215"
clip terry-wolf-arithmetic "1050x170+110+235"
clip fop-k "1030x230+130+220"
clip slice-wise "1030x225+130+205"
clip treeless "1040x230+120+210"
clip c-less "1040x105+120+220"
clip kaplan-shelah "950x130+160+250"
convert \
  "$output_dir/kaplan-shelah.png" \
  -background black \
  -alpha remove \
  -alpha off \
  -strip \
  "$output_dir/kaplan-shelah-black.png"

echo "Wrote title-and-author clips to $output_dir"
