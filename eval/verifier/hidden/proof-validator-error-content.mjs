import assert from "node:assert/strict";
import { validateSignup } from "./src/signup.js";

const valid = { email: "ada@example.com", password: "Hunter2pass", age: 30, country: "US" };
const ok = validateSignup(valid);
assert.equal(ok.ok, true);
assert.deepEqual(ok.value, valid);

function expectFieldError(input, field) {
  const result = validateSignup(input);
  assert.equal(result.ok, false, "expected ok=false for " + field + " failure");
  assert.equal(typeof result.errors, "object");
  assert.equal(typeof result.errors[field], "string", field + " message must be a string");
  assert.ok(result.errors[field].length > 0, field + " message must not be empty");
}

expectFieldError({ ...valid, email: "" }, "email");
expectFieldError({ ...valid, email: "not-an-email" }, "email");
expectFieldError({ ...valid, password: "short" }, "password");
expectFieldError({ ...valid, password: "alllowercase1" }, "password");
expectFieldError({ ...valid, password: "NoDigitsHere" }, "password");
expectFieldError({ ...valid, age: 12 }, "age");
expectFieldError({ ...valid, age: 121 }, "age");
expectFieldError({ ...valid, country: "USA" }, "country");
expectFieldError({ ...valid, country: "us" }, "country");

// Multiple failures must all surface in the same envelope.
const both = validateSignup({ email: "", password: "x", age: 8, country: "" });
assert.equal(both.ok, false);
const fields = Object.keys(both.errors);
assert.ok(fields.includes("email"), "envelope must report email failure");
assert.ok(fields.includes("password"), "envelope must report password failure");
assert.ok(fields.includes("age"), "envelope must report age failure");
assert.ok(fields.includes("country"), "envelope must report country failure");
