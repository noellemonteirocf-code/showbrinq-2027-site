import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import type { Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { useLocation } from 'wouter';
import {
  AlertCircle, AlertTriangle, ArrowLeft, Bold, CalendarDays, Check, CheckCircle2,
  ChevronRight, Clock3, Edit3, ExternalLink, Eye, FileText, Globe2, Heading2,
  Heading3, ImagePlus, Italic, Link2, List, ListOrdered, LogOut, Menu, Monitor,
  Plus, Quote, Redo2, RefreshCw, Save, Search, Smartphone, Sparkles, Star,
  Undo2, UploadCloud, X,
} from 'lucide-react';
import {
  defaultPostFields,
  type AdminSession,
  type BlogPost,
  type PostFields,
} from '../../shared/cms';
import {
  CmsApiError,
  createAdminPost,
  getAdminPost,
  getAdminPosts,
  getAdminSession,
  loginAdmin,
  logoutAdmin,
  publishAdminPost,
  unpublishAdminPost,
  updateAdminPost,
  uploadAdminCover,
} from '../lib/cms-client';
import '../admin.css';

type AccessState =
  | { kind: 'loading' }
  | { kind: 'setup' }
  | { kind: 'signed-out' }
  | { kind: 'forbidden' }
  | { kind: 'authorized'; session: AdminSession }
  | { kind: 'error'; message: string };

type AdminRoute = { kind: 'list' } | { kind: 'new' } | { kind: 'edit'; id: number } | { kind: 'invalid' };
type FilterStatus = 'all' | 'draft' | 'published';
type PreviewMode = 'mobile' | 'desktop';

const ALLOWED_BODY_TAGS = new Set(['p', 'h2', 'h3', 'ul', 'ol', 'li', 'blockquote', 'strong', 'b', 'em', 'i', 'a', 'br']);
const BLOCKED_BODY_TAGS = new Set(['script', 'style', 'iframe', 'object', 'embed', 'svg', 'math', 'template']);
const MAX_COVER_BYTES = 5 * 1024 * 1024;
const COVER_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

function parseAdminRoute(path: string): AdminRoute {
  const clean = path.split('?')[0].replace(/\/+$/, '') || '/';
  if (clean === '/admin' || clean === '/admin/') return { kind: 'list' };
  if (clean === '/admin/posts/new') return { kind: 'new' };
  const match = clean.match(/^\/admin\/posts\/(\d+)$/);
  if (match) return { kind: 'edit', id: Number(match[1]) };
  return { kind: 'invalid' };
}

function fieldsFromPost(post: BlogPost): PostFields {
  return {
    title: post.title,
    slug: post.slug,
    excerpt: post.excerpt,
    category: post.category,
    coverUrl: post.coverUrl,
    coverAlt: post.coverAlt,
    bodyHtml: post.bodyHtml,
    seoTitle: post.seoTitle,
    seoDescription: post.seoDescription,
    featured: post.featured,
  };
}

function slugFromTitle(title: string): string {
  return title.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function isSafeLink(value: string): boolean {
  const candidate = value.trim();
  if (!candidate || /[\u0000-\u001f\u007f]/.test(candidate)) return false;
  if (candidate.startsWith('//')) return false;
  if (candidate.startsWith('/') || candidate.startsWith('#') || candidate.startsWith('?') || candidate.startsWith('./') || candidate.startsWith('../')) return true;
  try {
    const parsed = new URL(candidate, window.location.origin);
    return ['http:', 'https:', 'mailto:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}

function sanitizeHtml(input: string): string {
  if (typeof window === 'undefined' || !input) return '';
  const parsed = new DOMParser().parseFromString(input, 'text/html');
  const cleanNode = (node: Node): Node | null => {
    if (node.nodeType === Node.TEXT_NODE) return document.createTextNode(node.textContent ?? '');
    if (!(node instanceof Element)) return null;
    const tag = node.tagName.toLowerCase();
    if (BLOCKED_BODY_TAGS.has(tag)) return null;
    const children = Array.from(node.childNodes).map(cleanNode).filter((child): child is Node => child !== null);
    if (!ALLOWED_BODY_TAGS.has(tag)) {
      const fragment = document.createDocumentFragment();
      children.forEach((child) => fragment.appendChild(child));
      return fragment;
    }
    const clean = document.createElement(tag);
    if (tag === 'a') {
      const href = node.getAttribute('href') ?? '';
      if (isSafeLink(href)) {
        clean.setAttribute('href', href.trim());
        clean.setAttribute('rel', 'noopener noreferrer');
      }
    }
    children.forEach((child) => clean.appendChild(child));
    return clean;
  };
  const container = document.createElement('div');
  Array.from(parsed.body.childNodes).forEach((node) => {
    const clean = cleanNode(node);
    if (clean) container.appendChild(clean);
  });
  return container.innerHTML;
}

function bodyTextLength(html: string): number {
  if (typeof window === 'undefined') return 0;
  const documentBody = new DOMParser().parseFromString(sanitizeHtml(html), 'text/html');
  return (documentBody.body.textContent ?? '').trim().length;
}

function routeForId(id: number): string {
  return `/admin/posts/${encodeURIComponent(String(id))}`;
}

function displayDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Data indisponível';
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
}

function isAuthError(error: unknown): error is CmsApiError {
  return error instanceof CmsApiError && (error.status === 401 || error.status === 403);
}

function classifySession(session: AdminSession): AccessState {
  if (!session.configured) return { kind: 'setup' };
  if (session.authenticated && !session.authorized) return { kind: 'forbidden' };
  if (!session.authenticated) return { kind: 'signed-out' };
  if (session.authorized) return { kind: 'authorized', session };
  return { kind: 'forbidden' };
}

function ToolbarButton({
  label, active = false, disabled = false, onClick, children,
}: {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      className={`sb-tool-button${active ? ' is-active' : ''}`}
      aria-label={label}
      title={label}
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function RichTextEditor({
  initialHtml, onChange, onError,
}: {
  initialHtml: string;
  onChange: (html: string) => void;
  onError: (message: string) => void;
}) {
  const changeRef = useRef(onChange);
  useEffect(() => { changeRef.current = onChange; }, [onChange]);
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] } }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        linkOnPaste: true,
        validate: isSafeLink,
        HTMLAttributes: { rel: 'noopener noreferrer' },
      }),
      Placeholder.configure({ placeholder: 'Comece a escrever o artigo…' }),
    ],
    content: sanitizeHtml(initialHtml),
    editorProps: {
      attributes: {
        'aria-label': 'Corpo do artigo',
        'aria-multiline': 'true',
        role: 'textbox',
        spellcheck: 'true',
      },
    },
    onUpdate: ({ editor: current }) => changeRef.current(current.getHTML()),
  }, []);

  const addLink = () => {
    if (!editor) return;
    const currentHref = editor.getAttributes('link').href as string | undefined;
    const value = window.prompt('Cole um endereço http(s), mailto ou caminho relativo seguro:', currentHref ?? '');
    if (value === null) return;
    const href = value.trim();
    if (!isSafeLink(href)) {
      onError('Use um link http://, https://, mailto: ou um caminho relativo seguro.');
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href }).run();
  };

  if (!editor) return <div className="sb-editor-loading" aria-live="polite">Preparando editor…</div>;
  return (
    <div className="sb-rich-editor">
      <div className="sb-toolbar" role="toolbar" aria-label="Formatação do artigo">
        <ToolbarButton label="Negrito" active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}><Bold size={19} /></ToolbarButton>
        <ToolbarButton label="Itálico" active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}><Italic size={19} /></ToolbarButton>
        <span className="sb-toolbar-separator" aria-hidden="true" />
        <ToolbarButton label="Título nível 2" active={editor.isActive('heading', { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}><Heading2 size={19} /></ToolbarButton>
        <ToolbarButton label="Título nível 3" active={editor.isActive('heading', { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}><Heading3 size={19} /></ToolbarButton>
        <ToolbarButton label="Lista com marcadores" active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()}><List size={19} /></ToolbarButton>
        <ToolbarButton label="Lista numerada" active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()}><ListOrdered size={19} /></ToolbarButton>
        <ToolbarButton label="Citação" active={editor.isActive('blockquote')} onClick={() => editor.chain().focus().toggleBlockquote().run()}><Quote size={19} /></ToolbarButton>
        <ToolbarButton label="Inserir ou editar link" active={editor.isActive('link')} onClick={addLink}><Link2 size={18} /></ToolbarButton>
        <span className="sb-toolbar-separator" aria-hidden="true" />
        <ToolbarButton label="Desfazer" disabled={!editor.can().undo()} onClick={() => editor.chain().focus().undo().run()}><Undo2 size={18} /></ToolbarButton>
        <ToolbarButton label="Refazer" disabled={!editor.can().redo()} onClick={() => editor.chain().focus().redo().run()}><Redo2 size={18} /></ToolbarButton>
      </div>
      <EditorContent editor={editor} className="sb-editor-content" />
      <div className="sb-editor-footnote">Formatação visual simples. O texto permanece legível em celulares e computadores.</div>
    </div>
  );
}

function AdminBrand({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`sb-brand${compact ? ' sb-brand-compact' : ''}`} aria-label="SHOWBRINQ Painel do Blog">
      <span className="sb-brand-mark" aria-hidden="true"><Sparkles size={19} /></span>
      <span className="sb-brand-copy"><strong>SHOWBRINQ</strong><small>Painel do Blog</small></span>
    </div>
  );
}

function AccessScreen({
  state, sessionError, onRetry,
}: {
  state: AccessState;
  sessionError: string;
  onRetry: () => void;
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginBusy, setLoginBusy] = useState(false);
  const [loginError, setLoginError] = useState('');
  const login = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (loginBusy) return;
    setLoginBusy(true);
    setLoginError('');
    try {
      await loginAdmin(email, password);
      setPassword('');
      onRetry();
    } catch (error) {
      setLoginError(error instanceof CmsApiError && error.code === 'invalid_credentials'
        ? 'E-mail ou senha incorretos.'
        : error instanceof Error ? error.message : 'Não foi possível entrar. Tente novamente.');
    } finally {
      setLoginBusy(false);
    }
  };
  return (
    <main className="sb-access-page">
      <div className="sb-access-card">
        <AdminBrand />
        {state.kind === 'loading' && <div className="sb-access-content" role="status"><span className="sb-spinner" /><h1>Conferindo acesso</h1><p>Estamos verificando sua sessão administrativa.</p></div>}
        {state.kind === 'setup' && <div className="sb-access-content"><span className="sb-access-icon is-pending"><Clock3 size={24} /></span><h1>Acesso administrativo pendente</h1><p>O acesso ao Painel do Blog ainda não foi configurado. Defina as variáveis BLOG_ADMIN_EMAIL e BLOG_ADMIN_PASSWORD (mínimo de 12 caracteres) na hospedagem e reinicie o site.</p><span className="sb-state-pill">Configuração pendente</span></div>}
        {state.kind === 'signed-out' && <div className="sb-access-content"><span className="sb-access-icon"><Globe2 size={24} /></span><h1>Painel do Blog</h1><p>Entre com o e-mail e a senha de administração para acessar os artigos da SHOWBRINQ.</p><form className="sb-login-form" onSubmit={login}><label>E-mail<input type="email" autoComplete="username" required value={email} onChange={event => setEmail(event.target.value)} /></label><label>Senha<input type="password" autoComplete="current-password" required value={password} onChange={event => setPassword(event.target.value)} /></label>{loginError && <p className="sb-login-error" role="alert">{loginError}</p>}<button className="sb-button sb-button-primary sb-login-button" type="submit" disabled={loginBusy}><Globe2 size={18} /> {loginBusy ? 'Entrando…' : 'Entrar'}</button></form></div>}
        {state.kind === 'forbidden' && <div className="sb-access-content"><span className="sb-access-icon is-forbidden"><AlertTriangle size={24} /></span><h1>Acesso administrativo não autorizado</h1><p>A sessão foi verificada, mas esta conta não tem permissão para administrar o Blog. Nenhum conteúdo foi aberto ou alterado.</p><span className="sb-state-pill is-forbidden">Acesso restrito</span></div>}
        {state.kind === 'error' && <div className="sb-access-content"><span className="sb-access-icon is-error"><AlertCircle size={24} /></span><h1>Não foi possível verificar a sessão</h1><p role="alert">{sessionError || state.message}</p><button className="sb-button sb-button-secondary" type="button" onClick={onRetry}><RefreshCw size={17} /> Tentar novamente</button></div>}
        <div className="sb-access-footer"><span className="sb-dot" /> Ambiente administrativo protegido</div>
      </div>
    </main>
  );
}

/** A published article whose publication date is still in the future is scheduled, not live. */
function isScheduled(post: Pick<BlogPost, 'status' | 'publishedAt'> | null | undefined): boolean {
  return Boolean(post && post.status === 'published' && post.publishedAt && Date.parse(post.publishedAt) > Date.now());
}
function formatSchedule(iso: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
function StatusBadge({ status, scheduled = false }: { status: BlogPost['status']; scheduled?: boolean }) {
  if (scheduled) return <span className="sb-status-badge is-scheduled"><span />Agendado</span>;
  return <span className={`sb-status-badge ${status === 'published' ? 'is-published' : 'is-draft'}`}><span />{status === 'published' ? 'Publicado' : 'Rascunho'}</span>;
}

function ArticlePreview({ fields, mode, onClose, onMode }: {
  fields: PostFields;
  mode: PreviewMode;
  onClose: () => void;
  onMode: (mode: PreviewMode) => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);
  const previewTitle = fields.seoTitle.trim() || fields.title.trim() || 'Título do artigo';
  const previewDescription = fields.seoDescription.trim() || fields.excerpt.trim() || 'A descrição do artigo aparecerá aqui quando você a preencher.';
  const snippetPath = `${window.location.host}/blog/${fields.slug.trim() || 'seu-artigo'}`;
  const body = sanitizeHtml(fields.bodyHtml);
  return (
    <div className="sb-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="sb-preview-modal" role="dialog" aria-modal="true" aria-labelledby="sb-preview-title">
        <header className="sb-modal-header">
          <div><span className="sb-eyebrow">PRÉ-VISUALIZAÇÃO</span><h2 id="sb-preview-title">Veja antes de salvar ou publicar</h2></div>
          <button ref={closeRef} className="sb-icon-button" type="button" aria-label="Fechar prévia" onClick={onClose}><X size={20} /></button>
        </header>
        <div className="sb-preview-switch" role="group" aria-label="Tamanho da prévia">
          <button type="button" className={mode === 'mobile' ? 'is-current' : ''} aria-pressed={mode === 'mobile'} onClick={() => onMode('mobile')}><Smartphone size={17} /> Celular · 390 px</button>
          <button type="button" className={mode === 'desktop' ? 'is-current' : ''} aria-pressed={mode === 'desktop'} onClick={() => onMode('desktop')}><Monitor size={17} /> Computador</button>
        </div>
        <div className="sb-preview-stage">
          <div className={`sb-preview-frame ${mode === 'mobile' ? 'is-mobile' : 'is-desktop'}`}>
            <div className="sb-preview-brand"><AdminBrand compact /></div>
            <div className="sb-preview-article">
              <div className="sb-preview-category">{fields.category.trim() || 'Blog SHOWBRINQ'}</div>
              <h1>{fields.title.trim() || 'O título do seu artigo'}</h1>
              {fields.excerpt.trim() && <p className="sb-preview-excerpt">{fields.excerpt}</p>}
              {fields.coverUrl && <img className="sb-preview-cover" src={fields.coverUrl} alt={fields.coverAlt || ''} />}
              {body ? <div className="sb-preview-body" dangerouslySetInnerHTML={{ __html: body }} /> : <p className="sb-preview-empty">O texto do artigo aparecerá aqui.</p>}
            </div>
          </div>
        </div>
        <section className="sb-serp-preview" aria-label="Prévia visual de resultado de busca">
          <div className="sb-serp-heading"><Search size={16} /><strong>Prévia visual de resultado de busca</strong><span>Simulação</span></div>
          <div className="sb-serp-card"><div className="sb-serp-site">SHOWBRINQ</div><div className="sb-serp-url">{snippetPath}</div><div className="sb-serp-title">{previewTitle}</div><p>{previewDescription}</p></div>
          <small>A apresentação e a exibição em buscadores dependem de cada plataforma; esta prévia não representa promessa de posicionamento.</small>
        </section>
      </section>
    </div>
  );
}

export default function Admin() {
  const [location, setLocation] = useLocation();
  const [access, setAccess] = useState<AccessState>({ kind: 'loading' });
  const [sessionError, setSessionError] = useState('');
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [postsError, setPostsError] = useState('');
  const [query, setQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [fields, setFields] = useState<PostFields>({ ...defaultPostFields });
  const [baseline, setBaseline] = useState<PostFields>({ ...defaultPostFields });
  const [activePost, setActivePost] = useState<BlogPost | null>(null);
  const [editorLoading, setEditorLoading] = useState(false);
  const [editorLoadError, setEditorLoadError] = useState('');
  const [slugEdited, setSlugEdited] = useState(false);
  const [formError, setFormError] = useState('');
  const [formNotice, setFormNotice] = useState('');
  const [scheduleAt, setScheduleAt] = useState('');
  const [conflict, setConflict] = useState(false);
  const [saveBusy, setSaveBusy] = useState(false);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [seoOpen, setSeoOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewMode, setPreviewMode] = useState<PreviewMode>('desktop');
  const [logoutNotice, setLogoutNotice] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dirtyRef = useRef(false);
  const lastLocationRef = useRef(location);
  const skipRoutePromptRef = useRef(false);
  const ignoreNextPopRef = useRef(false);
  const routeRequestId = useRef(0);

  const isDirty = useMemo(() => JSON.stringify(fields) !== JSON.stringify(baseline), [fields, baseline]);
  dirtyRef.current = isDirty;
  const route = parseAdminRoute(location);
  const editorIsNew = route.kind === 'new';
  const bodyLength = useMemo(() => bodyTextLength(fields.bodyHtml), [fields.bodyHtml]);

  const refreshSession = useCallback(() => {
    setAccess({ kind: 'loading' });
    setSessionError('');
    getAdminSession().then((session) => setAccess(classifySession(session))).catch((error: unknown) => {
      if (error instanceof CmsApiError && error.status === 401) {
        setAccess({ kind: 'signed-out' });
      } else if (error instanceof CmsApiError && error.status === 403) {
        setAccess({ kind: 'forbidden' });
      } else {
        const message = error instanceof Error ? error.message : 'Não foi possível conferir o acesso.';
        setSessionError(message);
        setAccess({ kind: 'error', message });
      }
    });
  }, []);

  useEffect(() => { refreshSession(); }, [refreshSession]);

  const handleAuthFailure = useCallback((error: unknown) => {
    if (isAuthError(error)) setAccess({ kind: error.status === 403 ? 'forbidden' : 'signed-out' });
  }, []);

  const replacePostInList = useCallback((post: BlogPost) => {
    setPosts((current) => {
      const found = current.some((item) => item.id === post.id);
      return found ? current.map((item) => item.id === post.id ? post : item) : [post, ...current];
    });
  }, []);

  const loadPosts = useCallback(async () => {
    setPostsLoading(true);
    setPostsError('');
    try {
      const result = await getAdminPosts();
      setPosts(Array.isArray(result.posts) ? result.posts : []);
    } catch (error) {
      if (isAuthError(error)) handleAuthFailure(error);
      else setPostsError(error instanceof Error ? error.message : 'Não foi possível carregar os artigos.');
    } finally {
      setPostsLoading(false);
    }
  }, [handleAuthFailure]);

  useEffect(() => {
    if (access.kind === 'authorized') void loadPosts();
  }, [access.kind, loadPosts]);

  useEffect(() => {
    const onPopState = (event: PopStateEvent) => {
      if (ignoreNextPopRef.current) {
        ignoreNextPopRef.current = false;
        event.stopImmediatePropagation();
        return;
      }
      if (!dirtyRef.current) return;
      if (!window.confirm('Há alterações não salvas. Deseja sair sem salvar?')) {
        event.stopImmediatePropagation();
        ignoreNextPopRef.current = true;
        window.history.forward();
        return;
      }
      skipRoutePromptRef.current = true;
    };
    window.addEventListener('popstate', onPopState, true);
    return () => window.removeEventListener('popstate', onPopState, true);
  }, []);

  const navigateAdmin = useCallback((to: string) => {
    if (to === location) { setDrawerOpen(false); return; }
    if (dirtyRef.current && !window.confirm('Há alterações não salvas. Deseja sair sem salvar?')) return;
    setDrawerOpen(false);
    skipRoutePromptRef.current = true;
    setLocation(to);
  }, [location, setLocation]);

  useEffect(() => {
    if (location !== lastLocationRef.current) {
      if (skipRoutePromptRef.current) {
        skipRoutePromptRef.current = false;
      } else if (dirtyRef.current && !window.confirm('Há alterações não salvas. Deseja sair sem salvar?')) {
        setLocation(lastLocationRef.current, { replace: true });
        return;
      }
      lastLocationRef.current = location;
    }

    if (access.kind !== 'authorized') return;
    const currentRoute = parseAdminRoute(location);
    setFormError('');
    setFormNotice('');
    setConflict(false);
    setEditorLoadError('');

    if (currentRoute.kind === 'list') {
      setEditorLoading(false);
      setActivePost(null);
      setFields({ ...defaultPostFields });
      setBaseline({ ...defaultPostFields });
      setSlugEdited(false);
      return;
    }
    if (currentRoute.kind === 'new') {
      setEditorLoading(false);
      setActivePost(null);
      setFields({ ...defaultPostFields });
      setBaseline({ ...defaultPostFields });
      setSlugEdited(false);
      setSeoOpen(false);
      return;
    }
    if (currentRoute.kind === 'invalid') {
      setEditorLoading(false);
      setEditorLoadError('Este endereço do painel não corresponde a um artigo.');
      return;
    }

    if (activePost?.id === currentRoute.id) {
      setEditorLoading(false);
      const savedFields = fieldsFromPost(activePost);
      setFields(savedFields);
      setBaseline(savedFields);
      setSlugEdited(true);
      return;
    }

    const requestId = ++routeRequestId.current;
    setEditorLoading(true);
    setActivePost(null);
    getAdminPost(currentRoute.id).then(({ post }) => {
      if (requestId !== routeRequestId.current) return;
      const loadedFields = fieldsFromPost(post);
      setActivePost(post);
      setFields(loadedFields);
      setBaseline(loadedFields);
      setSlugEdited(true);
      setSeoOpen(Boolean(post.seoTitle || post.seoDescription));
    }).catch((error: unknown) => {
      if (requestId !== routeRequestId.current) return;
      if (isAuthError(error)) handleAuthFailure(error);
      else setEditorLoadError(error instanceof Error ? error.message : 'Não foi possível abrir este artigo.');
    }).finally(() => {
      if (requestId === routeRequestId.current) setEditorLoading(false);
    });
  }, [location, access.kind, handleAuthFailure, setLocation]);

  useEffect(() => {
    if (!isDirty) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [isDirty]);

  const setField = useCallback(<K extends keyof PostFields>(key: K, value: PostFields[K]) => {
    setFields((current) => ({ ...current, [key]: value }));
    setFormError('');
    setFormNotice('');
  }, []);

  const reloadPost = useCallback(async (confirmDiscard = false) => {
    if (!activePost) return;
    if (confirmDiscard && dirtyRef.current && !window.confirm('Recarregar substituirá suas alterações locais pela versão atual do servidor. Copie manualmente o conteúdo que quiser preservar. Continuar?')) return;
    setEditorLoading(true);
    setFormError('');
    setConflict(false);
    try {
      const { post } = await getAdminPost(activePost.id);
      const loadedFields = fieldsFromPost(post);
      setActivePost(post);
      setFields(loadedFields);
      setBaseline(loadedFields);
      replacePostInList(post);
    } catch (error) {
      if (isAuthError(error)) handleAuthFailure(error);
      else setFormError(error instanceof Error ? error.message : 'Não foi possível recarregar o artigo.');
    } finally {
      setEditorLoading(false);
    }
  }, [activePost, handleAuthFailure, replacePostInList]);

  const saveFields = useCallback(async (): Promise<BlogPost | null> => {
    if (access.kind !== 'authorized' || saveBusy) return null;
    setSaveBusy(true);
    setFormError('');
    setFormNotice('');
    try {
      const result = activePost
        ? await updateAdminPost(activePost.id, fields, activePost.revision, access.session.csrfToken)
        : await createAdminPost(fields, access.session.csrfToken);
      const saved = result.post;
      const savedFields = fieldsFromPost(saved);
      setActivePost(saved);
      setFields(savedFields);
      setBaseline(savedFields);
      replacePostInList(saved);
      setConflict(false);
      setFormNotice(saved.status === 'published' ? 'Alterações salvas. A versão atualizada está no ar.' : 'Rascunho salvo no servidor.');
      if (!activePost) {
        skipRoutePromptRef.current = true;
        setLocation(routeForId(saved.id));
      }
      return saved;
    } catch (error) {
      if (isAuthError(error)) handleAuthFailure(error);
      else if (error instanceof CmsApiError && error.status === 409) {
        setConflict(true);
        setFormError('Este artigo foi alterado em outro lugar. Recarregue para ver a versão atual; copie manualmente o que quiser preservar. Nada foi sobrescrito.');
      } else {
        setFormError(error instanceof Error ? error.message : 'Não foi possível salvar o artigo.');
      }
      return null;
    } finally {
      setSaveBusy(false);
    }
  }, [access, activePost, fields, handleAuthFailure, replacePostInList, saveBusy, setLocation]);

  const saveCurrent = useCallback(async (): Promise<BlogPost | null> => {
    if (activePost?.status === 'published' && isDirty) {
      const confirmed = window.confirm('Este artigo já está publicado. As alterações só entrarão no Blog quando você salvar. Deseja aplicar as mudanças agora?');
      if (!confirmed) return null;
    }
    return saveFields();
  }, [activePost, isDirty, saveFields]);

  const handlePublish = useCallback(async (publishAt?: string) => {
    if (!fields.title.trim()) { setFormError('Informe o título antes de publicar.'); return; }
    if (!fields.slug.trim()) { setFormError('Informe o endereço (slug) antes de publicar.'); return; }
    if (!fields.excerpt.trim()) { setFormError('Escreva o resumo antes de publicar.'); return; }
    if (bodyLength < 100) { setFormError('O texto visível do artigo precisa ter pelo menos 100 caracteres para publicar.'); return; }
    if (fields.coverUrl && !fields.coverAlt.trim()) { setFormError('Descreva a imagem de capa no texto alternativo antes de publicar.'); return; }

    let post = activePost;
    if (isDirty || !post) {
      post = await saveFields();
      if (!post) return;
    }
    if (post.status === 'published' && !isScheduled(post)) return;
    if (publishAt) {
      const at = Date.parse(publishAt);
      if (!Number.isFinite(at) || at < Date.now() + 60_000) { setFormError('Escolha uma data e hora pelo menos 1 minuto à frente para agendar.'); return; }
      if (!window.confirm(`O artigo será publicado automaticamente em ${formatSchedule(publishAt)}. Até lá, ele fica fora do Blog. Confirmar agendamento?`)) return;
    } else if (!window.confirm('Este artigo ficará disponível no Blog da SHOWBRINQ. Deseja publicar agora?')) return;
    if (access.kind !== 'authorized') return;
    setSaveBusy(true);
    setFormError('');
    setFormNotice('');
    try {
      const { post: published } = await publishAdminPost(post.id, post.revision, access.session.csrfToken, publishAt);
      const publishedFields = fieldsFromPost(published);
      setActivePost(published);
      setFields(publishedFields);
      setBaseline(publishedFields);
      replacePostInList(published);
      setFormNotice(publishAt ? `Publicação agendada para ${formatSchedule(published.publishedAt)}.` : 'Artigo publicado no Blog.');
      setScheduleAt('');
    } catch (error) {
      if (isAuthError(error)) handleAuthFailure(error);
      else if (error instanceof CmsApiError && error.status === 409) {
        setConflict(true);
        setFormError('O artigo mudou no servidor. Recarregue a versão atual antes de tentar publicar; copie manualmente o que quiser preservar.');
      } else setFormError(error instanceof Error ? error.message : 'Não foi possível publicar o artigo.');
    } finally {
      setSaveBusy(false);
    }
  }, [access, activePost, bodyLength, fields, handleAuthFailure, isDirty, replacePostInList, saveFields]);

  const handleUnpublish = useCallback(async () => {
    if (!activePost || access.kind !== 'authorized') return;
    if (!window.confirm('Retirar este artigo do ar? Ele continuará salvo como rascunho e poderá ser publicado novamente depois.')) return;
    setSaveBusy(true);
    setFormError('');
    setFormNotice('');
    try {
      const { post } = await unpublishAdminPost(activePost.id, activePost.revision, access.session.csrfToken);
      const nextFields = fieldsFromPost(post);
      setActivePost(post);
      setFields(nextFields);
      setBaseline(nextFields);
      replacePostInList(post);
      setFormNotice('Artigo retirado do ar e mantido como rascunho.');
    } catch (error) {
      if (isAuthError(error)) handleAuthFailure(error);
      else if (error instanceof CmsApiError && error.status === 409) {
        setConflict(true);
        setFormError('O artigo mudou no servidor. Recarregue a versão atual antes de retirar do ar.');
      } else setFormError(error instanceof Error ? error.message : 'Não foi possível retirar o artigo do ar.');
    } finally {
      setSaveBusy(false);
    }
  }, [access, activePost, handleAuthFailure, replacePostInList]);

  const handleCoverFile = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    setFormError('');
    if (!COVER_TYPES.has(file.type)) { setFormError('Escolha uma imagem JPG, PNG ou WebP.'); return; }
    if (file.size > MAX_COVER_BYTES) { setFormError('A imagem de capa deve ter no máximo 5 MB.'); return; }
    if (access.kind !== 'authorized') return;
    setUploadBusy(true);
    try {
      const uploaded = await uploadAdminCover(file, access.session.csrfToken);
      const url = new URL(uploaded.url, window.location.origin);
      if (url.origin !== window.location.origin || !['http:', 'https:'].includes(url.protocol)) {
        throw new Error('O CMS retornou um endereço de capa inválido.');
      }
      setField('coverUrl', uploaded.url);
      setFormNotice('Imagem enviada com sucesso. Ela permanece acessível pelo endereço privado do CMS.');
    } catch (error) {
      if (isAuthError(error)) handleAuthFailure(error);
      else setFormError(error instanceof Error ? error.message : 'Não foi possível enviar a imagem.');
    } finally {
      setUploadBusy(false);
    }
  }, [access, handleAuthFailure, setField]);

  const handleLogout = useCallback(async () => {
    if (access.kind !== 'authorized') return;
    setLogoutNotice('');
    try {
      await logoutAdmin(access.session.csrfToken);
      setAccess({ kind: 'signed-out' });
    } catch (error) {
      if (isAuthError(error)) handleAuthFailure(error);
      else setLogoutNotice(error instanceof Error ? error.message : 'Não foi possível confirmar a saída.');
    }
  }, [access, handleAuthFailure]);

  const filteredPosts = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('pt-BR');
    return posts.filter((post) => {
      if (filterStatus !== 'all' && post.status !== filterStatus) return false;
      if (!normalized) return true;
      return [post.title, post.slug, post.excerpt, post.category].some((part) => part.toLocaleLowerCase('pt-BR').includes(normalized));
    });
  }, [filterStatus, posts, query]);

  if (access.kind !== 'authorized') {
    return <AccessScreen state={access} sessionError={sessionError} onRetry={refreshSession} />;
  }

  const isEditor = route.kind === 'new' || route.kind === 'edit' || route.kind === 'invalid';
  const activeScheduled = isScheduled(activePost);
  const publishButtonVisible = !activePost || activePost.status === 'draft' || activeScheduled;
  const updateTitle = (value: string) => {
    setFields((current) => ({ ...current, title: value, ...(!activePost && !slugEdited ? { slug: slugFromTitle(value) } : {}) }));
    setFormError('');
    setFormNotice('');
  };
  const uploadHintId = 'sb-cover-upload-hint';

  return (
    <div className="sb-admin">
      <a href="#sb-main-content" className="sb-skip-link">Pular para o conteúdo</a>
      {drawerOpen && <button className="sb-drawer-scrim" type="button" aria-label="Fechar menu" onClick={() => setDrawerOpen(false)} />}
      <aside className={`sb-sidebar${drawerOpen ? ' is-open' : ''}`} aria-label="Navegação administrativa">
        <AdminBrand />
        <div className="sb-sidebar-label">CONTEÚDO</div>
        <nav className="sb-side-nav">
          <button type="button" className={!isEditor ? 'is-active' : ''} onClick={() => navigateAdmin('/admin')}><FileText size={19} /><span>Artigos</span><ChevronRight size={16} /></button>
          <button type="button" className={route.kind === 'new' ? 'is-active' : ''} onClick={() => navigateAdmin('/admin/posts/new')}><Plus size={19} /><span>Novo artigo</span></button>
        </nav>
        <div className="sb-sidebar-bottom">
          <div className="sb-sidebar-identity"><span className="sb-avatar">{(access.session.name || 'S').trim().slice(0, 1).toLocaleUpperCase('pt-BR')}</span><div><strong>{access.session.name || 'Conta autorizada'}</strong><small>Administradora do Blog</small></div></div>
          <p><span className="sb-dot" /> Conteúdo salvo no CMS</p>
        </div>
      </aside>

      <div className="sb-workspace">
        <header className="sb-topbar">
          <button className="sb-icon-button sb-menu-button" type="button" aria-label={drawerOpen ? 'Fechar menu' : 'Abrir menu'} aria-expanded={drawerOpen} onClick={() => setDrawerOpen((open) => !open)}>{drawerOpen ? <X size={21} /> : <Menu size={21} />}</button>
          <div className="sb-breadcrumb"><span>Painel do Blog</span><ChevronRight size={15} /><strong>{isEditor ? activePost?.title || (editorIsNew ? 'Novo artigo' : 'Editar artigo') : 'Artigos'}</strong></div>
          <div className="sb-topbar-actions"><span className="sb-secure-label"><span className="sb-dot" /> Sessão protegida</span><button className="sb-logout-button" type="button" onClick={handleLogout}><LogOut size={17} /><span>Sair</span></button></div>
        </header>
        {logoutNotice && <div className="sb-toast sb-toast-error" role="alert"><AlertCircle size={18} />{logoutNotice}</div>}
        <main id="sb-main-content" className="sb-main-content" tabIndex={-1}>
          {!isEditor && route.kind === 'list' && (
            <section className="sb-list-page" aria-labelledby="sb-list-title">
              <div className="sb-page-heading">
                <div><span className="sb-eyebrow">SHOWBRINQ · CONTEÚDO</span><h1 id="sb-list-title">Artigos</h1><p>Organize os conteúdos do Blog em um só lugar.</p></div>
                <button className="sb-button sb-button-primary" type="button" onClick={() => navigateAdmin('/admin/posts/new')}><Plus size={18} /> Novo artigo</button>
              </div>
              <div className="sb-stat-row" aria-label="Resumo de artigos">
                <div className="sb-stat-card"><span className="sb-stat-icon is-pink"><FileText size={19} /></span><div><small>Total de artigos</small><strong>{posts.length}</strong></div></div>
                <div className="sb-stat-card"><span className="sb-stat-icon is-cyan"><Clock3 size={19} /></span><div><small>Rascunhos</small><strong>{posts.filter((post) => post.status === 'draft').length}</strong></div></div>
                <div className="sb-stat-card"><span className="sb-stat-icon is-green"><CheckCircle2 size={19} /></span><div><small>Publicados</small><strong>{posts.filter((post) => post.status === 'published').length}</strong></div></div>
              </div>
              <section className="sb-articles-panel" aria-labelledby="sb-articles-heading">
                <div className="sb-articles-heading"><div><h2 id="sb-articles-heading">Seus artigos</h2><p>Busque por título, resumo, categoria ou endereço.</p></div><span className="sb-results-count">{filteredPosts.length} {filteredPosts.length === 1 ? 'artigo' : 'artigos'}</span></div>
                <div className="sb-list-controls">
                  <label className="sb-search-box"><Search size={19} /><span className="sb-sr-only">Buscar artigos</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar artigos…" /></label>
                  <div className="sb-filter-tabs" role="group" aria-label="Filtrar por situação">
                    {(['all', 'draft', 'published'] as FilterStatus[]).map((status) => <button type="button" key={status} aria-pressed={filterStatus === status} className={filterStatus === status ? 'is-current' : ''} onClick={() => setFilterStatus(status)}>{status === 'all' ? 'Todos' : status === 'draft' ? 'Rascunhos' : 'Publicados'}</button>)}
                  </div>
                </div>
                {postsError && <div className="sb-inline-alert is-error" role="alert"><AlertCircle size={19} /><span>{postsError}</span><button type="button" onClick={() => void loadPosts()}>Tentar novamente</button></div>}
                {postsLoading ? <div className="sb-list-empty" role="status"><span className="sb-spinner" />Carregando artigos…</div> : filteredPosts.length ? (
                  <div className="sb-post-list">
                    {filteredPosts.map((post) => <article className="sb-post-row" key={post.id}>
                      <div className="sb-post-thumb">{post.coverUrl ? <img src={post.coverUrl} alt="" /> : <span><ImagePlus size={22} /></span>}</div>
                      <div className="sb-post-summary"><div className="sb-post-title-line"><h3>{post.title || 'Artigo sem título'}</h3><StatusBadge status={post.status} scheduled={isScheduled(post)} /></div><p>{post.excerpt || 'Sem resumo'}</p><div className="sb-post-meta"><span>{post.category || 'Sem categoria'}</span><span className="sb-meta-dot" aria-hidden="true" /><span><CalendarDays size={14} /> Atualizado em {displayDate(post.updatedAt)}</span></div></div>
                      <button className="sb-button sb-button-row" type="button" onClick={() => navigateAdmin(routeForId(post.id))}><Edit3 size={17} /> Editar</button>
                    </article>)}
                  </div>
                ) : <div className="sb-list-empty"><span className="sb-empty-icon"><Search size={21} /></span><strong>{posts.length === 0 ? 'Seu primeiro artigo começa aqui' : 'Nenhum artigo encontrado'}</strong><p>{posts.length === 0 ? 'Crie um rascunho para organizar uma ideia antes de publicar.' : 'Tente outra busca ou ajuste o filtro selecionado.'}</p>{posts.length === 0 && <button className="sb-button sb-button-secondary" type="button" onClick={() => navigateAdmin('/admin/posts/new')}><Plus size={17} /> Criar artigo</button>}</div>}
              </section>
            </section>
          )}

          {isEditor && (
            <section className="sb-editor-page" aria-labelledby="sb-editor-title">
              {editorLoading ? <div className="sb-list-empty" role="status"><span className="sb-spinner" />Carregando artigo…</div> : editorLoadError ? <div className="sb-editor-error-state"><span className="sb-access-icon is-error"><AlertCircle size={22} /></span><h1 id="sb-editor-title">Não foi possível abrir o artigo</h1><p role="alert">{editorLoadError}</p><div><button className="sb-button sb-button-secondary" type="button" onClick={() => navigateAdmin('/admin')}><ArrowLeft size={17} /> Voltar aos artigos</button>{route.kind === 'edit' && <button className="sb-button sb-button-primary" type="button" onClick={() => { setEditorLoadError(''); void getAdminPost(route.id).then(({ post }) => { const loaded = fieldsFromPost(post); setActivePost(post); setFields(loaded); setBaseline(loaded); }).catch((error: unknown) => setEditorLoadError(error instanceof Error ? error.message : 'Não foi possível abrir este artigo.')); }}>Tentar novamente</button>}</div></div> : route.kind === 'invalid' ? <div className="sb-editor-error-state"><h1 id="sb-editor-title">Endereço não reconhecido</h1><p>Volte à lista para selecionar um artigo.</p><button className="sb-button sb-button-secondary" type="button" onClick={() => navigateAdmin('/admin')}>Voltar aos artigos</button></div> : (
                <>
                  <div className="sb-editor-heading">
                    <div><button className="sb-back-link" type="button" onClick={() => navigateAdmin('/admin')}><ArrowLeft size={17} /> Voltar aos artigos</button><div className="sb-editor-title-line"><h1 id="sb-editor-title">{editorIsNew ? 'Novo artigo' : 'Editar artigo'}</h1>{activePost && <StatusBadge status={activePost.status} />}</div><p>{editorIsNew ? 'Monte seu conteúdo com calma. O artigo começa como rascunho.' : `Última atualização em ${displayDate(activePost?.updatedAt ?? '')}`}</p></div>
                    <button className="sb-button sb-button-preview" type="button" onClick={() => setPreviewOpen(true)}><Eye size={18} /> Pré-visualizar</button>
                  </div>
                  {formError && <div className="sb-inline-alert is-error" role="alert"><AlertCircle size={19} /><span>{formError}</span>{conflict && activePost && <button type="button" onClick={() => void reloadPost(true)}>Recarregar versão do servidor</button>}</div>}
                  {formNotice && <div className="sb-inline-alert is-success" role="status"><CheckCircle2 size={19} /><span>{formNotice}</span></div>}
                  <div className="sb-editor-layout">
                    <div className="sb-editor-main-column">
                      <section className="sb-form-card" aria-labelledby="sb-writing-heading">
                        <div className="sb-form-card-heading"><div><span className="sb-section-icon"><Edit3 size={18} /></span><div><h2 id="sb-writing-heading">Conteúdo do artigo</h2><p>Comece pelo título e conte sua história.</p></div></div></div>
                        <div className="sb-field-group"><label htmlFor="sb-title">Título <span aria-hidden="true">*</span></label><input id="sb-title" className="sb-text-input sb-title-input" value={fields.title} onChange={(event) => updateTitle(event.target.value)} placeholder="Ex.: Ideias para a próxima temporada de vendas" autoComplete="off" /></div>
                        <div className="sb-field-group"><label htmlFor="sb-slug">Endereço do artigo <span aria-hidden="true">*</span></label><div className="sb-slug-input"><span>{window.location.host}/blog/</span><input id="sb-slug" value={fields.slug} onChange={(event) => { setSlugEdited(true); setField('slug', event.target.value); }} placeholder="endereco-do-artigo" autoComplete="off" /><span className="sb-slug-lock" title={editorIsNew && !slugEdited ? 'Gerado automaticamente pelo título até você editar' : 'Endereço editável'} aria-label={editorIsNew && !slugEdited ? 'Slug automático' : 'Slug editável'}>{editorIsNew && !slugEdited ? <Sparkles size={15} /> : <Check size={15} />}</span></div><small className="sb-field-hint">{editorIsNew && !slugEdited ? 'Gerado pelo título; ao editar este campo, o endereço fica sob seu controle.' : 'Use letras minúsculas, números e hífens para facilitar a leitura do endereço.'}</small></div>
                        <div className="sb-field-group"><label htmlFor="sb-excerpt">Resumo <span aria-hidden="true">*</span></label><textarea id="sb-excerpt" className="sb-textarea" rows={3} value={fields.excerpt} onChange={(event) => setField('excerpt', event.target.value)} placeholder="Em poucas frases, conte ao leitor o que ele vai encontrar no artigo." /><small className="sb-field-hint">Um resumo claro ajuda a apresentar o conteúdo na lista do Blog.</small></div>
                        <div className="sb-field-group"><label htmlFor="sb-category">Categoria</label><input id="sb-category" className="sb-text-input" value={fields.category} onChange={(event) => setField('category', event.target.value)} placeholder="Ex.: Mercado de brinquedos" /></div>
                        <div className="sb-field-group"><label>Texto do artigo <span aria-hidden="true">*</span></label><RichTextEditor key={activePost?.id ?? 'new'} initialHtml={fields.bodyHtml} onChange={(html) => setField('bodyHtml', html)} onError={setFormError} /><div className="sb-body-length"><span>{bodyLength} caracteres visíveis</span><span>{bodyLength < 100 ? `Mínimo de 100 para publicar (${Math.max(0, 100 - bodyLength)} restantes)` : 'Pronto para validação de publicação'}</span></div></div>
                      </section>

                      <section className="sb-form-card" aria-labelledby="sb-cover-heading">
                        <div className="sb-form-card-heading"><div><span className="sb-section-icon is-cyan"><ImagePlus size={19} /></span><div><h2 id="sb-cover-heading">Imagem de capa</h2><p>Uma imagem opcional para apresentar seu artigo.</p></div></div></div>
                        {fields.coverUrl ? <div className="sb-cover-preview"><img src={fields.coverUrl} alt={fields.coverAlt || 'Prévia da capa enviada'} /><div className="sb-cover-remove"><strong>Capa adicionada</strong><button type="button" onClick={() => { setField('coverUrl', ''); setField('coverAlt', ''); }} aria-label="Remover imagem de capa"><X size={17} /> Remover capa</button></div></div> : <div className="sb-upload-drop"><span><UploadCloud size={23} /></span><strong>Envie uma imagem de capa</strong><small id={uploadHintId}>JPG, PNG ou WebP · até 5 MB</small><button className="sb-button sb-button-secondary" type="button" disabled={uploadBusy} onClick={() => fileInputRef.current?.click()}>{uploadBusy ? <span className="sb-spinner sb-spinner-small" /> : <ImagePlus size={17} />}{uploadBusy ? 'Enviando…' : 'Escolher imagem'}</button></div>}
                        <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="sb-visually-hidden" aria-describedby={uploadHintId} onChange={handleCoverFile} />
                        {fields.coverUrl && <div className="sb-field-group sb-cover-alt-field"><label htmlFor="sb-cover-alt">Texto alternativo da imagem{fields.coverUrl && <span aria-hidden="true"> *</span>}</label><input id="sb-cover-alt" className="sb-text-input" value={fields.coverAlt} onChange={(event) => setField('coverAlt', event.target.value)} placeholder="Descreva objetivamente o que aparece na imagem" /><small className="sb-field-hint">Ajuda pessoas que usam leitor de tela a compreender a imagem.</small></div>}
                      </section>
                    </div>

                    <aside className="sb-editor-side-column" aria-label="Opções de publicação">
                      <section className="sb-form-card sb-publish-card"><div className="sb-form-card-heading"><div><span className="sb-section-icon is-green"><Globe2 size={18} /></span><div><h2>Publicação</h2><p>Você decide quando o artigo vai ao ar.</p></div></div></div>
                        <div className="sb-publication-state">{activePost ? <><StatusBadge status={activePost.status} scheduled={activeScheduled} /><span>{activeScheduled ? `Vai ao ar em ${formatSchedule(activePost.publishedAt)}` : activePost.status === 'published' ? 'Visível no Blog' : 'Somente no painel'}</span></> : <><StatusBadge status="draft" /><span>Começa como rascunho</span></>}</div>
                        <div className="sb-publish-actions"><button className="sb-button sb-button-primary sb-button-wide" type="button" disabled={saveBusy || uploadBusy} onClick={() => void saveCurrent()}><Save size={17} />{saveBusy ? 'Salvando…' : activePost?.status === 'published' ? 'Salvar alterações' : 'Salvar rascunho'}</button>
                          {publishButtonVisible && <button className="sb-button sb-button-publish sb-button-wide" type="button" disabled={saveBusy || uploadBusy} onClick={() => void handlePublish()}><Globe2 size={17} /> {activeScheduled ? 'Publicar agora' : 'Publicar'}</button>}
                          {publishButtonVisible && <div className="sb-schedule"><label htmlFor="sb-schedule-at"><CalendarDays size={16} /> {activeScheduled ? 'Mudar o agendamento' : 'Ou agende a publicação'}</label><input id="sb-schedule-at" type="datetime-local" value={scheduleAt} onChange={(event) => setScheduleAt(event.target.value)} /><button className="sb-button sb-button-secondary sb-button-wide" type="button" disabled={saveBusy || uploadBusy || !scheduleAt} onClick={() => void handlePublish(new Date(scheduleAt).toISOString())}><Clock3 size={17} /> Agendar</button></div>}
                          {activePost?.status === 'published' && <button className="sb-button sb-button-unpublish sb-button-wide" type="button" disabled={saveBusy || uploadBusy} onClick={() => void handleUnpublish()}><X size={17} /> {activeScheduled ? 'Cancelar agendamento' : 'Retirar do ar'}</button>}
                        </div>
                        <div className="sb-save-note"><CheckCircle2 size={16} /><span>Nada vai ao ar sem a sua confirmação. Artigos agendados são publicados sozinhos na data escolhida.</span></div>
                      </section>

                      <section className="sb-form-card sb-featured-card"><div><span className="sb-section-icon is-yellow"><Star size={18} /></span><div><h2>Destaque na página inicial</h2><p>Marque para sinalizar este artigo como destaque.</p></div></div><label className="sb-switch"><input type="checkbox" checked={fields.featured} onChange={(event) => setField('featured', event.target.checked)} aria-label="Destacar artigo na página inicial" /><span className="sb-switch-track" /><span className="sb-sr-only">Destacar na página inicial</span></label></section>

                      <section className={`sb-form-card sb-seo-card${seoOpen ? ' is-open' : ''}`}>
                        <button type="button" className="sb-seo-toggle" aria-expanded={seoOpen} onClick={() => setSeoOpen((open) => !open)}><span className="sb-section-icon is-cyan"><Search size={18} /></span><span><strong>Prévia para buscadores</strong><small>Campos opcionais de SEO</small></span><ChevronRight size={18} /></button>
                        {seoOpen && <div className="sb-seo-fields"><div className="sb-field-group"><label htmlFor="sb-seo-title">Título para buscadores</label><input id="sb-seo-title" className="sb-text-input" value={fields.seoTitle} onChange={(event) => setField('seoTitle', event.target.value)} placeholder={fields.title || 'Título do artigo'} /><small className="sb-counter">{fields.seoTitle.length}/60 caracteres · sugestão visual</small></div><div className="sb-field-group"><label htmlFor="sb-seo-description">Descrição para buscadores</label><textarea id="sb-seo-description" className="sb-textarea" rows={3} value={fields.seoDescription} onChange={(event) => setField('seoDescription', event.target.value)} placeholder={fields.excerpt || 'Resumo do artigo'} /><small className="sb-counter">{fields.seoDescription.length}/160 caracteres · sugestão visual</small></div><div className="sb-seo-live"><span><Search size={15} /> Prévia atualizada</span><strong>{fields.seoTitle || fields.title || 'Título do artigo'}</strong><p>{fields.seoDescription || fields.excerpt || 'A descrição preenchida aparecerá aqui.'}</p></div><small className="sb-seo-caveat">A prévia é visual. Cada buscador decide como exibir os resultados.</small></div>}
                      </section>
                      <div className="sb-editor-help"><AlertCircle size={16} /><p>Rascunhos incompletos podem ser salvos. Para publicar, revise título, endereço, resumo, texto e texto alternativo da capa.</p></div>
                    </aside>
                  </div>
                  <div className="sb-editor-mobile-actions"><button className="sb-button sb-button-secondary" type="button" onClick={() => setPreviewOpen(true)}><Eye size={17} /> Prévia</button><button className="sb-button sb-button-primary" type="button" disabled={saveBusy || uploadBusy} onClick={() => void saveCurrent()}><Save size={17} />{activePost?.status === 'published' ? 'Salvar alterações' : 'Salvar rascunho'}</button></div>
                </>
              )}
            </section>
          )}
        </main>
        <footer className="sb-admin-footer"><span>SHOWBRINQ · Painel do Blog</span><span>Conteúdo salvo no CMS <span className="sb-dot" /></span></footer>
      </div>
      {previewOpen && <ArticlePreview fields={fields} mode={previewMode} onClose={() => setPreviewOpen(false)} onMode={setPreviewMode} />}
    </div>
  );
}
