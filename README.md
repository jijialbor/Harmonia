# JPHON Harmonia — Website

The official website for **Harmonia**, the free number chart app for worship teams by JPHON.
Built the same way as the FLOW Presenter website: a static site in `docs/` for GitHub Pages,
with all text, features, downloads and donation details editable from the Admin panel.

## Pages
- `docs/index.html` — Home (hero, how it works, features, mission, support)
- `docs/tutorial.html` — YouTube video tutorials
- `docs/download.html` — Latest APK, requirements, install steps, version history
- `docs/about.html` — The story behind Harmonia
- `docs/donate.html` — GCash, Maya and bank transfer
- `docs/admin/` — Admin panel (edits `docs/data/content.json` through the GitHub API)

## Publish on GitHub Pages
1. Push this folder to `jijialbor/Harmonia` (so `docs/` is at the repo root).
2. Repository → Settings → Pages → Source: **Deploy from a branch**, Branch: `main`, Folder: `/docs`.
3. The site goes live at `https://jijialbor.github.io/Harmonia/`.

## Edit content
Open `https://jijialbor.github.io/Harmonia/admin/` and connect with a fine-grained GitHub token
that has **Contents: Read and write** on the Harmonia repo only.

## Still to do
- Upload the APK (GitHub Releases or Google Drive) and paste its link in Admin → Download → Releases.
- Upload real phone screenshots in Admin → General & images (until then an illustrated chart is shown).
- Add tutorial videos, and a contact email or Facebook page for feedback.

## Preview locally
From the `docs/` folder run `python -m http.server 8000`, then open http://localhost:8000.
