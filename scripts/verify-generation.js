'use strict';

const { execFileSync } = require('child_process');

const expected = process.argv[2];
const ref = process.argv[3] || 'HEAD';
const expectedCollection = process.argv[4];

if (!expected) throw new Error('Expected generation ID is required.');

const raw = execFileSync('git', ['show', `${ref}:data/gate1-decisions.json`], { encoding: 'utf8' });
const current = JSON.parse(raw);

if (current.generationId !== expected) {
  throw new Error('A newer Gate 1 generation exists; discarding this stale draft run.');
}
if (!expectedCollection || current.collectionId !== expectedCollection) {
  throw new Error('The Gate 1 collection changed; discarding this stale draft run.');
}

console.log(`Generation ${expected} is still current.`);
