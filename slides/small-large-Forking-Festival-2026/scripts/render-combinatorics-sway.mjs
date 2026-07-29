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
  "SLCaNT-New-Forking-Festival-2026.odp",
);
const derivedOdp = join(
  htmlDir,
  "assets",
  "section-headings",
  "combinatorics-sway.odp",
);
const assetDir = join(
  htmlDir,
  "assets",
  "section-headings",
  "combinatorics-sway-18",
);
const buildDir = join(
  htmlDir,
  "generated",
  "build",
  "combinatorics-sway",
);
const unpackedDir = join(buildDir, "unpacked");
const libreOfficeProfile = join(buildDir, "libreoffice-profile");
const yawAngles = linearSteps(-2, 2, 18);

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

function rotationPage(template, name, yaw) {
  let page = template.replace(
    'draw:name="page2"',
    `draw:name="${name}"`,
  );
  page = page.replace(
    '<text:span text:style-name="T5">Combinatorics</text:span>',
    '<text:span text:style-name="T5">Indiscernibles</text:span>',
  );
  if (page.includes(">Combinatorics<")) {
    throw new Error("Could not replace the Combinatorics section-heading text");
  }
  if (/draw:extrusion-rotation-angle="[^"]+"/.test(page)) {
    page = page.replace(
      /draw:extrusion-rotation-angle="[^"]+"/,
      `draw:extrusion-rotation-angle="0 ${formatAngle(yaw)}"`,
    );
  } else {
    page = page.replace(
      'draw:extrusion="true"',
      `draw:extrusion="true" draw:extrusion-rotation-angle="0 ${formatAngle(yaw)}"`,
    );
  }
  return page;
}

function replacePages(originalContent, pages) {
  const generated = originalContent.replace(
    /<draw:page draw:name=" "[\s\S]*?<\/draw:page>\s*<draw:page draw:name="page2"[\s\S]*?<\/draw:page>\s*<draw:page draw:name="page3"[\s\S]*?<\/draw:page>/,
    pages.join(""),
  );
  if (generated === originalContent) {
    throw new Error("Could not replace the cover-slide pages");
  }
  return generated;
}

function main() {
  if (!existsSync(sourceOdp)) {
    throw new Error(`Missing archival cover source: ${sourceOdp}`);
  }

  rmSync(buildDir, { recursive: true, force: true });
  rmSync(assetDir, { recursive: true, force: true });
  mkdirSync(unpackedDir, { recursive: true });
  mkdirSync(assetDir, { recursive: true });

  run("unzip", ["-q", sourceOdp, "-d", unpackedDir]);
  const contentPath = join(unpackedDir, "content.xml");
  const originalContent = readFileSync(contentPath, "utf8");
  const combinatoricsPage = originalContent.match(
    /<draw:page draw:name="page2"[\s\S]*?<\/draw:page>/,
  )?.[0];
  if (!combinatoricsPage) {
    throw new Error("Could not find the Combinatorics cover page");
  }

  const pages = [
    rotationPage(combinatoricsPage, "combinatorics-reduced-motion", 0),
    ...yawAngles.map((yaw, index) =>
      rotationPage(
        combinatoricsPage,
        `combinatorics-frame-${String(index + 1).padStart(2, "0")}`,
        yaw,
      )),
  ];
  writeFileSync(contentPath, replacePages(originalContent, pages));
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
  const renderedPdf = join(buildDir, "combinatorics-sway.pdf");
  if (!existsSync(renderedPdf)) {
    throw new Error(`LibreOffice did not create ${renderedPdf}`);
  }

  const outputs = [
    "reduced-motion",
    ...yawAngles.map(
      (_, index) => `frame-${String(index + 1).padStart(2, "0")}`,
    ),
  ];
  outputs.forEach((filename, index) => {
    run("pdftocairo", [
      "-png",
      "-singlefile",
      "-r",
      "288",
      "-f",
      String(index + 1),
      "-l",
      String(index + 1),
      renderedPdf,
      join(assetDir, filename),
    ], { capture: true });
  });

  rmSync(buildDir, { recursive: true, force: true });
  console.log(`Wrote ${yawAngles.length} Indiscernibles sway frames`);
  console.log(`Wrote reproducible LibreOffice source to ${derivedOdp}`);
}

main();
