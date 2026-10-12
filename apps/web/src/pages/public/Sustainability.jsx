import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Droplets, Leaf, Recycle, Heart, ShieldCheck, TreePine, Users, Globe2 } from 'lucide-react';
import './sustainability-reference.css';

const pillars = [
  { title: 'Water Stewardship', icon: Droplets, photo: [230, 364, 88, 122], alt: 'Drip irrigation delivering water to orchard soil', text: 'Drip irrigation systems reduce water usage by up to 60%. We monitor soil moisture and schedule irrigation to minimize waste while maintaining optimal growing conditions.' },
  { title: 'Soil Health', icon: Leaf, photo: [537, 364, 72, 122], alt: 'Hands tending healthy soil', text: 'Cover cropping, composting, and minimal tillage practices preserve soil structure and fertility. Regular soil testing ensures balanced nutrition without over-fertilization.' },
  { title: 'Waste Reduction', icon: Recycle, photo: [826, 364, 99, 122], alt: 'Harvested mangoes in a reusable orchard crate', text: 'Mango by-products are repurposed into pulp, dried fruit, and animal feed. Packaging is designed for recyclability and minimal environmental impact.' },
  { title: 'Community Engagement', icon: Heart, photo: [230, 508, 88, 123], alt: 'A smiling member of the orchard team', text: 'We employ locally, provide fair wages, and invest in community infrastructure including schools, water access, and healthcare for farming communities.' },
  { title: 'Certified Standards', icon: ShieldCheck, photo: [537, 508, 72, 123], alt: 'A farm worker inspecting the orchard', text: 'Our farms hold Global G.A.P., Organic, and Fair Trade certifications. We undergo regular audits to maintain compliance with international food safety standards.' },
  { title: 'Biodiversity', icon: TreePine, photo: [826, 508, 99, 123], alt: 'A bee pollinating orchard flowers', text: 'We maintain natural habitats around farm boundaries, plant windbreaks, and avoid broad-spectrum pesticides to protect pollinators and beneficial insects.' },
];
const impacts = [
  [[41, 740, 47, 48], '60%', 'Reduction in water usage'],
  [[225, 740, 48, 48], '500+', 'Local jobs created'],
  [[402, 740, 48, 48], '100%', 'Recyclable packaging'],
  [[574, 740, 49, 48], '250+', 'Hectares of biodiversity areas protected'],
  [[758, 740, 48, 48], 'Global', 'Food safety & sustainability standards compliance'],
];
const goals = [
  [[432, 1072, 71, 79], 'SDG 2: Zero hunger'],
  [[514, 1072, 71, 79], 'SDG 6: Clean water and sanitation'],
  [[595, 1072, 72, 79], 'SDG 8: Decent work and economic growth'],
  [[679, 1072, 71, 79], 'SDG 12: Responsible consumption and production'],
  [[761, 1072, 73, 79], 'SDG 13: Climate action'],
  [[844, 1072, 71, 79], 'SDG 15: Life on land'],
];
const standards = [
  [[61, 1273, 44, 46], 'GLOBALG.A.P.', 'Certified'],
  [[207, 1272, 47, 47], 'HACCP', 'Food safety'],
  [[351, 1273, 44, 46], 'Organic', 'Certified'],
  [[490, 1275, 41, 44], 'Fair Trade', 'Compliant'],
  [[624, 1273, 44, 46], 'Ethical Sourcing', 'People & planet'],
  [[771, 1273, 45, 46], 'Export Ready', 'Global markets'],
];

// Display the photographs, badges and icons of the original PNG. The source file is
// unchanged; every window keeps its source proportions and never upscales.
function ReferencePhoto({ area: [x, y, width, height], alt, className = '' }) {
  return <div className={`sustain-photo ${className}`} role="img" aria-label={alt} style={{ aspectRatio: `${width} / ${height}`, maxWidth: width }}>
    <img src="/pages/sustainability-reference.png" alt="" aria-hidden="true" loading="eager" width="948" height="1659"
      style={{ width: `${948 / width * 100}%`, left: `${-x / width * 100}%`, top: `${-y / height * 100}%` }} />
  </div>;
}

export default function Sustainability() {
  return (
    <div className="sustainability-page">
      <section data-layout-section="hero" className="jba-public-hero sustain-hero" aria-labelledby="sustain-title">
        <img className="sustain-hero-image" src="/pages/sustainability-hero.png" width="1916" height="821" fetchPriority="high" alt="JBA GreenGold farm worker carefully inspecting mangoes on the tree" />
        <div className="sustain-container sustain-hero-grid">
          <div>
            <p className="sustain-eyebrow">A healthy planet. Brighter tomorrows.</p>
            <h1 className="text-page-title" id="sustain-title">Sustainability</h1>
            <p className="sustain-intro">We grow mangoes responsibly — protecting the environment, empowering communities, and building a business that thrives for generations.</p>
            <nav className="sustain-jumps" aria-label="Sustainability sections">
              <a href="#pillars"><Leaf />Responsible Farming</a>
              <a href="#community"><Users />Community Impact</a>
              <a href="#standards"><Globe2 />Global Standards</a>
            </nav>
          </div>
        </div>
      </section>

      <section data-layout-section="content" id="pillars" className="sustain-section sustain-container" aria-labelledby="pillars-title">
        <div className="sustain-section-heading">
          <h2 className="text-section-title" id="pillars-title">Our Sustainability Pillars</h2>
          <p>Sustainability is at the heart of everything we do. From how we grow our mangoes to how we support our people and protect the environment, we are committed to creating lasting positive impact.</p>
        </div>
        <div className="sustain-pillars">
          {pillars.map(({ title, icon: Icon, photo, alt, text }) => <article key={title} className="sustain-pillar">
            <span className="sustain-icon"><Icon aria-hidden="true" /></span>
            <div><h3 className="text-card-title">{title}</h3><p>{text}</p></div>
            <ReferencePhoto area={photo} alt={alt} />
          </article>)}
        </div>
      </section>

      <section data-layout-section="content" className="sustain-impact sustain-section" aria-labelledby="impact-title">
        <div className="sustain-container">
          <div className="sustain-section-heading"><h2 className="text-section-title" id="impact-title">Our Impact in Numbers</h2><p>Real progress. A more sustainable future.</p><a className="sustain-button sustain-outline" href="#sdgs">A healthier tomorrow <ArrowRight /></a></div>
          <div className="sustain-stats">{impacts.map(([area, value, label]) => <div className="sustain-stat" key={label}><ReferencePhoto area={area} alt={label + ' icon'} className="sustain-impact-image" /><div><strong>{value}</strong><p>{label}</p></div></div>)}</div>
        </div>
      </section>

      <section data-layout-section="content" id="community" className="sustain-community" aria-labelledby="community-title">
        <img className="sustain-community-image" src="/pages/sustainability-community.png" width="1916" height="821" loading="lazy" alt="An orchard team member holding a crate of freshly harvested mangoes, with the farm team harvesting behind her" />
        <div className="sustain-container sustain-community-grid">
          <div><p className="sustain-eyebrow">People. Communities. Lasting impact.</p><h2 className="text-section-title" id="community-title">Stronger Communities,<br />Sweeter Tomorrows</h2><p>Our sustainability journey is rooted in people — from our dedicated farm workers to the surrounding communities. We invest in local jobs, skills training, education, and essential infrastructure, because thriving communities create a stronger, more resilient tomorrow.</p><Link className="sustain-button sustain-light" to="/about">Our community impact <ArrowRight /></Link></div>
          <blockquote><p>“When the farm grows, our community grows too.”</p><footer>— Ama Serwaa<span>Farm Worker, JBA GreenGold Orchard</span></footer></blockquote>
        </div>
      </section>

      <section data-layout-section="content" id="sdgs" className="sustain-section sustain-container sustain-sdg-row" aria-labelledby="sdgs-title">
        <div><h2 className="text-section-title" id="sdgs-title">Our Commitment to the SDGs</h2><p>We align our sustainability efforts with the UN Sustainable Development Goals, focusing on responsible consumption, climate action, decent work, and zero hunger.</p></div>
        <div className="sustain-goals">{goals.map(([area, title]) => <ReferencePhoto key={title} area={area} alt={title} />)}</div>
      </section>

      <section data-layout-section="content" id="standards" className="sustain-section sustain-standards" aria-labelledby="standards-title">
        <div className="sustain-container"><div className="sustain-section-heading"><div><h2 className="text-section-title" id="standards-title">Certifications &amp; Global Standards</h2><p>We meet the highest international standards to ensure safe, high-quality mangoes for global markets.</p></div><a className="sustain-button sustain-outline" href="#sdgs">Explore our SDG commitment <ArrowRight /></a></div>
          <div className="sustain-certifications">{standards.map(([area, title, label]) => <div key={title}><ReferencePhoto area={area} alt={title + " logo"} className="sustain-certification-image" /><div><h3 className="text-card-title">{title}</h3><p>{label}</p></div></div>)}</div>
        </div>
      </section>

      <section data-layout-section="content" className="sustain-partner"><div className="sustain-container"><div><h2 className="text-section-title">Partner for a More Sustainable Future</h2><p>Join us in growing a healthier planet, stronger communities, and premium mangoes for generations to come.</p></div><Link className="sustain-button sustain-light" to="/contact?topic=partnership">Let’s work together <ArrowRight /></Link></div></section>
    </div>
  );
}
