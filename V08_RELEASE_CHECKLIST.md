# Omnidite Desk V0.8 — Beta Acceptance Checklist

## Automated checks
- [x] Existing V0.3–V0.7 compatibility and regression suite passed.
- [x] V0.8 deterministic agenda/search/tasks/research test with safe sample data passed.
- [x] Windows native messaging helper compiled without protocol changes.
- [x] Headless Chromium opened all four productivity dialogs in New Tab and Side Panel.
- [x] Original V0.7 widget rendering smoke passed.
- [x] Existing MV3 manifest key, permissions and required hosts unchanged from V0.7.

## Stable/Beta ancestry synchronization
- [x] Latest Stable Providence icon repair (#35) integrated into V0.8 Beta without removing the approved BULL.S shortcut icon.
- [x] Git ancestry confirms `origin/main` is contained in `origin/beta` (no forced branch rewrite).
- [ ] Windows Chrome Stable -> Beta switch using the native updater helper must be verified by the user.

## Windows Chrome — still requires user confirmation
- [ ] Settings → Export JSON backup before Beta testing.
- [ ] Confirm Stable V0.7.0 -> Beta V0.8.0, then version label and all old workspaces/widgets/settings retained.
- [ ] Today / Unified agenda: cached Google Calendar reflects selected calendars; local .ics fallback; planner and content deadlines display.
- [ ] Task board: create, edit, move Todo → Doing → Blocked → Completed; refresh, verify persistence; classic planner still works.
- [ ] Ctrl+K and Command bar: find tasks, projects, research tags, notes, sessions, cached events; verify safe URL launches.
- [ ] Research studio: add project/collection/tags, reject duplicate URL, edit old captures, JSON export, optional active-tab capture from Side Panel.
- [ ] Check Chrome Sync if enabled, Side Panel width, Light theme, wallpaper folders, Pulse, weather and FX unaffected.
- [ ] chrome://extensions → Errors panel stays clear after dismissing blank required form fields.
- [ ] Switch Beta back to Stable without error; note that version rollback does not roll back Chrome-stored data.

**Do not merge V0.8 to Stable until the user explicitly confirms that the on-device Beta acceptance checks passed.**
