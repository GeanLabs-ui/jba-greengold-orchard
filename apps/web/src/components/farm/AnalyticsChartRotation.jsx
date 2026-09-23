import { useEffect, useState } from 'react';
import { Pause, Play } from 'lucide-react';

const LABELS = ['By block', 'Monthly trend', 'Yearly trend'];

export default function AnalyticsChartRotation({ children }) {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (paused) return;
    const timer = window.setInterval(() => setActive(index => (index + 1) % 3), 30_000);
    return () => window.clearInterval(timer);
  }, [paused, active]);

  return <section className="analytics-chart-rotation" aria-label="Performance charts" aria-roledescription="carousel">
    <div className="analytics-chart-rotation-controls">
      {LABELS.map((label, index) => <button key={label} type="button" aria-pressed={active === index} onClick={() => setActive(index)}>{label}</button>)}
      <button type="button" className="analytics-chart-rotation-pause" aria-label={paused ? 'Resume chart rotation' : 'Pause chart rotation'} onClick={() => setPaused(value => !value)}>
        {paused ? <Play size={14} aria-hidden="true" /> : <Pause size={14} aria-hidden="true" />}
        {paused ? 'Resume' : 'Pause'}
      </button>
    </div>
    <div className="analytics-chart-rotation-stage">
      {children.map((child, index) => <div key={LABELS[index]} className={`analytics-chart-slide${index === 1 ? ' analytics-chart-slide--size-reference' : ''}`} aria-label={LABELS[index]} aria-roledescription="slide" aria-hidden={active !== index} inert={active !== index ? '' : undefined} style={{ visibility: active === index ? 'visible' : 'hidden' }}>{child}</div>)}
    </div>
  </section>;
}
