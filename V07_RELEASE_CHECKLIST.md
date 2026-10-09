# Desk V0.7 — release acceptance checklist

## Automated (GitHub Actions)

- [x] Full MV3 syntax, manifest, asset, OAuth scope and host permission checks
- [x] V0.3–V0.6 widgets-first, layouts, updater, Calendar, Pulse and form regression suites
- [x] V0.7 market/DST/FX reference tests
- [x] V0.7 NEA PSI, model AQI, rain/storm/stale-data tests
- [x] V0.7 Daily Snapshot tasks, date/horizon, cached Calendar and weather tests
- [x] V0.7 integration/schema/script order and extension-ID guard
- [x] Windows native messaging helper compilation
- [x] Automated headless Chromium actual New Tab and Side Panel DOM with all four V0.7 widgets and sample-data screenshots

## Windows Chrome user acceptance — not asserted by CI

- [ ] Existing user Chrome profile displays V0.7.0 and **all saved workspaces, widgets, wallpapers and preferences**.
- [ ] Export JSON backup, change widget, refresh New Tab, confirm persistence; import only after backup review.
- [ ] Add four optional widgets without deleting or changing older ones; test compact and snap-grid, drag order, height.
- [ ] World market clocks handle weekend and session-recess labels and remain readable in Side Panel.
- [ ] FX provider returns a dated rate with visible unit and label; test fallback during offline/network errors.
- [ ] Weather alerts: Singapore official region PSI/PM2.5, another city modeled AQI, thresholds and rain/storm source status.
- [ ] Daily Snapshot: check Google Calendar cached entries, task priorities, local Pulse/GitHub and city.
- [ ] Verify Chrome Sync only if opted in, Calendar OAuth, local Pulse controls and native helper survive upgrade.
- [ ] Stable and Beta channel switching; clean Git worktree required; test only after exporting backup.
- [ ] Confirm no new extension errors after clearing old error history and reopening dialogs.

This checklist prevents confusing automated mocks with real browser/network acceptance.
