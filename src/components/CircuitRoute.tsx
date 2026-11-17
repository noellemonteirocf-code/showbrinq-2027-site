import { useEffect, useRef, type CSSProperties } from 'react';
import { Route } from 'lucide-react';
import { editions } from '../data';
import { useKitMotion, KitMotionButton } from './KitMotion';
import './circuit-route.css';
import '../kit-live.css';

const COLORS = ['#FC307C','#F5A623','#8CBF3F','#00A0D0','#FC307C','#F5A623'];
const POSTER = '/manus-storage/circuito-poster-original_b081152f.webp';

export default function CircuitRoute({selectedIndex,onSelect,editionLinks=false}:{selectedIndex:number;onSelect:(index:number)=>void;editionLinks?:boolean}) {
  const {host,playing,allowed,setPaused} = useKitMotion();
  const video = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (!video.current) return;
    if (playing) void video.current.play().catch(() => setPaused(true));
    else video.current.pause();
  },[playing,setPaused]);
  return <div className="circuit-kit-route kit-original-route" role="group" aria-label="Circuito SHOWBRINQ 2027" ref={host}>
    <div className="kit-route-title"><Route size={22} aria-hidden="true" /><span>CIRCUITO SHOWBRINQ 2027</span></div>
    <div className="kit-map" data-playing={playing}>
      <img className="kit-map-art" src={POSTER} alt="Mapa animado original do circuito SHOWBRINQ, com seis paradas numeradas. Os nomes, datas e controles interativos estão na lista acessível logo abaixo." draggable={false} onError={event => { const fallback='/assets/kit-live/circuito-poster-original.webp'; if(!event.currentTarget.src.endsWith(fallback)) event.currentTarget.src=fallback; }} />
      <video ref={video} className="kit-original-video" src="/manus-storage/circuito-mapa-original_7d890ba3.mp4" poster={POSTER} loop muted playsInline preload="metadata" aria-hidden="true" tabIndex={-1} onError={() => { if(video.current && !video.current.src.endsWith('/assets/kit-live/circuito-mapa-original.mp4')) video.current.src='/assets/kit-live/circuito-mapa-original.mp4'; }} />
      {editionLinks && <div className="kit-edition-links" aria-label="Abrir uma edição regional">{editions.map((city,index)=><span key={city.id}><a className="kit-edition-map-point" tabIndex={-1} aria-hidden="true" href={`/edicoes/${city.id}`} style={{left:`${[44.3,52.2,55.7,51.5,37.4,39.7][index]}%`,top:`${[19.8,22.4,32.2,40.9,50.9,64.8][index]}%`}}/><a className="kit-edition-map-label" aria-label={`Abrir edição de ${city.city}`} href={`/edicoes/${city.id}`} style={{top:`${32+index*9.65}%`}}/></span>)}</div>}
    </div>
    <div className="kit-stops" role="group" aria-label="Escolher uma parada do circuito">{editions.map((city,index)=><button key={city.id} type="button" className={`kit-stop${selectedIndex===index?' is-selected':''}`} style={{'--stop-color':COLORS[index]} as CSSProperties} onClick={()=>onSelect(index)} aria-label={`Selecionar ${city.city}, ${city.dates}`} aria-pressed={selectedIndex===index}><span className="kit-stop-number">{String(index+1).padStart(2,'0')}</span><span className="kit-stop-copy"><strong>{city.city} · {city.uf}</strong><small>{city.shortDate} · 2027</small></span></button>)}</div>
    <div className="kit-original-controls"><KitMotionButton playing={playing} allowed={allowed} onClick={()=>setPaused(value=>!value)} /><span>Vídeo original do percurso · escolha uma cidade na lista para ver detalhes.</span></div>
  </div>;
}
