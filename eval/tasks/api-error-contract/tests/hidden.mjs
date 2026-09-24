import assert from "node:assert/strict";
import { handleUserLookup } from "./src/users.js";

const missing = handleUserLookup({ query: {} });
assert.equal(missing.status, 400);
assert.equal(typeof missing.body.error, "string");
assert.equal(missing.body.error, "missing_id");
assert.equal(typeof missing.body.message, "string");
assert.ok(missing.body.message.length > 0);

const absent = handleUserLookup({ query: { id: "missing" } });
assert.equal(absent.status, 404);
assert.equal(typeof absent.body.error, "string");
assert.equal(absent.body.error, "not_found");
assert.equal(typeof absent.body.message, "string");
assert.ok(absent.body.message.length > 0);

const found = handleUserLookup({ query: { id: "u_1" } });
assert.equal(found.status, 200);
assert.equal(found.body.id, "u_1");
