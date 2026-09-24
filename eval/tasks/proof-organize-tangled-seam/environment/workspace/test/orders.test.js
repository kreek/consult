import assert from "node:assert/strict";
import test from "node:test";
import { processOrder } from "../src/orders.js";

test("processes a valid single-line order", () => {
  const result = processOrder({
    id: "o_1",
    email: "x@example.com",
    lines: [{ sku: "sku_1", quantity: 1 }],
  });
  assert.equal(result.ok, true);
  assert.equal(result.subtotal, 1000);
});
