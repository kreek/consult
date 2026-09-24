import assert from "node:assert/strict";
import test from "node:test";
import { handleUserLookup } from "../src/users.js";

test("returns an existing user", () => {
  assert.equal(handleUserLookup({ query: { id: "u_1" } }).status, 200);
});
