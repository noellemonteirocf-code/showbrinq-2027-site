import { useEffect, useRef, useState } from 'react';
import BrandVector from './BrandVector';
import { track } from './ExhibitorLeadForm';
import { standModels } from '../standModels';
import type { StandModel } from '../standModels';
import '../stand-models.css';

type StandModelsProps = {
  editorial?: boolean;
  selectedModel?: string;
  onSelect?: (id: string) => void;
};

export default function StandModels({ selectedModel, onSelect, editorial=false }: StandModelsProps) {
  const [localSelection, setLocalSelection] = useState<string | undefined>();
  const [expandedModel, setExpandedModel] = useState<StandModel | undefined>();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!expandedModel) return;
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
    closeButtonRef.current?.focus();
  }, [expandedModel]);

  const chooseModel = (model: StandModel) => {
    if (selectedModel === undefined) setLocalSelection(model.id);
    track('stand_interest');
    onSelect?.(model.id);
  };

  const isSelected = (id: string) =>
    selectedModel === undefined ? localSelection === id : selectedModel === id;

  const activeSelection = standModels.find(model => isSelected(model.id));

  return (
    <section
      className="sb-stand-models"
      id="modelos-estandes"
      aria-labelledby="sb-stand-models-title"
    >
      <div className="sb-stand-container">
        <header className="sb-stand-heading">
          <p className="sb-stand-eyebrow">{editorial ? "SEU ESPAÇO NA FEIRA" : "Projetos oficiais · Tomé Eventos"}</p>
          <h2 id="sb-stand-models-title">{editorial ? "Que espaço sua linha de produtos precisa?" : "Quatro configurações. Diferentes formas de apresentar sua linha."}</h2>
          <p className="sb-stand-intro">
            {editorial ? "Cada empresa tem uma forma de apresentar seus produtos. Conheça os quatro modelos oficiais de estandes da Showbrinq e veja qual configuração pode ser um ponto de partida para sua participação." : "Compare as opções de prateleiras e visualize os projetos oficiais para identificar a configuração que pode atender às necessidades de exposição dos seus produtos. Amplie os desenhos para conferir os detalhes."}
          </p>
        </header>

        {!editorial && <p className="sb-stand-intro"><strong>Ainda não sabe qual modelo escolher?</strong> Você pode solicitar informações à organização e conversar sobre as configurações antes de definir a estrutura.</p>}
        <div className="sb-stand-grid">
          {standModels.map((model, index) => (
            <article
              className={`sb-stand-card sb-stand-card--${index + 1}`}
              key={model.id}
              aria-labelledby={`sb-stand-title-${model.id}`}
              data-selected={isSelected(model.id)}
            >
              <BrandVector
                kind={index % 2 === 0 ? 'sparkle' : 'starOutline'}
                className="sb-stand-card__corner"
              />
              <header className="sb-stand-card__header">
                <h3 id={`sb-stand-title-${model.id}`}>{model.name}</h3>
                {!editorial && <p className="sb-stand-card__helper">{['Exposição concentrada', 'Exposição superior ampliada', 'Exposição em dois níveis', 'Exposição distribuída'][index]}</p>}
                <p>{model.configuration}</p>
              </header>

              <figure className="sb-stand-card__figure">
                <img
                  src={model.image}
                  alt={`Prancha oficial completa do ${model.name}, com desenho do estande e cotas.`}
                  width="1600"
                  height="1237"
                  loading="lazy"
                  decoding="async"
                />
              </figure>

              {!editorial && <dl className="sb-stand-dimensions" aria-label={`Cotas indicadas no ${model.name}`}>
                <div>
                  <dt>Altura total</dt>
                  <dd>2,70</dd>
                </div>
                <div>
                  <dt>Painel</dt>
                  <dd>2,20</dd>
                </div>
                <div>
                  <dt>Módulo</dt>
                  <dd>0,96</dd>
                </div>
              </dl>}


              <div className="sb-stand-card__links">
                <button
                  className="sb-stand-secondary"
                  type="button"
                  onClick={() => setExpandedModel(model)}
                  aria-haspopup="dialog"
                >
                  {editorial ? "Ampliar projeto" : "Ampliar"}
                </button>
                {!editorial && <a className="sb-stand-secondary" href={model.pdf} target="_blank" rel="noreferrer">
                  Abrir PDF
                </a>}
              </div>

              <a
                className="sb-stand-cta"
                href="#contato"
                role="button"
                aria-pressed={isSelected(model.id)}
                onClick={event => {chooseModel(model);if(editorial){event.preventDefault();setExpandedModel(model);}}}
                onKeyDown={event => {
                  if (event.key === ' ') {
                    event.preventDefault();
                    event.currentTarget.click();
                  }
                }}
              >
                {editorial && isSelected(model.id) ? 'Modelo selecionado' : 'Tenho interesse neste modelo'}
              </a>
            </article>
          ))}
        </div>

        {editorial && <div className="expo-catalog-download"><span className="expo-label">COMPARE ANTES DE DECIDIR</span><h3>Os quatro modelos de estandes em um só catálogo.</h3><p>Consulte os projetos oficiais, compare as configurações e compartilhe o material com sua equipe antes de solicitar informações comerciais.</p><a className="expo-btn" href="/assets/stand-models/catalogo-estandes-showbrinq-2027.pdf" download="Catalogo-de-Estandes-Showbrinq-2027.pdf">Baixar catálogo com os quatro modelos</a><p>PDF · 9 páginas · configurações e comparativo de medidas.</p></div>}
        <div className="sb-stand-notes">
          {!editorial && <><p className="sb-stand-dimension-note">
            {editorial ? "As imagens representam projetos de referência. Medidas, itens incluídos, serviços, valores e disponibilidade para 2027 devem ser confirmados na proposta comercial." : "Cotas do desenho original; unidade não indicada. Área contratada e condições de 2027 a confirmar."}
          </p>
          <p className="sb-stand-credit">
            Projeto: Tomé Eventos. Móveis meramente ilustrativos.
          </p></>}
          <p className="sb-stand-status" role="status" aria-live="polite" aria-atomic="true">
            {activeSelection
              ? `${activeSelection.name} selecionado para conversar. A indicação é local e não configura reserva.`
              : ''}
          </p>
        </div>
      </div>

      <dialog
        className="sb-stand-dialog"
        ref={dialogRef}
        aria-labelledby="sb-stand-dialog-title"
        onClose={() => setExpandedModel(undefined)}
      >
        <div className="sb-stand-dialog__panel">
          <div className="sb-stand-dialog__header">
            <div>
              <p className="sb-stand-eyebrow">Desenho original completo</p>
              <h2 id="sb-stand-dialog-title">{expandedModel?.name ?? 'Modelo de estande'}</h2>
            </div>
            <button
              className="sb-stand-dialog__close"
              type="button"
              ref={closeButtonRef}
              onClick={() => dialogRef.current?.close()}
            >
              Fechar
            </button>
          </div>
          {expandedModel && (
            <img
              className="sb-stand-dialog__image"
              src={expandedModel.image}
              alt={`Prancha original completa do ${expandedModel.name}, ampliada.`}
              width="1600"
              height="1237"
            />
          )}
          {editorial && expandedModel && <div className="expo-stand-dialog-actions"><p>{expandedModel.configuration}</p><button type="button" className="expo-btn" onClick={()=>{chooseModel(expandedModel);dialogRef.current?.close();requestAnimationFrame(()=>{const field=document.getElementById('inquiry-model');field?.scrollIntoView({block:'center',behavior:'instant'});field?.focus({preventScroll:true});});}}>Continuar com {expandedModel.name}</button><p>Você pode alterar o modelo no formulário antes de preparar a mensagem.</p></div>}
          <p className="sb-stand-dialog__credit">
            Projeto: Tomé Eventos. Móveis meramente ilustrativos.
          </p>
        </div>
      </dialog>
    </section>
  );
}
