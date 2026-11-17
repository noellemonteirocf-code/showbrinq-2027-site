import { Link, useSearch } from 'wouter';
import { ArrowUpRight, ArrowRight, Eye, MessagesSquare, Layers3, MapPin, PackageCheck, Handshake, Hotel } from 'lucide-react';
import { APP_NAME } from '../config';
import { eventPhotos } from '../eventMedia';
import type { Profile } from '../data';
import Circuit from '../components/Circuit';
import { Faq, ToolCards } from '../components/Sections';
import { HistoricalBrands } from '../components/HistoricalBrands';
import { Hospitality } from '../components/Hospitality';
import Experience from '../components/Experience';
import Contact from '../components/Contact';
import { CityRegistration } from './Registration';
import ExhibitorPreview from './ExhibitorPreview';
import KitSticker from '../components/KitSticker';
import RealStories from '../components/RealStories';
import '../lojistas-3d.css';
import { useBuyerVisual } from '../lib/buyer-visual';

export default function Audience({profile}:{profile:Profile}) {
  const buyer=profile==='lojista';
  const visual=useBuyerVisual();
  const query=new URLSearchParams(useSearch());
  const city=query.get('cidade')||undefined;
  const tool=buyer?'/caderno-de-visita':'/planejador-de-participacao';
  const toolHref=`${tool}${city?'?cidade='+encodeURIComponent(city):''}`;
  const benefits=buyer?[
    {Icon:Eye,title:'Compare o custo e o que cada produto oferece.',text:'Pergunte sobre pedido mínimo, entrega, reposição e características dos produtos. Cada empresa define suas condições comerciais.'},
    {Icon:MessagesSquare,title:'Conheça novidades e acompanhe categorias.',text:'Observe demonstrações e descubra linhas que podem complementar o que sua loja já vende, sem depender apenas de tendências passageiras.'},
    {Icon:Layers3,title:'Avalie o que realmente cabe no mix da loja.',text:'Pense em faixa de preço, espaço de exposição e perfil dos clientes. Registre o que precisa comparar antes de comprar.'},
  ]:[
    {Icon:PackageCheck,title:'Mostre sua linha de perto.',text:'Demonstre os produtos e seus detalhes em um ambiente de exposição dedicado ao setor.'},
    {Icon:Handshake,title:'Receba o varejo.',text:'Apresente sua empresa, converse com compradores e retome o contato com clientes presencialmente.'},
    {Icon:MapPin,title:'Escolha onde participar.',text:'Analise as cidades do circuito e consulte formatos, estrutura e condições com a organização.'},
  ];
  const steps=buyer?[
    ['Escolha sua edição','Consulte as cidades e as datas do circuito para planejar sua visita.'],
    ['Prepare suas perguntas','Liste produtos, fornecedores e condições que quer conhecer pessoalmente.'],
    ['Acompanhe a abertura','O credenciamento e as orientações de acesso serão divulgados por cidade.'],
  ]:[
    ['Escolha as edições','Avalie as cidades em que quer apresentar a marca e organizar sua operação.'],
    ['Converse com a equipe','Peça a proposta e confirme formato, metragem, estrutura, valores e prazos de participação.'],
    ['Prepare a sua presença','Organize produtos, equipe, logística e hospedagem após confirmar as condições da edição.'],
  ];
  if (!buyer) return <ExhibitorPreview city={city} />;
  return <div className="sb-page sb-buyer">
    <section className={`audience-hero ${buyer?'':'audience-hero-pink'}`}>
      <div className="container">
        <div className="breadcrumb"><Link href="/">Início</Link><span>/</span>{buyer?'Para lojistas':'Para expositores'}</div>
        <div className="audience-hero-grid">
          <div>
            <span className="tag">{buyer?'LOJISTAS · COMPRADORES DO VAREJO':'FABRICANTES · REPRESENTANTES · FORNECEDORES'}</span>
            <h1>{buyer?<>Produtos para conhecer.<br/>{' '}Perguntas para fazer.<br/>{' '}<em>Escolhas para sua loja.</em></>:<>Sua linha tem<br/>muito para mostrar.<br/><em>Traga para a feira.</em></>}</h1>
            <p>{buyer?'Um produto pode parecer ótimo na foto e não fazer sentido para o seu público. Na Showbrinq, conheça linhas de perto, compare opções para o seu mix e converse diretamente sobre as condições de fornecimento.':`Leve sua marca ao circuito ${APP_NAME}. Apresente produtos pessoalmente, receba lojistas e converse com a organização sobre as edições e os formatos de exposição.`}</p>
            {buyer&&<p className="visitor-access-note" id="cadastro"><strong>Entrada gratuita para lojistas com CNPJ ou MEI.</strong><span>Consulte a abertura do credenciamento da sua cidade e siga as instruções oficiais de acesso.</span></p>}
            <div className="hero-buttons">
              <a className="btn btn-primary" href={buyer?'/credenciamento':'#contato'}>{buyer?'Escolher minha edição':'Quero conversar sobre exposição'}<ArrowUpRight size={21}/></a>
              <Link className="btn btn-outline" href={buyer?toolHref:'/hoteis-parceiros'}>{buyer?<Eye size={21}/>:<Hotel size={21}/>} {buyer?'Preparar minha visita':'Hospedagem para representantes'}</Link>
            </div>
            <p className="footnote">{buyer?'Os preços e as condições são definidos por cada fornecedor.':'A consulta de participação não reserva stand nem substitui a proposta comercial.'}</p>
          </div>
          <figure className="audience-hero-image buyer-editorial-photo buyer-universe"><div className="buyer-editorial-frame"><img src={visual.heroPhoto} alt={visual.heroAlt} width="1050" height="1400" fetchPriority="high" decoding="async"/><img className="buyer-universe-overlay" src="/assets/lojistas-3d/moldura-universo.png" alt="" aria-hidden="true" width="1300" height="1200" decoding="async"/></div><figcaption>Registro histórico · Acervo da Showbrinq</figcaption></figure>
        </div>
      </div>
    </section>
    <div className="buyer-hero-divider" aria-hidden="true"><img src="/assets/lojistas-3d/onda-tripla.png" alt="" width="2172" height="724" decoding="async" /></div>
    <nav className="container buyer-section-nav" aria-label="Atalhos da página de lojistas"><span>Ir direto para:</span><a href="#beneficios-lojistas">Benefícios</a><a href="#relatos-da-feira">Experiência na feira</a><a href="#cidades-lojistas">Cidades</a><a href="#planejar-lojistas">Planeje sua visita</a></nav><section className="section" id="beneficios-lojistas"><div className="container"><span className="eyebrow">{buyer?'POR QUE VISITAR A SHOWBRINQ':'O ENCONTRO FAZ DIFERENÇA NA APRESENTAÇÃO'}</span><h2>{buyer?'Olhe além do preço antes de escolher.':'O catálogo apresenta. Você conta o resto.'}</h2><div className="benefit-grid">{benefits.map(({Icon,title,text},i)=><article className="benefit-card" key={title}><div className="buyer-benefit-visual"><span className="benefit-index">0{i+1}</span><img className="buyer-benefit-art" src={`/assets/lojistas-3d/${['conhecer-produtos-3d','conversar-fornecedores-3d','comparar-opcoes-3d'][i]}.png`} alt="" aria-hidden="true" width="160" height="140" loading="lazy" decoding="async"/></div><h3>{title}</h3><p>{text}</p></article>)}</div></div></section>
    <RealStories audience="buyer"/><section className="section steps-section" id="planejar-lojistas"><div className="container"><div className="section-top"><div><span className="eyebrow">{buyer?'COMO VISITAR':'O QUE ORGANIZAR ANTES DA FEIRA'}</span><h2>{buyer?<>Escolha sua edição.<br/>Prepare sua visita.</>:<>Data na agenda.<br/>Participação organizada.</>}</h2></div>{!buyer&&<Link href={toolHref} className="btn btn-outline">Abrir meu Planejador<ArrowRight size={20}/></Link>}</div><div className="steps-grid">{steps.map(([title,text],i)=><div key={title} className="reveal-item"><span>0{i+1}</span><h3>{title}</h3><p>{text}</p></div>)}</div><div id="credenciamento-cidades" className="buyer-registration-link"><Link className="btn btn-outline" href="/credenciamento">Consultar credenciamento<ArrowRight size={18}/></Link></div></div></section>
    <div id="cidades-lojistas"><Circuit city={city}/></div><HistoricalBrands compact/>{!buyer&&<Hospitality city={city}/>}<ToolCards visitorArtwork/><Faq profile={profile} registrationLinkPending/><Contact profile={profile} city={city}/>
  </div>;
}
