# Omnidite Desk V0.6.2 — Beta maintenance release

**Scope:** non-destructive reliability and release hygiene. Updates visible version labels and the automated QA baseline; retains user storage format, extension key, OAuth permissions, native helper protocol, wallpaper folders, and all V0.6.1 functionality. The earlier form-close fix remains in place. Release qualification includes the existing full CI tests, Chrome extension manifest checks, and Windows helper compilation. **Manual Windows Chrome acceptance is pending.** No old feature branches were merged or deleted.

This release is staged to Beta first. Stable remains V0.6.1 until V0.7 acceptance and promotion.

---

# Desk V0.6.1 — Fix form errors when closing dialogs

**Fix:** The shared modal header's ✕ close button explicitly uses `type="button"`, preventing Chrome from treating it as a form submission inside Edit Widget, Edit Workspace and other dialogs. Previously, if the required title input was empty and the user clicked ✕, Chrome sometimes logged `An invalid form control with name='title' is not focusable` after the dialog became hidden. The fix does not change saved data, form validation for actual Save buttons, updater channels, extension ID or OAuth integrations. Added an automated regression test checking this invariant across Desk dialog headers.

Install via **Desk Updates → Check updates → Update now** on Stable, then reload Chrome as normal. Existing Chrome extension errors may be historical; you can clear them from `chrome://extensions` after updating to confirm they don't recur.

---

# Omnidite Desk V0.6.0 — Secure Stable/Beta updates

The existing **Updates** panel on New Tab and Side Panel now offers **Stable** and **Beta**, plus fixed GitHub changes links, safe channel-switch actions and native helper compatibility detection. Stable is `main`; Beta is the repository's dedicated `beta` branch. All Git paths, remote and actions are hard-coded in the signed-in user's local native helper; the webpage cannot specify a repository, ref, file path or shell command. This remains a local unpacked Chrome extension, without Vercel or a separate web host.

### Install V0.6.0 / enable the channels
1. In the existing Desk, use **Check updates → Update now** while on Stable. This works with the *old* updater helper and upgrades the extension code to V0.6.0.
2. To activate Beta switching, **once** double-click `Setup-OneClickUpdates.bat` in the **same Omnidite-Desk Git clone already loaded by Chrome**. This recompiles/re-registers the updated Windows native messaging helper under your user account (no admin). An old helper cannot recognize the new channel actions until it is rebuilt; **this one-time step cannot be done by the pre-V0.6 helper via the browser**.
3. Return to Desk and click **Check updates**. Select **Beta**, click **Switch to Beta** and confirm. Chrome reloads automatically. To return, select **Stable** → **Switch to Stable**.
4. Before switching channels, use **Settings → Export JSON**. Both channels share the same extension ID, local storage, OAuth identity and wallpapers. Switching code back to Stable is **not a rollback of application data**; experimental Betas must maintain compatible storage schemas.

### Safeguards
- Only `main` (Stable) and `beta` (Beta), fetched from `BULLS192/Omnidite-Desk`, are supported; switching requires a clean Git worktree. The beta branch must contain the latest stable commit.
- Local ahead/diverged branches are refused; releases use `merge --ff-only`; no force reset, deletion or background updates. Switching does not overwrite Chrome-stored widgets.
- If the new Windows helper has not been recompiled, Stable updating continues to work and the UI explains the one-time Beta setup.
- The native helper's existing Pulse controls and extension identity are preserved.
- GitHub Actions runs source, mocked Chrome UI/state and Windows helper compile checks; manual Chrome validation of both channel switches and user data is still necessary. Do not assume switching has been tested on the user's machine.

---

# Omnidite Desk v0.5.10 — Stability and recovery

This non-destructive update adds a local-only **Health** button beside Desk Updates on New Tab and Side Panel. It checks installation version, local storage bytes, workspace/widget counts, optional Chrome Sync toggle, local network indication and Windows native updater. The copied diagnostic report contains **no widget contents, calendar events, URLs or OAuth tokens**. Use **Backup & settings** to reach the existing JSON backup flow; no data is deleted or migrated. Existing layout, Pulse, Google Calendar, air quality, wallpaper and native host behavior are unchanged. Chrome on-device acceptance is still required.

---

# Omnidite Desk v0.5.9 — Weather + Air Quality (release candidate)

## V0.5.9 — Singapore PSI and global AQI for the existing Weather widget

- **Singapore:** Official NEA/data.gov.sg 24-hour PSI and hourly PM2.5 readings for five regions, with observation times, source and stale-data labels.
- **Other cities:** clearly attributed Open-Meteo/CAMS model US AQI (most locations) or European AQI (European countries), PM2.5/PM10 concentrations, eight-hour model outlook, index categories and valid times. Different indices are not equivalent and model data is not a station reading.
- Adds a compact AQ status to the existing Now tiles and an **Air quality** tab while retaining hourly and seven-day weather, city search/order, movable/resizable widgets and current Calendar/Pulse/project integrations.
- Updates every ~15 minutes while the extension is open; caches responses and falls back to last known readings on transient errors. Public data sources; no new user data storage, accounts or backend.
- Adds narrow API host permissions for Open-Meteo Air Quality and Singapore government data.gov.sg; the extension's existing public key and Chrome ID, OAuth settings, native updater, and saved dashboard state are unchanged.
- Production update is through **Check updates → Update now** after release is merged to main. Installation requires the optional Windows native helper previously set up; updater runs only from a clean local main branch.
- Source links: https://data.gov.sg/datasets/d_fe37906a0182569d891506e815e819b7/view ; https://open-meteo.com/en/docs/air-quality-api .
- Validation: `node tools/check.mjs && node tools/air-quality-smoke.mjs` plus existing `.github/workflows/validate.yml` suites. Live-network / Windows acceptance recommended after updating.

---

# Omnidite Desk v0.5.8 — Released

## V0.5.8 — Widgets first in New Tab and Side Panel (released on main in PR #16)

The primary reason to open Desk is to see modules immediately. On both the full New Tab and compact Side Panel, the active workspace heading and **live widget grid now appear at the top, directly after the persistent navigation bar**. The huge decorative welcome hero has been removed so it no longer hides World Clocks, Weather, Quick Launch and other modules below the first viewport.

**Search & tools**, placed after the widget grid, preserves the web search form, Projects / Google Calendar / Operations / Quick Capture actions, expanded additional-tool controls, cached Google Calendar preview, GitHub/Pulse/Local Alerts status cards, and **Check updates → Update now**. All original element IDs/data actions and native extension resources remain unchanged. The layout is mobile-responsive and theme/wallpaper-aware.

Compatibility: existing four workspaces, saved widget order, Free Resize and Snap to Grid footprints, OAuth client ID, local Pulse, alarm sounds, cached calendar, optional Sync and Chrome extension ID are unchanged. No new permissions, network connections, or migrations. The user-requested redesign is released to `main` after desktop and Side Panel screenshots and regression checks passed. Use the existing Check updates → Update now control to install; verify on your device afterward.

## V0.5.7 — Flexible sizing or fixed phone-style grid (released on main in PR #15)

The user can switch between **⌗ Free resize** (existing continuous 12-column resizing, auto/fixed pixel height) and **▦ Snap to grid** (cell footprint sizing like 1×4, 2×2, 2×3, 4×4 and 6×3). The sizing-mode switch appears next to the Compact/Aligned toggle in Your Modules. Snap mode retains its own per-widget `gridW` and `gridH`, so switching back to Free restores existing `cols` and `height`; no existing widget is discarded or resized destructively.

- **⚙ Grid** chooses desktop width in **4, 6, 8, or 12 columns**, and cell heights **80, 96, 104, 120, 144 or 160 pixels**. Each cell has a 12px gutter.
- Each widget **⚙ Edit widget** lets you set Snap footprint independently (1–12 cells in each dimension) or choose one of the presets. Bottom-right drag uses cell-by-cell increments in Snap mode.
- A wide desktop viewport uses the selected column count, medium layouts use at most 4, and narrow/Side Panel layouts use at most 2. Widgets wider than the available responsive grid clamp their *display width*; their saved footprint remains unchanged. Fixed-size interiors scroll safely on small screens.
- Snap grid uses dense placement to fill holes while maintaining the saved widget order separately. Layout Studio snapshots retain both free and snapped footprint dimensions and the active mode.
- **No Google Calendar, Pulse, OAuth, external host permissions, backup deletion or native updater changes.**
- **Release status:** user approved the layout approach and PR #15 was merged to `main`. Automated feature, Windows helper and browser screenshot checks passed before merge. After updating on Windows, verify the 1-column narrow cards and 2-column Side Panel with your own widgets.

## V0.5.6 — Compact stackable widgets and real height controls (released on main in PR #14)

Fixes empty space under short cards (for example Quick Launch next to long World Clock/Weather widgets).

- **Compact (default):** Each card fits its contents, rather than stretching to its tallest neighbor. Later cards pack into available space below shorter cards where their width fits. A ResizeObserver remeasures expanding live weather content. Compact may visually place later cards ahead of others without changing their saved widget order.
- **Aligned rows:** Click `◫ Compact: On` in Your Modules to switch back to standard aligned rows. The toggle persists with your existing local dashboard state and only syncs when optional Chrome Sync is enabled.
- **Adjust height:** Drag the bottom-right resize grip vertically and horizontally. Or go to widget **⚙ → Widget height** and enter **0 (Auto)** or **140–1000 pixels**. Fixed-height widgets scroll inside their cards if needed. Use `↕ Auto` in the card header to restore fit-to-content.
- **Version:** The top bar and footer visibly show **V0.5.6**, replacing the old `DESIGN PREVIEW` label.
- **Preserved:** Extension ID/key, Chrome permissions, Google OAuth and Calendar cache, local Pulse, widget IDs, backups and existing user data. Calculated display positions are not stored in Chrome Sync.
- **Validation:** Automated size/row-span tests and fabricated-data screenshots are produced in CI. Real Chrome acceptance after update should include World Clock, Weather, Quick Launch, calendar, Pulse, Side Panel and drag-resize.

## V0.5.5 — Visual refinement (released on main in PR #13)

V0.5.5 is merged into `main` and available through Desk's existing **Check updates → Update now** button. The original extension ID, account connections and saved workspaces remain intact. It provides:

- Cleaner hero, search-first layout, and four at-a-glance cards: next Google Calendar event, GitHub, Pulse and local alerts.
- Calendar glance reads **only existing local Google event cache**; it makes no Google API calls and never handles OAuth tokens. Selecting the tile opens the existing Google Calendar screen.
- Four primary action buttons and a `More tools & status` disclosure that retains all existing shortcuts, system badges and Pulse controls.
- A compact but always-accessible on-page updater below the at-a-glance row.
- Updated widget design, restrained navy/cobalt panels, spacing, typography, refined hexagonal O treatment, responsive Side Panel, and consistent Midnight/Slate/Light/wallpaper support. Reduced-motion preferences are respected.
- **No changes** to Chrome extension ID, Google OAuth client, manifest permissions beyond version, Pulse, persistence, widget storage, or native updater.

Production GitHub Actions static/feature checks and native Windows helper compilation passed. User approved the design before PR #13 was merged. Real-device acceptance of the expanded widgets, audio and calendar views is still advisable after updating.

## V0.5.5 — Apple-inspired layout and calendar functionality

**Functional additions on PR #13:**

- World Clock, Weather (all cities in Now), Quick Launch links, Tasks, Habits, and Local Agenda each have independent **1–6 internal columns** configured from **Edit widget → Items per row**. Use the small `▦ N` control in a widget header to cycle columns. Set **outer widget width** to 12/12 for five clocks/weather cities across on a sufficiently wide screen. The layout responds to *widget width*, not merely browser width; narrow panels stack safely.
- Every multi-item widget has **drag-to-reorder handles and ↑ ↓ ordering buttons** (clocks, weather cities, launch shortcuts, task items, habits and agenda events). Existing item data and IDs are retained. The buttons are the keyboard-friendly fallback. Calendar events continue to be date-sorted because they are time-based.
- Google Calendar has a real **Month / Week / Day**, previous/next/Today navigation, date selection, per-day agenda, and upcoming events. Configuration/import moves into collapsible detail panels. Same existing read-only Google OAuth scope and locally stored event cache. The Calendar API looks back 35 days and ahead 120 days (up to 500 events total); this is a finite offline snapshot, not unlimited history or exhaustive recurring-event pagination.
- Focus Timer: **Gentle chime, Soft piano-like tones, Classic bell, Digital beep, Silent**, volume, Preview, and optional uploaded MP3/WAV/OGG up to 1 MB. Uploaded audio remains in Chrome-local storage keyed per widget, outside Chrome Sync and JSON backups. WebAudio alarm playback happens while Desk is open; Chrome may suppress sound in suspended/background views. Not a guaranteed OS-level background alarm.
- Apple-inspired design: calmer surfaces, compact navigation, consistent cards, status and Side Panel, built on V0.5.4 Google Calendar and Pulse. No additional extension permissions or external audio/CDN calls.
- **After-install verification:** resize widgets and adjust inner columns; reorder city/task/link items; verify Google Month/Week/Day against real events; preview/play timer sounds; test custom audio and local state persistence. Screenshots use fabricated example events and weather.

**Not implemented yet:** World stock markets. Future scope: user-chosen exchanges and time zones (SGX, NYSE, Nasdaq, LSE, HKEX, SSE), open/closed session clocks, indices/watchlists, source freshness, licensing and rate limits. No investment/trading permissions in this visual pass.

## V0.5.4 — Live Google Calendar

Omnidite Desk now has an opt-in, read-only Google Calendar viewer in **Productivity → Calendar** (New Tab and Side Panel). It supports selecting up to six calendars from the signed-in Chrome-profile Google account, viewing the next 7/14/30 days, manual refresh, stale timestamps, and disconnect. It does **not** create, edit, delete or invite events. The previous `.ics` importer is preserved and displayed as a separate offline snapshot.

**Google Cloud configuration (OAuth client ID configured in this release):**

1. Open `chrome://extensions` for your existing Omnidite Desk and copy its stable extension ID. Or use the **Copy extension ID** action on the new calendar setup screen.
2. In [Google Cloud Console](https://console.cloud.google.com/), create or select a project (e.g. Omnidite Desk). Enable the **Google Calendar API** for that project.
3. In **Google Auth Platform**, configure the OAuth brand / audience and add the Google account as a **test user** if the app is in Testing mode.
4. In **Clients**, create OAuth Client ID of application type **Chrome Extension** and paste the extension ID in its configuration. **Do not** create a Web application client, use an API key, or provide a client secret.
5. A public Chrome Extension OAuth client ID has been configured in the V0.5.4 manifest. Confirm that its associated Chrome Extension **Item ID** matches your existing Omnidite Desk extension ID. Do not commit access tokens, client secrets, downloaded OAuth JSON or exported private calendar data.
6. After updating to V0.5.4, open **Productivity → Calendar → Connect Google account**. Grant Chrome's Google API host access and Google's read-only calendar permission; choose calendars and test Refresh. The OAuth client is configured, but **real Google account authorization must still be tested on your device**.

**Implementation details and limits:** Chrome Identity `getAuthToken` holds access tokens. Manifest OAuth scope is only `https://www.googleapis.com/auth/calendar.readonly`, and optional host access is only `https://www.googleapis.com/*`. No backend, Pulse integration or credentials in URLs. Calendar event data lives under its own **Chrome local storage** key rather than Desk's synced/backed-up application state; it contains only calendar names, event titles, start times and Google Calendar links. Requests omit attendees, descriptions and locations. Refresh occurs only when opened and stale or when explicitly clicked, never via hidden background polling. API errors preserve the previous cached snapshot. **Disconnect** clears the local cache and removes the last Chrome Identity token from the cache; permissions already granted on the Google Account must be revoked separately in Google Account settings if complete revocation is desired.

Current stage: Chrome OAuth client ID configured; mocked Google OAuth/API checks pass in CI, and the user confirmed successful Google Calendar synchronization in their installed V0.5.4. Chrome's identity API typically authenticates the Google account attached to the Chrome profile; this iteration supports many calendars within that account, not arbitrary multiple Google accounts simultaneously.

## V0.5.3 — Startup fallback for restricted Windows PCs

Windows may deny `Register-ScheduledTask` with error 0x80070005 even for your own limited user account. The Pulse installer now falls back automatically to a shortcut in the signed-in user's **Startup folder** and manages its own detached hidden `node.exe` process. **Do not run as administrator or relax policy settings** just to get Pulse started.

When released: update Pulse with `git pull --ff-only origin main`, stop any manually running Pulse copy, and double-click `windows\Install-Background.bat` again. The installer prints `Startup method: StartupFolder` when the fallback is chosen. Update Desk through its normal on-page updater to V0.5.3, and rerun `Setup-OneClickUpdates.bat` once to compile the new native host. Desk Start/Stop/Restart buttons then support either the scheduled task or the fallback; when using the fallback, they refuse to terminate unrelated processes or a separately launched manual Pulse copy.

Windows CI now exercises the fallback's startup, health, stop and restart in a real Windows hosted runner. User machine permissions, login startup and Chrome behavior still require confirmation on your PC.

## V0.5.2 — Pulse background startup and controls (Windows)

**Goal:** no continuously open PowerShell window for live local Pulse. The Pulse repository now includes a one-time `windows/Install-Background.bat` setup. It creates a current-user Windows Task Scheduler entry named **OmniditePulse** and runs the Pulse Node server hidden when you sign into Windows, bound to `127.0.0.1:4173`. The local server does not run while the PC is sleeping or off.

Desk V0.5.2 displays **Pulse: online/offline/setup required** in the dashboard and adds **Operations → Pulse background controls**. You can Check Status, Start, Stop, or Restart the fixed scheduled task after confirming the action. The Chrome native host accepts only six predefined actions (two Git updater actions and four Pulse task actions), never a command, task name, path, provider secret or URL from a page.

**One-time installation after updating Desk:**

1. Export a Desk JSON backup, then update through **Check updates → Update now** to V0.5.2.
2. In `C:\omnidite-pulse`, stop any manually running `npm.cmd run dev` session, update that Git repository, and double-click **`windows\Install-Background.bat`**. The installer starts Pulse automatically unless another Pulse instance already holds port 4173.
3. Run **`Setup-OneClickUpdates.bat`** once again in the *existing Desk Git clone*. This recompiles/registers the updated native helper (it is not automatically rebuilt by the on-page Git update).
4. Open Desk's **Pulse background controls** to Check Status and try Restart. **Operations → Omnidite Pulse → Connect local Pulse** remains the way to grant Chrome permission for reading the local status feed. Enable the optional 15-minute feed auto-refresh if desired.
5. Verify `http://127.0.0.1:4173/api/health` and the connection status. The background task uses the Pulse provider configuration already stored in `.env.local`.

**Fallback:** `Start-Pulse.bat`, `Stop-Pulse.bat`, `Restart-Pulse.bat` and `Uninstall-Background.bat` in the Pulse repo's `windows` directory. Task Scheduler or organization policy may prevent installation. A manually launched Pulse process is not managed by these buttons.

**Security:** No new Chrome permissions in V0.5.2. No privileged API keys are sent to Desk; the local endpoint stays loopback-only; only the user-confirmed native task actions can control the fixed Windows task. The native helper update must be re-registered on Windows. Windows startup and actual task lifetime must be accepted on a real PC before considering the behavior fully tested.

## V0.5.1 — Local Omnidite Pulse connection (development preview)

Desk can read the existing local [Omnidite Pulse](https://github.com/BULLS192/omnidite-pulse) API without uploading usage statistics or tokens to Vercel.

**Requirements:** Pulse is running on the same computer at `http://localhost:4173` (Node `npm.cmd run dev`). Its existing `/api/providers` endpoint returns a read-only `{capturedAt, providers}` JSON object. You can verify it in a browser at `http://localhost:4173/api/providers`.

1. Open Desk's **Operations → Omnidite Pulse** panel.
2. Choose **Connect local Pulse** and approve Chrome's optional local-site permission.
3. View the live provider snapshots, then use **Refresh feed** to refresh on demand.
4. To opt in to polling while Desk is open, choose **Configure feed** and enable **Refresh at most every 15 minutes**.

The allowed local feed is intentionally restricted to `http://127.0.0.1:4173/api/providers` or `http://localhost:4173/api/providers` — **not** arbitrary LAN addresses, ports, or paths. The Chrome host grant is `http://127.0.0.1/*` or `http://localhost/*`; the application separately validates the port and exact path. Previous optional HTTPS `*.omnidite.com` feeds and JSON imports continue to work. Desk sends no cookies, admin tokens, Authorization headers or modifications. Pulse must be running for live updates. Its own server must bind to loopback, as configured in the companion Pulse update.

**Note:** First release requires an on-device Chrome permissions/network acceptance pass. Imported snapshots and cached feeds are clearly labeled, not treated as live when stale. API use and spend are provider-specific; unknown quotas remain unknown. — personal Chrome command center

**No web hosting, Vercel builds, backend, third-party script loaders, API keys, or Chrome Web Store publication required.** Uses Manifest V3 and Chrome's built-in New Tab override / Side Panel.


## V0.4/V0.5 release (main, October 8, 2026)

V0.5 is released on `main` through merged PR #3 (V0.3) and PR #8 (V0.4/V0.5). The Windows on-page updater tracks `main`. Export a JSON backup in your existing installation before updating. The original extension ID and normal local-state keys are preserved.

### V0.4 — Productivity

- **Structured task planner:** project, priority, due date, and completion; original simple task widgets stay unchanged.
- **Work sessions:** save/reopen up to eight named sets of up to 15 HTTP(S) Chrome tabs. The user grants optional tabs permission on first use. Only a deliberate Restore click opens the tabs. Chrome internal URLs are excluded. Saved URLs can appear in Chrome Sync if enabled.
- **Capture active tab:** in the Side Panel, save the active website title/URL to the research library after optional tabs consent. The New Tab extension itself is not a webpage worth capturing.
- **Global local search:** search projects, tasks, content, sessions, captured research, shortcuts, and workspace names.
- **Content calendar:** manually plan articles and social posts by channel, stage, project and target date.
- **Read-only calendar:** import an .ics export from Google Calendar or another provider. This is a local snapshot, NOT live Google OAuth syncing. Import can be repeated; unsupported TZID calendar events are skipped to prevent misleading display.

### V0.5 — Operations

- **GitHub:** manually read the selected PUBLIC repository's open pull-request page, repository issue count and recent Actions. Optional site-specific permission grants api.github.com access. No GitHub PAT. Issue counts derived from open_issues_count less fetched PRs are only approximate when more than 30 PRs are open. GitHub's unauthenticated API has rate limits.
- **Omnidite Pulse adapter:** configure a read-only HTTPS JSON endpoint under omnidite.com, or import a JSON status snapshot. The existing Pulse capturedAt/providers/metrics structure is supported. Example: {"capturedAt":"2026-10-08T10:00:00Z","providers":[{"name":"Vercel","status":"ok","metrics":[{"label":"Deployments","value":18,"limit":100,"unit":""}]}]}. Desk does not assume the endpoint exists or attempt to obtain administrator credentials.
- **Alerts:** store local warning/down and threshold >=80% alerts. The operations dashboard shows source freshness. No email, push or guaranteed background monitoring.
- **Network:** only explicit reads. Optional auto-refresh of the configured Pulse feed every 15 minutes while open, OFF by default. No cookies or auth headers sent; redirects rejected. Status feed must be deliberately sanitized and read-only.

### Permissions, privacy, release

- Existing required extension permissions and stable extension ID are preserved.
- Optional permission: tabs, requested by the user at session/capture time.
- Optional host permissions: https://api.github.com/* and https://*.omnidite.com/*, requested upon monitoring.
- Do not put passwords, tokens or sensitive information in Pulse feed URLs, saved research or imported JSON.
- Saved sessions/calendar/events increase extension storage usage; Chrome Sync has quotas. Export local backups before testing or switching versions.
- The GitHub validation suite passed. The user reported 6/6 Windows Chrome feature smoke checks passing in an isolated test profile (dashboard, command/projects/research, tasks/content, tab sessions, GitHub consent, and persistence). Production-profile migration, wallpaper permissions, Chrome Sync and the native updater still require an on-device post-update check. Live Google Calendar OAuth and an authenticated Pulse backend are **not** included.
- Run: node tools/check.mjs && node tools/v03-smoke.mjs && node tools/v045-smoke.mjs

## What's new in V0.3

- **Command bar**: button, `/` or Ctrl+K (where not intercepted by Chrome), searching workspaces, tracked projects, shortcuts, incomplete tasks, research and quick actions.
- **Projects hub**: editable project names, optional URLs and manual status labels. Seeded with relevant Omnidite projects; no claim of live project status.
- **Quick research capture**: manually save a link, title, note and associated project. Search, edit and delete items via Research library.
- **Layout studio**: Compact, Balanced and Wide presets; up to 12 snapshots; drag or move tiles; all 12 desktop grid widths; single-column compact mode.
- **Existing features preserved**: v0.2.3 live connected Google Drive/OneDrive local wallpaper folders, weather, clocks, widgets, storage/Chrome Sync, native updater and backups.
- **Checks**: `node tools/check.mjs && node tools/v03-smoke.mjs && node tools/v045-smoke.mjs` plus the successful Windows feature test report. Check imported data, connected folders and Chrome Sync as appropriate after updating.

V0.3 is part of the merged V0.5 release. Export a backup before clicking **Check updates → Update now** in your existing Desk, and confirm the dashboard displays V0.5.0 afterward.

## What's in v0.2

- Multi-page workspaces: Overview, Projects, Personal; add, rename, delete, and move widgets between pages.
- Drag from the **⠿** header handle to reorder. Drag the **bottom-right diagonal handle** to resize across a 12-column responsive grid (snaps to supported column widths) and change card height.
- Midnight, Slate, and Light themes, customizable accent, search provider and dashboard name.
- Eleven widgets: link launcher, tasks, notes, world clocks, focus timer, local agenda, countdown, habits, metric counter, inspirational quote.
- Searchable world clocks (up to 24), with analog and digital display, date and live UTC differences relative to your current computer timezone (automatically accounts for daylight-saving transitions).
- Quick Launch and project shortcuts use Chrome's native website favicons and fall back to initials.
- Focus sprint presets plus any custom duration from 1 to 240 minutes, with pause and reset to your chosen duration.
- Live weather by city (up to 15): current conditions, next 24 hourly slots, and seven-day forecast, with 15-minute refresh, using Open-Meteo and GeoNames city search. Weather requires an internet connection and may be subject to provider fair-use/license terms.
- Personal wallpapers: upload images or import a one-time folder snapshot, or connect a **live, read-only synced folder** (Google Drive for desktop, OneDrive or local storage). Choose photos from the folder, optionally rotate every 5/15/30/60 minutes. Desk rescans the folder every 5 minutes while the dashboard is open, on tab return, and on manual refresh; the cloud sync client is responsible for fetching new files. Uploaded wallpapers are optimized and stored in IndexedDB, while live images are read from the selected folder and only the last active wallpaper is privately cached for offline fallback. No Drive OAuth, broad file system access, new Chrome permissions or API keys.
- Optional Chrome Sync for small dashboards, export/import JSON, v0.1 backup migration.
- Chrome side panel and new-tab experience.
- **Built-in GitHub updater** on the New Tab dashboard. The optional one-time Windows native helper lets the page check GitHub, pull approved fast-forward updates, and reload the unpacked extension without opening a terminal.

**Important limitations:** Calendar/agenda events are local manual entries; not yet connected to Google Calendar. Metric counters are manually adjusted, not live Vercel/Supabase data. Weather and city geocoding call only Open-Meteo endpoints; no account or API key is used. Local calendar remains manual. Resize snaps to grid, rather than allowing overlapping/free-pixel positioning. The version is designed for one Chrome profile per device.

## Connected Google Drive, OneDrive or local wallpaper folder (v0.2.3)

This release uses a **live local folder picker**, not a Google Drive cloud OAuth integration. It allows Desk to consume photos synchronized by Google Drive for desktop or OneDrive, without granting the extension access to unrelated account files.

**Windows + Google Drive for desktop**

1. Install and sign into [Google Drive for desktop](https://www.google.com/drive/download/).
2. Put JPG, PNG, WebP, BMP, GIF or AVIF images in a dedicated folder in My Drive (e.g. `Desk Wallpapers`). For reliable offline access, mark the folder **Available offline**, or use Drive mirroring where supported.
3. In Chrome, open Omnidite Desk → **Backgrounds** → **Connected folder · live** → **Connect live folder**.
4. In the Windows folder picker, browse to the folder visible under Google Drive / Google Drive (G:) or your mirrored Drive location. Grant **read-only** access.
5. Select an image or enable **Cycle selected source** to rotate through the folder images. You can switch to uploaded backgrounds or default at any time.
6. Images added to or removed from that Drive folder become available after Drive for desktop sync completes and Desk's next scan (up to ~5 minutes while Desk is open). Use **Refresh** to scan immediately.

**Notes**
- The folder handle is stored in local IndexedDB, not Chrome Sync or GitHub. On another computer, repeat **Connect live folder** there.
- Chrome may prompt to authorize folder access again after a restart. Use **Authorize folder** inside Desk. If permissions lapse, the last active background can display from a local optimized cache.
- Only images immediately inside the folder are listed (not subfolders), up to 200 image filenames. The picker shows 12 thumbnails per page; rotation can cover all listed images. Files over 25 MB cannot be used as a background.
- The extension is read-only: it does not modify, upload, delete or move any of your Google Drive images.
- Synced cloud folders need their desktop sync app to be installed and working; Desk cannot browse Google Drive solely from a web link in this version.
- Source changes and selected folder contents are device-specific and not part of JSON state exports or Chrome Sync.

## Install (Windows Chrome)

1. Extract ZIP (keep this folder; don't run the extension from within ZIP).
2. Open `chrome://extensions` in Chrome and turn on **Developer mode**.
3. Click **Load unpacked**, choose the `omnidite-desk-v0.2` folder (the folder containing `manifest.json`).
4. Open a new tab. Pin Omnidite Desk from Chrome's extensions menu; click its icon for the Side Panel.
5. After modifying code, click **Reload** on the extension card in `chrome://extensions`, then refresh open dashboard tabs.

### Upgrade from Omnidite Desk v0.1 — VERY IMPORTANT

We added a **fixed public extension key** so the unpacked extension gets the **same extension ID across devices**, necessary for Chrome Sync. That changes the ID compared with your previous v0.1 installation, so existing `chrome.storage.local` data will **not migrate automatically**.

1. **Before removing v0.1:** Open its dashboard → Settings → **Export backup**.
2. Load v0.2 with steps above; allow Chrome to switch its New Tab override.
3. v0.2 → Settings → **Import JSON**; select the v0.1 backup. v0.2 converts its `modules` structure to the first workspace.
4. Verify links, notes, and tasks. Then disable/remove the v0.1 extension.
5. Export a new v0.2 backup to keep an offline recovery copy.

## Sync between your computers (optional)

Under **Settings → Enable Chrome Sync**, opt into synchronizing dashboard state. You must install this **same repository/version** on each computer (includes matching `manifest.key`), sign into the **same Chrome account**, and enable extension settings sync. The v0.2 manifest public key is **not a private key** and is safe to commit. Do not add a `.pem` private key to GitHub.

- Sync uses `chrome.storage.sync`, **not GitHub**: your dashboard notes/tasks can be uploaded to Chrome Sync; do not store passwords or other secrets in widgets.
- Chrome's sync quota is 102,400 bytes total and 8,192 bytes per item. v0.2 encodes state in smaller chunks and conservatively limits state to ~72 KB raw JSON. Sync is intentionally off by default.
- Sync is eventually consistent. Edits on two computers can conflict; **last write wins**. Avoid simultaneous editing and export backups routinely.
- On a fresh second installation, turn sync on and **Pull latest** to retrieve your saved layout. If the second installation already has edits, export first before manually pulling cloud state.
- It syncs *data and layouts*, not extension source updates; use Git for code.

## GitHub-based code updates (no hosting)

### New: update directly from the New Tab dashboard (Windows)

Chrome extensions cannot execute Git or write their own source code directly, so this uses Chrome's official [Native Messaging](https://developer.chrome.com/docs/extensions/develop/concepts/native-messaging) API and a locally compiled helper. This is **opt-in** and needs a **one-time Windows installation**. After that you can click **Check updates → Update now** within Omnidite Desk. Chrome reloads the extension once the update finishes.

**Initial upgrade from v0.2.0:**

1. In the *clean GitHub clone* currently loaded in Chrome, run `Update-Desk.bat` **once** (or `git pull --ff-only origin main` in PowerShell). This fetches the new dashboard updater and setup files.
2. Open `chrome://extensions` and click **Reload** on Omnidite Desk. You should now see **OMNIDITE DESK UPDATES** near the top of the New Tab dashboard.
3. In the same cloned repository folder, double-click `Setup-OneClickUpdates.bat` **once**. It compiles the helper locally using Windows PowerShell/.NET Framework, registers the helper only for your Windows user and the matching extension ID, and requires no administrator privileges. It uses your existing Git installation.
4. Refresh the dashboard. Click **Check updates**. If a new commit is available, **Update now** will appear. Click it to pull the updated source and reload the unpacked extension. You should not have to use a batch updater again for ordinary releases.

**Safety:** The native helper accepts *only* `status` and `update`, fixes the Git remote to `BULLS192/Omnidite-Desk`, requires the `main` branch, uses a fast-forward-only merge, refuses diverged history or dirty tracked files, and never accepts shell commands or paths from the page. It checks for updates only when you click. Your data remains in Chrome storage. If the host isn't registered, the dashboard displays setup guidance rather than pretending it updated. If the compiled helper source changes in a later release, you may need to run the one-time setup again.

**Uninstall:** Remove the `HKCU\Software\Google\Chrome\NativeMessagingHosts\com.omnidite.desk_updater` registry key and the locally compiled `native-host/OmniditeDeskHost.exe`. Removing the extension alone does not unregister the host.


Repository: **https://github.com/BULLS192/Omnidite-Desk**. The V0.5 source is committed to `main` with a GitHub Actions **validation-only** workflow (no hosting or deployment).

**Recommended: clone for continuous updates.** On your Windows PC, open PowerShell in the parent directory where you keep coding projects:

```powershell
git clone https://github.com/BULLS192/Omnidite-Desk.git
cd Omnidite-Desk
```

Then use `chrome://extensions` → **Load unpacked** → choose that cloned `Omnidite-Desk` folder. Later updates require only:

```powershell
git pull --ff-only origin main
# Then open chrome://extensions and click Reload on Omnidite Desk.
```

**One-click Windows updates:** Double-click `Update-Desk.bat` in your Git clone. It safely runs `git pull --ff-only origin main`, then reminds you to reload the extension in `chrome://extensions`. If your local code has conflicting changes, the script stops instead of force-resetting anything. PowerShell users can alternatively run `update-from-github.ps1`. Git must be installed first: [Git for Windows](https://git-scm.com/download/win). The ZIP is an offline installation alternative; if you initially loaded the ZIP, export a backup, disable that installation, then load the Git clone (the fixed extension key preserves the extension ID across folder paths). Chrome settings remain associated with that ID. Personal widget data lives in Chrome storage, **not GitHub**.

### Source structure

- `index.html`, `sidepanel.html`: dashboard shells
- `app.js`: widgets, page management, grid interactions, storage and sync
- `desk-v03.js`, `desk-v03.css`: command bar, projects, research capture and layout studio
- `desk-v04.js`, `desk-v05.js`, `desk-v045.css`: productivity and read-only operations
- `tools/v045-smoke.mjs`: mocked permission/browser/API behavior tests
- `tools/v03-smoke.mjs`: V0.3 feature smoke tests
- `styles.css`: visual styles and responsive themes
- `manifest.json`: manifest and shared **public key**; keep unchanged across machines
- `background.js`: side-panel toggle
- `icons/`: extension icons
- `Setup-OneClickUpdates.bat`, `native-host/`: one-time Windows updater bridge
- `.github/workflows/validate.yml`: static checks only; **no deploy workflow**

### Security/privacy

Required extension permissions are `storage`, `sidePanel`, `nativeMessaging` and `favicon`; required host access is limited to Open-Meteo weather and geocoding endpoints. V0.5 adds optional `tabs` and scoped GitHub/Omnidite host permissions, requested only when using those features. No telemetry. Only valid `http(s)` URLs in the launcher. Widget strings are escaped before HTML rendering, and the extension does not execute remote scripts. Never commit exported backup files to GitHub; the repository is **public**.

### Browser testing

Source-level and browser-interaction smoke checks were completed on the generated package. Run `node tools/check.mjs && node tools/v03-smoke.mjs && node tools/v045-smoke.mjs` for source, static and mocked interaction checks. Windows native-host registration and Chrome reload must also be validated on the actual Windows machine. Real-world Chrome Sync between accounts/devices remains to be validated on your own signed-in installations.