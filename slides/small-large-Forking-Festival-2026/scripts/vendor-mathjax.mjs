#!/usr/bin/env node

import {
  copyFileSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const htmlDir = resolve(scriptDir, "..");
const packageDir = join(htmlDir, "node_modules", "mathjax");
const vendorDir = join(htmlDir, "assets", "vendor", "mathjax");
const vendorSreDir = join(vendorDir, "sre");
const vendorMathmapsDir = join(vendorSreDir, "mathmaps");
const packageMetadata = JSON.parse(
  readFileSync(join(packageDir, "package.json"), "utf8"),
);

function copyTextWithoutTrailingWhitespace(source, destination) {
  const normalized = readFileSync(source, "utf8")
    .replace(/[ \t]+$/gm, "")
    .replace(/\n+$/, "\n");
  writeFileSync(destination, normalized);
}

mkdirSync(vendorDir, { recursive: true });
mkdirSync(vendorSreDir, { recursive: true });
mkdirSync(vendorMathmapsDir, { recursive: true });
copyFileSync(
  join(packageDir, "tex-svg.js"),
  join(vendorDir, "tex-svg.js"),
);
copyFileSync(
  join(packageDir, "sre", "speech-worker.js"),
  join(vendorSreDir, "speech-worker.js"),
);
copyTextWithoutTrailingWhitespace(
  join(packageDir, "sre", "mathmaps", "base.json"),
  join(vendorMathmapsDir, "base.json"),
);
copyTextWithoutTrailingWhitespace(
  join(packageDir, "sre", "mathmaps", "en.json"),
  join(vendorMathmapsDir, "en.json"),
);
copyFileSync(
  join(packageDir, "LICENSE"),
  join(vendorDir, "LICENSE"),
);
writeFileSync(
  join(vendorDir, "VERSION"),
  `${packageMetadata.version}\n`,
);

console.log(
  `Vendored MathJax ${packageMetadata.version} tex-svg component and English SRE files`,
);
