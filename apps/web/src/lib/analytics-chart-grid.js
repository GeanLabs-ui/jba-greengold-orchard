// Every horizontal grid boundary has a corresponding numbered axis tick.
export function horizontalMeasurementGrid({ yAxis, offset }) {
  const ticks = yAxis.ticks || yAxis.niceTicks || yAxis.scale.ticks(yAxis.tickCount || 5);
  return ticks.map((tick) => yAxis.scale(tick)).filter((point) => point >= offset.top - 0.5 && point <= offset.top + offset.height + 0.5);
}
