import assert from "node:assert/strict";
import test from "node:test";
import { resolveRedirect } from "../src/redirect.js";

test("keeps empty redirects on the home page", () => {
  assert.equal(resolveRedirect(""), "/");
  assert.equal(resolveRedirect(undefined), "/");
});
