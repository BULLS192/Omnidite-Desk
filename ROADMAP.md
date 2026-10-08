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

## V0.3 — Foundation (implemented in draft PR #3, not released)
- [x] Command palette across workspaces, launch URLs, tasks, research, and tools (button, slash shortcut; Ctrl+K where Chrome allows it).
- [x] Editable project directory with optional URL and manual label.
- [x] Quick manual research capture and searchable saved-item library.
- [x] Flexible 1–12 desktop grid sizing, widget move buttons and three density presets.
- [x] Per-workspace saved layout snapshots with safe restore.
- [x] Retain existing v0.2.3 live synced wallpaper directories, Chrome Sync, local state, Windows updater and prior widgets.
- [x] Add CI source/static and feature-level smoke checks.
- [ ] Pass Windows Chrome visual and interaction acceptance tests in both New Tab and Side Panel.
- [ ] Test state persistence, JSON backup/import, old v0.2.3 upgrade, Chrome Sync and native updater before release.

## V0.4 — Productivity (next, separate branch)
- [ ] Tab session saving/restoration and named work sessions. If tabs permission is necessary, request it only with a clear Chrome permissions explanation.
- [ ] Better task records: project, due date, priorities and completion history with backward-compatible migration.
- [ ] Unified on-device search across local workspaces, tasks, captures and links, with duplicate detection and keyboard navigation.
- [ ] Research capture improvements (context menu or capture from active tab with permission review, collections and export).
- [ ] Google Calendar **read-only** upcoming-events widget with explicit OAuth/account connection. Do not re-use ChatGPT connector credentials in the extension.
- [ ] Optional content calendar for Omnidite articles and social drafts using local data initially.
- **Acceptance:** work offline except explicitly connected widgets, no unintended browser/tab reads, sane sync size limits, no loss of data.

## V0.5 — Connected Operations (future)
- [ ] Read-only GitHub activity: open PRs, issues, workflow failures and relevant commits for selected repositories.
- [ ] Connect Desk to a minimal, separately authenticated Omnidite Pulse status feed to display Vercel/Render/Supabase monitoring instead of storing admin tokens in the extension.
- [ ] Per-project quick status and notifications with freshness/timestamp indication.
- [ ] Alerts and usage thresholds with configurable quiet behavior.
- [ ] Privacy review, credential rotation and offline/expired-session fallback.
- **Acceptance:** no privileged API token embedded in extension source, clear "last updated" stamps, rate-limited polling.

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
