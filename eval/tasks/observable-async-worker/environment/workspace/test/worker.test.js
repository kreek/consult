import assert from "node:assert/strict";
import test from "node:test";
import { processNotifications } from "../src/worker.js";

test("processes notifications", async () => {
  const result = await processNotifications([{ id: "n1" }], async () => {}, { info() {} });
  assert.equal(result.sent, 1);
});
