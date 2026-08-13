# Bold FC — Landing Page

Pre-launch landing page + lead capture for **Bold FC**, a new youth soccer club in Taylor, Texas.

Zero dependencies. Hand-written HTML/CSS/JS — no Tailwind, no framework, no gradients, no build step.
Deploys to Vercel as a static site plus one serverless function.

---

## Structure

```
rtg/
├── index.html          Single-page site (all sections + interest form)
├── css/style.css       Full custom design system
├── js/app.js           Nav, scroll reveal, form validation + submit
├── api/interest.js     POST endpoint — receives leads, fans out to sinks
├── vercel.json         Clean URLs, caching, security headers
├── package.json        Node 20+, ESM
└── .env.example        Environment variable template
```

---

## Design system

| Token | Value | Use |
|---|---|---|
| `--ink` | `#0D0F10` | Page ground |
| `--bone` | `#F2EEE6` | Inverted sections, body text |
| `--bold` | `#E4402A` | The club scarlet — CTAs, accents, crest |
| `--pitch` | `#1C3A2B` | Deep green, "Coming Soon" band |

- **Type:** Archivo Black (display) + Archivo (body). One family, two weights of personality.
- **Crest:** inline SVG `<symbol id="crest">` at the bottom of `index.html`, reused everywhere via `<use>`. Recolor it by editing the `.cr-*` rules in `style.css` — it's not an image file.
- **No gradients anywhere.** Depth comes from flat color blocks, hairline rules, hard borders, and an SVG grain overlay.
- Fully responsive; honors `prefers-reduced-motion`.

---

## Page sections

`#top` Hero → ticker → `#why` Why Bold FC → `#pillars` (01 Philosophy · 02 Player Development · 03 Coaching · 04 Community) → `#soon` Coming Soon → `#interest` Interest Form → `#contact` Contact

---

## Interest form

Collects, and posts as JSON to `/api/interest`:

`parentName` · `playerName` · `age` · `birthYear` · `currentClub` (optional) · `position` · `email` · `phone` · `looking`

`looking` is the free-text **"What are you looking for in a soccer club?"** — the marketing-research field. It's required and validated at 10+ characters so it doesn't get skipped.

Also captured server-side: `submittedAt`, `source`, `pageUrl`, `userAgent`, `ip`.
Spam is filtered with a hidden honeypot field (`company`).

---

## ⚠ Before you drive real traffic

**Set at least one lead sink.** With none configured the API still returns success and the
lead is written to the Vercel runtime log — recoverable, but not a system. In Vercel →
Project → Settings → Environment Variables:

**Option A — webhook** (n8n, Zapier, Make, Airtable, CRM):
```
LEAD_WEBHOOK_URL = https://your-endpoint
LEAD_WEBHOOK_KEY = optional, sent as X-Api-Key
```

**Option B — email via [Resend](https://resend.com)**:
```
RESEND_API_KEY  = re_xxxxx
LEAD_TO_EMAIL   = andy@boldfctaylor.com     (comma-separated for several)
LEAD_FROM_EMAIL = leads@boldfctaylor.com    (must be on a verified Resend domain)
```

Both can be set at once. The endpoint only returns an error to the browser if **every**
configured sink fails, so the parent gets told to retry rather than silently losing the lead.

---

## Placeholders to replace

Search the repo for `TODO(andy)`. As of first commit:

- [ ] **Contact details** — `index.html` `#contact` currently shows `hello@boldfctaylor.com` and RTG's phone number. Swap both for real Bold FC contacts.
- [ ] **Founder bio** — Pillar 03 "Coaching" has generic copy where Andy + partner's real bio and headshot should go.
- [ ] **Age bands / founding season** — hero fact strip says "Boys & Girls" and "Founding Season". Confirm before launch.
- [ ] **Coming Soon dates** — all four milestones read `TBA`. Replace the `<span class="road__tag">` text as dates lock.
- [ ] **OG image** — add `assets/og.jpg` (1200×630) and uncomment the `og:image` meta tag.
- [ ] **Photography** — the page is intentionally type-and-color driven so it looks finished with zero photos. Real training/match photos will lift it further once they exist.

---

## Local development

Static preview (form submit will 404 — that's expected):
```bash
npx serve .
```

Full preview with the API running:
```bash
npm i -g vercel
vercel dev
```

---

## Deploy

```bash
vercel          # preview
vercel --prod   # production
```

Or connect the GitHub repo in the Vercel dashboard — every push to `master` ships.
Framework preset: **Other**. No build command, no output directory.
