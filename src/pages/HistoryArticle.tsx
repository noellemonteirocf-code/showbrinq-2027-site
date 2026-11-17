import { ArrowRight, ArrowUpRight, CalendarDays, HeartHandshake, Lightbulb, Package, Store } from 'lucide-react';
import { Link } from 'wouter';
import { eventHero } from '../eventMedia';

const reelUrl = 'https://www.instagram.com/reel/C8ExuH6Os5Z/?mdxt=MTM4cnZ6bmlwYmU3Zg==';

const storySteps = [
  { number: '01', emoji: '📦', title: 'Uma necessidade real', text: 'Não era possível levar os mostruários a todos os clientes.' },
  { number: '02', emoji: '👀', title: 'Um showroom', text: 'Os clientes passaram a ser convidados para conhecer os produtos reunidos.' },
  { number: '03', emoji: '🤝', title: 'Uma feira de negócios', text: 'O encontro aproximou profissionais de diferentes etapas do setor.' },
  { number: '04', emoji: '🗺️', title: 'Outras regiões', text: 'A expansão veio a partir de pedidos das fábricas, de proprietários e gerentes.' },
];

export default function HistoryArticle() {
  return (
    <div className="history-page">
      <section className="history-hero">
        <div className="history-hero-burst" aria-hidden="true" />
        <div className="container history-hero-grid">
          <div className="history-hero-copy">
            <div className="breadcrumb"><Link href="/blog">Conteúdos</Link><span>/</span>História da SHOWBRINQ</div>
            <span className="history-kicker"><span aria-hidden="true">✦</span> NOSSA HISTÓRIA</span>
            <h1>A Showbrinq tem uma história. <em>E ela começa com pessoas.</em></h1>
            <p>A SHOWBRINQ nasceu de uma ideia para aproximar quem apresenta brinquedos de quem quer conhecê-los de perto.</p>
            <a className="history-hero-link" href={reelUrl} target="_blank" rel="noopener noreferrer">
              Veja o relato da equipe no Instagram <ArrowUpRight size={18} />
            </a>
          </div>
          <div className="history-hero-art">
            <figure className="history-photo-frame">
              <img src={eventHero.photo} alt="Registro histórico de lojistas conhecendo produtos no showroom da SHOWBRINQ" />
              <figcaption>ACERVO HISTÓRICO SHOWBRINQ</figcaption>
            </figure>
            <span className="history-floating-sticker history-sticker-teddy" aria-hidden="true">🧸</span>
            <span className="history-floating-sticker history-sticker-kite" aria-hidden="true">🪁</span>
            <span className="history-floating-sticker history-sticker-sparkle" aria-hidden="true">✨</span>
            <div className="history-hero-stamp"><HeartHandshake size={23} /><span>Onde o mercado<br />de brinquedos se encontra.</span></div>
          </div>
        </div>
      </section>

      <section className="section history-article-section">
        <div className="container history-article-layout">
          <aside className="history-contents">
            <strong>NESTE ARTIGO</strong>
            <a href="#origem">A origem</a>
            <a href="#showroom">A ideia do showroom</a>
            <a href="#feira">Do showroom à feira</a>
            <a href="#expansao">A expansão</a>
            <a href="#proposito">O propósito que continua</a>
          </aside>

          <article className="history-article-copy">
            <p className="history-article-lead">Antes de ser um circuito de encontros presenciais, a SHOWBRINQ começou com uma pergunta prática: como mostrar produtos a clientes quando não era possível levar os mostruários até todos eles?</p>

            <section id="origem" className="history-copy-section">
              <span className="history-section-marker"><HeartHandshake size={19} /> PESSOAS NO COMEÇO</span>
              <h2>A história começa no trabalho de representação comercial.</h2>
              <p>A feira de negócios nasceu para aproximar pessoas em torno do mercado de brinquedos. A história não se resume a um espaço ou a uma data: começa com gente que conhecia de perto o trabalho de apresentar produtos, conversar com clientes e criar relações comerciais.</p>
              <p>É esse lado humano que dá sentido ao nome SHOWBRINQ. Por trás dos catálogos e das novidades estão fabricantes, distribuidores, representantes e lojistas — profissionais que fazem o setor acontecer.</p>
            </section>

            <section id="showroom" className="history-copy-section">
              <span className="history-section-marker"><Lightbulb size={19} /> A IDEIA</span>
              <h2>Um showroom resolveu um desafio do dia a dia.</h2>
              <p>No relato publicado pelo perfil oficial da SHOWBRINQ, a origem do evento é ligada à experiência de representação comercial da MIB Representações. Havia uma dificuldade: transportar mostruários para visitar cada cliente não era viável.</p>
              <p>A alternativa foi reunir os produtos em um showroom e convidar os clientes para conhecê-los no mesmo lugar. Em vez de depender de uma apresentação de cada vez, as pessoas podiam ver as peças de perto — “ao vivo e a cores”, como conta o vídeo.</p>
            </section>

            <div className="history-story-steps" aria-label="Etapas da história contada pela equipe">
              {storySteps.map(step => (
                <article className="history-step-card" key={step.number}>
                  <span className="history-step-emoji" aria-hidden="true">{step.emoji}</span>
                  <span className="history-step-number">{step.number}</span>
                  <h3>{step.title}</h3>
                  <p>{step.text}</p>
                </article>
              ))}
            </div>

            <section id="feira" className="history-copy-section">
              <span className="history-section-marker"><Package size={19} /> O ENCONTRO</span>
              <h2>Do showroom nasceu uma feira de negócios.</h2>
              <p>O showroom foi o primeiro passo. Com o tempo, a proposta ganhou formato de feira: um lugar para fabricantes, distribuidores, representantes comerciais e lojistas se encontrarem, conhecerem linhas de produtos e conversarem sobre o varejo de brinquedos e presentes.</p>
              <p>Para o lojista, estar diante de diferentes opções ajuda a observar lançamentos, acompanhar assuntos do mercado e comparar preços e condições de compra em quantidade. Cada fornecedor define seus próprios termos; a feira não promete menor preço nem resultado comercial.</p>
            </section>

            <section id="expansao" className="history-copy-section history-color-block">
              <span className="history-section-marker"><Store size={19} /> A EXPANSÃO</span>
              <h2>A feira também cresceu ouvindo o setor.</h2>
              <p>O Reel conta que a realização em outras regiões aconteceu a partir da necessidade e dos pedidos das próprias fábricas, de seus proprietários e gerentes. A ideia foi levar o encontro a outros lugares quando os participantes viram valor em aproximar o mercado regionalmente.</p>
              <p>Assim, a feira se desenvolveu em diálogo com quem fazia parte dela: os encontros passaram a acompanhar a necessidade de aproximar produtos e compradores em outras regiões.</p>
            </section>

            <section id="proposito" className="history-copy-section">
              <span className="history-section-marker"><CalendarDays size={19} /> HOJE E ADIANTE</span>
              <h2>Uma feira para aproximar clientes de todos os portes.</h2>
              <p>Entre as mensagens do relato está a importância de receber clientes pequenos e grandes com a mesma consideração. O propósito que atravessa a história é conectar quem produz, quem distribui, quem representa e quem vende — sem perder de vista as pessoas por trás de cada empresa.</p>
              <p>Esse caminho segue no Circuito SHOWBRINQ 2027, com datas anunciadas em seis cidades. Os detalhes de endereço e horário devem ser acompanhados na página de cada edição e confirmados pela organização.</p>
            </section>

            <aside className="history-source-card">
              <div className="history-source-emoji" aria-hidden="true">🎥</div>
              <div><span className="eyebrow">A HISTÓRIA CONTADA PELA EQUIPE</span><h3>Veja o Reel original da SHOWBRINQ</h3><p>O vídeo apresenta a ideia do showroom, o perfil da feira e o movimento de expansão para outras regiões.</p></div>
              <a href={reelUrl} target="_blank" rel="noopener noreferrer" aria-label="Abrir o Reel original da SHOWBRINQ no Instagram">Assistir <ArrowUpRight size={18} /></a>
            </aside>

            <section className="history-faq" aria-labelledby="history-faq-title">
              <h2 id="history-faq-title">Perguntas sobre a história da SHOWBRINQ</h2>
              <details><summary>Qual é a origem da SHOWBRINQ?</summary><p>A feira começou a partir de um showroom criado para reunir produtos e convidar clientes a conhecer as peças de perto.</p></details>
              <details><summary>Como surgiu a ideia da feira?</summary><p>O relato da equipe liga o início da feira a um showroom criado porque não era possível levar mostruários a todos os clientes da representação comercial.</p></details>
              <details><summary>Quem se encontra na SHOWBRINQ?</summary><p>Fabricantes, distribuidores, representantes comerciais e lojistas do setor de brinquedos e presentes.</p></details>
            </section>

            <div className="history-final-cta">
              <span className="history-cta-toy" aria-hidden="true">🧩</span>
              <span className="eyebrow">A HISTÓRIA CONTINUA NOS ENCONTROS</span>
              <h2>Conheça a SHOWBRINQ 2027.</h2>
              <p>Escolha o caminho que combina com você: visitar como lojista ou conversar sobre a participação da sua marca.</p>
              <div><Link className="btn btn-primary" href="/lojistas">Quero visitar <ArrowRight size={18} /></Link><Link className="btn btn-outline" href="/expositores">Quero expor <ArrowRight size={18} /></Link></div>
            </div>
          </article>
        </div>
      </section>
    </div>
  );
}
