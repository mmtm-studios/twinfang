'use strict';

/* ============================================================
   INDUSTRY INSIGHTS — publish.js
   Triggered by Gate 2 "Publish Issue" via GitHub Actions.
   Reads draft.json → injects into index.html → saves it.
   ============================================================ */

const fs   = require('fs');
const path = require('path');

const ROOT  = path.join(__dirname, '..');
const draft = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'draft.json'),  'utf8'));
const meta  = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'meta.json'),   'utf8'));

// ── Build issue content ────────────────────────────────────────────────────

const SECTION_ORDER = [
  'Studio Moves', 'People on the Move', 'The Art Pipeline',
  'AI & The Craft', "Who's Buying What", 'On the Shelf',
  'The Field', 'TTRPG Industry',
];

const MAIN_SECTIONS = ['Studio Moves', 'People on the Move', 'The Art Pipeline', 'AI & The Craft', 'TTRPG Industry'];
const SIDE_SECTIONS = ["Who's Buying What", 'On the Shelf', 'The Field'];

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

function sectionHTML(sec) {
  return `
          <h2 class="ii-section-title">${sec.title}</h2>
          <div class="ii-body">${sec.content}</div>
          <hr class="ii-divider">`;
}

const mainSections = draft.sections
  .filter(s => MAIN_SECTIONS.includes(s.title))
  .sort((a, b) => SECTION_ORDER.indexOf(a.title) - SECTION_ORDER.indexOf(b.title))
  .map(sectionHTML).join('');

const sideSections = draft.sections
  .filter(s => SIDE_SECTIONS.includes(s.title))
  .sort((a, b) => SECTION_ORDER.indexOf(a.title) - SECTION_ORDER.indexOf(b.title))
  .map(sectionHTML).join('');

const gapItems = (draft.gapScan?.items || []).map((item, i) => `
          <div class="ii-gap-item">
            <span class="ii-gap-num">${String(i + 1).padStart(2, '0')}</span>
            <div class="ii-gap-body">
              <h4>${item.title}</h4>
              <p>${item.body}</p>
            </div>
          </div>`).join('');

const issueContent = `
      <div class="ii-issue-header">
        <div class="ii-issue-kicker">
          <span class="ii-issue-num-badge">Issue ${String(draft.issue).padStart(3, '0')}</span>
          <span class="ii-issue-date-badge">${formatDate(draft.date)}</span>
        </div>
        <h1 class="ii-h1">${draft.headline}</h1>
        <p class="ii-lead u-mt24">${draft.lead || ''}</p>
      </div>

      <div class="ii-stats">
        <div class="ii-stat">
          <div class="ii-stat-num">${draft.stats?.storiesApproved || '—'}</div>
          <div class="ii-stat-label">Stories Approved</div>
        </div>
        <div class="ii-stat">
          <div class="ii-stat-num">${draft.stats?.sourcesScanned || '—'}</div>
          <div class="ii-stat-label">Sources Scanned</div>
        </div>
        <div class="ii-stat">
          <div class="ii-stat-num">${draft.stats?.sectionsActive || '—'}</div>
          <div class="ii-stat-label">Sections</div>
        </div>
      </div>

      <div class="ii-grid-2">
        <div class="ii-main-col">${mainSections}
        </div>
        <div class="ii-side-col">${sideSections}
        </div>
      </div>
${gapItems ? `
      <div class="ii-gap-scan">
        <span class="ii-eyebrow">Gap Scan</span>
        <h2>${draft.gapScan.title}</h2>
        <p class="ii-lead">${draft.gapScan.lead || ''}</p>
        <div class="ii-gap-items">${gapItems}
        </div>
      </div>` : ''}`;

// ── Inject into index.html ─────────────────────────────────────────────────

let html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

// Replace everything between the two injection markers
html = html.replace(
  /<!-- ##ISSUE_START## -->[\s\S]*?<!-- ##ISSUE_END## -->/,
  `<!-- ##ISSUE_START## -->${issueContent}\n      <!-- ##ISSUE_END## -->`
);

fs.writeFileSync(path.join(ROOT, 'index.html'), html);

// Save standalone issue file (root-level so asset paths work unchanged)
const issueFilename = `issue-${String(draft.issue).padStart(3, '0')}.html`;
fs.writeFileSync(path.join(ROOT, issueFilename), html);

// Update archive.json
const archivePath = path.join(ROOT, 'data', 'archive.json');
let archive = [];
if (fs.existsSync(archivePath)) {
  try { archive = JSON.parse(fs.readFileSync(archivePath, 'utf8')); } catch (e) {}
}
archive = archive.filter(a => a.issue !== draft.issue); // remove if re-publishing
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
meta.nextIssue      = draft.issue + 1;
meta.lastPublished  = new Date().toISOString();
fs.writeFileSync(path.join(ROOT, 'data', 'meta.json'), JSON.stringify(meta, null, 2));

console.log(`Published Issue ${draft.issue}: "${draft.headline}"`);
