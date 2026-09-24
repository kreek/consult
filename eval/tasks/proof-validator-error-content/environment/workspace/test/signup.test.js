import assert from "node:assert/strict";
import test from "node:test";
import { validateSignup } from "../src/signup.js";

test("accepts a valid signup payload", () => {
  const result = validateSignup({
    email: "ada@example.com",
    password: "Hunter2pass",
    age: 30,
    country: "US",
  });
  assert.equal(result.ok, true);
});
