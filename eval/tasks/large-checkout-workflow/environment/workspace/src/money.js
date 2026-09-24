export function calculateTotals(items) {
  const subtotalCents = items.reduce((sum, item) => sum + item.priceCents * item.quantity, 0);
  const taxCents = Math.round(subtotalCents * 0.0825);
  return {
    subtotalCents,
    taxCents,
    totalCents: subtotalCents + taxCents,
  };
}
