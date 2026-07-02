import React from 'react';

const galleryImages = [
  'https://images.unsplash.com/photo-1553279768-865429fa0078?w=600&q=80',
  'https://images.unsplash.com/photo-1605027990121-cbae9e0642df?w=600&q=80',
  'https://images.unsplash.com/photo-1546173159-315724a31696?w=600&q=80',
  'https://images.unsplash.com/photo-1518569656558-1f25169d6434?w=600&q=80',
  'https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=600&q=80',
  'https://images.unsplash.com/photo-1591073113125-e46713c829ed?w=600&q=80',
  'https://images.unsplash.com/photo-1574263867128-b3fe89b0c7e1?w=600&q=80',
  'https://images.unsplash.com/photo-1601493700631-2b16ec4b4716?w=600&q=80',
  'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600&q=80',
  'https://images.unsplash.com/photo-1466692476868-aef1dfb1e735?w=600&q=80',
  'https://images.unsplash.com/photo-1599639861706-74b2235f7c41?w=600&q=80',
  'https://images.unsplash.com/photo-1568909344668-6f14a07b56a0?w=600&q=80',
];

export default function Media() {
  return (
    <div>
      <section className="bg-gradient-to-br from-amber-600 to-orange-600 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h1 className="font-heading text-4xl font-bold tracking-tight text-white">Media & Gallery</h1>
          <p className="mt-2 text-amber-50">A visual journey through our farms, harvests, and operations.</p>
        </div>
      </section>

      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {galleryImages.map((src, i) => (
              <div key={i} className="group relative aspect-square overflow-hidden rounded-xl bg-muted shadow-sm">
                <img src={src} alt={`Gallery ${i + 1}`} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110" />
                <div className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/20" />
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}