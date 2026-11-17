import SaoPauloVideo from '../components/SaoPauloVideo';
import CampaignArtwork from '../components/CampaignArtwork';
import DriveGallery from '../components/DriveGallery';
import type { CSSProperties } from 'react';
import { Link } from 'wouter';
import { ArrowRight, ArrowUpRight, CalendarDays, Download } from 'lucide-react';
import { regionalPageCopy } from '../regionalPageCopy';
import '../regional-page-polish.css';
import '../regional-chests.css';
import { editions, saveCalendar } from '../data';
import { APP_NAME, INSTAGRAM_URL } from '../config';
import { stateIdentity } from '../stateIdentity';
import Experience from '../components/Experience';
import Contact from '../components/Contact';
import RegionalMarket from '../components/RegionalMarket';

export function EditionPage({id}:{id:string}) {
 const e=editions.find(c=>c.id===id);if(!e)return <NotFound/>;const identity=stateIdentity[e.uf];const copy=regionalPageCopy[e.uf];const chest=['MA','PE','BA','GO','SP'].includes(e.uf)?`/assets/regional-chests/${e.uf.toLowerCase()}.webp`:null;
 return <>
  {e.uf==='SP'&&<SaoPauloVideo/>}
  <section className={`city-hero city-hero-local ${e.uf==='SP'?'city-hero-sp':''} ${chest?'city-hero-chest':''}`} style={{background:identity.light,'--state-color':identity.color,'--state-light':identity.light} as CSSProperties}>
   <div className="container">
    <div className="breadcrumb"><Link href="/">Início</Link><span>/</span><Link href="/circuito-2027">Circuito 2027</Link><span>/</span>{e.city}</div>
    <div className="city-local-hero-grid">
     <div className="city-local-copy">
      {e.uf==='SP'&&<p className="sp-first city-sp-debut">PRIMEIRA EDIÇÃO NO ESTADO DE SÃO PAULO</p>}<span className="tag">FEIRA DE BRINQUEDOS · {e.city.toUpperCase()} · {e.uf}</span>
      <h1>{copy.hero}</h1>
      <p className="city-local-lead">{copy.lead}</p>
      <div className="city-entry-card"><strong>Entrada gratuita para lojistas com CNPJ ou MEI.</strong><span>O credenciamento de 2027 será aberto em uma etapa futura, com orientações por cidade.</span></div>
      <div className="city-local-actions"><Link href={`/expositores?cidade=${e.id}#contato`} className="btn btn-primary">Quero expor em {e.city} <ArrowRight size={19}/></Link><Link href={`/credenciamento#cadastro-${e.id}`} className="btn btn-outline">Consultar credenciamento</Link><button className="text-button" onClick={()=>saveCalendar(e)}>Salvar na agenda <Download size={18}/></button></div>
     </div>
     {chest ? <figure className="regional-chest-scene"><div className="regional-chest-scene__glow" aria-hidden="true"/><img src={chest} width="1100" height={e.uf==='MA'?734:1005} alt={`Ilustração de um baú de brinquedos com a bandeira de ${e.state}`} fetchPriority="high"/><figcaption><CalendarDays size={20} aria-hidden="true"/><span><strong>{e.city} · {e.uf}</strong>{e.shortDate} · 2027</span></figcaption></figure> : <aside className="city-local-stamp" aria-label={`${e.city}, ${e.state}. ${e.dates}`}>
      <div className="city-flag-card"><img src={identity.flag} alt={`Bandeira de ${e.state}`}/><span>{e.state} · {e.uf}</span></div>
      <span className="city-stamp-number">{e.order}</span>
      <strong>{e.city}</strong>
      <span className="city-stamp-date"><CalendarDays size={18}/>{e.shortDate} · 2027</span>
      <small>ROTA SHOWBRINQ 2027</small>
      {e.uf==='SP'?<div className="sp-state-objects" aria-hidden="true"><div className="sp-flag-object"><img src="/assets/flags/sp.svg" alt=""/></div><div className="sp-state-ticket"><span>ESTREIA</span><b>SP</b><small>2027</small></div><div className="sp-coffee-object"><span>☕</span></div></div>:<span className="city-stamp-toy" aria-hidden="true">🧩</span>}
     </aside>}
    </div>
    {chest&&<svg className="regional-hero-wave" viewBox="0 0 1440 90" preserveAspectRatio="none" aria-hidden="true"><path fill="#ffd339" d="M0 45 Q220 0 450 50 T940 38 T1440 40 V90 H0Z"/><path fill="#00b9c9" d="M0 66 Q230 7 480 60 T980 53 T1440 61 V90 H0Z"/></svg>}
   </div>
  </section>

  <RegionalMarket edition={e}/><section className="section city-local-value city-edition-journeys regional-chest-journeys">
   <div className="container">
    <div className="section-top"><div><span className="eyebrow">UM ENCONTRO, DOIS OBJETIVOS</span><h2>{copy.valueTitle}</h2></div><p>{copy.valueIntro}</p></div>
    <div className="city-edition-journeys__grid">
     <article className="city-edition-journeys__exhibitor"><img className="regional-journey-art" src="/assets/regional-chests/mini-estande.webp" alt="" loading="lazy" width="1536" height="1024"/><span>PARA FABRICANTES E DISTRIBUIDORES</span><h3>{copy.exhibitorTitle}</h3><p>{copy.exhibitorDescription}</p><Link className="btn btn-primary" href={`/expositores?cidade=${e.id}#contato`}>Consultar exposição em {e.city} <ArrowRight size={17}/></Link><Link className="city-edition-journeys__secondary" href={`/estandes?cidade=${e.id}`}>Ver modelos de estandes</Link></article>
     <article className="city-edition-journeys__buyer"><img className="regional-journey-art" src="/assets/regional-chests/sacola.webp" alt="" loading="lazy" width="1312" height="1199"/><span>PARA LOJISTAS</span><h3>{copy.buyerTitle}</h3><p>{copy.buyerDescription}</p><Link className="btn btn-outline" href={`/credenciamento#cadastro-${e.id}`}>Informações para visitar <ArrowRight size={17}/></Link></article>
    </div>
   </div>
  </section>

  <section className={`section city-local-registration ${e.uf==='SP'?'registration-sp-vivid':''}`} id="cadastro">
   <div className="container">
    <div className="city-registration-panel campaign-registration-panel"><CampaignArtwork/>
     <div><span className="eyebrow">PARA LOJISTAS · {e.city.toUpperCase()}</span><h2>Credenciamento<br/><em>em breve.</em></h2><p>A abertura e as orientações de acesso serão divulgadas para esta edição. Enquanto isso, consulte as datas e prepare as perguntas que quer levar aos fornecedores.</p></div>
     <div><Link href={`/credenciamento#cadastro-${e.id}`} className="btn btn-primary">Consultar status de {e.city} <ArrowRight size={18}/></Link><p><Link href={`/lojistas?cidade=${e.id}`}>Veja como preparar sua visita</Link></p></div>
    </div>
   </div>
  </section>

  <section className="section city-local-service">
   <div className="container">
    <div className="section-top"><div><span className="eyebrow">SERVIÇO · {e.city.toUpperCase()}</span><h2>Informações desta edição.</h2></div><p>As informações práticas desta página serão atualizadas quando confirmadas pela organização.</p></div>
    <div className="city-service-grid"><article><span>DATA ANUNCIADA</span><strong>{e.dates}</strong></article><article><span>ENDEREÇO E HORÁRIOS</span><strong>A divulgar pela organização.</strong></article><article><span>EXPOSITORES DE 2027</span><strong>Participantes a confirmar para esta edição.</strong></article></div>
    <div className="city-local-links"><Link href="/circuito-2027">Ver todas as cidades e datas <ArrowRight size={17}/></Link><Link href="/expositores-2026">Consultar o acervo histórico de 2026 <ArrowRight size={17}/></Link><Link href="/blog">Guias para preparar a visita <ArrowRight size={17}/></Link></div>
   </div>
  </section>

  <section className="section city-local-faq"><div className="container"><div className="section-top"><div><span className="eyebrow">DÚVIDAS SOBRE {e.city.toUpperCase()}</span><h2>O que saber antes<br/>de escolher a edição.</h2></div><p>Informações para avaliar a exposição da sua marca ou preparar sua visita à SHOWBRINQ em {e.city}.</p></div><div className="city-local-faq-list"><details><summary>Como posso apresentar minha marca nesta edição?<span>+</span></summary><p>Informe sua empresa, seu segmento e as cidades de interesse na <Link href={`/expositores?cidade=${e.id}#contato`}>consulta para expositores</Link>. A organização avaliará estrutura, disponibilidade e condições comerciais.</p></details><details><summary>A entrada na feira de {e.city} é gratuita?<span>+</span></summary><p>Sim. A entrada é gratuita para lojistas com CNPJ ou MEI.</p></details><details><summary>O credenciamento de lojistas já está aberto?<span>+</span></summary><p>Ainda não. O status da edição de {e.city} pode ser consultado na página de credenciamento. O formulário oficial e as orientações de acesso serão divulgados após confirmação da organização.</p></details><details><summary>Onde será realizada a edição e em quais horários?<span>+</span></summary><p>O endereço e os horários de {e.city} serão divulgados pela organização nesta página quando confirmados.</p></details><details><summary>Quais marcas estarão em {e.city} em 2027?<span>+</span></summary><p>A lista será confirmada para cada edição. O acervo de expositores de 2026 é histórico e não confirma presença em 2027.</p></details></div></div></section>
  <Contact profile="lojista" city={e.id}/>
 </>;
}
export function RecordsPage() {return <><div className="container page-heading"><div className="breadcrumb"><Link href="/">Início</Link><span>/</span>Fotos e vídeos</div><span className="eyebrow">ACERVO DA SHOWBRINQ</span><h1>A feira tem<br/>muito para mostrar.</h1><p>Produtos em exposição, marcas e encontros registrados pela organização. Explore as fotos e escolha um vídeo para assistir.</p></div><DriveGallery/><Experience full/></>;}
export function PrivacyPage() {return <section className="section"><div className="container legal-page"><span className="eyebrow">PRÉVIA · PRIVACIDADE</span><h1>Seu planejamento<br/>fica com você.</h1><p>Esta é uma prévia do circuito {APP_NAME} 2027. Não há inscrição, pagamento, contratação ou reserva de estande pelo site.</p><h2>Ferramentas de preparação</h2><p>O Caderno de visita e o Planejador podem guardar rascunhos no armazenamento local deste navegador. São notas pessoais no dispositivo, sem envio à equipe. Você pode apagar suas respostas dentro de cada ferramenta. Evite dados sensíveis e informações de terceiros.</p><h2>Preferências de animação</h2><p>O controle de animações pode guardar sua escolha neste navegador. A preferência de movimento reduzido do sistema é respeitada. Essa configuração não é enviada à organização.</p><h2>Contato</h2><p>O formulário de dúvidas para lojistas apenas prepara uma mensagem no navegador. Quem deseja expor é encaminhado ao formulário comercial de expositores, que prepara uma mensagem com os dados informados e um link para o WhatsApp comercial da MN Eventos (+55 81 99922-9812). Nada é enviado automaticamente: antes de abrir o link, você pode revisar, copiar ou editar o texto. Ao abrir o link, os dados da mensagem são compartilhados com o WhatsApp, um serviço externo com regras próprias de privacidade. A mensagem só chega à equipe comercial quando você confirma o envio no aplicativo. O site não registra esse interesse em banco de dados nem confirma o recebimento pela equipe. Não informe dados sensíveis. Você revisa, decide o que compartilhar e pode copiar e abrir o <a href={INSTAGRAM_URL} target="_blank" rel="noreferrer">Instagram oficial</a>. Abrir o link não envia a mensagem automaticamente. O serviço externo tem seus próprios controles.</p><h2>Hotéis parceiros</h2><p>Os contatos do guia de 2026 são referências históricas e podem mudar. Links de telefone ou e-mail abrem recursos do seu dispositivo; não efetuam reserva. Consulte as condições atuais diretamente com o hotel ou a organização.</p><h2>Arquivos e impressão</h2><p>Downloads e impressões podem conter o que digitou. Reveja o conteúdo antes de compartilhá-lo.</p><h2>Serviços externos</h2><p>Fontes, imagens e infraestrutura podem ser fornecidas por serviços externos. A contagem opcional de cliques é desativada inicialmente e pode ser alterada no rodapé. Os eventos de cliques não incluem dados de contato. Nenhum CRM ou analytics externo está conectado. A organização deverá confirmar responsável, contato de privacidade e prazo de retenção antes do uso público. As regras da infraestrutura e dos serviços continuam aplicáveis.</p><h2>Informações do evento</h2><p>O calendário apresenta datas anunciadas. A entrada para lojistas com CNPJ, inclusive MEI, é gratuita. Local, horários, credenciamento, participantes e condições de cada edição precisam ser confirmados pela organização.</p><Link href="/" className="btn btn-outline">Voltar ao circuito <ArrowUpRight size={20}/></Link></div></section>;}
export function NotFound(){return <section className="section"><div className="container page-heading"><span className="eyebrow">PÁGINA NÃO ENCONTRADA</span><h1>Vamos voltar<br/>para a feira?</h1><p>Este endereço não está disponível na prévia.</p><Link href="/" className="btn btn-primary">Ir para a página inicial <ArrowUpRight size={20}/></Link></div></section>;}
