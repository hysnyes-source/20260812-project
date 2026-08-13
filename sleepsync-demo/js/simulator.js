const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export const MAX_DURATION_SECONDS = 90;

export const SCENARIOS = {
  tense: {
    label: '긴장 상태', seed: 7, settleSeconds: 76,
    pressureBase: 42, pressureGain: 28, pressureNoise: 9,
    motionBase: 67, motionDrop: 40, motionNoise: 15,
    temperatureBase: 28.1, temperatureGain: 0.7,
  },
  normal: {
    label: '보통 상태', seed: 17, settleSeconds: 57,
    pressureBase: 50, pressureGain: 32, pressureNoise: 6,
    motionBase: 53, motionDrop: 39, motionNoise: 10,
    temperatureBase: 28.5, temperatureGain: 0.5,
  },
  relaxed: {
    label: '이완 상태', seed: 29, settleSeconds: 35,
    pressureBase: 62, pressureGain: 26, pressureNoise: 3,
    motionBase: 31, motionDrop: 22, motionNoise: 5,
    temperatureBase: 28.8, temperatureGain: 0.25,
  },
};

export function createSensorSample(scenarioId, elapsedSeconds) {
  const profile = SCENARIOS[scenarioId] ?? SCENARIOS.normal;
  const wave = Math.sin((elapsedSeconds + profile.seed) * 0.39);
  const pulse = Math.sin((elapsedSeconds + profile.seed) * 0.83);
  const settle = Math.min(elapsedSeconds / profile.settleSeconds, 1);
  return {
    elapsedSeconds,
    pressureStability: Number(clamp(profile.pressureBase + settle * profile.pressureGain + wave * profile.pressureNoise + pulse * 1.6, 0, 100).toFixed(1)),
    motionIndex: Number(clamp(profile.motionBase - settle * profile.motionDrop + Math.abs(wave) * profile.motionNoise + Math.max(pulse, 0) * 4, 0, 100).toFixed(1)),
    surfaceTemperature: Number(clamp(profile.temperatureBase + settle * profile.temperatureGain + wave * 0.08, 26, 32).toFixed(2)),
  };
}
