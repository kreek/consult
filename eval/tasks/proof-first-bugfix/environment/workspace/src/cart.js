export function totalCents(items, discountCode) {
  const subtotal = items.reduce((sum, item) => sum + item.priceCents * item.quantity, 0);
  if (discountCode === "SAVE10") {
    return subtotal * 0.1;
  }
  return subtotal;
}
