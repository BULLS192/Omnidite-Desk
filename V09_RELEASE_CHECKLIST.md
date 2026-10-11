# Omnidite Desk V0.9.0 — Beta release acceptance

## Automated checks
- [x] V0.9 model tests: provider/metric limit ratios, stale imported snapshots, missing data, matched-only GitHub cache, project links, alert acknowledgement and threshold storage, local brief
- [x] Existing V0.3–V0.8 source/state regression tests and Chrome manifest guard
- [x] Windows C# updater/native messaging helper compilation
- [x] V0.7 weather/FX widgets and V0.8 productivity panels Chrome render regression
- [ ] V0.9 actual New Tab/Side Panel Chromium render check (8 fictional-data cases)
- [ ] Final main-ancestor-of-beta Git comparison, preserve manifest key, OAuth scope and permissions

## Windows Chrome acceptance — user still needs to verify
- [ ] Export Desk JSON backup first; then switch Stable V0.8.0 → Beta V0.9.0 and confirm the same extension ID and all existing workspaces
- [ ] **Unified Monitoring**: see your existing Pulse providers and GitHub cached data (or clear not-connected/stale state); live local Pulse refresh still requires the Pulse service running and Chrome permission
- [ ] **Project Command Center**: add preview URL and owner/repo to a saved project; verify task/content counts and persistence after browser refresh; old Projects Hub still works
- [ ] **Alert Center**: acknowledge/reopen a warning, adjust usage thresholds, refresh Pulse, confirm badge and alert history persist
- [ ] **Daily Operations Brief**: see current local due tasks and selected cached Google Calendar appointments without misleading live status
- [ ] Re-test V0.8 Agenda/Task Board/Search/Research, Google Calendar, weather/FX, wallpapers, Pulse controls, optional Chrome Sync, narrow Side Panel and Chrome Errors panel
- [ ] Test switching back to Stable only after backup. Switching channels does not erase V0.9 data, but Stable code may not display V0.9-only project metadata.

**Do not promote V0.9 to Stable before the user verifies the Beta on their actual Chrome installation.**

## Source contract
Vercel and Supabase are monitored only when present in the already-connected Pulse provider feed. Desk V0.9 does NOT directly call private provider APIs or create API tokens. The GitHub panel queries only the selected public repository and labels cache age. A provider snapshot is never claimed to be live.
