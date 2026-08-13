const LIMITS = {
  soundDb: [0, 40],
  vibrationLevel: [0, 5],
  targetTemperature: [26, 32],
};

const clamp = (value, [min, max]) => Math.min(max, Math.max(min, value));

export function clampControl(output) {
  const safetyFlags = [];
  const applied = {};

  for (const [key, limits] of Object.entries(LIMITS)) {
    const value = Number(output[key]);
    const clamped = clamp(Number.isFinite(value) ? value : limits[0], limits);
    applied[key] = clamped;
    if (clamped !== value) safetyFlags.push(`${key} clamped to ${limits[0]}-${limits[1]}`);
  }

  return { ...applied, safetyFlags };
}

export function createControllerOutput(inference, previousOutput = {}, emergencyStop = false, confidence = 'high') {
  if (emergencyStop) {
    return {
      soundDb: 0,
      vibrationLevel: 0,
      targetTemperature: 29,
      mode: 'emergency-stop',
      safetyFlags: ['emergency stop engaged'],
      reason: '즉시 중지 요청으로 자극 출력을 0으로 전환하고 열 제어를 대기 상태로 복귀했습니다.',
      proposed: { soundDb: 0, vibrationLevel: 0, targetTemperature: 29 },
    };
  }

  if (confidence === 'low') {
    return {
      soundDb: 0,
      vibrationLevel: 0,
      targetTemperature: 29,
      mode: 'confidence-standby',
      safetyFlags: ['sensor confidence low · stimulus withheld'],
      reason: '센서 신뢰도가 낮아 AI 판단을 보류하고 안전 대기 상태를 유지합니다.',
      proposed: { soundDb: 0, vibrationLevel: 0, targetTemperature: 29 },
      previousOutput,
    };
  }

  let proposed;
  let mode;
  let reason;

  if (inference.state === 'ready') {
    const fadeElapsed = Math.max(0, inference.stateHoldSeconds - 8);
    const fadeFactor = Math.max(0, 1 - fadeElapsed / 10);
    proposed = {
      soundDb: Math.round(20 * fadeFactor),
      vibrationLevel: Math.round(fadeFactor),
      targetTemperature: 28,
    };
    mode = fadeFactor === 0 ? 'auto-stopped' : 'readiness-fade';
    reason = fadeFactor === 0
      ? '수면 준비 상태가 10초 유지되어 자극 출력을 자동 종료했습니다.'
      : '수면 준비 상태를 보호하기 위해 10초 선형 감쇠를 적용합니다.';
  } else if (inference.state === 'relaxing') {
    proposed = { soundDb: 30, vibrationLevel: 2, targetTemperature: 29 };
    mode = 'relaxation-support';
    reason = '이완 전환 구간에 저강도 음향·진동·온도 목표를 적용합니다.';
  } else {
    proposed = { soundDb: 34, vibrationLevel: 3, targetTemperature: 29 };
    mode = 'awake-support';
    reason = '각성 구간에서는 안전 범위 내의 초기 이완 프로파일을 적용합니다.';
  }

  const applied = clampControl(proposed);
  return {
    ...applied,
    mode,
    reason,
    proposed,
    previousOutput,
  };
}
