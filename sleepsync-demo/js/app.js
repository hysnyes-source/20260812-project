import { MAX_DURATION_SECONDS, SCENARIOS, createSensorSample } from './simulator.js';
import { calculateFeatures } from './signal-processing.js';
import { inferSleepReadiness } from './inference.js';
import { createControllerOutput } from './controller.js';
import { simulateScenarioSummary, summarizeSession } from './session-metrics.js';

const state = {
  scenarioId: 'normal', elapsedSeconds: 0, samples: [], inferenceHistory: [],
  control: { soundDb: 0, vibrationLevel: 0, targetTemperature: 29 }, logs: [],
  timer: null, running: false, emergencyStopped: false, confidence: 'high', view: 'sleep',
};

const $ = (id) => document.getElementById(id);
const elements = Object.fromEntries([
  'sleep-mode', 'insight-mode', 'open-insight-button', 'close-insight-button',
  'scenario-select', 'start-button', 'pause-button', 'reset-button', 'stop-button', 'export-log',
  'status-label', 'status-dot', 'session-time', 'sleep-context', 'sleep-state-label', 'sleep-readiness',
  'sleep-message', 'sleep-detail', 'sleep-progress-list', 'sleep-sound', 'sleep-vibration', 'sleep-thermal',
  'readiness-value', 'state-chip', 'control-mode', 'insight-time', 'telemetry-chart', 'feature-content',
  'inference-rationale', 'contribution-bars', 'sound-output', 'vibration-output', 'thermal-output',
  'control-reason', 'safety-flags', 'confidence-toggle', 'kpi-content', 'compare-content', 'event-log', 'trust-content',
].map((id) => [id, $(id)]));

const stateNames = { awake: '긴장을 읽는 중', relaxing: '이완으로 전환 중', ready: '입면 준비' };
const formatTime = (seconds) => `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

function addLog(type, text, details = {}) { state.logs.push({ elapsedSeconds: state.elapsedSeconds, type, text, details, ...details }); }

function currentTelemetry() {
  const sample = state.samples.at(-1) ?? createSensorSample(state.scenarioId, state.elapsedSeconds);
  const features = calculateFeatures(state.samples.length ? state.samples.slice(-30) : [sample]);
  const inference = state.inferenceHistory.at(-1) ?? inferSleepReadiness(features, []);
  return { sample, features, inference, control: state.control };
}

function preview() {
  const sample = createSensorSample(state.scenarioId, state.elapsedSeconds);
  const features = calculateFeatures([sample]);
  const inference = inferSleepReadiness(features, []);
  state.control = createControllerOutput(inference, state.control, state.emergencyStopped, state.confidence);
  render(sample, features, inference, state.control);
}

function tick() {
  if (state.elapsedSeconds >= MAX_DURATION_SECONDS) { pauseSimulation('90초 세션이 끝났습니다.'); return; }
  const sample = createSensorSample(state.scenarioId, state.elapsedSeconds);
  state.samples.push(sample);
  const features = calculateFeatures(state.samples.slice(-30));
  const inference = inferSleepReadiness(features, state.inferenceHistory);
  const control = createControllerOutput(inference, state.control, false, state.confidence);
  state.inferenceHistory.push(inference); state.control = control;
  addLog(state.confidence === 'low' ? 'SAFETY' : 'CONTROL', state.confidence === 'low' ? '센서 신호를 다시 확인하며 자극을 멈췄습니다.' : `${stateNames[inference.state]} · ${Math.round(inference.probability * 100)}%`, { sample, features, inference, control });
  state.elapsedSeconds += 1;
  render(sample, features, inference, control);
}

function startSimulation() {
  if (state.running || state.emergencyStopped || state.elapsedSeconds >= MAX_DURATION_SECONDS) return;
  state.running = true; addLog('SESSION', `${SCENARIOS[state.scenarioId].label} 세션을 시작했습니다.`); tick();
  state.timer = window.setInterval(tick, 1000); renderStatus();
}

function pauseSimulation(message = '세션을 잠시 멈췄습니다.') {
  if (!state.running) return;
  window.clearInterval(state.timer); state.timer = null; state.running = false; addLog('SESSION', message); renderStatus(); renderKpis();
}

function resetSimulation() {
  window.clearInterval(state.timer);
  Object.assign(state, { elapsedSeconds: 0, samples: [], inferenceHistory: [], control: { soundDb: 0, vibrationLevel: 0, targetTemperature: 29 }, logs: [], timer: null, running: false, emergencyStopped: false });
  addLog('SESSION', '새로운 세션을 준비했습니다.'); preview(); renderStatus();
}

function emergencyStop() {
  window.clearInterval(state.timer); state.timer = null; state.running = false; state.emergencyStopped = true;
  const { sample, features, inference } = currentTelemetry();
  state.control = createControllerOutput(inference, state.control, true, state.confidence);
  addLog('SAFETY', '안전 중지로 모든 자극을 멈췄습니다.', { sample, features, inference, control: state.control });
  render(sample, features, inference, state.control); renderStatus();
}

function setConfidence(low) {
  state.confidence = low ? 'low' : 'high';
  const { sample, features, inference } = currentTelemetry();
  state.control = createControllerOutput(inference, state.control, state.emergencyStopped, state.confidence);
  addLog('SAFETY', low ? '센서 신뢰도 저하: 자극을 안전하게 보류합니다.' : '센서 신뢰도가 회복되어 반응 제어를 다시 시작합니다.', { sample, features, inference, control: state.control });
  render(sample, features, inference, state.control);
}

function setView(view) {
  state.view = view; document.body.dataset.mode = view;
  elements['sleep-mode'].hidden = view !== 'sleep'; elements['insight-mode'].hidden = view !== 'insight';
}

function render(sample, features, inference, control) {
  elements['session-time'].textContent = formatTime(state.elapsedSeconds);
  elements['insight-time'].textContent = `${formatTime(state.elapsedSeconds)} / 01:30`;
  renderSleepSurface(inference, control); renderInsightSurface(sample, features, inference, control); renderKpis(); renderComparison(); renderTrust(); renderLog();
}

function renderSleepSurface(inference, control) {
  const percent = Math.round(inference.probability * 100);
  const stage = state.confidence === 'low' || state.emergencyStopped ? 0 : control.mode === 'auto-stopped' ? 3 : inference.state === 'ready' ? 2 : inference.state === 'relaxing' ? 1 : 0;
  const copy = state.confidence === 'low'
    ? ['신호를 다시 확인하는 중', '센서 신호를 다시 확인하고 있어요. 자극은 안전하게 멈춰 두었습니다.', '신뢰도가 회복되면 반응 제어를 다시 시작합니다.']
    : state.emergencyStopped
      ? ['안전하게 멈춘 상태', '모든 자극을 멈추고 편안한 대기 상태를 유지합니다.', '다시 시작을 누르면 새로운 세션을 준비합니다.']
      : control.mode === 'auto-stopped'
        ? ['휴식을 지키는 중', '안정적인 상태를 유지하고 있어요. 자극을 쉬게 합니다.', '잠들기 좋은 흐름을 방해하지 않도록 베개가 조용해집니다.']
        : inference.state === 'ready'
          ? ['잠들 준비가 되었어요', '방해되지 않도록 자극을 천천히 낮춥니다.', '현재 몸의 움직임과 압력 신호가 안정적으로 유지되고 있어요.']
          : inference.state === 'relaxing'
            ? ['이완으로 전환하고 있어요', '움직임이 줄고 있어요. 자극을 조금 더 부드럽게 조절합니다.', '편안한 상태가 이어지면 자극은 자연스럽게 줄어듭니다.']
            : ['준비를 시작할게요', '아직 몸의 긴장이 남아 있어요. 편안한 리듬을 시작합니다.', '움직임과 접촉면 온도를 읽어 지금 필요한 도움을 계산합니다.'];
  elements['sleep-context'].textContent = SCENARIOS[state.scenarioId].label;
  elements['sleep-state-label'].textContent = copy[0]; elements['sleep-readiness'].innerHTML = `${percent}<span>%</span>`;
  elements['sleep-message'].textContent = copy[1]; elements['sleep-detail'].textContent = copy[2];
  elements['sleep-progress-list'].innerHTML = ['감지', '이완', '입면 준비', '휴식'].map((label, index) => `<li class="${index < stage ? 'complete' : ''} ${index === stage ? 'active' : ''}"><span>0${index + 1}</span><b>${label}</b></li>`).join('');
  elements['sleep-sound'].innerHTML = `${control.soundDb} <small>dBA</small>`; elements['sleep-vibration'].innerHTML = `${control.vibrationLevel} <small>단계</small>`; elements['sleep-thermal'].innerHTML = `${control.targetTemperature} <small>°C</small>`;
}

function renderInsightSurface(sample, features, inference, control) {
  elements['readiness-value'].textContent = `${Math.round(inference.probability * 100)}%`;
  elements['state-chip'].textContent = state.confidence === 'low' ? '판단 보류' : stateNames[inference.state]; elements['control-mode'].textContent = control.mode.replaceAll('-', ' ');
  elements['inference-rationale'].textContent = state.confidence === 'low' ? '센서 신뢰도가 낮아 준비도 결과를 제어에 사용하지 않습니다.' : inference.rationale;
  const featureRows = [['압력 안정도 평균', `${features.pressureMean} / 100`], ['압력 변동성', `${features.pressureVariance}`], ['움직임 평균', `${features.motionMean} / 100`], ['움직임 사건', `${features.motionEventCount}회`], ['온도 변화', `${features.temperatureSlope >= 0 ? '+' : ''}${features.temperatureSlope} °C/s`]];
  elements['feature-content'].innerHTML = featureRows.map(([label, value]) => `<div class="data-row"><span>${label}</span><strong>${value}</strong></div>`).join('');
  const labels = [['stability', '압력 안정도'], ['stillness', '정지성'], ['thermal', '열 쾌적성'], ['variancePenalty', '변동 패널티']];
  elements['contribution-bars'].innerHTML = labels.map(([key, label]) => { const value = inference.contributions[key] ?? 0; return `<div class="contribution-row ${key === 'variancePenalty' ? 'penalty' : ''}"><span>${label}</span><div class="bar-track"><i style="width:${clamp(Math.abs(value) * 2, 0, 100)}%"></i></div><b>${value > 0 ? '+' : ''}${value}</b></div>`; }).join('');
  elements['sound-output'].textContent = `${control.soundDb} dBA`; elements['vibration-output'].textContent = `${control.vibrationLevel} /5`; elements['thermal-output'].textContent = `${control.targetTemperature} °C`; elements['control-reason'].textContent = control.reason;
  elements['safety-flags'].textContent = control.safetyFlags.length ? control.safetyFlags.join(' · ') : '안전 범위 안에서 제어하고 있습니다.';
  renderChart(sample);
}

function renderChart() {
  const samples = state.samples.length ? state.samples : [createSensorSample(state.scenarioId, 0)];
  const pathFor = (mapper) => samples.map((sample, index) => { const x = 15 + (index / 89) * 870; return `${index ? 'L' : 'M'}${x.toFixed(1)},${mapper(sample).toFixed(1)}`; }).join(' ');
  const pressure = pathFor((sample) => 205 - sample.pressureStability * 1.72); const motion = pathFor((sample) => 205 - sample.motionIndex * 1.72); const thermal = pathFor((sample) => 205 - ((sample.surfaceTemperature - 26) / 6) * 172);
  elements['telemetry-chart'].innerHTML = `<path d="${pressure}" fill="none" stroke="#4d46d9" stroke-width="3" vector-effect="non-scaling-stroke"/><path d="${motion}" fill="none" stroke="#787a82" stroke-width="2" vector-effect="non-scaling-stroke"/><path d="${thermal}" fill="none" stroke="#a48658" stroke-width="2" stroke-dasharray="5 5" vector-effect="non-scaling-stroke"/>`;
}

function renderKpis() {
  const summary = summarizeSession(state.logs);
  const values = [['72% 도달 시간', summary.readinessReachedAt === null ? '미도달' : formatTime(summary.readinessReachedAt), '준비도 임계값'], ['최고 준비도', `${Math.round(summary.peakReadiness * 100)}%`, '세션의 최대값'], ['자극 감쇠', summary.autoFadeReached ? '도달' : '대기', summary.autoStopped ? '자동 종료 완료' : '입면 준비 뒤 적용'], ['안전 제한', summary.safetyCompliant ? '준수' : '검토', `${summary.safetyInterventions}건 범위 이탈`], ['신호 신뢰도', state.confidence === 'low' ? '보류' : '정상', '시연 센서 상태']];
  elements['kpi-content'].innerHTML = values.map(([label, value, note]) => `<article class="kpi-card"><span>${label}</span><strong>${value}</strong><p>${note}</p></article>`).join('');
}

function renderComparison() {
  const tense = simulateScenarioSummary('tense'); const relaxed = simulateScenarioSummary('relaxed');
  const rows = [['상태', '긴장된 상태', '편안한 상태'], ['72% 도달', tense.readinessReachedAt === null ? '미도달' : formatTime(tense.readinessReachedAt), relaxed.readinessReachedAt === null ? '미도달' : formatTime(relaxed.readinessReachedAt)], ['최고 준비도', tense.peakReadiness, relaxed.peakReadiness], ['자극 감쇠', tense.autoFadeReached ? '도달' : '미도달', relaxed.autoFadeReached ? '도달' : '미도달'], ['안전 제한', tense.safetyCompliant ? '준수' : '검토', relaxed.safetyCompliant ? '준수' : '검토']];
  elements['compare-content'].innerHTML = rows.flatMap((row, rowIndex) => row.map((value, column) => { const className = rowIndex === 0 ? 'compare-cell header' : column === 0 ? 'compare-cell' : 'compare-cell value'; if (row[0] === '최고 준비도' && column > 0) { const percent = Math.round(value * 100); return `<div class="${className}"><i class="compare-bar" style="width:${percent}px"></i>${percent}%</div>`; } return `<div class="${className}">${value}</div>`; })).join('');
}

function renderTrust() {
  const content = [['시연 데이터', '현재 신호는 발표를 위해 생성한 결정론적 시뮬레이션입니다.'], ['초기 판단 모델', '설명 가능한 가중치와 시간 유지 규칙을 사용하는 기준선 모델입니다.'], ['실제품 연결', state.confidence === 'low' ? '센서 신호를 다시 확인하는 동안 자극을 0으로 보류합니다.' : '압력·피에조·온도 센서가 동일한 입력을 실제로 제공합니다.']];
  elements['trust-content'].innerHTML = content.map(([title, text]) => `<div class="trust-item"><span>${title}</span><p>${text}</p></div>`).join('');
}

function renderLog() { const recent = state.logs.slice(-7).reverse(); elements['event-log'].innerHTML = recent.map((entry) => `<div class="event-item"><span class="event-time">${formatTime(entry.elapsedSeconds)}</span><span class="event-tag">${entry.type}</span><span class="event-text">${entry.text}</span></div>`).join('') || '<div class="event-item"><span>00:00</span><span>READY</span><span>세션을 시작하면 제어 기록이 남습니다.</span></div>'; }

function renderStatus() {
  elements['start-button'].disabled = state.running || state.emergencyStopped || state.elapsedSeconds >= MAX_DURATION_SECONDS; elements['pause-button'].disabled = !state.running; elements['scenario-select'].disabled = state.running;
  elements['status-label'].innerHTML = `<i id="status-dot" class="${state.running ? 'running' : state.emergencyStopped ? 'stopped' : ''}"></i>${state.emergencyStopped ? '안전하게 멈춘 상태' : state.running ? '몸의 신호를 읽고 있어요' : '세션을 시작할 준비가 되었어요'}`;
}

function exportLog() { const payload = { generatedAt: new Date().toISOString(), disclaimer: 'Simulated technical demonstration data only. Not for diagnosis or treatment.', scenario: state.scenarioId, durationSeconds: state.elapsedSeconds, kpis: summarizeSession(state.logs), logs: state.logs }; const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })); const anchor = document.createElement('a'); anchor.href = url; anchor.download = `sleepsync-${state.scenarioId}-${state.elapsedSeconds}s.json`; anchor.click(); window.setTimeout(() => URL.revokeObjectURL(url), 1000); }

elements['start-button'].addEventListener('click', startSimulation); elements['pause-button'].addEventListener('click', () => pauseSimulation()); elements['reset-button'].addEventListener('click', resetSimulation); elements['stop-button'].addEventListener('click', emergencyStop); elements['export-log'].addEventListener('click', exportLog); elements['confidence-toggle'].addEventListener('change', (event) => setConfidence(event.target.checked));
elements['scenario-select'].addEventListener('change', (event) => { state.scenarioId = event.target.value; resetSimulation(); }); elements['open-insight-button'].addEventListener('click', () => setView('insight')); elements['close-insight-button'].addEventListener('click', () => setView('sleep'));

setView('sleep'); resetSimulation();
