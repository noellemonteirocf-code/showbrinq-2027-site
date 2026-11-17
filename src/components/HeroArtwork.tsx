import { useEffect, useRef, useState, type PointerEvent, type ReactNode } from 'react';
import '../hero-artwork.css';

const artwork = {
  face: '/manus-storage/carinha_7a68dc81.png',
  heart: '/manus-storage/coracao_c9bdd5e8.png',
  plane: '/manus-storage/aviao_7f2d39c1.png',
};

/** A visual-only layer around the existing photograph and editorial card. */
export default function HeroArtwork({ children }: { children: ReactNode }) {
  const host = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [motion, setMotion] = useState(false);
  const [visible, setVisible] = useState(true);
  const [burst, setBurst] = useState(0);

  const resetDepth = () => {
    host.current?.style.setProperty('--art-x', '0px');
    host.current?.style.setProperty('--art-y', '0px');
  };

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => {
      const enabled = document.documentElement.dataset.motion === 'on' && !media.matches;
      setMotion(enabled);
      if (!enabled) {
        resetDepth();
        setBurst(0);
        clearTimeout(timer.current);
      }
    };
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-motion'] });
    media.addEventListener('change', sync);
    const viewport = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting));
    if (host.current) viewport.observe(host.current);
    return () => {
      observer.disconnect();
      viewport.disconnect();
      media.removeEventListener('change', sync);
      clearTimeout(timer.current);
    };
  }, []);

  const moveDepth = (event: PointerEvent<HTMLDivElement>) => {
    if (!motion || !visible || event.pointerType !== 'mouse' || !host.current) return;
    const bounds = host.current.getBoundingClientRect();
    host.current.style.setProperty('--art-x', `${((event.clientX - bounds.left) / bounds.width - 0.5) * 12}px`);
    host.current.style.setProperty('--art-y', `${((event.clientY - bounds.top) / bounds.height - 0.5) * 10}px`);
  };

  const celebrate = () => {
    if (!motion) return;
    clearTimeout(timer.current);
    setBurst(value => value + 1);
    timer.current = setTimeout(() => setBurst(0), 950);
  };

  return (
    <div
      ref={host}
      className="new-hero-media showbrinq-artwork"
      data-art-motion={motion && visible ? 'on' : 'off'}
      onPointerMove={moveDepth}
      onPointerLeave={resetDepth}
    >
      {children}
      <div className="art-depth art-plane" aria-hidden="true">
        <img src={artwork.plane} alt="" width="700" height="691" decoding="async" draggable={false} />
      </div>
      <div className="art-depth art-heart" aria-hidden="true">
        <img src={artwork.heart} alt="" width="700" height="693" decoding="async" draggable={false} />
      </div>
      <div className="art-depth art-face">
        <button type="button" className="art-face-button" aria-label={motion ? 'Animar emoji decorativo' : 'Emoji decorativo'} disabled={!motion} onClick={celebrate}>
          <img key={burst} className={burst ? 'art-pop' : ''} src={artwork.face} alt="" width="694" height="700" decoding="async" draggable={false} />
        </button>
        {burst > 0 && (
          <div key={burst} className="art-burst" aria-hidden="true">
            {Array.from({ length: 10 }, (_, index) => (
              <i key={index} style={{
                '--burst-x': `${Math.cos(index * 0.628) * 70}px`,
                '--burst-y': `${-45 - Math.sin(index * 0.314) * 70}px`,
                '--burst-turn': `${index * 43}deg`,
                '--burst-color': ['#ffdc4a', '#fc307c', '#54e1df', '#fff'][index % 4],
              } as React.CSSProperties} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
