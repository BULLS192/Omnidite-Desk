/* Omnidite Desk V0.3 foundation. Runs only on extension pages; no remote dependencies. */
(() => {
  'use strict';
  const api = window.DeskBridge;
  if (!api) return;
  const state = () => api.getState();
  const esc = api.esc;
  const modal = document.getElementById('modal');
  const $ = (selector, root = document) => root.querySelector(selector);
  const safe = url => api.validUrl(url);
  let results = [];
  let selected = 0;

  function head(title, detail) {
    return '<div class="modal-top"><div><span class="eyebrow">OMNIDITE / DESK V0.3</span><h2 id="modalTitle">' +
      esc(title) + '</h2><p>' + esc(detail) + '</p></div><button type="button" class="modal-close" data-v03="close" aria-label="Close">✕</button></div>';
  }
  function show(title, detail, contents) {
    api.show('<div class="modal-pad desk-v03-modal">' + head(title, detail) + contents + '</div>');
  }
  function goTo(id) {
    if (!state().pages.some(p => p.id === id)) return;
    state().activePage = id;
    api.close();
    api.save();
  }
  function launch(url) {
    if (!safe(url)) return;
    window.open(url, '_blank', 'noopener,noreferrer');
    api.close();
  }
  function catalog() {
    const list = [
      {type:'Action', title:'Add a widget', detail:'Open the widget library', action:() => api.openGallery()},
      {type:'Action', title:'Projects hub', detail:'Open your project directory', action:openProjects},
      {type:'Action', title:'Quick capture', detail:'Save a link, idea or research note', action:() => openCapture()},
      {type:'Action', title:'Research library', detail:'Browse saved research', action:openResearch},
      {type:'Action', title:'Layouts and snapshots', detail:'Organize and save your widget layout', action:openLayouts},
      {type:'Action', title:'Search the web', detail:'Focus the existing search field', action:() => {api.close();$('#searchInput')?.focus();}}
    ];
    state().pages.forEach(p => list.push({type:'Workspace', title:p.title, detail:'Open workspace', action:() => goTo(p.id)}));
    (state().projects || []).forEach(p => {
      list.push({type:'Project', title:p.name, detail:p.url || 'No launch URL — edit in Projects', action:() => p.url ? launch(p.url) : openProjects()});
    });
    state().pages.forEach(p => p.modules.forEach(m => {
      if (m.type === 'links') (m.config.links || []).forEach(l => {
        if (safe(l.url)) list.push({type:'Shortcut', title:l.label, detail:p.title + ' · ' + l.url, action:() => launch(l.url)});
      });
      if (m.type === 'tasks') (m.config.tasks || []).filter(t => !t.done).forEach(t =>
        list.push({type:'Task', title:t.text, detail:'View in ' + p.title, action:() => goTo(p.id)}));
    }));
    (state().captures || []).forEach(c => list.push({type:'Research', title:c.title, detail:c.project || c.url || 'Saved note', action:() => openCapture(c.id)}));
    return list;
  }
  function openCommand() {
    show('Command bar', 'Search across your workspaces, projects, tasks, shortcuts and saved research.',
      '<label class="label" for="deskCommandInput">Search or type a command</label>' +
      '<input id="deskCommandInput" class="modal-input desk-command-input" autocomplete="off" placeholder="e.g. Atlas, capture, research…" aria-controls="deskCommandResults">' +
      '<div id="deskCommandResults" class="desk-result-list" role="listbox" aria-label="Commands"></div>' +
      '<p class="helper">Press / (or Ctrl + K when available) · ↑ / ↓ to navigate · Enter to run · Esc to close</p>');
    selected = 0;
    renderCommands('');
    $('#deskCommandInput')?.focus();
  }
  function renderCommands(query) {
    const search = query.toLocaleLowerCase().trim();
    const all = catalog();
    results = (search ? all.filter(i => (i.title + ' ' + i.detail + ' ' + i.type).toLocaleLowerCase().includes(search)) : all.slice(0,18)).slice(0,22);
    selected = Math.max(0, Math.min(selected, results.length - 1));
    const root = $('#deskCommandResults');
    if (!root) return;
    root.innerHTML = results.length ? results.map((entry, i) =>
      '<button type="button" class="desk-result ' + (i === selected ? 'is-active' : '') + '" data-v03-item="' + i + '" role="option" aria-selected="' + (i === selected) + '">' +
      '<span class="desk-result-type">' + esc(entry.type) + '</span><span class="desk-result-text"><strong>' + esc(entry.title) +
      '</strong><small>' + esc(entry.detail) + '</small></span><span aria-hidden="true">↗</span></button>').join('') :
      '<p class="empty-note">No matching commands or saved items.</p>';
  }
  function selectCommand(index) {
    const item = results[index];
    if (item) item.action();
  }

  function projectForm(id) {
    const p = (state().projects || []).find(x => x.id === id);
    show(p ? 'Edit project' : 'Add project', 'Keep project names and destination URLs in one place.',
      '<form id="v03ProjectForm" data-id="' + esc(p?.id || '') + '">' +
      '<label class="label">Project name</label><input class="modal-input" name="name" maxlength="80" required value="' + esc(p?.name || '') + '" placeholder="Project name">' +
      '<label class="label">Launch URL (optional)</label><input class="modal-input" name="url" maxlength="1000" type="url" value="' + esc(p?.url || '') + '" placeholder="https://example.com">' +
      '<label class="label">Status / category</label><input class="modal-input" name="status" maxlength="40" value="' + esc(p?.status || 'Tracked') + '">' +
      '<div class="modal-actions"><button type="submit" class="button primary">Save project</button><button type="button" class="button ghost" data-v03="projects">Cancel</button></div></form>');
  }
  function openProjects() {
    const cards = (state().projects || []).map(p =>
      '<div class="desk-item"><div class="desk-item-main"><strong>' + esc(p.name) + '</strong><small>' + esc(p.status || 'Tracked') + '</small>' +
      (p.url && safe(p.url) ? '<a href="' + esc(p.url) + '" target="_blank" rel="noopener noreferrer" class="desk-item-link">' + esc(p.url) + '</a>' : '<small>No URL connected yet</small>') +
      '</div><button type="button" class="smallbutton" data-v03="edit-project" data-id="' + esc(p.id) + '">Edit</button><button type="button" class="tiny" data-v03="delete-project" data-id="' + esc(p.id) + '" aria-label="Delete project">✕</button></div>').join('');
    show('Projects hub', 'Launch, edit and organize project shortcuts without leaving Desk.',
      '<div class="modal-actions"><button type="button" class="button primary" data-v03="add-project">＋ Add project</button><button type="button" class="button ghost" data-v03="command">Search all</button></div>' +
      '<div class="desk-collection">' + (cards || '<p class="empty-note">No projects yet. Create your first one.</p>') + '</div>');
  }

  function captureForm(capture) {
    const projectOptions = (state().projects || []).map(p => '<option value="' + esc(p.name) + '" ' + (capture?.project === p.name ? 'selected' : '') + '>' + esc(p.name) + '</option>').join('');
    show(capture ? 'Edit capture' : 'Quick capture', 'Save research directly to your local Desk. Pasted URLs are optional.',
      '<form id="v03CaptureForm" data-id="' + esc(capture?.id || '') + '">' +
      '<label class="label">Title</label><input class="modal-input" name="title" maxlength="140" required value="' + esc(capture?.title || '') + '" placeholder="Article, idea, reference…">' +
      '<label class="label">Web URL (optional)</label><input class="modal-input" name="url" type="url" maxlength="1000" value="' + esc(capture?.url || '') + '" placeholder="Paste a webpage URL">' +
      '<label class="label">Project (optional)</label><select class="modal-input" name="project"><option value="">Unassigned</option>' + projectOptions + '</select>' +
      '<label class="label">Notes</label><textarea class="modal-input desk-capture-notes" name="note" maxlength="1100" placeholder="Why this is useful, next action, key finding…">' + esc(capture?.note || '') + '</textarea>' +
      '<div class="modal-actions"><button type="submit" class="button primary">Save to research</button><button type="button" class="button ghost" data-v03="research">Research library</button></div></form>');
  }
  function openCapture(id) {
    const capture = (state().captures || []).find(c => c.id === id);
    captureForm(capture);
    $('[name="title"]', modal)?.focus();
  }
  function captureList(filter = '') {
    const root = $('#deskCaptureList');
    if (!root) return;
    const q = filter.toLocaleLowerCase();
    const items = (state().captures || []).filter(c => (c.title + ' ' + c.note + ' ' + c.project).toLocaleLowerCase().includes(q));
    root.innerHTML = items.length ? items.map(c =>
      '<div class="desk-item"><div class="desk-item-main"><strong>' + esc(c.title) + '</strong><small>' +
      esc(c.project || 'Unassigned') + ' · ' + esc(new Date(c.createdAt).toLocaleDateString()) + '</small>' +
      (c.note ? '<p>' + esc(c.note) + '</p>' : '') +
      (c.url && safe(c.url) ? '<a class="desk-item-link" href="' + esc(c.url) + '" target="_blank" rel="noopener noreferrer">' + esc(c.url) + '</a>' : '') +
      '</div><button class="smallbutton" type="button" data-v03="edit-capture" data-id="' + esc(c.id) + '">Edit</button><button class="tiny" type="button" data-v03="delete-capture" data-id="' + esc(c.id) + '" aria-label="Delete capture">✕</button></div>').join('') :
      '<p class="empty-note">No research items match. Add a capture to get started.</p>';
  }
  function openResearch() {
    show('Research library', 'Your saved links and notes. These are included in Desk backups and optional Chrome Sync.',
      '<div class="modal-actions"><button type="button" class="button primary" data-v03="capture">＋ Quick capture</button></div>' +
      '<label class="label" for="deskCaptureFilter">Find saved research</label><input id="deskCaptureFilter" class="modal-input" placeholder="Search title, project or note…">' +
      '<div id="deskCaptureList" class="desk-collection"></div>');
    captureList();
  }

  function currentPageSnapshots() {
    return (state().layoutSnapshots || []).filter(s => s.pageId === api.page().id);
  }
  function openLayouts() {
    show('Layout studio', 'Adjust module density or save and restore the current workspace arrangement.',
      '<div class="desk-layout-presets">' +
      '<button type="button" class="module-option" data-v03="preset" data-preset="compact"><strong>Compact</strong><small>Smaller tiles, more at once</small></button>' +
      '<button type="button" class="module-option" data-v03="preset" data-preset="balanced"><strong>Balanced</strong><small>Readable multi-column layout</small></button>' +
      '<button type="button" class="module-option" data-v03="preset" data-preset="wide"><strong>Wide</strong><small>One full-width module per row</small></button></div>' +
      '<p class="helper">You can also drag tiles, move them using the ↑ / ↓ controls, and resize from the lower-right corner. Widths snap to all twelve grid units on desktop.</p>' +
      '<form id="v03SnapshotForm"><label class="label">Save a reusable layout snapshot</label><div class="desk-inline"><input name="name" class="modal-input" maxlength="70" required placeholder="e.g. Research focus"><button class="smallbutton" type="submit">Save</button></div></form>' +
      '<h3 class="desk-small-heading">Saved layouts for ' + esc(api.page().title) + '</h3><div class="desk-collection">' +
      (currentPageSnapshots().map(s => '<div class="desk-item"><strong>' + esc(s.name) +
      '</strong><button class="smallbutton" type="button" data-v03="restore-layout" data-id="' + esc(s.id) + '">Restore</button>' +
      '<button class="tiny" type="button" data-v03="delete-layout" data-id="' + esc(s.id) + '" aria-label="Delete saved layout">✕</button></div>').join('') ||
      '<p class="empty-note">No saved layouts yet.</p>') + '</div>');
  }
  function applyPreset(preset) {
    const widths = {
      compact: m => ['clock', 'weather', 'links', 'tasks'].includes(m.type) ? 4 : 3,
      balanced: m => ['clock', 'weather', 'links', 'tasks', 'notes'].includes(m.type) ? 6 : 4,
      wide: () => 12
    };
    if (!widths[preset]) return;
    api.page().modules.forEach(m => {m.cols = widths[preset](m); m.height = 0;});
    api.save();
    openLayouts();
  }
  function restoreSnapshot(id) {
    const snap = currentPageSnapshots().find(s => s.id === id);
    if (!snap) return;
    const page = api.page();
    const lookup = new Map(page.modules.map(m => [m.id, m]));
    const ordered = [];
    snap.widgets.forEach(w => {
      const m = lookup.get(w.id);
      if (!m) return;
      m.cols = Math.max(1, Math.min(12, w.cols));
      m.height = w.height;
      ordered.push(m);
      lookup.delete(m.id);
    });
    page.modules = ordered.concat([...lookup.values()]);
    api.save();
    openLayouts();
  }
  function handleForm(event) {
    const form = event.target;
    if (form.id === 'v03ProjectForm') {
      event.preventDefault();
      const name = form.elements.name.value.trim().slice(0,80);
      const url = form.elements.url.value.trim();
      if (!name || (url && !safe(url))) {alert('Provide a name and a valid http(s) link.');return;}
      const projects = state().projects;
      const old = projects.find(p => p.id === form.dataset.id);
      if (!old && projects.length >= 60) {alert('Maximum 60 projects.');return;}
      const record = old || {id:api.uid()};
      record.name = name; record.url = url; record.status = form.elements.status.value.trim().slice(0,40) || 'Tracked';
      if (!old) projects.push(record);
      api.save();openProjects();
    }
    if (form.id === 'v03CaptureForm') {
      event.preventDefault();
      const title = form.elements.title.value.trim().slice(0,140);
      const url = form.elements.url.value.trim();
      if (!title || (url && !safe(url))) {alert('Add a title and a valid http(s) link.');return;}
      const captures = state().captures;
      const old = captures.find(c => c.id === form.dataset.id);
      const record = old || {id:api.uid(), createdAt:Date.now()};
      record.title = title;
      record.url = url;
      record.note = form.elements.note.value.trim().slice(0,1100);
      record.project = form.elements.project.value.slice(0,90);
      if (!old) captures.unshift(record);
      if (captures.length > 40) captures.splice(40);
      api.save();openResearch();
    }
    if (form.id === 'v03SnapshotForm') {
      event.preventDefault();
      const name = form.elements.name.value.trim().slice(0,70);
      if (!name) return;
      const snapshots = state().layoutSnapshots;
      if (snapshots.length >= 12) {alert('Maximum 12 saved layouts. Remove an old snapshot first.');return;}
      snapshots.push({id:api.uid(),name,pageId:api.page().id,widgets:api.page().modules.map(m => ({id:m.id,cols:m.cols,height:m.height}))});
      api.save();openLayouts();
    }
  }
  function handleClick(event) {
    const actionButton = event.target.closest('[data-v03]');
    if (actionButton) {
      const a = actionButton.dataset.v03;
      if (a === 'command') openCommand();
      if (a === 'close') api.close();
      if (a === 'projects') openProjects();
      if (a === 'add-project') projectForm();
      if (a === 'edit-project') projectForm(actionButton.dataset.id);
      if (a === 'delete-project') {
        if (confirm('Remove this project shortcut? Saved research stays intact.')) {
          state().projects = state().projects.filter(p => p.id !== actionButton.dataset.id);
          api.save();openProjects();
        }
      }
      if (a === 'capture') openCapture();
      if (a === 'edit-capture') openCapture(actionButton.dataset.id);
      if (a === 'research') openResearch();
      if (a === 'delete-capture') {
        if (confirm('Delete this research capture?')) {
          state().captures = state().captures.filter(c => c.id !== actionButton.dataset.id);
          api.save();openResearch();
        }
      }
      if (a === 'layouts') openLayouts();
      if (a === 'preset') applyPreset(actionButton.dataset.preset);
      if (a === 'restore-layout') restoreSnapshot(actionButton.dataset.id);
      if (a === 'delete-layout') {
        state().layoutSnapshots = state().layoutSnapshots.filter(s => s.id !== actionButton.dataset.id);
        api.save();openLayouts();
      }
    }
    const option = event.target.closest('[data-v03-item]');
    if (option) selectCommand(Number(option.dataset.v03Item));
  }
  document.addEventListener('click', handleClick);
  document.addEventListener('submit', handleForm);
  document.addEventListener('input', event => {
    if (event.target.id === 'deskCommandInput') {selected = 0;renderCommands(event.target.value);}
    if (event.target.id === 'deskCaptureFilter') captureList(event.target.value);
  });
  document.addEventListener('keydown', event => {
    if (((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') || (event.key === '/' && !event.ctrlKey && !event.metaKey && !event.altKey && !['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName))) {event.preventDefault();openCommand();return;}
    if (!modal.open || !$('#deskCommandInput')) return;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      selected = Math.max(0, Math.min(results.length - 1, selected + (event.key === 'ArrowDown' ? 1 : -1)));
      renderCommands($('#deskCommandInput').value);
      $('#deskCommandResults .is-active')?.scrollIntoView({block:'nearest'});
    }
    if (event.key === 'Enter') {event.preventDefault();selectCommand(selected);}
  });
})();