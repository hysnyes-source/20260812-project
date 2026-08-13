import test from 'node:test';
import assert from 'node:assert/strict';
import { inferSleepReadiness } from '../js/inference.js';

const highReadinessFeatures = {
  pressureMean: 76,
  pressureVariance: 8,
  motionMean: 10,
  motionEventCount: 0,
  temperatureSlope: 0.01,
  surfaceTemperature: 29,
};

test('stable low-motion signals receive a readiness probability above 72 percent', () => {
  const result = inferSleepReadiness(highReadinessFeatures, []);
  assert.ok(result.probability > 0.72);
});

test('ready state is withheld until the eighth consecutive qualifying sample', () => {
  const sixPriorQualifyingSamples = Array.from({ length: 6 }, () => ({ probability: 0.8 }));
  assert.notEqual(inferSleepReadiness(highReadinessFeatures, sixPriorQualifyingSamples).state, 'ready');

  const sevenPriorQualifyingSamples = Array.from({ length: 7 }, () => ({ probability: 0.8 }));
  assert.equal(inferSleepReadiness(highReadinessFeatures, sevenPriorQualifyingSamples).state, 'ready');
});

test('frequent movement keeps the state awake even when stability is high', () => {
  const result = inferSleepReadiness({ ...highReadinessFeatures, motionEventCount: 13 }, []);
  assert.equal(result.state, 'awake');
});
