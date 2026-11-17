import {
  ArrowUpRight,
  Building2,
  Check,
  Copy,
  Instagram,
  MessageCircle,
  Pencil,
  Store,
} from 'lucide-react';
import {
  type ChangeEvent,
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  useEffect,
  useRef,
  useState,
} from 'react';
import { editions, type Profile } from '../data';
import { APP_NAME, INSTAGRAM_URL } from '../config';
import '../contact.css';

const CITY_UNDECIDED = 'undecided';
const CITY_OTHER = 'other';
const profileOrder: Profile[] = ['lojista', 'expositor'];

type ContactForm = {
  name: string;
  brand: string;
  editionId: string;
  context: string;
  note: string;
  otherCity: string;
  model: string;
};

type ErrorField = 'name' | 'city';
type FormErrors = Partial<Record<ErrorField, string>>;

type ContextOption = {
  value: string;
  label: string;
};

const contextOptions: Record<Profile, ContextOption[]> = {
  lojista: [
    { value: 'acesso', label: 'Dúvida sobre o cadastro ou acesso' },
    { value: 'local', label: 'Local e horários' },
    { value: 'participantes', label: 'Marcas previstas para a edição' },
    { value: 'outro-momento', label: 'Ainda estou entendendo o que procuro' },
  ],
  expositor: [
    { value: 'estrutura', label: 'Formatos, metragem e estrutura' },
    { value: 'condicoes', label: 'Valores, pagamento e disponibilidade' },
    { value: 'operacao', label: 'Manual, montagem e operação' },
    { value: 'outro-momento', label: 'Ainda estou entendendo o que procuro' },
  ],
};

const profileLabels: Record<Profile, { label: string; description: string }> = {
  lojista: {
    label: 'Lojista',
    description: 'Quero conhecer a feira',
  },
  expositor: {
    label: 'Expositor',
    description: 'Quero apresentar minha marca',
  },
};

function cityKey(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase('pt-BR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\s_-]+/g, '-');
}

function findEdition(value?: string): (typeof editions)[number] | undefined {
  if (!value?.trim()) return undefined;
  const key = cityKey(value);
  return editions.find(
    (edition) => cityKey(edition.id) === key || cityKey(edition.city) === key,
  );
}

function initialEditionId(city?: string): string {
  const propEdition = findEdition(city);
  if (propEdition) return propEdition.id;

  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    const queryCity = params.get('cidade') ?? params.get('city');
    const queryEdition = findEdition(queryCity ?? undefined);
    return queryEdition?.id ?? '';
  }

  return '';
}

function getCityLabel(form: ContactForm): string {
  if (form.editionId === CITY_UNDECIDED) return 'Ainda não decidi a cidade';
  if (form.editionId === CITY_OTHER) {
    return form.otherCity.trim()
      ? `Outra cidade: ${form.otherCity.trim()}`
      : 'Outra cidade';
  }

  const edition = editions.find((item) => item.id === form.editionId);
  return edition ? `${edition.city} — ${edition.state}` : 'Cidade não informada';
}

function getDateLabel(dateId: string): string {
  const edition = editions.find((item) => item.id === dateId);
  return edition ? `${edition.dates} — ${edition.city}` : 'Data não informada';
}

function getContextLabel(profile: Profile, value: string): string | undefined {
  return contextOptions[profile].find((option) => option.value === value)?.label;
}

function buildMessage(profile: Profile, form: ContactForm): string {
  const profileLabel = profile === 'lojista' ? 'lojista' : 'expositor';
  const contextLabel = getContextLabel(profile, form.context);
  const lines = [
    `Olá, equipe ${APP_NAME}!`,
    '',
    `Meu nome é ${form.name.trim()}${form.brand.trim() ? ` e falo em nome de ${form.brand.trim()}` : ''}.`,
    profile === 'expositor'
      ? `Tenho interesse em apresentar minha linha no Circuito ${APP_NAME} 2027.`
      : `Tenho interesse em conhecer o ${APP_NAME} como ${profileLabel}.`,
    '',
    `Cidade de interesse: ${getCityLabel(form)}`,
    ...(editions.some(item => item.id === form.editionId) ? [`Data anunciada: ${getDateLabel(form.editionId)}`] : []),
  ];

  if (contextLabel) lines.push(`O que procuro: ${contextLabel}`);
  if (form.note.trim()) lines.push(`Observação: ${form.note.trim()}`);
  if (profile === 'expositor' && /^modelo-[1-4]$/.test(form.model)) lines.push(`Modelo de estande de interesse: Modelo ${form.model.slice(-1)} (condições e disponibilidade a confirmar).`);

  lines.push('', 'Podem me orientar sobre os próximos passos?', '', 'Obrigado(a)!');
  return lines.join('\n');
}

function fallbackCopy(text: string): boolean {
  if (typeof document === 'undefined') return false;
  const helper = document.createElement('textarea');
  helper.value = text;
  helper.setAttribute('readonly', '');
  helper.style.position = 'fixed';
  helper.style.opacity = '0';
  helper.style.pointerEvents = 'none';
  document.body.appendChild(helper);
  helper.select();
  helper.setSelectionRange(0, helper.value.length);

  let copied = false;
  try {
    copied = document.execCommand('copy');
  } catch {
    copied = false;
  }
  document.body.removeChild(helper);
  return copied;
}

export type ContactProps = {
  profile?: Profile;
  city?: string;
  lockProfile?: boolean;
  standModel?: string;
};

export default function Contact({ profile, city, lockProfile = false, standModel }: ContactProps) {
  const [selectedProfile, setSelectedProfile] = useState<Profile>(profile ?? 'lojista');
  const [form, setForm] = useState<ContactForm>(() => ({
    name: '',
    brand: '',
    editionId: initialEditionId(city),
    context: '',
    note: '',
    otherCity: '',
    model: /^modelo-[1-4]$/.test(standModel ?? '') ? standModel! : '',
  }));
  const [errors, setErrors] = useState<FormErrors>({});
  const [preview, setPreview] = useState<string | null>(null);
  const [copyStatus, setCopyStatus] = useState('');
  const previousProfileProp = useRef(profile);
  const tabRefs = useRef<Record<Profile, HTMLButtonElement | null>>({
    lojista: null,
    expositor: null,
  });
  const fieldRefs = useRef<Record<ErrorField, HTMLElement | null>>({
    name: null,
    city: null,
  });
  const previewRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (profile && profile !== previousProfileProp.current) {
      setSelectedProfile(profile);
      setPreview(null);
      setCopyStatus('');
    }
    previousProfileProp.current = profile;
  }, [profile]);

  useEffect(() => {
    const next = findEdition(city);
    if (next) setForm(current => ({ ...current, editionId: next.id }));
  }, [city]);

  useEffect(() => {
    if (standModel && /^modelo-[1-4]$/.test(standModel)) {
      setForm(current => ({...current, model: standModel}));
      setPreview(null);
      setCopyStatus('');
    }
  }, [standModel]);

  useEffect(() => {
    const firstError = (['name', 'city'] as ErrorField[]).find(
      (field) => errors[field],
    );
    if (firstError) fieldRefs.current[firstError]?.focus();
  }, [errors]);

  function updateForm(field: keyof ContactForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
    if (field === 'name' || field === 'editionId') {
      const errorField: ErrorField = field === 'name' ? 'name' : 'city';
      setErrors((current) => {
        if (!current[errorField]) return current;
        const next = { ...current };
        delete next[errorField];
        return next;
      });
    }
  }

  function handleProfileChange(nextProfile: Profile) {
    setSelectedProfile(nextProfile);
    setPreview(null);
    setCopyStatus('');
    setErrors({});
  }

  function handleTabKeyDown(event: ReactKeyboardEvent<HTMLButtonElement>, current: Profile) {
    const currentIndex = profileOrder.indexOf(current);
    let nextIndex = currentIndex;

    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      nextIndex = (currentIndex + 1) % profileOrder.length;
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      nextIndex = (currentIndex - 1 + profileOrder.length) % profileOrder.length;
    } else if (event.key === 'Home') {
      nextIndex = 0;
    } else if (event.key === 'End') {
      nextIndex = profileOrder.length - 1;
    } else {
      return;
    }

    event.preventDefault();
    const nextProfile = profileOrder[nextIndex];
    handleProfileChange(nextProfile);
    if (typeof window !== 'undefined') {
      window.requestAnimationFrame(() => tabRefs.current[nextProfile]?.focus());
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors: FormErrors = {};

    if (!form.name.trim()) nextErrors.name = 'Informe seu nome.';
    if (!form.editionId) nextErrors.city = 'Escolha uma cidade, “Ainda não decidi” ou “Outra cidade”.';

    setErrors(nextErrors);
    setCopyStatus('');
    if (Object.keys(nextErrors).length > 0) {
      setPreview(null);
      return;
    }

    setPreview(buildMessage(selectedProfile, form));
  }

  async function handleCopy() {
    if (!preview) return;
    let copied = false;

    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(preview);
        copied = true;
      }
    } catch {
      copied = false;
    }

    if (!copied) copied = fallbackCopy(preview);

    if (copied) {
      setCopyStatus('Mensagem copiada.');
      return;
    }

    setCopyStatus('Não foi possível copiar automaticamente. Selecione o texto da mensagem para copiar.');
    previewRef.current?.focus();
  }

  function handleEdit() {
    setPreview(null);
    setCopyStatus('');
    if (typeof window !== 'undefined') {
      window.requestAnimationFrame(() => fieldRefs.current.name?.focus());
    }
  }

  function handlePreviewChange(event: ChangeEvent<HTMLTextAreaElement>) {
    setPreview(event.target.value);
    setCopyStatus('');
  }

  return (
    <section className="contact-section" id="contato" aria-labelledby="contact-title">
      <div className="container contact-shell">
        <div className="contact-layout">
          <div className="contact-copy">
            <p className="eyebrow">Contato · {APP_NAME}</p>
            <h2 id="contact-title">O próximo passo começa com uma boa conversa.</h2>
            <p className="contact-description">
              {lockProfile
                ? 'Conte à organização o que sua marca quer apresentar, quais cidades interessam e o que precisa confirmar sobre a participação.'
                : 'Ficou com uma dúvida sobre a visita? Escreva para a equipe e prepare uma mensagem com a cidade e o assunto que quer esclarecer. Para apresentar sua marca, use o contato comercial de expositores.'}
            </p>
            <div className="contact-notice" role="note">
              <MessageCircle size={20} aria-hidden="true" />
              <div>
                <strong>{lockProfile ? 'Prepare sua consulta. Ela não é enviada nem reserva um estande.' : 'Este formulário é para dúvidas, não para o cadastro da feira.'}</strong>
                <p>
                  {selectedProfile === 'expositor' ? 'As consultas comerciais de exposição seguem pelo formulário próprio da Showbrinq.' : 'Revise a mensagem preparada, copie e envie pelo Instagram se quiser.'}
                </p>
              </div>
            </div>
            <div className="contact-copy-tags" aria-label="Características do contato">
              <span className="tag">Conversa direta</span>
              <span className="tag">Você decide quando enviar</span>
            </div>
          </div>

          <div className="contact-card">
            <div className="contact-card-heading">
              <div>
                <p className="eyebrow">Fale com a organização</p>
                <h3>{preview ? 'Revise sua mensagem' : 'Como podemos ajudar?'}</h3>
              </div>
              <span className="contact-card-icon" aria-hidden="true">
                {selectedProfile === 'lojista' ? <Store size={22} /> : <Building2 size={22} />}
              </span>
            </div>

            {!lockProfile && <div className="contact-tabs" role="tablist" aria-label="Perfil de contato">
              {profileOrder.map((item) => {
                const isSelected = selectedProfile === item;
                return (
                  <button
                    key={item}
                    ref={(element) => {
                      tabRefs.current[item] = element;
                    }}
                    className={`contact-tab${isSelected ? ' contact-tab-active' : ''}`}
                    type="button"
                    role="tab"
                    aria-selected={isSelected}
                    aria-controls="contact-form-panel"
                    id={`contact-tab-${item}`}
                    tabIndex={isSelected ? 0 : -1}
                    onClick={() => handleProfileChange(item)}
                    onKeyDown={(event) => handleTabKeyDown(event, item)}
                  >
                    <span>{profileLabels[item].label}</span>
                    <small>{profileLabels[item].description}</small>
                  </button>
                );
              })}
            </div>}

            {selectedProfile === 'expositor' ? (
              <div className="contact-preview" id="contact-form-panel" role={lockProfile ? undefined : 'tabpanel'} aria-labelledby={lockProfile ? undefined : 'contact-tab-expositor'}>
                <p className="contact-preview-label">Contato comercial para expositores</p>
                <h3>Vamos conversar sobre a participação da sua marca?</h3>
                <p>Consulte modelos de estandes, condições e cidades de interesse pelo formulário comercial. A mensagem poderá ser revisada antes de abrir o WhatsApp da MN Eventos.</p>
                <a className="btn btn-primary" href={`/expositores${editions.some(e=>e.id===form.editionId)?`?cidade=${form.editionId}`:''}#contato`}>Consultar exposição pelo WhatsApp <ArrowUpRight size={17} aria-hidden="true"/></a>
              </div>
            ) : preview ? (
              <div
                className="contact-preview"
                id="contact-form-panel"
                role={lockProfile ? undefined : 'tabpanel'}
                aria-labelledby={lockProfile ? undefined : `contact-tab-${selectedProfile}`}
              >
                <p className="contact-preview-label">Mensagem preparada — não enviada</p>
                <p className="contact-preview-help">
                  Revise o texto abaixo. Abrir o Instagram não envia a mensagem: copie,
                  cole na conversa e envie somente se desejar.
                </p>
                <label className="contact-label" htmlFor="contact-preview-text">
                  Texto da mensagem <span className="contact-optional">(editável)</span>
                </label>
                <textarea
                  ref={previewRef}
                  id="contact-preview-text"
                  className="contact-preview-text"
                  value={preview}
                  onChange={handlePreviewChange}
                  rows={12}
                  spellCheck="true"
                />
                <div className="contact-preview-actions">
                  <button className="btn btn-primary" type="button" onClick={handleCopy}>
                    {copyStatus === 'Mensagem copiada.' ? (
                      <Check size={17} aria-hidden="true" />
                    ) : (
                      <Copy size={17} aria-hidden="true" />
                    )}
                    {copyStatus === 'Mensagem copiada.' ? 'Copiada' : 'Copiar mensagem'}
                  </button>
                  <a
                    className="btn btn-outline"
                    href={INSTAGRAM_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Instagram size={17} aria-hidden="true" />
                    Abrir Instagram
                    <ArrowUpRight size={16} aria-hidden="true" />
                  </a>
                  <button className="btn btn-outline contact-edit-button" type="button" onClick={handleEdit}>
                    <Pencil size={17} aria-hidden="true" />
                    Editar dados
                  </button>
                </div>
                <p className="contact-copy-status" role="status" aria-live="polite">
                  {copyStatus}
                </p>
                {copyStatus.startsWith('Não foi possível') && (
                  <p className="contact-copy-fallback">
                    O campo acima continua selecionável: clique nele, selecione o texto e copie
                    com o comando de copiar do seu dispositivo.
                  </p>
                )}
              </div>
            ) : (
              <form
                className="contact-form"
                id="contact-form-panel"
                role={lockProfile ? undefined : 'tabpanel'}
                aria-labelledby={lockProfile ? undefined : `contact-tab-${selectedProfile}`}
                onSubmit={handleSubmit}
                noValidate
              >
                <div className="contact-fields">
                  <div className="contact-field contact-field-full">
                    <label className="contact-label" htmlFor="contact-name">
                      Nome <span aria-hidden="true">*</span>
                    </label>
                    <input
                      ref={(element) => {
                        fieldRefs.current.name = element;
                      }}
                      id="contact-name"
                      name="name"
                      type="text"
                      value={form.name}
                      onChange={(event) => updateForm('name', event.target.value)}
                      aria-required="true"
                      aria-invalid={Boolean(errors.name)}
                      aria-describedby={errors.name ? 'contact-name-error' : undefined}
                      autoComplete="name"
                    />
                    {errors.name && (
                      <p className="contact-field-error" id="contact-name-error" role="alert">
                        {errors.name}
                      </p>
                    )}
                  </div>

                  <div className="contact-field">
                    <label className="contact-label" htmlFor="contact-brand">
                      {lockProfile ? 'Empresa ou marca' : 'Loja ou marca'} <span className="contact-optional">(opcional)</span>
                    </label>
                    <input
                      id="contact-brand"
                      name="brand"
                      type="text"
                      value={form.brand}
                      onChange={(event) => updateForm('brand', event.target.value)}
                    />
                  </div>

                  <div className="contact-field">
                    <label className="contact-label" htmlFor="contact-city">
                      Cidade de interesse <span aria-hidden="true">*</span>
                    </label>
                    <select
                      ref={(element) => {
                        fieldRefs.current.city = element;
                      }}
                      id="contact-city"
                      name="city"
                      value={form.editionId}
                      onChange={(event) => updateForm('editionId', event.target.value)}
                      aria-required="true"
                      aria-invalid={Boolean(errors.city)}
                      aria-describedby={errors.city ? 'contact-city-error' : undefined}
                    >
                      <option value="">Selecione uma opção</option>
                      {editions.map((edition) => (
                        <option key={edition.id} value={edition.id}>
                          {edition.city} — {edition.shortDate} 2027
                        </option>
                      ))}
                      <option value={CITY_UNDECIDED}>Ainda não decidi</option>
                      <option value={CITY_OTHER}>Outra cidade</option>
                    </select>
                    {errors.city && (
                      <p className="contact-field-error" id="contact-city-error" role="alert">
                        {errors.city}
                      </p>
                    )}
                  </div>

                  {form.editionId === CITY_OTHER && (
                    <div className="contact-field contact-field-full contact-field-revealed">
                      <label className="contact-label" htmlFor="contact-other-city">
                        Qual cidade? <span className="contact-optional">(opcional)</span>
                      </label>
                      <input
                        id="contact-other-city"
                        name="otherCity"
                        type="text"
                        value={form.otherCity}
                        onChange={(event) => updateForm('otherCity', event.target.value)}
                        aria-describedby="contact-other-city-help"
                      />
                      <p className="contact-field-help" id="contact-other-city-help">
                        Se preferir, deixe em branco e informe apenas que busca outra cidade.
                      </p>
                    </div>
                  )}

                  <div className="contact-field contact-field-full">
                    <label className="contact-label" htmlFor="contact-context">
                      {selectedProfile === 'lojista' ? 'O que precisa confirmar para visitar?' : 'O que precisa entender sobre participação?'}{' '}
                      <span className="contact-optional">(opcional)</span>
                    </label>
                    <select
                      id="contact-context"
                      name="context"
                      value={form.context}
                      onChange={(event) => updateForm('context', event.target.value)}
                    >
                      <option value="">Selecione uma opção (se quiser)</option>
                      {contextOptions[selectedProfile].map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="contact-field contact-field-full">
                    <label className="contact-label" htmlFor="contact-note">
                      Quer acrescentar algo? <span className="contact-optional">(opcional)</span>
                    </label>
                    <textarea
                      id="contact-note"
                      name="note"
                      rows={3}
                      maxLength={240}
                      placeholder="Uma dúvida ou contexto breve"
                      value={form.note}
                      onChange={(event) => updateForm('note', event.target.value)}
                      aria-describedby="contact-note-help"
                    />
                    <p className="contact-field-help" id="contact-note-help">
                      Até 240 caracteres. Não inclua dados que não queira compartilhar.
                    </p>
                  </div>
                </div>

                <button className="btn btn-primary contact-submit" type="submit">
                  <MessageCircle size={18} aria-hidden="true" />
                  {selectedProfile === 'lojista' ? 'Preparar pergunta sobre minha visita' : 'Preparar consulta sobre exposição'}
                </button>
                <p className="contact-field-help">Dados usados só nesta tela para preparar a mensagem; não são enviados nem guardados pelo site. <a href="/privacidade">Privacidade</a>.</p>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
