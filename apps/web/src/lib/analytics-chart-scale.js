// Keep projections as measurement baselines without clipping results above target
// or negative profit. Only the displayed scale is rounded; source values stay intact.
export function projectionDomain(targets) {
  const targetMax = Math.max(0, ...targets.map((value) => Number(value) || 0));
  return ([minimum, maximum]) => {
    const lower = Math.min(0, minimum);
    const upper = Math.max(1, targetMax, maximum);
    const roughStep = (upper - lower) / 5;
    const magnitude = 10 ** Math.floor(Math.log10(roughStep));
    const step = Math.max(1, [1, 2, 5, 10].find((factor) => factor * magnitude >= roughStep) * magnitude);
    return [Math.floor(lower / step) * step, Math.ceil(upper / step) * step];
  };
}

const niceStep = (value) => {
  const magnitude = 10 ** Math.floor(Math.log10(Math.max(1, value)));
  return [1, 2, 5, 10].find((factor) => factor * magnitude >= value) * magnitude;
};

export function measurementScales(rows, targets, moneyKeys = ['cost', 'revenue', 'profit']) {
  const values = rows.flatMap((row) => moneyKeys.map((key) => Number(row[key]) || 0));
  const low = Math.min(0, ...values);
  const high = Math.max(1, ...values, ...moneyKeys.map((key) => Number(targets?.[key]) || 0));
  const moneyStep = niceStep((high - low) / 14);
  const minimum = Math.floor(low / moneyStep) * moneyStep;
  const maximum = Math.ceil(high / moneyStep) * moneyStep;
  const intervals = Math.max(1, Math.round((maximum - minimum) / moneyStep));
  const yieldMaximum = Math.max(1, Number(targets?.yield) || 0, ...rows.map((row) => Number(row.yieldTonnes) || 0));
  const yieldStep = niceStep(yieldMaximum / intervals);
  return {
    money: { step: moneyStep, domain: [minimum, maximum], ticks: Array.from({ length: intervals + 1 }, (_, index) => minimum + index * moneyStep) },
    yield: { step: yieldStep, domain: [0, intervals * yieldStep], ticks: Array.from({ length: intervals + 1 }, (_, index) => index * yieldStep) },
  };
}
