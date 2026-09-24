export function buildOrderRecord({ customerId, items, totals, paymentId, idempotencyKey }) {
  return {
    customerId,
    items: items.map((item) => ({ ...item })),
    subtotalCents: totals.subtotalCents,
    taxCents: totals.taxCents,
    totalCents: totals.totalCents,
    paymentId,
    idempotencyKey,
    status: "paid",
  };
}
