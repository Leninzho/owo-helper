/* ==========================================================================
   OwoFarm — shared script
   Runs on both index.html (landing) and dashboard.html.
   ========================================================================== */

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* --------------------------------------------------------------------------
   AUTH
   -------------------------------------------------------------------------- */
const AUTH = {
  KEYS: {
    token:   "owofarm_token",
    expiry:  "owofarm_token_expiry",
    profile: "owofarm_profile",
  },
  token() {
    const t   = localStorage.getItem(this.KEYS.token);
    const exp = parseInt(localStorage.getItem(this.KEYS.expiry) || "0", 10);
    return t && Date.now() < exp ? t : null;
  },
  isValid()      { return !!this.token(); },
  profile() {
    try   { return JSON.parse(localStorage.getItem(this.KEYS.profile) || "null"); }
    catch { return null; }
  },
  cacheProfile(u) { localStorage.setItem(this.KEYS.profile, JSON.stringify(u)); },
  clear()         { Object.values(this.KEYS).forEach(k => localStorage.removeItem(k)); },
};

/* --------------------------------------------------------------------------
   Discord API
   -------------------------------------------------------------------------- */
async function fetchDiscordUser(token) {
  const cached = AUTH.profile();
  if (cached) return cached;
  const res = await fetch("https://discord.com/api/v10/users/@me", {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    if (res.status === 401) AUTH.clear();
    throw new Error(`Discord API ${res.status}`);
  }
  const user = await res.json();
  AUTH.cacheProfile(user);
  return user;
}
function avatarUrl(u) {
  return u.avatar
    ? `https://cdn.discordapp.com/avatars/${u.id}/${u.avatar}.png?size=128`
    : "https://cdn.discordapp.com/embed/avatars/0.png";
}
function displayName(u) { return u.global_name || u.username; }

/* --------------------------------------------------------------------------
   Mock data — swap fetchDashboardData() for a real API call when ready
   -------------------------------------------------------------------------- */
const OWO_DATA = {
  profile: {
    username:  "—",
    avatarUrl: "https://cdn.discordapp.com/embed/avatars/0.png",
    balance:   128450,
  },
  heroStats: [
    { label: "Status",             value: "beta — live now"        },
    { label: "Accounts connected", value: "0 — could be yours first"},
    { label: "Build",              value: "v0.1.0"                 },
    { label: "Uptime tracking",    value: "starts once it's live"  },
  ],
  overview: {
    cowoncy:      "—",
    cowoncyDelta: "connect an account to track",
    hunts:        "—",
    huntsSub:     "no data yet",
    active:       "0",
    activeSub:    "dari 0 akun total",
    uptime:       "—",
  },
  accounts: [], // e.g. [{ name: "leninzho", status: "running", hunts: 196, battles: 188 }]
  activity: [], // e.g. [{ time: "07:45", desc: "Hunt — found 🦋 Butterfly", reward: "+134" }]
  transactions: [
    { date: "26 Jun 2026", desc: "Top up saldo",  amount:  50000 },
    { date: "24 Jun 2026", desc: "Pembelian key", amount: -10000 },
    { date: "20 Jun 2026", desc: "Top up saldo",  amount: 100000 },
    { date: "15 Jun 2026", desc: "Pembelian key", amount: -10000 },
  ],
};

async function fetchDashboardData() {
  // TODO: replace with:
  // const res = await fetch('/api/dashboard/overview', { credentials: 'include' });
  // return res.json();
  return Promise.resolve(OWO_DATA);
}

/* --------------------------------------------------------------------------
   Particle network canvas (hero background)
   -------------------------------------------------------------------------- */
function initParticleCanvas() {
  const canvas = document.getElementById("heroCanvas");
  if (!canvas || reduceMotion) return;

  const ctx = canvas.getContext("2d");
  let W, H, particles, raf;

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }

  function makeParticle() {
    return {
      x:  Math.random() * W,
      y:  Math.random() * H,
      vx: (Math.random() - 0.5) * 0.35,
      vy: (Math.random() - 0.5) * 0.35,
      r:  Math.random() * 1.8 + 0.6,
    };
  }

  function init() {
    resize();
    const count = Math.min(70, Math.floor((W * H) / 14000));
    particles = Array.from({ length: count }, makeParticle);
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);

    // edges
    const LINK_DIST = 160;
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < LINK_DIST) {
          const alpha = (1 - dist / LINK_DIST) * 0.35;
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.strokeStyle = `rgba(46, 232, 255, ${alpha})`;
          ctx.lineWidth = 0.8;
          ctx.stroke();
        }
      }
    }

    // nodes
    for (const p of particles) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(46, 232, 255, 0.55)";
      ctx.fill();
    }
  }

  function update() {
    for (const p of particles) {
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < -20) p.x = W + 20;
      if (p.x > W + 20) p.x = -20;
      if (p.y < -20) p.y = H + 20;
      if (p.y > H + 20) p.y = -20;
    }
  }

  function loop() {
    update();
    draw();
    raf = requestAnimationFrame(loop);
  }

  init();
  loop();

  window.addEventListener("resize", () => {
    resize();
    cancelAnimationFrame(raf);
    init();
    loop();
  });
}

/* --------------------------------------------------------------------------
   Scroll reveal for feature cards
   -------------------------------------------------------------------------- */
function initScrollReveal() {
  if (reduceMotion) {
    document.querySelectorAll(".feature-card").forEach(el => el.classList.add("revealed"));
    return;
  }
  const obs = new IntersectionObserver((entries) => {
    entries.forEach((entry, i) => {
      if (entry.isIntersecting) {
        setTimeout(() => entry.target.classList.add("revealed"), i * 80);
        obs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });

  document.querySelectorAll(".feature-card").forEach(el => obs.observe(el));
}

/* --------------------------------------------------------------------------
   Mobile nav toggle (landing)
   -------------------------------------------------------------------------- */
function initMobileNav() {
  const toggle = document.getElementById("navToggle");
  const links  = document.getElementById("navLinks");
  if (!toggle || !links) return;
  toggle.addEventListener("click", () => {
    links.classList.toggle("open");
  });
  // Close when a link is clicked
  links.querySelectorAll("a").forEach(a => {
    a.addEventListener("click", () => links.classList.remove("open"));
  });
}

/* --------------------------------------------------------------------------
   Dashboard: sidebar
   -------------------------------------------------------------------------- */
function initSidebar() {
  const sidebar  = document.getElementById("sidebar");
  const toggle   = document.getElementById("sidebarToggle");
  const overlay  = document.getElementById("sidebarOverlay");
  if (!sidebar) return;

  function close() {
    sidebar.classList.remove("open");
    overlay?.classList.remove("open");
  }
  toggle?.addEventListener("click", () => {
    sidebar.classList.toggle("open");
    overlay?.classList.toggle("open");
  });
  overlay?.addEventListener("click", close);
}

/* --------------------------------------------------------------------------
   Dashboard: view switcher
   -------------------------------------------------------------------------- */
const VIEW_META = {
  overview: { title: "Overview",  subtitle: "Status dan statistik akun kamu." },
  key:      { title: "API Key",   subtitle: "Key ini menghubungkan bot kamu ke dashboard ini." },
  billing:  { title: "Billing",   subtitle: "Saldo dan riwayat transaksi kamu." },
  settings: { title: "Settings",  subtitle: "Pengaturan akun." },
  support:  { title: "Support",   subtitle: "Butuh bantuan? Kami siap membantu." },
};

function showView(view) {
  document.querySelectorAll(".dash-view").forEach(s => {
    s.hidden = s.dataset.view !== view;
  });
  document.querySelectorAll(".side-nav .side-link[data-view]").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.view === view);
  });
  const meta   = VIEW_META[view] || {};
  const titleEl = document.getElementById("viewTitle");
  const subEl   = document.getElementById("viewSubtitle");
  if (titleEl) titleEl.textContent = meta.title    || "";
  if (subEl)   subEl.textContent   = meta.subtitle || "";
  // close sidebar on mobile after navigation
  document.getElementById("sidebar")?.classList.remove("open");
  document.getElementById("sidebarOverlay")?.classList.remove("open");
}

function initSidebarNav() {
  document.querySelectorAll(".side-nav .side-link[data-view]").forEach(btn => {
    btn.addEventListener("click", () => showView(btn.dataset.view));
  });
}

/* --------------------------------------------------------------------------
   Dashboard: profile
   -------------------------------------------------------------------------- */
function renderProfile(profile) {
  document.querySelectorAll("[data-profile-name]").forEach(el => {
    el.textContent = profile.username;
  });
  document.querySelectorAll("[data-profile-avatar]").forEach(el => {
    el.src = profile.avatarUrl;
    el.alt = profile.username;
  });
}

/* --------------------------------------------------------------------------
   Dashboard: overview stats
   -------------------------------------------------------------------------- */
function renderOverview(data) {
  const ov = data.overview;
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  set("statCowoncy",      ov.cowoncy);
  set("statCowoncyDelta", ov.cowoncyDelta);
  set("statHunts",        ov.hunts);
  set("statHuntsSub",     ov.huntsSub);
  set("statActive",       ov.active);
  set("statActiveSub",    ov.activeSub);
  set("statUptime",       ov.uptime);

  // account list
  const list = document.getElementById("accountList");
  if (list) {
    if (data.accounts && data.accounts.length) {
      list.innerHTML = data.accounts.map(acc => `
        <div class="account-row">
          <div class="account-info">
            <div class="account-avatar">${acc.name.slice(0, 2).toUpperCase()}</div>
            <div>
              <div class="account-name">${acc.name}</div>
              <div class="account-sub">${acc.hunts} hunts · ${acc.battles} battles today</div>
            </div>
          </div>
          <div class="account-meta">
            <span class="pill pill-${acc.status}"><span class="pill-dot"></span>${acc.status}</span>
          </div>
        </div>`).join("");
    }
    // else: empty state already in HTML
  }

  // recent activity
  const actEl = document.getElementById("recentActivity");
  if (actEl && data.activity && data.activity.length) {
    actEl.innerHTML = `<table class="activity-table">
      <thead><tr><th>Waktu</th><th>Aksi</th><th style="text-align:right">Hasil</th></tr></thead>
      <tbody>${data.activity.map(a => `
        <tr>
          <td class="mono" style="font-size:0.78rem; color:var(--text-faint)">${a.time}</td>
          <td>${a.desc}</td>
          <td class="col-reward" style="color:var(--success)">${a.reward}</td>
        </tr>`).join("")}
      </tbody>
    </table>`;
  }
}

/* --------------------------------------------------------------------------
   Dashboard: key view
   -------------------------------------------------------------------------- */
function generateMockKey() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const grp = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  return `OWOFARM-${grp()}-${grp()}-${grp()}`;
}

function initKeyView() {
  const valueEl  = document.getElementById("keyValue");
  const copyBtn  = document.getElementById("copyKeyBtn");
  const regenBtn = document.getElementById("regenerateKeyBtn");
  if (!valueEl) return;

  valueEl.textContent = generateMockKey(); // TODO: GET /api/key

  copyBtn?.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(valueEl.textContent);
      const orig = copyBtn.textContent;
      copyBtn.textContent = "Copied!";
      setTimeout(() => (copyBtn.textContent = orig), 1500);
    } catch { /* fail silently */ }
  });

  regenBtn?.addEventListener("click", () => {
    valueEl.textContent = generateMockKey(); // TODO: POST /api/key/regenerate
  });
}

/* --------------------------------------------------------------------------
   Dashboard: billing
   -------------------------------------------------------------------------- */
function formatRupiah(n) { return "Rp " + Math.abs(n).toLocaleString("id-ID"); }

function renderBilling(profile, transactions) {
  const balEl = document.getElementById("billingBalance");
  if (balEl) balEl.textContent = formatRupiah(profile.balance);

  const tbody = document.getElementById("billingBody");
  if (!tbody) return;
  tbody.innerHTML = transactions.map(t => `
    <tr>
      <td>${t.date}</td>
      <td>${t.desc}</td>
      <td class="col-reward" style="color:${t.amount >= 0 ? "var(--success)" : "var(--text-dim)"}">
        ${t.amount >= 0 ? "+" : "-"}${formatRupiah(t.amount)}
      </td>
    </tr>`).join("");
}

/* --------------------------------------------------------------------------
   BOOT
   -------------------------------------------------------------------------- */
document.addEventListener("DOMContentLoaded", async () => {
  const onDashboard = !!document.querySelector(".dash-shell");
  const onLanding   = !!document.getElementById("heroCanvas") && !onDashboard;

  /* ======== LANDING ======== */
  if (onLanding) {
    initParticleCanvas();
    initScrollReveal();
    initMobileNav();
    // No terminal animation — hero is now copy + CTA only.
    return;
  }

  /* ======== DASHBOARD ======== */
  if (onDashboard) {
    const token = AUTH.token();
    if (!token) { window.location.replace("index.html"); return; }

    const data = await fetchDashboardData();

    try {
      const user = await fetchDiscordUser(token);
      renderProfile({
        username:  displayName(user),
        avatarUrl: avatarUrl(user),
        balance:   data.profile.balance,
      });
    } catch (err) {
      console.warn("Discord profile fetch failed:", err);
      renderProfile(data.profile);
    }

    renderOverview(data);
    renderBilling(data.profile, data.transactions);
    initKeyView();
    initSidebar();
    initSidebarNav();
    showView("overview");

    // Logout
    document.querySelector("[data-logout]")?.addEventListener("click", e => {
      e.preventDefault();
      AUTH.clear();
      window.location.replace("index.html");
    });

    // Refresh button (placeholder)
    document.getElementById("refreshBtn")?.addEventListener("click", async () => {
      const d = await fetchDashboardData();
      renderOverview(d);
    });
  }
});
