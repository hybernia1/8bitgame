export function getStorageSafely() {
  if (typeof localStorage === 'undefined') return null;
  try {
    return localStorage;
  } catch (error) {
    return null;
  }
}
