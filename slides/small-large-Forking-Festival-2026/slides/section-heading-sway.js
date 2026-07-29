(() => {
  const frame = document.getElementById("frame");
  const sourceDirectory =
    frame.dataset.swayDirectory || "../assets/section-headings/sway-18";
  const sourceExtension = frame.dataset.swayExtension || "svg";
  const source = frameNumber =>
    `${sourceDirectory}/frame-${String(frameNumber).padStart(2, "0")}.${sourceExtension}`;
  const sources = [
    ...Array.from({ length: 10 }, (_, index) => source(index + 9)),
    ...Array.from({ length: 9 }, (_, index) => source(17 - index)),
    ...Array.from({ length: 8 }, (_, index) => source(8 - index)),
    ...Array.from({ length: 7 }, (_, index) => source(index + 2)),
  ];

  const scene = document.getElementById("scene");

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return;
  }

  let sourceIndex = 0;

  Promise.all(
    [...new Set(sources)].map(source => new Promise(resolve => {
      const image = new Image();
      image.onload = async () => {
        try {
          await image.decode();
        } catch {
          // Loading succeeded; older engines may still reject decode().
        }
        resolve();
      };
      image.onerror = resolve;
      image.src = source;
    }))
  ).then(() => {
    frame.src = sources[sourceIndex];
    window.setInterval(() => {
      sourceIndex = (sourceIndex + 1) % sources.length;
      frame.src = sources[sourceIndex];
    }, 255);
  });

  const bobPeriodMs = 6150;
  const bobAmplitudeVh = 0.6;

  const updateBob = now => {
    const phase = (2 * Math.PI * now) / bobPeriodMs;
    const offset = bobAmplitudeVh * Math.sin(phase);
    scene.style.transform = `translate3d(0, ${offset}vh, 0)`;
    window.requestAnimationFrame(updateBob);
  };

  window.requestAnimationFrame(updateBob);
})();
