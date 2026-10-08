# Omnidite Desk v0.2 — personal Chrome command center

**No web hosting, Vercel builds, backend, third-party script loaders, API keys, or Chrome Web Store publication required.** Uses Manifest V3 and Chrome's built-in New Tab override / Side Panel.

## What's in v0.2

- Multi-page workspaces: Overview, Projects, Personal; add, rename, delete, and move widgets between pages.
- Drag from the **⠿** header handle to reorder. Drag the **bottom-right diagonal handle** to resize across a 12-column responsive grid (snaps to supported column widths) and change card height.
- Midnight, Slate, and Light themes, customizable accent, search provider and dashboard name.
- Ten local-first widget types: link launcher, tasks, notes, world clocks, focus timer, local agenda, countdown, habits, metric counter, inspirational quote.
- Optional Chrome Sync for small dashboards, export/import JSON, v0.1 backup migration.
- Chrome side panel and new-tab experience.

**Important limitations:** Calendar/agenda events are local manual entries; not yet connected to Google Calendar. Metric counters are manually adjusted, not live Vercel/Supabase data. No OAuth/live APIs in this release. Resize snaps to grid, rather than allowing overlapping/free-pixel positioning. The version is designed for one Chrome profile per device.

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

Repository: **https://github.com/BULLS192/Omnidite-Desk**. The full v0.2 source is already committed to `main` with a GitHub Actions **validation-only** workflow (no hosting or deployment).

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
- `styles.css`: visual styles and responsive themes
- `manifest.json`: manifest and shared **public key**; keep unchanged across machines
- `background.js`: side-panel toggle
- `icons/`: extension icons
- `.github/workflows/validate.yml`: static checks only; **no deploy workflow**

### Security/privacy

Only extension permissions are `storage` and `sidePanel`. `manifest.json` has no host permissions. No telemetry. Only valid `http(s)` URLs in the launcher. Widget strings are escaped before HTML rendering, and the extension does not execute remote scripts. Never commit exported backup files to GitHub; the repository is **public**.

### Browser testing

Source-level and browser-interaction smoke checks were completed on the generated package. Run `node tools/check.mjs` for static manifest/files check. Real-world Chrome Sync between accounts/devices remains to be validated on your own signed-in installations.