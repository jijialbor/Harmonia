/* JPHON Harmonia — website admin.
 * Edits data/content.json and uploads images through the GitHub API.
 * The access token is kept only in this browser (session or local storage),
 * never inside the website files. */
(function () {
  'use strict';

  const $ = (sel, el = document) => el.querySelector(sel);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const filled = (s) => String(s ?? '').trim() !== '';
  const STORE_KEY = 'harmoniaAdminConn';
  const IMAGE_TYPES = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/gif': 'gif' };
  const MAX_IMAGE_MB = 5;

  // Local test mode: on localhost with ?local=1, edits are downloaded as a file instead of saved to GitHub.
  const LOCAL = /^(localhost|127\.0\.0\.1)$/.test(location.hostname) && new URLSearchParams(location.search).has('local');

  const state = { conn: null, content: null, sha: null, dirty: false, tab: 'dashboard', previews: {} };

  /* ---------- dot-path helpers ---------- */
  const get = (obj, path) => path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
  const set = (obj, path, val) => {
    const keys = path.split('.');
    let o = obj;
    keys.slice(0, -1).forEach((k, i) => {
      if (o[k] == null || typeof o[k] !== 'object') o[k] = /^\d+$/.test(keys[i + 1]) ? [] : {};
      o = o[k];
    });
    o[keys[keys.length - 1]] = val;
  };

  /* ---------- schema: what the admin can edit ---------- */
  const ICONS = ['numbers', 'key', 'sync', 'offline', 'team', 'qr', 'instruments', 'playlist', 'metronome', 'voice', 'tuner', 'family', 'guide', 'lyrics', 'android', 'star', 'heart', 'church', 'easy', 'gift'];
  const F = (path, label, type = 'text', extra = {}) => ({ path, label, type, ...extra });

  const TABS = {
    dashboard: { title: 'Dashboard' },
    general: {
      title: 'General & images',
      groups: [
        { title: 'Site', fields: [
          F('site.name', 'App name'), F('site.developer', 'Developer / brand'),
          F('site.tagline', 'Short tagline (hero label, footer, page title)'),
          F('site.motto', 'Website motto (footer)'),
          F('site.meta_description', 'Search engine description', 'textarea'),
          F('site.jphon_url', 'Official JPHON page link', 'url'),
          F('site.contact_email', 'Contact email for feedback (optional, shown publicly)', 'email'),
          F('site.facebook_url', 'Facebook page link (optional)', 'url'),
        ] },
        { title: 'Images', fields: [
          F('images.logo', 'Logo (square image)', 'image'),
          F('images.hero', 'Home hero screenshot: main phone (back)', 'image', { hint: 'A real phone screenshot of Harmonia (portrait, 9:19 works best). Until you upload one, an illustrated chart is shown.' }),
          F('images.hero_2', 'Home hero screenshot: team phone (front)', 'image', { hint: 'Optional second screenshot, e.g. the same chart on a team phone.' }),
        ] },
      ],
    },
    home: {
      title: 'Home page',
      groups: [
        { title: 'Hero', fields: [
          F('home.hero_title', 'Main headline'), F('home.hero_subtitle', 'Supporting headline', 'textarea'),
          F('home.hero_description', 'Main description', 'textarea'),
          F('home.hero_story', 'Donation message', 'textarea', { tall: true, hint: 'Leave an empty line between paragraphs.' }),
          F('home.cta_download', 'Download button text'), F('home.cta_support', 'Support button text'),
          F('home.hero_note', 'Small text below buttons'),
        ] },
        { title: 'About Harmonia', fields: [
          F('home.about_title', 'Section headline'), F('home.about_text', 'Description', 'textarea', { tall: true }),
          F('home.highlights', 'Feature highlights', 'list', { item: [F('title', 'Title'), F('text', 'Text', 'textarea')], add: 'Add highlight', blank: { title: '', text: '' } }),
        ] },
        { title: 'How it works', note: 'Leave all steps empty to hide this section.', fields: [
          F('home.steps_title', 'Section headline'),
          F('home.steps', 'Steps', 'list', { titleKey: 'title', item: [F('icon', 'Icon', 'select', { options: ICONS }), F('title', 'Title'), F('text', 'Text', 'textarea')], add: 'Add step', blank: { icon: 'star', title: '', text: '' } }),
          F('home.steps_note', 'Small tip under the steps'),
        ] },
        { title: 'Features section', note: 'Edit the features themselves in the Features tab.', fields: [
          F('home.features_title', 'Section headline'), F('home.features_cta', 'Button text'),
        ] },
        { title: 'Our mission', fields: [
          F('home.mission_title', 'Section headline'), F('mission.mission', 'Mission', 'textarea'), F('mission.vision', 'Vision', 'textarea'),
          F('mission.values', 'Core values', 'list', { item: [F('title', 'Value'), F('text', 'Description', 'textarea')], add: 'Add value', blank: { title: '', text: '' } }),
        ] },
        { title: 'Support the project', fields: [
          F('support.title', 'Headline'), F('support.text', 'Description', 'textarea', { tall: true }),
          F('support.cta', 'Button text'), F('support.note', 'Secondary text'),
        ] },
      ],
    },
    features: {
      title: 'Features',
      groups: [
        { title: 'What can Harmonia do?', note: 'Only features marked "Published" appear on the website. Publish only what is implemented in the current version. If none are published, the section is hidden.', fields: [
          F('features', 'Features', 'list', { titleKey: 'title', toggleKey: 'published',
            item: [F('published', 'Published (implemented in current version)', 'bool'), F('icon', 'Icon', 'select', { options: ICONS }),
              F('title', 'Feature name'), F('text', 'Short description', 'textarea'), F('image', 'Screenshot (optional)', 'image')],
            add: 'Add feature', blank: { published: false, icon: 'star', title: '', text: '', image: '' } }),
        ] },
      ],
    },
    tutorials: {
      title: 'Tutorials',
      groups: [
        { title: 'Tutorial page', fields: [F('tutorials.title', 'Headline'), F('tutorials.intro', 'Intro', 'textarea')] },
        { title: 'Videos', note: 'Paste a YouTube link. Only published videos with a valid YouTube link are shown.', fields: [
          F('tutorials.items', 'Tutorial videos', 'list', { titleKey: 'title', toggleKey: 'published',
            item: [F('published', 'Published', 'bool'), F('category', 'Topic', 'category'), F('title', 'Title'),
              F('description', 'Description', 'textarea'), F('youtube', 'YouTube link', 'url', { youtube: true })],
            add: 'Add tutorial', blank: { published: true, category: '', title: '', description: '', youtube: '' } }),
        ] },
        { title: 'Topics', note: 'Shown as filters, and as "planned topics" while no videos are published.', fields: [
          F('tutorials.categories', 'Topics', 'list', { titleKey: 'name', item: [F('name', 'Topic name')], add: 'Add topic', blank: { name: '' } }),
        ] },
      ],
    },
    download: {
      title: 'Download',
      groups: [
        { title: 'Download page', fields: [
          F('download.title', 'Headline'), F('download.description', 'Description', 'textarea'), F('download.notice', 'Free software notice', 'textarea'),
          F('download.platform_note', 'Android note (under the download button)', 'text', { hint: 'Leave empty to hide.' }),
          F('download.ios_note', 'iPhone "Coming soon" text', 'textarea', { hint: 'Leave empty to hide the iPhone card (e.g. once an iPhone version is released).' }),
          F('download.requirements', 'System requirements', 'textarea', { hint: 'One per line. The section is hidden while empty.' }),
          F('download.install_steps', 'Installation instructions', 'textarea', { hint: 'One step per line.' }),
        ] },
        { title: 'Releases (newest first)', note: 'Upload the APK to GitHub Releases or Google Drive (repository → Releases → Draft a new release), then paste the file link here. The first release in the list is shown as the latest.', fields: [
          F('download.releases', 'Versions', 'list', { titleKey: 'version', titlePrefix: 'v',
            item: [F('version', 'Version (e.g. 1.0.0)'), F('date', 'Release date', 'date'), F('size', 'File size (e.g. 27 MB)'),
              F('url', 'Download link (APK URL)', 'url'), F('notes', "What's new", 'textarea', { hint: 'One change per line.' })],
            add: 'Add release', addTop: true, blank: { version: '', date: '', size: '', url: '', notes: '' } }),
        ] },
      ],
    },
    about: {
      title: 'About page',
      groups: [
        { title: 'About', note: 'Leave a field empty to hide its section.', fields: [
          F('about.title', 'Headline'), F('about.intro', 'Intro', 'textarea'),
          F('about.story', 'The story behind the project', 'textarea', { tall: true }),
          F('about.why', 'Why the software was developed', 'textarea'),
          F('about.problems', 'Problems it aims to solve', 'textarea', { hint: 'One per line.' }),
          F('about.philosophy', 'Development philosophy', 'textarea'), F('about.future', 'Future goals', 'textarea'),
          F('about.developer_text', 'Developer section', 'textarea', { tall: true }),
        ] },
      ],
    },
    donate: {
      title: 'Donate',
      groups: [
        { title: 'Donate page text', fields: [
          F('donate.title', 'Headline'), F('donate.subtitle', 'Subheading', 'textarea'),
          F('donate.message', 'Full message', 'textarea', { tall: true }), F('donate.thanks', 'Final thank-you message', 'textarea'),
        ] },
        { title: 'GCash', note: 'Shown when enabled and a number or QR code is set. The COPY button appears once a number is entered.', fields: [
          F('donate.gcash.enabled', 'Show GCash on the website', 'bool'),
          F('donate.gcash.holder', 'Account holder name'), F('donate.gcash.number', 'Mobile number'),
          F('donate.gcash.qr', 'QR code', 'image'), F('donate.gcash.logo', 'GCash logo (optional)', 'image'),
        ] },
        { title: 'Maya', note: 'Shown when enabled and a number or QR code is set. The COPY button appears once a number is entered.', fields: [
          F('donate.maya.enabled', 'Show Maya on the website', 'bool'),
          F('donate.maya.holder', 'Account holder name'), F('donate.maya.number', 'Mobile number'),
          F('donate.maya.qr', 'QR code', 'image'), F('donate.maya.logo', 'Maya logo (optional)', 'image'),
        ] },
        { title: 'Bank transfer', note: 'Shown when enabled and an account number or QR code is set. The COPY button appears once a number is entered.', fields: [
          F('donate.bank.enabled', 'Show bank transfer on the website', 'bool'),
          F('donate.bank.bank_name', 'Bank name'), F('donate.bank.holder', 'Account holder name'),
          F('donate.bank.number', 'Account number'), F('donate.bank.qr', 'QR code (optional)', 'image'), F('donate.bank.logo', 'Bank logo (optional)', 'image'),
        ] },
      ],
    },
  };

  /* ---------- GitHub API ---------- */
  const repoPath = (p) => {
    const folder = (state.conn.folder || '').replace(/^\/+|\/+$/g, '');
    return (folder ? folder + '/' : '') + p;
  };
  async function gh(method, path, body) {
    const res = await fetch('https://api.github.com' + path, {
      method,
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: 'Bearer ' + state.conn.token,
        'X-GitHub-Api-Version': '2022-11-28',
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      cache: 'no-store',
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(data.message || 'GitHub error ' + res.status);
      err.status = res.status;
      throw err;
    }
    return data;
  }
  const contentsUrl = (p) => `/repos/${encodeURIComponent(state.conn.owner)}/${encodeURIComponent(state.conn.repo)}/contents/${p.split('/').map(encodeURIComponent).join('/')}`;
  const b64ToText = (b64) => new TextDecoder().decode(Uint8Array.from(atob(b64.replace(/\s/g, '')), (c) => c.charCodeAt(0)));
  const bytesToB64 = (bytes) => {
    let bin = '';
    for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(bin);
  };
  async function readContentFile() {
    const data = await gh('GET', contentsUrl(repoPath('data/content.json')) + '?ref=' + encodeURIComponent(state.conn.branch));
    return { sha: data.sha, json: JSON.parse(b64ToText(data.content)) };
  }
  async function putFile(path, b64, message, sha) {
    return gh('PUT', contentsUrl(repoPath(path)), { message, content: b64, branch: state.conn.branch, ...(sha ? { sha } : {}) });
  }

  /* ---------- status / dirty ---------- */
  function status(msg, kind = 'info') {
    const el = $('#status');
    el.className = 'status ' + kind;
    el.textContent = msg;
    el.hidden = !msg;
    if (kind === 'ok') { clearTimeout(status.t); status.t = setTimeout(() => { el.hidden = true; }, 9000); }
  }
  function markDirty(on = true) {
    state.dirty = on;
    $('#dirty').hidden = !on;
    $('#save').disabled = !on;
  }
  window.addEventListener('beforeunload', (e) => { if (state.dirty) { e.preventDefault(); e.returnValue = ''; } });

  /* ---------- rendering ---------- */
  const imgSrc = (path) => state.previews[path] || (filled(path) && /^assets\/[\w\-./]+$/.test(path) ? '../' + path : '');

  function fieldHtml(f, fullPath, value) {
    const id = 'f-' + fullPath.replace(/[^\w]/g, '-');
    const hint = f.hint ? `<span class="hint">${esc(f.hint)}</span>` : '';
    switch (f.type) {
      case 'bool':
        return `<label class="check"><input type="checkbox" id="${id}" data-path="${esc(fullPath)}" data-type="bool"${value ? ' checked' : ''}> ${esc(f.label)}</label>`;
      case 'textarea':
        return `<label for="${id}">${esc(f.label)}${hint}<textarea id="${id}" data-path="${esc(fullPath)}"${f.tall ? ' class="tall"' : ''}>${esc(value)}</textarea></label>`;
      case 'select':
        return `<label for="${id}">${esc(f.label)}<select id="${id}" data-path="${esc(fullPath)}">${f.options.map((o) => `<option${o === value ? ' selected' : ''}>${esc(o)}</option>`).join('')}</select></label>`;
      case 'category': {
        const cats = (state.content.tutorials.categories || []).map((c) => c.name).filter(filled);
        const opts = ['', ...cats];
        if (filled(value) && !cats.includes(value)) opts.push(value);
        return `<label for="${id}">${esc(f.label)}<select id="${id}" data-path="${esc(fullPath)}">${opts.map((o) => `<option value="${esc(o)}"${o === (value || '') ? ' selected' : ''}>${o ? esc(o) : '— none —'}</option>`).join('')}</select></label>`;
      }
      case 'image': {
        const src = imgSrc(value);
        return `<div><label>${esc(f.label)}${hint}</label>
          <div class="image-field">
            <div class="thumb">${src ? `<img src="${esc(src)}" alt="">` : 'No image'}</div>
            <div>
              <div class="muted small">${filled(value) ? esc(value) : 'Not set'}</div>
              <div class="image-actions">
                <span class="btn btn-sm file-btn">${filled(value) ? 'Replace' : 'Upload'}<input type="file" accept="image/png,image/jpeg,image/webp,image/gif" data-upload="${esc(fullPath)}"${LOCAL ? ' disabled' : ''}></span>
                ${filled(value) ? `<button type="button" class="btn btn-sm btn-danger" data-clear="${esc(fullPath)}">Remove</button>` : ''}
              </div>
            </div>
          </div></div>`;
      }
      default: {
        const type = f.type === 'url' ? 'url' : f.type === 'email' ? 'email' : f.type === 'date' ? 'date' : 'text';
        let warn = '';
        if (f.youtube && filled(value) && !/(youtube(-nocookie)?\.com\/(watch\?(.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)[A-Za-z0-9_-]{11}/.test(value)) warn = '<span class="hint" style="color:var(--warn)">This does not look like a YouTube video link.</span>';
        if (f.type === 'url' && !f.youtube && filled(value) && !/^https?:\/\//i.test(value)) warn = '<span class="hint" style="color:var(--warn)">Links must start with https://</span>';
        return `<label for="${id}">${esc(f.label)}${hint}<input type="${type}" id="${id}" data-path="${esc(fullPath)}" value="${esc(value)}">${warn}</label>`;
      }
    }
  }

  function listHtml(f) {
    const items = get(state.content, f.path) || [];
    const rows = items.map((it, i) => {
      const base = `${f.path}.${i}`;
      const name = f.titleKey ? (filled(it[f.titleKey]) ? (f.titlePrefix || '') + it[f.titleKey] : 'Untitled') : `#${i + 1}`;
      const pill = f.toggleKey ? `<span class="pill ${it[f.toggleKey] ? 'on' : 'offp'}">${it[f.toggleKey] ? 'Published' : 'Hidden'}</span>` : '';
      return `<div class="item${f.toggleKey && !it[f.toggleKey] ? ' off' : ''}">
        <div class="item-head"><strong>${esc(name)}${pill}</strong>
          <div class="item-tools">
            <button type="button" class="btn btn-sm" data-move="${esc(f.path)}" data-i="${i}" data-d="-1" ${i === 0 ? 'disabled' : ''} aria-label="Move up">↑</button>
            <button type="button" class="btn btn-sm" data-move="${esc(f.path)}" data-i="${i}" data-d="1" ${i === items.length - 1 ? 'disabled' : ''} aria-label="Move down">↓</button>
            <button type="button" class="btn btn-sm btn-danger" data-remove="${esc(f.path)}" data-i="${i}">Remove</button>
          </div>
        </div>
        ${f.item.map((sub) => fieldHtml(sub, `${base}.${sub.path}`, it[sub.path] ?? '')).join('')}
      </div>`;
    }).join('');
    return `<div><label>${esc(f.label)}</label>
      <div class="list">${rows || '<p class="muted small">Nothing added yet.</p>'}</div>
      <div style="margin-top:.8rem"><button type="button" class="btn btn-sm" data-add="${esc(f.path)}">+ ${esc(f.add)}</button></div></div>`;
  }

  function dashboardHtml() {
    const c = state.content;
    const pubFeatures = c.features.filter((f) => f.published).length;
    const pubTuts = (c.tutorials.items || []).filter((t) => t.published && filled(t.youtube)).length;
    const rel = (c.download.releases || []).find((r) => filled(r.version));
    const pays = ['gcash', 'maya', 'bank'].filter((k) => c.donate[k].enabled && (filled(c.donate[k].number) || filled(c.donate[k].qr)));
    const checks = [
      [filled(c.images.hero), 'Hero screenshot uploaded', 'General & images → upload a real phone screenshot of Harmonia.'],
      [pubFeatures > 0, `Features published (${pubFeatures})`, 'Features → tick "Published" only for features in the current version.'],
      [!!rel && filled(rel.url), rel ? `Latest release: v${rel.version}` : 'Release added', 'Download → add a version and paste its APK link.'],
      [filled(c.download.requirements), 'System requirements filled in', 'Download → add system requirements.'],
      [pubTuts > 0, `Tutorials published (${pubTuts})`, 'Tutorials → add YouTube links.'],
      [pays.length > 0, `Donation methods shown (${pays.length})`, 'Donate → enter GCash, Maya or bank details and tick "Show".'],
      [filled(c.site.contact_email) || filled(c.site.facebook_url), 'Feedback contact set', 'General & images → add a contact email or Facebook page so visitors can report bugs.'],
    ];
    const live = `https://${state.conn.owner.toLowerCase()}.github.io/${state.conn.repo}/`;
    return `<div class="group"><h2>Welcome</h2>
        <p class="muted" style="margin:0">Edit any section on the left, then press <b>Save &amp; publish</b>. GitHub Pages usually updates the live site within 1–2 minutes.</p>
        <p style="margin:0">Live website: <a href="${esc(live)}" target="_blank" rel="noopener">${esc(live)}</a></p></div>
      <div class="group"><h2>Setup checklist</h2><ul class="checklist">
        ${checks.map(([ok, label, todo]) => `<li><span class="dot ${ok ? 'ok' : 'todo'}"></span><div><b>${esc(label)}</b>${ok ? '' : `<div class="muted small">${esc(todo)}</div>`}</div></li>`).join('')}
      </ul></div>`;
  }

  function render() {
    const tab = TABS[state.tab];
    $('#tab-title').textContent = tab.title;
    document.querySelectorAll('.tab').forEach((b) => b.classList.toggle('active', b.dataset.tab === state.tab));
    const scroll = window.scrollY;
    if (state.tab === 'dashboard') {
      $('#editor').innerHTML = dashboardHtml();
    } else {
      $('#editor').innerHTML = tab.groups.map((g) => `
        <section class="group"><h2>${esc(g.title)}</h2>${g.note ? `<p class="note">${esc(g.note)}</p>` : ''}
          ${g.fields.map((f) => (f.type === 'list' ? listHtml(f) : fieldHtml(f, f.path, get(state.content, f.path) ?? ''))).join('')}
        </section>`).join('');
    }
    window.scrollTo(0, scroll);
  }

  function renderTabs() {
    $('#tabs').innerHTML = Object.entries(TABS).map(([k, t]) => `<button type="button" class="tab" data-tab="${k}">${esc(t.title)}</button>`).join('');
  }

  /* ---------- events ---------- */
  function wireEditor() {
    $('#tabs').addEventListener('click', (e) => {
      const b = e.target.closest('.tab');
      if (!b) return;
      state.tab = b.dataset.tab;
      render();
      window.scrollTo(0, 0);
    });

    $('#editor').addEventListener('input', (e) => {
      const el = e.target;
      if (!el.dataset.path) return;
      set(state.content, el.dataset.path, el.dataset.type === 'bool' ? el.checked : el.value);
      markDirty();
    });
    // Re-render when a toggle or a list title changes, so headers/pills stay accurate.
    $('#editor').addEventListener('change', async (e) => {
      const el = e.target;
      if (el.dataset.upload) { await uploadImage(el); return; }
      if (el.dataset.type === 'bool' || el.tagName === 'SELECT' || /\.(title|version|name)$/.test(el.dataset.path || '')) render();
    });

    $('#editor').addEventListener('click', (e) => {
      const add = e.target.closest('[data-add]');
      const rem = e.target.closest('[data-remove]');
      const mov = e.target.closest('[data-move]');
      const clr = e.target.closest('[data-clear]');
      if (add) {
        const f = findListField(add.dataset.add);
        const list = get(state.content, f.path) || [];
        const blank = JSON.parse(JSON.stringify(f.blank));
        f.addTop ? list.unshift(blank) : list.push(blank);
        set(state.content, f.path, list);
        markDirty(); render();
      } else if (rem) {
        const list = get(state.content, rem.dataset.remove);
        if (!confirm('Remove this item?')) return;
        list.splice(Number(rem.dataset.i), 1);
        markDirty(); render();
      } else if (mov) {
        const list = get(state.content, mov.dataset.move);
        const i = Number(mov.dataset.i), j = i + Number(mov.dataset.d);
        if (j < 0 || j >= list.length) return;
        [list[i], list[j]] = [list[j], list[i]];
        markDirty(); render();
      } else if (clr) {
        set(state.content, clr.dataset.clear, '');
        markDirty(); render();
      }
    });

    $('#save').addEventListener('click', save);
    $('#logout').addEventListener('click', () => {
      if (state.dirty && !confirm('You have unsaved changes. Sign out anyway?')) return;
      sessionStorage.removeItem(STORE_KEY);
      localStorage.removeItem(STORE_KEY);
      state.dirty = false;
      location.reload();
    });
  }

  function findListField(path) {
    for (const t of Object.values(TABS)) for (const g of t.groups || []) for (const f of g.fields) if (f.type === 'list' && f.path === path) return f;
    return null;
  }

  async function uploadImage(input) {
    const file = input.files && input.files[0];
    if (!file) return;
    const ext = IMAGE_TYPES[file.type];
    if (!ext) { status('Please choose a PNG, JPG, WEBP or GIF image.', 'err'); return; }
    if (file.size > MAX_IMAGE_MB * 1024 * 1024) { status(`That image is larger than ${MAX_IMAGE_MB} MB. Please resize or compress it first.`, 'err'); return; }
    const fieldPath = input.dataset.upload;
    const slug = fieldPath.replace(/\.\d+\./g, '-').replace(/[^a-z0-9]+/gi, '-').toLowerCase().replace(/^-|-$/g, '');
    const rand = Array.from(crypto.getRandomValues(new Uint8Array(4)), (b) => b.toString(16).padStart(2, '0')).join('');
    const sitePath = `assets/uploads/${slug}-${rand}.${ext}`;
    status('Uploading image…', 'info');
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      await putFile(sitePath, bytesToB64(bytes), `Upload image: ${sitePath}`);
      state.previews[sitePath] = URL.createObjectURL(file);
      set(state.content, fieldPath, sitePath);
      markDirty();
      render();
      status('Image uploaded. Press "Save & publish" to use it on the website.', 'ok');
    } catch (err) {
      status('Image upload failed: ' + err.message, 'err');
    }
  }

  async function save() {
    $('#save').disabled = true;
    const json = JSON.stringify(state.content, null, 2) + '\n';
    if (LOCAL) {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
      a.download = 'content.json';
      a.click();
      markDirty(false);
      status('Local mode: content.json downloaded. Replace data/content.json with it.', 'ok');
      return;
    }
    status('Saving…', 'info');
    try {
      const latest = await readContentFile();
      if (latest.sha !== state.sha && !confirm('The content was changed somewhere else since you opened the admin. Overwrite it with your version?')) {
        $('#save').disabled = false;
        status('Save cancelled. Reload the page to get the latest content.', 'info');
        return;
      }
      const res = await putFile('data/content.json', bytesToB64(new TextEncoder().encode(json)), 'Update website content', latest.sha);
      state.sha = res.content.sha;
      markDirty(false);
      status('Saved! GitHub Pages will publish the changes in about 1–2 minutes.', 'ok');
    } catch (err) {
      $('#save').disabled = false;
      status('Save failed: ' + err.message + (err.status === 403 || err.status === 404 ? ' (Check that your token has Contents: Read and write for this repository.)' : ''), 'err');
    }
  }

  /* ---------- connect / start ---------- */
  async function start(conn) {
    state.conn = conn;
    $('#loading').hidden = false;
    try {
      if (LOCAL) {
        const res = await fetch('../data/content.json?v=' + Date.now());
        state.content = await res.json();
      } else {
        const repo = await gh('GET', `/repos/${encodeURIComponent(conn.owner)}/${encodeURIComponent(conn.repo)}`);
        if (!repo.permissions || !repo.permissions.push) throw new Error('This token cannot write to the repository.');
        const file = await readContentFile();
        state.content = file.json;
        state.sha = file.sha;
      }
    } catch (err) {
      $('#loading').hidden = true;
      sessionStorage.removeItem(STORE_KEY);
      localStorage.removeItem(STORE_KEY);
      showConnect(err.status === 401 ? 'The token is invalid or expired.'
        : err.status === 404 ? 'Repository or data/content.json not found. Check the owner, repository, branch and website folder.'
        : err.message);
      return;
    }
    $('#repo-label').textContent = LOCAL ? 'Local test mode — saving downloads content.json' : `${conn.owner}/${conn.repo} · ${conn.branch}${conn.folder ? ' · /' + conn.folder : ''}`;
    $('#connect').hidden = true;
    $('#app').hidden = false;
    $('#loading').hidden = true;
    renderTabs();
    render();
  }

  function showConnect(error) {
    $('#connect').hidden = false;
    $('#app').hidden = true;
    $('#loading').hidden = true;
    $('#connect-error').textContent = error || '';
  }

  function init() {
    wireEditor();
    $('#connect-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const conn = {
        owner: String(fd.get('owner')).trim(), repo: String(fd.get('repo')).trim(),
        branch: String(fd.get('branch')).trim() || 'main', folder: String(fd.get('folder')).trim(),
        token: String(fd.get('token')).trim(),
      };
      (fd.get('remember') ? localStorage : sessionStorage).setItem(STORE_KEY, JSON.stringify(conn));
      start(conn);
    });
    if (LOCAL) { start({ owner: 'local', repo: 'test', branch: 'main', folder: '', token: '' }); return; }
    const saved = sessionStorage.getItem(STORE_KEY) || localStorage.getItem(STORE_KEY);
    if (saved) {
      try { start(JSON.parse(saved)); return; } catch (_) { /* fall through */ }
    }
    showConnect();
  }

  init();
})();
