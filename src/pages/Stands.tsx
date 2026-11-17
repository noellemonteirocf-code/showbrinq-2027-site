import { useState } from 'react';
import StandModels from '../components/StandModels';
import ExhibitorLeadForm from '../components/ExhibitorLeadForm';

const checks = [
  ['Dimensões e área', 'Consulte as cotas nas pranchas oficiais. A área contratada e as dimensões finais serão confirmadas na proposta da edição.'],
  ['Estrutura e itens incluídos', 'As pranchas mostram configurações de prateleiras. Móveis são ilustrativos; itens incluídos e personalização dependem da proposta oficial.'],
  ['Montagem e desmontagem', 'O manual da edição deverá informar prazos, acesso da equipe, responsabilidades e serviços adicionais. Essas condições estão a confirmar.'],
];

export default function Stands() {
  const [model, setModel] = useState('');
  return (
    <div className="sb-page sb-expo funnel-page">
      <section className="section stands-hero">
        <div className="container stands-hero-grid">
         <div className="stands-hero-copy">
          <span className="eyebrow">MODELOS DE ESTANDES · SHOWBRINQ 2027</span>
          <h1>Sua marca tem muito para mostrar. Escolha como apresentá-la.</h1>
          <p>Na Showbrinq, o estande é onde seus produtos ganham destaque e as conversas com lojistas começam.</p>
          <p>Conheça os quatro modelos disponíveis para consulta, compare as configurações e descubra qual estrutura pode atender melhor à sua linha.</p>
          <a className="btn btn-primary" href="#modelos-estandes">Comparar modelos de estandes</a>
          <p><small>Projetos oficiais · Tomé Eventos. Valores, disponibilidade e itens incluídos sujeitos à confirmação com a organização.</small></p>
         </div>
         <figure className="stands-hero-art">
          <div className="stands-hero-art__main"><img src="/assets/brand-2027/img/stand-1.jpg" alt="Estande montado em uma edição anterior da Showbrinq, com prateleiras de brinquedos e visitantes conversando" width="768" height="1024" fetchPriority="high" decoding="async"/></div>
          <div className="stands-hero-art__second"><img src="/assets/brand-2027/img/stand-3.jpg" alt="" aria-hidden="true" width="768" height="1024" loading="lazy" decoding="async"/></div>
          <img className="stands-hero-art__piece" src="/assets/brand-2027/3d/web/estrela.png" alt="" aria-hidden="true" loading="lazy" decoding="async"/>
          <figcaption>Fotografias reais · acervo de edições anteriores</figcaption>
         </figure>
        </div>
      </section>
      <StandModels selectedModel={model} onSelect={setModel}/>
      <section className="section">
        <div className="container">
          <h2>O que confirmar antes de contratar?</h2>
          <div className="funnel-city-grid">
            {checks.map(([title, description]) => (
              <article key={title}><h3>{title}</h3><p>{description}</p></article>
            ))}
          </div>
          <h2>Da escolha do estande à preparação da sua participação.</h2>
          <ol className="funnel-steps">
            <li><strong>Escolha onde quer estar.</strong> Confira as cidades do Circuito Showbrinq 2027 e identifique as edições de interesse.</li>
            <li><strong>Encontre a configuração para sua linha.</strong> Compare os modelos e avalie suas necessidades de exposição.</li>
            <li><strong>Converse com a organização.</strong> Solicite informações sobre valores, disponibilidade e condições de contratação.</li>
            <li><strong>Planeje sua participação.</strong> Após a contratação, confira as orientações de montagem, desmontagem e acesso da edição escolhida.</li>
          </ol>
        </div>
      </section>
      <ExhibitorLeadForm model={model} onModelChange={setModel} source="stands-page"/>
    </div>
  );
}
