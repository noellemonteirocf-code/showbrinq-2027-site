import type { ImgHTMLAttributes } from 'react';

const vectors = {
  star: ['01-estrela-cheia.svg', '/manus-storage/01-estrela-cheia_689c08cc.svg'],
  starOutline: ['02-estrela-contorno.svg', '/manus-storage/02-estrela-contorno_3f059560.svg'],
  sparkle: ['04-cintilante.svg', '/manus-storage/04-cintilante_cb6fbdc9.svg'],
  cloud: ['06-nuvem-contorno.svg', '/manus-storage/06-nuvem-contorno_ef9e8b96.svg'],
  cloudFill: ['07-nuvem-cheia.svg', '/manus-storage/07-nuvem-cheia_8328bd5b.svg'],
  waves: ['12-ondas.svg', '/manus-storage/12-ondas_ac89f7ac.svg'],
  plane: ['14-aviao-papel.svg', '/manus-storage/14-aviao-papel_b6032f7b.svg'],
  blobPink: ['17-blob-rosa.svg', '/manus-storage/17-blob-rosa_5915302e.svg'],
  blobBlue: ['18-blob-azul.svg', '/manus-storage/18-blob-azul_75760e2a.svg'],
  blocks: ['22-blocos-abc.svg', '/manus-storage/22-blocos-abc_51360bbe.svg'],
  blobYellowSoft: ['blob-amarelo-suave.svg', '/manus-storage/blob-amarelo-suave_baf6a030.svg'],
  blobPinkSoft: ['blob-rosa-suave.svg', '/manus-storage/blob-rosa-suave_396e1c95.svg'],
  waveCreamTop: ['onda-topo-creme.svg', '/manus-storage/onda-topo-creme_55afbc93.svg'],
  waveCreamBottom: ['onda-base-creme.svg', '/manus-storage/onda-base-creme_50d40c40.svg'],
  wavePinkTop: ['onda-topo-rosa.svg', '/manus-storage/onda-topo-rosa_1a53c6ed.svg'],
  wavePinkBottom: ['onda-base-rosa.svg', '/manus-storage/onda-base-rosa_222af504.svg'],
  waveBlueTop: ['onda-topo-azul.svg', '/manus-storage/onda-topo-azul_eb54439a.svg'],
  waveBlueBottom: ['onda-base-azul.svg', '/manus-storage/onda-base-azul_d7114915.svg'],
} as const;

export type VectorKind = keyof typeof vectors;
type Props = Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'alt'> & { kind: VectorKind };

export default function BrandVector({ kind, className = '', ...props }: Props) {
  const [file, src] = vectors[kind];
  return <img {...props} className={`sb-vector ${className}`} src={src} alt="" aria-hidden="true" draggable={false} loading="lazy" onError={event => {
    const fallback = `/assets/showbrinq-kit/${file}`;
    if (!event.currentTarget.src.endsWith(fallback)) event.currentTarget.src = fallback;
  }} />;
}

export function BrandDivider({ className = '' }: { className?: string }) {
  return <div className={`sb-divider ${className}`} aria-hidden="true"><BrandVector kind="waveCreamTop" /></div>;
}
