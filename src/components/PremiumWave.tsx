import '../premium-waves.css';
type WaveKind = 'home-onda-trenzinho-3d' | 'home-onda-suave-turquesa-3d' | 'home-onda-fita-elegante-3d' | 'expositores-vitrine' | 'expositores-conexoes';
/** Decorative original artwork, no cropping or independent toy animation. */
export default function PremiumWave({kind}:{kind:WaveKind}) {
  return <div className={`premium-wave premium-wave--${kind}`} aria-hidden="true"><img src={`/assets/divisorias-premium/${kind}.webp`} width="2172" height="724" alt="" loading="lazy" decoding="async"/></div>;
}
