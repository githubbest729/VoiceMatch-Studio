# VoiceMatch Studio

Local-first LinkedIn feed simulator and founder post staging engine for ghostwriters and founder's associates. Vanilla HTML, CSS and JavaScript. No dependencies, no tracking, works offline as a PWA.

## Features

- **Split-screen editor and feed preview** with live character, word and reading-time counters.
- **Mobile and desktop viewport toggle** (narrow phone card or 550px desktop card).
- **"See more" cutoff line.** Approximates LinkedIn's fold: 3 lines on mobile, 5 on desktop. The hook zone is highlighted.
- **Buzzword and "AI smell" scanner.** Flags words like *delve*, *tapestry*, *leverage* as you type. Manage your own list in the Banned words dialog.
- **Copy for LinkedIn.** Normalises whitespace and keeps paragraph breaks so the paste doesn't collapse.
- **Weekly planner.** Five slots, Monday to Friday, autosaved in `localStorage`.
- **Profile.** Name, headline and photo (stored as a data URL) for the preview card.
- **Export / import** drafts, banned words and profile as JSON.

## Run locally

```bash
npm run serve        # or: python3 -m http.server 8080
```

Open http://localhost:8080. Service workers need `localhost` or HTTPS.

## Deploy

**GitHub Pages:** push to `main`, then in the repository go to *Settings → Pages → Source: GitHub Actions*. The included workflow publishes the site.

**Vercel / Netlify / Cloudflare Pages:** import the repo. No build step; the publish directory is the repo root. `vercel.json`, `netlify.toml` and `_headers` are included.

## Before you publish

- Replace `YOUR-USERNAME` in `robots.txt`, `sitemap.xml` and `.well-known/security.txt`.
- Update the contact and expiry in `.well-known/security.txt`.
- `.well-known/assetlinks.json` is a template for an Android Trusted Web Activity. Fill in your package name and signing fingerprint, or delete it.
- If the site lives at a subpath (GitHub Pages project sites), the app's relative paths work as-is. The `404.html` stylesheet link uses an absolute path, so change it to match your base path.

## Limits

The "see more" cutoff is an approximation based on average characters per line. LinkedIn's real fold depends on font metrics, device width and line breaks, so check important posts in the real composer.

## License

MIT
