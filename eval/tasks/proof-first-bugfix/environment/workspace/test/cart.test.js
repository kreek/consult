import assert from "node:assert/strict";
import test from "node:test";
import { totalCents } from "../src/cart.js";

test("totals item prices in cents", () => {
  assert.equal(
    totalCents([
      { priceCents: 500, quantity: 2 },
      { priceCents: 125, quantity: 1 },
    ]),
    1125,
  );
});
