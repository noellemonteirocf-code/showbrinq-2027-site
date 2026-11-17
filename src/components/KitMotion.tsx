import { useEffect, useRef, useState } from 'react';
import { Pause, Play } from 'lucide-react';

export function useKitMotion() {
  const host = useRef<HTMLDivElement>(null);
  const [allowed, setAllowed] = useState(false);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    let visible = false;
    const sync = () => setAllowed(visible && !document.hidden && !media.matches && document.documentElement.dataset.motion === 'on');
    const viewport = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync(); });
    if (host.current) viewport.observe(host.current);
    const preference = new MutationObserver(sync);
    preference.observe(document.documentElement, { attributes: true, attributeFilter: ['data-motion'] });
    media.addEventListener('change', sync);
    document.addEventListener('visibilitychange', sync);
    sync();
    return () => { viewport.disconnect(); preference.disconnect(); media.removeEventListener('change', sync); document.removeEventListener('visibilitychange', sync); };
  }, []);
  return { host, playing: allowed && !paused, allowed, paused, setPaused };
}

export function KitMotionButton({ playing, allowed, onClick }: { playing: boolean; allowed: boolean; onClick: () => void }) {
  return <button type="button" className="kit-motion-button" disabled={!allowed} onClick={onClick} aria-label={!allowed ? 'Animação reduzida ou fora de vista' : playing ? 'Pausar esta animação' : 'Reproduzir esta animação'}>
    {playing ? <Pause size={17} aria-hidden="true" /> : <Play size={17} aria-hidden="true" />}
    {allowed ? playing ? 'Pausar animação' : 'Animar' : 'Imagem estática'}
  </button>;
}
