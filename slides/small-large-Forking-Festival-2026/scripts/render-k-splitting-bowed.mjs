#!/usr/bin/env node

import {
  copyFileSync,
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
const sourceOdp = join(
  htmlDir,
  "assets",
  "section-headings",
  "higher-arity-neostability-bowed.odp",
);
const derivedOdp = join(
  htmlDir,
  "assets",
  "section-headings",
  "k-splitting-bowed.odp",
);
const outputBase = join(
  htmlDir,
  "assets",
  "section-headings",
  "k-splitting-bowed",
);
const buildDir = join(
  htmlDir,
  "generated",
  "build",
  "k-splitting-bowed",
);
const unpackedDir = join(buildDir, "unpacked");
const libreOfficeProfile = join(buildDir, "libreoffice-profile");

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd || htmlDir,
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
  if (!existsSync(sourceOdp)) {
    throw new Error(`Missing preserved bowed source: ${sourceOdp}`);
  }

  rmSync(buildDir, { recursive: true, force: true });
  mkdirSync(unpackedDir, { recursive: true });

  run("unzip", ["-q", sourceOdp, "-d", unpackedDir]);
  const contentPath = join(unpackedDir, "content.xml");
  const originalContent = readFileSync(contentPath, "utf8");
  const oldText = "higher-arity<text:line-break/>neostability";
  const occurrences = originalContent.split(oldText).length - 1;
  if (occurrences !== 1) {
    throw new Error(
      `Expected one bowed title in content.xml, found ${occurrences}`,
    );
  }
  writeFileSync(contentPath, originalContent.replace(oldText, "k-splitting"));

  copyFileSync(sourceOdp, derivedOdp);
  run("zip", ["-q", "-u", derivedOdp, "content.xml"], {
    cwd: unpackedDir,
  });

  mkdirSync(libreOfficeProfile, { recursive: true });
  run("libreoffice", [
    `-env:UserInstallation=file://${libreOfficeProfile}`,
    "--headless",
    "--convert-to",
    "pdf",
    "--outdir",
    buildDir,
    derivedOdp,
  ]);

  const renderedPdf = join(buildDir, "k-splitting-bowed.pdf");
  if (!existsSync(renderedPdf)) {
    throw new Error(`LibreOffice did not create ${renderedPdf}`);
  }
  run("pdftocairo", [
    "-png",
    "-singlefile",
    "-r",
    "288",
    "-f",
    "3",
    "-l",
    "3",
    renderedPdf,
    outputBase,
  ], { capture: true });

  if (!existsSync(`${outputBase}.png`)) {
    throw new Error(`pdftocairo did not create ${outputBase}.png`);
  }
  rmSync(buildDir, { recursive: true, force: true });
  console.log(`Wrote reproducible LibreOffice source to ${derivedOdp}`);
  console.log(`Wrote bowed section image to ${outputBase}.png`);
}

main();
