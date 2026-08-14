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

Matched to **rtgacademy.com**, sampled off the live site rather than eyeballed —
signature lime `rgb(181,220,16)`, dark slate `rgb(24,37,44)`, white.

| Token | Value | Use | Contrast |
|---|---|---|---|
| `--ink` | `#0F1A20` | Page ground — RTG slate, darkened | — |
| `--ink-2` | `#18252C` | RTG's actual slate — pillars band | — |
| `--bone` | `#F3F5F1` | Inverted sections | 15.3:1 on ink |
| `--bold` | `#B5DC10` | RTG lime — CTAs, accents, crest | 9.9:1 on ink |
| `--bold-dk` | `#4A6B00` | **The accent for light surfaces** | 5.6:1 on bone |
| `--pitch` | `#17301C` | Deep green, "Coming Soon" band | — |

⚠ **`--bold` is unusable as text on `--bone` — lime on near-white measures 1.45:1.**
Any accent-coloured *text* on a light section (`.why`, `.interest`) must use `--bold-dk`.
That's what `.eyebrow--dark` and `em` are for. Lime as a *background* with dark text on
top is fine everywhere (9.9:1).

All alpha variants compose from `--ink-rgb` / `--bone-rgb`, so there are no loose
`rgba()` literals to miss on a future re-theme.

**Colour lives in four places, not one.** The token block covers the CSS; a palette change
also needs `index.html`'s `theme-color` meta, its favicon data-URI, the crest `<symbol>`
presentation attributes, and the lead-email template in `api/interest.js` (email clients
don't support custom properties, so those stay literal).

- **Type:** Archivo Black (display) + Archivo (body). One family, two weights of personality.
- **No gradients anywhere.** Depth comes from flat color blocks, hairline rules, hard borders, and an SVG grain overlay.
- Fully responsive; honors `prefers-reduced-motion`.

### The crest

Two inline `<symbol>`s at the bottom of `index.html`, reused via `<use>`: `#crest` (full, 40px+)
and `#crest-mini` (shield + monogram, for the nav where the stars and wordmark turn to mush).
No image files.

**Colours are inline presentation attributes, not stylesheet rules — don't "tidy" them into
`style.css`.** Document CSS does not reliably cross the `<use>` shadow boundary, so a rule like
`.crest .cr-shield{fill:…}` silently drops and every path falls back to SVG's default black
(a black crest on a black background, which is exactly the bug this replaced).

Custom properties *do* inherit through, so re-theme any instance by setting them on the `<svg>`:

| Property | Controls | Default |
|---|---|---|
| `--cr-fill` | shield body | `#B5DC10` |
| `--cr-edge` | shield outline | none |
| `--cr-detail` | inner outline, band, stars, lettering | `#0F1A20` |

The hero watermark uses this to become lime line-art (`--cr-fill:transparent`).
Its `opacity` is tuned by measurement to ~2.2:1 against `--ink` — visible as a deliberate
mark, quiet enough not to fight the headline. Lime is much brighter than the scarlet it
replaced, so it needs a *lower* opacity to land at the same perceived weight.

---

## Page sections

`#top` Hero → ticker → `#why` Why Bold FC → `#pillars` (01 Philosophy · 02 Player Development · 03 Coaching · 04 Community) → `#soon` Coming Soon → `#interest` Interest Form → `#social` Follow The Build → `#contact` Contact

---

## Social hub (`#social`)

Two halves: the **channels** and the **share panel**.

### Channels — paste a URL, the tile goes live

Each tile carries `data-url=""`. While that's empty the tile renders as a muted,
non-clickable **"Launching soon"** card. Paste a real profile URL and `app.js`
automatically turns it into a proper `<a>` with `target="_blank"`, `rel="noopener"`,
and an `aria-label`. **Nothing ever links to a profile that doesn't exist yet.**

```html
<a class="chan" data-net="instagram" data-url="https://instagram.com/…">
```

The "soon" state is signalled with a dashed border and muted accents, deliberately
**not** `opacity` — dimming the tile composites its body copy toward the background
and drops it to ~2.7:1, under AA. Colour carries the state; the text stays full strength.

### Share panel — the actual interaction

For a pre-launch club, the highest-value action after the form is a parent *sharing* it.

- **Native share sheet** via `navigator.share` — the button reveals itself only where
  the OS actually has one. Note `navigator.share` needs a **secure context**, so it's
  absent over plain `http://` (but present on `localhost`).
- **WhatsApp / Facebook / X** intent links, always available.
- **Copy link** with `navigator.clipboard`, falling back to a `execCommand('copy')`
  shim for non-secure contexts, plus an `aria-live` confirmation.

Platform glyphs are inline `<symbol>`s, not an icon CDN — the page stays
single-request and they inherit `currentColor` for the lime-inversion hover.

⚠ There is a global `[hidden]{display:none !important}` in the reset. Without it,
any author `display` rule (like `.sbtn{display:inline-flex}`) beats the UA's
`[hidden]{display:none}` — same specificity, author sheet wins — and hidden flex
elements render anyway. That bug showed a dead Share button to every Firefox user.

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
LEAD_TO_EMAIL   = info@rtgacademy.com      (comma-separated for several)
LEAD_FROM_EMAIL = leads@rtgacademy.com     (must be on a verified Resend domain)
```

Both can be set at once. The endpoint only returns an error to the browser if **every**
configured sink fails, so the parent gets told to retry rather than silently losing the lead.

---

## Placeholders to replace

Search the repo for `TODO(andy)`. As of first commit:

- [x] ~~**Contact details**~~ — now info@rtgacademy.com / 844-212-3725.
- [ ] **Founder bio** — Pillar 03 "Coaching" has generic copy where Andy + partner's real bio and headshot should go.
- [ ] **Age bands / founding season** — hero fact strip says "Boys & Girls" and "Founding Season". Confirm before launch.
- [ ] **Coming Soon dates** — all four milestones read `TBA`. Replace the `<span class="road__tag">` text as dates lock.
- [ ] **OG image** — add `assets/og.jpg` (1200×630) and uncomment the `og:image` meta tag.
- [ ] **Photography** — the page is intentionally type-and-color driven so it looks finished with zero photos. Real training/match photos will lift it further once they exist.

---

## Mobile

Rendered and measured in headless Chrome at 320×568, 375×667, 390×844, 430×932, 412×915,
844×390 (landscape), 768×1024, and 1440×900. All pass on: no horizontal overflow, hero CTA
above the fold, every tap target ≥44px, every form control ≥16px (below that iOS auto-zooms
on focus and the layout jumps).

Notes for anyone editing:

- `1rem` on form controls resolves against the **undeclared 16px root**, not `body`. If you
  ever set a `font-size` on `html`, re-check the inputs.
- The mobile menu locks the body with `position:fixed` and restores `scrollY` on close —
  anchor links close it with `restore=false` so they don't fight the jump to the section.
- Landscape phones get their own query (`max-height:520px`) because `100svh` is only ~390px
  there and the hero would otherwise trap its content.

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
