import assert from "node:assert/strict";
import { submitCheckout } from "./src/checkout.js";

const request = {
  customerId: "cus_123",
  idempotencyKey: "idem_123",
  paymentSource: "tok_visa",
  items: [{ sku: "sku_book", quantity: 1, priceCents: 1000 }],
};

function makeServices(options = {}) {
  const events = [];
  const existing = options.existing;
  return {
    events,
    orders: {
      async findByIdempotencyKey(key) {
        events.push(["find-order", key]);
        return existing;
      },
      async create(order) {
        events.push(["create-order", order]);
        return { ...order, id: "ord_new" };
      },
    },
    inventory: {
      async reserve(items) {
        events.push(["reserve", items]);
        if (options.reserveFails) throw new Error("out of stock");
        return { reservationId: "res_1" };
      },
      async release(reservationId) {
        events.push(["release", reservationId]);
      },
    },
    payments: {
      async charge(payment) {
        events.push(["charge", payment]);
        if (options.chargeFails) throw new Error("card declined");
        return { id: "pay_1" };
      },
      async refund(paymentId) {
        events.push(["refund", paymentId]);
      },
    },
    email: {
      async sendReceipt(orderId, customerId) {
        events.push(["email", { orderId, customerId }]);
      },
    },
    logger: {
      info(event, data) { events.push(["info", event, data]); },
      warn(event, data) { events.push(["warn", event, data]); },
      error(event, data) { events.push(["error", event, data]); },
    },
  };
}

const existingOrder = { id: "ord_existing", customerId: request.customerId, totalCents: 1083, status: "paid" };
const duplicateServices = makeServices({ existing: existingOrder });
const duplicate = await submitCheckout(request, duplicateServices);
assert.equal(duplicate.status, "confirmed");
assert.equal(duplicate.orderId, "ord_existing");
assert.equal(duplicate.totalCents, 1083);
assert.equal(duplicateServices.events.some(([event]) => event === "charge"), false);
assert.equal(duplicateServices.events.some(([event]) => event === "reserve"), false);
assert.equal(duplicateServices.events.some(([event]) => event === "create-order"), false);

const stockServices = makeServices({ reserveFails: true });
await assert.rejects(() => submitCheckout(request, stockServices), /stock|inventory|reserve|unavailable|failed|checkout/i);
assert.equal(stockServices.events.some(([event]) => event === "charge"), false);
assert.equal(stockServices.events.some(([event]) => event === "create-order"), false);

const paymentServices = makeServices({ chargeFails: true });
await assert.rejects(() => submitCheckout(request, paymentServices), /payment|charge|declined|failed|checkout/i);
const paymentEvents = paymentServices.events.map(([event]) => event);
assert.ok(paymentEvents.indexOf("reserve") >= 0);
assert.ok(paymentEvents.indexOf("charge") > paymentEvents.indexOf("reserve"));
assert.ok(paymentEvents.indexOf("release") > paymentEvents.indexOf("charge"));
assert.equal(paymentServices.events.some(([event]) => event === "create-order"), false);
