import { acervo2026 } from './acervo2026';
export type EventPhoto = { src: string; alt: string; caption?: string };
export type EventClip = { src: string; poster: string; title: string };
const earlierPhotos: EventPhoto[] = Array.from({ length: 9 }, (_, index) => {
  const number = String(index + 1).padStart(2, '0');
  return {
    src: `/assets/event-photo-${number}.webp`,
    alt: `Registro de edição anterior da SHOWBRINQ enviado pela organização (${number}).`,
  };
});
export const eventPhotos: EventPhoto[] = [...acervo2026, ...earlierPhotos];
export const eventClips: EventClip[] = [
  {src:'/assets/acervo-2026-videos/percurso-feira-2026.mp4',poster:'/assets/acervo-2026-videos/percurso-feira-2026.jpg',title:'Percurso pela Showbrinq · 2026'},
  {src:'/assets/acervo-2026-videos/ambiente-feira-2026.mp4',poster:'/assets/acervo-2026-videos/ambiente-feira-2026.jpg',title:'Ambiente e encontros · 2026'},
  { src: '/assets/event-product-demo-edited.mp4', poster: '/assets/event-product-demo-poster.webp', title: 'Demonstração de produto' },
  { src: '/assets/event-representative-testimonial-edited.mp4', poster: '/assets/event-representative-testimonial-poster.webp', title: 'Relato de expositor' },
];
export const eventHero = { photo: '/assets/event-photo-01.webp' };
