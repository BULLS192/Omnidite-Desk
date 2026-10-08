# Omnidite Desk v0.5.0 — personal Chrome command center

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