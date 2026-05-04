'use strict';

/* ============================================================
   INDUSTRY INSIGHTS — publish.js
   Triggered by Gate 2 "Publish Issue" via GitHub Actions.
   Reads draft.json → builds tab-based HTML → saves it.
   ============================================================ */

const fs   = require('fs');
const path = require('path');

const ROOT  = path.join(__dirname, '..');
const draft = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'draft.json'), 'utf8'));
const meta  = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'meta.json'),  'utf8'));

// Load stories.json to get total scored count
let storiesScored = 0;
try {
  const all = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'stories.json'), 'utf8'));
  storiesScored = all.length;
} catch (e) {}

// ── Helpers ────────────────────────────────────────────────────────────────

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

function toSlug(title) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function linkifyContent(html) {
  // (https://url) → clickable domain link
  html = html.replace(/\(https?:\/\/([^\s)>]+)\)/g, (_, rest) => {
    const url = 'https://' + rest;
    try {
      const domain = new URL(url).hostname.replace(/^www\./, '');
      return `(<a href="${url}" target="_blank" rel="noopener noreferrer">${domain}</a>)`;
    } catch { return '(' + 'https://' + rest + ')'; }
  });
  // bare https:// not already inside an attribute
  html = html.replace(/(?<![="'(])https?:\/\/[^\s<"')]+/g, url => {
    try {
      const domain = new URL(url).hostname.replace(/^www\./, '');
      return `<a href="${url}" target="_blank" rel="noopener noreferrer">${domain}</a>`;
    } catch { return url; }
  });
  return html;
}

function extractPullQuote(html) {
  const m = html.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
  if (!m) return null;
  const text = m[1].replace(/<[^>]+>/g, '').replace(/https?:\/\/\S+/g, '').trim();
  const sentences = text.match(/[^.!?]{40,}[.!?]+/g) || [];
  const candidate = sentences.filter(s => s.trim().length > 60).pop();
  return candidate ? candidate.trim().replace(/[.!?]$/, '') : null;
}

// ── Build issue content ────────────────────────────────────────────────────

const activeSections = draft.sections.filter(s => s.sources && s.sources.length > 0);
const maxSrcCount    = Math.max(1, ...activeSections.map(s => s.sources.length));
const sourcesMonitored = meta.sourcesMonitored || 29;
const storiesReviewed  = meta.storiesReviewed  || storiesScored;

// Stat bar (4 metrics)
const statsHTML = `
      <div class="ii-stats">
        <div class="ii-stat">
          <div class="ii-stat-num">${sourcesMonitored}</div>
          <div class="ii-stat-label">RSS Feeds Monitored</div>
        </div>
        <div class="ii-stat">
          <div class="ii-stat-num">${storiesReviewed || '—'}</div>
          <div class="ii-stat-label">Articles Scored</div>
        </div>
        <div class="ii-stat">
          <div class="ii-stat-num">${draft.stats?.storiesApproved || '—'}</div>
          <div class="ii-stat-label">Selected for Issue</div>
        </div>
        <div class="ii-stat">
          <div class="ii-stat-num">${activeSections.length}</div>
          <div class="ii-stat-label">Active Sections</div>
        </div>
      </div>`;

// Tab navigation
const tabsNavHTML = `
      <div class="ii-tabs-nav">
        <div class="ii-tabs-scroll">
          ${activeSections.map((sec, i) => `<button class="ii-tab${i === 0 ? ' active' : ''}" data-tab="${toSlug(sec.title)}" onclick="switchTab('${toSlug(sec.title)}')">${sec.title}<span class="ii-tab-badge">${sec.sources.length}</span></button>`).join('')}
          <button class="ii-tab" data-tab="strategic-insights" onclick="switchTab('strategic-insights')">Strategic Insights</button>
        </div>
      </div>`;

// Section panels
const sectionPanelsHTML = activeSections.map((sec, i) => {
  const slug      = toSlug(sec.title);
  const content   = linkifyContent(sec.content);
  const pullQuote = extractPullQuote(sec.content);

  const pullHTML = pullQuote ? `
          <blockquote class="ii-tab-pullquote"><p>${pullQuote}</p></blockquote>` : '';

  const srcHTML = sec.sources.length ? `
          <div class="ii-article-sources">
            <div class="ii-sources-label">${sec.sources.length} source${sec.sources.length > 1 ? 's' : ''} referenced</div>
            <div class="ii-sources-grid">
              ${sec.sources.map(s => `<a href="${s.url}" target="_blank" rel="noopener noreferrer" class="ii-source-chip"><span class="ii-source-name">${s.source}</span><span class="ii-source-headline">${String(s.headline).replace(/<[^>]+>/g, '')}</span></a>`).join('')}
            </div>
          </div>` : '';

  return `
        <div class="ii-tab-panel${i === 0 ? ' active' : ''}" id="panel-${slug}">
          ${pullHTML}
          <div class="ii-article-body">${content}</div>
          ${srcHTML}
        </div>`;
}).join('');

// Distribution bars for Strategic Insights tab
const distBarsHTML = activeSections.map(sec => `
            <div class="ii-dist-row">
              <span class="ii-dist-label">${sec.title}</span>
              <div class="ii-dist-track"><div class="ii-dist-fill" style="width:${Math.round((sec.sources.length / maxSrcCount) * 100)}%"></div></div>
              <span class="ii-dist-count">${sec.sources.length}</span>
            </div>`).join('');

// Strategic Insights (gap scan) panel
const gapPanelHTML = `
        <div class="ii-tab-panel" id="panel-strategic-insights">
          <div class="ii-gap-intro">
            <h2 class="ii-h2" style="margin-bottom:12px">${draft.gapScan?.title || 'Strategic Insights'}</h2>
            <p class="ii-lead">${draft.gapScan?.lead || ''}</p>
          </div>
          <div class="ii-gap-cards">
            ${(draft.gapScan?.items || []).map((item, i) => `
            <div class="ii-gap-card">
              <div class="ii-gap-card-num">${String(i + 1).padStart(2, '0')}</div>
              <div>
                <h3 class="ii-gap-card-title">${item.title}</h3>
                <p class="ii-gap-card-text">${item.body}</p>
              </div>
            </div>`).join('')}
          </div>
          ${distBarsHTML ? `
          <div class="ii-dist-chart">
            <div class="ii-dist-title">Stories by Section This Issue</div>
            ${distBarsHTML}
          </div>` : ''}
        </div>`;

// Full issue content
const issueContent = `
      <div class="ii-issue-header">
        <div class="ii-issue-kicker">
          <span class="ii-issue-num-badge">Issue ${String(draft.issue).padStart(3, '0')}</span>
          <span class="ii-issue-date-badge">${formatDate(draft.date)}</span>
        </div>
        <h1 class="ii-h1">${draft.headline}</h1>
        <p class="ii-lead u-mt24">${draft.lead || ''}</p>
      </div>
      ${statsHTML}
      ${tabsNavHTML}
      <div class="ii-tab-panels">
        ${sectionPanelsHTML}
        ${gapPanelHTML}
      </div>`;

// ── Inject into index.html ─────────────────────────────────────────────────

let html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
html = html.replace(
  /<!-- ##ISSUE_START## -->[\s\S]*?<!-- ##ISSUE_END## -->/,
  `<!-- ##ISSUE_START## -->${issueContent}\n      <!-- ##ISSUE_END## -->`
);
fs.writeFileSync(path.join(ROOT, 'index.html'), html);

// Save standalone issue file
const issueFilename = `issue-${String(draft.issue).padStart(3, '0')}.html`;
fs.writeFileSync(path.join(ROOT, issueFilename), html);

// Update archive.json
const archivePath = path.join(ROOT, 'data', 'archive.json');
let archive = [];
if (fs.existsSync(archivePath)) {
  try { archive = JSON.parse(fs.readFileSync(archivePath, 'utf8')); } catch (e) {}
}
archive = archive.filter(a => a.issue !== draft.issue);
archive.unshift({
  issue:    draft.issue,
  date:     draft.date,
  headline: draft.headline,
  lead:     draft.lead || '',
  stats:    draft.stats || {},
  file:     issueFilename,
});
fs.writeFileSync(archivePath, JSON.stringify(archive, null, 2));

// Bump issue counter in meta.json
meta.nextIssue     = draft.issue + 1;
meta.lastPublished = new Date().toISOString();
fs.writeFileSync(path.join(ROOT, 'data', 'meta.json'), JSON.stringify(meta, null, 2));

console.log(`Published Issue ${draft.issue}: "${draft.headline}"`);
