import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { formatCostPercentage } from '@/lib/activity-cost-types';
import { expenseChartPreviewRows } from '@/lib/expense-chart-preview';
import './expense-photo-chart.css';

const scenes = {
  Administration: ['administration', 'JBA administrators working in an office'],
  Materials: ['materials', 'Fertilizers and agricultural chemicals for a mango farm'],
  Labor: [null, 'Staff working on a mango farm'],
  Tools: ['tools', 'Cutlasses, mango picking poles and harvesting crates'],
  Transportation: ['transportation', 'JBA farm transport vehicle'],
  'Food/Ent': ['food', 'Farm workers eating together'],
  Others: ['community', 'JBA community gathering'],
};
const colors = ['#e9af09', '#2865f5', '#ee3436', '#ee1489', '#2baa55', '#8222dd', '#28a8ea'];
const money = value => `GH₵ ${Number(value || 0).toLocaleString('en-GH', { maximumFractionDigits: 2 })}`;
const point = (angle, radius) => [180 + Math.cos(angle) * radius, 176 + Math.sin(angle) * radius];
function wedge(start, end) {
  const a = point(start, 145), b = point(end, 145), c = point(end, 88), d = point(start, 88);
  const large = end - start > Math.PI ? 1 : 0;
  return `M${a} A145 145 0 ${large} 1 ${b} L${c} A88 88 0 ${large} 0 ${d} Z`;
}

export default function ExpensePhotoChart({ rows: liveRows, total: liveTotal, selectionName, onSelectionChange }) {
  const preview = import.meta.env.DEV;
  const rows = preview ? expenseChartPreviewRows : liveRows;
  const total = preview ? rows.reduce((sum, row) => sum + row.value, 0) : liveTotal;
  const [localSelection, setLocalSelection] = useState(null);
  const visual = useRef(null);
  const popupRef = useRef(null);
  const [popupPosition, setPopupPosition] = useState({ left: -10000, top: 0 });
  const selected = selectionName === undefined ? localSelection : selectionName;
  const setSelected = name => onSelectionChange ? onSelectionChange(name) : setLocalSelection(name);
  const id = useId().replace(/:/g, '');
  const scene = scenes[selected];
  const photo = scene ? scene[0] ? `/pages/expenses/${scene[0]}.webp` : '/pages/sustainability-community.png' : '/pages/export/mango-basket.webp';
  let cursor = -Math.PI / 2;
  const segments = rows.map((row, index) => {
    const start = cursor;
    cursor += total > 0 ? row.value / total * Math.PI * 2 : 0;
    // Two arcs represent a full circle without the coincident-endpoint SVG limitation.
    const end = Math.min(cursor, start + Math.PI * 2 - 0.000001);
    return { ...row, index, start, end, middle: (start + end) / 2 };
  });
  const choose = name => setSelected(selected === name ? null : name);
  const selectedSegment = segments.find(row => row.name === selected);
  const popupAnchor = selectedSegment ? point(selectedSegment.middle, 119) : [180, 176];
  const popupOnLeft = selectedSegment && Math.cos(selectedSegment.middle) < 0;
  const popupAnchorY = 22 + (popupAnchor[1] + (selectedSegment ? Math.sin(selectedSegment.middle) * 46 - 5 : 0)) * .82;
  useEffect(() => {
    const placePopup = () => {
      if (!visual.current || !selected) return;
      const bounds = visual.current.querySelector('svg').getBoundingClientRect();
      const width = popupRef.current?.getBoundingClientRect().width || 170;
      const height = popupRef.current?.getBoundingClientRect().height || 90;
      const gap = 12;
      const fitsLeft = bounds.left >= width + gap;
      const fitsRight = window.innerWidth - bounds.right >= width + gap;
      const leftSide = popupOnLeft ? fitsLeft || !fitsRight : !fitsRight && fitsLeft;
      let left = leftSide ? bounds.left - width - gap : bounds.right + gap;
      let top = bounds.top + (popupAnchorY + 15) / 350 * bounds.height - height / 2;
      if (!fitsLeft && !fitsRight) {
        left = bounds.left + (bounds.width - width) / 2;
        top = bounds.bottom + gap;
      }
      setPopupPosition({ left: Math.max(8, Math.min(window.innerWidth - width - 8, left)), top: Math.max(64, Math.min(window.innerHeight - height - 16, top)) });
    };
    placePopup();
    window.addEventListener('resize', placePopup);
    window.addEventListener('scroll', placePopup, true);
    const observer = new ResizeObserver(placePopup);
    if (visual.current) observer.observe(visual.current);
    return () => { observer.disconnect(); window.removeEventListener('resize', placePopup); window.removeEventListener('scroll', placePopup, true); };
  }, [selected, popupOnLeft, popupAnchorY]);
  const popup = selected && <div ref={popupRef} className="expense-selection-popover expense-selection-floating" role="status" aria-live="polite" style={{ '--selected-color': colors[rows.findIndex(row => row.name === selected)], ...popupPosition }}>
        <button type="button" aria-label="Close expense details" onClick={() => setSelected(null)}>×</button>
        <strong>{selected === 'Labor' ? 'Labour' : selected}</strong>
        <dl><div><dt>Amount</dt><dd>{money(rows.find(row => row.name === selected)?.value)}</dd></div><div><dt>Percentage</dt><dd>{formatCostPercentage(rows.find(row => row.name === selected)?.value || 0, total)}</dd></div></dl>
      </div>;
  return <div className="expense-photo-layout">

    <div ref={visual} className="expense-photo-visual">
      <svg viewBox="-15 -15 390 350" aria-label="Expense chart with category photographs">
        <defs>
          <clipPath id={`${id}-photo`}><circle cx="180" cy="176" r="88" /></clipPath>
          <radialGradient id={`${id}-gloss`} cx="40%" cy="25%" r="80%"><stop stopColor="#fff" stopOpacity=".24" /><stop offset=".65" stopColor="#fff" stopOpacity="0" /><stop offset=".9" stopColor="#fff" stopOpacity=".2" /><stop offset="1" stopColor="#650000" stopOpacity=".3" /></radialGradient>
          <filter id={`${id}-shadow`} x="-30%" y="-30%" width="160%" height="170%"><feDropShadow dx="0" dy="10" stdDeviation="9" floodColor="#5b3024" floodOpacity=".27" /></filter>
          {segments.filter(row => row.value > 0).map(row => {
            const reverse = Math.sin(row.middle) > 0;
            const a = point(reverse ? row.end : row.start, 119), b = point(reverse ? row.start : row.end, 119);
            return <path key={row.name} id={`${id}-name-${row.index}`} d={`M${a} A119 119 0 ${row.end - row.start > Math.PI ? 1 : 0} ${reverse ? 0 : 1} ${b}`} />;
          })}
        </defs>
        <g transform="translate(0 22) scale(1 .82)">
          <g transform="translate(0 32)" className="expense-slice-depth">{segments.filter(row => row.value > 0).map(row => <path key={row.name} d={wedge(row.start, row.end)} fill={colors[row.index]} transform={selected === row.name ? `translate(${Math.cos(row.middle) * 46} ${Math.sin(row.middle) * 46 - 5})` : undefined} />)}</g>
          {Array.from({ length: 31 }, (_, layer) => <g key={layer} transform={`translate(0 ${31 - layer})`} className="expense-slice-depth">{segments.filter(row => row.value > 0).map(row => <path key={row.name} d={wedge(row.start, row.end)} fill={colors[row.index]} transform={selected === row.name ? `translate(${Math.cos(row.middle) * 46} ${Math.sin(row.middle) * 46 - 5})` : undefined} />)}</g>)}
          {segments.filter(row => row.value > 0 && Math.sin(row.start) > 0).map(row => { const [x, y] = point(row.start, 145); return <path key={`cut-${row.name}`} d={`M${x} ${y} V${y + 32}`} stroke="white" strokeWidth="3" pointerEvents="none" />; })}
          <image href={photo} x="92" y="88" width="176" height="176" preserveAspectRatio="xMidYMid slice" clipPath={`url(#${id}-photo)`}><title>{scene?.[1] || 'Fresh orchard mangoes'}</title></image>
          {total <= 0 && <circle cx="180" cy="176" r="116.5" fill="none" stroke="#e5ebef" strokeWidth="57" />}
          {segments.filter(row => row.value > 0).map(row => <path key={row.name} d={wedge(row.start, row.end)} transform={selected === row.name ? `translate(${Math.cos(row.middle) * 46} ${Math.sin(row.middle) * 46 - 5})` : undefined} fill={colors[row.index]} stroke="none" role="button" tabIndex="0" aria-label={`Select ${row.name}: ${formatCostPercentage(row.value, total)}, ${money(row.value)}`} aria-pressed={selected === row.name} onClick={() => choose(row.name)} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); choose(row.name); } }}><title>{row.name}: {money(row.value)}</title></path>)}
          {segments.filter(row => row.value > 0).map(row => <path key={`gloss-${row.name}`} d={wedge(row.start, row.end)} fill={`url(#${id}-gloss)`} transform={selected === row.name ? `translate(${Math.cos(row.middle) * 46} ${Math.sin(row.middle) * 46 - 5})` : undefined} pointerEvents="none" />)}
          {segments.filter(row => row.value > 0).map(row => { const a = point(row.start, 88), b = point(row.start, 145); return <path key={`radial-cut-${row.name}`} d={`M${a} L${b}`} stroke="white" strokeWidth={row.end - row.start > .12 ? 5 : .7} pointerEvents="none" />; })}
          <circle cx="180" cy="176" r="88" fill="none" stroke="#ffffff88" strokeWidth="2" pointerEvents="none" />
          <text x="180" y="201" textAnchor="middle" className="expense-photo-total-label">Total Cost</text>
          <text x="180" y="223" textAnchor="middle" className="expense-photo-total">{money(total)}</text>
          {!preview && <text x="180" y="245" textAnchor="middle" className="expense-photo-period">All recorded dates</text>}
        </g>
        <g transform="translate(0 22) scale(1 .82)">{segments.filter(row => row.value > 0 && row.value / total >= .04).map(row => {
          const name = row.name === 'Labor' ? 'Labour' : row.name;
          const fontSize = Math.min(13, (row.end - row.start) * 119 / (name.length * .65));
          return <text key={row.name} transform={selected === row.name ? `translate(${Math.cos(row.middle) * 46} ${Math.sin(row.middle) * 46 - 5})` : undefined} className="expense-slice-name" pointerEvents="none" fill="white" fontSize={fontSize} fontWeight="700"><textPath href={`#${id}-name-${row.index}`} startOffset="50%" textAnchor="middle">{name}</textPath></text>;
        })}</g>
      </svg>
      {popup && (typeof document === 'undefined' ? popup : createPortal(popup, document.body))}
      <span className="sr-only" aria-live="polite">{scene?.[1] || 'Select an expense slice to view its photo and details'}</span>
      {selected && <button className="expense-photo-clear" type="button" onClick={() => setSelected(null)}>Clear selection</button>}
    </div>
  </div>;
}
