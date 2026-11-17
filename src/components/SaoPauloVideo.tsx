import { useEffect, useRef, useState } from 'react';

export default function SaoPauloVideo(){
 const video=useRef<HTMLVideoElement>(null);
 const [playing,setPlaying]=useState(false);
 const [mobile,setMobile]=useState(false);
 useEffect(()=>{
  const viewport=window.matchMedia('(max-width:600px)');
  const update=()=>setMobile(viewport.matches);update();
  viewport.addEventListener('change',update);
  return ()=>viewport.removeEventListener('change',update);
 },[]);
 useEffect(()=>{
  const el=video.current;if(!el)return;
  const media=window.matchMedia('(prefers-reduced-motion: reduce)');
  let visible=false,enabled=false;
  try{enabled=localStorage.getItem('showbrinq-motion')!=='off';}catch{enabled=true;}
  const sync=()=>{if(visible&&enabled&&!media.matches)void el.play().catch(()=>{});else el.pause();};
  const observer=new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;sync();},{threshold:.2});observer.observe(el);
  const change=(event:Event)=>{enabled=(event as CustomEvent<boolean>).detail;sync();};
  media.addEventListener('change',sync);window.addEventListener('showbrinq-motion-change',change);
  return ()=>{observer.disconnect();media.removeEventListener('change',sync);window.removeEventListener('showbrinq-motion-change',change);el.pause();};
 },[]);
 return <div className="sp-motion-banner"><video ref={video} muted loop playsInline preload="metadata" poster={mobile?'/assets/campaign-video/estreia-sp-mobile-poster.jpg':'/assets/campaign-video/estreia-sp-poster.jpg'} aria-label="Bandeira paulista ondulando e fita em movimento: Showbrinq em Piracicaba, 17 a 19 de agosto de 2027" onPlay={()=>setPlaying(true)} onPause={()=>setPlaying(false)}><source media="(max-width:600px)" src="/assets/campaign-video/estreia-sp-mobile.mp4" type="video/mp4"/><source src="/assets/campaign-video/estreia-sp-loop.mp4" type="video/mp4"/></video><button type="button" className="sp-video-control" aria-label={playing?'Pausar vídeo da estreia':'Reproduzir vídeo da estreia'} onClick={()=>{const el=video.current;if(!el)return;if(el.paused)void el.play().catch(()=>{});else el.pause();}}>{playing?'Ⅱ Pausar':'▶ Reproduzir'}</button><p className="sr-only">Pela primeira vez no estado de São Paulo. Showbrinq em Piracicaba, de 17 a 19 de agosto de 2027.</p></div>;
}
