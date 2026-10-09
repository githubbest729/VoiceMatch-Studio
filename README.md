Here is the heavily upgraded `README.md`. It now includes visual icons, a clear breakdown of the system architecture, a workflow status table, the recent v2 update logs, and a dedicated section explaining its exact purpose for the Founder's Associate workflow.


# 🎙️ VoiceMatch Studio

![Version](https://img.shields.io/badge/version-2.0-blue) ![Architecture](https://img.shields.io/badge/architecture-local--first-success) ![Tech](https://img.shields.io/badge/tech-Vanilla_JS-orange)

Local-first LinkedIn feed simulator and founder post staging engine. Built with Vanilla HTML, CSS, and JavaScript. Zero dependencies, no tracking, and fully functional offline as a Progressive Web App (PWA).

---

## 🎯 Purpose & Use Cases

VoiceMatch Studio is a specialized content operating system built specifically for **Founder's Associates, Executive Assistants, and Ghostwriters** managing high-stakes LinkedIn accounts. 

**Core Uses:**
*   **Preventing Truncation:** Visually test the "hook" (the first 140–210 characters) before LinkedIn automatically chops off the text with a "...see more" button.
*   **Weekly Consistency:** Plan, stage, and track a 5-day posting schedule across a single dashboard so executive marketing never stalls.
*   **Voice Continuity:** Store "Golden Posts" and strict style rules (e.g., "Sentences under 15 words") locally to ensure the founder's authentic voice doesn't drift into generic AI-speak.

---

## 🏗️ System Architecture

VoiceMatch Studio operates entirely in the browser. No external databases, no API calls, and zero data leaves your machine.

*   **Frontend Engine:** ES6 JavaScript, Semantic HTML5, and CSS3 (using CSS Variables for immediate Dark/Light theme switching).
*   **Data Layer (Storage):** 100% `localStorage` (Schema v2). Saves slot states, text histories, custom banned words, and base64 image data directly in your browser cache.
*   **Offline Layer (PWA):** A cache-first Service Worker (`sw.js`) intercepts network requests, ensuring the application loads instantly even on a flight without Wi-Fi.
*   **Deployment:** Static file hosting capable. Compatible with GitHub Pages, Vercel, Netlify, or AWS S3.

---

## 📊 Workflow Status Tracking

The app uses a 5-slot weekly pipeline (Monday–Friday). Each slot tracks the lifecycle of a post using the following architecture:

| Status Indicator | UI Color | Workflow Stage & Meaning |
| :--- | :--- | :--- |
| **Empty** | ⚪ Grey | Slot is unassigned. Drop raw ideas, notes, or AI-generated outlines here. |
| **Draft** | 🟡 Amber | Actively writing. Banned-word scanner is running; visual hook is being tested. |
| **Ready** | 🟢 Green | Post is formatted, visually checked, approved by the founder, and ready to go. |
| **Posted**| 🔵 Blue | Content has been successfully published to LinkedIn. |

---

## ✨ Features

- 🌗 **Dark/Light Mode:** System-aware theme toggle for comfortable writing at any hour.
- 📱 **Split-Screen Feed Preview:** Live character, word, and reading-time counters alongside a pixel-perfect LinkedIn feed simulation.
- ✂️ **"See More" Cutoff Line:** Approximates LinkedIn's fold (3 lines on mobile, 5 on desktop). The hook zone is aggressively highlighted.
- 🚨 **"AI Smell" Scanner:** Automatically flags generic corporate filler (e.g., *delve*, *tapestry*, *leverage*) as you type.
- 📂 **Voice Bank & Playbook:** Slide-out drawers to store tone rules, content pillars, and historic high-performing reference posts.
- 🖼️ **Media Staging:** Drag-and-drop image or PDF carousel staging for visual checking alongside text.
- 📋 **Format-Preserving Copy:** Normalizes whitespace and keeps paragraph breaks so your text doesn't collapse into a wall of text when pasted into LinkedIn.
- 💾 **Export / Import:** Download your entire week's pipeline, profile data, and playbook as a local JSON file.

---

## 📝 Update Logs (v2.0)

*   **[Feature]** Complete UI overhaul mimicking LinkedIn's native dark mode.
*   **[Feature]** Added the Voice Bank & Playbook data layers.
*   **[Feature]** Added state-management dots (Empty/Draft/Ready/Posted) to day tabs.
*   **[Feature]** Upgraded text editor to support a Unicode formatting toolbar (Bold, Italic, Bullets).
*   **[Architecture]** Migrated JSON export schema to `v2` to support arrays of post history and media aspects.

---

## 🚀 Run Locally

```bash
npm run serve        
# OR use native python:
python3 -m http.server 8080

```

Open `http://localhost:8080`. *Note: Service workers require `localhost` or HTTPS to function properly.*

## 🌍 Deploy

**GitHub Pages:** Push to `main`, then navigate to your repository's *Settings → Pages → Source: GitHub Actions*. The included `.github/workflows/deploy.yml` will automatically publish the site.

**Vercel / Netlify / Cloudflare Pages:** Import the repository. There is no build step required; the publish directory is the repository root. Configuration files (`vercel.json`, `netlify.toml`, and `_headers`) are pre-included.

## ⚠️ Pre-Launch Checklist

* Replace `YOUR-USERNAME` in `robots.txt`, `sitemap.xml`, and `.well-known/security.txt`.
* Update the contact and expiry information in `.well-known/security.txt`.
* `.well-known/assetlinks.json` serves as a template for an Android Trusted Web Activity (TWA). Fill in your package name and signing fingerprint, or delete it if you aren't deploying to the Google Play Store.

## ⚖️ License & Limits

**Limits:** The "see more" cutoff is an approximation based on average characters per line. LinkedIn's real fold heavily depends on font metrics, device width, and specific line breaks. Always double-check critical posts in the native composer.

**License:** MIT

```

Once pasted, save the file and run these commands in your Codespace terminal to push the new documentation live:

```bash
git add README.md
git commit -m "Update README: Add architecture, workflow chart, and v2 logs"
git push origin main

```
