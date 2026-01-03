import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { format } from '../src/ui/messages.js';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const snapshotPath = path.resolve(currentDir, '__snapshots__/ui-texts.snapshot.json');
const snapshot = JSON.parse(fs.readFileSync(snapshotPath, 'utf8'));

test('formats UI messages according to snapshot', () => {
  const rendered = Object.fromEntries(
    Object.entries(snapshot).map(([key, entry]) => [key, format(entry.key ?? key, entry.params)])
  );

  const expected = Object.fromEntries(Object.entries(snapshot).map(([key, entry]) => [key, entry.text]));
  assert.deepStrictEqual(rendered, expected);
});

test('falls back to a placeholder for missing translations', () => {
  assert.equal(format('missing.translation.key'), '[[missing.translation.key]]');
});
