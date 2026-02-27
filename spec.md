# Specification

## Summary
**Goal:** Fix the Admin Login flow so errors only appear after a login attempt, and replace the hardcoded admin principal whitelist with a dynamic first-login admin claim stored in stable backend state.

**Planned changes:**
- Remove the "This account does not have admin privileges" error message from showing on initial page load; it should only appear after a failed login attempt
- Add a note on the Admin Login page explaining that the first login will automatically claim admin rights
- After login, verify the authenticated principal against the backend; redirect to the Admin Dashboard if admin, or show the error with a logout/retry option if not
- Rewrite the backend admin access control to store the admin principal in a stable variable instead of a hardcoded whitelist
- The first caller of the admin initialization function is stored as admin; subsequent callers are denied unless their principal matches the stored admin
- The `isAdmin` query returns true only for the stored admin principal

**User-visible outcome:** On page load, the Admin Login shows no error. After clicking "Login with Internet Identity" and authenticating, admins are redirected to the dashboard. Non-admins see the error message with a logout/retry option. The first user to log in automatically becomes the admin.
