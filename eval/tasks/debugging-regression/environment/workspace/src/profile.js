export function mergeProfile(existing, patch) {
  return { ...existing, ...patch };
}
