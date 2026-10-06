import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const source = readFileSync(process.argv[2] || new URL("../slides/scene-controller.js", import.meta.url), "utf8");

for (const scene of [
  { name: "pigeons", baseDuration: 18, hangAtEnd: true },
  { name: "hierarchy", baseDuration: 2.42, hangAtEnd: true },
  { name: "panorama", baseDuration: 300, hangAtEnd: false },
]) {
for (const firstTimestamp of [99, 100, 101]) {
  const listeners = new Map();
  const frames = new Map();
  const messages = [];
  let nextFrame = 0;
  let clock = 100;
  const context = {
    top: {},
    parent: { postMessage: message => messages.push(message) },
    performance: { now: () => clock },
    addEventListener: (type, handler) => listeners.set(type, handler),
    requestAnimationFrame: callback => {
      frames.set(++nextFrame, callback);
      return nextFrame;
    },
    cancelAnimationFrame: id => frames.delete(id),
  };
  context.window = context;
  vm.runInNewContext(source, context);
  const controller = context.createDeckScrubber({
    ...scene,
    rewindOnLeft: true,
    render: () => {},
  });
  const message = data => listeners.get("message")({ data });
  const tick = timestamp => {
    clock = timestamp;
    const callbacks = [...frames.values()];
    frames.clear();
    callbacks.forEach(callback => callback(timestamp));
  };

  message({ type: "deck-enter" });
  tick(firstTimestamp);
  assert.equal(controller.state.running, true, `autoplay stopped on first timestamp ${firstTimestamp}`);
  assert.equal(controller.state.rewound, false);
  tick(150);
  assert.ok(controller.state.progress > 0, "autoplay must move forward without a keypress");

  message({ type: "deck-leave" });
  assert.equal(frames.size, 0);
  message({ type: "deck-enter" });
  tick(150);
  assert.equal(controller.state.running, true, "re-entering must restart autoplay");
  tick(200);
  const beforeBoost = controller.state.progress;
  message({ type: "deck-control", action: "advance-start" });
  tick(250);
  assert.ok(controller.state.progress - beforeBoost > 0.05 / scene.baseDuration);
  message({ type: "deck-control", action: "advance-end" });

  message({ type: "deck-reset" });
  tick(250);
  assert.equal(controller.state.running, true, "reset must survive a same-frame callback");
  tick(300);
  message({ type: "deck-control", action: "retreat-start" });
  tick(350);
  assert.equal(controller.state.progress, 0);
  assert.equal(controller.state.rewound, true, "reverse playback must still stop at the beginning");
  message({ type: "deck-control", action: "retreat-end" });
  message({ type: "deck-control", action: "advance-start" });
  tick(350);
  tick(400);
  assert.ok(controller.state.progress > 0);
  message({ type: "deck-control", action: "advance-end" });
  for (let time = 450; frames.size && time < (scene.baseDuration + 2) * 1000; time += 50) tick(time);
  assert.equal(controller.state.progress, 1);
  assert.equal(controller.state.hung, scene.hangAtEnd);
  assert.equal(messages.some(message => message.command === "advance"), !scene.hangAtEnd);
  message({ type: "deck-control", action: "advance-start" });
  assert.ok(messages.some(message => message.command === "advance"));
}

}

console.log("Validated autoplay timing, slide re-entry, reset, acceleration, rewind, and endpoint navigation.");
