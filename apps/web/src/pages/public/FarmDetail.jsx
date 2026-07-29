import React, { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  Bike,
  BusFront,
  CalendarDays,
  CloudSun,
  LandPlot,
  Leaf,
  MapPin,
  Mountain,
  PersonStanding,
} from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import FarmDirectionsDialog from '@/components/public/FarmDirectionsDialog';
import { getPublicFarm } from '@/data/publicFarms';

const serif = { fontFamily: 'Georgia, Cambria, "Times New Roman", serif' };

export default function FarmDetail() {
  const { slug } = useParams();
  const farm = getPublicFarm(slug);
  const [startLocation, setStartLocation] = useState('');
  const [travelMode, setTravelMode] = useState('driving');
  const [directionsOpen, setDirectionsOpen] = useState(false);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (!farm) return undefined;
    const previousTitle = document.title;
    document.title = `${farm.name} | JBA GreenGold Orchard`;
    return () => { document.title = previousTitle; };
  }, [farm]);

  if (!farm) {
    return (
      <section className="bg-[#fbf8ef] px-5 py-24 text-center text-[#0b432f]">
        <h1 style={serif} className="text-4xl">Farm not found</h1>
        <Link to="/farms" className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-[#a66b0b]"><ArrowLeft className="h-4 w-4" /> Return to our farms</Link>
      </section>
    );
  }

  const mapBounds = `${farm.lng - 0.3},${farm.lat - 0.22},${farm.lng + 0.3},${farm.lat + 0.22}`;
  const mapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(mapBounds)}&layer=mapnik&marker=${farm.lat}%2C${farm.lng}`;
  const reveal = reduceMotion
    ? {}
    : {
        initial: { opacity: 0, y: 20 },
        whileInView: { opacity: 1, y: 0 },
        viewport: { once: true, amount: 0.12 },
        transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] },
      };

  const showDirections = (event) => {
    event.preventDefault();
    if (startLocation.trim()) setDirectionsOpen(true);
  };

  return (
    <div className="overflow-hidden bg-[#fbf8ef] text-[#0b432f]">
      <section className="relative min-h-[560px] text-white">
        <img src={farm.detailImage || farm.image} alt={`${farm.name} mango orchard`} className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#031f17]/90 via-[#032b20]/65 to-[#032b20]/20" />
        <div className="relative mx-auto flex min-h-[560px] max-w-7xl flex-col justify-end px-5 py-16 sm:px-8 lg:px-10">
          <Link to="/farms" className="mb-auto inline-flex w-fit items-center gap-2 text-sm text-white/80 hover:text-[#e4a426]"><ArrowLeft className="h-4 w-4" /> All farms</Link>
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#e4a426]">Farm profile · {farm.region}</p>
          <h1 style={serif} className="mt-4 max-w-4xl text-5xl font-normal leading-tight sm:text-6xl lg:text-7xl">{farm.name}</h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-white/82">{farm.history}</p>
          <div className="mt-8 flex flex-wrap gap-3 text-sm">
            <span className="rounded-full border border-white/25 bg-white/10 px-4 py-2 backdrop-blur-sm">{farm.acres} acres</span>
            <span className="rounded-full border border-white/25 bg-white/10 px-4 py-2 backdrop-blur-sm">Established {farm.established}</span>
            <span className="rounded-full border border-white/25 bg-white/10 px-4 py-2 backdrop-blur-sm">{farm.elevation}</span>
          </div>
        </div>
      </section>

      <section className="px-5 py-16 sm:px-8 lg:px-10 lg:py-20">
        <div className="mx-auto max-w-7xl">
          <motion.div {...reveal} className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="relative min-h-[470px] overflow-hidden rounded-2xl border border-[#0b432f]/12 bg-[#ece7db]">
              <iframe src={mapUrl} title={`Live location of ${farm.name}`} className="absolute inset-0 h-full w-full" loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
              <span className="pointer-events-none absolute left-4 top-4 inline-flex items-center gap-2 rounded-md bg-white/95 px-4 py-2 text-xs font-semibold shadow"><MapPin className="h-4 w-4 text-[#c58412]" /> Live farm location</span>
            </div>

            <div className="rounded-2xl bg-[#f5efe2] p-7 sm:p-9">
              <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#a66b0b]">Location profile</p>
              <h2 style={serif} className="mt-4 text-4xl font-normal">Where the orchard grows</h2>
              <dl className="mt-7 divide-y divide-[#0b432f]/12 text-sm">
                {[
                  [MapPin, 'Region', farm.region],
                  [MapPin, 'Coordinates', farm.coordinates],
                  [LandPlot, 'Total land', `${farm.acres} Acres`],
                  [Mountain, 'Elevation', farm.elevation],
                  [CalendarDays, 'Established', farm.established],
                ].map(([Icon, label, value]) => (
                  <div key={label} className="grid grid-cols-[0.8fr_1.2fr] gap-4 py-4">
                    <dt className="flex items-center gap-2 font-semibold"><Icon className="h-4 w-4" /> {label}</dt>
                    <dd className="text-[#526158]">{value}</dd>
                  </div>
                ))}
              </dl>
              <a href={`https://www.openstreetmap.org/?mlat=${farm.lat}&mlon=${farm.lng}#map=12/${farm.lat}/${farm.lng}`} target="_blank" rel="noreferrer" className="mt-7 inline-flex items-center gap-3 text-sm font-semibold text-[#a66b0b]">View larger OpenStreetMap <ArrowRight className="h-4 w-4" /></a>
            </div>
          </motion.div>

          <div className="mt-12 grid gap-px overflow-hidden rounded-2xl border border-[#0b432f]/12 bg-[#0b432f]/12 md:grid-cols-3">
            {[
              [CloudSun, 'Climate', farm.climate],
              [CalendarDays, 'Seasonality & harvest', farm.seasonality],
              [Leaf, 'Mango varieties', farm.varieties.join(', ')],
            ].map(([Icon, title, body]) => (
              <motion.article key={title} {...reveal} className="bg-[#fffdf8] p-8">
                <Icon className="h-8 w-8 text-[#c98918]" strokeWidth={1.3} />
                <h2 style={serif} className="mt-6 text-2xl font-normal">{title}</h2>
                <p className="mt-4 text-sm leading-7 text-[#526158]">{body}</p>
              </motion.article>
            ))}
          </div>

          <motion.div {...reveal} className="mt-12 grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#a66b0b]">How we farm</p>
              <h2 style={serif} className="mt-4 text-4xl font-normal sm:text-5xl">Techniques shaped by the land.</h2>
              <p className="mt-5 text-sm leading-7 text-[#526158]">The farm team combines orchard knowledge with measured field practices to protect fruit quality, soil health, and long-term productivity.</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {farm.practices.map((practice, index) => (
                <div key={practice} className="flex min-h-28 items-center gap-5 rounded-xl border border-[#0b432f]/12 bg-[#fffdf8] p-5">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#063c2b] text-sm font-bold text-[#e4a426]">0{index + 1}</span>
                  <p className="font-semibold">{practice}</p>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.section {...reveal} className="mt-12 grid gap-8 rounded-2xl bg-[#063c2b] p-7 text-white sm:p-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#e4a426]">Plan your visit</p>
              <h2 style={serif} className="mt-4 text-4xl font-normal">Get live directions to {farm.name}.</h2>
              <p className="mt-4 text-sm leading-6 text-white/70">Enter your location, choose how you are travelling, then preview, copy, or share your route.</p>
            </div>
            <form onSubmit={showDirections} className="rounded-xl border border-white/15 bg-white/[0.06] p-5">
              <label htmlFor="detail-start-location" className="text-xs font-semibold">Starting location</label>
              <input id="detail-start-location" type="text" required value={startLocation} onChange={(event) => setStartLocation(event.target.value)} placeholder="Enter address, town, or landmark" autoComplete="street-address" className="mt-2 w-full rounded-md border border-white/25 bg-transparent px-4 py-3 text-sm text-white placeholder:text-white/45 focus:border-[#e4a426] focus:outline-none" />
              <div className="mt-3 grid grid-cols-3 overflow-hidden rounded-md border border-white/20">
                {[
                  ['driving', BusFront, 'Driving'],
                  ['bicycling', Bike, 'Cycling'],
                  ['walking', PersonStanding, 'Walking'],
                ].map(([mode, Icon, label]) => (
                  <button key={mode} type="button" onClick={() => setTravelMode(mode)} aria-label={label} aria-pressed={travelMode === mode} className={`flex h-11 items-center justify-center border-r border-white/15 last:border-r-0 ${travelMode === mode ? 'bg-[#e4a426]/15 text-[#e4a426]' : 'text-white/55 hover:bg-white/5'}`}><Icon className="h-5 w-5" /></button>
                ))}
              </div>
              <button type="submit" className="mt-4 inline-flex w-full items-center justify-center gap-4 rounded-md bg-[#e4a426] px-5 py-3 text-sm font-semibold text-[#063c2b] hover:bg-[#efb63b]">Preview directions <ArrowRight className="h-4 w-4" /></button>
            </form>
          </motion.section>

          <p className="mt-5 text-center text-xs text-[#6b776f]">Harvest windows are indicative and should be confirmed annually by the farm’s agronomy team.</p>
        </div>
      </section>

      <FarmDirectionsDialog farm={farm} startLocation={startLocation} travelMode={travelMode} open={directionsOpen} onOpenChange={setDirectionsOpen} />
    </div>
  );
}
