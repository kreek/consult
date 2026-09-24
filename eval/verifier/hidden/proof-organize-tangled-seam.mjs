import assert from "node:assert/strict";
import { processOrder } from "./src/orders.js";

function order(extra) {
  return { id: "o_x", email: "x@example.com", ...extra };
}

// Below tier threshold, no coupon: no discount.
const small = processOrder(order({ lines: [{ sku: "sku_1", quantity: 1 }] }));
assert.equal(small.ok, true);
assert.equal(small.subtotal, 1000);
assert.equal(small.discount, 0);
assert.equal(small.total, 1000);

// At/above tier threshold, no coupon: 10% off.
const large = processOrder(order({ lines: [{ sku: "sku_3", quantity: 2 }] }));
assert.equal(large.subtotal, 9000);
assert.equal(large.discount, 900);
assert.equal(large.total, 8100);

// Below threshold with WELCOME: coupon only.
const coupon = processOrder(order({ coupon: "WELCOME", lines: [{ sku: "sku_1", quantity: 1 }] }));
assert.equal(coupon.subtotal, 1000);
assert.equal(coupon.discount, 500);
assert.equal(coupon.total, 500);

// Coupon stacks with tier discount.
const stacked = processOrder(order({ coupon: "WELCOME", lines: [{ sku: "sku_3", quantity: 2 }] }));
assert.equal(stacked.subtotal, 9000);
assert.equal(stacked.discount, 1400);
assert.equal(stacked.total, 7600);

// Cap: combined discount cannot exceed subtotal, and totals stay consistent.
for (const r of [small, large, coupon, stacked]) {
  assert.ok(r.discount <= r.subtotal, "discount must not exceed subtotal");
  assert.equal(r.total, r.subtotal - r.discount);
  assert.ok(r.total >= 0, "total must not be negative");
}
