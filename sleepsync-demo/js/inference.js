const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const consecutiveQualifyingSamples = (history, probability) => {
  const series = [...history.map((entry) => entry.probability), probability];
  let count = 0;

  for (let index = series.length - 1; index >= 0; index -= 1) {
    if (series[index] < 0.72) break;
    count += 1;
  }

  return count;
};

export function inferSleepReadiness(features, history = []) {
  const stabilityScore = clamp((features.pressureMean - 45) / 35, 0, 1);
  const stillnessScore = clamp(1 - features.motionMean / 55, 0, 1);
  const thermalScore = clamp(1 - Math.abs(features.surfaceTemperature - 29) / 3, 0, 1);
  const variancePenalty = clamp(features.pressureVariance / 180, 0, 0.25);
  const probability = clamp(
    0.48 * stabilityScore
      + 0.37 * stillnessScore
      + 0.15 * thermalScore
      - variancePenalty,
    0,
    1,
  );
  const qualifyingSeconds = consecutiveQualifyingSamples(history, probability);
  const excessiveMovement = features.motionEventCount > 12;

  let state = 'awake';
  let stateHoldSeconds = 0;

  if (!excessiveMovement && probability >= 0.72 && qualifyingSeconds >= 8) {
    state = 'ready';
    stateHoldSeconds = qualifyingSeconds;
  } else if (!excessiveMovement && probability >= 0.45) {
    state = 'relaxing';
    stateHoldSeconds = history.length > 0 && history.at(-1).state === 'relaxing'
      ? (history.at(-1).stateHoldSeconds ?? 0) + 1
      : 1;
  }

  const contributions = {
    stability: Math.round(stabilityScore * 48),
    stillness: Math.round(stillnessScore * 37),
    thermal: Math.round(thermalScore * 15),
    variancePenalty: -Math.round(variancePenalty * 100),
  };

  const rationale = excessiveMovement
    ? '30초 창에서 움직임 사건이 많아 각성 상태를 유지합니다.'
    : state === 'ready'
      ? '안정도와 정지성이 8초 이상 기준을 충족했습니다.'
      : state === 'relaxing'
        ? '움직임이 감소하고 압력 안정도가 상승해 이완 전환을 관찰합니다.'
        : '움직임 또는 압력 변동이 커서 수면 준비 신호가 부족합니다.';

  return {
    probability: Number(probability.toFixed(3)),
    state,
    stateHoldSeconds,
    qualifyingSeconds,
    contributions,
    rationale,
  };
}
