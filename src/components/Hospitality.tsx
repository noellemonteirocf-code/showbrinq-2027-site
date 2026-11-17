import { Link } from 'wouter';
import { ArrowUpRight, MapPin, Phone } from 'lucide-react';
import { hotelPartners, resolveHospitalityCity } from '../hospitality';
import '../hospitality.css';

type HospitalityProps = { city?: string; compact?: boolean };

export function Hospitality({ city, compact = true }: HospitalityProps) {
  const edition = resolveHospitalityCity(city);
  const cityHotels = edition ? hotelPartners.filter((hotel) => hotel.cityId === edition.id) : [];
  const cityLabel = edition?.city ?? city?.trim();
  const hotelHref = `/hoteis-parceiros${edition ? `?cidade=${encodeURIComponent(edition.id)}` : ''}#hotel-guide`;

  return (
    <section className={`hospitality-preview${compact ? ' hospitality-preview-compact' : ''}`} aria-labelledby="hospitality-preview-title">
      <div className="hospitality-container hospitality-preview-layout">
        <div className="hospitality-preview-copy">
          <p className="hospitality-eyebrow">HOSPEDAGEM · GUIA 2026</p>
          <h2 id="hospitality-preview-title">Vai viajar para a Showbrinq?</h2>
          <p>Fornecedores, representantes e lojistas de outras cidades também precisam planejar a hospedagem. Reunimos os contatos dos hotéis parceiros de 2026 para ajudar nessa pesquisa. As parcerias e as condições de 2027 ainda serão confirmadas.</p>
          {cityLabel && <p className="hospitality-preview-destination"><MapPin size={22} aria-hidden="true" /> Cidade selecionada: <strong>{cityLabel}</strong></p>}
          {edition && cityHotels.length === 0 && (
            <p className="hospitality-preview-unlisted">Ainda não há hotéis informados para {edition.city} no guia disponível. Consulte a organização sobre hospedagem para essa edição.</p>
          )}
          {!edition && !city && (
            <p className="hospitality-preview-note"><strong>Guia disponível: edição 2026.</strong> Confirme com a organização quais opções se aplicam ao circuito 2027 e fale diretamente com o hotel antes de reservar.</p>
          )}
          <div className="hospitality-preview-actions">
            <Link className="hospitality-button hospitality-button-primary" href={hotelHref}>Ver hotéis e contatos <ArrowUpRight size={22} aria-hidden="true" /></Link>
          </div>
        </div>

        {cityHotels.length > 0 && (
          <div className="hospitality-preview-hotels" aria-label={`Hotéis listados no guia 2026 para ${edition?.city}`}>
            {cityHotels.map((hotel) => (
              <article className="hospitality-preview-hotel" key={hotel.id}>
                <div><span>{hotel.city} · {hotel.uf}</span><h3>{hotel.name}</h3></div>
                {(!compact) && <p>{hotel.address}</p>}
                {hotel.phones.map((phone) => (
                  <a className="hospitality-preview-phone" href={phone.href} key={phone.href}>
                    <Phone size={22} aria-hidden="true" /> {phone.label}
                  </a>
                ))}
              </article>
            ))}
            <p className="hospitality-preview-footnote">Contatos conforme guia 2026; confirme diretamente. A presença no guia não confirma condições para 2027.</p>
          </div>
        )}
        {!edition && !city && (
          <aside className="hospitality-preview-guide" aria-label="Cidades do guia de hospedagem de 2026">
            <span>HOTÉIS PARCEIROS · 2026</span>
            <strong>Hotéis parceiros indicados para acompanhar o circuito</strong>
            <div className="hospitality-preview-cities"><span>Caruaru</span><span>Feira de Santana</span><span>São Luís</span><span>Goiânia</span><span>Fortaleza</span></div>
            <small>A lista do circuito 2027 está em atualização.</small>
            <Link className="hospitality-button hospitality-button-secondary" href="/hoteis-parceiros#hotel-guide">Consultar hotéis e contatos <ArrowUpRight size={22} aria-hidden="true" /></Link>
          </aside>
        )}
        {edition && cityHotels.length === 0 && (
          <aside className="hospitality-preview-guide" aria-label={`Referências de hospedagem para ${edition.city}`}>
            <span>GUIA DE HOSPEDAGEM · 2026</span>
            <strong>Não há hotel dessa cidade no guia disponível.</strong>
            <small>As opções para 2027 ainda serão confirmadas pela organização.</small>
            <Link className="hospitality-button hospitality-button-secondary" href={hotelHref}>Consultar guia de 2026 <ArrowUpRight size={22} aria-hidden="true" /></Link>
          </aside>
        )}
      </div>
    </section>
  );
}
