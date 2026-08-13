import test from 'node:test';
import assert from 'node:assert/strict';
import { simulateScenarioSummary, summarizeSession } from '../js/session-metrics.js';

const withinLimits = { soundDb: 20, vibrationLevel: 1, targetTemperature: 29, mode: 'readiness-fade', safetyFlags: [] };

test('session summary captures the first readiness threshold and the peak probability', () => {
  const summary = summarizeSession([
    { elapsedSeconds: 3, inference: { probability: 0.51 }, control: withinLimits },
    { elapsedSeconds: 7, inference: { probability: 0.76 }, control: withinLimits },
    { elapsedSeconds: 8, inference: { probability: 0.83 }, control: withinLimits },
  ]);

  assert.equal(summary.readinessReachedAt, 7);
  assert.equal(summary.peakReadiness, 0.83);
  assert.equal(summary.autoFadeReached, true);
  assert.equal(summary.safetyCompliant, true);
});

test('summary detects an out-of-range command as noncompliant', () => {
  const summary = summarizeSession([
    { elapsedSeconds: 0, inference: { probability: 0.2 }, control: { ...withinLimits, soundDb: 41 } },
  ]);

  assert.equal(summary.safetyCompliant, false);
  assert.equal(summary.safetyInterventions, 1);
});

test('summary ignores session events that do not contain an inference record', () => {
  const summary = summarizeSession([
    { elapsedSeconds: 0, type: 'SESSION', text: 'started' },
    { elapsedSeconds: 1, inference: { probability: 0.73 }, control: withinLimits },
  ]);

  assert.equal(summary.readinessReachedAt, 1);
  assert.equal(summary.safetyCompliant, true);
});

test('scenario comparison is deterministic and separates tense from relaxed trajectories', () => {
  const tense = simulateScenarioSummary('tense');
  const relaxed = simulateScenarioSummary('relaxed');

  assert.deepEqual(simulateScenarioSummary('tense'), tense);
  assert.equal(tense.durationSeconds, 90);
  assert.notEqual(tense.peakReadiness, relaxed.peakReadiness);
  assert.equal(tense.safetyCompliant, true);
  assert.equal(relaxed.safetyCompliant, true);
});
