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
const talkDir = resolve(htmlDir, "..");
const repoDir = resolve(talkDir, "..");
const sourceOdp = join(
  repoDir,
  "shared-assets",
  "cover-slides",
  "SLCaNT-title-elements-separated.odp",
);
const assetDir = join(htmlDir, "assets", "title", "sway-grid");
const derivedOdp = join(htmlDir, "assets", "title", "title-sway-grid.odp");
const yawAssetDir = join(htmlDir, "assets", "title", "sway-yaw");
const yawDerivedOdp = join(htmlDir, "assets", "title", "title-sway-yaw.odp");
const buildDir = join(htmlDir, "generated", "build", "title-sway-grid");
const unpackedDir = join(buildDir, "unpacked");
const libreOfficeProfile = join(buildDir, "libreoffice-profile");

const basePitch = 30;
const baseYaw = -36;
const titleRotationCenter = "(0.001 -0.120 -529.167)";
const pitchOffsets = linearSteps(-1.25, 1.25, 9);
const yawOffsets = linearSteps(-2, 2, 18);
const subtleYawOffsets = linearSteps(-1, 1, 36);
const mode = process.argv[2] || "all";
const batchArgument = Number(process.argv[3]);

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd || repoDir,
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
  return result.stdout || "";
}

function linearSteps(start, end, count) {
  return Array.from(
    { length: count },
    (_, index) => start + ((end - start) * index) / (count - 1),
  );
}

function formatAngle(value) {
  return value.toFixed(3).replace(/\.?0+$/, "");
}

function rotationPage(template, name, pitch, yaw) {
  let page = template
    .replace('draw:name="Title"', `draw:name="${name}"`)
    .replace(
      /draw:extrusion-rotation-angle="[^"]+"/,
      `draw:extrusion-rotation-angle="${formatAngle(pitch)} ${formatAngle(yaw)}"`,
    );
  if (/draw:extrusion-rotation-center="[^"]+"/.test(page)) {
    page = page.replace(
      /draw:extrusion-rotation-center="[^"]+"/,
      `draw:extrusion-rotation-center="${titleRotationCenter}"`,
    );
  } else {
    page = page.replace(
      /draw:extrusion-rotation-angle="[^"]+"/,
      match => `${match} draw:extrusion-rotation-center="${titleRotationCenter}"`,
    );
  }
  return page;
}

function stripWhitePage(svgPath) {
  const original = readFileSync(svgPath, "utf8");
  const cleaned = original.replace(
    /<path fill-rule="evenodd" fill="rgb\(100%, 100%, 100%\)" fill-opacity="1" d="M 0 0 L [^"]+ Z M 0 0 "\/>\n?/,
    "",
  );
  writeFileSync(svgPath, cleaned);
}

function pageSet(titlePage) {
  const baseline = rotationPage(
    titlePage,
    "title-reduced-motion",
    basePitch,
    baseYaw,
  );
  const grid = pitchOffsets.map((pitchOffset, pitchIndex) =>
    yawOffsets.map((yawOffset, yawIndex) => {
      const pitchNumber = String(pitchIndex + 1).padStart(2, "0");
      const yawNumber = String(yawIndex + 1).padStart(2, "0");
      return rotationPage(
        titlePage,
        `title-p${pitchNumber}-y${yawNumber}`,
        basePitch + pitchOffset,
        baseYaw + yawOffset,
      );
    }));
  return { baseline, grid };
}

function replacePages(originalContent, pages) {
  const generated = originalContent.replace(
    /<draw:page draw:name="Title"[\s\S]*<draw:page draw:name="Author"[\s\S]*?<\/draw:page>/,
    pages.join(""),
  );
  if (generated === originalContent) {
    throw new Error("Could not replace the separated title pages");
  }
  return generated;
}

function writeOdp(originalContent, pages, output) {
  writeFileSync(
    join(unpackedDir, "content.xml"),
    replacePages(originalContent, pages),
  );
  copyFileSync(sourceOdp, output);
  run("zip", ["-q", "-u", output, "content.xml", "styles.xml"], {
    cwd: unpackedDir,
  });
}

function prepare() {
  if (!existsSync(sourceOdp)) {
    throw new Error(`Missing archival title source: ${sourceOdp}`);
  }

  rmSync(buildDir, { recursive: true, force: true });
  rmSync(assetDir, { recursive: true, force: true });
  mkdirSync(unpackedDir, { recursive: true });
  mkdirSync(assetDir, { recursive: true });
  mkdirSync(dirname(derivedOdp), { recursive: true });

  run("unzip", ["-q", sourceOdp, "-d", unpackedDir]);

  const contentPath = join(unpackedDir, "content.xml");
  const stylesPath = join(unpackedDir, "styles.xml");
  const originalContent = readFileSync(contentPath, "utf8");
  const titlePage = originalContent.match(
    /<draw:page draw:name="Title"[\s\S]*?<\/draw:page>/,
  )?.[0];
  if (!titlePage) throw new Error("Could not find the separated title page");

  const originalStyles = readFileSync(stylesPath, "utf8");
  const generatedStyles = originalStyles.replace(
    /fo:page-width="25\.4cm" fo:page-height="19\.05cm"/,
    'fo:page-width="30.48cm" fo:page-height="20.381cm"',
  );
  if (generatedStyles === originalStyles) {
    throw new Error("Could not widen the title render canvas");
  }
  writeFileSync(stylesPath, generatedStyles);

  const { baseline, grid } = pageSet(titlePage);
  writeOdp(originalContent, [baseline, ...grid.flat()], derivedOdp);
  grid.forEach((row, pitchIndex) => {
    const pages = pitchIndex === 0 ? [baseline, ...row] : row;
    writeOdp(
      originalContent,
      pages,
      join(
        buildDir,
        `title-sway-grid-batch-${String(pitchIndex + 1).padStart(2, "0")}.odp`,
      ),
    );
  });
  console.log(
    `Prepared the ${pitchOffsets.length * yawOffsets.length}-frame ODP `
      + `and ${pitchOffsets.length} render batches`,
  );
}

function renderBatch(pitchIndex) {
  if (
    !Number.isInteger(pitchIndex)
    || pitchIndex < 0
    || pitchIndex >= pitchOffsets.length
  ) {
    throw new Error(
      `Batch index must be an integer from 0 through ${pitchOffsets.length - 1}`,
    );
  }
  mkdirSync(assetDir, { recursive: true });
  const batchNumber = String(pitchIndex + 1).padStart(2, "0");
  const batchOdp = join(buildDir, `title-sway-grid-batch-${batchNumber}.odp`);
  if (!existsSync(batchOdp)) {
    throw new Error("Run this script with --prepare before rendering batches");
  }

  const profile = `${libreOfficeProfile}-${batchNumber}`;
  rmSync(profile, { recursive: true, force: true });
  mkdirSync(profile, { recursive: true });
  console.log(
    `Exporting LibreOffice title batch ${pitchIndex + 1}/${pitchOffsets.length}...`,
  );
  run("libreoffice", [
    `-env:UserInstallation=file://${profile}`,
    "--headless",
    "--convert-to",
    "pdf",
    "--outdir",
    buildDir,
    batchOdp,
  ]);

  const pdf = join(buildDir, `title-sway-grid-batch-${batchNumber}.pdf`);
  if (!existsSync(pdf)) throw new Error(`LibreOffice did not create ${pdf}`);

  const outputs = [];
  if (pitchIndex === 0) {
    outputs.push({ page: 1, filename: "reduced-motion.svg" });
  }
  yawOffsets.forEach((_, yawIndex) => {
    outputs.push({
      page: yawIndex + 1 + (pitchIndex === 0 ? 1 : 0),
      filename: [
        `pitch-${batchNumber}`,
        `yaw-${String(yawIndex + 1).padStart(2, "0")}.svg`,
      ].join("-"),
    });
  });

  outputs.forEach(({ page, filename }) => {
    const output = join(assetDir, filename);
    run("pdftocairo", [
      "-svg",
      "-f",
      String(page),
      "-l",
      String(page),
      pdf,
      output,
    ], { capture: true });
    stripWhitePage(output);
  });
  rmSync(pdf, { force: true });
  rmSync(profile, { recursive: true, force: true });
  console.log(
    `Rendered title batch ${pitchIndex + 1}/${pitchOffsets.length}`,
  );
}

function finish() {
  rmSync(buildDir, { recursive: true, force: true });
  console.log(`Wrote ${pitchOffsets.length * yawOffsets.length} animation frames`);
  console.log(`Wrote reproducible LibreOffice source to ${derivedOdp}`);
}

function renderYawOnly() {
  if (!existsSync(sourceOdp)) {
    throw new Error(`Missing archival title source: ${sourceOdp}`);
  }

  rmSync(buildDir, { recursive: true, force: true });
  rmSync(yawAssetDir, { recursive: true, force: true });
  mkdirSync(unpackedDir, { recursive: true });
  mkdirSync(yawAssetDir, { recursive: true });

  run("unzip", ["-q", sourceOdp, "-d", unpackedDir]);
  const contentPath = join(unpackedDir, "content.xml");
  const stylesPath = join(unpackedDir, "styles.xml");
  const originalContent = readFileSync(contentPath, "utf8");
  const titlePage = originalContent.match(
    /<draw:page draw:name="Title"[\s\S]*?<\/draw:page>/,
  )?.[0];
  if (!titlePage) throw new Error("Could not find the separated title page");

  const originalStyles = readFileSync(stylesPath, "utf8");
  const generatedStyles = originalStyles.replace(
    /fo:page-width="25\.4cm" fo:page-height="19\.05cm"/,
    'fo:page-width="30.48cm" fo:page-height="20.381cm"',
  );
  if (generatedStyles === originalStyles) {
    throw new Error("Could not widen the title render canvas");
  }
  writeFileSync(stylesPath, generatedStyles);

  const baseline = rotationPage(
    titlePage,
    "title-reduced-motion",
    basePitch,
    baseYaw,
  );
  const yawPages = subtleYawOffsets.map((yawOffset, yawIndex) =>
    rotationPage(
      titlePage,
      `title-yaw-${String(yawIndex + 1).padStart(2, "0")}`,
      basePitch,
      baseYaw + yawOffset,
    ));
  writeOdp(originalContent, [baseline, ...yawPages], yawDerivedOdp);

  const profile = `${libreOfficeProfile}-yaw`;
  rmSync(profile, { recursive: true, force: true });
  mkdirSync(profile, { recursive: true });
  run("libreoffice", [
    `-env:UserInstallation=file://${profile}`,
    "--headless",
    "--convert-to",
    "pdf",
    "--outdir",
    buildDir,
    yawDerivedOdp,
  ]);

  const pdf = join(buildDir, "title-sway-yaw.pdf");
  if (!existsSync(pdf)) throw new Error(`LibreOffice did not create ${pdf}`);
  const outputs = [
    { page: 1, filename: "reduced-motion.svg" },
    ...subtleYawOffsets.map((_, yawIndex) => ({
      page: yawIndex + 2,
      filename: `yaw-${String(yawIndex + 1).padStart(2, "0")}.svg`,
    })),
  ];
  outputs.forEach(({ page, filename }) => {
    const output = join(yawAssetDir, filename);
    run("pdftocairo", [
      "-svg",
      "-f",
      String(page),
      "-l",
      String(page),
      pdf,
      output,
    ], { capture: true });
    stripWhitePage(output);
  });

  rmSync(buildDir, { recursive: true, force: true });
  console.log(
    `Wrote ${subtleYawOffsets.length} subtle single-axis animation frames`,
  );
  console.log(`Wrote reproducible LibreOffice source to ${yawDerivedOdp}`);
}

if (mode === "--yaw-only") {
  renderYawOnly();
} else if (mode === "--prepare") {
  prepare();
} else if (mode === "--batch") {
  renderBatch(batchArgument);
} else if (mode === "--finish") {
  finish();
} else if (mode === "all") {
  prepare();
  pitchOffsets.forEach((_, pitchIndex) => renderBatch(pitchIndex));
  finish();
} else {
  throw new Error(`Unknown mode: ${mode}`);
}
