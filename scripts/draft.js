'use strict';

/* ============================================================
   INDUSTRY INSIGHTS — draft.js
   Triggered by Gate 1 "Proceed to Drafting" via GitHub Actions.
   Reads gate1-decisions.json + stories.json → Claude Sonnet
   writes sections → saves draft.json.
   ============================================================ */

const fs        = require('fs');
const path      = require('path');
const Anthropic = require('@anthropic-ai/sdk');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const DATA = (...f) => path.join(__dirname, '..', 'data', ...f);

// ── Section drafting ───────────────────────────────────────────────────────

async function draftSection(sectionName, stories) {
  const storiesList = stories.map(s =>
    `• ${s.headline}\n  Source: ${s.source} | URL: ${s.url}\n  ${s.summary}`
  ).join('\n\n');

  const response = await client.messages.create({
    model:      'claude-sonnet-4-6',
    max_tokens: 1200,
    system: `You are the editorial writer for Twinfang Industry Insights — a sharp internal briefing for Julian, Robby, and Stephen, founders of a Southeast Asian game art and animation studio. Write for busy founders who want insight, not summary. Be direct, analytical, and confident.`,
    messages: [{
      role: 'user',
      content: `Write the "${sectionName}" section of this issue.

Approved stories to cover:
${storiesList}

Instructions:
- 2–4 paragraphs total. Lead with the most strategically important story.
- Weave stories together thematically where possible rather than listing them one by one.
- Include source URLs inline as plain text where they add credibility.
- Return clean HTML using only <p> tags. No headings, no bullet points.
- Be specific about numbers, names, and implications for a game art studio.`,
    }],
  });

  return response.content[0].text.trim();
}

async function draftGapScan(allStories) {
  const digest = allStories.slice(0, 25).map(s =>
    `[${s.section}] ${s.headline}: ${s.summary}`
  ).join('\n');

  const response = await client.messages.create({
    model:      'claude-sonnet-4-6',
    max_tokens: 1200,
    system: `You are a strategic analyst for Twinfang, a Southeast Asian game art and animation studio. Your job is to spot patterns, threats, and whitespace opportunities that the founders might miss.`,
    messages: [{
      role: 'user',
      content: `Synthesise these approved stories into a Gap Scan — 3 to 5 strategic observations about threats, opportunities, or whitespace relevant to Twinfang's business.

Stories this period:
${digest}

Return ONLY a JSON object, no other text:
{
  "title": "Compelling headline for the Gap Scan (5–8 words)",
  "lead": "One sentence framing this period's strategic theme.",
  "items": [
    { "title": "Short observation title", "body": "2–3 sentences. What's happening, why it matters for Twinfang specifically, and what action or watchpoint follows." }
  ]
}`,
    }],
  });

  const text  = response.content[0].text;
  const match = text.match(/\{[\s\S]*\}/);
  return match ? JSON.parse(match[0]) : { title: 'Strategic Synthesis', lead: '', items: [] };
}

// ── Main ───────────────────────────────────────────────────────────────────

async function main() {
  console.log('── Twinfang Industry Insights: draft ────────────────────');

  const decisionsPath = DATA('gate1-decisions.json');
  const storiesPath   = DATA('stories.json');
  const draftPath     = DATA('draft.json');
  const metaPath      = DATA('meta.json');

  if (!fs.existsSync(decisionsPath)) {
    console.error('gate1-decisions.json not found — run Gate 1 first.');
    process.exit(1);
  }

  const decisions = JSON.parse(fs.readFileSync(decisionsPath, 'utf8'));
  const stories   = JSON.parse(fs.readFileSync(storiesPath,   'utf8'));
  const meta      = JSON.parse(fs.readFileSync(metaPath,      'utf8'));

  const approvedIds = Object.entries(decisions.decisions || {})
    .filter(([, d]) => d === 'approved')
    .map(([id]) => id);

  const approved = stories.filter(s => approvedIds.includes(s.id));
  console.log(`\n${approved.length} approved stories across ${new Set(approved.map(s => s.section)).size} sections`);

  if (approved.length === 0) {
    console.error('No approved stories found.');
    process.exit(1);
  }

  // Group by section
  const bySec = {};
  approved.forEach(s => {
    if (!bySec[s.section]) bySec[s.section] = [];
    bySec[s.section].push(s);
  });

  // Draft each section
  console.log('\n[1/2] Drafting sections with Claude Sonnet…');
  const sections = [];
  for (const [sectionName, sectionStories] of Object.entries(bySec)) {
    process.stdout.write(`  ${sectionName}… `);
    const content = await draftSection(sectionName, sectionStories);
    sections.push({
      title:   sectionName,
      content,
      sources: sectionStories.map(s => ({ headline: s.headline, url: s.url, source: s.source })),
    });
    console.log('done');
    await new Promise(r => setTimeout(r, 400));
  }

  // Add empty placeholder sections for any standard sections with no approved stories
  const ALL_SECTIONS = [
    'Studio Moves', 'People on the Move', 'The Art Pipeline',
    'AI & The Craft', "Who's Buying What", 'On the Shelf',
    'The Field', 'TTRPG Industry',
  ];
  const draftedTitles = new Set(sections.map(s => s.title));
  ALL_SECTIONS.forEach(title => {
    if (!draftedTitles.has(title)) {
      sections.push({ title, content: '<p><em>No stories approved for this section. Write manually or leave blank.</em></p>', sources: [] });
    }
  });
  // Re-sort to canonical order
  sections.sort((a, b) => ALL_SECTIONS.indexOf(a.title) - ALL_SECTIONS.indexOf(b.title));

  // Gap Scan
  console.log('\n[2/2] Generating Gap Scan…');
  const gapScan = await draftGapScan(approved);

  const draft = {
    issue:     meta.nextIssue,
    date:      new Date().toISOString().slice(0, 10),
    headline:  gapScan.title,
    lead:      gapScan.lead,
    sections,
    gapScan,
    stats: {
      storiesApproved: approved.length,
      sourcesScanned:  stories.length,
      sectionsActive:  sections.length,
    },
  };

  fs.writeFileSync(draftPath, JSON.stringify(draft, null, 2));
  console.log(`\n── Draft ready: Issue ${draft.issue} — "${draft.headline}" ─`);
}

main().catch(err => { console.error(err); process.exit(1); });
