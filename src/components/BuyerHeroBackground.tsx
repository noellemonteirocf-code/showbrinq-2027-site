import { useEffect, useRef } from 'react';

/** Decorative video plays once; respects both OS and site motion settings. */
export default function BuyerHeroBackground() {
  const video = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => {
      const element = video.current;
      if (!element) return;
      if (preference.matches || document.documentElement.dataset.motion !== 'on') {
        element.pause();
        return;
      }
      if (!element.hasAttribute('src')) element.src = '/assets/lojistas-3d/fundo-rosa.mp4';
      if (!element.ended) void element.play().catch(() => {});
    };
    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-motion'] });
    preference.addEventListener('change', sync);
    sync();
    return () => { observer.disconnect(); preference.removeEventListener('change', sync); };
  }, []);
  return <video ref={video} className="buyer-hero-background" muted playsInline preload="none" aria-hidden="true" tabIndex={-1} />;
}
