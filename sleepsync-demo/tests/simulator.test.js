import test from 'node:test';
import assert from 'node:assert/strict';
import { MAX_DURATION_SECONDS, createSensorSample } from '../js/simulator.js';
import { calculateFeatures } from '../js/signal-processing.js';

test('the same scenario and second generate the same sensor sample', () => {
  assert.deepEqual(createSensorSample('tense', 24), createSensorSample('tense', 24));
});

test('simulation duration is limited to a 90-second session', () => {
  assert.equal(MAX_DURATION_SECONDS, 90);
});

test('relaxed scenario is more stable than tense scenario at the same point', () => {
  assert.ok(createSensorSample('relaxed', 50).pressureStability > createSensorSample('tense', 50).pressureStability);
  assert.ok(createSensorSample('relaxed', 50).motionIndex < createSensorSample('tense', 50).motionIndex);
});

test('feature processor calculates mean, variance, motion events, and temperature slope', () => {
  const samples = [
    { pressureStability: 60, motionIndex: 45, surfaceTemperature: 28.8 },
    { pressureStability: 70, motionIndex: 20, surfaceTemperature: 29.0 },
  ];
  const result = calculateFeatures(samples);
  assert.equal(result.pressureMean, 65);
  assert.equal(result.motionEventCount, 1);
  assert.ok(result.pressureVariance > 0);
  assert.ok(result.temperatureSlope > 0);
  assert.equal(result.surfaceTemperature, 29);
});
