import assert from "node:assert/strict";
import test from "node:test";
import { formatName } from "../src/index.js";

test("formats names", () => {
  assert.equal(formatName(" Ada "), "Ada");
});
