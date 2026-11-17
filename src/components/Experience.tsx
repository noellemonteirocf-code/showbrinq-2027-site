import { useState, useRef, useEffect } from 'react';
import { Link } from 'wouter';
import { ArrowRight, ChevronLeft, ChevronRight, Play, Pause } from 'lucide-react';
import { eventPhotos, eventClips } from '../eventMedia';
import '../experience-visual.css';
import KitSticker from './KitSticker';

export default function Experience({full=false,hideHeading=false}:{full?:boolean;hideHeading?:boolean}) {
 const [photo,setPhoto]=useState(8),[clip,setClip]=useState(0),[playing,setPlaying]=useState(false);
 const video=useRef<HTMLVideoElement>(null);
 const firstRender=useRef(true);
 const active=eventClips[clip];
 /* load() na primeira renderização anula o preload="none" e baixa o vídeo inteiro
    sem o visitante pedir. Só recarrega quando o clipe realmente muda. */
 useEffect(()=>{setPlaying(false);if(firstRender.current){firstRender.current=false;return;}video.current?.load();},[clip]);
 const toggle=()=>{if(!video.current)return;if(video.current.paused)void video.current.play().catch(()=>setPlaying(false));else video.current.pause();};
 return <section className="section experience-section" id="por-dentro"><div className="container">
  <KitSticker kind="confetti" className="experience-kit-confetti" />
  {!hideHeading&&<div className="section-top"><div><span className="eyebrow">PRODUTOS, PESSOAS E CONVERSAS REAIS</span><h2>Veja a SHOWBRINQ<br/><em>acontecer.</em></h2></div><p>Um olhar de dentro da feira: linhas em exposição, apresentações e encontros. Fotos e vídeos enviados pela organização.</p></div>}
  <div className="experience-media-grid">
   <div className="event-video reveal-item"><video ref={video} key={active.src} controls playsInline preload="none" poster={active.poster} onPlay={()=>setPlaying(true)} onPause={()=>setPlaying(false)} onEnded={()=>setPlaying(false)} aria-label={active.title}><source src={active.src} type="video/mp4"/>Seu navegador não suporta o vídeo. <a href={active.src}>Abrir arquivo de vídeo</a></video>{!playing&&<button className="video-start" onClick={toggle}><Play size={26} fill="currentColor"/><span>Assistir à feira</span></button>}<span className="event-video-caption">{active.title} · Registro histórico</span></div>
   <div className="event-photo-viewer reveal-item"><img key={eventPhotos[photo].src} src={eventPhotos[photo].src} alt={eventPhotos[photo].alt} loading="lazy"/><p className="event-photo-caption">{eventPhotos[photo].caption||'Acervo de edições anteriores'}</p><div className="photo-viewer-controls"><button onClick={()=>setPhoto((photo+eventPhotos.length-1)%eventPhotos.length)} aria-label="Foto anterior"><ChevronLeft size={23}/></button><span>{String(photo+1).padStart(2,'0')} / {String(eventPhotos.length).padStart(2,'0')}</span><button onClick={()=>setPhoto((photo+1)%eventPhotos.length)} aria-label="Próxima foto"><ChevronRight size={23}/></button></div></div>
  </div>
  <div className="clip-options" aria-label="Escolher vídeo da feira">{eventClips.map((c,i)=><button key={c.src} className={i===clip?'selected':''} onClick={()=>setClip(i)} aria-pressed={i===clip}><Play size={17}/>{c.title}</button>)}</div>
  {full&&<div className="full-event-gallery">{eventPhotos.map((p,i)=><figure key={p.src} className="reveal-item"><img src={p.src} alt={p.alt} loading="lazy"/><figcaption>{p.caption||`Registro de edição anterior · ${String(i+1).padStart(2,'0')}`}</figcaption></figure>)}</div>}
  <div className="experience-bottom"><p className="footnote">Registros fornecidos pela SHOWBRINQ. Não são confirmação de marcas ou programação para 2027.</p>{!full&&<Link href="/registros" className="text-link">Explorar todos os registros <ArrowRight size={19}/></Link>}{playing&&<button onClick={toggle} className="text-link"><Pause size={17}/> Pausar vídeo</button>}</div>
 </div></section>;
}
