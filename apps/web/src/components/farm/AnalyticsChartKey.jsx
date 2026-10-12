const whole = (value) => Math.round(Number(value) || 0).toLocaleString('en-US');

export default function AnalyticsChartKey({ scales, targets, metric = 'all' }) {
  return <div className="analytics-chart-key">
    <p className="analytics-measurement-key"><strong>Each grid row</strong><span>Amount (left): ₵{whole(scales.money.step)}</span><span>Yield (right): {whole(scales.yield.step)} tonnes</span></p>
    {targets && <div className="analytics-target-key" aria-label="Projected targets">
      <span className="analytics-target-label">Projected targets</span>
      {(metric === 'all' || metric === 'cost') && <span style={{ color: '#c63b3b' }}><i />Cost ₵{whole(targets.cost)}</span>}
      {(metric === 'all' || metric === 'revenue') && <span style={{ color: '#238337' }}><i />Revenue ₵{whole(targets.revenue)}</span>}
      {(metric === 'all' || metric === 'yield') && <span style={{ color: '#3564da' }}><i />Yield {whole(targets.yield)} tonnes</span>}
    </div>}
  </div>;
}
