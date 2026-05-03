/* ============================================================
   INDUSTRY INSIGHTS — CORE JS v1.0
   Twinfang · Internal
   ============================================================ */

'use strict';

/* ============================================================
   THEME TOGGLE
   ============================================================ */
const THEME_KEY = 'ii-theme';

const SVG_MOON = `<svg viewBox="0 0 24 24"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`;
const SVG_SUN  = `<svg viewBox="0 0 24 24">
  <circle cx="12" cy="12" r="5"/>
  <line x1="12" y1="1"  x2="12" y2="3"/>
  <line x1="12" y1="21" x2="12" y2="23"/>
  <line x1="4.22" y1="4.22"   x2="5.64"  y2="5.64"/>
  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
  <line x1="1"  y1="12" x2="3"  y2="12"/>
  <line x1="21" y1="12" x2="23" y2="12"/>
  <line x1="4.22"  y1="19.78" x2="5.64"  y2="18.36"/>
  <line x1="18.36" y1="5.64"  x2="19.78" y2="4.22"/>
</svg>`;

function applyTheme(dark) {
  document.body.classList.toggle('dark', dark);
  const btn = document.getElementById('ii-mode');
  if (btn) btn.innerHTML = dark ? SVG_SUN : SVG_MOON;
}

function initTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const dark = saved ? saved === 'dark' : prefersDark;
  applyTheme(dark);

  const btn = document.getElementById('ii-mode');
  if (btn) {
    btn.addEventListener('click', () => {
      const isDark = document.body.classList.toggle('dark');
      localStorage.setItem(THEME_KEY, isDark ? 'dark' : 'light');
      btn.innerHTML = isDark ? SVG_SUN : SVG_MOON;
    });
  }
}


/* ============================================================
   NAV — ACTIVE LINK
   ============================================================ */
function initNav() {
  const page = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.ii-navlink[data-page]').forEach(a => {
    if (a.dataset.page === page) a.classList.add('act');
    else a.classList.remove('act');
  });
}


/* ============================================================
   CONFERENCE CALENDAR
   ============================================================ */
let calEvents   = [];
let calYear     = new Date().getFullYear();
let calMonth    = new Date().getMonth(); // 0-indexed
let activeFilters = new Set(['games','art','tools','ttrpg','film']);
let activeEvent = null;

const CAT_COLORS = {
  games: '#3B82F6',
  art:   '#10B981',
  tools: '#8B5CF6',
  ttrpg: '#F59E0B',
  film:  '#9CA3AF'
};
const CAT_LABELS = {
  games: 'Games',
  art:   'Art & Animation',
  tools: 'Tools & Tech',
  ttrpg: 'TTRPG',
  film:  'Film & TV'
};
const DAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
const MONTHS = ['January','February','March','April','May','June',
                'July','August','September','October','November','December'];

async function loadCalendar() {
  const wrap = document.getElementById('ii-calendar');
  if (!wrap) return;

  try {
    // Resolve data path relative to current page location
    const base = window.location.pathname.includes('/')
      ? window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/') + 1)
      : './';
    const res = await fetch('data/conferences.json');
    if (!res.ok) throw new Error('fetch failed');
    calEvents = await res.json();
  } catch (e) {
    // If fetch fails (e.g. file:// protocol), try inline fallback
    calEvents = window.CONF_FALLBACK || [];
  }
  renderCalendar();
  initFilters();
}

function initFilters() {
  document.querySelectorAll('.ii-filter[data-cat]').forEach(btn => {
    btn.classList.toggle('on', activeFilters.has(btn.dataset.cat));
    btn.addEventListener('click', () => {
      const cat = btn.dataset.cat;
      if (activeFilters.has(cat)) activeFilters.delete(cat);
      else activeFilters.add(cat);
      btn.classList.toggle('on', activeFilters.has(cat));
      renderCalendar();
    });
  });
}

function renderCalendar() {
  const wrap = document.getElementById('ii-calendar');
  if (!wrap) return;

  // Month header
  document.getElementById('cal-month-label').textContent =
    `${MONTHS[calMonth]} ${calYear}`;

  // First day of month (Mon-based: Mon=0, Sun=6)
  const firstDay = new Date(calYear, calMonth, 1);
  const startOffset = (firstDay.getDay() + 6) % 7; // shift Sun(0) to pos 6
  const daysInMonth  = new Date(calYear, calMonth + 1, 0).getDate();

  // Filter events to this month
  const monthStart = new Date(calYear, calMonth, 1);
  const monthEnd   = new Date(calYear, calMonth + 1, 0);

  const visible = calEvents.filter(e => {
    if (!activeFilters.has(e.category)) return false;
    const s = new Date(e.start + 'T00:00:00');
    const en = new Date(e.end   + 'T00:00:00');
    return s <= monthEnd && en >= monthStart;
  });

  // Build week rows
  const totalCells = Math.ceil((startOffset + daysInMonth) / 7) * 7;
  const cells = [];
  for (let i = 0; i < totalCells; i++) {
    const dayNum = i - startOffset + 1;
    cells.push({ dayNum, inMonth: dayNum >= 1 && dayNum <= daysInMonth });
  }

  // Lane assignment per row
  function assignLanes(events, rowDates) {
    const lanes = [];
    events.forEach(ev => {
      const evStart = new Date(ev.start + 'T00:00:00');
      const evEnd   = new Date(ev.end   + 'T00:00:00');
      // find overlap with this row
      let lane = 0;
      while (lanes[lane] && lanes[lane].some(placed => {
        const ps = new Date(placed.start + 'T00:00:00');
        const pe = new Date(placed.end   + 'T00:00:00');
        return ps <= evEnd && pe >= evStart;
      })) lane++;
      if (!lanes[lane]) lanes[lane] = [];
      lanes[lane].push(ev);
      ev._lane = lane;
    });
    return lanes;
  }

  // Build HTML
  let html = `<div class="ii-cal-wrap"><table class="ii-cal" role="grid">
    <thead><tr>`;
  DAYS.forEach(d => { html += `<th>${d}</th>`; });
  html += `</tr></thead><tbody>`;

  for (let row = 0; row < totalCells / 7; row++) {
    html += `<tr>`;
    for (let col = 0; col < 7; col++) {
      const cell = cells[row * 7 + col];
      const isWeekend = col >= 5;
      const today = new Date();
      const isToday = cell.inMonth &&
        today.getFullYear() === calYear &&
        today.getMonth() === calMonth &&
        today.getDate() === cell.dayNum;

      let cls = '';
      if (isWeekend) cls += ' wkend';
      if (isToday)   cls += ' today';
      if (!cell.inMonth) cls += ' out';

      // Events starting this exact day
      const dayDate = cell.inMonth
        ? new Date(calYear, calMonth, cell.dayNum)
        : null;

      const dayEvents = dayDate ? visible.filter(ev => {
        const s = new Date(ev.start + 'T00:00:00');
        return s.getTime() === dayDate.getTime();
      }) : [];

      html += `<td class="${cls.trim()}">`;
      if (cell.inMonth) {
        html += `<span class="ii-date-num${isToday ? ' today-num' : ''}">${cell.dayNum}</span>`;
        dayEvents.forEach(ev => {
          html += `<span class="ii-ev cat-${ev.category}"
            data-id="${ev.id}"
            onclick="showEventDetail('${ev.id}')">${ev.name}</span>`;
        });
      }
      html += `</td>`;
    }
    html += `</tr>`;
  }
  html += `</tbody></table></div>`;

  wrap.innerHTML = html;

  // Restore active detail if any
  if (activeEvent) {
    const still = calEvents.find(e => e.id === activeEvent);
    if (still) renderEventDetail(still);
  }
}

function showEventDetail(id) {
  const ev = calEvents.find(e => e.id === id);
  if (!ev) return;
  activeEvent = id;
  renderEventDetail(ev);
}

function renderEventDetail(ev) {
  const panel = document.getElementById('ii-ev-detail');
  if (!panel) return;

  const s = new Date(ev.start + 'T00:00:00');
  const e = new Date(ev.end   + 'T00:00:00');
  const fmt = d => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const dateStr = ev.start === ev.end ? fmt(s) : `${fmt(s)} — ${fmt(e)}`;

  panel.innerHTML = `
    <div class="ii-ev-detail-body">
      <span class="ii-eyebrow">${CAT_LABELS[ev.category] || ev.category}</span>
      <h3>${ev.name}</h3>
      <p class="ii-meta u-mb8">${dateStr} &nbsp;·&nbsp; ${ev.location}</p>
      <p>${ev.description}</p>
      ${ev.url ? `<p class="u-mt24"><a href="${ev.url}" target="_blank" rel="noopener" style="color:var(--red);font-size:11px;letter-spacing:1px;text-transform:uppercase;font-weight:700;">${ev.url.replace(/https?:\/\//,'')}</a></p>` : ''}
    </div>
    <button class="ii-ev-detail-close" onclick="closeEventDetail()">×</button>
  `;
  panel.classList.add('show');
  panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function closeEventDetail() {
  activeEvent = null;
  const panel = document.getElementById('ii-ev-detail');
  if (panel) { panel.classList.remove('show'); panel.innerHTML = ''; }
}

function calPrev() {
  calMonth--;
  if (calMonth < 0) { calMonth = 11; calYear--; }
  activeEvent = null;
  renderCalendar();
}
function calNext() {
  calMonth++;
  if (calMonth > 11) { calMonth = 0; calYear++; }
  activeEvent = null;
  renderCalendar();
}

// Expose globals for inline onclick
window.showEventDetail = showEventDetail;
window.closeEventDetail = closeEventDetail;
window.calPrev = calPrev;
window.calNext = calNext;


/* ============================================================
   GATE 1 — STORY APPROVAL
   ============================================================ */
let gate1Stories = [];
let gate1Decisions = {};

async function loadGate1() {
  const list = document.getElementById('ii-story-list');
  if (!list) return;

  try {
    const res = await fetch('data/stories.json');
    if (!res.ok) throw new Error();
    gate1Stories = await res.json();
  } catch (e) {
    gate1Stories = [];
  }

  if (gate1Stories.length === 0) {
    list.innerHTML = `<div class="ii-empty">
      <div class="ii-empty-mark"></div>
      <h3>No stories queued</h3>
      <p>Run the collection workflow to populate stories for review.</p>
      <span class="ii-empty-hint">Waiting for automation run</span>
    </div>`;
    return;
  }

  // Pre-approve all stories — kill the ones you don't want
  gate1Stories.forEach(s => { gate1Decisions[s.id] = 'approved'; });

  renderGate1Stories();
}

function renderGate1Stories() {
  const list = document.getElementById('ii-story-list');
  if (!list) return;

  // Group by section
  const sections = {};
  gate1Stories.forEach(s => {
    const sec = s.section || 'Uncategorized';
    if (!sections[sec]) sections[sec] = [];
    sections[sec].push(s);
  });

  let html = '';
  Object.entries(sections).forEach(([sec, stories]) => {
    html += `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-top:32px;padding-bottom:10px;border-bottom:1px solid var(--bd)">
      <h2 class="ii-section-title" style="margin:0;border:0;padding:0">${sec}</h2>
      <div style="display:flex;gap:6px;flex-shrink:0;margin-left:16px">
        <button class="ii-btn approve" onclick="sectionApproveAll('${sec}')">✓ Approve All</button>
        <button class="ii-btn kill"    onclick="sectionKillAll('${sec}')">✕ Kill All</button>
      </div>
    </div>`;
    stories.forEach(story => {
      const dec = gate1Decisions[story.id] || 'approved';
      html += `<div class="ii-story-card ${dec}" id="card-${story.id}">
        <div class="ii-story-body">
          <div class="ii-story-title">${story.headline}</div>
          <div class="ii-story-source-line">${story.source} · ${story.date || ''}</div>
          <div class="ii-story-summary">${story.summary || ''}</div>
          <div class="u-mt24" style="display:flex;gap:6px;flex-wrap:wrap">
            ${(story.tags || []).map(t => `<span class="ii-tag ${t.toLowerCase()}">${t}</span>`).join('')}
          </div>
        </div>
        <div class="ii-story-actions">
          <button class="ii-btn approve" onclick="gate1Decide('${story.id}','approved')">✓ Approve</button>
          <button class="ii-btn kill"    onclick="gate1Decide('${story.id}','killed')">✕ Kill</button>
        </div>
      </div>`;
    });
  });
  list.innerHTML = html;
  updateGate1Tally();
}

function gate1Decide(id, decision) {
  gate1Decisions[id] = decision;
  const card = document.getElementById('card-' + id);
  if (card) {
    card.classList.remove('approved', 'killed');
    if (decision !== 'pending') card.classList.add(decision);
  }
  updateGate1Tally();
}

function updateGate1Tally() {
  const approved = Object.values(gate1Decisions).filter(d => d === 'approved').length;
  const killed   = Object.values(gate1Decisions).filter(d => d === 'killed').length;
  const total    = gate1Stories.length;
  const pending  = total - approved - killed;
  const el = document.getElementById('ii-gate1-tally');
  if (el) el.innerHTML = `<strong>${approved}</strong> approved &nbsp;·&nbsp; <strong>${killed}</strong> killed &nbsp;·&nbsp; <strong>${pending}</strong> pending`;
  const btn = document.getElementById('ii-gate1-proceed');
  if (btn) btn.disabled = approved === 0;
}

async function gate1ProceedAll() {
  const approved = Object.values(gate1Decisions).filter(d => d === 'approved').length;
  if (approved === 0) return;

  if (!ghCheckPAT()) return;

  const btn = document.getElementById('ii-gate1-proceed');
  const orig = btn.textContent;
  btn.disabled = true;
  btn.textContent = 'Saving…';

  try {
    const payload = {
      date:      new Date().toISOString(),
      decisions: gate1Decisions,
    };
    await ghCommitFile(
      'data/gate1-decisions.json',
      JSON.stringify(payload, null, 2),
      'chore: gate1 decisions'
    );
    btn.textContent = 'Triggering draft…';
    await ghTriggerWorkflow('draft.yml');
    btn.textContent = '✓ Draft queued';
    document.getElementById('ii-gate1-status').textContent = 'Draft Generating…';
    document.getElementById('ii-gate1-status').className   = 'ii-gate-status-pill pending';
    setTimeout(() => {
      btn.textContent = orig;
      btn.disabled    = approved === 0;
    }, 4000);
  } catch (err) {
    btn.textContent = 'Error — retry';
    btn.disabled    = false;
    console.error(err);
    alert('GitHub API error: ' + err.message + '\n\nCheck your PAT in Settings.');
  }
}

function sectionApproveAll(section) {
  gate1Stories.filter(s => s.section === section).forEach(s => gate1Decide(s.id, 'approved'));
}

function sectionKillAll(section) {
  gate1Stories.filter(s => s.section === section).forEach(s => gate1Decide(s.id, 'killed'));
}

window.gate1Decide      = gate1Decide;
window.gate1ProceedAll  = gate1ProceedAll;
window.sectionApproveAll = sectionApproveAll;
window.sectionKillAll    = sectionKillAll;


/* ============================================================
   GATE 2 — DRAFT REVIEW
   ============================================================ */
let gate2Draft = {};

async function loadGate2() {
  const wrap = document.getElementById('ii-draft-wrap');
  if (!wrap) return;

  try {
    const res = await fetch('data/draft.json');
    if (!res.ok) throw new Error();
    gate2Draft = await res.json();
  } catch (e) {
    gate2Draft = {};
  }

  if (!gate2Draft.sections || gate2Draft.sections.length === 0) {
    wrap.innerHTML = `<div class="ii-empty">
      <div class="ii-empty-mark"></div>
      <h3>No draft ready</h3>
      <p>Complete Gate 1 story approval first, then run the drafting workflow to generate a full issue draft.</p>
      <span class="ii-empty-hint">Waiting for Gate 1</span>
    </div>`;
    return;
  }

  renderGate2Draft();
}

function renderGate2Draft() {
  const wrap = document.getElementById('ii-draft-wrap');
  if (!wrap) return;

  let html = '';
  gate2Draft.sections.forEach((sec, i) => {
    html += `<div class="ii-draft-section">
      <div class="ii-draft-section-head" onclick="toggleSection(${i})">
        <h3>${sec.title}</h3>
        <span class="ii-meta" id="sec-status-${i}">Review</span>
      </div>
      <div class="ii-draft-section-body" id="sec-body-${i}">
        <div class="ii-draft-text" id="sec-text-${i}"
          contenteditable="true"
          spellcheck="true"
          style="outline:none">${sec.content}</div>
        <div style="display:flex;gap:8px;margin-top:16px;padding-top:16px;border-top:1px solid var(--bd)">
          <button class="ii-btn approve" onclick="approveSection(${i})">✓ Approve Section</button>
          <button class="ii-btn"         onclick="regenerateSection(${i})">↺ Re-draft</button>
        </div>
      </div>
    </div>`;
  });
  wrap.innerHTML = html;
  // Open first section by default
  if (gate2Draft.sections.length > 0) {
    document.getElementById('sec-body-0').classList.add('open');
  }
}

function toggleSection(i) {
  const body = document.getElementById('sec-body-' + i);
  if (body) body.classList.toggle('open');
}

function approveSection(i) {
  const status = document.getElementById('sec-status-' + i);
  if (status) {
    status.textContent = '✓ Approved';
    status.style.color = '#10B981';
  }
  checkAllApproved();
}

function regenerateSection(i) {
  // In production: triggers GPT-4o re-draft for this section
  const status = document.getElementById('sec-status-' + i);
  if (status) { status.textContent = 'Re-draft requested'; status.style.color = '#F59E0B'; }
  alert('In production this sends the section back to GPT-4o with your edits as context.');
}

function checkAllApproved() {
  if (!gate2Draft.sections) return;
  const total    = gate2Draft.sections.length;
  const approved = document.querySelectorAll('[id^="sec-status-"]');
  let count = 0;
  approved.forEach(s => { if (s.textContent.includes('✓')) count++; });
  const btn = document.getElementById('ii-gate2-publish');
  if (btn) btn.disabled = count < total;
}

async function gate2Publish() {
  if (!ghCheckPAT()) return;

  const btn  = document.getElementById('ii-gate2-publish');
  const orig = btn.textContent;
  btn.disabled    = true;
  btn.textContent = 'Saving edits…';

  try {
    // Collect any inline edits back into the draft object
    if (gate2Draft.sections) {
      gate2Draft.sections.forEach((sec, i) => {
        const el = document.getElementById('sec-text-' + i);
        if (el) sec.content = el.innerHTML;
      });
    }

    await ghCommitFile(
      'data/draft.json',
      JSON.stringify(gate2Draft, null, 2),
      'chore: final draft edits'
    );

    btn.textContent = 'Publishing…';
    await ghTriggerWorkflow('publish.yml');

    btn.textContent = '✓ Publishing…';
    document.getElementById('ii-gate2-status').textContent = 'Publishing';
    document.getElementById('ii-gate2-status').className   = 'ii-gate-status-pill ready';

    setTimeout(() => {
      btn.textContent = orig;
      btn.disabled    = false;
    }, 5000);
  } catch (err) {
    btn.textContent = 'Error — retry';
    btn.disabled    = false;
    console.error(err);
    alert('GitHub API error: ' + err.message + '\n\nCheck your PAT in Settings.');
  }
}

window.toggleSection     = toggleSection;
window.approveSection    = approveSection;
window.regenerateSection = regenerateSection;
window.gate2Publish      = gate2Publish;
window.gate1ProceedAll   = gate1ProceedAll;


/* ============================================================
   PROGRESS BARS (animate on scroll)
   ============================================================ */
function initBars() {
  const bars = document.querySelectorAll('.ii-bar-fill[data-pct]');
  if (!bars.length) return;
  const observer = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.style.width = e.target.dataset.pct + '%';
        observer.unobserve(e.target);
      }
    });
  }, { threshold: .3 });
  bars.forEach(b => { b.style.width = '0%'; observer.observe(b); });
}


/* ============================================================
   INIT
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initNav();
  initSettings();
  initBars();

  // Page-specific inits
  if (document.getElementById('ii-calendar'))    loadCalendar();
  if (document.getElementById('ii-story-list'))  loadGate1();
  if (document.getElementById('ii-draft-wrap'))  loadGate2();
});


/* ============================================================
   GITHUB API HELPERS
   ============================================================ */
const GH_OWNER = 'mmtm-studios';
const GH_REPO  = 'twinfang';
const GH_API   = 'https://api.github.com';

async function ghRequest(method, endpoint, body) {
  const pat = localStorage.getItem('gh_pat');
  const res = await fetch(`${GH_API}${endpoint}`, {
    method,
    headers: {
      'Authorization':        `Bearer ${pat}`,
      'Accept':               'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type':         'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const msg = await res.text();
    throw new Error(`${res.status} ${msg}`);
  }
  return res.json();
}

async function ghGetFileSHA(filePath) {
  try {
    const data = await ghRequest('GET', `/repos/${GH_OWNER}/${GH_REPO}/contents/${filePath}`);
    return data.sha || null;
  } catch { return null; }
}

async function ghCommitFile(filePath, content, message) {
  const sha  = await ghGetFileSHA(filePath);
  const body = {
    message,
    content: btoa(unescape(encodeURIComponent(content))),
    branch:  'main',
  };
  if (sha) body.sha = sha;
  return ghRequest('PUT', `/repos/${GH_OWNER}/${GH_REPO}/contents/${filePath}`, body);
}

async function ghTriggerWorkflow(workflow) {
  return ghRequest(
    'POST',
    `/repos/${GH_OWNER}/${GH_REPO}/actions/workflows/${workflow}/dispatches`,
    { ref: 'main' }
  );
}

function ghCheckPAT() {
  if (localStorage.getItem('gh_pat')) return true;
  openSettings();
  return false;
}


/* ============================================================
   SETTINGS MODAL
   ============================================================ */
const SVG_GEAR = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
  <circle cx="12" cy="12" r="3"/>
  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
</svg>`;

function initSettings() {
  // Inject settings gear into nav-right (before the dark mode toggle)
  const navRight = document.querySelector('.ii-nav-right');
  if (navRight) {
    const gearBtn = document.createElement('button');
    gearBtn.className   = 'ii-mode';
    gearBtn.id          = 'ii-settings-btn';
    gearBtn.setAttribute('aria-label', 'Dashboard settings');
    gearBtn.innerHTML   = SVG_GEAR;
    gearBtn.addEventListener('click', openSettings);
    navRight.insertBefore(gearBtn, navRight.firstChild);
  }

  // Inject modal into body
  const overlay = document.createElement('div');
  overlay.id        = 'ii-settings-overlay';
  overlay.className = 'ii-settings-overlay';
  overlay.innerHTML = `
    <div class="ii-settings-modal" role="dialog" aria-modal="true" aria-label="Dashboard settings">
      <div class="ii-settings-eyebrow">Dashboard Settings</div>
      <h2 class="ii-settings-title">GitHub Access</h2>
      <p class="ii-settings-desc">Your Personal Access Token is stored only in this browser. It needs <code>repo</code> and <code>workflow</code> scopes.</p>
      <label class="ii-settings-label" for="ii-pat-input">Personal Access Token</label>
      <input id="ii-pat-input" type="password" class="ii-settings-input" placeholder="ghp_…" autocomplete="off" spellcheck="false" />
      <div id="ii-pat-status" class="ii-settings-status"></div>
      <div class="ii-settings-actions">
        <button class="ii-btn" onclick="closeSettings()">Cancel</button>
        <button class="ii-btn primary" onclick="saveSettings()">Save Token</button>
      </div>
    </div>`;
  overlay.addEventListener('click', e => { if (e.target === overlay) closeSettings(); });
  document.body.appendChild(overlay);

  // Pre-fill if already stored
  const stored = localStorage.getItem('gh_pat');
  if (stored) document.getElementById('ii-pat-input').value = stored;
}

function openSettings() {
  const overlay = document.getElementById('ii-settings-overlay');
  if (overlay) {
    overlay.style.display = 'flex';
    const stored = localStorage.getItem('gh_pat');
    const input  = document.getElementById('ii-pat-input');
    if (input && stored) input.value = stored;
    const status = document.getElementById('ii-pat-status');
    if (status) status.textContent = stored ? '✓ Token saved' : '';
  }
}

function closeSettings() {
  const overlay = document.getElementById('ii-settings-overlay');
  if (overlay) overlay.style.display = 'none';
}

function saveSettings() {
  const input  = document.getElementById('ii-pat-input');
  const status = document.getElementById('ii-pat-status');
  const val    = (input?.value || '').trim();
  if (!val) { if (status) status.textContent = 'Enter a token first.'; return; }
  localStorage.setItem('gh_pat', val);
  if (status) status.textContent = '✓ Saved';
  setTimeout(closeSettings, 800);
}

window.openSettings  = openSettings;
window.closeSettings = closeSettings;
window.saveSettings  = saveSettings;
