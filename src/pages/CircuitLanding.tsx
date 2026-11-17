import { useState } from 'react';
import { Link } from 'wouter';
import { ArrowRight, CalendarDays, Download, MapPin, Sparkles } from 'lucide-react';
import { editions, saveCalendar } from '../data';
import CircuitRoute from '../components/CircuitRoute';
import '../circuit-landing.css';

export default function CircuitLanding() {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const edition = editions[selectedIndex];
  return <div className="circuit-landing">
    <section className="circuit-landing__hero">
      <div className="container circuit-landing__intro">
        <div className="circuit-landing__intro-copy">
          <span className="eyebrow">CIRCUITO SHOWBRINQ 2027 · FEIRA DE BRINQUEDOS</span>
          <h1>Seis cidades.<br/><em>Duas jornadas</em> de negócios.</h1>
          <p>Seis paradas para marcas apresentarem seus produtos e lojistas descobrirem novidades. Compare as datas, conheça cada edição e escolha onde faz sentido participar.</p>
          <a href="#cidades" className="btn btn-primary">Explorar as seis cidades <ArrowRight size={18}/></a>
        </div>
        <div className="circuit-landing__stamp" aria-label="Circuito com seis edições em 2027">
          <img src="/assets/showbrinq-v5/selo-6-cidades.webp" alt="" onError={event=>{event.currentTarget.style.display='none';}}/>
          <span>6 <small>CIDADES</small><strong>2027</strong></span>
        </div>
      </div>
    </section>
    <div className="circuit-landing__wave" aria-hidden="true"><svg viewBox="0 0 1440 90" preserveAspectRatio="none"><path fill="#ff0079" d="M0 35C200 0 310 80 520 39S890 0 1100 43 1340 70 1440 27V90H0Z"/><path fill="#ffcf38" d="M0 65C180 35 360 95 550 59S900 25 1100 60 1320 80 1440 50V90H0Z"/><path fill="#00b4d6" d="M0 81C280 58 510 95 740 74S1240 67 1440 83V90H0Z"/></svg></div>
    <section className="section circuit-landing__cities" id="cidades">
      <div className="container">
        <div className="section-top"><div><span className="eyebrow">ESCOLHA A SUA PARADA</span><h2>Em qual cidade faz sentido<br/>participar?</h2></div><p>Compare as seis etapas e escolha uma cidade para conhecer os detalhes. As datas estão anunciadas; locais e horários serão confirmados pela organização.</p></div>
        <CircuitRoute selectedIndex={selectedIndex} onSelect={setSelectedIndex}/>
        <div className="circuit-landing__choice" aria-live="polite">
          <div className="circuit-landing__choice-date"><MapPin size={22}/><div><strong>{edition.city} · {edition.uf}</strong><span><CalendarDays size={16}/>{edition.dates}</span></div></div>
          <div className="circuit-landing__choice-actions"><Link className="btn btn-primary" href={`/edicoes/${edition.id}`}>Conhecer esta edição <ArrowRight size={17}/></Link><button className="btn btn-outline" onClick={()=>saveCalendar(edition)}>Salvar data <Download size={16}/></button></div>
        </div>
        <div className="circuit-landing__all">
          {editions.map(item=><Link key={item.id} href={`/edicoes/${item.id}`} className={item.id==='piracicaba'?'circuit-landing__city-card is-debut':'circuit-landing__city-card'}><span>{item.order} / {item.uf}</span><strong>{item.city}</strong><small>{item.shortDate} · 2027</small>{item.id==='piracicaba'&&<b><Sparkles size={14}/> Estreia em São Paulo</b>}</Link>)}
        </div>
      </div>
    </section>
    <section className="section circuit-landing__spotlight">
      <div className="container circuit-landing__spotlight-inner"><div><span className="eyebrow">NOVIDADE NO CIRCUITO</span><h2>Pela primeira vez, a Showbrinq chega a São Paulo. <em>Piracicaba recebe a estreia.</em></h2><p>De 17 a 19 de agosto de 2027, Piracicaba recebe uma nova etapa do circuito. Para quem expõe, uma cidade para apresentar produtos e abrir conversas comerciais. Para quem visita, a chance de descobrir linhas de brinquedos e esclarecer dúvidas diretamente com fornecedores.</p><Link className="btn btn-primary" href="/edicoes/piracicaba">Conhecer a estreia em Piracicaba <ArrowRight size={18}/></Link></div><div className="circuit-landing__sp-art" role="img" aria-label="Bandeira paulista ilustrada com blocos coloridos"><img src="/assets/showbrinq-v5/sao-paulo-blocos-original.webp" alt="" loading="lazy"/></div></div>
    </section>
    <section className="section circuit-landing__audiences"><div className="container"><span className="eyebrow">DOIS CAMINHOS PARA PARTICIPAR</span><h2>O que você quer encontrar na próxima Showbrinq?</h2><div className="circuit-landing__audience-grid"><article><img className="circuit-landing__audience-art" src="/assets/regional-chests/mini-estande.webp" alt="" width="1536" height="1024" loading="lazy"/><span>PARA EXPOSITORES</span><h3>Seu próximo cliente pode conhecer sua marca em uma dessas cidades.</h3><p>Apresente seus produtos de perto, conheça profissionais do varejo e comece conversas que podem continuar depois da feira. Compare as cidades e veja as opções de exposição.</p><Link className="btn btn-primary" href="/expositores#contato">Quero expor na Showbrinq <ArrowRight size={16}/></Link></article><article><img className="circuit-landing__audience-art" src="/assets/regional-chests/sacola.webp" alt="" width="1312" height="1199" loading="lazy"/><span>PARA LOJISTAS</span><h3>E se a próxima novidade da sua loja estivesse em uma dessas cidades?</h3><p>Conheça linhas de brinquedos, compare opções e converse com fabricantes e distribuidores. Escolha sua cidade e acompanhe as informações de credenciamento.</p><Link className="btn btn-outline" href="/credenciamento">Quero visitar a Showbrinq <ArrowRight size={16}/></Link></article></div></div></section>
  </div>;
}
