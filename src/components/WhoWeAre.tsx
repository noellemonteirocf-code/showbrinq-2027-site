import { ArrowRight, ArrowUpRight, HeartHandshake } from 'lucide-react';
import { Link } from 'wouter';
import KitSticker from './KitSticker';

const photoPath = '/manus-storage/quem-somos-showbrinq_76e73ba8.webp';

export default function WhoWeAre() {
  return (
    <section className="section who-we-are" id="quem-somos" aria-labelledby="who-we-are-title">
      <div className="container who-we-are-grid">
        <div className="who-photo-shell">
          <KitSticker kind="heart" className="who-kit-heart" />
          <figure>
            <img
              src={photoPath}
              alt="Duas pessoas sorridentes, com camisas amarelas da SHOWBRINQ, diante dos estandes de brinquedos."
              width={1064}
              height={1100}
              loading="lazy"
              decoding="async"
              onError={event => {
                const image = event.currentTarget;
                if (image.dataset.localFallback) return;
                image.dataset.localFallback = 'true';
                image.src = '/assets/quem-somos-showbrinq.webp';
              }}
            />
            <figcaption>Pessoas que fazem parte da história da SHOWBRINQ.</figcaption>
          </figure>
          <KitSticker kind="squiggle" className="who-kit-squiggle" />
        </div>

        <div className="who-copy">
          <span className="eyebrow">QUEM SOMOS</span>
          <h2 id="who-we-are-title">Uma feira que começou aproximando pessoas e produtos.</h2>
          <p>A SHOWBRINQ surgiu de um showroom criado para que clientes pudessem conhecer os produtos de perto. A ideia cresceu até se tornar uma feira de negócios que aproxima fabricantes, distribuidores, representantes e lojistas.</p>
          <p>É no encontro que os profissionais podem ver lançamentos, conversar sobre linhas e trocar informações sobre o mercado de brinquedos e presentes.</p>
          <div className="who-story-note"><HeartHandshake size={24} /><span>Uma história feita de relações, produtos e encontros presenciais.</span></div>
          <div className="who-actions">
            <Link className="btn btn-primary" href="/blog/historia-showbrinq">Conheça nossa história <ArrowRight size={18} /></Link>
            <a className="who-text-link" href="#circuito">Ver cidades e datas <ArrowUpRight size={17} /></a>
          </div>
        </div>
      </div>
    </section>
  );
}
