import assert from "node:assert/strict";
import test from "node:test";
import { processCustomers } from "../src/pipeline.js";

test("returns an empty result for empty input", () => {
  const result = processCustomers([]);
  assert.deepEqual(result, { valid: [], errors: [] });
});
