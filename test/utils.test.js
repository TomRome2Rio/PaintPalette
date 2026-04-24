import test from 'node:test';
import assert from 'node:assert/strict';
import { formatMiniatureLabel, normalizeText, sortByCreatedAtDesc } from '../src/utils.js';

test('normalizeText trims and handles null values', () => {
  assert.equal(normalizeText('  Abaddon Black  '), 'Abaddon Black');
  assert.equal(normalizeText(null), '');
});

test('sortByCreatedAtDesc sorts newest items first', () => {
  const sorted = sortByCreatedAtDesc([
    { id: 'a', createdAt: { seconds: 1 } },
    { id: 'b', createdAt: { seconds: 3 } },
    { id: 'c' }
  ]);

  assert.deepEqual(
    sorted.map((item) => item.id),
    ['b', 'a', 'c']
  );
});

test('formatMiniatureLabel includes faction when available', () => {
  assert.equal(formatMiniatureLabel({ name: 'Space Marine', faction: 'Ultramarines' }), 'Space Marine (Ultramarines)');
  assert.equal(formatMiniatureLabel({ name: 'Termagant', faction: '' }), 'Termagant');
});
