import CampaignArtwork from '../components/CampaignArtwork';
import { useEffect, useState } from 'react';
import { Link, useSearch } from 'wouter';
import { ArrowUpRight, Download, Image as ImageIcon, Mail, MapPin, Phone, Search } from 'lucide-react';
import {
  hospitalityCities,
  hotelPartners,
  normalizeHospitalityText,
  resolveHospitalityCity,
  type PartnerHotel,
} from '../hospitality';
import '../hospitality.css';

function HotelCard({ hotel }: { hotel: PartnerHotel }) {
  return (
    <article className="hospitality-hotel-card">
      <header className="hospitality-hotel-heading">
        <span className="hospitality-hotel-city">{hotel.city} · {hotel.uf}</span>
        <h2>{hotel.name}</h2>
      </header>
      <div className="hospitality-hotel-detail">
        <MapPin size={22} aria-hidden="true" />
        <div>
          <p>{hotel.address}</p>
          {hotel.addressNote && <p className="hospitality-address-note">{hotel.addressNote}</p>}
        </div>
      </div>
      <div className="hospitality-contact-list" aria-label={`Contatos de ${hotel.name}`}>
        {hotel.phones.map((phone) => (
          <a className="hospitality-contact-link" href={phone.href} key={phone.href}>
            <Phone size={22} aria-hidden="true" />
            <span>{phone.label}</span>
          </a>
        ))}
        {hotel.email && (
          <a className="hospitality-contact-link hospitality-email-link" href={`mailto:${hotel.email}`}>
            <Mail size={22} aria-hidden="true" />
            <span>{hotel.email}</span>
          </a>
        )}
      </div>
      <details className="hospitality-flyer-details">
        <summary><ImageIcon size={22} aria-hidden="true" /> Ver ficha original do guia 2026</summary>
        <img src={hotel.flyer} alt={`Ficha original de ${hotel.name} no guia de hotéis SHOWBRINQ 2026`} loading="lazy" />
      </details>
    </article>
  );
}

function cityFromSearch(search: string): string {
  const queryValue = new URLSearchParams(search).get('cidade');
  return resolveHospitalityCity(queryValue)?.id ?? '';
}

export default function HotelsPage() {
  const search = useSearch();
  const queryCity = cityFromSearch(search);
  const [cityFilter, setCityFilter] = useState(queryCity);
  const [textFilter, setTextFilter] = useState('');

  useEffect(() => setCityFilter(queryCity), [queryCity]);

  const normalizedQuery = normalizeHospitalityText(textFilter);
  const visibleHotels = hotelPartners.filter((hotel) => {
    const matchesCity = !cityFilter || hotel.cityId === cityFilter;
    const searchable = normalizeHospitalityText([
      hotel.name,
      hotel.city,
      hotel.uf,
      hotel.address,
      hotel.phones.map((phone) => phone.label).join(' '),
      hotel.email ?? '',
    ].join(' '));
    return matchesCity && (!normalizedQuery || searchable.includes(normalizedQuery));
  });
  const activeCity = hospitalityCities.find((city) => city.id === cityFilter);

  function clearFilters() {
    setCityFilter('');
    setTextFilter('');
  }

  return (
    <div className="hotels-page">
      <section className="hospitality-page-hero">
        <div className="hospitality-container hospitality-campaign-card"><CampaignArtwork kind="partners"/><div className="hospitality-campaign-copy">
          <p className="hospitality-eyebrow">HOSPEDAGEM · GUIA DE REFERÊNCIA 2026</p>
          <h1>Hotéis do guia de 2026. Informações de 2027 em confirmação.</h1>
          <p className="hospitality-hero-copy">
            Para ajudar no planejamento de viagem, reunimos abaixo os contatos de hospedagem divulgados no guia da Showbrinq 2026. Consulte diretamente os estabelecimentos antes de reservar.
          </p>
          <p className="hospitality-hero-copy">Use os filtros para localizar os hotéis por cidade. A presença no guia de 2026 não confirma parceria ou condições especiais para 2027.</p><p className="hospitality-year-note"><strong>Para 2027:</strong> os hotéis parceiros e as condições de hospedagem serão divulgados após confirmação. O guia de 2026 é uma referência histórica.</p><div className="hospitality-hero-actions">
            <a className="hospitality-button hospitality-button-primary" href="/assets/hoteis-parceiros-2026.pdf" download="hoteis-parceiros-2026.pdf">
              <Download size={22} aria-hidden="true" /> Baixar guia de hotéis · 2026
            </a>
            <Link className="hospitality-button hospitality-button-secondary" href="#hotel-guide">
              Ver contatos do guia 2026 <ArrowUpRight size={22} aria-hidden="true" />
            </Link>
          </div>
        </div></div>
      </section>

      <section className="hospitality-list-section" id="hotel-guide" aria-labelledby="hospitality-list-heading">
        <div className="hospitality-container">
          <div className="hospitality-list-intro">
            <div>
              <p className="hospitality-eyebrow">CONTATOS CONFORME O GUIA 2026</p>
              <h2 id="hospitality-list-heading">Encontre por cidade ou hotel</h2>
            </div>
            <p className="hospitality-contact-notice">Contatos conforme guia 2026, confirme diretamente. Telefones e e-mails abrem o aplicativo correspondente; o site não faz reservas nem pagamentos.</p>
          </div>

          <div className="hospitality-filter-panel">
            <label className="hospitality-search-field">
              <span>Buscar por hotel, endereço ou contato</span>
              <span className="hospitality-input-wrap">
                <Search size={22} aria-hidden="true" />
                <input
                  type="search"
                  value={textFilter}
                  onChange={(event) => setTextFilter(event.currentTarget.value)}
                  placeholder="Ex.: Fortaleza, Meireles, telefone"
                />
              </span>
            </label>
            <label className="hospitality-city-field">
              <span>Filtrar por cidade</span>
              <select value={cityFilter} onChange={(event) => setCityFilter(event.currentTarget.value)}>
                <option value="">Todas as cidades</option>
                {hospitalityCities.map((city) => <option value={city.id} key={city.id}>{city.city} · {city.uf}</option>)}
              </select>
            </label>
            {(cityFilter || textFilter) && (
              <button className="hospitality-clear-button" type="button" onClick={clearFilters}>Limpar filtros</button>
            )}
          </div>

          <p className="hospitality-results-count" aria-live="polite">
            {visibleHotels.length} {visibleHotels.length === 1 ? 'hotel encontrado' : 'hotéis encontrados'}
            {activeCity ? ` para ${activeCity.city}` : ' no guia'}.
          </p>

          {visibleHotels.length ? (
            <div className="hospitality-hotel-grid">
              {visibleHotels.map((hotel) => <HotelCard key={hotel.id} hotel={hotel} />)}
            </div>
          ) : (
            <div className="hospitality-empty-state">
              <MapPin size={26} aria-hidden="true" />
              <h2>{activeCity ? `Ainda não há hotéis informados para ${activeCity.city}.` : 'Nenhum hotel corresponde à busca.'}</h2>
              <p>{activeCity ? 'Consulte a organização sobre hospedagem para essa edição; não há parceiro listado dessa cidade no guia disponível.' : 'Tente outro nome, endereço ou cidade. Os filtros não alteram os contatos publicados no guia.'}</p>
              <button type="button" className="hospitality-button hospitality-button-secondary" onClick={clearFilters}>Ver todos os hotéis do guia 2026 <ArrowUpRight size={22} aria-hidden="true" /></button>
            </div>
          )}

          <aside className="hospitality-caveat" aria-label="Aviso sobre as informações do guia">
            <strong>Antes de reservar</strong>
            <p>O guia apresenta contatos de 2026. A presença nesta página não confirma parceria, tarifas, descontos, inclusões ou disponibilidade para 2027. Confirme condições, datas e disponibilidade diretamente com o hotel e consulte a organização.</p>
          </aside>
        </div>
      </section>
    </div>
  );
}
