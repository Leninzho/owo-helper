# OwoFarm frontend

Static frontend: a public landing page (`index.html`) and an account/key/billing dashboard (`dashboard.html`), sharing one stylesheet (`styles.css`) and one script file (`script.js`). No build step — open either HTML file directly, or serve the folder with any static host (Vercel, Netlify, Nginx, etc.).

## Files

```
index.html      Public landing page — hero (split terminal + copy), features, how-it-works, CTA, footer
dashboard.html  Account dashboard — Overview, API Key, Billing, Settings, Support
styles.css      Design tokens, layout, components (shared)
script.js       Auth, hero terminal, particle canvas, scroll reveals, dashboard rendering (shared)
```

## Visual design

**Palette:** Deep navy (`#060910`) base, cyan (`#2ee8ff`) / indigo (`#5b7dff`) / violet (`#8b5cf6`) accent gradient. All semantic colors (success, warning, danger) derived from this set.

**Typography:** Space Grotesk (display headings) · Inter (body) · JetBrains Mono (data, keys, terminal). All loaded from Google Fonts.

**Signature element:** Particle network canvas (`<canvas id="heroCanvas">`) that renders a slow-moving node graph — echoes the brand mark's topology and the Termux terminal roots of this project. Disabled when `prefers-reduced-motion` is set.

**Scroll reveals:** Feature cards fade+slide up staggered when they enter the viewport (IntersectionObserver). Disabled on reduced motion.

## Auth flow

1. "Get started free" → Discord OAuth (implicit grant, `identify` scope).
2. Discord redirects back to `index.html` with `#access_token=...` in the URL hash.
3. Inline script reads the hash, stores the token + expiry in `localStorage`, strips the hash from the URL, and immediately navigates to `dashboard.html`.
4. `dashboard.html` has its own inline guard: if no valid token exists, it bounces back to `index.html` before rendering.
5. **The token exchange must happen server-side if you move to the code grant flow** — the client secret must never ship in JS.

## Wiring up real data

All mock data lives in `OWO_DATA` near the top of `script.js`. To use real data, replace `fetchDashboardData()`:

```js
// Replace this:
async function fetchDashboardData() {
  return Promise.resolve(OWO_DATA);
}

// With something like:
async function fetchDashboardData() {
  const res = await fetch('/api/dashboard/overview', { credentials: 'include' });
  if (!res.ok) throw new Error('fetch failed');
  return res.json();
}
```

Two more spots have `// TODO` comments:

- `initKeyView()` — generates a mock key client-side. Replace with `GET /api/key` and `POST /api/key/regenerate`.
- `OWO_DATA.accounts` and `OWO_DATA.activity` — populate these arrays from your backend to fill the Overview panel's account list and activity feed.

## Expected data shape

```js
{
  profile: {
    username:  String,   // fallback if Discord API fails
    avatarUrl: String,
    balance:   Number,   // in Rupiah (integer)
  },
  heroStats: [
    { label: String, value: String },
    // ...4 rows shown in the terminal
  ],
  overview: {
    cowoncy:      String,  // e.g. "128,450"
    cowoncyDelta: String,  // e.g. "+4,200 hari ini"
    hunts:        String,  // e.g. "1,024"
    huntsSub:     String,  // e.g. "hari ini"
    active:       String,  // e.g. "3"
    activeSub:    String,  // e.g. "dari 6 akun total"
    uptime:       String,  // e.g. "4h 12m"
  },
  accounts: [
    { name: String, status: "running"|"paused"|"stopped", hunts: Number, battles: Number }
  ],
  activity: [
    { time: String, desc: String, reward: String }
  ],
  transactions: [
    { date: String, desc: String, amount: Number }  // negative = debit
  ],
}
```

## Suggested API routes

| Method | Path | Purpose |
|---|---|---|
| `GET`  | `/api/dashboard/overview` | Full data shape above |
| `GET`  | `/api/key` | Current API key for the signed-in account |
| `POST` | `/api/key/regenerate` | Rotate the key, return the new one |

## Deployment (Vercel)

Drop the four files into the repo root. Vercel detects a static site with no framework and serves it directly — no `vercel.json` needed unless you want custom rewrites. Make sure `redirect_uri` in your Discord OAuth config matches the deployed URL exactly.

## Theming

All colors, type, radii, and shadows are CSS custom properties in `:root {}` at the top of `styles.css`. Changing `--cyan` and `--blue` re-themes buttons, the active nav state, and the hero canvas color in one edit. The particle canvas uses `rgba(46, 232, 255, ...)` literals — search for those if you want to recolor the nodes too.
