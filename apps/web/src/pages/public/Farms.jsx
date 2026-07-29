import React, { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import {
  ArrowRight,
  Bike,
  BusFront,
  CalendarDays,
  Globe2,
  LandPlot,
  Leaf,
  Map,
  MapPin,
  Mountain,
  PersonStanding,
  Sprout,
  Trees,
  UsersRound,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { publicFarms as farms } from '@/data/publicFarms';
import FarmDirectionsDialog from '@/components/public/FarmDirectionsDialog';
import LiveFarmMap from '@/components/public/LiveFarmMap';

const heroPromises = [
  { icon: Sprout, first: 'Sustainable', second: 'Farming' },
  { icon: Trees, first: 'Quality', second: 'Harvests' },
  { icon: UsersRound, first: 'Community', second: 'Focused' },
  { icon: Globe2, first: 'Proudly', second: 'African' },
];

const gallery = [1, 2, 3, 4].map((number) => `/pages/farm-gallery-${number}.webp`);
const serif = { fontFamily: 'Georgia, Cambria, "Times New Roman", serif' };

export default function Farms() {
  const [selectedFarm, setSelectedFarm] = useState(farms[0]);
  const [startLocation, setStartLocation] = useState('');
  const [travelMode, setTravelMode] = useState('driving');
  const [directionsOpen, setDirectionsOpen] = useState(false);
  const reduceMotion = useReducedMotion();
  const reveal = reduceMotion
    ? {}
    : {
        initial: { opacity: 0, y: 22 },
        whileInView: { opacity: 1, y: 0 },
        viewport: { once: true, amount: 0.1 },
        transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] },
      };
  const openDirections = (event) => {
    event.preventDefault();
    if (!startLocation.trim()) return;
    setDirectionsOpen(true);
  };

  return (
    <div className="overflow-hidden bg-[#fbf8ef] text-[#0b432f]">
      <section className="relative" aria-labelledby="farms-heading">
        <div className="relative hidden lg:block">
          <img
            src="/pages/farm-hero-reference.webp"
            alt="JBA GreenGold mango orchard across fertile green hills in Ghana"
            className="h-auto w-full"
            decoding="async"
          />
          <h1 id="farms-heading" className="sr-only">Rooted in nature. Growing for generations.</h1>
          <a
            href="#farm-locations"
            aria-label="View farm map"
            className="absolute bottom-[11%] right-[18%] h-[8%] w-[14%] rounded-md focus-visible:outline focus-visible:outline-4 focus-visible:outline-[#e2a322]"
          />
        </div>

        <div className="relative min-h-[690px] lg:hidden">
          <img
            src="/pages/farm-hero-reference.webp"
            alt=""
            className="absolute inset-0 h-full w-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-[#062f22]/75" />
          <div className="relative px-5 py-16 text-white sm:px-8">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#e4a426]">Our farms</p>
            <h1 style={serif} className="mt-5 text-5xl font-normal leading-[1.05]">
              Rooted in nature.<br /><span className="text-[#e4a426]">Growing for generations.</span>
            </h1>
            <p className="mt-6 max-w-md text-base leading-7 text-white/85">
              Our farms are located in the fertile regions of Ghana, where the land, climate, and care come together to grow the finest mangoes.
            </p>
            <div className="mt-9 grid grid-cols-2 gap-6">
              {heroPromises.map((promise) => (
                <div key={promise.first}>
                  <span className="flex h-11 w-11 items-center justify-center rounded-full border border-[#e4a426] text-[#e4a426]">
                    <promise.icon className="h-5 w-5" strokeWidth={1.3} />
                  </span>
                  <p className="mt-3 text-[10px] font-bold uppercase leading-4">{promise.first}<br />{promise.second}</p>
                </div>
              ))}
            </div>
            <a href="#farm-locations" className="mt-10 inline-flex items-center gap-4 rounded-md bg-[#e4a426] px-6 py-3 text-sm font-semibold text-[#063c2b]">
              View Farm Map <Map className="h-5 w-5" />
            </a>
          </div>
        </div>
      </section>

      <section id="farm-locations" className="px-5 py-12 sm:px-8 lg:px-10 lg:py-14">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:gap-10">
            <motion.div {...reveal} className="relative min-h-[480px] overflow-hidden rounded-xl border border-[#0b432f]/10 bg-[#f4efe4]">
              <LiveFarmMap farms={farms} className="min-h-[480px]" />
            </motion.div>

            <motion.div {...reveal}>
              <h2 style={serif} className="text-3xl font-normal">Our Farm Locations</h2>
              <div className="mt-4 divide-y divide-[#0b432f]/12">
                {farms.map((farm) => {
                  const active = selectedFarm.id === farm.id;
                  return (
                    <Link
                      key={farm.id}
                      to={`/farms/${farm.slug}`}
                      onClick={() => setSelectedFarm(farm)}
                      className={`grid w-full grid-cols-[8.5rem_1fr] gap-4 rounded-lg p-2 text-left transition-colors sm:grid-cols-[9rem_1fr_auto] ${active ? 'border border-[#dc9821] bg-[#fffdf8]' : 'border border-transparent hover:bg-[#f5efe2]'}`}
                    >
                      <div className="relative overflow-hidden rounded-lg">
                        <img src={farm.image} alt={`${farm.name} orchard`} className="h-[68px] w-full object-cover" loading="lazy" />
                        <span className="absolute left-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-[#063c2b] text-xs font-bold text-[#e4a426]">{farm.id}</span>
                      </div>
                      <div className="min-w-0 py-1">
                        <h3 style={serif} className="truncate text-xl font-normal">{farm.name}</h3>
                        <p className="mt-1 flex items-center gap-2 text-xs text-[#42564d]"><MapPin className="h-3.5 w-3.5" /> {farm.region}</p>
                        <p className="mt-1 flex items-center gap-2 text-xs text-[#42564d]"><LandPlot className="h-3.5 w-3.5" /> {farm.coordinates}</p>
                      </div>
                      <div className="hidden min-w-[92px] py-2 text-right sm:block">
                        <p className="text-sm font-semibold">{farm.acres} Acres</p>
                        <p className="mt-5 flex items-center justify-end gap-2 text-xs font-medium text-[#b77708]">Read more about farm <ArrowRight className="h-4 w-4" /></p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </motion.div>
          </div>

          <motion.section {...reveal} className="mt-9 grid gap-7 rounded-2xl border border-[#0b432f]/10 bg-[#f8f2e7] p-5 shadow-[0_14px_40px_rgba(28,52,40,0.06)] lg:grid-cols-[1.05fr_0.68fr_0.92fr] lg:p-6">
            <div>
              <div className="relative overflow-hidden rounded-xl">
                <img
                  src={selectedFarm.detailImage || selectedFarm.image}
                  alt={`${selectedFarm.name} mango orchard landscape`}
                  className="aspect-[5/3] w-full object-cover"
                  loading="lazy"
                />
                <span className="absolute left-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-[#063c2b] font-bold text-[#e4a426]">{selectedFarm.id}</span>
              </div>
              <div className="mt-3 grid grid-cols-4 gap-2">
                {gallery.map((image, index) => (
                  <img key={image} src={image} alt={`${selectedFarm.name} orchard view ${index + 1}`} className="aspect-[1.1/1] w-full rounded-md object-cover" loading="lazy" />
                ))}
              </div>
            </div>

            <div className="py-1">
              <h2 style={serif} className="text-3xl font-normal">{selectedFarm.name}</h2>
              <p className="mt-1 text-sm">{selectedFarm.region}</p>
              <dl className="mt-5 divide-y divide-[#0b432f]/12 text-xs">
                {[
                  [MapPin, 'Coordinates', selectedFarm.coordinates],
                  [LandPlot, 'Total Land', `${selectedFarm.acres} Acres`],
                  [Leaf, 'Mango Varieties', selectedFarm.varieties.join(', ')],
                  [CalendarDays, 'Established', selectedFarm.established],
                  [Mountain, 'Elevation', selectedFarm.elevation],
                ].map(([Icon, label, value]) => (
                  <div key={label} className="grid grid-cols-[1fr_1.15fr] gap-3 py-3">
                    <dt className="flex items-center gap-2 font-semibold"><Icon className="h-4 w-4" /> {label}</dt>
                    <dd className="leading-5 text-[#43574d]">{value}</dd>
                  </div>
                ))}
              </dl>
              <Link to={`/farms/${selectedFarm.slug}`} className="mt-5 inline-flex items-center gap-3 text-sm font-semibold text-[#a66b0b] hover:underline">
                Read full farm profile <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <form onSubmit={openDirections} className="rounded-xl bg-[#063c2b] p-6 text-white">
              <h3 style={serif} className="text-2xl font-normal text-[#e4a426]">Directions</h3>
              <div className="mt-5 space-y-2 text-xs">
                <div className="grid grid-cols-[3.5rem_1fr] rounded-md border border-white/25">
                  <label htmlFor="farm-start-location" className="border-r border-white/20 px-3 py-3 font-semibold">From</label>
                  <input
                    id="farm-start-location"
                    type="text"
                    value={startLocation}
                    onChange={(event) => setStartLocation(event.target.value)}
                    required
                    autoComplete="street-address"
                    placeholder="Enter starting location"
                    className="min-w-0 bg-transparent px-3 py-3 text-white placeholder:text-white/45 focus:outline-none"
                  />
                </div>
                <div className="grid grid-cols-[3.5rem_1fr] rounded-md border border-white/25">
                  <span className="border-r border-white/20 px-3 py-3 font-semibold">To</span>
                  <span className="px-3 py-3">{selectedFarm.name}</span>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-3 overflow-hidden rounded-md border border-white/25 text-white/60" role="group" aria-label="Travel mode">
                {[
                  ['driving', BusFront, 'Driving'],
                  ['bicycling', Bike, 'Cycling'],
                  ['walking', PersonStanding, 'Walking'],
                ].map(([mode, Icon, label]) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setTravelMode(mode)}
                    aria-label={label}
                    aria-pressed={travelMode === mode}
                    className={`flex h-10 items-center justify-center border-r border-white/20 last:border-r-0 ${travelMode === mode ? 'bg-[#e4a426]/15 text-[#e4a426]' : 'hover:bg-white/5'}`}
                  >
                    <Icon className="h-5 w-5" />
                  </button>
                ))}
              </div>
              <button
                type="submit"
                className="mt-4 flex w-full items-center justify-center gap-5 rounded-md bg-[#e4a426] px-5 py-3 text-sm font-semibold text-[#063c2b] hover:bg-[#efb63b]"
              >
                Get Directions <ArrowRight className="h-4 w-4" />
              </button>
              <div className="mt-4 flex items-center justify-between text-[10px] text-white/70">
                <span>Estimated Time: {selectedFarm.time}</span>
                <span className="h-4 w-px bg-white/20" />
                <span>Distance: {selectedFarm.distance}</span>
              </div>
            </form>
          </motion.section>

          <motion.div {...reveal} className="relative mt-7 overflow-hidden rounded-xl bg-[#063c2b] px-7 py-7 text-white sm:px-10">
            <div className="relative z-10 grid gap-7 sm:grid-cols-[0.55fr_0.8fr_1fr] sm:items-center">
              <img src="/pages/farm-cta-mango.webp" alt="Fresh mango and diced mango half" className="mx-auto w-full max-w-[220px] mix-blend-screen" loading="lazy" />
              <h2 style={serif} className="text-3xl font-normal leading-tight sm:text-4xl">
                From our farms<br /><span className="text-[#e4a426]">to your table.</span>
              </h2>
              <div>
                <p className="max-w-md text-sm leading-6 text-white/80">We are committed to quality, sustainability, and sharing the goodness of Ghana with the world.</p>
                <Link to="/products" className="mt-5 inline-flex items-center gap-5 rounded-md bg-[#e4a426] px-6 py-3 text-xs font-semibold text-[#063c2b] hover:bg-[#efb63b]">
                  Explore Our Products <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <FarmDirectionsDialog
        farm={selectedFarm}
        startLocation={startLocation}
        travelMode={travelMode}
        open={directionsOpen}
        onOpenChange={setDirectionsOpen}
      />
    </div>
  );
}
