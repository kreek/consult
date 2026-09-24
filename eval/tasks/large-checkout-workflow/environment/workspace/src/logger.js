export function createLogger(logger = console) {
  return {
    info(event, data) {
      logger.info?.(event, data);
    },
    warn(event, data) {
      logger.warn?.(event, data);
    },
    error(event, data) {
      logger.error?.(event, data);
    },
  };
}
