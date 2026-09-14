import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight, BarChart3, Box, CalendarCheck, ClipboardCheck,
  Globe2, Leaf, MapPin,
  PackageCheck, Route, ShieldCheck, Thermometer, Truck,
  Users,
} from 'lucide-react';
import deliveryLogisticsArtwork from '../../../../../asserts/ChatGPT Image Sep 4, 2026, 11_46_31 PM.png';
import { PRODUCT_CATALOG } from '@/data/productCatalog';
import './delivery-logistics-reference.css';

const REFERENCE_WIDTH = 941;

const services = [
  ['Local Delivery', 'Fresh mangoes delivered to retailers, wholesalers and businesses across Ghana with reliable and timely service.', Truck, [37, 443, 208, 126], '/contact?topic=local-supply'],
  ['Export Logistics', 'End-to-end export support including documentation, customs clearance and international freight partnerships.', Globe2, [256, 443, 208, 126], '/contact?topic=export'],
  ['Cold Chain Transport', 'Temperature-controlled transport to maintain freshness and quality from farm to destination.', Thermometer, [476, 443, 208, 126], '/contact?topic=cold-chain'],
  ['Warehousing & Fulfillment', 'Secure storage, inventory management and flexible fulfillment for local and international orders.', Box, [696, 443, 208, 126], '/contact?topic=fulfillment'],
];

const trackingFeatures = [
  ['GPS Tracking', 'Real-time location updates', MapPin], ['Route Optimization', 'Efficient & cost-effective', Route],
  ['Temperature Monitoring', 'Cold chain integrity', Thermometer], ['Proof of Delivery', 'Digital confirmation', ClipboardCheck],
  ['Delivery Scheduling', 'Flexible, reliable timing', CalendarCheck], ['Dedicated Support', 'Our team is always here', PackageCheck],
];

const trustItems = [
  ['Reliable Delivery', 'On time, every time', Truck], ['Quality Assured', 'Freshness from farm to destination', ShieldCheck],
  ['Local & Global Reach', 'Serving Ghana and international markets', Globe2], ['Transparent Tracking', 'Real-time updates at every step', BarChart3],
  ['Sustainable Operations', 'Lower environmental impact', Leaf], ['Experienced Team', 'A dedicated logistics partner you can trust', Users],
];

function ReferencePhoto({ crop, alt, className = '' }) {
  const [x, y, width, height] = crop;
  return (
    <div className={`dl-reference-photo ${className}`} style={{ aspectRatio: `${width} / ${height}` }}>
      <img src={deliveryLogisticsArtwork} alt={alt} style={{ width: `${(REFERENCE_WIDTH / width) * 100}%`, left: `${(-x / width) * 100}%`, top: `${(-y / height) * 100}%` }} />
    </div>
  );
}

function SectionHeading({ eyebrow, title, copy }) {
  return <div className="dl-section-heading"><p>{eyebrow}</p><h2 className="text-section-title">{title}</h2>{copy ? <span>{copy}</span> : null}</div>;
}

function SupplyProductMarqueeSet({ duplicate = false }) {
  return (
    <div className="dl-product-marquee-set" aria-hidden={duplicate ? true : undefined}>
      {PRODUCT_CATALOG.map((product) => (
        <figure key={product.id} className="dl-product-marquee-item">
          <img src={product.image} alt={duplicate ? '' : product.name} loading="lazy" decoding="async" />
          {!duplicate && <figcaption className="sr-only">{product.name}</figcaption>}
        </figure>
      ))}
    </div>
  );
}

function SupplyProductMarquee() {
  return (
    <div className="dl-product-marquee" role="region" aria-label="JBA GreenGold products moving from left to right" data-testid="supply-product-marquee">
      <div className="dl-product-marquee-track">
        <SupplyProductMarqueeSet duplicate />
        <SupplyProductMarqueeSet />
      </div>
    </div>
  );
}

export default function DeliveryLogisticsReference() {
  return (
    <article id="delivery-logistics" className="dl-page">
      <section data-layout-section="hero" className="jba-public-hero dl-hero" aria-labelledby="delivery-logistics-title">
        <div className="dl-hero-photo"><img src="/pages/supply/delivery-logistics-hero.png" alt="JBA logistics worker with a refrigerated mango delivery truck beside a mango orchard and warehouse" /></div><div className="dl-hero-shade" />
        <div className="dl-hero-inner"><div className="dl-hero-copy"><p className="dl-eyebrow">Delivery &amp; Logistics</p><h1 className="text-page-title" id="delivery-logistics-title">Fresh Delivery.<br /><span>Trusted Logistics.</span></h1><p className="dl-hero-body">Moving our mangoes safely from orchard to customers across Ghana and around the world — with care, reliability and real partners you can trust.</p><div className="dl-hero-buttons"><Link to="/my-orders">Track Shipment <ArrowRight /></Link><Link to="/contact?topic=logistics">Speak to Logistics Team <ArrowRight /></Link></div><div className="dl-hero-benefits"><div><Thermometer /><span>Cold Chain<br />Monitored</span></div><div><Truck /><span>Nationwide<br />Delivery</span></div><div><Globe2 /><span>Export Ready<br />to Global Markets</span></div><div><ShieldCheck /><span>Traceable<br />Shipments</span></div></div></div></div>
      </section>
      <section data-layout-section="content" className="dl-services dl-reveal" aria-labelledby="dl-services-title"><SectionHeading eyebrow="Our Logistics Services" title="End-to-End Logistics for Fresh Mangoes" copy="From our orchards to your destination, we provide reliable, efficient and temperature-controlled logistics solutions." /><div className="dl-service-grid">{services.map(([title, description, Icon, crop, to]) => <article key={title}><ReferencePhoto crop={crop} alt={title} /><div className="dl-service-content"><div className="dl-card-title"><span><Icon /></span><h3 className="text-card-title">{title}</h3></div><p>{description}</p><Link to={to}>Learn more <ArrowRight /></Link></div></article>)}</div></section>
      <section data-layout-section="content" className="dl-process-artwork dl-reveal" aria-label="From Our Orchard to Your Table connected value chain">
        <div className="dl-process-stage">
        <div className="dl-process-upper">
        <img src="/brand/orchard-to-table-value-chain.png" alt="JBA GreenGold's connected value chain from land preparation and orchard care through harvesting, packaging, cold-chain logistics, customer delivery, and premium mango products." loading="lazy" decoding="async" />
        </div>
        <div className="dl-process-lower">
        <img src="/brand/orchard-to-table-value-chain.png" alt="" aria-hidden="true" loading="lazy" decoding="async" />
        <SupplyProductMarquee />
        </div>
        </div>
      </section>
      <section data-layout-section="content" className="dl-fleet dl-reveal" aria-labelledby="dl-fleet-title"><div className="dl-fleet-copy"><p className="dl-eyebrow">Our Fleet &amp; Tracking</p><h2 className="text-section-title" id="dl-fleet-title">Modern Fleet.<br />Real-Time Visibility.</h2><p>Our modern fleet and tracking systems ensure your mangoes are delivered safely, on time and in the best condition — wherever they need to go.</p><Link to="/my-orders">Track Shipment <ArrowRight /></Link></div><ReferencePhoto crop={[258, 934, 322, 258]} alt="JBA refrigerated delivery fleet outside the mango warehouse" className="dl-fleet-photo" /><div className="dl-status"><div className="dl-status-heading"><p>Live Shipment Status</p><Link to="/my-orders">View all shipments <ArrowRight /></Link></div><div className="dl-shipment"><div className="dl-shipment-top"><span><Truck /></span><div><h3 className="text-card-title">JBA-EXP-00428</h3><p>Accra, Ghana <ArrowRight /> Rotterdam, Netherlands</p><small>Departed: Apr 24, 2024 &nbsp; | &nbsp; ETA: May 2, 2024</small></div><b>In Transit</b></div><div className="dl-progress"><i /><i /><i /><i /></div><div className="dl-progress-labels"><span>Picked Up</span><span>In Transit</span><span>At Port</span><span>Delivered</span></div></div><div className="dl-feature-grid">{trackingFeatures.map(([title, copy, Icon]) => <div key={title}><span><Icon /></span><p><b>{title}</b><small>{copy}</small></p></div>)}</div></div></section>
      <section data-layout-section="content" className="dl-trust dl-reveal" aria-labelledby="dl-trust-title"><SectionHeading eyebrow="Why Choose JBA GreenGold Logistics?" title="More Than Delivery — A Trusted Partner" copy="We go beyond transportation to deliver peace of mind." /><div>{trustItems.map(([title, copy, Icon]) => <article key={title}><span><Icon /></span><h3 className="text-card-title">{title}</h3><p>{copy}</p></article>)}</div></section>
      <section data-layout-section="content" className="dl-cta" aria-labelledby="dl-cta-title"><ReferencePhoto crop={[22, 1384, 249, 92]} alt="Ripe Ghanaian mangoes ready for delivery" /><div className="dl-cta-copy"><h2 className="text-section-title" id="dl-cta-title">Need dependable mango delivery<br />and logistics?</h2><p>Let’s move fresh opportunities together.</p></div><div className="dl-cta-actions"><Link to="/contact?topic=logistics">Request Logistics Support <ArrowRight /></Link><Link to="/contact?topic=supply">Get a Quote <ArrowRight /></Link></div></section>
    </article>
  );
}
