/* JPHON Harmonia website — renders every page from data/content.json.
 * Edit content through the Admin panel (admin/), not in this file. */
(function () {
  'use strict';

  /* ---------- helpers ---------- */
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  const filled = (s) => String(s ?? '').trim() !== '';
  const lines = (s) => String(s ?? '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const paras = (s, cls) => {
    const t = String(s ?? '').trim();
    if (!t) return '';
    const a = cls ? ` class="${esc(cls)}"` : '';
    return t.split(/\r?\n\s*\r?\n/).map((b) => `<p${a}>${esc(b.trim()).replace(/\r?\n/g, '<br>')}</p>`).join('');
  };
  const safeUrl = (u) => (/^https?:\/\//i.test(String(u ?? '').trim()) ? String(u).trim() : '');
  // Uploaded/local images: only allow relative paths inside assets/.
  const asset = (p) => (/^assets\/[\w\-./]+$/.test(String(p ?? '')) && !String(p).includes('..') ? String(p) : '');
  const ytId = (link) => {
    const m = String(link ?? '').match(/(?:youtube(?:-nocookie)?\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/|v\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
    return m ? m[1] : '';
  };
  const fmtDate = (d) => {
    if (!filled(d)) return '';
    const dt = new Date(String(d) + 'T00:00:00');
    return isNaN(dt) ? String(d) : dt.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  const ICONS = {
    lyrics: '<path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/>',
    bible: '<path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v18H6.5A2.5 2.5 0 0 0 4 22.5z"/><path d="M4 4.5v18"/><path d="M12 6v8M9 9h6"/>',
    slides: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M7 20h10M12 16v4"/>',
    image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-5-5L5 21"/>',
    video: '<rect x="2" y="5" width="14" height="14" rx="2"/><path d="m16 10 6-3v10l-6-3z"/>',
    theme: '<circle cx="12" cy="12" r="9"/><circle cx="8" cy="10" r="1.2"/><circle cx="12" cy="7.5" r="1.2"/><circle cx="16" cy="10" r="1.2"/><path d="M12 21a3 3 0 0 1 0-6h1.5a2.5 2.5 0 0 0 0-5"/>',
    audience: '<rect x="2" y="3" width="20" height="13" rx="2"/><path d="M8 21h8M12 16v5"/><path d="M7 9h10M9 12h6"/>',
    stage: '<rect x="3" y="4" width="18" height="11" rx="2"/><path d="M5 20l3-5M19 20l-3-5"/><path d="M7 8h6M7 11h10"/>',
    timer: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2.5M9 2h6"/>',
    service: '<path d="M9 6h12M9 12h12M9 18h12"/><circle cx="4.5" cy="6" r="1.5"/><circle cx="4.5" cy="12" r="1.5"/><circle cx="4.5" cy="18" r="1.5"/>',
    star: '<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1 6.2-5.5-2.9-5.5 2.9 1-6.2L3 9.6l6.2-.9z"/>',
    heart: '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8z"/>',
    church: '<path d="M12 2v4M10 4h4M6 22V11l6-5 6 5v11"/><path d="M3 22h18M10 22v-5a2 2 0 0 1 4 0v5"/>',
    easy: '<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>',
    gift: '<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13M19 12v9H5v-9"/><path d="M7.5 8a2.5 2.5 0 0 1 0-5C11 3 12 8 12 8s1-5 4.5-5a2.5 2.5 0 0 1 0 5"/>',
    download: '<path d="M12 3v12M7 10l5 5 5-5M4 21h16"/>',
    play: '<path d="m8 5 11 7-11 7z"/>',
    copy: '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>',
    close: '<path d="M6 6l12 12M18 6 6 18"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    check: '<path d="m5 12 5 5 9-10"/>',
    numbers: '<rect x="3" y="4" width="18" height="16" rx="3"/><path d="M8 9.5 9.5 8v8M13.5 9a1.8 1.8 0 0 1 3.4.8c0 1.6-3.4 3.2-3.4 6.2h3.6"/>',
    sync: '<rect x="2" y="5" width="7.5" height="14" rx="1.8"/><rect x="14.5" y="5" width="7.5" height="14" rx="1.8"/><path d="M11 10h2.5M11 14h2.5"/><path d="m12.5 8.5 1.5 1.5-1.5 1.5M11.5 12.5 10 14l1.5 1.5"/>',
    key: '<path d="M4 7h11M4 12h16M4 17h8"/><path d="m17 4 3 3-3 3"/><path d="m15 14 3 3-3 3"/>',
    playlist: '<path d="M3 6h12M3 11h12M3 16h7"/><path d="M18 8v9"/><circle cx="16" cy="17" r="2"/><path d="M18 8l3-1"/>',
    tuner: '<path d="M4 18a8 8 0 1 1 16 0"/><path d="M12 18l4-6"/><path d="M12 6v1.5M6.3 8.3l1 1M17.7 8.3l-1 1"/>',
    metronome: '<path d="M9 3h6l4 18H5z"/><path d="M12 17 16.5 7"/><path d="M8 17h8"/>',
    family: '<rect x="2.5" y="4" width="19" height="16" rx="2"/><path d="M7 4v10M12 4v10M17 4v10"/><path d="M5.5 4v6h3V4M10.5 4v6h3V4M15.5 4v6h3V4" fill="currentColor" stroke="none"/>',
    guide: '<path d="M2 5.5C4.5 4 8 4 12 6c4-2 7.5-2 10-.5V19c-2.5-1.5-6-1.5-10 .5-4-2-7.5-2-10-.5z"/><path d="M12 6v13.5"/>',
    voice: '<path d="M11 5 6 9H3v6h3l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/>',
    instruments: '<path d="M14 3c3 0 3 3 3 3l-5.5 5.5"/><path d="M9.5 11.5c-2-.5-4.5.5-5.5 2.5s-.5 5 1.5 6 5 .5 6-1.5 1.5-4 .5-5.5z"/><circle cx="8.3" cy="15.7" r="1.2"/><path d="m16 4 4 4"/>',
    offline: '<path d="M5 12.5a10 10 0 0 1 14 0M8.5 16a5 5 0 0 1 7 0"/><circle cx="12" cy="19.5" r="1"/><path d="M2 8.8a15 15 0 0 1 20 0"/>',
    team: '<circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><circle cx="17.5" cy="9" r="2.4"/><path d="M16 14.2c3 .2 5 2.6 5 5.8"/>',
    qr: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3h-3zM20 14v.01M17 20h4v-3M14 20v.01"/>',
    android: '<path d="M5 10h14v8a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2z"/><path d="M5 10a7 7 0 0 1 14 0"/><path d="M8 4.5 6.8 2.8M16 4.5l1.2-1.7"/><circle cx="9.5" cy="7.5" r=".6" fill="currentColor"/><circle cx="14.5" cy="7.5" r=".6" fill="currentColor"/><path d="M2.5 11.5v5M21.5 11.5v5"/>',
    windows: '<path d="M3 5.5 10.5 4.5v7H3zM12.5 4.2 21 3v8.5h-8.5zM3 12.5h7.5v7L3 18.5zM12.5 12.5H21V21l-8.5-1.2z"/>',
    apple: '<path d="M16.5 12.6c0-2.3 1.9-3.4 2-3.5-1.1-1.6-2.8-1.8-3.4-1.8-1.4-.1-2.8.9-3.5.9s-1.9-.9-3.1-.8c-1.6 0-3 .9-3.8 2.3-1.6 2.8-.4 7 1.2 9.3.8 1.1 1.7 2.4 2.9 2.3 1.2 0 1.6-.7 3-.7s1.8.7 3 .7c1.3 0 2.1-1.1 2.8-2.3.9-1.3 1.3-2.6 1.3-2.7 0 0-2.4-.9-2.4-3.7zM14.2 5.6c.6-.8 1.1-1.9 1-3-.9 0-2.1.6-2.7 1.4-.6.7-1.1 1.8-1 2.9 1 .1 2.1-.5 2.7-1.3z"/>',
  };
  const icon = (name, cls = 'icon') =>
    `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ICONS.star}</svg>`;

  const latestRelease = (c) => (c.download.releases || []).find((r) => filled(r.version)) || null;
  const releaseLink = (r) => safeUrl(r.url) || asset(r.file);

  const pageHero = (eyebrow, title, lead, warm) => `
    <section class="page-hero">
      <div class="hero-glow${warm ? ' warm' : ''}" aria-hidden="true"></div>
      <div class="container narrow reveal">
        <p class="eyebrow">${esc(eyebrow)}</p>
        <h1 class="h1">${esc(title)}</h1>
        <p class="lead">${esc(lead)}</p>
      </div>
    </section>`;

  /* ---------- pages ---------- */
  const pages = {
    home(c) {
      const h = c.home;
      const rel = latestRelease(c);
      const feats = (c.features || []).filter((f) => f.published && filled(f.title));
      const hero = asset(c.images.hero);
      const hero2 = asset(c.images.hero_2);
      const cell = (ch, n, on) => `<span class="app-cell${on ? ' on' : ''}"><em>${ch}</em><b${String(n).length > 2 ? ' class="long"' : ''}>${n}</b></span>`;
      const ui = (role) => `
        <div class="app-ui" role="img" aria-label="Illustration of a Harmonia number chart on a phone">
          <div class="app-top"><div><b>Amazing Grace</b><small>Key of G · 72 BPM</small></div>
            <span class="app-badge${role === 'host' ? ' host' : ''}">${role === 'host' ? 'Hosting' : 'Live'}</span></div>
          <div class="app-sec">Verse 1</div>
          <div class="app-row">${cell('G', 1, role !== 'host')}${cell('C', 4)}${cell('G', 1)}${cell('D', 5)}</div>
          <div class="app-row">${cell('G', 1)}${cell('Em', 6)}${cell('D', 5)}${cell('G', 1)}</div>
          <div class="app-sec">Chorus</div>
          <div class="app-row">${cell('C', 4)}${cell('G', 1)}${cell('Em', 6)}${cell('D', 5)}</div>
          <div class="app-row">${cell('C', 4)}${cell('G', 1)}${cell('D', 5)}${cell('G', 1)}</div>
          <div class="app-sec opt">Bridge</div>
          <div class="app-row opt">${cell('Em', 6)}${cell('C', 4)}${cell('G', 1)}${cell('D', 5)}</div>
          <div class="app-row opt">${cell('Em', 6)}${cell('C', 4)}${cell('D/F#', '5/7')}${cell('G', 1)}</div>
          <div class="app-beat opt"><i class="on"></i><i></i><i></i><i></i></div>
          <div class="app-nav"><span>Songs</span><span class="on">Chart</span><span>Tuner</span><span>Team</span><span>Menu</span></div>
        </div>`;
      const screen = (img, role, alt) => (img ? `<img src="${esc(img)}" alt="${esc(alt)}">` : ui(role));
      const hIcons = ['numbers', 'sync', 'gift'];
      return `
      <section class="hero">
        <div class="hero-glow" aria-hidden="true"></div>
        <div class="container hero-grid">
          <div class="hero-copy reveal">
            <p class="eyebrow">${esc(c.site.tagline)}${rel ? ' · v' + esc(rel.version) : ''}</p>
            <h1 class="display">${esc(h.hero_title)}</h1>
            <p class="lead">${esc(h.hero_subtitle)}</p>
            ${paras(h.hero_description, 'hero-desc')}
            <div class="btn-row">
              <a class="btn btn-primary" href="download.html">${icon('download', 'icon icon-sm')}${esc(h.cta_download)}</a>
              <a class="btn btn-ghost" href="donate.html">${icon('heart', 'icon icon-sm')}${esc(h.cta_support)}</a>
            </div>
            <p class="hero-note">${esc(h.hero_note)}</p>
          </div>
          <div class="hero-visual reveal">
            <div class="phones">
              <div class="phone back"><div class="phone-screen">${screen(hero, 'host', c.site.name + ' on the main phone')}</div></div>
              <div class="phone front"><div class="phone-screen">${screen(hero2, 'member', c.site.name + ' on a team phone')}</div></div>
              <span class="sync-pill"><i></i>Same chart, same moment</span>
            </div>
          </div>
        </div>
        <div class="container">
          <div class="story-card reveal">${icon('heart', 'icon story-icon')}<div>${paras(h.hero_story)}</div></div>
        </div>
      </section>

      <section class="section">
        <div class="container">
          <div class="split reveal">
            <h2 class="h2">${esc(h.about_title)}</h2>
            <div class="prose">${paras(h.about_text)}</div>
          </div>
          <div class="cards cards-3">
            ${(h.highlights || []).map((x, i) => `
              <article class="card reveal">
                <div class="card-icon">${icon(hIcons[i % 3])}</div>
                <h3 class="h3">${esc(x.title)}</h3>
                <p class="muted">${esc(x.text)}</p>
              </article>`).join('')}
          </div>
        </div>
      </section>

      ${(h.steps || []).filter((s) => filled(s.title)).length ? `
      <section class="section pt-0" id="how-it-works">
        <div class="container">
          <div class="section-head reveal">
            <p class="eyebrow">How it works</p>
            <h2 class="h2">${esc(h.steps_title)}</h2>
          </div>
          <ol class="how-steps">
            ${h.steps.filter((s) => filled(s.title)).map((s, i) => `
              <li class="how-step reveal">
                <span class="how-num">${i + 1}</span>
                <div class="card-icon">${icon(s.icon)}</div>
                <h3 class="h4">${esc(s.title)}</h3>
                <p class="muted small">${esc(s.text)}</p>
              </li>`).join('')}
          </ol>
          ${filled(h.steps_note) ? `<p class="center muted small mt reveal">${esc(h.steps_note)}</p>` : ''}
        </div>
      </section>` : ''}

      ${feats.length ? `
      <section class="section section-alt" id="features">
        <div class="container">
          <div class="section-head reveal">
            <p class="eyebrow">What can ${esc(c.site.name)} do?</p>
            <h2 class="h2">${esc(h.features_title)}</h2>
          </div>
          <div class="feature-grid">
            ${feats.map((f) => {
              const shot = asset(f.image);
              return `
              <article class="feature reveal${shot ? ' has-shot' : ''}">
                ${shot ? `<img class="feature-shot" src="${esc(shot)}" alt="${esc(f.title)} screenshot" loading="lazy">` : ''}
                <div class="feature-body">
                  <div class="card-icon">${icon(f.icon)}</div>
                  <h3 class="h3">${esc(f.title)}</h3>
                  <p class="muted">${esc(f.text)}</p>
                </div>
              </article>`;
            }).join('')}
          </div>
          <div class="center reveal">
            <a class="btn btn-ghost" href="tutorial.html">${esc(h.features_cta)}${icon('arrow', 'icon icon-sm')}</a>
          </div>
        </div>
      </section>` : ''}

      <section class="section">
        <div class="container">
          <div class="section-head reveal">
            <p class="eyebrow">Our mission</p>
            <h2 class="h2">${esc(h.mission_title)}</h2>
          </div>
          <div class="mv-grid">
            <article class="mv reveal"><h3 class="label">Mission</h3><p>${esc(c.mission.mission)}</p></article>
            <article class="mv reveal"><h3 class="label">Vision</h3><p>${esc(c.mission.vision)}</p></article>
          </div>
          <div class="values">
            ${(c.mission.values || []).map((v) => `
              <div class="value reveal"><h3 class="h4">${esc(v.title)}</h3><p class="muted small">${esc(v.text)}</p></div>`).join('')}
          </div>
        </div>
      </section>

      <section class="section">
        <div class="container">
          <div class="support reveal">
            <p class="eyebrow">Support the project</p>
            <h2 class="h2">${esc(c.support.title)}</h2>
            <div class="prose">${paras(c.support.text)}</div>
            <div class="btn-row"><a class="btn btn-primary" href="donate.html">${icon('heart', 'icon icon-sm')}${esc(c.support.cta)}</a></div>
            <p class="hero-note">${esc(c.support.note)}</p>
          </div>
        </div>
      </section>`;
    },

    tutorial(c) {
      const t = c.tutorials;
      const order = (t.categories || []).map((x) => x.name);
      const items = (t.items || [])
        .map((it) => ({ ...it, vid: ytId(it.youtube) }))
        .filter((it) => it.published && it.vid && filled(it.title));
      const cats = [...new Set(items.map((i) => i.category).filter(Boolean))]
        .sort((a, b) => (order.indexOf(a) + 1 || 99) - (order.indexOf(b) + 1 || 99));
      let body;
      if (items.length) {
        body = `
          ${cats.length > 1 ? `<div class="chips" role="group" aria-label="Filter tutorials by topic">
            <button class="chip is-active" type="button" data-filter="all">All</button>
            ${cats.map((x) => `<button class="chip" type="button" data-filter="${esc(x)}">${esc(x)}</button>`).join('')}
          </div>` : ''}
          <div class="video-grid">
            ${items.map((it) => `
              <article class="video-card reveal" data-category="${esc(it.category)}">
                <button class="video-thumb" type="button" data-video="${esc(it.vid)}" aria-label="Play: ${esc(it.title)}">
                  <img src="https://i.ytimg.com/vi/${esc(it.vid)}/hqdefault.jpg" alt="" loading="lazy">
                  <span class="play">${icon('play')}</span>
                </button>
                <div class="video-body">
                  ${filled(it.category) ? `<p class="tag">${esc(it.category)}</p>` : ''}
                  <h2 class="h4">${esc(it.title)}</h2>
                  <p class="muted small">${esc(it.description)}</p>
                </div>
              </article>`).join('')}
          </div>`;
      } else {
        body = `
          <div class="empty reveal">
            ${icon('play', 'icon empty-icon')}
            <h2 class="h3">Video tutorials are being prepared.</h2>
            <p class="muted">New guides will appear here as they are published. These are the topics planned for the library:</p>
            <ul class="topic-list">${order.filter(filled).map((n) => `<li>${esc(n)}</li>`).join('')}</ul>
          </div>`;
      }
      return `${pageHero('Tutorial library', t.title, t.intro)}
        <section class="section pt-0"><div class="container">${body}</div></section>
        <div class="modal" id="video-modal" hidden>
          <div class="modal-backdrop" data-close></div>
          <div class="modal-box" role="dialog" aria-modal="true" aria-label="Tutorial video">
            <button class="modal-close" type="button" data-close aria-label="Close video">${icon('close')}</button>
            <div class="modal-frame"></div>
          </div>
        </div>`;
    },

    download(c) {
      const d = c.download;
      const latest = latestRelease(c);
      const releases = (d.releases || []).filter((r) => filled(r.version));
      const req = lines(d.requirements);
      const steps = lines(d.install_steps);
      let main;
      if (latest) {
        const link = releaseLink(latest);
        main = `
          <p class="eyebrow">Latest version</p>
          <h2 class="version">v${esc(latest.version)}</h2>
          <dl class="meta">
            ${filled(latest.date) ? `<div><dt>Release date</dt><dd>${esc(fmtDate(latest.date))}</dd></div>` : ''}
            ${filled(latest.size) ? `<div><dt>File size</dt><dd>${esc(latest.size)}</dd></div>` : ''}
          </dl>
          ${link ? `<a class="btn btn-primary btn-lg" href="${esc(link)}" rel="noopener">${icon('download', 'icon icon-sm')}DOWNLOAD v${esc(latest.version)}</a>`
                 : `<p class="muted">The download file for this version is not available yet.</p>`}
          ${filled(d.platform_note) ? `<p class="platform-note small muted">${icon('android', 'icon icon-sm')}${esc(d.platform_note)}</p>` : ''}
          ${lines(latest.notes).length ? `<h3 class="h4 mt">What's new</h3>
            <ul class="check-list">${lines(latest.notes).map((n) => `<li>${icon('check', 'icon icon-sm')}${esc(n)}</li>`).join('')}</ul>` : ''}`;
      } else {
        main = `
          <p class="eyebrow">Coming soon</p>
          <h2 class="h3">The first public release is being prepared.</h2>
          <p class="muted">Please check back soon. When it is ready, the download button, version details and release notes will appear here.</p>`;
      }
      return `${pageHero('Download', d.title, d.description)}
      <section class="section pt-0"><div class="container">
        <div class="notice reveal">${icon('gift')}<p>${esc(d.notice)}</p></div>
        <div class="download-grid">
          <article class="download-card reveal">${main}</article>
          <div class="download-side">
            ${filled(d.ios_note) ? `<article class="card platform-card reveal">${icon('apple')}<div><h2 class="h4">iPhone <em class="badge badge-soft">Coming soon</em></h2><p class="small muted">${esc(d.ios_note)}</p></div></article>` : ''}
            ${req.length ? `<article class="card reveal"><h2 class="h4">System requirements</h2><ul class="plain-list">${req.map((r) => `<li>${esc(r)}</li>`).join('')}</ul></article>` : ''}
            ${steps.length ? `<article class="card reveal"><h2 class="h4">Installation instructions</h2><ol class="steps">${steps.map((s) => `<li>${esc(s)}</li>`).join('')}</ol>
              <p class="small muted mt">Need help? See the <a href="tutorial.html">tutorials</a>.</p></article>` : ''}
          </div>
        </div>
        ${releases.length ? `<div class="history reveal"><h2 class="h3">Version history</h2>
          ${releases.map((r, i) => {
            const rl = releaseLink(r);
            return `<details class="release"${i === 0 ? ' open' : ''}>
              <summary><span class="release-v">v${esc(r.version)}${i === 0 ? ' <em class="badge">Latest</em>' : ''}</span>
              <span class="muted small">${esc(fmtDate(r.date))}${filled(r.size) ? ' · ' + esc(r.size) : ''}</span></summary>
              ${lines(r.notes).length ? `<ul class="plain-list">${lines(r.notes).map((n) => `<li>${esc(n)}</li>`).join('')}</ul>` : ''}
              ${rl && i > 0 ? `<a class="small" href="${esc(rl)}" rel="noopener">Download v${esc(r.version)}</a>` : ''}
            </details>`;
          }).join('')}</div>` : ''}
      </div></section>`;
    },

    about(c) {
      const a = c.about, s = c.site;
      const jphon = safeUrl(s.jphon_url), fb = safeUrl(s.facebook_url);
      const probs = lines(a.problems);
      const block = (title, text) => (filled(text) ? `<div class="block reveal"><h2 class="h3">${title}</h2><div class="prose">${paras(text)}</div></div>` : '');
      return `${pageHero('About', a.title, a.intro)}
      <section class="section pt-0"><div class="container narrow">
        ${block('The story behind the project', a.story)}
        ${block('Why the software was developed', a.why)}
        ${probs.length ? `<div class="block reveal"><h2 class="h3">The problems it aims to solve</h2>
          <ul class="check-list">${probs.map((p) => `<li>${icon('check', 'icon icon-sm')}${esc(p)}</li>`).join('')}</ul></div>` : ''}
      </div></section>
      <section class="section section-alt"><div class="container">
        <div class="mv-grid">
          <article class="mv reveal"><h2 class="label">Mission</h2><p>${esc(c.mission.mission)}</p></article>
          <article class="mv reveal"><h2 class="label">Vision</h2><p>${esc(c.mission.vision)}</p></article>
        </div>
        <div class="cards cards-2 mt-lg">
          ${filled(a.philosophy) ? `<article class="card reveal"><div class="card-icon">${icon('easy')}</div><h2 class="h4">Development philosophy</h2>${paras(a.philosophy, 'muted')}</article>` : ''}
          ${filled(a.future) ? `<article class="card reveal"><div class="card-icon">${icon('star')}</div><h2 class="h4">Future goals</h2>${paras(a.future, 'muted')}</article>` : ''}
        </div>
      </div></section>
      <section class="section"><div class="container narrow">
        <div class="dev-card reveal">
          <div class="dev-head">
            ${asset(c.images.logo) ? `<img class="logo-img lg" src="${esc(asset(c.images.logo))}" alt="">` : ''}
            <div><p class="eyebrow">The developer</p><h2 class="h3">An independent project by ${esc(s.developer)}</h2></div>
          </div>
          <div class="prose">${paras(a.developer_text)}</div>
          <div class="btn-row">
            ${jphon ? `<a class="btn btn-ghost" href="${esc(jphon)}" target="_blank" rel="noopener">Visit the official ${esc(s.developer)} page${icon('arrow', 'icon icon-sm')}</a>` : ''}
            ${filled(s.contact_email) ? `<a class="btn btn-ghost" href="mailto:${esc(s.contact_email)}?subject=${encodeURIComponent(s.name + ' feedback')}">Report a bug or suggest a feature</a>` : ''}
            ${fb ? `<a class="btn btn-ghost" href="${esc(fb)}" target="_blank" rel="noopener">Message on Facebook</a>` : ''}
          </div>
        </div>
      </div></section>`;
    },

    donate(c) {
      const d = c.donate;
      const wallets = [['gcash', 'GCash'], ['maya', 'Maya']]
        .map(([k, label]) => ({ k, label, ...d[k] }))
        .filter((m) => m.enabled && (filled(m.number) || asset(m.qr)));
      const bank = d.bank && d.bank.enabled && (filled(d.bank.number) || asset(d.bank.qr)) ? d.bank : null;
      const digits = (n) => String(n).replace(/\s+/g, '');
      const head = (logo, name) => `<div class="pay-head">${asset(logo) ? `<img class="pay-logo" src="${esc(asset(logo))}" alt="${esc(name)}">` : `<span class="pay-name">${esc(name)}</span>`}</div>`;
      const cards = wallets.map((m) => `
        <article class="pay-card pay-${m.k} reveal">
          ${head(m.logo, m.label)}
          ${asset(m.qr) ? `<img class="qr" src="${esc(asset(m.qr))}" alt="${esc(m.label)} QR code" loading="lazy">` : ''}
          <dl class="pay-details">
            ${filled(m.holder) ? `<div><dt>Account name</dt><dd>${esc(m.holder)}</dd></div>` : ''}
            ${filled(m.number) ? `<div><dt>Mobile number</dt><dd class="mono">${esc(m.number)}</dd></div>` : ''}
          </dl>
          ${filled(m.number) ? `<button class="btn btn-ghost btn-block copy-btn" type="button" data-copy="${esc(digits(m.number))}">${icon('copy', 'icon icon-sm')}<span>COPY NUMBER</span></button>` : `<p class="small muted scan-note">Scan with your ${esc(m.label)} or any InstaPay-enabled app.</p>`}
        </article>`).join('') + (bank ? `
        <article class="pay-card pay-bank reveal">
          ${head(bank.logo, 'Bank Transfer')}
          ${asset(bank.qr) ? `<img class="qr" src="${esc(asset(bank.qr))}" alt="${esc(bank.bank_name || 'Bank')} QR code" loading="lazy">` : ''}
          <dl class="pay-details">
            <div><dt>Method</dt><dd>Bank transfer</dd></div>
            ${filled(bank.bank_name) ? `<div><dt>Bank</dt><dd>${esc(bank.bank_name)}</dd></div>` : ''}
            ${filled(bank.holder) ? `<div><dt>Account name</dt><dd>${esc(bank.holder)}</dd></div>` : ''}
            ${filled(bank.number) ? `<div><dt>Account number</dt><dd class="mono">${esc(bank.number)}</dd></div>` : ''}
          </dl>
          ${filled(bank.number) ? `<button class="btn btn-ghost btn-block copy-btn" type="button" data-copy="${esc(digits(bank.number))}">${icon('copy', 'icon icon-sm')}<span>COPY ACCOUNT NUMBER</span></button>` : `<p class="small muted scan-note">Scan with your banking app or any InstaPay-enabled app.</p>`}
        </article>` : '');
      return `${pageHero('Donate', d.title, d.subtitle, true)}
      <section class="section pt-0"><div class="container narrow">
        <div class="letter reveal">${paras(d.message)}</div>
        <div class="notice reveal">${icon('info')}<p>${esc(c.support.note)}</p></div>
      </div></section>
      <section class="section pt-0" id="payment-methods"><div class="container">
        <h2 class="h2 center reveal">Ways to give</h2>
        ${cards ? `<div class="pay-grid">${cards}</div>` : `
          <div class="empty reveal">${icon('heart', 'icon empty-icon')}
            <h3 class="h3">Donation details will be posted here soon.</h3>
            <p class="muted">Thank you for your interest in supporting ${esc(c.site.name)}. Your prayers and encouragement already mean a lot.</p>
          </div>`}
        <div class="thanks reveal">${icon('heart')}<p>${esc(d.thanks)}</p></div>
      </div></section>
      <div class="toast" id="toast" role="status" aria-live="polite"></div>`;
    },
  };

  /* ---------- shared footer ---------- */
  function footer(c) {
    const s = c.site;
    const jphon = safeUrl(s.jphon_url), fb = safeUrl(s.facebook_url);
    const logo = asset(c.images.logo);
    return `<div class="container">
      <p class="footer-motto">${esc(s.motto)}</p>
      <div class="footer-grid">
        <div>
          <a class="brand" href="index.html">${logo ? `<img class="logo-img" src="${esc(logo)}" alt="">` : ''}<span class="brand-name">${esc(s.name)}</span></a>
          <p class="muted small">${esc(s.tagline)}. An independent project by ${esc(s.developer)}.</p>
        </div>
        <div><h3 class="footer-h">Explore</h3><ul class="footer-links">
          <li><a href="index.html">Home</a></li><li><a href="tutorial.html">Tutorials</a></li>
          <li><a href="download.html">Download</a></li><li><a href="about.html">About</a></li><li><a href="donate.html">Donate</a></li>
        </ul></div>
        <div><h3 class="footer-h">Connect</h3><ul class="footer-links">
          ${jphon ? `<li><a href="${esc(jphon)}" target="_blank" rel="noopener">Official ${esc(s.developer)} page</a></li>` : ''}
          ${fb ? `<li><a href="${esc(fb)}" target="_blank" rel="noopener">Facebook</a></li>` : ''}
          ${filled(s.contact_email) ? `<li><a href="mailto:${esc(s.contact_email)}">Send feedback</a></li>` : ''}
        </ul></div>
      </div>
      <p class="footer-bottom small muted">© ${new Date().getFullYear()} ${esc(s.name)} · ${esc(s.developer)}. Free to download. Free to use.</p>
    </div>`;
  }

  /* ---------- interactions ---------- */
  function wireNav() {
    const btn = document.querySelector('.nav-toggle');
    const menu = document.getElementById('nav-menu');
    if (!btn || !menu) return;
    btn.addEventListener('click', () => {
      const open = btn.getAttribute('aria-expanded') !== 'true';
      btn.setAttribute('aria-expanded', String(open));
      document.body.classList.toggle('menu-open', open);
    });
    const header = document.querySelector('.site-header');
    const onScroll = () => header.classList.toggle('scrolled', window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  function wireReveal() {
    const els = document.querySelectorAll('.reveal');
    if (!('IntersectionObserver' in window) || matchMedia('(prefers-reduced-motion: reduce)').matches) {
      els.forEach((el) => el.classList.add('in'));
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -40px 0px', threshold: 0.08 });
    els.forEach((el) => io.observe(el));
  }

  function toast(msg) {
    const t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => t.classList.remove('show'), 2200);
  }

  async function copyText(text) {
    try { await navigator.clipboard.writeText(text); return true; } catch (e) {
      const ta = document.createElement('textarea');
      ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      let ok = false; try { ok = document.execCommand('copy'); } catch (_) {}
      ta.remove(); return ok;
    }
  }

  function wireInteractions() {
    document.addEventListener('click', async (ev) => {
      const copyBtn = ev.target.closest('[data-copy]');
      if (copyBtn) {
        const ok = await copyText(copyBtn.dataset.copy);
        const label = copyBtn.querySelector('span');
        const old = label.textContent;
        label.textContent = ok ? 'COPIED!' : 'COPY FAILED';
        copyBtn.classList.toggle('copied', ok);
        toast(ok ? 'Copied to clipboard. Thank you!' : 'Could not copy. Please copy the number manually.');
        setTimeout(() => { label.textContent = old; copyBtn.classList.remove('copied'); }, 1800);
        return;
      }
      const chip = ev.target.closest('.chip[data-filter]');
      if (chip) {
        document.querySelectorAll('.chip').forEach((c) => c.classList.toggle('is-active', c === chip));
        const f = chip.dataset.filter;
        document.querySelectorAll('.video-card').forEach((card) => { card.hidden = f !== 'all' && card.dataset.category !== f; });
        return;
      }
      const vid = ev.target.closest('[data-video]');
      const modal = document.getElementById('video-modal');
      if (vid && modal) {
        const id = vid.dataset.video;
        if (!/^[A-Za-z0-9_-]{11}$/.test(id)) return;
        modal.querySelector('.modal-frame').innerHTML =
          `<iframe src="https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0" title="Tutorial video" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>`;
        modal.hidden = false;
        document.body.classList.add('modal-open');
        modal.querySelector('.modal-close').focus();
        return;
      }
      if (ev.target.closest('[data-close]') && modal) closeModal(modal);
    });
    document.addEventListener('keydown', (ev) => {
      const modal = document.getElementById('video-modal');
      if (ev.key === 'Escape' && modal && !modal.hidden) closeModal(modal);
    });
  }
  function closeModal(modal) {
    modal.hidden = true;
    modal.querySelector('.modal-frame').innerHTML = '';
    document.body.classList.remove('modal-open');
  }

  /* ---------- boot ---------- */
  async function boot() {
    wireNav();
    const main = document.getElementById('main');
    const page = document.body.dataset.page;
    let c;
    try {
      // Cache-buster so admin updates show up as soon as GitHub Pages has published them.
      const res = await fetch('data/content.json?v=' + Date.now(), { cache: 'no-store' });
      if (!res.ok) throw new Error(res.status);
      c = await res.json();
    } catch (e) {
      main.innerHTML = '<div class="container section"><p>Sorry, this page could not be loaded. Please refresh and try again.</p></div>';
      return;
    }
    const render = pages[page] || pages.home;
    main.innerHTML = render(c);
    document.getElementById('site-footer').innerHTML = footer(c);
    // Header brand follows the logo set in Admin.
    const logo = asset(c.images.logo);
    document.querySelectorAll('.site-header .logo-img').forEach((img) => { if (logo) img.src = logo; });
    document.querySelectorAll('.site-header .brand-name').forEach((el) => { el.textContent = c.site.name; });
    if (page === 'home') document.title = `${c.site.name} — ${c.site.developer} | ${c.site.tagline}`;
    const meta = document.querySelector('meta[name="description"]');
    if (meta && filled(c.site.meta_description)) meta.content = c.site.meta_description;
    wireReveal();
    wireInteractions();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
