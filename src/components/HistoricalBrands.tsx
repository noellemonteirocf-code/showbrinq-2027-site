import { useMemo, useState } from 'react';
import { ArrowRight, Search } from 'lucide-react';
import { historicalBrands, type HistoricalBrand } from '../historicalBrands';
import '../historical-brands.css';
import KitSticker from './KitSticker';

const stateFilters = [
  { code: 'TODOS', label: 'Todos os estados' },
  { code: 'PE', label: 'Pernambuco · PE' },
  { code: 'BA', label: 'Bahia · BA' },
  { code: 'MA', label: 'Maranhão · MA' },
  { code: 'GO', label: 'Goiás · GO' },
  { code: 'CE', label: 'Ceará · CE' },
  { code: 'ES', label: 'Espírito Santo · ES' },
];

function searchKey(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR').trim();
}

function BrandCard({ brand }: { brand: HistoricalBrand }) {
  const [imageFailed, setImageFailed] = useState(false);
  const hasImage = Boolean(brand.logo) && !imageFailed;

  return (
    <article className={`hb-card ${hasImage ? '' : 'hb-card--text'}`}>
      {hasImage && <div className="hb-card__logo"><img src={brand.logo} alt={brand.name} loading="lazy" onError={() => setImageFailed(true)} /></div>}
      <div className="hb-card__details">
        <h3>{brand.name}</h3>
        {brand.states.length > 0 && (
          <p className="hb-card__states" aria-label={`Pastas estaduais: ${brand.states.join(', ')}`}>
            {brand.states.map((state) => <span key={state}>{state}</span>)}
          </p>
        )}
      </div>
    </article>
  );
}

export function HistoricalBrands({ compact = false, funnel = false }: { compact?: boolean; funnel?: boolean }) {
  const [query, setQuery] = useState('');
  const [activeState, setActiveState] = useState('TODOS');
  const [visibleLimit, setVisibleLimit] = useState(24);
  const normalizedQuery = useMemo(() => searchKey(query), [query]);

  const filtered = useMemo(() => historicalBrands.filter((brand) => {
    const matchesQuery = !normalizedQuery || searchKey(brand.name).includes(normalizedQuery);
    const matchesState = activeState === 'TODOS' || brand.states.includes(activeState);
    return matchesQuery && matchesState;
  }).sort((a,b) => Number(Boolean(b.logo))-Number(Boolean(a.logo)) || a.name.localeCompare(b.name,'pt-BR')), [activeState, normalizedQuery]);

  const compactBrands = useMemo(() => {
    // A amostra compacta privilegia os logos prontos já presentes no site.
    const existingSiteLogos = filtered.filter((brand) => brand.logo?.startsWith('/assets/brand-'));
    const otherAvailable = filtered.filter((brand) => brand.logo && !brand.logo.startsWith('/assets/brand-'));
    const namesOnly = filtered.filter((brand) => !brand.logo);
    return [...existingSiteLogos, ...otherAvailable, ...namesOnly].slice(0, 12);
  }, [filtered]);

  const visibleBrands = compact ? compactBrands : filtered.slice(0, visibleLimit);
  const Heading = compact ? 'h2' : 'h1';
  const countText = `${new Intl.NumberFormat('pt-BR').format(filtered.length)} ${filtered.length === 1 ? 'nome' : 'nomes'} no acervo`;

  return (
    <section className={`hb-section ${compact ? 'hb-section--compact' : 'hb-section--full'}`} id="marcas" aria-labelledby="hb-heading">
      <div className="hb-inner">
        <KitSticker kind="star" className="hb-kit-star" />
        <div className="hb-heading-row">
          <div>
            <span className="hb-eyebrow">ACERVO HISTÓRICO · PARTICIPANTES 2026</span>
            <Heading id="hb-heading">{funnel ? "Marcas que já fizeram parte dessa história." : "Expositores de 2026"}</Heading>
          </div>
          <p className="hb-intro">
            Uma memória visual do encontro, organizada pelos estados presentes no material recebido.
          </p>
        </div>

        <p className="hb-disclaimer">
          Marcas do acervo de 2026 enviado pela SHOWBRINQ. Explore por estado ou procure um nome. A seleção histórica não é uma lista completa da feira nem confirmação de participação em 2027.
        </p>

        <div className="hb-controls">
          <label className="hb-search">
            <Search size={19} aria-hidden="true" />
            <input
              type="search"
              aria-label="Buscar expositor de 2026"
              placeholder="Buscar por nome"
              value={query}
              onChange={(event) => { setQuery(event.target.value); setVisibleLimit(24); }}
            />
          </label>
          <div className="hb-filters" role="group" aria-label="Filtrar catálogo por estado">
            {stateFilters.map((filter) => (
              <button
                key={filter.code}
                type="button"
                aria-pressed={activeState === filter.code}
                aria-label={filter.label}
                onClick={() => { setActiveState(filter.code); setVisibleLimit(24); }}
              >
                {filter.code === 'TODOS' ? 'Todos' : filter.code}
              </button>
            ))}
          </div>
        </div>

        <div className="hb-results" role="status" aria-live="polite">
          <strong>{countText}</strong>
          <span>{compact ? 'Uma seleção abaixo; explore a página do acervo para ver mais.' : 'Registros do material recebido, com imagens quando disponíveis.'}</span>
        </div>

        <h2 className="sr-only">Marcas do acervo histórico de 2026</h2>

        {visibleBrands.length > 0 ? (
          <div className={compact ? 'hb-grid hb-grid--rail' : 'hb-grid'} tabIndex={0} role="region" aria-label="Marcas do acervo histórico de 2026">
            {visibleBrands.map((brand) => <BrandCard key={brand.id} brand={brand} />)}
          </div>
        ) : (
          <div className="hb-empty">
            <strong>Nenhum expositor encontrado nesta seleção.</strong>
            <span>Revise o nome ou escolha outro estado para continuar explorando o acervo.</span>
          </div>
        )}

        {!compact && visibleBrands.length < filtered.length && (
          <button className="hb-more" type="button" onClick={() => setVisibleLimit((limit) => Math.min(limit + 24, filtered.length))}>
            Mostrar mais {Math.min(24, filtered.length - visibleBrands.length)}
          </button>
        )}

        {compact && (
          <a className="hb-cta" href="/expositores-2026">
            Explorar o acervo de 2026 <ArrowRight size={18} aria-hidden="true" />
          </a>
        )}
      </div>
    </section>
  );
}

export default function Exhibitors2026Page() {
  return <HistoricalBrands />;
}
