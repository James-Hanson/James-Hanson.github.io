#!/usr/bin/env node

import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const htmlDir = resolve(scriptDir, "..");
const talkDir = resolve(htmlDir, "..");
const buildDir = join(htmlDir, "generated", "build", "the-zoo-title");
const wrapper = join(buildDir, "the-zoo-title-wrapper.tex");
const pdf = join(buildDir, "the-zoo-title-wrapper.pdf");
const output = join(htmlDir, "assets", "title-overlays", "the-zoo.svg");

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd || talkDir,
    encoding: "utf8",
    stdio: options.capture ? "pipe" : "inherit",
  });
  if (result.status !== 0) {
    if (options.capture) {
      process.stderr.write(result.stdout || "");
      process.stderr.write(result.stderr || "");
    }
    throw new Error(`Command failed: ${command} ${args.join(" ")}`);
  }
}

function main() {
  rmSync(buildDir, { recursive: true, force: true });
  mkdirSync(buildDir, { recursive: true });
  writeFileSync(
    wrapper,
    String.raw`\def\htmlslides{1}
\input{slides/preamble}

\begin{document}
\input{slides/the-zoo-title}
\end{document}
`,
  );

  run("pdflatex", [
    "-interaction=batchmode",
    "-halt-on-error",
    `-output-directory=${buildDir}`,
    wrapper,
  ]);
  run("pdftocairo", [
    "-svg",
    "-f",
    "1",
    "-l",
    "1",
    pdf,
    output,
  ], { capture: true });

  if (!existsSync(output)) {
    throw new Error(`pdftocairo did not create ${output}`);
  }
  const rendered = readFileSync(output, "utf8");
  const transparent = rendered.replace(
    /<path[^>]*fill="rgb\(0%, 0%, 0%\)"[^>]*\/>\s*/g,
    "",
  );
  if (transparent === rendered) {
    throw new Error("Could not find the LaTeX page background in the SVG");
  }
  writeFileSync(output, transparent);
  rmSync(buildDir, { recursive: true, force: true });
  console.log(`Wrote LaTeX title overlay to ${output}`);
}

main();
