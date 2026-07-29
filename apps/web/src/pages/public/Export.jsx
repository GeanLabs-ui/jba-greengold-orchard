import {
  Anchor,
  ArrowRight,
  BadgeCheck,
  Boxes,
  CheckCircle2,
  Clock3,
  Container,
  Download,
  FileCheck2,
  Globe2,
  Leaf,
  MapPinned,
  PackageCheck,
  Plane,
  Route,
  Ship,
  Snowflake,
  Thermometer,
  Tractor,
  Truck,
  Warehouse,
} from 'lucide-react';
import { Link } from 'react-router-dom';

const EXPORT_ASSET = '/pages/export';

const stats = [
  { icon: Globe2, value: '18+', label: 'Countries' },
  { icon: Ship, value: '2,400+', label: 'MT annual exports' },
  { icon: BadgeCheck, value: '100%', label: 'Compliance' },
  { icon: Snowflake, value: 'Global', label: 'Cold-chain network' },
];

const freightModes = [
  {
    icon: Plane,
    title: 'Air Freight',
    image: `${EXPORT_ASSET}/air.webp`,
    imageAlt: 'Cargo aircraft approaching the runway at sunset',
    points: ['Fast delivery for time-sensitive shipments', 'Ideal for premium and urgent orders', 'Global reach with trusted airline partners'],
  },
  {
    icon: Ship,
    title: 'Sea Freight',
    image: `${EXPORT_ASSET}/sea.webp`,
    imageAlt: 'Container vessel carrying export cargo',
    points: ['Cost-effective for bulk shipments', 'Reefer containers maintain freshness', 'Reliable routes to major ports worldwide'],
  },
];

const journey = [
  { icon: Leaf, title: 'Harvest', copy: 'Handpicked at peak ripeness' },
  { icon: PackageCheck, title: 'Sorting', copy: 'Graded for quality and consistency' },
  { icon: Boxes, title: 'Packing', copy: 'Packed in export-ready packaging' },
  { icon: Thermometer, title: 'Cold Storage', copy: 'Maintained at optimal temperature' },
  { icon: Truck, title: 'Transport', copy: 'Moved to port or airport' },
  { icon: Ship, title: 'Shipping', copy: 'Dispatched via sea or air freight' },
  { icon: FileCheck2, title: 'Customs', copy: 'Cleared with full documentation' },
  { icon: Globe2, title: 'Delivery', copy: 'Delivered fresh to global markets' },
];

const logistics = [
  {
    title: 'Air Freight',
    image: `${EXPORT_ASSET}/journey-air.webp`,
    alt: 'Export aircraft in flight',
    points: ['2–5 days', 'Priority shipments', 'Fresh and premium products'],
  },
  {
    title: 'Sea Freight',
    image: `${EXPORT_ASSET}/journey-sea.webp`,
    alt: 'Container ship at sea',
    points: ['14–28 days', 'Bulk shipments', 'Cost-effective solutions'],
  },
  {
    title: 'Reefer Containers',
    image: `${EXPORT_ASSET}/journey-reefer.webp`,
    alt: 'Temperature-controlled reefer container',
    points: ['2°C–12°C', 'IoT temperature tracking', 'Humidity and GPS monitoring'],
  },
  {
    title: 'Customs & Compliance',
    image: `${EXPORT_ASSET}/journey-customs.webp`,
    alt: 'Export compliance inspection',
    points: ['GlobalG.A.P.', 'HACCP, ISO and BRC', 'Phytosanitary certificates'],
  },
];

const markets = [
  { name: 'Europe', places: 'Rotterdam, Hamburg, London, Antwerp & more', share: '48%', image: `${EXPORT_ASSET}/market-europe.webp` },
  { name: 'Middle East', places: 'Dubai, Doha, Riyadh & more', share: '31%', image: `${EXPORT_ASSET}/market-middle-east.webp` },
  { name: 'Asia', places: 'Singapore, Hong Kong, Shanghai & more', share: '21%', image: `${EXPORT_ASSET}/market-asia.webp` },
];

function Eyebrow({ children }) {
  return <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#c47d09]">{children}</p>;
}

function GoldBullet({ children }) {
  return (
    <li className="flex gap-2 text-sm leading-6 text-[#536158]">
      <CheckCircle2 className="mt-1 h-3.5 w-3.5 shrink-0 text-[#c88718]" />
      <span>{children}</span>
    </li>
  );
}

export default function Export() {
  return (
    <main className="overflow-hidden bg-[#fffdf8] text-[#082f24]">
      <section className="relative min-h-[520px] overflow-hidden lg:min-h-[475px]">
        <img
          src={`${EXPORT_ASSET}/hero.webp`}
          alt="Cargo ship, aircraft, and export terminal connecting Ghana to international markets"
          className="absolute inset-0 h-full w-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#032d2c] via-[#073535]/80 to-[#062a2d]/5" />
        <div className="absolute inset-y-0 left-0 w-[48%] bg-gradient-to-r from-[#032d2c] via-[#032d2c]/95 to-transparent" />

        <div className="relative mx-auto flex min-h-[420px] max-w-7xl items-center px-5 py-12 sm:px-8 lg:px-10">
          <div className="max-w-[430px] animate-in fade-in slide-in-from-bottom-4 duration-700">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#e4a326]">Export operations</p>
            <h1 className="mt-3 font-heading text-5xl leading-[0.98] text-white sm:text-6xl">
              From Ghana<br />to the <span className="text-[#e2a02b]">World.</span>
            </h1>
            <p className="mt-5 max-w-md text-[15px] leading-6 text-white/90">
              Premium mangoes and mango products exported to 18+ countries across Europe, the Middle East, and Asia — via air and sea, with full compliance, traceability, and cold-chain integrity.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link to="/contact?topic=export" className="inline-flex h-12 items-center rounded-md bg-[#dfa234] px-5 text-sm font-semibold text-[#092f24] transition hover:-translate-y-0.5 hover:bg-[#efb94f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">
                Start Export Inquiry <ArrowRight className="ml-3 h-4 w-4" />
              </Link>
              <Link to="/contact?topic=brochure" className="inline-flex h-12 items-center rounded-md border border-white/70 bg-black/10 px-5 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">
                Request Brochure <Download className="ml-3 h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>

        <div className="relative mx-auto -mt-3 max-w-7xl px-5 sm:px-8 lg:px-10">
          <div className="grid overflow-hidden rounded-t-xl border border-[#d49827]/50 bg-[#013d31]/95 text-white shadow-2xl backdrop-blur md:grid-cols-4">
            {stats.map((stat, index) => (
              <div key={stat.label} className={`flex items-center justify-center gap-4 px-5 py-4 ${index ? 'border-t border-white/15 md:border-l md:border-t-0' : ''}`}>
                <stat.icon className="h-8 w-8 shrink-0 text-[#e2a02b]" strokeWidth={1.6} />
                <div>
                  <p className="text-xl font-bold leading-none">{stat.value}</p>
                  <p className="mt-1 text-[11px] font-medium uppercase tracking-wide text-white/75">{stat.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative mx-auto max-w-7xl px-5 pb-8 pt-16 sm:px-8 lg:px-10">
        <div className="grid gap-10 lg:grid-cols-[280px_1fr] lg:items-end">
          <div className="relative pb-4">
            <Eyebrow>Multiple shipping modes</Eyebrow>
            <h2 className="mt-2 font-heading text-4xl leading-[1.05]">Delivered fresh.<br />By air or by sea.</h2>
            <p className="mt-4 max-w-[250px] text-sm leading-6 text-[#5c675f]">
              We use the most reliable and efficient shipping methods to ensure your mangoes arrive in perfect condition, on time, every time.
            </p>
            <img src={`${EXPORT_ASSET}/mango-basket.webp`} alt="Fresh Ghanaian mangoes" className="mt-5 h-24 w-auto object-contain lg:-ml-10" loading="lazy" />
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            {freightModes.map((mode) => (
              <article key={mode.title} className="group overflow-hidden rounded-lg border border-[#d8d3c8] bg-white transition duration-300 hover:-translate-y-1 hover:shadow-xl">
                <div className="relative h-36 overflow-hidden">
                  <img src={mode.image} alt={mode.imageAlt} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" loading="lazy" />
                  <span className="absolute -bottom-5 left-6 grid h-12 w-12 place-items-center rounded-full bg-[#034334] text-[#e1a02a] ring-4 ring-white">
                    <mode.icon className="h-6 w-6" />
                  </span>
                </div>
                <div className="px-7 pb-5 pt-9">
                  <h3 className="font-heading text-xl">{mode.title}</h3>
                  <ul className="mt-3 space-y-1">{mode.points.map((point) => <GoldBullet key={point}>{point}</GoldBullet>)}</ul>
                  <Link to="/contact?topic=export" className="mt-4 inline-flex items-center text-sm font-semibold text-[#064334] hover:text-[#b87308]">
                    Learn more <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-[#0b432f]/10 bg-[#fbfaf5] py-8">
        <div className="mx-auto grid max-w-7xl gap-8 px-5 sm:px-8 lg:grid-cols-[260px_1fr] lg:px-10">
          <div>
            <Eyebrow>Global export network</Eyebrow>
            <h2 className="mt-2 font-heading text-4xl leading-[1.05]">A global network.<br />Built on trust.</h2>
            <p className="mt-4 text-sm leading-6 text-[#5c675f]">We connect Ghana to the world with reliable sea and air freight routes.</p>
            <div className="mt-5 grid grid-cols-2 overflow-hidden rounded-lg border border-[#ddd8cd] bg-white text-sm">
              <div className="border-b border-r border-[#ddd8cd] p-3"><Globe2 className="mb-1 h-5 w-5" /><b>Europe</b><br /><span className="text-xs text-[#657169]">9 countries</span></div>
              <div className="border-b border-[#ddd8cd] p-3"><Anchor className="mb-1 h-5 w-5" /><b>Middle East</b><br /><span className="text-xs text-[#657169]">5 countries</span></div>
              <div className="border-r border-[#ddd8cd] p-3"><Route className="mb-1 h-5 w-5" /><b>Asia</b><br /><span className="text-xs text-[#657169]">4 countries</span></div>
              <div className="p-3"><Clock3 className="mb-1 h-5 w-5" /><b>48 hrs</b><br /><span className="text-xs text-[#657169]">Avg. export processing</span></div>
            </div>
            <div className="mt-3 flex items-center gap-3 rounded-lg border border-[#ddd8cd] bg-white p-3 text-sm"><Thermometer className="h-5 w-5" /><b>100%</b><span className="text-xs text-[#657169]">Cold-chain monitoring</span></div>
          </div>
          <figure className="group relative min-h-[350px] overflow-hidden rounded-xl bg-[#032d36] shadow-lg">
            <img src={`${EXPORT_ASSET}/network.webp`} alt="International air and sea export routes originating in Ghana" className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.015]" loading="lazy" />
            <figcaption className="sr-only">JBA GreenGold export routes from Ghana to Europe, the Middle East, Asia, and South America.</figcaption>
          </figure>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-10 sm:px-8 lg:px-10">
        <Eyebrow>The export journey</Eyebrow>
        <div className="mt-5 grid grid-cols-2 gap-y-7 sm:grid-cols-4 lg:grid-cols-8">
          {journey.map((step, index) => (
            <div key={step.title} className="relative pr-3">
              <div className="grid h-11 w-11 place-items-center rounded-full border border-[#9aafa5] bg-white">
                <step.icon className="h-5 w-5 text-[#064334]" strokeWidth={1.5} />
              </div>
              {index < journey.length - 1 && <span className="absolute left-12 top-[22px] hidden h-px w-[calc(100%-3.5rem)] border-t border-dashed border-[#d79a2d] lg:block" />}
              <p className="mt-3 text-sm font-bold"><span className="mr-1">{index + 1}.</span>{step.title}</p>
              <p className="mt-1 text-xs leading-4 text-[#657169]">{step.copy}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {logistics.map((item) => (
            <article key={item.title} className="grid grid-cols-[42%_1fr] gap-3 rounded-lg border border-[#ddd8cd] bg-white p-3 transition hover:border-[#c58a23] hover:shadow-md">
              <img src={item.image} alt={item.alt} className="h-full min-h-32 w-full rounded-md object-cover" loading="lazy" />
              <div>
                <h3 className="text-sm font-bold">{item.title}</h3>
                <ul className="mt-2 space-y-1">{item.points.map((point) => <GoldBullet key={point}>{point}</GoldBullet>)}</ul>
                <Link to="/contact?topic=logistics" className="mt-2 inline-flex items-center text-xs font-semibold text-[#064334]">Learn more <ArrowRight className="ml-1 h-3 w-3" /></Link>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-[0.82fr_1.18fr]">
          <section className="rounded-lg border border-[#ddd8cd] bg-white p-4" aria-labelledby="shipment-title">
            <Eyebrow>Live shipment tracking</Eyebrow>
            <div className="mt-3 grid gap-4 sm:grid-cols-[42%_1fr]">
              <img src={`${EXPORT_ASSET}/tracking.webp`} alt="Container vessel representing shipment tracking" className="h-36 w-full rounded-md object-cover" loading="lazy" />
              <dl id="shipment-title" className="grid grid-cols-[1fr_auto] content-start text-xs">
                {[
                  ['Shipment ID', 'GG240071'], ['Status', 'In transit'], ['Current location', 'Port of Rotterdam'], ['ETA', '2 days'], ['Temperature', '8°C'], ['Container no.', 'RF-88291'],
                ].map(([term, value]) => <div className="contents" key={term}><dt className="border-b border-[#e4e0d7] py-1.5 text-[#657169]">{term}</dt><dd className={`border-b border-[#e4e0d7] py-1.5 font-semibold ${term === 'Status' ? 'text-emerald-700' : ''}`}>{value}</dd></div>)}
              </dl>
            </div>
          </section>

          <section className="rounded-lg border border-[#ddd8cd] bg-white p-4" aria-labelledby="markets-title">
            <Eyebrow>Destination markets</Eyebrow>
            <h2 id="markets-title" className="sr-only">Destination markets</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              {markets.map((market) => (
                <article key={market.name} className="relative min-h-36 overflow-hidden rounded-lg bg-[#092f32] text-white">
                  <img src={market.image} alt="" className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-black/10" />
                  <div className="relative flex h-full min-h-36 flex-col justify-end p-3">
                    <h3 className="font-bold">{market.name}</h3>
                    <p className="mt-1 text-[10px] leading-4 text-white/80">{market.places}</p>
                    <p className="mt-2 text-lg font-bold">{market.share}</p>
                    <div className="mt-1 h-1 rounded-full bg-white/25"><span className="block h-full rounded-full bg-emerald-400" style={{ width: market.share }} /></div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-5 sm:px-8 lg:px-10">
        <div className="grid items-center gap-5 overflow-hidden rounded-xl bg-[#033f31] px-6 py-5 text-white md:grid-cols-[160px_1fr_auto] lg:px-8">
          <img src={`${EXPORT_ASSET}/cta-mango.webp`} alt="Fresh cut mango" className="h-20 w-40 object-contain" loading="lazy" />
          <div>
            <h2 className="font-heading text-2xl md:text-3xl">Ready to export the goodness of Ghanaian mangoes?</h2>
            <p className="mt-2 max-w-xl text-sm text-white/75">Partner with us for consistent quality, reliable supply, and seamless export operations.</p>
          </div>
          <div className="flex flex-wrap gap-3 md:justify-end">
            <Link to="/contact?topic=export" className="inline-flex h-11 items-center rounded-md bg-[#dfa234] px-5 text-sm font-semibold text-[#092f24] transition hover:bg-[#efb94f]">Start Export Inquiry <ArrowRight className="ml-3 h-4 w-4" /></Link>
            <Link to="/contact" className="inline-flex h-11 items-center rounded-md border border-white/50 px-5 text-sm font-semibold text-white transition hover:bg-white/10">Speak to our team</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
