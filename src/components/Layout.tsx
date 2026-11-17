import { useEffect, useState, type ReactNode } from 'react';
import { Link, useLocation } from 'wouter';
import { ArrowUpRight, Menu, X, Instagram, ArrowRight, Sparkles, Pause } from 'lucide-react';
import { APP_NAME, ASSETS, INSTAGRAM_URL } from '../config';
import Motion, { motionPreference } from './Motion';

const primaryNav: Array<[string, string, string?]> = [
  ['/lojistas', 'Sou lojista', 'nav-audience-lojistas'],
  ['/expositores', 'Quero expor', 'nav-audience-expositores'],
  ['/circuito-2027', 'Cidades e datas'],
  ['/#a-feira', 'Conheça a Showbrinq'],
];

const moreNav: Array<[string, string]> = [
  ['/expositores-2026', 'Marcas que participaram em 2026'],
  ['/registros', 'Fotos e vídeos da feira'],
  ['/estandes', 'Modelos de estandes'],
  ['/credenciamento', 'Credenciamento'],
  ['/caderno-de-visita', 'Caderno de visita'],
  ['/hoteis-parceiros', 'Hotéis parceiros'],
  ['/blog', 'Blog e conteúdos'],
];

export default function Layout({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [animations, setAnimations] = useState(motionPreference);
  const [reduced, setReduced] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [progress, setProgress] = useState(0);
  const [heroActionsVisible, setHeroActionsVisible] = useState(false);
  const [location] = useLocation();
  const contactHref = ['/', '/lojistas', '/expositores', '/estandes'].includes(location) || location.startsWith('/edicoes/') ? '#contato' : '/#contato';
  const brandPreview = true;
  const isExhibitorPage = location === '/expositores' || location.startsWith('/expositores/');
  const isBuyerPage = location === '/lojistas';
  const headerAction = isBuyerPage ? { href: '/caderno-de-visita', label: 'Planejar minha visita' } : isExhibitorPage ? { href: '/expositores#contato', label: 'Consultar participação' } : { href: '/expositores', label: 'Quero expor' };

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const change = () => setReduced(media.matches);
    media.addEventListener('change', change);
    return () => media.removeEventListener('change', change);
  }, []);

  useEffect(() => {
    setHeroActionsVisible(false);
    const actions = document.querySelector('.new-hero-actions');
    if (!actions || !('IntersectionObserver' in window)) return;
    const observer = new IntersectionObserver(([entry]) => {
      setHeroActionsVisible(entry.isIntersecting);
    }, { rootMargin: '0px 0px -80px 0px', threshold: 0.1 });
    observer.observe(actions);
    return () => observer.disconnect();
  }, [location]);

  useEffect(() => {
    let raf = 0;
    const update = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const height = document.documentElement.scrollHeight - window.innerHeight;
        setProgress(height > 0 ? window.scrollY / height : 0);
      });
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [location]);

  useEffect(() => {
    const dismiss = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      const details = document.querySelector<HTMLDetailsElement>('.nav-more[open], .mobile-more[open]');
      if (details) { details.open = false; details.querySelector<HTMLElement>('summary')?.focus(); }
      else if (open) { setOpen(false); document.querySelector<HTMLElement>('.mobile-menu-toggle')?.focus(); }
    };
    const outside = (event: PointerEvent) => {
      document.querySelectorAll<HTMLDetailsElement>('.nav-more[open]').forEach(el => { if (!el.contains(event.target as Node)) el.open = false; });
    };
    const closeOnLink = (event: MouseEvent) => {
      if ((event.target as Element).closest('a')) document.querySelectorAll<HTMLDetailsElement>('.nav-more[open]').forEach(el => { el.open = false; });
    };
    document.addEventListener('keydown', dismiss);
    document.addEventListener('pointerdown', outside);
    document.addEventListener('click', closeOnLink);
    return () => { document.removeEventListener('keydown', dismiss); document.removeEventListener('pointerdown', outside); document.removeEventListener('click', closeOnLink); };
  }, [open]);

  const changeMotion = () => {
    const next = !animations;
    setAnimations(next);
    window.dispatchEvent(new CustomEvent('showbrinq-motion-change',{detail:next}));
    try { localStorage.setItem('showbrinq-motion', next ? 'on' : 'off'); } catch { /* armazenamento opcional */ }
  };

  return <>
    <Motion enabled={animations && !reduced} />
    <a className="skip-link" href="#conteudo">Pular para o conteúdo</a>
    <div className="announcement" data-brand-preview={brandPreview || undefined}>
      <span>O setor de brinquedos tem encontro marcado.</span>
      <a href="/circuito-2027">Conheça o circuito 2027 <ArrowRight size={16} /></a>
      <span className="prototype-label">PRÉVIA</span>
    </div>
    <header className="site-header" data-brand-preview={brandPreview || undefined}>
      <div className="container nav-inner">
        <Link className="logo-link" href="/" aria-label={`${APP_NAME} — página inicial`} onClick={() => setOpen(false)}>
          <img className="official-brand-logo" src={ASSETS.logo} alt={APP_NAME} />
        </Link>
        <nav className="desktop-nav" aria-label="Navegação principal">
          {primaryNav.map(([url, label, className]) => (
            <Link key={url} href={url} className={`${className ?? ''} ${location === url ? 'active' : ''}`.trim()}>{label}</Link>
          ))}
          <details className="nav-more">
            <summary>Explorar mais <ArrowRight size={14} aria-hidden="true" /></summary>
            <div className="nav-more-panel">
              {moreNav.map(([url, label]) => <Link key={url} href={url}>{label}</Link>)}
            </div>
          </details>
        </nav>
        <div className="header-actions">
          <button className="motion-toggle" onClick={changeMotion} aria-label={reduced ? 'Animações reduzidas pela preferência do sistema' : animations ? 'Reduzir animações' : 'Ativar animações'} title={reduced ? 'Movimento reduzido pelo sistema' : animations ? 'Reduzir animações' : 'Ativar animações'} aria-pressed={animations && !reduced} disabled={reduced}>
            {animations && !reduced ? <Pause size={18} /> : <Sparkles size={18} />}<span className="sr-only">Animações</span>
          </button>
          <Link className="btn btn-primary header-cta" href={headerAction.href}>{headerAction.label} <ArrowUpRight size={18} /></Link>
          <button className="icon-button mobile-menu-toggle" aria-label={open ? 'Fechar menu' : 'Abrir menu'} aria-expanded={open} aria-controls="mobile-menu" onClick={() => setOpen(!open)}>{open ? <X /> : <Menu />}</button>
        </div>
      </div>
      <div className="read-progress" aria-hidden="true" style={{ transform: `scaleX(${progress})` }} />
      {open && <nav className="mobile-nav" id="mobile-menu" aria-label="Menu principal em celular">
        {primaryNav.map(([url, label, className]) => <Link className={className ?? ''} href={url} key={url} onClick={() => setOpen(false)}>{label}<ArrowUpRight size={19} /></Link>)}
        <details className="mobile-more"><summary>Explorar mais <ArrowRight size={17} /></summary>
          <div>{moreNav.map(([url, label]) => <Link key={url} href={url} onClick={() => setOpen(false)}>{label}<ArrowUpRight size={16} /></Link>)}</div>
        </details>
        <a href={contactHref} onClick={() => setOpen(false)}>Contato<ArrowUpRight size={19} /></a>
      </nav>}
    </header>
    <main id="conteudo">{children}</main>
    <footer data-brand-preview={brandPreview || undefined} className="site-footer">
      <div className="container footer-main">
        <div className="footer-brand"><img className="official-brand-logo" src={ASSETS.logo} alt={APP_NAME} /><h3>O setor se encontra<br />na SHOWBRINQ.</h3><p>Showroom de brinquedos e presentes.<br />Realização: MN Eventos.</p></div>
        <div><h4>O circuito</h4><Link href="/circuito-2027">Cidades e datas de 2027</Link><Link href="/expositores-2026">Expositores de 2026</Link><Link href="/registros">Fotos e vídeos da feira</Link><Link href="/hoteis-parceiros">Hotéis parceiros</Link></div>
        <div><h4>Sua participação</h4><Link href="/lojistas">Para lojistas</Link><Link href="/expositores">Para expositores</Link><Link href="/caderno-de-visita">Caderno de visita</Link><Link href="/estandes">Modelos de estandes</Link><Link href="/credenciamento">Credenciamento</Link></div>
        <div><h4>Fique por perto</h4><a href={INSTAGRAM_URL} target="_blank" rel="noreferrer"><Instagram size={19} /> Instagram da SHOWBRINQ <ArrowUpRight size={16} /></a><Link href="/blog">Blog SHOWBRINQ</Link><a href={contactHref}>Fale com a equipe</a><button className="footer-motion" onClick={changeMotion} disabled={reduced}>{reduced ? 'Movimento reduzido pelo sistema' : animations ? 'Reduzir as animações do site' : 'Ativar as animações do site'}</button></div>
      </div>
      <div className="container footer-bottom"><span>© SHOWBRINQ · Prévia do circuito 2027</span><span>Condições operacionais por edição a confirmar.</span><span className="footer-legal"><Link href="/sobre">Sobre</Link> · <Link href="/contato">Contato</Link> · <Link href="/termos">Termos de uso</Link> · <Link href="/privacidade">Privacidade</Link></span></div>
    </footer>
    <div className={`mobile-bottom-nav${heroActionsVisible ? ' is-context-hidden' : ''}${isExhibitorPage ? ' is-exhibitor' : ''}`}>{isExhibitorPage ? <Link href="/expositores#contato">Preparar consulta <ArrowUpRight size={18} /></Link> : <><Link href="/credenciamento">Quero visitar <ArrowUpRight size={18} /></Link><Link href="/expositores">Quero expor <ArrowUpRight size={18} /></Link></>}</div>
  </>;
}
