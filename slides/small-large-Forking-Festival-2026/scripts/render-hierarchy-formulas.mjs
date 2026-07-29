#!/usr/bin/env node

import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import MathJax from "mathjax";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const outputDir = resolve(
  scriptDir,
  "..",
  "assets",
  "k-ineffable-hierarchy",
);

await MathJax.init({
  loader: {
    load: ["input/tex", "output/svg"],
  },
  svg: {
    fontCache: "none",
  },
});

mkdirSync(outputDir, { recursive: true });

async function renderFormula(tex, filename) {
  const container = await MathJax.tex2svgPromise(
    tex,
    { display: false },
  );
  const svgNode = MathJax.startup.adaptor.firstChild(container);
  const svg = MathJax.startup.adaptor
    .serializeXML(svgNode)
    .replaceAll("currentColor", "#fff")
    .replace(/\sstyle="[^"]*"/, "")
    .replace(/\s+$/, "");
  writeFileSync(
    resolve(outputDir, filename),
    `${svg}\n`,
  );
}

for (let index = 0; index <= 3; index += 1) {
  rmSync(resolve(outputDir, `rank-into-rank-${index}.svg`), { force: true });
}
await renderFormula(
  String.raw`\textsf{I0-I3 rank-into-rank}`,
  "rank-into-rank.svg",
);
await renderFormula(
  String.raw`\mathsf{\kappa\to(\omega_{1})^{<\omega}_{2}}`,
  "partition-omega-one.svg",
);
await renderFormula(String.raw`\mathsf{0=1}`, "zero-equals-one.svg");

console.log("Rendered three static MathJax hierarchy formulas");
