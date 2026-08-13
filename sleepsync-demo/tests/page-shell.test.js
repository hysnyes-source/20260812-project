import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('demo page exposes every control and technical observation panel', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const requiredIds = [
    'scenario-select',
    'start-button',
    'pause-button',
    'reset-button',
    'stop-button',
    'telemetry-chart',
    'feature-panel',
    'inference-panel',
    'control-panel',
    'event-log',
    'export-log',
  ];

  for (const id of requiredIds) {
    assert.match(html, new RegExp(`id=["']${id}["']`));
  }

  for (const id of [
    'sleep-mode',
    'sleep-summary',
    'sleep-progress',
    'sleep-stimulus',
    'open-insight-button',
    'insight-mode',
    'close-insight-button',
  ]) {
    assert.match(html, new RegExp(`id=["']${id}["']`));
  }

  assert.match(html, /id=["']sleep-mode["'][^>]*class=["'][^"']*product-demo/);
  assert.match(html, /id=["']insight-mode["']/);
});
