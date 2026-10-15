# Deploying Hardboard to hardboard.xyz

The site is static and is published by GitHub Pages through
`.github/workflows/pages.yml` on every push to `main`. The `CNAME` file tells
GitHub the custom domain is `hardboard.xyz`.

## One-time setup

### 1. Enable Pages in GitHub

Repository **Settings → Pages → Build and deployment → Source: GitHub Actions**.

### 2. Add DNS records at your domain registrar

For the apex domain `hardboard.xyz`:

| Type  | Name | Value |
|-------|------|-------|
| A     | @    | 185.199.108.153 |
| A     | @    | 185.199.109.153 |
| A     | @    | 185.199.110.153 |
| A     | @    | 185.199.111.153 |
| AAAA  | @    | 2606:50c0:8000::153 |
| AAAA  | @    | 2606:50c0:8001::153 |
| AAAA  | @    | 2606:50c0:8002::153 |
| AAAA  | @    | 2606:50c0:8003::153 |
| CNAME | www  | urielortizv1000.github.io |

Remove any other A, AAAA or CNAME records for `@` and `www` (for example the
registrar's parking page). Confirm the current values in the
[GitHub docs](https://docs.github.com/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site).

### 3. Enable HTTPS

Repository **Settings → Pages → Custom domain**: enter `hardboard.xyz`, wait for
the DNS check to pass, then tick **Enforce HTTPS**. The certificate can take
from a few minutes up to an hour. `www.hardboard.xyz` redirects to the apex
automatically.

### 4. Deploy

Merge to `main` (or run the workflow from the **Actions** tab). The site goes
live at https://hardboard.xyz.

## What is published

`index.html`, `editor.html`, `404.html`, `assets/`, `favicon.svg`, `robots.txt`,
`sitemap.xml`, `CNAME` and `.nojekyll`. The `backend/` folder, documentation and
workflows are not published.

## When the donations backend exists

Host it on a subdomain such as `api.hardboard.xyz`, then in
`assets/js/services/config.js` set `apiBaseUrl` and `donations.enabled`.
Restrict the backend CORS allow-list to `https://hardboard.xyz`.
