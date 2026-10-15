# Hardboard

Hardboard is a browser-based resume editor with a Harvard-style layout. Fill in
your details, organize sections, preview the page and use your browser's print
dialog to save a PDF.

Built by **Uriel Ezequiel Ortiz Rosales** with HTML, CSS and plain JavaScript.
The frontend has no package dependencies or build step.

## Status

The frontend includes:

- Live resume preview and automatic saving in the current browser.
- Spanish and English interface text, with light and dark themes.
- Profile, education and experience sections, plus optional skills, projects,
  courses and custom sections.
- Section ordering, editable entries and Arial, Times or Georgia resume fonts.
- Print styles for PDF output through the browser's **Save as PDF** option.

The donations backend is **not implemented**. The repository contains its proposed
API contract and a disabled frontend client; the donation button does not process
payments. There are no accounts, cloud synchronization or server-side PDF exports.
Hardboard is not affiliated with Harvard University.

## Run locally

Download or clone this repository and open `index.html` in a modern browser.
The app uses classic scripts rather than JavaScript modules, so it can run from
local files. Browser storage behavior for local files can vary; a local HTTP
server gives you a consistent origin:

```sh
python -m http.server 5500 --bind 127.0.0.1
```

Open `http://127.0.0.1:5500`. Python is optional and is only used here as a static
file server. There is no installation or build command for the frontend.

To export a resume, open the editor, choose **Download PDF**, then select
**Save as PDF** in the browser's print dialog. Review the print preview; print styles remove
browser headers and footers.

## Project layout

```text
index.html                 Landing page and sample resume
editor.html                Resume editor
assets/css/base/           Design tokens and reset
assets/css/components/     Shared interface and resume styles
assets/css/pages/          Landing and editor layouts
assets/css/print.css        Print output
assets/js/core/            Storage, preferences, translations and utilities
assets/js/i18n/            Spanish and English dictionaries
assets/js/data/            Resume model and example data
assets/js/components/      Shared renderer, controls and preview scaling
assets/js/pages/           Landing and editor behavior
assets/js/services/        Disabled donations integration
backend/                  Backend scaffold and draft API documentation
```

JavaScript files share the `HB` namespace. Their loading order is defined at the
end of each HTML page. The landing page and editor use the same resume renderer.
CSS is separated into tokens, base rules, components and page-specific styles.

## Study the code

| Area | Starting point |
| --- | --- |
| Resume data structure | `assets/js/data/cv-model.js` |
| Resume HTML rendering | `assets/js/components/cv-renderer.js` |
| Editor state and persistence | `assets/js/pages/editor/store.js` |
| Form fields and actions | `assets/js/pages/editor/editor-view.js`, `actions.js` |
| Theme and language | `assets/js/core/preferences.js`, `assets/js/i18n/` |
| Colors and spacing | `assets/css/base/tokens.css` |
| Proposed donations API | [backend/docs/donations-api.md](backend/docs/donations-api.md) |

The existing source comments are mostly in Spanish. Interface translations are
separate from the resume content: switching the interface language does not
translate a resume you have written.

## Data and privacy

Resume edits are stored in `localStorage` under `hardvard-cv-v1`. The historical
key spelling is intentional. Theme and language use `hardboard-prefs`.
The current editor does not send resume data to a backend.

Storage is local to the browser and origin, not encrypted or backed up by
Hardboard. Clearing site data, switching browsers or using private browsing can
remove or isolate saved work. Avoid entering sensitive data on shared devices.
The app continues without persistence when storage is unavailable.

The pages request Geist fonts from Google Fonts, so loading the page is not
network-free. Without those requests, the CSS falls back to local fonts.
Sample contact addresses use reserved example domains.

## Development

Keep changes focused and preserve the script loading order. Before proposing a
change, test both pages, both languages and themes, editing and reloading a
resume, section controls, a narrow viewport and print preview.

Repository CI checks JavaScript syntax. It is not a substitute for browser tests.
See [CONTRIBUTING.md](CONTRIBUTING.md) for the contribution workflow and
[SECURITY.md](SECURITY.md) for private vulnerability reporting.

## License and ownership

Copyright (c) 2026 Uriel Ezequiel Ortiz Rosales.

Hardboard is licensed under the
[PolyForm Noncommercial License 1.0.0](LICENSE). You may read, study, run,
modify and redistribute the code for any noncommercial purpose, such as personal
study, research and hobby projects. You may not use it to make money or sell it.
Commercial use requires the author's written permission.

This is a source-available license, not an OSI-approved open-source license.
Keep the license text and the `Required Notice` line when you share copies. Your
resume data remains yours, and you may share resumes you generate, including for
job applications. Read the license for the complete terms; this summary does not
replace it.

Versions published before this license change were released under the earlier
Hardboard Study License; copies obtained under those terms keep them.
