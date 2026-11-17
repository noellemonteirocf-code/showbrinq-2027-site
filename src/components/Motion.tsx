import { useEffect } from 'react';
import { useLocation } from 'wouter';

export function motionPreference(): boolean {
  try {
    const saved = localStorage.getItem('showbrinq-motion');
    if (saved !== null) return saved === 'on';
  } catch { /* Armazenamento é opcional. */ }
  return !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export default function Motion({ enabled }: { enabled: boolean }) {
  const [location] = useLocation();
  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    document.documentElement.dataset.motion = enabled && !reduce ? 'on' : 'off';
    const timers = new Set<ReturnType<typeof setTimeout>>();
    const elements = Array.from(document.querySelectorAll<HTMLElement>(
      'main section .section-top,main .reveal-item,main .edition-card,main .tool-card,main .benefit-card,main .editorial-card,main .hb-card,main .hospitality-hotel-card,main .hospitality-preview-guide,main .sb-supplier .sb-expo-benefit-card,main .sb-supplier .sb-expo-format-card,main .sb-buyer .steps-grid>div'
    ));
    let observer: IntersectionObserver | undefined;
    if (enabled && !reduce && 'IntersectionObserver' in window) {
      observer = new IntersectionObserver(entries => entries.forEach(entry => {
        const element = entry.target as HTMLElement;
        element.classList.toggle('in-view', entry.isIntersecting);
      }), { threshold: 0, rootMargin: '0px' });
      elements.forEach((element, index) => {
        element.classList.add('motion-ready');
        element.style.setProperty('--reveal-delay', `${(index % 3) * 65}ms`);
        observer?.observe(element);
      });
    }
    const shine = (event: MouseEvent) => {
      if (!enabled || reduce) return;
      const element = (event.target as Element)?.closest<HTMLElement>(
        '.btn,.filter-pill,.edition-switcher button,.faq-tabs button,.hospitality-button,.hb-filters button,.hb-more,.hb-cta,.clip-options button,.photo-viewer-controls button'
      );
      if (!element) return;
      element.classList.remove('clicked-shine');
      void element.offsetWidth;
      element.classList.add('clicked-shine');
      const timer = setTimeout(() => {
        element.classList.remove('clicked-shine');
        timers.delete(timer);
      }, 700);
      timers.add(timer);
    };
    document.addEventListener('click', shine);
    return () => {
      observer?.disconnect();
      elements.forEach(element => element.classList.remove('motion-ready', 'in-view'));
      document.removeEventListener('click', shine);
      timers.forEach(clearTimeout);
    };
  }, [location, enabled]);
  return null;
}
