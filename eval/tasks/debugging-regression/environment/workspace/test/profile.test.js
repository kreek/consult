import assert from "node:assert/strict";
import test from "node:test";
import { mergeProfile } from "../src/profile.js";

test("updates top-level values", () => {
  assert.deepEqual(mergeProfile({ name: "A" }, { name: "B" }), { name: "B" });
});
