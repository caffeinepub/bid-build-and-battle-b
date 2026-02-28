# Specification

## Summary
**Goal:** Fix admin login by updating the passcode to `sastra2026`, resolving the canister stopped (IC0508) error, and improving error messaging on the Admin Login page.

**Planned changes:**
- Update the hardcoded admin passcode in the backend `adminLogin` function to `sastra2026`
- Fix the backend actor initialization to prevent it from entering a stopped state (IC0508) after deployment
- On the Admin Login page, catch canister/replica rejection errors and display a user-friendly message (e.g. "Service temporarily unavailable. Please try again.") instead of the raw error blob with internal canister IDs and request IDs

**User-visible outcome:** Admins can log in using the passcode `sastra2026` without encountering canister stopped errors, and any backend unavailability shows a clean, readable error message instead of raw rejection details.
