(() => {
  "use strict";

  const ADVANCE_ACCELERATION = 0.658;

  window.createDeckScrubber = ({
    baseDuration,
    render,
    hangAtEnd = false,
    acceleration = ADVANCE_ACCELERATION,
    rewindOnLeft = false,
    triggerOnAdvance = false,
  }) => {
    const state = {
      progress: 0,
      boost: false,
      hold: 0,
      held: false,
      hung: false,
      running: false,
      frame: 0,
      last: 0,
      direction: 1,
      rewound: false,
    };

    function send(command) {
      parent.postMessage(
        {
          type: "deck-command",
          command,
          held: state.held,
        },
        "*",
      );
    }

    function stop() {
      state.running = false;
      state.boost = false;
      state.hold = 0;
      cancelAnimationFrame(state.frame);
      state.frame = 0;
    }

    function tick(now) {
      if (!state.running) return;
      const elapsed = Math.min(0.05, (now - state.last) / 1000);
      state.last = now;
      state.hold = state.boost ? state.hold + elapsed : 0;
      const velocity = 1 / baseDuration
        + (state.boost ? acceleration * state.hold : 0);
      state.progress += state.direction * velocity * elapsed;

      if (state.progress <= 0) {
        state.progress = 0;
        render(0);
        stop();
        state.rewound = true;
        return;
      }

      if (state.progress >= 1) {
        state.progress = 1;
        render(1);
        stop();
        if (hangAtEnd) {
          state.hung = true;
        } else {
          send("advance");
        }
        return;
      }

      render(state.progress);
      state.frame = requestAnimationFrame(tick);
    }

    function start({ reset = true } = {}) {
      stop();
      if (reset) {
        state.progress = 0;
        state.hung = false;
        state.rewound = false;
        state.direction = 1;
        render(0);
      }
      state.running = true;
      state.last = performance.now();
      state.frame = requestAnimationFrame(tick);
    }

    function resetIdle() {
      stop();
      state.progress = 0;
      state.hung = false;
      state.rewound = false;
      state.direction = 1;
      render(0);
    }

    function advanceStart() {
      state.held = true;
      if (state.hung) {
        send("advance");
        return;
      }
      if (triggerOnAdvance) {
        if (!state.running || state.direction < 0) {
          state.direction = 1;
          start({ reset: state.progress <= 0 });
        }
        return;
      }
      if (state.rewound) {
        state.rewound = false;
        state.direction = 1;
        start({ reset: false });
      }
      state.direction = 1;
      state.boost = true;
    }

    function advanceEnd() {
      state.held = false;
      if (triggerOnAdvance) return;
      state.boost = false;
      state.hold = 0;
    }

    function retreatStart() {
      if (!rewindOnLeft) {
        send("retreat");
        return;
      }
      state.held = true;
      if (state.rewound) {
        send("retreat");
        return;
      }
      state.hung = false;
      state.direction = -1;
      if (triggerOnAdvance) {
        if (!state.running) start({ reset: false });
        return;
      }
      state.boost = true;
    }

    function retreatEnd() {
      if (!rewindOnLeft) return;
      state.held = false;
      if (triggerOnAdvance) return;
      state.boost = false;
      state.hold = 0;
      state.direction = 1;
    }

    addEventListener("message", event => {
      if (event.data?.type === "deck-enter") {
        if (triggerOnAdvance) resetIdle();
        else start();
      }
      else if (event.data?.type === "deck-leave") stop();
      else if (event.data?.type === "deck-reset") {
        if (triggerOnAdvance) resetIdle();
        else start();
      }
      else if (event.data?.type === "deck-control") {
        if (event.data.action === "advance-start") advanceStart();
        else if (event.data.action === "advance-end") advanceEnd();
        else if (event.data.action === "retreat-start") retreatStart();
        else if (event.data.action === "retreat-end") retreatEnd();
      }
    });

    addEventListener("keydown", event => {
      const advance = event.key === "ArrowRight"
        || event.key === "PageDown"
        || (event.key === " " && !event.shiftKey);
      const retreat = event.key === "ArrowLeft"
        || event.key === "PageUp"
        || (event.key === " " && event.shiftKey);
      if (advance) {
        event.preventDefault();
        if (!event.repeat) advanceStart();
      } else if (retreat) {
        event.preventDefault();
        if (event.key === "ArrowLeft" && rewindOnLeft) {
          if (!event.repeat) retreatStart();
        } else {
          send("retreat");
        }
      } else if (event.key.toLowerCase() === "f") {
        send("fullscreen");
      }
    });

    addEventListener("keyup", event => {
      const advance = event.key === "ArrowRight"
        || event.key === "PageDown"
        || (event.key === " " && !event.shiftKey);
      if (advance) advanceEnd();
      else if (event.key === "ArrowLeft") retreatEnd();
    });

    addEventListener("pointerdown", event => {
      if (event.button === 0) advanceStart();
    });
    addEventListener("pointerup", advanceEnd);
    addEventListener("pointercancel", advanceEnd);
    addEventListener("pointerleave", advanceEnd);

    let touchX = 0;
    let touchY = 0;
    addEventListener("touchstart", event => {
      touchX = event.changedTouches[0].clientX;
      touchY = event.changedTouches[0].clientY;
    }, { passive: true });
    addEventListener("touchend", event => {
      const deltaX = event.changedTouches[0].clientX - touchX;
      const deltaY = event.changedTouches[0].clientY - touchY;
      if (Math.abs(deltaX) > 40 && Math.abs(deltaX) > Math.abs(deltaY)) {
        if (triggerOnAdvance) {
          if (deltaX < 0) advanceStart();
          else retreatStart();
        } else {
          send(deltaX < 0 ? "advance" : "retreat");
        }
      }
    }, { passive: true });

    render(0);
    if (window === top) {
      if (triggerOnAdvance) resetIdle();
      else start();
    } else {
      parent.postMessage({ type: "deck-ready" }, "*");
    }

    return {
      state,
      start,
      stop,
      reset: () => start(),
      advanceStart,
      advanceEnd,
      retreatStart,
      retreatEnd,
    };
  };
})();
