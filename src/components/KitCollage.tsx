import { type ReactNode } from 'react';
import '../kit-live.css';

const base = '/assets/brand-2027/';
const decorations = ['aviao', 'triangulo', 'squiggle', 'estrela', 'blocos', 'confete', 'coracao', 'carinha'];
export default function KitCollage({ children }: { children?: ReactNode }) {
  return <div className="new-hero-media kit-collage brand-collage">
    <figure className="kit-collage-figure">
      <div className="brand-collage-scene" role="img" aria-label="Colagem fornecida pela SHOWBRINQ: fotos históricas da feira com avião, confete, blocos, estrela, emoji e coração tridimensionais">
        <img className="brand-blob" src={base + 'svg/blob-rosa-suave.svg'} alt="" />
        <img className="brand-photo-main" src={base + 'img/stand-3.jpg'} alt="" fetchPriority="high" />
        <img className="brand-photo-small" src={base + 'img/stand-2.jpg'} alt="" />
        <img className="brand-seal" src={base + 'stickers/selo-showbrinq-2027.svg'} alt="" />
        {decorations.map(name => <img key={name} className={'brand-toy brand-toy-' + name} src={base + '3d/web/' + name + '.png'} alt="" />)}
      </div>
      <figcaption>Fotos de edições anteriores · composição visual do Circuito 2027</figcaption>
    </figure>
    {children}
  </div>;
}
