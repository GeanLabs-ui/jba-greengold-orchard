import OptimizedVideo from '@/components/public/OptimizedVideo';
import React, { useEffect, useState } from 'react';
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
import FarmDetail from '@/pages/public/FarmDetail';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';

const heroPromises = [
  { icon: Sprout, first: 'Sustainable', second: 'Farming', color: '#c8e6c9' },
  { icon: Trees, first: 'Quality', second: 'Harvests', color: '#a5d6a7' },
  { icon: UsersRound, first: 'Community', second: 'Focused', color: '#c8e6c9' },
  { icon: Globe2, first: 'Proudly', second: 'African', color: '#c8e6c9' },
];

const gallery = [1, 2, 3, 4].map((number) => `/pages/farm-gallery-${number}.webp`);
const serif = { fontFamily: 'var(--font-heading)' };

export default function Farms() {
  const [lastSelectedFarm, setSelectedFarm] = useState(farms[0]);
  const [startLocation, setStartLocation] = useState('');
  const [travelMode, setTravelMode] = useState('driving');
  const [directionsOpen, setDirectionsOpen] = useState(false);
  const [profileFarm, setProfileFarm] = useState(null);
  const [activeMapFarmIndex, setActiveMapFarmIndex] = useState(null);
  const [mapHovered, setMapHovered] = useState(false);
  const [mapFocused, setMapFocused] = useState(false);
  const [detailsHovered, setDetailsHovered] = useState(false);
  const [detailsFocused, setDetailsFocused] = useState(false);
  const activeMapFarm = activeMapFarmIndex === null ? null : farms[activeMapFarmIndex];
  const selectedFarm = activeMapFarm || lastSelectedFarm;
  const reduceMotion = useReducedMotion();
  useEffect(() => {
    if (activeMapFarm) setSelectedFarm(activeMapFarm);
  }, [activeMapFarm]);
  useEffect(() => {
    if (mapHovered || mapFocused || detailsHovered || detailsFocused || directionsOpen || profileFarm || reduceMotion || farms.length < 2) return undefined;
    const tour = window.setTimeout(() => {
      setActiveMapFarmIndex((index) => index === null ? 0 : index === farms.length - 1 ? null : index + 1);
    }, activeMapFarmIndex === null ? 3500 : 5000);
    return () => window.clearTimeout(tour);
  }, [activeMapFarmIndex, mapHovered, mapFocused, detailsHovered, detailsFocused, directionsOpen, profileFarm, reduceMotion]);
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
    <div className="overflow-hidden bg-[#f9fcfa] text-[#123524]">
      <section data-layout-section="hero" className="farms-hero-section relative" aria-labelledby="farms-heading">
        <div className="jba-public-hero farms-hero relative flex items-center bg-[#123524]">
          <img
            src="/pages/farm-video-poster.webp"
            alt=""
            fetchPriority="high"
            className="absolute inset-0 h-full w-full object-cover object-center"
          />
          {!reduceMotion && (
            <OptimizedVideo
              desktop="/videos/optimized/farms-3950bfae05ce-desktop.mp4"
              mobile="/videos/optimized/farms-3950bfae05ce-mobile.mp4"
              priority
              poster="/pages/farm-video-poster.webp"
              autoPlay
              muted
              loop
              playsInline
              aria-hidden="true"
              className="absolute inset-0 h-full w-full object-cover object-center"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-r from-[#123524]/90 via-[#123524]/55 to-[#123524]/10" />
          <div className="farms-hero-content relative mx-auto w-full max-w-7xl px-5 py-8 text-white sm:px-8 lg:px-10">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#c8e6c9]">Our farms</p>
            <h1 id="farms-heading" style={serif} className="mt-5 text-page-title">
              <span className="text-[#2e7d32]">Rooted in nature.</span><br /><span className="text-[#c8e6c9]">Growing for generations.</span>
            </h1>
            <p className="mt-6 max-w-md text-base leading-7 text-white/85">
              Our farms are located in the fertile regions of Ghana, where the land, climate, and care come together to grow the finest mangoes.
            </p>
            <div className="farms-hero-promises mt-9 grid max-w-xl grid-cols-2 gap-6 sm:grid-cols-4">
              {heroPromises.map((promise) => (
                <div key={promise.first} style={{ color: promise.color }}>
                  <span className="flex h-11 w-11 items-center justify-center rounded-full border border-current">
                    <promise.icon className="h-5 w-5" strokeWidth={1.3} />
                  </span>
                  <p className="mt-3 text-caption font-bold uppercase leading-4">{promise.first}<br />{promise.second}</p>
                </div>
              ))}
            </div>
            <a href="#farm-locations" className="platform-action mt-10 inline-flex items-center gap-4 rounded-md bg-[#a5d6a7] px-6 py-3 text-sm font-semibold text-[#123524] transition-colors hover:bg-[#c8e6c9] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#c8e6c9]">
              View Farm Map <Map className="h-5 w-5" />
            </a>
          </div>
        </div>
      </section>

      <section data-layout-section="content" id="farm-locations" className="px-5 py-12 sm:px-8 lg:px-10 lg:py-14">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:gap-10">
            <motion.div
              {...reveal}
              className="relative min-h-[480px] overflow-hidden rounded-xl border border-[#123524]/10 bg-[#f4fbf5]"
              onMouseEnter={() => setMapHovered(true)}
              onMouseLeave={() => setMapHovered(false)}
              onFocus={() => setMapFocused(true)}
              onBlur={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget)) setMapFocused(false);
              }}
            >
              <LiveFarmMap
                farms={farms}
                activeFarm={activeMapFarm}
                onReadMore={setProfileFarm}
                onFarmSelect={(farm) => setActiveMapFarmIndex(farms.findIndex((item) => item.id === farm.id))}
                className="min-h-[480px]"
              />
            </motion.div>

            <motion.div {...reveal}>
              <h2 style={serif} className="text-section-title">Our Farm Locations</h2>
              <div className="mt-4 divide-y divide-[#123524]/12">
                {farms.map((farm) => {
                  const active = selectedFarm.id === farm.id;
                  return (
                    <Link
                      key={farm.id}
                      to={`/farms/${farm.slug}`}
                      onClick={(event) => { event.preventDefault(); setProfileFarm(farm); }}
                      className={`grid w-full grid-cols-[8.5rem_1fr] gap-4 rounded-lg p-2 text-left transition-colors sm:grid-cols-[9rem_1fr_auto] ${active ? 'border border-[#2e7d32] bg-[#f9fcfa]' : 'border border-transparent hover:bg-[#f4fbf5]'}`}
                    >
                      <div className="relative overflow-hidden rounded-lg">
                        <img src={farm.image} alt={`${farm.name} orchard`} className="h-[68px] w-full object-cover" loading="lazy" />
                      </div>
                      <div className="min-w-0 py-1">
                        <h3 style={serif} className="truncate text-card-title">{farm.name}</h3>
                        <p className="mt-1 flex items-center gap-2 text-xs text-[#355e3b]"><MapPin className="h-3.5 w-3.5" /> {farm.region}</p>
                        <p className="mt-1 flex items-center gap-2 text-xs text-[#355e3b]"><LandPlot className="h-3.5 w-3.5" /> {farm.coordinates}</p>
                      </div>
                      <div className="hidden min-w-[92px] py-2 text-right sm:block">
                        <p className="text-sm font-semibold">{farm.acres} Acres</p>
                        <p className="mt-5 flex items-center justify-end gap-2 text-xs font-medium text-[#2e7d32]">Read more about farm <ArrowRight className="h-4 w-4" /></p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </motion.div>
          </div>

          <motion.section
            {...reveal}
            className="mt-9 grid gap-7 rounded-2xl border border-[#123524]/10 bg-[#f4fbf5] p-5 shadow-[0_14px_40px_rgba(28,52,40,0.06)] lg:grid-cols-[1.05fr_0.68fr_0.92fr] lg:p-6"
            onMouseEnter={() => setDetailsHovered(true)}
            onMouseLeave={() => setDetailsHovered(false)}
            onFocus={() => setDetailsFocused(true)}
            onBlur={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget)) setDetailsFocused(false);
            }}
          >
            <div>
              <div className="relative overflow-hidden rounded-xl">
                <img
                  src={selectedFarm.detailImage || selectedFarm.image}
                  alt={`${selectedFarm.name} mango orchard landscape`}
                  className="aspect-[5/3] w-full object-cover"
                  loading="lazy"
                />
              </div>
              <div className="mt-3 grid grid-cols-4 gap-2">
                {gallery.map((image, index) => (
                  <img key={image} src={image} alt={`${selectedFarm.name} orchard view ${index + 1}`} className="aspect-[1.1/1] w-full rounded-md object-cover" loading="lazy" />
                ))}
              </div>
            </div>

            <div className="py-1">
              <h2 style={serif} className="text-section-title">{selectedFarm.name}</h2>
              <p className="mt-1 text-sm">{selectedFarm.region}</p>
              <dl className="mt-5 divide-y divide-[#123524]/12 text-xs">
                {[
                  [MapPin, 'Coordinates', selectedFarm.coordinates],
                  [LandPlot, 'Total Land', `${selectedFarm.acres} Acres`],
                  [Leaf, 'Mango Varieties', selectedFarm.varieties.join(', ')],
                  [CalendarDays, 'Established', selectedFarm.established],
                  [Mountain, 'Elevation', selectedFarm.elevation],
                ].map(([Icon, label, value]) => (
                  <div key={label} className="grid grid-cols-[1fr_1.15fr] gap-3 py-3">
                    <dt className="flex items-center gap-2 font-semibold"><Icon className="h-4 w-4" /> {label}</dt>
                    <dd className="leading-5 text-[#355e3b]">{value}</dd>
                  </div>
                ))}
              </dl>
              <Link to={`/farms/${encodeURIComponent(selectedFarm.slug)}`} onClick={(event) => { event.preventDefault(); setProfileFarm(selectedFarm); }} className="mt-5 inline-flex items-center gap-3 text-sm font-semibold text-[#2e7d32] hover:underline">
                Read full farm profile <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <form onSubmit={openDirections} className="rounded-xl bg-[#123524] p-6 text-white">
              <h3 style={serif} className="text-[#c8e6c9] text-card-title">Directions</h3>
              <div className="mt-5 space-y-2 text-xs">
                <div className="grid grid-cols-[3.5rem_1fr] rounded-md border border-white/25">
                  <label htmlFor="farm-start-location" className="border-r border-white/20 px-3 py-3 text-label">From</label>
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
                    className={`flex h-10 items-center justify-center border-r border-white/20 last:border-r-0 ${travelMode === mode ? 'bg-[#c8e6c9]/15 text-[#c8e6c9]' : 'hover:bg-white/5'}`}
                  >
                    <Icon className="h-5 w-5" />
                  </button>
                ))}
              </div>
              <button
                type="submit"
                className="mt-4 flex w-full items-center justify-center gap-5 rounded-md bg-[#c8e6c9] px-5 py-3 text-sm font-semibold text-[#123524] hover:bg-[#c8e6c9]"
              >
                Get Directions <ArrowRight className="h-4 w-4" />
              </button>
              <div className="mt-4 flex items-center justify-between text-caption text-white/70">
                <span>Estimated Time: {selectedFarm.time}</span>
                <span className="h-4 w-px bg-white/20" />
                <span>Distance: {selectedFarm.distance}</span>
              </div>
            </form>
          </motion.section>

          <motion.div {...reveal} className="relative mt-7 overflow-hidden rounded-xl bg-[#123524] px-7 py-7 text-white sm:px-10">
            <div className="relative z-10 grid gap-7 sm:grid-cols-[0.55fr_0.8fr_1fr] sm:items-center">
              <img src="/pages/farm-cta-mango.webp" alt="Fresh mango and diced mango half" className="mx-auto w-full max-w-[220px] mix-blend-screen" loading="lazy" />
              <h2 style={serif} className="text-section-title">
                From our farms<br /><span className="text-[#c8e6c9]">to your table.</span>
              </h2>
              <div>
                <p className="max-w-md text-sm leading-6 text-white/80">We are committed to quality, sustainability, and sharing the goodness of Ghana with the world.</p>
                <Link to="/products" className="platform-action mt-5 inline-flex items-center gap-5 rounded-md bg-[#c8e6c9] px-6 py-3 text-xs font-semibold text-[#123524] hover:bg-[#c8e6c9]">
                  Explore Our Products <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <Dialog open={Boolean(profileFarm)} onOpenChange={(open) => { if (!open) setProfileFarm(null); }}>
        <DialogContent aria-describedby={undefined} className="flex max-h-[92dvh] w-[calc(100%-2rem)] max-w-6xl flex-col gap-0 overflow-hidden bg-[#f9fcfa] p-0 text-[#123524]">
          <div className="shrink-0 border-b border-[#123524]/15 px-6 py-5 pr-14">
            <DialogTitle>{profileFarm?.name} - Farm profile</DialogTitle>
          </div>
          <div className="min-h-0 overflow-y-auto">
            {profileFarm && <FarmDetail key={profileFarm.id} profileFarm={profileFarm} embedded />}
          </div>
        </DialogContent>
      </Dialog>
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
