/* ============================================================
   deck.js — navigation for "Constructive math and the continuous degrees"
   ============================================================ */

(() => {
  "use strict";

  const slides = Array.from(document.querySelectorAll(".slide"));
  const loading = document.getElementById("loading");
  const pagenum = document.getElementById("pagenum");
  const stage = document.getElementById("stage");

  /* Which slides carry a number. The title is excluded, so the first content
     slide is 1. Computed from the DOM, never written by hand.

     Subslides (revealing more of one slide without moving on) will not affect
     this: the number is derived from which slide is active, not from how many
     times a key has been pressed, so any number of steps inside a slide keep
     the same number. */
  const numbered = slides.filter((s) => !s.classList.contains("slide--title"));

  let index = 0;
  /* How many of the current slide's steps are revealed. Steps belong to a
     slide, so moving between slides resets or completes this. */
  let step = 0;

  const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
  const stepsOf = (slideEl) =>
    slideEl ? Array.from(slideEl.querySelectorAll(".step")) : [];
  const framesOf = (slideEl) =>
    slideEl ? Array.from(slideEl.querySelectorAll("[data-frame]")) : [];

  /* How many times forward navigation advances WITHIN a slide.

     The two schemes count differently. `.step` elements are cumulative, so N of
     them give N advances (showing 1, 2, ... N). `[data-frame]` elements are
     alternatives whose first frame is the slide's initial state, so N frames
     give only N-1 advances (frame 1 -> frame 2 -> ... -> frame N). Counting
     frames as N left a spurious extra subslide showing neither frame. */
  function subslides(slideEl) {
    if (!slideEl) return 0;
    const byStep = stepsOf(slideEl).length;
    const maxFrame = framesOf(slideEl).reduce(
      (m, el) => Math.max(m, parseInt(el.dataset.frame, 10) || 0), 0);
    const byFrame = Math.max(0, maxFrame - 1);
    return Math.max(byStep, byFrame);
  }

  function updatePagenum() {
    const current = slides[index];
    const pos = numbered.indexOf(current);
    pagenum.textContent = pos === -1 ? "" : `${pos + 1}/${numbered.length}`;
  }

  function layoutNonTotalConnector() {
    const slide = slides[index];
    if (!slide.classList.contains("slide--non-total")) return;
    const svg = slide.querySelector(".non-total__surjection-connector");
    if (!svg) return;
    const body = slide.querySelector(".miller__body").getBoundingClientRect();
    if (!body.width || !body.height) return;
    const value = slide.querySelector(".non-total__value").getBoundingClientRect();
    const caption = slide.querySelector(".non-total__conclusion").getBoundingClientRect();
    const startX = value.left + value.width / 2 - body.left;
    const lineOffsetY = 8;
    const startY = value.bottom - body.top + lineOffsetY;
    const endY = caption.top - body.top - stage.clientHeight * 0.004 + lineOffsetY;
    svg.setAttribute("viewBox", `0 0 ${body.width} ${body.height}`);
    svg.querySelector("path").setAttribute("d",
      `M ${startX} ${startY} V ${endY}`);

    const quoteSvg = slide.querySelector(".non-total__quote-connector");
    const bounds = quoteSvg.getBoundingClientRect();
    const name = slide.querySelector(".non-total__kakutani").getBoundingClientRect();
    const quote = slide.querySelector(".non-total__quote").getBoundingClientRect();
    const x = name.left - bounds.left - bounds.width * 0.004;
    const y = name.top + name.height / 2 - bounds.top;
    const gutter = bounds.width * 0.055;
    const quoteY = quote.top + quote.height / 2 - bounds.top;
    const quoteX = quote.left - bounds.left - bounds.width * 0.008;
    quoteSvg.setAttribute("viewBox", `0 0 ${bounds.width} ${bounds.height}`);
    quoteSvg.querySelector("path").setAttribute("d",
      `M ${x} ${y} H ${gutter} V ${quoteY} H ${quoteX}`);
  }

  function render() {
    slides.forEach((s, i) => s.classList.toggle("is-active", i === index));
    const cur = slides[index];
    cur.classList.toggle("is-negation-highlighted",
      cur.classList.contains("slide--kleene") && step >= 2);
    /* Cumulative reveals: show the first `step` of them. */
    stepsOf(cur).forEach((el, i) =>
      el.classList.toggle("is-shown", i < step)
    );
    /* Frames can persist through a later frame via data-through-frame.
       Hidden content stays in the layout so the composition never shifts. */
    framesOf(cur).forEach((el) => {
      const first = parseInt(el.dataset.frame, 10) || 0;
      const last = parseInt(el.dataset.throughFrame, 10) || first;
      el.classList.toggle(
        "is-shown",
        first <= step + 1 && step + 1 <= last
      );
    });
    /* Let the chrome adapt to slides with their own colour scheme. */
    stage.classList.toggle(
      "is-placeholder",
      slides[index].classList.contains("slide--placeholder")
    );
    document.body.classList.toggle(
      "is-halting",
      cur.classList.contains("slide--halting")
    );
    updatePagenum();
    /* Hash carries slide AND subslide: #3.2 is slide 3, subslide 2. Written
       only when it actually changes, so a no-op render doesn't push a
       duplicate history entry. */
    const hash = slides.length > 1 ? `#${index + 1}.${step + 1}` : "";
    if (location.hash !== hash) location.hash = hash;
    layoutNonTotalConnector();
  }

  function go(n) {
    const next = clamp(n, 0, slides.length - 1);
    if (next !== index) {
      index = next;
      step = 0;
      render();
    }
  }

  /* Forward: reveal the next step if there is one, otherwise move on.
     Back: retract a step, otherwise go back and show the previous slide fully
     revealed, so stepping back walks its steps in reverse. */
  function next() {
    if (step < subslides(slides[index])) {
      step += 1;
      render();
    } else {
      go(index + 1);
    }
  }

  function prev() {
    if (step > 0) {
      step -= 1;
      render();
    } else if (index > 0) {
      index -= 1;
      step = subslides(slides[index]);
      render();
    }
  }

  document.addEventListener("keydown", (e) => {
    switch (e.key) {
      case "ArrowRight":
      case "ArrowDown":
      case "PageDown":
      case " ":
      case "Enter":
        e.preventDefault(); next(); break;
      case "ArrowLeft":
      case "ArrowUp":
      case "PageUp":
      case "Backspace":
        e.preventDefault(); prev(); break;
      case "Home": e.preventDefault(); go(0); break;
      case "End":  e.preventDefault(); go(slides.length - 1); break;
    }
  });

  /* Click / tap: right two-thirds advances, left third goes back. */
  document.getElementById("viewer").addEventListener("click", (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    (e.clientX - r.left) / r.width < 0.32 ? prev() : next();
  });

  /* Wheel navigation (throttled). */
  let wheelLock = 0;
  window.addEventListener("wheel", (e) => {
    const now = Date.now();
    if (now < wheelLock || Math.abs(e.deltaY) < 18) return;
    wheelLock = now + 480;
    e.deltaY > 0 ? next() : prev();
  }, { passive: true });

  /* Restore slide and subslide from the URL hash. Accepts "#3" (subslide 1),
     "#3.2" and "#3/2". */
  const m = (location.hash || "").match(/^#?(\d+)(?:[./](\d+))?/);
  if (m) {
    index = clamp(parseInt(m[1], 10) - 1, 0, slides.length - 1);
    step = clamp(m[2] ? parseInt(m[2], 10) - 1 : 0, 0, subslides(slides[index]));
  }

  /* Typeset all KaTeX delimiters on the slides (ground rule 8). */
  if (window.renderMathInElement) {
    renderMathInElement(document.getElementById("viewer"), {
      delimiters: [
        { left: "\\(", right: "\\)", display: false },
        { left: "\\[", right: "\\]", display: true },
      ],
      throwOnError: false,
    });
  }

  /* Pack actual typeset bounds in two dimensions, largest first. Smaller
     phrases fill the remaining gaps without sharing rows or columns. */
  const cloud = document.querySelector(".halting-cloud");
  function layoutCloud() {
    if (!cloud) return;
    let seed = 137;
    const random = () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    const placed = [];
    const width = cloud.clientWidth;
    const height = cloud.clientHeight;
    const gapX = window.innerWidth * 0.009;
    const gapY = window.innerHeight * 0.006;
    for (const phrase of cloud.children) {
      phrase.style.display = "";
      const bounds = phrase.getBoundingClientRect();
      let found = false;
      for (let attempt = 0; attempt < 1200; attempt++) {
        const box = {
          x: random() * Math.max(0, width - bounds.width),
          y: random() * Math.max(0, height - bounds.height),
          w: bounds.width,
          h: bounds.height,
        };
        if (placed.some((other) =>
          box.x < other.x + other.w + gapX &&
          box.x + box.w + gapX > other.x &&
          box.y < other.y + other.h + gapY &&
          box.y + box.h + gapY > other.y
        )) continue;
        phrase.style.left = `${box.x}px`;
        phrase.style.top = `${box.y}px`;
        placed.push(box);
        found = true;
        break;
      }
      phrase.style.display = found ? "" : "none";
    }
  }
  layoutCloud();
  document.fonts.ready.then(() => {
    layoutCloud();
    layoutNonTotalConnector();
  });
  document.fonts.addEventListener("loadingdone", layoutNonTotalConnector);
  let cloudResize;
  window.addEventListener("resize", () => {
    cancelAnimationFrame(cloudResize);
    cloudResize = requestAnimationFrame(() => {
      layoutCloud();
      layoutNonTotalConnector();
    });
  });

  render();
  requestAnimationFrame(() => loading.classList.add("is-hidden"));
})();
