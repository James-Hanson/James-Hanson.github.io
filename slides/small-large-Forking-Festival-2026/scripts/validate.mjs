import { existsSync, lstatSync, readFileSync, realpathSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sourceDeck = JSON.parse(readFileSync(resolve(root, "deck.json"), "utf8"));
const context = { window: {} };

vm.runInNewContext(
  readFileSync(resolve(root, "generated/manifest.js"), "utf8"),
  context,
  { filename: "generated/manifest.js" },
);

const manifest = context.window.DECK_MANIFEST;
const errors = [];

function check(condition, message) {
  if (!condition) errors.push(message);
}

function checkLocalPath(relativePath, label) {
  if (typeof relativePath !== "string" || relativePath.length === 0) {
    errors.push(`${label} has no path`);
    return;
  }
  const localPath = relativePath.split(/[?#]/, 1)[0];
  const path = resolve(root, localPath);
  check(existsSync(path), `${label} is missing: ${localPath}`);
  if (existsSync(path) && lstatSync(path).isSymbolicLink()) {
    try {
      realpathSync(path);
    } catch {
      errors.push(`${label} is a broken symlink: ${localPath}`);
    }
  }
}

check(manifest && typeof manifest === "object", "manifest was not loaded");
check(
  manifest?.slides?.length === sourceDeck.slides.length,
  "manifest and deck.json have different conceptual slide counts",
);

for (const asset of sourceDeck.assets ?? []) {
  checkLocalPath(asset.output, `configured asset ${asset.output}`);
}

const ids = new Set();
let expectedNumber = 0;
const numberedSlideCount = sourceDeck.slides.filter(
  slide => slide.numbered !== false,
).length;

for (const [slideIndex, slide] of (manifest?.slides ?? []).entries()) {
  const sourceSlide = sourceDeck.slides[slideIndex];
  check(!ids.has(slide.id), `duplicate slide id: ${slide.id}`);
  ids.add(slide.id);
  check(
    sourceSlide?.id === slide.id,
    `manifest slide ${slideIndex + 1} does not match deck.json`,
  );
  check(slide.steps.length > 0, `${slide.id} has no navigation steps`);

  if (sourceSlide?.numbered !== false) {
    expectedNumber += 1;
    const label = expectedNumber - numberedSlideCount;
    const footerName = label === 0 ? "zero" : `minus-${Math.abs(label)}`;
    const expectedFooter = `generated/footers/${footerName}.svg`;
    const footerPath = slide.footer?.split(/[?#]/, 1)[0];
    check(
      footerPath === expectedFooter,
      `${slide.id} has footer ${slide.footer}; expected ${expectedFooter}`,
    );
    checkLocalPath(slide.footer, `${slide.id} footer`);
  } else {
    check(!slide.footer, `${slide.id} should not have a footer`);
  }

  for (const [index, step] of slide.steps.entries()) {
    check(
      ["image", "image-sequence", "video", "html"].includes(step.type),
      `${slide.id} step ${index + 1} has unsupported type ${step.type}`,
    );
    if (step.type === "image-sequence") {
      check(
        Array.isArray(step.frames) && step.frames.length > 0,
        `${slide.id} step ${index + 1} has no sequence frames`,
      );
      for (const [frameIndex, frame] of (step.frames ?? []).entries()) {
        checkLocalPath(
          frame.src,
          `${slide.id} step ${index + 1} frame ${frameIndex + 1}`,
        );
        check(
          Number.isFinite(frame.duration) && frame.duration > 0,
          `${slide.id} step ${index + 1} frame ${frameIndex + 1} `
            + "has an invalid duration",
        );
      }
    } else {
      checkLocalPath(step.src, `${slide.id} step ${index + 1}`);
    }
    if (step.fallback) {
      checkLocalPath(step.fallback, `${slide.id} step ${index + 1} fallback`);
    }
    if (step.overlay) {
      checkLocalPath(step.overlay.src, `${slide.id} step ${index + 1} overlay`);
      check(
        typeof step.overlay.clipPath === "string",
        `${slide.id} step ${index + 1} overlay has no CSS clip path`,
      );
    }
    const sourceOverride = sourceSlide?.stepOverrides?.[String(index + 1)];
    const additionalSteps = sourceSlide?.additionalSteps ?? [];
    const additionalStart = slide.steps.length - additionalSteps.length;
    const sourceAdditional =
      index >= additionalStart ? additionalSteps[index - additionalStart] : null;
    const sourceStepConfig = sourceOverride ?? sourceAdditional;
    const expectedFullBleed =
      sourceStepConfig && Object.hasOwn(sourceStepConfig, "fullBleed")
        ? sourceStepConfig.fullBleed === true
        : sourceSlide?.fullBleed === true;
    check(
      (step.fullBleed === true) === expectedFullBleed,
      `${slide.id} step ${index + 1} full-bleed setting does not match deck.json`,
    );
  }
}

check(
  numberedSlideCount === expectedNumber,
  `deck.json says ${numberedSlideCount} numbered slides; found ${expectedNumber}`,
);

if (errors.length) {
  console.error(`Deck validation failed with ${errors.length} error(s):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exitCode = 1;
} else {
  const stepCount = manifest.slides.reduce(
    (total, slide) => total + slide.steps.length,
    0,
  );
  console.log(
    `Validated ${manifest.slides.length} conceptual slides, ` +
      `${numberedSlideCount} numbered footers, and ${stepCount} navigation steps.`,
  );
}
