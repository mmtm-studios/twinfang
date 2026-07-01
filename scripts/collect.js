'use strict';

/* ============================================================
   INDUSTRY INSIGHTS — collect.js
   Runs every 2 weeks via GitHub Actions.
   Fetches RSS feeds → scores with Claude → writes stories.json
   → sends notification email.
   ============================================================ */

const fs         = require('fs');
const path       = require('path');
const RSSParser  = require('rss-parser');
const nodemailer = require('nodemailer');
const Anthropic  = require('@anthropic-ai/sdk');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const parser = new RSSParser({ timeout: 10000 });
const SCORE_RETRIES = Number(process.env.SCORE_RETRIES || 3);
const SCORE_RETRY_DELAY_MS = Number(process.env.SCORE_RETRY_DELAY_MS || 2000);

// ── RSS sources (loaded from data/sources.json) ───────────────────────────
const SOURCES = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'data', 'sources.json'), 'utf8')
).filter(s => s.active !== false);

// ── Helpers ────────────────────────────────────────────────────────────────

function slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function cutoffDate() {
  const d = new Date();
  d.setDate(d.getDate() - 16); // 16-day window catches any drift
  return d;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchFeed(source) {
  try {
    const feed = await parser.parseURL(source.feed);
    return feed.items.map(item => ({
      headline:  (item.title || '').trim(),
      url:       item.link || item.guid || '',
      date:      item.pubDate || item.isoDate || new Date().toISOString(),
      section:   source.section,
      source:    source.name,
      rawDesc:   (item.contentSnippet || item.content || item.summary || '').slice(0, 400),
    }));
  } catch (err) {
    console.warn(`  ⚠ Feed failed: ${source.name} — ${err.message}`);
    return [];
  }
}

// Score a batch of up to 15 articles with Claude Haiku
async function scoreBatch(articles) {
  const listText = articles.map((a, i) =>
    `[${i}] "${a.headline}" — ${a.source} (${a.section})\n${a.rawDesc}`
  ).join('\n\n');

  const prompt = `You are the editorial assistant for Twinfang Industry Insights — an internal briefing for founders of a Southeast Asian game art and animation studio. Our focus: studio business moves, game art pipeline tools, AI in game development, TTRPG art market, competitor intelligence.

Score each article for relevance to our audience. Return ONLY a JSON array, no other text:
[{"index":0,"score":7,"summary":"One concise sentence about what happened and why it matters.","tags":["games","business"]}]

Scoring guide (be selective):
8-10 = directly relevant (studio acquisitions, major tool releases, AI art tools, TTRPG business)
5-7  = tangentially relevant (general games industry, adjacent tech)
1-4  = not relevant (sports, politics, unrelated consumer tech)

Tags: choose from games, art, ai, tools, business, ttrpg, film, people

Articles:
${listText}`;

  let lastErr;
  for (let attempt = 1; attempt <= SCORE_RETRIES; attempt += 1) {
    try {
      const response = await client.messages.create({
        model:      'claude-haiku-4-5-20251001',
        max_tokens: 2048,
        messages:   [{ role: 'user', content: prompt }],
      });
      const text  = response.content[0].text;
      const match = text.match(/\[[\s\S]*\]/);
      if (!match) throw new Error('Claude response did not include a JSON array');
      return JSON.parse(match[0]);
    } catch (err) {
      lastErr = err;
      console.warn(`  ⚠ Scoring batch attempt ${attempt}/${SCORE_RETRIES} failed: ${err.message}`);
      if (attempt < SCORE_RETRIES) await sleep(SCORE_RETRY_DELAY_MS * attempt);
    }
  }

  throw lastErr;
}

async function sendEmail(stories, issueNum) {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    console.log('  ℹ No email credentials — skipping notification.');
    return;
  }

  const sectionCounts = {};
  stories.forEach(s => {
    sectionCounts[s.section] = (sectionCounts[s.section] || 0) + 1;
  });

  const sectionRows = Object.entries(sectionCounts)
    .map(([sec, count]) => `<tr><td style="padding:6px 0;color:#5A5852">${sec}</td><td style="padding:6px 0;font-weight:700;text-align:right">${count}</td></tr>`)
    .join('');

  const pagesUrl  = process.env.GH_PAGES_URL || 'https://mmtm-studios.github.io/twinfang';
  const gate1Link = `${pagesUrl}/gate-1.html`;

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family:Inter,Arial,sans-serif;background:#F5F3EC;margin:0;padding:40px 20px">
  <div style="max-width:520px;margin:0 auto;background:#fff;border-top:4px solid #E8272A">
    <div style="padding:32px">
      <div style="font-size:10px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:#E8272A;margin-bottom:8px">Industry Insights</div>
      <h1 style="font-size:28px;font-weight:800;letter-spacing:-1px;color:#1A1A1A;margin:0 0 8px">Issue ${String(issueNum).padStart(3,'0')} Ready</h1>
      <p style="font-size:14px;color:#5A5852;margin:0 0 24px">${stories.length} stories collected across ${Object.keys(sectionCounts).length} sections. Head to Gate 1 to review and approve.</p>

      <table style="width:100%;border-top:1px solid #DEDAD2;margin-bottom:24px">${sectionRows}</table>

      <a href="${gate1Link}" style="display:inline-block;background:#E8272A;color:#fff;font-size:9px;font-weight:700;letter-spacing:2px;text-transform:uppercase;padding:12px 24px;text-decoration:none">
        Open Gate 1 →
      </a>
    </div>
    <div style="border-top:1px solid #DEDAD2;padding:16px 32px">
      <p style="font-size:10px;color:#AAAAAA;margin:0;letter-spacing:1px;text-transform:uppercase">Twinfang — Confidential &nbsp;·&nbsp; Industry Insights 2026</p>
    </div>
  </div>
</body>
</html>`;

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
  });

  const recipients = (process.env.NOTIFY_EMAIL || process.env.GMAIL_USER)
    .split(',').map(e => e.trim()).join(', ');

  await transporter.sendMail({
    from:    `"Industry Insights" <${process.env.GMAIL_USER}>`,
    to:      recipients,
    subject: `Industry Insights — Issue ${String(issueNum).padStart(3,'0')} ready for review`,
    html,
  });

  console.log(`  ✉ Email sent to ${process.env.NOTIFY_EMAIL || process.env.GMAIL_USER}`);
}

// ── Main ───────────────────────────────────────────────────────────────────

async function main() {
  console.log('── Twinfang Industry Insights: collect ──────────────────');

  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY is required for story scoring');
  }

  const metaPath    = path.join(__dirname, '..', 'data', 'meta.json');
  const storiesPath = path.join(__dirname, '..', 'data', 'stories.json');
  const meta        = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
  const cutoff      = cutoffDate();

  // 1. Fetch all feeds in parallel
  console.log(`\n[1/4] Fetching ${SOURCES.length} RSS feeds…`);
  const allItems = (await Promise.all(SOURCES.map(fetchFeed))).flat();
  console.log(`      ${allItems.length} raw items fetched`);

  // 2. Filter to last 16 days and deduplicate by URL
  const seen    = new Set();
  const recent  = allItems.filter(item => {
    if (!item.url || seen.has(item.url)) return false;
    const pubDate = new Date(item.date);
    if (isNaN(pubDate) || pubDate < cutoff) return false;
    seen.add(item.url);
    return true;
  });
  console.log(`      ${recent.length} items after dedup + date filter`);
  meta.storiesReviewed  = recent.length;
  meta.sourcesMonitored = SOURCES.length;

  // 3. Score in batches of 15 with Claude Haiku
  console.log('\n[2/4] Scoring articles with Claude Haiku…');
  const BATCH = 15;
  const scored = [];
  for (let i = 0; i < recent.length; i += BATCH) {
    const batch  = recent.slice(i, i + BATCH);
    process.stdout.write(`      Batch ${Math.floor(i/BATCH)+1}/${Math.ceil(recent.length/BATCH)}… `);
    const results = await scoreBatch(batch);
    results.forEach(r => {
      if (r.score >= 5) {
        const article = batch[r.index];
        if (!article) return;
        scored.push({
          id:       slugify(article.headline).slice(0, 40) + '-' + Date.now().toString(36),
          headline: article.headline,
          source:   article.source,
          url:      article.url,
          date:     new Date(article.date).toISOString().slice(0, 10),
          section:  article.section,
          summary:  r.summary || '',
          score:    r.score,
          tags:     r.tags || [],
        });
      }
    });
    console.log(`${results.filter(r => r.score >= 5).length} kept`);
    // Brief pause to avoid rate limits
    if (i + BATCH < recent.length) await new Promise(r => setTimeout(r, 500));
  }

  // Sort: by section, then score descending
  const SECTION_ORDER = [
    'Studio Moves', 'People on the Move', 'The Art Pipeline',
    'AI & The Craft', "Who's Buying What", 'On the Shelf',
    'The Field', 'TTRPG Industry',
  ];
  scored.sort((a, b) => {
    const si = SECTION_ORDER.indexOf(a.section) - SECTION_ORDER.indexOf(b.section);
    return si !== 0 ? si : b.score - a.score;
  });

  if (recent.length > 0 && scored.length === 0) {
    throw new Error(`Scoring kept 0 of ${recent.length} recent articles; refusing to overwrite data/stories.json with an empty queue`);
  }

  console.log(`\n[3/4] Writing ${scored.length} stories to data/stories.json…`);
  fs.writeFileSync(storiesPath, JSON.stringify(scored, null, 2));

  // Update meta
  meta.lastCollected = new Date().toISOString();
  fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2));

  // 4. Send email
  console.log('\n[4/4] Sending notification email…');
  await sendEmail(scored, meta.nextIssue);

  console.log('\n── Done ─────────────────────────────────────────────────');
  const bySec = {};
  scored.forEach(s => { bySec[s.section] = (bySec[s.section] || 0) + 1; });
  Object.entries(bySec).forEach(([s, c]) => console.log(`  ${s}: ${c}`));
}

main().catch(err => { console.error(err); process.exit(1); });
