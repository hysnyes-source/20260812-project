import { MAX_DURATION_SECONDS, createSensorSample } from './simulator.js';
import { calculateFeatures } from './signal-processing.js';
import { inferSleepReadiness } from './inference.js';
import { createControllerOutput } from './controller.js';

const isWithinLimits = (control) => (
  control.soundDb >= 0 && control.soundDb <= 40
  && control.vibrationLevel >= 0 && control.vibrationLevel <= 5
  && control.targetTemperature >= 26 && control.targetTemperature <= 32
);

export function summarizeSession(logs) {
  const observations = logs.filter((entry) => entry.inference && entry.control);
  const readinessEntry = observations.find((entry) => entry.inference.probability >= 0.72);
  const peakReadiness = observations.reduce((peak, entry) => Math.max(peak, entry.inference.probability), 0);
  const safetyInterventions = observations.filter((entry) => !isWithinLimits(entry.control)).length;

  return {
    readinessReachedAt: readinessEntry ? readinessEntry.elapsedSeconds : null,
    peakReadiness: Number(peakReadiness.toFixed(3)),
    autoFadeReached: observations.some((entry) => entry.control.mode === 'readiness-fade' || entry.control.mode === 'auto-stopped'),
    autoStopped: observations.some((entry) => entry.control.mode === 'auto-stopped'),
    safetyCompliant: safetyInterventions === 0,
    safetyInterventions,
  };
}

export function simulateScenarioSummary(scenarioId) {
  const samples = [];
  const inferenceHistory = [];
  const logs = [];
  let previousOutput = { soundDb: 0, vibrationLevel: 0, targetTemperature: 29 };

  for (let elapsedSeconds = 0; elapsedSeconds < MAX_DURATION_SECONDS; elapsedSeconds += 1) {
    const sample = createSensorSample(scenarioId, elapsedSeconds);
    samples.push(sample);
    const features = calculateFeatures(samples.slice(-30));
    const inference = inferSleepReadiness(features, inferenceHistory);
    const control = createControllerOutput(inference, previousOutput, false);
    logs.push({ elapsedSeconds, sample, features, inference, control });
    inferenceHistory.push(inference);
    previousOutput = control;
  }

  return {
    scenarioId,
    durationSeconds: MAX_DURATION_SECONDS,
    ...summarizeSession(logs),
  };
}
