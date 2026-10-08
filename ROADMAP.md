# Omnidite Desk — Development Roadmap

Desk is the **personal browser interface** for work, research and project navigation.
Omnidite Pulse is the monitoring layer. F.R.E.Y.A. is the future optional intelligence and orchestration layer.
Do not duplicate full Atlas, Providence, TTT-OS, Pulse or F.R.E.Y.A. applications inside Desk.

## Release principles
- **Local-first**: New Tab and Side Panel remain useful offline. No Vercel, Render or Supabase deployment is required just for Desk.
- **Preserve the Chrome extension ID**, state, backups and Windows one-click GitHub updater; no destructive migrations.
- **Keep permissions minimal**. Any new host, tabs, OAuth or identity scope must have a reason, a privacy review and user-facing disclosure.
- **No background telemetry**, no external runtime scripts, and no passwords or privileged tokens stored in widget content.
- **Ship one phase at a time**. Developer branch → tests → manual Chrome verification → review → merge to main; the existing updater follows main.
- Use optional Chrome Sync only for small personal data. Live wallpapers remain locally accessible; export/import JSON is the disaster recovery mechanism.

## V0.5.5 — Desk visual refresh (released on main in PR #13)

- [x] Focused navigation, primary shortcuts and collapsible secondary tools.
- [x] Calendar at-a-glance tile using only existing local Google Calendar cache.
- [x] Theme-aware premium navy/slate/light visual system for desktop, Side Panel and wallpapers.
- [x] Add static guards and a privacy-safe calendar at-a-glance smoke test.
- [x] Implement user-selectable internal grids (1–6), per-item drag-to-reorder and ↑ ↓ accessibility fallback for multi-item widgets.
- [x] Implement Google Calendar month/week/day, selected-day agenda and compact controls.
- [x] Implement built-in timer alarms, preview, volume and local-only custom upload.
- [ ] Verify live five-city rendering, local reorder persistence, sound playback and Google Month/Week/Day on user's Windows Chrome.
- [ ] Post-update verification on user's Windows Chrome: wide New Tab, narrow Side Panel, wallpapers and Light theme.
- [x] User approved aesthetic direction; PR #13 merged into `main` and production CI passed.

## V0.5.6 — Compact stackable widgets (development preview)

- [x] Auto-height cards instead of stretching short widgets to the tallest in a row.
- [x] Compact dense grid packing with aligned-row fallback.
- [x] Functional two-dimensional resizing, editable auto/fixed heights and scrollable fixed card contents.
- [x] Responsive dynamic reflow for weather changes and widget resizing.
- [x] Visible current version in top bar and footer.
- [ ] Visual review and real Chrome acceptance before merging.

## Future — World stock markets (deferred)

- [ ] Choose market data feeds and review licensing/realtime vs delayed status.
- [ ] Exchange-session clocks for SGX, NYSE, Nasdaq, LSE, HKEX and SSE with holiday and DST accuracy.
- [ ] Optional index and watchlist cards, sourced price timestamps, market alerts and API-budget safeguards.
- [ ] Keep trading execution out of Desk's initial market-monitoring scope.

## V0.3 — Foundation (released on main in PR #3)
- [x] Command palette across workspaces, launch URLs, tasks, research, and tools (button, slash shortcut; Ctrl+K where Chrome allows it).
- [x] Editable project directory with optional URL and manual label.
- [x] Quick manual research capture and searchable saved-item library.
- [x] Flexible 1–12 desktop grid sizing, widget move buttons and three density presets.
- [x] Per-workspace saved layout snapshots with safe restore.
- [x] Retain existing v0.2.3 live synced wallpaper directories, Chrome Sync, local state, Windows updater and prior widgets.
- [x] Add CI source/static and feature-level smoke checks.
- [x] User reported Windows Chrome smoke checks covering the dashboard, command bar, project hub, research, and persisted layouts.
- [ ] Complete a dedicated Side Panel visual walkthrough if not already covered by the test report.
- [x] Verify state persistence after refresh in an isolated Chrome test profile.
- [ ] Confirm production-profile upgrade, backup/import, connected wallpaper folder permissions, Chrome Sync and native updater after rollout.

## V0.4 — Productivity (released on main in PR #8; integrations still limited)
- [x] Named tab-session saving/restoration; explicit optional Chrome tabs permission and open-tab confirmation.
- [x] Project-linked planner tasks with priority, due date and completion, separate from existing widget tasks (preserved).
- [x] Local search across workspaces, task planner, projects, content, captures, sessions and links.
- [ ] Duplicate-detection polish across independent widget/content stores.
- [x] Side-panel capture of current website after opt-in tabs permission.
- [ ] Context menu, collections and dedicated research export.
- [x] Local read-only .ics calendar snapshot import with supported timestamps and import replacement.
- [x] Implement Chrome Identity read-only Google Calendar client and local-only cache on V0.5.4 feature branch.
- [x] Configure public Google Cloud Chrome Extension OAuth client ID in the V0.5.4 manifest.
- [x] User confirmed Google Calendar successfully synced on their installed V0.5.4.
- [x] Local content calendar for Omnidite articles and social planning.
- **Acceptance:** work offline except explicitly connected widgets, no unintended browser/tab reads, sane sync size limits, no loss of data.

## V0.5 — Connected Operations (released on main in PR #8; external feed still needs configuration)
- [x] Public GitHub repository read-only activity with opt-in API permissions, cached PR/issues/workflows and manual refresh.
- [ ] Individual issue/commit details and authenticated private repository support (not included).
- [x] Opt-in HTTPS omnidite.com Pulse JSON adapter + JSON snapshot import; no administrator tokens in extension.
- [ ] Secure private/authenticated feed serving agreed schema from Omnidite Pulse (not provisioned).
- [x] GitHub and Pulse statuses with last-checked times and local alert history (not push notifications).
- [x] Warnings and 80% usage-threshold local alerts; manual refresh, optional at-most-15min Pulse polling when open.
- [ ] Quiet hours and external delivery mechanisms (future).
- [x] Explicit host permissions, public GitHub API without token, cookie-free Pulse reads, graceful cached fallback.
- [ ] Formal browser privacy review and authenticated service token lifecycle, if ever introduced.
- **Acceptance:** no privileged API token embedded in extension source, clear "last updated" stamps, rate-limited polling.

## Current release state — October 8, 2026

- Stable `main`: V0.5.3, confirmed updating on the user's Chrome profile. Local Omnidite Pulse is connected and showing service usage data; real Startup-folder behavior is subject to next sign-in testing.
- V0.5.4 is a read-only live Google Calendar integration with a configured Chrome Extension OAuth client ID. Confirm its Item ID matches the original stable Chrome extension ID.
- The OAuth client ID is public. **Do not commit any client secret, access tokens, downloaded credentials JSON or private events**. Actual Google authorization must still be tested on the user's installed Chrome extension.
- The original .ics snapshot import remains available; live fetched event details reside only in per-profile Chrome local storage, outside the existing Sync and backup state.

## V1.0 — F.R.E.Y.A. intelligence (future)
- [ ] Connect to a user-controlled F.R.E.Y.A. Core / Third Brain service through a documented, secure interface.
- [ ] Optional daily briefing based on explicitly chosen projects and connected sources.
- [ ] AI-assisted knowledge search and suggested next actions.
- [ ] All writes and consequential actions require explicit approval. Display sources and action previews.
- [ ] Disable AI features gracefully when F.R.E.Y.A. is unavailable; no silent background data uploads.
- **Acceptance:** access control, audit trail, source provenance, consent controls, and predictable fallback.

## Priorities
**P0:** stability, recovery, launcher, capture, layout and keyboard accessibility.
**P1:** tab sessions, structured tasks, Calendar, search and GitHub.
**P2:** content publishing workflows, operational status, alerts.
**P3:** F.R.E.Y.A. intelligence and approvals.

## Work tracking
- Draft V0.3 implementation: PR #3.
- The V0.4, V0.5 and V1.0 phases are development milestones, **not promises that connected services are already live**.
