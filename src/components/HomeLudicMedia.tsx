import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';
import { eventPhotos } from '../eventMedia';

type Photo = { src: string; alt: string };

/** Compartilha a preferência do site e do sistema sem ler um atributo ainda desatualizado. */
function useCarouselMotion() {
  const [allowed,setAllowed]=useState(false);
  useEffect(()=>{
    const media=window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync=()=>setAllowed(!media.matches && document.documentElement.dataset.motion!=='off');
    const change=(event:Event)=>{
      const next=(event as CustomEvent<unknown>).detail;
      if(typeof next==='boolean')setAllowed(next && !media.matches);
      else sync();
    };
    const observer=new MutationObserver(sync);
    observer.observe(document.documentElement,{attributes:true,attributeFilter:['data-motion']});
    media.addEventListener('change',sync);
    window.addEventListener('showbrinq-motion-change',change);
    sync();
    return ()=>{observer.disconnect();media.removeEventListener('change',sync);window.removeEventListener('showbrinq-motion-change',change);};
  },[]);
  return allowed;
}

const expoPhotos: Photo[] = [
  { src: '/assets/real-stories/conversas-1.jpg', alt: 'Profissionais conversam em um estande de edição anterior da Showbrinq' },
  { src: '/assets/brand-2027/img/stand-2.jpg', alt: 'Expositora apresenta produtos a visitantes em estande da feira' },
  { src: '/assets/editorial/fornecedores-tilin.jpg', alt: 'Profissionais conhecem brinquedos no estande de fornecedor' },
];
const shopPhotos: Photo[] = [
  { src: '/assets/editorial/lojistas-plaspolo.jpg', alt: 'Lojistas analisam produtos e conversam em estande da Showbrinq' },
  { src: '/assets/brand-2027/img/stand-1.jpg', alt: 'Exposição de brinquedos e visitantes observando novidades' },
  { src: '/assets/real-stories/conversas-2.jpg', alt: 'Atendimento e conversas entre compradores e fornecedores em edição anterior' },
];

/** Galeria compacta real. Não depende de vídeo nem de biblioteca de carrossel. */
export function AudiencePhotoCarousel({ audience }: { audience: 'expositor' | 'lojista' }) {
  const photos = audience === 'expositor' ? expoPhotos : shopPhotos;
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [hovered,setHovered]=useState(false);
  const [focused,setFocused]=useState(false);
  const motion=useCarouselMotion();
  useEffect(() => {
    if (paused || hovered || focused || !motion) return;
    const interval = window.setInterval(() => {
      if (!document.hidden) setIndex(i => (i + 1) % photos.length);
    }, 5500);
    return () => window.clearInterval(interval);
  }, [paused, hovered, focused, motion, photos.length]);
  const change = (delta: number) => setIndex(i => (i + photos.length + delta) % photos.length);
  return (
    <div className="v5-photo-reel" role="region" aria-label={audience === 'expositor' ? 'Fotografias reais de expositores da Showbrinq' : 'Fotografias reais de lojistas na Showbrinq'}
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      onFocusCapture={() => setFocused(true)} onBlurCapture={event => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocused(false);
      }}>
      <div className="v5-photo-reel__frames">
        {photos.map((photo, i) => <img key={photo.src} src={photo.src} alt={i === index ? photo.alt : ''} aria-hidden={i !== index}
          loading="lazy" onError={event => { if (event.currentTarget.getAttribute("src")?.includes("estande-anjo-acervo")) event.currentTarget.src = "/assets/real-stories/conversas-1.jpg"; }} className={i === index ? 'is-active' : ''} />)}
      </div>
      <div className="v5-photo-reel__bar">
        <span className="v5-photo-reel__count" aria-label={`Foto ${index + 1} de ${photos.length}`}>{String(index + 1).padStart(2, '0')} / {String(photos.length).padStart(2, '0')}</span>
        <div className="v5-photo-reel__controls">
          <button type="button" onClick={() => change(-1)} aria-label="Foto anterior"><ChevronLeft size={18}/></button>
          <button type="button" onClick={() => setPaused(p => !p)} aria-label={paused ? 'Retomar troca automática de fotos' : 'Pausar troca automática de fotos'} aria-pressed={paused}>
            {paused ? <Play size={16}/> : <Pause size={16}/>}
          </button>
          <button type="button" onClick={() => change(1)} aria-label="Próxima foto"><ChevronRight size={18}/></button>
        </div>
      </div>
    </div>
  );
}

/** Os arquivos WebP são parte do kit separado; fallback mantém imagens legadas durante a importação. */
function ShowbrinqAsset({name, fallback, className, alt = ''}:{name:string;fallback:string;className:string;alt?:string}) {
  return <img className={className} src={name === "estrela.webp" ? fallback : `/assets/showbrinq-v5/${name}`} alt={alt}
    aria-hidden={alt ? undefined : true} loading="lazy"
    onError={event => {
      const image = event.currentTarget;
      if (!image.src.endsWith(fallback)) image.src = fallback;
    }} />;
}

/** Fotografia autêntica, moldura transparente e objetos individuais, não mockup como fundo. */
export function HeroShowbrinqScene() {
  const photos = [
    {src:'/assets/brand-2027/img/stand-3.jpg',alt:'Visitantes e estandes em edição anterior da Showbrinq'},
    {src:'/assets/editorial/encontro-calesita.jpg',alt:'Profissionais conversando sobre produtos no estande Calesita'},
    {src:'/assets/acervo-2026/registro-09.jpg',alt:'Corredor da feira no acervo Showbrinq 2026'},
    ...eventPhotos.slice(0,6).map(({src,alt})=>({src,alt})),
  ];
  const [photo,setPhoto]=useState(0),[paused,setPaused]=useState(false);
  const [hovered,setHovered]=useState(false),[focused,setFocused]=useState(false);
  const motion=useCarouselMotion();
  /* As nove fotografias pesam alguns megabytes e apenas uma aparece por vez.
     Mantemos em memória a atual, as vizinhas e todas as já exibidas, para que a
     transição continue instantânea e sem quadro vazio. */
  const [carregadas,setCarregadas]=useState<number[]>([0,1,photos.length-1]);
  useEffect(()=>{
    const vizinhas=[photo,(photo+1)%photos.length,(photo+photos.length-1)%photos.length];
    setCarregadas(atual=>vizinhas.every(i=>atual.includes(i))?atual:[...new Set([...atual,...vizinhas])]);
  },[photo,photos.length]);
  useEffect(()=>{
    if(paused || hovered || focused || !motion)return;
    const timer=window.setInterval(()=>{if(!document.hidden)setPhoto(i=>(i+1)%photos.length);},5500);
    return ()=>window.clearInterval(timer);
  },[paused,hovered,focused,motion,photos.length]);
  return (
    <figure className="v5-hero-scene" aria-label="Registro de uma edição anterior da Showbrinq com decoração lúdica">
      <div className="v5-hero-scene__blob" aria-hidden="true" />
      <div className="v5-hero-scene__photo">
        {photos.map((item,i)=><img key={item.src} className={`hero-real-photo ${i===photo?'is-active':''}`} src={carregadas.includes(i)?item.src:undefined} alt={i===photo?item.alt:''} aria-hidden={i!==photo} fetchPriority={i===0?'high':'auto'}/>)}
      </div>
      <div className="hero-photo-controls" role="group" aria-label="Fotografias da feira no destaque"
        onMouseEnter={()=>setHovered(true)} onMouseLeave={()=>setHovered(false)}
        onFocusCapture={()=>setFocused(true)} onBlurCapture={e=>{if(!e.currentTarget.contains(e.relatedTarget as Node|null))setFocused(false);}}>
        <span aria-label={`Foto ${photo+1} de ${photos.length}`}>{photo+1}/{photos.length}</span>
        <button type="button" aria-label="Foto anterior do hero" onClick={()=>setPhoto(i=>(i+photos.length-1)%photos.length)}><ChevronLeft size={17}/></button>
        <button type="button" aria-label={paused?'Retomar fotos do hero':'Pausar fotos do hero'} aria-pressed={paused} onClick={()=>setPaused(p=>!p)}>{paused?<Play size={15}/>:<Pause size={15}/>}</button>
        <button type="button" aria-label="Próxima foto do hero" onClick={()=>setPhoto(i=>(i+1)%photos.length)}><ChevronRight size={17}/></button>
      </div>
      <svg className="v5-hero-scene__frame" viewBox="0 0 700 600" preserveAspectRatio="none" aria-hidden="true">
        <path d="M83 96 C170 25 497 33 613 109 C691 194 656 432 578 506 C466 581 207 559 103 495 C24 420 12 181 83 96Z"
          fill="none" stroke="#ffca30" strokeWidth="14" />
      </svg>
      <ShowbrinqAsset name="foguete.webp" fallback="/assets/brand-2027/3d/web/triangulo.png"
        className="v5-hero-toy v5-hero-toy--rocket"/>
      <ShowbrinqAsset name="blocos-coloridos.webp" fallback="/assets/brand-2027/3d/web/blocos.png"
        className="v5-hero-toy v5-hero-toy--blocks"/>
      <ShowbrinqAsset name="trenzinho.webp" fallback="/assets/brand-2027/3d/web/blocos.png"
        className="v5-hero-toy v5-hero-toy--train"/>
      <ShowbrinqAsset name="estrela.webp" fallback="/assets/brand-2027/3d/web/estrela.png"
        className="v5-hero-toy v5-hero-toy--star"/>
      <ShowbrinqAsset name="selo-6-cidades.webp" fallback="/assets/brand-2027/selo-6-cidades-2027.svg"
        className="v5-hero-scene__seal v5-hero-scene__seal--art" alt="6 cidades em 2027"/>
    </figure>
  );
}

/** Recortes vetoriais da prancha original recebida, sem redesenhar os brinquedos. */
export function OriginalKitToy({kind}:{kind:'expositor'|'lojista'}) {
  const shop=kind==='lojista';
  return <svg className={`v5-audience__toy v5-audience__toy--${kind}`} viewBox={shop?'400 470 410 360':'0 440 412 400'} aria-hidden="true" focusable="false">
    <defs><clipPath id={`original-kit-${kind}`}><path d={shop?'M408 488H698L727 555V646L792 650L805 814H410Z':'M0 445H398V585L412 605V700L390 840H0Z'}/></clipPath></defs>
    <image href="/assets/showbrinq-v5/kit-original-prancha.webp" width="1536" height="1024" clipPath={`url(#original-kit-${kind})`}/>
  </svg>;
}
