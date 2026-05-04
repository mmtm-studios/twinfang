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
  renderQuarterTable();
  renderCalendar();
  initFilters();
}

function renderQuarterTable() {
  const wrap = document.getElementById('ii-quarter-table');
  if (!wrap || !calEvents.length) return;

  const KEY_IDS = new Set(['gdc-2026','siggraph-2026','thwau-2026','xds-2026','annecy-2026']);

  function fmtRange(start, end) {
    const MO = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const s  = new Date(start + 'T12:00:00');
    const e  = new Date(end   + 'T12:00:00');
    if (start === end) return `${MO[s.getMonth()]} ${s.getDate()}`;
    if (s.getMonth() === e.getMonth()) return `${MO[s.getMonth()]} ${s.getDate()}–${e.getDate()}`;
    return `${MO[s.getMonth()]} ${s.getDate()} – ${MO[e.getMonth()]} ${e.getDate()}`;
  }

  const quarters = [
    { label: 'Q1', range: 'Jan – Mar', months: [0,1,2] },
    { label: 'Q2', range: 'Apr – Jun', months: [3,4,5] },
    { label: 'Q3', range: 'Jul – Sep', months: [6,7,8] },
    { label: 'Q4', range: 'Oct – Dec', months: [9,10,11] },
  ];

  const byQuarter = quarters.map(q => ({
    ...q,
    events: calEvents
      .filter(ev => {
        const m = new Date(ev.start + 'T12:00:00').getMonth();
        return q.months.includes(m);
      })
      .sort((a, b) => a.start.localeCompare(b.start)),
  }));

  const colsHTML = byQuarter.map(q => {
    const rows = q.events.map(ev => {
      const color = CAT_COLORS[ev.category] || '#9CA3AF';
      const isKey = KEY_IDS.has(ev.id);
      return `
        <a class="ii-qev" href="${ev.url}" target="_blank" rel="noopener">
          <span class="ii-qev-dot" style="background:${color}"></span>
          <div class="ii-qev-body">
            <div class="ii-qev-name">
              ${ev.name}
              ${isKey ? '<span class="ii-qev-key">KEY</span>' : ''}
            </div>
            <div class="ii-qev-meta">${fmtRange(ev.start, ev.end)} · ${ev.location}</div>
          </div>
        </a>`;
    }).join('');

    return `
      <div class="ii-qcol">
        <div class="ii-qcol-head">
          <span class="ii-qcol-label">${q.label}</span>
          <span class="ii-qcol-range">${q.range}</span>
          <span class="ii-qcol-count">${q.events.length}</span>
        </div>
        <div class="ii-qcol-events">${rows || '<div class="ii-qev-empty">No events</div>'}</div>
      </div>`;
  }).join('');

  wrap.innerHTML = `
    <div class="ii-quarter-wrap">
      <div class="ii-quarter-eyebrow">2026 at a Glance</div>
      <div class="ii-quarter-grid">${colsHTML}</div>
    </div>`;
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
    document.getElementById('ii-gate1-status').textContent = 'Draft Generating…';
    document.getElementById('ii-gate1-status').className   = 'ii-gate-status-pill pending';

    // Swap button for progress bar
    btn.style.display = 'none';
    const progressWrap = document.getElementById('ii-draft-progress');
    const progressBar  = document.getElementById('ii-draft-progress-bar');
    const progressPct  = document.getElementById('ii-draft-progress-pct');
    const progressLbl  = document.getElementById('ii-draft-progress-label');
    const gate2Link    = document.getElementById('ii-gate2-link');
    progressWrap.style.display = 'block';

    // Animate over 3 minutes to 95%, then snap to 100% and reveal Gate 2 link
    const DURATION = 180;
    let elapsed = 0;
    const tick = setInterval(() => {
      elapsed++;
      const pct = Math.min(95, Math.round((elapsed / DURATION) * 95));
      progressBar.style.width = pct + '%';
      progressPct.textContent = pct + '%';
      if (elapsed >= DURATION) {
        clearInterval(tick);
        progressBar.style.width = '100%';
        progressPct.textContent = '100%';
        progressLbl.textContent = 'Draft ready';
        setTimeout(() => {
          progressWrap.style.display = 'none';
          gate2Link.style.display    = 'inline-flex';
          document.getElementById('ii-gate1-status').textContent = 'Draft Ready';
          document.getElementById('ii-gate1-status').className   = 'ii-gate-status-pill ready';
        }, 800);
      }
    }, 1000);
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
let gate2Draft   = {};
let gate2Stories = [];

const SECTION_COLORS = {
  'Studio Moves':       '#E8272A',
  'People on the Move': '#3B82F6',
  'The Art Pipeline':   '#10B981',
  'AI & The Craft':     '#8B5CF6',
  "Who's Buying What":  '#F59E0B',
  'On the Shelf':       '#EC4899',
  'The Field':          '#6366F1',
  'TTRPG Industry':     '#14B8A6',
};

async function loadGate2() {
  const wrap = document.getElementById('ii-draft-wrap');
  if (!wrap) return;

  const [draftRes, storiesRes] = await Promise.allSettled([
    fetch('data/draft.json'),
    fetch('data/stories.json'),
  ]);

  try {
    if (draftRes.status === 'fulfilled' && draftRes.value.ok)
      gate2Draft = await draftRes.value.json();
  } catch (e) { gate2Draft = {}; }

  try {
    if (storiesRes.status === 'fulfilled' && storiesRes.value.ok) {
      const all = await storiesRes.value.json();
      gate2Stories = all.sort((a, b) => (b.score || 0) - (a.score || 0)).slice(0, 5);
    }
  } catch (e) { gate2Stories = []; }

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

  const date = gate2Draft.date
    ? new Date(gate2Draft.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : '';
  const gapItems    = gate2Draft.gapScan?.items || [];
  const activeSecs  = (gate2Draft.sections || []).filter(s => s.sources?.length > 0).length;

  // Distribute gap items only across sections that have stories
  let gapIdx = 0;
  const sectionGapMap = (gate2Draft.sections || []).map(sec => {
    if (sec.sources?.length > 0 && gapIdx < gapItems.length) return gapItems[gapIdx++];
    return null;
  });

  // ── Issue header + top-level Approve All ─────────────────────────────────
  let html = `
    <div style="padding:32px 0 40px;border-bottom:1px solid var(--bd);margin-bottom:40px">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">
        <span class="ii-issue-num-badge">Issue ${String(gate2Draft.issue || 1).padStart(3,'0')}</span>
        <span class="ii-issue-date-badge">${date}</span>
      </div>
      <h1 class="ii-h2" style="margin-bottom:10px">${gate2Draft.headline || 'Draft'}</h1>
      <p class="ii-lead" style="max-width:680px">${gate2Draft.lead || ''}</p>
      <div style="display:flex;align-items:center;justify-content:space-between;margin-top:20px">
        <div style="display:flex;gap:16px;font-size:11px;letter-spacing:1px;text-transform:uppercase;color:var(--tx3)">
          <span>${gate2Draft.stats?.storiesApproved || 0} stories approved</span>
          <span>·</span>
          <span>${activeSecs} active sections</span>
        </div>
        <button class="ii-btn approve" onclick="approveAll()" style="font-size:9px">✓ Approve All Sections</button>
      </div>
    </div>`;

  // ── Story highlights ──────────────────────────────────────────────────────
  if (gate2Stories.length > 0) {
    html += `
    <div style="margin-bottom:48px">
      <div style="font-size:9px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:var(--tx3);margin-bottom:16px">Top Stories This Period</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:12px">
        ${gate2Stories.map(s => {
          const color = SECTION_COLORS[s.section] || '#6366F1';
          const lead  = s.summary ? (s.summary.length > 110 ? s.summary.slice(0, 107) + '…' : s.summary) : '';
          return `<a href="${s.url}" target="_blank" rel="noopener" style="display:block;padding:16px 18px;border:1px solid var(--bd);border-top:3px solid ${color};text-decoration:none;transition:box-shadow .15s" onmouseover="this.style.boxShadow='0 4px 16px rgba(0,0,0,.08)'" onmouseout="this.style.boxShadow='none'">
            <div style="font-size:8px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:${color};margin-bottom:8px">${s.section}</div>
            <div style="font-size:13px;font-weight:600;color:var(--tx);line-height:1.4;margin-bottom:8px">${s.headline}</div>
            <div style="font-size:12px;color:var(--tx3);line-height:1.55">${lead}</div>
          </a>`;
        }).join('')}
      </div>
    </div>`;
  }

  // ── Sections with gap scan items interspersed ─────────────────────────────
  const actionBtns = (i) => `
    <div style="display:flex;gap:8px">
      <button class="ii-btn approve" onclick="approveSection(${i})">✓ Approve</button>
      <button class="ii-btn"         onclick="regenerateSection(${i})">↺ Re-draft</button>
    </div>`;

  gate2Draft.sections.forEach((sec, i) => {
    const isEmpty  = !sec.sources || sec.sources.length === 0;
    const srcCount = (sec.sources || []).length;
    const gapItem  = sectionGapMap[i];

    const content  = isEmpty
      ? `<p style="color:var(--tx3);font-style:italic">No updates this period.</p>`
      : sec.content;

    const srcHTML = srcCount ? `
      <details style="margin-top:16px;border-top:1px solid var(--bd);padding-top:14px">
        <summary style="font-size:9px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:var(--tx3);cursor:pointer;list-style:none">▸ ${srcCount} source${srcCount > 1 ? 's' : ''} used</summary>
        <div style="margin-top:10px;display:flex;flex-direction:column;gap:6px">
          ${(sec.sources || []).map(s => `
            <div style="display:flex;align-items:baseline;gap:10px">
              <span style="font-size:11px;color:var(--tx2);flex:1;line-height:1.45">${s.headline}</span>
              <a href="${s.url}" target="_blank" rel="noopener" style="font-size:9px;letter-spacing:1px;text-transform:uppercase;color:var(--red);white-space:nowrap;flex-shrink:0">${s.source} ↗</a>
            </div>`).join('')}
        </div>
      </details>` : '';

    const gapHTML = gapItem ? `
      <div style="flex-shrink:0;width:252px;align-self:flex-start;padding:16px 18px;background:var(--bg2);border-left:3px solid var(--red)">
        <div style="font-size:8px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:var(--red);margin-bottom:8px">Strategic Insight</div>
        <div style="font-size:12px;font-weight:600;color:var(--tx);line-height:1.4;margin-bottom:6px">${gapItem.title}</div>
        <div style="font-size:12px;color:var(--tx2);line-height:1.65">${gapItem.body}</div>
      </div>` : '';

    html += `
    <div class="ii-draft-section" id="draft-sec-${i}" style="${isEmpty ? 'opacity:.5' : ''}">
      <div class="ii-draft-section-head" onclick="toggleSection(${i})">
        <div style="display:flex;align-items:center;gap:10px">
          <h3>${sec.title}</h3>
          ${isEmpty ? `<span style="font-size:8px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--tx3);border:1px solid var(--bd);padding:2px 6px">No stories</span>` : ''}
        </div>
        <span class="ii-meta" id="sec-status-${i}">Review</span>
      </div>
      <div class="ii-draft-section-body open" id="sec-body-${i}">
        <div style="display:flex;justify-content:flex-end;margin-bottom:14px;padding-bottom:14px;border-bottom:1px solid var(--bd)">
          ${actionBtns(i)}
        </div>
        <div style="display:flex;gap:24px;align-items:flex-start">
          <div class="ii-draft-text" id="sec-text-${i}" contenteditable="${!isEmpty}" spellcheck="true" style="flex:1;min-width:0">${content}</div>
          ${gapHTML}
        </div>
        ${srcHTML}
        <div style="margin-top:20px;padding-top:16px;border-top:1px solid var(--bd)">
          ${actionBtns(i)}
        </div>
      </div>
    </div>`;
  });

  wrap.innerHTML = html;
  checkAllApproved();
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

function approveAll() {
  if (!gate2Draft.sections) return;
  gate2Draft.sections.forEach((_, i) => approveSection(i));
}

function regenerateSection(i) {
  const status = document.getElementById('sec-status-' + i);
  if (status) { status.textContent = 'Re-draft requested'; status.style.color = '#F59E0B'; }
  alert('Re-draft sends this section back to Claude with your edits as context. Coming soon.');
}

function checkAllApproved() {
  if (!gate2Draft.sections) return;
  const total = gate2Draft.sections.length;
  let count = 0;
  document.querySelectorAll('[id^="sec-status-"]').forEach(s => {
    if (s.textContent.includes('✓')) count++;
  });
  const tally = document.getElementById('ii-gate2-tally');
  if (tally) tally.textContent = `${count} of ${total} sections approved`;
  const btn = document.getElementById('ii-gate2-publish');
  if (btn) btn.disabled = count < total;
}

async function gate2Publish() {
  if (!ghCheckPAT()) return;

  const btn = document.getElementById('ii-gate2-publish');
  btn.disabled    = true;
  btn.textContent = 'Saving edits…';

  try {
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

    btn.textContent = 'Triggering publish…';
    await ghTriggerWorkflow('publish.yml');

    // Swap button + approve-all for progress bar
    btn.style.display = 'none';
    const approveAllBtn  = document.getElementById('ii-gate2-approve-all');
    if (approveAllBtn) approveAllBtn.style.display = 'none';

    const progressWrap = document.getElementById('ii-publish-progress');
    const progressBar  = document.getElementById('ii-publish-progress-bar');
    const progressPct  = document.getElementById('ii-publish-progress-pct');
    const progressLbl  = document.getElementById('ii-publish-progress-label');
    progressWrap.style.display = 'block';

    document.getElementById('ii-gate2-status').textContent = 'Publishing…';
    document.getElementById('ii-gate2-status').className   = 'ii-gate-status-pill pending';

    // publish.yml takes ~60s — animate to 95% then snap to 100%
    const DURATION = 60;
    let elapsed = 0;
    const tick = setInterval(() => {
      elapsed++;
      const pct = Math.min(95, Math.round((elapsed / DURATION) * 95));
      progressBar.style.width = pct + '%';
      progressPct.textContent = pct + '%';
      if (elapsed >= DURATION) {
        clearInterval(tick);
        progressBar.style.width = '100%';
        progressPct.textContent = '100%';
        progressLbl.textContent = 'Published!';
        setTimeout(() => {
          progressWrap.style.display = 'none';
          showPublishSuccess();
        }, 600);
      }
    }, 1000);

  } catch (err) {
    btn.textContent  = 'Error — retry';
    btn.disabled     = false;
    btn.style.display = '';
    console.error(err);
    alert('GitHub API error: ' + err.message + '\n\nCheck your PAT in Settings.');
  }
}

function showPublishSuccess() {
  const issueNum = String(gate2Draft.issue || 1).padStart(3, '0');
  const siteUrl  = `https://${GH_OWNER}.github.io/${GH_REPO}/`;

  const overlay = document.createElement('div');
  overlay.id = 'ii-publish-success-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:1000;display:flex;align-items:center;justify-content:center';
  overlay.innerHTML = `
    <div style="background:var(--bg);border:1px solid var(--bd);padding:44px 52px;max-width:460px;width:90%;text-align:center">
      <div style="width:52px;height:52px;background:#10B981;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 20px;font-size:24px;color:#fff">✓</div>
      <div style="font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:var(--tx3);margin-bottom:10px">Issue ${issueNum} Published</div>
      <h2 style="font-size:21px;font-weight:800;color:var(--tx);margin-bottom:10px;line-height:1.25">${gate2Draft.headline || 'Report Created'}</h2>
      <p style="font-size:13px;color:var(--tx2);line-height:1.65;margin-bottom:28px">Your issue is live on GitHub Pages. Allow a minute for CDN propagation if the page hasn't updated yet.</p>
      <a href="${siteUrl}" target="_blank" rel="noopener"
        style="display:inline-block;padding:13px 32px;background:var(--red);color:#fff;font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;text-decoration:none;margin-bottom:16px">
        View Report →
      </a>
      <br>
      <button onclick="document.getElementById('ii-publish-success-overlay').remove()"
        style="background:none;border:none;font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--tx3);cursor:pointer;padding:4px 0">
        Dismiss
      </button>
    </div>`;

  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
  document.body.appendChild(overlay);

  document.getElementById('ii-gate2-status').textContent = 'Published';
  document.getElementById('ii-gate2-status').className   = 'ii-gate-status-pill ready';
}

window.toggleSection     = toggleSection;
window.approveSection    = approveSection;
window.approveAll        = approveAll;
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
   PUBLISHED ISSUE — TAB NAVIGATION
   ============================================================ */
function switchTab(tabId) {
  document.querySelectorAll('.ii-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.ii-tab-panel').forEach(p => p.classList.remove('active'));
  const tab   = document.querySelector(`.ii-tab[data-tab="${tabId}"]`);
  const panel = document.getElementById('panel-' + tabId);
  if (tab)   tab.classList.add('active');
  if (panel) panel.classList.add('active');
  if (history.replaceState) history.replaceState(null, '', '#' + tabId);
}

function initTabs() {
  const nav = document.querySelector('.ii-tabs-nav');
  if (!nav) return;
  // Restore tab from URL hash
  const hash = location.hash.replace('#', '');
  if (hash && document.getElementById('panel-' + hash)) switchTab(hash);
  // Keyboard arrow navigation
  nav.addEventListener('keydown', e => {
    const tabs = [...document.querySelectorAll('.ii-tab')];
    const idx  = tabs.findIndex(t => t.classList.contains('active'));
    if (e.key === 'ArrowRight' && idx < tabs.length - 1) { tabs[idx + 1].focus(); switchTab(tabs[idx + 1].dataset.tab); }
    if (e.key === 'ArrowLeft'  && idx > 0)               { tabs[idx - 1].focus(); switchTab(tabs[idx - 1].dataset.tab); }
  });
}

window.switchTab = switchTab;


/* ============================================================
   ARCHIVE
   ============================================================ */
async function loadArchive() {
  const list = document.getElementById('ii-archive-list');
  if (!list) return;

  try {
    const res = await fetch('data/archive.json');
    if (!res.ok) throw new Error();
    const issues = await res.json();
    if (!issues || issues.length === 0) return; // keep empty state

    list.innerHTML = issues.map(iss => {
      const date   = new Date(iss.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
      const teaser = iss.lead ? (iss.lead.length > 150 ? iss.lead.slice(0, 147) + '…' : iss.lead) : '';
      return `
      <a class="ii-issue-card" href="${iss.file}">
        <div class="ii-issue-card-meta">
          <div class="ii-issue-badge">Issue ${String(iss.issue).padStart(3, '0')} · ${date}</div>
          <div class="ii-issue-headline">${iss.headline}</div>
          <div class="ii-issue-teaser">${teaser}</div>
        </div>
        <span class="ii-issue-arrow">→</span>
      </a>`;
    }).join('');
  } catch (e) {
    // keep empty state on fetch error
  }
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
  if (document.getElementById('ii-archive-list')) loadArchive();
  initTabs();
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
  if (res.status === 204 || res.headers.get('content-length') === '0') return null;
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
  // Inject gear icon as a link to admin.html (before the dark mode toggle)
  // Skip on admin.html itself — it has its own nav label
  if (window.location.pathname.endsWith('admin.html')) return;
  const navRight = document.querySelector('.ii-nav-right');
  if (!navRight) return;
  const gearLink = document.createElement('a');
  gearLink.href      = 'admin.html';
  gearLink.className = 'ii-mode';
  gearLink.id        = 'ii-settings-btn';
  gearLink.setAttribute('aria-label', 'Admin');
  gearLink.innerHTML = SVG_GEAR;
  navRight.insertBefore(gearLink, navRight.firstChild);
}

function ghCheckPAT() {
  if (localStorage.getItem('gh_pat')) return true;
  alert('No GitHub token found. Visit the Admin page to set your Personal Access Token.');
  return false;
}
