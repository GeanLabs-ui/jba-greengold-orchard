import React, { useEffect, useRef, useState } from 'react';

/** Hero videos load immediately; other videos fetch only near the viewport. */
export default function OptimizedVideo({ desktop, mobile, poster, priority = false, className, ...props }) {
  const ref = useRef(null);
  const [ready, setReady] = useState(priority);
  useEffect(() => {
    if (ready) ref.current.load();
  }, [ready, desktop, mobile]);
  useEffect(() => {
    const video = ref.current;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) setReady(true);
      else video.pause();
      if (entry.isIntersecting && video.currentSrc && !document.hidden) video.play().catch(() => {});
    }, { rootMargin: '200px' });
    observer.observe(video);
    const visibility = () => {
      if (document.hidden) video.pause();
      else {
        const bounds = video.getBoundingClientRect();
        if (bounds.bottom > 0 && bounds.top < window.innerHeight && video.currentSrc) video.play().catch(() => {});
      }
    };
    document.addEventListener('visibilitychange', visibility);
    return () => { observer.disconnect(); document.removeEventListener('visibilitychange', visibility); };
  }, []);
  return <video ref={ref} poster={poster} autoPlay muted loop playsInline preload={priority ? 'auto' : 'none'} className={className} {...props}>
    {ready && <>
      {mobile && <source src={mobile} media="(max-width: 767px)" type="video/mp4" />}
      <source src={desktop} type="video/mp4" />
    </>}
  </video>;
}
