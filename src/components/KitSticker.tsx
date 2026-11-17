import { useEffect, useRef, useState } from 'react';

const stickers = {
  blocks: '/manus-storage/blocos_72b15fa7.png',
  triangle: '/manus-storage/triangulo_7797f5c3.png',
  star: '/manus-storage/estrela_deea0e30.png',
  squiggle: '/manus-storage/squiggle_16df4160.png',
  heart: '/manus-storage/coracao_c9bdd5e8.png',
  confetti: '/manus-storage/confete_fc89ed49.png',
} as const;

export default function KitSticker({ kind, className = '' }: {
  kind: keyof typeof stickers;
  className?: string;
}) {
  const host = useRef<HTMLSpanElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting));
    if (host.current) observer.observe(host.current);
    return () => observer.disconnect();
  }, []);
  return (
    <span ref={host} className={`kit-sticker kit-sticker--${kind} ${className}`} aria-hidden="true" data-visible={visible}>
      <img src={stickers[kind]} alt="" loading="lazy" decoding="async" draggable={false} />
    </span>
  );
}
