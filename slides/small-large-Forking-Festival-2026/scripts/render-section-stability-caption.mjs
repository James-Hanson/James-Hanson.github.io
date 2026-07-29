#!/usr/bin/env node

import {
  existsSync,
  mkdirSync,
  rmSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const htmlDir = resolve(scriptDir, "..");
const buildDir = join(
  htmlDir,
  "generated",
  "build",
  "section-stability-caption",
);
const source = join(
  htmlDir,
  "slides",
  "section-stability-old-forking-overlay.tex",
);
const pdf = join(buildDir, "section-stability-old-forking-overlay.pdf");
const output = join(
  htmlDir,
  "assets",
  "section-headings",
  "old-forking-caption.svg",
);

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: htmlDir,
    encoding: "utf8",
    stdio: "inherit",
  });
  if (result.status !== 0) {
    throw new Error(`Command failed: ${command} ${args.join(" ")}`);
  }
}

rmSync(buildDir, { recursive: true, force: true });
mkdirSync(buildDir, { recursive: true });
mkdirSync(dirname(output), { recursive: true });

run("pdflatex", [
  "-interaction=batchmode",
  "-halt-on-error",
  `-output-directory=${buildDir}`,
  source,
]);
run("pdftocairo", ["-svg", "-f", "1", "-l", "1", pdf, output]);

if (!existsSync(output)) {
  throw new Error(`pdftocairo did not create ${output}`);
}

rmSync(buildDir, { recursive: true, force: true });
console.log(`Wrote LaTeX caption overlay to ${output}`);
