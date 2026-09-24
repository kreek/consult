import assert from "node:assert/strict";
import test from "node:test";
import { submitCheckout } from "../src/checkout.js";
import { createInMemoryServices } from "../src/services.js";

test("submits a paid order and returns the stable response shape", async () => {
  const services = createInMemoryServices();

  const result = await submitCheckout(
    {
      customerId: "cus_123",
      idempotencyKey: "checkout_1",
      paymentSource: "tok_visa",
      items: [{ sku: "sku_book", quantity: 2, priceCents: 1200 }],
    },
    services,
  );

  assert.deepEqual(result, {
    status: "confirmed",
    orderId: "ord_1",
    totalCents: 2598,
  });
});
