'use strict';

const { execFileSync } = require('child_process');

const expected = process.argv[2];
const ref = process.argv[3] || 'HEAD';

if (!expected) throw new Error('Expected generation ID is required.');

const raw = execFileSync('git', ['show', `${ref}:data/gate1-decisions.json`], { encoding: 'utf8' });
const current = JSON.parse(raw);

if (current.generationId !== expected) {
  throw new Error('A newer Gate 1 generation exists; discarding this stale draft run.');
}

console.log(`Generation ${expected} is still current.`);
