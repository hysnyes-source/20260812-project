import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('dashboard shell contains the project management controls', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  for (const id of [
    'project-grid',
    'recent-projects',
    'project-form',
    'project-modal',
    'search-input',
    'status-filter',
    'sort-select',
    'open-project-modal',
    'close-project-modal',
    'toast-region',
  ]) {
    assert.match(html, new RegExp(`id=["']${id}["']`));
  }
});
