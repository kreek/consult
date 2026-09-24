import { buildOrderRecord } from "./orders.js";
import { calculateTotals } from "./money.js";
import { createLogger } from "./logger.js";

export async function submitCheckout(request, services) {
  const logger = createLogger(services.logger);
  const totals = calculateTotals(request.items);

  logger.info("checkout.started", { customerId: request.customerId });
  const payment = await services.payments.charge({
    customerId: request.customerId,
    amountCents: totals.totalCents,
    source: request.paymentSource,
  });

  const order = await services.orders.create(
    buildOrderRecord({
      customerId: request.customerId,
      items: request.items,
      totals,
      paymentId: payment.id,
      idempotencyKey: request.idempotencyKey,
    }),
  );

  await services.inventory.reserve(request.items);
  await services.email.sendReceipt(order.id, request.customerId);
  logger.info("checkout.completed", { orderId: order.id });

  return {
    status: "confirmed",
    orderId: order.id,
    totalCents: totals.totalCents,
  };
}
