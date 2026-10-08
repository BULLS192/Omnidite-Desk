# Omnidite Desk v0.3.0 — personal Chrome command center

**No web hosting, Vercel builds, backend, third-party script loaders, API keys, or Chrome Web Store publication required.** Uses Manifest V3 and Chrome's built-in New Tab override / Side Panel.

## What's new in V0.3

- **Global command bar**: click Commands or press `Ctrl+K`. Search workspaces, tracked projects, link widgets, incomplete tasks, saved captures, and quick actions. Navigate with arrow keys and Enter.
- **Projects hub**: maintain a personal directory of project names, optional URLs, and manual status labels; launch project links from the directory or command bar. Seeded suggestions include Omnidite, Providence, TTT-OS, Atlas, SGBuddy and F.R.E.Y.A. You can edit/delete each entry.
- **Quick capture + research library**: manually save research titles, pasted webpage URLs, notes and project associations; browse, filter, edit or delete your captures. The app does not read arbitrary webpages automatically.
- **Layout studio**: Compact/Balanced/Wide workspace presets; up to 12 named layout snapshots; drag or use widget up/down controls to reorder; resize in increments of 1 to 12 columns and vertically up to 1000px. Mobile and side-panel views remain single-column.
- **Backward-compatible data**: original v0.2 state storage key, Chrome Sync opt-in, backups, native Git updater, themes, weather, wallpapers, task/notes/widgets remain. New project/capture/layout data is in the same local state and optional Chrome Sync/export backups. Wallpaper images remain device-local.
- **Automated checks**: `node tools/check.mjs && node tools/v03-smoke.mjs` validates basic source integrity and interaction logic; final Windows Chrome tests are still necessary before release.

**Recommended upgrade path:** Before adopting V0.3, export a backup in your current V0.2.2 Settings. Development happens on `feature/desk-v0.3-foundation`; your one-click updater follows **main**, so it will not expose the new version until the reviewed pull request is merged. Do not point your existing production clone at this feature branch unless intentionally testing it.

## What's in v0.2 (preserved)

- Multi-page workspaces: Overview, Projects, Personal; add, rename, delete, and move widgets between pages.
- Drag from the **⠿** header handle to reorder. Drag the **bottom-right diagonal handle** to resize across a 12-column responsive grid (now supports all twelve width increments) and change card height.
- Midnight, Slate, and Light themes, customizable accent, search provider and dashboard name.
- Eleven widgets: link launcher, tasks, notes, world clocks, focus timer, local agenda, countdown, habits, metric counter, inspirational quote.
- Searchable world clocks (up to 24), with analog and digital display, date and live UTC differences relative to your current computer timezone (automatically accounts for daylight-saving transitions).
- Quick Launch and project shortcuts use Chrome's native website favicons and fall back to initials.
- Focus sprint presets plus any custom duration from 1 to 240 minutes, with pause and reset to your chosen duration.
- Live weather by city (up to 15): current conditions, next 24 hourly slots, and seven-day forecast, with 15-minute refresh, using Open-Meteo and GeoNames city search. Weather requires an internet connection and may be subject to provider fair-use/license terms.
- Personal wallpapers: upload single/multiple images, select a folder (imports a local snapshot), choose one image or cycle every 5, 15, 30 or 60 minutes. Images are downsampled for performance and stored locally in IndexedDB, not in Chrome Sync, GitHub or JSON exports. To see new files added to a folder, re-import it.
- Optional Chrome Sync for small dashboards, export/import JSON, v0.1 backup migration.
- Chrome side panel and new-tab experience.
- **Built-in GitHub updater** on the New Tab dashboard. The optional one-time Windows native helper lets the page check GitHub, pull approved fast-forward updates, and reload the unpacked extension without opening a terminal.

**Important limitations:** Calendar/agenda events are local manual entries; not yet connected to Google Calendar. Metric counters are manually adjusted, not live Vercel/Supabase data. Weather and city geocoding call only Open-Meteo endpoints; no account or API key is used. Local calendar remains manual. Resize snaps to grid, rather than allowing overlapping/free-pixel positioning. The version is designed for one Chrome profile per device.

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


Repository: **https://github.com/BULLS192/Omnidite-Desk**. Stable released source is committed to `main`; V0.3 development is on a feature branch with a GitHub Actions **validation-only** workflow (no hosting or deployment).

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
- `desk-v03.js`, `desk-v03.css`: V0.3 command bar, research, project hub and layout studio
- `tools/v03-smoke.mjs`: source-level interaction smoke tests
- `styles.css`: visual styles and responsive themes
- `manifest.json`: manifest and shared **public key**; keep unchanged across machines
- `background.js`: side-panel toggle
- `icons/`: extension icons
- `Setup-OneClickUpdates.bat`, `native-host/`: one-time Windows updater bridge
- `.github/workflows/validate.yml`: static checks only; **no deploy workflow**

### Security/privacy

Extension permissions are `storage`, `sidePanel`, `nativeMessaging` and `favicon`. Host access is limited to Open-Meteo weather and geocoding endpoints. No general website browsing permission is requested. No telemetry. Only valid `http(s)` URLs in the launcher. Widget strings are escaped before HTML rendering, and the extension does not execute remote scripts. Never commit exported backup files to GitHub; the repository is **public**.

### Browser testing

Source-level and browser-interaction smoke checks were completed on the generated package. Run `node tools/check.mjs && node tools/v03-smoke.mjs` for static and behavior smoke tests. Windows native-host registration and Chrome reload must also be validated on the actual Windows machine. Real-world Chrome Sync between accounts/devices remains to be validated on your own signed-in installations.