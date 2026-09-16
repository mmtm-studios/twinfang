'use strict';

const crypto = require('crypto');

const DEFAULT_MAX_AGE_DAYS = 18;

function isoDate(value) {
  return new Date(value).toISOString().slice(0, 10);
}

function createCollectionMetadata(now = new Date(), start = null) {
  const collectedAt = new Date(now);
  const rangeStart = start ? new Date(start) : new Date(collectedAt);
  if (!start) rangeStart.setUTCDate(rangeStart.getUTCDate() - 16);

  return {
    collectionId: `collection-${collectedAt.toISOString().replace(/[:.]/g, '-')}-${crypto.randomUUID()}`,
    collectionRange: {
      start: isoDate(rangeStart),
      end: isoDate(collectedAt),
    },
    collectedAt: collectedAt.toISOString(),
  };
}

function collectionIsStale(meta, now = new Date(), maxAgeDays = DEFAULT_MAX_AGE_DAYS) {
  if (!meta || !meta.collectionId || !meta.collectedAt ||
      !meta.collectionRange?.start || !meta.collectionRange?.end) return true;
  const collectedAt = new Date(meta.collectedAt);
  if (Number.isNaN(collectedAt.getTime())) return true;
  return new Date(now).getTime() - collectedAt.getTime() > maxAgeDays * 86400000;
}

function sameCollection(...records) {
  if (!records.length || records.some(record => !record?.collectionId)) return false;
  return records.every(record => record.collectionId === records[0].collectionId);
}

module.exports = {
  DEFAULT_MAX_AGE_DAYS,
  createCollectionMetadata,
  collectionIsStale,
  sameCollection,
};
