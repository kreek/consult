import assert from "node:assert/strict";
import { processNotifications } from "./src/worker.js";

let active = 0;
let maxActive = 0;
const attempts = new Map();
const events = [];
const notifications = [{ id: "n1" }, { id: "n2" }, { id: "n3" }];

async function send(notification) {
  active++;
  maxActive = Math.max(maxActive, active);
  attempts.set(notification.id, (attempts.get(notification.id) ?? 0) + 1);
  await new Promise((resolve) => setTimeout(resolve, 5));
  active--;
  if (notification.id === "n2" && attempts.get(notification.id) === 1) {
    throw new Error("temporary failure");
  }
}

const logger = {
  info(event, data) { events.push({ level: "info", event, data }); },
  warn(event, data) { events.push({ level: "warn", event, data }); },
  error(event, data) { events.push({ level: "error", event, data }); },
};

const result = await processNotifications(notifications, send, logger, { concurrency: 2 });

assert.equal(result.sent, 3);
assert.equal(result.failed, 0);
assert.ok(maxActive <= 2);
assert.ok(maxActive > 1);
assert.equal(attempts.get("n2"), 2);
assert.ok(events.length >= 2);
