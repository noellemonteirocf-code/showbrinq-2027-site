import PremiumWave from '../components/PremiumWave';
import { Link } from 'wouter';
import { ArrowRight, CalendarDays } from 'lucide-react';
import Circuit from '../components/Circuit';
import { HeroShowbrinqScene, AudiencePhotoCarousel, OriginalKitToy } from '../components/HomeLudicMedia';
import { track } from '../components/ExhibitorLeadForm';

export default function Home(){return <div className="sb-page sb-home funnel-home">
<section className="new-hero home-hero-v2" id="a-feira"><div className="container new-hero-inner"><div className="new-hero-copy"><span className="tag">SHOWBRINQ 2027 · FEIRA DE NEGÓCIOS · 6 CIDADES</span><h1>No mercado de brinquedos, boas escolhas começam com <em>bons encontros.</em></h1><p className="home-hero-lead">A Showbrinq reúne a apresentação presencial de marcas e a busca de lojistas por produtos para suas lojas. Em 2027, são seis edições para conhecer linhas, conversar sobre condições e criar relações comerciais.</p><div className="new-hero-actions"><Link className="btn btn-primary" href="/expositores#contato" onClick={()=>track('exhibitor_cta')}>Quero expor minha marca <ArrowRight size={18}/></Link><Link className="btn btn-outline" href="/credenciamento" onClick={()=>track('visitor_cta')}>Quero visitar a feira <ArrowRight size={18}/></Link></div><a className="new-hero-calendar" href="#circuito"><CalendarDays size={20}/><span><strong>29 de junho a 19 de agosto de 2027.</strong><small>Seis cidades brasileiras recebem o circuito.</small></span></a></div><HeroShowbrinqScene/></div></section>
<div className="home-color-ribbon"><div className="container"><span>6 CIDADES</span><b aria-hidden="true">✦</b><span>BRINQUEDOS E PRESENTES</span><b aria-hidden="true">✦</b><span>ENCONTRO PRESENCIAL</span></div></div>
<PremiumWave kind="home-onda-trenzinho-3d"/>
<section className="section home-audience-v2 v5-audiences" id="caminhos" aria-labelledby="v5-audience-title">
  <div className="container">
    <div className="v5-audiences__heading">
      <div><span className="eyebrow">DOIS PÚBLICOS, DUAS OPORTUNIDADES</span><h2 id="v5-audience-title">O que você procura para o seu negócio?</h2></div>
      <div className="v5-audiences__flight" aria-hidden="true">
        <svg viewBox="0 0 330 120" preserveAspectRatio="none"><path d="M5 83 C47 13 93 133 152 63 S243 47 289 70" fill="none" stroke="#ed0069" strokeWidth="3" strokeLinecap="round" strokeDasharray="9 12"/></svg>
        <img src="/assets/showbrinq-v5/aviao-rosa.webp" alt="" loading="lazy"
          onError={event => { event.currentTarget.src = "/assets/brand-2027/3d/web/aviao.png"; }}/>
      </div>
    </div>
    <div className="v5-audiences__grid">
      <article className="v5-audience v5-audience--expositor">
        <div className="v5-audience__body">
          <span className="v5-audience__tag">FABRICANTES · DISTRIBUIDORES · REPRESENTANTES</span>
          <h3>Seu catálogo mostra a linha. Na feira, você mostra os diferenciais.</h3>
          <p>Deixe o comprador ver detalhes, tire dúvidas na hora e converse sobre as condições que sua empresa realmente oferece.</p>
          <Link href="/expositores" className="btn btn-primary">Quero apresentar minha marca <ArrowRight size={18} aria-hidden="true"/></Link>
        </div>
        <div className="v5-audience__visual"><AudiencePhotoCarousel audience="expositor"/><OriginalKitToy kind="expositor"/></div>
      </article>
      <article className="v5-audience v5-audience--lojista">
        <div className="v5-audience__body">
          <span className="v5-audience__tag">SOU LOJISTA</span>
          <h3>Sua próxima seleção de brinquedos merece escolhas bem pensadas.</h3>
          <p>Conheça produtos, compare opções e esclareça pedidos, prazos e condições com quem fornece antes de decidir.</p>
          <Link href="/lojistas" className="btn btn-outline">Quero conhecer a feira <ArrowRight size={18} aria-hidden="true"/></Link>
        </div>
        <div className="v5-audience__visual"><AudiencePhotoCarousel audience="lojista"/><OriginalKitToy kind="lojista"/></div>
      </article>
    </div>
    <p className="v5-audiences__note">Fotografias do acervo de edições anteriores. Participantes e marcas de 2027 sujeitos à confirmação.</p>
  </div>
  <PremiumWave kind="home-onda-suave-turquesa-3d"/>
</section>

{/* 3 · O circuito aparece antes dos argumentos longos de conversão. */}
<div className="home-circuit-wrap"><Circuit funnel/>
  <div className="container home-sp-note home-sp-milestone">
    <div className="home-sp-milestone__copy"><span className="eyebrow">A SHOWBRINQ CHEGA A SÃO PAULO!</span><h2>Um novo estado. Novas conexões. Mais uma oportunidade para sua marca.</h2><p>Pela primeira vez, a Showbrinq chega ao estado de São Paulo. E Piracicaba será o cenário desse novo capítulo do nosso circuito.</p><strong>Piracicaba · SP | 17 a 19 de agosto de 2027</strong></div>
    <div className="home-sp-milestone__action"><svg className="home-sp-milestone__illustration" viewBox="850 30 924 827" aria-hidden="true" focusable="false"><image href="/assets/showbrinq-v5/sao-paulo-blocos-original.webp" width="1774" height="887"/></svg><Link className="btn btn-primary" href="/edicoes/piracicaba">Conhecer a estreia em São Paulo <ArrowRight size={18} aria-hidden="true"/></Link></div>
  </div>
</div>
{/* Convite compacto para o acervo completo, preservado em /registros. */}
<section className="home-archive-invite" id="experiencia" aria-labelledby="home-archive-title">
  <div className="container home-archive-invite__inner">
    <div><h2 id="home-archive-title">Quer conhecer a Showbrinq por dentro?</h2><p>Veja demonstrações, estandes e conversas registradas nas edições anteriores. São encontros reais que mostram a experiência de participar.</p></div>
    <Link className="btn btn-outline" href="/registros">Ver fotos e vídeos da feira <ArrowRight size={18} aria-hidden="true"/></Link>
  </div>
</section>
<section className="section" id="quem-somos"><div className="container funnel-split"><div className="founders-photos"><img className="history-kit-blocks" src="/assets/showbrinq-v5/blocos-coloridos.webp" alt="" aria-hidden="true" width="76" height="64" loading="lazy"/><img className="history-kit-plane" src="/assets/showbrinq-v5/aviao-rosa.webp" alt="" aria-hidden="true" width="64" height="64" loading="lazy"/><img className="history-kit-curve" src="/assets/history-cta/curva-rosa-suave.svg" alt="" aria-hidden="true" loading="lazy"/><img className="history-kit-star" src="/assets/brand-2027/3d/web/estrela.png" alt="" aria-hidden="true" width="80" height="80" loading="lazy"/><img className="history-kit-rays" src="/assets/history-cta/tracos-rosa.svg" alt="" aria-hidden="true" loading="lazy"/><figure className="founders-portrait"><img src="/assets/fundadores-showbrinq.png" alt="Seu Manoel e Dona Eline na Showbrinq, com os estandes da feira ao fundo" loading="lazy" width="1064" height="1100"/><figcaption>Seu Manoel e Dona Eline, fundadores da Showbrinq.</figcaption></figure><figure className="founders-archive"><img src="/assets/origem-showbrinq.png" alt="Fotografia do início da Showbrinq enviada pela organização" loading="lazy" width="400" height="400"/><figcaption>Uma lembrança do início.</figcaption></figure></div><div><span className="eyebrow">NOSSA HISTÓRIA</span><h2>Antes de ser uma feira, a Showbrinq foi uma solução para mostrar produtos.</h2><p>Seu Manoel e Dona Eline encontraram no showroom uma forma de apresentar mostruários sem transportá-los de cliente em cliente.</p><p>A ideia cresceu e se transformou em uma feira de negócios. Mas a essência continua: aproximar pessoas por meio dos produtos.</p><Link className="btn btn-outline" href="/blog/historia-showbrinq">Conheça a história completa</Link></div></div></section>
<PremiumWave kind="home-onda-fita-elegante-3d"/><section className="section funnel-final home-closing" id="contato" aria-labelledby="home-closing-title">

  <img className="home-closing-toy home-closing-toy--block" src="/assets/showbrinq-v5/bloco-amarelo.webp" width="42" height="42" alt="" aria-hidden="true" loading="lazy"/>
  <img className="home-closing-toy home-closing-toy--star" src="/assets/brand-2027/3d/web/estrela.png" width="42" height="42" alt="" aria-hidden="true" loading="lazy"/>
  <svg className="home-closing-spark" viewBox="0 0 90 90" aria-hidden="true" focusable="false"><path d="M45 10 L52 36 L79 44 L52 51 L45 78 L37 51 L11 44 L37 36Z" fill="none" stroke="currentColor" strokeWidth="3" strokeLinejoin="round"/><circle cx="77" cy="15" r="4" fill="currentColor"/></svg>
  <div className="container home-closing__inner">
    <div><span className="eyebrow">SHOWBRINQ 2027</span><h2 id="home-closing-title">Qual é o próximo passo para sua marca ou sua loja?</h2></div>
    <div className="home-closing__actions">
      <Link className="btn btn-primary" href="/expositores#contato">Sou fornecedor: quero expor <ArrowRight size={18} aria-hidden="true"/></Link>
      <Link className="btn btn-outline" href="/credenciamento">Sou lojista: quero visitar <ArrowRight size={18} aria-hidden="true"/></Link>
    </div>
  </div>
</section>
</div>;}
