import React, { useState } from 'react';
import { ArrowRight, BarChart3, HeartPulse, MapPin, Sprout, UsersRound, Wheat, X } from 'lucide-react';
import './careers-reference.css';

const values = [
  { title: 'Passion', copy: 'We are passionate about agriculture and the positive impact it has on lives – from our team members to farmers in communities.', position: '50% 44%' },
  { title: 'Stewardship', copy: 'We care for the land, our people and our communities, ensuring a more sustainable future for generations to come.', position: '73% 47%', reverse: true },
  { title: 'Excellence', copy: 'We strive for the highest standards in everything we do – from growing to export – delivering premium quality with integrity.', position: '58% 36%' },
  { title: 'Responsibility', copy: 'We act responsibly in our workplace, our environment and the wider society, and always strive for safer, more inclusive and positive places.', position: '75% 62%', reverse: true },
  { title: 'Teamwork', copy: 'We achieve more together, working collaboratively, with mutual respect and shared purpose, to grow a stronger and brighter tomorrow.', position: '51% 50%' },
  { title: 'Diversity', copy: 'We celebrate different backgrounds, perspectives and ideas, because a better JBA is built through people like us – and people like you.', position: '63% 46%', reverse: true },
  { title: 'Sustainability', copy: 'We are committed to a healthier planet, growing a lasting legacy for future generations through responsible farming and innovative practices.', position: '18% 42%' },
];
const benefits = [
  { icon: BarChart3, title: 'Competitive', line: 'Pay' }, { icon: HeartPulse, title: 'Health &', line: 'Wellness' }, { icon: UsersRound, title: 'Professional', line: 'Development' },
  { icon: Wheat, title: 'Inclusive', line: 'Culture' }, { icon: UsersRound, title: 'Meaningful', line: 'Work' }, { icon: Sprout, title: 'Real', line: 'Impact' },
];
const openRoles = [
  ['Farm Operations Manager', 'Operations', 'Techiman, Ghana'],
  ['Quality Assurance Officer', 'Quality Control', 'Duayaw Nkwanta, Ahafo Region, Ghana'],
  ['Sales & Marketing Executive', 'Sales & Marketing', 'Duayaw Nkwanta, Ahafo Region, Ghana'],
  ['Supply Chain Coordinator', 'Supply Chain', 'Duayaw Nkwanta, Ahafo Region, Ghana'],
  ['Finance Officer', 'Finance', 'Duayaw Nkwanta, Ahafo Region, Ghana'],
];

export default function Careers() {
  const [positionsOpen, setPositionsOpen] = useState(false);
  const showPositions = () => setPositionsOpen(true);
  return <main className="careers-page">
    <section className="careers-reference-hero" aria-labelledby="careers-title">
      <img className="careers-hero-full-image" src="/pages/careers-hero-team.webp" alt="JBA GreenGold colleagues in the orchard" /><div className="careers-hero-shade" />
      <div className="careers-hero-copy"><p>People · Purpose · A brighter tomorrow</p><h1 id="careers-title">JBA Careers</h1><span className="careers-hero-rule" aria-hidden="true" /><div><strong>Grow a brighter future through agriculture,</strong><strong>innovation, and community impact.</strong></div><button type="button" className="careers-green-button" onClick={showPositions}>View Open Positions <ArrowRight size={17} /></button></div>
      <em className="careers-hero-mark">Good People.<br />Brighter<br />Harvests</em>
    </section>
    <section className="careers-values" aria-labelledby="values-title"><header className="careers-section-heading"><p>Our foundation</p><h2 id="values-title">Our Values</h2><span /></header><div className="careers-values-list">
      {values.map((value) => <article className={`careers-value ${value.reverse ? 'careers-value-reverse' : ''}`} key={value.title}><div className="careers-value-copy"><h3>{value.title}</h3><span /><p>{value.copy}</p></div><div className="careers-value-photo" style={{ backgroundPosition: value.position }} role="img" aria-label={`${value.title} at JBA GreenGold`} /></article>)}
    </div></section>
    <section className="careers-benefits" aria-labelledby="benefits-title"><div className="careers-benefit-grid">{benefits.map(({ icon: Icon, title, line }) => <div className="careers-benefit-icon" key={`${title}-${line}`}><Icon /><b>{title}<br />{line}</b></div>)}</div><div className="careers-benefit-copy"><h2 id="benefits-title">JBA Benefits</h2><span /><p>We invest in our people so you can do your best, grow your career and make a real difference.</p><ul><li>Competitive and fair compensation</li><li>Health, wellness and employee support programmes</li><li>Learning and career development</li><li>Inclusive and diverse work environment</li><li>Be part of a values-driven company</li><li>A more sustainable future</li></ul></div></section>
    <section className="careers-opportunities" id="opportunities" aria-labelledby="opportunities-title"><img src="/pages/careers-cta-banner.webp" alt="Mango orchard landscape" /><div><p>Build your future with us</p><h2 id="opportunities-title">Career Opportunities</h2><span>Explore roles across our farms, packhouses and support teams.</span><button type="button" onClick={showPositions} className="careers-gold-button">View Open Positions <ArrowRight size={17} /></button></div><em>People<br />Purpose<br />Progress</em></section>
    {positionsOpen && <div className="careers-modal-backdrop" role="presentation" onMouseDown={() => setPositionsOpen(false)}><section className="careers-positions-modal" role="dialog" aria-modal="true" aria-labelledby="positions-title" onMouseDown={(event) => event.stopPropagation()}><button type="button" className="careers-modal-close" aria-label="Close available positions" onClick={() => setPositionsOpen(false)}><X /></button><p>Grow with JBA GreenGold</p><h2 id="positions-title">Available Positions</h2><span className="careers-modal-rule" />{openRoles.map(([title, department, location]) => <article className="careers-role" key={title}><div><h3>{title}</h3><p>{department} · Full-time</p><span><MapPin size={14} /> {location}</span></div><a href={`mailto:careers@jbagreengold.com?subject=${encodeURIComponent(`Application: ${title}`)}`}>Apply <ArrowRight size={15} /></a></article>)}</section></div>}
  </main>;
}
