import assert from "node:assert/strict";
import { processCustomers } from "./src/pipeline.js";

const result = processCustomers([
  { name: "Ada", email: "Ada@Example.COM", phone: "5551234567" },
  { name: "Ada Dup", email: "ada@example.com", phone: "(555) 123-4567" },
  { name: "Bob", email: "bob@example.com", phone: "555-987-6543" },
  { name: "Bad", email: "bad@example.com", phone: "abc" },
]);

assert.equal(result.valid.length, 2, "expected two unique valid records");
assert.equal(result.errors.length, 1, "expected one record in errors");

const ada = result.valid.find((r) => r.email === "ada@example.com");
assert.ok(ada, "expected first Ada record to survive dedupe");
assert.equal(ada.email, "ada@example.com");
assert.equal(ada.phone, "+15551234567");

const bob = result.valid.find((r) => r.email === "bob@example.com");
assert.ok(bob, "expected Bob record");
assert.equal(bob.phone, "+15559876543");

const bad = result.errors[0];
assert.equal(typeof bad.reason, "string");
assert.ok(bad.reason.length > 0, "error reason must describe the failure");

const empty = processCustomers([]);
assert.deepEqual(empty, { valid: [], errors: [] });
