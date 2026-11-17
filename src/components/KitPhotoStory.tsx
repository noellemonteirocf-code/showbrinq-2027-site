import BrandVector from './BrandVector';
import KitSticker from './KitSticker';
import '../kit-live.css';
const records = [
  {src:'/manus-storage/registro-stand-1_7838b128.webp',title:'Produtos de perto',text:'Linhas e detalhes apresentados no showroom.',alt:'Foto fornecida no kit: produtos e profissionais em uma edição anterior da SHOWBRINQ',kind:'star' as const},
  {src:'/manus-storage/registro-stand-2_ea6534c5.webp',title:'Conversas frente a frente',text:'Registros de encontros entre marcas e varejo.',alt:'Foto fornecida no kit: profissionais conversando junto a produtos em uma edição anterior',kind:'heart' as const},
  {src:'/manus-storage/registro-stand-3_eef04ec5.webp',title:'A feira em movimento',text:'O ambiente de uma edição anterior da SHOWBRINQ.',alt:'Foto fornecida no kit: circulação de profissionais entre brinquedos no showroom',kind:'triangle' as const},
];
export default function KitPhotoStory() {
  return <section className="kit-photo-story" aria-labelledby="kit-photo-title"><div className="container">
    <div className="kit-photo-heading"><span className="eyebrow">REGISTROS DE EDIÇÕES ANTERIORES</span><h2 id="kit-photo-title">O encontro acontece de perto.</h2><p>Fotos do acervo fornecido pela organização. Não são projetos de estande nem confirmação de participantes de 2027.</p></div>
    <div className="kit-photo-grid">{records.map((record,index)=><figure key={record.src}>
      <div className={`kit-photo-shape kit-photo-shape-${index}`}><BrandVector kind="blobYellowSoft" /><img src={record.src} alt={record.alt} loading="lazy" /><KitSticker kind={record.kind} /></div>
      <figcaption><h3>{record.title}</h3><p>{record.text}</p></figcaption>
    </figure>)}</div>
  </div></section>;
}
