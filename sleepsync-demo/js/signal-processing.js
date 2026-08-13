const round = (value, digits = 2) => Number(value.toFixed(digits));

export function calculateFeatures(samples) {
  if (!samples.length) {
    return {
      pressureMean: 0,
      pressureVariance: 0,
      motionEventCount: 0,
      motionMean: 0,
      temperatureSlope: 0,
      surfaceTemperature: 29,
    };
  }
  const window = samples.slice(-30);
  const pressureMean = window.reduce((total, sample) => total + sample.pressureStability, 0) / window.length;
  const motionMean = window.reduce((total, sample) => total + sample.motionIndex, 0) / window.length;
  const pressureVariance = window.reduce((total, sample) => total + (sample.pressureStability - pressureMean) ** 2, 0) / window.length;
  const motionEventCount = window.filter((sample) => sample.motionIndex > 35).length;
  const thermalWindow = window.slice(-10);
  const temperatureSlope = thermalWindow.length > 1
    ? (thermalWindow.at(-1).surfaceTemperature - thermalWindow[0].surfaceTemperature) / (thermalWindow.length - 1)
    : 0;

  return {
    pressureMean: round(pressureMean, 1),
    pressureVariance: round(pressureVariance, 1),
    motionEventCount,
    motionMean: round(motionMean, 1),
    temperatureSlope: round(temperatureSlope, 3),
    surfaceTemperature: window.at(-1).surfaceTemperature,
  };
}
