const PRICES = new Map([
  ["sku_1", 1000],
  ["sku_2", 2500],
  ["sku_3", 4500],
]);

const charges = [];
const emails = [];

export function processOrder(order) {
  if (!order || !Array.isArray(order.lines) || order.lines.length === 0) {
    return { ok: false, error: "empty order" };
  }
  let subtotal = 0;
  for (const line of order.lines) {
    const price = PRICES.get(line.sku);
    if (price === undefined) {
      return { ok: false, error: "unknown sku: " + line.sku };
    }
    subtotal += price * line.quantity;
  }
  let discount = 0;
  if (subtotal >= 5000) {
    discount = Math.floor(subtotal * 0.10);
  }
  const total = subtotal - discount;
  charges.push({ orderId: order.id, amountCents: total });
  emails.push({
    to: order.email,
    subject: "Order " + order.id + " confirmed",
    amountCents: total,
  });
  return { ok: true, subtotal, discount, total };
}
