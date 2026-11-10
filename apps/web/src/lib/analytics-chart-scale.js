export function nonNegativeChartRows(rows, keys) {
  return rows.map((row) => ({
    ...row,
    ...Object.fromEntries(keys.map((key) => {
      const value = row[key];
      return [key, finiteMeasurement(value) ? Math.max(0, Number(value)) : null];
    })),
  }));
}

const finiteMeasurement = (value) => value != null && value !== '' && Number.isFinite(Number(value));

export function numericChartAxis(rows, keys, { includeZero = true, tickCount = 6, compressOutliers = false } = {}) {
  let minimum = Infinity;
  let maximum = -Infinity;
  let smallestNonzero = Infinity;
  for (const row of rows) {
    for (const key of keys) {
      const value = row[key];
      if (!finiteMeasurement(value)) continue;
      minimum = Math.min(minimum, Number(value));
      maximum = Math.max(maximum, Number(value));
      if (Number(value) !== 0) smallestNonzero = Math.min(smallestNonzero, Math.abs(Number(value)));
    }
  }
  if (!Number.isFinite(minimum)) return {};
  if (includeZero) {
    minimum = Math.min(0, minimum);
    maximum = Math.max(0, maximum);
  }
  const span = maximum - minimum || Math.abs(maximum) || 1;
  const roughStep = span / Math.max(2, tickCount - 1);
  const magnitude = 10 ** Math.floor(Math.log10(roughStep));
  const step = [1, 2, 2.5, 5, 10].find((factor) => factor * magnitude >= roughStep) * magnitude;
  const lower = minimum === 0 && includeZero ? 0 : Math.floor((minimum - span * 0.05) / step);
  const upper = maximum === 0 && minimum < 0 && includeZero ? 0 : Math.ceil((maximum + span * 0.08) / step);
  const ticks = Array.from({ length: upper - lower + 1 }, (_, index) =>
    Number(((lower + index) * step).toPrecision(12)));
  const domain = [ticks[0], ticks.at(-1)];
  const peak = Math.max(Math.abs(minimum), Math.abs(maximum));
  if (compressOutliers && peak / Math.max(1, smallestNonzero) >= 1000) {
    const logDomain = [minimum < 0 ? minimum * 1.15 : 0, maximum > 0 ? maximum * 1.15 : 0];
    const start = Math.floor(Math.log10(Math.max(1, smallestNonzero)));
    const end = Math.floor(Math.log10(peak));
    const stride = Math.max(1, Math.ceil((end - start + 1) / 4));
    const powers = Array.from({ length: Math.floor((end - start) / stride) + 1 }, (_, i) => 10 ** (start + i * stride));
    const signedTicks = [...powers.map(value => -value).reverse(), 0, ...powers].filter(value =>
      value >= logDomain[0] && value <= logDomain[1]);
    return { domain: logDomain, ticks: signedTicks, scale: 'symlog' };
  }
  return { domain, ticks };
}

const chartNumber = new Intl.NumberFormat('en-GH', { maximumFractionDigits: 8 });
const compactChartNumber = new Intl.NumberFormat('en-GH', { notation: 'compact', maximumFractionDigits: 2 });

export function formatChartValue(value, unit = '', { compact = false } = {}) {
  if (!finiteMeasurement(value)) return '—';
  const number = Number(value);
  const amount = compact && Math.abs(number) >= 1000 ? compactChartNumber.format(number) : chartNumber.format(number);
  if (unit === 'GHS') return `GH₵${amount}`;
  if (unit === '%') return `${amount}%`;
  return unit ? `${amount} ${unit}` : amount;
}

export function positivePieSlices(rows) {
  return rows.filter(({ value }) => finiteMeasurement(value) && Number(value) > 0);
}

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
  const yieldMaximum = Math.max(1, Number(targets?.yield) || 0, ...rows.map((row) => Number(row.yieldKg) || 0));
  const yieldStep = niceStep(yieldMaximum / intervals);
  return {
    money: { step: moneyStep, domain: [minimum, maximum], ticks: Array.from({ length: intervals + 1 }, (_, index) => minimum + index * moneyStep) },
    yield: { step: yieldStep, domain: [0, intervals * yieldStep], ticks: Array.from({ length: intervals + 1 }, (_, index) => index * yieldStep) },
  };
}
