const STORAGE_KEY = 'omnisave_license_v1';

export const getLicenseStore = () => {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'); }
  catch { return null; }
};

export const setLicenseStore = (data) => {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch {}
};

export const clearLicenseStore = () => {
  try { localStorage.removeItem(STORAGE_KEY); } catch {}
};

// Returns true when a valid, stored license exists (7-day offline grace)
export function hasValidLicense() {
  const store = getLicenseStore();
  if (!store?.key) return false;
  if (store.verifiedAt) {
    const age = Date.now() - store.verifiedAt;
    if (age < 7 * 24 * 60 * 60 * 1000) return true;
  }
  return false;
}
