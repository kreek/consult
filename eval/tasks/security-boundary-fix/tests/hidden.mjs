import assert from "node:assert/strict";
import { resolveRedirect } from "./src/redirect.js";
assert.equal(resolveRedirect("/account/settings"), "/account/settings");
assert.equal(resolveRedirect("https://example.com/docs"), "https://example.com/docs");
assert.equal(resolveRedirect("https://evil.example/phish"), "/");
assert.equal(resolveRedirect("//evil.example/phish"), "/");
assert.equal(resolveRedirect("javascript:alert(1)"), "/");
