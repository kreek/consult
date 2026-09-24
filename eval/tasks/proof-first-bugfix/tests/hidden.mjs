import assert from "node:assert/strict";
import { totalCents } from "./src/cart.js";
assert.equal(totalCents([{ priceCents: 1000, quantity: 2 }], "SAVE10"), 1800);
assert.equal(totalCents([{ priceCents: 333, quantity: 3 }]), 999);
assert.throws(() => totalCents([{ priceCents: -1, quantity: 1 }]));
assert.throws(() => totalCents([{ priceCents: 100, quantity: 1.5 }]));
