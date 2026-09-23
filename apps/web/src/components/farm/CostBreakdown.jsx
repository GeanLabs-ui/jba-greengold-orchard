import { useId, useState } from 'react';
import { MapPin } from 'lucide-react';
import { buildCostTypeBreakdown } from '@/lib/activity-cost-types';
import './cost-breakdown.css';

const money = value => `₵${Number(value || 0).toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
const percent = (value, total) => !total || !value ? '0%' : value / total * 100 < .1 ? '<0.1%' : `${Number((value / total * 100).toFixed(1))}%`;
const colors = ['#ffbf00', '#087aff', '#ff1919', '#f31b89', '#0cb32b', '#8500ff', '#00aff5', '#5145ff', '#29a6a7', '#ff7900'];
const darkColors = ['#986300', '#003faf', '#af0000', '#a60865', '#05631b', '#4500a7', '#0061ad', '#3025bd', '#186a6b', '#af4500'];
const positions = [[140,192],[140,312],[140,432],[140,590],[1300,105],[1300,213],[1300,320],[1300,427],[1300,534],[1300,642]];
const leaders = ['422,219 580,219 722,161 812,166','422,339 472,339 737,183 798,183','422,459 445,459 730,197 823,181','422,617 618,617 700,585','1300,132 890,132 833,177','1300,240 1204,240 939,156 894,158 863,172','1300,347 1225,347 930,179 879,179','1300,454 1238,454 966,203 856,185','1300,561 1238,561 985,258 873,183','1300,669 1226,553 1065,330 886,187'];
const point = (angle, radius = 263) => [835 + Math.cos(angle) * radius, 442 + Math.sin(angle) * radius];

function Chart({ categories, total, selected, focus, onSelect }) {
  const id = useId().replace(/:/g, '');
  // Real proportions, including very small costs; zero categories stay accessible in the labels.
  let cursor = -Math.PI / 2;
  const segments = categories.map((item, index) => {
    const start = cursor;
    const angle = total ? item.value / total * Math.PI * 2 : 0;
    cursor += angle;
    const a = point(start), b = point(cursor);
    return { ...item, index, middle: start + angle / 2, angle, path: `M835 442 L${a.join(' ')} A263 263 0 ${angle > Math.PI ? 1 : 0} 1 ${b.join(' ')} Z` };
  });
  const dominant = segments.reduce((best, item) => item.value > best.value ? item : best, segments[0]);
  const activate = (event, value) => {
    if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onSelect(value); }
  };
  return <svg className="cost-art" viewBox="0 0 1672 752" aria-label="Interactive cost breakdown by category">
    <defs>
      <radialGradient id={`${id}-metal`} cx="35%" cy="25%" r="85%"><stop stopColor="#d4d8df"/><stop offset=".7" stopColor="#f6f7f9"/><stop offset="1" stopColor="#a5aab1"/></radialGradient>
      <radialGradient id={`${id}-gloss`} cx="45%" cy="35%" r="68%"><stop stopColor="white" stopOpacity=".2"/><stop offset=".8" stopColor="white" stopOpacity="0"/><stop offset=".94" stopColor="white" stopOpacity=".23"/><stop offset="1" stopColor="#440020" stopOpacity=".28"/></radialGradient>
      <filter id={`${id}-shadow`} x="-30%" y="-30%" width="160%" height="170%"><feDropShadow dx="0" dy="20" stdDeviation="15" floodOpacity=".28"/></filter>
      {colors.map((color, i) => <linearGradient key={color} id={`${id}-label-${i}`} x2="1" y2=".6"><stop stopColor={color}/><stop offset="1" stopColor={darkColors[i]}/></linearGradient>)}
    </defs>
    <text x="70" y="108" className="cost-art-title">Cost Breakdown</text>
    <text x="76" y="155" className="cost-art-subtitle">Total Cost by Category</text>
    <g fill="none" strokeWidth="2.2" pointerEvents="none">{leaders.map((points,index) => <polyline key={points} points={points} stroke={colors[index]}/>)}</g>
    <g filter={`url(#${id}-shadow)`}>
      <ellipse cx="835" cy="474" rx="266" ry="263" fill={focus ? focus.color : total ? colors[dominant.index] : '#cbd5e1'}/>
      <ellipse cx="835" cy="474" rx="266" ry="263" fill="#230517" opacity=".38"/>
      <circle cx="835" cy="442" r="263" fill="#e2e8f0"/>
      {focus ? <circle key={focus.name} className="cost-focus-ring" cx="835" cy="442" r="263" fill={focus.color}/> : segments.filter(item => item.value > 0).map(item => <g key={item.name} role="button" tabIndex={0} aria-label={`View ${item.name} costs`} aria-pressed={selected === item.name} className={`cost-slice ${selected === item.name ? 'is-selected' : ''}`} style={{ '--slice-x': `${Math.cos(item.middle) * 13}px`, '--slice-y': `${Math.sin(item.middle) * 13}px` }} onClick={() => onSelect(item.name)} onKeyDown={e => activate(e, item.name)}>
        {item.angle >= Math.PI * 2 - .000001 ? <circle cx="835" cy="442" r="263" fill={colors[item.index]}/> : <path d={item.path} fill={colors[item.index]} stroke={colors[item.index]} strokeWidth=".6"/>}
        <title>{item.name}: {money(item.value)} ({percent(item.value, total)})</title>
      </g>)}
      <circle cx="835" cy="442" r="263" fill={`url(#${id}-gloss)`} pointerEvents="none"/>
    </g>
    <g role="button" tabIndex={0} aria-label={focus ? "Clear cost selection" : "Total cost"} className="cost-center" onClick={() => onSelect('all')} onKeyDown={e => activate(e, 'all')}>
      <circle cx="835" cy="452" r="120" fill="#838890" filter={`url(#${id}-shadow)`}/>
      <circle cx="835" cy="448" r="117" fill={`url(#${id}-metal)`} stroke="#edf0f4" strokeWidth="7"/>
      <g fill="#9299a2" stroke="#e7ebef" strokeWidth="1.2" aria-hidden="true">{[[818,404,5],[847,382,8]].map(([x,y,count]) => <g key={x}>{Array.from({length:count},(_,i) => <ellipse key={i} cx={x} cy={y+(count-1-i)*7} rx="14" ry="7"/>)}</g>)}</g>
      <text x="835" y="476" textAnchor="middle" className="cost-center-label">TOTAL COST</text>
      <text key={total} x="835" y="511" textAnchor="middle" className="cost-center-value" fontSize={money(total).length > 13 ? 25 : 32}>{money(total)}</text>
    </g>
    {focus ? <g key={focus.name} pointerEvents="none" className="cost-selected-name" fill="white" textAnchor="middle">
      <text x="835" y="613" fontSize={Math.min(40, 340 / (focus.name.length * .6))} fontWeight="700">{focus.name}</text>
      <text x="835" y="655" fontSize="32" fontWeight="700">{money(focus.value)}</text>
      <text x="835" y="683" fontSize="22">{percent(focus.value,total)} of total</text>
    </g> : total > 0 && dominant.value / total > .5 ? <text x="835" y="635" textAnchor="middle" className="cost-dominant" pointerEvents="none">{percent(dominant.value, total)}</text> : null}
    {!total && !focus && <text x="835" y="635" textAnchor="middle" fontSize="28" fill="#64748b">No costs recorded</text>}
    {categories.map((item, index) => {
      const [x,y] = positions[index];
      const left = index < 4;
      const width = left ? 282 : 232;
      return <g key={item.name} role="button" tabIndex={0} aria-label={`${item.name}: ${money(item.value)}, ${percent(item.value, total)}`} aria-pressed={selected === item.name} onClick={() => onSelect(item.name)} onKeyDown={e => activate(e,item.name)} className={`cost-label ${selected === item.name ? 'is-selected' : ''}`}>
        {index === 3 && <><polyline points="576,617 618,617 700,585" fill="none" stroke="white" strokeWidth="2.2"/><circle cx="700" cy="585" r="4" fill="white"/></>}
        <rect className="cost-label-value-bg" x={x+15} y={y+42} width={width-28} height="58" rx="19" fill="#fff" fillOpacity=".88"/>
        <rect className="cost-label-pill" x={x} y={y} width={width} height="55" rx="28" fill={`url(#${id}-label-${index})`} stroke="white" strokeOpacity=".6" strokeWidth="2"/>
        <text x={x+30} y={y+38} className="cost-category-name">{item.name}</text>
        <text x={x+30} y={y+87} className="cost-category-value" fontSize={Math.min(27,(width-45)/((percent(item.value,total).length+money(item.value).length+3)*.54))}><tspan fontWeight="700">{percent(item.value,total)}</tspan><tspan dx="8">({money(item.value)})</tspan></text>
      </g>;
    })}
  </svg>;
}

export default function CostBreakdown({ costRows, farmFor }) {
  const [selection, setSelection] = useState(null);
  const categories = buildCostTypeBreakdown(costRows);
  const total = categories.reduce((sum,item) => sum + item.value, 0);
  const farms = Object.values(costRows.reduce((groups,row) => {
    const name = farmFor(row);
    groups[name] ||= { name, value: 0 };
    groups[name].value += row.value;
    return groups;
  }, Object.create(null))).sort((a,b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
  const select = (kind, name) => setSelection(current => name === 'all' || (current?.kind === kind && current.name === name) ? null : { kind, name });
  const selectedCategory = selection?.kind === 'category' ? categories.find(item => item.name === selection.name) : null;
  const focus = !selection ? null : {
    name: selection.name,
    value: selectedCategory ? selectedCategory.value : costRows.filter(row => farmFor(row) === selection.name).reduce((sum,row) => sum + row.value, 0),
    color: selectedCategory ? colors[categories.indexOf(selectedCategory)] : '#986300',
  };
  return <section className="cost-breakdown" aria-label="Cost Breakdown">
    {selection && <button type="button" className="cost-clear-selection" onClick={() => setSelection(null)}>Clear selection</button>}
    <span className="sr-only" aria-live="polite">{focus ? `${focus.name}: ${money(focus.value)}, ${percent(focus.value,total)}` : `Total cost: ${money(total)}`}</span>
    <Chart categories={categories} total={total} selected={selection?.kind === 'category' ? selection.name : null} focus={focus} onSelect={name => select('category',name)}/>
    <div className="cost-mobile-categories">{categories.map((item,index) => <button key={item.name} type="button" onClick={() => select('category',item.name)} aria-pressed={selection?.kind === 'category' && selection.name === item.name} style={{ '--category-color': colors[index] }}><strong>{item.name}</strong><span>{percent(item.value,total)} · {money(item.value)}</span></button>)}</div>
    <div className="cost-farm-split">
      <h3>Cost Split by Main Farm</h3>
      <div className="cost-farm-items">
        {farms.map(farm => <button key={farm.name} type="button" onClick={() => select('farm',farm.name)} aria-pressed={selection?.kind === 'farm' && selection.name === farm.name} className="cost-farm-item"><span className="cost-location"><MapPin/></span><span><strong>{farm.name}</strong><span>{money(farm.value)} · {percent(farm.value,total)}</span></span></button>)}
        {!farms.length && <p>No farm costs recorded for this selection.</p>}
        <button type="button" className="cost-farm-total" onClick={() => select('category','all')}><span>Total Cost</span><strong>{money(total)}</strong></button>
      </div>
    </div>
  </section>;
}
