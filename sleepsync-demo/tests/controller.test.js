import test from 'node:test';
import assert from 'node:assert/strict';
import { clampControl, createControllerOutput } from '../js/controller.js';

test('emergency stop immediately zeros sound and vibration and restores thermal standby', () => {
  const stopped = createControllerOutput(
    { state: 'awake', probability: 0.2, stateHoldSeconds: 0 },
    { soundDb: 50, vibrationLevel: 7, targetTemperature: 34 },
    true,
  );

  assert.deepEqual(
    [stopped.soundDb, stopped.vibrationLevel, stopped.targetTemperature],
    [0, 0, 29],
  );
  assert.equal(stopped.mode, 'emergency-stop');
});

test('safety gate clips commands to the defined device limits and records each intervention', () => {
  const result = clampControl({ soundDb: 47, vibrationLevel: -2, targetTemperature: 34 });
  assert.deepEqual(
    [result.soundDb, result.vibrationLevel, result.targetTemperature],
    [40, 0, 32],
  );
  assert.equal(result.safetyFlags.length, 3);
});

test('ready state fades sound and vibration to zero after ten protected seconds', () => {
  const output = createControllerOutput(
    { state: 'ready', probability: 0.84, stateHoldSeconds: 18 },
    { soundDb: 4, vibrationLevel: 1, targetTemperature: 28 },
    false,
  );
  assert.deepEqual([output.soundDb, output.vibrationLevel], [0, 0]);
  assert.equal(output.mode, 'auto-stopped');
});

test('low sensor confidence withholds stimulus and enters thermal standby', () => {
  const output = createControllerOutput(
    { state: 'relaxing', probability: 0.65, stateHoldSeconds: 4 },
    { soundDb: 30, vibrationLevel: 2, targetTemperature: 29 },
    false,
    'low',
  );

  assert.deepEqual([output.soundDb, output.vibrationLevel, output.targetTemperature], [0, 0, 29]);
  assert.equal(output.mode, 'confidence-standby');
});
