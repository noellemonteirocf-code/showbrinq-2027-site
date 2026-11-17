import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Check,
  ClipboardList,
  Copy,
  Download,
  Eye,
  GripVertical,
  Instagram,
  NotebookPen,
  Plus,
  Printer,
  RotateCcw,
  Trash2,
  X,
} from 'lucide-react';
import { APP_NAME, INSTAGRAM_URL } from '../config';
import { downloadText, editions, type Edition } from '../data';
import '../tools.css';

export type ToolsProps = { kind: 'visit' | 'exhibit' };

type ToolKind = ToolsProps['kind'];
type ConversationCard = {
  supplier: string;
  product: string;
  confirm: string;
  nextStep: string;
  followUpDate: string;
  notes: string;
};

type VisitDraft = {
  kind: 'visit';
  cities: string;
  objectives: string[];
  otherObjective: string;
  research: string;
  comparisons: string[];
  otherComparison: string;
  questions: string[];
  ownQuestion: string;
  storeInfo: string[];
  otherStoreInfo: string;
  confirmations: string[];
  otherConfirmation: string;
  decisionMakers: string;
  takeAlong: string[];
  otherTakeAlong: string;
  internalNotes: string;
  conversations: ConversationCard[];
};

type ExhibitDraft = {
  kind: 'exhibit';
  cities: string[];
  lineCategory: string;
  objectives: string[];
  otherObjective: string;
  spaceQuestions: string[];
  commercialQuestions: string[];
  otherCommercialQuestion: string;
  operationalQuestions: string[];
  otherOperationalQuestion: string;
  preparation: string[];
  otherPreparation: string;
  decisionMakers: string;
  criteria: string[];
  otherCriterion: string;
  nextStep: string;
};

type Draft = VisitDraft | ExhibitDraft;
type AnswerSection = { title: string; rows: { label: string; value: string; internal?: boolean }[] };
type ShareKey = string;

const visitObjectives = [
  'Conhecer produtos de perto',
  'Conhecer lançamentos e tendências do mercado',
  'Conversar com fabricantes ou representantes',
  'Comparar possibilidades para o mix da loja',
  'Pesquisar fornecedores para uma categoria ou linha',
  'Entender condições comerciais e de fornecimento',
];
const visitComparisons = [
  'Características e variedade dos produtos',
  'Adequação ao perfil da minha loja e dos meus clientes',
  'Preços e condições para compras em quantidade',
  'Pedido mínimo',
  'Prazos e entregas',
  'Representação ou atendimento na minha região',
];
const visitQuestions = [
  'Quais produtos ou linhas podem atender o que estou pesquisando?',
  'Quais são as condições de pedido mínimo?',
  'Quais são os prazos de produção ou entrega?',
  'Como funciona a entrega para a minha região?',
  'Quais condições comerciais devo avaliar?',
  'Quem será meu contato depois da feira?',
];
const visitStoreInfo = [
  'Perfil da loja e público atendido',
  'Categorias que já vendo',
  'Categorias que quero pesquisar',
  'Limites de espaço ou exposição na loja',
  'Critérios de compra que são importantes para mim',
];
const visitConfirmations = [
  'Endereço da edição',
  'Horários de visita',
  'Credenciamento e documentos necessários',
  'Custos e regras de acesso',
  'Informações de estacionamento ou transporte, se disponíveis',
  'Informações de hospedagem, se disponíveis',
];
const visitTakeAlong = [
  'Lista de produtos ou categorias que estou pesquisando',
  'Perguntas anotadas',
  'Dados da loja que ajudam a explicar meu perfil',
  'Espaço para anotar contatos e próximos passos',
];

const exhibitObjectives = [
  'Apresentar uma linha de produtos',
  'Apresentar novidades ou lançamentos da empresa',
  'Conversar com compradores do varejo',
  'Avaliar em quais cidades faz sentido participar',
  'Fortalecer o relacionamento com clientes',
];
const spaceQuestions = [
  'Formatos de estande disponíveis',
  'Metragens previstas',
  'O que está incluído na estrutura',
  'Itens ou serviços cobrados à parte',
  'Regras de montagem e desmontagem',
  'Ainda não sei; quero conversar com a equipe',
];
const commercialQuestions = [
  'Valor total',
  'Condições e prazos de pagamento',
  'Disponibilidade por cidade',
  'Prazos para decidir e formalizar a participação',
];
const operationalQuestions = [
  'Endereço da edição',
  'Horários de funcionamento',
  'Horários e regras de montagem/desmontagem',
  'Manual da edição',
  'Acesso, carga e descarga ou logística, se aplicável',
];
const preparationOptions = [
  'Catálogo atualizado',
  'Descrição e imagens dos produtos',
  'Condições comerciais que a empresa pretende apresentar',
  'Requisitos de espaço, mobiliário ou demonstração',
  'Logística de transporte e montagem',
  'Aprovação de orçamento e responsáveis internos',
];
const criteriaOptions = [
  'Cidade e mercado atendido pela empresa',
  'Datas e disponibilidade da equipe',
  'Metragem e estrutura',
  'Investimento e condições de pagamento',
  'Logística de transporte e montagem',
  'Objetivo comercial da participação',
];
const nextSteps = [
  'Consultar informações sobre uma cidade',
  'Solicitar informações comerciais sobre estande',
  'Tirar dúvidas sobre estrutura e operação',
  'Ainda preciso alinhar a decisão internamente',
];

function emptyConversation(): ConversationCard {
  return { supplier: '', product: '', confirm: '', nextStep: '', followUpDate: '', notes: '' };
}

function createEmptyDraft(kind: ToolKind): Draft {
  if (kind === 'visit') {
    return {
      kind,
      cities: '',
      objectives: [],
      otherObjective: '',
      research: '',
      comparisons: [],
      otherComparison: '',
      questions: [],
      ownQuestion: '',
      storeInfo: [],
      otherStoreInfo: '',
      confirmations: [],
      otherConfirmation: '',
      decisionMakers: '',
      takeAlong: [],
      otherTakeAlong: '',
      internalNotes: '',
      conversations: [],
    };
  }
  return {
    kind,
    cities: [],
    lineCategory: '',
    objectives: [],
    otherObjective: '',
    spaceQuestions: [],
    commercialQuestions: [],
    otherCommercialQuestion: '',
    operationalQuestions: [],
    otherOperationalQuestion: '',
    preparation: [],
    otherPreparation: '',
    decisionMakers: '',
    criteria: [],
    otherCriterion: '',
    nextStep: '',
  };
}

function storageKey(kind: ToolKind) {
  return `showbrinq-tools-draft-${kind}-v1`;
}

function loadDraft(kind: ToolKind): Draft {
  const base = createEmptyDraft(kind);
  if (typeof window === 'undefined') return base;
  try {
    const raw = window.localStorage.getItem(storageKey(kind));
    if (!raw) return base;
    const parsed = JSON.parse(raw) as Partial<Draft>;
    if (!parsed || typeof parsed !== 'object') return base;
    if (parsed.kind !== kind) return base;
    return { ...base, ...parsed, kind } as Draft;
  } catch {
    return base;
  }
}

function applyCityPrefill(draft: Draft, kind: ToolKind): Draft {
  if (typeof window === 'undefined') return draft;
  const params = new URLSearchParams(window.location.search);
  const value = params.get('cidade') ?? params.get('city');
  const normalize = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[\s_-]+/g, '-');
  const edition = editions.find(item => normalize(item.id) === normalize(value ?? '') || normalize(item.city) === normalize(value ?? ''));
  if (!edition) return draft;
  const city = edition.id;
  if (draft.kind === 'visit') return { ...draft, cities: city };
  return { ...draft, cities: [city] };
}

function editionLabel(id: string) {
  if (id === 'undecided') return 'Ainda não decidi / ainda estou avaliando';
  const edition = editions.find((item) => item.id === id);
  return edition ? `${edition.city} (${edition.uf}) — ${edition.dates}` : id;
}

function listValue(items: string[], other = '') {
  const values = [...items, other.trim() ? other.trim() : ''].filter(Boolean);
  return values.length ? values.join('\n') : '';
}

function displayValue(value: string) {
  return value.trim() || 'Ainda não preenchido';
}

function row(label: string, value: string, internal = false) {
  return { label, value: displayValue(value), ...(internal ? { internal: true } : {}) };
}

function visitSections(draft: VisitDraft): AnswerSection[] {
  return [
    {
      title: 'Etapa A · Escolher a edição',
      rows: [
        row('Qual edição você está considerando visitar?', draft.cities ? editionLabel(draft.cities) : ''),
        row('Qual é o principal objetivo da sua visita?', listValue(draft.objectives, draft.otherObjective)),
        row('O que você quer pesquisar na feira?', draft.research),
      ],
    },
    {
      title: 'Etapa B · Preparar as conversas',
      rows: [
        row('O que você pretende comparar entre os produtos ou fornecedores?', listValue(draft.comparisons, draft.otherComparison)),
        row('Que perguntas você quer levar para cada conversa?', listValue(draft.questions, draft.ownQuestion)),
        row('Que informações da sua loja você quer ter à mão?', listValue(draft.storeInfo, draft.otherStoreInfo)),
      ],
    },
    {
      title: 'Etapa C · Planejar a visita',
      rows: [
        row('O que você ainda precisa confirmar com a organização antes de viajar?', listValue(draft.confirmations, draft.otherConfirmation)),
        row('Quem da sua equipe precisa participar da decisão de compra?', draft.decisionMakers, true),
        row('O que você quer levar para a feira?', listValue(draft.takeAlong, draft.otherTakeAlong)),
      ],
    },
    {
      title: 'Etapa D · Registrar depois das conversas',
      rows: [
        row('Notas internas do caderno', draft.internalNotes, true),
        ...draft.conversations.flatMap((conversation, index) => [
          row(`Ficha ${index + 1} · Marca/fornecedor`, conversation.supplier),
          row(`Ficha ${index + 1} · Produto ou linha que quero lembrar`, conversation.product),
          row(`Ficha ${index + 1} · O que preciso confirmar`, conversation.confirm),
          row(`Ficha ${index + 1} · Próximo passo combinado`, conversation.nextStep),
          row(`Ficha ${index + 1} · Data para retomar a conversa`, conversation.followUpDate),
          row(`Ficha ${index + 1} · Minhas observações`, conversation.notes, true),
        ]),
      ],
    },
  ];
}

function exhibitSections(draft: ExhibitDraft): AnswerSection[] {
  return [
    {
      title: 'Etapa A · Definir o que avaliar',
      rows: [
        row('Em quais edições sua empresa quer avaliar participação?', draft.cities.map(editionLabel).join('\n')),
        row('Que linha ou categoria sua marca pretende apresentar?', draft.lineCategory),
        row('Qual é o objetivo principal da sua empresa ao avaliar a participação?', listValue(draft.objectives, draft.otherObjective)),
      ],
    },
    {
      title: 'Etapa B · Listar as dúvidas comerciais',
      rows: [
        row('O que você precisa entender sobre o espaço e a estrutura?', listValue(draft.spaceQuestions)),
        row('Quais condições comerciais sua equipe precisa confirmar?', listValue(draft.commercialQuestions, draft.otherCommercialQuestion)),
        row('Que informações operacionais precisam ser confirmadas?', listValue(draft.operationalQuestions, draft.otherOperationalQuestion)),
      ],
    },
    {
      title: 'Etapa C · Preparação interna da empresa',
      rows: [
        row('O que sua equipe precisa preparar para avaliar a proposta?', listValue(draft.preparation, draft.otherPreparation)),
        row('Quem precisa participar da decisão dentro da empresa?', draft.decisionMakers, true),
        row('Que critérios sua empresa usará para comparar as edições?', listValue(draft.criteria, draft.otherCriterion)),
      ],
    },
    {
      title: 'Etapa D · Preparar a consulta à equipe',
      rows: [row('Qual é o próximo passo que você quer tomar?', draft.nextStep)],
    },
  ];
}

function buildPlainText(kind: ToolKind, draft: Draft, sections: AnswerSection[]) {
  const title = kind === 'visit' ? 'Caderno de visita' : 'Planejador de participação';
  const lines = [`${APP_NAME} 2027 — ${title}`, '', 'Este material é um rascunho pessoal. Não é enviado automaticamente, não confirma disponibilidade e não realiza inscrição ou reserva.', ''];
  sections.forEach((section) => {
    lines.push(section.title);
    section.rows.forEach((answer) => {
      lines.push(`${answer.label}:`);
      lines.push(answer.value);
    });
    lines.push('');
  });
  return lines.join('\n');
}

function useDraft(kind: ToolKind) {
  const [draft, setDraft] = useState<Draft>(() => applyCityPrefill(loadDraft(kind), kind));
  const hydrated = true;

  useEffect(() => {
    if (draft.kind !== kind || typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(storageKey(kind), JSON.stringify(draft));
    } catch {
      // A ferramenta continua funcionando mesmo se o navegador bloquear o armazenamento local.
    }
  }, [draft, hydrated, kind]);

  return { draft, setDraft, hydrated };
}

function LabeledField({
  id,
  label,
  value,
  onChange,
  placeholder,
  hint,
  multiline = false,
  type = 'text',
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  hint?: string;
  multiline?: boolean;
  type?: 'text' | 'date';
}) {
  return (
    <div className="tool-field">
      <label htmlFor={id}>{label}</label>
      {hint && <span className="tool-field-hint">{hint}</span>}
      {multiline ? (
        <textarea id={id} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} rows={4} />
      ) : (
        <input id={id} type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
      )}
    </div>
  );
}

function CheckboxList({
  options,
  selected,
  onToggle,
  ariaLabel,
}: {
  options: string[];
  selected: string[];
  onToggle: (option: string) => void;
  ariaLabel: string;
}) {
  return (
    <div className="tool-option-list" role="group" aria-label={ariaLabel}>
      {options.map((option) => (
        <label className={`tool-option ${selected.includes(option) ? 'is-selected' : ''}`} key={option}>
          <input type="checkbox" checked={selected.includes(option)} onChange={() => onToggle(option)} />
          <span className="tool-checkmark" aria-hidden="true"><Check size={14} strokeWidth={3} /></span>
          <span>{option}</span>
        </label>
      ))}
    </div>
  );
}

function CityPicker({ kind, value, onChange }: { kind: ToolKind; value: string | string[]; onChange: (value: string | string[]) => void }) {
  const multiple = kind === 'exhibit';
  const selected = multiple ? (value as string[]) : [value as string];
  const undecided = multiple ? 'undecided' : 'undecided';
  const undecidedLabel = multiple ? 'Ainda estou avaliando' : 'Ainda não decidi';
  const toggleCity = (id: string) => {
    if (!multiple) {
      onChange(id);
      return;
    }
    const current = value as string[];
    if (id === undecided) {
      onChange(current.includes(undecided) ? [] : [undecided]);
      return;
    }
    const withoutUndecided = current.filter((item) => item !== undecided);
    onChange(withoutUndecided.includes(id) ? withoutUndecided.filter((item) => item !== id) : [...withoutUndecided, id]);
  };
  return (
    <>
      <div className="tool-city-grid" role="group" aria-label={multiple ? 'Edições de interesse' : 'Edição considerada'}>
        {editions.map((edition: Edition) => {
          const isSelected = selected.includes(edition.id);
          return (
            <label className={`tool-city-option ${isSelected ? 'is-selected' : ''}`} key={edition.id}>
              <input type={multiple ? 'checkbox' : 'radio'} name={`${kind}-city`} checked={isSelected} onChange={() => toggleCity(edition.id)} />
              <span className="tool-city-copy">
                <strong>{edition.city} ({edition.uf})</strong>
                <small>{edition.dates}</small>
              </span>
            </label>
          );
        })}
        <label className={`tool-city-option tool-city-undecided ${selected.includes(undecided) ? 'is-selected' : ''}`}>
          <input type={multiple ? 'checkbox' : 'radio'} name={`${kind}-city`} checked={selected.includes(undecided)} onChange={() => toggleCity(undecided)} />
          <span className="tool-city-copy"><strong>{undecidedLabel}</strong></span>
        </label>
      </div>
      <p className="tool-help-text">
        {multiple
          ? 'Confirme com a organização a disponibilidade, as condições comerciais e as informações operacionais de cada edição.'
          : 'As datas estão anunciadas. Antes de organizar a viagem, confirme com a equipe o endereço, os horários e as condições de acesso da edição.'}
      </p>
    </>
  );
}

function StepIntro({ eyebrow, title, children }: { eyebrow: string; title: string; children?: ReactNode }) {
  return (
    <header className="tool-step-intro">
      <span className="eyebrow">{eyebrow}</span>
      <h2>{title}</h2>
      {children && <p>{children}</p>}
    </header>
  );
}

function SectionCard({ title, children, note }: { title: string; children: ReactNode; note?: string }) {
  return (
    <section className="tool-form-card">
      <h3>{title}</h3>
      {note && <p className="tool-card-note">{note}</p>}
      {children}
    </section>
  );
}

function VisitStep({ draft, update, currentStep, onDownload, onPrint, onShare }: { draft: VisitDraft; update: (patch: Partial<VisitDraft>) => void; currentStep: number; onDownload: () => void; onPrint: () => void; onShare: () => void }) {
  const toggle = (field: keyof Pick<VisitDraft, 'objectives' | 'comparisons' | 'questions' | 'storeInfo' | 'confirmations' | 'takeAlong'>, option: string, max?: number) => {
    const values = draft[field] as string[];
    if (!values.includes(option) && max && values.length >= max) return;
    update({ [field]: values.includes(option) ? values.filter((item) => item !== option) : [...values, option] } as Partial<VisitDraft>);
  };
  return (
    <>
      {currentStep === 0 && <>
        <StepIntro eyebrow="Etapa A · Escolher a edição" title="Comece pelo que você quer resolver na feira." />
        <SectionCard title="1. Qual edição você está considerando visitar?"><CityPicker kind="visit" value={draft.cities} onChange={(value) => update({ cities: value as string })} /></SectionCard>
        <SectionCard title="2. Qual é o principal objetivo da sua visita?" note="Selecione até dois objetivos. Você pode deixar esta etapa em aberto."><CheckboxList options={visitObjectives} selected={draft.objectives} onToggle={(option) => toggle('objectives', option, 2)} ariaLabel="Objetivos da visita" /><LabeledField id="visit-other-objective" label="Outro objetivo: campo curto opcional" value={draft.otherObjective} onChange={(value) => update({ otherObjective: value })} /></SectionCard>
        <SectionCard title="3. O que você quer pesquisar na feira?"><LabeledField id="visit-research" label="O que você quer pesquisar na feira?" value={draft.research} onChange={(value) => update({ research: value })} placeholder="Escreva categorias, tipos de produto ou dúvidas que você quer explorar." /></SectionCard>
      </>}
      {currentStep === 1 && <>
        <StepIntro eyebrow="Etapa B · Preparar as conversas" title="Leve critérios claros para cada conversa." />
        <SectionCard title="4. O que você pretende comparar entre os produtos ou fornecedores?"><CheckboxList options={visitComparisons} selected={draft.comparisons} onToggle={(option) => toggle('comparisons', option)} ariaLabel="Pontos de comparação" /><LabeledField id="visit-other-comparison" label="Outro ponto: campo curto opcional" value={draft.otherComparison} onChange={(value) => update({ otherComparison: value })} /></SectionCard>
        <SectionCard title="5. Que perguntas você quer levar para cada conversa?" note="Você pode selecionar, editar mentalmente ou escrever sua própria pergunta."><CheckboxList options={visitQuestions} selected={draft.questions} onToggle={(option) => toggle('questions', option)} ariaLabel="Perguntas para as conversas" /><LabeledField id="visit-own-question" label="Minha pergunta: campo livre" value={draft.ownQuestion} onChange={(value) => update({ ownQuestion: value })} multiline /></SectionCard>
        <SectionCard title="6. Que informações da sua loja você quer ter à mão?" note="Checklist pessoal, não enviado. Não inclua faturamento, CNPJ ou dados de clientes."><CheckboxList options={visitStoreInfo} selected={draft.storeInfo} onToggle={(option) => toggle('storeInfo', option)} ariaLabel="Informações da loja" /><LabeledField id="visit-other-store-info" label="Outro lembrete: campo livre" value={draft.otherStoreInfo} onChange={(value) => update({ otherStoreInfo: value })} /></SectionCard>
      </>}
      {currentStep === 2 && <>
        <StepIntro eyebrow="Etapa C · Planejar a visita" title="Transforme dúvidas em uma lista prática." />
        <SectionCard title="7. O que você ainda precisa confirmar com a organização antes de viajar?"><CheckboxList options={visitConfirmations} selected={draft.confirmations} onToggle={(option) => toggle('confirmations', option)} ariaLabel="Confirmações antes da viagem" /><LabeledField id="visit-other-confirmation" label="Outro ponto: campo livre" value={draft.otherConfirmation} onChange={(value) => update({ otherConfirmation: value })} /></SectionCard>
        <SectionCard title="8. Quem da sua equipe precisa participar da decisão de compra?" note="Resposta pessoal opcional, não enviada por padrão."><LabeledField id="visit-decision-makers" label="Quem você quer consultar ou incluir no planejamento?" value={draft.decisionMakers} onChange={(value) => update({ decisionMakers: value })} placeholder="Anote nomes, funções ou áreas." /></SectionCard>
        <SectionCard title="9. O que você quer levar para a feira?"><CheckboxList options={visitTakeAlong} selected={draft.takeAlong} onToggle={(option) => toggle('takeAlong', option)} ariaLabel="Itens para levar à feira" /><LabeledField id="visit-other-take-along" label="Outro lembrete" value={draft.otherTakeAlong} onChange={(value) => update({ otherTakeAlong: value })} /></SectionCard>
      </>}
      {currentStep === 3 && <>
        <StepIntro eyebrow="Etapa D · Registrar depois das conversas" title="Anote o que merece um próximo passo." />
        <SectionCard title="Notas internas do caderno" note="Estas notas ficam no seu dispositivo e não entram no compartilhamento padrão."><LabeledField id="visit-internal-notes" label="Notas internas" value={draft.internalNotes} onChange={(value) => update({ internalNotes: value })} multiline placeholder="Registre impressões, decisões internas ou lembretes para você." /></SectionCard>
        <section className="tool-conversation-section" aria-labelledby="conversation-title"><div className="tool-section-heading"><div><span className="eyebrow">Fichas duplicáveis</span><h3 id="conversation-title">Uma ficha simples para cada conversa</h3></div><button type="button" className="btn btn-outline tool-small-button" onClick={() => update({ conversations: [...draft.conversations, emptyConversation()] })}><Plus size={16} /> Adicionar ficha</button></div>
          {!draft.conversations.length && <p className="tool-empty-state">Adicione uma ficha quando quiser registrar uma marca ou fornecedor.</p>}
          <div className="tool-conversation-list">{draft.conversations.map((conversation, index) => <article className="tool-conversation-card" key={`conversation-${index}`}><div className="tool-conversation-heading"><span className="tool-card-number">{String(index + 1).padStart(2, '0')}</span><h4>Ficha de conversa</h4><GripVertical size={18} aria-hidden="true" /></div><div className="tool-two-col"><LabeledField id={`supplier-${index}`} label="Marca/fornecedor" value={conversation.supplier} onChange={(value) => update({ conversations: draft.conversations.map((item, itemIndex) => itemIndex === index ? { ...item, supplier: value } : item) })} /><LabeledField id={`product-${index}`} label="Produto ou linha que quero lembrar" value={conversation.product} onChange={(value) => update({ conversations: draft.conversations.map((item, itemIndex) => itemIndex === index ? { ...item, product: value } : item) })} /></div><LabeledField id={`confirm-${index}`} label="O que preciso confirmar" value={conversation.confirm} onChange={(value) => update({ conversations: draft.conversations.map((item, itemIndex) => itemIndex === index ? { ...item, confirm: value } : item) })} multiline /><LabeledField id={`next-${index}`} label="Próximo passo combinado" value={conversation.nextStep} onChange={(value) => update({ conversations: draft.conversations.map((item, itemIndex) => itemIndex === index ? { ...item, nextStep: value } : item) })} multiline /><div className="tool-two-col"><LabeledField id={`date-${index}`} label="Data para retomar a conversa" value={conversation.followUpDate} onChange={(value) => update({ conversations: draft.conversations.map((item, itemIndex) => itemIndex === index ? { ...item, followUpDate: value } : item) })} type="date" /><LabeledField id={`notes-${index}`} label="Minhas observações" value={conversation.notes} onChange={(value) => update({ conversations: draft.conversations.map((item, itemIndex) => itemIndex === index ? { ...item, notes: value } : item) })} multiline /></div><div className="tool-inline-actions"><button type="button" className="btn btn-outline" onClick={() => update({ conversations: [...draft.conversations.slice(0, index + 1), { ...conversation }, ...draft.conversations.slice(index + 1)] })}><Copy size={15} /> Duplicar ficha</button><button type="button" className="tool-text-button" onClick={() => update({ conversations: draft.conversations.filter((_, itemIndex) => itemIndex !== index) })}><Trash2 size={15} /> Remover</button></div></article>)}</div>
        </section>
        <div className="tool-step-ctas"><button type="button" className="btn btn-primary" onClick={onDownload}><Download size={17} /> Baixar meu Caderno de visita</button><button type="button" className="btn btn-outline" onClick={onPrint}><Printer size={17} /> Imprimir caderno</button><button type="button" className="tool-link-button" onClick={onShare}>Preparar uma pergunta para a equipe <ArrowRight size={15} /></button></div>
        <p className="tool-disclaimer">O caderno é para seu planejamento. Você não precisa preencher tudo e suas respostas não devem ser enviadas à equipe automaticamente.</p>
      </>}
    </>
  );
}

function ExhibitStep({ draft, update, currentStep, onShare, onReview, onDownload, onPrint }: { draft: ExhibitDraft; update: (patch: Partial<ExhibitDraft>) => void; currentStep: number; onShare: () => void; onReview: () => void; onDownload: () => void; onPrint: () => void }) {
  const toggle = (field: keyof Pick<ExhibitDraft, 'objectives' | 'spaceQuestions' | 'commercialQuestions' | 'operationalQuestions' | 'preparation'>, option: string) => {
    const values = draft[field] as string[];
    update({ [field]: values.includes(option) ? values.filter((item) => item !== option) : [...values, option] } as Partial<ExhibitDraft>);
  };
  const toggleObjective = (option: string) => {
    if (!draft.objectives.includes(option) && draft.objectives.length >= 2) return;
    toggle('objectives', option);
  };
  const toggleCriterion = (criterion: string) => {
    if (!draft.criteria.includes(criterion) && draft.criteria.length >= 4) return;
    update({ criteria: draft.criteria.includes(criterion) ? draft.criteria.filter((item) => item !== criterion) : [...draft.criteria, criterion] });
  };
  const moveCriterion = (index: number, direction: -1 | 1) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= draft.criteria.length) return;
    const next = [...draft.criteria];
    [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
    update({ criteria: next });
  };
  return (
    <>
      {currentStep === 0 && <>
      <StepIntro eyebrow="Etapa A · Definir o que avaliar" title="Comece pelas cidades e pela intenção da sua empresa." />
      <SectionCard title="1. Em quais edições sua empresa quer avaliar participação?">
        <CityPicker kind="exhibit" value={draft.cities} onChange={(value) => update({ cities: value as string[] })} />
      </SectionCard>
      <SectionCard title="2. Que linha ou categoria sua marca pretende apresentar?">
        <LabeledField id="exhibit-line" label="Que linha ou categoria sua marca pretende apresentar?" value={draft.lineCategory} onChange={(value) => update({ lineCategory: value })} placeholder="Descreva em poucas palavras a linha que você quer levar." />
      </SectionCard>
      <SectionCard title="3. Qual é o objetivo principal da sua empresa ao avaliar a participação?" note="Selecione até dois objetivos da empresa; eles não são resultados garantidos pela feira.">
        <CheckboxList options={exhibitObjectives} selected={draft.objectives} onToggle={toggleObjective} ariaLabel="Objetivos da empresa" />
        <LabeledField id="exhibit-other-objective" label="Outro objetivo: campo curto" value={draft.otherObjective} onChange={(value) => update({ otherObjective: value })} />
      </SectionCard>
      </>}
      {currentStep === 1 && <>
      <StepIntro eyebrow="Etapa B · Listar as dúvidas comerciais" title="Organize o que sua equipe precisa confirmar." />
      <SectionCard title="4. O que você precisa entender sobre o espaço e a estrutura?">
        <CheckboxList options={spaceQuestions} selected={draft.spaceQuestions} onToggle={(option) => toggle('spaceQuestions', option)} ariaLabel="Dúvidas sobre espaço e estrutura" />
      </SectionCard>
      <SectionCard title="5. Quais condições comerciais sua equipe precisa confirmar?">
        <CheckboxList options={commercialQuestions} selected={draft.commercialQuestions} onToggle={(option) => toggle('commercialQuestions', option)} ariaLabel="Condições comerciais" />
        <LabeledField id="exhibit-other-commercial" label="Outra questão: campo curto" value={draft.otherCommercialQuestion} onChange={(value) => update({ otherCommercialQuestion: value })} />
      </SectionCard>
      <SectionCard title="6. Que informações operacionais precisam ser confirmadas?">
        <CheckboxList options={operationalQuestions} selected={draft.operationalQuestions} onToggle={(option) => toggle('operationalQuestions', option)} ariaLabel="Informações operacionais" />
        <LabeledField id="exhibit-other-operational" label="Outra informação: campo curto" value={draft.otherOperationalQuestion} onChange={(value) => update({ otherOperationalQuestion: value })} />
      </SectionCard>
      </>}
      {currentStep === 2 && <>
      <StepIntro eyebrow="Etapa C · Preparação interna da empresa" title="Deixe a conversa pronta para uma decisão interna." />
      <SectionCard title="7. O que sua equipe precisa preparar para avaliar a proposta?" note="Checklist pessoal, para a preparação da empresa.">
        <CheckboxList options={preparationOptions} selected={draft.preparation} onToggle={(option) => toggle('preparation', option)} ariaLabel="Preparação interna" />
        <LabeledField id="exhibit-other-preparation" label="Outro item: campo livre" value={draft.otherPreparation} onChange={(value) => update({ otherPreparation: value })} />
      </SectionCard>
      <SectionCard title="8. Quem precisa participar da decisão dentro da empresa?" note="Resposta pessoal opcional, não enviada por padrão.">
        <LabeledField id="exhibit-decision-makers" label="Quem precisa participar da decisão dentro da empresa?" value={draft.decisionMakers} onChange={(value) => update({ decisionMakers: value })} placeholder="Anote áreas, funções ou responsáveis." />
      </SectionCard>
      <SectionCard title="9. Que critérios sua empresa usará para comparar as edições?" note="Escolha e ordene até quatro. Não há pontuação ou recomendação automática de melhor cidade.">
        <div className="tool-criteria-list" aria-label="Critérios ordenados">
          {draft.criteria.map((criterion, index) => (
            <div className="tool-criterion-row" key={criterion}><span className="tool-criterion-position">{index + 1}</span><span>{criterion}</span><div className="tool-criterion-actions"><button type="button" className="tool-icon-button" aria-label={`Mover ${criterion} para cima`} onClick={() => moveCriterion(index, -1)} disabled={index === 0}><ArrowUp size={15} /></button><button type="button" className="tool-icon-button" aria-label={`Mover ${criterion} para baixo`} onClick={() => moveCriterion(index, 1)} disabled={index === draft.criteria.length - 1}><ArrowDown size={15} /></button><button type="button" className="tool-icon-button" aria-label={`Remover ${criterion}`} onClick={() => toggleCriterion(criterion)}><X size={15} /></button></div></div>
          ))}
        </div>
        <div className="tool-option-list tool-criteria-options" role="group" aria-label="Adicionar critérios">
          {[...criteriaOptions, 'Outro critério'].map((criterion) => (
            <label className={`tool-option ${draft.criteria.includes(criterion) ? 'is-selected' : ''}`} key={criterion}><input type="checkbox" checked={draft.criteria.includes(criterion)} onChange={() => toggleCriterion(criterion)} /><span className="tool-checkmark" aria-hidden="true"><Check size={14} strokeWidth={3} /></span><span>{criterion}</span></label>
          ))}
        </div>
        <LabeledField id="exhibit-other-criterion" label="Outro critério" value={draft.otherCriterion} onChange={(value) => update({ otherCriterion: value })} hint="Se você marcar “Outro critério”, descreva-o aqui." />
      </SectionCard>
      </>}
      {currentStep === 3 && <>
      <StepIntro eyebrow="Etapa D · Preparar a consulta à equipe" title="Escolha o próximo passo da sua conversa." />
      <SectionCard title="10. Qual é o próximo passo que você quer tomar?">
        <div className="tool-radio-list" role="radiogroup" aria-label="Próximo passo">
          {nextSteps.map((option) => <label className={`tool-option ${draft.nextStep === option ? 'is-selected' : ''}`} key={option}><input type="radio" name="exhibit-next-step" checked={draft.nextStep === option} onChange={() => update({ nextStep: option })} /><span className="tool-radio-dot" aria-hidden="true" /> <span>{option}</span></label>)}
        </div>
      </SectionCard>
      <div className="tool-step-ctas">
        <button type="button" className="btn btn-primary" onClick={onShare}><ClipboardList size={17} /> Preparar consulta sobre participação</button>
        <button type="button" className="btn btn-outline" onClick={onReview}><Eye size={17} /> Revisar meu planejamento</button>
        <button type="button" className="btn btn-outline" onClick={onDownload}><Download size={17} /> Baixar planejador (.txt)</button>
        <button type="button" className="btn btn-outline" onClick={onPrint}><Printer size={17} /> Imprimir planejador</button>
      </div>
      <p className="tool-disclaimer">O site prepara uma mensagem para revisão. A mensagem não é enviada automaticamente e não reserva estande. A disponibilidade e as condições devem ser confirmadas pela organização.</p>
      </>}
    </>
  );
}

function ProgressSidebar({ kind, currentStep, setStep, onReview, onClear, confirmClear, onConfirmClear, onCancelClear, onUndo, hasUndo, hydrated }: { kind: ToolKind; currentStep: number; setStep: (step: number) => void; onReview: () => void; onClear: () => void; confirmClear: boolean; onConfirmClear: () => void; onCancelClear: () => void; onUndo: () => void; hasUndo: boolean; hydrated: boolean }) {
  const steps = kind === 'visit' ? ['Escolher a edição', 'Preparar as conversas', 'Planejar a visita', 'Registrar depois'] : ['Definir o que avaliar', 'Listar as dúvidas', 'Preparação interna', 'Preparar a consulta'];
  return (
    <aside className="tool-sidebar" aria-label="Progresso da ferramenta">
      <div className="tool-sidebar-top"><span className="tool-sidebar-label">Seu progresso</span><strong>{Math.round(((currentStep + 1) / steps.length) * 100)}%</strong></div>
      <div className="tool-progress-track"><span style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }} /></div>
      <nav className="tool-step-nav" aria-label="Etapas">
        {steps.map((step, index) => <button type="button" className={`tool-step-nav-item ${index === currentStep ? 'is-current' : ''} ${index < currentStep ? 'is-done' : ''}`} key={step} onClick={() => setStep(index)}><span>{index < currentStep ? <Check size={14} /> : String(index + 1).padStart(2, '0')}</span><strong>{step}</strong></button>)}
      </nav>
      <button type="button" className="tool-review-link" onClick={onReview}><Eye size={16} /> Revisar respostas</button>
      <div className="tool-save-box"><strong>{hydrated ? 'Rascunho salvo neste dispositivo' : 'Carregando rascunho…'}</strong><p>Não pedimos nome, telefone, e-mail ou outros dados de contato.</p></div>
      {confirmClear ? (
        <div className="tool-clear-confirm" role="alert"><strong>Apagar este rascunho?</strong><span>As respostas serão removidas deste dispositivo.</span><div><button type="button" className="btn btn-primary" onClick={onConfirmClear}>Sim, apagar</button><button type="button" className="tool-text-button" onClick={onCancelClear}>Cancelar</button></div></div>
      ) : (
        <button type="button" className="tool-delete-link" onClick={onClear}><Trash2 size={15} /> Apagar minhas respostas</button>
      )}
      {hasUndo && <button type="button" className="tool-undo-link" onClick={onUndo}><RotateCcw size={15} /> Desfazer apagamento</button>}
    </aside>
  );
}

function ReviewPanel({ kind, sections, onBack }: { kind: ToolKind; sections: AnswerSection[]; onBack: () => void }) {
  return (
    <section className="tool-review-panel" aria-labelledby="review-title">
      <div className="tool-review-heading"><div><span className="eyebrow">Revisão</span><h2 id="review-title">Confira seu planejamento</h2><p>Você pode voltar a qualquer etapa e editar tudo. Nenhuma resposta é obrigatória.</p></div><button type="button" className="btn btn-outline" onClick={onBack}><ArrowLeft size={16} /> Voltar a editar</button></div>
      <div className="tool-review-sections">
        {sections.map((section) => <section className="tool-review-section" key={section.title}><h3>{section.title}</h3>{section.rows.map((answer) => <div className="tool-review-row" key={answer.label}><div><strong>{answer.label}</strong>{answer.internal && <span className="tag tool-internal-tag">nota interna</span>}</div><p>{answer.value}</p></div>)}</section>)}
      </div>
    </section>
  );
}

function PrintSummary({ kind, sections }: { kind: ToolKind; sections: AnswerSection[] }) {
  return <article className="tool-print-summary"><div className="tool-print-brand"><span className="eyebrow">{APP_NAME} · 2027</span><h2>{kind === 'visit' ? 'Caderno de visita' : 'Planejador de participação'}</h2><p>Rascunho pessoal para organizar perguntas e próximos passos. Não confirma disponibilidade, inscrição ou reserva.</p></div>{sections.map((section) => <section key={section.title}><h2>{section.title}</h2>{section.rows.map((answer) => <div className="tool-print-row" key={answer.label}><strong>{answer.label}</strong><p>{answer.value}</p></div>)}</section>)}</article>;
}

function SharePanel({ kind, selected, setSelected, preview, setPreview, onRegenerate, onClose, copyStatus, onCopy }: { kind: ToolKind; selected: ShareKey[]; setSelected: (keys: ShareKey[]) => void; preview: string; setPreview: (value: string) => void; onRegenerate: () => void; onClose: () => void; copyStatus: string; onCopy: () => void }) {
  const panelRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panel?.querySelector<HTMLElement>('button')?.focus();
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); onClose(); return; }
      if (event.key !== 'Tab' || !panel) return;
      const focusable = Array.from(panel.querySelectorAll<HTMLElement>('button:not([disabled]),a[href],input,textarea,[tabindex="0"]'));
      const first = focusable[0]; const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener('keydown', handleKey);
    return () => { document.removeEventListener('keydown', handleKey); document.body.style.overflow = previousOverflow; previous?.focus(); };
  }, []);
  const choices = kind === 'visit' ? [
    ['city', 'Cidade/edição'], ['goals', 'Objetivos da visita'], ['research', 'O que quero pesquisar'], ['doubts', 'Perguntas e pontos a confirmar'], ['comparisons', 'Pontos de comparação'], ['store', 'Informações da loja'], ['take', 'O que quero levar'], ['decision', 'Quem participa da decisão · nota interna'], ['notes', 'Notas internas'],
  ] : [
    ['city', 'Cidades de interesse'], ['line', 'Linha ou categoria'], ['goals', 'Objetivos da empresa'], ['doubts', 'Dúvidas comerciais e operacionais'], ['preparation', 'Preparação interna'], ['decision', 'Quem participa da decisão · nota interna'], ['criteria', 'Critérios de comparação'], ['next', 'Próximo passo escolhido'],
  ];
  const toggle = (key: string) => setSelected(selected.includes(key) ? selected.filter((item) => item !== key) : [...selected, key]);
  return (
    <div className="tool-share-backdrop" role="presentation">
      <section ref={panelRef} className="tool-share-panel" role="dialog" aria-modal="true" aria-labelledby="share-title">
        <div className="tool-share-heading"><div><span className="eyebrow">Prévia para revisão</span><h2 id="share-title">Escolha o que quer compartilhar</h2><p>O padrão inclui somente a cidade e suas dúvidas. Nada é enviado automaticamente.</p></div><button type="button" className="tool-icon-button" aria-label="Fechar prévia" onClick={onClose}><X size={19} /></button></div>
        <div className="tool-share-layout"><div className="tool-share-options"><h3>Incluir na prévia</h3>{choices.map(([key, label]) => <label className={`tool-share-choice ${selected.includes(key) ? 'is-selected' : ''} ${key === 'notes' || key === 'decision' ? 'is-internal' : ''}`} key={key}><input type="checkbox" checked={selected.includes(key)} onChange={() => toggle(key)} /><span className="tool-checkmark" aria-hidden="true"><Check size={14} strokeWidth={3} /></span><span>{label}</span></label>)}<button type="button" className="btn btn-outline" onClick={onRegenerate}><RotateCcw size={15} /> Atualizar prévia</button></div><div className="tool-share-editor"><label htmlFor="share-preview"><strong>Mensagem editável</strong><span>Revise, ajuste ou apague qualquer trecho antes de copiar.</span></label><textarea id="share-preview" value={preview} onChange={(event) => setPreview(event.target.value)} rows={15} /><div className="tool-share-actions"><button type="button" className="btn btn-primary" onClick={onCopy}><Copy size={16} /> Copiar prévia</button><a className="btn btn-outline" href={INSTAGRAM_URL} target="_blank" rel="noreferrer"><Instagram size={16} /> Abrir Instagram</a></div>{copyStatus && <p className="tool-copy-status" role="status">{copyStatus}</p>}<p className="tool-disclaimer">Este painel apenas prepara um texto para sua revisão. Não envia mensagem, não confirma presença e não reserva estande.</p></div></div>
      </section>
    </div>
  );
}

function getShareText(kind: ToolKind, draft: Draft, selected: ShareKey[]) {
  const sections = kind === 'visit' ? visitSections(draft as VisitDraft) : exhibitSections(draft as ExhibitDraft);
  const sectionRows = (title: string) => sections.find((section) => section.title.startsWith(title))?.rows ?? [];
  const groups: { key: string; title: string; rows: { label: string; value: string }[] }[] = kind === 'visit' ? [
    { key: 'city', title: 'Edição considerada', rows: [sectionRows('Etapa A')[0]] },
    { key: 'goals', title: 'Objetivo', rows: [sectionRows('Etapa A')[1]] },
    { key: 'research', title: 'O que quero pesquisar', rows: [sectionRows('Etapa A')[2]] },
    { key: 'doubts', title: 'Perguntas e confirmações', rows: [sectionRows('Etapa B')[1], sectionRows('Etapa C')[0]] },
    { key: 'comparisons', title: 'Pontos de comparação', rows: [sectionRows('Etapa B')[0]] },
    { key: 'store', title: 'Informações da loja', rows: [sectionRows('Etapa B')[2]] },
    { key: 'take', title: 'O que quero levar', rows: [sectionRows('Etapa C')[2]] },
    { key: 'decision', title: 'Decisão interna', rows: [sectionRows('Etapa C')[1]] },
    { key: 'notes', title: 'Notas internas', rows: [sectionRows('Etapa D')[0]] },
  ] : [
    { key: 'city', title: 'Cidades de interesse', rows: [sectionRows('Etapa A')[0]] },
    { key: 'line', title: 'Linha ou categoria', rows: [sectionRows('Etapa A')[1]] },
    { key: 'goals', title: 'Objetivos da empresa', rows: [sectionRows('Etapa A')[2]] },
    { key: 'doubts', title: 'Dúvidas comerciais e operacionais', rows: [sectionRows('Etapa B')[0], sectionRows('Etapa B')[1], sectionRows('Etapa B')[2]] },
    { key: 'preparation', title: 'Preparação interna', rows: [sectionRows('Etapa C')[0]] },
    { key: 'decision', title: 'Decisão interna', rows: [sectionRows('Etapa C')[1]] },
    { key: 'criteria', title: 'Critérios de comparação', rows: [sectionRows('Etapa C')[2]] },
    { key: 'next', title: 'Próximo passo', rows: [sectionRows('Etapa D')[0]] },
  ];
  const lines = [`Olá, gostaria de consultar a equipe ${kind === 'visit' ? 'sobre uma visita' : 'sobre uma possível participação'} na ${APP_NAME}.`, ''];
  groups.filter((group) => selected.includes(group.key)).forEach((group) => {
    const realRows = group.rows.filter((answer) => answer && answer.value !== 'Ainda não preenchido');
    if (!realRows.length) return;
    lines.push(`${group.title}:`);
    realRows.forEach((answer) => lines.push(`${answer.label}: ${answer.value}`));
    lines.push('');
  });
  lines.push('Gostaria de confirmar as informações disponíveis e os próximos passos.');
  return lines.join('\n');
}

export default function Tools({ kind }: ToolsProps) {
  const { draft, setDraft, hydrated } = useDraft(kind);
  const [currentStep, setCurrentStep] = useState(0);
  const [reviewing, setReviewing] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [undoDraft, setUndoDraft] = useState<Draft | null>(null);
  const [notice, setNotice] = useState('');
  const [shareOpen, setShareOpen] = useState(false);
  const [shareSelected, setShareSelected] = useState<ShareKey[]>(['city', 'doubts']);
  const [sharePreview, setSharePreview] = useState('');
  const [copyStatus, setCopyStatus] = useState('');
  const sections = useMemo(() => kind === 'visit' ? visitSections(draft as VisitDraft) : exhibitSections(draft as ExhibitDraft), [draft, kind]);
  const plainText = useMemo(() => buildPlainText(kind, draft, sections), [draft, kind, sections]);
  const title = kind === 'visit' ? `Caderno de visita ${APP_NAME} 2027` : `Planejador de participação ${APP_NAME} 2027`;
  const subtitle = kind === 'visit' ? 'Organize lançamentos, produtos, preços e condições que quer comparar antes de visitar a feira.' : 'Organize as cidades de interesse e as informações que sua empresa precisa confirmar antes de avaliar um estande.';
  const microcopy = kind === 'visit' ? 'Entrada gratuita para lojistas com CNPJ ou MEI. O Caderno é para organizar sua visita; o cadastro é feito pelo formulário da feira. Não precisa informar seu CNPJ aqui.' : 'O planejador ajuda na preparação interna. Não confirma disponibilidade, não calcula retorno e não reserva estande.';

  useEffect(() => {
    setCurrentStep(0);
    setReviewing(false);
    setShareSelected(['city', 'doubts']);
  }, [kind]);

  const updateVisit = (patch: Partial<VisitDraft>) => setDraft((previous) => ({ ...(previous as VisitDraft), ...patch }));
  const updateExhibit = (patch: Partial<ExhibitDraft>) => setDraft((previous) => ({ ...(previous as ExhibitDraft), ...patch }));
  const openShare = () => {
    const defaults: ShareKey[] = ['city', 'doubts'];
    setShareSelected(defaults);
    setSharePreview(getShareText(kind, draft, defaults));
    setCopyStatus('');
    setShareOpen(true);
  };
  const download = () => {
    downloadText(plainText, `showbrinq-${kind === 'visit' ? 'caderno-visita' : 'planejador-participacao'}-2027.txt`);
    setNotice('Download preparado em formato .txt.');
  };
  const print = () => {
    window.print();
  };
  const clearDraft = () => {
    setUndoDraft(draft);
    setDraft(createEmptyDraft(kind));
    setConfirmClear(false);
    setNotice('Rascunho apagado deste dispositivo.');
    try { window.localStorage.removeItem(storageKey(kind)); } catch { /* noop */ }
  };
  const undo = () => {
    if (!undoDraft) return;
    setDraft(undoDraft);
    setUndoDraft(null);
    setNotice('Rascunho restaurado.');
  };
  const copyPreview = async () => {
    try {
      if (!navigator.clipboard) throw new Error('clipboard-unavailable');
      await navigator.clipboard.writeText(sharePreview);
      setCopyStatus('Prévia copiada. Se preferir, você também pode selecionar o texto manualmente.');
    } catch {
      setCopyStatus('Não foi possível copiar automaticamente. Selecione o texto na prévia e copie manualmente.');
    }
  };

  return (
    <div className="tool-page">
      <div className="tool-interface">
        <div className="container tool-container">
          <header className="tool-hero">
            <div className="tool-hero-mark" aria-hidden="true">{kind === 'visit' ? <NotebookPen size={28} /> : <ClipboardList size={28} />}</div>
            <div><span className="eyebrow">{APP_NAME} · ferramentas gratuitas</span><h1>{title}</h1><p>{subtitle}</p><p className="tool-microcopy">{microcopy}</p></div>
          </header>
          <div className="tool-layout">
            <ProgressSidebar kind={kind} currentStep={currentStep} setStep={(step) => { setReviewing(false); setCurrentStep(step); }} onReview={() => setReviewing(true)} onClear={() => setConfirmClear(true)} confirmClear={confirmClear} onConfirmClear={clearDraft} onCancelClear={() => setConfirmClear(false)} onUndo={undo} hasUndo={Boolean(undoDraft)} hydrated={hydrated} />
            <div className="tool-main-column">
              {notice && <div className="tool-notice" role="status"><span>{notice}</span><button type="button" aria-label="Fechar aviso" onClick={() => setNotice('')}><X size={15} /></button></div>}
              {reviewing ? <ReviewPanel kind={kind} sections={sections} onBack={() => setReviewing(false)} /> : (
                <div className="tool-form" key={`${kind}-${currentStep}`}>
                  {kind === 'visit' ? <VisitStep draft={draft as VisitDraft} update={updateVisit} currentStep={currentStep} onDownload={download} onPrint={print} onShare={openShare} /> : <ExhibitStep draft={draft as ExhibitDraft} update={updateExhibit} currentStep={currentStep} onShare={openShare} onReview={() => setReviewing(true)} onDownload={download} onPrint={print} />}
                </div>
              )}
              {!reviewing && <div className="tool-navigation"><button type="button" className="btn btn-outline" onClick={() => setCurrentStep((step) => Math.max(0, step - 1))} disabled={currentStep === 0}><ArrowLeft size={16} /> Anterior</button><span>Etapa {currentStep + 1} de 4 · você pode voltar e editar</span><button type="button" className="btn btn-primary" onClick={() => setCurrentStep((step) => Math.min(3, step + 1))} disabled={currentStep === 3}>Próxima etapa <ArrowRight size={16} /></button></div>}
            </div>
          </div>
        </div>
      </div>
      <PrintSummary kind={kind} sections={sections} />
      {shareOpen && <SharePanel kind={kind} selected={shareSelected} setSelected={keys => { setShareSelected(keys); setSharePreview(getShareText(kind, draft, keys)); setCopyStatus(''); }} preview={sharePreview} setPreview={value => { setSharePreview(value); setCopyStatus(''); }} onRegenerate={() => setSharePreview(getShareText(kind, draft, shareSelected))} onClose={() => setShareOpen(false)} copyStatus={copyStatus} onCopy={copyPreview} />}
    </div>
  );
}
