#!/usr/bin/env node

import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readlinkSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { basename, dirname, isAbsolute, join, relative, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const htmlDir = resolve(scriptDir, "..");
const talkDir = resolve(htmlDir, "..");
const generatedDir = join(htmlDir, "generated");
const force = process.argv.includes("--force");
const renderVersion = "4";

function ensureDir(path) {
  mkdirSync(path, { recursive: true });
}

function run(command, args, options = {}) {
  const shown = [command, ...args].join(" ");
  console.log(`  $ ${shown}`);
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
    throw new Error(`Command failed (${result.status}): ${shown}`);
  }
  return result.stdout || "";
}

function pathFromTalk(path) {
  return isAbsolute(path) ? path : resolve(talkDir, path);
}

function hashParts(parts) {
  const hash = createHash("sha256");
  hash.update(renderVersion);
  for (const part of parts) {
    hash.update("\0");
    hash.update(part);
  }
  return hash.digest("hex");
}

function hashFiles(paths, extra = "") {
  return hashParts([
    extra,
    ...paths.map(path => readFileSync(path)),
  ]);
}

function pdfPageCount(pdf) {
  const info = run("pdfinfo", [pdf], { capture: true });
  const match = info.match(/^Pages:\s+(\d+)/m);
  if (!match) throw new Error(`Could not read page count from ${pdf}`);
  return Number(match[1]);
}

function renderPdfPage(pdf, page, output) {
  ensureDir(dirname(output));
  run("pdftocairo", ["-svg", "-f", String(page), "-l", String(page), pdf, output]);
}

function safeId(value) {
  if (!/^[a-z0-9][a-z0-9-]*$/.test(value)) {
    throw new Error(`Invalid slide id "${value}"`);
  }
  return value;
}

function footerFilename(value) {
  if (value === 0) return "zero.svg";
  if (value < 0) return `minus-${Math.abs(value)}.svg`;
  return `plus-${value}.svg`;
}

function makeMediaLink(source) {
  const absoluteSource = pathFromTalk(source);
  if (!existsSync(absoluteSource)) throw new Error(`Missing media source: ${absoluteSource}`);
  const mediaDir = join(htmlDir, "media");
  const output = join(mediaDir, basename(absoluteSource));
  ensureDir(mediaDir);
  const target = relative(mediaDir, absoluteSource);
  if (existsSync(output)) {
    let correct = false;
    try {
      correct = readlinkSync(output) === target;
    } catch {
      correct = false;
    }
    if (!correct) rmSync(output);
  }
  if (!existsSync(output)) symlinkSync(target, output);
  const fingerprint = hashFiles([absoluteSource]).slice(0, 12);
  return `media/${basename(output)}?v=${fingerprint}`;
}

function versionedOutput(relativePath) {
  const fingerprint = hashFiles([resolve(htmlDir, relativePath)]).slice(0, 12);
  return `${relativePath}?v=${fingerprint}`;
}

function makeAssetLink(source, outputPath) {
  const absoluteSource = pathFromTalk(source);
  const output = resolve(htmlDir, outputPath);
  if (!existsSync(absoluteSource)) throw new Error(`Missing shared asset: ${absoluteSource}`);
  ensureDir(dirname(output));
  const target = relative(dirname(output), absoluteSource);
  if (existsSync(output)) {
    let correct = false;
    try {
      correct = readlinkSync(output) === target;
    } catch {
      correct = false;
    }
    if (!correct) rmSync(output);
  }
  if (!existsSync(output)) symlinkSync(target, output);
}

function renderFrameSequenceVideo(asset, cache) {
  const source = pathFromTalk(asset.source);
  const output = resolve(htmlDir, asset.output);
  const key = `asset:${asset.output}`;
  const digest = hashFiles([source], JSON.stringify({
    fps: asset.fps,
    frames: asset.frames,
  }));

  if (!force && cache[key] === digest && existsSync(output)) {
    console.log(`asset ${asset.output}: cached`);
    return;
  }

  const buildDir = join(
    generatedDir,
    "build",
    `sequence-${basename(asset.output, ".webm")}`,
  );
  rmSync(buildDir, { recursive: true, force: true });
  ensureDir(buildDir);
  ensureDir(dirname(output));

  run("ffmpeg", [
    "-y",
    "-v", "error",
    "-i", source,
    "-fps_mode", "passthrough",
    join(buildDir, "frame-%02d.png"),
  ]);

  const sequence = [];
  for (const item of asset.frames || []) {
    const frame = join(
      buildDir,
      `frame-${String(item.frame).padStart(2, "0")}.png`,
    );
    if (!existsSync(frame)) {
      throw new Error(`Frame ${item.frame} is unavailable in ${asset.source}`);
    }
    sequence.push(`file '${frame}'`);
    sequence.push(`duration ${item.duration}`);
  }
  if (!asset.frames?.length) {
    throw new Error(`No frames configured for ${asset.output}`);
  }
  const last = asset.frames.at(-1);
  sequence.push(
    `file '${join(buildDir, `frame-${String(last.frame).padStart(2, "0")}.png`)}'`,
  );
  const sequenceFile = join(buildDir, "sequence.txt");
  writeFileSync(sequenceFile, `${sequence.join("\n")}\n`);

  run("ffmpeg", [
    "-y",
    "-v", "error",
    "-f", "concat",
    "-safe", "0",
    "-i", sequenceFile,
    "-vf", `fps=${asset.fps || 10},format=yuv420p`,
    "-an",
    "-c:v", "libvpx-vp9",
    "-crf", "28",
    "-b:v", "0",
    "-row-mt", "1",
    output,
  ]);

  cache[key] = digest;
  rmSync(buildDir, { recursive: true, force: true });
  console.log(`asset ${asset.output}: rendered timed frame loop`);
}

function extractAnimationFrameSource(source) {
  const animationStart = source.indexOf("\\begin{animateinline}");
  if (animationStart < 0) throw new Error("No animateinline block found");

  const animationEndMarker = "\\end{animateinline}";
  const animationEnd = source.indexOf(animationEndMarker, animationStart);
  if (animationEnd < 0) throw new Error("Unclosed animateinline block");

  const block = source.slice(animationStart, animationEnd + animationEndMarker.length);
  const multiframe = /\\multiframe\s*\{(\d+)\}\s*\{[^}]+\}\s*\{/.exec(block);
  if (!multiframe) throw new Error("No multiframe block found");

  const contentStart = animationStart + multiframe.index + multiframe[0].length;
  let depth = 1;
  let cursor = contentStart;
  while (cursor < source.length && depth > 0) {
    if (source[cursor] === "{") depth += 1;
    else if (source[cursor] === "}") depth -= 1;
    cursor += 1;
  }
  if (depth !== 0) throw new Error("Unclosed multiframe content");

  return {
    frameCount: Number(multiframe[1]),
    source: source.slice(0, animationStart)
      + source.slice(contentStart, cursor - 1)
      + source.slice(animationEnd + animationEndMarker.length),
  };
}

function renderTexFrameSequenceImages(asset, cache) {
  const source = pathFromTalk(asset.source);
  const preamble = join(talkDir, "slides", "preamble.tex");
  const colors = join(talkDir, "slides", "colors.tex");
  const quiver = join(talkDir, "quiver.sty");
  const dependencies = (asset.dependencies || []).map(pathFromTalk);
  const outputDir = resolve(htmlDir, asset.output);
  const key = `asset:${asset.output}`;
  const digest = hashFiles(
    [source, preamble, colors, quiver, ...dependencies],
    JSON.stringify({
      width: asset.width,
      height: asset.height,
      frames: asset.frames.map(item => item.frame),
    }),
  );

  const animation = extractAnimationFrameSource(readFileSync(source, "utf8"));
  if (!asset.frames?.length) {
    throw new Error(`No frames configured for ${asset.output}`);
  }
  for (const item of asset.frames) {
    if (item.frame < 1 || item.frame > animation.frameCount) {
      throw new Error(
        `Frame ${item.frame} is out of range for ${asset.source} `
        + `(1-${animation.frameCount})`,
      );
    }
  }

  const frameNumbers = [...new Set(asset.frames.map(item => item.frame))];
  const outputs = frameNumbers.map(frame => relative(
    htmlDir,
    join(outputDir, `frame-${String(frame).padStart(2, "0")}.png`),
  ));
  const cached = !force
    && cache[key]?.digest === digest
    && outputs.every(path => existsSync(resolve(htmlDir, path)));
  if (cached) {
    console.log(`asset ${asset.output}: cached (${outputs.length} PNG frames)`);
    return;
  }

  const buildDir = join(
    generatedDir,
    "build",
    `tex-sequence-${basename(asset.output)}`,
  );
  rmSync(buildDir, { recursive: true, force: true });
  rmSync(outputDir, { recursive: true, force: true });
  ensureDir(buildDir);
  ensureDir(outputDir);

  for (const frame of frameNumbers) {
    const stem = `frame-${String(frame).padStart(2, "0")}`;
    const tex = join(buildDir, `${stem}.tex`);
    const pdf = join(buildDir, `${stem}.pdf`);
    const pngStem = join(outputDir, stem);
    const wrapper = [
      "\\def\\htmlslides{1}",
      "\\input{slides/preamble}",
      `\\def\\nt{${frame - 1}}`,
      "\\begin{document}",
      animation.source,
      "\\end{document}",
      "",
    ].join("\n");
    writeFileSync(tex, wrapper);
    run("pdflatex", [
      "-interaction=batchmode",
      "-halt-on-error",
      `-output-directory=${buildDir}`,
      tex,
    ]);
    run("pdftoppm", [
      "-png",
      "-singlefile",
      "-scale-to-x", String(asset.width || 1008),
      "-scale-to-y", String(asset.height || 756),
      pdf,
      pngStem,
    ]);
  }

  cache[key] = { digest, outputs };
  rmSync(buildDir, { recursive: true, force: true });
  console.log(`asset ${asset.output}: rendered ${outputs.length} PNG frames`);
}

function renderTexOverlay(asset, cache) {
  const id = safeId(asset.id);
  const page = asset.page || 1;
  const source = pathFromTalk(asset.source);
  const preamble = join(talkDir, "slides", "preamble.tex");
  const colors = join(talkDir, "slides", "colors.tex");
  const quiver = join(talkDir, "quiver.sty");
  const output = resolve(htmlDir, asset.output);
  const buildDir = join(generatedDir, "build", `overlay-${id}`);
  const wrapperDir = join(generatedDir, "wrappers", "overlays");
  const wrapper = join(wrapperDir, `${id}.tex`);
  const pdf = join(buildDir, `${id}.pdf`);
  const key = `asset:${asset.output}`;
  const wrapperSource = [
    "\\def\\htmlslides{1}",
    "\\input{slides/preamble}",
    "",
    "\\begin{document}",
    `\\input{${asset.source.replace(/\.tex$/, "")}}`,
    "\\end{document}",
    "",
  ].join("\n");
  const digest = hashFiles(
    [source, preamble, colors, quiver],
    `${wrapperSource}\n% page ${page}`,
  );

  if (!force && cache[key] === digest && existsSync(output)) {
    rmSync(buildDir, { recursive: true, force: true });
    console.log(`asset ${asset.output}: cached`);
    return;
  }

  ensureDir(buildDir);
  ensureDir(wrapperDir);
  ensureDir(dirname(output));
  writeFileSync(wrapper, wrapperSource);
  console.log(`asset ${asset.output}: compiling ${asset.source}`);
  for (let pass = 0; pass < 2; pass += 1) {
    run("pdflatex", [
      "-interaction=batchmode",
      "-halt-on-error",
      `-output-directory=${buildDir}`,
      wrapper,
    ]);
  }
  const pageCount = pdfPageCount(pdf);
  if (asset.type === "tex-overlay" && pageCount !== 1) {
    throw new Error(`TeX overlay ${asset.id} must render exactly one page`);
  }
  if (page < 1 || page > pageCount) {
    throw new Error(`Page ${page} is out of range for TeX asset ${asset.id}`);
  }
  renderPdfPage(pdf, page, output);
  cache[key] = digest;
  rmSync(buildDir, { recursive: true, force: true });
}

function renderAssets(config, cache) {
  for (const asset of config.assets || []) {
    if (asset.type === "link") {
      makeAssetLink(asset.source, asset.output);
      console.log(`asset ${asset.output}: linked`);
      continue;
    }
    if (asset.type === "frame-sequence-video") {
      renderFrameSequenceVideo(asset, cache);
      continue;
    }
    if (asset.type === "tex-frame-sequence-images") {
      renderTexFrameSequenceImages(asset, cache);
      continue;
    }
    if (asset.type === "tex-overlay" || asset.type === "tex-page") {
      renderTexOverlay(asset, cache);
      continue;
    }
    if (asset.type !== "pdf-svg") throw new Error(`Unknown asset type: ${asset.type}`);
    const source = pathFromTalk(asset.source);
    const output = resolve(htmlDir, asset.output);
    const key = `asset:${asset.output}`;
    const digest = hashFiles([source], `${asset.page || 1}`);
    if (!force && cache[key] === digest && existsSync(output)) {
      console.log(`asset ${asset.output}: cached`);
      continue;
    }
    console.log(`asset ${asset.output}: rendering`);
    renderPdfPage(source, asset.page || 1, output);
    cache[key] = digest;
  }
}

function texWrapper(slide) {
  return [
    "\\def\\htmlslides{1}",
    "\\input{slides/preamble}",
    "",
    "\\begin{document}",
    `\\input{${slide.source.replace(/\.tex$/, "")}}`,
    "\\end{document}",
    "",
  ].join("\n");
}

function renderTexSlide(slide, cache) {
  const id = safeId(slide.id);
  const source = pathFromTalk(slide.source);
  const preamble = join(talkDir, "slides", "preamble.tex");
  const colors = join(talkDir, "slides", "colors.tex");
  const quiver = join(talkDir, "quiver.sty");
  const wrapper = texWrapper(slide);
  const wrapperDir = join(generatedDir, "wrappers");
  const wrapperPath = join(wrapperDir, `${id}.tex`);
  const buildDir = join(generatedDir, "build", id);
  const outputDir = join(generatedDir, "slides", id);
  const pdf = join(buildDir, `${id}.pdf`);
  const key = `slide:${id}`;
  const digest = hashFiles([source, preamble, colors, quiver], wrapper);

  ensureDir(wrapperDir);
  ensureDir(buildDir);
  writeFileSync(wrapperPath, wrapper);

  const cached = !force
    && cache[key]?.digest === digest
    && Array.isArray(cache[key]?.outputs)
    && cache[key].outputs.every(path => existsSync(resolve(htmlDir, path)));

  if (cached) {
    rmSync(buildDir, { recursive: true, force: true });
    console.log(`slide ${id}: cached (${cache[key].outputs.length} steps)`);
    return cache[key].outputs;
  }

  console.log(`slide ${id}: compiling ${slide.source}`);
  run("pdflatex", [
    "-interaction=batchmode",
    "-halt-on-error",
    `-output-directory=${buildDir}`,
    wrapperPath,
  ]);
  // Beamer deliberately emits a final "Temporary page!" until its navigation
  // metadata has been read on a second pass. Run twice so that page never
  // becomes a presentation step.
  run("pdflatex", [
    "-interaction=batchmode",
    "-halt-on-error",
    `-output-directory=${buildDir}`,
    wrapperPath,
  ]);

  const pages = pdfPageCount(pdf);
  rmSync(outputDir, { recursive: true, force: true });
  ensureDir(outputDir);
  const outputs = [];
  for (let page = 1; page <= pages; page += 1) {
    const filename = `step-${String(page).padStart(2, "0")}.svg`;
    const output = join(outputDir, filename);
    renderPdfPage(pdf, page, output);
    outputs.push(relative(htmlDir, output));
  }

  cache[key] = { digest, outputs };
  rmSync(buildDir, { recursive: true, force: true });
  return outputs;
}

function renderPdfSlide(slide, cache) {
  const id = safeId(slide.id);
  const source = pathFromTalk(slide.source);
  const available = pdfPageCount(source);
  const pages = slide.pages || Array.from({ length: available }, (_, index) => index + 1);
  for (const page of pages) {
    if (page < 1 || page > available) {
      throw new Error(`Page ${page} is out of range for ${slide.source}`);
    }
  }

  const outputDir = join(generatedDir, "slides", id);
  const key = `slide:${id}`;
  const digest = hashFiles([source], JSON.stringify(pages));
  const expected = pages.map((_, index) =>
    relative(htmlDir, join(outputDir, `step-${String(index + 1).padStart(2, "0")}.svg`)));

  if (!force && cache[key]?.digest === digest && expected.every(path => existsSync(resolve(htmlDir, path)))) {
    console.log(`slide ${id}: cached (${expected.length} steps)`);
    return expected;
  }

  console.log(`slide ${id}: rendering ${slide.source}`);
  rmSync(outputDir, { recursive: true, force: true });
  ensureDir(outputDir);
  pages.forEach((page, index) => {
    renderPdfPage(source, page, resolve(htmlDir, expected[index]));
  });
  cache[key] = { digest, outputs: expected };
  return expected;
}

function buildSteps(slide, outputs, footer) {
  let steps;
  if (slide.type === "html") {
    const source = resolve(htmlDir, slide.source);
    if (!existsSync(source)) throw new Error(`Missing HTML slide: ${source}`);
    steps = [{
      type: "html",
      src: versionedOutput(slide.source),
      title: slide.title,
      captureAdvance: slide.captureAdvance === true,
      captureRetreat: slide.captureRetreat === true,
      fullBleed: slide.fullBleed === true,
      borderless: slide.borderless === true,
    }];
  } else {
    steps = outputs.map(src => ({
      type: "image",
      src: src.includes("?") ? src : versionedOutput(src),
      alt: slide.title,
      legacyFooter: slide.legacyFooter === true,
      ...(slide.borderless === true ? { borderless: true } : {}),
    }));
  }

  for (const [stepText, override] of Object.entries(slide.stepOverrides || {})) {
    const index = Number(stepText) - 1;
    if (!Number.isInteger(index) || index < 0 || index >= steps.length) {
      throw new Error(`Override step ${stepText} is out of range for ${slide.id}`);
    }
    const fallback = steps[index].src;
    if (override.type === "video") {
      const overlays = [];
      if (override.overlaySource) {
        overlays.push({
          src: makeMediaLink(override.overlaySource),
          clipPath: override.overlayClip || "none",
          atEnd: override.overlayAtEnd === true,
        });
      }
      for (const overlay of override.overlaySteps || []) {
        const overlayIndex = Number(overlay.step) - 1;
        const overlayStep = steps[overlayIndex];
        if (
          !Number.isInteger(overlayIndex)
          || overlayIndex < 0
          || overlayStep?.type !== "image"
        ) {
          throw new Error(
            `Invalid overlay step ${overlay.step} for ${slide.id}`,
          );
        }
        overlays.push({
          src: overlayStep.src,
          clipPath: overlay.clip || overlay.clipPath || "none",
          atEnd: overlay.atEnd === true,
        });
      }
      steps[index] = {
        type: "video",
        src: makeMediaLink(override.source),
        fallback,
        alt: slide.title,
        loop: override.loop !== false,
        legacyFooter: override.legacyFooter === true,
        overlayAtEnd: override.overlayAtEnd === true,
        ...(overlays.length > 0 ? { overlays } : {}),
      };
    } else if (override.type === "image-sequence") {
      if (!Array.isArray(override.frames) || override.frames.length === 0) {
        throw new Error(`No image-sequence frames configured for ${slide.id}`);
      }
      const frames = override.frames.map((item, frameIndex) => {
        if (
          typeof item.source !== "string"
          || !Number.isFinite(item.duration)
          || item.duration <= 0
        ) {
          throw new Error(
            `Invalid image-sequence frame ${frameIndex + 1} for ${slide.id}`,
          );
        }
        const source = resolve(htmlDir, item.source);
        if (!existsSync(source)) {
          throw new Error(`Missing image-sequence frame: ${source}`);
        }
        return {
          src: versionedOutput(item.source),
          duration: item.duration,
        };
      });
      steps[index] = {
        type: "image-sequence",
        frames,
        fallback,
        alt: slide.title,
        loop: override.loop !== false,
        legacyFooter: override.legacyFooter === true,
      };
    } else if (override.type === "image") {
      const overlays = override.overlaySource
        ? [{
          src: makeMediaLink(override.overlaySource),
          clipPath: override.overlayClip || "none",
        }]
        : [];
      steps[index] = {
        type: "image",
        src: makeMediaLink(override.source),
        alt: slide.title,
        legacyFooter: override.legacyFooter === true,
        fullBleed: override.fullBleed === true,
        borderless: override.borderless === true,
        ...(overlays.length > 0 ? { overlays } : {}),
      };
    } else if (override.type === "html") {
      const embeddedFooter = override.embeddedFooter === true;
      const versionedSource = versionedOutput(override.source);
      const customQuery =
        typeof override.query === "string" && override.query.length > 0
          ? `&${override.query}`
          : "";
      const footerQuery = embeddedFooter && footer
        ? `&footer=${encodeURIComponent(footer)}`
        : "";
      steps[index] = {
        type: "html",
        src: `${versionedSource}${customQuery}${footerQuery}`,
        title: slide.title,
        captureAdvance: override.captureAdvance === true,
        embeddedFooter,
        fullBleed: override.fullBleed === true,
        borderless: override.borderless === true,
      };
    } else {
      throw new Error(`Unknown override type "${override.type}" for ${slide.id}`);
    }
  }
  for (const additional of slide.additionalSteps || []) {
    if (additional.type !== "html") {
      throw new Error(
        `Unknown additional step type "${additional.type}" for ${slide.id}`,
      );
    }
    const embeddedFooter = additional.embeddedFooter === true;
    const versionedSource = versionedOutput(additional.source);
    const customQuery =
      typeof additional.query === "string" && additional.query.length > 0
        ? `&${additional.query}`
        : "";
    const footerQuery = embeddedFooter && footer
      ? `&footer=${encodeURIComponent(footer)}`
      : "";
    steps.push({
      type: "html",
      src: `${versionedSource}${customQuery}${footerQuery}`,
      title: additional.title || slide.title,
      captureAdvance: additional.captureAdvance === true,
      embeddedFooter,
      fullBleed: additional.fullBleed === true,
      borderless: additional.borderless === true,
      ...(additional.htmlState ? { htmlState: additional.htmlState } : {}),
    });
  }
  if (slide.borderless === true) {
    for (const step of steps) step.borderless = true;
  }
  return steps;
}

function footerTex(value) {
  return String.raw`\documentclass[border={0pt 0.1pt 0pt 0.45pt}]{standalone}
\usepackage[T1]{fontenc}
\usepackage{xcolor}
\renewcommand{\familydefault}{\sfdefault}
\begin{document}
{\color{white}\sffamily ${value}}
\end{document}
`;
}

function renderFooters(numberedCount, cache) {
  const labels = Array.from({ length: numberedCount }, (_, index) => index + 1 - numberedCount);
  const sources = labels.map(footerTex);
  const buildDir = join(generatedDir, "build", "footers");
  const outputDir = join(generatedDir, "footers");
  const key = "footers";
  const digest = hashParts(sources);
  const outputs = labels.map(value => relative(htmlDir, join(outputDir, footerFilename(value))));
  const legacyWrapper = join(generatedDir, "wrappers", "footer-numbers.tex");
  rmSync(legacyWrapper, { force: true });

  if (!force && cache[key]?.digest === digest && outputs.every(path => existsSync(resolve(htmlDir, path)))) {
    rmSync(buildDir, { recursive: true, force: true });
    console.log(`footers: cached (${outputs.length} values)`);
    return new Map(
      labels.map((value, index) => [value, versionedOutput(outputs[index])]),
    );
  }

  console.log(`footers: rendering ${labels[0]} through 0`);
  ensureDir(buildDir);
  rmSync(outputDir, { recursive: true, force: true });
  ensureDir(outputDir);
  labels.forEach((value, index) => {
    const stem = basename(footerFilename(value), ".svg");
    const tex = join(buildDir, `${stem}.tex`);
    const pdf = join(buildDir, `${stem}.pdf`);
    writeFileSync(tex, sources[index]);
    run("pdflatex", [
      "-interaction=batchmode",
      "-halt-on-error",
      `-output-directory=${buildDir}`,
      tex,
    ]);
    renderPdfPage(pdf, 1, resolve(htmlDir, outputs[index]));
  });
  cache[key] = { digest, outputs };
  rmSync(buildDir, { recursive: true, force: true });
  return new Map(
    labels.map((value, index) => [value, versionedOutput(outputs[index])]),
  );
}

function writeManifest(config, slides) {
  const manifest = {
    title: config.title,
    generatedAt: new Date().toISOString(),
    slides,
  };
  ensureDir(generatedDir);
  writeFileSync(
    join(generatedDir, "manifest.js"),
    `window.DECK_MANIFEST = ${JSON.stringify(manifest, null, 2)};\n`,
  );
}

function main() {
  const configPath = join(htmlDir, "deck.json");
  const config = JSON.parse(readFileSync(configPath, "utf8"));
  const cachePath = join(generatedDir, "cache.json");
  const cache = existsSync(cachePath)
    ? JSON.parse(readFileSync(cachePath, "utf8"))
    : {};

  ensureDir(generatedDir);
  renderAssets(config, cache);

  const numberedCount = config.slides.filter(slide => slide.numbered !== false).length;
  const footerMap = renderFooters(numberedCount, cache);
  let numberedPosition = 0;
  const builtSlides = [];

  for (const slide of config.slides) {
    safeId(slide.id);
    let outputs = [];
    if (slide.type === "tex") outputs = renderTexSlide(slide, cache);
    else if (slide.type === "pdf") outputs = renderPdfSlide(slide, cache);
    else if (slide.type === "images") {
      if (!Array.isArray(slide.sources) || slide.sources.length === 0) {
        throw new Error(`No image sources configured for ${slide.id}`);
      }
      outputs = slide.sources.map(makeMediaLink);
      rmSync(join(generatedDir, "slides", slide.id), { recursive: true, force: true });
      delete cache[`slide:${slide.id}`];
    }
    else if (slide.type === "html") {
      rmSync(join(generatedDir, "slides", slide.id), { recursive: true, force: true });
      delete cache[`slide:${slide.id}`];
    } else {
      throw new Error(`Unknown slide type: ${slide.type}`);
    }

    let footer = null;
    if (slide.numbered !== false) {
      numberedPosition += 1;
      footer = footerMap.get(numberedPosition - numberedCount);
    }

    builtSlides.push({
      id: slide.id,
      title: slide.title || slide.id,
      footer,
      footerColor: slide.footerColor || null,
      steps: buildSteps(slide, outputs, footer),
    });
  }

  writeManifest(config, builtSlides);
  writeFileSync(cachePath, `${JSON.stringify(cache, null, 2)}\n`);

  const stepCount = builtSlides.reduce((sum, slide) => sum + slide.steps.length, 0);
  console.log(`\nBuilt ${builtSlides.length} conceptual slides / ${stepCount} navigation steps.`);
  console.log(`Open ${join(htmlDir, "index.html")}`);
}

main();
