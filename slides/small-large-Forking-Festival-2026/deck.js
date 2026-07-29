(() => {
  "use strict";

  const manifest = window.DECK_MANIFEST;
  if (!manifest || !Array.isArray(manifest.slides) || manifest.slides.length === 0) {
    document.body.innerHTML = "<p style='padding:2rem'>Run <code>npm run build</code> before opening the deck.</p>";
    return;
  }

  document.title = manifest.title || document.title;

  const content = document.getElementById("content");
  const stage = document.getElementById("stage");
  const kSplittingOverflowGlow = document.getElementById(
    "k-splitting-overflow-glow",
  );
  const stepOverlay = document.getElementById("step-overlay");
  const footer = document.getElementById("footer-overlay");
  const mask = document.getElementById("legacy-footer-mask");
  const loading = document.getElementById("loading");
  const counter = document.getElementById("counter");
  const help = document.getElementById("help");

  let slideIndex = 0;
  let stepIndex = 0;
  let renderToken = 0;
  let currentMedia = null;
  let cursorTimer = 0;
  let loadingTimer = 0;
  let mediaEffectFrame = 0;
  let mediaEffectStartedAt = 0;
  let activeSequenceFrame = -1;
  let suppressAdvanceUntilKeyup = false;
  let interactiveFrameReady = false;
  let pendingInteractiveActions = [];
  const imageCache = new Map();

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function currentSlide() {
    return manifest.slides[slideIndex];
  }

  function currentStep() {
    return currentSlide().steps[stepIndex];
  }

  function slideFromHash() {
    const raw = decodeURIComponent(location.hash.slice(1));
    if (!raw) return { slide: 0, step: 0 };
    const [id, stepText] = raw.split("/");
    const found = manifest.slides.findIndex(slide => slide.id === id);
    return {
      slide: found >= 0 ? found : 0,
      step: Math.max(0, (parseInt(stepText || "1", 10) || 1) - 1),
    };
  }

  function updateHash() {
    const slide = currentSlide();
    const hash = `#${encodeURIComponent(slide.id)}/${stepIndex + 1}`;
    if (location.hash !== hash) history.replaceState(null, "", hash);
  }

  function updateCounter() {
    const slide = currentSlide();
    counter.textContent = `${slideIndex + 1}/${manifest.slides.length} · ${slide.id} · ${stepIndex + 1}/${slide.steps.length}`;
  }

  function stopMediaEffects() {
    cancelAnimationFrame(mediaEffectFrame);
    mediaEffectFrame = 0;
    mediaEffectStartedAt = 0;
    activeSequenceFrame = -1;
    stage.classList.remove("k-splitting-overflow");
    kSplittingOverflowGlow.classList.remove("active");
  }

  function updateImageSequence(now) {
    const step = currentStep();
    if (
      step.type !== "image-sequence"
      || !currentMedia?.classList.contains("image-sequence")
    ) {
      stopMediaEffects();
      return;
    }

    const totalDuration = step.frames.reduce(
      (total, frame) => total + frame.duration,
      0,
    );
    const elapsed = (now - mediaEffectStartedAt) / 1000;
    const sequenceTime = step.loop === false
      ? Math.min(elapsed, totalDuration)
      : elapsed % totalDuration;
    let frameIndex = step.frames.length - 1;
    let frameEnd = 0;
    for (let index = 0; index < step.frames.length; index += 1) {
      frameEnd += step.frames[index].duration;
      if (sequenceTime < frameEnd) {
        frameIndex = index;
        break;
      }
    }

    if (frameIndex !== activeSequenceFrame) {
      for (const [index, image] of [...currentMedia.children].entries()) {
        image.classList.toggle("active", index === frameIndex);
      }
      activeSequenceFrame = frameIndex;
    }

    const isKSplitting = currentSlide().id === "k-splitting";
    stage.classList.toggle("k-splitting-overflow", isKSplitting);
    kSplittingOverflowGlow.classList.toggle(
      "active",
      isKSplitting && frameIndex === 1,
    );
    if (step.loop !== false || elapsed < totalDuration) {
      mediaEffectFrame = requestAnimationFrame(updateImageSequence);
    }
  }

  function startMediaEffects() {
    stopMediaEffects();
    if (
      currentStep().type === "image-sequence"
      && currentMedia?.classList.contains("image-sequence")
    ) {
      mediaEffectStartedAt = performance.now();
      updateImageSequence(mediaEffectStartedAt);
    }
  }

  function stopCurrentMedia() {
    stopMediaEffects();
    if (!currentMedia) return;
    if (currentMedia.tagName === "VIDEO") {
      currentMedia.pause();
    } else if (currentMedia.tagName === "IFRAME") {
      currentMedia.contentWindow?.postMessage({ type: "deck-leave" }, "*");
    }
    currentMedia = null;
  }

  function settle(element, successEvent, timeoutMs = 5000) {
    return new Promise(resolve => {
      let settled = false;
      const finish = ok => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(ok);
      };
      element.addEventListener(successEvent, () => finish(true), { once: true });
      element.addEventListener("error", () => finish(false), { once: true });
      const timer = setTimeout(() => finish(false), timeoutMs);
    });
  }

  function cachedImage(step) {
    if (imageCache.has(step.src)) {
      const cached = imageCache.get(step.src);
      imageCache.delete(step.src);
      imageCache.set(step.src, cached);
      return cached;
    }

    const image = new Image();
    image.alt = step.alt || "";
    image.decoding = "async";
    image.src = step.src;
    const loaded = image.complete && image.naturalWidth > 0
      ? Promise.resolve(true)
      : settle(image, "load");
    const ready = loaded.then(async ok => {
      if (!ok) return false;
      try {
        await image.decode?.();
      } catch {
        // A successful load is still displayable when explicit decode fails.
      }
      return true;
    });
    const entry = { element: image, ready };
    imageCache.set(step.src, entry);

    while (imageCache.size > 18) {
      const oldest = imageCache.keys().next().value;
      if (imageCache.get(oldest)?.element === currentMedia) break;
      imageCache.delete(oldest);
    }
    return entry;
  }

  async function makeMedia(step) {
    if (step.type === "image") {
      const entry = cachedImage({
        ...step,
        alt: step.alt || currentSlide().title || "",
      });
      entry.element.style.removeProperty("clip-path");
      return { element: entry.element, ready: await entry.ready };
    }

    if (step.type === "video") {
      const video = document.createElement("video");
      video.dataset.deckSource = step.src;
      video.muted = true;
      video.playsInline = true;
      video.loop = step.loop !== false;
      video.preload = "auto";
      video.src = step.src;
      const ready = video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA
        ? true
        : await settle(video, "canplay", 7000);
      if (!ready && step.fallback) {
        const image = new Image();
        image.alt = step.alt || currentSlide().title || "";
        image.src = step.fallback;
        await settle(image, "load");
        return { element: image, ready: true };
      }
      return { element: video, ready };
    }

    if (step.type === "image-sequence") {
      const entries = step.frames.map(frame => cachedImage({
        src: frame.src,
        alt: "",
      }));
      const ready = (await Promise.all(entries.map(entry => entry.ready)))
        .every(Boolean);
      if (!ready && step.fallback) {
        const fallback = cachedImage({
          src: step.fallback,
          alt: step.alt || currentSlide().title || "",
        });
        return { element: fallback.element, ready: await fallback.ready };
      }

      const sequence = document.createElement("div");
      sequence.className = "image-sequence";
      sequence.setAttribute("role", "img");
      sequence.setAttribute(
        "aria-label",
        step.alt || currentSlide().title || "",
      );
      entries.forEach((entry, index) => {
        entry.element.classList.toggle("active", index === 0);
        sequence.append(entry.element);
      });
      return { element: sequence, ready };
    }

    if (step.type === "html") {
      const frame = document.createElement("iframe");
      frame.title = step.title || currentSlide().title || "HTML slide";
      frame.setAttribute("allow", "autoplay; fullscreen");
      frame.dataset.deckSource = step.src;
      return {
        element: frame,
        ready: false,
        loadAfterMount: true,
        source: step.src,
      };
    }

    throw new Error(`Unknown slide step type: ${step.type}`);
  }

  async function render() {
    const token = ++renderToken;
    interactiveFrameReady = false;
    pendingInteractiveActions = [];
    const slide = currentSlide();
    stepIndex = clamp(stepIndex, 0, slide.steps.length - 1);
    const step = currentStep();
    stage.classList.toggle("full-bleed", step.fullBleed === true);
    stage.classList.toggle("borderless", step.borderless === true);

    if (slide.footer && step.embeddedFooter !== true) {
      footer.src = slide.footer;
      footer.classList.toggle("black", slide.footerColor === "black");
      footer.classList.add("active");
    } else {
      footer.removeAttribute("src");
      footer.classList.remove("black");
      footer.classList.remove("active");
    }

    const reuseVideo = (
      step.type === "video"
      && currentMedia?.tagName === "VIDEO"
      && currentMedia.dataset.deckSource === step.src
    );
    const reuseHtml = (
      step.type === "html"
      && currentMedia?.tagName === "IFRAME"
      && currentMedia.dataset.deckSource === step.src
    );
    const reuseMedia = reuseVideo || reuseHtml;
    if (!reuseMedia) stopCurrentMedia();
    clearTimeout(loadingTimer);
    loading.classList.remove("active");
    if (!reuseMedia) {
      loadingTimer = setTimeout(() => {
        if (token === renderToken) loading.classList.add("active");
      }, 600);
    }

    let result;
    if (reuseMedia) {
      result = {
        ready: true,
        element: currentMedia,
        reused: true,
      };
    } else {
      try {
        result = await makeMedia(step);
      } catch (error) {
        console.error(error);
        result = {
          ready: false,
          element: Object.assign(document.createElement("div"), {
            textContent: `Unable to render ${slide.id}`,
          }),
        };
      }
    }

    if (token !== renderToken) return;

    if (result.loadAfterMount) {
      const frameReady = settle(result.element, "load", 5000);
      result.element.src = result.source;
      content.replaceChildren(result.element);
      currentMedia = result.element;
      result.ready = await frameReady;
      if (token !== renderToken) return;
    } else if (!result.reused) {
      content.replaceChildren(result.element);
      currentMedia = result.element;
    }

    const overlays = step.overlays || (step.overlay ? [step.overlay] : []);
    if (overlays.length > 0) {
      const overlayEntries = overlays.map(overlay => ({
        overlay,
        entry: cachedImage({
          src: overlay.src,
          alt: "",
        }),
      }));
      await Promise.all(overlayEntries.map(({ entry }) => entry.ready));
      if (token !== renderToken) return;
      for (const { overlay, entry } of overlayEntries) {
        entry.element.style.clipPath = overlay.clipPath || "none";
        entry.element.dataset.overlayAtEnd = overlay.atEnd === true
          ? "true"
          : "false";
        entry.element.classList.toggle(
          "awaiting-video-end",
          overlay.atEnd === true
            && result.element.tagName === "VIDEO"
            && !result.element.ended,
        );
      }
      stepOverlay.replaceChildren(
        ...overlayEntries.map(({ entry }) => entry.element),
      );
      stepOverlay.classList.add("active");
      const hasEndOverlay = overlayEntries.some(
        ({ overlay }) => overlay.atEnd === true,
      );
      if (
        hasEndOverlay
        && result.element.tagName === "VIDEO"
        && !result.element.ended
      ) {
        result.element.addEventListener("ended", () => {
          if (token !== renderToken) return;
          for (const overlayElement of stepOverlay.children) {
            overlayElement.classList.remove("awaiting-video-end");
          }
        }, { once: true });
      }
    } else {
      stepOverlay.classList.remove("active");
      stepOverlay.replaceChildren();
    }

    mask.classList.toggle(
      "active",
      step.legacyFooter === true
        && (
          ["IMG", "VIDEO"].includes(result.element.tagName)
          || result.element.classList.contains("image-sequence")
        ),
    );

    clearTimeout(loadingTimer);
    loading.classList.remove("active");
    updateCounter();
    updateHash();

    if (
      result.element.tagName === "VIDEO"
      && result.ready
      && !result.reused
    ) {
      result.element.currentTime = 0;
      result.element.play().catch(() => undefined);
    } else if (
      result.element.classList.contains("image-sequence")
      && result.ready
    ) {
      startMediaEffects();
    } else if (result.element.tagName === "IFRAME" && result.ready) {
      if (!result.reused) {
        result.element.contentWindow?.postMessage({ type: "deck-enter" }, "*");
      }
      result.element.contentWindow?.postMessage(
        {
          type: "deck-state",
          state: step.htmlState ?? null,
        },
        "*",
      );
      interactiveFrameReady = true;
      for (const action of pendingInteractiveActions) {
        result.element.contentWindow?.postMessage(
          { type: "deck-control", action },
          "*",
        );
      }
      pendingInteractiveActions = [];
    }

    prefetchNearby();
  }

  function goTo(nextSlide, nextStep = 0) {
    slideIndex = clamp(nextSlide, 0, manifest.slides.length - 1);
    stepIndex = clamp(nextStep, 0, manifest.slides[slideIndex].steps.length - 1);
    render();
  }

  function advance() {
    const slide = currentSlide();
    if (stepIndex < slide.steps.length - 1) {
      stepIndex += 1;
      render();
    } else if (slideIndex < manifest.slides.length - 1) {
      goTo(slideIndex + 1, 0);
    }
  }

  function retreat() {
    if (stepIndex > 0) {
      stepIndex -= 1;
      render();
    } else if (slideIndex > 0) {
      const previous = manifest.slides[slideIndex - 1];
      goTo(slideIndex - 1, previous.steps.length - 1);
    }
  }

  function restartMedia() {
    if (!currentMedia) return;
    if (currentMedia.tagName === "VIDEO") {
      if (currentStep().overlayAtEnd === true) {
        const token = renderToken;
        for (const overlayElement of stepOverlay.children) {
          if (overlayElement.dataset.overlayAtEnd === "true") {
            overlayElement.classList.add("awaiting-video-end");
          }
        }
        currentMedia.addEventListener("ended", () => {
          if (token !== renderToken) return;
          for (const overlayElement of stepOverlay.children) {
            overlayElement.classList.remove("awaiting-video-end");
          }
        }, { once: true });
      }
      currentMedia.currentTime = 0;
      currentMedia.play().catch(() => undefined);
    } else if (currentMedia.classList.contains("image-sequence")) {
      startMediaEffects();
    } else if (currentMedia.tagName === "IFRAME") {
      currentMedia.contentWindow?.postMessage({ type: "deck-reset" }, "*");
    } else {
      render();
    }
  }

  function controlInteractiveSlide(action, captureProperty = "captureAdvance") {
    const step = currentStep();
    if (
      step[captureProperty] !== true
      || currentMedia?.tagName !== "IFRAME"
    ) {
      return false;
    }
    if (!interactiveFrameReady) {
      pendingInteractiveActions.push(action);
      return true;
    }
    currentMedia.contentWindow?.postMessage(
      { type: "deck-control", action },
      "*",
    );
    return true;
  }

  function prefetchStep(step) {
    if (!step) return;
    if (step.type === "image") cachedImage(step);
    else if (step.type === "image-sequence") {
      for (const frame of step.frames) cachedImage(frame);
    }
    const overlays = step.overlays || (step.overlay ? [step.overlay] : []);
    for (const overlay of overlays) {
      cachedImage({ src: overlay.src, alt: "" });
    }
  }

  function prefetchNearby() {
    const slide = currentSlide();
    for (let offset = 1; offset <= 6; offset += 1) {
      prefetchStep(slide.steps[stepIndex + offset]);
    }
    prefetchStep(slide.steps[stepIndex - 1]);
    prefetchStep(slide.steps[stepIndex - 2]);
    prefetchStep(manifest.slides[slideIndex + 1]?.steps[0]);
    prefetchStep(manifest.slides[slideIndex - 1]?.steps.at(-1));
  }

  function toggleFullscreen() {
    if (document.fullscreenElement) {
      document.exitFullscreen?.();
    } else {
      document.documentElement.requestFullscreen?.();
    }
  }

  document.addEventListener("keydown", event => {
    const forward = event.key === "ArrowRight"
      || event.key === "PageDown"
      || (event.key === " " && !event.shiftKey);
    const backward = event.key === "ArrowLeft"
      || event.key === "PageUp"
      || (event.key === " " && event.shiftKey);

    if (forward || backward) event.preventDefault();
    if (forward && suppressAdvanceUntilKeyup) return;
    // Captured slides treat a held key as one continuous control gesture.
    // Their controller already accelerates while held; repeats are not new presses.
    if (
      forward
      && event.repeat
      && currentStep().captureAdvance === true
      && currentMedia?.tagName === "IFRAME"
    ) return;
    if (forward && controlInteractiveSlide("advance-start")) return;
    if (
      event.key === "ArrowLeft"
      && controlInteractiveSlide("retreat-start", "captureRetreat")
    ) return;
    if (forward) advance();
    else if (backward) retreat();
    else if (event.key === "Home") goTo(0, 0);
    else if (event.key === "End") {
      const last = manifest.slides.length - 1;
      goTo(last, manifest.slides[last].steps.length - 1);
    } else if (event.key.toLowerCase() === "f") toggleFullscreen();
    else if (event.key.toLowerCase() === "c") document.body.classList.toggle("show-counter");
    else if (event.key.toLowerCase() === "r") restartMedia();
    else if (event.key === "?" || (event.key === "/" && event.shiftKey)) help.classList.toggle("active");
    else if (event.key === "Escape") help.classList.remove("active");
  });

  document.addEventListener("keyup", event => {
    const forward = event.key === "ArrowRight"
      || event.key === "PageDown"
      || (event.key === " " && !event.shiftKey);
    if (forward) {
      controlInteractiveSlide("advance-end");
      suppressAdvanceUntilKeyup = false;
    } else if (event.key === "ArrowLeft") {
      controlInteractiveSlide("retreat-end", "captureRetreat");
    }
  });

  document.addEventListener("pointerup", event => {
    if (help.classList.contains("active")) {
      help.classList.remove("active");
      return;
    }
    if (event.clientX < window.innerWidth * 0.28) retreat();
    else advance();
  });

  document.addEventListener("pointermove", () => {
    document.body.classList.add("show-cursor");
    clearTimeout(cursorTimer);
    cursorTimer = setTimeout(() => document.body.classList.remove("show-cursor"), 1400);
  });

  window.addEventListener("message", event => {
    if (
      event.data?.type === "deck-ready"
      && currentMedia?.tagName === "IFRAME"
      && event.source === currentMedia.contentWindow
    ) {
      // Child scripts initialize before their images and fonts necessarily
      // finish loading. render() uses the iframe load as the authoritative
      // readiness signal, so an early deck-ready must not reset the scene.
      return;
    }
    if (event.data?.type !== "deck-command") return;
    if (event.data.command === "advance") {
      suppressAdvanceUntilKeyup = event.data.held === true;
      advance();
    }
    else if (event.data.command === "retreat") retreat();
    else if (event.data.command === "fullscreen") toggleFullscreen();
  });

  window.addEventListener("hashchange", () => {
    const target = slideFromHash();
    if (target.slide !== slideIndex || target.step !== stepIndex) {
      goTo(target.slide, target.step);
    }
  });

  const initial = slideFromHash();
  slideIndex = initial.slide;
  stepIndex = initial.step;
  render();
})();
