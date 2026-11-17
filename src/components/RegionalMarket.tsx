import SaoPauloVideo from './SaoPauloVideo';
import { Link } from 'wouter';
import type { Edition } from '../data';
export { regionalStrategy as regionalMarket } from '../../shared/regional-strategy';
import { regionalStrategy as regionalMarket } from '../../shared/regional-strategy';
export function SaoPauloSpotlight(){return <section className="sp-announcement sp-announcement-compact" id="estreia-sao-paulo" aria-label="Primeira edição da Showbrinq no estado de São Paulo"><SaoPauloVideo/><div className="container sp-compact-actions"><div><h2>Faça parte da estreia em Piracicaba.</h2><p>17 a 19 de agosto de 2027 · Consulte formatos e condições de exposição.</p></div><div className="sp-compact-links"><Link className="btn btn-primary" href="/expositores?cidade=piracicaba#contato">Quero expor na estreia</Link><Link href="/edicoes/piracicaba#mercado-regional">Conhecer a edição →</Link></div></div></section>;}
const experienceCopy: Record<string, {heading:string;intro:string;action:string}> = {
 MA:{heading:'O que pode começar quando um lojista conhece seu produto de perto?',intro:'Ele observa os detalhes, pergunta sobre as condições comerciais e imagina como aquele brinquedo poderia fazer parte do mix da loja. É nesse contato que uma apresentação pode despertar interesse.',action:'Na Showbrinq São Luís, fabricantes e distribuidores poderão mostrar suas linhas, conhecer profissionais do varejo e iniciar conversas que podem continuar depois do evento.'},
 CE:{heading:'O que o lojista percebe ao ver seu produto funcionando?',intro:'Um mecanismo em movimento, um material ao alcance das mãos, uma dúvida respondida na hora. Em Fortaleza, a demonstração pode dar ao comprador uma visão da linha que o catálogo sozinho não oferece.',action:'Apresente os usos de cada brinquedo e escute o que a loja procura. Para quem visita, é o momento de conhecer produtos e conversar com quem explica como eles são fornecidos.'},
 PE:{heading:'Ajude o lojista a imaginar seu produto nas prateleiras.',intro:'Uma loja pode procurar uma nova categoria; outra, completar uma linha que já vende. No encontro em Caruaru, mostre as opções do seu portfólio e conheça o que faz sentido para cada comprador.',action:'Converse sobre variedades, pedidos e prazos. Para o lojista, ver os produtos de perto ajuda a preparar perguntas e avaliar possibilidades para o mix.'},
 BA:{heading:'Mostre o que está por trás da escolha de um brinquedo.',intro:'O toque do material, uma função inesperada, o cuidado com a embalagem. Em Feira de Santana, sua equipe pode apresentar detalhes que ajudam o lojista a entender o valor de cada linha.',action:'Abra espaço para perguntas sobre os produtos e as condições de fornecimento. Quem visita pode comparar opções e conhecer as empresas por trás delas.'},
 GO:{heading:'Uma apresentação pode abrir espaço para a próxima conversa.',intro:'Em Goiânia, o contato presencial permite ir além da lista de produtos: entender o que a loja busca, apresentar sua forma de atender e esclarecer como funcionam pedidos e reposição.',action:'Mostre sua linha e conheça as perguntas do comprador. Para o lojista, a conversa é uma oportunidade de avaliar produtos e entender como cada fornecedor trabalha.'},
 SP:{heading:'Um novo encontro para sua marca no estado de São Paulo.',intro:'Piracicaba será o cenário da estreia. Fabricantes e distribuidores poderão apresentar suas linhas presencialmente; lojistas poderão descobrir produtos e conhecer fornecedores.',action:'Leve os diferenciais que merecem uma demonstração e as perguntas que ajudam a conhecer cada loja. A primeira edição é um convite para avaliar sua presença nessa nova etapa do circuito.'}
};
export default function RegionalMarket({edition:e}:{edition:Edition}) {
 const m=regionalMarket[e.uf];const experience=experienceCopy[e.uf];
 if(!m)return null;
 return <section className="section regional-market regional-market--experience" id="mercado-regional">
  <div className="container">
   <span className="eyebrow">ENCONTROS QUE MOVEM NEGÓCIOS · {e.city.toUpperCase()}</span>
   <div className="regional-market-grid">
    <div>
     <h2>{experience.heading}</h2>
     <p>{experience.intro}</p>
     <p>{experience.action}</p>
     <Link className="btn btn-primary" href={`/expositores?cidade=${e.id}#contato`}>Quero expor em {e.city}</Link>
    </div>
    <aside className="regional-stat regional-experience-card">
     <span className="eyebrow">O VALOR DO ENCONTRO PRESENCIAL</span>
     <h3>Seu catálogo apresenta. A conversa aproxima.</h3>
     <p>Mostre acabamento, funcionamento e diferenciais. Escute as perguntas do lojista e explique como sua empresa trabalha com pedidos e reposição.</p>
     <Link href={`/estandes?cidade=${e.id}`}>Conhecer modelos de estandes →</Link>
    </aside>
   </div>
   <h3 className="regional-preparation-title">Prepare sua conversa comercial</h3>
   <div className="regional-questions">{m.questions.map((q,i)=><article key={q}><span>0{i+1}</span><h3>{q}</h3></article>)}</div>
   <nav className="regional-context-links" aria-label="Planejar participação">
    <Link href={`/estandes?cidade=${e.id}`}>Conhecer modelos de estandes →</Link>
    <Link href="/circuito-2027#cidades">Comparar as etapas do circuito →</Link>
    <Link href="/blog/brinquedos-criancas-adultos-mercado-2025">Ler análises do mercado no blog →</Link>
   </nav>
  </div>
 </section>;
}
