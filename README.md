# Omnidite Desk v0.5.4 (Google Calendar OAuth staging)

## V0.5.4 — Live Google Calendar (development branch, not released)

Omnidite Desk now has an opt-in, read-only Google Calendar viewer in **Productivity → Calendar** (New Tab and Side Panel). It supports selecting up to six calendars from the signed-in Chrome-profile Google account, viewing the next 7/14/30 days, manual refresh, stale timestamps, and disconnect. It does **not** create, edit, delete or invite events. The previous `.ics` importer is preserved and displayed as a separate offline snapshot.

**Google Cloud onboarding requirement (not yet supplied):**

1. Open `chrome://extensions` for your existing Omnidite Desk and copy its stable extension ID. Or use the **Copy extension ID** action on the new calendar setup screen.
2. In [Google Cloud Console](https://console.cloud.google.com/), create or select a project (e.g. Omnidite Desk). Enable the **Google Calendar API** for that project.
3. In **Google Auth Platform**, configure the OAuth brand / audience and add the Google account as a **test user** if the app is in Testing mode.
4. In **Clients**, create OAuth Client ID of application type **Chrome Extension** and paste the extension ID in its configuration. **Do not** create a Web application client, use an API key, or provide a client secret.
5. Supply the **public OAuth client ID** (ending with `.apps.googleusercontent.com`) for the maintainers to place in `manifest.json` under `oauth2.client_id`. Do not commit access tokens, client secrets, downloaded OAuth JSON or exported private calendar data.
6. Following update to a configured release, click **Connect Google account**, grant the Chrome host access and read-only calendar consent, then select calendars. Current branch has a deliberately inactive OAuth placeholder and cannot connect to a real account until step 5 is completed.

**Implementation details and limits:** Chrome Identity `getAuthToken` holds access tokens. Manifest OAuth scope is only `https://www.googleapis.com/auth/calendar.readonly`, and optional host access is only `https://www.googleapis.com/*`. No backend, Pulse integration or credentials in URLs. Calendar event data lives under its own **Chrome local storage** key rather than Desk's synced/backed-up application state; it contains only calendar names, event titles, start times and Google Calendar links. Requests omit attendees, descriptions and locations. Refresh occurs only when opened and stale or when explicitly clicked, never via hidden background polling. API errors preserve the previous cached snapshot. **Disconnect** clears the local cache and removes the last Chrome Identity token from the cache; permissions already granted on the Google Account must be revoked separately in Google Account settings if complete revocation is desired.

Current stage: source and mocked Google API/OAuth checks in a development PR. **Not a verified live Google OAuth connection** until client registration, on-device Chrome consent, and real Google Calendar API testing are completed. Chrome's identity API typically authenticates the Google account attached to the Chrome profile; this iteration supports many calendars within that account, not arbitrary multiple Google accounts simultaneously.

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