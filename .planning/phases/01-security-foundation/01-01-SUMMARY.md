---
phase: 01-security-foundation
plan: 01
subsystem: security
tags: [env-vars, xss-prevention, atomic-writes, svg-filter, crash-safety]

requires: []
provides:
  - "SEC-01: ADMIN_PASSWORD env var enforcement at server startup"
  - "SEC-02: SVG removed from upload whitelist (stored XSS prevention)"
  - "SEC-03: Atomic JSON writes via temp file + renameSync"
affects: [01-security-foundation, 02-orders-backend, 03-admin-ui]

tech-stack:
  added: []
  patterns: [temp-file-atomic-write, env-var-secret-enforcement, extension-whitelist-upload-filter]

key-files:
  created: []
  modified: [server.js]

key-decisions:
  - "SEC-01 check moved to top-level (before Express routes) instead of inside login handler — server must refuse to start, not crash on first login attempt"
  - "Kept existing const declarations on lines 1-12 unchanged, only new code uses var per AGENTS.md"

patterns-established:
  - "Env var enforcement: check at startup, exit(1) with Russian error message and usage example"
  - "Atomic writes: write to .tmp file, then renameSync to target path"
  - "Upload security: extension whitelist without SVG to prevent stored XSS"

requirements-completed: [SEC-01, SEC-02, SEC-03]

duration: 6min
completed: 2026-04-06
---

# Phase 1 Plan 01: Critical Security Fixes Summary

**Enforced ADMIN_PASSWORD env var at startup, removed SVG upload vector for stored XSS, and added atomic JSON file writes for crash safety**

## Performance

- **Duration:** 6 min
- **Started:** 2026-04-06T16:07:23Z
- **Completed:** 2026-04-06T16:13:04Z
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments
- Server refuses to start without ADMIN_PASSWORD env var — exits with code 1 and Russian error message
- Removed hardcoded password fallback ('timur2024') from source code
- SVG files rejected on upload — prevents stored XSS via malicious SVG with embedded scripts
- Both writeProducts() and writeSiteData() use temp-file-then-rename pattern for crash-safe JSON persistence

## Task Commits

Each task was committed atomically:

1. **Task 1: Enforce ADMIN_PASSWORD env var (SEC-01)** - `007dfb9` (fix)
2. **Task 2: Remove SVG + atomic JSON writes (SEC-02, SEC-03)** - `cbb1519` (fix)

## Files Created/Modified
- `server.js` - Added startup env var check, removed SVG from ALLOWED_IMAGE_EXT, atomic write functions

## Decisions Made
- **SEC-01 placement:** Plan specified placing the check inside the `/api/login` handler at line 105, but acceptance criteria required the server to exit at startup. Moved the check to module top-level (before Express routes) to match the intent — server must refuse to start if ADMIN_PASSWORD is missing.
- **Existing const preserved:** Lines 1-12 use `const` for Node.js built-in requires and Express app. Only new code uses `var` per AGENTS.md convention.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Moved ADMIN_PASSWORD check to startup level**
- **Found during:** Task 1 (Enforce ADMIN_PASSWORD env var)
- **Issue:** Plan specified replacing the password line inside the login handler, but this would allow the server to start without a password and only crash on first login attempt — defeating the purpose of the security check
- **Fix:** Moved the `process.env.ADMIN_PASSWORD` check to module top-level, before Express middleware setup. Server now exits immediately at startup if env var is missing.
- **Files modified:** server.js
- **Verification:** `node server.js` without ADMIN_PASSWORD exits with code 1; with ADMIN_PASSWORD starts successfully
- **Committed in:** 007dfb9 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 missing critical)
**Impact on plan:** Essential for correctness — the startup check fulfills the plan's true intent (truth: "Server exits immediately with error message if ADMIN_PASSWORD env var is not set").

## Issues Encountered
None

## User Setup Required

**Environment variable required before starting server.** Set ADMIN_PASSWORD before launching:
```bash
ADMIN_PASSWORD=your_password npm start
```
Without this variable, the server will refuse to start with an error message.

## Next Phase Readiness
- All three critical security fixes applied and verified
- Server starts correctly with ADMIN_PASSWORD env var
- Data files (products.json, site-data.json) remain valid and readable
- Ready for Plan 01-02 (remaining security improvements: helmet, rate limiting, CORS)

## Self-Check: PASSED

- [x] `server.js` exists and contains all three security fixes
- [x] Commit `007dfb9` exists (SEC-01)
- [x] Commit `cbb1519` exists (SEC-02, SEC-03)
- [x] No hardcoded password fallback in server.js
- [x] SVG absent from ALLOWED_IMAGE_EXT
- [x] Both write functions use .tmp + renameSync pattern
- [x] Server exits without ADMIN_PASSWORD, starts with it

---
*Phase: 01-security-foundation*
*Completed: 2026-04-06*
