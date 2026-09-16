'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const {
  createCollectionMetadata,
  collectionIsStale,
  sameCollection,
} = require('../scripts/lib/collection');

test('collection metadata includes an identity and date range', () => {
  const meta = createCollectionMetadata(
    new Date('2026-09-16T08:00:00.000Z'),
    new Date('2026-08-31T08:00:00.000Z')
  );
  assert.match(meta.collectionId, /^collection-2026-09-16T08-00-00-000Z-/);
  assert.deepEqual(meta.collectionRange, { start: '2026-08-31', end: '2026-09-16' });
  assert.equal(meta.collectedAt, '2026-09-16T08:00:00.000Z');
});

test('missing and expired collections are stale', () => {
  const now = new Date('2026-09-16T08:00:00.000Z');
  assert.equal(collectionIsStale({}, now), true);
  const current = {
    collectionId: 'collection-current',
    collectionRange: { start: '2026-08-31', end: '2026-09-16' },
    collectedAt: '2026-09-15T08:00:00.000Z',
  };
  assert.equal(collectionIsStale(current, now), false);
  assert.equal(collectionIsStale({ ...current, collectedAt: '2026-08-01T08:00:00.000Z' }, now), true);
});

test('pipeline records must carry the same collection ID', () => {
  assert.equal(sameCollection({ collectionId: 'a' }, { collectionId: 'a' }), true);
  assert.equal(sameCollection({ collectionId: 'a' }, { collectionId: 'b' }), false);
  assert.equal(sameCollection({ collectionId: 'a' }, {}), false);
});

test('issues 006 through 009 are visibly superseded', () => {
  const archive = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'archive.json'), 'utf8'));
  for (const issue of [6, 7, 8, 9]) {
    const entry = archive.find(item => item.issue === issue);
    assert.equal(entry?.superseded, true);
    assert.match(entry?.supersededNotice || '', /expired collection/i);
    const html = fs.readFileSync(path.join(ROOT, `issue-${String(issue).padStart(3, '0')}.html`), 'utf8');
    assert.match(html, /Superseded issue/);
  }
});

test('homepage is paused and does not present the stale issue', () => {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  assert.match(html, /Publication temporarily paused/);
  assert.match(html, /ii-publication-paused/);
});

test('email notification failure is explicitly non-fatal', () => {
  const source = fs.readFileSync(path.join(ROOT, 'scripts', 'collect.js'), 'utf8');
  assert.match(source, /Notification email failed \(collection remains valid\)/);
  assert.match(source, /try \{\s*await sendEmail/);
});

test('Gate 1 and downstream workflows enforce collection freshness and identity', () => {
  const core = fs.readFileSync(path.join(ROOT, 'assets', 'js', 'core.js'), 'utf8');
  const draft = fs.readFileSync(path.join(ROOT, 'scripts', 'draft.js'), 'utf8');
  const publish = fs.readFileSync(path.join(ROOT, 'scripts', 'publish.js'), 'utf8');
  assert.match(core, /Collection expired/);
  assert.match(core, /gate1CollectionStale \|\| !gate1Collection\.collectionId/);
  assert.match(draft, /collectionIsStale\(meta\)/);
  assert.match(publish, /sameCollection\(draft, decisions, meta\)/);
  assert.match(publish, /data-collection-id/);
});
