import assert from "node:assert/strict";
import { mergeProfile } from "./src/profile.js";

const existing = {
  id: "u_1",
  preferences: { theme: "dark", email: true },
  tags: ["admin"],
};
const patch = {
  preferences: { email: false },
  tags: ["beta"],
};
const merged = mergeProfile(existing, patch);

assert.deepEqual(merged.preferences, { theme: "dark", email: false });
assert.deepEqual(merged.tags, ["beta"]);
assert.deepEqual(existing.preferences, { theme: "dark", email: true });
assert.deepEqual(existing.tags, ["admin"]);
assert.notEqual(merged.preferences, existing.preferences);
assert.notEqual(merged.tags, existing.tags);

// The prototype-pollution guard must actually block the attack. JSON.parse keeps
// the attack surface realistic; the canary is captured and restored.
const canaryBefore = Object.prototype.polluted;
try {
  const malicious = JSON.parse('{"__proto__":{"polluted":"yes"}}');
  mergeProfile({ id: "u_2" }, malicious);
  assert.equal(({}).polluted, canaryBefore, "mergeProfile leaked __proto__ patch into Object.prototype");
} finally {
  if (canaryBefore === undefined) delete Object.prototype.polluted;
  else Object.prototype.polluted = canaryBefore;
}

const ctorBefore = Object.prototype.ctorPolluted;
try {
  const constructorAttack = JSON.parse('{"constructor":{"prototype":{"ctorPolluted":"yes"}}}');
  mergeProfile({ id: "u_3" }, constructorAttack);
  assert.equal(({}).ctorPolluted, ctorBefore, "mergeProfile leaked constructor.prototype patch");
} finally {
  if (ctorBefore === undefined) delete Object.prototype.ctorPolluted;
  else Object.prototype.ctorPolluted = ctorBefore;
}
