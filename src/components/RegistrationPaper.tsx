import { ArrowRight } from 'lucide-react';
import BrandVector from './BrandVector';
import KitSticker from './KitSticker';
import '../kit-live.css';

export default function RegistrationPaper() {
  return <section className="kit-registration" id="credenciamento" aria-labelledby="kit-registration-title">
    <BrandVector kind="waveBlueTop" className="kit-wave kit-wave-top" />
    <div className="container kit-registration-inner">
      <div className="kit-registration-paper">
        <span className="eyebrow">ORIENTAÇÕES PARA SUA VISITA</span>
        <h2 id="kit-registration-title">Credenciamento<br />para 2027.</h2>
        <p>Confira na página de lojistas quem pode visitar e como funciona a retirada da credencial.</p>
        <a href="/lojistas#cadastro" className="btn btn-primary">Ver etapas da visita <ArrowRight size={19} /></a>
      </div>
      <aside className="kit-registration-status">
        <KitSticker kind="confetti" /><BrandVector kind="star" />
        <strong>Formulário de 2027<br />a disponibilizar</strong>
        <p>O link oficial ainda será informado pela organização. Esta prévia não realiza nem confirma inscrições.</p>
        <a href="#circuito">Escolher cidade e consultar a data <ArrowRight size={18} /></a>
      </aside>
    </div>
    <BrandVector kind="waveBlueBottom" className="kit-wave kit-wave-bottom" />
  </section>;
}
