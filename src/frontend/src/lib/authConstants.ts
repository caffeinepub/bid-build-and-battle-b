// Single source of truth for the admin session storage key.
// Imported by AdminLogin, ProtectedRoute, AppHeader, and AdminDashboard.
export const ADMIN_SESSION_KEY = "isAdmin";

// Custom event name dispatched (same-tab) when admin session changes.
// sessionStorage changes are NOT broadcast via the 'storage' event within the same tab.
export const ADMIN_SESSION_EVENT = "adminSessionChanged";

/** Write the admin session flag and notify all listeners in this tab. */
export function setAdminSession(): void {
  sessionStorage.setItem(ADMIN_SESSION_KEY, "true");
  window.dispatchEvent(new Event(ADMIN_SESSION_EVENT));
}

/** Clear the admin session flag and notify all listeners in this tab. */
export function clearAdminSession(): void {
  sessionStorage.removeItem(ADMIN_SESSION_KEY);
  window.dispatchEvent(new Event(ADMIN_SESSION_EVENT));
}

/** Read the current admin session flag. */
export function getAdminSession(): boolean {
  return sessionStorage.getItem(ADMIN_SESSION_KEY) === "true";
}
