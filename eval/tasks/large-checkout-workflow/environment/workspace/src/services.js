export function createInMemoryServices() {
  const orders = [];
  const events = [];

  return {
    events,
    orders: {
      async create(order) {
        const stored = { ...order, id: `ord_${orders.length + 1}` };
        orders.push(stored);
        return stored;
      },
      async findByIdempotencyKey(idempotencyKey) {
        return orders.find((order) => order.idempotencyKey === idempotencyKey);
      },
    },
    payments: {
      async charge(payment) {
        events.push(["charge", payment]);
        return { id: `pay_${events.length}` };
      },
      async refund(paymentId) {
        events.push(["refund", paymentId]);
      },
    },
    inventory: {
      async reserve(items) {
        events.push(["reserve", items]);
        return { reservationId: `res_${events.length}` };
      },
      async release(reservationId) {
        events.push(["release", reservationId]);
      },
    },
    email: {
      async sendReceipt(orderId, customerId) {
        events.push(["email", { orderId, customerId }]);
      },
    },
    logger: {
      info(event, data) {
        events.push(["info", event, data]);
      },
      warn(event, data) {
        events.push(["warn", event, data]);
      },
      error(event, data) {
        events.push(["error", event, data]);
      },
    },
  };
}
