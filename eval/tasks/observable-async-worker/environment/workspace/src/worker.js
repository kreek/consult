export async function processNotifications(notifications, send, logger, options = {}) {
  let sent = 0;
  for (const notification of notifications) {
    await send(notification);
    sent++;
  }
  return { sent, failed: 0 };
}
