import React, { useMemo, useState } from 'react';
import { Check, Copy, MapPin, Navigation, Share2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const travelLabels = {
  driving: 'Driving',
  bicycling: 'Cycling',
  walking: 'Walking',
};

export function createFarmDirectionsUrl(farm, startLocation, travelMode) {
  const url = new URL('https://www.google.com/maps/dir/');
  url.searchParams.set('api', '1');
  url.searchParams.set('origin', startLocation.trim());
  url.searchParams.set('destination', `${farm.lat},${farm.lng}`);
  url.searchParams.set('travelmode', travelMode);
  return url.toString();
}

export default function FarmDirectionsDialog({ farm, startLocation, travelMode, open, onOpenChange }) {
  const [feedback, setFeedback] = useState('');
  const [showLiveRoute, setShowLiveRoute] = useState(false);
  const directionsUrl = useMemo(
    () => createFarmDirectionsUrl(farm, startLocation, travelMode),
    [farm, startLocation, travelMode],
  );
  const mapBounds = `${farm.lng - 0.18},${farm.lat - 0.14},${farm.lng + 0.18},${farm.lat + 0.14}`;
  const mapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(mapBounds)}&layer=mapnik&marker=${farm.lat}%2C${farm.lng}`;
  const directionFlags = { driving: 'd', bicycling: 'b', walking: 'w' };
  const embeddedDirectionsUrl = `https://maps.google.com/maps?saddr=${encodeURIComponent(startLocation)}&daddr=${farm.lat},${farm.lng}&dirflg=${directionFlags[travelMode]}&output=embed`;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(directionsUrl);
      setFeedback('Directions link copied');
    } catch {
      setFeedback('Copy failed. Use Start live navigation instead.');
    }
  };

  const shareLink = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Directions to ${farm.name}`,
          text: `Live directions from ${startLocation} to ${farm.name}`,
          url: directionsUrl,
        });
        setFeedback('Directions shared');
        return;
      } catch (error) {
        if (error?.name === 'AbortError') return;
      }
    }
    await copyLink();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) setShowLiveRoute(false);
        onOpenChange(nextOpen);
      }}
    >
      <DialogContent className="max-h-[92vh] max-w-3xl gap-0 overflow-y-auto border-0 bg-[#f9fcfa] p-0">
        <DialogHeader className="relative min-h-52 justify-end overflow-hidden px-6 py-6 pr-14 text-left text-white sm:px-8">
          <img src={farm.detailImage || farm.image} alt={`${farm.name} orchard`} className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#123524]/95 via-[#123524]/55 to-black/15" />
          <div className="relative">
            <p className="text-caption font-bold uppercase tracking-[0.25em] text-[#c8e6c9]">Live directions</p>
            <DialogTitle className="mt-2 text-3xl font-normal text-white" style={{ fontFamily: 'var(--font-heading)' }}>
              {farm.name}
            </DialogTitle>
            <DialogDescription className="text-white/70">Review, copy, or share this route without leaving the page.</DialogDescription>
          </div>
        </DialogHeader>

        <div className="p-5 sm:p-8">
          <div className="grid gap-4 rounded-xl border border-[#123524]/12 bg-white/65 p-4 text-sm sm:grid-cols-2">
            <div>
              <p className="text-caption font-bold uppercase tracking-[0.16em] text-[#2e7d32]">From</p>
              <p className="mt-1 font-medium text-[#123524]">{startLocation}</p>
            </div>
            <div>
              <p className="text-caption font-bold uppercase tracking-[0.16em] text-[#2e7d32]">To</p>
              <p className="mt-1 font-medium text-[#123524]">{farm.name}, {farm.region}</p>
            </div>
            <div>
              <p className="text-caption font-bold uppercase tracking-[0.16em] text-[#2e7d32]">Travel mode</p>
              <p className="mt-1">{travelLabels[travelMode]}</p>
            </div>
            <div>
              <p className="text-caption font-bold uppercase tracking-[0.16em] text-[#2e7d32]">Farm coordinates</p>
              <p className="mt-1">{farm.coordinates}</p>
            </div>
          </div>

          <div className="relative mt-5 h-72 overflow-hidden rounded-xl border border-[#123524]/12 bg-[#e8f5e9]">
            <iframe
              src={showLiveRoute ? embeddedDirectionsUrl : mapUrl}
              title={showLiveRoute ? `Live route to ${farm.name}` : `Live map for directions to ${farm.name}`}
              className="absolute inset-0 h-full w-full"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
            <span className="pointer-events-none absolute left-3 top-3 inline-flex items-center gap-2 rounded-md bg-white/95 px-3 py-2 text-xs font-semibold text-[#123524] shadow">
              <MapPin className="h-4 w-4 text-[#2e7d32]" /> {showLiveRoute ? 'Live route preview' : 'Exact farm destination'}
            </span>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <button type="button" onClick={copyLink} className="platform-action inline-flex items-center justify-center gap-2 rounded-md border border-[#123524]/20 px-4 py-3 text-sm font-semibold text-[#123524] hover:bg-[#123524]/5">
              {feedback === 'Directions link copied' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} Copy link
            </button>
            <button type="button" onClick={shareLink} className="platform-action inline-flex items-center justify-center gap-2 rounded-md border border-[#123524]/20 px-4 py-3 text-sm font-semibold text-[#123524] hover:bg-[#123524]/5">
              <Share2 className="h-4 w-4" /> Share directions
            </button>
            <button type="button" onClick={() => setShowLiveRoute(true)} className="platform-action inline-flex items-center justify-center gap-2 rounded-md bg-[#c8e6c9] px-4 py-3 text-sm font-semibold text-[#123524] hover:bg-[#c8e6c9]">
              <Navigation className="h-4 w-4" /> {showLiveRoute ? 'Live route loaded' : 'Start live navigation'}
            </button>
          </div>
          {feedback && <p className="mt-3 text-center text-xs font-medium text-[#355e3b]" role="status">{feedback}</p>}

          <div className="mt-5 flex items-center justify-center gap-5 border-t border-[#123524]/10 pt-4 text-xs text-[#355e3b]">
            <span>Estimated: {farm.time}</span>
            <span className="h-4 w-px bg-[#123524]/15" />
            <span>Distance: {farm.distance}</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
