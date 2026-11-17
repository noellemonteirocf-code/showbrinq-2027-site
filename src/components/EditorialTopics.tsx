import BrandVector from './BrandVector';
import KitSticker from './KitSticker';

const topics = [
  { kind: 'blocks' as const, title: 'Planejar uma visita', text: 'Informações práticas para escolher a cidade, fazer o cadastro e chegar à feira.' },
  { kind: 'star' as const, title: 'Comprar em quantidade', text: 'Ideias para organizar perguntas e comparar condições conversando com cada fornecedor.' },
  { kind: 'confetti' as const, title: 'Lançamentos e tendências', text: 'Novidades do setor com contexto, apuração e fontes identificadas.' },
  { kind: 'triangle' as const, title: 'Apresentar uma marca', text: 'Pontos para conversar com a organização antes de avaliar uma participação.' },
];

export default function EditorialTopics({ compact = false }: { compact?: boolean }) {
  return <section className={`kit-editorial-topics${compact ? ' is-compact' : ''}`} aria-labelledby="kit-editorial-title">
    <div className="kit-editorial-heading"><span className="eyebrow">EM PREPARAÇÃO</span><h2 id="kit-editorial-title">Conteúdos úteis, sem enrolação.</h2><p>Estamos preparando guias para apoiar as conversas e decisões de quem trabalha com brinquedos e presentes.</p><BrandVector kind="sparkle" /></div>
    <div className="kit-editorial-grid">{topics.map(topic => <article key={topic.title} className="kit-editorial-card">
      <div className="kit-editorial-illustration"><BrandVector kind="blobPinkSoft" /><KitSticker kind={topic.kind} /></div>
      <div><span className="kit-editorial-status">Guia em preparação</span><h3>{topic.title}</h3><p>{topic.text}</p></div>
    </article>)}</div>
  </section>;
}
