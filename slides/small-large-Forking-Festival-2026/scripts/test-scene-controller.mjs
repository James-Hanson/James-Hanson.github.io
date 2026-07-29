import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const listeners = new Map();
const messages = [];
const frames = new Map();
let clock = 0;
let nextFrame = 1;

globalThis.window = globalThis;
globalThis.top = {};
globalThis.parent = {
  postMessage(message) {
    messages.push(message);
  },
};
globalThis.addEventListener = (type, listener) => {
  listeners.set(type, listener);
};
globalThis.requestAnimationFrame = callback => {
  const id = nextFrame;
  nextFrame += 1;
  frames.set(id, callback);
  return id;
};
globalThis.cancelAnimationFrame = id => {
  frames.delete(id);
};
Object.defineProperty(globalThis, "performance", {
  configurable: true,
  value: { now: () => clock },
});

const source = readFileSync(
  new URL("../slides/scene-controller.js", import.meta.url),
  "utf8",
);
vm.runInThisContext(source, { filename: "scene-controller.js" });

function dispatch(action) {
  listeners.get("message")({
    data: {
      type: "deck-control",
      action,
    },
  });
}

function runAnimation() {
  let guard = 0;
  while (frames.size > 0) {
    assert.ok(guard < 200, "animation did not reach an endpoint");
    guard += 1;
    clock += 50;
    const pending = [...frames.values()];
    frames.clear();
    for (const callback of pending) callback(clock);
  }
}

const rendered = [];
const controller = window.createDeckScrubber({
  baseDuration: 2.2,
  hangAtEnd: true,
  rewindOnLeft: true,
  triggerOnAdvance: true,
  render(progress) {
    rendered.push(progress);
  },
});

listeners.get("message")({ data: { type: "deck-enter" } });
assert.equal(controller.state.progress, 0);
assert.equal(controller.state.running, false);

dispatch("advance-start");
dispatch("advance-end");
assert.equal(controller.state.running, true);
runAnimation();
assert.equal(controller.state.progress, 1);
assert.equal(controller.state.hung, true);
assert.equal(
  messages.filter(message => message.command === "advance").length,
  0,
);

dispatch("advance-start");
assert.equal(
  messages.filter(message => message.command === "advance").length,
  1,
);

dispatch("retreat-start");
dispatch("retreat-end");
runAnimation();
assert.equal(controller.state.progress, 0);
assert.equal(controller.state.rewound, true);
assert.equal(controller.state.hung, false);

dispatch("retreat-start");
assert.equal(
  messages.filter(message => message.command === "retreat").length,
  1,
);
assert.ok(rendered.some(progress => progress > 0 && progress < 1));

console.log("Validated triggered scene-controller playback.");
